import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import SaludAcademias from './SaludAcademias';

const API = apiUrl('/api/admin');
const OPS_API = apiUrl('/api/operations');

const headers = (json = true) => {
  const h = { Authorization: `Bearer ${localStorage.getItem('edusaas_token')}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const StatCard = ({ label, value, tone = 'blue' }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    <p className={`text-4xl font-black text-${tone}-400`}>{value}</p>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
    {text}
  </div>
);

export default function AdminPanel({ isDark, textMuted, cardBg, isSupportOnly = false }) {
  const [tab, setTab] = useState(isSupportOnly ? 'inbox' : 'overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [academias, setAcademias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedAcademia, setSelectedAcademia] = useState('');
  const [modules, setModules] = useState([]);
  const [selectedInboxItem, setSelectedInboxItem] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [inboxFilter, setInboxFilter] = useState('');
  const [inboxOrigin, setInboxOrigin] = useState('');
  const [inboxState, setInboxState] = useState('');
  
  const [userFilter, setUserFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [academyFilter, setAcademyFilter] = useState('');

  // Estados para cambio de rol y eliminación
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [modalCambiarRol, setModalCambiarRol] = useState(false);
  const [nuevoRol, setNuevoRol] = useState('');
  const [cambiandoRol, setCambiandoRol] = useState(false);
  const [usuarioEliminando, setUsuarioEliminando] = useState(null);
  const [changingPlan,    setChangingPlan]    = useState(null);
  const [markingSetupFee, setMarkingSetupFee] = useState(null);

  // Permisos por rol
  const [permisosAcadId,   setPermisosAcadId]   = useState('');
  const [permisosRoles,    setPermisosRoles]    = useState({});
  const [guardandoPerm,    setGuardandoPerm]    = useState(false);

  const [modalAcad, setModalAcad] = useState(false);
  const [modalUser, setModalUser] = useState(false);
  const [modalTicket, setModalTicket] = useState(false);

  const [academyForm, setAcademyForm] = useState({
    id_academia: '',
    nombre: '',
    slug: '',
    plan_activo: 'basico',
    brand_primary_color: '#3b82f6',
    brand_secondary_color: '#0f172a',
    brand_accent_color: '#38bdf8',
  });
  const [userForm, setUserForm] = useState({
    id_usuario: '',
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'director',
    id_academia: '',
  });
  const [ticketForm, setTicketForm] = useState({
    categoria: 'soporte',
    subtipo: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    destino_equipo: 'soporte',
  });

  const panelClass = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

  async function loadDashboard() {
    setLoading(true);
    try {
      if (isSupportOnly) {
        const [ib, tk] = await Promise.all([
          fetch(`${API}/inbox`, { headers: headers(false) }),
          fetch(`${OPS_API}/tickets/mios`, { headers: headers(false) })
        ]);
        if (ib.ok) setInbox(await ib.json());
        if (tk.ok) setTickets(await tk.json());
      } else {
        const [st, ac, us, ib, tk] = await Promise.all([
          fetch(`${API}/stats`, { headers: headers(false) }),
          fetch(`${API}/academias`, { headers: headers(false) }),
          fetch(`${API}/usuarios`, { headers: headers(false) }),
          fetch(`${API}/inbox`, { headers: headers(false) }),
          fetch(`${OPS_API}/tickets/mios`, { headers: headers(false) }),
        ]);
        if (st.ok) setStats(await st.json());
        if (ac.ok) {
          const data = await ac.json();
          setAcademias(data);
          if (!selectedAcademia && data.length) setSelectedAcademia(data[0].id_academia);
        }
        if (us.ok) setUsuarios(await us.json());
        if (ib.ok) setInbox(await ib.json());
        if (tk.ok) setTickets(await tk.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadModules(idAcademia) {
    if (!idAcademia) return;
    const res = await fetch(`${API}/academias/${idAcademia}/modulos`, { headers: headers(false) });
    if (res.ok) setModules(await res.json());
  }

  async function loadTicket(id) {
    const res = await fetch(`${OPS_API}/tickets/${id}`, { headers: headers(false) });
    if (!res.ok) return;
    const data = await res.json();
    setSelectedTicket(data.ticket);
    setTicketMessages(data.mensajes);
  }

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedAcademia) loadModules(selectedAcademia);
  }, [selectedAcademia]);

  const toggleSetupFee = async (idAcademia, pagado, monto) => {
    setMarkingSetupFee(idAcademia);
    try {
      const res = await fetch(`${API}/academias/${idAcademia}/setup-fee`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ pagado, monto }),
      });
      const data = await res.json();
      alert(res.ok ? data.mensaje : data.error);
      if (res.ok) loadDashboard();
    } finally {
      setMarkingSetupFee(null);
    }
  };

  const changePlan = async (idAcademia, nuevoPlan) => {
    setChangingPlan(idAcademia);
    try {
      const res = await fetch(`${API}/academias/${idAcademia}/plan`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ plan_activo: nuevoPlan }),
      });
      const data = await res.json();
      alert(res.ok ? data.mensaje : data.error);
      if (res.ok) loadDashboard();
    } finally {
      setChangingPlan(null);
    }
  };

  const saveModules = async () => {
    const res = await fetch(`${API}/academias/${selectedAcademia}/modulos`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ modulos: modules }),
    });
    const data = await res.json();
    alert(res.ok ? data.mensaje : data.error);
  };

  const createAcademia = async () => {
    const res = await fetch(`${API}/academias`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(academyForm),
    });
    const data = await res.json();
    alert(res.ok ? data.mensaje : data.error);
    if (res.ok) {
      setModalAcad(false);
      setSelectedAcademia(data.academia.id_academia);
      loadDashboard();
    }
  };

  const createUser = async () => {
    const res = await fetch(`${API}/usuarios`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    alert(res.ok ? data.mensaje : data.error);
    if (res.ok) {
      setModalUser(false);
      loadDashboard();
    }
  };

  const cambiarRolUsuario = async () => {
    if (!usuarioSeleccionado || !nuevoRol) return;
    setCambiandoRol(true);
    try {
      const res = await fetch(`${API}/usuarios/${usuarioSeleccionado.id_usuario}/rol`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ rol: nuevoRol }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Rol de ${usuarioSeleccionado.nombre_completo} cambiado a ${nuevoRol}`);
        setModalCambiarRol(false);
        loadDashboard();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error de red al cambiar rol');
    } finally {
      setCambiandoRol(false);
    }
  };

  const eliminarUsuario = async (usuario) => {
    if (!confirm(`¿Estás SEGURO de que deseas eliminar a ${usuario.nombre_completo}? Esta acción no se puede deshacer.`)) return;
    setUsuarioEliminando(usuario.id_usuario);
    try {
      const res = await fetch(`${API}/usuarios/${usuario.id_usuario}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || 'Usuario eliminado correctamente');
        loadDashboard();
      } else {
        alert(data.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      alert('Error de red al eliminar usuario');
    } finally {
      setUsuarioEliminando(null);
    }
  };

  const abrirModalCambiarRol = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setNuevoRol(usuario.rol);
    setModalCambiarRol(true);
  };

  const createTicket = async () => {
    const res = await fetch(`${OPS_API}/tickets`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(ticketForm),
    });
    const data = await res.json();
    alert(res.ok ? data.mensaje : data.error);
    if (res.ok) {
      setModalTicket(false);
      loadDashboard();
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    const res = await fetch(`${OPS_API}/tickets/${selectedTicket.id_solicitud}/mensajes`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ mensaje: reply }),
    });
    if (res.ok) {
      setReply('');
      loadTicket(selectedTicket.id_solicitud);
    }
  };

  const updateTicket = async (estado, aprobado = false) => {
    if (!selectedTicket) return;
    const res = await fetch(`${OPS_API}/tickets/${selectedTicket.id_solicitud}/estado`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ estado, aprobado }),
    });
    if (res.ok) {
      loadDashboard();
      loadTicket(selectedTicket.id_solicitud);
    }
  };

  return (
    <section className="relative z-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-extrabold tracking-tight">
            {isSupportOnly ? 'Mesa de Ayuda (Help Desk)' : 'Centro de control SaaS'}
          </h2>
          <p className={`text-sm ${textMuted}`}>
            {isSupportOnly 
              ? 'Atiende sugerencias, requerimientos y tickets operativos de todas las academias.' 
              : 'Controla academias, modulos y solicitudes desde tu panel central.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isSupportOnly && (
            <>
              <button onClick={() => setModalAcad(true)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">+ Academia</button>
              <button onClick={() => setModalUser(true)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">+ Usuario</button>
            </>
          )}
          <button onClick={() => setModalTicket(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">+ Solicitud</button>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 rounded-2xl border p-1 md:grid-cols-${isSupportOnly ? '2' : '6'} ${panelClass}`}>
        {(isSupportOnly ? [
          ['inbox', 'Caja de sugerencias & MKT'],
          ['tickets', 'Tickets Operativos'],
        ] : [
          ['overview', 'Resumen'],
          ['academias', 'Academias'],
          ['salud', 'Salud'],
          ['modulos', 'Modulos'],
          ['usuarios', 'Usuarios'],
          ['permisos', 'Permisos por Rol'],
          ['inbox', 'Inbox Central'],
          ['tickets', 'Tickets IT'],
        ]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest ${tab === id ? 'bg-slate-800 text-white' : `${textMuted} hover:bg-slate-800/30`}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}

      {!loading && tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Academias" value={stats.academias?.total || 0} />
            <StatCard label="Activas" value={stats.academias?.activas || 0} tone="emerald" />
            <StatCard label="Alumnos" value={stats.usuarios?.alumno || 0} tone="purple" />
            <StatCard label="Examenes" value={stats.examenes_procesados || 0} tone="amber" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`rounded-2xl border p-6 ${panelClass}`}>
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest">Inbox central</h3>
              <div className="space-y-3">
                {inbox.slice(0, 5).map((item) => (
                  <div key={item.inbox_id} className="rounded-xl border border-slate-800 p-4">
                    <p className="font-bold">{item.titulo || 'Sin titulo'}</p>
                    <p className={`text-[11px] ${textMuted}`}>{item.academia_nombre || 'Global'} - {item.origen} - {item.estado}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-2xl border p-6 ${panelClass}`}>
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest">Academias</h3>
              <div className="space-y-3">
                {academias.slice(0, 5).map((academy) => (
                  <div key={academy.id_academia} className="rounded-xl border border-slate-800 p-4">
                    <p className="font-bold">{academy.nombre}</p>
                    <p className={`text-[11px] ${textMuted}`}>{academy.id_academia} - /{academy.slug}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'academias' && (() => {
        const PLANES = [
          { id: 'basico', label: 'Basico', color: 'slate', precio: 'Trial' },
          { id: 'starter', label: 'Starter', color: 'blue', precio: 'S/180/mes' },
          { id: 'pro', label: 'Pro', color: 'indigo', precio: 'S/320/mes' },
          { id: 'academy', label: 'Academy', color: 'amber', precio: 'S/550/mes' },
        ];
        const PLAN_COLOR = { basico: 'slate', starter: 'blue', pro: 'indigo', academy: 'amber' };
        const detalle = academias.find((a) => a.id_academia === selectedAcademia);
        return (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-2">
              {academias.map((academy) => {
                const pc = PLAN_COLOR[academy.plan_activo] || 'slate';
                return (
                  <button key={academy.id_academia} onClick={() => setSelectedAcademia(academy.id_academia)} className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedAcademia === academy.id_academia ? 'border-blue-500/40 bg-blue-500/5' : `${panelClass} hover:bg-slate-800/20`}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold">{academy.nombre}</p>
                        <p className={`text-[11px] ${textMuted}`}>{academy.id_academia}</p>
                      </div>
                      <span className={`rounded-full bg-${pc}-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-${pc}-400`}>
                        {academy.plan_activo || 'basico'}
                      </span>
                    </div>
                    <div className={`mt-2 flex gap-3 text-[10px] ${textMuted}`}>
                      <span>{academy.total_alumnos || 0} alumnos</span>
                      <span>{academy.activo ? 'Activa' : 'Inactiva'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={`rounded-2xl border p-6 ${panelClass}`}>
              {!detalle ? (
                <div className="flex h-full items-center justify-center">
                  <p className={`text-sm ${textMuted}`}>Selecciona una academia para ver el detalle.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-extrabold">{detalle.nombre}</h3>
                      <p className={`text-sm ${textMuted}`}>/{detalle.slug} · {detalle.id_academia}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${detalle.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {detalle.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[['Alumnos', detalle.total_alumnos || 0], ['Profesores', detalle.total_profesores || 0], ['Secretarias', detalle.total_secretarias || 0], ['Directores', detalle.total_directores || 0]].map(([label, val]) => (
                      <div key={label} className="rounded-xl border border-slate-800 p-3 text-center">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{label}</p>
                        <p className="mt-1 text-2xl font-black">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`mb-4 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Plan actual y cambio rapido</p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {PLANES.map((plan) => {
                        const activo = (detalle.plan_activo || 'basico') === plan.id;
                        const cargando = changingPlan === detalle.id_academia;
                        return (
                          <button
                            key={plan.id}
                            disabled={activo || cargando}
                            onClick={() => changePlan(detalle.id_academia, plan.id)}
                            className={`rounded-xl border p-4 text-left transition-all ${activo ? `border-${plan.color}-500/50 bg-${plan.color}-500/10` : 'border-slate-800 hover:bg-slate-800/40'} ${cargando ? 'opacity-50' : ''}`}
                          >
                            <p className={`text-xs font-black uppercase tracking-widest ${activo ? `text-${plan.color}-400` : textMuted}`}>{plan.label}</p>
                            <p className={`mt-1 text-[11px] ${activo ? `text-${plan.color}-400` : textMuted}`}>{plan.precio}</p>
                            {activo && <p className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">Plan actual</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Setup Fee */}
                  {(() => {
                    const SETUP = { basico: 0, starter: 150, pro: 200, academy: 300 };
                    const planActual = detalle.plan_activo || 'basico';
                    const montoEsperado = SETUP[planActual] || 0;
                    const pagado = detalle.setup_fee_pagado;
                    const cargando = markingSetupFee === detalle.id_academia;
                    return montoEsperado > 0 ? (
                      <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Setup fee</p>
                            <p className="mt-1 text-lg font-extrabold">S/ {montoEsperado}</p>
                            {pagado && detalle.setup_fee_fecha && (
                              <p className={`text-[11px] ${textMuted}`}>
                                Pagado el {new Date(detalle.setup_fee_fecha).toLocaleDateString('es-PE')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${pagado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {pagado ? 'Pagado' : 'Pendiente'}
                            </span>
                            <button
                              disabled={cargando}
                              onClick={() => toggleSetupFee(detalle.id_academia, !pagado, montoEsperado)}
                              className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${pagado ? 'border-slate-700 text-slate-400 hover:bg-slate-800/40' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}
                            >
                              {cargando ? '...' : pagado ? 'Revertir' : 'Marcar pagado'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="flex gap-3">
                    <button onClick={() => { if (confirm('Desactivar esta academia?')) { fetch(`${API}/academias/${detalle.id_academia}`, { method: 'DELETE', headers: headers(false) }).then(() => loadDashboard()); } }} className="rounded-xl border border-rose-500/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10">
                      Desactivar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {!loading && tab === 'modulos' && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className={`rounded-2xl border p-4 ${panelClass}`}>
            <div className="space-y-2">
              {academias.map((academy) => (
                <button key={academy.id_academia} onClick={() => setSelectedAcademia(academy.id_academia)} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${selectedAcademia === academy.id_academia ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-slate-800/30'}`}>
                  {academy.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${panelClass}`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold">Modulos por academia</h3>
                <p className={`text-sm ${textMuted}`}>Activa o desactiva funciones segun el servicio contratado.</p>
              </div>
              <button onClick={saveModules} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">Guardar</button>
            </div>
            {!selectedAcademia ? (
              <EmptyState text="Selecciona una academia para editar sus modulos." />
            ) : (
              <div className="space-y-4">
                {modules.map((mod) => (
                  <div key={mod.codigo_modulo} className="rounded-2xl border border-slate-800 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-extrabold">{mod.nombre_visible}</p>
                        <p className={`text-xs ${textMuted}`}>{mod.codigo_modulo}</p>
                      </div>
                      <button onClick={() => setModules((prev) => prev.map((item) => item.codigo_modulo === mod.codigo_modulo ? { ...item, habilitado: !item.habilitado } : item))} className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${mod.habilitado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                        {mod.habilitado ? 'Habilitado' : 'Desactivado'}
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input value={mod.nombre_visible} onChange={(e) => setModules((prev) => prev.map((item) => item.codigo_modulo === mod.codigo_modulo ? { ...item, nombre_visible: e.target.value } : item))} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                      <input value={mod.precio_referencial || ''} onChange={(e) => setModules((prev) => prev.map((item) => item.codigo_modulo === mod.codigo_modulo ? { ...item, precio_referencial: e.target.value } : item))} placeholder="Texto de prueba" className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'usuarios' && (
        <div className="space-y-4">
          <div className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-3 ${panelClass}`}>
            <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Buscar por nombre, email o ID" className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
              <option value="">Todos los roles</option>
              <optgroup label="Administración">
                <option value="superadmin">superadmin</option>
                <option value="admin_soporte">admin_soporte</option>
                <option value="soporte_comercial">soporte_comercial</option>
                <option value="agencia_marketing">agencia_marketing</option>
              </optgroup>
              <optgroup label="Academia">
                <option value="director">director</option>
                <option value="secretaria">secretaria</option>
                <option value="profesor">profesor</option>
                <option value="tutor">tutor</option>
                <option value="marketing_academia">marketing_academia</option>
                <option value="alumno">alumno</option>
              </optgroup>
              <optgroup label="Familia">
                <option value="padre">padre</option>
              </optgroup>
            </select>
            <select value={academyFilter} onChange={(e) => setAcademyFilter(e.target.value)} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
              <option value="">Todas las academias</option>
              {academias.map((academy) => (
                <option key={academy.id_academia} value={academy.id_academia}>{academy.nombre}</option>
              ))}
            </select>
          </div>
          <div className={`overflow-hidden rounded-2xl border ${panelClass}`}>
            <table className="w-full text-sm">
              <thead className={`${isDark ? 'bg-slate-950/70' : 'bg-slate-50'} border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Usuario</th>
                  <th className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Rol</th>
                  <th className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Academia</th>
                  <th className={`px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {usuarios.filter((user) => {
                  const okText = userFilter ? [user.nombre_completo, user.id_usuario, user.email].join(' ').toLowerCase().includes(userFilter.toLowerCase()) : true;
                  const okRole = roleFilter ? user.rol === roleFilter : true;
                  const okAcademy = academyFilter ? user.id_academia === academyFilter : true;
                  return okText && okRole && okAcademy;
                }).map((user) => (
                  <tr key={user.id_usuario} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold">{user.nombre_completo}</p>
                      <p className={`text-[11px] ${textMuted}`}>{user.id_usuario} - {user.email || 'sin email'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{user.nombre_academia || 'Sistema'}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalCambiarRol(user)}
                          disabled={usuarioEliminando === user.id_usuario}
                          className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                          title="Cambiar rol"
                        >
                          🔄 Rol
                        </button>
                        <button
                          onClick={() => eliminarUsuario(user)}
                          disabled={usuarioEliminando === user.id_usuario}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                          title="Eliminar usuario"
                        >
                          {usuarioEliminando === user.id_usuario ? '⏳' : '🗑️'} {usuarioEliminando === user.id_usuario ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'inbox' && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className={`rounded-2xl border p-4 ${panelClass}`}>
            <div className="mb-4 grid gap-3">
              <input
                value={inboxFilter}
                onChange={(e) => setInboxFilter(e.target.value)}
                placeholder="Buscar por academia, titulo, categoria..."
                className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}
              />
              <div className="grid grid-cols-2 gap-3">
                <select value={inboxOrigin} onChange={(e) => setInboxOrigin(e.target.value)} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
                  <option value="">Todos los origenes</option>
                  <option value="sugerencia">sugerencia</option>
                  <option value="marketing">marketing</option>
                  <option value="ticket">ticket</option>
                </select>
                <select value={inboxState} onChange={(e) => setInboxState(e.target.value)} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
                  <option value="">Todos los estados</option>
                  <option value="pendiente">pendiente</option>
                  <option value="revisado">revisado</option>
                  <option value="pendiente_aprobacion">pendiente_aprobacion</option>
                  <option value="en_revision">en_revision</option>
                  <option value="aprobado">aprobado</option>
                  <option value="cerrado">cerrado</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {inbox
                .filter((item) => {
                  const okText = inboxFilter
                    ? [item.academia_nombre, item.titulo, item.categoria, item.descripcion]
                        .join(' ')
                        .toLowerCase()
                        .includes(inboxFilter.toLowerCase())
                    : true;
                  const okOrigin = inboxOrigin ? item.origen === inboxOrigin : true;
                  const okState = inboxState ? item.estado === inboxState : true;
                  return okText && okOrigin && okState;
                })
                .map((item) => (
                  <button
                    key={item.inbox_id}
                    onClick={() => setSelectedInboxItem(item)}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selectedInboxItem?.inbox_id === item.inbox_id
                        ? 'border-indigo-500/40 bg-indigo-500/5'
                        : 'border-slate-800 hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{item.titulo || 'Sin titulo'}</p>
                        <p className={`mt-1 text-[11px] ${textMuted}`}>
                          {item.academia_nombre || 'Global'} - {item.origen} - {item.estado}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                        {item.origen}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${panelClass}`}>
            {!selectedInboxItem ? (
              <EmptyState text="Selecciona un elemento del inbox para ver su detalle." />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold">{selectedInboxItem.titulo || 'Sin titulo'}</h3>
                    <p className={`text-sm ${textMuted}`}>
                      {selectedInboxItem.academia_nombre || 'Global'} - {selectedInboxItem.origen} - {selectedInboxItem.categoria}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      {selectedInboxItem.estado}
                    </span>
                    {selectedInboxItem.prioridad && (
                      <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-400">
                        {selectedInboxItem.prioridad}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedInboxItem.descripcion || 'Sin descripcion adicional.'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 p-4">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Academia</p>
                    <p className="mt-2 text-sm font-bold">{selectedInboxItem.academia_nombre || 'Global'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 p-4">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Origen</p>
                    <p className="mt-2 text-sm font-bold">{selectedInboxItem.origen}</p>
                  </div>
                </div>

                {selectedInboxItem.origen === 'ticket' && (
                  <button
                    onClick={() => {
                      setTab('tickets');
                      loadTicket(String(selectedInboxItem.inbox_id).replace('ticket-', ''));
                    }}
                    className="rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    Abrir ticket relacionado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'tickets' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className={`rounded-2xl border p-4 ${panelClass}`}>
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <EmptyState text="No hay tickets registrados." />
              ) : (
                tickets.map((ticket) => (
                  <button key={ticket.id_solicitud} onClick={() => loadTicket(ticket.id_solicitud)} className={`w-full rounded-2xl border p-4 text-left ${selectedTicket?.id_solicitud === ticket.id_solicitud ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-800 hover:bg-slate-800/20'}`}>
                    <p className="font-bold">{ticket.titulo}</p>
                    <p className={`mt-1 text-[11px] ${textMuted}`}>{ticket.academia_nombre || 'Global'} - {ticket.categoria} - {ticket.estado}</p>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${panelClass}`}>
            {!selectedTicket ? (
              <EmptyState text="Selecciona una solicitud para ver la conversacion." />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold">{selectedTicket.titulo}</h3>
                    <p className={`text-sm ${textMuted}`}>{selectedTicket.academia_nombre || 'Global'} - {selectedTicket.categoria} - {selectedTicket.estado}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateTicket('en_revision')} className="rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">Revision</button>
                    <button onClick={() => updateTicket('aprobado', true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">Aprobar</button>
                    <button onClick={() => updateTicket('cerrado')} className="rounded-xl bg-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white">Cerrar</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 p-4">
                  <p className="text-sm">{selectedTicket.descripcion || 'Sin descripcion.'}</p>
                </div>
                <div className="space-y-3">
                  {ticketMessages.map((message) => (
                    <div key={message.id_mensaje} className="rounded-2xl border border-slate-800 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-bold">{message.nombre_completo || 'Sistema'}</p>
                        <p className={`text-[11px] ${textMuted}`}>{new Date(message.fecha_creacion).toLocaleString()}</p>
                      </div>
                      <p className="text-sm">{message.mensaje}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribe una respuesta..." className={`h-28 w-full rounded-2xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                  <button onClick={sendReply} className="rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">Enviar mensaje</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalAcad && (
        <Modal title="Nueva academia" onClose={() => setModalAcad(false)} panelClass={panelClass} isDark={isDark}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="ID academia" textMuted={textMuted}><input value={academyForm.id_academia} onChange={(e) => setAcademyForm({ ...academyForm, id_academia: e.target.value.toUpperCase().replace(/\s/g, '-') })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
            <Input label="Slug" textMuted={textMuted}><input value={academyForm.slug} onChange={(e) => setAcademyForm({ ...academyForm, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
          </div>
          <Input label="Nombre completo" textMuted={textMuted}><input value={academyForm.nombre} onChange={(e) => setAcademyForm({ ...academyForm, nombre: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
          <button onClick={createAcademia} className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-[11px] font-black uppercase tracking-widest text-white">Crear academia</button>
        </Modal>
      )}

      {modalUser && (
        <Modal title="Crear usuario" onClose={() => setModalUser(false)} panelClass={panelClass} isDark={isDark}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nombre completo" textMuted={textMuted}><input value={userForm.nombre_completo} onChange={(e) => setUserForm({ ...userForm, nombre_completo: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
            <Input label="Email" textMuted={textMuted}><input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
            <Input label="Password" textMuted={textMuted}><input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
            <Input label="Codigo ID" textMuted={textMuted}><input value={userForm.id_usuario} onChange={(e) => setUserForm({ ...userForm, id_usuario: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
            <Input label="Rol" textMuted={textMuted}>
              <select value={userForm.rol} onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
                <optgroup label="🛡️ Administración">
                  <option value="superadmin">superadmin</option>
                  <option value="admin_soporte">admin_soporte</option>
                  <option value="soporte_comercial">soporte_comercial</option>
                  <option value="agencia_marketing">agencia_marketing</option>
                </optgroup>
                <optgroup label="🎓 Academia">
                  <option value="director">director</option>
                  <option value="secretaria">secretaria</option>
                  <option value="profesor">profesor</option>
                  <option value="tutor">tutor</option>
                  <option value="marketing_academia">marketing_academia</option>
                  <option value="alumno">alumno</option>
                </optgroup>
                <optgroup label="👪 Familia">
                  <option value="padre">padre</option>
                </optgroup>
              </select>
            </Input>
            <Input label="Academia" textMuted={textMuted}><select value={userForm.id_academia} onChange={(e) => setUserForm({ ...userForm, id_academia: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}><option value="">Selecciona una academia</option>{academias.map((academy) => <option key={academy.id_academia} value={academy.id_academia}>{academy.nombre}</option>)}</select></Input>
          </div>
          <button onClick={createUser} className="mt-6 w-full rounded-xl bg-blue-600 py-4 text-[11px] font-black uppercase tracking-widest text-white">Crear usuario</button>
        </Modal>
      )}

      {/* ═══ TAB: SALUD DE ACADEMIAS ═══ */}
      {!loading && tab === 'salud' && (
        <SaludAcademias isDark={isDark} textMuted={textMuted} cardBg={cardBg} />
      )}

      {/* ═══ TAB: PERMISOS POR ROL ═══ */}
      {!loading && tab === 'permisos' && (
        <PermisosRoles
          academias={academias}
          permisosAcadId={permisosAcadId}
          setPermisosAcadId={setPermisosAcadId}
          permisosRoles={permisosRoles}
          setPermisosRoles={setPermisosRoles}
          guardandoPerm={guardandoPerm}
          setGuardandoPerm={setGuardandoPerm}
          panelClass={panelClass}
          textMuted={textMuted}
          isDark={isDark}
        />
      )}

      {/* MODAL: CAMBIAR ROL */}
      {modalCambiarRol && usuarioSeleccionado && (
        <Modal title="Cambiar rol de usuario" onClose={() => setModalCambiarRol(false)} panelClass={panelClass} isDark={isDark}>
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className="font-bold text-sm">{usuarioSeleccionado.nombre_completo}</p>
              <p className={`text-[11px] ${textMuted}`}>{usuarioSeleccionado.id_usuario} · {usuarioSeleccionado.email || 'sin email'}</p>
              <p className={`text-[10px] mt-2 ${textMuted}`}>Rol actual: <span className="font-bold text-blue-400">{usuarioSeleccionado.rol}</span></p>
            </div>
            
            <Input label="Nuevo rol" textMuted={textMuted}>
              <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
                <optgroup label="🛡️ Administración">
                  <option value="superadmin">superadmin</option>
                  <option value="admin_soporte">admin_soporte</option>
                  <option value="soporte_comercial">soporte_comercial</option>
                  <option value="agencia_marketing">agencia_marketing</option>
                </optgroup>
                <optgroup label="🎓 Academia">
                  <option value="director">director</option>
                  <option value="secretaria">secretaria</option>
                  <option value="profesor">profesor</option>
                  <option value="tutor">tutor</option>
                  <option value="marketing_academia">marketing_academia</option>
                  <option value="alumno">alumno</option>
                </optgroup>
                <optgroup label="👪 Familia">
                  <option value="padre">padre</option>
                </optgroup>
              </select>
            </Input>
            
            <div className={`p-3 rounded-xl text-[11px] font-bold ${isDark ? 'bg-amber-900/20 border border-amber-800/30 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
              ⚠️ Este cambio quedará registrado en el log de auditoría. El usuario tendrá los permisos del nuevo rol inmediatamente.
            </div>
            
            <button onClick={cambiarRolUsuario} disabled={cambiandoRol || nuevoRol === usuarioSeleccionado.rol}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] transition-all">
              {cambiandoRol ? "⏳ Cambiando rol..." : "🔄 Confirmar cambio de rol"}
            </button>
          </div>
        </Modal>
      )}

      {modalTicket && (
        <Modal title="Nueva solicitud interna" onClose={() => setModalTicket(false)} panelClass={panelClass} isDark={isDark}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Categoria" textMuted={textMuted}><select value={ticketForm.categoria} onChange={(e) => setTicketForm({ ...ticketForm, categoria: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}><option value="soporte">soporte</option><option value="marketing">marketing</option><option value="finanzas">finanzas</option><option value="branding">branding</option></select></Input>
            <Input label="Destino" textMuted={textMuted}><select value={ticketForm.destino_equipo} onChange={(e) => setTicketForm({ ...ticketForm, destino_equipo: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}><option value="soporte">soporte</option><option value="marketing">marketing</option></select></Input>
          </div>
          <Input label="Titulo" textMuted={textMuted}><input value={ticketForm.titulo} onChange={(e) => setTicketForm({ ...ticketForm, titulo: e.target.value })} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
          <Input label="Descripcion" textMuted={textMuted}><textarea value={ticketForm.descripcion} onChange={(e) => setTicketForm({ ...ticketForm, descripcion: e.target.value })} className={`h-28 w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} /></Input>
          <button onClick={createTicket} className="mt-6 w-full rounded-xl bg-indigo-600 py-4 text-[11px] font-black uppercase tracking-widest text-white">Registrar solicitud</button>
        </Modal>
      )}
    </section>
  );
}

function Modal({ title, onClose, panelClass, isDark, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl ${panelClass}`}>
        <div className={`flex items-center justify-between border-b p-6 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <h3 className="text-xl font-extrabold">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-black text-slate-300">X</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, textMuted, children }) {
  return (
    <div className="space-y-1.5">
      <label className={`block text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{label}</label>
      {children}
    </div>
  );
}

// ─── Módulos disponibles por rol ──────────────────────────────────────────────
const MODULOS_POR_ROL = {
  director: [
    { id: 'crm',               label: 'CRM Ventas' },
    { id: 'marketing',         label: 'Marketing' },
    { id: 'importar',          label: 'Migración de Datos' },
    { id: 'comunicados',       label: 'Comunicados' },
    { id: 'mapa_calor',        label: 'Mapa de Calor' },
    { id: 'analisis_preguntas',label: 'Análisis por Pregunta' },
    { id: 'calendario',        label: 'Calendario' },
    { id: 'salones',           label: 'Gestión de Salones' },
    { id: 'alumnos',           label: 'Gestión de Alumnos' },
  ],
  secretaria: [
    { id: 'pagos',       label: 'Pagos y Boletas' },
    { id: 'alumnos',     label: 'Gestión de Alumnos' },
    { id: 'documentos',  label: 'Documentos' },
    { id: 'lista_espera',label: 'Lista de Espera' },
    { id: 'comunicados', label: 'Comunicados' },
    { id: 'marketing',   label: 'Marketing' },
    { id: 'comunidad',   label: 'Comunidad / Recursos' },
    { id: 'calendario',  label: 'Calendario' },
  ],
  profesor: [
    { id: 'asistencia',  label: 'Control de Asistencia' },
    { id: 'alumnos',     label: 'Padrón de Alumnos' },
    { id: 'mapa_calor',  label: 'Mapa de Calor' },
    { id: 'plantillas',  label: 'Modelos de Evaluación' },
    { id: 'bandeja_omr', label: 'Bandeja OMR' },
    { id: 'ia',          label: 'Scanner IA' },
    { id: 'comunicados', label: 'Comunicados' },
  ],
  alumno: [
    { id: 'comunidad', label: 'Aula Virtual / Comunidad' },
  ],
  tutor: [
    { id: 'comunidad', label: 'Biblioteca Digital' },
  ],
};

const ROLES_LABELS = {
  director:  { label: 'Director',   icon: '👑', color: 'emerald' },
  secretaria:{ label: 'Secretaria', icon: '👩‍💼', color: 'blue'   },
  profesor:  { label: 'Profesor',   icon: '👨‍🏫', color: 'purple' },
  alumno:    { label: 'Alumno',     icon: '🎓', color: 'amber'  },
  tutor:     { label: 'Tutor',      icon: '🧑‍🏫', color: 'teal'  },
};

function PermisosRoles({
  academias, permisosAcadId, setPermisosAcadId,
  permisosRoles, setPermisosRoles, guardandoPerm, setGuardandoPerm,
  panelClass, textMuted, isDark,
}) {
  const [cargando, setCargando] = useState(false);

  const cargarPermisos = async (idAcademia) => {
    setPermisosAcadId(idAcademia);
    setCargando(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/academias/${idAcademia}/permisos-roles`), {
        headers: { Authorization: `Bearer ${localStorage.getItem('edusaas_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Si no hay permisos guardados, inicializar con todos los módulos activos
        const iniciales = {};
        Object.keys(MODULOS_POR_ROL).forEach(rol => {
          iniciales[rol] = data.permisos_roles[rol] ?? MODULOS_POR_ROL[rol].map(m => m.id);
        });
        setPermisosRoles(iniciales);
      }
    } finally { setCargando(false); }
  };

  const toggleModulo = (rol, moduloId) => {
    setPermisosRoles(prev => {
      const actual = prev[rol] || MODULOS_POR_ROL[rol].map(m => m.id);
      const existe = actual.includes(moduloId);
      return { ...prev, [rol]: existe ? actual.filter(m => m !== moduloId) : [...actual, moduloId] };
    });
  };

  const guardar = async () => {
    if (!permisosAcadId) return;
    setGuardandoPerm(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/academias/${permisosAcadId}/permisos-roles`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('edusaas_token')}` },
        body: JSON.stringify({ permisos_roles: permisosRoles }),
      });
      if (res.ok) alert('Permisos guardados correctamente.');
      else { const e = await res.json(); alert(e.error); }
    } finally { setGuardandoPerm(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight mb-1">Permisos por Rol</h2>
        <p className={`text-sm ${textMuted}`}>
          Activa o desactiva módulos para cada rol en una academia específica.
        </p>
      </div>

      {/* Selector de academia */}
      <div className={`rounded-2xl border p-5 ${panelClass}`}>
        <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Academia</label>
        <select
          value={permisosAcadId}
          onChange={e => cargarPermisos(e.target.value)}
          className={`w-full max-w-md rounded-xl border px-4 py-2.5 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
        >
          <option value="">— Selecciona una academia —</option>
          {academias.map(a => <option key={a.id_academia} value={a.id_academia}>{a.nombre}</option>)}
        </select>
      </div>

      {cargando && (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!cargando && permisosAcadId && Object.keys(permisosRoles).length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(MODULOS_POR_ROL).map(([rol, modulos]) => {
              const meta = ROLES_LABELS[rol];
              const activos = permisosRoles[rol] || [];
              return (
                <div key={rol} className={`rounded-2xl border ${panelClass} overflow-hidden`}>
                  <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'} flex items-center gap-2`}>
                    <span>{meta.icon}</span>
                    <span className="font-extrabold">{meta.label}</span>
                    <span className={`ml-auto text-[10px] font-black ${textMuted}`}>{activos.length}/{modulos.length} activos</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {modulos.map(m => {
                      const on = activos.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-3 cursor-pointer group">
                          <div
                            onClick={() => toggleModulo(rol, m.id)}
                            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${on ? `bg-${meta.color}-500` : (isDark ? 'bg-slate-700' : 'bg-slate-300')}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                          <span className={`text-sm font-bold transition-colors ${on ? '' : textMuted}`}>{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={guardar}
            disabled={guardandoPerm}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all disabled:opacity-50"
          >
            {guardandoPerm ? 'Guardando...' : '💾 Guardar Permisos'}
          </button>
        </>
      )}
    </div>
  );
}

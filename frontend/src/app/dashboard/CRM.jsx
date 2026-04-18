import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('edusaas_token')}`,
  'Content-Type': 'application/json',
});

const COLUMN_ORDER = ['nuevo', 'contactado', 'convertido', 'perdido'];

export default function CRM({ isDark, textMuted, academyConfig }) {
  const [prospectos, setProspectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    interes_ciclo: '',
    fuente: 'WhatsApp',
    observaciones: '',
    estado: 'nuevo',
  });

  async function fetchProspectos() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/crm/prospectos'), { headers: getHeaders() });
      const data = await res.json();
      setProspectos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error CRM:', error);
      setProspectos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(fetchProspectos);
  }, []);

  const resetForm = () => {
    setForm({
      nombre_completo: '',
      telefono: '',
      email: '',
      interes_ciclo: '',
      fuente: 'WhatsApp',
      observaciones: '',
      estado: 'nuevo',
    });
    setEditando(null);
  };

  const guardarProspecto = async (e) => {
    e.preventDefault();
    const endpoint = editando
      ? apiUrl(`/api/crm/prospectos/${editando.id_prospecto}`)
      : apiUrl('/api/crm/prospectos');
    const method = editando ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'No se pudo guardar el prospecto.');

    setModalNuevo(false);
    resetForm();
    fetchProspectos();
  };

  const cambiarEstado = async (id, estado) => {
    const res = await fetch(apiUrl(`/api/crm/prospectos/${id}/estado`), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ estado }),
    });
    if (res.ok) fetchProspectos();
  };

  const abrirEdicion = (prospecto) => {
    setEditando(prospecto);
    setForm({
      nombre_completo: prospecto.nombre_completo || '',
      telefono: prospecto.telefono || '',
      email: prospecto.email || '',
      interes_ciclo: prospecto.interes_ciclo || '',
      fuente: prospecto.fuente || 'WhatsApp',
      observaciones: prospecto.observaciones || '',
      estado: prospecto.estado || 'nuevo',
    });
    setModalNuevo(true);
  };

  const resumen = COLUMN_ORDER.reduce((acc, estado) => {
    acc[estado] = prospectos.filter((item) => item.estado === estado).length;
    return acc;
  }, {});

  const panelClass = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';
  const inputClass = isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">CRM de la academia</h2>
          <p className={`text-sm ${textMuted}`}>
            Este panel lo comparten direccion y secretaria para hacer seguimiento comercial de su sede.
          </p>
          {academyConfig?.nombre && (
            <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-blue-400">
              Academia: {academyConfig.nombre}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalNuevo(true);
          }}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20"
        >
          + Nuevo prospecto
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLUMN_ORDER.map((estado) => (
          <div key={estado} className={`rounded-2xl border p-5 ${panelClass}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{estado}</p>
            <p className="mt-2 text-4xl font-black">{resumen[estado] || 0}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {COLUMN_ORDER.map((estado) => (
            <div key={estado} className={`rounded-3xl border p-4 ${panelClass}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest">{estado}</h3>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black">
                  {resumen[estado] || 0}
                </span>
              </div>

              <div className="space-y-3">
                {prospectos
                  .filter((prospecto) => prospecto.estado === estado)
                  .map((prospecto) => (
                    <div key={prospecto.id_prospecto} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'}`}>
                      <p className="font-extrabold">{prospecto.nombre_completo}</p>
                      <p className={`mt-1 text-[11px] ${textMuted}`}>{prospecto.interes_ciclo || 'Sin ciclo definido'}</p>
                      <div className="mt-3 space-y-1 text-[11px]">
                        <p>{prospecto.telefono || 'Sin telefono'}</p>
                        <p>{prospecto.email || 'Sin email'}</p>
                        <p className={textMuted}>{prospecto.fuente || 'Sin fuente'}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {estado !== 'contactado' && (
                          <button onClick={() => cambiarEstado(prospecto.id_prospecto, 'contactado')} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
                            Contactado
                          </button>
                        )}
                        {estado !== 'convertido' && (
                          <button onClick={() => cambiarEstado(prospecto.id_prospecto, 'convertido')} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            Convertido
                          </button>
                        )}
                        {estado !== 'perdido' && (
                          <button onClick={() => cambiarEstado(prospecto.id_prospecto, 'perdido')} className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400">
                            Perdido
                          </button>
                        )}
                        <button onClick={() => abrirEdicion(prospecto)} className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-400">
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}

                {prospectos.filter((prospecto) => prospecto.estado === estado).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                    No hay prospectos aqui.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-[2rem] border p-8 shadow-2xl ${panelClass}`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-extrabold">{editando ? 'Editar prospecto' : 'Nuevo prospecto'}</h3>
              <button onClick={() => { setModalNuevo(false); resetForm(); }} className="rounded-full bg-slate-800 px-3 py-1 text-sm font-black text-slate-300">
                X
              </button>
            </div>

            <form onSubmit={guardarProspecto} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input required value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} placeholder="Nombre completo" className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Telefono" className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                <input value={form.interes_ciclo} onChange={(e) => setForm({ ...form, interes_ciclo: e.target.value })} placeholder="Ciclo de interes" className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
                <select value={form.fuente} onChange={(e) => setForm({ ...form, fuente: e.target.value })} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook">Facebook</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Llamada">Llamada</option>
                  <option value="Referido">Referido</option>
                </select>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={`rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`}>
                  {COLUMN_ORDER.map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>
              <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Observaciones y seguimiento..." className={`h-28 w-full rounded-xl border px-4 py-3 text-sm outline-none ${inputClass}`} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalNuevo(false); resetForm(); }} className="flex-1 rounded-xl border border-slate-700 py-3 text-[11px] font-black uppercase tracking-widest">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-blue-600 py-3 text-[11px] font-black uppercase tracking-widest text-white">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

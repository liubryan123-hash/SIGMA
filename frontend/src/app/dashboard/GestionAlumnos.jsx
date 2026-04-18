"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

const authHeaders = (json = false) => {
  const headers = { Authorization: `Bearer ${localStorage.getItem("edusaas_token")}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
};

export default function GestionAlumnos({ isDark, textMuted, academyConfig }) {
  const [alumnos, setAlumnos] = useState([]);
  const [salones, setSalones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  // Ciclo de vida
  const [cicloModal, setCicloModal] = useState(null); // alumno seleccionado
  const [cambiandoCiclo, setCambiandoCiclo] = useState(false);

  // Módulo tutor
  const [tutorModal, setTutorModal]   = useState(null);
  const [tutores, setTutores]         = useState([]);
  const [asignandoTutor, setAsignandoTutor] = useState(false);

  // Módulo padre
  const [padreModal, setPadreModal]   = useState(null);
  const [padres, setPadres]           = useState([]);
  const [asignandoPadre, setAsignandoPadre] = useState(false);

  // Comentarios privados
  const [alumnoNotas, setAlumnoNotas]       = useState(null); // alumno seleccionado
  const [comentarios, setComentarios]       = useState([]);
  const [cargandoNotas, setCargandoNotas]   = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviandoNota, setEnviandoNota]     = useState(false);

  // Historial de evaluaciones
  const [historialModal, setHistorialModal] = useState(null);
  const [historialData, setHistorialData]   = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const abrirHistorial = async (al) => {
    setHistorialModal(al);
    setHistorialData([]);
    setCargandoHistorial(true);
    try {
      const res = await fetch(apiUrl(`/api/alumnos/${al.id_usuario}/resultados`), { headers: authHeaders() });
      if (res.ok) setHistorialData(await res.json());
    } catch { /* silencioso */ }
    setCargandoHistorial(false);
  };

  const abrirNotas = async (al) => {
    setAlumnoNotas(al);
    setComentarios([]);
    setCargandoNotas(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/alumnos/${al.id_usuario}/comentarios`), { headers: authHeaders() });
      if (res.ok) setComentarios(await res.json());
    } catch { /* silencioso */ }
    setCargandoNotas(false);
  };

  const enviarNota = async () => {
    if (!nuevoComentario.trim()) return;
    setEnviandoNota(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/alumnos/${alumnoNotas.id_usuario}/comentarios`), {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ texto: nuevoComentario }),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setComentarios(prev => [{ ...nuevo, autor_nombre: "Tú", autor_rol: "—" }, ...prev]);
        setNuevoComentario("");
      }
    } catch { /* silencioso */ }
    setEnviandoNota(false);
  };
  
  const [form, setForm] = useState({
    nombre_completo: "",
    email: "",
    password: "",
    id_salon: "",
    id_usuario_custom: "",
    activo: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [alumnosRes, salonesRes] = await Promise.all([
        fetch(apiUrl("/api/alumnos"), { headers: authHeaders() }),
        fetch(apiUrl("/api/alumnos/salones"), { headers: authHeaders() })
      ]);
      const alumnosData = await alumnosRes.json();
      const salonesData = await salonesRes.json();
      
      setAlumnos(Array.isArray(alumnosData) ? alumnosData : []);
      setSalones(Array.isArray(salonesData) ? salonesData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editando) {
        res = await fetch(apiUrl(`/api/alumnos/${editando.id_usuario}`), {
          method: "PUT",
          headers: authHeaders(true),
          body: JSON.stringify({
            nombre_completo: form.nombre_completo,
            email: form.email,
            id_salon: form.id_salon,
            activo: form.activo
          })
        });
      } else {
        res = await fetch(apiUrl("/api/alumnos/registrar"), {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify(form)
        });
      }
      
      const data = await res.json();
      if (!res.ok) return alert(data.error || "Ocurrió un error");
      
      alert(data.mensaje || "Operación exitosa");
      setModalOpen(false);
      loadData();
    } catch (e) {
      alert("Error de red");
    }
  };

  const handleEdit = (al) => {
    setEditando(al);
    setForm({
      nombre_completo: al.nombre_completo,
      email: al.email || "",
      password: "",
      id_salon: al.id_salon || "",
      id_usuario_custom: al.id_usuario,
      activo: al.activo
    });
    setModalOpen(true);
  };

  const handleToggleEstado = async (al) => {
    const act = !al.activo;
    if (!confirm(`¿Confirmas que deseas ${act ? 'reactivar' : 'dar de baja'} a ${al.nombre_completo}?`)) return;
    
    try {
      const url = act 
        ? apiUrl(`/api/alumnos/${al.id_usuario}/reactivar`)
        : apiUrl(`/api/alumnos/${al.id_usuario}`);
        
      const method = act ? "PUT" : "DELETE";
      
      const res = await fetch(url, { method, headers: authHeaders() });
      if (res.ok) loadData();
      else alert("Error al cambiar estado");
    } catch(e) {
      console.error(e);
    }
  };

  const handleCicloVida = async (alumno, nuevoEstado) => {
    setCambiandoCiclo(true);
    try {
      const res = await fetch(apiUrl(`/api/alumnos/${alumno.id_usuario}/estado`), {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ estado_alumno: nuevoEstado }),
      });
      if (res.ok) { setCicloModal(null); loadData(); }
      else { const d = await res.json(); alert(d.error || "Error al cambiar estado."); }
    } catch { alert("Error de red."); }
    setCambiandoCiclo(false);
  };

  const abrirPadreModal = async (alumno) => {
    setPadreModal(alumno);
    if (!padres.length) {
      const res = await fetch(apiUrl('/api/director/padres'), { headers: authHeaders() });
      if (res.ok) setPadres(await res.json());
    }
  };

  const asignarPadre = async (idPadre) => {
    if (!padreModal) return;
    setAsignandoPadre(true);
    try {
      const res = await fetch(apiUrl(`/api/alumnos/${padreModal.id_usuario}/padre`), {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ id_padre: idPadre }),
      });
      if (res.ok) { setPadreModal(null); loadData(); }
      else { const d = await res.json(); alert(d.error || 'Error asignando apoderado.'); }
    } catch { alert('Error de red.'); }
    setAsignandoPadre(false);
  };

  const abrirTutorModal = async (alumno) => {
    setTutorModal(alumno);
    if (!tutores.length) {
      const res = await fetch(apiUrl('/api/director/tutores'), { headers: authHeaders() });
      if (res.ok) setTutores(await res.json());
    }
  };

  const asignarTutor = async (idTutor) => {
    if (!tutorModal) return;
    setAsignandoTutor(true);
    try {
      const res = await fetch(apiUrl(`/api/alumnos/${tutorModal.id_usuario}/tutor`), {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ id_tutor: idTutor }),
      });
      if (res.ok) { setTutorModal(null); loadData(); }
      else { const d = await res.json(); alert(d.error || 'Error asignando tutor.'); }
    } catch { alert('Error de red.'); }
    setAsignandoTutor(false);
  };

  const alumnosFiltrados = filtroEstado === "todos"
    ? alumnos
    : alumnos.filter(a => (a.estado_alumno || "activo") === filtroEstado);

  const exportarCSV = () => {
    if (!alumnos.length) return;
    const encabezado = ["ID", "Nombre", "Email", "Salón", "Ciclo", "Estado"];
    const filas = alumnos.map(a => [
      a.id_usuario,
      a.nombre_completo,
      a.email || "",
      a.nombre_salon || "",
      a.nombre_ciclo || "",
      a.activo ? "Activo" : "Baja",
    ]);
    const csv = [encabezado, ...filas]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `padron_alumnos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Padrón de Alumnos</h2>
          <p className={`text-sm ${textMuted}`}>Gestiona matrículas, salones y accesos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro ciclo de vida */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className={`font-black px-4 py-3 rounded-xl text-[10px] uppercase tracking-widest border outline-none transition-all ${isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="graduado">Graduados</option>
            <option value="retirado">Retirados</option>
          </select>
          {alumnos.length > 0 && (
            <button
              onClick={exportarCSV}
              className={`font-black px-5 py-3 rounded-xl uppercase tracking-widest text-[10px] border transition-all ${isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            >
              ⬇ Exportar CSV
            </button>
          )}
          <button
            onClick={() => {
              setEditando(null);
              setForm({ nombre_completo: "", email: "", password: "", id_salon: "", id_usuario_custom: "", activo: true });
              setModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-lg"
          >
            + MATRICULAR ALUMNO
          </button>
        </div>
      </div>

      <div className={`border rounded-[2rem] overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-slate-950/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Salón / Ciclo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Cargando padrón...</td></tr>
              ) : alumnosFiltrados.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                  {alumnos.length === 0 ? "No hay alumnos registrados." : "Sin alumnos con ese estado."}
                </td></tr>
              ) : (
                alumnosFiltrados.map((al) => {
                  const ciclo = al.estado_alumno || "activo";
                  const cicloCls = {
                    activo:   "bg-emerald-500/10 text-emerald-500",
                    inactivo: "bg-slate-500/10 text-slate-400",
                    graduado: "bg-blue-500/10 text-blue-400",
                    retirado: "bg-rose-500/10 text-rose-400",
                  }[ciclo] || "bg-slate-500/10 text-slate-400";
                  return (
                    <tr key={al.id_usuario} className={`transition-colors hover:bg-slate-800/5 dark:hover:bg-slate-800/50`}>
                      <td className="px-6 py-4">
                        <p className="font-extrabold">{al.nombre_completo}</p>
                        <p className={`text-[10px] font-mono ${textMuted}`}>{al.id_usuario}</p>
                      </td>
                      <td className="px-6 py-4">
                        {al.email ? <a href={`mailto:${al.email}`} className="text-blue-500 hover:underline">{al.email}</a> : <span className={textMuted}>N/A</span>}
                      </td>
                      <td className="px-6 py-4">
                        {al.nombre_salon ? (
                          <div>
                            <p className="font-bold text-emerald-500 dark:text-emerald-400">{al.nombre_salon}</p>
                            <p className={`text-[10px] ${textMuted}`}>{al.nombre_ciclo}</p>
                          </div>
                        ) : <span className={textMuted}>Sin Asignar</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cicloCls}`}>
                          {ciclo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                         <button onClick={() => abrirHistorial(al)} className="text-indigo-400 hover:text-indigo-300 font-bold text-xs">Historial</button>
                         <button onClick={() => abrirNotas(al)} className="text-amber-500 hover:text-amber-400 font-bold text-xs">Notas</button>
                         <button onClick={() => handleEdit(al)} className="text-blue-500 hover:text-blue-400 font-bold text-xs">Editar</button>
                         <button onClick={() => setCicloModal(al)} className="text-violet-400 hover:text-violet-300 font-bold text-xs">Ciclo</button>
                         <button onClick={() => abrirTutorModal(al)} className="text-teal-400 hover:text-teal-300 font-bold text-xs">Tutor</button>
                         <button onClick={() => abrirPadreModal(al)} className="text-sky-400 hover:text-sky-300 font-bold text-xs">Padre</button>
                         <button onClick={() => handleToggleEstado(al)} className={`${al.activo ? 'text-rose-500' : 'text-emerald-500'} font-bold text-xs`}>
                           {al.activo ? 'Baja' : 'Reactivar'}
                         </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-[2rem] border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-xl font-black">{editando ? 'Editar Alumno' : 'Nuevo Ingreso'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Nombre Completo</label>
                <input required value={form.nombre_completo} onChange={e => setForm({...form, nombre_completo: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Email (Opcional)</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={`w-full p-4 rounded-xl border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                 </div>
                 {!editando && (
                   <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Contraseña inicial</label>
                    <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={`w-full p-4 rounded-xl border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                   </div>
                 )}
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Asignación de Salón</label>
                <select value={form.id_salon} onChange={e => setForm({...form, id_salon: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="">Sin asignar (Libre)</option>
                  {salones.map(s => <option key={s.id_salon} value={s.id_salon}>{s.nombre_salon} ({s.nombre_ciclo})</option>)}
                </select>
              </div>
              {!editando && (
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Código Custom (Opcional)</label>
                  <input value={form.id_usuario_custom} onChange={e => setForm({...form, id_usuario_custom: e.target.value})} placeholder="Ej: ALUM-001" className={`w-full p-4 rounded-xl border outline-none font-mono text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
                </div>
              )}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
                {editando ? 'Guardar Cambios' : 'Registrar Matrícula'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Ciclo de Vida */}
      {cicloModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <h3 className="text-lg font-black">🔄 Ciclo de vida</h3>
                <p className={`text-[11px] font-bold mt-0.5 ${textMuted}`}>{cicloModal.nombre_completo}</p>
              </div>
              <button onClick={() => setCicloModal(null)} className="text-slate-500 hover:text-white font-black">✕</button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { val: "activo",   label: "🟢 Activo",    cls: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
                { val: "inactivo", label: "⚪ Inactivo",   cls: "border-slate-500/30 text-slate-400 hover:bg-slate-500/10" },
                { val: "graduado", label: "🎓 Graduado",   cls: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
                { val: "retirado", label: "🔴 Retirado",   cls: "border-rose-500/30 text-rose-400 hover:bg-rose-500/10" },
              ].map(op => (
                <button
                  key={op.val}
                  disabled={cambiandoCiclo || (cicloModal.estado_alumno || "activo") === op.val}
                  onClick={() => handleCicloVida(cicloModal, op.val)}
                  className={`w-full py-3 px-5 rounded-xl border font-black text-sm transition-all disabled:opacity-40 ${op.cls}`}
                >
                  {op.label}
                  {(cicloModal.estado_alumno || "activo") === op.val && " ← actual"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Padre/Apoderado */}
      {padreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <h3 className="text-lg font-black">Asignar Apoderado</h3>
                <p className={`text-[11px] font-bold mt-0.5 ${textMuted}`}>{padreModal.nombre_completo}</p>
              </div>
              <button onClick={() => setPadreModal(null)} className="text-slate-500 hover:text-white font-black">✕</button>
            </div>
            <div className="p-6 space-y-3">
              {padres.length === 0 && (
                <p className={`text-sm text-center py-4 ${textMuted}`}>No hay apoderados registrados. Crea un usuario con rol &quot;padre&quot; primero.</p>
              )}
              {padres.map((p) => (
                <button
                  key={p.id_usuario}
                  disabled={asignandoPadre}
                  onClick={() => asignarPadre(p.id_usuario)}
                  className="w-full py-3 px-5 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 font-bold text-sm transition-all disabled:opacity-40 text-left"
                >
                  <span className="block font-black">{p.nombre_completo}</span>
                  <span className={`text-[10px] ${textMuted}`}>{p.id_usuario} · {p.hijos_vinculados} hijos vinculados</span>
                </button>
              ))}
              {padreModal.id_padre && (
                <button
                  disabled={asignandoPadre}
                  onClick={() => asignarPadre(null)}
                  className="w-full py-3 px-5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-sm transition-all disabled:opacity-40"
                >
                  Remover apoderado actual
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tutor */}
      {tutorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <h3 className="text-lg font-black">Asignar Tutor</h3>
                <p className={`text-[11px] font-bold mt-0.5 ${textMuted}`}>{tutorModal.nombre_completo}</p>
              </div>
              <button onClick={() => setTutorModal(null)} className="text-slate-500 hover:text-white font-black">✕</button>
            </div>
            <div className="p-6 space-y-3">
              {tutores.length === 0 && (
                <p className={`text-sm text-center py-4 ${textMuted}`}>No hay tutores registrados en esta academia. Crea un usuario con rol &quot;tutor&quot; primero.</p>
              )}
              {tutores.map((t) => (
                <button
                  key={t.id_usuario}
                  disabled={asignandoTutor}
                  onClick={() => asignarTutor(t.id_usuario)}
                  className="w-full py-3 px-5 rounded-xl border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 font-bold text-sm transition-all disabled:opacity-40 text-left"
                >
                  <span className="block font-black">{t.nombre_completo}</span>
                  <span className={`text-[10px] ${textMuted}`}>{t.id_usuario} · {t.alumnos_vinculados} alumnos actuales</span>
                </button>
              ))}
              {tutorModal.id_tutor && (
                <button
                  disabled={asignandoTutor}
                  onClick={() => asignarTutor(null)}
                  className={`w-full py-3 px-5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-sm transition-all disabled:opacity-40 ${textMuted}`}
                >
                  Remover tutor actual
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Notas privadas */}
      {alumnoNotas && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-lg font-black">📝 Notas privadas</h3>
                <p className={`text-[11px] font-bold mt-0.5 ${textMuted}`}>{alumnoNotas.nombre_completo}</p>
              </div>
              <button onClick={() => setAlumnoNotas(null)} className="text-slate-500 hover:text-white transition-colors font-black">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cargandoNotas && <p className={`text-sm ${textMuted}`}>Cargando notas...</p>}
              {!cargandoNotas && comentarios.length === 0 && (
                <p className={`text-sm text-center py-8 ${textMuted}`}>Sin notas todavía. Sé el primero en dejar una.</p>
              )}
              {comentarios.map(c => (
                <div key={c.id_comentario} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-sm leading-relaxed">{c.texto}</p>
                  <p className={`text-[10px] font-bold mt-2 ${textMuted}`}>
                    {c.autor_nombre} · {c.autor_rol} · {new Date(c.fecha_creacion).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))}
            </div>
            <div className={`p-4 border-t flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex gap-2">
                <input
                  value={nuevoComentario}
                  onChange={e => setNuevoComentario(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarNota()}
                  placeholder="Escribe una nota privada..."
                  className={`flex-1 text-sm px-4 py-2.5 rounded-xl border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 focus:border-amber-400'}`}
                />
                <button onClick={enviarNota} disabled={enviandoNota || !nuevoComentario.trim()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black rounded-xl text-xs transition-all">
                  {enviandoNota ? "..." : "↵"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial Evaluaciones */}
      {historialModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-xl font-black text-indigo-500">📈 Curva de Progreso</h3>
                <p className={`text-[11px] font-bold mt-0.5 ${textMuted}`}>{historialModal.nombre_completo}</p>
              </div>
              <button onClick={() => setHistorialModal(null)} className="text-slate-500 hover:text-white transition-colors font-black">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cargandoHistorial && <div className="text-center py-8"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent flex items-center justify-center animate-spin rounded-full mx-auto"/></div>}
              {!cargandoHistorial && historialData.length === 0 && (
                <p className={`text-sm text-center py-8 ${textMuted}`}>Este alumno aún no ha rendido ningún examen calificado.</p>
              )}
              {!cargandoHistorial && historialData.length > 0 && (
                <div className="space-y-4">
                  {historialData.map((ev, i) => {
                    const prev = historialData[i + 1]; // Asumiendo orden descendente por fecha
                    const diff = prev ? ev.puntaje_total - prev.puntaje_total : 0;
                    return (
                      <div key={ev.id_resultado} className={`p-5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <p className="font-extrabold text-base">{ev.nombre_plantilla || 'Examen'}</p>
                          <p className={`text-[10px] uppercase font-black tracking-widest mt-1 ${textMuted}`}>
                            {new Date(ev.fecha_examen || ev.fecha_creacion).toLocaleDateString('es-PE')} • {ev.universidad || 'General'}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          {diff !== 0 && (
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${diff > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(2)} pts
                            </span>
                          )}
                          <div className={`text-2xl font-black tracking-tighter ${ev.puntaje_total >= 1000 ? 'text-emerald-400' : ev.puntaje_total > 500 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {Number(ev.puntaje_total).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

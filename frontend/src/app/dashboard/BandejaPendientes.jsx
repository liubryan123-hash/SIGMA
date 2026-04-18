"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export default function BandejaPendientes({ isDark, textMuted, cardBg }) {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [alumnos, setAlumnos] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  
  // Estados para el modal de asignación
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [alumnoId, setAlumnoId] = useState("");
  const [codigoExamenCorrecto, setCodigoExamenCorrecto] = useState("");
  const [procesando, setProcesando] = useState(false);

  const token = () => localStorage.getItem("edusaas_token");
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  const cargarPendientes = async () => {
    try {
      const res = await fetch(apiUrl("/api/exams/pendientes"), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setPendientes(data);
    } catch (err) {
      console.error("Error cargando pendientes:", err);
    } finally {
      setCargando(false);
    }
  };

  const cargarAlumnos = async () => {
    try {
      const res = await fetch(apiUrl("/api/academic/alumnos"), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setAlumnos(data);
    } catch (err) {
      console.error("Error cargando alumnos:", err);
    }
  };

  const cargarPlantillas = async () => {
    try {
      const res = await fetch(apiUrl("/api/exams/plantillas"), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setPlantillas(data);
    } catch (err) {
      console.error("Error cargando plantillas:", err);
    }
  };

  useEffect(() => {
    cargarPendientes();
    cargarAlumnos();
    cargarPlantillas();
  }, []);

  const abrirModalAsignar = (pendiente) => {
    setSeleccionado(pendiente);
    setAlumnoId(pendiente.id_usuario_asignado || "");
    setCodigoExamenCorrecto(pendiente.codigo_examen || "");
    setModalAsignar(true);
  };

  const asignarAlumno = async () => {
    if (!alumnoId) {
      alert("Selecciona un alumno");
      return;
    }
    setProcesando(true);
    try {
      const res = await fetch(apiUrl(`/api/exams/pendientes/${seleccionado.id_pendiente}/asignar`), {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario_asignado: alumnoId,
          codigo_examen_correcto: codigoExamenCorrecto
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
        setModalAsignar(false);
        cargarPendientes();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de red al asignar");
    } finally {
      setProcesando(false);
    }
  };

  const confirmarPendiente = async (pendiente) => {
    if (!pendiente.id_usuario_asignado) {
      alert("Primero debes asignar un alumno");
      abrirModalAsignar(pendiente);
      return;
    }
    if (!confirm("¿Confirmar este resultado y guardarlo en la base de datos?")) return;
    
    setProcesando(true);
    try {
      const res = await fetch(apiUrl(`/api/exams/pendientes/${pendiente.id_pendiente}/confirmar`), {
        method: "POST",
        headers: headers()
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
        cargarPendientes();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de red al confirmar");
    } finally {
      setProcesando(false);
    }
  };

  const descartarPendiente = async (id) => {
    if (!confirm("¿Estás seguro de descartar este examen? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(apiUrl(`/api/exams/pendientes/${id}`), {
        method: "DELETE",
        headers: headers()
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
        cargarPendientes();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de red al descartar");
    }
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case "pendiente_asignacion": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "pendiente_validacion": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "procesado": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tighter mb-2">📋 Exámenes Pendientes</h2>
        <p className={`text-sm ${textMuted}`}>
          Exámenes que no se pudieron procesar automáticamente. Asígnalos a un alumno y confírmalos.
        </p>
      </div>

      {/* Lista de pendientes */}
      {pendientes.length === 0 ? (
        <div className={`p-12 rounded-2xl border text-center ${cardBg}`}>
          <div className="text-6xl mb-4 opacity-40">✅</div>
          <p className="font-bold text-lg mb-2">¡Todo limpio!</p>
          <p className={`text-sm ${textMuted}`}>No hay exámenes pendientes de asignación.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendientes.map((p) => (
            <div key={p.id_pendiente} className={`p-6 rounded-2xl border ${cardBg}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getEstadoColor(p.estado)}`}>
                      {p.estado.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(p.creado_en).toLocaleString("es-PE")}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted} mb-1`}>Código de examen</p>
                      <p className="font-bold text-sm">{p.codigo_examen || "—"}</p>
                    </div>
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted} mb-1`}>Código alumno leído</p>
                      <p className="font-bold text-sm">{p.codigo_postulante_lectura || "—"}</p>
                    </div>
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted} mb-1`}>Alumno asignado</p>
                      <p className="font-bold text-sm">{p.alumno_nombre || <span className="text-amber-400">Sin asignar</span>}</p>
                    </div>
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted} mb-1`}>Nota</p>
                      <p className="font-black text-emerald-400">{parseFloat(p.nota_total).toFixed(0)} pts</p>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted} mb-1`}>Motivo del pendiente</p>
                    <p className="text-sm">{p.motivo_pendiente}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => abrirModalAsignar(p)}
                    className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    🔄 Asignar
                  </button>
                  <button
                    onClick={() => confirmarPendiente(p)}
                    disabled={!p.id_usuario_asignado || procesando}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    ✅ Confirmar
                  </button>
                  <button
                    onClick={() => descartarPendiente(p.id_pendiente)}
                    disabled={procesando}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    🗑️ Descartar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de asignación */}
      {modalAsignar && seleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="font-extrabold text-xl">Asignar alumno a examen</h3>
                <p className={`text-[11px] mt-0.5 ${textMuted}`}>{seleccionado.codigo_examen} · {seleccionado.codigo_postulante_lectura}</p>
              </div>
              <button onClick={() => setModalAsignar(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>
                  Alumno
                </label>
                <select
                  value={alumnoId}
                  onChange={(e) => setAlumnoId(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">— Seleccionar alumno —</option>
                  {alumnos.map((a) => (
                    <option key={a.id_usuario} value={a.id_usuario}>
                      {a.nombre_completo} ({a.id_usuario})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>
                  Código de examen (si es diferente)
                </label>
                <select
                  value={codigoExamenCorrecto}
                  onChange={(e) => setCodigoExamenCorrecto(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">— Usar el mismo —</option>
                  {plantillas.map((p) => (
                    <option key={p.codigo_examen} value={p.codigo_examen}>
                      {p.nombre_simulacro} ({p.codigo_examen})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800/30 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                <p className="text-[11px] font-bold">
                  ⚠️ El alumno será asignado a este examen. Luego podrás confirmar el resultado.
                </p>
              </div>
              
              <button
                onClick={asignarAlumno}
                disabled={procesando || !alumnoId}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] transition-all"
              >
                {procesando ? "⏳ Asignando..." : "🔄 Asignar alumno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

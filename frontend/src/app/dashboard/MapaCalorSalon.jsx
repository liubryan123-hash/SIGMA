"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const MODO = [
  { id: "rendimiento", label: "Rendimiento",  icon: "📊" },
  { id: "asistencia",  label: "Asistencia",   icon: "✅" },
];

function getColorRendimiento(promedio) {
  if (promedio === null) return { bg: "bg-slate-800/60", text: "text-slate-600", label: "—" };
  if (promedio >= 14)    return { bg: "bg-emerald-500/25 border border-emerald-500/30", text: "text-emerald-300", label: `${promedio}` };
  if (promedio >= 11)    return { bg: "bg-amber-500/25 border border-amber-500/30",    text: "text-amber-300",   label: `${promedio}` };
  return                        { bg: "bg-rose-500/25 border border-rose-500/30",      text: "text-rose-300",    label: `${promedio}` };
}

function getColorAsistencia(pct) {
  if (pct === null) return { bg: "bg-slate-800/60", text: "text-slate-600", label: "—" };
  if (pct >= 80)    return { bg: "bg-emerald-500/25 border border-emerald-500/30", text: "text-emerald-300", label: `${pct}%` };
  if (pct >= 60)    return { bg: "bg-amber-500/25 border border-amber-500/30",    text: "text-amber-300",   label: `${pct}%` };
  return                   { bg: "bg-rose-500/25 border border-rose-500/30",      text: "text-rose-300",    label: `${pct}%` };
}

export default function MapaCalorSalon({ isDark, textMuted, cardBg, user }) {
  const [salones, setSalones]       = useState([]);
  const [idSalon, setIdSalon]       = useState("");
  const [datos, setDatos]           = useState(null);
  const [cargando, setCargando]     = useState(false);
  const [modo, setModo]             = useState("rendimiento");
  const [alumnoHover, setAlumnoHover] = useState(null);

  const token   = () => localStorage.getItem("edusaas_token");
  const headers = () => ({ Authorization: "Bearer " + token() });

  // Cargar salones disponibles
  useEffect(() => {
    const id = user?.id_academia;
    if (!id) return;
    fetch(apiUrl(`/api/academic/salones/academia/${id}`), { headers: headers() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSalones(data);
          if (data.length > 0) setIdSalon(String(data[0].id_salon));
        }
      })
      .catch(() => {});
  }, [user]);

  const cargar = useCallback(async () => {
    if (!idSalon) return;
    setCargando(true);
    try {
      const res  = await fetch(apiUrl(`/api/director/salon/${idSalon}/mapa-calor`), { headers: headers() });
      const data = await res.json();
      if (res.ok) setDatos(data);
    } catch { /* silencioso */ }
    setCargando(false);
  }, [idSalon]);

  useEffect(() => { cargar(); }, [cargar]);

  const alumnos = datos?.alumnos || [];
  const activos = alumnos.filter(a => a.activo);

  // Stats del salón
  const conNota  = activos.filter(a => a.promedio_nota !== null);
  const promedioSalon = conNota.length
    ? (conNota.reduce((s, a) => s + parseFloat(a.promedio_nota), 0) / conNota.length).toFixed(1)
    : null;
  const conAsist = activos.filter(a => a.pct_asistencia !== null);
  const asistSalon = conAsist.length
    ? (conAsist.reduce((s, a) => s + parseFloat(a.pct_asistencia), 0) / conAsist.length).toFixed(1)
    : null;
  const enRiesgo = activos.filter(a =>
    (a.promedio_nota !== null && parseFloat(a.promedio_nota) < 11) ||
    (a.pct_asistencia !== null && parseFloat(a.pct_asistencia) < 60)
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Mapa de calor</h2>
          <p className={`text-sm mt-1 ${textMuted}`}>Rendimiento y asistencia visual por salón</p>
        </div>
        <div className="flex gap-3">
          {MODO.map(m => (
            <button key={m.id} onClick={() => setModo(m.id)}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${modo === m.id
                ? "bg-indigo-600 border-indigo-500 text-white"
                : `${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de salón */}
      <div className="flex gap-3 flex-wrap">
        {salones.map(s => (
          <button key={s.id_salon} onClick={() => setIdSalon(String(s.id_salon))}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${String(idSalon) === String(s.id_salon)
              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
              : `${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}`}>
            {s.nombre_salon}
            <span className={`text-[10px] ml-1 ${textMuted}`}>· {s.nombre_ciclo}</span>
          </button>
        ))}
      </div>

      {cargando && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!cargando && datos && (
        <>
          {/* Stats del salón */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Alumnos activos",   val: activos.length,          color: "text-blue-400",    icon: "👥" },
              { label: "Promedio general",  val: promedioSalon ?? "—",    color: "text-emerald-400", icon: "📊" },
              { label: "Asistencia media",  val: asistSalon ? `${asistSalon}%` : "—", color: "text-amber-400", icon: "✅" },
              { label: "En riesgo",         val: enRiesgo,                color: enRiesgo > 0 ? "text-rose-400" : "text-slate-400", icon: "⚠️" },
            ].map((s, i) => (
              <div key={i} className={`p-5 rounded-2xl border ${cardBg}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textMuted}`}>{s.icon} {s.label}</p>
                <p className={`text-3xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 flex-wrap">
            {modo === "rendimiento" ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400"><span className="w-3 h-3 rounded bg-emerald-500/40 inline-block" /> ≥ 14 (aprobado)</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400"><span className="w-3 h-3 rounded bg-amber-500/40 inline-block" /> 11–13 (regular)</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400"><span className="w-3 h-3 rounded bg-rose-500/40 inline-block" /> &lt; 11 (en riesgo)</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold ${textMuted}`}><span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Sin exámenes</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400"><span className="w-3 h-3 rounded bg-emerald-500/40 inline-block" /> ≥ 80%</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400"><span className="w-3 h-3 rounded bg-amber-500/40 inline-block" /> 60–79%</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400"><span className="w-3 h-3 rounded bg-rose-500/40 inline-block" /> &lt; 60%</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold ${textMuted}`}><span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Sin registros</span>
              </>
            )}
          </div>

          {/* Grilla heatmap */}
          {activos.length === 0 ? (
            <div className={`text-center py-16 ${textMuted}`}>
              <p className="text-5xl mb-4 opacity-30">📭</p>
              <p className="font-bold">No hay alumnos activos en este salón.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {activos.map(a => {
                const cfg = modo === "rendimiento"
                  ? getColorRendimiento(a.promedio_nota !== null ? parseFloat(a.promedio_nota) : null)
                  : getColorAsistencia(a.pct_asistencia !== null ? parseFloat(a.pct_asistencia) : null);
                const initials = a.nombre_completo.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
                return (
                  <div key={a.id_usuario}
                    className={`relative p-3 rounded-xl cursor-default transition-all ${cfg.bg} ${alumnoHover === a.id_usuario ? "scale-105 z-10" : ""}`}
                    onMouseEnter={() => setAlumnoHover(a.id_usuario)}
                    onMouseLeave={() => setAlumnoHover(null)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] mb-2 mx-auto ${isDark ? "bg-black/30" : "bg-white/50"}`}>
                      {initials}
                    </div>
                    <p className="text-[10px] font-bold text-center truncate leading-tight">
                      {a.nombre_completo.split(" ")[0]}
                    </p>
                    <p className={`text-sm font-black text-center mt-1 ${cfg.text}`}>{cfg.label}</p>

                    {/* Tooltip */}
                    {alumnoHover === a.id_usuario && (
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-48 p-3 rounded-xl shadow-2xl border text-left pointer-events-none ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                        <p className="font-extrabold text-sm truncate">{a.nombre_completo}</p>
                        <p className={`text-[10px] mt-1 ${textMuted}`}>
                          📊 Promedio: <span className="font-black text-white">{a.promedio_nota ?? "—"}</span>
                          {a.total_examenes > 0 && <span className={textMuted}> ({a.total_examenes} exámenes)</span>}
                        </p>
                        <p className={`text-[10px] ${textMuted}`}>
                          ✅ Asistencia: <span className="font-black text-white">{a.pct_asistencia ? `${a.pct_asistencia}%` : "—"}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista de alumnos en riesgo */}
          {enRiesgo > 0 && (
            <section className={`p-6 rounded-2xl border ${isDark ? "bg-rose-950/20 border-rose-800/30" : "bg-rose-50 border-rose-200"}`}>
              <h3 className="font-black text-sm uppercase tracking-widest text-rose-400 mb-4">⚠️ Alumnos en riesgo ({enRiesgo})</h3>
              <div className="space-y-2">
                {activos.filter(a =>
                  (a.promedio_nota !== null && parseFloat(a.promedio_nota) < 11) ||
                  (a.pct_asistencia !== null && parseFloat(a.pct_asistencia) < 60)
                ).map(a => (
                  <div key={a.id_usuario} className="flex items-center justify-between gap-4">
                    <p className="font-bold text-sm">{a.nombre_completo}</p>
                    <div className="flex gap-3 text-[11px] font-black">
                      {a.promedio_nota !== null && parseFloat(a.promedio_nota) < 11 && (
                        <span className="text-rose-400">📊 {a.promedio_nota}</span>
                      )}
                      {a.pct_asistencia !== null && parseFloat(a.pct_asistencia) < 60 && (
                        <span className="text-amber-400">✅ {a.pct_asistencia}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

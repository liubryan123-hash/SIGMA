"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export default function VistaRiesgoSalon({ isDark, textMuted, cardBg, idSalon }) {
  const [alumnosRiesgo, setAlumnosRiesgo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    if (!idSalon) return;
    
    const token = localStorage.getItem("edusaas_token");
    fetch(apiUrl(`/api/academic/salones/${idSalon}/riesgo`), {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setAlumnosRiesgo(data);
      setCargando(false);
    })
    .catch(err => {
      console.error("Error cargando vista de riesgo:", err);
      setCargando(false);
    });
  }, [idSalon]);

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtrados = filtro === "todos" 
    ? alumnosRiesgo 
    : alumnosRiesgo.filter(al => al.nivel_riesgo === filtro);

  const getRiesgoStyle = (nivel) => {
    switch(nivel) {
      case "alto": return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "bg-red-500/20 text-red-400" };
      case "medio": return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-400" };
      default: return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-400" };
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {["todos", "alto", "medio", "bajo"].map(nivel => (
          <button
            key={nivel}
            onClick={() => setFiltro(nivel)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filtro === nivel 
                ? nivel === "alto" ? "bg-red-500 text-white" 
                  : nivel === "medio" ? "bg-amber-500 text-white"
                  : nivel === "bajo" ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-white"
                : `${textMuted} hover:bg-slate-800/50`
            }`}
          >
            {nivel === "todos" ? "📋 Todos" : 
             nivel === "alto" ? "🔴 Alto" :
             nivel === "medio" ? "🟡 Medio" : "🔵 Bajo"}
          </button>
        ))}
      </div>

      {/* ── Lista de Alumnos en Riesgo ───────────────────────── */}
      {filtrados.length === 0 ? (
        <div className={`p-8 rounded-2xl border text-center ${cardBg}`}>
          <p className={`text-sm ${textMuted}`}>
            {filtro === "todos" 
              ? "¡Excelente! No hay alumnos en riesgo." 
              : `No hay alumnos con riesgo ${filtro}.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map(al => {
            const style = getRiesgoStyle(al.nivel_riesgo);
            return (
              <div key={al.id_usuario} className={`p-5 rounded-2xl border ${style.bg} ${style.border}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-extrabold text-base truncate">{al.nombre_completo}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${style.badge}`}>
                        Riesgo {al.nivel_riesgo}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Asistencia</p>
                        <p className={`font-black ${al.pct_asistencia < 50 ? "text-red-400" : al.pct_asistencia < 70 ? "text-amber-400" : "text-emerald-400"}`}>
                          {al.pct_asistencia || 0}%
                        </p>
                        <p className={`text-[10px] ${textMuted}`}>{al.presentes || 0}/{al.total_asistencias || 0} clases</p>
                      </div>
                      
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Promedio Notas</p>
                        <p className={`font-black ${al.promedio_notas < 400 ? "text-red-400" : al.promedio_notas < 500 ? "text-amber-400" : "text-emerald-400"}`}>
                          {al.promedio_notas || "—"}
                        </p>
                        <p className={`text-[10px] ${textMuted}`}>puntos</p>
                      </div>
                      
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Exámenes</p>
                        <p className="font-black text-blue-400">{al.examenes_presentados || 0}</p>
                        <p className={`text-[10px] ${textMuted}`}>presentados</p>
                      </div>
                      
                      <div className="flex items-end">
                        <button className="w-full px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-[10px] font-black uppercase tracking-widest">
                          Ver Detalle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Leyenda ──────────────────────────────────────────── */}
      <div className={`p-4 rounded-xl border ${cardBg}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>Criterios de riesgo:</p>
        <div className="grid grid-cols-3 gap-2 text-[9px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className={textMuted}>Alto: &lt;50% asistencia O &lt;400 pts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className={textMuted}>Medio: &lt;70% asistencia O &lt;500 pts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className={textMuted}>Bajo: Sin riesgo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

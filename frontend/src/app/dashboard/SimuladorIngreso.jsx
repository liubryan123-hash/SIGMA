"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

const UNIVERSIDADES = {
  "UNMSM": {
    nombre: "Universidad Nacional Mayor de San Marcos",
    carreras: [
      { id: "med", nombre: "Medicina Humana", puntaje: 1450 },
      { id: "ing_soft", nombre: "Ingeniería de Software", puntaje: 1250 },
      { id: "der", nombre: "Derecho", puntaje: 1300 },
      { id: "admin", nombre: "Administración", puntaje: 1100 }
    ]
  },
  "UNI": {
    nombre: "Universidad Nacional de Ingeniería",
    carreras: [
      { id: "ing_sist", nombre: "Ingeniería de Sistemas", puntaje: 15.5 },
      { id: "ing_civil", nombre: "Ingeniería Civil", puntaje: 16.2 },
      { id: "ing_mec", nombre: "Ingeniería Mecánica", puntaje: 14.8 }
    ]
  }
};

export default function SimuladorIngreso({ isDark, textMuted, cardBg, user }) {
  const [uniSeleccionada, setUniSeleccionada] = useState("UNMSM");
  const [carreraSeleccionada, setCarreraSeleccionada] = useState("med");
  const [notaActual, setNotaActual] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Obtener la nota del último simulacro del alumno
    const token = localStorage.getItem('edusaas_token');
    fetch(apiUrl('/api/exams/alumno/mis-resultados'), {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setNotaActual(parseFloat(data[0].nota_total));
      }
      setCargando(false);
    })
    .catch(() => setCargando(false));
  }, []);

  const uData = UNIVERSIDADES[uniSeleccionada];
  const cData = uData.carreras.find(c => c.id === carreraSeleccionada);
  const meta = cData ? cData.puntaje : 0;
  
  // Normalizar los puntajes para compararlos (algunos son base 2000, otros base 20)
  const isBase20 = meta <= 20;
  const notaFormat = isBase20 ? (notaActual / 100).toFixed(2) : notaActual.toFixed(2); // Asumiendo que notaActual viene en base 2000 si es UNMSM
  const notaValidada = parseFloat(notaFormat) || 0;
  
  const porcentaje = Math.min(100, Math.max(0, (notaValidada / meta) * 100));
  const diferencia = (meta - notaValidada).toFixed(2);
  const logrado = notaValidada >= meta;

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className={`p-10 rounded-[2.5rem] border shadow-xl relative overflow-hidden transition-colors duration-500 ${cardBg}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-lg shadow-emerald-500/30 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            🎯
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight mb-2">Simulador de Ingreso</h2>
          <p className={`${textMuted} text-lg`}>Descubre qué tan cerca estás de alcanzar tu vacante soñada.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 mb-12">
          {/* Formulario de Selección */}
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 border-b pb-4 border-slate-500/20">Tu Objetivo</h3>
            
            <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Universidad</label>
                <select 
                  value={uniSeleccionada}
                  onChange={(e) => {
                    setUniSeleccionada(e.target.value);
                    setCarreraSeleccionada(UNIVERSIDADES[e.target.value].carreras[0].id);
                  }}
                  className={`w-full p-4 rounded-xl border outline-none font-bold cursor-pointer transition-all focus:border-emerald-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                >
                  {Object.keys(UNIVERSIDADES).map(k => (
                    <option key={k} value={k}>{UNIVERSIDADES[k].nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Carrera</label>
                <select 
                  value={carreraSeleccionada}
                  onChange={(e) => setCarreraSeleccionada(e.target.value)}
                  className={`w-full p-4 rounded-xl border outline-none font-bold cursor-pointer transition-all focus:border-emerald-500 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                >
                  {uData.carreras.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} (Min. {c.puntaje} pts)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tarjeta de Puntaje */}
          <div className="flex flex-col justify-center items-center text-center">
            <p className={`text-[12px] font-black uppercase tracking-widest mb-2 ${textMuted}`}>Tu Último Simulacro</p>
            <div className={`text-6xl font-black mb-2 tracking-tighter ${notaValidada > 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500' : textMuted}`}>
              {notaValidada > 0 ? notaValidada : "---"}
            </div>
            <p className={`text-sm font-bold ${textMuted} max-w-xs leading-relaxed`}>
              {notaValidada === 0 
                ? "Necesitas rendir al menos un simulacro para usar el simulador."
                : `Puntaje referencial obtenido en tu última evaluación.`}
            </p>
          </div>
        </div>

        {/* Barra de Progreso */}
        {notaValidada > 0 && (
          <div className={`p-8 rounded-3xl border relative z-10 ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="text-lg font-black">{cData.nombre}</h4>
                <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{uData.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-400">{meta}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Puntaje Objetivo</p>
              </div>
            </div>

            <div className={`w-full h-8 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-100'} mb-4 shadow-inner relative`}>
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out relative"
                style={{ width: `${porcentaje}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
              </div>
            </div>

            <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <div>
                {logrado ? (
                  <p className="font-extrabold text-emerald-500 flex items-center gap-2 text-lg">
                    <span>🎉</span> ¡Puntaje Alcanzado!
                  </p>
                ) : (
                  <p className="font-extrabold text-amber-500 flex items-center gap-2 text-lg">
                    <span>🔥</span> ¡Sigue esforzándote!
                  </p>
                )}
                <p className={`text-[11px] font-bold ${textMuted} mt-1`}>
                  {logrado 
                    ? "Con tu rendimiento actual, tienes altas probabilidades de ingresar." 
                    : `Estás a ${diferencia} puntos de alcanzar la meta de esta carrera.`}
                </p>
              </div>
              {!logrado && (
                <div className="text-right hidden sm:block">
                  <span className="text-2xl font-black tracking-tighter text-amber-500">{porcentaje.toFixed(1)}%</span>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>Completado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

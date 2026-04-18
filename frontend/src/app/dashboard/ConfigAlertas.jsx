"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export default function ConfigAlertas({ isDark, textMuted, cardBg }) {
  const [config, setConfig] = useState({
    asistencia_minima: 70,
    nota_minima: 500,
    dias_vencimiento_alerta: 7,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("edusaas_token");
    fetch(apiUrl("/api/director/alertas-config"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setConfig({
          asistencia_minima: data.asistencia_minima ?? 70,
          nota_minima: data.nota_minima ?? 500,
          dias_vencimiento_alerta: data.dias_vencimiento_alerta ?? 7,
        });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setGuardado(false);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const token = localStorage.getItem("edusaas_token");
      const res = await fetch(apiUrl("/api/director/alertas-config"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 3000);
      } else {
        alert("Error al guardar la configuración.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const field = isDark
    ? "bg-slate-950 border-slate-600"
    : "bg-white border-slate-300";
  const card2 = isDark
    ? "bg-slate-900/50 border-slate-700"
    : "bg-slate-50 border-slate-200";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Reglas de Alertas</h2>
        <p className={`text-sm mt-1 ${textMuted}`}>
          Define los parámetros para que el sistema detecte alumnos en riesgo automáticamente.
        </p>
      </div>

      <div className={`p-8 rounded-[2rem] border ${cardBg} shadow-sm space-y-8`}>

        {/* Asistencia */}
        <div>
          <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-4">
            <span className="text-blue-500">📅</span> ASISTENCIA
          </h3>
          <div className={`p-5 rounded-2xl border max-w-xs ${card2}`}>
            <label className="block text-sm font-bold mb-1">Asistencia Mínima</label>
            <p className={`text-[10px] mb-3 ${textMuted}`}>
              Marcar en riesgo si la asistencia acumulada cae por debajo de este porcentaje.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number" min="1" max="100"
                value={config.asistencia_minima}
                onChange={(e) => handleChange("asistencia_minima", Number(e.target.value))}
                className={`w-20 p-3 rounded-xl border font-black text-center outline-none ${field}`}
              />
              <span className="text-sm font-bold">%</span>
            </div>
          </div>
        </div>

        <div className={`h-px w-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />

        {/* Rendimiento */}
        <div>
          <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-4">
            <span className="text-amber-500">📈</span> RENDIMIENTO
          </h3>
          <div className={`p-5 rounded-2xl border max-w-xs ${card2}`}>
            <label className="block text-sm font-bold mb-1">Nota Mínima (pts OMR)</label>
            <p className={`text-[10px] mb-3 ${textMuted}`}>
              Considerar en riesgo si el promedio OMR es menor a este valor.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">&lt;</span>
              <input
                type="number" step="50" min="0"
                value={config.nota_minima}
                onChange={(e) => handleChange("nota_minima", Number(e.target.value))}
                className={`w-24 p-3 rounded-xl border font-black text-center outline-none ${field}`}
              />
              <span className="text-sm font-bold">pts</span>
            </div>
          </div>
        </div>

        <div className={`h-px w-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />

        {/* Finanzas */}
        <div>
          <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-4">
            <span className="text-red-500">💰</span> FINANZAS
          </h3>
          <div className={`p-5 rounded-2xl border max-w-xs ${card2}`}>
            <label className="block text-sm font-bold mb-1">Alerta de Vencimiento Próximo</label>
            <p className={`text-[10px] mb-3 ${textMuted}`}>
              Alertar cuando una cuota vence dentro de este plazo.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number" min="1"
                value={config.dias_vencimiento_alerta}
                onChange={(e) => handleChange("dias_vencimiento_alerta", Number(e.target.value))}
                className={`w-20 p-3 rounded-xl border font-black text-center outline-none ${field}`}
              />
              <span className="text-sm font-bold">días</span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-4">
          {guardado && (
            <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">
              ✓ Configuración guardada
            </span>
          )}
          <button
            onClick={guardar}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black px-8 py-4 rounded-xl shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs transition-all flex items-center gap-2"
          >
            {guardando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : "💾 Guardar Reglas"}
          </button>
        </div>
      </div>
    </div>
  );
}

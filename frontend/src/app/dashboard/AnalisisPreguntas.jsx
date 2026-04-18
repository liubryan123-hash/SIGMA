"use client";
import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from "recharts";

const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("edusaas_token")}` });

// Pregunta "bomba": más del 60% de errores
const esBomba = (p) => p.pct_error >= 60;

export default function AnalisisPreguntas({ isDark, textMuted, cardBg }) {
  const [examenes, setExamenes]   = useState([]);
  const [codigo, setCodigo]       = useState("");
  const [datos, setDatos]         = useState(null);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState("");
  const [vista, setVista]         = useState("barras"); // "barras" | "tabla"

  // Cargar lista de exámenes disponibles
  useEffect(() => {
    fetch(apiUrl("/api/exams/plantillas"), { headers: authH() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setExamenes(data); })
      .catch(() => {});
  }, []);

  const analizar = async () => {
    if (!codigo) return;
    setCargando(true);
    setError("");
    setDatos(null);
    try {
      const res = await fetch(apiUrl(`/api/director/examen/${encodeURIComponent(codigo)}/analisis-preguntas`), { headers: authH() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al cargar análisis."); return; }
      setDatos(data);
    } catch {
      setError("Error de conexión.");
    } finally {
      setCargando(false);
    }
  };

  const bombas = datos?.preguntas?.filter(esBomba) || [];

  const tooltipStyle = {
    contentStyle: { background: isDark ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: 8, fontSize: 12 },
    labelStyle: { fontWeight: 900, color: isDark ? "#f1f5f9" : "#0f172a" },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabecera */}
      <div>
        <h2 className="text-3xl font-black tracking-tighter">Análisis por Pregunta</h2>
        <p className={`text-sm mt-1 ${textMuted}`}>
          Identifica las preguntas "bomba" — aquellas que más alumnos fallan.
        </p>
      </div>

      {/* Selector de examen */}
      <div className={`p-6 rounded-2xl border flex flex-wrap items-end gap-4 ${cardBg}`}>
        <div className="flex-1 min-w-[220px]">
          <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>
            Examen / Simulacro
          </label>
          <select
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${
              isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
            }`}
          >
            <option value="">Selecciona un examen...</option>
            {examenes.map(ex => (
              <option key={ex.codigo_examen} value={ex.codigo_examen}>
                {ex.nombre_simulacro} ({ex.codigo_examen})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={analizar}
          disabled={!codigo || cargando}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg"
        >
          {cargando ? "Analizando..." : "Analizar"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {datos && (
        <>
          {/* Stats rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Examen", val: datos.examen, col: "text-indigo-400" },
              { label: "Alumnos evaluados", val: datos.total_alumnos, col: "text-emerald-400" },
              { label: "Preguntas", val: datos.preguntas.length, col: "text-blue-400" },
              { label: "Preguntas bomba 🔴", val: bombas.length, col: "text-red-400" },
            ].map((s, i) => (
              <div key={i} className={`p-5 rounded-2xl border ${cardBg}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-1`}>{s.label}</p>
                <p className={`text-2xl font-black tracking-tighter ${s.col} truncate`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Preguntas bomba */}
          {bombas.length > 0 && (
            <div className={`p-6 rounded-2xl border border-red-800/40 bg-red-500/5`}>
              <h3 className="text-sm font-black uppercase tracking-widest text-red-400 mb-3">
                🔴 Preguntas bomba — más del 60% de errores
              </h3>
              <div className="flex flex-wrap gap-2">
                {bombas.map(b => (
                  <span
                    key={b.pregunta}
                    className="px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black"
                    title={`${b.pct_error}% error`}
                  >
                    P{b.pregunta} — {b.pct_error}% ✗
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Selector de vista */}
          <div className="flex gap-2">
            {["barras", "tabla"].map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  vista === v
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                    : `${textMuted} border border-transparent hover:border-slate-700`
                }`}
              >
                {v === "barras" ? "📊 Gráfico" : "📋 Tabla"}
              </button>
            ))}
          </div>

          {/* Vista: Gráfico de barras */}
          {vista === "barras" && datos.preguntas.length > 0 && (
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-4`}>
                % por tipo de respuesta por pregunta
              </p>
              <ResponsiveContainer width="100%" height={Math.max(300, datos.preguntas.length * 22)}>
                <BarChart
                  data={datos.preguntas}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  barSize={10}
                >
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 10, fill: isDark ? "#64748b" : "#94a3b8" }} />
                  <YAxis type="category" dataKey="pregunta" width={36}
                    tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }}
                    tickFormatter={v => `P${v}`} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(val, name) => [`${val}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="pct_acierto" name="Correcto" fill="#22c55e" radius={[0, 4, 4, 0]}>
                    {datos.preguntas.map((p, i) => (
                      <Cell key={i} fill="#22c55e" />
                    ))}
                  </Bar>
                  <Bar dataKey="pct_error" name="Error" fill="#ef4444" radius={[0, 4, 4, 0]}>
                    {datos.preguntas.map((p, i) => (
                      <Cell key={i} fill={esBomba(p) ? "#dc2626" : "#f87171"} />
                    ))}
                  </Bar>
                  <Bar dataKey="pct_blanco" name="En blanco" fill="#475569" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Vista: Tabla detallada */}
          {vista === "tabla" && (
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
              <table className="w-full text-sm">
                <thead className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "bg-slate-950/60 text-slate-400" : "bg-slate-50 text-slate-500"}`}>
                  <tr>
                    <th className="px-5 py-3 text-left">Preg.</th>
                    <th className="px-5 py-3 text-left">Clave</th>
                    <th className="px-5 py-3 text-right">✓ Correcto</th>
                    <th className="px-5 py-3 text-right">✗ Error</th>
                    <th className="px-5 py-3 text-right">○ Blanco</th>
                    <th className="px-5 py-3 text-center">Nivel</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800/50" : "divide-slate-100"}`}>
                  {datos.preguntas.map(p => {
                    const nivel = esBomba(p)
                      ? { label: "Bomba", cls: "bg-red-500/15 text-red-400" }
                      : p.pct_error >= 40
                      ? { label: "Difícil", cls: "bg-amber-500/15 text-amber-400" }
                      : { label: "Normal", cls: "bg-emerald-500/10 text-emerald-400" };
                    return (
                      <tr key={p.pregunta} className={`transition-colors ${isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-3 font-black text-indigo-400">P{p.pregunta}</td>
                        <td className={`px-5 py-3 font-mono font-black ${textMuted}`}>{p.correcta}</td>
                        <td className="px-5 py-3 text-right text-emerald-400 font-bold">{p.pct_acierto}%</td>
                        <td className={`px-5 py-3 text-right font-bold ${esBomba(p) ? "text-red-400 font-black" : "text-red-400/70"}`}>
                          {p.pct_error}%
                        </td>
                        <td className={`px-5 py-3 text-right ${textMuted}`}>{p.pct_blanco}%</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${nivel.cls}`}>
                            {nivel.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!datos && !cargando && !error && (
        <div className={`py-20 text-center rounded-2xl border ${cardBg}`}>
          <p className="text-5xl mb-4">📊</p>
          <p className={`text-sm font-bold ${textMuted}`}>Selecciona un examen y haz clic en Analizar</p>
        </div>
      )}
    </div>
  );
}

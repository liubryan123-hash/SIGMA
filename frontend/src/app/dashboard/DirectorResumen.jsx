"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

const NIVEL_DEUDA = {
  critico: { label: "Crítico",  color: "text-red-400",    bg: "bg-red-900/30 border-red-800/50",     dot: "bg-red-500" },
  urgente: { label: "Urgente",  color: "text-amber-400",  bg: "bg-amber-900/30 border-amber-800/50", dot: "bg-amber-500" },
  reciente:{ label: "Reciente", color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-800/30",   dot: "bg-blue-400" },
};

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444"];

export default function DirectorResumen({ isDark, textMuted, cardBg }) {
  const [estadoDia, setEstadoDia]     = useState(null);
  const [finanzas, setFinanzas]       = useState(null);
  const [omrUso, setOmrUso]           = useState(null);
  const [cargando, setCargando]       = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(null);
  const [verTodasAlertas, setVerTodasAlertas] = useState(false);
  
  // Nuevas métricas ejecutivas
  const [ingresos, setIngresos] = useState([]);
  const [retencion, setRetencion] = useState([]);
  const [salones, setSalones] = useState([]);

  const cargar = useCallback(async () => {
    const token = localStorage.getItem("edusaas_token");
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [diaRes, finRes, omrRes, ingRes, retRes, salRes] = await Promise.all([
        fetch(apiUrl("/api/director/estado-del-dia"), { headers: h }),
        fetch(apiUrl("/api/director/finanzas"),       { headers: h }),
        fetch(apiUrl("/api/director/omr-uso"),        { headers: h }),
        fetch(apiUrl("/api/director/ingresos-mensuales"), { headers: h }),
        fetch(apiUrl("/api/director/retencion"),          { headers: h }),
        fetch(apiUrl("/api/director/salones-rendimiento"), { headers: h }),
      ]);
      const [diaData, finData, omrData, ingData, retData, salData] = await Promise.all([
        diaRes.json(), finRes.json(), omrRes.json(),
        ingRes.json(), retRes.json(), salRes.json()
      ]);
      if (diaRes.ok) setEstadoDia(diaData);
      if (finRes.ok) setFinanzas(finData);
      if (omrRes.ok) setOmrUso(omrData);
      if (ingRes.ok) setIngresos(ingData);
      if (retRes.ok) setRetencion(retData);
      if (salRes.ok) setSalones(salData);
    } catch (err) {
      console.error("Error cargando director resumen:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const descargarBoleta = async (idPago) => {
    setGenerandoPdf(idPago);
    const token = localStorage.getItem("edusaas_token");
    try {
      const res  = await fetch(apiUrl(`/api/secretaria/pagos/${idPago}/boleta-pdf`), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
      else alert("Error al generar la boleta: " + (data.error || "Intenta nuevamente."));
    } catch { alert("Error al conectar con el servidor."); }
    finally { setGenerandoPdf(null); }
  };

  if (cargando) return (
    <div className="flex justify-center items-center p-12">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats     = finanzas?.resumen   || {};
  const recientes = finanzas?.recientes || [];
  const dia       = estadoDia           || {};
  const alertas   = dia.alertas_deuda   || [];
  const alertasVisibles = verTodasAlertas ? alertas : alertas.slice(0, 5);
  const omr       = omrUso              || null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Estado del día ────────────────────────────────────── */}
      <section>
        <h2 className="text-3xl font-black tracking-tighter mb-6">Estado del día</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>📋 Asistencia hoy</h3>
            <p className="text-3xl font-black text-emerald-400 tracking-tighter">
              {dia.asistencia_hoy?.pct_asistencia !== null && dia.asistencia_hoy?.pct_asistencia !== undefined
                ? `${dia.asistencia_hoy.pct_asistencia}%` : "—"}
            </p>
            <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>
              {dia.asistencia_hoy?.presentes ?? 0} presentes · {dia.asistencia_hoy?.ausentes ?? 0} ausentes
            </p>
          </div>

          <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>💵 Cobros hoy</h3>
            <p className="text-3xl font-black text-blue-400 tracking-tighter">S/ {Number(dia.pagos_hoy?.total || 0).toFixed(0)}</p>
            <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>{dia.pagos_hoy?.cantidad ?? 0} pagos</p>
          </div>

          <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>📄 Exámenes semana</h3>
            <p className="text-3xl font-black text-purple-400 tracking-tighter">{dia.examenes_semana ?? 0}</p>
            <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>confirmados desde el lunes</p>
          </div>

          <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${cardBg} ${dia.criticos > 0 ? "border-red-800/60" : ""}`}>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>⚠️ Deudas vencidas</h3>
            <p className={`text-3xl font-black tracking-tighter ${dia.criticos > 0 ? "text-red-400" : dia.urgentes > 0 ? "text-amber-400" : "text-slate-400"}`}>
              {alertas.length}
            </p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {dia.criticos > 0 && <span className="text-[9px] font-black text-red-400">🔴 {dia.criticos} críticos</span>}
              {dia.urgentes > 0 && <span className="text-[9px] font-black text-amber-400">🟡 {dia.urgentes} urgentes</span>}
              {alertas.length === 0 && <span className={`text-[10px] font-bold ${textMuted}`}>Sin vencidas</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Widget uso OMR del plan ───────────────────────────── */}
      {omr && (
        <section className={`p-6 rounded-[2rem] border ${cardBg}`}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>🤖 Escaneos OMR este mes</h3>
              <p className="font-black text-lg tracking-tight mt-0.5">
                {omr.limite < 0
                  ? <span className="text-emerald-400">{omr.uso} usados — ilimitado</span>
                  : <><span className={omr.pct >= 100 ? "text-red-400" : omr.pct >= 80 ? "text-amber-400" : "text-emerald-400"}>{omr.uso}</span>
                    <span className={textMuted}> / {omr.limite}</span></>
                }
              </p>
            </div>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
              omr.plan === 'academy' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              : omr.plan === 'pro'   ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-slate-700/30 text-slate-400 border-slate-700'
            }`}>
              Plan {omr.plan}
            </span>
          </div>
          {omr.limite > 0 && (
            <>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    omr.pct >= 100 ? "bg-red-500" : omr.pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(omr.pct, 100)}%` }}
                />
              </div>
              {omr.pct >= 80 && (
                <p className={`text-[10px] font-black mt-2 ${omr.pct >= 100 ? "text-red-400" : "text-amber-400"}`}>
                  {omr.pct >= 100
                    ? "⛔ Límite alcanzado — contacta a LB Systems para upgrade"
                    : `⚠️ ${omr.pct}% del límite usado — considera hacer upgrade`}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Gráfico de ingresos mensuales ───────────────────── */}
      {ingresos.length > 0 && (
        <section className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
          <h3 className="text-lg font-black mb-1 uppercase tracking-widest">📈 Ingresos Mensuales</h3>
          <p className={`text-xs mb-6 ${textMuted}`}>Últimos 12 meses</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...ingresos].reverse()}>
                <defs>
                  <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="mes" stroke={isDark ? "#475569" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? "#475569" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `S/ ${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff", border: "none", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  formatter={(v) => [`S/ ${Number(v).toFixed(2)}`, "Ingreso"]}
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngreso)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Retención de Alumnos ────────────────────────────── */}
      {retencion.length > 0 && (
        <section className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
          <h3 className="text-lg font-black mb-1 uppercase tracking-widest">🛡️ Retención de Alumnos</h3>
          <p className={`text-xs mb-6 ${textMuted}`}>Evolución de matrículas vs bajas</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retencion}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="mes" stroke={isDark ? "#475569" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? "#475569" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff", border: "none", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
                <Line type="monotone" dataKey="activos" stroke="#3b82f6" strokeWidth={3} name="Activos" dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="inactivos" stroke="#ef4444" strokeWidth={3} name="Bajas" dot={{ r: 4, fill: "#ef4444" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Rendimiento por salón ───────────────────────────── */}
      {salones.length > 0 && (
        <section className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
          <h3 className="text-lg font-black mb-1 uppercase tracking-widest">🏫 Rendimiento por Salón</h3>
          <p className={`text-xs mb-6 ${textMuted}`}>Promedio de notas y asistencia</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salones}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} horizontal={false} vertical={false} />
                <XAxis dataKey="nombre_salon" stroke={isDark ? "#475569" : "#94a3b8"} fontSize={8} tickLine={false} axisLine={false} interval={0} />
                <YAxis yAxisId="left" stroke={isDark ? "#475569" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke={isDark ? "#475569" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff", border: "none", borderRadius: "12px" }}
                  cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9" }}
                />
                <Bar yAxisId="left" dataKey="promedio_notas" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Promedio Notas" />
                <Bar yAxisId="right" dataKey="pct_asistencia" fill="#10b981" radius={[4, 4, 0, 0]} name="Asistencia %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Alertas de deuda escalonadas ─────────────────────── */}
      {alertas.length > 0 && (
        <section className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
          <h3 className="text-lg font-black mb-1 uppercase tracking-widest flex items-center gap-2">
            <span>🚨</span> Alertas de cobranza
          </h3>
          <p className={`text-xs mb-6 ${textMuted}`}>Ordenadas por mayor antigüedad del vencimiento.</p>
          <div className="space-y-2">
            {alertasVisibles.map((a, i) => {
              const niv = NIVEL_DEUDA[a.nivel] || NIVEL_DEUDA.reciente;
              return (
                <div key={i} className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${niv.bg}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${niv.dot}`} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{a.nombre_completo}</p>
                      <p className={`text-[10px] truncate ${textMuted}`}>{a.concepto} · Venció {new Date(a.fecha_vencimiento).toLocaleDateString("es-PE")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${niv.color}`}>{a.dias_vencido}d</span>
                    <span className="font-black text-sm">S/ {Number(a.monto).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {alertas.length > 5 && (
            <button onClick={() => setVerTodasAlertas(v => !v)} className={`mt-4 text-xs font-black uppercase tracking-widest ${textMuted} hover:text-white transition-colors`}>
              {verTodasAlertas ? "Ver menos ▲" : `Ver ${alertas.length - 5} más ▼`}
            </button>
          )}
        </section>
      )}

      {/* ── Finanzas del ciclo ───────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-black tracking-tighter mb-6">Finanzas del ciclo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>💵 Total cobrado</h3>
            <p className="text-4xl font-black text-emerald-400 tracking-tighter">S/ {Number(stats.ganancias || 0).toFixed(2)}</p>
            <p className={`mt-2 text-[10px] font-bold ${textMuted}`}>{stats.pagos_confirmados || 0} pagos confirmados</p>
          </div>
          <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>🧾 Deuda pendiente</h3>
            <p className="text-4xl font-black text-amber-400 tracking-tighter">S/ {Number(stats.deuda_total || 0).toFixed(2)}</p>
            <p className={`mt-2 text-[10px] font-bold text-red-400`}>{stats.pagos_vencidos || 0} vencidos</p>
          </div>
          <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>👥 Alumnos activos</h3>
            <p className="text-4xl font-black text-blue-400 tracking-tighter">{dia.total_alumnos ?? "—"}</p>
            <p className={`mt-2 text-[10px] font-bold ${textMuted}`}>matriculados y activos</p>
          </div>
        </div>
      </section>

      {/* ── Últimos movimientos ──────────────────────────────── */}
      <section className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
        <h3 className="text-lg font-black mb-6 uppercase tracking-widest">Últimos movimientos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${isDark ? "border-slate-800" : "border-slate-100"} text-[10px] font-black uppercase tracking-widest ${textMuted}`}>
                <th className="pb-4">Alumno</th>
                <th className="pb-4">Concepto</th>
                <th className="pb-4">Vencimiento</th>
                <th className="pb-4 text-right">Monto</th>
                <th className="pb-4 text-center">Estado</th>
                <th className="pb-4 text-center">Boleta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recientes.map(p => (
                <tr key={p.id_pago} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 font-bold">{p.alumno_nombre}</td>
                  <td className={`py-4 ${textMuted}`}>{p.concepto}</td>
                  <td className={`py-4 font-mono text-xs ${textMuted}`}>{p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString("es-PE") : "—"}</td>
                  <td className="py-4 text-right font-black text-blue-400">S/ {Number(p.monto).toFixed(2)}</td>
                  <td className="py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${p.estado === "pagado" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{p.estado}</span>
                  </td>
                  <td className="py-4 text-center">
                    {p.estado === "pagado" ? (
                      <button onClick={() => descargarBoleta(p.id_pago)} disabled={generandoPdf === p.id_pago}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                      >{generandoPdf === p.id_pago ? "⏳" : "📄 PDF"}</button>
                    ) : (
                      <span className={`text-[9px] font-bold ${textMuted}`}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-slate-500">No hay movimientos recientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";

export default function GestionPagos({ isDark, textMuted, cardBg }) {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(null);
  const [mostrarFormPago, setMostrarFormPago] = useState(false);
  const [formPago, setFormPago] = useState({ id_usuario: "", monto: "", concepto: "", fecha_vencimiento: "" });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [error, setError] = useState(null);
  const [alumnos, setAlumnos] = useState([]);

  const cargarResumen = useCallback(async () => {
    const token = localStorage.getItem("edusaas_token");
    try {
      const res = await fetch(apiUrl("/api/secretaria/pagos/resumen"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResumen(data);
    } catch (err) {
      console.error("Error al cargar resumen de pagos:", err);
      setError("No se pudo cargar el resumen de pagos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    // Cargar lista de alumnos para el selector
    const token = localStorage.getItem("edusaas_token");
    fetch(apiUrl("/api/alumnos"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAlumnos(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [cargarResumen]);

  const descargarBoleta = async (idPago) => {
    setGenerandoPdf(idPago);
    const token = localStorage.getItem("edusaas_token");
    try {
      const res = await fetch(apiUrl(`/api/secretaria/pagos/${idPago}/boleta-pdf`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else {
        alert("Error al generar la boleta: " + (data.error || "Intenta nuevamente."));
      }
    } catch (err) {
      console.error("Error al generar boleta:", err);
      alert("Error al conectar con el servidor.");
    } finally {
      setGenerandoPdf(null);
    }
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    setGuardandoPago(true);
    const token = localStorage.getItem("edusaas_token");
    try {
      const res = await fetch(apiUrl("/api/secretaria/pagos"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formPago),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al registrar el pago.");
      }
      setFormPago({ id_usuario: "", monto: "", concepto: "", fecha_vencimiento: "" });
      setMostrarFormPago(false);
      cargarResumen();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoPago(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center p-12">
        <p className="text-red-400 font-bold">{error}</p>
      </div>
    );
  }

  const stats = resumen?.resumen || {};
  const recientes = resumen?.recientes || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Gestión de Pagos</h2>
          <p className={`text-sm mt-1 ${textMuted}`}>Registra pagos y descarga boletas para los alumnos</p>
        </div>
        <button
          onClick={() => setMostrarFormPago(true)}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95"
        >
          + Registrar Pago
        </button>
      </div>

      {/* Métricas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>💵 Cobrado</h3>
          <p className="text-4xl font-black text-emerald-400 tracking-tighter">S/ {Number(stats.ganancias || 0).toFixed(2)}</p>
          <p className={`mt-2 text-[10px] font-bold ${textMuted}`}>{stats.pagos_confirmados || 0} pagos confirmados</p>
        </div>
        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>🧾 Pendiente</h3>
          <p className="text-4xl font-black text-amber-400 tracking-tighter">S/ {Number(stats.deuda_total || 0).toFixed(2)}</p>
          <p className={`mt-2 text-[10px] font-bold text-red-400`}>{stats.pagos_vencidos || 0} vencidos</p>
        </div>
        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>📋 Total Movimientos</h3>
          <p className="text-4xl font-black text-blue-400 tracking-tighter">{stats.total_movimientos || 0}</p>
          <p className={`mt-2 text-[10px] font-bold ${textMuted}`}>registros en el sistema</p>
        </div>
      </section>

      {/* Tabla de pagos recientes */}
      <section className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
        <h3 className="text-lg font-black mb-6 uppercase tracking-widest">Últimos Movimientos</h3>
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
              {recientes.map((p) => (
                <tr key={p.id_pago} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 font-bold">{p.alumno_nombre}</td>
                  <td className={`py-4 ${textMuted}`}>{p.concepto}</td>
                  <td className={`py-4 font-mono text-xs ${textMuted}`}>
                    {p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString("es-PE") : "—"}
                  </td>
                  <td className="py-4 text-right font-black text-blue-400">S/ {Number(p.monto).toFixed(2)}</td>
                  <td className="py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${p.estado === "pagado" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    {p.estado === "pagado" ? (
                      <button
                        onClick={() => descargarBoleta(p.id_pago)}
                        disabled={generandoPdf === p.id_pago}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                        title="Descargar boleta PDF"
                      >
                        {generandoPdf === p.id_pago ? "⏳" : "📄 PDF"}
                      </button>
                    ) : (
                      <span className={`text-[9px] font-bold ${textMuted}`}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">No hay movimientos recientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Registrar Pago */}
      {mostrarFormPago && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="font-extrabold text-xl">Registrar Pago</h3>
              <button onClick={() => setMostrarFormPago(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            <form onSubmit={registrarPago} className="p-6 space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Alumno *</label>
                <select
                  required
                  value={formPago.id_usuario}
                  onChange={(e) => setFormPago({ ...formPago, id_usuario: e.target.value })}
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-400"}`}
                >
                  <option value="">— Selecciona un alumno —</option>
                  {alumnos.map(a => (
                    <option key={a.id_usuario} value={a.id_usuario}>
                      {a.nombre_completo} {a.nombre_salon ? `· ${a.nombre_salon}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Concepto *</label>
                <input
                  type="text"
                  required
                  value={formPago.concepto}
                  onChange={(e) => setFormPago({ ...formPago, concepto: e.target.value })}
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-400"}`}
                  placeholder="Ej: Mensualidad Marzo 2026"
                />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Monto (S/) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-400"}`}
                  placeholder="Ej: 350.00"
                />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Fecha de Vencimiento *</label>
                <input
                  type="date"
                  required
                  value={formPago.fecha_vencimiento}
                  onChange={(e) => setFormPago({ ...formPago, fecha_vencimiento: e.target.value })}
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 focus:border-emerald-400"}`}
                />
              </div>
              <button
                type="submit"
                disabled={guardandoPago}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[11px]"
              >
                {guardandoPago ? "Guardando..." : "Registrar Pago"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

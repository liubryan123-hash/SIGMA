"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export default function HomeSecretaria({ isDark, textMuted, cardBg }) {
  const [homeData, setHomeData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("edusaas_token");
    fetch(apiUrl("/api/secretaria/home-resumen"), {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setHomeData(data);
      setCargando(false);
    })
    .catch(err => {
      console.error("Error cargando home:", err);
      setCargando(false);
    });
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!homeData) {
    return (
      <div className={`p-8 rounded-2xl border ${cardBg}`}>
        <p className={`text-center ${textMuted}`}>No se pudo cargar el resumen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Tarjetas Operativas ────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deudores del día */}
        <div className={`p-6 rounded-2xl border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>
            💳 Deudores Hoy
          </h3>
          <p className="text-3xl font-black text-red-400 tracking-tighter">
            {homeData.deudores_hoy?.cantidad || 0}
          </p>
          <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>
            S/ {Number(homeData.deudores_hoy?.total || 0).toFixed(2)}
          </p>
        </div>

        {/* Vencimientos próximos 7 días */}
        <div className={`p-6 rounded-2xl border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>
            ⚠️ Vencen en 7 días
          </h3>
          <p className="text-3xl font-black text-amber-400 tracking-tighter">
            {homeData.vencimientos_7d?.cantidad || 0}
          </p>
          <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>
            S/ {Number(homeData.vencimientos_7d?.total || 0).toFixed(2)}
          </p>
        </div>

        {/* Lista de espera */}
        <div className={`p-6 rounded-2xl border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>
            🕐 Lista de Espera
          </h3>
          <p className="text-3xl font-black text-violet-400 tracking-tighter">
            {homeData.lista_espera?.cantidad || 0}
          </p>
          <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>prospectos pendientes</p>
        </div>

        {/* Caja del mes */}
        <div className={`p-6 rounded-2xl border relative overflow-hidden ${cardBg}`}>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>
            💵 Caja este Mes
          </h3>
          <p className="text-3xl font-black text-emerald-400 tracking-tighter">
            S/ {Number(homeData.caja_mes?.total || 0).toFixed(2)}
          </p>
          <p className={`mt-1 text-[10px] font-bold ${textMuted}`}>
            {homeData.caja_mes?.cantidad || 0} pagos
          </p>
        </div>
      </section>

      {/* ── Accesos Rápidos ───────────────────────────────────── */}
      <section className={`p-6 rounded-2xl border ${cardBg}`}>
        <h3 className="text-sm font-black mb-4 uppercase tracking-widest">⚡ Accesos Rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-bold text-sm">
            💳 Registrar Pago
          </button>
          <button className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold text-sm">
            👥 Nuevo Alumno
          </button>
          <button className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all font-bold text-sm">
            📄 Boleta PDF
          </button>
          <button className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all font-bold text-sm">
            📢 Comunicado
          </button>
        </div>
      </section>
    </div>
  );
}

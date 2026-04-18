"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

const PLAN_STYLE = {
  academy: { label: "Academy", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  pro:     { label: "Pro",     color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20"   },
  starter: { label: "Starter", color: "text-teal-400",   bg: "bg-teal-500/10 border-teal-500/20"   },
  basico:  { label: "Básico",  color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20"  },
};

function diasDesde(fechaStr) {
  if (!fechaStr) return null;
  const diff = Date.now() - new Date(fechaStr).getTime();
  return Math.floor(diff / 86400000);
}

function RelativeTime({ fecha }) {
  const dias = diasDesde(fecha);
  if (dias === null) return <span className="text-slate-600">—</span>;
  if (dias === 0) return <span className="text-emerald-400">Hoy</span>;
  if (dias === 1) return <span className="text-emerald-400">Ayer</span>;
  if (dias <= 7)  return <span className="text-emerald-400">Hace {dias}d</span>;
  if (dias <= 30) return <span className="text-amber-400">Hace {dias}d</span>;
  return <span className="text-rose-400">Hace {dias}d</span>;
}

export default function SaludAcademias({ isDark, textMuted, cardBg }) {
  const [academias, setAcademias] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState("");
  const [orden, setOrden]         = useState("alumnos"); // alumnos | ingresos | acceso

  useEffect(() => {
    const token = localStorage.getItem("edusaas_token");
    fetch(apiUrl("/api/admin/academias-salud"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setAcademias)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtradas = academias
    .filter((a) => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (orden === "alumnos")  return Number(b.alumnos_activos)  - Number(a.alumnos_activos);
      if (orden === "ingresos") return Number(b.ingresos_mes)     - Number(a.ingresos_mes);
      if (orden === "acceso")   return diasDesde(a.ultimo_acceso) - diasDesde(b.ultimo_acceso);
      return 0;
    });

  // Totales globales
  const totalAlumnos   = academias.reduce((s, a) => s + Number(a.alumnos_activos || 0), 0);
  const totalIngresos  = academias.reduce((s, a) => s + Number(a.ingresos_mes    || 0), 0);
  const totalExamenes  = academias.reduce((s, a) => s + Number(a.examenes_mes    || 0), 0);

  const btnOrden = (key, label) => (
    <button
      onClick={() => setOrden(key)}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
        orden === key
          ? "bg-indigo-500 text-white border-indigo-600"
          : `${textMuted} border-slate-700 hover:bg-slate-800/50`
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Salud de Academias</h2>
        <p className={`text-sm mt-1 ${textMuted}`}>Pulso global — actividad, alumnos e ingresos por academia este mes.</p>
      </div>

      {/* Totales globales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Alumnos activos", value: totalAlumnos,                  color: "emerald", icon: "🎓" },
          { label: "Ingresos del mes",value: `S/ ${Number(totalIngresos).toFixed(0)}`, color: "blue",    icon: "💵" },
          { label: "Exámenes OMR",    value: totalExamenes,                 color: "purple",  icon: "📋" },
        ].map((s) => (
          <div key={s.label} className={`p-5 rounded-2xl border ${cardBg} relative overflow-hidden`}>
            <div className={`absolute -top-6 -right-6 w-20 h-20 bg-${s.color}-500/10 rounded-full blur-2xl`} />
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-1`}>{s.icon} {s.label}</p>
            <p className={`text-3xl font-black text-${s.color}-400 tracking-tighter`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda + orden */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar academia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`flex-1 min-w-48 px-4 py-2 rounded-xl border text-sm outline-none ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
          }`}
        />
        <div className="flex gap-2">
          {btnOrden("alumnos",  "Alumnos")}
          {btnOrden("ingresos", "Ingresos")}
          {btnOrden("acceso",   "Actividad")}
        </div>
      </div>

      {/* Tabla de academias */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`grid grid-cols-[1fr_80px_90px_90px_80px_90px] gap-4 px-5 py-3 text-[9px] font-black uppercase tracking-widest border-b ${isDark ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"}`}>
          <span>Academia</span>
          <span className="text-center">Plan</span>
          <span className="text-right">Alumnos</span>
          <span className="text-right">Ingresos mes</span>
          <span className="text-right">OMR mes</span>
          <span className="text-center">Último acceso</span>
        </div>

        {filtradas.length === 0 && (
          <div className="py-12 text-center">
            <p className={`text-sm ${textMuted}`}>No se encontraron academias.</p>
          </div>
        )}

        {filtradas.map((a) => {
          const plan = PLAN_STYLE[a.plan_activo] || PLAN_STYLE.basico;
          const diasAcceso = diasDesde(a.ultimo_acceso);
          const inactiva = diasAcceso !== null && diasAcceso > 14;

          return (
            <div
              key={a.id_academia}
              className={`grid grid-cols-[1fr_80px_90px_90px_80px_90px] gap-4 px-5 py-4 items-center border-b transition-colors ${
                isDark
                  ? `border-slate-800/50 ${inactiva ? "bg-rose-900/5" : "hover:bg-slate-800/30"}`
                  : `border-slate-100 ${inactiva ? "bg-rose-50" : "hover:bg-slate-50"}`
              }`}
            >
              {/* Nombre + ID */}
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{a.nombre}</p>
                <p className={`text-[10px] font-mono ${textMuted}`}>{a.id_academia}</p>
              </div>

              {/* Plan */}
              <div className="flex justify-center">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${plan.bg} ${plan.color}`}>
                  {plan.label}
                </span>
              </div>

              {/* Alumnos activos */}
              <p className="text-right font-black text-emerald-400">{a.alumnos_activos || 0}</p>

              {/* Ingresos mes */}
              <p className="text-right font-black text-blue-400">
                S/ {Number(a.ingresos_mes || 0).toFixed(0)}
              </p>

              {/* OMR mes */}
              <p className="text-right font-black text-purple-400">{a.examenes_mes || 0}</p>

              {/* Último acceso */}
              <div className="text-center text-xs font-bold">
                <RelativeTime fecha={a.ultimo_acceso} />
              </div>
            </div>
          );
        })}
      </div>

      {filtradas.length > 0 && (
        <p className={`text-[10px] text-center ${textMuted}`}>
          {filtradas.length} academia{filtradas.length !== 1 ? "s" : ""} · Filas en rojo = sin actividad en +14 días
        </p>
      )}
    </div>
  );
}

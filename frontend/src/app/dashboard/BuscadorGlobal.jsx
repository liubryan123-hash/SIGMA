"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const TIPO_CONFIG = {
  alumno: { icon: "🎓", color: "text-blue-400",   bg: "bg-blue-500/10",   label: "Alumno" },
  examen: { icon: "📋", color: "text-purple-400", bg: "bg-purple-500/10", label: "Examen" },
  pago:   { icon: "💰", color: "text-emerald-400",bg: "bg-emerald-500/10",label: "Pago" },
};

export default function BuscadorGlobal({ isDark, onNavigate, onClose }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState({ alumnos: [], examenes: [], pagos: [] });
  const [buscando, setBuscando] = useState(false);
  const [selIdx, setSelIdx]     = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const buscar = useCallback(async (q) => {
    if (q.trim().length < 2) return setResults({ alumnos: [], examenes: [], pagos: [] });
    setBuscando(true);
    try {
      const token = localStorage.getItem("edusaas_token");
      const res = await fetch(apiUrl(`/api/academic/buscar?q=${encodeURIComponent(q)}`), {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) setResults(await res.json());
    } catch { /* silencioso */ }
    setBuscando(false);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setSelIdx(0);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => buscar(v), 280);
  };

  // Aplanar resultados para navegación con teclado
  const todos = [
    ...results.alumnos.map(r => ({ ...r, tipo: "alumno" })),
    ...results.examenes.map(r => ({ ...r, tipo: "examen" })),
    ...results.pagos.map(r => ({ ...r, tipo: "pago" })),
  ];

  const handleKey = (e) => {
    if (e.key === "Escape") return onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(i + 1, todos.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && todos[selIdx]) handleSelect(todos[selIdx]);
  };

  const handleSelect = (item) => {
    if (item.tipo === "alumno")  onNavigate("alumnos", item);
    if (item.tipo === "examen")  onNavigate("plantillas", item);
    if (item.tipo === "pago")    onNavigate("pagos", item);
    onClose();
  };

  const hayResultados = todos.length > 0;
  const mostrarVacio  = query.trim().length >= 2 && !buscando && !hayResultados;

  const Seccion = ({ titulo, items, offset }) => {
    if (!items.length) return null;
    const cfg = TIPO_CONFIG[items[0]?.tipo];
    return (
      <div className="mb-2">
        <p className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>{titulo}</p>
        {items.map((item, i) => {
          const idx = offset + i;
          const isActive = selIdx === idx;
          return (
            <button key={item.id} onMouseEnter={() => setSelIdx(idx)} onClick={() => handleSelect(item)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? (isDark ? "bg-slate-800" : "bg-slate-100") : "hover:bg-slate-800/40"}`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${cfg.bg}`}>{cfg.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{item.label}</p>
                {item.sub && <p className={`text-[10px] truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.sub}</p>}
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className={`flex items-center gap-3 px-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <span className={`text-lg ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {buscando ? "⏳" : "🔍"}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder="Buscar alumno, examen, pago..."
            className={`flex-1 py-4 text-sm bg-transparent outline-none ${isDark ? "text-white placeholder-slate-600" : "text-slate-800 placeholder-slate-400"}`}
          />
          <kbd className={`text-[10px] font-black px-2 py-1 rounded-md border ${isDark ? "border-slate-700 text-slate-600 bg-slate-800" : "border-slate-200 text-slate-400 bg-slate-50"}`}>ESC</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {!query.trim() && (
            <p className={`text-center py-10 text-sm ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              Escribe para buscar en toda la academia
            </p>
          )}
          {mostrarVacio && (
            <p className={`text-center py-10 text-sm ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              Sin resultados para "{query}"
            </p>
          )}
          {hayResultados && (
            <>
              <Seccion titulo="Alumnos"  items={results.alumnos.map(r => ({ ...r, tipo: "alumno" }))} offset={0} />
              <Seccion titulo="Exámenes" items={results.examenes.map(r => ({ ...r, tipo: "examen" }))} offset={results.alumnos.length} />
              <Seccion titulo="Pagos"    items={results.pagos.map(r => ({ ...r, tipo: "pago" }))} offset={results.alumnos.length + results.examenes.length} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-4 px-4 py-2.5 border-t text-[10px] font-black uppercase tracking-widest ${isDark ? "border-slate-800 text-slate-600" : "border-slate-100 text-slate-400"}`}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>
  );
}

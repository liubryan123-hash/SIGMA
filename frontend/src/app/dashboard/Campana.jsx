"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const TIPO_ICON = {
  pago_confirmado:   "💵",
  examen_confirmado: "📋",
  comunicado:        "📢",
  sistema:           "⚙️",
};

function tiempoRelativo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function Campana({ isDark, onNavegacion }) {
  const [notifs, setNotifs]     = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [abierto, setAbierto]   = useState(false);
  const ref = useRef(null);

  const cargar = useCallback(async () => {
    const token = localStorage.getItem("edusaas_token");
    try {
      const res = await fetch(apiUrl("/api/notificaciones"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notificaciones || []);
      setNoLeidas(data.no_leidas || 0);
    } catch {}
  }, []);

  useEffect(() => {
    cargar();
    const iv = setInterval(cargar, 30_000); // refresca cada 30s
    return () => clearInterval(iv);
  }, [cargar]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const marcarLeida = async (id) => {
    const token = localStorage.getItem("edusaas_token");
    await fetch(apiUrl(`/api/notificaciones/${id}/leer`), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs(prev => prev.map(n => n.id_notif === id ? { ...n, leida: true } : n));
    setNoLeidas(prev => Math.max(0, prev - 1));
  };

  const marcarTodas = async () => {
    const token = localStorage.getItem("edusaas_token");
    await fetch(apiUrl("/api/notificaciones/leer-todas"), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    setNoLeidas(0);
  };

  const handleClick = (notif) => {
    if (!notif.leida) marcarLeida(notif.id_notif);
    if (notif.accion_tab && onNavegacion) onNavegacion(notif.accion_tab);
    setAbierto(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(v => !v)}
        className={`relative p-3 rounded-xl border transition-all ${
          isDark
            ? "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"
            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
        }`}
        title="Notificaciones"
      >
        🔔
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-pulse">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className={`absolute right-0 top-14 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
            <span className="font-black text-sm uppercase tracking-widest">Notificaciones</span>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className={`py-12 text-center text-xs font-bold ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                Sin notificaciones
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id_notif}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-5 py-4 flex gap-3 items-start transition-colors border-b last:border-0 ${
                    isDark ? "border-slate-800/50" : "border-slate-50"
                  } ${
                    !n.leida
                      ? isDark ? "bg-blue-500/5 hover:bg-blue-500/10" : "bg-blue-50 hover:bg-blue-100"
                      : isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{TIPO_ICON[n.tipo] || "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black mb-0.5 ${!n.leida ? "" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {n.titulo}
                    </p>
                    {n.mensaje && (
                      <p className={`text-[10px] leading-relaxed truncate ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {n.mensaje}
                      </p>
                    )}
                    <p className={`text-[9px] mt-1 font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                      {tiempoRelativo(n.creada_en)}
                    </p>
                  </div>
                  {!n.leida && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

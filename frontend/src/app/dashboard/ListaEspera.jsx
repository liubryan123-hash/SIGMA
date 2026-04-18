"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";

export default function ListaEspera({ isDark, textMuted, cardBg }) {
  const [lista, setLista]       = useState([]);
  const [salones, setSalones]   = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre_completo: "", telefono: "", email: "", notas: "", id_salon: "" });

  const token   = () => localStorage.getItem("edusaas_token");
  const headers = (json = false) => {
    const h = { Authorization: "Bearer " + token() };
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaRes, salonesRes] = await Promise.all([
        fetch(apiUrl("/api/academic/lista-espera"), { headers: headers() }),
        fetch(apiUrl("/api/academic/salones/academia/" + JSON.parse(localStorage.getItem("edusaas_user") || "{}").id_academia), { headers: headers() }),
      ]);
      const listaData   = await listaRes.json();
      const salonesData = await salonesRes.json();
      if (Array.isArray(listaData))   setLista(listaData);
      if (Array.isArray(salonesData)) setSalones(salonesData);
    } catch { /* silencioso */ }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async (e) => {
    e.preventDefault();
    if (!form.nombre_completo.trim()) return;
    setGuardando(true);
    try {
      const res = await fetch(apiUrl("/api/academic/lista-espera"), {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ ...form, id_salon: form.id_salon || undefined }),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setLista(prev => [...prev, nuevo]);
        setForm({ nombre_completo: "", telefono: "", email: "", notas: "", id_salon: "" });
        setMostrarForm(false);
      } else {
        const d = await res.json();
        alert(d.error || "Error al agregar.");
      }
    } catch { alert("Error de conexión."); }
    setGuardando(false);
  };

  const cambiarEstado = async (id, estado) => {
    try {
      const res = await fetch(apiUrl(`/api/academic/lista-espera/${id}/estado`), {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify({ estado }),
      });
      if (res.ok) setLista(prev => prev.filter(p => p.id_espera !== id));
    } catch { /* silencioso */ }
  };

  const inputCls = `w-full text-sm px-4 py-2.5 rounded-xl border outline-none transition-colors ${isDark
    ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
    : "bg-slate-50 border-slate-200 focus:border-indigo-400"}`;
  const labelCls = `text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Lista de espera</h2>
          <p className={`text-sm mt-1 ${textMuted}`}>Prospectos esperando cupo en la academia</p>
        </div>
        <button onClick={() => setMostrarForm(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95">
          + Agregar prospecto
        </button>
      </div>

      {/* Stats */}
      <div className={`flex items-center gap-6 p-5 rounded-2xl border ${cardBg}`}>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>En espera</p>
          <p className="text-3xl font-black text-indigo-400">{lista.length}</p>
        </div>
        {salones.length > 0 && (
          <div className={`w-px h-10 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
        )}
        {salones.slice(0, 4).map(s => {
          const enSalon = lista.filter(p => String(p.id_salon) === String(s.id_salon)).length;
          return (
            <div key={s.id_salon}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{s.nombre_salon}</p>
              <p className="text-xl font-black">{enSalon}</p>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      <section className={`rounded-[2.5rem] border ${cardBg} overflow-hidden`}>
        {cargando && <p className={`text-sm p-8 ${textMuted}`}>Cargando...</p>}
        {!cargando && lista.length === 0 && (
          <div className={`text-center py-16 ${textMuted}`}>
            <p className="text-5xl mb-4 opacity-30">🕐</p>
            <p className="font-bold">No hay prospectos en lista de espera.</p>
          </div>
        )}
        {lista.length > 0 && (
          <div className="divide-y divide-slate-800/30">
            {lista.map((p, i) => (
              <div key={p.id_espera} className={`flex items-center gap-4 p-5 transition-colors ${isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                {/* Posición */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                  {i + 1}
                </div>
                {/* Datos */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{p.nombre_completo}</p>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    {p.telefono && <span className={`text-[10px] font-bold ${textMuted}`}>📞 {p.telefono}</span>}
                    {p.email    && <span className={`text-[10px] font-bold ${textMuted}`}>✉️ {p.email}</span>}
                    {p.nombre_salon && <span className={`text-[10px] font-bold text-indigo-400`}>📚 {p.nombre_salon}</span>}
                  </div>
                  {p.notas && <p className={`text-[11px] mt-1 italic ${textMuted}`}>{p.notas}</p>}
                </div>
                {/* Fecha */}
                <p className={`text-[10px] font-bold flex-shrink-0 hidden sm:block ${textMuted}`}>
                  {new Date(p.fecha_registro).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                </p>
                {/* Acciones */}
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => cambiarEstado(p.id_espera, "promovido")}
                    className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                    Promover ✓
                  </button>
                  <button onClick={() => cambiarEstado(p.id_espera, "descartado")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isDark ? "border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-500/30" : "border-slate-200 text-slate-400 hover:text-rose-500"}`}>
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal agregar */}
      {mostrarForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="font-extrabold text-xl">Nuevo prospecto</h3>
              <button onClick={() => setMostrarForm(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            <form onSubmit={agregar} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nombre completo *</label>
                <input required type="text" value={form.nombre_completo} onChange={e => setForm({ ...form, nombre_completo: e.target.value })}
                  placeholder="Ej: Juan Pérez García" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                    placeholder="999 999 999" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="juan@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Salón de interés</label>
                <select value={form.id_salon} onChange={e => setForm({ ...form, id_salon: e.target.value })} className={inputCls}>
                  <option value="">Sin especificar</option>
                  {salones.map(s => <option key={s.id_salon} value={s.id_salon}>{s.nombre_salon} · {s.nombre_ciclo}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Notas (opcional)</label>
                <input type="text" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Ej: Interesado en turno tarde, viene de otra academia" className={inputCls} />
              </div>
              <button type="submit" disabled={guardando}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] transition-all shadow-lg">
                {guardando ? "Guardando..." : "Agregar a lista de espera"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

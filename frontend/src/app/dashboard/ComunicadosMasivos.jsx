"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const DESTINATARIOS = [
  { value: "academia", label: "📢 Toda la academia" },
  { value: "rol:alumno",   label: "🎓 Solo alumnos" },
  { value: "rol:profesor", label: "👨‍🏫 Solo profesores" },
];

export default function ComunicadosMasivos({ isDark, textMuted, cardBg, user }) {
  const [comunicados, setComunicados] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enviando, setEnviando]       = useState(false);
  const [form, setForm] = useState({ titulo: "", cuerpo: "", destinatarios: "academia" });

  const token   = () => localStorage.getItem("edusaas_token");
  const headers = () => ({ Authorization: "Bearer " + token() });

  const cargar = useCallback(async () => {
    try {
      const res  = await fetch(apiUrl("/api/academic/comunicados"), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setComunicados(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.cuerpo) return;
    setEnviando(true);
    try {
      const res  = await fetch(apiUrl("/api/academic/comunicados"), {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ titulo: "", cuerpo: "", destinatarios: "academia" });
        setMostrarForm(false);
        cargar();
      } else {
        alert("Error: " + (data.error || "No se pudo enviar."));
      }
    } catch { alert("Error de conexión."); }
    finally { setEnviando(false); }
  };

  const puedeEnviar = ["superadmin", "director", "secretaria", "profesor"].includes(user?.rol);

  const destinatarioLabel = (d) => DESTINATARIOS.find(x => x.value === d)?.label || d;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Comunicados</h2>
          <p className={`text-sm mt-1 ${textMuted}`}>Mensajes internos para toda la academia o grupos específicos</p>
        </div>
        {puedeEnviar && (
          <button onClick={() => setMostrarForm(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95"
          >+ Nuevo comunicado</button>
        )}
      </div>

      {/* Lista de comunicados */}
      <section className={`rounded-[2.5rem] border ${cardBg} p-8`}>
        {cargando && <p className={`text-sm ${textMuted}`}>Cargando...</p>}
        {!cargando && comunicados.length === 0 && (
          <div className={`text-center py-16 ${textMuted}`}>
            <p className="text-5xl mb-4 opacity-30">📭</p>
            <p className="font-bold">No hay comunicados publicados aún.</p>
          </div>
        )}
        <div className="space-y-4">
          {comunicados.map(c => (
            <div key={c.id_comunicado} className={`p-6 rounded-2xl border transition-colors ${isDark ? "bg-slate-950/50 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-base truncate">{c.titulo}</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${textMuted}`}>
                    {c.autor_nombre} · {new Date(c.fecha_creacion).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full flex-shrink-0 ${isDark ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-indigo-50 text-indigo-600 border border-indigo-200"}`}>
                  {destinatarioLabel(c.destinatarios)}
                </span>
              </div>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${textMuted}`}>{c.cuerpo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal nuevo comunicado */}
      {mostrarForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="font-extrabold text-xl">Nuevo comunicado</h3>
              <button onClick={() => setMostrarForm(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            <form onSubmit={enviar} className="p-6 space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Destinatarios</label>
                <select value={form.destinatarios} onChange={e => setForm({ ...form, destinatarios: e.target.value })}
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"}`}
                >
                  {DESTINATARIOS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Título *</label>
                <input type="text" required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Cambio de horario para el simulacro del sábado"
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"}`}
                />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Mensaje *</label>
                <textarea required rows={5} value={form.cuerpo} onChange={e => setForm({ ...form, cuerpo: e.target.value })}
                  placeholder="Escribe el comunicado completo aquí..."
                  className={`w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors resize-none ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"}`}
                />
              </div>
              <button type="submit" disabled={enviando}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[11px]"
              >{enviando ? "Publicando..." : "Publicar comunicado"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

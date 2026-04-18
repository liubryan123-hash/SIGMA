"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export default function MarketingPanel({ isDark, textMuted, cardBg }) {
  const [marketingCatalog, setMarketingCatalog] = useState([]);
  const [myMktRequests, setMyMktRequests] = useState([]);
  const [modalMktRequest, setModalMktRequest] = useState(false);
  const [formMkt, setFormMkt] = useState({ id_servicio: '', titulo: '', detalles: '' });
  const [enviandoMkt, setEnviandoMkt] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("edusaas_token");
    if (!token) return;

    fetch(apiUrl("/api/marketing/catalogo"), {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setMarketingCatalog(data))
    .catch(e => console.error("Error catalogo mkt:", e));

    fetch(apiUrl("/api/marketing/mis-solicitudes"), {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setMyMktRequests(data))
    .catch(e => console.error("Error mis mkt requests:", e));
  }, []);

  const solicitarMarketing = async () => {
    if (!formMkt.id_servicio || !formMkt.titulo) return alert("Selecciona un servicio y ponle un título.");
    setEnviandoMkt(true);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl('/api/marketing/solicitar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          id_servicio_ref: formMkt.id_servicio,
          titulo: formMkt.titulo,
          detalles: formMkt.detalles
        })
      });
      if (res.ok) {
        alert("¡Solicitud enviada! Nos pondremos en contacto pronto.");
        setModalMktRequest(false);
        setFormMkt({ id_servicio: '', titulo: '', detalles: '' });
        
        // Recargar solicitudes
        fetch(apiUrl("/api/marketing/mis-solicitudes"), { headers: { "Authorization": `Bearer ${token}` } })
        .then(r => r.json()).then(data => setMyMktRequests(data));
      } else {
        alert("Error al enviar solicitud de marketing.");
      }
    } catch(e) {
      console.log(e);
      alert("Error de red.");
    }
    setEnviandoMkt(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-center bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-3xl">
        <div>
          <h2 className="text-2xl font-black text-indigo-400 mb-1">Potencia tu Academia con Antigravity Agencia</h2>
          <p className={textMuted}>Accede a servicios exclusivos de marketing, diseño y publicidad digital.</p>
        </div>
        <button onClick={() => setModalMktRequest(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-[10px]">
          + Solicitar nuevo servicio
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">📋 Catálogo de Servicios</h3>
          <div className="grid grid-cols-1 gap-4">
            {marketingCatalog.map(s => (
              <div key={s.id_servicio} className={`p-6 rounded-2xl border transition-all hover:border-indigo-500/50 ${cardBg}`}>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-lg">{s.nombre}</h4>
                  <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">Desde ${s.precio_base}</span>
                </div>
                <p className={`text-sm mb-4 ${textMuted}`}>{s.descripcion}</p>
                <button 
                  onClick={() => { setFormMkt({ ...formMkt, id_servicio: s.id_servicio, titulo: `Solicitud de ${s.nombre}` }); setModalMktRequest(true); }}
                  className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 tracking-widest"
                >
                  Me interesa →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">📂 Mis Solicitudes</h3>
          <div className="space-y-3">
            {myMktRequests.length === 0 ? (
              <div className="p-10 border border-dashed border-slate-700 rounded-3xl text-center">
                 <p className={textMuted}>Aún no tienes solicitudes de marketing.</p>
              </div>
            ) : myMktRequests.map(sol => (
              <div key={sol.id_solicitud} className={`p-5 rounded-xl border flex justify-between items-center ${cardBg}`}>
                <div>
                  <p className="font-bold text-sm">{sol.titulo}</p>
                  <p className={`text-[10px] ${textMuted}`}>Estado: <span className="text-emerald-400">{sol.estado}</span></p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold text-blue-400">${sol.presupuesto_acordado || '0'}</p>
                  <p className={`text-[9px] ${textMuted}`}>{new Date(sol.fecha_creacion).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ========== MODAL SOLICITUD MARKETING ========== */}
      {modalMktRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-xl font-black">🚀 Nueva Campaña Mkt</h3>
              <button onClick={() => setModalMktRequest(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Servicio de interés</label>
                <select 
                  value={formMkt.id_servicio} 
                  onChange={e => setFormMkt({...formMkt, id_servicio: e.target.value})}
                  className={`w-full p-4 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">Selecciona un servicio...</option>
                  {marketingCatalog.map(s => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre} (desde ${s.precio_base})</option>)}
                </select>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Título de tu Campaña</label>
                <input 
                  value={formMkt.titulo} 
                  onChange={e => setFormMkt({...formMkt, titulo: e.target.value})}
                  className={`w-full p-4 rounded-xl border outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} 
                  placeholder="Ej: Captación Ciclo Verano 2026"
                />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Detalles Adicionales</label>
                <textarea 
                  value={formMkt.detalles} 
                  onChange={e => setFormMkt({...formMkt, detalles: e.target.value})}
                  className={`w-full h-32 p-4 rounded-xl border outline-none resize-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} 
                  placeholder="Cuéntanos tus objetivos..."
                />
              </div>
              <button onClick={solicitarMarketing} disabled={enviandoMkt} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]">
                {enviandoMkt ? '📡 Enviando Solicitud...' : '✔️ Confirmar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

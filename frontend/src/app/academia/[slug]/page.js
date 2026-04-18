"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

export default function LandingAcademia() {
  const { slug }   = useParams();
  const router     = useRouter();
  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/api/public/academias/${slug}`))
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(d => setData(d))
      .catch(() => setNoExiste(true))
      .finally(() => setCargando(false));
  }, [slug]);

  if (cargando) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (noExiste) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
      <p className="text-6xl">🏫</p>
      <h1 className="text-2xl font-black">Academia no encontrada</h1>
      <p className="text-slate-400">El enlace que seguiste no corresponde a ninguna academia activa.</p>
    </div>
  );

  const color  = data?.color_primario || "#6366f1";
  const nombre = data?.nombre         || "Academia";
  const logo   = data?.logo_url;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% -20%, ${color}22 0%, transparent 70%)` }} />

        <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
          {logo ? (
            <img src={logo} alt={nombre} className="w-24 h-24 rounded-3xl object-cover mx-auto mb-8 shadow-2xl border-2 border-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl font-black shadow-2xl text-white"
              style={{ backgroundColor: color }}>
              {nombre.substring(0, 2).toUpperCase()}
            </div>
          )}

          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">{nombre}</h1>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Plataforma académica digital · Gestión inteligente de evaluaciones, asistencia y más.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push(`/login/${slug}`)}
              className="px-8 py-4 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: color, boxShadow: `0 8px 32px ${color}50` }}>
              Ingresar al portal
            </button>
            <a href={`mailto:contacto@${slug}.edu.pe`}
              className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all">
              Contactar
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: "📊", title: "Exámenes con IA", desc: "Corrección automática de hojas OMR con inteligencia artificial en segundos." },
            { icon: "✅", title: "Control de asistencia", desc: "Registro digital de asistencia por salón con reportes en tiempo real." },
            { icon: "🎓", title: "Portal del alumno", desc: "El estudiante ve sus notas, ranking en el salón y evolución de puntajes." },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/3 hover:border-white/10 transition-all">
              <p className="text-3xl mb-3">{f.icon}</p>
              <h3 className="font-black text-base mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center p-10 rounded-3xl border border-white/5"
          style={{ background: `linear-gradient(135deg, ${color}15 0%, transparent 60%)` }}>
          <h2 className="text-3xl font-black mb-3">¿Eres alumno de {nombre}?</h2>
          <p className="text-slate-400 mb-6">Ingresa con el código y contraseña que te proporcionó tu academia.</p>
          <button onClick={() => router.push(`/login/${slug}`)}
            className="px-8 py-4 rounded-2xl font-black text-white text-sm uppercase tracking-widest transition-all hover:scale-105"
            style={{ backgroundColor: color }}>
            Acceder ahora →
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-12">
          Powered by <span className="font-black text-slate-500">SIGMA</span> · LB Systems · Plataforma SaaS para academias preuniversitarias
        </p>
      </div>
    </div>
  );
}

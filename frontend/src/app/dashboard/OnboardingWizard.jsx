"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

const PASOS = [
  { id: 1, label: "Tu academia",   icon: "🏫" },
  { id: 2, label: "Identidad",     icon: "🎨" },
  { id: 3, label: "Ciclo y aulas", icon: "📚" },
  { id: 4, label: "Primer usuario",icon: "👤" },
  { id: 5, label: "¡Listo!",       icon: "🚀" },
];

const COLORES_PRESET = [
  "#6366f1", "#3b82f6", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6",
];

export default function OnboardingWizard({ user, isDark, onComplete }) {
  const [paso, setPaso]         = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]       = useState("");

  // Paso 1 & 2 — Academia
  const [nombre, setNombre]           = useState("");
  const [logoUrl, setLogoUrl]         = useState("");
  const [colorPrimario, setColor]     = useState("#6366f1");

  // Paso 3 — Ciclo + salones
  const [cicloNombre, setCicloNombre] = useState("");
  const [salones, setSalones]         = useState(["", ""]);
  const [idCiclo, setIdCiclo]         = useState(null);

  // Paso 4 — Primer usuario
  const [uNombre, setUNombre]   = useState("");
  const [uEmail, setUEmail]     = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRol, setURol]         = useState("secretaria");

  const token   = () => localStorage.getItem("edusaas_token");
  const headers = (extra = {}) => ({ Authorization: "Bearer " + token(), "Content-Type": "application/json", ...extra });

  const irA = (n) => { setError(""); setPaso(n); };

  // ── Paso 1 → 2: solo avanzar ────────────────────────────────────
  const guardarAcademia = async () => {
    if (!nombre.trim()) return setError("Escribe el nombre de tu academia.");
    setGuardando(true);
    try {
      const res = await fetch(apiUrl("/api/director/configurar"), {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ nombre, logo_url: logoUrl || null, brand_primary_color: colorPrimario }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      irA(3);
    } catch (e) { setError(e.message); }
    setGuardando(false);
  };

  // ── Paso 3: crear ciclo + salones ───────────────────────────────
  const guardarCiclo = async () => {
    if (!cicloNombre.trim()) return setError("Escribe el nombre del ciclo (ej: 2026-I).");
    const salonesValidos = salones.filter(s => s.trim());
    if (!salonesValidos.length) return setError("Agrega al menos un salón.");
    setGuardando(true);
    try {
      // Crear ciclo
      const resCiclo = await fetch(apiUrl("/api/academic/ciclos"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ nombre_ciclo: cicloNombre, id_academia: user.id_academia }),
      });
      const dataCiclo = await resCiclo.json();
      if (!resCiclo.ok) throw new Error(dataCiclo.error || "Error creando ciclo");
      const nuevoIdCiclo = dataCiclo.ciclo_creado.id_ciclo;
      setIdCiclo(nuevoIdCiclo);

      // Crear salones en paralelo
      await Promise.all(salonesValidos.map(s =>
        fetch(apiUrl("/api/academic/salones"), {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ id_ciclo: nuevoIdCiclo, nombre_salon: s.trim() }),
        })
      ));
      irA(4);
    } catch (e) { setError(e.message); }
    setGuardando(false);
  };

  // ── Paso 4: crear primer usuario ────────────────────────────────
  const guardarUsuario = async () => {
    if (!uNombre.trim() || !uPassword.trim()) return setError("Nombre y contraseña son obligatorios.");
    if (uPassword.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    setGuardando(true);
    try {
      const res = await fetch(apiUrl("/api/admin/usuarios"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          nombre_completo: uNombre,
          email: uEmail || undefined,
          password: uPassword,
          rol: uRol,
          id_academia: user.id_academia,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando usuario");
      irA(5);
    } catch (e) { setError(e.message); }
    setGuardando(false);
  };

  const addSalon = () => setSalones(s => [...s, ""]);
  const setSalon = (i, v) => setSalones(s => s.map((x, j) => j === i ? v : x));
  const delSalon = (i) => setSalones(s => s.filter((_, j) => j !== i));

  const inputCls = `w-full text-sm px-4 py-3 rounded-xl border outline-none transition-colors ${isDark
    ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
    : "bg-slate-50 border-slate-200 focus:border-indigo-400"}`;
  const labelCls = `text-[10px] font-black uppercase tracking-widest block mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className={`w-full max-w-xl rounded-[2rem] border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>

        {/* Header con pasos */}
        <div className={`px-8 pt-8 pb-6 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Configuración inicial · Paso {paso} de 5</p>
          <div className="flex gap-2 mb-5">
            {PASOS.map(p => (
              <div key={p.id} className={`flex-1 h-1.5 rounded-full transition-all ${p.id <= paso ? "bg-indigo-500" : isDark ? "bg-slate-800" : "bg-slate-200"}`} />
            ))}
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            {PASOS[paso - 1].icon} {PASOS[paso - 1].label}
          </h2>
        </div>

        <div className="p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* ── PASO 1+2: Academia + branding ─────────────────────────── */}
          {(paso === 1 || paso === 2) && (
            <>
              {paso === 1 && (
                <div>
                  <label className={labelCls}>Nombre de la academia *</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Academia Jireh"
                    className={inputCls} autoFocus />
                  <p className={`text-[10px] mt-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Este nombre aparecerá en el portal de alumnos y boletas.</p>
                </div>
              )}

              {paso === 2 && (
                <>
                  <div>
                    <label className={labelCls}>URL del logo (opcional)</label>
                    <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                      placeholder="https://tu-sitio.com/logo.png"
                      className={inputCls} />
                    {logoUrl && (
                      <img src={logoUrl} alt="preview" className="mt-2 h-12 rounded-lg object-contain border border-slate-700/50" onError={e => e.target.style.display='none'} />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Color primario</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {COLORES_PRESET.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${colorPrimario === c ? "border-white scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-3 items-center">
                      <input type="color" value={colorPrimario} onChange={e => setColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                      <input type="text" value={colorPrimario} onChange={e => setColor(e.target.value)}
                        className={`flex-1 font-mono text-sm px-4 py-2.5 rounded-xl border outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`} />
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Vista previa</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg"
                        style={{ backgroundColor: colorPrimario }}>
                        {nombre?.substring(0, 2).toUpperCase() || "AC"}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm" style={{ color: colorPrimario }}>{nombre || "Mi Academia"}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>director</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                {paso === 2 && (
                  <button onClick={() => irA(1)} className={`px-6 py-3 rounded-xl font-black text-sm border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    ← Atrás
                  </button>
                )}
                {paso === 1 && (
                  <button onClick={() => { if(!nombre.trim()) return setError("Escribe el nombre de tu academia."); setError(""); irA(2); }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-[11px]">
                    Siguiente →
                  </button>
                )}
                {paso === 2 && (
                  <button onClick={guardarAcademia} disabled={guardando}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-[11px]">
                    {guardando ? "Guardando..." : "Guardar y continuar →"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── PASO 3: Ciclo y salones ────────────────────────────────── */}
          {paso === 3 && (
            <>
              <div>
                <label className={labelCls}>Nombre del ciclo académico *</label>
                <input type="text" value={cicloNombre} onChange={e => setCicloNombre(e.target.value)}
                  placeholder="Ej: 2026-I, Verano 2026, Anual 2026"
                  className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}>Salones / Secciones *</label>
                <div className="space-y-2">
                  {salones.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={s} onChange={e => setSalon(i, e.target.value)}
                        placeholder={`Ej: Salón ${String.fromCharCode(65 + i)}, Grupo ${i + 1}`}
                        className={inputCls} />
                      {salones.length > 1 && (
                        <button onClick={() => delSalon(i)} className="px-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-black">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addSalon} className={`mt-2 text-xs font-black uppercase tracking-widest ${isDark ? "text-slate-500 hover:text-indigo-400" : "text-slate-400 hover:text-indigo-600"} transition-colors`}>
                  + Agregar salón
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => irA(2)} className={`px-6 py-3 rounded-xl font-black text-sm border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  ← Atrás
                </button>
                <button onClick={guardarCiclo} disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-[11px]">
                  {guardando ? "Creando..." : "Crear ciclo y salones →"}
                </button>
              </div>
            </>
          )}

          {/* ── PASO 4: Primer usuario ─────────────────────────────────── */}
          {paso === 4 && (
            <>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Crea el primer usuario de tu equipo. Puedes agregar más desde el panel de alumnos.
              </p>
              <div>
                <label className={labelCls}>Rol</label>
                <select value={uRol} onChange={e => setURol(e.target.value)} className={inputCls}>
                  <option value="secretaria">👩‍💼 Secretaria</option>
                  <option value="director">🏛️ Director</option>
                  <option value="profesor">👨‍🏫 Profesor</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Nombre completo *</label>
                <input type="text" value={uNombre} onChange={e => setUNombre(e.target.value)}
                  placeholder="Ej: María García"
                  className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}>Email (opcional)</label>
                <input type="email" value={uEmail} onChange={e => setUEmail(e.target.value)}
                  placeholder="maria@academia.com"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contraseña inicial *</label>
                <input type="text" value={uPassword} onChange={e => setUPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputCls} />
                <p className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>El usuario podrá cambiarla después.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => irA(3)} className={`px-6 py-3 rounded-xl font-black text-sm border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  ← Atrás
                </button>
                <button onClick={guardarUsuario} disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-[11px]">
                  {guardando ? "Creando..." : "Crear usuario →"}
                </button>
              </div>
              <button onClick={() => irA(5)} className={`w-full text-center text-xs font-bold ${isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-500"} transition-colors`}>
                Omitir este paso
              </button>
            </>
          )}

          {/* ── PASO 5: ¡Listo! ───────────────────────────────────────── */}
          {paso === 5 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-2xl font-black mb-3">¡Academia lista!</h3>
              <p className={`text-sm mb-8 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Tu academia está configurada. Ya puedes empezar a registrar alumnos, tomar asistencia y procesar exámenes.
              </p>
              <div className={`text-left p-4 rounded-xl border mb-6 space-y-2 ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-3">Próximos pasos sugeridos</p>
                {[
                  "📋 Crear plantillas de examen en Modelos de Evaluación",
                  "👥 Registrar alumnos desde Gestión de Alumnos",
                  "✅ Empezar a tomar asistencia en Control de Asistencia",
                  "💰 Registrar los primeros pagos en Pagos y Boletas",
                ].map((s, i) => (
                  <p key={i} className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{s}</p>
                ))}
              </div>
              <button onClick={onComplete}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[11px]">
                Ir al dashboard 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

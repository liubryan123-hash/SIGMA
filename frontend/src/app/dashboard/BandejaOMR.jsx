"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";
import ManualCorrectionGrid from "./ManualCorrectionGrid";

const ESTADO_LABEL = {
  en_cola:        { text: "En cola",            color: "text-slate-400",  bg: "bg-slate-800/60",  dot: "bg-slate-500" },
  procesando:     { text: "Procesando IA...",    color: "text-blue-400",   bg: "bg-blue-900/30",   dot: "bg-blue-400 animate-pulse" },
  revision_humana:{ text: "Revisar",             color: "text-amber-400",  bg: "bg-amber-900/30",  dot: "bg-amber-400" },
  error_reintentar:{ text: "Error — reintentar", color: "text-red-400",    bg: "bg-red-900/30",    dot: "bg-red-500" },
  error_manual:   { text: "Error manual",        color: "text-red-400",    bg: "bg-red-900/30",    dot: "bg-red-500" },
};

const OPCIONES_RESPUESTA = ["A", "B", "C", "D", "E", ""];

export default function BandejaOMR({ isDark, cardBg, textMuted, user }) {
  const [bandeja, setBandeja]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [plantillas, setPlantillas] = useState([]);
  const [alumnos, setAlumnos]     = useState([]);

  // Uso mensual OMR
  const [usoOMR, setUsoOMR] = useState(null);

  // Subida Cola 1
  const [file, setFile]             = useState(null);
  const [codigoExamen, setCodigoExamen] = useState("");
  const [idAlumno, setIdAlumno]     = useState("");
  const [subiendo, setSubiendo]     = useState(false);
  const [msgSubida, setMsgSubida]   = useState(null);

  // Modal de revisión (revision_humana)
  const [revisar, setRevisar]                 = useState(null);
  const [respuestasEdit, setRespuestasEdit]   = useState({});
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState("");
  const [confirmando, setConfirmando]         = useState(false);

  // Confirmados recientes (para corrección)
  const [confirmados, setConfirmados] = useState([]);
  const [tabActiva, setTabActiva]     = useState("bandeja"); // bandeja | confirmados | analisis

  // Modal de corrección post-confirmación
  const [corregir, setCorregir]             = useState(null);
  const [respuestasCorr, setRespuestasCorr] = useState({});
  const [motivo, setMotivo]                 = useState("");
  const [corrigiendo, setCorrigiendo]       = useState(false);

  // Modo degradado — ingreso manual de respuestas
  const [modoManual, setModoManual]       = useState(null);  // resultado seleccionado
  const [inputManual, setInputManual]     = useState("");    // string tipo "ABCDE..."
  const [guardandoManual, setGuardandoManual] = useState(false);

  // Análisis por examen
  const [analisisExamen, setAnalisisExamen] = useState("");
  const [analisis, setAnalisis]             = useState(null);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);

  // Toast flash
  const [flashMsg, setFlashMsg] = useState(null);
  const flash = (msg, tipo = "ok") => {
    setFlashMsg({ msg, tipo });
    setTimeout(() => setFlashMsg(null), 4000);
  };

  // Salón manual (cuando el profesor no tiene id_salon asignado)
  const [salones, setSalones]         = useState([]);
  const [salonManual, setSalonManual] = useState("");

  const token   = () => localStorage.getItem("edusaas_token");
  const headers = () => ({ Authorization: "Bearer " + token() });

  const cargarBandeja = useCallback(async () => {
    try {
      const [bandejaRes, pendientesRes] = await Promise.all([
        fetch(apiUrl("/api/omr/bandeja"), { headers: headers() }),
        fetch(apiUrl("/api/exams/pendientes"), { headers: headers() }),
      ]);
      const bandejaData = await bandejaRes.json();
      const pendientesData = await pendientesRes.json();
      
      // Combinar bandeja OMR con pendientes de alumnos
      const combinados = [
        ...(Array.isArray(bandejaData) ? bandejaData : []),
        ...(Array.isArray(pendientesData) ? pendientesData.map(p => ({ ...p, enviado_por_alumno: true })) : [])
      ];
      
      setBandeja(combinados);
    } catch { /* silencioso */ } finally { setLoading(false); }
  }, []);

  const cargarConfirmados = useCallback(async () => {
    try {
      const res  = await fetch(apiUrl("/api/omr/confirmados-recientes"), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setConfirmados(data);
    } catch { /* silencioso */ }
  }, []);

  const cargarUso = useCallback(async () => {
    try {
      const res  = await fetch(apiUrl("/api/omr/uso-mensual"), { headers: headers() });
      const data = await res.json();
      if (data.uso !== undefined) setUsoOMR(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    cargarBandeja();
    cargarConfirmados();
    cargarUso();
  }, [cargarBandeja, cargarConfirmados, cargarUso]);

  // Polling dinámico: 3s si hay ítems procesando, 8s si no
  useEffect(() => {
    const hayProcesando = bandeja.some(r => r.omr_estado === 'procesando');
    const intervalo = hayProcesando ? 3000 : 8000;
    const iv = setInterval(cargarBandeja, intervalo);
    return () => clearInterval(iv);
  }, [bandeja, cargarBandeja]);

  useEffect(() => {
    fetch(apiUrl("/api/exams/plantillas"), { headers: headers() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setPlantillas(d); }).catch(() => {});
    fetch(apiUrl("/api/academic/alumnos"), { headers: headers() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAlumnos(d); }).catch(() => {});
    // Si el profesor no tiene salón asignado, cargar salones de la academia
    if (!user?.id_salon && user?.id_academia) {
      fetch(apiUrl(`/api/academic/salones/academia/${user.id_academia}`), { headers: headers() })
        .then(r => r.json()).then(d => { if (Array.isArray(d)) setSalones(d); }).catch(() => {});
    }
  }, []);

  // Restaurar revisión pendiente si el usuario cambió de tab y volvió
  useEffect(() => {
    const raw = sessionStorage.getItem("omr_revisar");
    if (raw) {
      try {
        const r          = JSON.parse(raw);
        const respuestas = JSON.parse(sessionStorage.getItem("omr_respuestasEdit") || "{}");
        const alumno     = sessionStorage.getItem("omr_alumnoSeleccionado") || "";
        setRevisar(r);
        setRespuestasEdit(respuestas);
        setAlumnoSeleccionado(alumno);
      } catch { sessionStorage.removeItem("omr_revisar"); }
    }
  }, []);

  // ── Cola 1: subir foto ──────────────────────────────────────
  const subirFoto = async () => {
    if (!file)         return setMsgSubida({ ok: false, text: "Selecciona una imagen primero." });
    if (!codigoExamen) return setMsgSubida({ ok: false, text: "Selecciona el examen." });
    if (!user?.id_salon && !salonManual) return setMsgSubida({ ok: false, text: "Selecciona el salón al que pertenece este examen." });
    setSubiendo(true); setMsgSubida(null);
    const form = new FormData();
    form.append("imagen_examen", file);
    form.append("codigo_examen", codigoExamen);
    if (idAlumno) form.append("id_alumno", idAlumno);
    if (!user?.id_salon && salonManual) form.append("id_salon", salonManual);
    try {
      const res  = await fetch(apiUrl("/api/omr/subir"), { method: "POST", headers: { Authorization: "Bearer " + token() }, body: form });
      const data = await res.json();
      if (res.ok) {
        setMsgSubida({ ok: true, text: `Foto en cola. ID: ${data.id_resultado}` });
        setFile(null); cargarBandeja(); cargarUso();
      } else {
        setMsgSubida({ ok: false, text: data.error || "Error subiendo foto." });
      }
    } catch { setMsgSubida({ ok: false, text: "Error de conexión." }); }
    finally  { setSubiendo(false); }
  };

  // ── Cola 2: enviar a IA ─────────────────────────────────────
  const enviarIA = async (id_resultado) => {
    setBandeja(prev => prev.map(r => r.id_resultado === id_resultado ? { ...r, omr_estado: "procesando" } : r));
    try {
      await fetch(apiUrl(`/api/omr/procesar/${id_resultado}`), { method: "POST", headers: headers() });
    } catch { /* el estado se actualiza vía refresh */ }
  };

  // ── Modo degradado: ingreso manual ──────────────────────────
  const enviarManual = async () => {
    if (!modoManual || !inputManual.trim()) return;
    const letras = inputManual.toUpperCase().replace(/[^A-E]/g, "");
    if (!letras.length) return;
    const respuestas = {};
    letras.split("").forEach((l, i) => { respuestas[i + 1] = l; });
    setGuardandoManual(true);
    try {
      const res = await fetch(apiUrl(`/api/omr/manual/${modoManual.id_resultado}`), {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas_manuales: respuestas }),
      });
      if (res.ok) {
        setModoManual(null);
        setInputManual("");
        cargarBandeja();
        flash("Respuestas guardadas correctamente.");
      } else {
        const d = await res.json();
        flash(d.error || "Error al guardar respuestas.", "error");
      }
    } catch { flash("Error de conexión.", "error"); }
    setGuardandoManual(false);
  };

  // ── Revisión (revision_humana) ──────────────────────────────
  const abrirRevision = (resultado) => {
    const respuestas = resultado.respuestas_detectadas || {};
    const alumno     = resultado.id_usuario || "";
    setRespuestasEdit({ ...respuestas });
    setAlumnoSeleccionado(alumno);
    setRevisar(resultado);
    // Persistir en sessionStorage para sobrevivir cambios de tab
    sessionStorage.setItem("omr_revisar",            JSON.stringify(resultado));
    sessionStorage.setItem("omr_respuestasEdit",     JSON.stringify(respuestas));
    sessionStorage.setItem("omr_alumnoSeleccionado", alumno);
  };

  const confirmar = async () => {
    if (!revisar) return;
    setConfirmando(true);
    try {
      const res  = await fetch(apiUrl(`/api/omr/confirmar/${revisar.id_resultado}`), {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas_finales: respuestasEdit, id_alumno: alumnoSeleccionado || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevisar(null);
        sessionStorage.removeItem("omr_revisar");
        sessionStorage.removeItem("omr_respuestasEdit");
        sessionStorage.removeItem("omr_alumnoSeleccionado");
        cargarBandeja(); cargarConfirmados();
        flash(`Confirmado. Nota: ${data.nota_total}`);
      } else { flash("Error: " + data.error, "error"); }
    } catch { flash("Error de conexión al confirmar.", "error"); }
    finally { setConfirmando(false); }
  };

  // ── Corrección post-confirmación ────────────────────────────
  const abrirCorreccion = (resultado) => {
    setRespuestasCorr({ ...(resultado.respuestas_alumno || {}) });
    setMotivo("");
    setCorregir(resultado);
  };

  const aplicarCorreccion = async () => {
    if (!corregir) return;
    if (motivo.trim().length < 10) { flash("El motivo debe tener al menos 10 caracteres.", "error"); return; }
    setCorrigiendo(true);
    try {
      const res  = await fetch(apiUrl(`/api/omr/corregir/${corregir.id_resultado}`), {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas_corregidas: respuestasCorr, motivo }),
      });
      const data = await res.json();
      if (res.ok) {
        setCorregir(null); cargarConfirmados();
        flash(`Corrección aplicada. Nota anterior: ${data.nota_anterior} → Nueva: ${data.nota_total}`);
      } else { flash("Error: " + data.error, "error"); }
    } catch { flash("Error de conexión.", "error"); }
    finally { setCorrigiendo(false); }
  };

  // ── Análisis por examen ─────────────────────────────────────
  const cargarAnalisis = async () => {
    if (!analisisExamen) return;
    setCargandoAnalisis(true); setAnalisis(null);
    try {
      const res  = await fetch(apiUrl(`/api/omr/analisis/${analisisExamen}`), { headers: headers() });
      const data = await res.json();
      setAnalisis(res.ok ? data : null);
      if (!res.ok) flash(data.error, "error");
    } catch { flash("Error cargando análisis.", "error"); }
    finally { setCargandoAnalisis(false); }
  };

  // ── Helpers visuales ────────────────────────────────────────

  // Helper: tiempo transcurrido desde creado_en
  const tiempoDesde = (fechaStr) => {
    if (!fechaStr) return null;
    const diffMs = Date.now() - new Date(fechaStr).getTime();
    const horas  = Math.floor(diffMs / 3600000);
    const dias   = Math.floor(horas / 24);
    if (dias > 0)  return { texto: `${dias}d`, vencido: dias >= 2 };
    if (horas > 0) return { texto: `${horas}h`, vencido: horas >= 24 };
    return { texto: '<1h', vencido: false };
  };

  const plantillaRevisar  = plantillas.find(p => p.codigo_examen === revisar?.codigo_examen);
  const numPreguntasRev   = plantillaRevisar ? Object.keys(plantillaRevisar.claves_correctas || {}).length : Object.keys(respuestasEdit).length || 0;

  const plantillaCorr     = plantillas.find(p => p.codigo_examen === corregir?.codigo_examen);
  const numPreguntasCorr  = plantillaCorr ? Object.keys(plantillaCorr.claves_correctas || {}).length : Object.keys(respuestasCorr).length || 0;

  const rolUsuario        = user?.rol || "";
  const puedeCorregir24h  = ["profesor", "director", "superadmin"].includes(rolUsuario);

  // ── Uso OMR: barra de progreso ──────────────────────────────
  const UsageMeter = () => {
    if (!usoOMR || usoOMR.limite === null) return null;
    const pct   = usoOMR.pct || 0;
    const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
    return (
      <div className={`rounded-2xl border p-5 ${cardBg} flex items-center gap-6`}>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>
              Uso OMR — Plan {usoOMR.plan?.toUpperCase()}
            </p>
            <p className={`text-xs font-black ${pct >= 80 ? "text-amber-400" : "text-emerald-400"}`}>
              {usoOMR.uso} / {usoOMR.limite} escaneos/mes
            </p>
          </div>
          <div className={`h-2 rounded-full w-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
            <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          {pct >= 80 && (
            <p className="text-[10px] text-amber-400 font-bold mt-1.5">
              {pct >= 100 ? "⛔ Límite alcanzado. Contacta a LB Systems para upgrade." : `⚠️ Al ${pct}% del límite mensual.`}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Toast flash */}
      {flashMsg && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm transition-all animate-in slide-in-from-bottom-4 ${
          flashMsg.tipo === "error"
            ? "bg-red-600 text-white"
            : "bg-emerald-600 text-white"
        }`}>
          {flashMsg.tipo === "error" ? "✕ " : "✓ "}{flashMsg.msg}
        </div>
      )}

      {/* Uso mensual */}
      <UsageMeter />

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl w-fit ${isDark ? "bg-slate-800/60" : "bg-slate-100"}`}>
        {[
          { id: "bandeja",    label: `📋 Bandeja${bandeja.length > 0 ? ` (${bandeja.length})` : ""}` },
          { id: "confirmados",label: `✅ Recientes${confirmados.length > 0 ? ` (${confirmados.length})` : ""}` },
          { id: "analisis",   label: "📊 Análisis" },
        ].map(t => (
          <button key={t.id} onClick={() => setTabActiva(t.id)}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tabActiva === t.id ? (isDark ? "bg-slate-700 text-white" : "bg-white text-slate-800 shadow-sm") : textMuted}`}
          >{t.label}</button>
        ))}
      </div>

      {/* ────────────── TAB: BANDEJA ────────────── */}
      {tabActiva === "bandeja" && (<>
        {/* Pendientes de alumnos (NUEVO) */}
        <section className={`rounded-2xl border p-8 ${cardBg}`}>
          <h2 className="text-2xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
            <span>📋</span> Pendientes de Alumnos
          </h2>
          <p className={`text-sm mb-6 ${textMuted}`}>
            Exámenes que los alumnos subieron desde su portal y esperan tu revisión.
          </p>
          <div className="space-y-3">
            {bandeja.filter(b => b.enviado_por_alumno).length === 0 ? (
              <div className={`p-8 rounded-xl text-center ${isDark ? 'bg-slate-950/50 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                <p className={`text-sm ${textMuted}`}>No hay exámenes pendientes de alumnos.</p>
              </div>
            ) : (
              bandeja.filter(b => b.enviado_por_alumno).map((pendiente) => (
                <div key={pendiente.id || pendiente.id_pendiente} className={`p-5 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Thumbnail de la imagen si existe */}
                    {pendiente.url_imagen_scan && (
                      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={apiUrl(pendiente.url_imagen_scan)} alt="Examen" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-sm truncate">{pendiente.alumno_nombre || "Alumno no asignado"}</p>
                        {(() => {
                          const t = tiempoDesde(pendiente.creado_en || pendiente.fecha_creacion);
                          if (!t) return null;
                          return (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${t.vencido ? 'bg-rose-900/40 text-rose-400 border border-rose-700/40' : 'bg-slate-800 text-slate-400'}`}>
                              {t.texto}
                            </span>
                          );
                        })()}
                      </div>
                      <p className={`text-[10px] ${textMuted}`}>{pendiente.nombre_simulacro || pendiente.codigo_examen}</p>
                      {!pendiente.url_imagen_scan && (
                        <p className="text-[10px] text-amber-500 mt-0.5">Solo respuestas — sin imagen</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Si tiene imagen, abrir directamente el modal de revisión */}
                      {pendiente.url_imagen_scan ? (
                        <button
                          onClick={() => abrirRevision({
                            ...pendiente,
                            id_resultado:         pendiente.id || pendiente.id_pendiente,
                            respuestas_detectadas: pendiente.respuestas_alumno || {},
                            omr_confianza:        null,
                            codigo_leido_ia:      pendiente.codigo_postulante_lectura || null,
                          })}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap"
                        >
                          Revisar imagen
                        </button>
                      ) : null}
                      {/* Reenviar imagen existente directamente a la cola IA */}
                      {pendiente.url_imagen_scan && (
                        <button
                          onClick={async () => {
                            const id = pendiente.id_pendiente || pendiente.id;
                            try {
                              const res = await fetch(apiUrl(`/api/exams/pendientes/${id}/enviar-ia`), {
                                method: 'POST', headers: headers(),
                              });
                              const data = await res.json();
                              if (res.ok) {
                                cargarBandeja();
                                flash(`Imagen enviada a la cola IA correctamente.`);
                              } else { flash('Error: ' + data.error, 'error'); }
                            } catch { flash('Error de conexión.', 'error'); }
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap"
                        >
                          Cola IA
                        </button>
                      )}
                      {/* Pre-cargar datos para subir una foto nueva */}
                      {!pendiente.url_imagen_scan && (
                        <button
                          onClick={() => {
                            setCodigoExamen(pendiente.codigo_examen);
                            setIdAlumno(pendiente.id_usuario || "");
                            setTabActiva("bandeja");
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap"
                        >
                          Subir foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cola 1: subir foto */}
        <section className={`rounded-2xl border p-8 ${cardBg}`}>
          <h2 className="text-2xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
            <span>📸</span> Cola 1 — Subir foto del examen
          </h2>
          <p className={`text-sm mb-6 ${textMuted}`}>
            La foto se valida automáticamente (resolución, brillo, orientación) antes de entrar en cola.
          </p>

          {/* Aviso: sin plantillas */}
          {plantillas.length === 0 && (
            <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-bold ${isDark ? "bg-amber-900/20 border-amber-700/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              ⚠️ No hay plantillas de examen creadas. Ve a <strong>Plantillas</strong> para crear una antes de subir fotos.
            </div>
          )}

          {/* Aviso + selector: sin salón asignado */}
          {!user?.id_salon && (
            <div className={`mb-4 px-4 py-3 rounded-xl border ${isDark ? "bg-blue-900/20 border-blue-700/40" : "bg-blue-50 border-blue-200"}`}>
              <p className={`text-sm font-bold mb-2 ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                ℹ️ No tienes un salón asignado. Selecciona a cuál salón corresponde este examen:
              </p>
              <select value={salonManual} onChange={e => setSalonManual(e.target.value)}
                className={`w-full rounded-xl p-3 text-sm font-bold border focus:outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-300 text-slate-800 focus:border-blue-400"}`}
              >
                <option value="">— Seleccionar salón —</option>
                {salones.map(s => <option key={s.id_salon} value={s.id_salon}>{s.nombre}</option>)}
              </select>
              {salones.length === 0 && (
                <p className={`text-xs mt-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>No se encontraron salones. Pide al director que cree uno.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Examen</label>
              <select value={codigoExamen} onChange={e => setCodigoExamen(e.target.value)}
                className={`w-full rounded-xl p-3 text-sm font-bold border focus:outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-300 text-slate-800 focus:border-blue-400"}`}
              >
                <option value="">— Seleccionar —</option>
                {plantillas.map(p => <option key={p.codigo_examen} value={p.codigo_examen}>{p.codigo_examen} — {p.nombre_simulacro}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Alumno (opcional)</label>
              <select value={idAlumno} onChange={e => setIdAlumno(e.target.value)}
                className={`w-full rounded-xl p-3 text-sm font-bold border focus:outline-none transition-colors ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-blue-500" : "bg-white border-slate-300 text-slate-800 focus:border-blue-400"}`}
              >
                <option value="">— Detectar automáticamente —</option>
                {alumnos.map(a => <option key={a.id_usuario} value={a.id_usuario}>{a.nombre_completo}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Foto del examen</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)}
                className={`w-full text-sm file:mr-3 file:cursor-pointer file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 ${isDark ? "text-slate-300" : "text-slate-600"}`}
              />
              {file && (
                <p className={`text-[10px] mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  📎 Archivo: {file.name}
                </p>
              )}
            </div>
          </div>
          <button onClick={subirFoto} disabled={subiendo || !file || !codigoExamen || (!user?.id_salon && !salonManual)}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl transition-all uppercase tracking-widest text-[11px]"
          >{subiendo ? "Validando y subiendo..." : "Agregar a la cola"}</button>
          {msgSubida && <p className={`mt-3 text-sm font-bold ${msgSubida.ok ? "text-emerald-400" : "text-red-400"}`}>{msgSubida.ok ? "✓" : "✗"} {msgSubida.text}</p>}
        </section>

        {/* Bandeja */}
        <section className={`rounded-2xl border p-8 ${cardBg}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
              <span>📋</span> Bandeja de revisión
              {bandeja.length > 0 && <span className="text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">{bandeja.length}</span>}
            </h2>
            <button onClick={cargarBandeja} className={`text-xs font-bold px-4 py-2 rounded-lg border transition-colors ${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
              Actualizar
            </button>
          </div>
          {loading && <p className={`text-sm ${textMuted}`}>Cargando...</p>}
          {!loading && bandeja.length === 0 && (
            <div className={`text-center py-12 ${textMuted}`}>
              <p className="text-5xl mb-4 opacity-30">📭</p>
              <p className="font-bold">No hay exámenes pendientes en la bandeja.</p>
            </div>
          )}
          <div className="space-y-3">
            {bandeja.map(r => {
              const est = ESTADO_LABEL[r.omr_estado] || ESTADO_LABEL.en_cola;
              return (
                <div key={r.id_resultado} className={`flex items-center justify-between gap-4 p-5 rounded-xl border transition-colors ${isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${est.dot}`} />
                    <div className="min-w-0">
                      <p className="font-bold truncate">{r.nombre_alumno || <span className="text-slate-500 italic">Sin alumno identificado</span>}</p>
                      <p className={`text-xs truncate ${textMuted}`}>{r.nombre_simulacro || r.codigo_examen} · {r.nombre_profesor || "—"} · {new Date(r.fecha_procesamiento).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p>
                      {r.omr_error_detalle && <p className="text-xs text-red-400 mt-0.5 truncate max-w-xs">{r.omr_error_detalle}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${est.bg} ${est.color}`}>{est.text}</span>
                    {(r.omr_estado === "en_cola" || r.omr_estado === "error_reintentar" || r.omr_estado === "error_manual") && (
                      <button onClick={() => enviarIA(r.id_resultado)} className="text-[11px] font-black uppercase tracking-widest bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">Procesar IA</button>
                    )}
                    {(r.omr_estado === "en_cola" || r.omr_estado === "error_reintentar" || r.omr_estado === "error_manual") && (
                      <button onClick={() => { setModoManual(r); setInputManual(""); }} className="text-[11px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg transition-colors">Manual</button>
                    )}
                    {r.omr_estado === "revision_humana" && (
                      <button onClick={() => abrirRevision(r)} className="text-[11px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-colors">Revisar</button>
                    )}
                    {r.omr_estado === "procesando" && <span className="text-xs text-blue-400 animate-pulse font-bold">Esperando IA...</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </>)}

      {/* ────────────── TAB: CONFIRMADOS RECIENTES ────────────── */}
      {tabActiva === "confirmados" && (
        <section className={`rounded-2xl border p-8 ${cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
              <span>✅</span> Confirmados recientes
            </h2>
            <button onClick={cargarConfirmados} className={`text-xs font-bold px-4 py-2 rounded-lg border transition-colors ${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
              Actualizar
            </button>
          </div>
          <p className={`text-xs mb-6 ${textMuted}`}>
            {rolUsuario === "profesor" ? "Puedes corregir dentro de las primeras 24 horas." : "Puedes corregir cualquier resultado de los últimos 7 días."}
          </p>
          {confirmados.length === 0 ? (
            <div className={`text-center py-12 ${textMuted}`}>
              <p className="text-4xl mb-3 opacity-30">✅</p>
              <p className="font-bold">No hay confirmados recientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmados.map(r => (
                <div key={r.id_resultado} className={`flex items-center justify-between gap-4 p-5 rounded-xl border ${isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{r.nombre_alumno || "Sin alumno"}</p>
                    <p className={`text-xs ${textMuted}`}>{r.nombre_simulacro || r.codigo_examen} · {new Date(r.fecha_procesamiento).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-[9px] uppercase tracking-widest font-black ${textMuted}`}>Nota</p>
                      <p className="text-xl font-black text-emerald-400">{parseFloat(r.nota_total).toFixed(0)}</p>
                    </div>
                    {puedeCorregir24h && (
                      <button onClick={() => abrirCorreccion(r)} className="text-[11px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition-colors">
                        Corregir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ────────────── TAB: ANÁLISIS ────────────── */}
      {tabActiva === "analisis" && (
        <section className={`rounded-2xl border p-8 ${cardBg}`}>
          <h2 className="text-2xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
            <span>📊</span> Análisis de errores por pregunta
          </h2>
          <p className={`text-sm mb-6 ${textMuted}`}>Ver qué preguntas falló más el salón para orientar la siguiente clase.</p>

          <div className="flex gap-3 mb-8">
            <select value={analisisExamen} onChange={e => setAnalisisExamen(e.target.value)}
              className={`flex-1 rounded-xl p-3 text-sm font-bold border focus:outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-purple-500" : "bg-white border-slate-300 text-slate-800 focus:border-purple-400"}`}
            >
              <option value="">— Seleccionar examen —</option>
              {plantillas.map(p => <option key={p.codigo_examen} value={p.codigo_examen}>{p.codigo_examen} — {p.nombre_simulacro}</option>)}
            </select>
            <button onClick={cargarAnalisis} disabled={!analisisExamen || cargandoAnalisis}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl uppercase tracking-widest text-[11px] transition-all"
            >{cargandoAnalisis ? "Calculando..." : "Analizar"}</button>
          </div>

          {analisis && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg">{analisis.nombre_simulacro}</h3>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{analisis.total_examenes} exámenes</span>
              </div>

              {analisis.preguntas.length === 0 ? (
                <p className={`text-sm ${textMuted}`}>No hay exámenes confirmados para este simulacro aún.</p>
              ) : (
                <>
                  <p className={`text-[10px] uppercase tracking-widest font-black mb-4 ${textMuted}`}>Ordenado por mayor % de error</p>
                  <div className="space-y-2">
                    {analisis.preguntas.map(p => (
                      <div key={p.pregunta} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? "bg-slate-950/60" : "bg-slate-50"}`}>
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${p.pct_error >= 60 ? "bg-red-500/20 text-red-400" : p.pct_error >= 35 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {p.pregunta}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`h-2 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"} mb-1`}>
                            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${p.pct_correcto}%` }} />
                          </div>
                          <div className="flex gap-3 text-[10px] font-bold">
                            <span className="text-emerald-400">✓ {p.correctas} ({p.pct_correcto}%)</span>
                            <span className="text-red-400">✗ {p.incorrectas} ({p.pct_error}%)</span>
                            <span className={textMuted}>— {p.blancos}</span>
                            <span className={`ml-auto font-mono ${textMuted}`}>Clave: <span className="text-white font-black">{p.clave}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* ────────────── MODAL: REVISIÓN IA ────────────── */}
      {revisar && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-6xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-amber-400">Revisión OMR — Confirmar respuestas</h2>
                <p className="text-xs text-slate-400 mt-0.5">{revisar.nombre_simulacro || revisar.codigo_examen} · Código IA: <span className="font-bold text-slate-200">{revisar.codigo_leido_ia || "no detectado"}</span></p>
              </div>
              <button onClick={() => {
                setRevisar(null);
                sessionStorage.removeItem("omr_revisar");
                sessionStorage.removeItem("omr_respuestasEdit");
                sessionStorage.removeItem("omr_alumnoSeleccionado");
              }} className="text-slate-400 hover:text-white bg-slate-800 rounded-full w-8 h-8 font-bold text-sm">✕</button>
            </div>
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="lg:w-1/2 bg-black flex items-start justify-center p-4 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={apiUrl(revisar.url_imagen_scan)} alt="Examen escaneado" className="w-full max-w-md rounded-lg border border-slate-700 shadow-xl object-contain" />
              </div>
              <div className="lg:w-1/2 border-l border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
                <div className="flex gap-4 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Alta ≥85%</span>
                  <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Media 70–85%</span>
                  <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Baja &lt;70%</span>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Alumno</label>
                  <select value={alumnoSeleccionado} onChange={e => setAlumnoSeleccionado(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 outline-none text-white rounded-xl p-3 text-sm font-bold"
                  >
                    <option value="">— Sin alumno asignado —</option>
                    {alumnos.map(a => <option key={a.id_usuario} value={a.id_usuario}>{a.nombre_completo}</option>)}
                  </select>
                </div>
                <ManualCorrectionGrid
                  plantilla={plantillaRevisar}
                  numPreguntas={numPreguntasRev}
                  respuestas={respuestasEdit}
                  onRespuestasCambiadas={(nuevas) => {
                    setRespuestasEdit(nuevas);
                    sessionStorage.setItem("omr_respuestasEdit", JSON.stringify(nuevas));
                  }}
                  confianza={revisar?.omr_confianza || {}}
                  isDark={isDark}
                  textMuted={textMuted}
                />
                <button onClick={confirmar} disabled={confirmando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all"
                >{confirmando ? "Calculando nota..." : "Confirmar y calcular nota"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── MODAL: CORRECCIÓN POST-CONFIRMACIÓN ────────────── */}
      {corregir && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-rose-800/50 rounded-2xl shadow-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-rose-400">Corrección post-confirmación</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {corregir.nombre_simulacro || corregir.codigo_examen} · {corregir.nombre_alumno || "Sin alumno"} · Nota actual: <span className="font-black text-white">{parseFloat(corregir.nota_total).toFixed(0)}</span>
                </p>
              </div>
              <button onClick={() => setCorregir(null)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full w-8 h-8 font-bold text-sm">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className={`p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold`}>
                ⚠️ Esta corrección quedará registrada en el log de auditoría con tu nombre, la nota anterior y el motivo.
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Respuestas ({numPreguntasCorr} preguntas)</p>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                  {Array.from({ length: numPreguntasCorr }, (_, i) => {
                    const q = (i + 1).toString();
                    return (
                      <div key={q} className="rounded-lg p-1.5 bg-slate-800/50">
                        <p className="text-[9px] font-black text-center text-slate-400 mb-1">{q}</p>
                        <select value={respuestasCorr[q] || ""} onChange={e => setRespuestasCorr(prev => ({ ...prev, [q]: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-md p-1 text-center"
                        >
                          {OPCIONES_RESPUESTA.map(op => <option key={op} value={op}>{op === "" ? "—" : op}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Motivo de la corrección *</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ej: La IA confundió la pregunta 12 — revisé la hoja física y la respuesta correcta es B."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 outline-none text-white rounded-xl p-3 text-sm resize-none"
                />
                <p className={`text-[10px] mt-1 ${motivo.length >= 10 ? "text-emerald-400" : "text-slate-500"}`}>{motivo.length} / mín. 10 caracteres</p>
              </div>
              <button onClick={aplicarCorreccion} disabled={corrigiendo || motivo.trim().length < 10}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] transition-all"
              >{corrigiendo ? "Aplicando corrección..." : "Aplicar corrección y recalcular nota"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Modo degradado — ingreso manual ──────────────── */}
      {modoManual && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <h3 className="font-extrabold text-xl">⌨️ Ingreso manual</h3>
                <p className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Modo degradado · n8n no disponible</p>
              </div>
              <button onClick={() => setModoManual(null)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <p className="font-bold text-sm">{modoManual.alumno_nombre || "Alumno desconocido"}</p>
                <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{modoManual.codigo_examen} · {modoManual.nombre_simulacro}</p>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Respuestas (una letra por pregunta, sin espacios)
                </label>
                <input
                  type="text"
                  value={inputManual}
                  onChange={e => setInputManual(e.target.value.toUpperCase().replace(/[^A-Ea-e]/g, ""))}
                  placeholder="Ej: ABCDEABCDE..."
                  className={`w-full font-mono text-sm px-4 py-3 rounded-xl border outline-none tracking-widest ${isDark ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-400"}`}
                  autoFocus
                />
                <p className={`text-[10px] mt-1.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Solo A, B, C, D, E · {inputManual.length} pregunta{inputManual.length !== 1 ? "s" : ""} ingresada{inputManual.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className={`p-3 rounded-xl text-[11px] font-bold ${isDark ? "bg-amber-900/20 border border-amber-800/30 text-amber-400" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                ⚠️ Las respuestas se guardarán en estado "Revisar". Deberás confirmarlas manualmente para calcular la nota.
              </div>
              <button onClick={enviarManual} disabled={guardandoManual || !inputManual.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] transition-all">
                {guardandoManual ? "Guardando..." : "Guardar respuestas manuales"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

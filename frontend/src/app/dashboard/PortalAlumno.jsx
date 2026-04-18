"use client";
import { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { apiUrl } from '@/lib/api';

function getSemaforo(curso) {
  const total = (curso.aciertos || 0) + (curso.errores || 0) + (curso.blancos || 0);
  if (total === 0) return { color: 'text-slate-400', bg: 'bg-slate-700/20', label: '○' };
  const ratio = (curso.aciertos || 0) / total;
  if (ratio >= 0.7) return { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20', label: '🟢' };
  if (ratio >= 0.5) return { color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/20', label: '🟡' };
  return { color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/20', label: '🔴' };
}

export default function PortalAlumno({ user, isDark, textMuted }) {
  const [examenActivo, setExamenActivo] = useState(null);
  const [mensajeSemaforo, setMensajeSemaforo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resultadoNuevo, setResultadoNuevo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modalFoto, setModalFoto]     = useState(null);
  const [ranking, setRanking]         = useState(null);
  const [resumenes, setResumenes]     = useState([]);
  const [racha, setRacha]             = useState(null);
  
  // Enviar examen a revisión
  const [envios, setEnvios] = useState([]);
  const [selectedFileEnvio, setSelectedFileEnvio] = useState(null);
  const [codigoExamenEnvio, setCodigoExamenEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [plantillasDisponibles, setPlantillasDisponibles] = useState([]);

  // Ingreso manual de respuestas (sin imagen)
  const [modoEntrega, setModoEntrega]         = useState('imagen'); // 'imagen' | 'manual'
  const [respuestasManual, setRespuestasManual] = useState({});
  const [enviandoManual, setEnviandoManual]   = useState(false);
  const [resultadoManual, setResultadoManual] = useState(null);

  const loadData = async () => {
    setCargando(true);
    const token = localStorage.getItem('edusaas_token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [actRes, misRes, rankRes, resRes, rachaRes, enviosRes, plantillasRes] = await Promise.all([
        fetch(apiUrl('/api/exams/alumno/examen-activo'), { headers }),
        fetch(apiUrl('/api/exams/alumno/mis-resultados'), { headers }),
        fetch(apiUrl(`/api/alumnos/${user.id}/ranking`), { headers }),
        fetch(apiUrl(`/api/alumnos/${user.id}/resumen-semanal`), { headers }),
        fetch(apiUrl('/api/alumnos/mi-racha'), { headers }),
        fetch(apiUrl('/api/exams/alumno/mis-envios'), { headers }),
        fetch(apiUrl('/api/exams/plantillas'), { headers }),
      ]);
      const actData   = await actRes.json();
      const misData   = await misRes.json();
      const rankData  = rankRes.ok   ? await rankRes.json()   : null;
      const resData   = resRes.ok    ? await resRes.json()    : [];
      const rachaData = rachaRes.ok  ? await rachaRes.json()  : null;
      const enviosData = enviosRes.ok ? await enviosRes.json() : [];
      const plantillasData = plantillasRes.ok ? await plantillasRes.json() : [];
      
      setExamenActivo(actData.examen || null);
      setMensajeSemaforo(actData.mensaje || '');
      if (Array.isArray(misData)) setResultados(misData);
      if (rankData?.posicion) setRanking(rankData);
      if (Array.isArray(resData) && resData.length) setResumenes(resData);
      if (rachaData?.racha_actual >= 0) setRacha(rachaData);
      if (Array.isArray(enviosData)) setEnvios(enviosData);
      if (Array.isArray(plantillasData)) setPlantillasDisponibles(plantillasData);
    } catch {
      console.log('Error cargando datos del alumno');
    }
    setCargando(false);
  };

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, []);

  const subirExamen = async () => {
    if (!selectedFile || !examenActivo) return;
    setUploading(true);
    setResultadoNuevo(null);
    try {
      const token = localStorage.getItem('edusaas_token');
      const form = new FormData();
      form.append('imagen_examen', selectedFile);
      form.append('codigo_examen', examenActivo.codigo_examen);
      const res = await fetch(apiUrl('/api/exams/alumno/subir-examen'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setResultadoNuevo(data);
        setSelectedFile(null);
        loadData();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error de conexion al enviar tu examen.');
    }
    setUploading(false);
  };

  const enviarParaRevision = async () => {
    if (!selectedFileEnvio || !codigoExamenEnvio) {
      alert("Selecciona un examen y sube la foto");
      return;
    }
    setEnviando(true);
    try {
      const token = localStorage.getItem('edusaas_token');
      const form = new FormData();
      form.append('imagen_examen', selectedFileEnvio);
      form.append('codigo_examen', codigoExamenEnvio);
      const res = await fetch(apiUrl('/api/exams/alumno/subir-revision'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
        setSelectedFileEnvio(null);
        setCodigoExamenEnvio("");
        loadData();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Error de conexión.');
    }
    setEnviando(false);
  };

  const enviarManual = async () => {
    if (!examenActivo) return;
    const plantilla = plantillasDisponibles.find(p => p.codigo_examen === examenActivo.codigo_examen);
    const totalPreguntas = plantilla ? Object.keys(plantilla.claves_correctas || {}).length : 0;
    const respondidas = Object.values(respuestasManual).filter(v => v).length;
    if (respondidas === 0) return alert('Debes responder al menos una pregunta.');
    if (!confirm(`Vas a enviar ${respondidas} de ${totalPreguntas} respuestas. Las preguntas sin respuesta se contarán como blanco. ¿Confirmar?`)) return;
    setEnviandoManual(true);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl('/api/exams/alumno/subir-manual'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_examen: examenActivo.codigo_examen, respuestas: respuestasManual }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultadoManual(data);
        setRespuestasManual({});
      } else { alert(data.error); }
    } catch { alert('Error de conexión.'); }
    setEnviandoManual(false);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative z-10">
      <div className={`p-8 rounded-3xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-900 to-blue-950/30 border-blue-900/40' : 'bg-gradient-to-br from-white to-blue-50 border-blue-200'}`}>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-black shadow-xl text-white">
            AL
          </div>
          <div>
            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${textMuted}`}>Tu Panel Personal</p>
            <h2 className="text-3xl font-extrabold tracking-tight">{user.nombre}</h2>
            <p className={`text-sm font-medium mt-1 ${textMuted}`}>ID: <span className="font-mono text-blue-400">{user.id}</span></p>
          </div>
        </div>
      </div>

      {examenActivo ? (
        <div className="bg-emerald-950/20 border-2 border-emerald-500/40 rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="flex items-start justify-between relative z-10 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-2xl animate-pulse text-white">
                OK
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Examen activo</p>
                <h3 className="text-2xl font-extrabold text-white">{examenActivo.nombre_simulacro}</h3>
                <p className="text-xs text-emerald-400/70 font-mono mt-1">
                  {examenActivo.codigo_examen} - {examenActivo.tipo_calificacion?.toUpperCase()}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black bg-emerald-500 text-white px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">EN CURSO</span>
          </div>

          {(resultadoNuevo || resultadoManual) ? (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-6 text-center">
              {resultadoNuevo ? (
                <>
                  <p className="text-emerald-400 text-lg font-black mb-2">Examen entregado correctamente</p>
                  <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-300 tracking-tighter mb-2">
                    {resultadoNuevo.nota_total}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Puntaje registrado en base de datos</p>
                </>
              ) : (
                <>
                  <p className="text-amber-400 text-lg font-black mb-2">Respuestas enviadas al profesor</p>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">Tu profesor las revisará y confirmará tu nota. Recibirás una notificación cuando esté lista.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Selector de modo */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setModoEntrega('imagen')}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${modoEntrega === 'imagen' ? 'bg-emerald-600 text-white border-emerald-500' : 'border-slate-700 text-slate-400 hover:bg-slate-800/50'}`}
                >
                  Subir foto
                </button>
                <button
                  onClick={() => setModoEntrega('manual')}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${modoEntrega === 'manual' ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-700 text-slate-400 hover:bg-slate-800/50'}`}
                >
                  Ingresar respuestas
                </button>
              </div>

              {modoEntrega === 'imagen' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`border-2 border-dashed border-emerald-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                    <span className="text-5xl mb-4 opacity-60">IMG</span>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Fotografia tu hoja con buena luz y procura que todas las esquinas sean visibles.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full max-w-xs text-xs file:mr-3 file:cursor-pointer file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 mb-4 text-slate-400"
                    />
                    {selectedFile && <p className="text-emerald-400 text-xs font-bold mb-4">Archivo: {selectedFile.name}</p>}
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 mb-4">
                      <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Consejos para mejor precision</h4>
                      <ul className="space-y-2 text-[11px] text-slate-400">
                        <li>Usa lapiz 2B y sombrea completo.</li>
                        <li>Toma la foto desde arriba.</li>
                        <li>Evita sombras y reflejos.</li>
                        <li>Muestra todas las esquinas de la hoja.</li>
                      </ul>
                    </div>
                    <button
                      onClick={subirExamen}
                      disabled={!selectedFile || uploading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:grayscale text-white font-black py-4 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all uppercase tracking-widest text-[11px]"
                    >
                      {uploading ? 'Procesando con IA...' : 'Entregar mi examen'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo manual: grid de botones A-E por pregunta */
                (() => {
                  const plantilla = plantillasDisponibles.find(p => p.codigo_examen === examenActivo.codigo_examen);
                  const totalPreguntas = plantilla ? Object.keys(plantilla.claves_correctas || {}).length : 0;
                  if (totalPreguntas === 0) return (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No se encontró la plantilla de este examen. Contacta a tu profesor.
                    </div>
                  );
                  return (
                    <div>
                      <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Selecciona tu respuesta para cada pregunta. Las preguntas sin respuesta cuentan como blanco.
                        <span className="ml-2 font-bold text-blue-400">
                          {Object.values(respuestasManual).filter(v => v).length}/{totalPreguntas} respondidas
                        </span>
                      </p>
                      <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 mb-5">
                        {Array.from({ length: totalPreguntas }, (_, i) => {
                          const q = String(i + 1);
                          const sel = respuestasManual[q] || '';
                          return (
                            <div key={q} className="flex items-center gap-2">
                              <span className={`w-8 text-center text-[10px] font-black flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{q}</span>
                              {['A','B','C','D','E'].map(op => (
                                <button
                                  key={op}
                                  onClick={() => setRespuestasManual(prev => ({ ...prev, [q]: prev[q] === op ? '' : op }))}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border ${
                                    sel === op
                                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                                      : `${isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-blue-600/50' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'}`
                                  }`}
                                >{op}</button>
                              ))}
                              {sel && (
                                <button onClick={() => setRespuestasManual(prev => { const n = {...prev}; delete n[q]; return n; })}
                                  className="w-6 text-slate-600 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={enviarManual}
                        disabled={enviandoManual || Object.values(respuestasManual).filter(v => v).length === 0}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[11px]"
                      >
                        {enviandoManual ? 'Enviando...' : 'Enviar respuestas al profesor'}
                      </button>
                    </div>
                  );
                })()
              )}
            </>
          )}
        </div>
      ) : (
        <div className={`border rounded-3xl p-10 text-center ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white/60 border-slate-200'}`}>
          <div className="text-6xl mb-4 opacity-40">OFF</div>
          <h3 className="text-xl font-extrabold mb-2">Sistema cerrado</h3>
          <p className={`text-sm ${textMuted} max-w-md mx-auto leading-relaxed`}>{mensajeSemaforo}</p>
        </div>
      )}

      {/* ── Ranking en el salón ─────────────────────────────── */}
      {ranking && (
        <div className={`p-6 rounded-3xl border flex items-center gap-6 animate-in fade-in duration-500 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center flex-shrink-0">
            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg ${ranking.posicion === 1 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-slate-700/30 border border-slate-700/50'}`}>
              <span className="text-2xl">{ranking.posicion === 1 ? '🏆' : ranking.posicion <= 3 ? '🥈' : '📊'}</span>
              <span className={`text-xl font-black leading-none mt-1 ${ranking.posicion === 1 ? 'text-amber-400' : 'text-white'}`}>#{ranking.posicion}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-base mb-1">Tu posición en el salón</h4>
            <p className={`text-sm ${textMuted}`}>
              Estás en el puesto <span className="font-black text-white">#{ranking.posicion}</span> de <span className="font-black text-white">{ranking.total}</span> alumnos · Últimos 90 días
            </p>
            <div className="mt-3 flex gap-4">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Tu promedio</p>
                <p className="text-lg font-black text-blue-400">{ranking.promedio_alumno}</p>
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Promedio del salón</p>
                <p className={`text-lg font-black ${textMuted}`}>{ranking.promedio_salon}</p>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 hidden sm:block">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3"
                  strokeDasharray={`${Math.round((1 - (ranking.posicion - 1) / ranking.total) * 100)} 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-blue-400">{Math.round((1 - (ranking.posicion - 1) / ranking.total) * 100)}%</span>
                <span className={`text-[9px] font-bold ${textMuted}`}>top</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Racha de login (gamificación) ───────────────────── */}
      {racha && racha.racha_actual > 0 && (
        <div className={`p-6 rounded-3xl border flex items-center gap-6 animate-in fade-in duration-500 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-shrink-0 text-center">
            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg border ${
              racha.racha_actual >= 30 ? 'bg-amber-500/20 border-amber-500/30' :
              racha.racha_actual >= 7  ? 'bg-orange-500/15 border-orange-500/30' :
              'bg-blue-500/10 border-blue-500/20'
            }`}>
              <span className="text-2xl">{racha.racha_actual >= 30 ? '🔥' : racha.racha_actual >= 7 ? '⚡' : '✨'}</span>
              <span className={`text-xl font-black leading-none mt-1 ${
                racha.racha_actual >= 30 ? 'text-amber-400' :
                racha.racha_actual >= 7  ? 'text-orange-400' : 'text-blue-400'
              }`}>{racha.racha_actual}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-base mb-1">
              {racha.racha_actual === 1 ? '¡Bienvenido de vuelta!' :
               racha.racha_actual >= 30 ? '¡Racha legendaria! 🔥' :
               racha.racha_actual >= 7  ? '¡Racha en llamas! ⚡' :
               `¡${racha.racha_actual} días seguidos!`}
            </h4>
            <p className={`text-sm ${textMuted}`}>
              {racha.racha_actual} {racha.racha_actual === 1 ? 'día' : 'días'} consecutivos ingresando al portal.
              {racha.racha_maxima > racha.racha_actual && ` Tu récord es de ${racha.racha_maxima} días.`}
            </p>
            {racha.racha_actual < racha.racha_maxima && (
              <p className={`text-[10px] font-black mt-2 text-blue-400`}>
                🏆 Récord personal: {racha.racha_maxima} días — ¡puedes superarlo!
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Resúmenes semanales ─────────────────────────────── */}
      {resumenes.length > 0 && (
        <div className={`p-6 rounded-3xl border animate-in fade-in duration-500 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${textMuted}`}>📅 Resúmenes semanales</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resumenes.map(r => (
              <div key={r.id_resumen} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${textMuted}`}>
                  Semana del {new Date(r.semana_inicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </p>
                <div className="flex gap-4 mb-2">
                  {r.promedio_semana && (
                    <div>
                      <p className={`text-[9px] font-black uppercase ${textMuted}`}>Promedio</p>
                      <p className={`text-lg font-black ${parseFloat(r.promedio_semana) >= 14 ? 'text-emerald-400' : parseFloat(r.promedio_semana) >= 11 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {r.promedio_semana}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className={`text-[9px] font-black uppercase ${textMuted}`}>Exámenes</p>
                    <p className="text-lg font-black">{r.examenes_semana}</p>
                  </div>
                  <div>
                    <p className={`text-[9px] font-black uppercase ${textMuted}`}>Asistencia</p>
                    <p className="text-lg font-black text-blue-400">{r.asistencias}✓ {r.ausencias > 0 && <span className="text-rose-400">{r.ausencias}✗</span>}</p>
                  </div>
                  {r.posicion_salon && (
                    <div>
                      <p className={`text-[9px] font-black uppercase ${textMuted}`}>Ranking</p>
                      <p className="text-lg font-black">#{r.posicion_salon}<span className={`text-sm ${textMuted}`}>/{r.total_salon}</span></p>
                    </div>
                  )}
                </div>
                {r.mensaje && <p className={`text-[11px] italic leading-relaxed ${textMuted}`}>{r.mensaje}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${textMuted} flex justify-between`}>
              <span>Evolucion de Puntaje</span>
              <span className="text-blue-400">Tendencia</span>
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[...resultados].reverse().map((r) => ({
                    name: new Date(r.fecha_procesamiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
                    score: parseFloat(r.nota_total),
                  }))}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="name" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${textMuted}`}>Analisis del ultimo examen</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resultados[0]?.puntaje_por_cursos || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} horizontal={false} vertical={false} />
                  <XAxis dataKey="curso" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={8} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px' }} cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9' }} />
                  <Bar dataKey="puntaje" radius={[4, 4, 0, 0]}>
                    {(resultados[0]?.puntaje_por_cursos || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#ec4899'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6 ${textMuted}`}>Mi Historial de Simulacros</h3>
        {resultados.length === 0 ? (
          <div className={`border rounded-2xl p-8 text-center ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-sm ${textMuted}`}>Aun no tienes resultados registrados. Participa en el proximo simulacro.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resultados.map((r, i) => {
              const nota = parseFloat(r.nota_total);
              const isTop = i === 0;
              return (
                <div key={r.id_resultado} className={`border rounded-2xl p-6 relative overflow-hidden transition-all hover:border-opacity-80 ${isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                  {isTop && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-2xl"></div>}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isTop && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest">Ultimo</span>}
                        <p className="font-extrabold text-sm truncate">{r.nombre_simulacro || 'Simulacro sin nombre'}</p>
                      </div>
                      <p className={`text-[10px] uppercase tracking-widest font-medium ${textMuted}`}>
                        {new Date(r.fecha_procesamiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {r.tipo_calificacion && ` - ${r.tipo_calificacion}`}
                      </p>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className={`text-[9px] uppercase tracking-widest font-black mb-0.5 ${textMuted}`}>Puntaje</p>
                        <p className={`text-3xl font-black tracking-tighter ${nota >= 900 ? 'text-emerald-400' : nota >= 600 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {nota.toFixed(0)}
                        </p>
                      </div>
                      {r.url_imagen_scan && (
                        <button onClick={() => setModalFoto(r.url_imagen_scan)} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all text-lg" title="Ver foto del examen">
                          Ver
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const token = localStorage.getItem('edusaas_token');
                          window.open(`${apiUrl(`/api/alumnos/${user.id}/resultados/${r.id_resultado}/pdf`)}?token=${token}`, '_blank');
                        }} 
                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-lg font-bold" 
                        title="Descargar reporte PDF"
                      >
                        📄 PDF
                      </button>
                    </div>
                  </div>

                  {Array.isArray(r.puntaje_por_cursos) && r.puntaje_por_cursos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                      <p className={`text-[9px] uppercase tracking-widest font-black mb-3 ${textMuted}`}>Semáforo por curso</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {r.puntaje_por_cursos.map((c, ci) => {
                          const sem = getSemaforo(c);
                          return (
                            <div key={ci} className={`rounded-xl px-3 py-2.5 border ${sem.bg}`}>
                              <p className={`text-[9px] uppercase tracking-widest font-black truncate mb-1.5 ${textMuted}`}>{c.curso || 'Área'}</p>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-sm leading-none">{sem.label}</span>
                                <span className={`text-base font-black leading-none ${sem.color}`}>{parseFloat(c.puntaje || 0).toFixed(0)}</span>
                              </div>
                              <p className={`text-[9px] font-mono ${textMuted}`}>
                                ✓{c.aciertos ?? 0} &nbsp;✗{c.errores ?? 0} &nbsp;—{c.blancos ?? 0}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────── */}
      {/* ENVIAR EXAMEN A REVISIÓN (NUEVO)                      */}
      {/* ───────────────────────────────────────────────────── */}
      <div className={`border rounded-3xl p-8 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6 ${textMuted}`}>
          📤 Enviar Examen a Revisión
        </h3>
        <p className={`text-sm mb-6 ${textMuted}`}>
          ¿Tienes un examen físico que quieres que tu profesor califique? Sube la foto y él la revisará.
        </p>
        
        <div className="grid gap-4 mb-6">
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>
              Examen
            </label>
            <select
              value={codigoExamenEnvio}
              onChange={(e) => setCodigoExamenEnvio(e.target.value)}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
            >
              <option value="">— Seleccionar examen —</option>
              {plantillasDisponibles.map((p) => (
                <option key={p.codigo_examen} value={p.codigo_examen}>
                  {p.nombre_simulacro}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>
              Foto del examen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFileEnvio(e.target.files[0] || null)}
              className={`w-full text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
            />
            {selectedFileEnvio && (
              <p className={`text-[10px] mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                📎 {selectedFileEnvio.name}
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={enviarParaRevision}
          disabled={enviando || !selectedFileEnvio || !codigoExamenEnvio}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:grayscale text-white font-black py-4 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all uppercase tracking-widest text-[11px]"
        >
          {enviando ? '⏳ Enviando...' : '📤 Enviar a calificar'}
        </button>
        
        {/* Lista de envíos */}
        {envios.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${textMuted}`}>
              📋 Mis envíos recientes
            </h4>
            <div className="space-y-2">
              {envios.map((envio) => (
                <div
                  key={envio.id_pendiente}
                  className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{envio.nombre_simulacro || envio.codigo_examen}</p>
                      <p className={`text-[10px] ${textMuted}`}>
                        {new Date(envio.creado_en).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      envio.estado === 'procesado' ? 'bg-emerald-500/20 text-emerald-400' :
                      envio.estado === 'pendiente_validacion' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {envio.estado_texto}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalFoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setModalFoto(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModalFoto(null)} className="absolute -top-4 -right-4 z-10 w-10 h-10 rounded-full bg-red-500 text-white font-black flex items-center justify-center shadow-xl">X</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modalFoto} alt="Mi examen" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

const ESTADO_COLOR = {
  activo:    'emerald',
  inactivo:  'slate',
  graduado:  'blue',
  retirado:  'rose',
};

function StatCard({ label, value, color = 'slate', sub }) {
  return (
    <div className={`rounded-2xl border border-${color}-500/20 bg-${color}-500/5 p-5`}>
      <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-400`}>{label}</p>
      <p className={`mt-2 text-4xl font-black text-${color}-400`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function PortalTutor({ isDark, textMuted, cardBg }) {
  const [alumnos, setAlumnos]           = useState([]);
  const [alumnoSel, setAlumnoSel]       = useState(null);
  const [resumen, setResumen]           = useState(null);
  const [loadingList, setLoadingList]   = useState(true);
  const [loadingDet, setLoadingDet]     = useState(false);

  const token = () => localStorage.getItem('edusaas_token');
  const hdrs  = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    fetch(apiUrl('/api/tutor/mis-alumnos'), { headers: hdrs() })
      .then((r) => r.ok ? r.json() : [])
      .then(setAlumnos)
      .catch(() => {})
      .finally(() => setLoadingList(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verDetalle = async (alumno) => {
    setAlumnoSel(alumno);
    setResumen(null);
    setLoadingDet(true);
    try {
      const res = await fetch(apiUrl(`/api/tutor/alumno/${alumno.id_usuario}/resumen`), { headers: hdrs() });
      if (res.ok) setResumen(await res.json());
    } finally {
      setLoadingDet(false);
    }
  };

  const panelClass = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';

  const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <section className="relative z-10 space-y-6">
      <div>
        <h2 className="mb-1 text-3xl font-extrabold tracking-tight">Portal del Tutor</h2>
        <p className={`text-sm ${textMuted}`}>
          Seguimiento de tus alumnos vinculados — notas, asistencia y pagos.
        </p>
      </div>

      {loadingList && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!loadingList && alumnos.length === 0 && (
        <div className={`rounded-2xl border p-12 text-center ${panelClass}`}>
          <p className="text-4xl">👨‍👩‍👧</p>
          <p className={`mt-4 font-bold ${textMuted}`}>No tienes alumnos vinculados todavía.</p>
          <p className={`mt-1 text-sm ${textMuted}`}>Pide al director o secretaria que te asigne alumnos.</p>
        </div>
      )}

      {!loadingList && alumnos.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Lista de alumnos */}
          <div className="space-y-2">
            <p className={`mb-3 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>
              Mis alumnos ({alumnos.length})
            </p>
            {alumnos.map((a) => {
              const ec = ESTADO_COLOR[a.estado_alumno] || 'slate';
              return (
                <button
                  key={a.id_usuario}
                  onClick={() => verDetalle(a)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    alumnoSel?.id_usuario === a.id_usuario
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : `${panelClass} hover:bg-slate-800/20`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold leading-tight">{a.nombre_completo}</p>
                      <p className={`text-[11px] ${textMuted}`}>{a.nombre_salon || 'Sin salón'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full bg-${ec}-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-${ec}-400`}>
                      {a.estado_alumno || 'activo'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Panel de detalle */}
          <div className={`rounded-2xl border p-6 ${panelClass}`}>
            {!alumnoSel && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-4xl">👈</p>
                <p className={`mt-4 font-bold ${textMuted}`}>Selecciona un alumno para ver su resumen</p>
              </div>
            )}

            {alumnoSel && loadingDet && (
              <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            )}

            {alumnoSel && !loadingDet && resumen && (() => {
              const { alumno, asistencia, examenes, pagos, racha } = resumen;
              const totalAsist = parseInt(asistencia.total || 0);
              const presentes  = parseInt(asistencia.presentes || 0);
              const deudas     = pagos.filter((p) => p.estado === 'pendiente');
              const ultimoExam = examenes[0];

              return (
                <div className="space-y-6">
                  {/* Encabezado alumno */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-extrabold">{alumno.nombre_completo}</h3>
                      <p className={`text-sm ${textMuted}`}>{alumno.id_usuario}</p>
                    </div>
                    {racha && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-center">
                        <p className="text-xl font-black text-amber-400">
                          {racha.racha_actual >= 30 ? '🔥' : racha.racha_actual >= 7 ? '⚡' : '✨'} {racha.racha_actual}
                        </p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>días racha</p>
                      </div>
                    )}
                  </div>

                  {/* Alertas dinámicas */}
                  {(() => {
                    const alertasRender = [];
                    if (totalAsist > 0 && pct(presentes, totalAsist) < 75) alertasRender.push("Asistencia crítica: el alumno está faltando demasiado (<75%).");
                    if (deudas.length > 0) alertasRender.push(`Problemas financieros: ${deudas.length} pagos pendientes.`);
                    if (ultimoExam && parseFloat(ultimoExam.nota_total) < 11) alertasRender.push("Rendimiento: el alumno ha desaprobado el último simulacro.");
                    if (alertasRender.length === 0) return null;
                    return (
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2 mb-3">
                          <span className="text-sm">🚨</span> Requiere Atención
                        </p>
                        <ul className="list-disc pl-5 text-sm font-bold text-rose-400/90 space-y-1">
                          {alertasRender.map((alerta, i) => <li key={i}>{alerta}</li>)}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Cards resumen */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard
                      label="Asistencia"
                      value={`${pct(presentes, totalAsist)}%`}
                      color={pct(presentes, totalAsist) >= 80 ? 'emerald' : pct(presentes, totalAsist) >= 60 ? 'amber' : 'rose'}
                      sub={`${presentes}/${totalAsist} (28 días)`}
                    />
                    <StatCard
                      label="Último examen"
                      value={ultimoExam ? `${parseFloat(ultimoExam.nota_total).toFixed(1)}` : '—'}
                      color="blue"
                      sub={ultimoExam?.nombre_simulacro || 'Sin exámenes'}
                    />
                    <StatCard
                      label="Tardanzas"
                      value={asistencia.tardanzas || 0}
                      color="amber"
                      sub="últimos 28 días"
                    />
                    <StatCard
                      label="Deudas"
                      value={deudas.length}
                      color={deudas.length > 0 ? 'rose' : 'emerald'}
                      sub={deudas.length > 0 ? `S/ ${deudas.reduce((s, p) => s + parseFloat(p.monto), 0).toFixed(2)}` : 'Al día'}
                    />
                  </div>

                  {/* Asistencia barra */}
                  {totalAsist > 0 && (
                    <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`mb-3 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Asistencia (últimas 4 semanas)</p>
                      <div className="flex h-4 overflow-hidden rounded-full bg-slate-800">
                        <div className="bg-emerald-500 transition-all" style={{ width: `${pct(presentes, totalAsist)}%` }} />
                        <div className="bg-amber-500 transition-all" style={{ width: `${pct(parseInt(asistencia.tardanzas || 0), totalAsist)}%` }} />
                        <div className="bg-rose-500 transition-all" style={{ width: `${pct(parseInt(asistencia.ausentes || 0), totalAsist)}%` }} />
                      </div>
                      <div className={`mt-2 flex gap-4 text-[10px] ${textMuted}`}>
                        <span className="text-emerald-400">{presentes} presentes</span>
                        <span className="text-amber-400">{asistencia.tardanzas || 0} tardanzas</span>
                        <span className="text-rose-400">{asistencia.ausentes || 0} ausentes</span>
                      </div>
                    </div>
                  )}

                  {/* Últimos exámenes */}
                  {examenes.length > 0 && (
                    <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`mb-4 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Últimos exámenes</p>
                      <div className="space-y-3">
                        {examenes.map((e) => (
                          <div key={e.id_resultado} className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{e.nombre_simulacro}</p>
                              <p className={`text-[11px] ${textMuted}`}>
                                {new Date(e.fecha_procesamiento).toLocaleDateString('es-PE')}
                              </p>
                            </div>
                            <span className={`text-lg font-black ${parseFloat(e.nota_total) >= 11 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {parseFloat(e.nota_total).toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pagos */}
                  {pagos.length > 0 && (
                    <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`mb-4 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Estado de pagos</p>
                      <div className="space-y-3">
                        {pagos.map((p) => (
                          <div key={p.id_pago} className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{p.concepto}</p>
                              <p className={`text-[11px] ${textMuted}`}>
                                {p.estado === 'pagado'
                                  ? `Pagado ${new Date(p.fecha_pago).toLocaleDateString('es-PE')}`
                                  : `Vence ${p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-PE') : '—'}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black">S/ {parseFloat(p.monto).toFixed(2)}</p>
                              <span className={`text-[9px] font-black uppercase ${p.estado === 'pagado' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.estado}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}

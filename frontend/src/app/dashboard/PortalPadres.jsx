import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

const ESTADO_COLOR = { activo: 'emerald', inactivo: 'slate', graduado: 'blue', retirado: 'rose' };

export default function PortalPadres({ isDark, textMuted }) {
  const [hijos,       setHijos]       = useState([]);
  const [hijoSel,     setHijoSel]     = useState(null);
  const [resumen,     setResumen]     = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDet,  setLoadingDet]  = useState(false);

  const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('edusaas_token')}` });

  useEffect(() => {
    fetch(apiUrl('/api/padre/mis-hijos'), { headers: hdrs() })
      .then((r) => r.ok ? r.json() : [])
      .then(setHijos)
      .catch(() => {})
      .finally(() => setLoadingList(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verDetalle = async (hijo) => {
    setHijoSel(hijo);
    setResumen(null);
    setLoadingDet(true);
    try {
      const res = await fetch(apiUrl(`/api/padre/hijo/${hijo.id_usuario}/resumen`), { headers: hdrs() });
      if (res.ok) setResumen(await res.json());
    } finally {
      setLoadingDet(false);
    }
  };

  const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;
  const panel = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200';

  return (
    <section className="relative z-10 space-y-6">
      <div>
        <h2 className="mb-1 text-3xl font-extrabold tracking-tight">Portal del Apoderado</h2>
        <p className={`text-sm ${textMuted}`}>Seguimiento académico y financiero de tu hijo/a.</p>
      </div>

      {loadingList && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!loadingList && hijos.length === 0 && (
        <div className={`rounded-2xl border p-12 text-center ${panel}`}>
          <p className="text-4xl">👨‍👩‍👧</p>
          <p className={`mt-4 font-bold ${textMuted}`}>No tienes alumnos vinculados.</p>
          <p className={`mt-1 text-sm ${textMuted}`}>Contacta a la secretaría para vincular tu cuenta con tu hijo/a.</p>
        </div>
      )}

      {!loadingList && hijos.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Lista de hijos */}
          <div className="space-y-2">
            <p className={`mb-3 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>
              {hijos.length === 1 ? 'Tu hijo/a' : 'Tus hijos'}
            </p>
            {hijos.map((h) => {
              const ec = ESTADO_COLOR[h.estado_alumno] || 'slate';
              return (
                <button
                  key={h.id_usuario}
                  onClick={() => verDetalle(h)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    hijoSel?.id_usuario === h.id_usuario
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : `${panel} hover:bg-slate-800/20`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{h.nombre_completo}</p>
                      <p className={`text-[11px] ${textMuted}`}>{h.nombre_salon || 'Sin salón'} · {h.nombre_ciclo || ''}</p>
                    </div>
                    <span className={`rounded-full bg-${ec}-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-${ec}-400`}>
                      {h.estado_alumno || 'activo'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Panel de detalle */}
          <div className={`rounded-2xl border p-6 ${panel}`}>
            {!hijoSel && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-4xl">👈</p>
                <p className={`mt-4 font-bold ${textMuted}`}>Selecciona a tu hijo/a para ver su resumen</p>
              </div>
            )}

            {hijoSel && loadingDet && (
              <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            )}

            {hijoSel && !loadingDet && resumen && (() => {
              const { alumno, asistencia, examenes, pagos } = resumen;
              const totalAsist = parseInt(asistencia.total || 0);
              const presentes  = parseInt(asistencia.presentes || 0);
              const deudas     = pagos.filter((p) => p.estado === 'pendiente');
              const ultimoExam = examenes[0];

              return (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-extrabold">{alumno.nombre_completo}</h3>
                    <p className={`text-sm ${textMuted}`}>{alumno.id_usuario}</p>
                  </div>

                  {/* Alertas dinámicas */}
                  {(() => {
                    const alertasRender = [];
                    if (totalAsist > 0 && pct(presentes, totalAsist) < 75) alertasRender.push("Asistencia acumulada por debajo del 75%.");
                    if (deudas.length > 0) alertasRender.push(`Existen ${deudas.length} pagos pendientes o atrasados.`);
                    if (ultimoExam && parseFloat(ultimoExam.nota_total) < 11) alertasRender.push("Último simulacro con resultado insatisfactorio.");
                    if (alertasRender.length === 0) return null;
                    return (
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2 mb-3">
                          <span className="text-sm">🚨</span> Alertas Automáticas
                        </p>
                        <ul className="list-disc pl-5 text-sm font-bold text-rose-400/90 space-y-1">
                          {alertasRender.map((alerta, i) => <li key={i}>{alerta}</li>)}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Cards resumen */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      {
                        label: 'Asistencia',
                        valor: `${pct(presentes, totalAsist)}%`,
                        color: pct(presentes, totalAsist) >= 80 ? 'emerald' : pct(presentes, totalAsist) >= 60 ? 'amber' : 'rose',
                        sub: `${presentes} de ${totalAsist} (28 días)`,
                      },
                      {
                        label: 'Último examen',
                        valor: ultimoExam ? parseFloat(ultimoExam.nota_total).toFixed(1) : '—',
                        color: ultimoExam && parseFloat(ultimoExam.nota_total) >= 11 ? 'emerald' : 'rose',
                        sub: ultimoExam?.nombre_simulacro || 'Sin exámenes',
                      },
                      {
                        label: 'Tardanzas',
                        valor: asistencia.tardanzas || 0,
                        color: parseInt(asistencia.tardanzas || 0) === 0 ? 'emerald' : 'amber',
                        sub: 'últimos 28 días',
                      },
                      {
                        label: 'Pagos pendientes',
                        valor: deudas.length,
                        color: deudas.length > 0 ? 'rose' : 'emerald',
                        sub: deudas.length > 0
                          ? `S/ ${deudas.reduce((s, p) => s + parseFloat(p.monto), 0).toFixed(2)}`
                          : 'Al día ✓',
                      },
                    ].map(({ label, valor, color, sub }) => (
                      <div key={label} className={`rounded-2xl border border-${color}-500/20 bg-${color}-500/5 p-4`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-400`}>{label}</p>
                        <p className={`mt-2 text-3xl font-black text-${color}-400`}>{valor}</p>
                        <p className={`mt-1 text-[11px] ${textMuted}`}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Barra de asistencia */}
                  {totalAsist > 0 && (
                    <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`mb-3 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Asistencia últimas 4 semanas</p>
                      <div className="flex h-4 overflow-hidden rounded-full bg-slate-800">
                        <div className="bg-emerald-500" style={{ width: `${pct(presentes, totalAsist)}%` }} />
                        <div className="bg-amber-500"  style={{ width: `${pct(parseInt(asistencia.tardanzas || 0), totalAsist)}%` }} />
                        <div className="bg-rose-500"   style={{ width: `${pct(parseInt(asistencia.ausentes || 0), totalAsist)}%` }} />
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
                        {examenes.map((e, i) => (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{e.nombre_simulacro}</p>
                              <p className={`text-[11px] ${textMuted}`}>
                                {new Date(e.fecha_procesamiento).toLocaleDateString('es-PE')}
                              </p>
                            </div>
                            <span className={`text-xl font-black ${parseFloat(e.nota_total) >= 11 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {parseFloat(e.nota_total).toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estado de pagos */}
                  {pagos.length > 0 && (
                    <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`mb-4 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Estado de pagos</p>
                      <div className="space-y-3">
                        {pagos.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{p.concepto}</p>
                              <p className={`text-[11px] ${textMuted}`}>
                                {p.estado === 'pagado'
                                  ? `Pagado el ${new Date(p.fecha_pago).toLocaleDateString('es-PE')}`
                                  : `Vence ${p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-PE') : '—'}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-black">S/ {parseFloat(p.monto).toFixed(2)}</p>
                              <span className={`text-[9px] font-black uppercase ${p.estado === 'pagado' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.estado}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aviso SIGMA */}
                  <p className={`text-center text-[10px] ${textMuted}`}>
                    Para más información contacta directamente a la secretaría de la academia.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}

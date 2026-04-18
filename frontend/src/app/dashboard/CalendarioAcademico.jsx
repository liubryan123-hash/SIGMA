import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/api';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function badge(texto, colorClass) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${colorClass}`}>
      {texto}
    </span>
  );
}

const TIPOS_EVENTO = [
  { id: 'evento',        label: 'Evento general',  color: 'violet' },
  { id: 'feriado',       label: 'Feriado',          color: 'rose'   },
  { id: 'reunion',       label: 'Reunión',           color: 'sky'    },
  { id: 'pago_especial', label: 'Pago especial',    color: 'amber'  },
];

export default function CalendarioAcademico({ isDark, textMuted, cardBg }) {
  const hoy   = new Date();
  const user  = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('edusaas_user') || '{}') : {};
  const puedeCrear = ['director', 'secretaria', 'superadmin'].includes(user.rol);

  const [mes,  setMes]  = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [datos, setDatos] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // Crear evento
  const [crearModal,   setCrearModal]   = useState(false);
  const [crearFecha,   setCrearFecha]   = useState('');
  const [crearTitulo,  setCrearTitulo]  = useState('');
  const [crearDesc,    setCrearDesc]    = useState('');
  const [crearTipo,    setCrearTipo]    = useState('evento');
  const [guardando,    setGuardando]    = useState(false);
  const [eliminandoEv, setEliminandoEv] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setDiaSeleccionado(null);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl(`/api/director/calendario?mes=${mes}&anio=${anio}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDatos(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { Promise.resolve().then(cargar); }, [cargar]);

  const cambiarMes = (delta) => {
    let nuevoMes  = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes < 1)  { nuevoMes = 12; nuevoAnio--; }
    if (nuevoMes > 12) { nuevoMes = 1;  nuevoAnio++; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const tkn = () => ({ Authorization: `Bearer ${localStorage.getItem('edusaas_token')}` });

  const crearEvento = async () => {
    if (!crearTitulo.trim() || !crearFecha) return;
    setGuardando(true);
    try {
      const res = await fetch(apiUrl('/api/director/eventos'), {
        method: 'POST',
        headers: { ...tkn(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: crearTitulo, descripcion: crearDesc, fecha: crearFecha, tipo: crearTipo }),
      });
      if (res.ok) { setCrearModal(false); setCrearTitulo(''); setCrearDesc(''); cargar(); }
    } finally { setGuardando(false); }
  };

  const eliminarEvento = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;
    setEliminandoEv(id);
    try {
      await fetch(apiUrl(`/api/director/eventos/${id}`), { method: 'DELETE', headers: tkn() });
      cargar();
    } finally { setEliminandoEv(null); }
  };

  // Construir mapa de eventos por fecha (YYYY-MM-DD → {pagos, vencimientos, asistencias, examenes, eventos[]})
  const eventosMap = {};
  if (datos) {
    const agregar = (arr, tipo) => arr.forEach((row) => {
      const key = String(row.fecha).slice(0, 10);
      if (!eventosMap[key]) eventosMap[key] = {};
      eventosMap[key][tipo] = row;
    });
    agregar(datos.pagos,        'pagos');
    agregar(datos.vencimientos, 'vencimientos');
    agregar(datos.asistencias,  'asistencias');
    agregar(datos.examenes,     'examenes');
    // Eventos internos: múltiples por día
    (datos.eventos || []).forEach((ev) => {
      const key = String(ev.fecha).slice(0, 10);
      if (!eventosMap[key]) eventosMap[key] = {};
      if (!eventosMap[key].eventos) eventosMap[key].eventos = [];
      eventosMap[key].eventos.push(ev);
    });
  }

  // Construir grilla del mes
  const primerDia = new Date(anio, mes - 1, 1);
  const diasEnMes = new Date(anio, mes, 0).getDate();
  // Lunes = 0 en nuestra grilla
  let offsetInicio = primerDia.getDay() - 1;
  if (offsetInicio < 0) offsetInicio = 6; // domingo → posición 6

  const celdas = [];
  for (let i = 0; i < offsetInicio; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
  // Completar hasta múltiplo de 7
  while (celdas.length % 7 !== 0) celdas.push(null);

  const panelClass = isDark
    ? 'bg-slate-900/70 border-slate-800'
    : 'bg-white border-slate-200';

  const todayKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  const detalle = diaSeleccionado ? eventosMap[diaSeleccionado] : null;

  return (
    <section className="relative z-10 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-3xl font-extrabold tracking-tight">Calendario Académico</h2>
          <p className={`text-sm ${textMuted}`}>
            Vista mensual de pagos, asistencias, exámenes y eventos internos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {puedeCrear && (
            <button
              onClick={() => { setCrearFecha(diaSeleccionado || ''); setCrearModal(true); }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs transition-all"
            >
              + Crear evento
            </button>
          )}
          <button onClick={() => cambiarMes(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 font-bold text-slate-300 hover:bg-slate-800">
            ‹
          </button>
          <span className="min-w-[140px] text-center font-extrabold">
            {MESES[mes - 1]} {anio}
          </span>
          <button onClick={() => cambiarMes(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 font-bold text-slate-300 hover:bg-slate-800">
            ›
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">{badge('●','text-emerald-400')}<span className={`text-[11px] ${textMuted}`}>Pagos recibidos</span></div>
        <div className="flex items-center gap-1.5">{badge('●','text-rose-400')}<span className={`text-[11px] ${textMuted}`}>Vencimientos</span></div>
        <div className="flex items-center gap-1.5">{badge('●','text-blue-400')}<span className={`text-[11px] ${textMuted}`}>Asistencia</span></div>
        <div className="flex items-center gap-1.5">{badge('●','text-amber-400')}<span className={`text-[11px] ${textMuted}`}>Exámenes</span></div>
        <div className="flex items-center gap-1.5">{badge('●','text-violet-400')}<span className={`text-[11px] ${textMuted}`}>Eventos internos</span></div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Grilla del calendario */}
          <div className={`overflow-hidden rounded-2xl border ${panelClass}`}>
            {/* Días de la semana */}
            <div className="grid grid-cols-7 border-b border-slate-800">
              {DIAS.map((d) => (
                <div key={d} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest ${textMuted}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Celdas */}
            <div className="grid grid-cols-7">
              {celdas.map((dia, idx) => {
                if (!dia) {
                  return <div key={`v-${idx}`} className="h-20 border-b border-r border-slate-800/40" />;
                }
                const key = `${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
                const ev  = eventosMap[key] || {};
                const esHoy = key === todayKey;
                const seleccionado = diaSeleccionado === key;

                return (
                  <button
                    key={key}
                    onClick={() => setDiaSeleccionado(seleccionado ? null : key)}
                    className={`h-20 border-b border-r border-slate-800/40 p-2 text-left transition-all hover:bg-slate-800/30 ${seleccionado ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/40' : ''}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${esHoy ? 'bg-blue-500 text-white' : ''}`}>
                      {dia}
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {ev.pagos        && <span className="h-2 w-2 rounded-full bg-emerald-400" title={`${ev.pagos.cantidad} pagos`} />}
                      {ev.vencimientos && <span className="h-2 w-2 rounded-full bg-rose-400"    title={`${ev.vencimientos.cantidad} vencen`} />}
                      {ev.asistencias  && <span className="h-2 w-2 rounded-full bg-blue-400"   title={`${ev.asistencias.total} asistencias`} />}
                      {ev.examenes     && <span className="h-2 w-2 rounded-full bg-amber-400"  title={`${ev.examenes.cantidad} exámenes`} />}
                      {ev.eventos?.length > 0 && <span className="h-2 w-2 rounded-full bg-violet-400" title={`${ev.eventos.length} evento(s)`} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel de detalle del día */}
          <div className={`rounded-2xl border p-5 ${panelClass}`}>
            {!diaSeleccionado ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-3xl">📅</p>
                <p className={`mt-3 text-sm font-bold ${textMuted}`}>Toca un día para ver el detalle</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Detalle del día</p>
                  <p className="text-xl font-extrabold">
                    {parseInt(diaSeleccionado.slice(8))} de {MESES[mes - 1]}
                  </p>
                </div>

                {!detalle && (
                  <p className={`text-sm ${textMuted}`}>Sin eventos registrados este día.</p>
                )}

                {detalle?.pagos && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pagos recibidos</p>
                    <p className="mt-1 text-2xl font-black text-emerald-400">{detalle.pagos.cantidad}</p>
                    <p className="text-sm font-bold text-emerald-300">
                      S/ {parseFloat(detalle.pagos.monto_total || 0).toFixed(2)}
                    </p>
                  </div>
                )}

                {detalle?.vencimientos && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Cuotas que vencen</p>
                    <p className="mt-1 text-2xl font-black text-rose-400">{detalle.vencimientos.cantidad}</p>
                    <p className={`text-xs ${textMuted}`}>alumnos con pago pendiente</p>
                  </div>
                )}

                {detalle?.asistencias && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Asistencia</p>
                    <p className="mt-1 text-2xl font-black text-blue-400">{detalle.asistencias.presentes}</p>
                    <p className={`text-xs ${textMuted}`}>de {detalle.asistencias.total} registros</p>
                  </div>
                )}

                {detalle?.examenes && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Exámenes procesados</p>
                    <p className="mt-1 text-2xl font-black text-amber-400">{detalle.examenes.cantidad}</p>
                    <p className={`text-xs ${textMuted}`}>resultados confirmados</p>
                  </div>
                )}

                {detalle?.eventos?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Eventos internos</p>
                    {detalle.eventos.map((ev) => (
                      <div key={ev.id_evento} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-violet-300">{ev.titulo}</p>
                          {ev.descripcion && <p className={`text-xs ${textMuted} mt-0.5`}>{ev.descripcion}</p>}
                          <span className={`text-[9px] font-black uppercase tracking-wider ${textMuted}`}>{ev.tipo}</span>
                        </div>
                        {puedeCrear && (
                          <button
                            onClick={() => eliminarEvento(ev.id_evento)}
                            disabled={eliminandoEv === ev.id_evento}
                            className="text-xs text-rose-400 hover:text-rose-300 font-bold shrink-0 disabled:opacity-50"
                          >
                            {eliminandoEv === ev.id_evento ? '...' : '✕'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {puedeCrear && (
                  <button
                    onClick={() => { setCrearFecha(diaSeleccionado); setCrearModal(true); }}
                    className="w-full py-2.5 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 font-bold text-xs transition-all"
                  >
                    + Agregar evento a este día
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumen del mes */}
      {!loading && datos && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Pagos del mes', valor: datos.pagos.reduce((s, r) => s + parseInt(r.cantidad), 0), color: 'emerald', sub: `S/ ${datos.pagos.reduce((s, r) => s + parseFloat(r.monto_total || 0), 0).toFixed(2)}` },
            { label: 'Vencimientos', valor: datos.vencimientos.reduce((s, r) => s + parseInt(r.cantidad), 0), color: 'rose', sub: 'pendientes' },
            { label: 'Registros asistencia', valor: datos.asistencias.reduce((s, r) => s + parseInt(r.total), 0), color: 'blue', sub: 'en el mes' },
            { label: 'Exámenes procesados', valor: datos.examenes.reduce((s, r) => s + parseInt(r.cantidad), 0), color: 'amber', sub: 'confirmados' },
          ].map(({ label, valor, color, sub }) => (
            <div key={label} className={`rounded-2xl border p-5 ${panelClass}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{label}</p>
              <p className={`mt-2 text-4xl font-black text-${color}-400`}>{valor}</p>
              <p className={`mt-1 text-xs ${textMuted}`}>{sub}</p>
            </div>
          ))}
        </div>
      )}
      {/* Modal: Crear evento interno */}
      {crearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="font-extrabold text-lg">Nuevo Evento Interno</h3>
              <button onClick={() => setCrearModal(false)} className="w-8 h-8 rounded-full hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Título *</label>
                <input value={crearTitulo} onChange={e => setCrearTitulo(e.target.value)}
                  placeholder="Ej: Reunión de padres, Feriado patrio..."
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Fecha *</label>
                <input type="date" value={crearFecha} onChange={e => setCrearFecha(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_EVENTO.map(t => (
                    <button key={t.id} onClick={() => setCrearTipo(t.id)}
                      className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${crearTipo === t.id ? 'bg-violet-500 text-white border-violet-600' : `border-slate-700 ${textMuted} hover:bg-slate-800`}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Descripción (opcional)</label>
                <textarea value={crearDesc} onChange={e => setCrearDesc(e.target.value)} rows={2}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <button onClick={crearEvento} disabled={guardando || !crearTitulo.trim() || !crearFecha}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-all disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Crear Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

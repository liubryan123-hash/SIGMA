import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

export default function ControlAsistencia({ isDark, textMuted, getHeaders, salones }) {
  const [idSalon, setIdSalon] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({}); // { id_usuario: 'presente' | 'ausente' | 'tardanza' }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para el Historial
  const [viewMode, setViewMode] = useState('diaria'); // 'diaria' | 'historial'
  const [fechaHistorial, setFechaHistorial] = useState(new Date().toISOString().split('T')[0]);
  const [historialData, setHistorialData] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const syncView = async () => {
      if (!idSalon) {
        Promise.resolve().then(() => {
          if (cancelled) return;
          setAlumnos([]);
          setHistorialData([]);
        });
        return;
      }

      setLoading(true);
      try {
        if (viewMode === 'diaria') {
          const resp = await fetch(apiUrl(`/api/alumnos?id_salon=${idSalon}`), {
            headers: getHeaders()
          });
          const data = await resp.json();
          if (!cancelled && Array.isArray(data)) {
            setAlumnos(data);
            const initial = {};
            data.forEach(a => {
              initial[a.id_usuario] = 'presente';
            });
            setAsistencias(initial);
            setHistorialData([]);
          }
          return;
        }

        if (!fechaHistorial) return;

        const resp = await fetch(apiUrl(`/api/academic/asistencias/salon/${idSalon}/fecha/${fechaHistorial}`), {
          headers: getHeaders()
        });
        const data = await resp.json();
        if (!cancelled) {
          setHistorialData(Array.isArray(data) ? data : []);
          setAlumnos([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void syncView();

    return () => {
      cancelled = true;
    };
  }, [idSalon, viewMode, fechaHistorial, getHeaders]);

  const setEstado = (id, estado) => {
    setAsistencias(prev => ({ ...prev, [id]: estado }));
  };

  const guardarAsistencia = async () => {
    if (!idSalon) return alert('Selecciona un salón primero.');
    setSaving(true);
    let exitos = 0;
    try {
      for (const id_usuario of Object.keys(asistencias)) {
        const res = await fetch(apiUrl('/api/academic/asistencias'), {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            id_usuario,
            id_salon: parseInt(idSalon),
            estado: asistencias[id_usuario]
          })
        });
        if (res.ok) exitos++;
      }
      alert(`✅ Asistencia guardada: ${exitos} alumnos registrados hoy.`);
      setViewMode('historial'); // Cambiar al historial para ver el resultado
    } catch (e) {
      alert('Error guardando la asistencia.');
    }
    setSaving(false);
  };

  const cardStyle = isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xl';
  const inputStyle = isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400';

  return (
    <section className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">📅 Registro de Asistencias</h2>
          <p className={`text-sm ${textMuted}`}>Supervisa la puntualidad y permanencia de tus grupos de estudio.</p>
        </div>
        <div className={`p-1.5 rounded-2xl flex border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <button 
            onClick={() => setViewMode('diaria')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'diaria' ? 'bg-blue-600 text-white shadow-lg' : `${textMuted} hover:bg-slate-800/40`}`}
          >
            Tomar Lista Hoy
          </button>
          <button 
            onClick={() => setViewMode('historial')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'historial' ? 'bg-blue-600 text-white shadow-lg' : `${textMuted} hover:bg-slate-800/40`}`}
          >
            Consultar Historial
          </button>
        </div>
      </div>

      <div className={`p-8 rounded-[2.5rem] border ${cardStyle}`}>
        <div className="flex flex-wrap items-end gap-6 mb-8">
          <div className="flex-1 min-w-[250px]">
            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Seleccionar Salón / Aula</label>
            <select 
              value={idSalon} 
              onChange={e => setIdSalon(e.target.value)}
              className={`w-full text-sm font-bold px-6 py-4 rounded-2xl outline-none border transition-all ${inputStyle}`}
            >
              <option value="">-- Selecciona el Aula --</option>
              {salones.map(s => (
                <option key={s.id_salon} value={s.id_salon}>{s.nombre_ciclo} — {s.nombre_salon}</option>
              ))}
            </select>
          </div>

          {viewMode === 'historial' && (
            <div className="w-[200px]">
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${textMuted}`}>Calendario de Fecha</label>
              <input 
                type="date" 
                value={fechaHistorial}
                onChange={e => setFechaHistorial(e.target.value)}
                className={`w-full text-sm font-bold px-6 py-4 rounded-2xl outline-none border transition-all ${inputStyle}`}
              />
            </div>
          )}

          {viewMode === 'diaria' && alumnos.length > 0 && (
            <button 
              onClick={guardarAsistencia}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-10 py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : '💾 Confirmar y Sellar Lista'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-500/20 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
          </div>
        ) : viewMode === 'diaria' ? (
          alumnos.length > 0 ? (
            <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <table className="w-full text-sm text-center">
                <thead className={`${isDark ? 'bg-slate-950/50' : 'bg-slate-50'} border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <tr>
                    <th className={`py-5 px-8 text-left text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Información del Estudiante</th>
                    <th className={`py-5 px-8 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Marcar Estado Actual (Presionar uno)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/10">
                  {alumnos.map(al => (
                    <tr key={al.id_usuario} className={`transition-all ${isDark ? 'hover:bg-slate-800/20' : 'hover:bg-indigo-50/30'}`}>
                      <td className="py-5 px-8 text-left">
                        <p className="font-extrabold text-[13px] tracking-tight">{al.nombre_completo}</p>
                        <p className={`text-[10px] font-mono tracking-tighter ${textMuted}`}>{al.id_usuario}</p>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex justify-center gap-3">
                          {[
                            { val: 'presente', lab: 'Presente', col: 'emerald', icon: '✅' },
                            { val: 'ausente', lab: 'Falta', col: 'rose', icon: '❌' },
                            { val: 'tardanza', lab: 'Tardanza', col: 'amber', icon: '⏳' },
                          ].map(opt => (
                            <button
                              key={opt.val}
                              onClick={() => setEstado(al.id_usuario, opt.val)}
                              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border shadow-sm ${
                                asistencias[al.id_usuario] === opt.val
                                  ? `bg-${opt.col}-500/10 border-${opt.col}-500/30 text-${opt.col}-400 shadow-${opt.col}-500/10`
                                  : `bg-transparent border-transparent ${textMuted} hover:bg-slate-800/30`
                              }`}
                            >
                              <span className="text-base">{opt.icon}</span> {opt.lab}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : idSalon && (
            <div className="text-center py-20 opacity-40">
              <p className="text-6xl mb-4">🏫</p>
              <p className="text-sm font-bold">No hay alumnos para mostrar.</p>
            </div>
          )
        ) : (
          /* VISTA HISTORIAL */
          historialData.length > 0 ? (
            <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
               <table className="w-full text-sm text-center">
                <thead className={`${isDark ? 'bg-slate-950/50' : 'bg-slate-50'} border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <tr>
                    <th className={`py-5 px-8 text-left text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Estudiante</th>
                    <th className={`py-5 px-8 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Estado Registrado</th>
                    <th className={`py-5 px-8 text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Fecha de Captura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/10">
                  {historialData.map(h => {
                    const status = h.estado || 'sin registro';
                    const color = status === 'presente' ? 'emerald' : status === 'ausente' ? 'rose' : 'amber';
                    return (
                      <tr key={h.id_asistencia} className={isDark ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50'}>
                        <td className="py-5 px-8 text-left font-bold">{h.nombre_completo}</td>
                        <td className="py-5 px-8">
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${color}-500/10 border-${color}-400/30 text-${color}-400`}>
                              {status.toUpperCase()}
                           </span>
                        </td>
                        <td className={`py-5 px-8 text-[10px] font-mono ${textMuted}`}>
                           {new Date(h.fecha).toLocaleDateString()} {h.fecha_validacion ? '· Validado' : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
               </table>
            </div>
          ) : idSalon && (
            <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-[3rem]">
               <p className="text-5xl mb-4 grayscale">📅</p>
               <h4 className="text-lg font-black tracking-tight mb-2">Sin registros para esta fecha</h4>
               <p className={`text-sm ${textMuted}`}>No se encontró ninguna lista de asistencia guardada para el salón seleccionado en este día.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}

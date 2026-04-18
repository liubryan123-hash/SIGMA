import { useState, useEffect, useRef } from 'react';
import { apiUrl } from '@/lib/api';

export default function FastInputConsole({ selectedPlantilla, isDark, onResultSaved }) {
  const [dni, setDni] = useState('');
  const [respuestas, setRespuestas] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const dniRef = useRef(null);
  const respRef = useRef(null);

  useEffect(() => {
    if (!selectedPlantilla || !respuestas) {
      setStats(null);
      return;
    }

    const config = selectedPlantilla.configuracion_cursos || {};
    const claves = selectedPlantilla.claves_correctas || {};
    const respLimpias = respuestas.toUpperCase().replace(/[^A-E ]/g, '').split('');

    let aciertos = 0;
    let errores = 0;
    let blancos = 0;
    let total = 0;
    const desglose = [];

    if (config.areas && Array.isArray(config.areas)) {
      config.areas.forEach((area) => {
        let aArea = 0;
        let eArea = 0;
        let bArea = 0;
        let pArea = 0;
        for (let q = parseInt(area.inicio, 10); q <= parseInt(area.fin, 10); q++) {
          const rEst = respLimpias[q - 1] || '';
          const rOfi = claves[q.toString()];
          if (!rOfi) continue;
          if (!rEst || rEst === ' ') bArea++;
          else if (rEst === rOfi) aArea++;
          else eArea++;
        }
        const ptsC = parseFloat(area.correcta);
        const ptsI = parseFloat(area.incorrecta);
        const ptsB = parseFloat(area.blanco) || 0;
        pArea = aArea * ptsC + eArea * ptsI + bArea * ptsB;
        total += pArea;
        desglose.push({ nombre: area.nombre, nota: pArea.toFixed(2), a: aArea, e: eArea });
      });
    } else {
      const pC = selectedPlantilla.tipo_calificacion === 'uni' ? 5 : 20;
      const pI = selectedPlantilla.tipo_calificacion === 'uni' ? -1 : -1.125;
      respLimpias.forEach((r, i) => {
        const q = (i + 1).toString();
        const ofi = claves[q];
        if (!ofi) return;
        if (!r || r === ' ') blancos++;
        else if (r === ofi) aciertos++;
        else errores++;
      });
      total = aciertos * pC + errores * pI;
    }

    setStats({ total: total.toFixed(3), aciertos, errores, blancos, desglose });
  }, [respuestas, selectedPlantilla]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!dni || !respuestas || loading) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl('/api/exams/confirmar-resultados'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          codigo_postulante: dni,
          nota_total: parseFloat(stats.total),
          respuestas_alumno: respuestas.split('').reduce((acc, r, i) => ({ ...acc, [i + 1]: r }), {}),
          puntaje_por_cursos: stats.desglose || [],
          observaciones: ['Digitacion manual via Fast-Input Console'],
        }),
      });

      if (res.ok) {
        setDni('');
        setRespuestas('');
        setStats(null);
        dniRef.current?.focus();
        if (onResultSaved) onResultSaved();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch {
      alert('Error de conexion con el motor SQL.');
    }
    setLoading(false);
  };

  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`rounded-3xl border p-8 transition-all ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">1</div>
            <h3 className="font-black uppercase tracking-widest text-xs">Digitacion en Tiempo Real</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`text-[9px] font-black uppercase mb-1.5 block ${textMuted}`}>DNI / Codigo del Alumno</label>
              <input ref={dniRef} value={dni} onChange={(e) => setDni(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && respRef.current?.focus()} className={`w-full p-4 rounded-xl border-2 font-black text-xl outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-400'}`} placeholder="77651234" />
            </div>
            <div>
              <label className={`text-[9px] font-black uppercase mb-1.5 block ${textMuted}`}>Cadena de Respuestas (ABCD...)</label>
              <textarea ref={respRef} value={respuestas} onChange={(e) => setRespuestas(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className={`w-full h-32 p-4 rounded-xl border-2 font-mono text-lg uppercase tracking-[0.3em] outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-emerald-400 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-400'}`} placeholder="ABCDE..." />
            </div>
            <button onClick={handleSave} disabled={loading || !dni || !respuestas} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95 disabled:opacity-50">
              {loading ? 'Procesando SQL...' : 'Confirmar y Siguiente'}
            </button>
          </div>
        </div>

        <div className={`w-full md:w-80 rounded-2xl p-6 border flex flex-col justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-inner'}`}>
          <div>
            <h4 className={`text-[10px] font-black uppercase mb-4 border-b pb-2 ${textMuted}`}>Monitor de Calculo</h4>
            {stats ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className={`text-[9px] font-black uppercase ${textMuted}`}>Nota Proyectada</p>
                  <p className={`text-4xl font-black ${parseFloat(stats.total) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.total}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[9px] text-emerald-500 font-bold">OK</p>
                    <p className="text-sm font-black text-emerald-400">{stats.aciertos}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[9px] text-rose-500 font-bold">X</p>
                    <p className="text-sm font-black text-rose-400">{stats.errores}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
                    <p className="text-[9px] text-slate-500 font-bold">_</p>
                    <p className="text-sm font-black text-slate-400">{stats.blancos}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  {stats.desglose.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                      <span className={textMuted}>{d.nombre}:</span>
                      <span className="font-bold text-blue-400">+{d.nota}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center italic text-xs text-slate-600">Esperando digitacion...</div>
            )}
          </div>
          <p className="text-[9px] leading-relaxed text-slate-500 text-center mt-4">El motor aplica automaticamente las reglas de la matriz seleccionada.</p>
        </div>
      </div>
    </div>
  );
}

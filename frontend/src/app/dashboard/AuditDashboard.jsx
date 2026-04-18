import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

export default function AuditDashboard({ isDark, textMuted }) {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setCargando(true);
    try {
      const resp = await fetch(apiUrl('/api/audit'), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('edusaas_token')}` }
      });
      const data = await resp.json();
      setLogs(data);
    } catch (err) { console.error(err); }
    finally { setCargando(false); }
  };

  const getLogIcon = (accion) => {
    if (accion.includes('BLOQUEO')) return '🚫';
    if (accion.includes('ELIMINACION')) return '🗑️';
    if (accion.includes('CAMBIO_NOTA')) return '✍️';
    if (accion.includes('PAGO')) return '💰';
    return '📝';
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tighter">Auditoría de Acciones Críticas</h2>
        <p className={`${textMuted} text-sm`}>Monitoreo en tiempo real de movimientos sensibles en todas las academias.</p>
      </div>

      <div className={`rounded-[2.5rem] overflow-hidden border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-50">Fecha / Hora</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-50">Usuario</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-50">Acción</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-50">Academia</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-50">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/20">
            {logs.map((l) => (
              <tr key={l.id_log} className="hover:bg-blue-500/5 transition-all group">
                <td className="p-5">
                  <p className="text-xs font-bold">{new Date(l.fecha_creacion).toLocaleDateString()}</p>
                  <p className={`text-[9px] ${textMuted}`}>{new Date(l.fecha_creacion).toLocaleTimeString()}</p>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-black">
                      {l.nombre_completo?.charAt(0)}
                    </div>
                    <span className="text-xs font-bold">{l.nombre_completo}</span>
                  </div>
                </td>
                <td className="p-5">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${l.accion.includes('ELIMINAC') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    {getLogIcon(l.accion)} {l.accion}
                  </span>
                </td>
                <td className="p-5">
                  <span className="text-xs font-medium text-slate-400">{l.academia_nombre || 'SISTEMA CENTRAL'}</span>
                </td>
                <td className="p-5">
                  <p className="text-xs font-medium max-w-xs truncate" title={l.detalles}>{l.detalles}</p>
                  <p className="text-[9px] text-slate-600 italic">IP: {l.ip_address}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {logs.length === 0 && !cargando && (
          <div className="p-20 text-center">
            <p className={`${textMuted} font-medium`}>No se han registrado acciones críticas recientemente.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

export default function PlantillasManager({ isDark }) {
  const [plantillas, setPlantillas] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('unmsm');
  const [estado, setEstado] = useState('cerrado');
  const [fechaApe, setFechaApe] = useState('');
  const [fechaCie, setFechaCie] = useState('');
  const [clavesRaw, setClavesRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [cloningCodigo, setCloningCodigo] = useState(null);
  const [eliminandoCodigo, setEliminandoCodigo] = useState(null);
  const [editandoCodigo, setEditandoCodigo]     = useState(null); // codigo en edición
  const [filtroEstado, setFiltroEstado]         = useState('todos'); // todos | abierto | cerrado | programado
  const [areas, setAreas] = useState([
    { nombre: 'Matematica', inicio: 1, fin: 20, correcta: 20, incorrecta: -1.125, blanco: 0 },
  ]);

  const addArea = () => {
    const lastArea = areas[areas.length - 1];
    const newInicio = lastArea ? parseInt(lastArea.fin, 10) + 1 : 1;
    setAreas([
      ...areas,
      { nombre: '', inicio: newInicio, fin: newInicio + 9, correcta: 20, incorrecta: -1.125, blanco: 0 },
    ]);
  };

  const removeArea = (index) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const updateArea = (index, field, value) => {
    const newAreas = [...areas];
    newAreas[index][field] = value;
    setAreas(newAreas);
  };

  const cargarParaEditar = (p) => {
    setEditandoCodigo(p.codigo_examen);
    setCodigo(p.codigo_examen);
    setNombre(p.nombre_simulacro || '');
    setTipo(p.tipo_calificacion || 'unmsm');
    setEstado(p.estado || 'cerrado');
    setFechaApe(p.fecha_apertura ? p.fecha_apertura.slice(0, 16) : '');
    setFechaCie(p.fecha_cierre  ? p.fecha_cierre.slice(0, 16)  : '');
    // Reconstruir clavesRaw desde el objeto { "1": "A", "2": "B", ... }
    const claves = p.claves_correctas || {};
    const maxQ   = Math.max(0, ...Object.keys(claves).map(Number));
    const raw    = Array.from({ length: maxQ }, (_, i) => claves[String(i + 1)] || '').join('');
    setClavesRaw(raw);
    if (p.tipo_calificacion === 'personalizado' && p.configuracion_cursos?.areas?.length) {
      setAreas(p.configuracion_cursos.areas);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoCodigo(null);
    setCodigo(''); setNombre(''); setClavesRaw('');
    setTipo('unmsm'); setEstado('cerrado');
    setFechaApe(''); setFechaCie('');
    setAreas([{ nombre: 'Matematica', inicio: 1, fin: 20, correcta: 20, incorrecta: -1.125, blanco: 0 }]);
  };

  const eliminarPlantilla = async (codigoElim) => {
    if (!confirm(`¿Eliminar la plantilla "${codigoElim}"? Esta acción no se puede deshacer.`)) return;
    setEliminandoCodigo(codigoElim);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res   = await fetch(apiUrl(`/api/exams/plantillas/${codigoElim}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) { loadPlantillas(); }
      else { alert('Error: ' + data.error); }
    } catch { alert('El servidor no responde.'); }
    setEliminandoCodigo(null);
  };

  const toggleEstado = async (p) => {
    const nuevoEstado = p.estado === 'abierto' ? 'cerrado' : 'abierto';
    try {
      const token = localStorage.getItem('edusaas_token');
      const res   = await fetch(apiUrl(`/api/exams/plantillas/${p.codigo_examen}/estado`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) { loadPlantillas(); }
      else { const d = await res.json(); alert('Error: ' + d.error); }
    } catch { alert('El servidor no responde.'); }
  };

  const clonarPlantilla = async (codigo) => {
    if (!confirm(`Clonar "${codigo}" como nueva plantilla?`)) return;
    setCloningCodigo(codigo);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl(`/api/exams/plantillas/${codigo}/clonar`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Clonada como: ${data.plantilla.codigo_examen}`);
        loadPlantillas();
      } else {
        alert('Error: ' + data.error);
      }
    } catch {
      alert('El servidor no responde.');
    }
    setCloningCodigo(null);
  };

  async function loadPlantillas() {
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl('/api/exams/plantillas'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setPlantillas(data);
    } catch (e) {
      console.log('Error silenciado al cargar plantillas');
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadPlantillas);
  }, []);

  const savePlantilla = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('edusaas_token');
      const clavesCorregidas = clavesRaw
        .toUpperCase()
        .replace(/[^A-E ]/g, '')
        .split('')
        .filter((c) => c !== ' ');

      const payloadClaves = {};
      clavesCorregidas.forEach((char, i) => {
        payloadClaves[(i + 1).toString()] = char;
      });

      let configuracionFinal = {};
      if (tipo === 'personalizado') {
        configuracionFinal = { areas };
      }

      const res = await fetch(apiUrl('/api/exams/plantilla'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo_examen: codigo,
          nombre_simulacro: nombre,
          tipo_calificacion: tipo,
          estado,
          claves_correctas: payloadClaves,
          configuracion_cursos: configuracionFinal,
          fecha_apertura: fechaApe || null,
          fecha_cierre: fechaCie || null,
        }),
      });

      if (res.ok) {
        alert(editandoCodigo ? 'Plantilla actualizada.' : 'Examen maestro guardado y parametrizado.');
        loadPlantillas();
        cancelarEdicion();
      } else {
        const d = await res.json();
        alert('Error: ' + d.error);
      }
    } catch (e) {
      alert('El servidor backend no responde.');
    }
    setLoading(false);
  };

  return (
    <section
      className={`backdrop-blur border rounded-[2rem] p-10 relative z-10 transition-colors mb-12 flex-1 flex flex-col ${
        isDark ? 'bg-slate-900/60 border-slate-800 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'
      }`}
    >
      <h2 className="text-3xl font-extrabold tracking-tight mb-2">Tablero de Auditoria y Claves</h2>
      <p className="text-slate-500 mb-4">
        Define las reglas de calificacion y las respuestas oficiales que el sistema usara para corregir examenes.
      </p>

      {/* Banner modo edición */}
      {editandoCodigo && (
        <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-amber-900/30 border border-amber-600/40">
          <p className="text-sm font-bold text-amber-300">
            ✏️ Editando: <span className="font-mono text-white">{editandoCodigo}</span>
          </p>
          <button
            onClick={cancelarEdicion}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancelar edición
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 pb-10 border-b border-dashed border-slate-700/50">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
              Paso 1: Identificador del Simulacro
            </label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 focus:border-blue-500 rounded-xl p-4 text-sm text-blue-400 font-mono outline-none transition-all shadow-inner"
              placeholder="EJ: FASE-3-UNMSM-24"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
              Paso 2: Titulo Publico del Simulacro
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 focus:border-blue-500 rounded-xl p-4 text-sm text-slate-200 outline-none transition-all shadow-inner"
              placeholder="EJ: Gran Concurso de Becas 2026"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">
                Paso 3: Matriz Computacional
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-blue-500 rounded-xl p-4 text-sm font-bold text-slate-300 outline-none"
              >
                <option value="unmsm">UNMSM (Puntos Fijos)</option>
                <option value="uni">UNI (Puntos Fijos)</option>
                <option value="personalizado">Matriz por Cursos (Personalizable)</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">
                Paso 4: Semaforo de Subida
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-blue-500 rounded-xl p-4 text-sm font-bold text-slate-300 outline-none"
              >
                <option value="cerrado">SISTEMA CERRADO (Manual)</option>
                <option value="abierto">SISTEMA ABIERTO (Manual)</option>
                <option value="programado">PROGRAMADO (Auto-Timer)</option>
              </select>
            </div>
          </div>

          {estado === 'programado' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
              <div>
                <label className="text-[9px] font-black text-blue-400 uppercase block mb-1.5">
                  Apertura
                </label>
                <input
                  type="datetime-local"
                  value={fechaApe}
                  onChange={(e) => setFechaApe(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-rose-400 uppercase block mb-1.5">
                  Cierre
                </label>
                <input
                  type="datetime-local"
                  value={fechaCie}
                  onChange={(e) => setFechaCie(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          {tipo === 'personalizado' && (
            <div className="bg-violet-950/20 border-2 border-violet-500/30 rounded-2xl p-6 space-y-4 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-violet-400 uppercase tracking-widest">
                  Matriz de Pesos y Areas
                </h4>
                <button
                  onClick={addArea}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase tracking-widest"
                >
                  + Anadir Area
                </button>
              </div>

              <div className="space-y-3">
                {areas.map((area, idx) => (
                  <div
                    key={idx}
                    className={`grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-xl border ${
                      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">
                        Nombre del Curso
                      </label>
                      <input
                        value={area.nombre}
                        onChange={(e) => updateArea(idx, 'nombre', e.target.value)}
                        placeholder="Ej: Aritmetica"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">
                        Rango
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={area.inicio}
                          onChange={(e) => updateArea(idx, 'inicio', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-center text-blue-400 outline-none"
                        />
                        <span className="text-slate-600">-</span>
                        <input
                          type="number"
                          value={area.fin}
                          onChange={(e) => updateArea(idx, 'fin', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-center text-blue-400 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 text-center">
                        <label className="text-[9px] font-black text-emerald-500 uppercase block mb-1">
                          +
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={area.correcta}
                          onChange={(e) => updateArea(idx, 'correcta', e.target.value)}
                          className="w-full bg-slate-900 border border-emerald-900/50 rounded-lg p-2.5 text-xs text-center text-emerald-400 outline-none"
                        />
                      </div>
                      <div className="flex-1 text-center">
                        <label className="text-[9px] font-black text-rose-500 uppercase block mb-1">
                          -
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={area.incorrecta}
                          onChange={(e) => updateArea(idx, 'incorrecta', e.target.value)}
                          className="w-full bg-slate-900 border border-rose-900/50 rounded-lg p-2.5 text-xs text-center text-rose-400 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-end justify-center">
                      <button
                        onClick={() => removeArea(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Eliminar Area"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                Tip: define los rangos exactos de preguntas. El motor de IA y Fast-Input sumaran o restaran puntos
                segun estas reglas por curso. Puedes usar decimales.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col h-full">
          <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2 flex items-center justify-between">
            <span>Paso 5: Secuencia de Respuestas</span>
            <span className="text-slate-500 lowercase bg-slate-900 border border-slate-800 px-3 py-1 rounded shadow-inner">
              {clavesRaw.replace(/[^a-zA-Z]/g, '').length} respuestas
            </span>
          </label>
          <textarea
            value={clavesRaw}
            onChange={(e) => setClavesRaw(e.target.value)}
            className="w-full flex-1 min-h-[160px] bg-slate-950 border-2 border-emerald-900/50 rounded-xl p-5 text-emerald-400 font-mono text-lg uppercase tracking-[0.2em] shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed transition-all"
            placeholder={"Ingresa las respuestas de corrido o separadas...\n\nEJ: ABCDDA EBCAA BADE..."}
          />
          <button
            onClick={savePlantilla}
            disabled={loading || !codigo || clavesRaw.length < 5}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-4 rounded-xl mt-4 uppercase text-[11px] tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:scale-100 transform hover:scale-[1.02] active:scale-95"
          >
            {loading ? 'GUARDANDO EN SQL...' : 'GUARDAR FORMULA Y CLAVES'}
          </button>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
            Archivo de Plantillas
          </h3>
          {/* Filtros por estado */}
          <div className="flex gap-1">
            {[['todos','Todas'], ['abierto','Abiertas'], ['cerrado','Cerradas'], ['programado','Programadas']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltroEstado(val)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                  filtroEstado === val
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'text-slate-500 border-slate-800 hover:bg-slate-800/50'
                }`}
              >{label}</button>
            ))}
          </div>
        </div>

        {plantillas.length === 0 ? (
          <p className="text-xs font-bold text-slate-600 italic">
            No hay plantillas cargadas aun. Guarda la primera para activar el flujo de correccion.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {plantillas
              .filter(p => filtroEstado === 'todos' || p.estado === filtroEstado)
              .map((p) => (
              <div
                key={p.codigo_examen}
                className="bg-slate-950 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-colors shadow-lg"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 ${p.estado === 'abierto' ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-full blur-2xl`} />
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <span className="text-xs font-mono text-blue-400 font-bold px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded shadow-inner">
                    {p.codigo_examen}
                  </span>
                  {/* Toggle abierto/cerrado */}
                  <button
                    onClick={() => toggleEstado(p)}
                    disabled={p.estado === 'programado'}
                    title={p.estado === 'programado' ? 'Programado — edita para cambiar' : `Cambiar a ${p.estado === 'abierto' ? 'cerrado' : 'abierto'}`}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-sm shadow-sm transition-opacity hover:opacity-80 disabled:cursor-default ${
                      p.estado === 'abierto'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white'
                        : p.estado === 'programado'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white'
                        : 'bg-gradient-to-r from-rose-500 to-rose-400 text-white'
                    }`}
                  >
                    {p.estado}
                  </button>
                </div>
                <p className="font-extrabold text-sm mb-2 text-slate-200 line-clamp-1 relative z-10">
                  {p.nombre_simulacro}
                </p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5 relative z-10 mb-3">
                  <span className={p.tipo_calificacion === 'personalizado' ? 'text-violet-400' : 'text-purple-400'}>
                    {p.tipo_calificacion === 'personalizado' ? 'Personalizado' : 'Motor'}: {p.tipo_calificacion}
                    {p.tipo_calificacion === 'personalizado' && p.configuracion_cursos?.areas && (
                      <span className="ml-1 text-slate-500">({p.configuracion_cursos.areas.length} Areas)</span>
                    )}
                  </span>
                  <span className="opacity-30">|</span>
                  <span>CLAVES: {Object.keys(p.claves_correctas || {}).length}</span>
                </p>
                <div className="grid grid-cols-3 gap-1.5 relative z-10">
                  <button
                    onClick={() => cargarParaEditar(p)}
                    className="rounded-lg border border-slate-700 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-amber-500/50 hover:text-amber-400"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => clonarPlantilla(p.codigo_examen)}
                    disabled={cloningCodigo === p.codigo_examen}
                    className="rounded-lg border border-slate-700 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-50"
                  >
                    {cloningCodigo === p.codigo_examen ? '...' : 'Clonar'}
                  </button>
                  <button
                    onClick={() => eliminarPlantilla(p.codigo_examen)}
                    disabled={eliminandoCodigo === p.codigo_examen}
                    className="rounded-lg border border-slate-700 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
                  >
                    {eliminandoCodigo === p.codigo_examen ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

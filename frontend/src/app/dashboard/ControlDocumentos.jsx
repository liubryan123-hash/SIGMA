"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const TIPOS_DEFAULT = [
  "DNI / Documento de identidad",
  "Voucher de pago de matrícula",
  "Ficha de matrícula firmada",
  "Foto carnet (3x4)",
  "Certificado de estudios",
  "Constancia de notas",
];

const ESTADO_CFG = {
  entregado: { label: "Entregado", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20", dot: "bg-emerald-500" },
  pendiente:  { label: "Pendiente", color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/20",   dot: "bg-amber-400"  },
};

export default function ControlDocumentos({ isDark, textMuted, cardBg }) {
  const [alumnos, setAlumnos]           = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [alumnoSel, setAlumnoSel]       = useState(null);
  const [docs, setDocs]                 = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [busqueda, setBusqueda]         = useState("");
  const [vistaResumen, setVistaResumen] = useState(true);

  // Form nuevo doc
  const [tipoDoc, setTipoDoc]     = useState(TIPOS_DEFAULT[0]);
  const [tipoCustom, setTipoCustom] = useState("");
  const [estadoDoc, setEstadoDoc] = useState("pendiente");
  const [obsDoc, setObsDoc]       = useState("");
  const [guardando, setGuardando] = useState(false);

  const token   = () => localStorage.getItem("edusaas_token");
  const headers = (json = false) => {
    const h = { Authorization: "Bearer " + token() };
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  const cargarResumen = useCallback(async () => {
    setCargando(true);
    try {
      const res  = await fetch(apiUrl("/api/academic/documentos/pendientes"), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setAlumnos(data);
    } catch { /* silencioso */ }
    setCargando(false);
  }, []);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const abrirAlumno = async (alumno) => {
    setAlumnoSel(alumno);
    setVistaResumen(false);
    setCargandoDocs(true);
    setDocs([]);
    try {
      const res  = await fetch(apiUrl(`/api/academic/alumnos/${alumno.id_usuario}/documentos`), { headers: headers() });
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data);
    } catch { /* silencioso */ }
    setCargandoDocs(false);
  };

  const toggleEstado = async (doc) => {
    const nuevoEstado = doc.estado === "entregado" ? "pendiente" : "entregado";
    try {
      const res = await fetch(apiUrl(`/api/academic/alumnos/${alumnoSel.id_usuario}/documentos/${doc.id_documento}`), {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDocs(prev => prev.map(d => d.id_documento === doc.id_documento ? updated : d));
      }
    } catch { /* silencioso */ }
  };

  const agregarDoc = async (e) => {
    e.preventDefault();
    const tipo = tipoDoc === "__custom__" ? tipoCustom.trim() : tipoDoc;
    if (!tipo) return;
    setGuardando(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/alumnos/${alumnoSel.id_usuario}/documentos`), {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ tipo_documento: tipo, estado: estadoDoc, observacion: obsDoc || undefined }),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setDocs(prev => [...prev, nuevo]);
        setObsDoc("");
        setEstadoDoc("pendiente");
      }
    } catch { /* silencioso */ }
    setGuardando(false);
  };

  const alumnosFiltrados = alumnos.filter(a =>
    a.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const inputCls = `w-full text-sm px-4 py-2.5 rounded-xl border outline-none transition-colors ${isDark
    ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
    : "bg-slate-50 border-slate-200 focus:border-indigo-400"}`;
  const labelCls = `text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Control de documentos</h2>
          <p className={`text-sm mt-1 ${textMuted}`}>Seguimiento de documentación por alumno</p>
        </div>
        {!vistaResumen && (
          <button onClick={() => { setVistaResumen(true); cargarResumen(); }}
            className={`px-5 py-2.5 rounded-xl font-black text-xs border transition-all ${isDark ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            ← Volver al resumen
          </button>
        )}
      </div>

      {/* ── Vista resumen: alumnos con docs pendientes ─── */}
      {vistaResumen && (
        <>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <span className={textMuted}>🔍</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar alumno..."
              className="flex-1 bg-transparent text-sm outline-none" />
          </div>

          <section className={`rounded-[2.5rem] border ${cardBg} p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg uppercase tracking-widest">Alumnos con documentos pendientes</h3>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                {alumnos.length} alumnos
              </span>
            </div>

            {cargando && <p className={`text-sm ${textMuted}`}>Cargando...</p>}
            {!cargando && alumnos.length === 0 && (
              <div className={`text-center py-12 ${textMuted}`}>
                <p className="text-5xl mb-4 opacity-30">✅</p>
                <p className="font-bold">Todos los alumnos tienen sus documentos al día.</p>
              </div>
            )}

            <div className="space-y-2">
              {alumnosFiltrados.map(a => (
                <button key={a.id_usuario} onClick={() => abrirAlumno(a)}
                  className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] ${isDark ? "bg-slate-950/50 border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"}`}>
                  <div>
                    <p className="font-bold text-sm">{a.nombre_completo}</p>
                    <p className={`text-[10px] font-bold ${textMuted}`}>{a.nombre_salon || "Sin salón"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/20 px-3 py-1 rounded-full">
                      {a.docs_pendientes} pendiente{a.docs_pendientes > 1 ? "s" : ""}
                    </span>
                    <span className={`text-sm ${textMuted}`}>→</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Vista detalle: documentos del alumno ─── */}
      {!vistaResumen && alumnoSel && (
        <>
          <div className={`p-6 rounded-2xl border ${cardBg}`}>
            <p className="font-black text-lg">{alumnoSel.nombre_completo}</p>
            <p className={`text-[11px] font-bold ${textMuted}`}>{alumnoSel.nombre_salon || "Sin salón asignar"}</p>
          </div>

          {/* Agregar documento */}
          <section className={`p-6 rounded-2xl border ${cardBg}`}>
            <h3 className="font-black text-sm uppercase tracking-widest mb-4">+ Agregar documento</h3>
            <form onSubmit={agregarDoc} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tipo de documento</label>
                  <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} className={inputCls}>
                    {TIPOS_DEFAULT.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__custom__">Otro (especificar)...</option>
                  </select>
                  {tipoDoc === "__custom__" && (
                    <input type="text" value={tipoCustom} onChange={e => setTipoCustom(e.target.value)}
                      placeholder="Nombre del documento"
                      className={`${inputCls} mt-2`} />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Estado inicial</label>
                  <select value={estadoDoc} onChange={e => setEstadoDoc(e.target.value)} className={inputCls}>
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="entregado">✅ Entregado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Observación (opcional)</label>
                <input type="text" value={obsDoc} onChange={e => setObsDoc(e.target.value)}
                  placeholder="Ej: Vencido, copia ilegible, etc."
                  className={inputCls} />
              </div>
              <button type="submit" disabled={guardando}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all">
                {guardando ? "Guardando..." : "Agregar"}
              </button>
            </form>
          </section>

          {/* Lista de documentos */}
          <section className={`rounded-[2rem] border ${cardBg} overflow-hidden`}>
            <div className="p-6 border-b border-slate-800/50">
              <h3 className="font-black uppercase tracking-widest text-sm">Documentos registrados</h3>
            </div>
            {cargandoDocs && <p className={`text-sm p-6 ${textMuted}`}>Cargando...</p>}
            {!cargandoDocs && docs.length === 0 && (
              <p className={`text-sm p-6 ${textMuted}`}>Sin documentos registrados. Agrega el primero arriba.</p>
            )}
            <div className="divide-y divide-slate-800/30">
              {docs.map(d => {
                const cfg = ESTADO_CFG[d.estado] || ESTADO_CFG.pendiente;
                return (
                  <div key={d.id_documento} className="flex items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{d.tipo_documento}</p>
                        {d.observacion && <p className={`text-[10px] ${textMuted}`}>{d.observacion}</p>}
                        {d.fecha_entrega && (
                          <p className={`text-[10px] ${textMuted}`}>
                            Entregado: {new Date(d.fecha_entrega).toLocaleDateString("es-PE")}
                            {d.registrado_por_nombre && ` · ${d.registrado_por_nombre}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => toggleEstado(d)}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all flex-shrink-0 ${cfg.bg} ${cfg.color} hover:opacity-80`}>
                      {cfg.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

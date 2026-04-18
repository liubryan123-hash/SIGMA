"use client";

import { useState, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("edusaas_token")}`,
});

export default function ImportadorDatos({ isDark, textMuted }) {
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [arrastrandoSobre, setArrastrandoSobre] = useState(false);

  const descargarPlantilla = () => {
    window.open(apiUrl("/api/alumnos/plantilla-csv") + `?token=${localStorage.getItem("edusaas_token")}`, "_blank");
  };

  const parsearPreview = (texto) => {
    const lineas = texto.replace(/\r/g, "").split("\n").filter(l => l.trim());
    return lineas.slice(0, 6).map(linea => {
      const campos = [];
      let campo = "", dentroComillas = false;
      for (const c of linea) {
        if (c === '"') dentroComillas = !dentroComillas;
        else if (c === "," && !dentroComillas) { campos.push(campo.trim()); campo = ""; }
        else campo += c;
      }
      campos.push(campo.trim());
      return campos;
    });
  };

  const procesarArchivo = useCallback((f) => {
    if (!f || !f.name.endsWith(".csv")) return;
    setArchivo(f);
    setResultado(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(parsearPreview(e.target.result));
    reader.readAsText(f, "utf-8");
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setArrastrandoSobre(false);
    procesarArchivo(e.dataTransfer.files[0]);
  };

  const importar = async () => {
    if (!archivo) return;
    setImportando(true);
    setResultado(null);
    const form = new FormData();
    form.append("csv", archivo);
    try {
      const res = await fetch(apiUrl("/api/alumnos/importar"), {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await res.json();
      setResultado({ ok: res.ok, ...data });
      if (res.ok) { setArchivo(null); setPreview([]); }
    } catch {
      setResultado({ ok: false, error: "Error de conexión con el servidor." });
    } finally {
      setImportando(false);
    }
  };

  const COLS = ["nombre_completo", "email", "salon", "codigo_alumno", "password"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Importación Masiva</h2>
          <p className={`text-sm mt-1 ${textMuted}`}>Carga tu lista de alumnos desde Excel/CSV en segundos.</p>
        </div>
        <button
          onClick={descargarPlantilla}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          ⬇ Descargar Plantilla CSV
        </button>
      </div>

      {/* Instrucciones de columnas */}
      <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${textMuted}`}>Columnas del CSV (en este orden)</p>
        <div className="flex flex-wrap gap-2">
          {[
            { col: "nombre_completo", req: true },
            { col: "email", req: false },
            { col: "salon", req: false },
            { col: "codigo_alumno", req: false },
            { col: "password", req: false },
          ].map(({ col, req }) => (
            <span key={col} className={`px-3 py-1.5 rounded-lg text-[10px] font-black font-mono ${req ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : isDark ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 border border-slate-200"}`}>
              {col} {req ? "*" : ""}
            </span>
          ))}
        </div>
        <p className={`text-[10px] mt-3 ${textMuted}`}>
          * Obligatorio. Si no pones <span className="font-mono">password</span>, se usa el nombre completo como clave temporal.
          Si no pones <span className="font-mono">codigo_alumno</span>, se genera automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Zona de drop */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setArrastrandoSobre(true); }}
          onDragLeave={() => setArrastrandoSobre(false)}
          className={`p-10 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center transition-all min-h-[260px] ${
            arrastrandoSobre ? "border-blue-500 bg-blue-500/5 scale-[1.01]" :
            archivo ? "border-emerald-500/50 bg-emerald-500/5" :
            isDark ? "border-slate-700 hover:border-slate-500" : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <div className="text-4xl mb-4">{archivo ? "📋" : "📥"}</div>
          <p className="font-black text-lg mb-1">
            {archivo ? archivo.name : "Arrastra tu CSV aquí"}
          </p>
          <p className={`text-xs mb-6 ${textMuted}`}>
            {archivo
              ? `${(archivo.size / 1024).toFixed(1)} KB · ${preview.length - 1} filas detectadas`
              : "o haz clic para buscar"}
          </p>
          <input
            type="file"
            accept=".csv"
            id="csv-input"
            className="hidden"
            onChange={(e) => procesarArchivo(e.target.files[0])}
          />
          <label
            htmlFor="csv-input"
            className="px-6 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer hover:bg-slate-100 transition-all active:scale-95"
          >
            {archivo ? "Cambiar archivo" : "Buscar CSV"}
          </label>
        </div>

        {/* Preview + acciones */}
        <div className={`p-8 rounded-[2.5rem] border flex flex-col gap-6 ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${textMuted}`}>
              Vista previa {preview.length > 1 ? `(${preview.length - 1} fila${preview.length > 2 ? "s" : ""})` : ""}
            </p>
            {preview.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-left">
                  <thead>
                    <tr className={`border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                      {COLS.map(c => (
                        <th key={c} className={`pb-2 pr-4 font-black uppercase ${textMuted}`}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((fila, i) => (
                      <tr key={i} className={`border-b ${isDark ? "border-slate-800/50" : "border-slate-50"}`}>
                        {COLS.map((_, j) => (
                          <td key={j} className="py-2 pr-4 font-mono opacity-80">{fila[j] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`py-10 text-center rounded-2xl border border-dashed ${isDark ? "border-slate-800 text-slate-600" : "border-slate-200 text-slate-400"} text-xs`}>
                Sube un CSV para ver la vista previa
              </div>
            )}
          </div>

          <button
            disabled={!archivo || importando}
            onClick={importar}
            className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
              !archivo || importando
                ? isDark ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-95"
            }`}
          >
            {importando ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
            ) : "🚀 Importar Alumnos"}
          </button>

          {/* Resultado */}
          {resultado && (
            <div className={`p-5 rounded-2xl border text-xs space-y-2 ${resultado.ok ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
              {resultado.ok ? (
                <>
                  <p className="font-black text-emerald-400">✅ Importación completada</p>
                  <p className={textMuted}>✔ Creados: <span className="font-black text-white">{resultado.creados}</span></p>
                  <p className={textMuted}>⏭ Duplicados omitidos: <span className="font-black">{resultado.duplicados}</span></p>
                  {resultado.errores?.length > 0 && (
                    <div>
                      <p className="text-amber-400 font-black mt-2">⚠ {resultado.errores.length} advertencias:</p>
                      <ul className="mt-1 space-y-1">
                        {resultado.errores.map((e, i) => (
                          <li key={i} className="text-amber-300 font-mono">{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="font-black text-red-400">❌ {resultado.error || "Error al importar."}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className={`p-6 rounded-2xl border flex gap-4 items-start ${isDark ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"}`}>
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-black text-indigo-400 text-sm mb-1">Cómo preparar tu lista</p>
          <p className={`text-xs leading-relaxed ${textMuted}`}>
            Descarga la plantilla, ábrela en Excel o Google Sheets y llena los datos.
            El salón debe coincidir exactamente con el nombre en el sistema.
            Si un alumno ya existe (mismo código o email), se omite sin crear duplicado.
            La contraseña temporal es el nombre completo del alumno si no se especifica.
          </p>
        </div>
      </div>
    </div>
  );
}

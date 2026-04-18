"use client";

const ALTERNATIVAS = ["A", "B", "C", "D", "E"];

export default function ManualCorrectionGrid({
  plantilla,
  numPreguntas: numPreguntasProp,
  respuestas = {},
  onRespuestasCambiadas,
  confianza = {},
  isDark,
  textMuted,
}) {
  const claves = plantilla?.claves_correctas || {};
  const numPreguntas =
    plantilla
      ? Object.keys(claves).length
      : numPreguntasProp || Object.keys(respuestas).length || 0;

  if (numPreguntas === 0) return null;

  const confianzaBg = (v) => {
    if (v === undefined || v === null) return "";
    if (v >= 0.85) return "bg-emerald-900/20";
    if (v >= 0.70) return "bg-amber-900/20";
    return "bg-red-900/30 border border-red-800/40";
  };

  const cambiarRespuesta = (pregunta, alternativa) => {
    // Segundo clic en la misma alternativa la deselecciona
    const nuevas = {
      ...respuestas,
      [pregunta]: respuestas[pregunta] === alternativa ? "" : alternativa,
    };
    onRespuestasCambiadas(nuevas);
  };

  return (
    <div>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${textMuted}`}>
        Respuestas detectadas ({numPreguntas} preg.) · Toca para corregir
      </p>

      {/* Header de alternativas */}
      <div className="flex gap-1 mb-1 pl-9">
        {ALTERNATIVAS.map((alt) => (
          <div
            key={alt}
            className={`flex-1 text-center text-[9px] font-black uppercase ${textMuted}`}
          >
            {alt}
          </div>
        ))}
      </div>

      {/* Filas de preguntas */}
      <div className="space-y-0.5 max-h-[420px] overflow-y-auto pr-1">
        {Array.from({ length: numPreguntas }, (_, i) => {
          const q = (i + 1).toString();
          const conf = confianza[q];
          const respuestaActual = respuestas[q] || "";

          return (
            <div
              key={q}
              className={`flex items-center gap-1 rounded-lg px-1 py-0.5 ${confianzaBg(conf)}`}
            >
              {/* Número de pregunta */}
              <div className={`w-8 text-right pr-1 text-[10px] font-black shrink-0 ${textMuted}`}>
                {q}
              </div>

              {/* Botones A-E */}
              {ALTERNATIVAS.map((alt) => {
                const esSeleccionada = respuestaActual === alt;
                const esCorrecta = claves[q] === alt;

                let btnClass =
                  "flex-1 h-8 rounded text-xs font-black transition-all ";

                if (esSeleccionada) {
                  btnClass += esCorrecta
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md "
                    : "bg-blue-600 text-white shadow-md ";
                } else {
                  btnClass += isDark
                    ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white "
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300 ";
                }

                return (
                  <button
                    key={alt}
                    onClick={() => cambiarRespuesta(q, alt)}
                    className={btnClass}
                  >
                    {alt}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div
        className={`flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold mt-3 pt-3 border-t ${
          isDark ? "border-slate-800" : "border-slate-200"
        } ${textMuted}`}
      >
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
          Seleccionado
        </span>
        {Object.keys(claves).length > 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-3 h-3 rounded bg-emerald-600 ring-2 ring-emerald-400 inline-block" />
            Sel. + correcto
          </span>
        )}
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-3 h-3 rounded bg-emerald-900/40 border border-emerald-700 inline-block" />
          Alta ≥85%
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-3 h-3 rounded bg-amber-900/40 inline-block" />
          Media 70–85%
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-3 h-3 rounded bg-red-900/40 border border-red-800 inline-block" />
          Baja &lt;70%
        </span>
      </div>
    </div>
  );
}

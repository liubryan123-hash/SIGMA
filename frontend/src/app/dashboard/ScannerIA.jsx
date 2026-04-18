"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import FastInputConsole from "./FastInputConsole";
import WebcamCapture from "./WebcamCapture";

export default function ScannerIA({ isDark, cardBg, textMuted }) {
  const [modoEscaneo, setModoEscaneo] = useState('IA'); 
  const [manualDni, setManualDni] = useState('');
  const [plantillasList, setPlantillasList] = useState([]);
  const [selectedPlantillaCode, setSelectedPlantillaCode] = useState('');
  const [fastInputRaw, setFastInputRaw] = useState('');
  const [fastMath, setFastMath] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [iaResponse, setIaResponse] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  
  // Cámara web
  const [mostrarCamara, setMostrarCamara] = useState(false);

  const handleFileChange = (e) => {
    if(e.target.files && e.target.files[0]){
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadToIA = async () => {
    if(!selectedFile) return alert("❌ Ciberseguridad: Intento de procesar la nada. Por favor sube una foto real primero.");
    setUploading(true);
    setIaResponse(null);
    
    const formData = new FormData();
    formData.append('imagen_examen', selectedFile);
    
    try {
      const token = localStorage.getItem("edusaas_token");
      const res = await fetch(apiUrl("/api/exams/upload-foto"), {
         method: "POST",
         headers: {
           "Authorization": "Bearer " + token
         },
         body: formData
      });
      const data = await res.json();
      setIaResponse(data);
    } catch (err) {
      setIaResponse({ error: "Choque en el Servidor. Node.js no responde a la Inteligencia Artificial." });
    } finally {
      setUploading(false);
    }
  };

  const confirmarGrabacionPostgres = async () => {
     try {
         const token = localStorage.getItem('edusaas_token');
         const res = await fetch(apiUrl('/api/exams/confirmar-resultados'), {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify({
                 codigo_examen: iaResponse.codigo_examen,
                 codigo_postulante: iaResponse.codigo_leido === 'DESCONOCIDO' ? null : iaResponse.codigo_leido,
                 nota_total: parseFloat(iaResponse.inteligencia_artificial.puntaje_global),
                 respuestas_alumno: iaResponse.respuestas_cruzadas,
                 puntaje_por_cursos: iaResponse.inteligencia_artificial.desglose_cursos,
                 url_imagen_scan: iaResponse.url_foto_subida,
                 observaciones: iaResponse.observaciones
             })
         });
         const data = await res.json();
         if (res.ok) {
             alert(data.message);
             window.location.reload();
         } else {
             alert('Advertencia DB: ' + data.error);
         }
     } catch(err) {
         alert('Falla crítica en capa de red. No se pudo ubicar a Postgres.');
     }
  };

  useEffect(() => {
     if (modoEscaneo === 'MANUAL') {
         fetch(apiUrl('/api/exams/plantillas'), {
             headers: { 'Authorization': `Bearer ${localStorage.getItem('edusaas_token')}` }
         }).then(r=>r.json()).then(data => {
             if(Array.isArray(data)) {
                setPlantillasList(data);
                if(data.length > 0) setSelectedPlantillaCode(data[0].codigo_examen);
             }
         }).catch(e=>console.log(e));
     }
  }, [modoEscaneo]);

  useEffect(() => {
      if(!selectedPlantillaCode || !fastInputRaw) { setFastMath(null); return; }
      const p = plantillasList.find(x => x.codigo_examen === selectedPlantillaCode);
      if(!p) return;
      
      const respuestasLimpias = fastInputRaw.toUpperCase().replace(/[^A-E ]/g, '').split(''); 
      let aciertos = 0, errores = 0, blancos = 0;
      const ptsCorrecta = p.tipo_calificacion === 'uni' ? 5 : 20;
      const ptsIncorrecta = p.tipo_calificacion === 'uni' ? -1 : -1.125;

      respuestasLimpias.forEach((char, index) => {
          const numPregunta = (index + 1).toString();
          const correctaOficial = p.claves_correctas[numPregunta];
          if(!correctaOficial) return;
          if(char === ' ' || char === '') blancos++;
          else if(char === correctaOficial) aciertos++;
          else errores++;
      });
      
      const score = (aciertos * ptsCorrecta) + (errores * ptsIncorrecta);
      setFastMath({ aciertos, errores, blancos, score: score.toFixed(3), motor: p.tipo_calificacion.toUpperCase() });
  }, [fastInputRaw, selectedPlantillaCode, plantillasList]);

  return (
    <>
      <section className={`backdrop-blur border rounded-[2rem] p-12 flex flex-col relative z-10 transition-colors ${isDark ? 'bg-slate-900/60 border-slate-800/80 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-4xl">🤖</div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Carga Óptica de Examen (Cerebro IA)</h2>
              <p className={`${textMuted} font-medium mt-1`}>Por favor sube la fotografía del examen marcado por el alumno para calificarlo algorítmicamente y registrar sus puntajes en PostgreSQL.</p>
            </div>
          </div>

          <div className="mb-6">
             <h2 className="text-2xl font-black mb-2 uppercase tracking-wide">Analizador Óptico</h2>
             <p className="text-slate-500 text-sm">Escanea y transfiere calificaciones OCR a la Base de Datos Central.</p>
          </div>

          <div className="flex bg-slate-900/50 p-1.5 rounded-lg w-max mb-8 border border-slate-700/50 shadow-inner">
             <button onClick={() => setModoEscaneo('IA')} className={`px-6 py-2.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all ${modoEscaneo === 'IA' ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>🤖 IA Automática</button>
             <button onClick={() => setModoEscaneo('MANUAL')} className={`px-6 py-2.5 text-[11px] font-black tracking-widest uppercase rounded-md transition-all ${modoEscaneo === 'MANUAL' ? 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.3)] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>⌨️ Ingreso de Auxilio (Manual)</button>
          </div>

          {modoEscaneo === 'MANUAL' ? (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
               <div className="max-w-xs">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Examen a Calificar</label>
                 <select value={selectedPlantillaCode} onChange={e=>setSelectedPlantillaCode(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-600 outline-none text-white rounded-xl p-3 text-[11px] font-bold uppercase transition-colors">
                   {plantillasList.map(p => <option key={p.codigo_examen} value={p.codigo_examen}>{p.codigo_examen} - {p.nombre_simulacro}</option>)}
                 </select>
               </div>
               <FastInputConsole 
                 selectedPlantilla={plantillasList.find(p => p.codigo_examen === selectedPlantillaCode)} 
                 isDark={isDark}
                 onResultSaved={() => alert('✅ Resultado grabado exitosamente en el Repositorio Central.')}
                 /* Passing the required fast math states from here to FastInputConsole assuming it knows how to handle them or we adapt if needed */
               />
             </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className={`p-6 md:p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${isDark ? 'border-slate-700 bg-slate-950/50 hover:border-purple-500' : 'border-slate-300 bg-slate-50 hover:border-purple-400'}`}>
               <span className="text-6xl mb-6 opacity-30 animate-pulse">📸</span>
               <div className="w-full max-w-xs mb-8">
                 <input type="file" onChange={handleFileChange} accept="image/*" className={`w-full text-sm file:mr-4 file:cursor-pointer file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'}`}/>
                 {selectedFile && (
                   <p className={`text-[10px] mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                     📎 {selectedFile.name}
                   </p>
                 )}
               </div>
               
               <div className="flex gap-3 w-full max-w-xs mb-8">
                 <button
                   onClick={() => setMostrarCamara(true)}
                   className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm whitespace-nowrap"
                 >
                   📸 Usar cámara
                 </button>
                 <button onClick={uploadToIA} disabled={uploading || !selectedFile} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(147,51,234,0.3)] text-sm">
                    {uploading ? '📡 Escaneando...' : '📤 Transmitir'}
                 </button>
               </div>

               <div className={`mt-8 text-left w-full p-6 rounded-2xl border transition-colors ${isDark ? 'bg-indigo-950/20 border-indigo-900/60' : 'bg-indigo-50 border-indigo-200 shadow-sm'}`}>
                   <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      <span className="text-sm">💡</span> Manual Rápido (Precisión 99.9%)
                   </h4>
                   <ul className={`text-[11px] space-y-3 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <li className="flex items-start gap-2.5 leading-relaxed"><span className="text-emerald-500 text-sm font-bold">✓</span> <span className={isDark ? 'text-slate-300' : 'text-slate-800'}><strong>Lápiz 2B oscuro:</strong> Sombrear las burbujas...</span></li>
                      <li className="flex items-start gap-2.5 leading-relaxed"><span className="text-emerald-500 text-sm font-bold">✓</span> <span className={isDark ? 'text-slate-300' : 'text-slate-800'}><strong>Toma Fotográfica Cenital:</strong> Celular paralelo...</span></li>
                      <li className="flex items-start gap-2.5 leading-relaxed"><span className="text-emerald-500 text-sm font-bold">✓</span> <span className={isDark ? 'text-slate-300' : 'text-slate-800'}><strong>Iluminación Plana:</strong> Ambiente brilloso...</span></li>
                      <li className="flex items-start gap-2.5 leading-relaxed"><span className="text-emerald-500 text-sm font-bold">✓</span> <span className={isDark ? 'text-slate-300' : 'text-slate-800'}><strong>Márgenes de Respeto:</strong> 4 esquinas negras...</span></li>
                   </ul>
               </div>
             </div>

             <div className={`p-8 rounded-3xl border transition-colors flex flex-col ${cardBg}`}>
               <h3 className="font-bold text-lg mb-4 flex items-center gap-3"><span className="animate-spin text-purple-400">⚙️</span> Terminal Procesamiento IA</h3>
               
               <div className={`flex-1 rounded-2xl p-6 overflow-y-auto font-mono text-xs shadow-inner transition-colors ${isDark ? 'bg-slate-950 text-emerald-400' : 'bg-slate-900 text-emerald-400'}`}>
                  {!iaResponse && !uploading && <p className="opacity-50 text-slate-400">A la espera de fotografía...</p>}
                  {uploading && (
                    <div className="space-y-1">
                      <p className="animate-pulse text-purple-400">Conectando con Pipeline Multer...</p>
                      <p className="animate-pulse text-purple-400 opacity-80 mt-2">Guardando imagen en disco...</p>
                      <p className="animate-pulse text-purple-400 opacity-60">Extrayendo matrices RGB...</p>
                    </div>
                  )}
                  {iaResponse && (
                    <div className="space-y-4">
                      <p className="text-blue-400">{">>"} [200 OK] {iaResponse.mensaje || "Procesado"}</p>
                      
                      {iaResponse.estado_examen === 'REQUIERE_OBSERVACION' && (
                        <div className="bg-amber-900/40 border border-amber-500/50 rounded-lg p-3 text-amber-300 text-sm shadow-[0_0_15px_rgba(245,158,11,0.15)] mt-3 animate-pulse">
                          <p className="font-bold flex items-center gap-2 mb-2">
                            <span className="text-lg">⚠️</span> ALERTA DE SEGURIDAD EXTREMA
                          </p>
                          <ul className="list-disc pl-8 opacity-90 space-y-1 text-[11px]">
                            {iaResponse.observaciones && iaResponse.observaciones.map((obs, i) => <li key={i}>{obs}</li>)}
                          </ul>
                        </div>
                      )}

                      {iaResponse.codigo_leido && (
                        <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-lg text-sm text-slate-300 mt-2">
                          <p className="flex items-center gap-2 mb-2">
                            <span className="font-bold">Código Postulante:</span> 
                            <span className="text-blue-400 font-mono text-base">{iaResponse.codigo_leido}</span>
                          </p>
                        </div>
                      )}
                      
                      {iaResponse.inteligencia_artificial && (
                         <div className="mt-5 border-t border-emerald-900/50 pt-4 pb-2">
                           <p className="text-emerald-400 text-sm font-bold flex justify-between items-center bg-emerald-900/20 p-3 rounded-lg border border-emerald-900/50">
                             <span className="uppercase tracking-widest text-[10px]">PUNTAJE TOTAL:</span>
                             <span className="text-3xl text-emerald-300">{iaResponse.inteligencia_artificial.puntaje_total}</span>
                           </p>

                          <div className="mt-8 border-t-2 border-slate-700/50 pt-6 text-center">
                              <button onClick={() => { setModalImage(iaResponse.url_foto_subida); }} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 px-8 rounded-xl transition-all uppercase tracking-widest text-[11px] transform hover:-translate-y-1">
                                 🔎 Vista Previa / Confirmar
                              </button>
                          </div>
                         </div>
                      )}
                    </div>
                  )}
               </div>
             </div>
            </div>
          )}
      </section>

      {modalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                 <h2 className="text-xl font-black text-amber-500">⚠️ AUDITORÍA DE HOJA FÍSICA</h2>
                 <button onClick={() => setModalImage(null)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full w-8 h-8 font-bold">✕</button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-900">
                 <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={modalImage} alt="Evidencia" className="w-full max-w-3xl object-contain rounded-lg border border-slate-800 shadow-2xl" />
                 </div>
                 <div className="w-full md:w-[400px] border-l border-slate-800 bg-slate-950 p-6 flex flex-col gap-6 overflow-y-auto">
                    <button onClick={confirmarGrabacionPostgres} className="w-full mt-4 bg-emerald-600 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all uppercase tracking-widest text-[11px]">
                       💾 CONFIRMAR MATCH ÓPTICO
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal de cámara web */}
      {mostrarCamara && (
        <WebcamCapture
          isDark={isDark}
          onClose={() => setMostrarCamara(false)}
          onCapture={(file) => {
            setSelectedFile(file);
            setMostrarCamara(false);
            alert("✅ Foto capturada. Ahora puedes transmitir al servidor.");
          }}
        />
      )}
    </>
  );
}

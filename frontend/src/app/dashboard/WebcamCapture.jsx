"use client";

import { useState, useRef, useEffect } from "react";

export default function WebcamCapture({ onCapture, onClose, isDark }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' = cámara trasera, 'user' = frontal

  // Iniciar cámara
  useEffect(() => {
    async function startCamera() {
      try {
        // Verificar si el navegador soporta getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Tu navegador no soporta acceso a la cámara. Usa Chrome, Firefox o Safari.");
        }

        // Intentar primero con cámara trasera, si falla usar cualquiera disponible
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        // En móviles, intentar sin especificar facingMode si falla
        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstError) {
          // Si falla, intentar sin especificar facingMode
          console.log("Primer intento falló, intentando sin facingMode:", firstError);
          const fallbackConstraints = {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };
          mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        }
        setError(null);
      } catch (err) {
        console.error("Error accediendo a la cámara:", err);
        
        let mensajeError = "No se pudo acceder a la cámara.";
        
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          mensajeError = "❌ Permiso denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          mensajeError = "📷 No se encontró una cámara en este dispositivo.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          mensajeError = "⚠️ La cámara ya está en uso por otra aplicación.";
        } else if (err.name === "OverconstrainedError") {
          mensajeError = "⚠️ La cámara no soporta la configuración solicitada.";
        } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
          mensajeError = "🔒 La cámara requiere HTTPS. En celular, usa la opción de subir desde galería.";
        }
        
        setError(mensajeError);
      }
    }

    startCamera();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Capturar foto
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Configurar canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir a blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Crear archivo desde blob
        const file = new File([blob], `omr-capture-${Date.now()}.jpg`, {
          type: "image/jpeg"
        });
        onCapture(file);
      }
    }, "image/jpeg", 0.95);
  };

  // Cambiar cámara (frontal/trasera)
  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <h3 className="font-extrabold text-lg">📸 Capturar examen</h3>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Alinea la hoja y toma la foto
            </p>
            {location.protocol !== "https:" && location.hostname !== "localhost" && (
              <p className="text-[10px] text-amber-500 font-bold mt-1">
                ⚠️ En celular necesitas HTTPS. Si falla, usa "Subir archivo".
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all"
          >
            ✕
          </button>
        </div>

        {/* Vista de cámara */}
        <div className="relative bg-black">
          {error ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-red-400 font-bold mb-4">{error}</p>
              
              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  💡 <strong>Alternativa:</strong> Puedes subir la foto desde tu galería
                </p>
              </div>
              
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl cursor-pointer transition-all">
                📁 Seleccionar archivo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onCapture(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
              
              <p className={`text-xs mt-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                O cierra y usa el botón de cámara en el formulario principal
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              
              {/* Canvas oculto para captura */}
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Guía de alineación */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/50 rounded-lg"></div>
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/70 text-xs font-bold">
                  📐 Alinea la hoja dentro del recuadro
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controles */}
        {!error && (
          <div className={`p-6 flex items-center justify-center gap-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {/* Botón cambiar cámara */}
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
              title="Cambiar cámara"
            >
              🔄
            </button>

            {/* Botón capturar */}
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 hover:border-blue-500 transition-all flex items-center justify-center text-3xl shadow-lg active:scale-95"
              title="Tomar foto"
            >
              📷
            </button>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className={`p-4 rounded-full border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-red-500' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-red-500 hover:text-white'}`}
              title="Cancelar"
            >
              ✕
            </button>
          </div>
        )}

        {/* Instrucciones */}
        <div className={`p-4 text-center text-[10px] ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
          💡 Consejo: Usa buena iluminación y asegúrate de que las 4 esquinas de la hoja sean visibles
        </div>
      </div>
    </div>
  );
}

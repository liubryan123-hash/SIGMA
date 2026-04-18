"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

export default function MatriculaWizard({ isDark, textMuted, cardBg, academyConfig }) {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre_completo: "",
    dni: "",
    email: "",
    telefono: "",
    id_salon: "",
    send_welcome_email: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const procesarMatricula = async () => {
    if (!formData.nombre_completo || !formData.dni || !formData.id_salon) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }
    
    setCargando(true);
    try {
      const token = localStorage.getItem("edusaas_token");
      // El endpoint /api/alumnos/registrar existe según la documentación
      const res = await fetch(apiUrl("/api/alumnos/registrar"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          rol: "alumno",
          password: formData.dni // Por convención, DNI suele ser la clave inicial
        }),
      });

      if (res.ok) {
        setPaso(4); // Pantalla de éxito
      } else {
        const err = await res.json();
        alert(err.error || "Ocurrió un error al registrar al alumno.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const renderPasoIndicador = () => (
    <div className="flex items-center justify-center mb-10">
      {[1, 2, 3].map((num, i) => (
        <div key={num} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${
            paso >= num 
              ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
              : isDark ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-500"
          }`}>
            {num}
          </div>
          {i < 2 && (
            <div className={`w-16 md:w-24 h-1 mx-2 rounded-full transition-colors ${
              paso > num ? "bg-indigo-600" : isDark ? "bg-slate-800" : "bg-slate-200"
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className={`p-10 rounded-[2.5rem] border shadow-xl relative overflow-hidden transition-colors duration-500 ${cardBg}`}>
        {/* Fondo decorativo */}
        <div className={`absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none`} />
        
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Asistente de Matrícula</h2>
          <p className={`${textMuted}`}>Registra un nuevo alumno en 3 sencillos pasos.</p>
        </div>

        {paso < 4 && renderPasoIndicador()}

        <div className="relative z-10">
          {/* PASO 1: DATOS PERSONALES */}
          {paso === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-xl font-bold mb-4">Paso 1: Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Nombre Completo *</label>
                  <input type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-950 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} placeholder="Ej. Juan Pérez" />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>DNI *</label>
                  <input type="text" name="dni" value={formData.dni} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-950 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} placeholder="8 dígitos" />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Correo Electrónico</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-950 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} placeholder="juan@ejemplo.com" />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Teléfono / WhatsApp</label>
                  <input type="text" name="telefono" value={formData.telefono} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border outline-none font-medium transition-colors ${isDark ? 'bg-slate-950 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} placeholder="999 888 777" />
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <button onClick={() => setPaso(2)} disabled={!formData.nombre_completo || !formData.dni}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all">
                  Siguiente ➔
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIÓN DE SALÓN */}
          {paso === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-xl font-bold mb-4">Paso 2: Asignación Académica</h3>
              
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Salón a Matricular *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {academyConfig?.salones?.map(salon => (
                    <label key={salon.id_salon} className={`cursor-pointer p-4 rounded-xl border flex items-center gap-4 transition-all ${formData.id_salon == salon.id_salon ? 'border-indigo-500 bg-indigo-500/10' : isDark ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="id_salon" value={salon.id_salon} 
                        checked={formData.id_salon == salon.id_salon} onChange={handleChange} 
                        className="w-5 h-5 accent-indigo-600" />
                      <div>
                        <p className="font-bold">{salon.nombre}</p>
                        <p className={`text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>Ciclo act.</p>
                      </div>
                    </label>
                  ))}
                  {(!academyConfig?.salones || academyConfig.salones.length === 0) && (
                    <p className={`col-span-2 text-sm italic ${textMuted}`}>No hay salones disponibles. El director debe crear uno primero.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <button onClick={() => setPaso(1)}
                  className={`px-8 py-3 bg-transparent border font-black rounded-xl uppercase tracking-widest text-xs transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
                  🡄 Atrás
                </button>
                <button onClick={() => setPaso(3)} disabled={!formData.id_salon}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all">
                  Siguiente ➔
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: CONFIRMACIÓN */}
          {paso === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-xl font-bold mb-4">Paso 3: Confirmación de Matrícula</h3>
              
              <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div className={textMuted}>Alumno:</div>
                  <div className="font-bold">{formData.nombre_completo}</div>
                  <div className={textMuted}>DNI:</div>
                  <div className="font-bold">{formData.dni}</div>
                  <div className={textMuted}>Salón Designado:</div>
                  <div className="font-bold text-indigo-400">
                    {academyConfig?.salones?.find(s => s.id_salon == formData.id_salon)?.nombre || "No seleccionado"}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer mt-4">
                <input type="checkbox" name="send_welcome_email" checked={formData.send_welcome_email} onChange={handleChange} className="w-5 h-5 accent-indigo-600 rounded" />
                <span className={`text-sm ${textMuted}`}>Enviar correo automático de bienvenida al alumno con sus accesos.</span>
              </label>

              <div className="flex justify-between pt-6">
                 <button onClick={() => setPaso(2)} disabled={cargando}
                  className={`px-8 py-3 bg-transparent border font-black rounded-xl uppercase tracking-widest text-xs transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
                  🡄 Atrás
                </button>
                <button onClick={procesarMatricula} disabled={cargando}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg flex items-center gap-2">
                  {cargando ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/> : '✅'}
                  Completar Matrícula
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: ÉXITO */}
          {paso === 4 && (
            <div className="text-center space-y-6 animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-5xl">
                ✔️
              </div>
              <h3 className="text-2xl font-black">¡Matrícula Exitosa!</h3>
              <p className={textMuted}>El alumno <b>{formData.nombre_completo}</b> ha sido registrado y matriculado en el salón correctamente. Su contraseña por defecto es su DNI.</p>
              
              <div className="flex justify-center gap-4 pt-6">
                <button onClick={() => {
                  setFormData({ nombre_completo: "", dni: "", email: "", telefono: "", id_salon: "", send_welcome_email: true });
                  setPaso(1);
                }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] transition-all">
                  Registrar Otro
                </button>
                <button onClick={() => window.location.reload()} className={`px-6 py-3 border font-black rounded-xl uppercase tracking-widest text-[10px] transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
                  Volver al Inicio
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

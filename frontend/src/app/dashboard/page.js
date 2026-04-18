"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import PlantillasManager from "./PlantillasManager";
import AdminPanel from "./AdminPanel";
import MaterialDidactico from "./MaterialDidactico";
import CRM from "./CRM";
import AuditDashboard from "./AuditDashboard";
import ImportadorDatos from "./ImportadorDatos";
import DirectorResumen from "./DirectorResumen";
import MarketingPanel from "./MarketingPanel";
import ScannerIA from "./ScannerIA";
import BandejaOMR from "./BandejaOMR";
import BandejaPendientes from "./BandejaPendientes";
import ComunicadosMasivos from "./ComunicadosMasivos";
import OnboardingWizard from "./OnboardingWizard";
import BuscadorGlobal from "./BuscadorGlobal";
import MapaCalorSalon from "./MapaCalorSalon";
import ControlDocumentos from "./ControlDocumentos";
import ListaEspera from "./ListaEspera";
import Campana from "./Campana";
import AnalisisPreguntas from "./AnalisisPreguntas";
import CalendarioAcademico from "./CalendarioAcademico";
import PortalTutor from "./PortalTutor";
import PortalPadres from "./PortalPadres";
import SidebarNav from "./SidebarNav";
import GestionSalones from "./GestionSalones";
import HomeSecretaria from "./HomeSecretaria";
import VistaRiesgoSalon from "./VistaRiesgoSalon";
import MatriculaWizard from "./MatriculaWizard";
import SimuladorIngreso from "./SimuladorIngreso";
import ConfigAlertas from "./ConfigAlertas";

const PortalAlumno = dynamic(() => import("./PortalAlumno"), { ssr: false });
const GestionAlumnos = dynamic(() => import("./GestionAlumnos"), { ssr: false });
const ControlAsistencia = dynamic(() => import("./ControlAsistencia"), { ssr: false });
const GestionPagos = dynamic(() => import("./GestionPagos"), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // ===============================
  // ESTADOS DEL MÓDULO REACT
  // ===============================
  const [activeTab, setActiveTab] = useState("resumen");
  const [theme, setTheme] = useState("dark"); // Conmutador genérico de entornos (Dark/Light)
  
  // Estados para SuperAdmin Dashboard
  const [systemStats, setSystemStats] = useState(null);

  // Estados para Buzón de Sugerencias (Clientes)
  const [modalSugerencia, setModalSugerencia] = useState(false);
  const [formSugerencia, setFormSugerencia] = useState({ mensaje: '', tipo: 'sugerencia' });
  const [enviandoSugerencia, setEnviandoSugerencia] = useState(false);

  const [academyConfig, setAcademyConfig] = useState(null);
  const [mostrarWizard, setMostrarWizard] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("edusaas_user");
    const token = localStorage.getItem("edusaas_token");
    if (!savedUser || !token) {
      router.push("/");
    } else {
      const u = JSON.parse(savedUser);
      setUser(u);
      // Redirigir tutor a su portal directamente
      if (u.rol === 'tutor')  setActiveTab('portal_tutor');
      if (u.rol === 'padre')  setActiveTab('portal_padre');
      // Si es SuperAdmin, cargar estadísticas globales para el Resumen
      if (u.rol === 'superadmin') {
        fetch(apiUrl("/api/admin/stats"), {
          headers: { "Authorization": `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setSystemStats(data))
        .catch(err => console.error("Error stats:", err));
      }

      // Cargar datos genéricos de la Academia
      if (u.id_academia) {
        fetch(apiUrl(`/api/public/academias/id/${u.id_academia}`))
        .then(res => res.json())
        .then(data => {
          setAcademyConfig(data);
          // Auto-mostrar wizard si el director no tiene ciclos configurados
          if (u.rol === 'director') {
            const token = localStorage.getItem("edusaas_token");
            fetch(apiUrl(`/api/academic/ciclos/${u.id_academia}`), { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(ciclos => { if (!Array.isArray(ciclos) || ciclos.length === 0) setMostrarWizard(true); })
              .catch(() => {});
          }
        })
        .catch(err => console.error("Error academy config:", err));
      }
    }
  }, [router]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setMostrarBuscador(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("edusaas_token");
    localStorage.removeItem("edusaas_user");
    router.push("/");
  };

  const getHeaders = () => {
    const token = localStorage.getItem("edusaas_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const handleThemeChange = () => {
    // Aquí esta la matemática que controla el conmutador de luz.
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  const enviarSugerencia = async () => {
    if(!formSugerencia.mensaje) return alert("Por favor escribe algo antes de enviar.");
    setEnviandoSugerencia(true);
    try {
      const token = localStorage.getItem('edusaas_token');
      const res = await fetch(apiUrl('/api/academic/sugerir'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formSugerencia)
      });
      if(res.ok) {
        alert("¡Gracias! Tu sugerencia ha sido enviada al equipo de Antigravity.");
        setModalSugerencia(false);
        setFormSugerencia({ mensaje: '', tipo: 'sugerencia' });
      }
    } catch(e) { alert("Error de conexión al enviar sugerencia."); }
    setEnviandoSugerencia(false);
  };

  if (!user) return <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 font-bold"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>Desencriptando Criptografía...</div>;

  // ===============================
  // VARIABLES DE MODO CAMALEÓN "DARK/LIGHT"
  // ===============================
  const isDark = theme === 'dark';
  const bgMain = isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-800";
  const bgSidebar = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const btnHover = isDark ? "hover:bg-slate-800/80" : "hover:bg-slate-100";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-900/80 border-slate-800/80 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm";
  const primaryColor = academyConfig?.color_primario || '#3b82f6';

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${bgMain}`}>
      
      <SidebarNav
        user={user}
        activeTab={activeTab}
        onTab={setActiveTab}
        isDark={isDark}
        textMuted={textMuted}
        btnHover={btnHover}
        bgSidebar={bgSidebar}
        academyConfig={academyConfig}
        onSugerencia={() => setModalSugerencia(true)}
        onLogout={handleLogout}
        onWizard={() => setMostrarWizard(true)}
        primaryColor={primaryColor}
      />

      {/* ÁREA PRINCIPAL FUNCIONAL */}
      <main className="flex-1 p-12 overflow-y-auto relative">
        <div className={`fixed top-[-10%] right-[-5%] w-[800px] h-[800px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-500/10'} rounded-full blur-3xl pointer-events-none transition-all`}></div>

        <header className={`flex justify-between items-center mb-12 pb-8 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'} relative z-10 transition-colors`}>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Monitor Operativo, {user.nombre}</h1>
            <p className={`${textMuted} font-medium`}>Clave Criptomográfica Autorizada: <span className={`font-mono text-[11px] font-bold px-2.5 py-1.5 rounded-md border ml-2 ${isDark ? 'bg-slate-900 text-purple-400 border-slate-800' : 'bg-slate-100 text-purple-600 border-slate-200'}`}>{user.id}</span></p>
          </div>
          
          <div className="flex gap-4 items-center">
            {user.rol !== 'alumno' && (
              <button onClick={() => setMostrarBuscador(true)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                title="Buscar (Ctrl+K)"
              >
                <span>🔍</span>
                <span className="hidden md:inline">Buscar</span>
                <kbd className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${isDark ? 'border-slate-700 text-slate-600 bg-slate-800' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>⌘K</kbd>
              </button>
            )}
            <Campana isDark={isDark} onNavegacion={setActiveTab} />
            {/* AQUÍ ESTÁ EL ENGRANAJE DEL BOTÓN DE SISTEMAS QUE QUERÍAS RECUPERAR */}
            <button onClick={handleThemeChange} className={`p-4 rounded-full border transition-all transform hover:scale-110 shadow-lg flex items-center justify-center ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} title="Conmutador de Entorno (Oscuro/Claro)">
               ⚙️
            </button>

            <span className="px-5 py-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-black uppercase tracking-widest flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> DB Segura
            </span>
          </div>
        </header>

        {/* =============================================== */}
        {/* PESTAÑA: RESUMEN GENÉRICO (POR DEFECTO) */}
        {/* =============================================== */}
        {activeTab === 'resumen' && user.rol === 'alumno' && (
          <PortalAlumno user={{...user, academyConfig}} isDark={isDark} cardBg={cardBg} textMuted={textMuted} />
        )}

        {activeTab === 'resumen' && !['alumno', 'director', 'secretaria'].includes(user.rol) && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. FILA DE MÉTRICAS (Solo para SuperAdmin) */}
            {user.rol === 'superadmin' && systemStats && (
              <section className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                {[
                  { label: 'Academias', val: systemStats.academias?.total || 0, icon: '🏢', col: 'blue' },
                  { label: 'Profesores', val: systemStats.usuarios?.profesor || 0, icon: '👨‍🏫', col: 'purple' },
                  { label: 'Alumnos', val: systemStats.usuarios?.alumno || 0, icon: '🎓', col: 'emerald' },
                  { label: 'Exámenes IA', val: systemStats.examenes_procesados || 0, icon: '📋', col: 'amber' },
                ].map((s, i) => (
                  <div key={i} className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                    <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${s.col}-500/10 rounded-full blur-2xl`}></div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted} mb-1`}>{s.icon} {s.label}</p>
                    <p className={`text-4xl font-black text-${s.col}-400 tracking-tighter`}>{s.val}</p>
                  </div>
                ))}
              </section>
            )}

            {/* 2. ESTATUS GENERAL */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              <div className={`p-8 rounded-3xl border relative overflow-hidden group transition-all ${cardBg}`}>
                <div className={`absolute top-0 right-0 w-40 h-40 ${isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'} rounded-full blur-2xl`}></div>
                <h3 className={`${textMuted} font-black uppercase tracking-widest text-[11px] mb-3`}>Estatus Motores</h3>
                <p className="text-4xl font-black tracking-tighter flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
                  Operativo
                </p>
              </div>
              <div className={`p-8 rounded-3xl border relative overflow-hidden group transition-all ${cardBg}`}>
                 <div className={`absolute top-0 right-0 w-40 h-40 ${isDark ? 'bg-purple-500/10' : 'bg-purple-500/5'} rounded-full blur-2xl`}></div>
                 <h3 className={`${textMuted} font-black uppercase tracking-widest text-[11px] mb-3`}>Jerarquía</h3>
                 <p className="text-4xl font-black capitalize tracking-tighter">{user.rol}</p>
              </div>
               <div className={`p-8 rounded-3xl border relative overflow-hidden group transition-all ${cardBg} lg:col-span-1`}>
                 <div className={`absolute top-0 right-0 w-40 h-40 ${isDark ? 'bg-amber-500/10' : 'bg-amber-500/5'} rounded-full blur-2xl`}></div>
                 <h3 className={`${textMuted} font-black uppercase tracking-widest text-[11px] mb-3`}>Entorno Concedido</h3>
                 <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 tracking-tighter">
                    {user.rol === 'superadmin' ? 'Software SaaS Central' : (user.academia || 'Docente Independiente')}
                 </p>
              </div>
            </section>
            
            {/* 3. PANEL DE BIENVENIDA / ACCIONES DIRECTAS */}
            <section className={`border rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center min-h-[350px] relative z-10 transition-colors ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                 <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform">
                    <span className="text-5xl">⚡</span>
                 </div>
                 <h2 className="text-4xl font-black mb-4 tracking-tight uppercase">Dashboard Operativo Listo</h2>
                 <p className={`${textMuted} font-medium max-w-2xl leading-relaxed text-base mb-10`}>
                     {user.rol === 'superadmin' 
                      ? 'Has ingresado al núcleo central del SaaS. Desde aquí puedes monitorear el pulso global. Para gestionar academias o crear usuarios, utiliza el "Centro de Control" en el panel lateral.'
                      : 'El motor de inteligencia artificial y el padrón de alumnos han sido calibrados. Selecciona una herramienta del menú lateral para comenzar.'}
                 </p>
                 
                 {user.rol === 'superadmin' && (
                    <button onClick={() => setActiveTab('admin')} className="px-10 py-4 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-300 transition-all shadow-xl flex items-center gap-3">
                       Ir al Centro de Control 🛡️
                    </button>
                 )}
            </section>
          </div>
        )}

        {/* =============================================== */}
        {/* PESTAÑA: PANEL ADMIN (SUPERADMIN) */}
        {/* =============================================== */}
        {activeTab === 'admin' && (
          <AdminPanel isDark={isDark} textMuted={textMuted} cardBg={cardBg} />
        )}

        {/* =============================================== */}
        {/* PESTAÑA: PANEL DE SOPORTE (HELP DESK TIER 1) */}
        {/* =============================================== */}
        {activeTab === 'soporte' && (
          <AdminPanel isDark={isDark} textMuted={textMuted} isSupportOnly={true} />
        )}

        {/* =============================================== */}
        {/* PESTAÑA: PADRÓN DE ALUMNOS (PROFESOR/SECRETARIA) */}
        {activeTab === 'alumnos' && (
          <GestionAlumnos isDark={isDark} textMuted={textMuted} academyConfig={academyConfig} />
        )}

        {/* =============================================== */}
        {/* PESTAÑA: CLAVES Y EXÁMENES (FASE 4.1 PLANTILLAS) */}
        {/* =============================================== */}
        {activeTab === 'plantillas' && (
           <PlantillasManager isDark={isDark} />
        )}

        {/* =============================================== */}
        {/* PESTAÑA: MARKETING (DIRECTOR) */}
        {/* =============================================== */}
        {activeTab === 'marketing' && (
           <MarketingPanel isDark={isDark} textMuted={textMuted} cardBg={cardBg} />
        )}

        {/* =============================================== */}
        {/* RESUMEN SECRETARIA (Home Operativo) */}
        {/* =============================================== */}
        {activeTab === 'resumen' && user.rol === 'secretaria' && (
           <HomeSecretaria isDark={isDark} textMuted={textMuted} cardBg={cardBg} />
        )}

        {/* =============================================== */}
        {/* DIRECTOR: REGLAS DE ALERTAS */}
        {/* =============================================== */}
        {activeTab === 'alertas' && user.rol === 'director' && (
           <ConfigAlertas isDark={isDark} textMuted={textMuted} cardBg={cardBg} />
        )}

        {/* =============================================== */}
        {/* PROFESOR: VISTA DE RIESGO DE SALÓN */}
        {/* =============================================== */}
        {activeTab === 'riesgo_salon' && (
           <VistaRiesgoSalon isDark={isDark} textMuted={textMuted} cardBg={cardBg} idSalon={user.id_salon || academyConfig?.salones?.[0]?.id_salon || null} />
        )}

        {/* =============================================== */}
        {/* SECRETARIA: WIZARD DE MATRÍCULA */}
        {/* =============================================== */}
        {activeTab === 'matricular' && (
           <MatriculaWizard isDark={isDark} textMuted={textMuted} cardBg={cardBg} academyConfig={academyConfig} />
        )}

        {/* =============================================== */}
        {/* ALUMNO: SIMULADOR DE INGRESO */}
        {/* =============================================== */}
        {activeTab === 'simulador' && user.rol === 'alumno' && (
           <SimuladorIngreso isDark={isDark} textMuted={textMuted} cardBg={cardBg} user={user} />
        )}

        {/* =============================================== */}
        {/* RESUMEN DIRECTOR (Dashboard Financiero) */}
        {/* =============================================== */}
        {activeTab === 'resumen' && user.rol === 'director' && (
           <DirectorResumen isDark={isDark} textMuted={textMuted} cardBg={cardBg} setActiveTab={setActiveTab} />
        )}

        {/* =============================================== */}
        {/* PESTAÑA: LECTOR INTELIGENCIA ARTIFICIAL (FASE 4) */}
        {/* =============================================== */}
        {activeTab === 'ia' && (
           <ScannerIA isDark={isDark} textMuted={textMuted} cardBg={cardBg} />
        )}

        {activeTab === 'bandeja_omr' && (
           <BandejaOMR isDark={isDark} textMuted={textMuted} cardBg={cardBg} user={user} />
        )}

        {/* PESTAÑA: COMUNIDAD & MATERIAL (NUEVO FASE 6) */}
        {activeTab === 'comunidad' && <MaterialDidactico user={user} isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'crm' && <CRM isDark={isDark} textMuted={textMuted} academyConfig={academyConfig} />}
        {activeTab === 'auditoria' && <AuditDashboard isDark={isDark} textMuted={textMuted} />}
        {activeTab === 'importar' && <ImportadorDatos isDark={isDark} textMuted={textMuted} academyConfig={academyConfig} />}
        {activeTab === 'asistencia' && <ControlAsistencia isDark={isDark} textMuted={textMuted} getHeaders={getHeaders} salones={academyConfig?.salones || []} />}
        {activeTab === 'pagos' && <GestionPagos isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'comunicados' && <ComunicadosMasivos isDark={isDark} textMuted={textMuted} cardBg={cardBg} user={user} />}
        {activeTab === 'mapa_calor' && <MapaCalorSalon isDark={isDark} textMuted={textMuted} cardBg={cardBg} user={user} />}
        {activeTab === 'documentos' && <ControlDocumentos isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'lista_espera' && <ListaEspera isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'analisis_preguntas' && <AnalisisPreguntas isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'calendario' && <CalendarioAcademico isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'portal_tutor' && <PortalTutor isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}
        {activeTab === 'portal_padre' && <PortalPadres isDark={isDark} textMuted={textMuted} />}
        {activeTab === 'salones' && <GestionSalones isDark={isDark} textMuted={textMuted} cardBg={cardBg} />}

      </main>



      {/* ========================================= */}
      {/* 💡 MODAL DE ENVÍO DE SUGERENCIAS */}
      {/* ========================================= */}
      {mostrarBuscador && (
        <BuscadorGlobal
          isDark={isDark}
          onNavigate={(tab) => { setActiveTab(tab); setMostrarBuscador(false); }}
          onClose={() => setMostrarBuscador(false)}
        />
      )}

      {mostrarWizard && (
        <OnboardingWizard
          user={user}
          isDark={isDark}
          onComplete={() => { setMostrarWizard(false); window.location.reload(); }}
        />
      )}

      {modalSugerencia && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-colors ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="font-extrabold text-xl font-sans">💡 Buzón de Sugerencias</h3>
              <button onClick={() => setModalSugerencia(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className={`text-sm ${textMuted}`}>¿Tienes alguna idea para mejorar la plataforma o encontraste un problema? Cuéntanoslo.</p>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Tipo de Mensaje</label>
                <div className="flex gap-2">
                  {['sugerencia', 'error', 'mejora'].map(t => (
                    <button key={t} onClick={() => setFormSugerencia({...formSugerencia, tipo: t})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formSugerencia.tipo === t ? 'bg-indigo-500 text-white border-indigo-600' : `border-slate-700 ${textMuted} hover:bg-slate-800 font-sans`}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>Mensaje *</label>
                <textarea value={formSugerencia.mensaje} onChange={e => setFormSugerencia({...formSugerencia, mensaje: e.target.value})} className={`w-full h-32 text-sm px-4 py-3 rounded-xl border outline-none resize-none transition-colors ${isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} placeholder="Escribe aquí tu comentario para el equipo de Antigravity..."></textarea>
              </div>
              <button onClick={enviarSugerencia} disabled={enviandoSugerencia} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[11px] font-sans">
                {enviandoSugerencia ? '📡 Enviando...' : '🚀 Enviar Retroalimentación'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

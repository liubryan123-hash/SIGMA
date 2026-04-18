"use client";
import { useState } from "react";
import { apiUrl } from "@/lib/api";

// ── NavItem: botón de navegación individual ──────────────────────────────────
function NavItem({ label, icon, tab, activeTab, onTab, activeColor, textMuted, btnHover }) {
  const isActive = activeTab === tab;
  return (
    <button
      onClick={() => onTab(tab)}
      className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        isActive ? `${activeColor} border shadow-inner` : `${textMuted} ${btnHover}`
      }`}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── NavGroup: sección colapsable con hijos ────────────────────────────────────
function NavGroup({ label, icon, defaultOpen = true, children, isDark, textMuted, btnHover }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${btnHover}`}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>{label}</span>
        </span>
        <span className={`text-[10px] transition-transform duration-200 ${textMuted} ${open ? "" : "-rotate-90"}`}>▾</span>
      </button>
      {open && (
        <div className={`ml-2 mt-0.5 space-y-0.5 border-l pl-3 ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── SidebarNav: componente principal del menú lateral ────────────────────────
export default function SidebarNav({
  user, activeTab, onTab,
  isDark, textMuted, btnHover, bgSidebar,
  academyConfig, onSugerencia, onLogout, onWizard, primaryColor,
}) {
  const rol = user?.rol;
  const idAcademia = user?.academia;
  
  // Leer permisos desde localStorage (configurados por superadmin)
  const permisos = (() => {
    try {
      const stored = localStorage.getItem("edusaas_permisos");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // Función helper para verificar si un rol tiene permiso para un módulo
  const tienePermiso = (modulo) => {
    // Si no hay permisos configurados, permitir todo (backward compatibility)
    if (!permisos) return true;
    // Si es superadmin, siempre tiene permiso
    if (rol === "superadmin") return true;
    // Verificar permisos para el rol actual
    const permisosRol = permisos[rol];
    if (!permisosRol) return true;
    return permisosRol[modulo] !== false;
  };

  // Determina si algún tab del grupo está activo (para abrir el grupo por defecto)
  const has = (...tabs) => tabs.includes(activeTab);

  // Colores activos reutilizables
  const C = {
    blue:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    indigo:  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    amber:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose:    "bg-rose-500/10 text-rose-400 border-rose-500/20",
    teal:    "bg-teal-500/10 text-teal-400 border-teal-500/20",
    sky:     "bg-sky-500/10 text-sky-400 border-sky-500/20",
    violet:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
    purple:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
    slate:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const ni = (label, icon, tab, color) => (
    <NavItem key={tab} label={label} icon={icon} tab={tab}
      activeTab={activeTab} onTab={onTab} activeColor={C[color]}
      textMuted={textMuted} btnHover={btnHover} />
  );

  return (
    <aside className={`w-72 border-r p-6 flex flex-col shadow-2xl z-20 transition-colors duration-500 ${bgSidebar}`}>

      {/* ── Logo + Academia ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-10">
        {academyConfig?.logo_url ? (
          <img src={academyConfig.logo_url} alt={academyConfig.nombre}
            className="w-12 h-12 rounded-xl object-cover shadow-lg border border-slate-700/50 flex-shrink-0" />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg border border-slate-700/50 text-white flex-shrink-0"
            style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
          >
            {rol === "superadmin" ? "⚡" : (academyConfig?.nombre?.substring(0, 2).toUpperCase() || "?")}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-extrabold text-base leading-tight truncate" style={{ color: primaryColor }}>
            {rol === "superadmin" ? "SIGMA Global" : (academyConfig?.nombre || "...")}
          </h2>
          <p className={`text-[10px] uppercase font-black tracking-widest ${textMuted}`}>{rol}</p>
        </div>
      </div>

      {/* ── Navegación por rol ───────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">

        {/* ═══════════════ SUPERADMIN ═══════════════ */}
        {rol === "superadmin" && (<>
          {ni("Resumen Global", "📊", "resumen", "blue")}

          <NavGroup label="Gobernanza" icon="🛡️" defaultOpen={has("admin", "auditoria")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
            {ni("Centro de Control", "🛡️", "admin", "indigo")}
            {ni("Auditoría", "🔐", "auditoria", "rose")}
          </NavGroup>

          <NavGroup label="Ventas" icon="📈" defaultOpen={has("crm")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
            {ni("CRM Ventas", "📈", "crm", "blue")}
          </NavGroup>

          {ni("Mesa de Ayuda", "🎧", "soporte", "amber")}

          <a href={apiUrl("/sandbox.html")} target="_blank"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-rose-500 hover:text-rose-400 hover:bg-rose-900/10 border border-rose-500/10">
            <span>🧪</span><span>Laboratorio Dev</span>
          </a>
        </>)}

        {/* ═══════════════ ADMIN / SOPORTE ═══════════════ */}
        {(rol === "admin" || rol === "admin_soporte") &&
          ni("Mesa de Ayuda", "🎧", "soporte", "amber")
        }

        {/* ═══════════════ DIRECTOR ═══════════════ */}
        {rol === "director" && (<>
          {ni("Mi Academia", "📊", "resumen", "emerald")}

          {tienePermiso("academico") && (
            <NavGroup label="Académico" icon="🎓" defaultOpen={has("alumnos", "salones", "mapa_calor", "analisis_preguntas", "calendario")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Gestión de Alumnos", "👥", "alumnos", "sky")}
              {ni("Gestión de Salones", "🏫", "salones", "emerald")}
              {ni("Mapa de Calor", "🌡️", "mapa_calor", "rose")}
              {ni("Análisis por Pregunta", "🔬", "analisis_preguntas", "indigo")}
              {ni("Calendario", "📅", "calendario", "teal")}
            </NavGroup>
          )}

          {tienePermiso("crecimiento") && (
            <NavGroup label="Crecimiento" icon="🚀" defaultOpen={has("crm", "marketing")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("CRM Ventas", "📈", "crm", "blue")}
              {ni("Servicios Marketing", "🎯", "marketing", "indigo")}
            </NavGroup>
          )}

          {tienePermiso("herramientas") && (
            <NavGroup label="Herramientas" icon="🔧" defaultOpen={has("comunicados", "importar")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Comunicados", "📢", "comunicados", "indigo")}
              {ni("Migración de Datos", "📥", "importar", "emerald")}
            </NavGroup>
          )}

          {tienePermiso("configurar") && (
            <NavGroup label="Configuración" icon="⚙️" defaultOpen={has("alertas")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Reglas de Alertas", "🔔", "alertas", "rose")}
            </NavGroup>
          )}

          {tienePermiso("configurar") && (
            <button onClick={onWizard}
              className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? "text-slate-600 hover:bg-slate-800 hover:text-slate-400" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"}`}>
              <span className="w-5 text-center">⚙️</span><span>Configurar Academia</span>
            </button>
          )}
        </>)}

        {/* ═══════════════ SECRETARIA ═══════════════ */}
        {rol === "secretaria" && (<>
          {ni("Inicio", "🏠", "resumen", "slate")}

          {tienePermiso("finanzas") && (
            <NavGroup label="Caja y Pagos" icon="💵" defaultOpen={has("pagos", "lista_espera")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Pagos y Boletas", "💰", "pagos", "emerald")}
              {ni("Lista de Espera", "🕐", "lista_espera", "violet")}
            </NavGroup>
          )}

          {tienePermiso("alumnado") && (
            <NavGroup label="Alumnado" icon="🗂️" defaultOpen={has("alumnos", "documentos", "matricular")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Gestión de Alumnos", "👥", "alumnos", "blue")}
              {ni("Asistente Matrícula", "✨", "matricular", "indigo")}
              {ni("Documentos", "📁", "documentos", "teal")}
            </NavGroup>
          )}

          {tienePermiso("comunicacion") && (
            <NavGroup label="Comunicación" icon="📢" defaultOpen={has("comunicados", "marketing")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Comunicados", "📢", "comunicados", "indigo")}
              {ni("Servicios Marketing", "🚀", "marketing", "indigo")}
            </NavGroup>
          )}

          {tienePermiso("recursos") && (
            <NavGroup label="Recursos" icon="📚" defaultOpen={has("comunidad", "calendario")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Recursos / Comunidad", "📚", "comunidad", "slate")}
              {ni("Calendario", "📅", "calendario", "teal")}
            </NavGroup>
          )}
        </>)}

        {/* ═══════════════ PROFESOR ═══════════════ */}
        {rol === "profesor" && (<>
          {tienePermiso("salon") && (
            <NavGroup label="Mi Salón" icon="🏫" defaultOpen={has("alumnos", "asistencia", "mapa_calor", "riesgo_salon")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Padrón de Alumnos", "👥", "alumnos", "sky")}
              {ni("Riesgo Académico", "⚠️", "riesgo_salon", "rose")}
              {ni("Control de Asistencia", "✅", "asistencia", "emerald")}
              {ni("Mapa de Calor", "🌡️", "mapa_calor", "rose")}
            </NavGroup>
          )}

          {tienePermiso("evaluaciones") && (
            <NavGroup label="Evaluaciones & OMR" icon="📝" defaultOpen={has("plantillas", "bandeja_omr", "ia")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Modelos de Evaluación", "📋", "plantillas", "amber")}
              {ni("Bandeja OMR", "📷", "bandeja_omr", "amber")}
              {ni("Scanner IA", "🤖", "ia", "purple")}
            </NavGroup>
          )}

          {tienePermiso("comunicacion") && (
            <NavGroup label="Comunicación" icon="📢" defaultOpen={has("comunicados")} isDark={isDark} textMuted={textMuted} btnHover={btnHover}>
              {ni("Comunicados", "📢", "comunicados", "indigo")}
            </NavGroup>
          )}
        </>)}

        {/* ═══════════════ ALUMNO ═══════════════ */}
        {rol === "alumno" && (<>
          {ni("Mi Progreso", "🏠", "resumen", "blue")}
          {ni("Simulador Ingreso", "🎯", "simulador", "emerald")}
          {ni("Aula Virtual", "📚", "comunidad", "blue")}
          {user.academia && (
            <div className={`mt-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${textMuted} border ${isDark ? "border-slate-800/50 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
              <span className="opacity-50 block mb-1">Academia</span>
              <span className="text-blue-400">{user.academia}</span>
            </div>
          )}
        </>)}

        {/* ═══════════════ TUTOR ═══════════════ */}
        {rol === "tutor" && (<>
          {ni("Mis Alumnos", "👨‍👩‍👧", "portal_tutor", "teal")}
          {ni("Biblioteca Digital", "📚", "comunidad", "blue")}
        </>)}

        {/* ═══════════════ PADRE ═══════════════ */}
        {rol === "padre" && (
          ni("Mi Hijo/a", "👨‍👩‍👧", "portal_padre", "sky")
        )}

      </nav>

      {/* ── Acciones inferiores ──────────────────────────────────────────── */}
      <div className={`mt-6 pt-4 space-y-2 border-t ${isDark ? "border-slate-800/50" : "border-slate-200"}`}>
        {rol !== "superadmin" && (
          <button onClick={onSugerencia}
            className={`w-full px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 justify-center border shadow-lg ${isDark ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30" : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"}`}>
            <span>💡</span> Enviar Sugerencia
          </button>
        )}
        <button onClick={onLogout}
          className={`w-full px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 justify-center border ${isDark ? "bg-slate-900 text-slate-500 border-slate-800 hover:text-red-400 hover:border-red-500/30" : "bg-slate-50 text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-200"}`}>
          <span>🔒</span> Cerrar Identidad HTTP
        </button>
      </div>
    </aside>
  );
}

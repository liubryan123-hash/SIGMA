"use client";
import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const h = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("edusaas_token")}`,
});

export default function GestionSalones({ isDark, textMuted, cardBg }) {
  const user = JSON.parse(localStorage.getItem("edusaas_user") || "{}");
  const idAcademia = user.id_academia;

  const [salones, setSalones]         = useState([]);
  const [ciclos,  setCiclos]          = useState([]);
  const [loading, setLoading]         = useState(true);

  // Salón seleccionado para ver alumnos
  const [salonSeleccionado, setSalonSeleccionado] = useState(null);
  const [alumnos,           setAlumnos]           = useState([]);
  const [loadingAlumnos,    setLoadingAlumnos]     = useState(false);

  // Transferir alumno
  const [transfModal,    setTransfModal]    = useState(false);
  const [alumnoTransf,   setAlumnoTransf]   = useState(null);
  const [salonDestino,   setSalonDestino]   = useState("");
  const [transfiriendo,  setTransfiriendo]  = useState(false);

  // Crear salón
  const [crearModal, setCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCiclo,  setNuevoCiclo]  = useState("");
  const [creando,     setCreando]     = useState(false);

  // Renombrar salón
  const [renomModal,    setRenomModal]    = useState(false);
  const [renomSalon,    setRenomSalon]    = useState(null);
  const [renomNombre,   setRenomNombre]   = useState("");
  const [renombrando,   setRenombrando]   = useState(false);

  // Eliminar
  const [eliminando, setEliminando] = useState(null);

  const panel = isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200";

  const cargarSalones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/salones/academia/${idAcademia}/stats`), { headers: h() });
      if (res.ok) setSalones(await res.json());
    } finally {
      setLoading(false);
    }
  }, [idAcademia]);

  const cargarCiclos = useCallback(async () => {
    const res = await fetch(apiUrl(`/api/academic/ciclos/${idAcademia}`), { headers: h() });
    if (res.ok) setCiclos(await res.json());
  }, [idAcademia]);

  useEffect(() => { cargarSalones(); cargarCiclos(); }, [cargarSalones, cargarCiclos]);

  const cargarAlumnos = async (salon) => {
    setSalonSeleccionado(salon);
    setLoadingAlumnos(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/salones/${salon.id_salon}/alumnos`), { headers: h() });
      if (res.ok) setAlumnos(await res.json());
    } finally {
      setLoadingAlumnos(false);
    }
  };

  const crearSalon = async () => {
    if (!nuevoNombre.trim() || !nuevoCiclo) return alert("Completa nombre y ciclo.");
    setCreando(true);
    try {
      const res = await fetch(apiUrl("/api/academic/salones"), {
        method: "POST", headers: h(),
        body: JSON.stringify({ nombre_salon: nuevoNombre.trim(), id_ciclo: nuevoCiclo }),
      });
      const data = await res.json();
      if (res.ok) { setCrearModal(false); setNuevoNombre(""); setNuevoCiclo(""); cargarSalones(); }
      else alert(data.error || "Error creando salón.");
    } finally { setCreando(false); }
  };

  const renombrarSalon = async () => {
    if (!renomNombre.trim()) return;
    setRenombrando(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/salones/${renomSalon.id_salon}`), {
        method: "PUT", headers: h(),
        body: JSON.stringify({ nombre_salon: renomNombre.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setRenomModal(false); cargarSalones(); if (salonSeleccionado?.id_salon === renomSalon.id_salon) setSalonSeleccionado({ ...salonSeleccionado, nombre_salon: renomNombre.trim() }); }
      else alert(data.error);
    } finally { setRenombrando(false); }
  };

  const eliminarSalon = async (salon) => {
    if (!confirm(`¿Eliminar el salón "${salon.nombre_salon}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(salon.id_salon);
    try {
      const res = await fetch(apiUrl(`/api/academic/salones/${salon.id_salon}`), { method: "DELETE", headers: h() });
      const data = await res.json();
      if (res.ok) { if (salonSeleccionado?.id_salon === salon.id_salon) setSalonSeleccionado(null); cargarSalones(); }
      else alert(data.error);
    } finally { setEliminando(null); }
  };

  const transferirAlumno = async () => {
    if (!salonDestino) return alert("Selecciona el salón destino.");
    setTransfiriendo(true);
    try {
      const res = await fetch(apiUrl(`/api/academic/alumnos/${alumnoTransf.id_usuario}/salon`), {
        method: "PUT", headers: h(),
        body: JSON.stringify({ id_salon_destino: salonDestino }),
      });
      const data = await res.json();
      if (res.ok) {
        setTransfModal(false); setSalonDestino("");
        // Recargar lista de alumnos del salón actual
        cargarAlumnos(salonSeleccionado);
      } else alert(data.error);
    } finally { setTransfiriendo(false); }
  };

  // Agrupar salones por ciclo
  const porCiclo = salones.reduce((acc, s) => {
    if (!acc[s.id_ciclo]) acc[s.id_ciclo] = { nombre: s.nombre_ciclo, salones: [] };
    acc[s.id_ciclo].salones.push(s);
    return acc;
  }, {});

  return (
    <section className="relative z-10 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">Gestión de Salones</h2>
          <p className={`text-sm ${textMuted}`}>Crea, renombra, elimina y transfiere alumnos entre salones.</p>
        </div>
        <button
          onClick={() => setCrearModal(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all"
        >
          + Nuevo Salón
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Lista de ciclos / salones */}
          <div className="space-y-6">
            {Object.keys(porCiclo).length === 0 && (
              <div className={`rounded-2xl border border-dashed p-12 text-center ${isDark ? "border-slate-700 text-slate-500" : "border-slate-300 text-slate-400"}`}>
                <p className="text-4xl mb-3">🏫</p>
                <p className="font-bold">No hay salones creados aún.</p>
                <p className="text-sm mt-1">Usa el botón "Nuevo Salón" para comenzar.</p>
              </div>
            )}
            {Object.entries(porCiclo).map(([idCiclo, grupo]) => (
              <div key={idCiclo} className={`rounded-2xl border ${panel} overflow-hidden`}>
                <div className={`px-5 py-3 border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Ciclo</span>
                  <h3 className="font-extrabold text-base">{grupo.nombre}</h3>
                </div>
                <div className="divide-y divide-slate-800/30">
                  {grupo.salones.map((s) => {
                    const activo = salonSeleccionado?.id_salon === s.id_salon;
                    return (
                      <div key={s.id_salon} className={`flex items-center justify-between px-5 py-4 transition-all ${activo ? (isDark ? "bg-blue-500/10" : "bg-blue-50") : ""}`}>
                        <button
                          onClick={() => activo ? setSalonSeleccionado(null) : cargarAlumnos(s)}
                          className="flex-1 text-left"
                        >
                          <p className="font-bold">{s.nombre_salon}</p>
                          <p className={`text-xs ${textMuted}`}>{s.total_alumnos} alumno{s.total_alumnos !== 1 ? "s" : ""}</p>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setRenomSalon(s); setRenomNombre(s.nombre_salon); setRenomModal(true); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
                          >
                            ✏️ Renombrar
                          </button>
                          <button
                            onClick={() => eliminarSalon(s)}
                            disabled={eliminando === s.id_salon}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                          >
                            {eliminando === s.id_salon ? "..." : "🗑️ Eliminar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panel de alumnos del salón seleccionado */}
          <div className={`rounded-2xl border ${panel} overflow-hidden h-fit`}>
            {!salonSeleccionado ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">👥</p>
                <p className={`text-sm font-bold ${textMuted}`}>Selecciona un salón para ver sus alumnos.</p>
              </div>
            ) : (
              <>
                <div className={`px-5 py-3 border-b ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Alumnos de</span>
                  <h3 className="font-extrabold">{salonSeleccionado.nombre_salon}</h3>
                </div>
                {loadingAlumnos ? (
                  <div className="p-8 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
                  </div>
                ) : alumnos.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className={`text-sm ${textMuted}`}>Sin alumnos asignados.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/30 max-h-[500px] overflow-y-auto">
                    {alumnos.map((a) => (
                      <div key={a.id_usuario} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-bold text-sm">{a.nombre_completo}</p>
                          {a.email && <p className={`text-xs ${textMuted}`}>{a.email}</p>}
                        </div>
                        <button
                          onClick={() => { setAlumnoTransf(a); setSalonDestino(""); setTransfModal(true); }}
                          className="text-xs font-bold text-teal-400 hover:text-teal-300 px-2 py-1 rounded-lg hover:bg-teal-500/10 transition-all"
                        >
                          ↔ Transferir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Crear salón ──────────────────────────────────────────── */}
      {crearModal && (
        <Modal title="Nuevo Salón" onClose={() => setCrearModal(false)} isDark={isDark}>
          <div className="space-y-4">
            <Field label="Ciclo" isDark={isDark} textMuted={textMuted}>
              <select value={nuevoCiclo} onChange={e => setNuevoCiclo(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-200"}`}>
                <option value="">— Selecciona un ciclo —</option>
                {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.nombre_ciclo}</option>)}
              </select>
            </Field>
            <Field label="Nombre del salón" isDark={isDark} textMuted={textMuted}>
              <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Ej: Salón A, Grupo Medicina, Pre-Uni 2025..."
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-200"}`} />
            </Field>
            <button onClick={crearSalon} disabled={creando}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all disabled:opacity-50">
              {creando ? "Creando..." : "Crear Salón"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Renombrar salón ───────────────────────────────────────── */}
      {renomModal && renomSalon && (
        <Modal title={`Renombrar: ${renomSalon.nombre_salon}`} onClose={() => setRenomModal(false)} isDark={isDark}>
          <div className="space-y-4">
            <Field label="Nuevo nombre" isDark={isDark} textMuted={textMuted}>
              <input value={renomNombre} onChange={e => setRenomNombre(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-200"}`} />
            </Field>
            <button onClick={renombrarSalon} disabled={renombrando}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all disabled:opacity-50">
              {renombrando ? "Guardando..." : "Guardar Nombre"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Transferir alumno ─────────────────────────────────────── */}
      {transfModal && alumnoTransf && (
        <Modal title={`Transferir: ${alumnoTransf.nombre_completo}`} onClose={() => setTransfModal(false)} isDark={isDark}>
          <div className="space-y-4">
            <p className={`text-sm ${textMuted}`}>
              Actualmente en: <span className="font-bold">{salonSeleccionado?.nombre_salon}</span>
            </p>
            <Field label="Salón destino" isDark={isDark} textMuted={textMuted}>
              <select value={salonDestino} onChange={e => setSalonDestino(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-200"}`}>
                <option value="">— Selecciona destino —</option>
                {salones.filter(s => s.id_salon !== salonSeleccionado?.id_salon).map(s => (
                  <option key={s.id_salon} value={s.id_salon}>{s.nombre_ciclo} → {s.nombre_salon}</option>
                ))}
              </select>
            </Field>
            <button onClick={transferirAlumno} disabled={transfiriendo}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm transition-all disabled:opacity-50">
              {transfiriendo ? "Transfiriendo..." : "Confirmar Transferencia"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Modal({ title, onClose, children, isDark }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center font-black transition-all">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, isDark, textMuted }) {
  return (
    <div>
      <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${textMuted}`}>{label}</label>
      {children}
    </div>
  );
}

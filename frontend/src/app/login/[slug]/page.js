"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiUrl } from "@/lib/api";

export default function AcademyLogin() {
  const { slug } = useParams();
  const router = useRouter();

  const [academyData, setAcademyData] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch(apiUrl(`/api/public/academias/${slug}`));
        if (res.ok) {
          const data = await res.json();
          setAcademyData(data);
        } else {
          setError("404: El subdominio de la academia no existe o esta desactivado.");
        }
      } catch {
        setError("Error de conexion con el servidor central SaaS.");
      } finally {
        setLoadingConfig(false);
      }
    }

    if (slug) loadBranding();
  }, [slug]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas");
      } else {
        if (
          data.user_info.rol !== "superadmin" &&
          data.user_info.academia !== academyData.id_academia
        ) {
          setError(
            `Tu usuario no pertenece a esta sede. Academia detectada: ${data.user_info.academia}`
          );
          setLoading(false);
          return;
        }

        localStorage.setItem("edusaas_token", data.token);
        localStorage.setItem("edusaas_user", JSON.stringify(data.user_info));
        // Guardar permisos de la academia (para enforcement en sidebar)
        if (data.permisos_roles) {
          localStorage.setItem("edusaas_permisos", JSON.stringify(data.permisos_roles));
        }
        alert(`Validacion exitosa. Entrando a la intranet de ${academyData.nombre}...`);
        router.push("/dashboard");
      }
    } catch {
      setError("Fallo conectando con el backend.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center text-white flex-col gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse">Armando el portal web de la sede educativa...</p>
      </div>
    );
  }

  if (!academyData) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center font-bold text-red-400 text-xl border-t-4 border-red-500">
        {error}
      </div>
    );
  }

  const primaryColor = academyData.brand_primary_color || "#3b82f6";
  const isDark = academyData.dark_mode_enabled;

  return (
    <main
      className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}
    >
      <div
        className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"
        style={{ backgroundColor: primaryColor, transition: "background 0.5s" }}
      ></div>
      <div
        className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-40"
        style={{
          backgroundColor: primaryColor,
          transition: "background 0.5s",
          animationDuration: "4s",
        }}
      ></div>

      <div
        className={`relative ${isDark ? "bg-slate-900/80 text-white" : "bg-white/80 text-slate-800"} backdrop-blur-xl p-10 rounded-2xl shadow-2xl border w-full max-w-md z-10`}
        style={{
          borderColor: `${primaryColor}60`,
          boxShadow: `0 20px 25px -5px ${primaryColor}20`,
        }}
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 shadow-lg text-white font-black text-2xl tracking-tighter"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 4px 10px ${primaryColor}60`,
            }}
          >
            {academyData.nombre.substring(0, 2).toUpperCase()}
          </div>

          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: isDark ? "white" : "#1e293b" }}
          >
            {academyData.nombre}
          </h1>
          <p className="text-sm mt-1.5 opacity-60 font-medium">
            Sistema virtual para docentes y alumnado
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-xl text-sm text-center font-bold">
              {error}
            </div>
          )}

          <div className="group">
            <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5 ml-1 opacity-50">
              Email del Estudiante
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-5 py-3.5 rounded-xl outline-none transition-all shadow-inner ${isDark ? "bg-slate-950/60 border-slate-700 text-white" : "bg-slate-100/50 border-slate-200 text-slate-800"}`}
              style={{ borderBottom: `3px solid ${primaryColor}40` }}
              onFocus={(e) => (e.target.style.borderColor = primaryColor)}
              onBlur={(e) => (e.target.style.borderColor = `${primaryColor}40`)}
              placeholder="alumno@academia.com"
              required
            />
          </div>

          <div className="group">
            <label className="block text-[11px] font-black uppercase tracking-widest mb-1.5 ml-1 opacity-50">
              Clave Restringida
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-5 py-3.5 rounded-xl outline-none transition-all shadow-inner tracking-widest ${isDark ? "bg-slate-950/60 border-slate-700 text-white" : "bg-slate-100/50 border-slate-200 text-slate-800"}`}
              style={{ borderBottom: `3px solid ${primaryColor}40` }}
              onFocus={(e) => (e.target.style.borderColor = primaryColor)}
              onBlur={(e) => (e.target.style.borderColor = `${primaryColor}40`)}
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-black py-4 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 10px 15px -3px ${primaryColor}40`,
            }}
          >
            {loading ? "Validando acceso..." : `INGRESAR A ${academyData.slug.toUpperCase()}`}
          </button>
        </form>
      </div>

      <p
        className="text-[10px] mt-10 opacity-40 font-bold uppercase tracking-widest z-10"
        style={{ color: isDark ? "white" : "black" }}
      >
        Powered by Bryan | LB System
      </p>
    </main>
  );
}

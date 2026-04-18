"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        localStorage.setItem("edusaas_token", data.token);
        localStorage.setItem("edusaas_user", JSON.stringify(data.user_info));
        // Guardar permisos para que SidebarNav filtre el menú correctamente
        if (data.permisos_roles) {
          localStorage.setItem("edusaas_permisos", JSON.stringify(data.permisos_roles));
        } else {
          localStorage.removeItem("edusaas_permisos");
        }
        alert("Acceso concedido. Bienvenido/a " + data.user_info.nombre);
        router.push("/dashboard");
      }
    } catch {
      setError("No se detecto el backend. Verifica si esta encendido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bryan_alley_graffiti.png')" }}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"></div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>

      <div className="relative bg-slate-900/60 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-md z-10 transition-all hover:border-slate-600/80">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3 tracking-tighter">
            LB System
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Ingresa tus credenciales para acceder al portal administrativo.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm text-center font-medium shadow-inner">
              {error}
            </div>
          )}

          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Correo Electronico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 text-white px-5 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
              placeholder="admin@imperio.com"
              required
            />
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Llave de Acceso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 text-white px-5 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 shadow-inner tracking-widest"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
          >
            {loading ? "Validando acceso..." : "INGRESAR AL SISTEMA"}
          </button>
        </form>
      </div>

      <p className="text-slate-500 text-[10px] mt-10 font-bold uppercase tracking-widest z-10">
        Powered by Bryan | LB System &copy; 2026
      </p>
    </main>
  );
}

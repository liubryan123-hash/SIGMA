/**
 * Configuración de la URL base para llamadas a la API
 * 
 * Usa la variable de entorno NEXT_PUBLIC_API_URL si está definida.
 * Si no, detecta automáticamente el entorno:
 * - En navegador: usa la ruta relativa '/api' (útil con proxy en producción)
 * - En servidor (SSR): usa http://localhost:3000 como fallback
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:3000');

/**
 * Construye la URL completa para una ruta de la API
 * @param {string} path - Ruta de la API (ej: '/api/auth/login')
 * @returns {string} URL completa
 */
export function apiUrl(path) {
  // Si usamos ruta relativa (producción con proxy), eliminar el slash inicial
  if (API_BASE_URL === '/api') {
    return `/api${path.replace(/^\/api/, '')}`;
  }
  return `${API_BASE_URL}${path}`;
}

export { API_BASE_URL };

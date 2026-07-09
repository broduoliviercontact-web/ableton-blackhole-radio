// Base URL du backend. En dev : vide (Vite proxye /api vers localhost:3001).
// En prod : VITE_API_BASE (ex: https://ableton-blackhole-radio.onrender.com).
// On retire tout slash final pour éviter un double slash (`//api/token`)
// quand la variable d'env contient un trailing slash.
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
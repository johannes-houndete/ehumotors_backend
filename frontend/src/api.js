/**
 * Utilitaire centralisé pour les appels API.
 * En développement : utilise le proxy Vite (URL relative /api/...)
 * En production (Vercel) : utilise VITE_API_URL défini dans les variables d'environnement Vercel
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Construit l'URL complète vers le backend.
 * @param {string} path - Le chemin relatif, ex: "/api/auth/login/"
 * @returns {string} - L'URL complète
 */
export const apiUrl = (path) => `${API_BASE}${path}`;

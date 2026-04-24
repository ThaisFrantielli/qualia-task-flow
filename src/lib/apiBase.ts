/**
 * Returns the base URL for API calls.
 * In local dev, Vite proxy handles /api → Vercel. 
 * In Lovable preview (or any non-localhost), we need the full Vercel URL.
 */
export function getApiBaseUrl(): string {
  // If running on localhost, Vite proxy is active
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return import.meta.env.VITE_API_TARGET || 'http://localhost:3001';
  }
  // In production Vercel deployment, relative paths work
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return '';
  }
  // Lovable preview or other environments — call Vercel directly
  return import.meta.env.VITE_API_TARGET || 'https://qualityconecta.vercel.app';
}

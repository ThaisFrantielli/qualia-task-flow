/**
 * Returns the base URL for API calls.
 * In local dev, use relative /api so Vite proxy can choose local API or Vercel fallback.
 * In Lovable preview (or any non-localhost), we need the full Vercel URL.
 */
export function getApiBaseUrl(): string {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  // In local dev, always use relative path and let Vite proxy route /api.
  if (isLocalhost) {
    return '';
  }

  // In production Vercel deployment, relative paths work
  if (hostname.includes('vercel.app')) {
    return '';
  }

  // Lovable preview or other environments — call Vercel directly
  return import.meta.env.VITE_API_TARGET || 'https://qualityconecta.vercel.app';
}

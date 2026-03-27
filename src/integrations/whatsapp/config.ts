// Centralized WhatsApp integration configuration
export const WHATSAPP = {
  // Default local service URL. Override with VITE_WHATSAPP_SERVICE_URL if needed.
  SERVICE_URL: (import.meta as any).env?.VITE_WHATSAPP_SERVICE_URL ?? 'http://localhost:3006',

  // Supabase Edge Function name for sending messages
  EDGE_FUNCTION_NAME: 'whatsapp-send',

  // Toggle to prefer Edge Function over direct service call
  USE_EDGE_FUNCTION: ((import.meta as any).env?.VITE_WHATSAPP_USE_EDGE ?? 'false') === 'true',

  // UI status polling interval
  STATUS_POLL_INTERVAL_MS: Number((import.meta as any).env?.VITE_WHATSAPP_STATUS_POLL_MS ?? 10000),

  // Toggle verbose console logs
  DEBUG_LOGS: false,
};

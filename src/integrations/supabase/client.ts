// src/integrations/supabase/client.ts

import { createClient } from '@supabase/supabase-js';
// Tipos gerados foram atualizados e devem ser usados gradualmente por módulo.
// Mantemos o cliente com generic permissivo para não quebrar centenas de
// chamadas legadas durante a migração de tipagem.

const supabaseUrl = "https://apqrjkobktjcyrxhqwtm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw";

const isTestEnvironment = process.env.NODE_ENV === 'test';

const storage = isTestEnvironment
  ? {
      getItem: async (_key: string) => null,
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
      clear: async () => {},
    }
  : localStorage;

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    // Timeout por tentativa (ms)
    timeout: 10_000,
    // Backoff exponencial com cap em 60 s para evitar loop agressivo de reconexão
    reconnectAfterMs: (tries: number) => Math.min(1000 * 2 ** tries, 60_000),
  },
});
// src/integrations/supabase/client.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

// As chaves do seu arquivo .env foram colocadas diretamente aqui.
const supabaseUrl = "https://apqrjkobktjcyrxhqwtm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzIıNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
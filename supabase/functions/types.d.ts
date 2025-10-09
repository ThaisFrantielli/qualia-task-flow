// Global types for Supabase Edge Functions
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  }
}

// Module declarations for external dependencies
declare module "https://deno.land/std@0.208.0/http/server.ts" {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export function createClient(supabaseUrl: string, supabaseKey: string): any;
}

export {};
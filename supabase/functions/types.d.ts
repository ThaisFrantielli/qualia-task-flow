// Global type definitions for Supabase Edge Functions

declare namespace Deno {
  export interface Env {
    [key: string]: string | undefined;
  }
}

// Supabase Edge Runtime types
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

// Request/Response types
declare global {
  interface Request {
    json(): Promise<any>;
  }
  
  interface Response {
    json(data: any, init?: ResponseInit): Response;
  }
}

export {};
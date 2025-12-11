// Global type definitions for Supabase Edge Functions

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }

  export const env: Env;
}

// Supabase Edge Runtime types
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module 'https://deno.land/std@0.208.0/http/server.ts' {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

// Request/Response types
declare global {
  interface Request {
    json(): Promise<any>;
  }
}

export { };

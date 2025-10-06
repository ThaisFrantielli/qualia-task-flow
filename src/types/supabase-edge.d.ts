//=============================================================================
// Este arquivo contém tipos para as funções Edge do Supabase usando Deno
// Necessário para corrigir erros TypeScript em ambientes não-Deno
//=============================================================================

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  
  export const env: Env;
}

// Interface para objetos de requisição/resposta compatíveis com Deno
declare interface DenoRequest extends Request {
  json(): Promise<any>;
}

declare interface EdgeFunctionResponse extends Response {
  json(): Promise<any>;
}

// Definição do método serve para compatibilidade TypeScript
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (request: DenoRequest) => Promise<Response>
  ): void;
}
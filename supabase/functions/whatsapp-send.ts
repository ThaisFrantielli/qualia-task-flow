// @deno-types="npm:@types/node"
// TypeScript running locally cannot resolve Deno std types; ignore the next import for the local typechecker.
// @ts-ignore: Deno std import used only in Edge runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Typings: treat req as Request to avoid implicit any in TypeScript checker
serve(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const { phoneNumber, message } = body as { phoneNumber?: string; message?: string };
  // Support both Deno (Edge) and local Node env - prefer Deno.env when available
  // @ts-ignore - Deno is only available in Edge runtime
  const SUPABASE_URL = (typeof Deno !== 'undefined' && Deno.env?.get) ? Deno.env.get('SUPABASE_URL') : process.env.SUPABASE_URL;
  // @ts-ignore - Deno is only available in Edge runtime
  const SUPABASE_KEY = (typeof Deno !== 'undefined' && Deno.env?.get) ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

  // TODO: Integrar com serviço externo para envio real via WhatsApp
  // Exemplo: await sendWhatsAppMessage(phoneNumber, message);

  // Registrar mensagem no banco
  const { error } = await supabase.from('whatsapp_messages').insert({
    conversation_id: null, // Definir lógica de conversa
    sender: 'system',
    body: message,
    created_at: new Date().toISOString(),
  });

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

// @ts-ignore - Deno edge function runtime
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
// @ts-ignore - Supabase client import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// Deno global for edge functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { conversationId, content, messageType = 'text' } = await req.json()

    if (!conversationId || !content) {
      return new Response(
        JSON.stringify({ error: 'conversationId and content are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Sending WhatsApp message:', { conversationId, content })

    // Buscar informações da conversação
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('customer_phone, whatsapp_number')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Conversation not found:', convError)
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Enviar mensagem para o serviço WhatsApp local
    const WHATSAPP_SERVICE_URL = 'http://localhost:3005'
    
    const sendResponse = await fetch(`${WHATSAPP_SERVICE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: conversation.customer_phone,
        message: content
      })
    })

    if (!sendResponse.ok) {
      throw new Error('Failed to send message via WhatsApp service')
    }

    // Salvar mensagem no banco de dados
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'user',
        sender_phone: conversation.whatsapp_number,
        content: content,
        message_type: messageType,
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      throw messageError
    }

    // Atualizar última mensagem da conversação
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        data: message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

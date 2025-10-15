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

    console.log('=== WhatsApp Send Debug ===')
    console.log('ConversationId:', conversationId)
    console.log('Content:', content)
    console.log('MessageType:', messageType)

    // Buscar informações da conversação com dados do cliente
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        whatsapp_number,
        clientes:cliente_id (
          whatsapp_number,
          telefone,
          nome_fantasia,
          razao_social
        )
      `)
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Conversation not found:', convError)
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Conversation found:', conversation)
    
    // Extrair número do cliente (priorizar whatsapp_number, depois telefone)
    const customerPhone = conversation.clientes?.whatsapp_number || conversation.clientes?.telefone
    
    if (!customerPhone) {
      console.error('Customer phone not found')
      return new Response(
        JSON.stringify({ error: 'Customer phone not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log('Customer Phone (destino):', customerPhone)
    console.log('WhatsApp Number (empresa):', conversation.whatsapp_number)

    // Enviar mensagem para o serviço WhatsApp local
    const WHATSAPP_SERVICE_URL = 'http://localhost:3005'
    
    console.log('Sending to service:', WHATSAPP_SERVICE_URL)
    console.log('Payload:', {
      phoneNumber: customerPhone,
      message: content
    })
    
    const sendResponse = await fetch(`${WHATSAPP_SERVICE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: customerPhone,
        message: content
      })
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text()
      console.error('WhatsApp service error:', errorText)
      throw new Error(`Failed to send message via WhatsApp service: ${errorText}`)
    }

    console.log('Message sent successfully to WhatsApp service')

    // Salvar mensagem no banco de dados
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'user',
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

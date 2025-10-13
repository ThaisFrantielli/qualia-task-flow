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

    const { from, body, timestamp, type = 'text', id: whatsappMessageId, to } = await req.json()

    console.log('Received WhatsApp message:', { from, body, timestamp, type, to })

    // Extract phone number (remove @c.us suffix)
    const phoneNumber = from.replace('@c.us', '')
    const companyWhatsAppNumber = to ? to.replace('@c.us', '') : '0000000000'
    
    // 1. Find or create customer by phone number
    let customerId: string | null = null
    
    // First, try to find existing customer
    const { data: existingCustomer } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefone', phoneNumber)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('clientes')
        .insert({
          nome: `Cliente ${phoneNumber}`,
          telefone: phoneNumber,
          email: null,
          origem: 'whatsapp',
          status: 'ativo'
        })
        .select('id')
        .single()

      if (customerError) {
        console.error('Error creating customer:', customerError)
        throw customerError
      }

      customerId = newCustomer.id
      console.log('Created new customer:', customerId)
    }

    // 2. Find or create WhatsApp conversation
    let conversationId: string | null = null

    const { data: existingConversation } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('customer_phone', phoneNumber)
      .eq('whatsapp_number', companyWhatsAppNumber)
      .eq('status', 'active')
      .single()

    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      // Create new conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          cliente_id: customerId,
          customer_phone: phoneNumber,
          customer_name: `Cliente ${phoneNumber}`,
          whatsapp_number: companyWhatsAppNumber,
          status: 'active',
          last_message: body,
          last_message_at: new Date().toISOString(),
          unread_count: 1
        })
        .select('id')
        .single()

      if (conversationError) {
        console.error('Error creating conversation:', conversationError)
        throw conversationError
      }

      conversationId = newConversation.id
      console.log('Created new conversation:', conversationId)
    }

    // 3. Save the message
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_phone: phoneNumber,
        sender_name: `Cliente ${phoneNumber}`,
        content: body,
        message_type: type,
        status: 'delivered',
        whatsapp_message_id: whatsappMessageId
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      throw messageError
    }

    // 4. Update conversation with latest message info
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message: body,
        last_message_at: new Date().toISOString(),
        unread_count: 1, // TODO: Implement proper unread count logic
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    // 5. Check if we should create an atendimento (support ticket)
    // This could be configurable based on business rules
    const shouldCreateAtendimento = true // For now, always create one

    if (shouldCreateAtendimento && customerId) {
      // Check if there's already an open atendimento for this customer
      const { data: existingAtendimento } = await supabase
        .from('atendimentos')
        .select('id')
        .eq('cliente_id', customerId)
        .eq('status', 'aberto')
        .single()

      if (!existingAtendimento) {
        // Create new atendimento
        const { error: atendimentoError } = await supabase
          .from('atendimentos')
          .insert({
            cliente_id: customerId,
            tipo: 'suporte',
            status: 'aberto',
            prioridade: 'media',
            titulo: `Atendimento WhatsApp - ${phoneNumber}`,
            descricao: `Atendimento iniciado via WhatsApp.\n\nPrimeira mensagem: ${body}`,
            origem: 'whatsapp'
          })

        if (atendimentoError) {
          console.error('Error creating atendimento:', atendimentoError)
        } else {
          console.log('Created new atendimento for customer:', customerId)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'WhatsApp message processed successfully',
        data: {
          messageId: message.id,
          conversationId,
          customerId
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error)
    
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
// @ts-nocheck - Deno Edge Function (IDE TypeScript doesn't support Deno runtime)
/// <reference path="../types.d.ts" />
// @ts-ignore - Deno environment
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { instance_id, from, body, timestamp, messageId } = await req.json()

    console.log('=== WhatsApp Webhook Debug ===')
    console.log('Instance ID:', instance_id)
    console.log('From:', from)
    console.log('Body:', body)
    console.log('Timestamp:', timestamp)
    console.log('Message ID:', messageId)

    // require instance_id and from, but allow empty body (some WhatsApp events may not include text)
    if (!instance_id || !from) {
      return new Response(
        JSON.stringify({ error: 'instance_id and from are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract phone number from WhatsApp format (e.g., "5561999887766@c.us" -> "5561999887766")
    const phoneNumber = String(from).replace('@c.us', '').replace('@s.whatsapp.net', '')

    // Find or create conversation for this instance
    // Try to find conversation by whatsapp_number OR customer_phone for resilience
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .or(`whatsapp_number.eq.${phoneNumber},customer_phone.eq.${phoneNumber}`)
      .eq('instance_id', instance_id)
      .maybeSingle()

    if (convError || !conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          // Fill both customer_phone and whatsapp_number to satisfy schemas that require whatsapp_number
          customer_phone: phoneNumber,
          whatsapp_number: phoneNumber,
          customer_name: phoneNumber,
          instance_id: instance_id,
          last_message: body || null,
          last_message_at: new Date().toISOString(),
          unread_count: 1
        })
        .select()
        .maybeSingle()

      if (createError) {
        console.error('Error creating conversation:', createError)
        throw createError
      }

      conversation = newConv
    } else {
      // Update existing conversation
      await supabase
        .from('whatsapp_conversations')
        .update({
          // ensure whatsapp_number is set if present
          whatsapp_number: phoneNumber,
          last_message: body || null,
          last_message_at: new Date().toISOString(),
          unread_count: (conversation.unread_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
    }

    // Create message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        instance_id: instance_id,
        sender_type: 'customer',
        content: body || null,
        message_type: 'text',
        status: 'received',
        whatsapp_message_id: messageId
      })

    if (messageError) {
      console.error('Error creating message:', messageError)
      throw messageError
    }

    // --- TRIAGE LOGIC START ---
    // Only process for customer messages
    if (conversation.customer_phone) {
      // 1. Check if client exists
      let { data: client, error: clientError } = await supabase
        .from('clientes')
        .select('id, status_triagem')
        .or(`whatsapp_number.eq.${conversation.customer_phone},telefone.eq.${conversation.customer_phone}`)
        .maybeSingle()

      // 2. Check for open tickets (status not in 'resolvido', 'fechado')
      let hasOpenTicket = false
      if (client) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_id', client.id)
          .not('status', 'in', '(resolvido,fechado)')

        hasOpenTicket = (count || 0) > 0
      }

      // 3. Check for open opportunities (status not in 'ganho', 'perdido')
      let hasOpenOpportunity = false
      if (client) {
        const { count } = await supabase
          .from('oportunidades')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_id', client.id)
          .not('status', 'in', '(ganho,perdido)')

        hasOpenOpportunity = (count || 0) > 0
      }

      console.log(`Triage Check - Client: ${client?.id}, Open Ticket: ${hasOpenTicket}, Open Opp: ${hasOpenOpportunity}`)

      // 4. If no open ticket and no open opportunity, send to triage
      if (!hasOpenTicket && !hasOpenOpportunity) {
        if (client) {
          // Update existing client to triage if not already there
          if (client.status_triagem !== 'novo' && client.status_triagem !== 'aguardando') {
            await supabase
              .from('clientes')
              .update({ status_triagem: 'aguardando', updated_at: new Date().toISOString() })
              .eq('id', client.id)

            console.log(`Updated client ${client.id} to triage status`)
          }
        } else {
          // Create new lead in triage
          const { error: createClientError } = await supabase
            .from('clientes')
            .insert({
              nome_fantasia: conversation.customer_name || conversation.customer_phone,
              whatsapp_number: conversation.customer_phone,
              status_triagem: 'aguardando',
              origem: 'whatsapp_inbound'
            })

          if (createClientError) {
            console.error('Error creating triage lead:', createClientError)
          } else {
            console.log(`Created new triage lead for ${conversation.customer_phone}`)
          }
        }
      }
    }
    // --- TRIAGE LOGIC END ---

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        conversation_id: conversation.id,
        instance_id: instance_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)

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
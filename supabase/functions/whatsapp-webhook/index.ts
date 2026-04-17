// @ts-nocheck - Deno Edge Function (IDE TypeScript doesn't support Deno runtime)
/// <reference path="../types.d.ts" />
// @ts-ignore - Deno environment
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// Normaliza qualquer JID/telefone para somente dígitos
const normalizePhone = (raw: string): string => {
  const jid = String(raw || '').trim().toLowerCase()
  const user = jid.split('@')[0] || ''
  return user.replace(/\D/g, '')
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET') ?? ''
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret') || ''
      if (!providedSecret || providedSecret !== webhookSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized webhook request' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
    }

    const payload = await req.json()
    const {
      instance_id,
      from,
      to,
      body,
      timestamp,
      messageId,
      // Novos campos para suportar mensagens enviadas pelo bot/agente externo
      fromMe = false,
      type: messageType = 'text',
    } = payload

    console.log('=== WhatsApp Webhook ===')
    console.log({ instance_id, from, to, fromMe, messageId, len: (body || '').length })

    if (!instance_id || (!from && !to)) {
      return new Response(
        JSON.stringify({ error: 'instance_id and from (or to) are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Quando é mensagem do bot/agente (fromMe), o 'from' será o número da empresa.
    // O telefone do CLIENTE estará em 'to'. Use o destino correto para identificar a conversa.
    const counterpartyJid = fromMe ? (to || from) : from
    const counterpartyJidStr = String(counterpartyJid || '').toLowerCase()

    // Ignora grupos, broadcasts, status
    if (
      !counterpartyJidStr ||
      counterpartyJidStr.includes('@g.us') ||
      counterpartyJidStr.includes('@broadcast') ||
      counterpartyJidStr.includes('status@')
    ) {
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'non-direct-message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const phoneNumber = normalizePhone(counterpartyJidStr)

    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'invalid-phone' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Dedup por whatsapp_message_id antes de qualquer trabalho extra
    if (messageId) {
      const { data: existing } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('whatsapp_message_id', messageId)
        .maybeSingle()
      if (existing) {
        return new Response(
          JSON.stringify({ success: true, deduped: true, messageId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // Buscar conversa existente (por whatsapp_number normalizado, dentro da instância)
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('whatsapp_number', phoneNumber)
      .eq('instance_id', instance_id)
      .maybeSingle()

    // Fallback: tenta por customer_phone para conversas legadas
    if (!conversation) {
      const { data: legacy } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .eq('instance_id', instance_id)
        .maybeSingle()
      if (legacy) conversation = legacy
    }

    if (!conversation) {
      // Criar nova conversa
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          customer_phone: phoneNumber,
          whatsapp_number: phoneNumber,
          customer_name: phoneNumber,
          instance_id,
          status: fromMe ? 'active' : 'waiting',
          last_message: body || null,
          last_message_at: new Date().toISOString(),
          unread_count: fromMe ? 0 : 1
        })
        .select()
        .maybeSingle()

      if (createError) {
        // Possível corrida: tenta resolver buscando de novo
        const { data: retryConv } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('whatsapp_number', phoneNumber)
          .eq('instance_id', instance_id)
          .maybeSingle()
        if (!retryConv) {
          console.error('Error creating conversation:', createError)
          throw createError
        }
        conversation = retryConv
      } else {
        conversation = newConv
      }
    } else {
      // Atualizar conversa existente
      await supabase
        .from('whatsapp_conversations')
        .update({
          whatsapp_number: phoneNumber,
          last_message: body || null,
          last_message_at: new Date().toISOString(),
          // Só incrementa não-lidos quando vem do cliente
          unread_count: fromMe
            ? (conversation.unread_count || 0)
            : (conversation.unread_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
    }

    // Persistir mensagem (cliente, agente humano ou bot/automação)
    const sender_type = fromMe ? 'agent' : 'customer'
    const status = fromMe ? 'sent' : 'received'

    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        instance_id,
        sender_type,
        content: body || null,
        message_type: messageType || 'text',
        status,
        whatsapp_message_id: messageId
      })

    if (messageError) {
      // Se o erro for de unique violation por message_id, considera dedup OK
      const code = (messageError as any).code
      if (code === '23505') {
        return new Response(
          JSON.stringify({ success: true, deduped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      console.error('Error creating message:', messageError)
      throw messageError
    }

    // Triagem: somente para mensagens do CLIENTE
    if (!fromMe && conversation.customer_phone) {
      let { data: client } = await supabase
        .from('clientes')
        .select('id, status_triagem')
        .or(`whatsapp_number.eq.${conversation.customer_phone},telefone.eq.${conversation.customer_phone}`)
        .maybeSingle()

      let hasOpenTicket = false
      let hasOpenOpportunity = false

      if (client) {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('cliente_id', client.id)
          .not('status', 'in', '(resolvido,fechado)')
          .limit(1)
        hasOpenTicket = (tickets?.length || 0) > 0

        const { data: opps } = await supabase
          .from('oportunidades')
          .select('id')
          .eq('cliente_id', client.id)
          .not('status', 'in', '(ganho,perdido)')
          .limit(1)
        hasOpenOpportunity = (opps?.length || 0) > 0

        if (!conversation.cliente_id) {
          await supabase
            .from('whatsapp_conversations')
            .update({ cliente_id: client.id })
            .eq('id', conversation.id)
        }
      }

      if (!hasOpenTicket && !hasOpenOpportunity) {
        if (client) {
          if (client.status_triagem !== 'novo' && client.status_triagem !== 'aguardando') {
            await supabase
              .from('clientes')
              .update({ status_triagem: 'aguardando' })
              .eq('id', client.id)
          }
        } else {
          const { data: newClient } = await supabase
            .from('clientes')
            .insert({
              codigo_cliente: `WA-${Date.now()}`,
              nome_fantasia: conversation.customer_name || conversation.customer_phone,
              whatsapp_number: conversation.customer_phone,
              status_triagem: 'aguardando',
              origem: 'whatsapp_inbound'
            })
            .select('id')
            .single()

          if (newClient) {
            await supabase
              .from('whatsapp_conversations')
              .update({ cliente_id: newClient.id })
              .eq('id', conversation.id)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        conversation_id: conversation.id,
        instance_id,
        sender_type,
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

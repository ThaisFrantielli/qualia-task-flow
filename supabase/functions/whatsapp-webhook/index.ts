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

    // === LOG DETALHADO PARA DIAGNÓSTICO ===
    console.log('=== WhatsApp Webhook RECEIVED ===')
    console.log('Full payload keys:', Object.keys(payload))
    console.log('Parsed fields:', JSON.stringify({ instance_id, from, to, fromMe, messageId, messageType, bodyLen: (body || '').length, bodyPreview: (body || '').slice(0, 80) }))

    if (!instance_id || (!from && !to)) {
      console.warn('REJECTED: missing instance_id or from/to. instance_id=', instance_id, 'from=', from, 'to=', to)
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

    console.log('counterpartyJid:', counterpartyJid, '| normalized str:', counterpartyJidStr)

    // Ignora grupos, broadcasts, status
    if (
      !counterpartyJidStr ||
      counterpartyJidStr.includes('@g.us') ||
      counterpartyJidStr.includes('@broadcast') ||
      counterpartyJidStr.includes('status@')
    ) {
      console.log('IGNORED: non-direct-message JID:', counterpartyJidStr)
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'non-direct-message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const phoneNumber = normalizePhone(counterpartyJidStr)
    console.log('phoneNumber (normalized):', phoneNumber, 'length:', phoneNumber.length)

    // Função auxiliar para considerar variantes do nono dígito do Brasil
    const getPhoneVariants = (phone: string): string[] => {
      const variants = [phone];
      if (phone.startsWith('55') && phone.length === 12) {
        variants.push(phone.slice(0, 4) + '9' + phone.slice(4));
      } else if (phone.startsWith('55') && phone.length === 13) {
        variants.push(phone.slice(0, 4) + phone.slice(5));
      }
      return variants;
    }

    const phoneVariants = getPhoneVariants(phoneNumber);

    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      console.warn('IGNORED: invalid-phone length:', phoneNumber.length, 'raw:', counterpartyJidStr)
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'invalid-phone', phone: phoneNumber }),
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
    console.log('Looking up conversation: whatsapp_number in', phoneVariants, 'instance_id=', instance_id)
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .in('whatsapp_number', phoneVariants)
      .eq('instance_id', instance_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (conversation) {
      console.log('Found conversation by whatsapp_number. id=', conversation.id)
    }

    // Fallback: tenta por customer_phone para conversas legadas
    if (!conversation) {
      console.log('Not found by whatsapp_number. Trying customer_phone fallback...')
      const { data: legacy } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .in('customer_phone', phoneVariants)
        .eq('instance_id', instance_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (legacy) {
        conversation = legacy
        console.log('Found conversation by customer_phone fallback. id=', legacy.id)
      }
    }

    if (!conversation) {
      console.log('No existing conversation found. Creating new one for phone=', phoneNumber, 'instance=', instance_id)
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
        console.log('Race condition resolved, using existing conversation id=', retryConv.id)
      } else {
        conversation = newConv
        console.log('Created new conversation id=', newConv?.id)
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

    // Para mensagens fromMe: tentar encontrar um registro 'pending' sem whatsapp_message_id
    // que foi pré-criado pelo whatsapp-send. Se encontrado, apenas atualizar em vez de inserir,
    // evitando duplicatas quando o bridge devolve o webhook para mensagens já pré-inseridas.
    if (fromMe && conversation?.id && body) {
      const { data: pendingMsg } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('conversation_id', conversation.id)
        .eq('sender_type', 'agent')
        .eq('status', 'pending')
        .is('whatsapp_message_id', null)
        .eq('content', body)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pendingMsg?.id) {
        console.log('fromMe dedup: updating pending message', pendingMsg.id)
        await supabase
          .from('whatsapp_messages')
          .update({
            status: 'sent',
            whatsapp_message_id: messageId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingMsg.id)

        // Conversa já foi atualizada acima, pode retornar.
        return new Response(
          JSON.stringify({ success: true, deduped: true, matched_pending: pendingMsg.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // Mapeamento de tipos para garantir compatibilidade com constraint do banco
    let mappedMessageType = messageType || 'text'
    if (mappedMessageType === 'chat') mappedMessageType = 'text'
    if (mappedMessageType === 'ptt') mappedMessageType = 'audio'

    // Se a mensagem for puramente mídia e não tiver texto associado,
    // o banco rejeita null, então colocamos uma representação textual.
    const messageContent = body || (mappedMessageType === 'audio' ? '[Áudio]' : '[Mídia]')

    // Extrair dados da mídia do payload
    const { media_url, media_type, file_name } = payload;
    const has_media = Boolean(media_url);
    const metadata = has_media ? {
      media_url,
      media_type,
      file_name
    } : null;

    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        instance_id,
        sender_type,
        content: messageContent,
        message_type: mappedMessageType,
        status,
        whatsapp_message_id: messageId,
        has_media,
        media_url,
        media_type,
        file_name,
        metadata
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
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

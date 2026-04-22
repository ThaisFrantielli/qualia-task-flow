// @ts-nocheck - Deno Edge Function (IDE TypeScript doesn't support Deno runtime)
/// <reference path="../types.d.ts" />
// @ts-ignore - Deno environment
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_MESSAGES_PER_MINUTE = 60

const getMinuteBucket = () => {
  const now = new Date()
  now.setSeconds(0, 0)
  return now.toISOString()
}

const determineMessageType = (mediaType?: string | null) => {
  if (!mediaType) return 'text'
  if (mediaType.startsWith('image/')) return 'image'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType.startsWith('audio/')) return 'audio'
  return 'document'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization bearer token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userId = authData.user.id

    const body = await req.json()
    const { phoneNumber, message, conversationId, instance_id, mediaUrl, mediaType, fileName, message_id } = body

    if (!phoneNumber || (!message && !mediaUrl)) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber and either message or mediaUrl are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: 'instance_id is required for multi-session support' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const minuteBucket = getMinuteBucket()
    const { data: rateRow, error: rateSelectError } = await supabase
      .from('whatsapp_rate_limit_log')
      .select('id, send_count')
      .eq('user_id', userId)
      .eq('minute_bucket', minuteBucket)
      .maybeSingle()

    if (rateSelectError) {
      throw rateSelectError
    }

    if (!rateRow) {
      const { error: insertRateError } = await supabase
        .from('whatsapp_rate_limit_log')
        .insert({
          user_id: userId,
          minute_bucket: minuteBucket,
          send_count: 1,
        })
      if (insertRateError) throw insertRateError
    } else {
      if ((rateRow.send_count || 0) >= MAX_MESSAGES_PER_MINUTE) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded (max 60 mensagens/min)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        )
      }

      const { error: updateRateError } = await supabase
        .from('whatsapp_rate_limit_log')
        .update({
          send_count: (rateRow.send_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rateRow.id)

      if (updateRateError) throw updateRateError
    }

    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instance_id)
      .single()

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp instance not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (instance.status !== 'connected') {
      return new Response(
        JSON.stringify({ error: `WhatsApp instance is ${instance.status}. Please connect it first.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let queuedMessageId = message_id || null
    if (conversationId) {
      const insertData = {
        conversation_id: conversationId,
        instance_id,
        sender_type: 'agent',
        sender_id: userId,
        content: message || (mediaUrl ? '[Mídia]' : ''),
        media_url: mediaUrl,
        media_type: mediaType,
        file_name: fileName,
        message_type: determineMessageType(mediaType),
        status: 'pending',
        has_media: Boolean(mediaUrl),
        metadata: mediaUrl ? {
          media_url: mediaUrl,
          media_type: mediaType,
          file_name: fileName,
        } : null,
      }

      if (message_id) {
        const { data: existingMessage, error: existingMessageError } = await supabase
          .from('whatsapp_messages')
          .select('id, status, whatsapp_message_id')
          .eq('id', message_id)
          .maybeSingle()

        if (existingMessageError) throw existingMessageError
        if (!existingMessage) {
          throw new Error('message_id not found')
        }

        queuedMessageId = existingMessage.id || message_id

        const currentStatus = String(existingMessage.status || '').toLowerCase()
        const hasWhatsappMessageId = Boolean(existingMessage.whatsapp_message_id)
        const alreadyFinalized = hasWhatsappMessageId && ['sent', 'delivered', 'read', 'received'].includes(currentStatus)

        if (!alreadyFinalized) {
          const updateData: Record<string, unknown> = {
            ...insertData,
            updated_at: new Date().toISOString(),
          }

          if (currentStatus === 'failed' || currentStatus === 'pending') {
            updateData.status = 'pending'
            updateData.retry_count = 0
            updateData.next_retry_at = null
            updateData.failed_at = null
            updateData.dead_letter = false
            updateData.last_error = null
            updateData.error_message = null
          } else {
            delete updateData.status
          }

          const { error: updateMessageError } = await supabase
            .from('whatsapp_messages')
            .update(updateData)
            .eq('id', message_id)

          if (updateMessageError) throw updateMessageError
        }
      } else {
        const { data: insertedMessage, error: messageError } = await supabase
          .from('whatsapp_messages')
          .insert(insertData)
          .select('id')
          .single()

        if (messageError) throw messageError
        queuedMessageId = insertedMessage?.id || null
      }

      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: message || (mediaUrl ? '[Mídia]' : ''),
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
    }

    await supabase
      .from('whatsapp_audit_log')
      .insert({
        actor_user_id: userId,
        action: 'message_send_requested',
        conversation_id: conversationId || null,
        instance_id,
        payload: {
          phoneNumber,
          hasMessage: Boolean(message),
          hasMedia: Boolean(mediaUrl),
          message_id: queuedMessageId,
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message queued successfully',
        instance_id,
        message_id: queuedMessageId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in whatsapp-send:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

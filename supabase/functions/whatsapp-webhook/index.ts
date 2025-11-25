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

    if (!instance_id || !from || !body) {
      return new Response(
        JSON.stringify({ error: 'instance_id, from, and body are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract phone number from WhatsApp format (e.g., "5561999887766@c.us" -> "5561999887766")
    const phoneNumber = from.replace('@c.us', '').replace('@s.whatsapp.net', '')

    // Find or create conversation for this instance
    let { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('customer_phone', phoneNumber)
      .eq('instance_id', instance_id)
      .single()

    if (convError || !conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          customer_phone: phoneNumber,
          customer_name: phoneNumber,
          instance_id: instance_id,
          last_message: body,
          last_message_at: new Date().toISOString(),
          unread_count: 1
        })
        .select()
        .single()

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
          last_message: body,
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
        content: body,
        message_type: 'text',
        status: 'received',
        whatsapp_message_id: messageId
      })

    if (messageError) {
      console.error('Error creating message:', messageError)
      throw messageError
    }

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
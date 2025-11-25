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
    const { phoneNumber, message, conversationId, instance_id } = await req.json()

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: 'instance_id is required for multi-session support' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('=== WhatsApp Send Debug ===')
    console.log('Phone Number:', phoneNumber)
    console.log('Message:', message)
    console.log('Instance ID:', instance_id)
    console.log('Conversation ID:', conversationId)

    // Validate instance exists and is connected
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instance_id)
      .single()

    if (instanceError || !instance) {
      console.error('Instance not found:', instanceError)
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

    // Send message to WhatsApp service
    const whatsappServiceUrl = 'http://localhost:3005/send-message'
    console.log('Sending to WhatsApp service:', whatsappServiceUrl)

    const whatsappResponse = await fetch(whatsappServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        message: message,
        instance_id: instance_id
      })
    })

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text()
      console.error('WhatsApp service error:', whatsappResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const whatsappResult = await whatsappResponse.json()
    console.log('WhatsApp service response:', whatsappResult)

    // Store message in database
    if (conversationId) {
      const { error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          instance_id: instance_id,
          sender_type: 'user',
          content: message,
          message_type: 'text',
          status: 'sent'
        })

      if (messageError) {
        console.error('Error storing message:', messageError)
      }

      // Update conversation last message
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        instance_id: instance_id,
        result: whatsappResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

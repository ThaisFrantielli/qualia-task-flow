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
    const body = await req.json()
    console.log('=== WhatsApp Send Request Body ===')
    console.log(JSON.stringify(body, null, 2))
    
    const { phoneNumber, message, conversationId, instance_id, mediaUrl, mediaType, fileName } = body

    if (!phoneNumber || (!message && !mediaUrl)) {
      console.error('Missing required fields: phoneNumber or message/mediaUrl')
      return new Response(
        JSON.stringify({ error: 'phoneNumber and either message or mediaUrl are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!instance_id) {
      console.error('Missing instance_id')
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
    console.log('Media URL:', mediaUrl)
    console.log('Media Type:', mediaType)

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

    // Store message in database with 'pending' status for the local service to pick up
    if (conversationId) {
      console.log('Attempting to insert message into database...')
      
      // Determine message_type based on media type
      let messageType = 'text'
      if (mediaUrl && mediaType) {
        if (mediaType.startsWith('image/')) {
          messageType = 'image'
        } else if (mediaType.startsWith('video/')) {
          messageType = 'video'
        } else if (mediaType.startsWith('audio/')) {
          messageType = 'audio'
        } else if (mediaType.includes('pdf') || mediaType.includes('document')) {
          messageType = 'document'
        } else {
          messageType = 'document' // Default to document for other file types
        }
      }
      
      const insertData = {
        conversation_id: conversationId,
        instance_id: instance_id,
        sender_type: 'agent',
        content: message || (mediaUrl ? 'Media sent' : ''),
        media_url: mediaUrl,
        media_type: mediaType,
        file_name: fileName,
        message_type: messageType,
        status: 'pending'
      }
      console.log('Insert data:', JSON.stringify(insertData, null, 2))
      
      const { data: insertedMessage, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert(insertData)
        .select()

      if (messageError) {
        console.error('Error storing message:', JSON.stringify(messageError, null, 2))
        throw messageError
      }
      
      console.log('Message inserted successfully:', insertedMessage)

      // Update conversation last message
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: message || (mediaUrl ? 'Media sent' : ''),
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message queued successfully',
        instance_id: instance_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== Error in WhatsApp Send Function ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Full error:', JSON.stringify(error, null, 2))

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

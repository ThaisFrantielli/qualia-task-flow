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

const WHATSAPP_SERVICE_URL = 'http://localhost:3005'

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

    const { phoneNumber, message, conversationId } = await req.json()

    console.log('Sending WhatsApp message:', { phoneNumber, message, conversationId })

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'phoneNumber and message are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 1. Send message via WhatsApp service
    const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`
    
    const whatsappResponse = await fetch(`${WHATSAPP_SERVICE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: formattedNumber,
        message: message
      })
    })

    if (!whatsappResponse.ok) {
      const error = await whatsappResponse.text()
      console.error('WhatsApp service error:', error)
      throw new Error('Failed to send message via WhatsApp service')
    }

    const whatsappResult = await whatsappResponse.json()
    console.log('WhatsApp service response:', whatsappResult)

    // 2. Save message to database
    let actualConversationId = conversationId

    // If no conversationId provided, try to find or create one
    if (!actualConversationId) {
      const cleanPhoneNumber = phoneNumber.replace('@c.us', '')
      
      const { data: existingConversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('customer_phone', cleanPhoneNumber)
        .eq('status', 'active')
        .single()

      if (existingConversation) {
        actualConversationId = existingConversation.id
      } else {
        // Create new conversation
        const { data: newConversation, error: conversationError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            customer_phone: cleanPhoneNumber,
            customer_name: `Cliente ${cleanPhoneNumber}`,
            status: 'active',
            last_message: message,
            last_message_at: new Date().toISOString(),
            unread_count: 0
          })
          .select('id')
          .single()

        if (conversationError) {
          console.error('Error creating conversation:', conversationError)
          throw conversationError
        }

        actualConversationId = newConversation.id
      }
    }

    // 3. Save the sent message
    const { data: savedMessage, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: actualConversationId,
        sender_type: 'user',
        sender_phone: null, // System/user sending
        sender_name: 'Sistema',
        content: message,
        message_type: 'text',
        status: 'sent', // Will be updated to delivered/read by webhooks
        whatsapp_message_id: null
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      throw messageError
    }

    // 4. Update conversation with latest message
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message: message,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', actualConversationId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        data: {
          messageId: savedMessage.id,
          conversationId: actualConversationId,
          whatsappResponse: whatsappResult
        }
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

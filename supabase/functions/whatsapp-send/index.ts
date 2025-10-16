// @ts-ignore - Deno environment
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_number, message_text } = await req.json()

    if (!to_number || !message_text) {
      return new Response(
        JSON.stringify({ error: 'to_number and message_text are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('=== WhatsApp Send Debug ===')
    console.log('To Number:', to_number)
    console.log('Message Text:', message_text)

    // Fazer requisição para o whatsapp-service
    const whatsappServiceUrl = 'http://localhost:3006/send-message'
    
    console.log('Sending to WhatsApp service:', whatsappServiceUrl)
    
    const whatsappResponse = await fetch(whatsappServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: to_number,
        message: message_text
      })
    })

    if (!whatsappResponse.ok) {
      console.error('WhatsApp service error:', whatsappResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // @ts-ignore - Deno fetch API
    const whatsappResult = await whatsappResponse.json()
    console.log('WhatsApp service response:', whatsappResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent successfully',
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

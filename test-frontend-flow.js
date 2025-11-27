// Simulate frontend message sending flow with detailed logging
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

const WHATSAPP = {
  SERVICE_URL: 'http://localhost:3005',
  USE_EDGE_FUNCTION: false,
  DEBUG_LOGS: true
};

async function simulateFrontendSendMessage() {
  const clienteId = '3f800040-392c-408b-97b3-1d363ca0d444'; // Thais Cabral ID
  const whatsappNumber = '556192209067';
  const content = 'Teste simulado do frontend - ' + new Date().toLocaleTimeString();

  console.log('🚀 Simulating frontend sendMessage flow...');
  console.log('Cliente ID:', clienteId);
  console.log('WhatsApp Number:', whatsappNumber);
  console.log('Message content:', content);

  try {
    // Step 1: Find or create conversation (similar to frontend logic)
    console.log('\n1️⃣ Finding conversation...');
    let { data: convData, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        clientes:cliente_id (
          whatsapp_number,
          telefone,
          nome_fantasia,
          razao_social
        )
      `)
      .eq('cliente_id', clienteId)
      .eq('whatsapp_number', whatsappNumber)
      .maybeSingle();

    if (convError) {
      console.error('Conversation query error:', convError);
      throw convError;
    }

    console.log('Conversation data found:', convData);

    if (!convData) {
      console.log('Creating new conversation...');
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          cliente_id: clienteId,
          whatsapp_number: whatsappNumber,
          status: 'active'
        })
        .select(`
          id,
          clientes:cliente_id (
            whatsapp_number,
            telefone,
            nome_fantasia,
            razao_social
          )
        `)
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }
      convData = newConv;
      console.log('New conversation created:', convData);
    }

    // Step 2: Get customer phone from conversation data
    const cliente = Array.isArray(convData.clientes) ? convData.clientes[0] : convData.clientes;
    console.log('\n2️⃣ Cliente data:', cliente);
    
    const customerPhone = cliente?.whatsapp_number || cliente?.telefone || null;
    console.log('Customer phone:', customerPhone);

    if (!customerPhone) {
      throw new Error('Cliente não possui número de telefone/WhatsApp cadastrado');
    }

    // Step 3: Sanitize phone number
    const digits = (customerPhone || '').replace(/\D+/g, '');
    const sanitizedPhone = digits;
    console.log('\n3️⃣ Sanitized phone:', { input: customerPhone, sanitized: sanitizedPhone });

    // Step 4: Send message (direct to service since USE_EDGE_FUNCTION is false)
    console.log('\n4️⃣ Sending message to WhatsApp service...');
    console.log('URL:', `${WHATSAPP.SERVICE_URL}/send-message`);
    console.log('Payload:', { phoneNumber: sanitizedPhone, message: content });

    const response = await fetch(`${WHATSAPP.SERVICE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: sanitizedPhone, message: content })
    });

    console.log('Response status:', response.status, response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp service error:', errorText);
      throw new Error(`Erro no serviço WhatsApp: ${errorText}`);
    }

    const result = await response.json();
    console.log('Response data:', result);

    // Step 5: Save message to database
    console.log('\n5️⃣ Saving message to database...');
    const messageData = {
      conversation_id: convData.id,
      sender_type: 'system', // Changed from 'user' to 'system'
      content: content,
      message_type: 'text'
    };

    console.log('Message data to insert:', messageData);

    const { data: insertedMessage, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert(messageData)
      .select();

    console.log('Insert result:', { insertedMessage, messageError });

    if (messageError) {
      console.error('Error saving message:', messageError);
      console.warn('Message was sent to WhatsApp but not saved to database');
    } else {
      console.log('✅ Message saved to database successfully');
    }

    // Step 6: Update conversation timestamp
    console.log('\n6️⃣ Updating conversation timestamp...');
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', convData.id);

    console.log('✅ Conversation updated');
    console.log('\n🎉 Send message process completed successfully!');

  } catch (error) {
    console.error('💥 Error in send message flow:', error);
  }
}

simulateFrontendSendMessage();
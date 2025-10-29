// Test WhatsApp message sending flow
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

const WHATSAPP_SERVICE_URL = 'http://localhost:3005';

async function testMessageFlow() {
  console.log('🧪 Testing WhatsApp message flow...\n');

  try {
    // 1. Test service status
    console.log('1️⃣ Testing service status...');
    const statusResponse = await fetch(`${WHATSAPP_SERVICE_URL}/status`);
    const statusData = await statusResponse.json();
    console.log('Service status:', statusData);

    if (!statusData.isConnected) {
      console.error('❌ WhatsApp service is not connected');
      return;
    }

    // 2. Find Thais client
    console.log('\n2️⃣ Finding Thais client...');
    const { data: thaisClient, error: clientError } = await supabase
      .from('clientes')
      .select('*')
      .or('nome_fantasia.ilike.%thais%,razao_social.ilike.%thais%')
      .single();

    if (clientError || !thaisClient) {
      console.error('❌ Could not find Thais client:', clientError);
      return;
    }

    console.log('✅ Found Thais client:');
    console.log('  ID:', thaisClient.id);
    console.log('  Name:', thaisClient.razao_social);
    console.log('  WhatsApp:', thaisClient.whatsapp_number);
    console.log('  Phone:', thaisClient.telefone);

    // 3. Test direct message sending
    console.log('\n3️⃣ Testing direct message sending...');
    const messagePayload = {
      phoneNumber: thaisClient.whatsapp_number,
      message: `Teste automático do sistema - ${new Date().toLocaleTimeString()}`
    };

    console.log('Message payload:', messagePayload);

    const messageResponse = await fetch(`${WHATSAPP_SERVICE_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagePayload)
    });

    const messageResult = await messageResponse.json();
    console.log('Message response:', messageResult);

    if (messageResult.success) {
      console.log('✅ Message sent successfully!');
    } else {
      console.error('❌ Message sending failed:', messageResult);
    }

    // 4. Check for existing conversation
    console.log('\n4️⃣ Checking existing conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        whatsapp_number,
        clientes:cliente_id (
          whatsapp_number,
          telefone,
          nome_fantasia,
          razao_social
        )
      `)
      .eq('cliente_id', thaisClient.id)
      .eq('whatsapp_number', thaisClient.whatsapp_number)
      .maybeSingle();

    if (convError) {
      console.error('❌ Error checking conversation:', convError);
    } else if (conversation) {
      console.log('✅ Existing conversation found:');
      console.log('  Conversation ID:', conversation.id);
      console.log('  WhatsApp Number:', conversation.whatsapp_number);
      console.log('  Client data:', conversation.clientes);
    } else {
      console.log('⚠️ No existing conversation found - would create new one');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testMessageFlow();
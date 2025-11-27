// Fix Thais WhatsApp number from system number to her real number
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

console.log('🔧 Fixing Thais WhatsApp number...\n');

async function fixThaisWhatsApp() {
  try {
    const clienteId = '3f800040-392c-408b-97b3-1d363ca0d444'; // Thais ID
    const currentSystemNumber = '556192209067'; // Número do sistema (errado)
    const thaisRealNumber = '5561996187305'; // Número real da Thais (from interface)

    console.log('1️⃣ Current situation:');
    console.log('  - Cliente ID:', clienteId);
    console.log('  - Sistema usando:', currentSystemNumber);
    console.log('  - Número real da Thais:', thaisRealNumber);

    // Step 1: Update cliente's whatsapp_number
    console.log('\n2️⃣ Updating cliente whatsapp_number...');
    const { data: updatedCliente, error: clienteError } = await supabase
      .from('clientes')
      .update({ 
        whatsapp_number: thaisRealNumber,
        telefone: thaisRealNumber // Also update phone if needed
      })
      .eq('id', clienteId)
      .select();

    if (clienteError) {
      console.error('Error updating cliente:', clienteError);
      return;
    }

    console.log('✅ Cliente updated:', updatedCliente);

    // Step 2: Check existing conversation
    console.log('\n3️⃣ Checking existing conversation...');
    const { data: oldConv, error: oldConvError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('whatsapp_number', currentSystemNumber);

    if (oldConvError) {
      console.error('Error checking old conversation:', oldConvError);
      return;
    }

    console.log('Old conversation found:', oldConv);

    if (oldConv && oldConv.length > 0) {
      // Step 3: Update conversation whatsapp_number
      console.log('\n4️⃣ Updating conversation whatsapp_number...');
      const { data: updatedConv, error: convUpdateError } = await supabase
        .from('whatsapp_conversations')
        .update({ whatsapp_number: thaisRealNumber })
        .eq('id', oldConv[0].id)
        .select();

      if (convUpdateError) {
        console.error('Error updating conversation:', convUpdateError);
        return;
      }

      console.log('✅ Conversation updated:', updatedConv);
    }

    // Step 4: Test message to new number
    console.log('\n5️⃣ Testing message to corrected number...');
    const testMessage = `Olá Thais! Número corrigido - ${new Date().toLocaleTimeString()}`;
    
    console.log('Sending test message to:', thaisRealNumber);
    console.log('Message:', testMessage);

    const response = await fetch('http://localhost:3005/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: thaisRealNumber,
        message: testMessage
      })
    });

    const result = await response.json();
    console.log('Test message result:', result);

    if (result.success) {
      console.log('\n🎉 SUCCESS! Thais WhatsApp number has been fixed!');
      console.log('📱 Check Thais\' phone for the test message');
      console.log('🖥️ Now the interface will send to the correct number');
    } else {
      console.log('\n❌ Test message failed. Check if the number is correct.');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
  
  try {
    // Buscar cliente Thais
    const { data: thaisClient } = await supabase
      .from('clientes')
      .select('*')
      .or('nome_fantasia.ilike.%thais%,razao_social.ilike.%thais%')
      .single();

    if (thaisClient) {
      console.log('Current Thais number:', thaisClient.whatsapp_number);
      console.log('WhatsApp connected number: 556192209067');
      
      // Atualizar com o número correto (mesmo do WhatsApp conectado)
      const { data: updateData, error: updateError } = await supabase
        .from('clientes')
        .update({
          whatsapp_number: '556192209067', // Mesmo número do WhatsApp conectado
          telefone: '556192209067'
        })
        .eq('id', thaisClient.id)
        .select();

      console.log('✅ Updated Thais number:', updateData);
      console.log('Update error:', updateError);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

fixThaisWhatsApp();
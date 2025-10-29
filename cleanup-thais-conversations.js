// Clean up duplicate conversations and keep the correct one
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

console.log('🧹 Cleaning up Thais conversations...\n');

async function cleanupThaisConversations() {
  try {
    const clienteId = '3f800040-392c-408b-97b3-1d363ca0d444'; // Thais ID
    const systemNumber = '556192209067'; // Sistema (errado)
    const thaisRealNumber = '5561996187305'; // Thais real

    // Step 1: Find all conversations for Thais
    console.log('1️⃣ Finding all Thais conversations...');
    const { data: allConversations, error: findError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('cliente_id', clienteId);

    if (findError) {
      console.error('Error finding conversations:', findError);
      return;
    }

    console.log('All conversations found:', allConversations);

    let systemConv = null;
    let realConv = null;

    allConversations.forEach(conv => {
      if (conv.whatsapp_number === systemNumber) {
        systemConv = conv;
      } else if (conv.whatsapp_number === thaisRealNumber) {
        realConv = conv;
      }
    });

    console.log('\n2️⃣ Conversation analysis:');
    console.log('System conversation (wrong):', systemConv?.id);
    console.log('Real conversation (correct):', realConv?.id);

    if (systemConv && realConv) {
      // Both exist - need to merge messages and delete wrong one
      console.log('\n3️⃣ Both conversations exist. Merging messages...');
      
      // Get messages from system conversation
      const { data: systemMessages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', systemConv.id);

      if (msgError) {
        console.error('Error getting system messages:', msgError);
        return;
      }

      console.log(`Found ${systemMessages?.length || 0} messages in system conversation`);

      // Move messages to real conversation
      if (systemMessages && systemMessages.length > 0) {
        console.log('4️⃣ Moving messages to correct conversation...');
        
        const { data: movedMessages, error: moveError } = await supabase
          .from('whatsapp_messages')
          .update({ conversation_id: realConv.id })
          .eq('conversation_id', systemConv.id)
          .select();

        if (moveError) {
          console.error('Error moving messages:', moveError);
          return;
        }

        console.log(`✅ Moved ${movedMessages?.length || 0} messages`);
      }

      // Delete system conversation
      console.log('5️⃣ Deleting system conversation...');
      const { error: deleteError } = await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('id', systemConv.id);

      if (deleteError) {
        console.error('Error deleting system conversation:', deleteError);
        return;
      }

      console.log('✅ System conversation deleted');

    } else if (systemConv && !realConv) {
      // Only system conversation exists - update its number
      console.log('\n3️⃣ Only system conversation exists. Updating number...');
      
      const { data: updatedConv, error: updateError } = await supabase
        .from('whatsapp_conversations')
        .update({ whatsapp_number: thaisRealNumber })
        .eq('id', systemConv.id)
        .select();

      if (updateError) {
        console.error('Error updating conversation:', updateError);
        return;
      }

      console.log('✅ Conversation updated:', updatedConv);

    } else if (realConv && !systemConv) {
      console.log('\n3️⃣ Only correct conversation exists. Nothing to do!');
    } else {
      console.log('\n3️⃣ No conversations found. Creating new one...');
      
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          cliente_id: clienteId,
          whatsapp_number: thaisRealNumber,
          status: 'active'
        })
        .select();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return;
      }

      console.log('✅ New conversation created:', newConv);
    }

    // Step 6: Test message
    console.log('\n6️⃣ Testing message to correct number...');
    const testMessage = `Teste pós-correção - ${new Date().toLocaleTimeString()}`;
    
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
      console.log('\n🎉 SUCCESS! Thais conversation cleaned up!');
      console.log('📱 Check Thais\' phone (' + thaisRealNumber + ') for the test message');
      console.log('🖥️ Refresh the interface - it should now show the correct number');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

cleanupThaisConversations();
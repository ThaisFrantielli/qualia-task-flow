// Final cleanup of all problematic conversations
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

console.log('🧹 Final cleanup of all problematic conversations...\n');

async function finalCleanup() {
  try {
    const systemNumber = '556192209067';

    // Step 1: Delete all conversations that use the system number
    console.log('1️⃣ Deleting all conversations using system number...');
    
    const { data: deletedConversations, error: deleteError } = await supabase
      .from('whatsapp_conversations')
      .delete()
      .eq('whatsapp_number', systemNumber)
      .select();

    if (deleteError) {
      console.error('Error deleting conversations:', deleteError);
      return;
    }

    console.log(`✅ Deleted ${deletedConversations?.length || 0} problematic conversations`);

    // Step 2: Check Thais current state
    console.log('\n2️⃣ Checking Thais current conversations...');
    const thaisId = '3f800040-392c-408b-97b3-1d363ca0d444';
    
    const { data: thaisConversations, error: thaisError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('cliente_id', thaisId);

    if (thaisError) {
      console.error('Error checking Thais conversations:', thaisError);
      return;
    }

    console.log(`Thais has ${thaisConversations?.length || 0} conversations:`);
    thaisConversations?.forEach((conv, index) => {
      console.log(`  ${index + 1}. ID: ${conv.id}, Number: ${conv.whatsapp_number}`);
    });

    // Step 3: Ensure Thais has exactly one correct conversation
    const thaisRealNumber = '5561996187305';
    let correctConv = thaisConversations?.find(c => c.whatsapp_number === thaisRealNumber);

    if (!correctConv) {
      console.log('\n3️⃣ Creating correct conversation for Thais...');
      const { data: newConv, error: createError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          cliente_id: thaisId,
          whatsapp_number: thaisRealNumber,
          status: 'active'
        })
        .select();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return;
      }

      console.log('✅ Created correct conversation:', newConv);
      correctConv = newConv[0];
    }

    // Step 4: Delete any other Thais conversations (keep only the correct one)
    if (thaisConversations && thaisConversations.length > 1) {
      console.log('\n4️⃣ Removing duplicate Thais conversations...');
      const toDelete = thaisConversations.filter(c => c.id !== correctConv.id);
      
      for (const conv of toDelete) {
        const { error: delError } = await supabase
          .from('whatsapp_conversations')
          .delete()
          .eq('id', conv.id);

        if (delError) {
          console.error(`Error deleting conversation ${conv.id}:`, delError);
        } else {
          console.log(`✅ Deleted duplicate conversation: ${conv.id}`);
        }
      }
    }

    // Step 5: Final test
    console.log('\n5️⃣ Final test message to Thais...');
    const testMessage = `Sistema limpo e funcionando! ${new Date().toLocaleTimeString()}`;
    
    const response = await fetch('http://localhost:3005/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: thaisRealNumber,
        message: testMessage
      })
    });

    const result = await response.json();
    console.log('Final test result:', result);

    if (result.success) {
      console.log('\n🎉 SYSTEM CLEANED UP SUCCESSFULLY!');
      console.log('✅ All problematic conversations removed');
      console.log('✅ Thais has correct WhatsApp number: ' + thaisRealNumber);
      console.log('✅ Test message sent successfully');
      console.log('\n📋 Next steps:');
      console.log('1. Refresh the interface');
      console.log('2. Check that Thais shows the correct number');
      console.log('3. Test sending a message through the interface');
      console.log('4. Check Thais\' phone for messages');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

finalCleanup();
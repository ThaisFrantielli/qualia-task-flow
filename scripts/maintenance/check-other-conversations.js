// Check if there are other conversations using the system number incorrectly
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

console.log('🔍 Checking for other problematic conversations...\n');

async function checkOtherConversations() {
  try {
    const systemNumber = '556192209067'; // Number of the system (should only be used for sending)

    // Find all conversations using the system number
    console.log('1️⃣ Finding conversations using system number...');
    const { data: systemConversations, error: findError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        cliente_id,
        whatsapp_number,
        clientes:cliente_id (
          razao_social,
          telefone,
          whatsapp_number
        )
      `)
      .eq('whatsapp_number', systemNumber);

    if (findError) {
      console.error('Error finding conversations:', findError);
      return;
    }

    console.log(`Found ${systemConversations?.length || 0} conversations using system number:`);
    
    if (systemConversations && systemConversations.length > 0) {
      systemConversations.forEach((conv, index) => {
        const cliente = Array.isArray(conv.clientes) ? conv.clientes[0] : conv.clientes;
        console.log(`  ${index + 1}. Cliente: ${cliente?.razao_social}`);
        console.log(`     Conversation ID: ${conv.id}`);
        console.log(`     Cliente telefone: ${cliente?.telefone}`);
        console.log(`     Cliente WhatsApp: ${cliente?.whatsapp_number}`);
        console.log('');
      });

      console.log('⚠️  These conversations need to be reviewed:');
      console.log(`   They are using the system number (${systemNumber}) instead of customer numbers`);
      console.log('   This means messages are being sent to the wrong number');
    } else {
      console.log('✅ No problematic conversations found!');
      console.log('   All conversations are using correct customer numbers');
    }

    // Also check for conversations without proper customer phone numbers
    console.log('\n2️⃣ Checking for customers without proper WhatsApp numbers...');
    const { data: allConversations, error: allError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        whatsapp_number,
        clientes:cliente_id (
          razao_social,
          telefone,
          whatsapp_number
        )
      `);

    if (allError) {
      console.error('Error getting all conversations:', allError);
      return;
    }

    let problemCount = 0;
    if (allConversations) {
      allConversations.forEach(conv => {
        const cliente = Array.isArray(conv.clientes) ? conv.clientes[0] : conv.clientes;
        if (!cliente?.telefone && !cliente?.whatsapp_number) {
          problemCount++;
          console.log(`❌ ${cliente?.razao_social}: No phone/WhatsApp number configured`);
        }
      });
    }

    if (problemCount === 0) {
      console.log('✅ All customers have proper phone numbers configured');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkOtherConversations();
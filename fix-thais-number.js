// Fix Thais phone number to match WhatsApp connected number
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function fixThaisNumber() {
  console.log('🔧 Fixing Thais phone number...');
  
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

fixThaisNumber();
// Teste de inserção direta no Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function testDirectInsert() {
  console.log('Testing direct insert to whatsapp_config...');
  
  try {
    // Tentar inserir um registro de teste
    const { data: insertData, error: insertError } = await supabase
      .from('whatsapp_config')
      .insert({
        id: 'test-' + Date.now(),
        qr_code: 'test-qr-code-data',
        is_connected: false
      })
      .select();

    console.log('Insert data:', insertData);
    console.log('Insert error:', insertError);
    
    // Tentar buscar todos os registros
    const { data: selectData, error: selectError } = await supabase
      .from('whatsapp_config')
      .select('*');

    console.log('Select data:', selectData);
    console.log('Select error:', selectError);
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

testDirectInsert();
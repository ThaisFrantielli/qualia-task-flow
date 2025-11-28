// Debug cliente data
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function debugCliente() {
  console.log('🔍 Checking clientes table...');
  
  try {
    // Buscar todos os clientes
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('*')
      .limit(5);

    console.log('Clientes found:', clientes);
    console.log('Clientes error:', clientesError);

    if (clientes && clientes.length > 0) {
      const firstClient = clientes[0];
      console.log('First client:', firstClient);
      
      // Tentar buscar/criar conversa para este cliente
      const whatsappNumber = '556192209067'; // Número conectado
      
      console.log('\n🔍 Checking conversation for client:', firstClient.id);
      
      const { data: conv, error: convError } = await supabase
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
        .eq('cliente_id', firstClient.id)
        .eq('whatsapp_number', whatsappNumber)
        .maybeSingle();
        
      console.log('Conversation data:', conv);
      console.log('Conversation error:', convError);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

debugCliente();
// Script para verificar mensagens da Thais
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ltqkzllbtwlaykmqzvnu.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0cWt6bGxidHdsYXlrbXF6dm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MDY1ODQsImV4cCI6MjA0MjQ4MjU4NH0.3swW0JN5MajnKiRALs7b3YCT74vdpRWrYjcxjnv7hps';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkThaisMessages() {
  console.log('🔍 Verificando cliente Thais...\n');
  
  // 1. Buscar cliente Thais
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nome', '%thais%')
    .single();
    
  if (clienteError) {
    console.error('Erro ao buscar cliente:', clienteError);
    return;
  }
  
  console.log('👤 Cliente encontrado:', {
    id: cliente.id,
    nome: cliente.nome,
    phone: cliente.phone,
    whatsappNumber: cliente.whatsapp_number,
    hasWhatsApp: cliente.has_whatsapp
  });
  
  // 2. Buscar conversas
  const { data: conversas, error: conversasError } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('cliente_id', cliente.id);
    
  console.log('\n💬 Conversas encontradas:', conversas?.length || 0);
  if (conversas && conversas.length > 0) {
    conversas.forEach((conv, index) => {
      console.log(`Conversa ${index + 1}:`, {
        id: conv.id,
        phone_number: conv.phone_number,
        last_message_at: conv.last_message_at
      });
    });
  }
  
  // 3. Buscar mensagens para cada conversa
  if (conversas && conversas.length > 0) {
    for (const conversa of conversas) {
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversa.id)
        .order('created_at', { ascending: true });
        
      console.log(`\n📄 Mensagens na conversa ${conversa.id}:`, messages?.length || 0);
      if (messages && messages.length > 0) {
        messages.forEach((msg, index) => {
          console.log(`  Msg ${index + 1}:`, {
            id: msg.id,
            content: msg.content,
            sender_type: msg.sender_type,
            created_at: msg.created_at
          });
        });
      }
    }
  }
}

checkThaisMessages().catch(console.error);
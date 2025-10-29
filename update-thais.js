// Update Thais Cabral client with WhatsApp number
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function updateThaisClient() {
  console.log('🔍 Procurando cliente Thais...');
  
  try {
    // Buscar cliente Thais
    const { data: clientes, error: searchError } = await supabase
      .from('clientes')
      .select('*')
      .or('nome_fantasia.ilike.%thais%,razao_social.ilike.%thais%');

    console.log('Resultados da busca por Thais:', clientes);
    console.log('Erro na busca:', searchError);

    if (clientes && clientes.length > 0) {
      const thaisClient = clientes[0];
      console.log('\n✅ Cliente Thais encontrado:', thaisClient);
      
      // Atualizar com número do WhatsApp
      const { data: updateData, error: updateError } = await supabase
        .from('clientes')
        .update({
          whatsapp_number: '556192209067', // Número do WhatsApp (correto com 9)
          telefone: '556192209067' // Mesmo número como telefone
        })
        .eq('id', thaisClient.id)
        .select();

      console.log('\n📱 Cliente atualizado:', updateData);
      console.log('Erro na atualização:', updateError);
      
      if (!updateError) {
        console.log('✅ Número do WhatsApp adicionado com sucesso!');
      }
    } else {
      console.log('❌ Cliente Thais não encontrado');
      
      // Vamos criar um cliente de teste
      console.log('\n🆕 Criando cliente Thais de teste...');
      
      const { data: newClient, error: createError } = await supabase
        .from('clientes')
        .insert({
          codigo_cliente: 'TEST001',
          nome_fantasia: 'Thais Cabral',
          razao_social: 'Thais Cabral',
          natureza_cliente: 'PESSOA FÍSICA',
          tipo_cliente: 'PRIVADO',
          cpf_cnpj: '123.456.789-00',
          situacao: 'ATIVO',
          estado: 'DF',
          cidade: 'BRASÍLIA',
          bairro: 'ASA NORTE',
          endereco: 'SQN 100',
          numero: '100',
          cep: '70000-000',
          whatsapp_number: '5561992209067',
          telefone: '5561992209067',
          email: 'thais@teste.com',
          origem: 'manual',
          status: 'ativo'
        })
        .select();

      console.log('Novo cliente criado:', newClient);
      console.log('Erro na criação:', createError);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

updateThaisClient();
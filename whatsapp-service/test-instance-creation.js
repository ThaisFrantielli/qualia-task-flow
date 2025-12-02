const fetch = require('node-fetch');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testInstanceCreation() {
  console.log('🔍 Testando criação de instância WhatsApp...\n');
  
  try {
    // 1. Verificar status do serviço
    console.log('1️⃣ Verificando status do serviço...');
    const healthResponse = await fetch('http://localhost:3006/status');
    const health = await healthResponse.json();
    console.log('✅ Serviço online:', health);
    console.log('');
    
    // 2. Criar nova instância
    console.log('2️⃣ Criando nova instância de teste...');
    const crypto = require('crypto');
    const testId = crypto.randomUUID();
    
    // Criar no Supabase primeiro (simulando o frontend)
    console.log('   Inserindo no Supabase...');
    const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .insert({
          id: testId,
          name: 'teste-diagnostico-' + Date.now(),
          status: 'disconnected'
        });
        
    if (dbError) {
        console.error('❌ Erro ao inserir no Supabase:', dbError);
        // Se falhar aqui, é provável que falhe no serviço também se for RLS
        // Mas vamos tentar continuar
    } else {
        console.log('✅ Inserido no Supabase com sucesso');
    }

    const createResponse = await fetch('http://localhost:3006/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: testId,
        name: 'teste-diagnostico-' + Date.now() 
      })
    });
    
    const instance = await createResponse.json();
    console.log('✅ Instância criada no serviço:', instance);
    console.log('');
    
    const instanceId = testId;
    
    // 3. Aguardar geração do QR Code
    console.log('3️⃣ Aguardando geração do QR Code (30 segundos)...');
    let qrFound = false;
    
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar via API do serviço
      const qrResponse = await fetch(`http://localhost:3006/instances/${instanceId}/qr`);
      const qrData = await qrResponse.json();
      
      console.log(`   Tentativa ${i + 1}/15:`, {
        hasQr: !!qrData.qrCode,
        qrLength: qrData.qrCode ? qrData.qrCode.length : 0
      });
      
      if (qrData.qrCode) {
        qrFound = true;
        console.log('\n✅ QR Code gerado com sucesso!');
        console.log('   QR Code (primeiros 100 chars):', qrData.qrCode.substring(0, 100) + '...');
        break;
      }
    }
    
    if (!qrFound) {
      console.log('\n❌ QR Code NÃO foi gerado após 30 segundos');
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
  }
}

testInstanceCreation();

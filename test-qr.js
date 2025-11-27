// Teste rápido para verificar se o QR Code está sendo salvo
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function testWhatsAppConfig() {
  console.log('Testing WhatsApp config fetch...');
  
  try {
    // Primeiro, vamos buscar todos os registros
    const { data: allData, error: allError } = await supabase
      .from('whatsapp_config')
      .select('*');

    console.log('All records:', allData);
    console.log('All records error:', allError);
    
    if (allData && allData.length > 0) {
      console.log(`Found ${allData.length} record(s)`);
      
      // Buscar o mais recente com QR code
      const withQR = allData.find(record => record.qr_code);
      
      if (withQR) {
        console.log('QR Code found! Length:', withQR.qr_code.length);
        console.log('Connection status:', withQR.is_connected);
        console.log('Connected number:', withQR.connected_number);
        console.log('First 100 chars of QR:', withQR.qr_code.substring(0, 100));
      } else {
        console.log('No record with QR Code found');
      }
    } else {
      console.log('No records found in whatsapp_config table');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testWhatsAppConfig();
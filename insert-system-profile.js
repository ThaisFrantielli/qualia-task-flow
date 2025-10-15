// Insert system profile directly with minimal data
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function insertSystemProfile() {
  console.log('🔧 Attempting to insert system profile directly...');
  
  try {
    const systemUserId = '00000000-0000-0000-0000-000000000001';
    
    // Tentar inserção mais simples possível
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `INSERT INTO profiles (id) VALUES ('${systemUserId}') ON CONFLICT (id) DO NOTHING RETURNING *;`
      });

    console.log('RPC result:', data);
    console.log('RPC error:', error);
    
    if (error) {
      // Tentar abordagem alternativa
      console.log('\n🔄 Trying alternative approach...');
      
      // Verificar se podemos criar via auth primeiro
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'sistema@whatsapp.local',
        password: 'sistema123',
        user_metadata: {
          nome: 'Sistema WhatsApp'
        }
      });
      
      console.log('Auth creation:', authData);
      console.log('Auth error:', authError);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

insertSystemProfile();
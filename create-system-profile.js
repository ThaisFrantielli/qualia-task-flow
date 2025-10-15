// Create system profile for WhatsApp
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function createSystemProfile() {
  console.log('🔧 Creating system profile...');
  
  try {
    const systemUserId = '00000000-0000-0000-0000-000000000001';
    
    // Tentar criar perfil sistema
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: systemUserId,
        nome: 'Sistema WhatsApp',
        email: 'whatsapp@sistema.local',
        tipo: 'system',
        nivel_acesso: 'system'
      })
      .select();

    console.log('Profile created:', profileData);
    console.log('Profile error:', profileError);
    
    if (profileError) {
      console.log('❌ Failed to create profile, might already exist or schema is different');
      
      // Vamos verificar o schema da tabela profiles
      console.log('\n🔍 Let\'s check what profiles table looks like...');
      
      // Tentar inserir com campos mínimos
      const { data: minProfile, error: minError } = await supabase
        .from('profiles')
        .insert({
          id: systemUserId
        })
        .select();
        
      console.log('Minimal profile:', minProfile);
      console.log('Minimal error:', minError);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

createSystemProfile();
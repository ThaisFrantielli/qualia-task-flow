// Create system user for WhatsApp using service role
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function createSystemUser() {
  console.log('🔧 Creating system user with admin client...');
  
  try {
    const systemUserId = '00000000-0000-0000-0000-000000000001';
    
    // Primeiro, verificar se já existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', systemUserId)
      .single();
      
    if (existingProfile) {
      console.log('✅ System profile already exists:', existingProfile);
      return;
    }
    
    // Tentar criar com service role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: systemUserId,
        nome: 'Sistema WhatsApp',
        email: 'sistema@whatsapp.local'
      })
      .select();

    console.log('Profile created:', profileData);
    console.log('Profile error:', profileError);
    
    if (!profileError) {
      console.log('✅ System profile created successfully!');
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

createSystemUser();
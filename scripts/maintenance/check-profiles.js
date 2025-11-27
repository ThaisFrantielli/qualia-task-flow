// Create system user for WhatsApp messages
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function checkProfiles() {
  console.log('🔍 Checking profiles table...');
  
  try {
    // Verificar se existe tabela profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    console.log('Profiles found:', profiles);
    console.log('Profiles error:', profilesError);
    
    if (profiles && profiles.length > 0) {
      console.log('✅ Using first profile as system user:', profiles[0].id);
      return profiles[0].id;
    } else {
      console.log('❌ No profiles found');
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
  
  return null;
}

checkProfiles();
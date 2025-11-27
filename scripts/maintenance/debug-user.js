// Debug user auth
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function debugUser() {
  console.log('🔍 Checking current user...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('Current user:', user);
    console.log('Auth error:', error);
    
    if (user) {
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
    } else {
      console.log('❌ No user logged in');
      
      // Verificar se há sessão
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

debugUser();
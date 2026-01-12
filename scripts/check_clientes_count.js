import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    const res1 = await supabase.from('clientes').select('id', { count: 'exact', head: true });
    console.log('clientes -> error:', res1.error, 'count:', res1.count);

    const res2 = await supabase.from('cliente_contatos').select('id', { count: 'exact', head: true });
    console.log('cliente_contatos -> error:', res2.error, 'count:', res2.count);
  } catch (err) {
    console.error(err);
  }
})();

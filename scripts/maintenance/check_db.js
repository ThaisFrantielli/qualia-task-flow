import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Verificando conversas recentes...');
    const { data: convs, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (convError) console.error('Erro convs:', convError);
    else console.log('Conversas encontradas:', convs?.length, JSON.stringify(convs, null, 2));

    console.log('Verificando mensagens recentes...');
    const { data: msgs, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (msgError) console.error('Erro msgs:', msgError);
    else console.log('Mensagens encontradas:', msgs?.length, JSON.stringify(msgs, null, 2));
}

checkData();

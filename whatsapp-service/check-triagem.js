const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTriagem() {
    console.log('Verificando leads na triagem...\n');

    // 1. Buscar leads aguardando
    const { data: leads, error: leadsError } = await supabase
        .from('clientes')
        .select('*')
        .eq('status_triagem', 'aguardando')
        // Some databases don't have `created_at` on clientes; use `cadastro_cliente`.
        .order('cadastro_cliente', { ascending: false });

    if (leadsError) {
        console.error('Erro ao buscar leads:', leadsError);
        return;
    }

    console.log(`✓ Encontrados ${leads?.length || 0} leads aguardando triagem\n`);

    if (leads && leads.length > 0) {
        leads.forEach((lead, index) => {
            console.log(`Lead ${index + 1}:`);
            console.log(`  ID: ${lead.id}`);
            console.log(`  Nome: ${lead.nome_fantasia || 'N/A'}`);
            console.log(`  WhatsApp: ${lead.whatsapp_number || 'N/A'}`);
            console.log(`  Origem: ${lead.origem || 'N/A'}`);
            console.log(`  Status: ${lead.status_triagem}`);
            console.log(`  Criado em: ${lead.created_at}\n`);
        });
    }

    // 2. Buscar conversas WhatsApp
    const { data: conversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (convError) {
        console.error('Erro ao buscar conversas:', convError);
    } else {
        console.log(`✓ Encontradas ${conversations?.length || 0} conversas WhatsApp (últimas 5)\n`);
        if (conversations && conversations.length > 0) {
            conversations.forEach((conv, index) => {
                console.log(`Conversa ${index + 1}:`);
                console.log(`  ID: ${conv.id}`);
                console.log(`  Telefone: ${conv.customer_phone || conv.whatsapp_number}`);
                console.log(`  Cliente ID: ${conv.cliente_id || 'N/A'}`);
                console.log(`  Última mensagem: ${conv.last_message}`);
                console.log(`  Criado em: ${conv.created_at}\n`);
            });
        }
    }

    // 3. Buscar mensagens WhatsApp
    const { data: messages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (msgError) {
        console.error('Erro ao buscar mensagens:', msgError);
    } else {
        console.log(`✓ Encontradas ${messages?.length || 0} mensagens WhatsApp (últimas 5)\n`);
        if (messages && messages.length > 0) {
            messages.forEach((msg, index) => {
                console.log(`Mensagem ${index + 1}:`);
                console.log(`  Conteúdo: ${msg.content}`);
                console.log(`  De: ${msg.sender_type}`);
                console.log(`  Criado em: ${msg.created_at}\n`);
            });
        }
    }
}

checkTriagem();

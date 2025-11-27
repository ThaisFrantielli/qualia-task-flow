#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://uanmdhbtocfslmmjbrsw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbm1kaGJ0b2Nmc2xtbWpicnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk5MzY3MjksImV4cCI6MjA0NTUxMjcyOX0.DK_gHFTdwTPJfOdJZU_G5SY6xCWLcXvJTNJmCzOMPrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking messages in database...\n');

async function checkMessages() {
  try {
    // 1. Verificar se existe conversação para Thais
    console.log('1️⃣ Looking for Thais conversation...');
    const { data: conversations, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        whatsapp_number,
        created_at,
        clientes:cliente_id (
          razao_social,
          whatsapp_number,
          telefone
        )
      `)
      .eq('whatsapp_number', '556192209067');

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return;
    }

    console.log('Found conversations:', conversations);

    if (!conversations || conversations.length === 0) {
      console.log('❌ No conversations found for 556192209067');
      return;
    }

    const conversation = conversations[0];
    console.log(`✅ Found conversation ID: ${conversation.id}`);

    // 2. Verificar mensagens na conversação
    console.log('\n2️⃣ Looking for messages in conversation...');
    const { data: messages, error: msgError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return;
    }

    console.log(`Found ${messages?.length || 0} messages:`);
    
    if (messages && messages.length > 0) {
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.content}`);
        console.log(`     Created: ${msg.created_at}`);
        console.log(`     ID: ${msg.id}`);
        console.log('');
      });
    } else {
      console.log('❌ No messages found in conversation');
    }

    // 3. Teste de inserção para verificar se o constraint está ok
    console.log('3️⃣ Testing message insertion...');
    const testMessage = {
      conversation_id: conversation.id,
      sender_type: 'system',
      content: `Teste de verificação - ${new Date().toLocaleTimeString()}`,
      message_type: 'text'
    };

    console.log('Test message data:', testMessage);

    const { data: insertResult, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert(testMessage)
      .select();

    if (insertError) {
      console.error('❌ Error inserting test message:', insertError);
    } else {
      console.log('✅ Test message inserted successfully:', insertResult);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkMessages();
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://uanmdhbtocfslmmjbrsw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbm1kaGJ0b2Nmc2xtbWpicnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk5MzY3MjksImV4cCI6MjA0NTUxMjcyOX0.DK_gHFTdwTPJfOdJZU_G5SY6xCWLcXvJTNJmCzOMPrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando dados da cliente Thais...\n');

async function checkThaisData() {
  try {
    // 1. Buscar dados da cliente Thais
    console.log('1️⃣ Buscando cliente Thais Cabral...');
    const { data: clientes, error: clientError } = await supabase
      .from('clientes')
      .select('*')
      .ilike('razao_social', '%thais%');

    if (clientError) {
      console.error('Erro ao buscar cliente:', clientError);
      return;
    }

    console.log('Clientes encontrados:', clientes);

    // 2. Verificar conversações existentes
    console.log('\n2️⃣ Verificando conversações WhatsApp...');
    const { data: conversations, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        whatsapp_number,
        cliente_id,
        clientes:cliente_id (
          razao_social,
          telefone,
          whatsapp_number
        )
      `)
      .eq('whatsapp_number', '556192209067');

    if (convError) {
      console.error('Erro ao buscar conversações:', convError);
      return;
    }

    console.log('Conversações encontradas:', JSON.stringify(conversations, null, 2));

    // 3. Sugerir correção
    if (clientes && clientes.length > 0) {
      const thais = clientes[0];
      console.log('\n3️⃣ Dados da cliente Thais:');
      console.log(`  - ID: ${thais.id}`);
      console.log(`  - Nome: ${thais.razao_social}`);
      console.log(`  - Telefone: ${thais.telefone}`);
      console.log(`  - WhatsApp: ${thais.whatsapp_number}`);
      
      console.log('\n4️⃣ Problema identificado:');
      console.log(`  - Número real da Thais: ${thais.telefone || 'não cadastrado'}`);
      console.log(`  - WhatsApp cadastrado: ${thais.whatsapp_number || 'não cadastrado'}`);
      console.log(`  - Conversação usando: 556192209067 (número do sistema)`);
      
      console.log('\n5️⃣ Correção necessária:');
      if (thais.telefone) {
        console.log(`  - Atualizar whatsapp_number da cliente para: ${thais.telefone}`);
        console.log(`  - Atualizar conversação para usar: ${thais.telefone}`);
      } else {
        console.log('  - Primeiro cadastrar o telefone correto da cliente');
      }
    }

  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

checkThaisData();
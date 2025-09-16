import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Este é o teste definitivo. Se as variáveis não forem lidas, a aplicação vai parar aqui.
if (!supabaseUrl || !supabaseAnonKey) {
  // Escreve uma mensagem de erro GIGANTE e VERMELHA diretamente na página.
  document.body.innerHTML = `<div style="background-color: #ff4136; color: white; padding: 40px; font-family: sans-serif; font-size: 24px; text-align: center;">
    <h1>ERRO CRÍTICO DE CONFIGURAÇÃO</h1>
    <p>As variáveis de ambiente do Supabase não foram carregadas.</p>
    <p>Verifique os seguintes pontos:</p>
    <ol style="text-align: left; display: inline-block; margin-top: 20px;">
      <li>O arquivo <strong>.env.local</strong> está na pasta raiz do projeto?</li>
      <li>As variáveis dentro dele começam com o prefixo <strong>VITE_</strong>?</li>
      <li>Você <strong>reiniciou o servidor de desenvolvimento</strong> (npm run dev)?</li>
    </ol>
  </div>`;

  // Lança um erro para travar completamente a execução.
  throw new Error("ERRO: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidas.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
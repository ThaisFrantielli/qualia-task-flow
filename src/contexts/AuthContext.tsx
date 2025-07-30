import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Importando nossos tipos personalizados
import type { TeamMember } from '@/pages/Team';

// O tipo de usuário da nossa aplicação será uma união do usuário do Supabase e do nosso TeamMember
export type AppUser = SupabaseUser & Partial<TeamMember>;

// Definindo o tipo para o valor do nosso contexto
interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
}

// Criando o contexto com um valor padrão
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

// Criando o provedor do contexto
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      // 1. Pega a sessão de autenticação do Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session) {
        setSession(session);
        
        // 2. Se há uma sessão, busca o perfil correspondente na tabela 'profiles'
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*') // Pega todas as colunas do perfil
          .eq('id', session.user.id) // Onde o 'id' do perfil é igual ao 'id' do usuário logado
          .single(); // Esperamos apenas um resultado

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError.message);
        }

        // 3. Junta os dados da autenticação com os dados do perfil
        const enrichedUser: AppUser = {
          ...session.user, // Dados do Supabase Auth (email, id, etc.)
          ...profileData, // Dados da nossa tabela 'profiles' (nome, funcao, nivelAcesso, permissoes)
        };
        setUser(enrichedUser);

      } else if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError.message);
      }
      
      setLoading(false);
    };

    fetchSessionAndProfile();

    // 4. Ouve por mudanças na autenticação (login/logout) e repete o processo
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // Quando o estado muda, recarrega o perfil também
        fetchSessionAndProfile();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
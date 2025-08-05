// src/contexts/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { TeamMember } from '@/pages/Team';

// Tipagem para o metadata do usuário
interface UserMetadata {
  avatar_url?: string;
  full_name?: string;
}

// Tipo de usuário da nossa aplicação
export type AppUser = Omit<SupabaseUser, 'user_metadata'> & Partial<TeamMember> & {
  user_metadata: UserMetadata;
};

// Tipagem para o valor do contexto
interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
}

// Criação do Contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Componente Provedor
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const fetchSessionAndProfile = async (currentSession: Session | null) => {
      if (currentSession) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError.message);
        }
        
        const enrichedUser = {
          ...currentSession.user,
          ...profileData,
        } as AppUser;
        setUser(enrichedUser);
        setSession(currentSession);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    };

    // Pega a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionAndProfile(session);
    });

    // Ouve por mudanças (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        fetchSessionAndProfile(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = { session, user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook customizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
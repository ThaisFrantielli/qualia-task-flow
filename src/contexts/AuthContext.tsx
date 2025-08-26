// src/contexts/AuthContext.tsx

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { requestNotificationPermission } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
// --- CORREÇÃO APLICADA AQUI ---
// 1. Importamos AppUser do nosso arquivo de tipos central.
import type { AppUser } from '@/types'; 

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchSessionAndProfile = async (currentSession: Session | null) => {
      if (currentSession) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        // Solicita permissão e salva o token de push notification
        try {
          const token = await requestNotificationPermission();
          if (token && profileData?.push_token !== token) {
            await supabase.from('profiles').update({ push_token: token }).eq('id', currentSession.user.id);
          }
        } catch (e) {
          // Permissão negada ou erro, ignora
        }

        setUser({
          ...currentSession.user,
          ...profileData,
          email: profileData?.email ?? currentSession.user.email ?? ''
        });
        setSession(currentSession);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchSessionAndProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSessionAndProfile(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = { session, user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    if (typeof window !== 'undefined') {
      // Exibe erro visual na tela para facilitar diagnóstico
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = '<div style="background:#ffdddd;color:#a00;padding:24px;font-size:18px;font-weight:bold;text-align:center;">ERRO: useAuth chamado fora do AuthProvider!<br>Verifique se o AuthProvider está no topo da árvore de componentes.</div>';
      }
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
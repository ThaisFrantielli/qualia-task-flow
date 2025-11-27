// DEBUG: AuthContext.tsx loaded
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { AppUser, Permissoes } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (currentSession: Session) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (error) {
        throw error;
      }

      // Garante que as permissões sejam um objeto, não uma string JSON
      let finalPermissoes = profileData?.permissoes;
      if (typeof finalPermissoes === 'string') {
        try {
          finalPermissoes = JSON.parse(finalPermissoes) as Permissoes;
        } catch (e) {
          console.error("Erro ao fazer parse das permissões:", e);
          finalPermissoes = null;
        }
      } else if (finalPermissoes && typeof finalPermissoes === 'object') {
        finalPermissoes = finalPermissoes as Permissoes;
      } else {
        finalPermissoes = null;
      }

      const updatedUser: AppUser = {
        ...currentSession.user,
        ...(profileData || {}),
        email: profileData?.email || currentSession.user.email || '',
        permissoes: finalPermissoes,
        // Derivar isAdmin no frontend de forma consistente com as funções SQL
        isAdmin: (profileData?.nivelAcesso === 'Admin') || (finalPermissoes?.is_admin === true) || false,
        // Derivar isSupervisor para simplificar checks: Supervisão ou Gestão ou Admin
        isSupervisor: ['Supervisão', 'Gestão', 'Admin'].includes(profileData?.nivelAcesso || '') || (finalPermissoes?.is_admin === true) || false,
      };

      setUser(updatedUser);
      setSession(currentSession);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session);
      } else {
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
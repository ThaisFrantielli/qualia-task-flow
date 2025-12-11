// DEBUG: AuthContext.tsx loaded
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { AppUser, Permissoes } from '@/types';

// Profile type for force password change and other profile-specific features
export interface UserProfile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  funcao?: string | null;
  nivelAcesso?: string | null;
  permissoes?: Permissoes | null;
  force_password_change?: boolean | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

      // Set profile for force password change and other features
      const userProfile: UserProfile = {
        id: profileData?.id || currentSession.user.id,
        full_name: profileData?.full_name,
        email: profileData?.email || currentSession.user.email,
        funcao: profileData?.funcao,
        nivelAcesso: profileData?.nivelAcesso,
        permissoes: finalPermissoes,
        force_password_change: profileData?.force_password_change,
        avatar_url: profileData?.avatar_url,
      };
      setProfile(userProfile);

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
      setProfile(null);
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
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, profile }}>
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
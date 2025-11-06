// FASE 5.1: Hook customizado para verificar acesso a módulos
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useModuleAccess = (moduleKey: string) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    
    const checkAccess = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .rpc('has_module_access', {
            _user_id: user.id,
            _module_key: moduleKey
          });
        
        if (error) {
          console.error('Erro ao verificar acesso ao módulo:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data || false);
        }
      } catch (err) {
        console.error('Erro ao verificar acesso:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [user, moduleKey]);
  
  return { hasAccess, loading };
};

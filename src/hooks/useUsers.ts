import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User } from '../types'; // Importa User de src/types/index.ts

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles') // Corrigido de 'users' para 'profiles'
          .select('id, full_name, avatar_url'); // Selecionando id, full_name e avatar_url conforme a definição de User em src/types/index.ts

        if (error) {
          throw error;
        }

        setUsers(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
};
import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User } from '../types'; // Importe o tipo User

export const useUsers = () => {
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      let { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, email'); // Adicionado 'email'
      if (error) {
        setError(error.message);
        setLoading(false);
        console.error('Error fetching users:', error);
      } else {
        setUsers(data as User[] | null); // Garantindo que o tipo seja User[] ou null
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
};
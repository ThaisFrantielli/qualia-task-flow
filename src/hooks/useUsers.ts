import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client'; // Assuming you have a supabase client instance
import { User } from '../types'; // Assuming you have a User type defined

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users') // Assuming your user table is named 'users'
          .select('id, full_name'); // Select the fields you need

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
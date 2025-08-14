// src/contexts/UsersContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';

interface UsersContextType {
  users: Profile[];
  isLoading: boolean;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

const fetchUsers = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, email');
  if (error) throw new Error(error.message);
  return data || [];
};

export const UsersProvider = ({ children }: { children: ReactNode }) => {
  const { data: users, isLoading } = useQuery<Profile[], Error>({
    queryKey: ['users'], // Chave única para o cache
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // Considera os dados "frescos" por 5 minutos
  });

  const value = { users: users ?? [], isLoading };

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
};

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsersContext must be used within a UsersProvider');
  }
  return context;
};
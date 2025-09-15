import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';

export type CustomerRow = Database['public']['Tables']['atendimentos']['Row'];

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const deleteCustomer = async (customerId: number) => {
    try {
      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      });

      // Refresh the customers list
      await fetchCustomers();
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir o cliente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const createCustomer = async (customerData: Partial<CustomerRow>) => {
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Cliente criado",
        description: "O cliente foi criado com sucesso.",
      });

      // Refresh the customers list
      await fetchCustomers();
      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar o cliente.",
        variant: "destructive",
      });
      return null;
    }
  };

  return { 
    customers, 
    loading, 
    error, 
    deleteCustomer, 
    createCustomer,
    refreshCustomers: fetchCustomers
  };
}

import { useState } from 'react';
import { supabase } from '../integrations/supabase';
import { toast } from '../hooks/use-toast';

export function useClienteDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Verifica dependências antes de excluir um cliente
   */
  const verificarDependencias = async (clienteId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar atendimentos ativos
      const { data: atendimentos, error: atendimentosError } = await supabase
        .from('atendimentos')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('status', 'Em Andamento');
      
      if (atendimentosError) throw new Error(atendimentosError.message);
      
      // Verificar tarefas pendentes
      const { data: tarefas, error: tarefasError } = await supabase
        .from('tarefas')
        .select('id')
        .eq('cliente_id', clienteId)
        .in('status', ['pendente', 'em_andamento']);
      
      if (tarefasError) throw new Error(tarefasError.message);
      
      return {
        temDependencias: (atendimentos?.length || 0) > 0 || (tarefas?.length || 0) > 0,
        atendimentosAtivos: atendimentos?.length || 0,
        tarefasPendentes: tarefas?.length || 0
      };
    } catch (err: any) {
      setError(err.message);
      return { temDependencias: true, erro: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Realiza soft delete do cliente
   */
  const deletarCliente = async (clienteId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Realizar soft delete (atualizar flag deleted para true)
      const { error } = await supabase
        .from('clientes')
        .update({ 
          deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', clienteId);
      
      if (error) throw new Error(error.message);
      
      toast({
        title: "Cliente excluído com sucesso",
        description: "O cliente foi marcado como excluído no sistema",
      });
      
      return true;
    } catch (err: any) {
      setError(err.message);
      
      toast({
        variant: "destructive",
        title: "Erro ao excluir cliente",
        description: err.message,
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    verificarDependencias,
    deletarCliente,
    loading,
    error
  };
}

export default useClienteDelete;
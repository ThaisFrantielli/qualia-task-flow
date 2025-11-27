// src/components/customer-management/ClientDetailView.tsx (VERSÃO FINAL CORRIGIDA)

interface ClientDetailViewProps {
  // --- CORREÇÃO APLICADA AQUI ---
  // A propriedade 'clientId' agora aceita 'string | null', 
  // alinhando-se com o tipo de dado real (UUID do Supabase).
  clientId: string | null;
}

const ClientDetailView = ({ clientId }: ClientDetailViewProps) => {
  if (!clientId) {
    return <div className="p-6 text-center text-gray-500">Selecione um cliente para ver os detalhes.</div>;
  }

  // Agora que sabemos que o clientId é uma string, podemos usá-lo com segurança.
  // No futuro, você usaria este ID para buscar os dados completos do cliente.
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Detalhes do Cliente</h2>
      <p className="text-gray-600">ID: {clientId}</p>
      {/* Aqui você faria a busca e exibiria os detalhes completos do cliente */}
      <p className="mt-4">Informações detalhadas do cliente aparecerão aqui.</p>
    </div>
  );
};

export default ClientDetailView;
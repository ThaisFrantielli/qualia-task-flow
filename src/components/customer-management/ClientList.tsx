// src/components/customer-management/ClientList.tsx (VERSÃO FINAL CORRIGIDA)

import type { Cliente } from '@/types';

interface ClientListProps {
  clients: Cliente[];
  // --- CORREÇÃO APLICADA AQUI ---
  // Os tipos agora correspondem ao que a página pai está enviando (string).
  selectedClientId: string | null;
  onSelectClient: (id: string) => void;
}

const ClientList = ({ clients, selectedClientId, onSelectClient }: ClientListProps) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Clientes</h2>
      <ul>
        {clients.map(client => (
          <li
            key={client.id}
            // onSelectClient agora recebe client.id (string), o que está correto.
            onClick={() => onSelectClient(client.id)}
            // A comparação agora é entre duas strings, o que está correto.
            className={`p-2 rounded cursor-pointer ${
              selectedClientId === client.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {/* --- CORREÇÃO APLICADA AQUI --- */}
            {/* Usamos 'nome_fantasia' ou 'razao_social' que existem na tabela. */}
            {client.nome_fantasia || client.razao_social || 'Cliente sem nome'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientList;
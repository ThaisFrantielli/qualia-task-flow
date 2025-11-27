import React from 'react';

interface CustomerActionsPanelProps {
  onCreate: (data: any) => void;
}

const CustomerActionsPanel: React.FC<CustomerActionsPanelProps> = ({ onCreate }) => {
  return (
    <aside className="col-span-3 bg-white rounded-lg shadow p-4 flex flex-col">
      <h2 className="font-semibold text-lg mb-4">Nova Atividade</h2>
      <input type="text" placeholder="Assunto" className="mb-2 border rounded px-3 py-1 text-sm" />
      <select className="mb-2 border rounded px-3 py-1 text-sm">
        <option>Call</option>
        <option>Email</option>
        <option>Encontro</option>
        <option>Texto</option>
      </select>
      <input type="date" className="mb-2 border rounded px-3 py-1 text-sm" />
      <input type="time" className="mb-2 border rounded px-3 py-1 text-sm" />
      <input type="text" placeholder="Localização" className="mb-2 border rounded px-3 py-1 text-sm" />
      <button className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition" onClick={() => onCreate({})}>Criar</button>
    </aside>
  );
};

export default CustomerActionsPanel;

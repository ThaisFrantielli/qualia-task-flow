import React from 'react';

export interface Customer {
  id: number;
  name: string;
  status: string;
  responsible: string;
  initials: string;
}

interface CustomerListProps {
  customers: Customer[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, selectedId, onSelect }) => (
  <aside className="col-span-3 bg-white rounded-lg shadow p-4 flex flex-col">
    <h2 className="font-semibold text-lg mb-4">Clientes</h2>
    <ul className="flex-1 overflow-y-auto divide-y">
      {customers.map((c) => (
        <li
          key={c.id}
          className={`py-3 cursor-pointer hover:bg-blue-50 rounded px-2 ${selectedId === c.id ? 'bg-blue-100' : ''}`}
          onClick={() => onSelect(c.id)}
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">{c.initials}</span>
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.status} • {c.responsible}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </aside>
);

export default CustomerList;

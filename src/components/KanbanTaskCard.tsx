import { CalendarIcon } from '@heroicons/react/24/outline';

export interface KanbanTaskCardProps {
  id: number | string;
  cliente: string;
  resumo?: string;
  data: string;
  motivo: string;
  avatar?: string;
}

const KanbanTaskCard = ({ id, cliente, resumo, data, motivo, avatar }: KanbanTaskCardProps) => {
  return (
    <div className={`group border border-gray-200 bg-white rounded-xl p-4 flex gap-4 items-center shadow hover:shadow-lg transition cursor-pointer relative min-h-[90px]`}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border-2 border-blue-400 text-blue-700 bg-blue-50">
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 text-base truncate">{cliente}</span>
          <span className="text-xs text-gray-400">#{id}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs flex items-center gap-1 text-gray-500">
            <CalendarIcon className="w-4 h-4" /> {data}
          </span>
          <span className="text-xs text-gray-400">• {motivo}</span>
        </div>
        {resumo && <div className="text-xs text-gray-700 mt-1 truncate">{resumo}</div>}
      </div>
    </div>
  );
};

export default KanbanTaskCard;

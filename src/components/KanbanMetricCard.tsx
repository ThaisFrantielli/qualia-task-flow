import { ReactNode } from "react";

interface KanbanMetricCardProps {
  value: number;
  label: string;
  color: string;
  icon: ReactNode;
  highlight?: boolean;
}

export function KanbanMetricCard({ value, label, color, icon, highlight }: KanbanMetricCardProps) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 shadow-sm border ${highlight ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'} min-w-[180px]`}> 
      <div className={`w-10 h-10 flex items-center justify-center rounded-full text-xl ${color} bg-opacity-10`}>{icon}</div>
      <div className="flex flex-col">
        <span className={`font-bold text-2xl ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</span>
        <span className={`text-xs ${highlight ? 'text-red-500' : 'text-gray-500'}`}>{label}</span>
      </div>
    </div>
  );
}

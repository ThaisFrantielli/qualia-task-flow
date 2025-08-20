import React from 'react';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface PortfolioListItemProps {
  portfolio: {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    projectIds?: string[];
  };
  onEdit: (portfolio: any) => void;
  onDelete: (id: string) => void;
}


export const PortfolioListItem: React.FC<PortfolioListItemProps> = ({ portfolio, onEdit, onDelete }) => {
  const projectIds = portfolio.projectIds || [];
  // Estado para todos os membros únicos
  const [allMembers, setAllMembers] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAllMembers() {
      let membersArr: any[] = [];
      for (const projectId of projectIds) {
        if (!projectId) continue;
        // hook não pode ser chamado em loop, então usamos supabase direto
        const { data } = await import('@/integrations/supabase/client').then(mod => mod.supabase.from('project_members').select('user_id, role, profiles:profiles(id, full_name, avatar_url, email)').eq('project_id', projectId));
        if (data) membersArr.push(...data.map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          full_name: m.profiles?.full_name,
          avatar_url: m.profiles?.avatar_url,
          email: m.profiles?.email
        })));
      }
      // Remover duplicados por user_id
      const unique = Object.values(membersArr.reduce((acc, m) => {
        acc[m.user_id] = m;
        return acc;
      }, {} as Record<string, any>));
      if (isMounted) setAllMembers(unique);
    }
    if (projectIds.length > 0) fetchAllMembers();
    else setAllMembers([]);
    return () => { isMounted = false; };
  }, [projectIds]);

  return (
    <li className="py-2 flex items-center gap-2 group">
      <span className="w-4 h-4 rounded-full" style={{ background: portfolio.color || '#6366f1' }} />
      <span className="font-medium">{portfolio.name}</span>
      {portfolio.description && <span className="text-xs text-gray-500 ml-2">{portfolio.description}</span>}
      {/* Avatares dos membros únicos de todos os projetos do portfólio */}
      {allMembers.length > 0 && (
        <TooltipProvider>
          <div className="flex -space-x-2 ml-2">
            {allMembers.slice(0, 3).map((m) => (
              <Tooltip key={m.user_id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 border-2 border-white shadow">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback>{(m.full_name || m.email || m.user_id).slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{m.full_name || m.email || m.user_id}</TooltipContent>
              </Tooltip>
            ))}
            {allMembers.length > 3 && (
              <span className="text-xs text-gray-400 ml-1">+{allMembers.length - 3}</span>
            )}
          </div>
        </TooltipProvider>
      )}
      <button
        className="ml-auto text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition"
        onClick={() => onEdit(portfolio)}
      >Editar</button>
      <button
        className="text-xs text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition"
        onClick={() => onDelete(portfolio.id)}
      >Excluir</button>
    </li>
  );
};

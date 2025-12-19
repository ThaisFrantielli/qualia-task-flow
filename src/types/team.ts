// Tipos para membros da equipe
import type { Permissoes } from '@/types';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  funcao: string;
  nivelAcesso: 'Usuário' | 'Supervisão' | 'Gestão' | 'Admin';
  tasksCount: number;
  avatar_url?: string;
  supervisor_id?: string | null;
  permissoes: Permissoes;
}

export type { Permissoes };

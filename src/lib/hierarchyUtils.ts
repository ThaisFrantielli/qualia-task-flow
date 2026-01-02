// src/lib/hierarchyUtils.ts
import type { Profile, TaskWithDetails, Project } from '@/types';

/**
 * Níveis de acesso no sistema (em ordem crescente de permissões)
 */
export const ACCESS_LEVELS = {
  USUARIO: 'Usuário',
  SUPERVISAO: 'Supervisão',
  GESTAO: 'Gestão',
  ADMIN: 'Admin',
} as const;

export type AccessLevel = typeof ACCESS_LEVELS[keyof typeof ACCESS_LEVELS];

/**
 * Verifica se um usuário tem permissão para ver dados de outro usuário
 * baseado na hierarquia organizacional
 * 
 * Regras:
 * - Admin: Vê TUDO
 * - Gestão: Vê gerentes + supervisores + usuários de suas unidades (recursivo)
 * - Supervisão: Vê apenas subordinados diretos
 * - Usuário: Vê apenas próprios dados
 */
export function canViewUserData(
  currentUser: Profile,
  targetUserId: string,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): boolean {
  // Derivados que podem ser preenchidos pelo AuthContext: isAdmin / isSupervisor
  const isAdmin = ((currentUser as any).isAdmin === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  const isSupervisor = ((currentUser as any).isSupervisor === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.SUPERVISAO || currentUser.nivelAcesso === ACCESS_LEVELS.GESTAO || currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);

  // Admin vê tudo
  if (isAdmin) {
    return true;
  }

  // Usuário vê apenas próprios dados
  if (currentUser.id === targetUserId) {
    return true;
  }

  // Se não for supervisor ou gestor, não pode ver dados de outros
  if (!isSupervisor) {
    return false;
  }

  // Verificar se o targetUserId está na hierarquia do usuário atual
  return isInTeamHierarchy(currentUser.id, targetUserId, hierarchyData);
}

/**
 * Verifica se um usuário está na hierarquia de outro (recursivamente)
 */
export function isInTeamHierarchy(
  supervisorId: string,
  userId: string,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): boolean {
  // Verificar subordinados diretos
  const directSubordinates = hierarchyData.filter(
    (h) => h.supervisor_id === supervisorId
  );

  if (directSubordinates.some((s) => s.user_id === userId)) {
    return true;
  }

  // Verificar subordinados indiretos (recursivo)
  for (const subordinate of directSubordinates) {
    if (isInTeamHierarchy(subordinate.user_id, userId, hierarchyData)) {
      return true;
    }
  }

  return false;
}

/**
 * Retorna todos os IDs de usuários que o currentUser pode visualizar
 */
export function getVisibleUserIds(
  currentUser: Profile,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): string[] {
  const isAdmin = ((currentUser as any).isAdmin === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);

  // Admin vê todos
  if (isAdmin) {
    // Retornar array vazio indica "ver todos" (não filtrar)
    return [];
  }

  const visibleIds = new Set<string>();
  
  // Adicionar próprio ID
  visibleIds.add(currentUser.id);

  // Se for supervisor ou gestor, adicionar toda a hierarquia
  const isSupervisor = ((currentUser as any).isSupervisor === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.SUPERVISAO || currentUser.nivelAcesso === ACCESS_LEVELS.GESTAO || currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  if (isSupervisor) {
    const subordinates = getAllSubordinates(currentUser.id, hierarchyData);
    subordinates.forEach((id) => visibleIds.add(id));
  }

  return Array.from(visibleIds);
}

/**
 * Retorna todos os subordinados de um supervisor (recursivo)
 */
export function getAllSubordinates(
  supervisorId: string,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): string[] {
  const subordinates = new Set<string>();

  function collectSubordinates(supId: string) {
    const directSubs = hierarchyData.filter((h) => h.supervisor_id === supId);
    
    directSubs.forEach((sub) => {
      subordinates.add(sub.user_id);
      // Recursão para pegar subordinados dos subordinados
      collectSubordinates(sub.user_id);
    });
  }

  collectSubordinates(supervisorId);
  return Array.from(subordinates);
}

/**
 * Filtra tarefas baseado na hierarquia
 * 
 * @param tasks - Lista de tarefas a filtrar
 * @param currentUser - Usuário atual
 * @param hierarchyData - Dados da hierarquia organizacional
 * @returns Tarefas que o usuário tem permissão de ver
 */
export function filterTasksByHierarchy(
  tasks: TaskWithDetails[],
  currentUser: Profile,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): TaskWithDetails[] {
  const isAdmin = ((currentUser as any).isAdmin === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  // Admin vê tudo
  if (isAdmin) {
    return tasks;
  }

  const visibleUserIds = getVisibleUserIds(currentUser, hierarchyData);

  return tasks.filter((task) => {
    // Se visibleUserIds está vazio, ver tudo (caso Admin)
    if (visibleUserIds.length === 0) {
      return true;
    }

    // Verificar se o usuário criou a tarefa
    if (task.user_id && visibleUserIds.includes(task.user_id)) {
      return true;
    }

    // Verificar se o usuário está atribuído à tarefa
    if (task.assignee_id && visibleUserIds.includes(task.assignee_id)) {
      return true;
    }

    return false;
  });
}

/**
 * Filtra projetos baseado na hierarquia
 * 
 * @param projects - Lista de projetos a filtrar
 * @param currentUser - Usuário atual
 * @param hierarchyData - Dados da hierarquia organizacional
 * @returns Projetos que o usuário tem permissão de ver
 */
export function filterProjectsByHierarchy<T extends Project>(
  projects: T[],
  currentUser: Profile,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): T[] {
  const isAdmin = ((currentUser as any).isAdmin === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  // Admin vê tudo
  if (isAdmin) {
    return projects;
  }

  const visibleUserIds = getVisibleUserIds(currentUser, hierarchyData);

  return projects.filter((project) => {
    // Se visibleUserIds está vazio, ver tudo (caso Admin)
    if (visibleUserIds.length === 0) {
      return true;
    }

    // Verificar se o usuário criou o projeto
    if (project.user_id && visibleUserIds.includes(project.user_id)) {
      return true;
    }

    // TODO: Adicionar verificação de membros do projeto quando implementado
    // if (project.members && project.members.some(m => visibleUserIds.includes(m.user_id))) {
    //   return true;
    // }

    return false;
  });
}

/**
 * Verifica se um usuário tem permissão de editar/deletar uma tarefa
 */
export function canEditTask(
  task: TaskWithDetails,
  currentUser: Profile,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): boolean {
  const isAdmin = ((currentUser as any).isAdmin === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  const isSupervisor = ((currentUser as any).isSupervisor === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.SUPERVISAO || currentUser.nivelAcesso === ACCESS_LEVELS.GESTAO || currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  // Admin pode editar tudo
  if (isAdmin) {
    return true;
  }

  // Criador pode editar
  if (task.user_id === currentUser.id) {
    return true;
  }

  // Assignee pode editar
  if (task.assignee_id === currentUser.id) {
    return true;
  }

  // Supervisor/Gestor pode editar tarefas da sua equipe
  if (isSupervisor) {
    if (task.user_id && isInTeamHierarchy(currentUser.id, task.user_id, hierarchyData)) {
      return true;
    }
    if (task.assignee_id && isInTeamHierarchy(currentUser.id, task.assignee_id, hierarchyData)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se um usuário tem permissão de editar/deletar um projeto
 */
export function canEditProject(
  project: Project,
  currentUser: Profile,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): boolean {
  const isAdmin = ((currentUser as any).isAdmin === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  const isSupervisor = ((currentUser as any).isSupervisor === true) || (currentUser.nivelAcesso === ACCESS_LEVELS.SUPERVISAO || currentUser.nivelAcesso === ACCESS_LEVELS.GESTAO || currentUser.nivelAcesso === ACCESS_LEVELS.ADMIN);
  // Admin pode editar tudo
  if (isAdmin) {
    return true;
  }

  // Criador pode editar
  if (project.user_id === currentUser.id) {
    return true;
  }

  // Supervisor/Gestor pode editar projetos da sua equipe
  if (isSupervisor) {
    if (project.user_id && isInTeamHierarchy(currentUser.id, project.user_id, hierarchyData)) {
      return true;
    }
  }

  return false;
}

/**
 * Obtém o nível hierárquico de um usuário
 * (0 = sem subordinados, 1+ = níveis abaixo)
 */
export function getHierarchyDepth(
  userId: string,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): number {
  const subordinates = hierarchyData.filter((h) => h.supervisor_id === userId);
  
  if (subordinates.length === 0) {
    return 0;
  }

  const depths = subordinates.map((sub) =>
    getHierarchyDepth(sub.user_id, hierarchyData)
  );

  return 1 + Math.max(...depths);
}

/**
 * Retorna estatísticas da equipe
 */
export function getTeamStats(
  supervisorId: string,
  hierarchyData: { user_id: string; supervisor_id: string }[]
): {
  directReports: number;
  totalTeam: number;
  depth: number;
} {
  const directReports = hierarchyData.filter(
    (h) => h.supervisor_id === supervisorId
  ).length;
  
  const totalTeam = getAllSubordinates(supervisorId, hierarchyData).length;
  const depth = getHierarchyDepth(supervisorId, hierarchyData);

  return {
    directReports,
    totalTeam,
    depth,
  };
}

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeUpdatesOptions {
  table: string;
  queryKey: string | string[];
  enabled?: boolean;
  debounceMs?: number;
}

export function useRealtimeUpdates({
  table,
  queryKey,
  enabled = true,
  debounceMs = 300,
}: UseRealtimeUpdatesOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedInvalidate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
    }, debounceMs);
  }, [queryClient, queryKey, debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${Array.isArray(queryKey) ? queryKey.join('-') : queryKey}`;

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          debouncedInvalidate();
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, queryKey, enabled, debouncedInvalidate]);

  return {
    invalidate: debouncedInvalidate,
  };
}

// Hook específico para tarefas
export function useTasksRealtime(projectId?: string) {
  const queryKey = projectId ? ['tasks', projectId] : ['tasks'];
  return useRealtimeUpdates({
    table: 'tasks',
    queryKey,
    enabled: true,
    debounceMs: 500,
  });
}

// Hook específico para subtarefas
export function useSubtasksRealtime(taskId?: string) {
  const queryKey = taskId ? ['subtasks', taskId] : ['subtasks'];
  return useRealtimeUpdates({
    table: 'subtasks',
    queryKey,
    enabled: !!taskId,
    debounceMs: 300,
  });
}

// Hook específico para projetos
export function useProjectsRealtime() {
  return useRealtimeUpdates({
    table: 'projects',
    queryKey: 'projects',
    enabled: true,
    debounceMs: 500,
  });
}

// Hook específico para comentários
export function useCommentsRealtime(taskId?: string) {
  const queryKey = taskId ? ['comments', taskId] : ['comments'];
  return useRealtimeUpdates({
    table: 'comments',
    queryKey,
    enabled: !!taskId,
    debounceMs: 200,
  });
}

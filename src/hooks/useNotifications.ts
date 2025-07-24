// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Remova ou comente o import de Notification de '@/types' TEMPORARIAMENTE
import type { Notification, UseNotificationsReturn, Database } from '@/types'; // Mantenha o import de outros tipos
import { useAuth } from '@/contexts/AuthContext';
// import { Json } from '@/integrations/supabase/types'; // Importar o tipo Json do Supabase - Não é mais necessário importar aqui

// TEMPORÁRIO: Definição local da interface Notification - REMOVIDO
// interface Notification {
//   id: string;
//   created_at: string;
//   user_id: string;
//   task_id: string | null;
//   type: string;
//   title: string;
//   message: string;
//   read: boolean;
//   action_required: boolean | null; // Adicionado com base no erro
//   data: Json | null; // Alterado para Json
// }

// Tipar o retorno do hook usando a interface UseNotificationsReturn
  export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth(); // Obter o usuário logado para filtrar notificações
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar notificações do Supabase
  const fetchNotifications = useCallback(async () => {
    console.log('fetchNotifications called');
    // Não buscar se não houver usuário logado ou user.id for nulo
    if (!user?.id) {
       setNotifications([]);
       setLoading(false);
       return;
    }

    try {
      setLoading(true);
      setError(null);

      // --- LÓGICA DE BUSCA ---
      const { data, error: fetchError } = await supabase
        .from('notifications') // <--- Substitua por o nome real da sua tabela de notificações
        .select('*') // Seleciona todas as colunas conforme definidas no seu DB
        .eq('user_id', user.id) // <--- Filtrar por user_id do usuário logado
        .order('created_at', { ascending: false }); // Ajuste a ordenação

      if (fetchError) {
        throw fetchError;
      }

      // O tipo de 'data' deve corresponder à Notification[] inferida da Database
      // Agora que importamos o tipo Notification de @/types, o cast pode não ser estritamente necessário, mas é bom para clareza.
      setNotifications(data as Notification[] || []);

    } catch (err: any) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message || 'Erro ao carregar notificações');
       setNotifications([]); // Limpar notificações em caso de erro
    } finally {
      setLoading(false);
    }
     console.log('fetchNotifications finished');
  }, [user?.id]); // Depende de user.id


  // Função para marcar notificação como lida no Supabase
  const markAsRead = useCallback(async (id: string) => {
    console.log('Marking notification as read:', id);
     try {
        const { error: updateError } = await supabase
          .from('notifications') // <--- Substitua
          .update({ read: true })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        // Opcional: Atualizar o estado local imediatamente para feedback rápido
         setNotifications(prev =>
           prev.map(notif =>
             notif.id === id ? { ...notif, read: true } : notif
           )
         );

     } catch (err: any) {
        console.error('Erro ao marcar notificação como lida:', err);
        // Adicionar feedback para o usuário (toast)
        toast.error('Erro ao marcar notificação como lida'); // Exemplo com toast
     }
  }, []); // Sem dependências que mudam durante a vida do hook


  // Função para marcar todas as notificações como lidas no Supabase
  const markAllAsRead = useCallback(async () => {
     console.log('Marking all notifications as read');
     if (!user?.id) return; // Não fazer nada se não houver usuário logado

     try {
       const { error: updateError } = await supabase
          .from('notifications') // <--- Substitua
          .update({ read: true })
          .eq('user_id', user.id) // <--- Marcar APENAS as notificações do usuário logado
          .eq('read', false); // Opcional: Marcar apenas as não lidas

       if (updateError) {
         throw updateError;
       }

       // Opcional: Atualizar o estado local imediatamente
       setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));


     } catch (err: any) {
       console.error('Erro ao marcar todas como lidas:', err);
       // Adicionar feedback para o usuário (toast)
       toast.error('Erro ao marcar todas como lidas'); // Exemplo com toast
     }
  }, [user?.id]); // Depende de user.id


  // Função para excluir notificação no Supabase
  const deleteNotification = useCallback(async (id: string) => {
     console.log('Deleting notification:', id);
     try {
        const { error: deleteError } = await supabase
          .from('notifications') // <--- Substitua
          .delete()
          .eq('id', id);

        if (deleteError) {
          throw deleteError;
        }

        // Opcional: Atualizar o estado local imediatamente
        setNotifications(prev => prev.filter(notif => notif.id !== id));


     } catch (err: any) {
       console.error('Erro ao excluir notificação:', err);
       // Adicionar feedback para o usuário (toast)
       toast.error('Erro ao excluir notificação'); // Exemplo com toast
     }
  }, []);


  // Função para limpar todas as notificações no Supabase
  const clearAllNotifications = useCallback(async () => {
           console.log('Clearing all notifications');
            if (!user?.id) return; // Não fazer nada se não houver usuário logado

           try {
              // Exemplo: Excluir todas as notificações do usuário logado
              const { error: deleteError } = await supabase
            .from('notifications') // <--- Substitua
            .delete()
            .eq('user_id', user.id); // <--- Limpar APENAS as notificações do usuário logado

              if (deleteError) {
                throw deleteError;
              }

              // Opcional: Limpar o estado local imediatamente
              setNotifications([]);

           } catch (err: any) {
             console.error('Erro ao limpar todas as notificações:', err);
             // Adicionar feedback para o usuário (toast)
             toast.error('Erro ao limpar todas as notificações'); // Exemplo com toast
           }
       }, [user?.id]); // Depende de user.id


  // Efeito para buscar notificações quando o hook é usado ou o user.id muda
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // TODO: Manter ou ajustar Realtime Subscription se necessário (seu código original tinha um)
  // Certifique-se de que a assinatura filtra pelo user_id também e lida com desinscição
  useEffect(() => {
       if (!user?.id) {
          // Remover assinatura se o usuário deslogar
          // Remova o canal se ele existir
          // const existingChannel = supabase.getChannels().find(channel => channel.topic === `realtime:public:notifications:user_id=eq.${user?.id}`);
          // if (existingChannel) {
          //     supabase.removeChannel(existingChannel);
          // }
          return; // Não subscrever se não houver user.id
       }

      const channelName = `notifications-for-${user.id}`; // Nome do canal único por usuário

      // Verificar se o canal já existe antes de subscrever
      const existingChannel = supabase.getChannels().find(channel => channel.topic === `realtime:public:notifications:user_id=eq.${user.id}`);
      if (existingChannel) {
           console.log('Realtime channel already exists, not subscribing again.');
           return () => {}; // Retorna uma função de limpeza vazia se já subscreveu
      }


      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}` // Filtrar por user_id no Realtime
          },
          (payload) => {
             // O payload.new já deve ser do tipo Notification (inferido do DB)
            const newNotification = payload.new as Notification; // Cast para o nosso tipo importado
            console.log('Realtime INSERT received:', newNotification);

            // Verifica se a notificação recebida já não está no estado
            // Isso é importante se você também estiver chamando fetchNotifications em outras situações
            if (!notifications.some(n => n.id === newNotification.id)) {
               setNotifications(prev => [newNotification, ...prev]);
               // TODO: Mostrar toast para nova notificação se desejado (seu código original fazia isso)
               toast.info(newNotification.title, { description: newNotification.message });
            } else {
                console.log('Notification already in state, skipping addition.');
            }
          }
        )
         // Opcional: Adicionar listeners para UPDATE e DELETE se quiser realtime para essas operações
        // .on(
        //   'postgres_changes',
        //   { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        //   (payload) => { /* Lógica para atualizar uma notificação no estado local */ }
        // )
        // .on(
        //   'postgres_changes',
        //   { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        //   (payload) => { /* Lógica para remover uma notificação do estado local */ }
        // )
        .subscribe();

       // Função de limpeza para remover a assinatura quando o componente desmontar ou user.id mudar
      return () => {
        console.log(`Unsubscribing from channel ${channelName}`);
        supabase.removeChannel(channel);
      };
   // Depende de user?.id e notifications (para o some na verificação de duplicidade)
   // Adicione notifications se você estiver verificando duplicidade localmente
   // Caso contrário, apenas user?.id é suficiente para (re)subscribar quando o user mudar
  }, [user?.id, notifications]);


  // unreadCount é calculado na página Notification.tsx, não é necessário retornar aqui


  return {
    notifications, // Array de notificações tipadas
    loading, // Estado de carregamento
    error, // Mensagem de erro ou null
    // Funções de ação (retornadas para a página usar)
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: fetchNotifications, // Função para recarregar notificações
    // unreadCount, // Remover se calculado na página
    // createNotification // Incluir se o hook tiver essa função e ela for usada fora daqui
  };
};

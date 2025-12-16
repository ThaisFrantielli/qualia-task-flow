import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/supabase";

type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketInteracaoInsert = Database["public"]["Tables"]["ticket_interacoes"]["Insert"];

export const useTickets = (filters?: { status?: string; cliente_id?: string; atendente_id?: string }) => {
    return useQuery({
        queryKey: ["tickets", filters],
        queryFn: async () => {
            let query = supabase
                .from("tickets")
                .select(`
          *,
          clientes (
            nome_fantasia,
            razao_social
          ),
          profiles:atendente_id (
            full_name,
            email
          )
        `)
                .order("created_at", { ascending: false });

            if (filters?.status) {
                query = query.eq("status", filters.status);
            }
            if (filters?.cliente_id) {
                query = query.eq("cliente_id", filters.cliente_id);
            }
            if (filters?.atendente_id) {
                query = query.eq("atendente_id", filters.atendente_id);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        },
    });
};

export const useTicketDetail = (ticketId: string) => {
    return useQuery({
        queryKey: ["ticket", ticketId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tickets")
                .select(`
          *,
          clientes (
            id,
            nome_fantasia,
            razao_social,
            nome_contratante,
            whatsapp_number,
            email
          ),
          profiles:profiles!tickets_atendente_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          ticket_interacoes (
            *,
            profiles:profiles!ticket_interacoes_usuario_id_fkey (
              full_name,
              avatar_url
            )
          ),
          ticket_departamentos (
            *,
            solicitado_por:profiles!ticket_departamentos_solicitado_por_fkey (full_name),
            respondido_por:profiles!ticket_departamentos_respondido_por_fkey (full_name)
          ),
          ticket_anexos (
            *,
            uploaded_by:profiles!ticket_anexos_uploaded_by_fkey (full_name)
          )
        `)
                .eq("id", ticketId)
                .single();

            if (error) {
                console.error("Error fetching ticket details:", error);
                throw error;
            }
            return data;
        },
        enabled: !!ticketId,
    });
};

export const useCreateTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ticket: TicketInsert) => {
            const { data, error } = await supabase
                .from("tickets")
                .insert(ticket)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
        },
    });
};

export const useUpdateTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ ticketId, updates }: { ticketId: string; updates: any; userId: string }) => {
            const { data, error } = await supabase
                .from("tickets")
                .update(updates)
                .eq("id", ticketId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
            queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
        },
    });
};

export const useAddTicketInteracao = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (interacao: Omit<TicketInteracaoInsert, 'usuario_id'> & { user_id?: string }) => {
            // Map user_id to usuario_id for database compatibility
            const { user_id, ...rest } = interacao;
            const dbInteracao = {
                ...rest,
                usuario_id: user_id
            };
            
            const { data, error } = await supabase
                .from("ticket_interacoes")
                .insert(dbInteracao)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            if (data.ticket_id) {
                queryClient.invalidateQueries({ queryKey: ["ticket", data.ticket_id] });
            }
        },
    });
};

export const useAddTicketDepartamento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (departamento: any) => {
            const { data, error } = await supabase
                .from("ticket_departamentos")
                .insert(departamento)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["ticket", data.ticket_id] });
        },
    });
};

export const useUpdateTicketDepartamento = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
            const { data, error } = await supabase
                .from("ticket_departamentos")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["ticket", data.ticket_id] });
        },
    });
};

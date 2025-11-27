import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/supabase";

type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];
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
            whatsapp_number,
            email
          ),
          profiles:atendente_id (
            id,
            full_name,
            avatar_url
          ),
          ticket_interacoes (
            *,
            profiles:usuario_id (
              full_name,
              avatar_url
            )
          )
        `)
                .eq("id", ticketId)
                .single();

            if (error) throw error;
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
        mutationFn: async ({ id, ...updates }: TicketUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from("tickets")
                .update(updates)
                .eq("id", id)
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
        mutationFn: async (interacao: TicketInteracaoInsert) => {
            const { data, error } = await supabase
                .from("ticket_interacoes")
                .insert(interacao)
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

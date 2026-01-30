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
            // Garantir compatibilidade: popular `vehicle_plate` a partir de `placa` quando necessário
            const mapped = (data || []).map((t: any) => ({
                ...t,
                vehicle_plate: t.vehicle_plate || t.placa || null,
            }));
            return mapped;
        },
    });
};

export const useTicketDetail = (ticketId: string) => {
    // Validar se o ticketId é um UUID válido
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
    
    return useQuery({
        queryKey: ["ticket", ticketId],
        queryFn: async () => {
            if (!isValidUUID) {
                console.error(`[useTicketDetail] Invalid UUID format: ${ticketId}`);
                throw new Error(`ID de ticket inválido: ${ticketId}`);
            }
            
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
                    ticket_motivos (
                        id,
                        label,
                        value
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
                        solicitado_por:profiles!ticket_departamentos_solicitado_por_fkey (id, full_name),
                        respondido_por:profiles!ticket_departamentos_respondido_por_fkey (id, full_name)
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
                        // Mapear `placa` -> `vehicle_plate` e preencher motivo via FK quando necessário
                        const motivoLabel = (data as any)?.ticket_motivos?.label || (data as any)?.ticket_motivos?.value || null;
                        const mapped = data
                            ? {
                                    ...data,
                                    vehicle_plate: (data as any).vehicle_plate || (data as any).placa || null,
                                    motivo: (data as any).motivo || motivoLabel,
                                }
                            : data;
            return mapped;
        },
        enabled: !!ticketId && isValidUUID,
    });
};

export const useCreateTicket = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ticket: Omit<TicketInsert, 'numero_ticket'> & { numero_ticket?: string | number }) => {
            // Map vehicle_plate (frontend) -> placa (DB) to avoid schema mismatch
            // CRITICAL: Explicitly remove numero_ticket to let DB trigger generate it
            const { vehicle_plate, numero_ticket, ...rest } = ticket as any;
            
            // Validate required fields
            if (!rest.titulo || !rest.cliente_id) {
                throw new Error('Título e Cliente são obrigatórios');
            }
            
            // Build ticket data WITHOUT numero_ticket - let the database trigger generate it
            const ticketData: any = {
                ...rest,
                ...(vehicle_plate ? { placa: vehicle_plate } : {}),
            };
            
            // NEVER send numero_ticket - the database trigger will generate it automatically
            // This avoids "invalid input syntax for type integer: 'TEMP'" errors
            delete ticketData.numero_ticket;

            console.log('[useCreateTicket] Sending to Supabase (numero_ticket omitted, will be generated by DB):', ticketData);

            const { data, error } = await supabase
                .from("tickets")
                .insert(ticketData)
                .select()
                .single();

            if (error) {
                console.error('[useCreateTicket] Supabase error:', error);
                throw error;
            }
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
            // Map vehicle_plate (frontend) -> placa (DB) for updates
            const { vehicle_plate, ...rest } = updates || {};
            const dbUpdates = {
                ...rest,
                ...(vehicle_plate ? { placa: vehicle_plate } : {})
            };

            const { data, error } = await supabase
                .from("tickets")
                .update(dbUpdates)
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

// Types for API responses and entities
export interface User {
    id: number;
    name: string;
}

export interface ChatMessage {
    id: number;
    content: string;
    is_system_message: boolean;
    metadata?: Record<string, any> | null;
    read_at: string | null;
    created_at: string;
    user: User;
    parent_message_id: number | null;
    replies_count?: number;
    replies?: ChatMessage[];
}

export interface Oportunidade {
    id: number;
    titulo: string;
    valor_total: string;
    status: 'aberta' | 'fechada' | 'cancelada';
    descricao: string | null;
    created_at: string;
    updated_at: string;
    user: User;
    messages_count: number;
    produtos_count: number;
    latest_message?: ChatMessage;
}

// Types for API pagination
export interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
}

export interface PaginationLinks {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
    links: PaginationLinks;
}

// Context types
export interface OportunidadeContextType {
    oportunidades: Oportunidade[];
    loading: boolean;
    error: string | null;
    pagination: PaginationMeta | null;
    fetchOportunidades: (page?: number) => Promise<void>;
    refreshOportunidade: (id: number) => Promise<void>;
}
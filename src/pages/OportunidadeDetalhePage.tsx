import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import type { Oportunidade, ChatMessage, PaginatedResponse } from '@/types/api';
import { Loader2 } from 'lucide-react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';

interface OportunidadeDetalheState {
  oportunidade: Oportunidade | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  messagesPagination: {
    currentPage: number;
    hasMore: boolean;
    loading: boolean;
  };
}

export default function OportunidadeDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<OportunidadeDetalheState>({
    oportunidade: null,
    messages: [],
    loading: true,
    error: null,
    messagesPagination: {
      currentPage: 1,
      hasMore: true,
      loading: false,
    },
  });

  // Handle new messages from WebSocket
  const handleNewMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  // Set up WebSocket connection
  useChat({
    oportunidadeId: parseInt(id!),
    onNewMessage: handleNewMessage,
  });

  // Fetch opportunity details
  useEffect(() => {
    async function fetchOportunidade() {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await api.get<{ data: Oportunidade }>(`/oportunidades/${id}`);
        
        setState(prev => ({
          ...prev,
          oportunidade: response.data.data,
          loading: false,
        }));

        // After loading the opportunity, fetch initial messages
        await fetchMessages(1);
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Erro ao carregar oportunidade. Por favor, tente novamente.',
        }));
        
        // If opportunity not found, redirect back to list
        if ((error as any)?.response?.status === 404) {
          navigate('/oportunidades');
        }
      }
    }

    if (id) {
      fetchOportunidade();
    }
  }, [id, navigate]);

  // Function to fetch messages with pagination
  const fetchMessages = async (page: number) => {
    if (!id || state.messagesPagination.loading || (!state.messagesPagination.hasMore && page > 1)) {
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        messagesPagination: { ...prev.messagesPagination, loading: true },
      }));

      const response = await api.get<PaginatedResponse<ChatMessage>>(`/oportunidades/${id}/messages`, {
        params: { page },
      });

      setState(prev => ({
        ...prev,
        messages: page === 1 
          ? response.data.data 
          : [...prev.messages, ...response.data.data],
        messagesPagination: {
          currentPage: page,
          hasMore: response.data.meta.current_page < response.data.meta.last_page,
          loading: false,
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        messagesPagination: { ...prev.messagesPagination, loading: false },
        error: 'Erro ao carregar mensagens. Por favor, tente novamente.',
      }));
    }
  };

  // Load more messages when user scrolls to top of message list
  const handleLoadMore = () => {
    if (state.messagesPagination.hasMore && !state.messagesPagination.loading) {
      fetchMessages(state.messagesPagination.currentPage + 1);
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-600">
        <p>{state.error}</p>
      </div>
    );
  }

  if (!state.oportunidade) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {state.oportunidade.titulo}
        </h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
          <span>Responsável: {state.oportunidade.user.name}</span>
          <span>•</span>
          <span>Valor: R$ {parseFloat(state.oportunidade.valor_total).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}</span>
          <span>•</span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            state.oportunidade.status === 'aberta'
              ? 'bg-green-100 text-green-800'
              : state.oportunidade.status === 'fechada'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {state.oportunidade.status.charAt(0).toUpperCase() + state.oportunidade.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ChatInterface
          messages={state.messages}
          opportunityId={parseInt(id!)}
          onLoadMore={handleLoadMore}
          hasMore={state.messagesPagination.hasMore}
          isLoadingMore={state.messagesPagination.loading}
          currentUserId={1} // TODO: Get from auth context
          onSendMessage={async (content) => {
            try {
              const response = await api.post<{ data: ChatMessage }>(
                `/oportunidades/${id}/messages`,
                { content }
              );
              
              setState(prev => ({
                ...prev,
                messages: [...prev.messages, response.data.data],
              }));
            } catch (error) {
              console.error('Error sending message:', error);
              throw error;
            }
          }}
        />
      </div>
    </div>
  );
}
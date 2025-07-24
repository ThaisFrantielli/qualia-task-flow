import React, { useState } from 'react';
import { Send, AtSign, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useComments } from '@/hooks/useComments';
import type { User as ProfileUser } from '@/types'; // Importar User do tipo Profiles

interface MentionCommentsProps {
  taskId: string;
}

const MentionComments: React.FC<MentionCommentsProps> = ({ taskId }) => {
  const { comments, addComment } = useComments(taskId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<ProfileUser[]>([]); // Estado para sugestões de menção
  const [mentionQuery, setMentionQuery] = useState(''); // Estado para o texto após @
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null); // Índice onde a menção começa

  // Mock users for mentions (Idealmente, buscar do backend usando useProfiles)
  const availableUsers: ProfileUser[] = [ // Usar o tipo ProfileUser
    { id: 'user1', full_name: 'João Silva', avatar_url: null, email: null },
    { id: 'user2', full_name: 'Maria Santos', avatar_url: null, email: null },
    { id: 'user3', full_name: 'Pedro Costa', avatar_url: null, email: null },
    { id: 'user4', full_name: 'Ana Oliveira', avatar_url: null, email: null }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Lógica para detectar @ e sugerir usuários
    const mentionIndex = value.lastIndexOf('@');
    if (mentionIndex !== -1) {
      const query = value.substring(mentionIndex + 1);
      setMentionQuery(query);
      setMentionStartIndex(mentionIndex);

      if (query.length > 0) {
        const filteredUsers = availableUsers.filter(user =>
          user.full_name?.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestedUsers(filteredUsers);
      } else {
        // Se apenas @ foi digitado, mostrar todos os usuários disponíveis (ou uma lista inicial)
        setSuggestedUsers(availableUsers);
      }
    } else {
      // Se @ não está presente, limpar sugestões
      setSuggestedUsers([]);
      setMentionQuery('');
      setMentionStartIndex(null);
    }
  };

  const handleSelectUser = (user: ProfileUser) => {
    if (mentionStartIndex !== null) {
      const commentBeforeMention = newComment.substring(0, mentionStartIndex);
      const commentAfterMention = newComment.substring(mentionStartIndex + mentionQuery.length + 1);
      // Substituir @query pelo nome do usuário selecionado
      const updatedComment = `${commentBeforeMention}@${user.full_name} ${commentAfterMention}`;
      setNewComment(updatedComment);
      setSuggestedUsers([]); // Limpar sugestões
      setMentionQuery('');
      setMentionStartIndex(null);
      // Opcional: focar de volta na textarea
      // textareaRef.current?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // A lógica de extração de menções na submissão pode permanecer se necessário para processamento no backend
      // const mentionRegex = /@(w+)/g;
      // const mentions = newComment.match(mentionRegex);
      
      await addComment(newComment.trim(), 'Usuário Atual');
      
      // Processar menções APÓS adicionar o comentário, se o backend não fizer isso
      // Se o backend lida com @menções no conteúdo, esta parte não é necessária aqui.
      // if (mentions) { /* lógica para notificações/db */ }
      
      setNewComment('');
      setSuggestedUsers([]); // Limpar sugestões após enviar
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && suggestedUsers.length > 0) {
        // Opcional: fechar sugestões com Esc
        setSuggestedUsers([]);
    }
    // TODO: Adicionar navegação na lista de sugestões com setas do teclado
  };

  const formatComment = (content: string) => {
    // Replace @mentions with badges (pode precisar ajustar se o formato da menção mudar)
    return content.replace(/@([ws]+)/g, (match, username) => { // Ajustado regex para incluir espaços no nome
      // Encontrar o usuário na lista mockada para obter ID ou outros dados, se necessário
      // const user = availableUsers.find(u => u.full_name === username.trim());
      return `<span class="mention">@${username}</span>`;
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AtSign className="w-5 h-5" />
          Comentários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de novo comentário */}
        <div className="relative space-y-3"> {/* Adicionado relative para posicionar sugestões */}
          <Textarea
            value={newComment}
            onChange={handleInputChange} // Usar a nova função de input
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário... Use @usuario para mencionar alguém"
            rows={3}
            className="resize-none"
          />

          {/* Lista de Sugestões de Menção */}
          {suggestedUsers.length > 0 && (mentionStartIndex !== null) && ( // Renderizar sugestões condicionalmente
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"> {/* Posicionado absoluto */}
              {suggestedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center space-x-2 px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSelectUser(user)}
                >
                  <User className="w-4 h-4 text-gray-600" /> {/* Ícone de usuário */}
                  <span>{user.full_name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Dica: Use @ para mencionar usuários. Ctrl+Enter para enviar.
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>

        {/* Lista de comentários */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AtSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum comentário ainda</p>
              <p className="text-sm">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.author_name}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <div 
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ 
                      __html: formatComment(comment.content) 
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MentionComments;
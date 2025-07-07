
import React, { useState } from 'react';
import { Send, AtSign, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useComments } from '@/hooks/useComments';

interface MentionCommentsProps {
  taskId: string;
}

const MentionComments: React.FC<MentionCommentsProps> = ({ taskId }) => {
  const { comments, addComment } = useComments(taskId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock users for mentions
  const availableUsers = [
    { id: 'user1', name: 'João Silva' },
    { id: 'user2', name: 'Maria Santos' },
    { id: 'user3', name: 'Pedro Costa' },
    { id: 'user4', name: 'Ana Oliveira' }
  ];

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // Extract mentions from comment
      const mentionRegex = /@(\w+)/g;
      const mentions = newComment.match(mentionRegex);
      
      await addComment(newComment.trim(), 'Usuário Atual');
      
      // TODO: Handle mentions - create notifications for mentioned users
      if (mentions) {
        console.log('Mentioned users:', mentions);
      }
      
      setNewComment('');
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
    }
  };

  const formatComment = (content: string) => {
    // Replace @mentions with badges
    return content.replace(/@(\w+)/g, (match, username) => {
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
        <div className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário... Use @usuario para mencionar alguém"
            rows={3}
            className="resize-none"
          />
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

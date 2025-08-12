// src/components/comments/MentionComments.tsx

import { useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Trash2, User, Loader2 } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// --- AÇÃO NECESSÁRIA PARA CORRIGIR OS ERROS DE TIPO ---
//
// 1. VÁ ATÉ O SEU ARQUIVO DE TIPOS (ex: src/types.ts ou src/integrations/supabase/types.ts)
//
// 2. EXPORTE O TIPO 'Profile'. Encontre a linha e mude de:
//    interface Profile { ... }  =>  PARA: export interface Profile { ... }
//
// 3. ATUALIZE O TIPO 'Comment'. Encontre a definição e adicione a propriedade 'author_name'.
//    export interface Comment {
//      id: string;
//      created_at: string;
//      task_id: string;
//      user_id: string;
//      content: string;
//      author_name: string | null; // <-- ADICIONE ESTA LINHA!
//    }
//
// 4. Depois de fazer essas duas mudanças, os erros de tipo devem desaparecer.
//
import type { Profile, Comment } from '@/types'; 

interface MentionCommentsProps {
  taskId: string;
}

const MentionComments: React.FC<MentionCommentsProps> = ({ taskId }) => {
  // Guarda defensiva contra ID inválido vindo do componente pai
  if (typeof taskId !== 'string' || !taskId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">ID da tarefa não fornecido.</p>
        </CardContent>
      </Card>
    );
  }

  const { user } = useAuth();
  const { comments, loading: loadingComments, addComment, deleteComment } = useComments(taskId);
  const { profiles, loading: loadingProfiles } = useProfiles();
  const [newComment, setNewComment] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const safeComments = comments ?? [];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewComment(text);
    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setShowSuggestions(true);
      setSearchTerm(lastWord.substring(1).toLowerCase());
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (userName: string) => {
    const words = newComment.split(/\s+/);
    words.pop();
    const newText = [...words, `@${userName}`, ''].join(' ');
    setNewComment(newText);
    setShowSuggestions(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    if (!user?.id || !('full_name' in user && user.full_name)) {
      toast.error("Você precisa estar logado para comentar.");
      return;
    }

    const authorName = (user as any)?.full_name || user?.user_metadata?.full_name || user?.email || 'Usuário';
    const promise = addComment(
      newComment.trim(),
      authorName,
      user.id
    ).then(() => {
      setNewComment('');
    });

    toast.promise(promise, {
      loading: 'Adicionando comentário...',
      success: 'Comentário adicionado!',
      error: 'Falha ao adicionar comentário.',
    });
  };

  const filteredUsers = searchTerm
    ? profiles.filter((p: Profile) => p.full_name?.toLowerCase().includes(searchTerm))
    : profiles;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comentários ({loadingComments ? '...' : safeComments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Adicionar um comentário... Use @ para mencionar alguém."
            value={newComment}
            onChange={handleInputChange}
            rows={3}
            disabled={loadingComments}
          />
          {showSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {loadingProfiles ? ( <div className="p-2 text-sm text-gray-500">Carregando...</div> ) : 
              (
                filteredUsers.map((p: Profile) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSuggestionClick(p.full_name || '')}>
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{p.full_name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <Button onClick={handleAddComment} disabled={!newComment.trim() || loadingComments}>
          {loadingComments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Adicionar Comentário
        </Button>
        <div className="space-y-3 pt-4 border-t">
          {loadingComments ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando comentários...</span>
            </div>
          ) : (
            safeComments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
            ) : (
              safeComments.map((comment: Comment) => (
                <div key={comment.id} className="border rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                      <div>
                        {/* Agora o TypeScript sabe que 'comment.author_name' existe */}
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <p className="text-xs text-gray-500">{formatDistance(new Date(comment.created_at), new Date(), { addSuffix: true, locale: ptBR })}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteComment(comment.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MentionComments;
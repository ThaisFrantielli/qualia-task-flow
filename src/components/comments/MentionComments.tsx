// src/components/comments/MentionComments.tsx

import { useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Trash2, User, Loader2, Pencil, X, Check } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Profile, Comment } from '@/types'; 

interface MentionCommentsProps {
  taskId: string;
}

const MentionComments: React.FC<MentionCommentsProps> = ({ taskId }) => {
  if (typeof taskId !== 'string' || !taskId) {
    return (
      <Card>
        <CardHeader><CardTitle>Comentários</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">ID da tarefa não fornecido.</p></CardContent>
      </Card>
    );
  }

  const { user } = useAuth();
  const { comments, loading: loadingComments, addComment, updateComment, deleteComment } = useComments(taskId);
  const { profiles, loading: loadingProfiles } = useProfiles();
  const [newComment, setNewComment] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

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
    
    const authorName = (user as any)?.full_name || user?.user_metadata?.full_name;
    if (!user?.id || !authorName) {
      toast.error("Você precisa estar logado e ter um nome definido para comentar.");
      return;
    }

    const promise = addComment(newComment.trim(), authorName, user.id, 'task', taskId);
    
    promise.then(() => {
      setNewComment('');
    });

    toast.promise(promise, {
      loading: 'Adicionando comentário...',
      success: 'Comentário adicionado!',
      error: (err) => `Falha ao adicionar comentário: ${err.message}`,
    });
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editingContent.trim()) return;
    
    try {
      await updateComment(editingCommentId, editingContent.trim());
      toast.success('Comentário atualizado!');
      setEditingCommentId(null);
      setEditingContent('');
    } catch (err: any) {
      toast.error(`Erro ao atualizar: ${err.message}`);
    }
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
                        <span className="font-medium text-sm">{comment.author_name || 'Usuário'}</span>
                        <p className="text-xs text-gray-500">{formatDistance(new Date(comment.created_at), new Date(), { addSuffix: true, locale: ptBR })}</p>
                      </div>
                    </div>
                    {user?.id === comment.user_id && (
                      <div className="flex gap-1">
                        {editingCommentId !== comment.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(comment)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteComment(comment.id)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={!editingContent.trim()}>
                          <Check className="w-4 h-4 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                  )}
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

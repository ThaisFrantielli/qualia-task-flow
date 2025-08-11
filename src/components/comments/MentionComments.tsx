// src/components/comments/MentionComments.tsx

import React, { useState } from 'react';
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

interface MentionCommentsProps {
  taskId: string;
}

const MentionComments: React.FC<MentionCommentsProps> = ({ taskId }) => {
  const { user } = useAuth();
  const { comments, loading: loadingComments, addComment, deleteComment } = useComments(taskId);
  const { profiles, loading: loadingProfiles } = useProfiles();
  const [newComment, setNewComment] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // --- FUNÇÃO handleAddComment ATUALIZADA ---
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    // CORREÇÃO: Acessar 'user.full_name' diretamente
    if (!user?.full_name || !user.id) {
      toast.error("Você precisa estar logado para comentar.");
      return;
    }

    const promise = addComment(
      newComment.trim(),
      user.full_name, // Usar user.full_name
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
    ? profiles.filter(p => p.full_name?.toLowerCase().includes(searchTerm))
    : profiles;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Adicionar um comentário... Use @ para mencionar alguém."
            value={newComment}
            onChange={handleInputChange}
            rows={3}
          />
          {showSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {loadingProfiles ? ( <div className="p-2 text-sm text-gray-500">Carregando...</div> ) : 
              (
                filteredUsers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSuggestionClick(p.full_name || '')}>
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{p.full_name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <Button onClick={handleAddComment} disabled={!newComment.trim()}>Adicionar Comentário</Button>
        <div className="space-y-3 pt-4 border-t">
          {loadingComments ? (
            <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                    <div>
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <p className="text-xs text-gray-500">{formatDistance(new Date(comment.created_at), new Date(), { addSuffix: true, locale: ptBR })}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteComment(comment.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MentionComments;
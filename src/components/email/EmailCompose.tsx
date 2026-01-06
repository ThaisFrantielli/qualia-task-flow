import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, Paperclip } from 'lucide-react';
import { EmailMessage, EmailAccount } from '@/types/email';
import { useSendEmail } from '@/hooks/useEmails';
import { toast } from 'sonner';

interface EmailComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: EmailAccount | null;
  replyTo?: EmailMessage | null;
  onSuccess?: () => void;
}

export function EmailCompose({ 
  open, 
  onOpenChange, 
  account,
  replyTo,
  onSuccess 
}: EmailComposeProps) {
  const { mutateAsync: sendEmail, isPending } = useSendEmail();
  
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);

  // Initialize with reply data if available
  useState(() => {
    if (replyTo) {
      setTo(replyTo.from.email);
      setSubject(`Re: ${replyTo.subject}`);
      setBody(`\n\n---\nEm ${new Date(replyTo.date).toLocaleString('pt-BR')}, ${replyTo.from.name || replyTo.from.email} escreveu:\n\n${replyTo.body || replyTo.snippet}`);
    }
  });

  const handleClose = () => {
    setTo('');
    setCc('');
    setSubject('');
    setBody('');
    setShowCc(false);
    onOpenChange(false);
  };

  const handleSend = async () => {
    if (!account) {
      toast.error('Nenhuma conta de email selecionada');
      return;
    }

    if (!to.trim()) {
      toast.error('Por favor, informe o destinatário');
      return;
    }

    if (!subject.trim()) {
      toast.error('Por favor, informe o assunto');
      return;
    }

    try {
      const result = await sendEmail({
        accountId: account.id,
        to: to.split(',').map(e => e.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
        subject: subject.trim(),
        body: body.trim(),
        replyToMessageId: replyTo?.id
      });

      if (result.success) {
        handleClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{replyTo ? 'Responder Email' : 'Novo Email'}</span>
          </DialogTitle>
          <DialogDescription>
            Enviando de: {account?.email || 'Nenhuma conta selecionada'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 py-4 overflow-y-auto">
          {/* To */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="to">Para</Label>
              {!showCc && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-6"
                  onClick={() => setShowCc(true)}
                >
                  Adicionar CC
                </Button>
              )}
            </div>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@email.com"
            />
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cc">CC</Label>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => {
                    setCc('');
                    setShowCc(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input
                id="cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="copia@email.com"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email"
            />
          </div>

          {/* Body */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="body">Mensagem</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva sua mensagem..."
              className="min-h-[200px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="icon" disabled>
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={isPending || !account}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Mail, Lock, Server, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEmailAccounts } from '@/hooks/useEmails';
import { getImapConfigByEmail, EmailProvider } from '@/types/email';

interface EmailConnectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'method' | 'credentials' | 'testing' | 'success';

export function EmailConnectWizard({ open, onOpenChange, onSuccess }: EmailConnectWizardProps) {
  const { connectAccount } = useEmailAccounts();
  
  const [step, setStep] = useState<Step>('method');
  const [connectionMethod, setConnectionMethod] = useState<'auto' | 'manual'>('auto');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [testStatus, setTestStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = () => {
    setStep('method');
    setConnectionMethod('auto');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setImapHost('');
    setImapPort('993');
    setSmtpHost('');
    setSmtpPort('587');
    setTestStatus('testing');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleMethodNext = () => {
    setStep('credentials');
  };

  const handleConnect = async () => {
    if (!email || !password) {
      toast.error('Por favor, preencha email e senha');
      return;
    }

    setStep('testing');
    setTestStatus('testing');
    setErrorMessage('');

    try {
      // Auto-detect IMAP config
      const autoConfig = getImapConfigByEmail(email);
      
      const provider: EmailProvider = 'imap';
      
      console.log('Connecting with config:', {
        provider,
        email,
        display_name: displayName || email.split('@')[0],
        imap_host: connectionMethod === 'manual' ? imapHost : autoConfig?.imap_host,
        imap_port: connectionMethod === 'manual' ? parseInt(imapPort) : autoConfig?.imap_port,
        smtp_host: connectionMethod === 'manual' ? smtpHost : autoConfig?.smtp_host,
        smtp_port: connectionMethod === 'manual' ? parseInt(smtpPort) : autoConfig?.smtp_port
      });
      
      const result = await connectAccount({
        provider,
        email,
        password,
        display_name: displayName || email.split('@')[0],
        imap_host: connectionMethod === 'manual' ? imapHost : autoConfig?.imap_host,
        imap_port: connectionMethod === 'manual' ? parseInt(imapPort) : autoConfig?.imap_port,
        smtp_host: connectionMethod === 'manual' ? smtpHost : autoConfig?.smtp_host,
        smtp_port: connectionMethod === 'manual' ? parseInt(smtpPort) : autoConfig?.smtp_port
      });

      console.log('Connect result:', result);

      if (result && result.success) {
        setTestStatus('success');
        setStep('success');
      } else {
        setTestStatus('error');
        const errorMsg = result?.error || 'Erro desconhecido ao conectar. Verifique suas credenciais.';
        setErrorMessage(errorMsg);
        console.error('Connection failed:', errorMsg);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setTestStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao conectar conta');
    }
  };

  const handleFinish = () => {
    handleClose();
    onSuccess?.();
  };

  const handleRetry = () => {
    setStep('credentials');
    setTestStatus('testing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Conectar Conta de Email
          </DialogTitle>
          <DialogDescription>
            {step === 'method' && 'Escolha como deseja conectar sua conta de email'}
            {step === 'credentials' && 'Informe suas credenciais de acesso'}
            {step === 'testing' && 'Testando conexão...'}
            {step === 'success' && 'Conta conectada com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Method Selection */}
        {step === 'method' && (
          <div className="space-y-4 py-4">
            <RadioGroup value={connectionMethod} onValueChange={(v) => setConnectionMethod(v as 'auto' | 'manual')}>
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setConnectionMethod('auto')}>
                <RadioGroupItem value="auto" id="auto" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="auto" className="font-medium cursor-pointer">
                    Conexão Automática (Recomendado)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Detectamos automaticamente as configurações IMAP/SMTP para Gmail, Outlook, Yahoo, UOL, Terra e outros.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setConnectionMethod('manual')}>
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="manual" className="font-medium cursor-pointer">
                    Configuração Manual (IMAP)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure manualmente os servidores IMAP e SMTP para qualquer provedor.
                  </p>
                </div>
              </div>
            </RadioGroup>

            <div className="flex justify-end pt-4">
              <Button onClick={handleMethodNext}>Continuar</Button>
            </div>
          </div>
        )}

        {/* Step: Credentials */}
        {step === 'credentials' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Para Gmail, use uma "Senha de App". Para Microsoft 365/Outlook corporativo, use sua senha normal.
                Se tiver autenticação de dois fatores, gere uma senha de aplicativo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição (opcional)</Label>
              <Input
                id="displayName"
                placeholder="Meu Email de Trabalho"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {connectionMethod === 'manual' && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Configurações do Servidor
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imapHost">Servidor IMAP</Label>
                      <Input
                        id="imapHost"
                        placeholder="imap.exemplo.com"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPort">Porta IMAP</Label>
                      <Input
                        id="imapPort"
                        placeholder="993"
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">Servidor SMTP</Label>
                      <Input
                        id="smtpHost"
                        placeholder="smtp.exemplo.com"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Porta SMTP</Label>
                      <Input
                        id="smtpPort"
                        placeholder="587"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('method')}>Voltar</Button>
              <Button onClick={handleConnect} disabled={!email || !password}>
                Conectar
              </Button>
            </div>
          </div>
        )}

        {/* Step: Testing */}
        {step === 'testing' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            {testStatus === 'testing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Testando conexão com o servidor...</p>
              </>
            )}
            
            {testStatus === 'error' && (
              <>
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-destructive font-medium">Erro ao conectar</p>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {errorMessage}
                </p>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                  <Button onClick={handleRetry}>Tentar Novamente</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-medium">Conta conectada com sucesso!</p>
            <p className="text-sm text-muted-foreground text-center">
              Sua conta <strong>{email}</strong> está pronta para uso.
            </p>
            <Button onClick={handleFinish} className="mt-4">
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { EmailProvider } from '@/contexts/EmailContext';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { EmailConnectWizard } from '@/components/email/EmailConnectWizard';
import { EmailCompose } from '@/components/email/EmailCompose';
import { EmailList } from '@/components/email/EmailList';
import { EmailDetail } from '@/components/email/EmailDetail';
import { useEmailAccounts, useEmailList } from '@/hooks/useEmails';
import { EmailAccount, EmailFolder, EmailMessage } from '@/types/email';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PenSquare, Mail, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Server, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';

function EmailPageContent() {
  const { accounts } = useEmailAccounts();
  
  const [activeAccount, setActiveAccount] = useState<EmailAccount | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  
  // Dialogs
  const [showConnectWizard, setShowConnectWizard] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  // Fetch emails when account and folder are selected
  const { data: emailListData, isLoading: isLoadingEmails, refetch, error } = useEmailList({
    accountId: activeAccount?.id,
    folder: selectedFolder,
    page: 1,
    limit: 50,
    enabled: !!activeAccount
  });

  // Set active account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !activeAccount) {
      setActiveAccount(accounts[0]);
    }
  }, [accounts, activeAccount]);

  const handleAccountChange = (account: EmailAccount) => {
    setActiveAccount(account);
    setSelectedEmail(null);
  };

  const handleFolderChange = (folder: EmailFolder) => {
    setSelectedFolder(folder);
    setSelectedEmail(null);
  };

  const handleConnectSuccess = () => {
    // Account will be refreshed via query invalidation
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Atualizando emails...');
  };

  const emails = emailListData?.emails || [];
  const hasError = emailListData?.error || error;
  const requiresOAuth = emailListData?.requiresOAuth;

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <EmailSidebar
        accounts={accounts}
        activeAccount={activeAccount}
        selectedFolder={selectedFolder}
        onAccountChange={handleAccountChange}
        onFolderChange={handleFolderChange}
        onAddAccount={() => setShowConnectWizard(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails
            {activeAccount && (
              <span className="text-sm font-normal text-muted-foreground">
                - {activeAccount.email}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            {activeAccount && (
              <>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoadingEmails}>
                  {isLoadingEmails ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button onClick={() => setShowCompose(true)}>
                  <PenSquare className="h-4 w-4 mr-2" />
                  Compor
                </Button>
              </>
            )}
          </div>
        </div>

        {activeAccount ? (
          <>
            {/* Show OAuth required message or email list */}
            {hasError || requiresOAuth || emails.length === 0 ? (
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Connected Account Info */}
                  <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        Conta Conectada
                      </CardTitle>
                      <CardDescription>
                        Suas credenciais foram salvas de forma segura.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">{activeAccount.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Nome de Exibição</p>
                          <p className="font-medium">{activeAccount.display_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Provedor</p>
                          <Badge variant="secondary">{activeAccount.provider?.toUpperCase()}</Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant="default" className="bg-green-600">Ativo</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* OAuth Required Alert */}
                  {(hasError || requiresOAuth) && (
                    <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-700 dark:text-amber-400">Configuração Adicional Necessária</AlertTitle>
                      <AlertDescription className="text-amber-600 dark:text-amber-300">
                        {emailListData?.error || 'O Microsoft 365 corporativo requer autenticação OAuth para acessar emails. A autenticação básica foi desabilitada pela Microsoft por segurança.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Server Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Server className="h-4 w-4" />
                        Configuração do Servidor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Servidor IMAP</p>
                          <p className="font-mono text-xs">{activeAccount.imap_host}:{activeAccount.imap_port}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Servidor SMTP</p>
                          <p className="font-mono text-xs">{activeAccount.smtp_host}:{activeAccount.smtp_port}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Instructions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Info className="h-4 w-4" />
                        Como Acessar Seus Emails
                      </CardTitle>
                      <CardDescription>
                        Para contas Microsoft 365 corporativas, é necessário uma das opções abaixo:
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <h4 className="font-medium mb-1">1. Solicitar ao TI: Habilitar Autenticação Básica</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            O administrador de TI pode habilitar autenticação básica para IMAP/SMTP no painel do Microsoft 365 Admin.
                          </p>
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/30">
                          <h4 className="font-medium mb-1">2. Usar Senha de Aplicativo (Se MFA estiver ativo)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Se sua conta tem autenticação multifator, crie uma senha de aplicativo em account.microsoft.com.
                          </p>
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-2" />
                              Configurações de Segurança
                            </a>
                          </Button>
                        </div>

                        <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                          <h4 className="font-medium mb-1">3. Microsoft Graph API (Recomendado)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Para integração completa, configure o Microsoft Graph API com OAuth. Isso requer registro no Azure AD.
                          </p>
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://docs.microsoft.com/graph/auth-register-app-v2" target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-2" />
                              Documentação Azure
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button onClick={() => setShowCompose(true)}>
                      <PenSquare className="h-4 w-4 mr-2" />
                      Compor Email
                    </Button>
                    <Button variant="outline" onClick={() => setShowConnectWizard(true)}>
                      Reconectar com Nova Senha
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Email List */}
                <div className="w-96 border-r flex flex-col">
                  <EmailList
                    emails={emails}
                    selectedEmail={selectedEmail}
                    onSelectEmail={setSelectedEmail}
                    isLoading={isLoadingEmails}
                  />
                </div>

                {/* Email Detail */}
                <div className="flex-1 overflow-auto">
                  {selectedEmail ? (
                    <EmailDetail
                      email={selectedEmail}
                      accountId={activeAccount.id}
                      onBack={() => setSelectedEmail(null)}
                      onReply={() => setShowCompose(true)}
                      onCreateTask={() => {
                        toast.info('Funcionalidade de criar tarefa em desenvolvimento');
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Selecione um email para visualizar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-lg font-medium mb-2">Nenhuma conta conectada</h2>
              <p className="text-muted-foreground mb-4">
                Conecte sua conta de email para começar.
              </p>
              <Button onClick={() => setShowConnectWizard(true)}>
                Conectar Conta de Email
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EmailConnectWizard
        open={showConnectWizard}
        onOpenChange={setShowConnectWizard}
        onSuccess={handleConnectSuccess}
      />

      <EmailCompose
        open={showCompose}
        onOpenChange={setShowCompose}
        account={activeAccount}
        onSuccess={() => {}}
      />
    </div>
  );
}

export default function EmailPage() {
  return (
    <EmailProvider>
      <EmailPageContent />
    </EmailProvider>
  );
}

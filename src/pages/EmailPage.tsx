import { useState, useEffect } from 'react';
import { EmailProvider } from '@/contexts/EmailContext';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { EmailConnectWizard } from '@/components/email/EmailConnectWizard';
import { EmailCompose } from '@/components/email/EmailCompose';
import { useEmailAccounts } from '@/hooks/useEmails';
import { EmailAccount, EmailFolder } from '@/types/email';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PenSquare, Mail, CheckCircle2, Settings, Server, ExternalLink } from 'lucide-react';

function EmailPageContent() {
  const { accounts } = useEmailAccounts();
  
  const [activeAccount, setActiveAccount] = useState<EmailAccount | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
  
  // Dialogs
  const [showConnectWizard, setShowConnectWizard] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  // Set active account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !activeAccount) {
      setActiveAccount(accounts[0]);
    }
  }, [accounts, activeAccount]);

  const handleAccountChange = (account: EmailAccount) => {
    setActiveAccount(account);
  };

  const handleConnectSuccess = () => {
    // Account will be refreshed via query invalidation
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <EmailSidebar
        accounts={accounts}
        activeAccount={activeAccount}
        selectedFolder={selectedFolder}
        onAccountChange={handleAccountChange}
        onFolderChange={(folder) => {
          setSelectedFolder(folder);
        }}
        onAddAccount={() => setShowConnectWizard(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails
          </h1>
          {activeAccount && (
            <Button onClick={() => setShowCompose(true)}>
              <PenSquare className="h-4 w-4 mr-2" />
              Compor
            </Button>
          )}
        </div>

        {activeAccount ? (
          <div className="flex-1 p-6 overflow-auto">
            {/* Connected Account Info */}
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Success Card */}
              <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Conta Conectada com Sucesso
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

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4" />
                    Próximos Passos para Integração Completa
                  </CardTitle>
                  <CardDescription>
                    Para visualizar emails em tempo real, configure uma das opções abaixo:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">1. Microsoft Graph API (Outlook/365)</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Recomendado para contas Microsoft. Suporta OAuth e acesso completo à caixa de email.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://docs.microsoft.com/graph/api/resources/mail-api-overview" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Documentação
                        </a>
                      </Button>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">2. Gmail API (Google)</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Recomendado para contas Gmail. Requer configuração de OAuth no Google Cloud.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://developers.google.com/gmail/api" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Documentação
                        </a>
                      </Button>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">3. Serviço IMAP Externo</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Use um serviço como Nylas, Mailgun, ou um backend Node.js com bibliotecas IMAP.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://www.nylas.com/" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Nylas
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Nota:</strong> A conexão IMAP direta via Edge Functions do Supabase tem limitações 
                      técnicas. As credenciais salvas podem ser usadas por um backend Node.js ou serviço externo 
                      para buscar emails em tempo real.
                    </p>
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
                  Adicionar Outra Conta
                </Button>
              </div>
            </div>
          </div>
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

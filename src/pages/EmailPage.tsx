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
import { PenSquare, Mail, RefreshCw, Loader2 } from 'lucide-react';
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

  // Show error if email fetch fails
  useEffect(() => {
    if (error) {
      toast.error('Erro ao carregar emails');
    }
  }, [error]);

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
                    // TODO: Implement create task from email
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

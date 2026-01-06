import { useState } from 'react';
import { EmailProvider } from '@/contexts/EmailContext';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { EmailList } from '@/components/email/EmailList';
import { EmailDetail } from '@/components/email/EmailDetail';
import { EmailFilters } from '@/components/email/EmailFilters';
import { EmailConnectWizard } from '@/components/email/EmailConnectWizard';
import { EmailToTaskDialog } from '@/components/email/EmailToTaskDialog';
import { EmailCompose } from '@/components/email/EmailCompose';
import { useEmailAccounts, useEmailList } from '@/hooks/useEmails';
import { EmailAccount, EmailMessage, EmailFolder } from '@/types/email';
import { Button } from '@/components/ui/button';
import { PenSquare, Mail } from 'lucide-react';

function EmailPageContent() {
  const { accounts } = useEmailAccounts();
  
  const [activeAccount, setActiveAccount] = useState<EmailAccount | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  // Dialogs
  const [showConnectWizard, setShowConnectWizard] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [emailForTask, setEmailForTask] = useState<EmailMessage | null>(null);
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);

  // Set active account when accounts load
  useState(() => {
    if (accounts.length > 0 && !activeAccount) {
      setActiveAccount(accounts[0]);
    }
  });

  const { data: emailData, isLoading: isLoadingEmails } = useEmailList({
    accountId: activeAccount?.id,
    folder: selectedFolder,
    search,
    unreadOnly,
    enabled: !!activeAccount
  });

  const handleAccountChange = (account: EmailAccount) => {
    setActiveAccount(account);
    setSelectedEmail(null);
  };

  const handleCreateTask = (email: EmailMessage) => {
    setEmailForTask(email);
    setShowTaskDialog(true);
  };

  const handleReply = (email: EmailMessage) => {
    setReplyToEmail(email);
    setShowCompose(true);
  };

  const handleConnectSuccess = () => {
    if (accounts.length === 0) {
      // Refresh will happen via query invalidation
    }
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
          setSelectedEmail(null);
        }}
        onAddAccount={() => setShowConnectWizard(true)}
        unreadCounts={{ inbox: emailData?.emails.filter(e => !e.isRead).length || 0 }}
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
          <div className="flex-1 flex min-h-0">
            {/* Email List Panel */}
            <div className="w-96 border-r flex flex-col">
              <EmailFilters
                search={search}
                onSearchChange={setSearch}
                unreadOnly={unreadOnly}
                onUnreadOnlyChange={setUnreadOnly}
              />
              <EmailList
                emails={emailData?.emails || []}
                selectedEmail={selectedEmail}
                onSelectEmail={setSelectedEmail}
                isLoading={isLoadingEmails}
              />
            </div>

            {/* Email Detail Panel */}
            <div className="flex-1 min-w-0">
              {selectedEmail ? (
                <EmailDetail
                  email={selectedEmail}
                  accountId={activeAccount.id}
                  onBack={() => setSelectedEmail(null)}
                  onReply={handleReply}
                  onCreateTask={handleCreateTask}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
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
                Conecte sua conta de email para visualizar e gerenciar suas mensagens.
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
        replyTo={replyToEmail}
        onSuccess={() => setReplyToEmail(null)}
      />

      <EmailToTaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        email={emailForTask}
        accountId={activeAccount?.id || ''}
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

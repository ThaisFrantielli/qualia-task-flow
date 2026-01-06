import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, Send, FileEdit, Star, Archive, AlertTriangle, Trash2, Plus, Mail, ChevronDown } from 'lucide-react';
import { EmailAccount, EmailFolder, EMAIL_FOLDERS } from '@/types/email';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface EmailSidebarProps {
  accounts: EmailAccount[];
  activeAccount: EmailAccount | null;
  selectedFolder: EmailFolder;
  onAccountChange: (account: EmailAccount) => void;
  onFolderChange: (folder: EmailFolder) => void;
  onAddAccount: () => void;
  unreadCounts?: Record<string, number>;
}

const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Inbox,
  Send,
  FileEdit,
  Star,
  Archive,
  AlertTriangle,
  Trash2
};

export function EmailSidebar({
  accounts,
  activeAccount,
  selectedFolder,
  onAccountChange,
  onFolderChange,
  onAddAccount,
  unreadCounts = {}
}: EmailSidebarProps) {
  const [accountsOpen, setAccountsOpen] = useState(true);

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button onClick={onAddAccount} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Conectar Email
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Accounts Section */}
          {accounts.length > 0 && (
            <Collapsible open={accountsOpen} onOpenChange={setAccountsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                <span>Contas</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", accountsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => onAccountChange(account)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      activeAccount?.id === account.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate font-medium">{account.display_name || account.email.split('@')[0]}</p>
                      <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                    </div>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Folders Section */}
          {activeAccount && (
            <div className="space-y-1">
              <p className="px-2 py-1 text-sm font-medium text-muted-foreground">Pastas</p>
              {EMAIL_FOLDERS.map((folder) => {
                const IconComponent = FOLDER_ICONS[folder.icon] || Mail;
                const unreadCount = unreadCounts[folder.key] || 0;
                
                return (
                  <button
                    key={folder.key}
                    onClick={() => onFolderChange(folder.key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedFolder === folder.key
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{folder.label}</span>
                    {unreadCount > 0 && folder.key === 'inbox' && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {accounts.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conta conectada
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Conectar Email" para começar
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

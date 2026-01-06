import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EmailAccount, EmailMessage, EmailFolder } from '@/types/email';

interface EmailContextState {
  // Accounts
  accounts: EmailAccount[];
  activeAccount: EmailAccount | null;
  setActiveAccount: (account: EmailAccount | null) => void;
  addAccount: (account: EmailAccount) => void;
  removeAccount: (accountId: string) => void;
  
  // Folders
  selectedFolder: EmailFolder;
  setSelectedFolder: (folder: EmailFolder) => void;
  
  // Emails
  emails: EmailMessage[];
  setEmails: (emails: EmailMessage[]) => void;
  selectedEmail: EmailMessage | null;
  setSelectedEmail: (email: EmailMessage | null) => void;
  
  // Cache
  emailCache: Map<string, EmailMessage>;
  cacheEmail: (email: EmailMessage) => void;
  getCachedEmail: (messageId: string) => EmailMessage | undefined;
  
  // UI State
  isComposing: boolean;
  setIsComposing: (value: boolean) => void;
  replyToEmail: EmailMessage | null;
  setReplyToEmail: (email: EmailMessage | null) => void;
  
  // Loading states
  isLoadingAccounts: boolean;
  setIsLoadingAccounts: (value: boolean) => void;
  isLoadingEmails: boolean;
  setIsLoadingEmails: (value: boolean) => void;
}

const EmailContext = createContext<EmailContextState | undefined>(undefined);

export function EmailProvider({ children }: { children: ReactNode }) {
  // Accounts state
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<EmailAccount | null>(null);
  
  // Folder state
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
  
  // Email state
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  
  // Cache
  const [emailCache] = useState<Map<string, EmailMessage>>(new Map());
  
  // UI state
  const [isComposing, setIsComposing] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<EmailMessage | null>(null);
  
  // Loading states
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  const addAccount = useCallback((account: EmailAccount) => {
    setAccounts(prev => [...prev, account]);
    if (!activeAccount) {
      setActiveAccount(account);
    }
  }, [activeAccount]);

  const removeAccount = useCallback((accountId: string) => {
    setAccounts(prev => prev.filter(a => a.id !== accountId));
    if (activeAccount?.id === accountId) {
      setActiveAccount(null);
    }
  }, [activeAccount]);

  const cacheEmail = useCallback((email: EmailMessage) => {
    emailCache.set(email.id, email);
  }, [emailCache]);

  const getCachedEmail = useCallback((messageId: string) => {
    return emailCache.get(messageId);
  }, [emailCache]);

  const value: EmailContextState = {
    accounts,
    activeAccount,
    setActiveAccount,
    addAccount,
    removeAccount,
    selectedFolder,
    setSelectedFolder,
    emails,
    setEmails,
    selectedEmail,
    setSelectedEmail,
    emailCache,
    cacheEmail,
    getCachedEmail,
    isComposing,
    setIsComposing,
    replyToEmail,
    setReplyToEmail,
    isLoadingAccounts,
    setIsLoadingAccounts,
    isLoadingEmails,
    setIsLoadingEmails
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
}

export function useEmailContext() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmailContext must be used within an EmailProvider');
  }
  return context;
}

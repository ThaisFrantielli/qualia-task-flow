import { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatMessage } from '@/types/api';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  // opportunityId was unused; keep it optional for upstream compatibility
  opportunityId?: number;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentUserId: number;
  onSendMessage: (content: string) => Promise<void>;
}

export function ChatInterface({
  messages,
  onLoadMore,
  hasMore,
  isLoadingMore,
  currentUserId,
  onSendMessage,
}: ChatInterfaceProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (content: string) => {
    try {
      setIsSending(true);
      await onSendMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-50">
      {/* Messages area with scroll */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          currentUserId={currentUserId}
        />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
      </div>
    </div>
  );
}
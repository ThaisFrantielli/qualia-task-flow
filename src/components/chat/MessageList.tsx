import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageItem } from './MessageItem';
import type { ChatMessage } from '@/types/api';

interface MessageListProps {
  messages: ChatMessage[];
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentUserId: number;
}

export function MessageList({
  messages,
  onLoadMore,
  hasMore,
  isLoadingMore,
  currentUserId,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-4 py-6 space-y-4"
    >
      {/* Loading indicator for older messages */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Intersection observer target */}
      <div ref={observerRef} className="h-4" />

      {/* Message list */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwnMessage={message.user.id === currentUserId}
        />
      ))}
    </div>
  );
}
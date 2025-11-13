import { format } from 'date-fns';
import { formatDateSafe } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import type { ChatMessage } from '@/types/api';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  return (
    <div
      className={cn(
        'flex gap-3 max-w-[80%]',
        isOwnMessage ? 'ml-auto' : 'mr-auto'
      )}
    >
      {/* Avatar for other users' messages */}
      {!isOwnMessage && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
          {/* Add avatar image here if available */}
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-medium">
            {message.user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          'flex flex-col',
          isOwnMessage ? 'items-end' : 'items-start'
        )}
      >
        {/* User name and time */}
        <div className="flex items-center gap-2 text-sm mb-1">
          {!isOwnMessage && (
            <span className="font-medium text-gray-900">
              {message.user.name}
            </span>
          )}
          <time className="text-gray-500 text-xs">
            {formatDateSafe(message.created_at, "HH:mm 'em' d 'de' MMM", { locale: ptBR })}
          </time>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2 max-w-full break-words',
            isOwnMessage
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-900'
          )}
        >
          {/* System message styling */}
          {message.is_system_message ? (
            <p className="text-sm italic">
              {message.content}
            </p>
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Attachment indicator if present */}
          {message.metadata?.attachments && (
            <div className="mt-2 text-xs">
              {message.metadata.attachments.map((attachment: any, index: number) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded',
                    isOwnMessage
                      ? 'bg-primary-dark'
                      : 'bg-gray-200'
                  )}
                >
                  📎 {attachment.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply thread indicator */}
        {(message.replies_count ?? 0) > 0 && (
          <button
            className="text-xs text-primary-600 mt-1 hover:underline"
          >
            {message.replies_count} resposta{message.replies_count !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}
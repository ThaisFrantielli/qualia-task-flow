import { useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/types/api';
import Echo from '@/services/echo';
import type { Channel } from 'pusher-js';

interface UseChatOptions {
    oportunidadeId: number;
    onNewMessage: (message: ChatMessage) => void;
}

export function useChat({ oportunidadeId, onNewMessage }: UseChatOptions) {
    const channelName = `chat.${oportunidadeId}`;

    const subscribeToChat = useCallback(() => {
        const channel = Echo.private(channelName);

        channel.bind('.new.message', (event: { message: ChatMessage }) => {
            onNewMessage(event.message);
        });

        return () => {
            channel.unbind('.new.message');
            Echo.leave(channelName);
        };
    }, [channelName, onNewMessage]);

    useEffect(() => {
        const unsubscribe = subscribeToChat();
        return () => {
            unsubscribe();
        };
    }, [subscribeToChat]);
}
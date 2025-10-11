import { useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/types/api';
import Echo from '@/services/echo';

interface UseChatOptions {
    oportunidadeId: number;
    onNewMessage: (message: ChatMessage) => void;
}

export function useChat({ oportunidadeId, onNewMessage }: UseChatOptions) {
    const channelName = `chat.${oportunidadeId}`;

    const subscribeToChat = useCallback(() => {
        // Check if Echo is available and enabled
        if (!Echo) {
            console.info('WebSocket/Echo not available. Real-time chat updates disabled.');
            return () => {}; // Return empty cleanup function
        }

        const channel = Echo.private(channelName);

        channel.bind('.new.message', (event: { message: ChatMessage }) => {
            onNewMessage(event.message);
        });

        return () => {
            channel.unbind('.new.message');
            Echo?.leave(channelName);
        };
    }, [channelName, onNewMessage]);

    useEffect(() => {
        const unsubscribe = subscribeToChat();
        return () => {
            unsubscribe();
        };
    }, [subscribeToChat]);
}
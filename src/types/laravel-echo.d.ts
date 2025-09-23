declare module 'laravel-echo' {
    import { Channel, PresenceChannel } from 'pusher-js';

    export default class Echo {
        constructor(options: EchoOptions);
        private: (channel: string) => Channel;
        join(channel: string): PresenceChannel;
        leave(channel: string): void;
        channel(channel: string): Channel;
        connect(): void;
        disconnect(): void;
    }

    interface EchoOptions {
        broadcaster: 'pusher' | 'null';
        key?: string;
        cluster?: string;
        wsHost?: string;
        wsPort?: number;
        wssPort?: number;
        forceTLS?: boolean;
        encrypted?: boolean;
        disableStats?: boolean;
        enabledTransports?: string[];
        authorizer?: (channel: any, options: any) => {
            authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => void;
        };
    }
}
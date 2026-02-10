import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Declare the Echo type on the window object
declare global {
    interface Window {
        Echo: Echo | null;
        Pusher: typeof Pusher;
    }
}

// Make Pusher available globally (required by Laravel Echo)
window.Pusher = Pusher;

// Check if we should enable WebSocket connections
const isWebSocketEnabled = import.meta.env.VITE_ENABLE_WEBSOCKET === 'true';
const key = import.meta.env.VITE_PUSHER_APP_KEY;

if (!isWebSocketEnabled) {
    console.info('WebSocket connections are disabled. Set VITE_ENABLE_WEBSOCKET=true to enable.');
    window.Echo = null;
} else if (!key) {
    console.warn('VITE_PUSHER_APP_KEY is not set in your .env file. WebSocket connections disabled.');
    window.Echo = null;
} else {
    // Create and configure Echo instance only if enabled and configured
    try {
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key: key,
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
            wsHost: import.meta.env.VITE_PUSHER_HOST ?? '127.0.0.1',
            wsPort: import.meta.env.VITE_PUSHER_PORT ? Number(import.meta.env.VITE_PUSHER_PORT) : 6001,
            wssPort: import.meta.env.VITE_PUSHER_PORT ? Number(import.meta.env.VITE_PUSHER_PORT) : 6001,
            forceTLS: false,
            encrypted: false,
            enabledTransports: ['ws'],
            disableStats: true,
            authorizer: (channel: any) => ({
                authorize: async (socketId: string, callback: Function) => {
                    try {
                        const response = await fetch('/broadcasting/auth', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                            },
                            body: JSON.stringify({
                                socket_id: socketId,
                                channel_name: channel.name,
                            }),
                            credentials: 'same-origin',
                        });

                        const result = await response.json();
                        callback(null, result);
                    } catch (error) {
                        callback(error);
                    }
                },
            }),
        });
    } catch (err) {
        // If Pusher/Echo initialization fails (e.g. host unreachable), disable Echo to avoid noisy console errors
        // and keep the app functional.
        // eslint-disable-next-line no-console
        const msg = err instanceof Error ? err.message : (err as any)?.message;
        console.info('Echo init failed — WebSocket disabled for this session.', msg ?? err);
        window.Echo = null;
    }
}

// Export the configured Echo instance
export default window.Echo;
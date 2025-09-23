import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Declare the Echo type on the window object
declare global {
    interface Window {
        Echo: Echo;
        Pusher: typeof Pusher;
    }
}

// Make Pusher available globally (required by Laravel Echo)
window.Pusher = Pusher;

// Create and configure Echo instance
const key = import.meta.env.VITE_PUSHER_APP_KEY;
if (!key) {
    throw new Error('VITE_PUSHER_APP_KEY is not set in your .env file');
}

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

// Export the configured Echo instance
export default window.Echo;
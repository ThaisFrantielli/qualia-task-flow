self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Nova mensagem', body: 'Você recebeu uma nova mensagem no WhatsApp.' };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    // fallback silencioso
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Nova mensagem', {
      body: payload.body || 'Você recebeu uma nova mensagem no WhatsApp.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data || { url: '/atendimento?folder=whatsapp' },
      tag: payload.tag || 'whatsapp-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/atendimento?folder=whatsapp';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

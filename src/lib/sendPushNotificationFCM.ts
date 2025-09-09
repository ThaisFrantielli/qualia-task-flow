// Função serverless de exemplo para enviar push notification via FCM
// Pode ser adaptada para rodar em Vercel, AWS Lambda, etc.
// Using browser's native fetch API

const FCM_SERVER_KEY = 'SUA_SERVER_KEY';

export async function sendPushNotificationFCM(
  token: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  const message = {
    to: token,
    notification: {
      title,
      body,
    },
    data,
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error('Erro ao enviar push notification: ' + (await response.text()));
  }
  return response.json();
}

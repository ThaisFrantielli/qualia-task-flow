// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'SEU_AUTH_DOMAIN',
  projectId: 'SEU_PROJECT_ID',
  messagingSenderId: 'SEU_SENDER_ID',
  appId: 'SEU_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging, { vapidKey: 'SUA_VAPID_KEY', serviceWorkerRegistration: await navigator.serviceWorker.ready });
    return token;
  }
  return null;
}

export function listenToForegroundMessages(callback: (payload: any) => void) {
  onMessage(messaging, callback);
}

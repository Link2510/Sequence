import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';

export interface FirebaseSparkConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY = 'lotr_firebase_spark_config_v1';

/**
 * Cấu hình Firebase của project BoardGame (sequence-23c7f) dùng chung cho sảnh
 * trò chơi. Nhúng sẵn để bản build tĩnh trên Firebase Hosting không cần .env.
 * Đây là cấu hình web công khai của Firebase (không phải khoá bí mật).
 */
export const BUILTIN_FIREBASE_CONFIG: FirebaseSparkConfig = {
  apiKey: 'AIzaSyBL7SP3B4QL6kN4mdKJ_yMtXOXyKagrZ2I',
  authDomain: 'sequence-23c7f.firebaseapp.com',
  projectId: 'sequence-23c7f',
  storageBucket: 'sequence-23c7f.firebasestorage.app',
  messagingSenderId: '535984225423',
  appId: '1:535984225423:web:53fd014176d3c3b59104fa',
};

export function getEnvFirebaseConfig(): FirebaseSparkConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId,
  };
}

export function getSavedFirebaseConfig(): FirebaseSparkConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirebaseSparkConfig;
    if (parsed.apiKey && parsed.projectId && parsed.appId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function getActiveFirebaseConfig(): FirebaseSparkConfig | null {
  return getEnvFirebaseConfig() || getSavedFirebaseConfig() || BUILTIN_FIREBASE_CONFIG;
}

export function saveRuntimeFirebaseConfig(config: FirebaseSparkConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  cachedApp = null;
  cachedDb = null;
}

export function clearRuntimeFirebaseConfig(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  cachedApp = null;
  cachedDb = null;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return getActiveFirebaseConfig() !== null;
}

export function getFirestoreDb(): Firestore | null {
  const config = getActiveFirebaseConfig();
  if (!config) return null;

  if (!cachedApp) {
    const existing = getApps();
    cachedApp = existing.length > 0 ? existing[0] : initializeApp(config);
  }
  if (!cachedDb) {
    cachedDb = getFirestore(cachedApp);
  }
  return cachedDb;
}

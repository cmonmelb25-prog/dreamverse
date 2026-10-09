import { initializeApp, cert, getApps, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

// Normalize private key newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Validate required env vars
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !privateKey
) {
  console.warn(
    '⚠ Firebase Admin environment variables are missing. Some server features may fail.'
  );
}

// Construct service account object
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey || '',
};

/**
 * Initialize Admin app exactly once.
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert(serviceAccount as any),
  });
}

export const adminApp = getAdminApp();

// 🔥 Firestore
export const db: Firestore = getFirestore(adminApp);

// 🔐 Auth
export const auth: Auth = getAuth(adminApp);
export const adminAuth: Auth = getAuth(adminApp);

// 📣 Messaging
export const adminMessaging: Messaging = getMessaging(adminApp);

// Optional safety tweak
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e: any) {
  if (!e.message.includes('already been initialized')) {
    console.error('Firestore settings error:', e);
  }
}
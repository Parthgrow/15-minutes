import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from individual environment variables
 * Compatible with Vercel and other serverless platforms
 */
export function initializeFirebaseAdmin(): App {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  // Get service account credentials from environment variables
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  // Validate required environment variables
  if (!FIREBASE_PROJECT_ID) {
    throw new Error(
      'Firebase Admin initialization failed: Missing FIREBASE_PROJECT_ID environment variable'
    );
  }

  if (!FIREBASE_CLIENT_EMAIL) {
    throw new Error(
      'Firebase Admin initialization failed: Missing FIREBASE_CLIENT_EMAIL environment variable'
    );
  }

  if (!FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Firebase Admin initialization failed: Missing FIREBASE_PRIVATE_KEY environment variable'
    );
  }

  // Build service account object from environment variables
  const serviceAccount = {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
  };

  // Initialize Firebase Admin
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID,

  });

  return app;
}

/**
 * Get Firestore instance
 * Initializes Firebase Admin if not already initialized
 */
export function getFirestoreAdmin(): Firestore {
  if (!db) {
    if (!app) {
      initializeFirebaseAdmin();
    }
    db = getFirestore(app);
  }
  return db;
}

/**
 * Get Firebase Admin app instance
 */
export function getFirebaseAdminApp(): App {
  if (!app) {
    initializeFirebaseAdmin();
  }
  return app!;
}

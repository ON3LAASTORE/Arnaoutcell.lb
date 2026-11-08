import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  enableNetwork,
  disableNetwork,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Suppress internal transport reconnection log notices while keeping actionable errors
if (typeof window !== 'undefined') {
  try {
    setLogLevel('error');
  } catch {
    // Ignore if not supported in the current environment
  }
}

/**
 * Configure Firestore with persistent local cache and WebChannel long polling
 * to eliminate 'WebChannelConnection RPC Listen stream transport errored' in Cloud Run,
 * proxy, and containerized preview environments.
 */
function createFirestoreInstance(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser) {
    try {
      return initializeFirestore(app, {}, databaseId);
    } catch {
      return getFirestore(app, databaseId);
    }
  }

  // 1. In browser/proxy environments, use persistent IndexedDB cache with multi-tab support
  // 2. Force WebChannel long polling with a 25s timeout (prevents reverse-proxies from prematurely killing hanging GET streams)
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
        experimentalLongPollingOptions: {
          timeoutSeconds: 25,
        },
      },
      databaseId
    );
  } catch {
    // Fallback for environments where IndexedDB is blocked (e.g. private browsing, restricted iframes)
    try {
      return initializeFirestore(
        app,
        {
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: true,
          experimentalLongPollingOptions: {
            timeoutSeconds: 25,
          },
        },
        databaseId
      );
    } catch {
      return getFirestore(app, databaseId);
    }
  }
}

// CRITICAL: The app will break without this line
export const db = createFirestoreInstance();
export const auth = getAuth(app);

// Connection and online state tracking
let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Setup automatic network reconnection handlers
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    isOnlineState = true;
    try {
      await enableNetwork(db);
    } catch {
      // Ignore background reconnect errors
    }
  });

  window.addEventListener('offline', async () => {
    isOnlineState = false;
    try {
      await disableNetwork(db);
    } catch {
      // Ignore background disconnect errors
    }
  });
}

/**
 * Proactively forces Firestore to reconnect to the cloud database.
 */
export async function reconnectFirestore(): Promise<boolean> {
  try {
    await enableNetwork(db);
    isOnlineState = true;
    return true;
  } catch (err) {
    console.warn('Firestore manual reconnect attempt notice:', err);
    return false;
  }
}

export function getIsOnline(): boolean {
  return isOnlineState;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Resilient connection check on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.warn('Firestore offline notice: running with resilient local store & auto-reconnect enabled.');
    }
    return false;
  }
}

// Run non-blocking connection verification
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 100);
}


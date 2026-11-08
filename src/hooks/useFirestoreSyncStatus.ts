import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, reconnectFirestore } from '../firebase';
import {
  computeSyncStatus,
  getConnectivityBadgeMeta,
  formatLastSyncedTime,
  SyncStatus,
  ConnectivityBadgeMeta,
} from '../utils/connectivityHelpers';

export interface UseFirestoreSyncStatusResult {
  status: SyncStatus;
  meta: ConnectivityBadgeMeta;
  fromCache: boolean;
  hasPendingWrites: boolean;
  isNavigatorOnline: boolean;
  lastSyncedAt: Date | null;
  lastSyncedFormatted: string;
  isReconnecting: boolean;
  reconnect: () => Promise<boolean>;
}

export function useFirestoreSyncStatus(lang: 'en' | 'ar' = 'en'): UseFirestoreSyncStatusResult {
  const [isNavigatorOnline, setIsNavigatorOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [hasPendingWrites, setHasPendingWrites] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasServerError, setHasServerError] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date());
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // 1. Listen to Firebase Firestore snapshot metadata changes
  useEffect(() => {
    let isMounted = true;
    // Listen to live products catalog document with includeMetadataChanges: true
    const docRef = doc(db, 'products', 'prod-iphone16promax');

    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isMounted) return;

        const isFromCache = snapshot.metadata.fromCache;
        const pendingWrites = snapshot.metadata.hasPendingWrites;

        setFromCache(isFromCache);
        setHasPendingWrites(pendingWrites);
        setIsConnecting(false);
        setHasServerError(false);

        // If not from cache, data was just confirmed from server
        if (!isFromCache) {
          setLastSyncedAt(new Date());
        }
      },
      (error) => {
        if (!isMounted) return;
        console.warn('Firestore connectivity listener notice:', error.message);
        setIsConnecting(false);
        setHasServerError(true);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Listen to browser window online/offline events for instant network status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsNavigatorOnline(true);
      setIsConnecting(true);
      reconnectFirestore()
        .then(() => {
          setIsConnecting(false);
          setHasServerError(false);
        })
        .catch(() => {
          setIsConnecting(false);
        });
    };

    const handleOffline = () => {
      setIsNavigatorOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const reconnect = useCallback(async (): Promise<boolean> => {
    setIsReconnecting(true);
    setIsConnecting(true);
    try {
      const success = await reconnectFirestore();
      if (success) {
        setHasServerError(false);
        setLastSyncedAt(new Date());
      }
      return success;
    } finally {
      setIsReconnecting(false);
      setIsConnecting(false);
    }
  }, []);

  const status = computeSyncStatus({
    isNavigatorOnline,
    fromCache,
    hasPendingWrites,
    isConnecting,
    hasServerError,
  });

  const meta = getConnectivityBadgeMeta(status, lang);
  const lastSyncedFormatted = formatLastSyncedTime(lastSyncedAt, lang);

  return {
    status,
    meta,
    fromCache,
    hasPendingWrites,
    isNavigatorOnline,
    lastSyncedAt,
    lastSyncedFormatted,
    isReconnecting,
    reconnect,
  };
}

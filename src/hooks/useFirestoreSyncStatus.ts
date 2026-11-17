import { useState, useEffect, useCallback } from 'react';
import { reconnectFirestore, testConnection } from '../firebase';
import {
  getProductSyncMeta,
  subscribeToProductSyncMeta,
  ProductSyncMetadata,
} from '../services/productFirestoreService';
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
  const [syncMeta, setSyncMeta] = useState<ProductSyncMetadata>(() => getProductSyncMeta());
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // 1. Share metadata state from the single products catalog listener (avoids duplicate Firestore reads/listeners)
  useEffect(() => {
    const unsubscribe = subscribeToProductSyncMeta((nextMeta) => {
      setSyncMeta(nextMeta);
    });
    return unsubscribe;
  }, []);

  // 2. Listen to browser window online/offline events for instant network status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsNavigatorOnline(true);
      setSyncMeta((prev) => ({ ...prev, isConnecting: true }));
      reconnectFirestore()
        .then(() => {
          setSyncMeta((prev) => ({
            ...prev,
            isConnecting: false,
            hasServerError: false,
          }));
        })
        .catch(() => {
          setSyncMeta((prev) => ({ ...prev, isConnecting: false }));
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
    setSyncMeta((prev) => ({ ...prev, isConnecting: true }));
    try {
      const enabled = await reconnectFirestore();
      const verified = enabled ? await testConnection() : false;
      setSyncMeta((prev) => ({
        ...prev,
        isConnecting: false,
        fromCache: !verified,
        hasServerError: false,
        isQuotaLimited: !verified && prev.isQuotaLimited,
        lastSyncedAt: verified ? new Date() : prev.lastSyncedAt,
      }));
      return verified;
    } finally {
      setIsReconnecting(false);
    }
  }, []);

  const status = computeSyncStatus({
    isNavigatorOnline,
    fromCache: syncMeta.fromCache,
    hasPendingWrites: syncMeta.hasPendingWrites,
    isConnecting: syncMeta.isConnecting || isReconnecting,
    hasServerError: syncMeta.hasServerError,
  });

  const meta = getConnectivityBadgeMeta(status, lang);
  const lastSyncedFormatted = formatLastSyncedTime(syncMeta.lastSyncedAt, lang);

  return {
    status,
    meta,
    fromCache: syncMeta.fromCache,
    hasPendingWrites: syncMeta.hasPendingWrites,
    isNavigatorOnline,
    lastSyncedAt: syncMeta.lastSyncedAt,
    lastSyncedFormatted,
    isReconnecting,
    reconnect,
  };
}

/**
 * Pure helper functions for Firebase Firestore connectivity & metadata sync status.
 */

export type SyncStatus = 'synced' | 'syncing' | 'cached' | 'offline' | 'connecting';

export interface SyncStatusOptions {
  isNavigatorOnline: boolean;
  fromCache: boolean;
  hasPendingWrites: boolean;
  isConnecting?: boolean;
  hasServerError?: boolean;
}

export interface ConnectivityBadgeMeta {
  status: SyncStatus;
  label: string;
  shortLabel: string;
  tooltip: string;
  dotColor: string;
  badgeClasses: string;
  isPulsing: boolean;
}

/**
 * Computes the unified synchronization state based on browser navigator online status,
 * Firestore snapshot metadata (fromCache, hasPendingWrites), and connection state.
 */
export function computeSyncStatus(options: SyncStatusOptions): SyncStatus {
  const {
    isNavigatorOnline,
    fromCache,
    hasPendingWrites,
    isConnecting = false,
    hasServerError = false,
  } = options;

  if (!isNavigatorOnline) {
    return 'offline';
  }

  if (isConnecting) {
    return 'connecting';
  }

  if (hasPendingWrites) {
    return 'syncing';
  }

  if (hasServerError) {
    return 'offline';
  }

  if (fromCache) {
    return 'cached';
  }

  return 'synced';
}

/**
 * Returns localized presentation labels, styling, and tooltip content for the indicator.
 */
export function getConnectivityBadgeMeta(status: SyncStatus, lang: 'en' | 'ar'): ConnectivityBadgeMeta {
  const isAr = lang === 'ar';

  switch (status) {
    case 'synced':
      return {
        status,
        label: isAr ? 'متصل ومحدث' : 'Online & Synced',
        shortLabel: isAr ? 'متصل' : 'Online',
        tooltip: isAr
          ? 'متصل مباشرة بقاعدة البيانات السحابية (Firebase Live). كافة البيانات محدثة في الوقت الفعلي.'
          : 'Connected to Firebase Cloud Database. Real-time updates and inventory sync active.',
        dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
        badgeClasses:
          'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
        isPulsing: true,
      };

    case 'syncing':
      return {
        status,
        label: isAr ? 'جاري المزامنة...' : 'Syncing...',
        shortLabel: isAr ? 'مزامنة' : 'Syncing',
        tooltip: isAr
          ? 'يتم الآن رفع وتحديث التغييرات المحلية إلى سحابة فايربيس...'
          : 'Syncing pending offline writes to Firebase cloud...',
        dotColor: 'bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]',
        badgeClasses:
          'bg-sky-50/90 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/40',
        isPulsing: true,
      };

    case 'cached':
      return {
        status,
        label: isAr ? 'ذاكرة مخزنة (أوفلاين)' : 'Cached (Offline)',
        shortLabel: isAr ? 'مخزن' : 'Cached',
        tooltip: isAr
          ? 'يتم عرض المنتجات والبيانات من الذاكرة المحلية (IndexedDB). التصفح والطلبات تعمل دون انقطاع.'
          : 'Viewing products from local persistent cache (IndexedDB). Browsing and cart remain fully functional.',
        dotColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
        badgeClasses:
          'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40',
        isPulsing: false,
      };

    case 'connecting':
      return {
        status,
        label: isAr ? 'جاري الاتصال...' : 'Connecting...',
        shortLabel: isAr ? 'اتصال' : 'Connecting',
        tooltip: isAr
          ? 'جاري الاتصال بخادم فايربيس السحابي للتحقق من التحديثات...'
          : 'Connecting to Firebase Firestore servers to sync latest data...',
        dotColor: 'bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]',
        badgeClasses:
          'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        isPulsing: true,
      };

    case 'offline':
    default:
      return {
        status,
        label: isAr ? 'غير متصل (يعمل محلياً)' : 'Offline (Local)',
        shortLabel: isAr ? 'غير متصل' : 'Offline',
        tooltip: isAr
          ? 'لا يوجد اتصال بالإنترنت. الموقع يعمل بكفاءة عبر التخزين المحلي، وسيتم التزامن تلقائياً فور عودة الاتصال.'
          : 'No internet connection detected. The app is running smoothly in offline mode with full local catalog access.',
        dotColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
        badgeClasses:
          'bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/40',
        isPulsing: false,
      };
  }
}

/**
 * Formats a timestamp into a friendly human-readable relative time string.
 */
export function formatLastSyncedTime(date: Date | null, lang: 'en' | 'ar'): string {
  if (!date) {
    return lang === 'ar' ? 'لم يتم التزامن بعد' : 'Not yet synced';
  }

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSec < 5) {
    return lang === 'ar' ? 'الآن' : 'Just now';
  }
  if (diffSec < 60) {
    return lang === 'ar' ? `منذ ${diffSec} ثانية` : `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'ar' ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  return lang === 'ar' ? `منذ ${diffHour} ساعة` : `${diffHour}h ago`;
}

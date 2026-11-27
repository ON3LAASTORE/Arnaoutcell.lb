import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { AdminPermission, AdminRole, AdminUser } from '../types';
import {
  verifyAdminCredentials,
  changeAdminPassword,
  initializeAdminAuth,
  purgeLegacyAdminAuthStorage,
  clearAdminApiToken,
  exchangeFirebaseIdTokenForAdminSession,
  logoutAdminSession,
  restoreAdminApiSession,
} from '../services/authService';
import { safeStorageSetItem } from '../utils/storageQuotaHelpers';
import { fetchAdminActivityLogs, recordAdminActivity } from '../services/activityLogService';
import {
  ADMIN_ACTIVITY_THROTTLE_MS,
  ADMIN_LAST_ACTIVITY_STORAGE_KEY,
  ADMIN_SESSION_TIMEOUT_MS,
  AdminLogoutReason,
  computeSessionTimerState,
  parseStoredActivityTimestamp,
  shouldPausePassiveActivityReset,
  shouldRecordActivityUpdate,
} from '../utils/adminSessionTimerHelpers';
import {
  getEffectivePermissions,
  hasAdminPermission,
  hasAdminRole,
  normalizeAdminUserProfile,
  normalizePortalUsername,
  resolvePortalDirectoryUser,
  SUPER_ADMIN_PERMISSIONS,
} from '../utils/adminPermissionHelpers';
import {
  BuildPermissionDeniedInput,
  emitPermissionDenied,
  guardActionWithPermission,
  PermissionDeniedDetail,
} from '../utils/permissionDeniedHelpers';
import {
  buildAdminUserFromFirebaseUser,
  fetchFirestoreAdminProfile,
  signInWithResolvedPortalFirebaseAccount,
  syncProvisionedAlaaAdminProfile,
  syncSignedInSuperAdminProfile,
} from '../services/adminProfileService';
import { auth } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

export const SELECTABLE_ADMIN_BRANDS: string[] = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'Anker',
  'Green Lion',
  'JBL',
  'Sony',
  'Huawei',
  'Honor',
  'Infinix',
  'Tecno',
  'Oppo',
  'Vivo',
  'Baseus',
  'UGREEN',
  'Hoco',
  'Oraimo',
  'Logitech',
  'Razer',
  'HyperX',
  'DJI',
  'Kingston',
  'SanDisk',
  'TP-Link',
  'ACEFAST',
  'FONENG',
  'YESIDO',
  'DOOGEE',
  'LITO',
];

interface AdminContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  permissions: AdminPermission[];
  login: (username: string, password?: string, role?: AdminRole) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: (reason?: AdminLogoutReason) => void;
  hasRole: (roles: AdminRole[]) => boolean;
  hasPermission: (required: AdminPermission | AdminPermission[]) => boolean;
  requirePermission: (
    required: AdminPermission | AdminPermission[],
    actionContext: {
      actionEn: string;
      actionAr?: string;
      requiredRoles?: AdminRole[];
      reasonEn?: string;
      reasonAr?: string;
    }
  ) => boolean;
  reportPermissionDenied: (
    input: Omit<BuildPermissionDeniedInput, 'currentUser'>
  ) => PermissionDeniedDetail;
  changePassword: (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ) => Promise<{ success: boolean; messageEn: string; messageAr: string }>;
  selectableBrands: string[];
  sessionRemainingMs: number;
  showTimeoutWarning: boolean;
  extendSession: () => void;
  logoutReason: AdminLogoutReason | null;
  dismissLogoutReason: () => void;
}

const DEMO_USERS: Record<string, AdminUser> = {
  alaa: {
    id: 'admin-alaa',
    username: 'Alaa',
    name: 'Alaa',
    role: 'super_admin',
    email: 'alaa@onalaastore.com',
    permissions: [...SUPER_ADMIN_PERMISSIONS],
  },
  admin: {
    id: 'u-1',
    username: 'admin',
    name: '3Laa Hassan',
    role: 'super_admin',
    email: 'admin@arnaoutcell.com',
    permissions: [...SUPER_ADMIN_PERMISSIONS],
  },
  products: {
    id: 'u-2',
    username: 'products',
    name: 'Karim Product Specialist',
    role: 'product_manager',
    email: 'products@arnaoutcell.com',
    permissions: ['manage_products', 'manage_categories', 'manage_content', 'view_analytics'],
  },
  orders: {
    id: 'u-3',
    username: 'orders',
    name: 'Lina Order Operations',
    role: 'order_manager',
    email: 'orders@arnaoutcell.com',
    permissions: ['manage_orders', 'manage_customers', 'view_analytics'],
  },
  inventory: {
    id: 'u-4',
    username: 'inventory',
    name: 'Tarek Chouf Fulfillment Hub',
    role: 'inventory_manager',
    email: 'inventory@arnaoutcell.com',
    permissions: ['manage_inventory'],
  },
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface InitialAuthSnapshot {
  user: AdminUser | null;
  expiredUser: AdminUser | null;
  lastActivityAt: number;
  remainingMs: number;
  logoutReason: AdminLogoutReason | null;
}

function readInitialAdminSnapshot(): InitialAuthSnapshot {
  const now = Date.now();
  if (typeof window === 'undefined') {
    return {
      user: null,
      expiredUser: null,
      lastActivityAt: now,
      remainingMs: ADMIN_SESSION_TIMEOUT_MS,
      logoutReason: null,
    };
  }

  try {
    purgeLegacyAdminAuthStorage();
    const rawUser = localStorage.getItem('arnaout_admin_user');
    if (!rawUser) {
      return {
        user: null,
        expiredUser: null,
        lastActivityAt: now,
        remainingMs: ADMIN_SESSION_TIMEOUT_MS,
        logoutReason: null,
      };
    }

    const parsedRaw = JSON.parse(rawUser) as Record<string, unknown>;
    const parsedUser = normalizeAdminUserProfile(parsedRaw as unknown as AdminUser);
    const needsSyncWrite =
      parsedRaw.role !== parsedUser.role ||
      parsedRaw.username !== parsedUser.username ||
      JSON.stringify(parsedRaw.permissions || []) !== JSON.stringify(parsedUser.permissions || []);
    if (needsSyncWrite) {
      safeStorageSetItem(window.localStorage, 'arnaout_admin_user', JSON.stringify(parsedUser));
    }

    const storedLastActivity = parseStoredActivityTimestamp(
      localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)
    );

    if (storedLastActivity !== null) {
      const state = computeSessionTimerState({ lastActivityAt: storedLastActivity, now });
      if (state.isExpired) {
        localStorage.removeItem('arnaout_admin_user');
        localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
        return {
          user: null,
          expiredUser: parsedUser,
          lastActivityAt: now,
          remainingMs: 0,
          logoutReason: 'inactivity',
        };
      }
      return {
        user: parsedUser,
        expiredUser: null,
        lastActivityAt: storedLastActivity,
        remainingMs: state.remainingMs,
        logoutReason: null,
      };
    }

    safeStorageSetItem(window.localStorage, ADMIN_LAST_ACTIVITY_STORAGE_KEY, String(now));
    return {
      user: parsedUser,
      expiredUser: null,
      lastActivityAt: now,
      remainingMs: ADMIN_SESSION_TIMEOUT_MS,
      logoutReason: null,
    };
  } catch {
    return {
      user: null,
      expiredUser: null,
      lastActivityAt: now,
      remainingMs: ADMIN_SESSION_TIMEOUT_MS,
      logoutReason: null,
    };
  }
}

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initialSnapshot] = useState<InitialAuthSnapshot>(() => readInitialAdminSnapshot());
  const [user, setUser] = useState<AdminUser | null>(initialSnapshot.user);
  const [loading, setLoading] = useState<boolean>(() => !initialSnapshot.user);
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number>(
    initialSnapshot.remainingMs
  );
  const [showTimeoutWarning, setShowTimeoutWarning] = useState<boolean>(false);
  const [logoutReason, setLogoutReason] = useState<AdminLogoutReason | null>(
    initialSnapshot.logoutReason
  );

  const userRef = useRef<AdminUser | null>(initialSnapshot.user);
  const lastActivityRef = useRef<number>(initialSnapshot.lastActivityAt);
  const lastThrottleWriteRef = useRef<number>(0);
  const logoutGuardRef = useRef<boolean>(Boolean(initialSnapshot.expiredUser));
  const firebaseBackedRef = useRef<boolean>(false);
  const authEpochRef = useRef<number>(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Ensure security credentials system is initialized and restore server session bearer token if active
  useEffect(() => {
    initializeAdminAuth()
      .then(() => {
        if (initialSnapshot.user) {
          return restoreAdminApiSession();
        }
        return { authenticated: false };
      })
      .catch(console.error);

    if (initialSnapshot.expiredUser) {
      const stale = initialSnapshot.expiredUser;
      logoutAdminSession().catch(() => {});
      fbSignOut(auth).catch(() => {});
      recordAdminActivity({
        action: 'auth_session_timeout',
        titleEn: 'Administrator session timed out due to inactivity',
        titleAr: 'انتهت جلسة المدير تلقائياً بسبب عدم النشاط',
        category: 'security',
        severity: 'warning',
        target: `Admin Portal (${stale.username})`,
        details: 'Stored admin session exceeded the 15-minute inactivity limit and was cleared on load.',
        actor: {
          name: stale.name,
          username: stale.username,
          role: stale.role,
          email: stale.email,
        },
        source: 'client',
      }).catch(() => {});
    }
  }, [initialSnapshot.expiredUser]);

  const stampActivity = useCallback((now: number = Date.now()) => {
    lastActivityRef.current = now;
    lastThrottleWriteRef.current = now;
    if (typeof window !== 'undefined') {
      safeStorageSetItem(window.localStorage, ADMIN_LAST_ACTIVITY_STORAGE_KEY, String(now));
    }
    setSessionRemainingMs(ADMIN_SESSION_TIMEOUT_MS);
    setShowTimeoutWarning(false);
  }, []);

  useEffect(() => {
    if (user) {
      safeStorageSetItem(window.localStorage, 'arnaout_admin_user', JSON.stringify(user));
    } else {
      try {
        localStorage.removeItem('arnaout_admin_user');
        localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [user]);

  const logout = useCallback((reason: AdminLogoutReason = 'manual') => {
    if (logoutGuardRef.current) return;
    logoutGuardRef.current = true;
    authEpochRef.current += 1;
    firebaseBackedRef.current = false;

    const signingOutUser = userRef.current;
    if (signingOutUser) {
      if (reason === 'inactivity') {
        recordAdminActivity({
          action: 'auth_session_timeout',
          titleEn: 'Administrator session timed out due to inactivity',
          titleAr: 'انتهت جلسة المدير تلقائياً بسبب عدم النشاط',
          category: 'security',
          severity: 'warning',
          target: `Admin Portal (${signingOutUser.username})`,
          details: 'Automatic 15-minute inactivity auto-logout enforced.',
          actor: {
            name: signingOutUser.name,
            username: signingOutUser.username,
            role: signingOutUser.role,
            email: signingOutUser.email,
          },
          source: 'client',
        }).catch(() => {});
      } else {
        recordAdminActivity({
          action: 'auth_logout',
          titleEn: 'Administrator signed out',
          titleAr: 'تم تسجيل خروج المدير',
          category: 'security',
          severity: 'info',
          target: `Admin Portal (${signingOutUser.username})`,
          details: 'Admin portal session terminated by user.',
          actor: {
            name: signingOutUser.name,
            username: signingOutUser.username,
            role: signingOutUser.role,
            email: signingOutUser.email,
          },
          source: 'client',
        }).catch(() => {});
      }
    }

    setUser(null);
    setLoading(false);
    setShowTimeoutWarning(false);
    setSessionRemainingMs(0);
    setLogoutReason(reason === 'inactivity' ? 'inactivity' : null);
    logoutAdminSession().catch(() => {});
    fbSignOut(auth).catch(() => {});
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('arnaout_admin_user');
        localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
        purgeLegacyAdminAuthStorage();
      } catch {
        // ignore
      }
    }
  }, []);

  const extendSession = useCallback(() => {
    if (!userRef.current) return;
    stampActivity(Date.now());
  }, [stampActivity]);

  const dismissLogoutReason = useCallback(() => {
    setLogoutReason(null);
  }, []);

  // 15-minute inactivity session timer, activity listeners, visibility & cross-tab sync
  useEffect(() => {
    if (!user) {
      setShowTimeoutWarning(false);
      return;
    }

    logoutGuardRef.current = false;

    const evaluateTimer = (now: number = Date.now()) => {
      if (!userRef.current) return;
      const storedTs = parseStoredActivityTimestamp(
        typeof window !== 'undefined'
          ? window.localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)
          : null
      );
      const effectiveLastActivity = storedTs ?? lastActivityRef.current;
      lastActivityRef.current = effectiveLastActivity;

      const state = computeSessionTimerState({
        lastActivityAt: effectiveLastActivity,
        now,
      });

      setSessionRemainingMs(state.remainingMs);
      setShowTimeoutWarning(state.showWarning);

      if (state.isExpired) {
        logout('inactivity');
      }
    };

    evaluateTimer(Date.now());

    const handleUserActivity = () => {
      if (!userRef.current) return;
      const now = Date.now();
      const storedTs = parseStoredActivityTimestamp(
        window.localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)
      );
      const currentLastActivity = storedTs ?? lastActivityRef.current;
      const currentState = computeSessionTimerState({
        lastActivityAt: currentLastActivity,
        now,
      });

      // Block silent dismissal if warning dialog is active or already expired
      if (shouldPausePassiveActivityReset(currentState)) {
        return;
      }

      if (shouldRecordActivityUpdate(lastThrottleWriteRef.current, now, ADMIN_ACTIVITY_THROTTLE_MS)) {
        stampActivity(now);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      evaluateTimer(Date.now());
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'arnaout_admin_user' && e.newValue === null) {
        setUser(null);
        setShowTimeoutWarning(false);
        return;
      }
      if (e.key === ADMIN_LAST_ACTIVITY_STORAGE_KEY) {
        evaluateTimer(Date.now());
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'pointerdown',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageSync);

    const intervalId = window.setInterval(() => {
      evaluateTimer(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [user, logout, stampActivity]);

  const login = async (
    username: string,
    password?: string,
    role?: AdminRole
  ): Promise<boolean> => {
    const trimmedUser = normalizePortalUsername(username);
    if (!trimmedUser) return false;

    if (typeof window !== 'undefined') {
      purgeLegacyAdminAuthStorage();
    }

    // Always require and verify administrator password securely via backend bcrypt endpoint
    if (!password) {
      return false;
    }

    const directoryEntry = resolvePortalDirectoryUser(trimmedUser);
    const credCheck = await verifyAdminCredentials(password, {
      username: trimmedUser,
      role: directoryEntry?.role || role || DEMO_USERS[trimmedUser]?.role || 'super_admin',
    });

    if (!credCheck.valid) {
      clearAdminApiToken();
      return false;
    }

    logoutGuardRef.current = false;
    const attemptEpoch = ++authEpochRef.current;
    firebaseBackedRef.current = false;
    setLogoutReason(null);
    stampActivity(Date.now());

    if (credCheck.user) {
      const resolvedUser = normalizeAdminUserProfile({
        id: credCheck.user.id,
        username: credCheck.user.username,
        name: credCheck.user.name,
        email: credCheck.user.email,
        role: (credCheck.user.role as AdminRole) || 'super_admin',
        permissions: credCheck.user.permissions as AdminPermission[] | undefined,
      });
      setUser(resolvedUser);
      setLoading(false);
      fetchAdminActivityLogs().catch(() => {});

      // Attempt username-to-Firebase Email/Password sign-in with bounded await so
      // `request.auth.uid` and `users/{uid}` are ready before the Admin Portal opens.
      const firebasePortalSync = signInWithResolvedPortalFirebaseAccount(username, password)
        .then(async (fbUser) => {
          if (logoutGuardRef.current || authEpochRef.current !== attemptEpoch) {
            return true;
          }
          if (!fbUser) {
            if (auth.currentUser) {
              if (trimmedUser === 'alaa') {
                await syncProvisionedAlaaAdminProfile(auth.currentUser.uid);
              } else {
                await syncSignedInSuperAdminProfile(auth.currentUser);
              }
            }
            return true;
          }
          firebaseBackedRef.current = true;
          await syncSignedInSuperAdminProfile(fbUser);
          if (logoutGuardRef.current || authEpochRef.current !== attemptEpoch) {
            return true;
          }
          const firestoreProfile = await fetchFirestoreAdminProfile(fbUser.uid).catch(() => null);
          if (logoutGuardRef.current || authEpochRef.current !== attemptEpoch) {
            return true;
          }
          if (firestoreProfile?.isActive === false) {
            firebaseBackedRef.current = false;
            setUser(null);
            clearAdminApiToken();
            logoutAdminSession().catch(() => {});
            fbSignOut(auth).catch(() => {});
            emitPermissionDenied({
              source: 'ui_guard',
              requiredPermissions: ['full_admin'],
              actionEn: 'Access Central Management & Secure Control Portal',
              actionAr: 'الدخول إلى بوابة الإدارة المركزية',
              reasonEn: 'This administrator account is currently deactivated (isActive: false).',
              reasonAr: 'تم تعطيل حساب المدير هذا في قاعدة البيانات.',
              currentUser: {
                username: firestoreProfile.username,
                name: firestoreProfile.name,
                email: firestoreProfile.email,
                role: firestoreProfile.role,
                permissions: firestoreProfile.permissions,
              },
            });
            return false;
          }
          const nextAdminUser = buildAdminUserFromFirebaseUser(fbUser, firestoreProfile);
          if (nextAdminUser && firestoreProfile) {
            setUser(nextAdminUser);
          }
          return true;
        })
        .catch(() => true);

      const syncOutcome = await Promise.race([
        firebasePortalSync,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 4000)),
      ]);
      return syncOutcome;
    }

    if (DEMO_USERS[trimmedUser]) {
      setUser(normalizeAdminUserProfile(DEMO_USERS[trimmedUser]));
      setLoading(false);
      fetchAdminActivityLogs().catch(() => {});
      return true;
    }

    // Custom role login
    const targetRole = role || 'super_admin';
    const customUser = normalizeAdminUserProfile({
      id: `u-${Date.now()}`,
      username: username.trim(),
      name:
        trimmedUser === 'admin'
          ? '3Laa Hassan'
          : trimmedUser === 'alaa'
          ? 'Alaa'
          : username.trim().charAt(0).toUpperCase() + username.trim().slice(1),
      role: targetRole,
      email: `${trimmedUser}@onalaastore.com`,
      permissions: getEffectivePermissions({ role: targetRole }),
    });
    setUser(customUser);
    setLoading(false);
    fetchAdminActivityLogs().catch(() => {});
    return true;
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    let isEffectCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const eventEpoch = authEpochRef.current;

      if (!fbUser) {
        if (!isEffectCancelled && firebaseBackedRef.current) {
          firebaseBackedRef.current = false;
          setUser(null);
          clearAdminApiToken();
        }
        if (!isEffectCancelled) {
          setLoading(false);
        }
        return;
      }

      if (logoutGuardRef.current) {
        if (!isEffectCancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const firestoreProfile = await fetchFirestoreAdminProfile(fbUser.uid).catch(() => null);
        if (isEffectCancelled || logoutGuardRef.current || authEpochRef.current !== eventEpoch) {
          return;
        }

        if (firestoreProfile?.isActive === false) {
          firebaseBackedRef.current = false;
          setUser(null);
          clearAdminApiToken();
          logoutAdminSession().catch(() => {});
          fbSignOut(auth).catch(() => {});
          emitPermissionDenied({
            source: 'ui_guard',
            requiredPermissions: ['full_admin'],
            actionEn: 'Access Central Management & Secure Control Portal',
            actionAr: 'الدخول إلى بوابة الإدارة المركزية',
            reasonEn: 'This administrator account is currently deactivated (isActive: false).',
            reasonAr: 'تم تعطيل حساب المدير هذا في قاعدة البيانات.',
            currentUser: {
              username: firestoreProfile.username,
              name: firestoreProfile.name,
              email: firestoreProfile.email,
              role: firestoreProfile.role,
              permissions: firestoreProfile.permissions,
            },
          });
          return;
        }

        const adminProfile = buildAdminUserFromFirebaseUser(fbUser, firestoreProfile);
        if (!adminProfile) {
          return;
        }

        const isSuperFirebaseEmail =
          fbUser.email?.toLowerCase() === 'optimatech.lb@gmail.com' ||
          fbUser.email?.toLowerCase() === 'alaa@onalaastore.com' ||
          fbUser.email?.toLowerCase() === 'admin@arnaoutcell.com' ||
          fbUser.email?.toLowerCase() === 'admin@onalaastore.com';

        firebaseBackedRef.current = true;
        logoutGuardRef.current = false;
        setLogoutReason(null);
        if (!parseStoredActivityTimestamp(localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY))) {
          stampActivity(Date.now());
        }
        setUser(adminProfile);
        if (isSuperFirebaseEmail || adminProfile.role === 'super_admin') {
          exchangeFirebaseIdTokenForAdminSession(() => fbUser.getIdToken()).catch(() => {});
          syncSignedInSuperAdminProfile(fbUser).catch(() => {});
        }
      } finally {
        if (!isEffectCancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      isEffectCancelled = true;
      unsubscribe();
    };
  }, [stampActivity]);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      logoutGuardRef.current = false;
      const attemptEpoch = ++authEpochRef.current;
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        if (logoutGuardRef.current || authEpochRef.current !== attemptEpoch) {
          return false;
        }
        const firestoreProfile = await fetchFirestoreAdminProfile(result.user.uid).catch(
          () => null
        );
        if (logoutGuardRef.current || authEpochRef.current !== attemptEpoch) {
          return false;
        }

        if (firestoreProfile?.isActive === false) {
          firebaseBackedRef.current = false;
          setUser(null);
          clearAdminApiToken();
          await fbSignOut(auth).catch(() => {});
          emitPermissionDenied({
            source: 'ui_guard',
            requiredPermissions: ['full_admin'],
            actionEn: 'Sign in with Google SSO',
            actionAr: 'تسجيل الدخول عبر Google SSO',
            reasonEn: 'This administrator account is currently deactivated (isActive: false).',
            reasonAr: 'تم تعطيل حساب المدير هذا في قاعدة البيانات.',
            currentUser: {
              username: firestoreProfile.username,
              name: firestoreProfile.name,
              email: firestoreProfile.email,
              role: firestoreProfile.role,
              permissions: firestoreProfile.permissions,
            },
          });
          return false;
        }

        const adminProfile = buildAdminUserFromFirebaseUser(result.user, firestoreProfile);
        if (!adminProfile) {
          return false;
        }

        const isSuperFirebaseEmail =
          result.user.email?.toLowerCase() === 'optimatech.lb@gmail.com' ||
          result.user.email?.toLowerCase() === 'alaa@onalaastore.com' ||
          result.user.email?.toLowerCase() === 'admin@arnaoutcell.com' ||
          result.user.email?.toLowerCase() === 'admin@onalaastore.com';

        firebaseBackedRef.current = true;
        logoutGuardRef.current = false;
        setLogoutReason(null);
        stampActivity(Date.now());
        setUser(adminProfile);
        setLoading(false);
        if (isSuperFirebaseEmail || adminProfile.role === 'super_admin') {
          await Promise.all([
            exchangeFirebaseIdTokenForAdminSession(() => result.user.getIdToken()).catch(() => false),
            syncSignedInSuperAdminProfile(result.user).catch(() => false),
          ]);
        }
        recordAdminActivity({
          action: 'auth_login_success',
          titleEn: 'Administrator signed in via Google SSO',
          titleAr: 'تم تسجيل دخول المدير عبر Google SSO',
          category: 'security',
          severity: 'info',
          target: `Admin Portal (${adminProfile.email || adminProfile.username})`,
          details: 'Verified Google Firebase SSO authentication completed.',
          actor: {
            name: adminProfile.name,
            username: adminProfile.username,
            role: adminProfile.role,
            email: adminProfile.email,
          },
          source: 'client',
        }).catch(() => {});
        return true;
      }
      return false;
    } catch (err) {
      console.error('Firebase Google Sign-In error:', err);
      return false;
    }
  };

  const permissions = getEffectivePermissions(user);

  const hasRole = (allowedRoles: AdminRole[]): boolean => {
    return hasAdminRole(user, allowedRoles);
  };

  const hasPermission = (required: AdminPermission | AdminPermission[]): boolean => {
    return hasAdminPermission(user, required);
  };

  const requirePermission = (
    required: AdminPermission | AdminPermission[],
    actionContext: {
      actionEn: string;
      actionAr?: string;
      requiredRoles?: AdminRole[];
      reasonEn?: string;
      reasonAr?: string;
    }
  ): boolean => {
    return guardActionWithPermission({
      user,
      required,
      ...actionContext,
    });
  };

  const reportPermissionDenied = (
    input: Omit<BuildPermissionDeniedInput, 'currentUser'>
  ): PermissionDeniedDetail => {
    return emitPermissionDenied({
      ...input,
      currentUser: user
        ? {
            username: user.username,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
          }
        : null,
    });
  };

  const handleChangePassword = async (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ) => {
    const actorMeta = user
      ? {
          name: user.name,
          username: user.username,
          role: user.role,
          email: user.email,
        }
      : undefined;
    const res = await changeAdminPassword(currentPass, newPass, confirmPass, actorMeta);
    fetchAdminActivityLogs().catch(() => {});
    return res;
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        permissions,
        login,
        loginWithGoogle,
        logout,
        hasRole,
        hasPermission,
        requirePermission,
        reportPermissionDenied,
        changePassword: handleChangePassword,
        selectableBrands: SELECTABLE_ADMIN_BRANDS,
        sessionRemainingMs,
        showTimeoutWarning,
        extendSession,
        logoutReason,
        dismissLogoutReason,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

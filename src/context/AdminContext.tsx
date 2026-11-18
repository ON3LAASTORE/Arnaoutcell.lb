import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { AdminRole, AdminUser } from '../types';
import {
  verifyAdminPassword,
  changeAdminPassword,
  initializeAdminAuth,
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
  login: (username: string, password?: string, role?: AdminRole) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: (reason?: AdminLogoutReason) => void;
  hasRole: (roles: AdminRole[]) => boolean;
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
  admin: {
    id: 'u-1',
    username: 'admin',
    name: '3Laa Hassan',
    role: 'super_admin',
    email: 'admin@arnaoutcell.com',
  },
  products: {
    id: 'u-2',
    username: 'products',
    name: 'Karim Product Specialist',
    role: 'product_manager',
    email: 'products@arnaoutcell.com',
  },
  orders: {
    id: 'u-3',
    username: 'orders',
    name: 'Lina Order Operations',
    role: 'order_manager',
    email: 'orders@arnaoutcell.com',
  },
  inventory: {
    id: 'u-4',
    username: 'inventory',
    name: 'Tarek Chouf Fulfillment Hub',
    role: 'inventory_manager',
    email: 'inventory@arnaoutcell.com',
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

    const parsedUser = JSON.parse(rawUser) as AdminUser;
    if (parsedUser.role === 'super_admin' || parsedUser.username === 'admin') {
      parsedUser.name = '3Laa Hassan';
    }

    const storedLastActivity = parseStoredActivityTimestamp(
      localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY)
    );

    if (storedLastActivity !== null) {
      const state = computeSessionTimerState({ lastActivityAt: storedLastActivity, now });
      if (state.isExpired) {
        localStorage.removeItem('arnaout_admin_user');
        localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
        sessionStorage.removeItem('arnaout_admin_session_token');
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

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Ensure security credentials system is initialized and log stale boot expiration if any
  useEffect(() => {
    initializeAdminAuth().catch(console.error);

    if (initialSnapshot.expiredUser) {
      const stale = initialSnapshot.expiredUser;
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
    setShowTimeoutWarning(false);
    setSessionRemainingMs(0);
    setLogoutReason(reason === 'inactivity' ? 'inactivity' : null);
    fbSignOut(auth).catch(() => {});
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('arnaout_admin_user');
        localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
        sessionStorage.removeItem('arnaout_admin_session_token');
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
    const trimmedUser = username.toLowerCase().trim();
    if (!trimmedUser) return false;

    // Always require and verify administrator password securely via backend bcrypt endpoint
    if (!password) {
      return false;
    }
    const isValid = await verifyAdminPassword(password, {
      username: trimmedUser,
      role: role || DEMO_USERS[trimmedUser]?.role || 'super_admin',
    });
    if (!isValid) {
      fetchAdminActivityLogs().catch(() => {});
      return false;
    }

    logoutGuardRef.current = false;
    setLogoutReason(null);
    stampActivity(Date.now());

    if (DEMO_USERS[trimmedUser]) {
      setUser(DEMO_USERS[trimmedUser]);
      fetchAdminActivityLogs().catch(() => {});
      return true;
    }

    // Custom role login
    if (role && trimmedUser.length >= 3) {
      const isSuper = role === 'super_admin' || trimmedUser === 'admin';
      const newUser: AdminUser = {
        id: `u-${Date.now()}`,
        username: trimmedUser,
        name: isSuper ? '3Laa Hassan' : trimmedUser.charAt(0).toUpperCase() + trimmedUser.slice(1),
        role,
        email: `${trimmedUser}@arnaoutcell.com`,
      };
      setUser(newUser);
      fetchAdminActivityLogs().catch(() => {});
      return true;
    }

    // Default to super_admin if authorized
    const isSuper = (role || 'super_admin') === 'super_admin' || trimmedUser === 'admin';
    setUser({
      id: `u-${Date.now()}`,
      username: trimmedUser,
      name: isSuper ? '3Laa Hassan' : trimmedUser.charAt(0).toUpperCase() + trimmedUser.slice(1),
      role: role || 'super_admin',
      email: `${trimmedUser}@arnaoutcell.com`,
    });
    fetchAdminActivityLogs().catch(() => {});
    return true;
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && !logoutGuardRef.current) {
        const isAdminEmail = fbUser.email === 'optimatech.lb@gmail.com';
        const adminProfile: AdminUser = {
          id: fbUser.uid,
          username: fbUser.email?.split('@')[0] || 'admin',
          name: fbUser.displayName || (isAdminEmail ? '3Laa Hassan' : 'Authorized Admin'),
          role: isAdminEmail ? 'super_admin' : 'product_manager',
          email: fbUser.email || 'optimatech.lb@gmail.com',
        };
        logoutGuardRef.current = false;
        setLogoutReason(null);
        if (!parseStoredActivityTimestamp(localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY))) {
          stampActivity(Date.now());
        }
        setUser(adminProfile);
      }
    });
    return () => unsubscribe();
  }, [stampActivity]);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      logoutGuardRef.current = false;
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const isAdminEmail = result.user.email === 'optimatech.lb@gmail.com';
        const adminProfile: AdminUser = {
          id: result.user.uid,
          username: result.user.email?.split('@')[0] || 'admin',
          name: result.user.displayName || (isAdminEmail ? '3Laa Hassan' : 'Authorized Admin'),
          role: isAdminEmail ? 'super_admin' : 'product_manager',
          email: result.user.email || 'optimatech.lb@gmail.com',
        };
        logoutGuardRef.current = false;
        setLogoutReason(null);
        stampActivity(Date.now());
        setUser(adminProfile);
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

  const hasRole = (allowedRoles: AdminRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return allowedRoles.includes(user.role);
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
        login,
        loginWithGoogle,
        logout,
        hasRole,
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

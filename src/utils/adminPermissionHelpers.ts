import { AdminPermission, AdminRole, AdminUser } from '../types';

export const ALL_STOCK_PERMISSIONS: readonly AdminPermission[] = [
  'full_stock',
  'manage_inventory',
  'manage_products',
  'manage_categories',
];

export const SUPER_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  'full_stock',
  'full_admin',
  'manage_products',
  'manage_orders',
  'manage_inventory',
  'manage_categories',
  'manage_content',
  'manage_customers',
  'manage_settings',
  'view_analytics',
  'view_audit_logs',
];

const STOCK_COVERED_BY_FULL_STOCK = new Set<AdminPermission>([
  'full_stock',
  'manage_inventory',
  'manage_products',
  'manage_categories',
]);

const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  product_manager: ['manage_products', 'manage_categories', 'manage_content', 'view_analytics'],
  order_manager: ['manage_orders', 'manage_customers', 'view_analytics'],
  inventory_manager: ['manage_inventory'],
};

const PORTAL_USER_DIRECTORY: Record<string, AdminUser> = {
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
    permissions: [...ROLE_DEFAULT_PERMISSIONS.product_manager],
  },
  orders: {
    id: 'u-3',
    username: 'orders',
    name: 'Lina Order Operations',
    role: 'order_manager',
    email: 'orders@arnaoutcell.com',
    permissions: [...ROLE_DEFAULT_PERMISSIONS.order_manager],
  },
  inventory: {
    id: 'u-4',
    username: 'inventory',
    name: 'Tarek Chouf Fulfillment Hub',
    role: 'inventory_manager',
    email: 'inventory@arnaoutcell.com',
    permissions: [...ROLE_DEFAULT_PERMISSIONS.inventory_manager],
  },
};

export function normalizePortalUsername(username: string): string {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

export function resolvePortalDirectoryUser(username: string): AdminUser | null {
  const normalized = normalizePortalUsername(username);
  if (!normalized) return null;
  const entry = PORTAL_USER_DIRECTORY[normalized];
  if (!entry) return null;
  return {
    ...entry,
    permissions: entry.permissions ? [...entry.permissions] : undefined,
  };
}

export function resolvePortalUserEmailFromUsername(usernameOrEmail: string): string | null {
  const trimmed = typeof usernameOrEmail === 'string' ? usernameOrEmail.trim() : '';
  if (!trimmed) return null;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const normalized = normalizePortalUsername(trimmed);
  const directoryEntry = PORTAL_USER_DIRECTORY[normalized];
  if (directoryEntry) {
    return directoryEntry.email.toLowerCase();
  }

  return `${normalized}@onalaastore.com`;
}

export function resolveDefaultPermissionsForRole(role: AdminRole): AdminPermission[] {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return [...defaults];
}

export function getEffectivePermissions(
  user: Pick<AdminUser, 'role' | 'permissions'> | null | undefined
): AdminPermission[] {
  if (!user) return [];
  const merged = new Set<AdminPermission>();
  for (const perm of resolveDefaultPermissionsForRole(user.role)) {
    merged.add(perm);
  }
  if (Array.isArray(user.permissions)) {
    for (const perm of user.permissions) {
      merged.add(perm);
    }
  }
  if (user.role === 'super_admin' || merged.has('full_admin')) {
    for (const perm of SUPER_ADMIN_PERMISSIONS) {
      merged.add(perm);
    }
  }
  if (merged.has('full_stock')) {
    for (const perm of ALL_STOCK_PERMISSIONS) {
      merged.add(perm);
    }
  }
  return Array.from(merged);
}

export function normalizeAdminUserProfile(user: AdminUser): AdminUser {
  const normalizedUsername = normalizePortalUsername(user.username);
  const directoryMatch = PORTAL_USER_DIRECTORY[normalizedUsername];

  const canonicalName =
    directoryMatch && normalizedUsername === 'alaa'
      ? 'Alaa'
      : directoryMatch && normalizedUsername === 'admin'
      ? '3Laa Hassan'
      : user.name?.trim() || (user.username === 'Alaa' ? 'Alaa' : user.username);

  const canonicalUsername = directoryMatch ? directoryMatch.username : user.username;
  const effectivePermissions = getEffectivePermissions({
    role: user.role,
    permissions: user.permissions ?? directoryMatch?.permissions,
  });

  return {
    ...user,
    username: canonicalUsername,
    name: canonicalName,
    permissions: effectivePermissions,
  };
}

export function hasAdminRole(
  user: Pick<AdminUser, 'role' | 'permissions'> | null | undefined,
  allowedRoles: AdminRole[]
): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (Array.isArray(user.permissions) && user.permissions.includes('full_admin')) {
    return true;
  }
  return allowedRoles.includes(user.role);
}

export function hasAdminPermission(
  user: Pick<AdminUser, 'role' | 'permissions'> | null | undefined,
  required: AdminPermission | AdminPermission[]
): boolean {
  if (!user) return false;
  const effective = getEffectivePermissions(user);
  if (user.role === 'super_admin' || effective.includes('full_admin')) {
    return true;
  }

  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((perm) => {
    if (effective.includes(perm)) return true;
    if (effective.includes('full_stock') && STOCK_COVERED_BY_FULL_STOCK.has(perm)) {
      return true;
    }
    return false;
  });
}

export function formatAdminPermissionLabel(
  permission: AdminPermission,
  lang: 'en' | 'ar' = 'en'
): string {
  const labels: Record<AdminPermission, { en: string; ar: string }> = {
    full_stock: { en: 'Full Stock', ar: 'صلاحية المخزون الكاملة' },
    full_admin: { en: 'Full Portal Access', ar: 'صلاحية الإدارة الكاملة' },
    manage_products: { en: 'Products & Catalog', ar: 'إدارة المنتجات والكتالوج' },
    manage_orders: { en: 'Orders & Sales', ar: 'إدارة الطلبات والمبيعات' },
    manage_inventory: { en: 'Inventory & Restock', ar: 'المخزون والتزويد' },
    manage_categories: { en: 'Categories & Brands', ar: 'الأقسام والماركات' },
    manage_content: { en: 'Banners & Videos', ar: 'البانرات والفيديوهات' },
    manage_customers: { en: 'Customers', ar: 'إدارة العملاء' },
    manage_settings: { en: 'Settings & Security', ar: 'الإعدادات والأمان' },
    view_analytics: { en: 'Analytics & Reports', ar: 'التحليلات والتقارير' },
    view_audit_logs: { en: 'Security Audit Log', ar: 'سجل النشاط الأمني' },
  };
  return labels[permission]?.[lang] || permission;
}

/**
 * Mirrors the exact Firestore Security Rules invariant (`isSuperAdminWithFullStock()`):
 * only active `super_admin` profiles explicitly holding `full_stock` permission
 * may write or delete inventory documents.
 */
export function hasSuperAdminFullStockProfile(
  profile:
    | {
        role?: string | null;
        permissions?: readonly string[] | null;
        isActive?: boolean | null;
      }
    | null
    | undefined
): boolean {
  if (!profile) return false;
  if (profile.isActive === false) return false;
  if (profile.role !== 'super_admin') return false;
  return Array.isArray(profile.permissions) && profile.permissions.includes('full_stock');
}

export function buildAlaaFirestoreUserPayload(
  uid: string,
  options?: {
    docId?: string;
    createdAt?: string;
    nowIso?: string;
  }
) {
  const nowIso = options?.nowIso || new Date().toISOString();
  const docId = options?.docId || uid;
  return {
    id: docId,
    uid,
    username: 'Alaa',
    name: 'Alaa',
    email: 'alaa@onalaastore.com',
    role: 'super_admin' as const,
    permissions: [...SUPER_ADMIN_PERMISSIONS],
    isActive: true,
    createdAt: options?.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

import { AdminPermission, AdminRole, AdminUser } from '../types';
import { formatAdminPermissionLabel, hasAdminPermission } from './adminPermissionHelpers';

export type PermissionDeniedSource = 'ui_guard' | 'firestore';

export interface PermissionDeniedUserSummary {
  username?: string;
  name?: string;
  email?: string;
  role?: AdminRole | string;
  permissions?: AdminPermission[];
}

export interface PermissionDeniedDetail {
  id: string;
  source: PermissionDeniedSource;
  requiredPermissions: AdminPermission[];
  requiredRoles?: AdminRole[];
  actionEn: string;
  actionAr: string;
  reasonEn: string;
  reasonAr: string;
  resourcePath?: string | null;
  operationType?: string;
  currentUser?: PermissionDeniedUserSummary | null;
  timestamp: number;
}

export interface BuildPermissionDeniedInput {
  source?: PermissionDeniedSource;
  requiredPermissions: AdminPermission | AdminPermission[];
  requiredRoles?: AdminRole[];
  actionEn: string;
  actionAr?: string;
  reasonEn?: string;
  reasonAr?: string;
  resourcePath?: string | null;
  operationType?: string;
  currentUser?: PermissionDeniedUserSummary | null;
  timestamp?: number;
}

let activePermissionDenied: PermissionDeniedDetail | null = null;
const listeners = new Set<(detail: PermissionDeniedDetail | null) => void>();
let eventCounter = 0;

export function formatAdminRoleLabel(
  role: string | undefined | null,
  lang: 'en' | 'ar' = 'en'
): string {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  const map: Record<string, { en: string; ar: string }> = {
    super_admin: { en: 'Super Admin', ar: 'مدير عام (Super Admin)' },
    product_manager: { en: 'Product Manager', ar: 'مدير المنتجات' },
    order_manager: { en: 'Order Manager', ar: 'مدير الطلبات' },
    inventory_manager: { en: 'Inventory Manager', ar: 'مدير المخزون' },
    customer: { en: 'Customer', ar: 'عميل' },
    guest: { en: 'Guest / Unauthenticated', ar: 'زائر / غير مسجل' },
  };
  if (!normalized) {
    return map.guest[lang];
  }
  return map[normalized]?.[lang] || normalized.replace(/_/g, ' ');
}

export function buildPermissionDeniedDetail(
  input: BuildPermissionDeniedInput
): PermissionDeniedDetail {
  const requiredList = Array.isArray(input.requiredPermissions)
    ? Array.from(new Set(input.requiredPermissions))
    : [input.requiredPermissions];
  const permissionsToShow: AdminPermission[] =
    requiredList.length > 0 ? requiredList : ['full_stock'];

  const labelsEn = permissionsToShow
    .map((perm) => `${formatAdminPermissionLabel(perm, 'en')} (${perm})`)
    .join(', ');
  const labelsAr = permissionsToShow
    .map((perm) => `${formatAdminPermissionLabel(perm, 'ar')} (${perm})`)
    .join('، ');

  const defaultReasonEn = permissionsToShow.includes('full_stock')
    ? `This restricted operation requires the "${labelsEn}" permission${
        input.requiredRoles?.includes('super_admin') ? ' with Super Admin authorization' : ''
      }. Your active account does not have Full Stock clearance.`
    : `This restricted operation requires the "${labelsEn}" permission. Your active account does not hold the required authorization.`;

  const defaultReasonAr = permissionsToShow.includes('full_stock')
    ? `يتطلب هذا الإجراء المقيد صلاحية "${labelsAr}"${
        input.requiredRoles?.includes('super_admin') ? ' مع تفويض المدير العام (Super Admin)' : ''
      }. حسابك الحالي لا يملك صلاحية المخزون الكاملة.`
    : `يتطلب هذا الإجراء المقيد صلاحية "${labelsAr}". حسابك الحالي لا يملك التفويض المطلوب.`;

  eventCounter += 1;
  const ts = typeof input.timestamp === 'number' ? input.timestamp : Date.now();

  return {
    id: `perm-denied-${ts}-${eventCounter}`,
    source: input.source || 'ui_guard',
    requiredPermissions: permissionsToShow,
    requiredRoles: input.requiredRoles ? [...input.requiredRoles] : undefined,
    actionEn: input.actionEn,
    actionAr: input.actionAr || input.actionEn,
    reasonEn: input.reasonEn || defaultReasonEn,
    reasonAr: input.reasonAr || defaultReasonAr,
    resourcePath: input.resourcePath ?? null,
    operationType: input.operationType,
    currentUser: input.currentUser ?? null,
    timestamp: ts,
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener(activePermissionDenied);
    } catch {
      // Ignore individual subscriber render errors
    }
  });
}

export function subscribePermissionDenied(
  listener: (detail: PermissionDeniedDetail | null) => void
): () => void {
  listeners.add(listener);
  listener(activePermissionDenied);
  return () => {
    listeners.delete(listener);
  };
}

export function getLastPermissionDenied(): PermissionDeniedDetail | null {
  return activePermissionDenied;
}

export function emitPermissionDenied(
  input: BuildPermissionDeniedInput
): PermissionDeniedDetail {
  const detail = buildPermissionDeniedDetail(input);
  activePermissionDenied = detail;
  notifyListeners();
  return detail;
}

export function clearPermissionDenied(): void {
  if (!activePermissionDenied) return;
  activePermissionDenied = null;
  notifyListeners();
}

export function isFirestorePermissionDeniedError(error: unknown): boolean {
  if (!error) return false;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : '';
  if (code === 'permission-denied' || code === 'permission_denied') {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
      ? error.toLowerCase()
      : '';

  return (
    message.includes('missing or insufficient permissions') ||
    message.includes('permission-denied') ||
    message.includes('permission_denied') ||
    message.includes('insufficient permissions')
  );
}

export function inferPermissionDeniedFromFirestoreError(
  error: unknown,
  operationType: string,
  path: string | null,
  currentUser?: PermissionDeniedUserSummary | null
): BuildPermissionDeniedInput {
  const normalizedPath = typeof path === 'string' ? path.trim().toLowerCase() : '';
  const normalizedOp = typeof operationType === 'string' ? operationType.toLowerCase() : 'write';
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Permission denied by Firestore security rules.';

  if (normalizedPath.startsWith('inventory')) {
    const isDelete = normalizedOp === 'delete';
    return {
      source: 'firestore',
      requiredPermissions: ['full_stock'],
      requiredRoles: ['super_admin'],
      actionEn: isDelete ? 'Delete inventory document' : 'Modify warehouse inventory document',
      actionAr: isDelete ? 'حذف سجل من المخزون' : 'تعديل سجل في المخزون',
      resourcePath: path,
      operationType,
      currentUser,
      reasonEn:
        'Firestore security rules rejected this inventory operation because only a Super Admin with "full_stock" permission may modify or delete inventory records.',
      reasonAr:
        'رفضت قواعد أمان Firestore عملية المخزون لأن التعديل أو الحذف مسموح فقط للمدير العام بصلاحية المخزون الكاملة (full_stock).',
    };
  }

  if (normalizedPath.startsWith('products')) {
    const isDelete = normalizedOp === 'delete';
    return {
      source: 'firestore',
      requiredPermissions: ['full_stock'],
      requiredRoles: ['super_admin'],
      actionEn: isDelete ? 'Delete catalog & stock product' : 'Modify catalog & stock product',
      actionAr: isDelete ? 'حذف منتج من الكتالوج والمخزون' : 'تعديل منتج في الكتالوج والمخزون',
      resourcePath: path,
      operationType,
      currentUser,
      reasonEn:
        'Firestore security rules rejected this catalog/stock write because only a Super Admin with "full_stock" permission may create, modify, or delete products.',
      reasonAr:
        'رفضت قواعد أمان Firestore هذا التعديل لأن إنشاء أو تعديل أو حذف المنتجات يتطلب مدير عام بصلاحية المخزون الكاملة (full_stock).',
    };
  }

  if (normalizedPath.startsWith('categories')) {
    return {
      source: 'firestore',
      requiredPermissions: ['manage_categories', 'full_stock'],
      actionEn: 'Modify catalog categories',
      actionAr: 'تعديل أقسام المتجر',
      resourcePath: path,
      operationType,
      currentUser,
    };
  }

  if (normalizedPath.startsWith('orders')) {
    return {
      source: 'firestore',
      requiredPermissions: ['manage_orders'],
      actionEn: 'Manage customer orders',
      actionAr: 'إدارة طلبات العملاء',
      resourcePath: path,
      operationType,
      currentUser,
    };
  }

  if (normalizedPath.startsWith('users') || normalizedPath.startsWith('admins')) {
    return {
      source: 'firestore',
      requiredPermissions: ['full_admin', 'manage_settings'],
      requiredRoles: ['super_admin'],
      actionEn: 'Modify user roles & security profiles',
      actionAr: 'تعديل صلاحيات وملفات المستخدمين',
      resourcePath: path,
      operationType,
      currentUser,
    };
  }

  return {
    source: 'firestore',
    requiredPermissions: ['full_stock'],
    requiredRoles: ['super_admin'],
    actionEn: `Execute Firestore ${normalizedOp}${path ? ` on ${path}` : ''}`,
    actionAr: `تنفيذ عملية قاعدة البيانات (${normalizedOp})`,
    resourcePath: path,
    operationType,
    currentUser,
    reasonEn: rawMessage.includes('Missing or insufficient permissions')
      ? 'Firestore blocked this request due to missing or insufficient account permissions.'
      : rawMessage,
  };
}

export function guardActionWithPermission(options: {
  user: Pick<AdminUser, 'username' | 'name' | 'role' | 'permissions'> | null | undefined;
  required: AdminPermission | AdminPermission[];
  actionEn: string;
  actionAr?: string;
  requiredRoles?: AdminRole[];
  reasonEn?: string;
  reasonAr?: string;
  emit?: boolean;
}): boolean {
  const { user, required, actionEn, actionAr, requiredRoles, reasonEn, reasonAr, emit = true } =
    options;

  if (hasAdminPermission(user, required)) {
    return true;
  }

  if (emit) {
    emitPermissionDenied({
      source: 'ui_guard',
      requiredPermissions: required,
      requiredRoles,
      actionEn,
      actionAr,
      reasonEn,
      reasonAr,
      currentUser: user
        ? {
            username: user.username,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
          }
        : null,
    });
  }

  return false;
}

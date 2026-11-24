import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPermissionDeniedDetail,
  clearPermissionDenied,
  emitPermissionDenied,
  formatAdminRoleLabel,
  getLastPermissionDenied,
  guardActionWithPermission,
  inferPermissionDeniedFromFirestoreError,
  isFirestorePermissionDeniedError,
  PermissionDeniedDetail,
  subscribePermissionDenied,
} from './permissionDeniedHelpers';
import { resolvePortalDirectoryUser } from './adminPermissionHelpers';

test('guardActionWithPermission blocks inventory_manager without full_stock and emits Permission Denied event', () => {
  clearPermissionDenied();
  const observed: Array<PermissionDeniedDetail | null> = [];
  const unsubscribe = subscribePermissionDenied((detail) => observed.push(detail));

  const inventoryUser = resolvePortalDirectoryUser('inventory')!;
  const allowed = guardActionWithPermission({
    user: inventoryUser,
    required: 'full_stock',
    requiredRoles: ['super_admin'],
    actionEn: 'Delete inventory item "iPhone 16 Pro Max"',
    actionAr: 'حذف صنف المخزون "iPhone 16 Pro Max"',
  });

  assert.equal(allowed, false);
  const last = getLastPermissionDenied();
  assert.ok(last);
  assert.equal(last.source, 'ui_guard');
  assert.deepEqual(last.requiredPermissions, ['full_stock']);
  assert.deepEqual(last.requiredRoles, ['super_admin']);
  assert.equal(last.currentUser?.username, 'inventory');
  assert.equal(last.currentUser?.role, 'inventory_manager');
  assert.match(last.reasonEn, /Full Stock \(full_stock\)/);
  assert.match(last.reasonAr, /full_stock/);
  assert.ok(observed.some((item) => item?.id === last.id));

  clearPermissionDenied();
  assert.equal(getLastPermissionDenied(), null);
  unsubscribe();
});

test('guardActionWithPermission blocks product_manager from full_stock deletions', () => {
  clearPermissionDenied();
  const productManager = resolvePortalDirectoryUser('products')!;

  const canEditCatalog = guardActionWithPermission({
    user: productManager,
    required: ['full_stock', 'manage_products'],
    actionEn: 'Edit product listing',
  });
  assert.equal(canEditCatalog, true);
  assert.equal(getLastPermissionDenied(), null);

  const canDeleteInventory = guardActionWithPermission({
    user: productManager,
    required: 'full_stock',
    requiredRoles: ['super_admin'],
    actionEn: 'Delete product from catalog & inventory',
  });
  assert.equal(canDeleteInventory, false);
  const denied = getLastPermissionDenied();
  assert.ok(denied);
  assert.deepEqual(denied.requiredPermissions, ['full_stock']);
  assert.equal(denied.currentUser?.username, 'products');
  clearPermissionDenied();
});

test('guardActionWithPermission allows Alaa (Super Admin + Full Stock) without emitting denied event', () => {
  clearPermissionDenied();
  const alaa = resolvePortalDirectoryUser('Alaa')!;

  const allowed = guardActionWithPermission({
    user: alaa,
    required: 'full_stock',
    requiredRoles: ['super_admin'],
    actionEn: 'Delete inventory item',
  });

  assert.equal(allowed, true);
  assert.equal(getLastPermissionDenied(), null);
});

test('guardActionWithPermission blocks unauthenticated users cleanly', () => {
  clearPermissionDenied();
  const allowed = guardActionWithPermission({
    user: null,
    required: 'full_stock',
    actionEn: 'Delete inventory item',
  });

  assert.equal(allowed, false);
  const denied = getLastPermissionDenied();
  assert.ok(denied);
  assert.equal(denied.currentUser, null);
  clearPermissionDenied();
});

test('isFirestorePermissionDeniedError accurately detects Firebase permission-denied errors', () => {
  assert.equal(
    isFirestorePermissionDeniedError({ code: 'permission-denied', message: 'Denied' }),
    true
  );
  assert.equal(
    isFirestorePermissionDeniedError(
      new Error('FirebaseError: Missing or insufficient permissions.')
    ),
    true
  );
  assert.equal(
    isFirestorePermissionDeniedError({ code: 'resource-exhausted', message: 'Quota exceeded' }),
    false
  );
  assert.equal(isFirestorePermissionDeniedError(null), false);
});

test('inferPermissionDeniedFromFirestoreError maps inventory and products writes/deletes to full_stock', () => {
  const inventoryDeleteInput = inferPermissionDeniedFromFirestoreError(
    { code: 'permission-denied', message: 'Missing or insufficient permissions.' },
    'delete',
    'inventory/prod-123'
  );
  const detail = buildPermissionDeniedDetail(inventoryDeleteInput);

  assert.equal(detail.source, 'firestore');
  assert.deepEqual(detail.requiredPermissions, ['full_stock']);
  assert.deepEqual(detail.requiredRoles, ['super_admin']);
  assert.equal(detail.resourcePath, 'inventory/prod-123');
  assert.match(detail.actionEn, /Delete inventory/i);
  assert.match(detail.reasonEn, /full_stock/i);

  const productWriteInput = inferPermissionDeniedFromFirestoreError(
    new Error('Missing or insufficient permissions'),
    'write',
    'products/prod-456'
  );
  assert.deepEqual(productWriteInput.requiredPermissions, ['full_stock']);
});

test('emitPermissionDenied notifies active subscribers and clearPermissionDenied resets state', () => {
  clearPermissionDenied();
  const received: Array<PermissionDeniedDetail | null> = [];
  const unsubscribe = subscribePermissionDenied((d) => received.push(d));

  const emitted = emitPermissionDenied({
    requiredPermissions: 'manage_settings',
    actionEn: 'Update Store Settings',
    actionAr: 'تحديث إعدادات المتجر',
  });

  assert.equal(received[received.length - 1]?.id, emitted.id);
  clearPermissionDenied();
  assert.equal(received[received.length - 1], null);
  unsubscribe();
});

test('formatAdminRoleLabel renders English and Arabic labels cleanly', () => {
  assert.equal(formatAdminRoleLabel('super_admin', 'en'), 'Super Admin');
  assert.equal(formatAdminRoleLabel('inventory_manager', 'en'), 'Inventory Manager');
  assert.equal(formatAdminRoleLabel(null, 'en'), 'Guest / Unauthenticated');
  assert.match(formatAdminRoleLabel('super_admin', 'ar'), /مدير عام/);
});

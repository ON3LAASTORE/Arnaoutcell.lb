import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_STOCK_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  buildAlaaFirestoreUserPayload,
  formatAdminPermissionLabel,
  getEffectivePermissions,
  hasAdminPermission,
  hasAdminRole,
  hasSuperAdminFullStockProfile,
  normalizeAdminUserProfile,
  normalizePortalUsername,
  resolveDefaultPermissionsForRole,
  resolvePortalDirectoryUser,
  resolvePortalUserEmailFromUsername,
} from './adminPermissionHelpers';

test('resolvePortalDirectoryUser recognizes Alaa (case-insensitive) as Super Admin with full_stock', () => {
  const exact = resolvePortalDirectoryUser('Alaa');
  const lower = resolvePortalDirectoryUser('alaa');
  const padded = resolvePortalDirectoryUser('  ALAA  ');

  assert.ok(exact);
  assert.ok(lower);
  assert.ok(padded);

  assert.equal(exact.username, 'Alaa');
  assert.equal(exact.name, 'Alaa');
  assert.equal(exact.role, 'super_admin');
  assert.equal(exact.email, 'alaa@onalaastore.com');
  assert.equal(exact.permissions?.includes('full_stock'), true);
  assert.equal(exact.permissions?.includes('full_admin'), true);
  assert.deepEqual(lower, exact);
  assert.deepEqual(padded, exact);
});

test('resolvePortalUserEmailFromUsername maps usernames and emails cleanly', () => {
  assert.equal(normalizePortalUsername('  Alaa '), 'alaa');
  assert.equal(resolvePortalUserEmailFromUsername('Alaa'), 'alaa@onalaastore.com');
  assert.equal(resolvePortalUserEmailFromUsername('admin'), 'admin@arnaoutcell.com');
  assert.equal(
    resolvePortalUserEmailFromUsername('OptimaTech.LB@gmail.com'),
    'optimatech.lb@gmail.com'
  );
  assert.equal(resolvePortalUserEmailFromUsername('custom.staff'), 'custom.staff@onalaastore.com');
  assert.equal(resolvePortalUserEmailFromUsername(''), null);
});

test('full_stock grants full inventory, product, and category access even without super_admin role', () => {
  const stockSupervisor = {
    role: 'inventory_manager' as const,
    permissions: ['full_stock' as const],
  };

  for (const stockPerm of ALL_STOCK_PERMISSIONS) {
    assert.equal(hasAdminPermission(stockSupervisor, stockPerm), true);
  }
  assert.equal(hasAdminPermission(stockSupervisor, 'manage_settings'), false);
  assert.equal(hasAdminRole(stockSupervisor, ['inventory_manager']), true);
  assert.equal(hasAdminRole(stockSupervisor, ['super_admin']), false);
});

test('super_admin (including Alaa) receives all administrative and Full Stock permissions', () => {
  const alaa = resolvePortalDirectoryUser('Alaa')!;
  const effective = getEffectivePermissions(alaa);

  for (const perm of SUPER_ADMIN_PERMISSIONS) {
    assert.equal(effective.includes(perm), true);
    assert.equal(hasAdminPermission(alaa, perm), true);
  }
  assert.equal(hasAdminRole(alaa, ['order_manager']), true);
  assert.equal(hasAdminRole(alaa, ['super_admin']), true);
});

test('normalizeAdminUserProfile preserves Alaa display name instead of overwriting with 3Laa Hassan', () => {
  const normalizedAlaa = normalizeAdminUserProfile({
    id: 'admin-alaa',
    username: 'alaa',
    name: 'Alaa',
    role: 'super_admin',
    email: 'alaa@onalaastore.com',
  });
  assert.equal(normalizedAlaa.username, 'Alaa');
  assert.equal(normalizedAlaa.name, 'Alaa');
  assert.equal(normalizedAlaa.permissions?.includes('full_stock'), true);

  const normalizedLegacy = normalizeAdminUserProfile({
    id: 'u-1',
    username: 'admin',
    name: 'admin',
    role: 'super_admin',
    email: 'admin@arnaoutcell.com',
  });
  assert.equal(normalizedLegacy.name, '3Laa Hassan');
});

test('role default permissions and bilingual labels remain intact for non-super roles', () => {
  const orderPerms = resolveDefaultPermissionsForRole('order_manager');
  assert.equal(orderPerms.includes('manage_orders'), true);
  assert.equal(orderPerms.includes('manage_settings'), false);
  assert.equal(formatAdminPermissionLabel('full_stock', 'en'), 'Full Stock');
  assert.equal(formatAdminPermissionLabel('full_stock', 'ar'), 'صلاحية المخزون الكاملة');
  assert.equal(hasAdminPermission(null, 'full_stock'), false);
});

test('hasSuperAdminFullStockProfile enforces both role == super_admin and full_stock permission', () => {
  const alaaPayload = buildAlaaFirestoreUserPayload('uid-alaa-1', {
    nowIso: '2026-11-24T05:00:00.000Z',
  });
  assert.equal(alaaPayload.username, 'Alaa');
  assert.equal(alaaPayload.role, 'super_admin');
  assert.equal(alaaPayload.permissions.includes('full_stock'), true);
  assert.equal(hasSuperAdminFullStockProfile(alaaPayload), true);

  assert.equal(
    hasSuperAdminFullStockProfile({ role: 'inventory_manager', permissions: ['full_stock'] }),
    false
  );
  assert.equal(
    hasSuperAdminFullStockProfile({ role: 'super_admin', permissions: ['manage_products'] }),
    false
  );
  assert.equal(
    hasSuperAdminFullStockProfile({ role: 'customer', permissions: [] }),
    false
  );
  assert.equal(
    hasSuperAdminFullStockProfile({ ...alaaPayload, isActive: false }),
    false
  );
  assert.equal(hasSuperAdminFullStockProfile(null), false);
});

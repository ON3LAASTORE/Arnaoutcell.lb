import test from 'node:test';
import assert from 'node:assert/strict';
import type { User as FirebaseUser } from 'firebase/auth';
import { buildAdminUserFromFirebaseUser } from './adminProfileService';
import type { FirestoreAdminProfile } from '../types';

function makeMockFirebaseUser(overrides: Partial<FirebaseUser> = {}): FirebaseUser {
  return {
    uid: 'uid-test-1',
    email: 'alaa@onalaastore.com',
    displayName: 'Alaa',
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    metadata: {} as FirebaseUser['metadata'],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'token',
    getIdTokenResult: async () => ({}) as Awaited<ReturnType<FirebaseUser['getIdTokenResult']>>,
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
    ...overrides,
  } as FirebaseUser;
}

test('buildAdminUserFromFirebaseUser rejects disabled Firestore profiles even for Alaa or primary owner', () => {
  const disabledAlaa: FirestoreAdminProfile = {
    id: 'uid-alaa',
    uid: 'uid-alaa',
    username: 'Alaa',
    name: 'Alaa',
    email: 'alaa@onalaastore.com',
    role: 'super_admin',
    permissions: ['full_stock', 'full_admin'],
    isActive: false,
  };

  const disabledOwner: FirestoreAdminProfile = {
    id: 'uid-owner',
    uid: 'uid-owner',
    username: 'admin',
    name: '3Laa Hassan',
    email: 'optimatech.lb@gmail.com',
    role: 'super_admin',
    permissions: ['full_stock', 'full_admin'],
    isActive: false,
  };

  assert.equal(
    buildAdminUserFromFirebaseUser(makeMockFirebaseUser({ uid: 'uid-alaa', email: 'alaa@onalaastore.com' }), disabledAlaa),
    null
  );
  assert.equal(
    buildAdminUserFromFirebaseUser(makeMockFirebaseUser({ uid: 'uid-owner', email: 'optimatech.lb@gmail.com' }), disabledOwner),
    null
  );
});

test('buildAdminUserFromFirebaseUser resolves Alaa as super_admin with full_stock when active or unprofiled', () => {
  const fbAlaa = makeMockFirebaseUser({ uid: 'uid-alaa-live', email: 'alaa@onalaastore.com', displayName: 'Alaa' });
  const resolvedWithoutDoc = buildAdminUserFromFirebaseUser(fbAlaa, null);
  assert.ok(resolvedWithoutDoc);
  assert.equal(resolvedWithoutDoc.role, 'super_admin');
  assert.equal(resolvedWithoutDoc.username, 'Alaa');
  assert.equal(resolvedWithoutDoc.permissions?.includes('full_stock'), true);

  const activeDoc: FirestoreAdminProfile = {
    id: 'uid-alaa-live',
    uid: 'uid-alaa-live',
    username: 'Alaa',
    name: 'Alaa',
    email: 'alaa@onalaastore.com',
    role: 'super_admin',
    permissions: ['full_stock'],
    isActive: true,
  };
  const resolvedWithDoc = buildAdminUserFromFirebaseUser(fbAlaa, activeDoc);
  assert.ok(resolvedWithDoc);
  assert.equal(resolvedWithDoc.role, 'super_admin');
  assert.equal(resolvedWithDoc.permissions?.includes('full_stock'), true);
  assert.equal(resolvedWithDoc.permissions?.includes('manage_settings'), true);

  const fbAdmin = makeMockFirebaseUser({
    uid: 'uid-admin-live',
    email: 'admin@arnaoutcell.com',
    displayName: '3Laa Hassan',
  });
  const resolvedAdminWithoutDoc = buildAdminUserFromFirebaseUser(fbAdmin, null);
  assert.ok(resolvedAdminWithoutDoc);
  assert.equal(resolvedAdminWithoutDoc.username, 'admin');
  assert.equal(resolvedAdminWithoutDoc.role, 'super_admin');
  assert.equal(resolvedAdminWithoutDoc.permissions?.includes('full_stock'), true);
  assert.equal(resolvedAdminWithoutDoc.permissions?.includes('full_admin'), true);
});


import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AdminRole, AdminUser, FirestoreAdminProfile, FirestoreUserProfile } from '../types';
import {
  buildAlaaFirestoreUserPayload,
  getEffectivePermissions,
  normalizeAdminUserProfile,
  resolvePortalDirectoryUser,
  resolvePortalUserEmailFromUsername,
  SUPER_ADMIN_PERMISSIONS,
} from '../utils/adminPermissionHelpers';
import {
  isFirestoreInQuotaCooldown,
  isFirestoreQuotaExceededError,
  markFirestoreQuotaExceeded,
} from '../utils/firestoreQuotaHelpers';

const USERS_COLLECTION = 'users';
const ADMINS_COLLECTION = 'admins';
const ALAA_ADMIN_DOC_ID = 'admin-alaa';
const ALAA_USER_DOC_ID = 'user-alaa';

const STAFF_ROLES = new Set<string>([
  'super_admin',
  'product_manager',
  'order_manager',
  'inventory_manager',
]);

function mapDocToAdminProfile(
  snapId: string,
  uid: string,
  data: Partial<FirestoreUserProfile> | Partial<FirestoreAdminProfile>
): FirestoreAdminProfile | null {
  if (!data || !data.role || !data.email || !STAFF_ROLES.has(data.role)) {
    return null;
  }

  const role = data.role as AdminRole;
  return {
    id: data.id || snapId,
    uid: data.uid || uid,
    username: data.username || data.email.split('@')[0] || 'admin',
    name: data.name || data.username || 'Authorized Admin',
    email: data.email,
    role,
    permissions: Array.isArray(data.permissions)
      ? data.permissions
      : getEffectivePermissions({ role }),
    isActive: data.isActive ?? true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Fetches the authenticated user's RBAC profile from `users/{uid}` first,
 * falling back to `admins/{uid}` for backward compatibility.
 */
export async function fetchFirestoreAdminProfile(
  uid: string
): Promise<FirestoreAdminProfile | null> {
  if (!uid || isFirestoreInQuotaCooldown()) return null;

  for (const collectionName of [USERS_COLLECTION, ADMINS_COLLECTION]) {
    const path = `${collectionName}/${uid}`;
    try {
      const snap = await getDoc(doc(db, collectionName, uid));
      if (!snap.exists()) {
        continue;
      }
      const mapped = mapDocToAdminProfile(
        snap.id,
        uid,
        snap.data() as Partial<FirestoreUserProfile>
      );
      if (mapped) {
        return mapped;
      }
    } catch (err) {
      if (isFirestoreQuotaExceededError(err)) {
        markFirestoreQuotaExceeded();
        return null;
      }
      const code = (err as { code?: string })?.code;
      if (code === 'permission-denied') {
        continue;
      }
      handleFirestoreError(err, OperationType.GET, path);
    }
  }

  return null;
}

/**
 * Writes/synchronizes Alaa's Super Admin + Full Stock RBAC profile across both
 * `users/{uid}` (enforced by inventory Firestore security rules) and `admins/{uid}`.
 */
export async function syncProvisionedAlaaAdminProfile(
  linkedUid?: string
): Promise<boolean> {
  if (!auth.currentUser || isFirestoreInQuotaCooldown()) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const isAlaaSession = auth.currentUser.email?.toLowerCase() === 'alaa@onalaastore.com';
  const effectiveUid = isAlaaSession
    ? linkedUid || auth.currentUser.uid
    : ALAA_USER_DOC_ID;

  const userDocIds = Array.from(
    new Set(
      [
        ...(isAlaaSession && linkedUid ? [linkedUid] : []),
        ALAA_USER_DOC_ID,
      ].filter(Boolean)
    )
  );
  const adminDocIds = Array.from(
    new Set(
      [
        ...(isAlaaSession && linkedUid ? [linkedUid] : []),
        ALAA_ADMIN_DOC_ID,
      ].filter(Boolean)
    )
  );

  try {
    for (const docId of userDocIds) {
      const ref = doc(db, USERS_COLLECTION, docId);
      const existingSnap = await getDoc(ref);
      const existingCreatedAt =
        existingSnap.exists() && typeof existingSnap.data()?.createdAt === 'string'
          ? String(existingSnap.data().createdAt)
          : nowIso;
      const payload = buildAlaaFirestoreUserPayload(effectiveUid, {
        docId,
        createdAt: existingCreatedAt,
        nowIso,
      });
      await setDoc(ref, payload, { merge: true });
    }

    for (const docId of adminDocIds) {
      const ref = doc(db, ADMINS_COLLECTION, docId);
      const existingSnap = await getDoc(ref);
      const existingCreatedAt =
        existingSnap.exists() && typeof existingSnap.data()?.createdAt === 'string'
          ? String(existingSnap.data().createdAt)
          : nowIso;
      const payload = buildAlaaFirestoreUserPayload(effectiveUid, {
        docId,
        createdAt: existingCreatedAt,
        nowIso,
      });
      await setDoc(ref, payload, { merge: true });
    }
    return true;
  } catch (err) {
    if (isFirestoreQuotaExceededError(err)) {
      markFirestoreQuotaExceeded();
      return false;
    }
    const code = (err as { code?: string })?.code;
    if (code === 'permission-denied') {
      return false;
    }
    console.warn('Notice: could not sync Alaa profile in Firestore:', err);
    return false;
  }
}

/**
 * Ensures any signed-in bootstrapped Super Admin (`optimatech.lb@gmail.com` or `alaa@onalaastore.com`)
 * has a synchronized `users/{uid}` and `admins/{uid}` RBAC document containing `role: "super_admin"`
 * and `"full_stock"` in `permissions` so strict inventory security rules allow writes/deletes.
 */
export async function syncSignedInSuperAdminProfile(
  fbUser: FirebaseUser
): Promise<boolean> {
  if (!fbUser?.uid || isFirestoreInQuotaCooldown()) {
    return false;
  }

  const emailLower = (fbUser.email || '').toLowerCase();
  if (emailLower === 'alaa@onalaastore.com') {
    return syncProvisionedAlaaAdminProfile(fbUser.uid);
  }

  if (emailLower !== 'optimatech.lb@gmail.com') {
    return false;
  }

  const nowIso = new Date().toISOString();
  const basePayload: FirestoreUserProfile = {
    id: fbUser.uid,
    uid: fbUser.uid,
    username: 'admin',
    name: fbUser.displayName || '3Laa Hassan',
    email: emailLower,
    role: 'super_admin',
    permissions: [...SUPER_ADMIN_PERMISSIONS],
    isActive: true,
    updatedAt: nowIso,
  };

  try {
    for (const collectionName of [USERS_COLLECTION, ADMINS_COLLECTION]) {
      const ref = doc(db, collectionName, fbUser.uid);
      const snap = await getDoc(ref);
      const createdAt =
        snap.exists() && typeof snap.data()?.createdAt === 'string'
          ? String(snap.data().createdAt)
          : nowIso;
      await setDoc(ref, { ...basePayload, createdAt }, { merge: true });
    }
    return true;
  } catch (err) {
    if (isFirestoreQuotaExceededError(err)) {
      markFirestoreQuotaExceeded();
      return false;
    }
    const code = (err as { code?: string })?.code;
    if (code === 'permission-denied') {
      return false;
    }
    console.warn('Notice: could not sync owner RBAC profile in Firestore:', err);
    return false;
  }
}

export async function signInWithResolvedPortalFirebaseAccount(
  usernameOrEmail: string,
  password: string
): Promise<FirebaseUser | null> {
  const email = resolvePortalUserEmailFromUsername(usernameOrEmail);
  if (!email || !password) return null;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials' ||
      code === 'auth/operation-not-allowed' ||
      code === 'auth/wrong-password'
    ) {
      // Allow server-side bcrypt portal auth to continue smoothly when Email/Password user is not provisioned in Firebase Auth
      return null;
    }
    throw err;
  }
}

export function buildAdminUserFromFirebaseUser(
  fbUser: FirebaseUser,
  firestoreProfile?: FirestoreAdminProfile | null
): AdminUser | null {
  if (firestoreProfile && firestoreProfile.isActive === false) {
    return null;
  }

  const emailLower = (fbUser.email || '').toLowerCase();
  const isAlaaEmail = emailLower === 'alaa@onalaastore.com';
  const isPrimaryOwner = emailLower === 'optimatech.lb@gmail.com';

  if (firestoreProfile && firestoreProfile.isActive !== false) {
    return normalizeAdminUserProfile({
      id: fbUser.uid,
      username: firestoreProfile.username,
      name: firestoreProfile.name,
      role: firestoreProfile.role,
      email: firestoreProfile.email || fbUser.email || '',
      permissions: firestoreProfile.permissions,
    });
  }

  if (isAlaaEmail) {
    const alaaTemplate = resolvePortalDirectoryUser('Alaa');
    return normalizeAdminUserProfile({
      id: fbUser.uid,
      username: alaaTemplate?.username || 'Alaa',
      name: alaaTemplate?.name || 'Alaa',
      role: 'super_admin',
      email: fbUser.email || 'alaa@onalaastore.com',
      permissions: [...SUPER_ADMIN_PERMISSIONS],
    });
  }

  const role = isPrimaryOwner ? 'super_admin' : 'product_manager';
  return normalizeAdminUserProfile({
    id: fbUser.uid,
    username: fbUser.email?.split('@')[0] || 'admin',
    name: fbUser.displayName || (isPrimaryOwner ? '3Laa Hassan' : 'Authorized Admin'),
    role,
    email: fbUser.email || 'optimatech.lb@gmail.com',
    permissions: getEffectivePermissions({ role }),
  });
}

import { deleteObject, getStorage, ref } from 'firebase/storage';
import { auth, firebaseApp } from '../firebase';
import { isFirebaseStorageUrl } from '../utils/productMediaHelpers';

export interface MediaCleanupResult {
  attemptedCount: number;
  deletedCount: number;
  skippedCount: number;
}

/**
 * Safely deletes removed Firebase Storage files when an admin removes photos from a product.
 * Gracefully ignores external URLs, inline Base64 data URLs, missing files (`storage/object-not-found`),
 * unconfigured buckets, or permission/network errors so product saves never fail.
 */
export async function cleanupRemovedProductMedia(
  removedUrls: readonly string[]
): Promise<MediaCleanupResult> {
  if (!Array.isArray(removedUrls) || removedUrls.length === 0) {
    return { attemptedCount: 0, deletedCount: 0, skippedCount: 0 };
  }

  const firebaseUrls = removedUrls.filter((url) => isFirebaseStorageUrl(url));
  const skippedCount = removedUrls.length - firebaseUrls.length;
  if (firebaseUrls.length === 0 || !auth.currentUser) {
    return {
      attemptedCount: 0,
      deletedCount: 0,
      skippedCount: removedUrls.length,
    };
  }

  let storageInstance;
  try {
    storageInstance = getStorage(firebaseApp);
  } catch {
    return {
      attemptedCount: 0,
      deletedCount: 0,
      skippedCount: removedUrls.length,
    };
  }

  let deletedCount = 0;
  await Promise.all(
    firebaseUrls.map(async (fileUrl) => {
      try {
        const storageRef = ref(storageInstance, fileUrl);
        await deleteObject(storageRef);
        deletedCount += 1;
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code?: string }).code)
            : '';
        // Gracefully ignore missing files or storage rules notices so saving never blocks
        if (code !== 'storage/object-not-found') {
          console.warn(`Optional media cleanup skipped for ${fileUrl}:`, code || err);
        }
      }
    })
  );

  return {
    attemptedCount: firebaseUrls.length,
    deletedCount,
    skippedCount,
  };
}

export const DEFAULT_STORE_PROFILE_PICTURE = '/on-alaa-store-profile.png';

/**
 * Resolves and migrates legacy store logo URLs to the current Full HD store profile picture
 * while preserving user-uploaded custom images (data URLs or remote HTTPS URLs).
 */
export function resolveStoreLogoUrl(logoUrl?: string): string {
  const trimmed = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  if (!trimmed) {
    return DEFAULT_STORE_PROFILE_PICTURE;
  }

  if (
    trimmed.includes('m-arnaout-cell-logo') ||
    trimmed === '/on-alaa-logo.svg' ||
    trimmed.endsWith('/on-alaa-logo.svg') ||
    trimmed === '/logo.jpg' ||
    trimmed.endsWith('/logo.jpg')
  ) {
    return DEFAULT_STORE_PROFILE_PICTURE;
  }

  return trimmed;
}

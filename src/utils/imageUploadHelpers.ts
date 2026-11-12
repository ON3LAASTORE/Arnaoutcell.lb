/**
 * Image upload validation and formatting utilities
 */

export const DEFAULT_MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file size and MIME type for product image uploads.
 */
export function validateImageFile(
  file: { size: number; type: string; name?: string },
  maxSizeBytes: number = DEFAULT_MAX_IMAGE_SIZE
): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const maxMb = Math.round(maxSizeBytes / (1024 * 1024));

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image size exceeds ${maxMb}MB limit. Please choose a smaller file.`,
    };
  }

  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload PNG, JPEG, or WebP images only.',
    };
  }

  return { valid: true };
}

/**
 * Formats byte size into human readable string (KB / MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

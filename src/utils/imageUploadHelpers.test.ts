import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageFile,
  formatFileSize,
  DEFAULT_MAX_IMAGE_SIZE,
} from './imageUploadHelpers.ts';

test('validateImageFile accepts valid JPEG image under 2MB', () => {
  const file = { size: 1024 * 500, type: 'image/jpeg', name: 'product.jpg' };
  const result = validateImageFile(file);
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validateImageFile accepts PNG and WebP images', () => {
  const png = { size: 1024 * 1024, type: 'image/png', name: 'item.png' };
  assert.equal(validateImageFile(png).valid, true);

  const webp = { size: 800 * 1024, type: 'image/webp', name: 'item.webp' };
  assert.equal(validateImageFile(webp).valid, true);
});

test('validateImageFile rejects files over 2MB limit', () => {
  const largeFile = { size: 2.5 * 1024 * 1024, type: 'image/jpeg', name: 'large.jpg' };
  const result = validateImageFile(largeFile);
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('exceeds 2MB limit'));
});

test('validateImageFile rejects unsupported file formats like GIF or PDF', () => {
  const gifFile = { size: 500 * 1024, type: 'image/gif', name: 'anim.gif' };
  const resGif = validateImageFile(gifFile);
  assert.equal(resGif.valid, false);
  assert.ok(resGif.error?.includes('Invalid file format'));

  const pdfFile = { size: 500 * 1024, type: 'application/pdf', name: 'doc.pdf' };
  const resPdf = validateImageFile(pdfFile);
  assert.equal(resPdf.valid, false);
});

test('formatFileSize formats bytes, KB, and MB accurately', () => {
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2.0 MB');
});

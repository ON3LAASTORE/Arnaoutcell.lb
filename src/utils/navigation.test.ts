import test from 'node:test';
import assert from 'node:assert/strict';
import { openExternalUrl } from './navigation';

test('openExternalUrl returns false when window is undefined in Node environment', () => {
  assert.equal(openExternalUrl('https://wa.me/96170773067'), false);
  assert.equal(openExternalUrl(''), false);
});

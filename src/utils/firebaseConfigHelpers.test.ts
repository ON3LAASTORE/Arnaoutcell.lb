import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAndValidateFirebaseConfig } from './firebaseConfigHelpers';

const validBase = {
  apiKey: 'AIzaSyTestValidKeyValue123456',
  authDomain: 'demo-app.firebaseapp.com',
  projectId: 'demo-app',
  storageBucket: 'demo-app.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
  firestoreDatabaseId: '(default)',
};

test('resolveAndValidateFirebaseConfig returns validated config and prefers VITE_FIREBASE_* overrides', () => {
  const result = resolveAndValidateFirebaseConfig(validBase, {
    VITE_FIREBASE_PROJECT_ID: 'override-project',
    VITE_FIREBASE_DATABASE_ID: 'custom-db',
    VITE_FIREBASE_API_KEY: '   ',
  });

  assert.equal(result.apiKey, validBase.apiKey);
  assert.equal(result.projectId, 'override-project');
  assert.equal(result.firestoreDatabaseId, 'custom-db');
});

test('resolveAndValidateFirebaseConfig throws descriptive error when required fields are missing or placeholders', () => {
  assert.throws(
    () =>
      resolveAndValidateFirebaseConfig(
        { apiKey: 'YOUR_API_KEY', authDomain: '', projectId: 'ok', appId: '<app-id>' },
        {}
      ),
    (err: Error) =>
      err.message.includes('apiKey') &&
      err.message.includes('authDomain') &&
      err.message.includes('appId')
  );
});

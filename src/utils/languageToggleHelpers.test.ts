import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLayoutDirection,
  getDirectionClass,
  getDirectionTransitionClass,
  getOppositeLanguage,
  getLanguageOptionMeta,
  readStoredLanguage,
  persistStoredLanguage,
  applyDocumentLanguageDirection,
  syncLanguageSettingImmediately,
} from './languageToggleHelpers';
import { StorageLike } from './storageQuotaHelpers';

function createMockElement() {
  const classes = new Set<string>();
  return {
    lang: 'en',
    dir: 'ltr',
    classes,
    classList: {
      add: (...tokens: string[]) => tokens.forEach((t) => classes.add(t)),
      remove: (...tokens: string[]) => tokens.forEach((t) => classes.delete(t)),
    },
  };
}

function createMockStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

test('normalizeLanguage safely defaults unknown values to English', () => {
  assert.equal(normalizeLanguage('ar'), 'ar');
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('fr'), 'en');
  assert.equal(normalizeLanguage(null), 'en');
  assert.equal(normalizeLanguage(undefined), 'en');
});

test('getLayoutDirection and getDirectionClass map Arabic to rtl and English to ltr', () => {
  assert.equal(getLayoutDirection('ar'), 'rtl');
  assert.equal(getLayoutDirection('en'), 'ltr');
  assert.equal(getDirectionClass('ar'), 'rtl');
  assert.equal(getDirectionClass('en'), 'ltr');
});

test('getDirectionTransitionClass returns directional animation classes only when transitioning', () => {
  assert.equal(getDirectionTransitionClass('ar', false), '');
  assert.equal(getDirectionTransitionClass('en', false), '');
  assert.equal(getDirectionTransitionClass('ar', true), 'dir-transitioning rtl-switch-enter');
  assert.equal(getDirectionTransitionClass('en', true), 'dir-transitioning ltr-switch-enter');
});

test('getOppositeLanguage toggles cleanly between English and Arabic', () => {
  assert.equal(getOppositeLanguage('en'), 'ar');
  assert.equal(getOppositeLanguage('ar'), 'en');
});

test('LANGUAGE_OPTIONS provides flag indicators and region metadata for English and Arabic', () => {
  assert.equal(LANGUAGE_OPTIONS.length, 2);
  const en = getLanguageOptionMeta('en');
  const ar = getLanguageOptionMeta('ar');
  assert.equal(en.shortLabel, 'EN');
  assert.equal(en.flagCode, 'us');
  assert.equal(en.direction, 'ltr');
  assert.equal(ar.shortLabel, 'عربي');
  assert.equal(ar.nativeLabel, 'العربية');
  assert.equal(ar.flagCode, 'lb');
  assert.equal(ar.direction, 'rtl');
});

test('readStoredLanguage and persistStoredLanguage round-trip language across hard reloads', () => {
  const storage = createMockStorage();
  assert.equal(readStoredLanguage(storage), 'en');

  assert.equal(persistStoredLanguage(storage, 'ar'), true);
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'ar');
  assert.equal(readStoredLanguage(storage), 'ar');

  assert.equal(persistStoredLanguage(storage, 'en'), true);
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'en');
  assert.equal(readStoredLanguage(storage), 'en');
});

test('syncLanguageSettingImmediately updates storage, html.lang, html.dir, and .rtl/.ltr synchronously', () => {
  const storage = createMockStorage();
  const html = createMockElement();
  const body = createMockElement();

  const resAr = syncLanguageSettingImmediately({
    nextLang: 'ar',
    storage,
    htmlEl: html,
    bodyEl: body,
    isTransitioning: true,
  });

  assert.deepEqual(resAr, { lang: 'ar', direction: 'rtl', persisted: true });
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'ar');
  assert.equal(html.lang, 'ar');
  assert.equal(html.dir, 'rtl');
  assert.equal(html.classes.has('rtl'), true);
  assert.equal(html.classes.has('dir-transitioning'), true);
  assert.equal(body.classes.has('rtl'), true);

  const resEn = syncLanguageSettingImmediately({
    nextLang: 'en',
    storage,
    htmlEl: html,
    bodyEl: body,
    isTransitioning: false,
  });

  assert.deepEqual(resEn, { lang: 'en', direction: 'ltr', persisted: true });
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'en');
  assert.equal(html.lang, 'en');
  assert.equal(html.dir, 'ltr');
  assert.equal(html.classes.has('ltr'), true);
  assert.equal(html.classes.has('rtl'), false);
  assert.equal(body.classes.has('ltr'), true);
});

test('applyDocumentLanguageDirection updates lang, dir, .rtl/.ltr and .dir-transitioning classes', () => {
  const html = createMockElement();
  const body = createMockElement();

  const dirAr = applyDocumentLanguageDirection('ar', html, body, { isTransitioning: true });
  assert.equal(dirAr, 'rtl');
  assert.equal(html.lang, 'ar');
  assert.equal(html.dir, 'rtl');
  assert.equal(html.classes.has('rtl'), true);
  assert.equal(html.classes.has('ltr'), false);
  assert.equal(html.classes.has('dir-transitioning'), true);
  assert.equal(body.classes.has('rtl'), true);
  assert.equal(body.classes.has('dir-transitioning'), true);

  const dirEn = applyDocumentLanguageDirection('en', html, body, { isTransitioning: false });
  assert.equal(dirEn, 'ltr');
  assert.equal(html.lang, 'en');
  assert.equal(html.dir, 'ltr');
  assert.equal(html.classes.has('ltr'), true);
  assert.equal(html.classes.has('rtl'), false);
  assert.equal(html.classes.has('dir-transitioning'), false);
  assert.equal(body.classes.has('ltr'), true);
  assert.equal(body.classes.has('rtl'), false);
  assert.equal(body.classes.has('dir-transitioning'), false);
});

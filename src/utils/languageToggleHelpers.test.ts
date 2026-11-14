import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLayoutDirection,
  getDirectionClass,
  getOppositeLanguage,
  getLanguageOptionMeta,
  applyDocumentLanguageDirection,
} from './languageToggleHelpers';

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

test('getOppositeLanguage toggles cleanly between English and Arabic', () => {
  assert.equal(getOppositeLanguage('en'), 'ar');
  assert.equal(getOppositeLanguage('ar'), 'en');
});

test('LANGUAGE_OPTIONS provides complete metadata for both English and Arabic', () => {
  assert.equal(LANGUAGE_OPTIONS.length, 2);
  const en = getLanguageOptionMeta('en');
  const ar = getLanguageOptionMeta('ar');
  assert.equal(en.shortLabel, 'EN');
  assert.equal(en.direction, 'ltr');
  assert.equal(ar.shortLabel, 'عربي');
  assert.equal(ar.nativeLabel, 'العربية');
  assert.equal(ar.direction, 'rtl');
});

test('applyDocumentLanguageDirection updates lang, dir, and .rtl/.ltr classes on html and body', () => {
  const html = createMockElement();
  const body = createMockElement();

  const dirAr = applyDocumentLanguageDirection('ar', html, body);
  assert.equal(dirAr, 'rtl');
  assert.equal(html.lang, 'ar');
  assert.equal(html.dir, 'rtl');
  assert.equal(html.classes.has('rtl'), true);
  assert.equal(html.classes.has('ltr'), false);
  assert.equal(body.classes.has('rtl'), true);
  assert.equal(body.classes.has('ltr'), false);

  const dirEn = applyDocumentLanguageDirection('en', html, body);
  assert.equal(dirEn, 'ltr');
  assert.equal(html.lang, 'en');
  assert.equal(html.dir, 'ltr');
  assert.equal(html.classes.has('ltr'), true);
  assert.equal(html.classes.has('rtl'), false);
  assert.equal(body.classes.has('ltr'), true);
  assert.equal(body.classes.has('rtl'), false);
});

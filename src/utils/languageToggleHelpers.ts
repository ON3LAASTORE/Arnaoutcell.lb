import { Language } from '../types';

export type LayoutDirection = 'ltr' | 'rtl';

export interface LanguageOptionMeta {
  code: Language;
  shortLabel: string;
  nativeLabel: string;
  englishName: string;
  direction: LayoutDirection;
  dirClass: LayoutDirection;
  ariaLabel: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOptionMeta[] = [
  {
    code: 'en',
    shortLabel: 'EN',
    nativeLabel: 'English',
    englishName: 'English',
    direction: 'ltr',
    dirClass: 'ltr',
    ariaLabel: 'Switch language to English (LTR)',
  },
  {
    code: 'ar',
    shortLabel: 'عربي',
    nativeLabel: 'العربية',
    englishName: 'Arabic',
    direction: 'rtl',
    dirClass: 'rtl',
    ariaLabel: 'التبديل إلى اللغة العربية (RTL)',
  },
] as const;

export function normalizeLanguage(value: unknown): Language {
  return value === 'ar' ? 'ar' : 'en';
}

export function getLayoutDirection(lang: Language): LayoutDirection {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function getDirectionClass(lang: Language): LayoutDirection {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function getOppositeLanguage(lang: Language): Language {
  return lang === 'ar' ? 'en' : 'ar';
}

export function getLanguageOptionMeta(lang: Language): LanguageOptionMeta {
  return LANGUAGE_OPTIONS.find((opt) => opt.code === lang) ?? LANGUAGE_OPTIONS[0];
}

export interface DocumentDirectionTarget {
  lang: string;
  dir: string;
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
  };
}

export function applyDocumentLanguageDirection(
  lang: Language,
  htmlEl: DocumentDirectionTarget | null | undefined,
  bodyEl?: { classList: DocumentDirectionTarget['classList'] } | null
): LayoutDirection {
  const normalized = normalizeLanguage(lang);
  const direction = getLayoutDirection(normalized);

  if (htmlEl) {
    htmlEl.lang = normalized;
    htmlEl.dir = direction;
    if (direction === 'rtl') {
      htmlEl.classList.remove('ltr');
      htmlEl.classList.add('rtl');
    } else {
      htmlEl.classList.remove('rtl');
      htmlEl.classList.add('ltr');
    }
  }

  if (bodyEl) {
    if (direction === 'rtl') {
      bodyEl.classList.remove('ltr');
      bodyEl.classList.add('rtl');
    } else {
      bodyEl.classList.remove('rtl');
      bodyEl.classList.add('ltr');
    }
  }

  return direction;
}

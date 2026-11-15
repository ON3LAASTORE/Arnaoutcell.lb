import { Language } from '../types';
import { safeStorageSetItem, StorageLike } from './storageQuotaHelpers';

export type LayoutDirection = 'ltr' | 'rtl';

export const LANGUAGE_STORAGE_KEY = 'arnaout_lang';

export interface LanguageOptionMeta {
  code: Language;
  shortLabel: string;
  nativeLabel: string;
  englishName: string;
  regionLabel: string;
  direction: LayoutDirection;
  dirClass: LayoutDirection;
  flagCode: 'us' | 'lb';
  ariaLabel: string;
}

export const DIRECTION_TRANSITION_DURATION_MS = 300;

export const LANGUAGE_OPTIONS: readonly LanguageOptionMeta[] = [
  {
    code: 'en',
    shortLabel: 'EN',
    nativeLabel: 'English',
    englishName: 'English',
    regionLabel: 'LTR',
    direction: 'ltr',
    dirClass: 'ltr',
    flagCode: 'us',
    ariaLabel: 'Switch language to English (LTR)',
  },
  {
    code: 'ar',
    shortLabel: 'عربي',
    nativeLabel: 'العربية',
    englishName: 'Arabic',
    regionLabel: 'RTL',
    direction: 'rtl',
    dirClass: 'rtl',
    flagCode: 'lb',
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

export function getDirectionTransitionClass(
  lang: Language,
  isTransitioning: boolean
): string {
  if (!isTransitioning) return '';
  return lang === 'ar'
    ? 'dir-transitioning rtl-switch-enter'
    : 'dir-transitioning ltr-switch-enter';
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

export function readStoredLanguage(storage: Pick<StorageLike, 'getItem'> | null | undefined): Language {
  if (!storage) return 'en';
  try {
    return normalizeLanguage(storage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return 'en';
  }
}

export function persistStoredLanguage(
  storage: StorageLike | null | undefined,
  lang: Language
): boolean {
  const normalized = normalizeLanguage(lang);
  const res = safeStorageSetItem(storage, LANGUAGE_STORAGE_KEY, normalized);
  return res.ok;
}

export function applyDocumentLanguageDirection(
  lang: Language,
  htmlEl: DocumentDirectionTarget | null | undefined,
  bodyEl?: { classList: DocumentDirectionTarget['classList'] } | null,
  options?: { isTransitioning?: boolean }
): LayoutDirection {
  const normalized = normalizeLanguage(lang);
  const direction = getLayoutDirection(normalized);
  const isTransitioning = Boolean(options?.isTransitioning);

  const syncTarget = (target: { classList: DocumentDirectionTarget['classList'] } | null | undefined) => {
    if (!target) return;
    if (direction === 'rtl') {
      target.classList.remove('ltr');
      target.classList.add('rtl');
    } else {
      target.classList.remove('rtl');
      target.classList.add('ltr');
    }

    if (isTransitioning) {
      target.classList.add('dir-transitioning');
    } else {
      target.classList.remove('dir-transitioning');
    }
  };

  if (htmlEl) {
    htmlEl.lang = normalized;
    htmlEl.dir = direction;
    syncTarget(htmlEl);
  }

  if (bodyEl) {
    syncTarget(bodyEl);
  }

  return direction;
}

export function syncLanguageSettingImmediately(params: {
  nextLang: Language;
  storage: StorageLike | null | undefined;
  htmlEl: DocumentDirectionTarget | null | undefined;
  bodyEl?: { classList: DocumentDirectionTarget['classList'] } | null;
  isTransitioning?: boolean;
}): { lang: Language; direction: LayoutDirection; persisted: boolean } {
  const normalized = normalizeLanguage(params.nextLang);
  const persisted = persistStoredLanguage(params.storage, normalized);
  const direction = applyDocumentLanguageDirection(normalized, params.htmlEl, params.bodyEl, {
    isTransitioning: params.isTransitioning,
  });
  return { lang: normalized, direction, persisted };
}

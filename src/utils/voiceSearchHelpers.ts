export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex?: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

export interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export interface ExtractedVoiceTranscript {
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  hasFinal: boolean;
}

/**
 * Resolves the browser's SpeechRecognition constructor safely across standard and WebKit engines.
 */
export function getSpeechRecognitionConstructor(
  win?: WindowWithSpeechRecognition | null
): SpeechRecognitionConstructor | null {
  const target =
    win !== undefined
      ? win
      : typeof window !== 'undefined'
      ? (window as unknown as WindowWithSpeechRecognition)
      : null;

  if (!target) return null;
  return target.SpeechRecognition || target.webkitSpeechRecognition || null;
}

/**
 * Checks whether voice-to-text search via the Web Speech API is available.
 */
export function isVoiceSearchSupported(win?: WindowWithSpeechRecognition | null): boolean {
  return getSpeechRecognitionConstructor(win) !== null;
}

/**
 * Maps store UI language ('en' | 'ar') to an appropriate BCP-47 speech recognition locale.
 */
export function getVoiceRecognitionLang(lang: 'en' | 'ar'): string {
  return lang === 'ar' ? 'ar-LB' : 'en-US';
}

/**
 * Extracts normalized final and interim speech transcripts from a SpeechRecognition event.
 */
export function extractTranscriptFromEvent(
  event: SpeechRecognitionEventLike | null | undefined
): ExtractedVoiceTranscript {
  if (!event || !event.results || typeof event.results.length !== 'number') {
    return {
      transcript: '',
      finalTranscript: '',
      interimTranscript: '',
      hasFinal: false,
    };
  }

  let finalTranscript = '';
  let interimTranscript = '';
  let hasFinal = false;

  for (let i = 0; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (!result || result.length === 0) continue;
    const text = (result[0]?.transcript || '').trim();
    if (!text) continue;

    if (result.isFinal) {
      hasFinal = true;
      finalTranscript = finalTranscript ? `${finalTranscript} ${text}` : text;
    } else {
      interimTranscript = interimTranscript ? `${interimTranscript} ${text}` : text;
    }
  }

  const combined = [finalTranscript, interimTranscript].filter(Boolean).join(' ').trim();
  return {
    transcript: combined,
    finalTranscript: finalTranscript.trim(),
    interimTranscript: interimTranscript.trim(),
    hasFinal,
  };
}

/**
 * Maps Web Speech API error codes into clear, localized user messages.
 */
export function mapVoiceSearchError(errorCode: string, lang: 'en' | 'ar'): string {
  const isArabic = lang === 'ar';
  switch (errorCode) {
    case 'unsupported':
      return isArabic
        ? 'البحث الصوتي غير مدعوم في هذا المتصفح. جرب Chrome أو Safari أو اكتب اسم المنتج.'
        : 'Voice search is unavailable in this browser. Please use Chrome/Safari or type your query.';
    case 'not-allowed':
    case 'service-not-allowed':
      return isArabic
        ? 'يرجى السماح بالوصول إلى الميكروفون لاستخدام البحث الصوتي.'
        : 'Microphone permission was denied. Please allow mic access to use voice search.';
    case 'no-speech':
      return isArabic
        ? 'لم يتم التقاط أي صوت. حاول التحدث بوضوح بالقرب من الميكروفون.'
        : 'No speech detected. Please speak clearly and try again.';
    case 'audio-capture':
      return isArabic
        ? 'لم يتم العثور على ميكروفون متصل بالجهاز.'
        : 'No microphone was detected on this device.';
    case 'network':
      return isArabic
        ? 'تعذر الاتصال بخدمة التعرف الصوتي. تحقق من اتصال الإنترنت.'
        : 'Network error during voice recognition. Please check your connection.';
    case 'aborted':
      return '';
    default:
      return isArabic
        ? 'تعذر إتمام البحث الصوتي. يرجى المحاولة مرة أخرى.'
        : 'Could not complete voice search. Please try again.';
  }
}

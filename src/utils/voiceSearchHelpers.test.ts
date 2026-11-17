import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSpeechRecognitionConstructor,
  isVoiceSearchSupported,
  getVoiceRecognitionLang,
  extractTranscriptFromEvent,
  mapVoiceSearchError,
  SpeechRecognitionConstructor,
  SpeechRecognitionEventLike,
} from './voiceSearchHelpers';

describe('voiceSearchHelpers', () => {
  it('detects SpeechRecognition and webkitSpeechRecognition constructors safely', () => {
    const MockCtor = (function () {}) as unknown as SpeechRecognitionConstructor;

    assert.equal(getSpeechRecognitionConstructor(null), null);
    assert.equal(isVoiceSearchSupported({}), false);
    assert.equal(
      getSpeechRecognitionConstructor({ SpeechRecognition: MockCtor }),
      MockCtor
    );
    assert.equal(
      getSpeechRecognitionConstructor({ webkitSpeechRecognition: MockCtor }),
      MockCtor
    );
    assert.equal(
      isVoiceSearchSupported({ webkitSpeechRecognition: MockCtor }),
      true
    );
  });

  it('selects appropriate BCP-47 speech locale for English and Arabic', () => {
    assert.equal(getVoiceRecognitionLang('en'), 'en-US');
    assert.equal(getVoiceRecognitionLang('ar'), 'ar-LB');
  });

  it('extracts interim and final transcripts cleanly from recognition events', () => {
    const mockEvent: SpeechRecognitionEventLike = {
      results: {
        length: 2,
        0: {
          isFinal: true,
          length: 1,
          0: { transcript: '  iPhone 16 ' },
        },
        1: {
          isFinal: false,
          length: 1,
          0: { transcript: 'Pro Max' },
        },
      },
    };

    const parsed = extractTranscriptFromEvent(mockEvent);
    assert.equal(parsed.finalTranscript, 'iPhone 16');
    assert.equal(parsed.interimTranscript, 'Pro Max');
    assert.equal(parsed.transcript, 'iPhone 16 Pro Max');
    assert.equal(parsed.hasFinal, true);

    assert.deepEqual(extractTranscriptFromEvent(null), {
      transcript: '',
      finalTranscript: '',
      interimTranscript: '',
      hasFinal: false,
    });
  });

  it('maps Web Speech API errors to clear EN and AR messages', () => {
    assert.match(mapVoiceSearchError('not-allowed', 'en'), /permission was denied/i);
    assert.match(mapVoiceSearchError('no-speech', 'en'), /No speech detected/i);
    assert.match(mapVoiceSearchError('unsupported', 'ar'), /غير مدعوم/);
    assert.equal(mapVoiceSearchError('aborted', 'en'), '');
  });
});

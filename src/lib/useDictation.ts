import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal ambient shape for the Web Speech API — TypeScript's DOM lib doesn't ship types for it,
// and it's only ever accessed through window, feature-detected, so a full type package isn't
// worth adding as a dependency for this.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function setNativeFieldValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Speech-to-text dictation for whichever text input/textarea last had focus, via the browser's
 * Web Speech API. There's no per-field wiring needed — this hook drives one shared mic control
 * (see DictationControl.tsx) that inserts transcribed speech into the tracked field using the
 * same native-setter + dispatchEvent technique React needs for programmatic input changes,
 * so the field's own onChange fires normally and the wizard's state stays in sync.
 */
export function useDictation(lang: string) {
  const [isSupported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [isListening, setIsListening] = useState(false);
  const [targetField, setTargetField] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseValueRef = useRef('');
  const finalTranscriptRef = useRef('');

  // Track the last-focused eligible field site-wide, so the mic control always knows where to
  // insert dictated text without every wizard needing to wire this up individually.
  useEffect(() => {
    const isEligible = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement => {
      if (el instanceof HTMLTextAreaElement) return true;
      if (el instanceof HTMLInputElement) {
        return el.type === 'text' || el.type === 'email' || el.type === 'tel' || el.type === '';
      }
      return false;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isEligible(e.target)) setTargetField(e.target);
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!isSupported || !targetField || !document.contains(targetField)) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    baseValueRef.current = targetField.value;
    finalTranscriptRef.current = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscriptRef.current += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }
      const base = baseValueRef.current;
      const joiner = base && !base.endsWith(' ') ? ' ' : '';
      setNativeFieldValue(targetField, `${base}${joiner}${finalTranscriptRef.current}${interimTranscript}`);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isSupported, targetField, lang]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isSupported, isListening, hasTarget: Boolean(targetField), toggle };
}

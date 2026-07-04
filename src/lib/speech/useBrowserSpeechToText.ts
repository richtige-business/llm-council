// ============================================
// useBrowserSpeechToText.ts - Browser STT Hook
// 
// Zweck: Kapselt Web Speech API für Spracheingabe
// Verwendet von: ChatWidget (globaler Assistent)
// ============================================

'use client';

import { useEffect, useRef, useState } from 'react';

// --------------------------------------------
// Web Speech API Type Declarations
// Browser-spezifische APIs die nicht in TypeScript standard sind
// --------------------------------------------

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// --------------------------------------------
// Typen für den Hook
// --------------------------------------------

type STTState = 'idle' | 'listening' | 'error';

interface UseBrowserSpeechToTextOptions {
  lang?: string;
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

// --------------------------------------------
// Hook: Browser Speech-to-Text
// --------------------------------------------

export function useBrowserSpeechToText(options: UseBrowserSpeechToTextOptions = {}) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<STTState>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onPartialRef = useRef<UseBrowserSpeechToTextOptions['onPartial']>(options.onPartial);
  const onFinalRef = useRef<UseBrowserSpeechToTextOptions['onFinal']>(options.onFinal);
  const onErrorRef = useRef<UseBrowserSpeechToTextOptions['onError']>(options.onError);
  const onEndRef = useRef<UseBrowserSpeechToTextOptions['onEnd']>(options.onEnd);
  const langRef = useRef(options.lang ?? 'de-DE');

  // Aktualisiere Callbacks ohne Re-Initialisierung
  useEffect(() => {
    onPartialRef.current = options.onPartial;
    onFinalRef.current = options.onFinal;
    onErrorRef.current = options.onError;
    onEndRef.current = options.onEnd;
  }, [options.onError, options.onFinal, options.onPartial, options.onEnd]);

  // Aktualisiere Sprache, falls vorhanden
  useEffect(() => {
    langRef.current = options.lang ?? 'de-DE';
    if (recognitionRef.current) {
      recognitionRef.current.lang = langRef.current;
    }
  }, [options.lang]);

  // Initialisiere SpeechRecognition einmalig
  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = langRef.current;
    recognition.interimResults = true;
    // Kontinuierliche Aufnahme: Browser beendet NICHT bei Sprechpausen
    // Stoppen erfolgt manuell durch stop() Aufruf
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const chunk = result?.[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }

      if (interimText.trim()) {
        onPartialRef.current?.(interimText.trim());
      }

      if (finalText.trim()) {
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState('error');
      onErrorRef.current?.(event.error || 'stt_error');
    };

    recognition.onend = () => {
      setState('idle');
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignoriere Stop-Fehler beim Unmount
      }
      recognitionRef.current = null;
    };
  }, []);

  // Startet die Aufnahme
  const start = () => {
    if (!recognitionRef.current) return;
    setState('listening');
    try {
      recognitionRef.current.start();
    } catch {
      // start() kann werfen, wenn bereits aktiv
    }
  };

  // Stoppt die Aufnahme
  const stop = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // stop() kann in manchen Browsern fehlschlagen
    }
  };

  return {
    supported,
    state,
    start,
    stop,
  };
}

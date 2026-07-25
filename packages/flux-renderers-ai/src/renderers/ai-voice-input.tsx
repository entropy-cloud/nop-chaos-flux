import { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { AiVoiceInputSchema } from '../schemas.js';

/**
 * Minimal SpeechRecognition surface (TS ships no DOM lib types for it). Only
 * the fields/methods this renderer touches are declared. Implementations are
 * provided by the browser (`SpeechRecognition` / `webkitSpeechRecognition`).
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>> & {
    [index: number]: { 0: { transcript: string }; isFinal: boolean };
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

type VoiceErrorReason = 'unsupported' | 'permission-denied' | 'no-result';

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * ai-voice-input (Widget, P4, A-15): a microphone button that transcribes
 * speech via the Web Speech API and emits the transcript through `onResult`.
 *
 * INV-1 adjudication (`improvement §5.3`): `SpeechRecognition` is a
 * user-gesture browser API (mic input), not network IO, so it is called
 * directly here — NOT routed through `RendererEnv`. The `MediaRecorder` fallback
 * is out of scope (host customizes it).
 *
 * Marker `nop-ai-voice-input`; `data-slot="ai-voice-input"`. Failure Paths:
 * `voice-unsupported` (disabled + tooltip), `voice-permission-denied`, and
 * `voice-no-result` all surface via `onError({ reason })`.
 */
export function AiVoiceInputRenderer(props: RendererComponentProps<AiVoiceInputSchema>): RendererRenderOutput {
  const resolved = props.props;
  const lang = typeof resolved.lang === 'string' ? resolved.lang : undefined;
  const continuous = resolved.continuous === true;
  const interimResults = resolved.interimResults === true;

  const [status, setStatus] = useState<'idle' | 'listening'>('idle');
  // Detect once synchronously during the first render (no effect churn).
  const [unsupported] = useState<boolean>(() => !getSpeechRecognitionCtor());
  const firedUnsupportedRef = useRef(false);
  // AI-31 (effect deps): read the latest events through a ref so the
  // unsupported effect depends only on `[unsupported]`. The runtime builds a
  // fresh `props.events` object every render, so depending on it re-ran the
  // effect (and its no-op `firedUnsupportedRef` guard) on every render.
  const eventsRef = useRef(props.events);
  useEffect(() => {
    eventsRef.current = props.events;
  });
  // AI-04 (resource lifecycle): hold the live SpeechRecognition in a ref so the
  // stop branch and unmount cleanup can release the microphone. Previously the
  // recognition lived only inside the `handleStart` closure, so the stop button
  // never called `stop()` and unmount left the mic + stale callbacks alive.
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Release the microphone + detach callbacks on unmount (Failure Path
  // `voice-mic-released-on-stop`). Nulling the handlers guarantees no stale
  // `onresult`/`onerror`/`onend` fires after the component is gone (no
  // setState-after-unmount).
  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // abort() can throw if already stopped — swallow, mic is released.
      }
      recognitionRef.current = null;
    };
  }, []);

  // Fire onError('unsupported') exactly once when the browser lacks the API.
  // AI-31: deps are `[unsupported]` only; events are read via the latest-ref so
  // the effect does not re-run on every render's fresh events object.
  useEffect(() => {
    if (unsupported && !firedUnsupportedRef.current) {
      firedUnsupportedRef.current = true;
      void eventsRef.current.onError?.({ type: 'ai:voice-error', reason: 'unsupported' });
    }
  }, [unsupported]);

  function fireError(reason: VoiceErrorReason): void {
    void props.events.onError?.({ type: 'ai:voice-error', reason });
  }

  function handleStart(): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      // Detected at init (button is disabled); guard anyway.
      fireError('unsupported');
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang ?? '';
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognitionRef.current = recognition;

    let gotFinal = false;
    // open-audit P2-2: `onerror` and `onend` both fire for a single failed
    // session (e.g. `no-speech` → onerror → onend). Without a gate, the
    // `no-result` hint is emitted twice. `errorAlreadyFired` records that the
    // error path already surfaced a reason; `onend` then only emits `no-result`
    // when no error preceded it (the legitimate "pure no-result" path).
    let errorAlreadyFired = false;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i] as { 0: { transcript: string }; isFinal: boolean };
        transcript += result[0].transcript;
        if (result.isFinal) gotFinal = true;
      }
      if (transcript.trim().length > 0) {
        void props.events.onResult?.({ type: 'ai:voice-result', transcript });
      }
    };
    recognition.onerror = (event) => {
      const reason = event.error;
      errorAlreadyFired = true;
      if (reason === 'not-allowed' || reason === 'service-not-allowed') {
        fireError('permission-denied');
      } else if (reason === 'no-speech') {
        fireError('no-result');
      } else {
        fireError('no-result');
      }
    };
    recognition.onend = () => {
      setStatus('idle');
      if (!gotFinal && !errorAlreadyFired) {
        // voice-no-result: emit so the host can show a hint (non-fatal).
        // Only the "no error fired, pure no-result" path emits here — when
        // `onerror` already surfaced a `no-result` (e.g. `no-speech`), the
        // gate above prevents the duplicate emit.
        fireError('no-result');
      }
    };

    try {
      recognition.start();
      setStatus('listening');
    } catch {
      // start() throws if mic is unavailable or already started.
      fireError('permission-denied');
      setStatus('idle');
    }
  }

  function handleClick(): void {
    // Unsupported → button is disabled (clicks never arrive); the mount effect
    // already emitted onError('unsupported').
    if (status === 'listening') {
      // AI-04: actually stop the recognition (releases the microphone). The
      // browser then fires `onend` → setStatus('idle'); we also flip the UI
      // state immediately so the button reflects the stop without waiting.
      const recognition = recognitionRef.current;
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // stop() throws if not started — ignore; state still resets below.
        }
      }
      setStatus('idle');
      return;
    }
    handleStart();
  }

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-slot="ai-voice-input"
      data-state={status}
      data-unsupported={unsupported ? '' : undefined}
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
      disabled={unsupported}
      aria-label={t('flux.ai.voiceInput')}
      aria-pressed={status === 'listening'}
      className={cn('nop-ai-voice-input', props.meta.className)}
      onClick={handleClick}
    >
      {status === 'listening' ? (
        <span
          className="inline-flex h-4 w-5 items-center justify-center text-primary"
          aria-hidden="true"
          data-slot="ai-voice-input-wave"
          data-testid={props.meta.testid ? `${props.meta.testid}-wave` : undefined}
        >
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      ) : (
        <MicIcon />
      )}
      <span className="sr-only">
        {status === 'listening' ? t('flux.ai.voiceListening') : t('flux.ai.voiceInput')}
      </span>
    </Button>
  );

  if (unsupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent>{t('flux.ai.voiceUnsupported')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

function MicIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

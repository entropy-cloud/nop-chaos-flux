import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C8.3 Phase 3 host-scenario schemas + probe registration (real-browser
 * surfaces). Extracted to keep the lab pages within the lint max-lines budget
 * (data-c8-1-host.ts / data-c8-2-host.ts precedent).
 *
 * Covers the plan failure paths:
 *   host-prompts-dlg — ai-prompts inside an openDialog surface (bug 73
 *                       pattern): clicking a prompt item dispatches onSelect
 *                       and the action args `${item.label}|${index}` resolve
 *                       via the dispatch ctx.
 *   host-suggest-pop — ai-suggestions popover overflow collapse: overflow
 *                       trigger +N expands, clicking an overflow item
 *                       dispatches onSelect with the global index and
 *                       `${item.text}|${index}` resolves via ctx.
 *   host-voice-degrd — ai-voice-input degradation: when the browser lacks
 *                       SpeechRecognition the button renders disabled with
 *                       data-unsupported and onError('unsupported') fires
 *                       (mount effect) with `${reason}` resolving via ctx.
 *   host-welcome-reg — ai-welcome footer region: the region renders nested
 *                       schema components and the embedded button action
 *                       dispatches (region evaluation + events work).
 */

export function registerC83Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as Record<string, string | number | undefined>;
      const key = `__c83${method[0].toUpperCase()}${method.slice(1)}`;
      const countKey = `${key}Count`;
      w[key] = value;
      w[countKey] = ((w[countKey] as number | undefined) ?? 0) + 1;
      return { ok: true, data: value };
    },
  });
}

const PROMPT_ITEMS = [
  { label: 'Summarize', description: 'Get a quick summary', badge: 'P1' },
  { label: 'Translate' },
  { label: 'Debug help' },
];

const SUGGESTION_ITEMS = [
  { text: 'Summarize' },
  { text: 'Translate' },
  { text: 'Explain' },
  { text: 'Refine' },
  { text: 'Expand' },
];

export const c83PromptsDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open prompts dialog',
      testid: 'c83-prompts-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Prompts host',
          body: {
            type: 'page',
            body: [
              {
                type: 'ai-prompts',
                testid: 'c83-prompts-in-dialog',
                items: PROMPT_ITEMS,
                layout: 'vertical',
                onSelect: {
                  action: 'probe:prompt',
                  args: { value: '${item.label}|${index}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c83SuggestionsPopoverSchema = {
  type: 'page',
  body: [
    {
      type: 'ai-suggestions',
      testid: 'c83-suggestions',
      items: SUGGESTION_ITEMS,
      overflowMode: 'popover',
      maxVisible: 3,
      onSelect: {
        action: 'probe:suggest',
        args: { value: '${item.text}|${index}' },
      },
    },
  ],
} as unknown as BaseSchema;

export const c83VoiceDegradeSchema = {
  type: 'page',
  body: [
    {
      type: 'ai-voice-input',
      testid: 'c83-voice',
      onError: {
        action: 'probe:voiceError',
        args: { value: '${reason}' },
      },
    },
  ],
} as unknown as BaseSchema;

export const c83WelcomeRegionSchema = {
  type: 'page',
  data: { ctaCount: 0 },
  body: [
    {
      type: 'ai-welcome',
      testid: 'c83-welcome',
      title: 'Welcome',
      description: 'Ask me anything.',
      icon: 'bot',
      align: 'center',
      footer: {
        type: 'flex',
        direction: 'row',
        className: 'gap-2',
        body: [
          {
            type: 'button',
            label: 'Ask something',
            testid: 'c83-welcome-cta',
            onClick: {
              action: 'probe:welcome',
              args: { value: '${ctaCount}' },
              then: {
                action: 'setValue',
                args: { path: 'ctaCount', value: '${ctaCount + 1}' },
              },
            },
          },
          { type: 'text', text: 'nested footer text' },
        ],
      },
    },
  ],
} as unknown as BaseSchema;

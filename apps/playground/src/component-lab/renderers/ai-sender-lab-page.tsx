import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { registerC8Probe } from './data-c8-1-host';
import type { BaseSchema } from '@nop-chaos/flux-core';

const c8SenderSchema = {
  type: 'page',
  body: [
    {
      type: 'ai-sender',
      testid: 'c8-sender',
      placeholder: 'Type a message…',
      submitType: 'enter',
      maxLength: 60,
      showWordLimit: true,
      onSubmit: {
        action: 'probe:senderSubmit',
        args: { value: '${text}' },
      },
      onChange: {
        action: 'probe:senderChange',
        args: { value: '${text}' },
      },
    },
  ],
} as unknown as BaseSchema;

export function AiSenderLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Sender renderer: IME-guarded submit modes, word limit counter, loading cancel and host-injected rich-text extension path."
      scenarios={[
        {
          title: 'Host sender submit + word limit (C8.1)',
          description:
            'C8.1 Phase 3: standalone ai-sender Enter-submits the trimmed draft, fires onSubmit { text } to the probe, and the word limit counter flips to destructive over the cap.',
          schema: c8SenderSchema,
          data: {},
          onActionScopeChange: registerC8Probe,
        },
      ]}
    />
  );
}

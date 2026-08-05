import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { registerC8Probe } from './data-c8-1-host';
import type { BaseSchema } from '@nop-chaos/flux-core';

const BUBBLE_MESSAGE = {
  id: 'm1',
  role: 'assistant',
  content: 'Hello from the **lab** bubble.\n\n- item one\n- item two',
  metadata: { createdAt: new Date('2026-08-05T08:30:00Z').getTime() },
};

const c8BubbleSchema = {
  type: 'page',
  data: { message: BUBBLE_MESSAGE },
  body: [
    {
      type: 'ai-bubble',
      testid: 'c8-bubble',
      message: '${message}',
      placement: 'start',
      shape: 'rounded',
      showTimestamp: true,
    },
  ],
} as unknown as BaseSchema;

export function AiBubbleLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Bubble renderer: content-renderer registry (markdown/error/loading), placement/shape markers, timestamp footer and branch picker."
      scenarios={[
        {
          title: 'Host bubble with timestamp + markdown (C8.1)',
          description:
            'C8.1 Phase 3: a standalone ai-bubble renders markdown content with the nop-ai-bubble marker, data-role/data-placement and the ai-bubble-timestamp <time> element.',
          schema: c8BubbleSchema,
          data: { message: BUBBLE_MESSAGE },
          onActionScopeChange: registerC8Probe,
        },
      ]}
    />
  );
}

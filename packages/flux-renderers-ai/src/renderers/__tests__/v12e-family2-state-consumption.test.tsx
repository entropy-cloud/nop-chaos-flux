import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from '../../test-support.js';
import { AiFeedbackRenderer } from '../ai-feedback.js';
import type { ChatMessage, ChatMessageContentPart } from '../../engine/types.js';
import type { AiFeedbackSchema } from '../../schemas.js';

/**
 * V12e 族2 (G5-R3-视角3-02, plan 487): ai-feedback vote buttons emit
 * `data-state="selected"` (D1 option-row state channel) + `data-active` +
 * `aria-pressed`, but no CSS consumed any of them — voting produced zero
 * visual change. The package stylesheet must consume the state channel with
 * token-driven rules (attribute assertion pins the producer; the stylesheet
 * assertions pin the consumer; repo precedent: editor-styles.test.ts).
 */
const aiStyles = readFileSync('src/styles.css', 'utf8');

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

const Feedback = AiFeedbackRenderer as unknown as ComponentType<Record<string, unknown>>;

const MESSAGE: ChatMessage = {
  id: 'm1',
  role: 'assistant',
  content: 'hello' as string | ChatMessageContentPart[],
} as unknown as ChatMessage;

function makeProps() {
  return createMockRendererProps<AiFeedbackSchema>({
    schema: { type: 'ai-feedback' },
    props: {
      type: 'ai-feedback',
      actions: ['like', 'dislike'],
      message: MESSAGE,
    } as never,
    events: {},
  });
}

describe('ai-feedback selected state channel (G5-R3-视角3-02)', () => {
  it('like click emits data-state=selected + aria-pressed (producer side)', () => {
    const { container } = render(<Feedback {...makeProps()} />);
    const like = container.querySelector('[data-slot="ai-feedback-like"]') as HTMLElement;
    expect(like.getAttribute('data-state')).toBeNull();
    fireEvent.click(like);
    expect(like.getAttribute('data-state')).toBe('selected');
    expect(like.getAttribute('aria-pressed')).toBe('true');
    expect(like.getAttribute('data-active')).toBe('');
  });

  it('the package stylesheet consumes the selected state (token-driven)', () => {
    expect(aiStyles).toMatch(/\[data-slot='ai-feedback-(like|dislike)'\]\[data-state~='selected'\]/);
  });
});

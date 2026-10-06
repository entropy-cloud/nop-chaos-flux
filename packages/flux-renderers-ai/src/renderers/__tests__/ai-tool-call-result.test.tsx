/**
 * plan 529 Phase 4 单元测试：AiToolCallView 结果区
 * （string 直显 / 多行 JSON 字符串 verbatim / 无 result 不渲染）。
 * CodeBlock 语言标签头的包内单测见
 * ai-bubble/__tests__/markdown-content.test.tsx（lang chip 断言）。
 */

import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiToolCallView } from '../ai-tool-call.js';
import type { ChatToolCall, ChatToolCallUIState } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const toolCall: ChatToolCall = {
  index: 0,
  id: 'call_1',
  type: 'function',
  function: { name: 'get_weather', arguments: '{"city":"SF"}' },
};

function stateWith(overrides: Partial<ChatToolCallUIState> = {}): ChatToolCallUIState {
  return { status: 'success', ...overrides };
}

describe('plan 529 — tool call result rendering', () => {
  it('open card with a string result renders the result section', () => {
    const { container } = render(
      <AiToolCallView
        toolCall={toolCall}
        state={stateWith({ result: 'sunny, 21°C' })}
        defaultOpen
      />,
    );
    const result = container.querySelector('[data-slot="ai-tool-call-result"]');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('sunny, 21°C');
  });

  it('multiline string results render verbatim (JSON payload case)', () => {
    const { container } = render(
      <AiToolCallView
        toolCall={toolCall}
        state={stateWith({ result: '{"temp":21,"unit":"C"}' })}
        defaultOpen
      />,
    );
    const result = container.querySelector('[data-slot="ai-tool-call-result"]');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('"temp":21');
  });

  it('no result → result section absent', () => {
    const { container } = render(
      <AiToolCallView toolCall={toolCall} state={stateWith()} defaultOpen />,
    );
    expect(container.querySelector('[data-slot="ai-tool-call-result"]')).toBeNull();
  });
});

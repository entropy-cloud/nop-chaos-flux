/**
 * plan 529 Phase 4：ai-conversations 标题检索确定性单测（过滤/空态/清除恢复）。
 * e2e 侧（ai-chat-ux-visual.spec.ts conversations 用例）受限于 demo 冷启动无会话
 * 与 create→列表回路的存量接线缺陷（import-stack 命名空间竞态探针证据，见 plan
 * Deferred），过滤行为的判别性验证由本文件承担。
 */

import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiConversationsRenderer } from '../ai-conversations.js';
import type { AiConversationInfo } from '../../engine/types.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const conversations: AiConversationInfo[] = [
  { id: 'c-1', title: 'Refactor plan' },
  { id: 'c-2', title: 'Bug hunt' },
];

function renderPanel() {
  return render(
    <AiConversationsRenderer
      node={{ scope: undefined } as never}
      props={{
        conversations: conversations as unknown as Array<Record<string, unknown>>,
        activeId: 'c-1',
        showRenameControls: false,
      }}
      events={{} as never}
      meta={{ disabled: false }}
    /> as never,
  );
}

describe('ai-conversations — title search filter (plan 529)', () => {
  it('filters conversations by title substring (case-insensitive)', () => {
    const { container } = renderPanel();
    const input = container.querySelector('[data-testid="ai-conversations-search"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'bug' } });
    const items = container.querySelectorAll('[data-slot="ai-conversations-item"]');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Bug hunt');
  });

  it('shows the empty state for a non-matching query and recovers on clear', () => {
    const { container } = renderPanel();
    const input = container.querySelector('[data-testid="ai-conversations-search"]') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'zzz-不存在' } });
    expect(container.querySelectorAll('[data-slot="ai-conversations-item"]').length).toBe(0);
    expect(container.querySelector('[data-testid="ai-conversations-empty"]')).not.toBeNull();

    fireEvent.change(input, { target: { value: '' } });
    expect(container.querySelectorAll('[data-slot="ai-conversations-item"]').length).toBe(2);
    expect(container.querySelector('[data-testid="ai-conversations-empty"]')).toBeNull();
  });
});

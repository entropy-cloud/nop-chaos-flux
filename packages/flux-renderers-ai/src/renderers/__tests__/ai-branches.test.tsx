import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiBubbleView } from '../ai-bubble/index.js';
import type { ChatMessage } from '../../engine/types.js';
import type { AiBranch } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

const MESSAGE: ChatMessage = { id: 'a1', role: 'assistant', content: 'answer' };

describe('A-16 ai-bubble branch picker', () => {
  it('renders a prev/counter/next picker when the message is a branch point', () => {
    const branches: AiBranch[] = [
      { id: 'b1', messageId: 'a1' },
      { id: 'b2', messageId: 'a1' },
      { id: 'b3', messageId: 'a1' },
    ];
    const { container } = render(
      <AiBubbleView message={MESSAGE} branches={branches} activeBranchId="b2" />,
    );
    expect(container.querySelector('[data-slot="ai-bubble-branches"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="ai-bubble-branch-counter"]')?.textContent).toBe(
      '2/3',
    );
  });

  it('clicking next fires onBranchChange with the next sibling branch id', () => {
    const onBranchChange = vi.fn();
    const branches: AiBranch[] = [
      { id: 'b1', messageId: 'a1' },
      { id: 'b2', messageId: 'a1' },
      { id: 'b3', messageId: 'a1' },
    ];
    const { container } = render(
      <AiBubbleView message={MESSAGE} branches={branches} activeBranchId="b2" onBranchChange={onBranchChange} />,
    );
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-branch-next"]')!);
    expect(onBranchChange).toHaveBeenCalledWith('b3');
  });

  it('clicking prev wraps around to the last branch', () => {
    const onBranchChange = vi.fn();
    const branches: AiBranch[] = [
      { id: 'b1', messageId: 'a1' },
      { id: 'b2', messageId: 'a1' },
    ];
    const { container } = render(
      <AiBubbleView message={MESSAGE} branches={branches} activeBranchId="b1" onBranchChange={onBranchChange} />,
    );
    fireEvent.click(container.querySelector('[data-slot="ai-bubble-branch-prev"]')!);
    expect(onBranchChange).toHaveBeenCalledWith('b2');
  });

  it('branch-no-host-data: omits the picker when branches is empty', () => {
    const { container } = render(<AiBubbleView message={MESSAGE} branches={[]} />);
    expect(container.querySelector('[data-slot="ai-bubble-branches"]')).toBeNull();
  });

  it('branch-no-host-data: omits the picker when the message id is not in the branch set', () => {
    // e.g. branches belong to a different message (another turn).
    const branches: AiBranch[] = [{ id: 'b1', messageId: 'other-message' }];
    const { container } = render(
      <AiBubbleView message={MESSAGE} branches={branches} activeBranchId="b1" />,
    );
    expect(container.querySelector('[data-slot="ai-bubble-branches"]')).toBeNull();
  });

  it('defaults the active position to the first branch when activeBranchId is absent', () => {
    const branches: AiBranch[] = [
      { id: 'b1', messageId: 'a1' },
      { id: 'b2', messageId: 'a1' },
    ];
    const { container } = render(<AiBubbleView message={MESSAGE} branches={branches} />);
    expect(container.querySelector('[data-slot="ai-bubble-branch-counter"]')?.textContent).toBe(
      '1/2',
    );
  });
});

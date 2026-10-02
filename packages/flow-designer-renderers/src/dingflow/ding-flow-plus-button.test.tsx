import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DingFlowPlusButton } from './ding-flow-plus-button.js';

/**
 * ux-r12 tft3：+ 按钮必须居中于连线（TB 水平居中 / LR 垂直居中）。
 * 此前 absolute 只设 bottom/right 偏移、垂直/水平轴留 auto → 按钮落在
 * 内容流静态位置，实测偏离连线 ~25px。
 */

describe('DingFlowPlusButton centering (ux-r12 tft3)', () => {
  it('centers horizontally on the vertical connector in TB layout', () => {
    const { container } = render(<DingFlowPlusButton onClick={vi.fn()} direction="TB" />);
    const button = container.querySelector('button') as HTMLElement;
    expect(button.style.left).toBe('50%');
    expect(button.style.transform).toContain('translateX(-50%)');
    expect(button.style.bottom).toBeTruthy();
  });

  it('centers vertically on the horizontal connector in LR layout', () => {
    const { container } = render(<DingFlowPlusButton onClick={vi.fn()} direction="LR" />);
    const button = container.querySelector('button') as HTMLElement;
    expect(button.style.top).toBe('50%');
    expect(button.style.transform).toContain('translateY(-50%)');
    expect(button.style.right).toBeTruthy();
  });
});

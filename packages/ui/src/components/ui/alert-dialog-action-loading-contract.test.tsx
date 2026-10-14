import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogTrigger,
} from './alert-dialog.js';

/**
 * AlertDialogAction loading 透传 DOM 契约测试（plan 593 C5）
 *
 * 目的：冻结 `AlertDialogAction` 的 `loading` prop 行为——下游（nop-chaos-next
 * dialog confirm 链路）需要在 async 确认期间禁用按钮并暴露机器可读 busy 信号，
 * 防止 double-submit 与 force-click 兜底。
 *
 * 契约（生产常驻）：
 *  - `loading={true}` → action 按钮带 `data-loading`、`aria-busy="true"`、disabled；
 *    再点不触发关闭（disabled 阻断 Close primitive）。
 *  - `loading` 缺省/false → 行为与现网一致（无 data-loading、可点击关闭）。
 *
 * 机制：Button 内建 loading（button.tsx data-loading/aria-busy/disabled），
 * AlertDialogAction 透传 loading 到内层 Button。
 *
 * 注意：测试不覆写 render——默认走内层 Button，loading 才能生效。
 */

afterEach(() => cleanup());

describe('AlertDialogAction loading contract (plan 593 C5)', () => {
  function renderAction(loading?: boolean) {
    const onClose = vi.fn();
    render(
      <AlertDialog defaultOpen onOpenChange={onClose}>
        <AlertDialogTrigger render={<button type="button">Open</button>} />
        <AlertDialogContent>
          <p>Confirm?</p>
          <AlertDialogAction loading={loading}>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    return {
      action: document.querySelector('[data-slot="alert-dialog-action"]'),
      onClose,
    };
  }

  it('loading=true exposes data-loading, aria-busy, and disabled on the action', () => {
    const { action } = renderAction(true);

    expect(action).toBeTruthy();
    expect(action?.hasAttribute('data-loading')).toBe(true);
    expect(action?.getAttribute('aria-busy')).toBe('true');
    expect((action as HTMLButtonElement | null)?.disabled).toBe(true);
  });

  it('loading=true prevents the action click from closing the dialog', () => {
    const { action, onClose } = renderAction(true);

    fireEvent.click(action as Element);

    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeTruthy();
  });

  it('loading omitted keeps the pre-existing behavior: no busy attrs, click closes', () => {
    const { action, onClose } = renderAction(undefined);

    expect(action).toBeTruthy();
    expect(action?.hasAttribute('data-loading')).toBe(false);
    expect(action?.getAttribute('aria-busy')).toBeNull();
    expect((action as HTMLButtonElement | null)?.disabled).toBe(false);

    fireEvent.click(action as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it('loading={false} is equivalent to omitted', () => {
    const { action, onClose } = renderAction(false);

    expect(action?.hasAttribute('data-loading')).toBe(false);
    expect(action?.getAttribute('aria-busy')).toBeNull();
    expect((action as HTMLButtonElement | null)?.disabled).toBe(false);

    fireEvent.click(action as Element);
    expect(onClose).toHaveBeenCalled();
  });
});

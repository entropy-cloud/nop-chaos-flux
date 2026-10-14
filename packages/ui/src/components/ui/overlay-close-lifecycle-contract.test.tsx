import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogTrigger,
} from './alert-dialog.js';

/**
 * 弹层关闭生命周期 + data-slot 默认槽位 DOM 契约测试（plan 593 C4）
 *
 * 目的：冻结 Base UI 弹层族（popover / dropdown-menu / alert-dialog）的关闭时序
 * 与默认 data-slot 命名，作为下游（nop-chaos-next e2e-shared force-click 消除、
 * dirty-close-guard 覆写依赖、主题 CSS）依赖的稳定接口真相。
 *
 * 契约（生产常驻）：
 *  - open 期间 popup 带 `data-open`。
 *  - close 后 popup **detach**（这是可依赖的最终完成信号）。
 *  - modal 弹层（alert-dialog）open 期间背景被标记 `[data-base-ui-inert]`，
 *    close 后该标记清空。
 *  - 默认 data-slot：popover-content / dropdown-menu-content / alert-dialog-content
 *    在未覆写时输出各自默认槽位；覆写（dirty-close-guard 模式）仍然生效。
 *  - Decision（裁决落字）：dropdown-menu 外点关闭维持 Base UI 默认
 *    `outsidePressEvent: 'sloppy'`（pointerdown 即关）——不为测试改 UX。
 *
 * happy-dom 可观测边界（plan 593 C4 审计 F1，probe 实证）：
 *  - `data-closed` 退出动画窗口在 happy-dom 下**不可观测**——无真实动画时间线，
 *    Base UI 的 `useAnimationsFinished` 立即回调，popup 同 tick detach。
 *  - 因此本契约测试冻结 happy-dom 可观测面：`data-open` + detach + modal inert
 *    清空。`data-closed` 窗口是真实浏览器事实（退出动画层），登记于
 *    `docs/architecture/renderer-markers-and-selectors.md`，留给 e2e 真浏览器层。
 *  - 消费者不得依赖 `data-closed` 作为完成信号——用 detach。
 *
 * 配套文档：`docs/architecture/renderer-markers-and-selectors.md`（Phase 5 登记）。
 */

afterEach(() => cleanup());

function finishAllAnimations() {
  // Force-finish any Web Animations Base UI may have registered so the exit
  // path settles deterministically under jsdom/happy-dom (no real timeline).
  for (const el of Array.from(document.querySelectorAll('*'))) {
    const animations = (el as HTMLElement).getAnimations?.() ?? [];
    for (const animation of animations) {
      try {
        animation.finish();
      } catch {
        // ignore — animation may already be finished or unsupported
      }
    }
  }
}

describe('overlay open/close lifecycle contract (plan 593 C4)', () => {
  it('Popover: open exposes data-open; controlled close detaches the popup', async () => {
    const { rerender } = render(
      <Popover open>
        <PopoverTrigger render={<button type="button">Open</button>} />
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );

    const popup = document.querySelector('[data-slot="popover-content"]');
    expect(popup).toBeTruthy();
    expect(popup?.hasAttribute('data-open')).toBe(true);

    // Drive a real close transition via controlled open (not unmount).
    rerender(
      <Popover open={false}>
        <PopoverTrigger render={<button type="button">Open</button>} />
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );
    finishAllAnimations();

    await waitFor(() => {
      expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
    });
  });

  it('DropdownMenu: open exposes data-open on the popup; outside pointerdown (sloppy) closes it', async () => {
    render(
      <DropdownMenu defaultOpen modal={false}>
        <DropdownMenuTrigger render={<button type="button">Open menu</button>} />
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const popup = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(popup).toBeTruthy();
    expect(popup?.hasAttribute('data-open')).toBe(true);

    // Decision (plan 593 C4): Base UI Menu defaults to outsidePressEvent
    // 'sloppy' — a pointerdown outside the popup closes it immediately. This
    // is the production UX contract; e2e must not force-click through it.
    fireEvent.pointerDown(document.body);
    finishAllAnimations();

    await waitFor(() => {
      expect(document.querySelector('[data-slot="dropdown-menu-content"]')).toBeNull();
    });
  });

  it('AlertDialog: modal open marks background inert; close clears inert and detaches', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger render={<button type="button">Open dialog</button>} />
        <AlertDialogContent>
          <p>Confirm?</p>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const popup = document.querySelector('[data-slot="alert-dialog-content"]');
    expect(popup).toBeTruthy();
    expect(popup?.hasAttribute('data-open')).toBe(true);
    // Modal surface: background is marked inert while open.
    expect(document.querySelectorAll('[data-base-ui-inert]').length).toBeGreaterThan(0);

    const action = document.querySelector('[data-slot="alert-dialog-action"]');
    expect(action).toBeTruthy();
    fireEvent.click(action as Element);
    finishAllAnimations();

    await waitFor(() => {
      expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
    });
    // Inert backdrop is removed once the modal surface is gone.
    expect(document.querySelectorAll('[data-base-ui-inert]').length).toBe(0);
  });
});

describe('data-slot default / override contract (plan 593 C4)', () => {
  it('PopoverContent defaults to data-slot=popover-content when not overridden', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger render={<button type="button">Open</button>} />
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );
    expect(document.querySelector('[data-slot="popover-content"]')).toBeTruthy();
  });

  it('DropdownMenuContent defaults to data-slot=dropdown-menu-content when not overridden', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger render={<button type="button">Open</button>} />
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).toBeTruthy();
  });

  it('AlertDialogContent defaults to data-slot=alert-dialog-content when not overridden', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger render={<button type="button">Open</button>} />
        <AlertDialogContent>Body</AlertDialogContent>
      </AlertDialog>,
    );
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeTruthy();
  });

  it('AlertDialogContent data-slot override (dirty-close-guard pattern) still wins', () => {
    // The dirty-close-guard relies on overriding data-slot to tag its
    // confirmation surface — this pin keeps the override path alive.
    render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger render={<button type="button">Open</button>} />
        <AlertDialogContent data-slot="dirty-close-guard">Body</AlertDialogContent>
      </AlertDialog>,
    );
    expect(document.querySelector('[data-slot="dirty-close-guard"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
  });

  it('PopoverContent data-slot override still wins', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger render={<button type="button">Open</button>} />
        <PopoverContent data-slot="custom-popover">Body</PopoverContent>
      </Popover>,
    );
    expect(document.querySelector('[data-slot="custom-popover"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
  });

  it('DropdownMenuContent data-slot override still wins', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger render={<button type="button">Open</button>} />
        <DropdownMenuContent data-slot="custom-menu">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(document.querySelector('[data-slot="custom-menu"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).toBeNull();
  });
});

// B6.2 — T2: toast imperative API 在 React.StrictMode 下不双发（TEST-GAP 回归锚）
//
// 这个文件**故意不 mock sonner**（与同目录 sonner.test.tsx 的 props 结构测试不同）。
// T2 是行为契约：验证 Flux `<Toaster/>` wrapper 是 sonner 的纯 presentational 包装，
// 没有在 effect 里创建 toast。sonner 维护 React 外的全局 store，`toast.success()` 是对
// 该 store 的直接 mutation，与 effect 无关，故 StrictMode（双跑 effect）下不会双发 toast。
// 一旦有人在 Flux wrapper 里引入 effect 驱动的 toast 创建，此测试会 fail（断言渲染出 >1 toast）。

import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { toast } from 'sonner';

import { Toaster } from './sonner.js';

function countRenderedToasts(): number {
  // sonner 把每条 toast 渲染为带 data-sonner-toast 属性的 <li>。
  return document.querySelectorAll('[data-sonner-toast]').length;
}

describe('Toaster imperative API — StrictMode safety (B6.2: T2)', () => {
  afterEach(() => {
    act(() => {
      // 清空 sonner 全局 store，隔离每个用例。
      toast.dismiss();
    });
    cleanup();
  });

  it('a single toast.success() under <React.StrictMode> renders exactly one toast', async () => {
    render(
      <React.StrictMode>
        <Toaster />
      </React.StrictMode>,
    );

    // 命令式触发一次（模拟 runtime showToast / env.notify 走的 sonner 全局 store 路径）。
    act(() => {
      toast.success('strict-mode-once');
    });

    // 双跑 effect 的风险点：若 Flux wrapper 在 effect 里创建 toast，StrictMode 会双发 → 这里会拿到 2。
    // wrapper 无 effect → 恰好一条。
    await expect.poll(
      () => countRenderedToasts(),
      { timeout: 1000 },
    ).toBe(1);

    // store 层面也断言只有一条在册 toast（sonner 暴露的同步视图）。
    expect(toast.getToasts()).toHaveLength(1);
  });

  it('different imperative variants all render a single toast (no double-fire across variants)', async () => {
    render(
      <React.StrictMode>
        <Toaster />
      </React.StrictMode>,
    );

    act(() => {
      toast.error('err-once');
    });

    await expect.poll(
      () => countRenderedToasts(),
      { timeout: 1000 },
    ).toBe(1);
  });
});

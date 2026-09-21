import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderTabs(schema: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://basic/tabs-v12f-desktop-overflow"
      schema={schema as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: `tab-${i}`,
    title: `Tab ${i}`,
    body: { type: 'text', text: `Body ${i}` },
  }));
}

/**
 * V12f Phase 1 — [G1-R6-视角8-01] tabs 桌面水平 overflow 契约。
 *
 * 溢出滚动分支原先只在 mobile 生效：桌面上 TabsList（`w-fit`）在窄容器里
 * 既不收缩也不滚动，溢出 tab 直接被裁剪且无法触达。契约：水平 orientation
 * 下桌面同样获得 `overflow-x-auto` 滚动契约（mobile 保留 scrollbar-hide）。
 */
describe('V12f [G1-R6-视角8-01] tabs horizontal overflow contract', () => {
  it('desktop TabsList carries the horizontal scroll contract', () => {
    renderTabs({ type: 'tabs', items: makeItems(8) });

    const tabsList = document.querySelector('[data-slot="tabs-list"]') as HTMLElement;
    expect(tabsList).toBeTruthy();
    expect(tabsList.className).toContain('overflow-x-auto');
  });

  it('mobile TabsList keeps the scrollbar-hidden scroll contract', () => {
    mobileState.isMobile = true;
    renderTabs({ type: 'tabs', items: makeItems(8) });

    const tabsList = document.querySelector('[data-slot="tabs-list"]') as HTMLElement;
    expect(tabsList.className).toContain('overflow-x-auto');
    expect(tabsList.className).toContain('nop-scrollbar-hide');
  });

  it('vertical orientation does not get the horizontal overflow classes', () => {
    renderTabs({ type: 'tabs', tabsMode: 'sidebar', items: makeItems(8) });

    const tabsList = document.querySelector('[data-slot="tabs-list"]') as HTMLElement;
    expect(tabsList).toBeTruthy();
    expect(tabsList.className).not.toContain('overflow-x-auto');
  });
});

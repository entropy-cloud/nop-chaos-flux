/**
 * P0-MA5.1-003 判别测试（IS-page-designer-015 根因层）。
 *
 * `useSyncExternalStoreWithSelector` fork 在 React Compiler 转换下不安全：编译器把
 * `useMemo` 工厂内新建的可变 `memo` 对象提升为跨渲染复用的 memo-cache 槽位。当
 * `selector`/`isEqual` 身份变化、新 `memoizedSelector` 闭包被创建时，原始实现依赖
 * 工厂重跑获得全新 `memo`（hasMemo: false）；编译产物却沿用旧 `memo`（hasMemo:
 * true + 旧 snapshot/selection）。对静态节点（snapshot 恒定）`objectIs(prevSnapshot,
 * nextSnapshot)` 恒真 → selector 永不重跑 → 同 id 节点重编译后的新 props 被冻结
 * （page-designer 画布 anchorText 恒旧的直接根因）。
 *
 * 本文件通过 vitest 配置中的 babel filter 仅对 fork 模块施加 reactCompilerPreset，
 * 镜像 playground 构建面，使该契约回归在 CI 可判别（无 transform 时新旧实现等价）。
 */

import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';

afterEach(cleanup);

const noopSubscribe = () => () => undefined;
// 静态节点形态：store 快照恒定（node-renderer-resolved 对 static propsProgram 用
// `() => null`），刷新只能依赖 selector 重跑。
const CONSTANT_SNAPSHOT = { tick: 0 };

function SelectorProbe(props: { label: string }) {
  const selection = useSyncExternalStoreWithSelector(
    noopSubscribe,
    () => CONSTANT_SNAPSHOT,
    () => CONSTANT_SNAPSHOT,
    () => ({ label: props.label }),
  );
  return createElement('div', { 'data-testid': 'selector-probe' }, selection.label);
}

describe('useSyncExternalStoreWithSelector (react-compiler build)', () => {
  it('re-runs the selector when its identity changes while the store snapshot is unchanged', () => {
    const view = render(createElement(SelectorProbe, { label: 'Button' }));
    expect(view.getByTestId('selector-probe').textContent).toBe('Button');

    view.rerender(createElement(SelectorProbe, { label: '确认提交' }));
    expect(view.getByTestId('selector-probe').textContent).toBe('确认提交');
  });
});

import { describe, it, expect } from 'vitest';
// `import type` is erased at runtime → no leafer/editor runtime loading from the barrel.
// 断言对象是经包公共面 `./index.js` 暴露的公开 session type（P2-2 投影）。
import type { ScadaEditorSessionPublic } from './index.js';

describe('ScadaEditorSessionPublic — public projection (P2-2: no UndoStack leak)', () => {
  it('exposes the session data fields (workingConfig/committedBaseline/selection/mode)', () => {
    const s = {} as ScadaEditorSessionPublic;
    // shape sanity（运行期对 {} 是 noop，仅锁住 type 形状不回退）
    expect(s.workingConfig).toBeUndefined();
    expect(s.committedBaseline).toBeUndefined();
    expect(s.selection).toBeUndefined();
    expect(s.mode).toBeUndefined();
  });

  // Type-level 断言：公开投影 type 不得含可变 `undoStack` 实例字段（与 docstring INV-4 一致）。
  // 若 undoStack 泄漏回公开面，下行访问合法 → `@ts-expect-error` 变 unused → tsc 报 TS2578（typecheck 红）。
  it('omits the internal undoStack instance field (type-level)', () => {
    const s = {} as ScadaEditorSessionPublic;
    // @ts-expect-error undoStack is omitted on the public projection — leak would make this directive unused
    const _leak = s.undoStack;
    expect(_leak).toBeUndefined();
  });
});

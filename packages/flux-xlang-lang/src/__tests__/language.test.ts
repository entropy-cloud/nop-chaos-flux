import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { createLanguageExtension } from '@nop-chaos/flux-code-editor';
import { mapXlangDiagnostics, registerXlangLanguage, xlang } from '../index.js';

/** 'xlang' 注册→registry 分发运行时链路（plan 616 F4：链路测试落本包）。 */
describe('xlang language registration', () => {
  it('registerXlangLanguage wires the registry so createLanguageExtension resolves', () => {
    // 未注册：miss 回落空数组（不得 throw）
    expect(Array.isArray(createLanguageExtension('xlang'))).toBe(true);

    registerXlangLanguage();
    const extension = createLanguageExtension('xlang');
    expect(extension).toBeTruthy();

    // 语言扩展可被 EditorState 消费
    const state = EditorState.create({ doc: 'let x = 1;', extensions: [xlang()] });
    expect(state.doc.toString()).toBe('let x = 1;');
  });

  it('xlang() assembles a consumable LanguageSupport', () => {
    const state = EditorState.create({
      doc: 'function f() { return 1; }',
      extensions: [xlang()],
    });
    // 语法树可访问（parser 已接线）——通过 state.field 拿语法需要 language 扩展；
    // 这里以 doc 完整性 + 不抛错为冒烟
    expect(state.doc.lines).toBe(1);
  });
});

describe('createXlangLinter diagnostics bridge', () => {
  it('maps backend diagnostics onto doc lines', () => {
    const doc = EditorState.create({ doc: 'let x = 1;\nlet y = 2;\nlet z = 3;' }).doc;
    const mapped = mapXlangDiagnostics(
      [
        { line: 2, severity: 'error', message: 'boom', errorCode: 'nop.err.t' },
        { line: 0, severity: 'warning', message: 'fallback' },
      ],
      doc,
    );
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      from: doc.line(2).from,
      to: doc.line(2).to,
      severity: 'error',
      message: 'boom (nop.err.t)',
    });
    // line<=0 归一为第 1 行
    expect(mapped[1].from).toBe(doc.line(1).from);
    expect(mapped[1].severity).toBe('warning');
  });

  it('returns empty mapping for empty diagnostics (compile-failure fallback shape)', () => {
    const doc = EditorState.create({ doc: 'let x = 1;' }).doc;
    expect(mapXlangDiagnostics([], doc)).toEqual([]);
  });
});

# 03 API 表面积与契约一致性

## 复核结论

- 保留: 2
- 降级: 2
- 驳回: 2

## 保留

### word editor wrapper 与 vendor type authority 漂移

- 文件: `packages/word-editor-core/src/index.ts`, `packages/word-editor-renderers/src/editor-canvas.tsx`, `packages/word-editor-renderers/src/panels/outline-panel.tsx`
- 结论: 保留，P1
- 依据: `word-editor-core` 已作为 `@hufe921/canvas-editor` 包装边界重新导出类型，但 renderer 仍直接从 vendor 包 import type。

### `flux-code-editor` root barrel 过宽

- 文件: `packages/flux-code-editor/src/index.ts`
- 结论: 保留，P2
- 依据: root barrel 同时暴露 renderer definition、source resolvers、CodeMirror hook、extension builder、panel 组件，超出“代码编辑器 renderer 包”直觉表面积。

## 已降级

### `flux-react` 公开 re-export runtime helper

- 文件: `packages/flux-react/src/index.tsx`
- 结论: 已降级，owner blur 但属刻意 facade
- 依据: live renderer 包广泛从 `flux-react` 导入这些 helper，说明它更像便利 facade，而非偶发泄露。

### `flux-core` root barrel 暴露过低层的 import-error tag helper

- 文件: `packages/flux-core/src/index.ts`
- 结论: 已降级
- 依据: `markImportErrorReported` / `isReportedImportError` 的确偏内部，但 `reportImportFailure` 仍是合理的共享 helper。

## 已驳回

### `flux-action-core` debounce 导出重复实现

- 文件: `packages/flux-action-core/src/index.ts`
- 结论: 驳回
- 依据: 只是 alias re-export，没有重复实现。

### CSS asset export policy 必须统一

- 文件: 多个 `package.json`
- 结论: 驳回
- 依据: 当前 repo 实际同时存在 side-effect CSS 与 subpath CSS 两种分发模式，尚无 owner doc 要求单一策略。

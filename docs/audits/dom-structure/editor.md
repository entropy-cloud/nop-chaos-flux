# dom-structure: editor

> Package: flux-renderers-form-advanced | Source: src/editor-renderer.tsx:284-357 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-editor" data-slot="editor">`（加载态同 slot + data-loading）；editor-toolbar/-toolbar-feedback slot；`<div data-slot="editor-content-frame">`（W3 补章）包 EditorContent → ProseMirror 根 `nop-editor-content`

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（fix landed） | :355 无名边框 div 补 `data-slot="editor-content-frame"`（ProseMirror 边框容器职责） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] editor-content-frame 补 slot（test-first 落于契约测试族）

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（同族）；既有 editor 测试无回归（1149/1149）

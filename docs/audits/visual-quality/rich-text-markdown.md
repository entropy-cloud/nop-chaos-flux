# 视觉质量证据卡：富文本/Markdown 编辑器（V10）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/editor/design.md`、`docs/components/markdown-editor/design.md`

## Findings 清单

- [V10-F1] Tiptap 扩展贫乏：富文本仅 StarterKit+Link，无 Image/Table/Underline/TextAlign/Highlight/Placeholder（`editor-renderer.tsx:31-49`）——取哪个子集须在研究报告显式裁决（含否决理由）
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V10-F2] B/I/S 按钮为文本字母（`editor-renderer.tsx:235-238`），未图标化
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V10-F3] markdown 编辑器为固定 `rows=8` 纯 Textarea（`markdown-editor-renderer.tsx:269`），无 autoGrow、无编辑/预览滚动同步
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V10-F4] 三处 Tiptap 消费（form editor / ai tiptap-sender / markdown）工具条一致性待核对
  - 证据: 路线图 V10 行
  - 裁决: pending
  - 状态: open
- [V10-F5] e2e 视觉断言缺失：`w3d-editor.spec.ts`、`w3d-markdown-editor.spec.ts` 均 0 计算样式/0 截图
  - 证据: V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V10 plan 落地：图标化工具条（L1）、autoGrow 高度自适应（L2 几何）、工具条一致性（L3）。

## Closure

（V10 closure audit 后回写）

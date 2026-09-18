# 视觉质量证据卡：Debugger 与代码编辑器（V9）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/code-editor/`（debugger 域无现成 design.md，owner doc 由 V9 研究报告确认/补齐）

## Findings 清单

- [V9-F1] debugger 注入式 CSS 不接设计令牌：`panel/styles-css.ts`（506 行）`position:fixed; z-index:9999`，色板全暗色 rgba fallback，亮色宿主下突兀
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V9-F2] code-editor 缺交互能力：无 searchKeymap（查找替换面板）/closeBrackets/highlightActiveLine（`extensions/base.ts:148-159` grep 零命中）
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V9-F3] `code-editor-styles.css:56-90` 暗色 hex fallback 无亮色令牌映射
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V9-F4] 两域 e2e 视觉断言缺失：`debugger.spec.ts` 1 处计算样式、`code-editor.spec.ts` 0 计算样式（3 处存档截图），无令牌/活动行高亮断言
  - 证据: V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V9 plan 落地：亮色适配（L3 令牌解析断言）、活动行高亮（L3）、查找替换面板（L1）。

## Closure

（V9 closure audit 后回写）

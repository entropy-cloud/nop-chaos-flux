# 视觉质量证据卡：Print 设计器（V8a）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）；09-13 遗留清单见 `docs/logs/2026/09-13.md`
> Owner plan: —
> Owner docs: `docs/components/print/design.md`

## Findings 清单（09-13 遗留①–⑩ + 对标缺口）

- [V8a-F1] ①旋转元素按未旋转 AABB 排版（code-dimensions.md D15-02）
  - 裁决: pending | 状态: open
- [V8a-F2] ②autoGrow 尾片高度（D21-05）
  - 裁决: pending | 状态: open
- [V8a-F3] ③printDate 跨页漂移（D19-03）
  - 裁决: pending | 状态: open
- [V8a-F4] ④PDF JPEG 压缩伪影（`export-pdf.ts:68`）
  - 裁决: pending | 状态: open
- [V8a-F5] ⑤吸附辅助线算了不画：`canvas-math.ts:84-89` 注释"供画布绘制辅助线"，`print-designer-canvas.tsx:130` 丢弃 `lines` 返回值；Alt 禁用吸附未实现（性价比最高项）
  - 裁决: pending | 状态: open
- [V8a-F6] ⑥验证仅按钮时更新/无元素级标红
  - 裁决: pending | 状态: open
- [V8a-F7] ⑦设计态 ImageRenderer 忽略 fit
  - 裁决: pending | 状态: open
- [V8a-F8] ⑧resetPrintElementIdSeq 泄漏 barrel
  - 裁决: pending | 状态: open
- [V8a-F9] ⑨iframe 打印清理无超时
  - 裁决: pending | 状态: open
- [V8a-F10] ⑩诊断消息中文硬编码：88 个 `flux.print.*` i18n 键已备而不用
  - 裁决: pending | 状态: open
- [V8a-F11] 对标缺口：无多选/框选、无方向键微移、无图层树、无 undo 栈 UI、标尺无拖动参考线（按缺口裁决落地）
  - 裁决: pending | 状态: open
- [V8a-F12] print e2e 全无视觉断言（`print-designer.spec.ts` 0 计算样式/0 截图）
  - 裁决: pending | 状态: open

## 背景

09-13 修复（选中框/手柄/标尺曾有 CSS 全无不可见）证明该域视觉缺陷真实存在且可在域内快速收敛。

## 视觉证据

待 V8a plan 落地：吸附辅助线渲染（L1/L4）、选中/手柄可见性（L3）、微移几何（L2）。

## Closure

（V8a closure audit 后回写）

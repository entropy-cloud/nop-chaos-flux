# 视觉质量证据卡：Flow Designer（V5）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §4（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/architecture/flow-designer/design.md`

## Findings 清单

- [V5-F1] 选择体系残缺：flow-designer 两包内无框选（`selectionOnDrag`/`onSelectionDrag` 零命中；`flux-renderers-graph` 的 `xyflow-canvas.tsx` 有既有先例可参照，不属 flow-designer 包）；`flow-designer-core/src/core/config.ts:36` `multiSelect:false` 默认关；xyflow 交互层只跟踪单节点/单边（`use-xyflow-interactions.ts:165-190` lastSelectionRef）
  - 证据: 普查 §4.1（经勘误：selectionOnDrag 限定 flow-designer 两包；multiSelect 出处 config.ts:36）
  - 裁决: pending
  - 状态: open
- [V5-F2] 无对齐/分布/吸附辅助线（grep 零命中）；无边中点插入（`designer-xyflow-edge.tsx` 无 midpoint）；节点尺寸为静态假值 180×60（bugs/11 `measured` 假数据）
  - 证据: 普查 §4.2
  - 裁决: pending
  - 状态: open
- [V5-F3] 浅色硬编码零 dark：节点色写死钉钉系 hex（`designer-node-appearance.ts:24-39` `#576a95/#ff943e/#3296fa`）；`designer-theme.css`（61 行）大量 `rgba(255,255,255,…)` 玻璃拟态，无任何 dark 变体
  - 证据: 普查 §4.3
  - 裁决: pending
  - 状态: open
- [V5-F4] utility shim 机制性风险（bugs/12）：schema 写 `bg-blue-50` 等类因 shim 缺失静默不生效，靠手工逐类补
  - 证据: 普查 §4.4、`docs/bugs/12`
  - 裁决: pending
  - 状态: open
- [V5-F5] 审计缺口：`createDesignerStoreAdapter`/`selectAllNodes`/`copySelection`/`pasteClipboard` 零直接测试（07-27 ma43 审计 FDC-GAP-01/04）；flow-ui spec 截图仅存档无比对
  - 证据: 普查 §4.5
  - 裁决: pending
  - 状态: open
- [V5-F6] dingflow 树模式视觉一致性待核对
  - 证据: 路线图 V5 行
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V5 plan 落地：dark 变体（L3 令牌断言）、吸附辅助线渲染（L1/L4）、节点实测尺寸（L2 几何）、框选/多选选框几何（L2）。

## Closure

（V5 closure audit 后回写）

# dom-structure: resizable

> Package: flux-renderers-layout | Source: src/resizable-renderer.tsx:63-73 + ui/resizable.tsx:10-12 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- 可见根（forced wrapper）`<div data-slot="resizable-root" data-renderer="resizable" data-testid data-cid class="h-full + meta.className">`（三方库 spread 后覆写 Group 的 data-testid/id，锚点故意垫外层——约束来源 :63-64 注释）；内层 ui PanelGroup `data-slot="resizable-panel-group"` 携带 `nop-resizable`（ui/resizable.tsx:12）；resizable-panel/-handle slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | forced wrapper 承载三件套（data-renderer 由 stamp 补齐）；`nop-resizable` 由 ui 层携带（PanelGroup），renderer 不重复添加（契约测试双向断言）；根 class 无 nop- 前缀按 forced wrapper 口径豁免 marker 断言（skip:['marker']） |
| D2 根自然性 | pass | 外层为 forced wrapper（约束登记） |
| D3 包装付租 | pass（forced wrapper 登记） | 约束来源：react-resizable-panels 覆写挂载节点 testid/id |
| D4 区域 slot | pass | resizable-root/-panel-group/-panel/-handle |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/dom-structure-contract.test.tsx`（resizable: outer wrapper anchors + ui 层 nop-resizable + 不重复断言）

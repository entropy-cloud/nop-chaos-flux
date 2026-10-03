# DOM 结构审计 Checklist 与审计卡模板（DOM Structure Checklist）v1

> 驱动方：`docs/backlog/dom-structure-audit-roadmap.md`
> 契约定义（owner doc）：`docs/architecture/renderer-markers-and-selectors.md` 的 Universal Root Anchors、Structural Flatness Contract、Design-Time Frame Protocol 三节
> 用途：定义"单个渲染器组件"的 DOM 结构审计维度、审计卡记录模板、裁决规则与冻结测试要求。
> 与 `component-audit-checklist.md`（18 维功能契约）的关系：本文件只管 DOM 结构与标记，不重复功能契约维度；两类审计卡相互独立、互不替代。
> 版本：v1（2026-10-03 随路线图建立）。执行中发现维度缺失时先修订本文件再继续审计，历史卡不回写。

## 审计维度（6 维）

### D1 根身份标记

- 根元素携带 `nop-<type>` class，且 `<type>` 与注册的 renderer type 一致
- 根元素携带 `data-renderer="<type>"`（由 flux-react 中央注入路径提供；自定义 `component` 绕过 AutoRenderer 的路径需确认覆盖到位）
- 根元素携带 `data-cid`（AutoRenderer 兜底，或组件在自定义根上显式携带）
- 豁免口径：portal 类渲染器关闭态 `return null`（挂载后的 portal 内容根必须携带）；`hidden` 等刻意裸输出的字段（豁免理由必须落卡）

### D2 根自然性

- leaf 类渲染器（单元素输出）根元素即自然元素，无额外根 div
- composite 类渲染器根元素本身承担多区域分组职责，而不是"只为存在"的空壳

### D3 包装层付租（Structural Flatness Contract 的组件级执行）

- 枚举根 → 首个内容/交互元素之间的每一层，逐层归因到四类职责之一：多区域分组 / 滚动区 / 组件自身契约要求的布局或引擎挂载作用域 / portal 边界
- 每个存在的包装层必须携带 `data-slot` 声明角色；无 `data-slot` 的包装 div 记为 defect
- 纯装饰包装（圆角/底色/定位包单子元素）合并进子元素或根；确因外部约束保留的（如第三方库覆写挂载节点的 `id`/`data-testid`），登记为 forced wrapper 并写明约束来源

### D4 区域 data-slot 覆盖

- 渲染器负责选择的所有子区域均有 `data-slot`（有用户语义的可用 `role`，与 `data-slot` 并存不冲突）
- 单元素 leaf 无内部区域时豁免

### D5 无自带 frame

- 组件子树内无设计器选中框/悬停框/拖放提示结构（frame 属于外部 overlay，见契约 Design-Time Frame Protocol）
- FieldFrame 嵌入（`wrap` / `frameWrap`）走 node-frame-wrapper 契约通道，组件不得自绘替代结构

### D6 Canvas a11y（仅 canvas / 三方引擎容器适用）

- 画布根满足 `role="application"` + i18n `aria-label`（契约 "Canvas / scene-graph interaction surfaces" 节，`docs/bugs/78` 教训）
- 非 canvas/三方引擎容器的 type（如表单域控件 barcode-input——自绘字段 chrome）D6 记 `n-a`；确属 canvas 容器但有等效可达性方案的才走 `exempt`，需登记理由

## 裁决规则

- 每维判定三值：`pass` / `fix` / `exempt`；`exempt` 必须写明理由并落在审计卡上，无理由的 exempt 按未完成处理
- D1 缺失、D5 违规、D6 违规为必修（`fix`），不得降级为 follow-up
- D3 违规：能当场合并的当场修；确属 forced / 低风险的走 `exempt` + forced wrapper 登记
- P0/P1/P2 分级语义沿用 `docs/audits/00-audit-execution-guide.md`；D1/D5/D6 缺失默认 P1（涉及工具链定位与可达性），D3/D4 默认 P2
- 审计与修复之间无人工握手：`fix` 项在所属包计划内以 test-first 方式落地

## 审计卡模板

卡片落盘于 `docs/audits/dom-structure/<type>.md`，每 renderer type 一张：

```md
# dom-structure: <type>

> Package: <pkg> | Source: <file>:<line> | Audited: <date> | Plan: <plan file>

## 结构图（根 → 首个内容/交互元素）

- root `<div class="nop-<type>" data-renderer="<type>" data-cid>` — 职责: <多区域分组/滚动/...>
  - `<layer-2 data-slot="...">` — 职责: ...
    - content / interactive element

## 维度判定

| 维度 | 判定 | 说明 / 证据（file:line） |
| ---- | ---- | ------------------------ |
| D1 根身份 | pass / fix / exempt | |
| D2 根自然性 | pass / fix / exempt | |
| D3 包装付租 | pass / fix / exempt | forced wrapper 登记（如有） |
| D4 区域 slot | pass / fix / exempt | |
| D5 无自带 frame | pass / fix / exempt | |
| D6 canvas a11y | pass / fix / exempt / n-a | |

## Actions

- [ ] <Fix item，test-first>

## Proof

- <契约测试文件 / 属性级断言>
```

## 冻结测试要求

- 每包在收口 Phase 增加 `dom-structure` 契约测试：以默认配置渲染包内全部 type，断言 D1 三件套（`nop-<type>` + `data-renderer` + `data-cid`）与该包登记过的 D4/D5 关键项；D6 用 `getAttribute('role')` / `getAttribute('aria-label')` 属性级断言
- 测试模式参照 `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`；共享断言 helper 由路线图 W0 计划提供
- 测试落位遵循 `renderer-markers-and-selectors.md` 的 Test Placement Convention（按包既有多数派布局）
- 契约后续演进时：先改 owner doc 与本 checklist，再改测试，最后清理卡面

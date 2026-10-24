# 721 审计修复 R2·R1.3：结构契约修复—flow-designer BEM 清理与测试锚点同步（P1-MA1.7-001）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R1.3（MR1.0/plan 711 展开）；`docs/audits/2026-10-19-1431-arm2-MA1.7-designer-structure.md` §P1-MA1.7-001；`docs/architecture/renderer-markers-and-selectors.md`（State Rules :242、内部区域规则 :196 明文禁止 BEM）+ `docs/architecture/styling-system.md` :479（「Do not introduce new BEM-style internal region classes」）；合规通道 = `data-*` 状态属性 + `data-slot` 内部区域
> Related: live 盘点（本 plan Current Baseline）；ARC 716/717 线不改 flow-designer 文件（冲突预检通过）

## Purpose

清除 flow-designer-renderers 16 处 BEM 违规类：6 处状态修饰符（`--empty/active/selected`，6/6 站点已有 `data-empty/data-active/data-selected` 合规双写——BEM 为冗余违规，删除）+ 10 处 `__` 元素类（CSS 零消费；转换为契约合规的 `data-slot` 属性保留区域寻址）；同步两处测试/脚本锚点（test :195 `--active` 断言改违规不存在断言；`scripts/visual-quality/interactions.mjs:24` waitFor 选择器 `.nop-designer-node-card--active` → `[data-active="true"]`）。判别纪律：断言「违规类不存在」先红后绿。

## Current Baseline（2026-10-24 live，HEAD `3a28a7568`）

- **designer-node-card.tsx** 9 处：`--empty`(:60) / `--active`(:83) / `--selected`(:84) / `__icon`(:97) / `__info`(:101) / `__title`(:102) / `__meta`(:105) / `__position`(:109) / `__state`(:119)；合规双写 `data-empty="true"`(:66) / `data-selected`(:91) / `data-active`(:92) 全在。
- **designer-edge-row.tsx** 7 处：`--empty`(:66) / `--active`(:86) / `--selected`(:87) / `__flow`(:98) / `__source`(:99) / `__arrow`(:102) / `__target`(:105)；合规双写 `data-empty="true"`(:72) / `data-selected`(:94) / `data-active`(:95) 全在。
- **测试锚点依赖**：`designer-node-card-edge-row.test.tsx:195` 唯一违规类断言（`toContain('nop-designer-node-card--active')`）；其余测试引用均为根 marker `.nop-designer-node-card`/`.nop-designer-edge-row`（合法保留）。
- CSS 消费：全仓 0（`.nop-designer-node-card--`/`__`/`.nop-designer-edge-row--`/`__` 零命中）；fd-alignment-guide--v/h（xyflow canvas 内部适配类）与 react-flow\_\_edge-animated（第三方库类）不在本行 16 处范围。
- roadmap R1.3 行 `todo`；arm2-index P1-MA1.7-001 修复行 `R1.3`、状态 `open`。

## Goals

- 16 处违规类清除：6 修饰符删除（合规属性已在）；10 `__` 类转 `data-slot`（`node-card-icon` 等 6 + `edge-row-flow` 等 4）。
- 判别测试：:195 锚点替换为违规不存在断言（:193 正通道保留）+ edge-row 侧同类断言（旧实现必挂）。
- roadmap R1.3 `todo`→`planned`→`done`；arm2-index P1-MA1.7-001 回填 `closed`。

## Non-Goals

- 不动根 marker（`nop-designer-node-card`/`nop-designer-edge-row` 合法保留）；不动 fd-alignment-guide--v/h 与 react-flow\_\_edge-animated（canvas 内部适配类/第三方类，审计已排除）；不动扫描器；不处理 MA1.7 报告 P2/P3。

## Scope（必填节）

### In Scope

- `packages/flow-designer-renderers/src/designer-node-card.tsx`（9 处）
- `packages/flow-designer-renderers/src/designer-edge-row.tsx`（7 处）
- `packages/flow-designer-renderers/src/designer-node-card-edge-row.test.tsx`（:195 锚点改违规不存在断言；:193 既有 data-active 正通道断言保留）
- `scripts/visual-quality/interactions.mjs`（:24 waitFor 选择器同步——tracked 视觉矩阵交互注册表，visual:capture 消费）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R1.3 翻转（激活/收口两提交）

### Out Of Scope

- fd-\*/react-flow 类；扫描器；owner doc；并发线（ARC 716/717 线、三项遗留）。

## Failure Paths

| 可测场景编号  | 触发                   | 行为                                             | 可重试 | 用户可见表现                 |
| ------------- | ---------------------- | ------------------------------------------------ | ------ | ---------------------------- |
| hidden-anchor | 执行中发现未登记消费点 | 停：评估该消费点归属（同批收编或改判），不静默改 | 是     | 消费点选择器与类清理同步落地 |
| snapshot-hit  | 快照因类删除挂         | 快照更新属预期（违规类删除），随收口登记         | 否     | 视觉矩阵按新选择器正常采集   |

## Test Strategy

本档选择：**必须自动化**——样式契约违规修复；判别断言「违规类不存在」（旧实现必挂）先红后绿。

## Execution Plan

### Phase 1 - 判别测试先行（红）

Status: completed
Targets: `designer-node-card-edge-row.test.tsx`

- Item Types: `Proof`

- [x] :195 断言替换为违规不存在断言（`not.toContain('nop-designer-node-card--active')`；:193 既有 data-active 正通道断言保留不重复）+ 用例尾部新增 edge-row 侧同类不存在断言；运行证实**红**（旧实现含违规类）

Exit Criteria:

- [x] 判别测试红在案（1 failed：'reflects active/selected selection state as data attributes' ×）

### Phase 2 - 清除实装（绿）与收口

Status: completed
Targets: 两 tsx + `scripts/visual-quality/interactions.mjs` + arm2-index + roadmap + daily log

- Item Types: `Fix | Proof`

- [x] node-card 9 处：3 修饰符删除；6 `__` 类转 `data-slot="node-card-{icon|info|title|meta|position|state}"`
- [x] edge-row 7 处：3 修饰符删除；4 `__` 类转 `data-slot="edge-row-{flow|source|arrow|target}"`
- [x] `scripts/visual-quality/interactions.mjs:24` waitFor 选择器 `.nop-designer-node-card--active` → `[data-active="true"]`
- [x] 判别断言转绿 + flow-designer-renderers 套件全绿（50 文件 311 测试）
- [x] arm2-index P1-MA1.7-001 `closed` + 注记（指针列承载）
- [ ] 激活提交（draft review 后）/ closure audit approved 后收口提交（含 R1.3 `done` 翻转、plan `completed`、daily log）

Exit Criteria:

- [x] 16 处零残留（grep 实证 0）；套件全绿；R1.3 `done` 回读核验

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_59c01d53`（五项检查：格式/内容稳健性 PASS——16 处独立盘点精确、data-slot 转换论证成立；可想象性/引用准确性/声称-实况 FAIL 由 2 Major 驱动；判别断言安全性核验：根 marker 与 nop-designer-summary-card 均不含 `--` 无误伤）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修后共识
- Rounds: 1
- Findings addressed: M1 未登记消费点 `scripts/visual-quality/interactions.mjs:24` waitFor `.nop-designer-node-card--active` 收编 In Scope（选择器同步 `[data-active="true"]`）；M2 引用漂移批订正（:479 归 styling-system.md、markers 内部区域规则 :196、**position :109、**state :119、edge-row data-empty :72）；m1 :195 表述改替换式（:193 已覆盖正通道）；m2 edge-row 侧补不存在断言；m3 Failure Paths 补用户可见表现列——均已落字
- Round 2: **共识 pass-with-minors**（0B/0M/2 wording-minor m4 Targets 行漏列 interactions.mjs、m5 Goals 残留措辞）——已随激活落字；观察项：Phase 1 断言窄于族级由 Phase 2 grep Exit 把守，无需改

## Closure Gates

- [x] 判别测试先红后绿在案（红证 1 failed → 绿证 311 passed）
- [x] 16 处违规零残留（grep 实证 0）
- [x] flow-designer-renderers 套件全绿
- [x] arm2-index P1-MA1.7-001 `closed`
- [x] 不存在被静默降级的 in-scope 项
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（scoped 本包 tsc/build/eslint 全净 @ 08:0x；全仓 43/44 唯一失败 flux-renderers-content 归因并发 ARC G4I 线未跟踪 WIP 测试文件 TS 错误——delta 甄别披露）
- [x] `pnpm build`（scoped 全净同上）
- [x] `pnpm lint`（scoped 全净同上）
- [x] `pnpm test`（本包 50 文件 311 测试全绿 ×2〔执行者 + auditor 独立复跑〕；全仓 74/78 红窗同上披露）

## Deferred But Adjudicated

（待执行中落账。）

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: R1.3 收官——16 处 BEM 违规清零（6 修饰符删除·合规 data-\* 属性承载 / 10 `__` 类转 data-slot 保留区域寻址）、唯一测试锚点 :195 转判别式 + edge-row 侧双断言、visual matrix 注册表选择器同步（draft review M1 揪出的隐藏消费点）；P1-MA1.7-001 `closed`（指针列承载）；代码变更 2 文件类级 + 1 断言 + 1 选择器。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_bf91290d`（2026-10-24 08:1x）
- Evidence: R1 **`approved`**（8/8 PASS + 0 findings）——16 处零残留（含全仓代码面复扫仅剩设计产物 not.toContain 断言）、data-slot 6+4 落点逐字、判别链完整、interactions.mjs 单行变更实证、独立复跑 50/311 全绿、索引单列翻转、零越界（并发 ARC G4I content 线 6 文件 + pnpm-lock 甄别归属）；scoped 三门禁全净。

Follow-up:

- fd-alignment-guide--v/h 与 react-flow\_\_edge-animated 不在 16 处范围（MA7.3 P3 deferred / 第三方类），无遗留。

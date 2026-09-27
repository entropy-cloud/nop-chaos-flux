# 521 Missing Components L5 — SCADA demo 接线 + 工具箱 UI 补全（L5.1/L5.2/L5.6）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/analysis/2026-09-26-scada-designer-demo-gap-audit.md`（L5.0 审计，W1-W7/U1-U6/D1-D3/O1-O4 缺口清单 + live API 盘点）；`docs/backlog/missing-components-and-designer-roadmap.md` §8（L5 线）
> Related: `docs/components/roadmap-industrial-hmi-editor.md`（E1-E11 阶梯，E7/E9.1 已 done）

## Purpose

收口 L5 线的实现主体：把包内已交付、demo 未接线的全部能力露出（L5.1 = W1-W7），补齐三类缺失 UI（L5.2 = U1-U6，前置 design-toolbox/design-undo-redo 增补节），完成 examples/i18n/入口（L5.6）。L5.3/L5.4/L5.5（需补设计的三个产品级大件）归 successor plan 522（design-first）；L5.7 R7 数字收口在 roadmap 登记（primary 已数值化达标，人工确认依据 = 用户概括放行指令〔先例 510〕；extended 维持留观察）；L5.8 四项维持 demand-gated。

## Current Baseline

以 `docs/analysis/2026-09-26-scada-designer-demo-gap-audit.md` §2-§4 为权威（file:line 逐项在案，2026-09-26 核对）：

- 生产接线已含连线拖拽（use-editor-engine.ts:183 → connection-wiring.ts:16），但 demo 初始 config 无 pipe-junction 图元 → 连线不可触发（W1）。
- save/export/preview/commitPolicy 语义均在包内，demo 无入口或无反馈（W2/W3/W4/W6）。
- 断开连接工具（U1）、撤销历史面板（U2）、图层管理（U3）、statusBar fallback（U4）、键盘剪贴板快捷键（U5）、junction connections 只读列表（U6）——底层 API 在、UI 缺。
- demo 文案停在 E5 M1（W5）；M2/M3 功能叙事级 e2e 缺（W7）。

## Goals

- W1-W6 全部接线（W7 e2e 随实现）；U4/U5/U6 直接实现；U1/U2/U3 先补 design 增补节（design-toolbox.md / design-undo-redo.md）再实现（U3 限纯重排树，可见性/锁定字段升级归 L5.8 观察面）。
- L5.6：example.json + examples.manifest + i18n 键（zh/en）+ home 入口核验（scada-editor-demo 入口已存在，parity 守卫绿）。
- 全量验证 full-green + roadmap §13 L5 行回写。

## Non-Goals

- L5.3 绑定面板 / L5.4 模板库站点 / L5.5 预览态集成 host 设计与实现（522）。
- L5.8 四项（ActionSchema 编辑器/InnerEditor/OS clipboard/历史深化）——demand-gated 维持。
- U3 可见性/锁定字段（serialization 扩展）——登记观察面。
- 包级 switchMode 句柄提升（W4 可选项，公共契约变更）——只做 demo 受控切换。

## Scope

### In Scope

`packages/flux-renderers-industrial/src/editor/`（toolbox 弹层/历史面板/statusBar/键盘快捷键/inspector connections 只读）、`docs/components/`（design-toolbox/design-undo-redo 增补节 + design.md 核对）、`apps/playground/src/pages/scada-editor-demo.tsx` + demo schema、`tests/e2e/`、i18n。

### Out Of Scope

L5.3/L5.4/L5.5；serialization 扩展（可见性/锁定）；OS clipboard。

## Failure Paths

| 编号                   | 触发                                  | 行为                                           | 可重试 | 用户可见     |
| ---------------------- | ------------------------------------- | ---------------------------------------------- | ------ | ------------ |
| u1-disconnect-dangling | 断开已 dangling 连接                  | 幂等成功 + 列表刷新                            | 是     | 列表项消失   |
| u2-history-truncate    | 历史面板点击回跳（若裁定含 truncate） | truncate-to-index 语义或只读列表（Phase 1 定） | —      | 栈位一致     |
| u5-shortcut-in-input   | 快捷键在文本输入焦点                  | 不触发剪贴板（isEditable 守卫沿用）            | —      | 正常输入     |
| w4-preview-isolation   | preview 态下编辑操作                  | 双态隔离契约（R5）：preview 只读               | —      | 无编辑副作用 |

## Test Strategy

档位：**必须自动化**（roadmap §10 预声明）。design 增补节为文档（不适用）；实现项 focused 单测先红后绿 + e2e 随 W7 扩展。

## Execution Plan

### Phase 1 - design 增补节（U1/U2/U3 design gate）

Status: completed
Targets: `docs/components/scada-editor/design-toolbox.md`（连接管理弹层/图层树节）、`design-undo-redo.md`（历史面板节）

- Item Types: `Decision`
- [x] 三节增补：连接管理弹层（列表 + 逐条断开 + dangling 标记）UI 契约；撤销历史面板（列表 + 深度/operationKind 展示；点击回跳的 truncate 语义裁定）；图层重排树（collectAllSymbols 复用，纯重排）
- [x] 独立 review 与实现合并为一批（增补节随实现 PR 过 review）

Exit Criteria:

- [x] 三节落盘无待定（truncate 语义有裁定）

### Phase 2 - demo 接线 W1-W7

Status: completed
Targets: `apps/playground/src/pages/scada-editor-demo.tsx` + demo schema

- Item Types: `Fix`、`Proof`
- [x] W1 初始 config 加 pipe-junction + 泵/阀图元 + 连线操作提示文案（可选连接列表按钮）
- [x] W2 onSave 事件接线（serializedConfig 可见反馈）+ onSessionChange 演示
- [x] W3 导出可见化（component:exportConfig 句柄 → JSON 展示）
- [x] W4 Edit/Preview 受控切换按钮组
- [x] W5 文案校准 M3 完成态；W6 commitPolicy 说明文案
- [x] W7 e2e 扩展：连线提交（junction custom.connections 写入）+ undo 往返 + toolbox 可达性

Exit Criteria:

- [x] W1-W6 逐项 demo 可操作 + W7 e2e 断言绿

### Phase 3 - UI 补全 U1-U6

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/`（toolbox-panel 弹层/history-panel/statusBar/canvas keydown/inspector schema-extractor）

- Item Types: `Fix`、`Proof`
- [x] U1 连接管理弹层（listAllConnections + programmaticDisconnect 消费）
- [x] U2 撤销历史面板（undo-stack entry 展示；truncate 裁定按 Phase 1）
- [x] U3 图层重排树（纯重排 MVP）
- [x] U4 statusBar 内置 fallback（viewport/mode/selection 摘要）
- [x] U5 Ctrl+C/X/V 键盘剪贴板（isEditable 守卫）
- [x] U6 junction inspector connections 只读列表
- [x] focused 单测逐项 + i18n 键 zh/en

Exit Criteria:

- [x] U1-U6 focused 全绿；既有 industrial 测试零回归

### Phase 4 - 收口验证 + 登记

Status: completed
Targets: 全仓 + 登记面

- Item Types: `Proof`
- [x] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红；e2e 全量零新增红
- [x] example.json + manifest + roadmap §13 L5 行回写 + dev log

Exit Criteria:

- [x] 全量验证记录于 Closure；登记面命中；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: 批次合并模式——独立 fresh 子 agent closure audit 覆盖 draft-review 职能（实现 agent 按 scoping 裁决执行，r1 findings 见 Closure Evidence）
- Verdict: closure audit approved（见 Closure Audit Evidence）
- Rounds: 1（closure 合并审查）
- Findings addressed: 见 Closure Audit Evidence

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（U3 可见性/锁定、W4 句柄提升、包级 export 增强均有登记去处）
- [x] 受影响 owner docs 已同步（design-toolbox/design-undo-redo §13 增补 + design-renderer events 通道裁定同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（r1 `issues` 0B/1M/2m——plan 文本未随执行同步，实现面全实——修齐后凭审计结论翻转，2026-09-27）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增红）
- [x] `pnpm test:e2e`（零新增红口径：1611/43/1/0——watch-only ×1）

## Deferred But Adjudicated

### L5.3/L5.4/L5.5（需补设计三件）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: roadmap 铁律 design-first；审计 D1-D3 均 L/M 级设计缺口
- Successor Required: `yes`
- Successor Path: plan 522（三份设计文档 → 独立 review → 实现）

### L5.8 四项（O1-O4）与 U3 可见性/锁定、W4 句柄提升、包级 export 增强

- Classification: `watch-only residual`（demand-gated）
- Why Not Blocking Closure: E10 post-mission 记录 + 无已过 gate 设计；触发条件在案
- Successor Required: `no`（需求出现按铁律建 plan）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: 四个 Phase 全部落地并经独立 closure audit 通过（r1 issues 0B/1M/2m——M1 为 plan 文本同步滞后，实现面经审计全实）：W1-W7 demo 接线 + U1-U6 UI 补全 + design §13 增补三节 + i18n zh/en ×37 + e2e 5 条新增（spec 7/7）。全量验证：typecheck/build/lint 40/40、test 74/74、check 0（layers-panel token 修复后 ui-consistency 过）、e2e 1611/43/1/0 零新增红。L5.3/L5.4/L5.5 → 522；L5.8 维持 demand-gated。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27）
- Evidence: verdict r1 `issues`（0B/1M/2m）→ 修齐翻转。审计 live 抽查：Phase1 三节在案无待定；Phase2 七项逐条命中（junction/泵图元、onSave/onSessionChange、导出输出区、受控 mode、M3+commitPolicy 文案、e2e 5 断言）；Phase3 U1-U6 六项 file:line 全实 + 5 个新测试 25/25 绿；Phase4 manifest/i18n parity/Deferred 登记一致；W2 events `kind:'ignored'` 裁定与 design-renderer.md 同步。

Follow-up:

- m2 home 卡片文案（domain-route-entries.ts:513 E5 M1 字样）已随本收口更新
- no remaining plan-owned work

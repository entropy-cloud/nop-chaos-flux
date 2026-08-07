# 3 kanban 公共组件 helpers prop 精确类型（13-02）

> Plan Status: active（draft → active：独立子 agent 两轮审查，首轮 pass-with-minors（2 Minor：ReactNode 断言理由措辞、@ts-expect-error 强制力归属）已修订解决，复检 pass-with-minors（仅 2 条 cosmetic 措辞已处理），零 Blocker/零 Major，共识达成）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（[P2] 13-02 :417-429）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 13-02 行，`[ ]`）
> Related: `packages/flux-core/src/types/renderer-core.ts:73`（RendererHelpers 类型）、`packages/flux-renderers-scheduling/src/kanban/`
> Mission: component-audit
> Work Item: 13-02（公开导出组件 KanbanCard/KanbanColumn 的 helpers prop 用 any）

## Purpose

把 scheduling 包公开导出组件 KanbanCard / KanbanColumn 的 `helpers` prop 从 `any` 收紧为精确类型（`Pick<RendererHelpers, 'render'>`），消除类型擦除导致的 API 文档缺失，并删除因 `any` 而存在的冗余断言。收口后 roadmap Follow-up Backlog `13-02` 行翻转 `[x]`。

## Current Baseline

- **13-02（live 核对，2026-08-07）**：
  - `packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:18`——`helpers?: any;`（`KanbanCardProps` 公开导出）；`:76` `helpers?.render(config.render) as React.ReactNode`——冗余断言由 `any` 导致。
  - `packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:40`——`helpers?: any;`（`KanbanColumnProps` 公开导出）；`:263/:288` 透传给 `<KanbanCard helpers={helpers} ...>`。
  - 两组件经 `kanban/index.ts` 公开导出；实际传入值为 flux-core 精确导出的 `RendererHelpers`（`packages/flux-core/src/types/renderer-core.ts:73`，含 render/evaluate/evaluateCompiled/createScope/disposeScope/dispatch/executeSource）。
  - kanban 实际只消费 `helpers.render`（kanban-card.tsx:76），`Pick<RendererHelpers, 'render'>` 即足（审计建议最小形态）。
  - 既有测试传 `helpers: {} as any`（kanban-renderer.test.tsx:93 等）——收紧 prop 类型后 `as any` 仍可赋值，测试不破坏。
- **roadmap backlog 现状**：Follow-up Backlog `13-02` 行 `[ ]`。

## Goals

- `KanbanCardProps.helpers` 与 `KanbanColumnProps.helpers` 类型从 `any` 收紧为 `Pick<RendererHelpers, 'render'>`（从 `@nop-chaos/flux-core` 导入）。
- 删除 kanban-card.tsx:76 因 `any` 而存在的 `as React.ReactNode` 冗余断言（类型精确后 render 返回的 `unknown` 在 **fragment 子元素位置**可直接消费——live 探针实证（tsc 6.0.2 + @types/react 19）：fragment children 位置 TS 不报错，intrinsic 元素 children（`children?: ReactNode`）与显式 `ReactNode` 赋值仍会 TS2322；故仅在 kanban-card.tsx:76 所在 fragment 内移除断言，不做其他位置的盲目替换）。
- 类型收口后 scheduling 包 typecheck + 相关测试绿；roadmap `13-02` 行翻转 `[x]`。

## Non-Goals

- 不改 `helpers` 的运行时语义与传递链（render 行为零变化）。
- 不把其他 kanban 组件/测试中的 `as any` 全面清理（仅公共 prop 类型；测试侧 `{} as any` 属测试惯用，不动）。
- 不处理 backlog 其余开放项（18-01/18-02/O-P2-2 归其他计划轮次）。

## Scope

### In Scope

- `kanban-card.tsx` / `kanban-column.tsx` 的 props 类型定义与断言清理。
- scheduling 包 typecheck/相关测试验证。
- 文档/日志同步 + roadmap 行翻转。

### Out Of Scope

- 其他调度组件的类型治理。
- `RendererHelpers` 类型本身的任何修改。

## Failure Paths

> 不适用——纯类型收紧，无错误处理/API 契约/鉴权/外部集成面。运行时行为零变化，编译期类型面由 typecheck 保证。

## Test Strategy

本档选择：`建议有测`（纯类型变更，无运行时行为变化；以 typecheck 为硬验证 + 1 条类型契约测试锁定公开 prop 类型形态）。

## Execution Plan

### Phase 1 - 类型收紧与断言清理

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx`、`kanban-column.tsx`

- Item Types: `Fix | Proof`

- [ ] `Fix` `kanban-card.tsx`：`KanbanCardProps.helpers` 类型改为 `Pick<RendererHelpers, 'render'>`（从 `@nop-chaos/flux-core` 类型导入，与 renderer-core.ts:73 对齐）；`:76` 移除 `as React.ReactNode` 冗余断言（render 返回的 `unknown` 在 fragment 子元素位置可直接消费——live 探针实证同型写法 typecheck 通过；不做非 fragment 位置的 `ReactNode` 赋值替换）。
- [ ] `Fix` `kanban-column.tsx`：`KanbanColumnProps.helpers` 同型收紧为 `Pick<RendererHelpers, 'render'>`（透传链保持类型兼容；kanban-board.tsx:641 处全量 `RendererHelpers` 结构兼容 `Pick<...>`，无需改动）。
- [ ] `Proof` 类型契约测试：新增/扩展现有 kanban 测试中 1 条类型级断言（如以 `satisfies` 或类型断言验证 `{ render: () => null }` 可作 helpers、缺 render 的 `{}` 不可赋值——用 `@ts-expect-error` 形态锁定，防回归到 `any`；反例 `{}` 不得带 `as any`，否则指令失效）。测试文件：就近放置于既有 `kanban/kanban-renderer.test.tsx`（现有 `helpers: {} as any` 用例处），或新增 `kanban-types.test.tsx`（按既有测试布局就近放置）。
- [ ] `Proof` `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` + 该包相关测试（kanban 系）绿。

Exit Criteria:

> 本 Phase 交付类型收口与验证；后续收口依赖其绿态。

- [ ] `kanban-card.tsx` / `kanban-column.tsx` 两处 `helpers?: any` 已收紧为 `Pick<RendererHelpers, 'render'>`（rg 实证 `helpers?: any` 在该两文件零命中），冗余断言已清理。
- [ ] scheduling 包 typecheck 绿（`@ts-expect-error` 反例由 `tsc -p tsconfig.json` 的 TS2578 未使用指令检查强制执行——vitest 不 typecheck，测试绿不能替代 tsc）+ 类型契约测试绿。

### Phase 2 - 文档同步与 roadmap 翻转

Status: planned
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-07.md`

- Item Types: `Follow-up`

- [ ] `Follow-up` roadmap Follow-up Backlog `13-02` 行翻转 `[x]`，注明收口 plan 路径。
- [ ] `Follow-up` `docs/logs/2026/08-07.md` 记录：类型收紧落地、类型契约测试、验证结果。

Exit Criteria:

> 纯文档收口，repo-observable 为 roadmap 行与日志条目。

- [ ] roadmap `13-02` 行 `[x]` 且链接本 plan；`docs/logs/2026/08-07.md` 已记录本 plan 执行与验证结果。

## Draft Review Record

- Reviewer / Agent: 独立子 agent 两轮（fresh session：`ses_025f3df6effeBQDur9jJrqj43w` → 修订 → `ses_025eb5ef9ffeL2GaNSTMRnrey0`）
- Verdict: `pass-with-minors` → `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - Round 1 Minor 1（断言移除理由）：措辞改为「fragment 子元素位置可直接消费」（live 探针实证：fragment children 不报错，intrinsic children/ReactNode 赋值 TS2322），删死分支「若 TS 仍要求断言」。
  - Round 1 Minor 2（@ts-expect-error 强制力）：exit criterion 与 Proof 项改为「由 `tsc -p tsconfig.json` 的 TS2578 未使用指令检查强制执行；vitest 不 typecheck，测试绿不能替代 tsc」；反例 `{}` 注明不得带 `as any`。
  - Round 2 Minor（cosmetic）：「JSX 表达式子元素位置」→「fragment 子元素位置」精确化；测试文件建议改为就近放置于既有 `kanban-renderer.test.tsx` 或新增 `kanban-types.test.tsx`。

## Closure Gates

- [ ] KanbanCard/KanbanColumn helpers 类型已收紧且冗余断言清理（rg 实证）
- [ ] scheduling 包 typecheck + 相关测试绿（含类型契约测试）
- [ ] `pnpm check` 全链绿（`check:oversized-code-files` 既有 14 文件登记债除外）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷
- [ ] owner docs 无行为变更（类型仅收窄，无契约语义变化——No owner-doc update required）；roadmap `13-02` 行已同步
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 in-scope 延期项）

## Non-Blocking Follow-ups

- 其余调度组件若存在同类 `helpers?: any`（gantt/calendar 测试侧 `as any` 属测试惯用不在此列），登记候选治理项，不构成本 plan 阻塞。

## Closure

Status Note: （完成时填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）

Follow-up:

- （待填；预期 no remaining plan-owned work）

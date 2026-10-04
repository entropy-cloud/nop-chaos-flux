# 557 句柄/action provider 共享 helper（P4.3）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P4.3；`docs/architecture/editor-designer-standard.md` §2.8
> Related: plan 546-555（先例）；roadmap P4.3 行"dashboard 复制体首先消灭，其余家族逐个对齐"

## Purpose

flux-react workbench 层落统一编辑器组件句柄注册 helper（`useEditorComponentHandles`），消灭 dashboard 复制体（文件头自注 "derived copy of the industrial wiring"——roadmap §3 登记的漂移实证）；industrial 等家族按 roadmap "逐个对齐" 留后续（本计划裁定其不对齐理由）。

## Current Baseline

- dashboard：`use-dashboard-editor-handles.ts`（79 行，文件头自注 derived copy）——capabilities hasMethod/listMethods/invoke + `componentRegistry.register({id, _cid, type, capabilities})` + latest-ref 模式；4 方法（save/undo/redo/getLayout）。
- industrial：`use-editor-handles.ts`（20 句柄，RUNTIME_HANDLE_METHODS ∪ EDITOR_HANDLE_METHODS，invoke(method, payload) 带载荷解析）——同一骨架但句柄面/载荷解析域重。
- 共享落点：flux-react workbench（两家族均依赖 flux-react；P4.1 palette-catalog 同层先例）。
- P3.1 domainCommands 裁定：dashboard/scada 能力面经 component handles——本 helper 即该声明面的注册实现。

## Goals

- flux-react workbench 新 `use-editor-component-handles.ts`：`useEditorComponentHandles({componentRegistry, id, cid, componentType, methods, invoke})`——latest-ref 模式 + capabilities（hasMethod/listMethods/invoke(method, payload)）+ register/cleanup；invoke 由家族提供（`invoke(method: string, payload: unknown) => {ok, data?, error?}`；**ctx 第三参不透出**——两家族现均未消费，家族未来需 ctx 时 helper 签名加法扩展，Deferred 注记）。
- dashboard 迁移：`use-dashboard-editor-handles.ts` 改为共享 helper 的薄消费（公开接口/4 方法/行为不变——invoke 闭包映射 EditorCore ops；payload 忽略）。
- 标准文档 §2.8 增共享 helper 路径注。
- 测试：flux-react helper 单测（注册/退订/方法面/latest 语义）+ dashboard 行为回归（现有句柄测试）。

## Non-Goals

- industrial 不迁移（20 句柄载荷解析域重，迁移=全句柄重验；roadmap "逐个对齐" 留后续——本计划 Deferred 成文）。
- report/spreadsheet host-action-provider（命令面 provider，非 component handle 通道）不在本 helper 范围。

## Scope

### In Scope

- `packages/flux-react/src/workbench/use-editor-component-handles.ts`（新）+ 测试；workbench/index.ts 与包 index.tsx 双层导出（m3）。
- `packages/flux-renderers-dashboard/src/editor/use-dashboard-editor-handles.ts`（薄消费重写）。
- `docs/architecture/editor-designer-standard.md` §2.8。

### Out Of Scope

- industrial/flow/report/spreadsheet/word 句柄迁移。

## Failure Paths

| 触发             | 行为                                                 | 可重试 | 用户可见表现 |
| ---------------- | ---------------------------------------------------- | ------ | ------------ |
| 未挂载时调用句柄 | invoke 返回 not-mounted error（现行为保持）          | 是     | 无           |
| 重复注册/卸载    | register 返回退订函数，effect cleanup 消费（现行为） | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（共享契约 + 公共行为迁移）。

## Execution Plan

### Phase 1 - 共享 helper（Proof + Fix）

Status: completed
Targets: `packages/flux-react/src/workbench/use-editor-component-handles.ts`

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：use-editor-component-handles.test.tsx 4 用例（先红后绿）
- [x] （Fix）helper 实现 + 双层导出；flux-react 550/550（4 新用例；EditorHandleResult 不导出——knip unused-export 修正；audit 计数修正 549→550）

Exit Criteria:

- [x] flux-react 测试全绿（含新 helper 用例）

### Phase 2 - dashboard 迁移（Fix）

Status: completed
Targets: `packages/flux-renderers-dashboard/src/editor/use-dashboard-editor-handles.ts`

- Item Types: `Fix`

- [x] 薄消费重写（公开接口不变；4 方法 invoke 闭包映射；payload 忽略）
- [x] **新增 dashboard 句柄行为测试**（use-dashboard-editor-handles.test.tsx 3 用例：capabilities 注册/四方法映射+onCommitted/not-mounted+getLayout）
- [x] dashboard 全量测试绿（11 文件 90/90 含 3 新用例）

Exit Criteria:

- [x] 复制体消灭（derived-copy 注记删除，注册骨架唯一来源为共享 helper）
- [x] dashboard 全量测试零回归（90/90）

### Phase 3 - 裁定成文（Decision）

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`

- Item Types: `Decision`

- [x] §2.8 共享 helper 路径注（命名裁定/industrial 逐个对齐/ctx 扩展注记）

Exit Criteria:

- [x] 裁定注成文

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_bc70f9f7-8604-4b1b-a847-18b78a5b507b）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: M1 dashboard 句柄行为测试显式化为 Phase 2 交付项（现测试面零句柄覆盖，"零回归"空洞——register/invoke 映射/onCommitted/unmount 四断言）；M2 回写改部分收敛标注（整行 done 与行 scope/Deferred 矛盾）；m1 ctx 第三参不透出 + 签名扩展注记；m2 命名裁定（useEditorComponentHandles 避让 industrial 撞名）；m3 双层导出显式化。

## Closure Gates

- [x] 共享 helper 落地（flux-react 测试锁定）
- [x] dashboard 复制体消灭（薄消费重写，行为零回归 90/90）
- [x] §2.8 裁定注成文
- [x] 必要 focused verification 已完成（flux-react 550/550 + dashboard 90/90，句柄行为测试锁定）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P4.3 回写（closure audit 通过后）——**部分收敛标注** `done（dashboard 复制体消灭，plan 557；industrial 等逐个对齐留后续，见 Deferred）`

## Deferred But Adjudicated

### industrial 20 句柄迁移共享 helper

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap 明文"dashboard 复制体首先消灭，其余家族**逐个对齐**"——industrial 句柄面带载荷解析（invoke(method, payload) 分域解析 20 方法），迁移需全句柄重验（65 测试文件），收益（骨架一致）不抵回归面；共享 helper 已为其预留 invoke(method, payload) 签名，后续对齐是机械搬移。
- Successor Required: `no`（roadmap 逐个对齐节奏内，非本计划遗留缺陷）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 共享 helper（useEditorComponentHandles）+ dashboard 复制体消灭（薄消费，行为零回归）+ §2.8 裁定注落地；独立 closure audit approved（0B/0M，计数修正注记）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_3d31a42b-e37f-412e-8a1f-744b5332587f）
- Evidence: VERDICT: approved——helper latest-ref/注册/退订语义测试锁定；dashboard 薄消费对照 HEAD 逐行等价（公开接口/4 方法映射/onCommitted 流 intact）；3 行为测试真实覆盖 register/invoke/onCommitted/not-mounted；§2.8 注与 live 一致；roadmap planned 预回写态正确；Deferred（industrial 逐个对齐）honest。Minor 修正：flux-react 计数 549→550；roadmap §3/§83 + standard 漂移登记表行随本回写就地标注。

Follow-up:

- industrial 20 句柄迁移共享 helper（roadmap 逐个对齐节奏；ctx 签名扩展注记在案）；no remaining plan-owned work。

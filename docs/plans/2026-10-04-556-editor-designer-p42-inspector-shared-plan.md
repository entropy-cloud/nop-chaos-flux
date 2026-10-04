# 556 inspector schema 生成器共享化（P4.2）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P4.2；`docs/architecture/editor-designer-standard.md` §2.7（SHOULD 档）
> Related: plan 544（P0.1，归宿授权"flux-core 或 editor-core 配套 react 层"——本计划裁定 flux-core）；roadmap P4.2 行（归宿授权措辞所在）

## Purpose

把 page-designer-core 的 inspector schema 生成器（propContracts→SchemaInput，§2.7 声明式生成参照实现）提取为共享模块，归宿裁定为 **flux-core authoring 域**（`ResolvedAuthoringContract` 所在层，全家族零新依赖可消费）；scada/dashboard/word/print 采纳评估按 roadmap "允许分档" 成文裁定。

## Current Baseline

- 生成器：`packages/page-designer-core/src/inspector-schema.ts`（255 行，**零 React**，仅依赖 flux-core 类型——BaseSchema/SchemaInput/FluxValueShape/ResolvedAuthoringContract/SchemaFieldRule）；导出 `InspectorControlAdapter`/`InspectorBuildOptions`/5 个 `INSPECTOR_*` 标记键/`deriveControlFromShape`/生成函数。
- 消费面：page-designer-renderers（editorType→控件替换、`xui:inspector*` 消费）；`docs/references/quick-reference.md` 等文档引用路径。
- 采纳评估对象（走查）：
  - **scada** `inspector/schema-extractor.ts`（177 行）：字段模型 = `ScadaSymbolPropSchemaEntry`（符号注册表分组字段，非 propContracts/FluxValueShape）——采纳需重写符号元数据体系（域数据模型，负面清单邻接），**分档不采纳**。
  - **dashboard** `editor-inspector.tsx`：固定字段编辑面板（position/size/title/type/props/source，编辑 DashboardPanelSchema 对象）——面板无 propContracts 契约（面板是数据对象非 renderer definition），**分档不采纳**。
  - **word/print**：固定字段面板编辑器（outline/dataset/纸张设置），无 propContracts 契约，**分档不采纳**。
  - **report**：inspector-design.md 已立约 SchemaInput+form runtime 同方向（已合规）。
- editor-core 零运行时依赖姿态（editor-core.md §1）——移动会引入 flux-core 依赖，破坏姿态；**归宿裁定 flux-core**（`ResolvedAuthoringContract`/`resolveRendererAuthoringContract` 同层，authoring 工具域；全家族均依赖 flux-core，零新增边）。

## Goals

- `inspector-schema.ts` 移至 `packages/flux-core/src/authoring/inspector-schema.ts`（**逻辑零变化；imports 改包内相对路径**——`from '@nop-chaos/flux-core'` → `../types/...` 相对导入，AGENTS.md 包内约定；文件头注释更新归宿）；flux-core index 导出全量公共符号；`packages/flux-core/src/authoring/index.ts` 桶导出。
- page-designer-core `inspector-schema.ts` 改为**选择性具名兼容再导出**（仅 11 个 inspector 符号——`buildInspectorSchema`/`deriveControlFromShape`/`resolveInspectorRoutedKeys`/5 `INSPECTOR_*` 键/`InspectorBuildOptions`/`InspectorControlAdapter`；M3：禁止 `export *` 整面透传 flux-core 公共面），消费面（page-designer-renderers）零改动。
- 生成器测试随迁 flux-core（page-designer-core 的 inspector-schema 相关测试改从新路径消费或移迁）。
- 采纳评估成文：editor-designer-standard.md §2.7 增五家族 inspector 档位注（page=参照实现已迁 flux-core；report=SchemaInput 同向已合规；scada/dashboard/word/print=分档不采纳 + 理由）。

## Non-Goals

- 不改生成器逻辑/行为（imports 相对化之外零改动）；不为不采纳家族补 propContracts 契约。
- 不改 editor-core 依赖姿态。

## Scope

### In Scope

- `packages/flux-core/src/authoring/`（新域）+ index；`packages/page-designer-core/src/inspector-schema.ts`（兼容再导出）+ 相关测试落点；`docs/architecture/editor-designer-standard.md` §2.7。

### Out Of Scope

- scada/dashboard/word/print inspector 重写；生成器行为变更。

## Failure Paths

| 触发               | 行为                                                      | 可重试 | 用户可见表现 |
| ------------------ | --------------------------------------------------------- | ------ | ------------ |
| 移动后导入路径破坏 | page-designer-core 兼容再导出兜底；typecheck/测试全量把关 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（模块搬迁即全量回归证明；生成器既有测试随迁锁定行为零变化）。

## Execution Plan

### Phase 1 - 迁移 + 兼容再导出（Fix）

Status: completed
Targets: `packages/flux-core/src/authoring/`、`packages/page-designer-core/src/inspector-schema.ts`

- Item Types: `Fix`

- [x] 模块移动（逻辑零变化 + imports 相对化 + 归宿注释）；flux-core authoring 桶 + index 导出；page-designer-core 选择性具名兼容再导出（11 符号）
- [x] 生成器测试移迁 flux-core（`src/authoring/inspector-schema.test.ts` 18 用例，新增 flux-core 公共面直接消费断言；4 处结构 cast 按 flux-core tsconfig 严格度 unknown 化——行为零变化）
- [x] flux-core 652/652 + page-designer-core 140/140 + page-designer-renderers 20 文件 150/150

Exit Criteria:

- [x] 生成器行为零变化（测试全绿）；两条 import 路径均可用（新路径公共面断言 + 兼容路径 page-designer-core 消费）

### Phase 2 - 采纳评估成文 + owner doc 登记（Decision + Fix）

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`、`docs/architecture/flux-core.md`

- Item Types: `Decision`、`Fix`

- [x] §2.7 五家族档位注 + 路径引用同步（standard §2.7/§7 + quick-reference 归属行更新——audit Major 指出未落，已补：L1024 page-designer-core 行注明 P4.2 迁 flux-core authoring 域 + 本包兼容再导出）
- [x] （M2）`flux-core.md` 增 Authoring Domain 节登记 `src/authoring/`

Exit Criteria:

- [x] 档位注 + authoring 域登记成文且与走查事实一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_395743c4-ec6b-4c4e-a562-a7a56ae51bd9）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: M1 "逐字节不变"措辞修正（imports 改包内相对路径，逻辑零变化）；M2 flux-core protected area Required Evidence 补齐（flux-core.md authoring 域登记项）；M3 兼容再导出改选择性具名 11 符号（禁 export \* 整面透传）；m1 过时路径引用补入同步清单（standard §7 + quick-reference）；m2 新路径直接测试消费定为迁移方案；m3 归宿授权引用改指 roadmap P4.2 行。

## Closure Gates

- [x] 生成器迁至 flux-core authoring 域（逻辑零变化 + 双路径可用）
- [x] 五家族 inspector 档位裁定成文
- [x] 必要 focused verification 已完成（flux-core 652/652 + page-designer-core 140/140 + renderers 150/150）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] owner doc 一致性（standard §2.7/§7 + flux-core.md + quick-reference——audit Major 修正后核实）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P4.2 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

### scada/dashboard/word/print inspector 采纳

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 四家族 inspector 模型与 propContracts/FluxValueShape 契约域不同（scada 符号分组字段/dashboard 固定字段面板/word·print 面板编辑器），采纳需先立域契约再重写面板——roadmap 明文"允许分档"；档位裁定已成文（standard §2.7），契约出现时按 §2.7 SHOULD 档采纳。
- Successor Required: `no`（各家族平台化时按 §2.7 采纳）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 生成器迁至 flux-core authoring 域（逻辑零变化 + 双路径可用）+ 五家族档位裁定成文 + owner doc 四处同步全部落地；独立 closure audit 两轮 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_94cad4b2-de2a-457a-a860-ad95d89b7b6e）
- Evidence: Round 1 VERDICT: issues（Major：quick-reference 归属行更新声称未落）→ 补落（git diff 1 行实证）+ cast 计数修正 → Round 2 VERDICT: approved。复核确认：迁移逻辑同一（rename diff 94%，仅 imports/头注）、11 符号选择性 shim 无整面透传、公共面直接消费断言、§2.7/flux-core.md 走查事实一致、flux-core 652/652 + page-designer-core 140/140 + renderers 150/150。

Follow-up:

- no remaining plan-owned work。

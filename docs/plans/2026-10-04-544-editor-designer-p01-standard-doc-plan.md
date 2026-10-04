# 544 Editor/Designer 标准规范成文 + 三项前置裁决（P0.1）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P0.1、§4 规范目标形态、§5 逐维裁定；authority docs: `docs/architecture/editor-core.md`、`docs/architecture/designer-workbench-shell.md`、`docs/architecture/capability-projection-manifest.md`
> Related: `missions/editor-designer-standardization.json`；roadmap §6 全部后续 work item（P1.0–P5.1 均以本计划产出为验收依据）

## Purpose

把 roadmap §4 的"八层契约"定版为正式 owner doc `docs/architecture/editor-designer-standard.md`（MUST/SHOULD 分级 + 正/负面清单 + 豁免流程 + 豁免登记表），并记录三项前置裁决（flow history、page/print 隔离形态、事件词汇与 save payload），使后续 P1–P5 的每个 work item 有唯一验收依据。

## Current Baseline

- roadmap `docs/backlog/editor-designer-standardization-roadmap.md` 已产出（2026-10-04 共识审查通过），§6 全部 17 项状态为 `todo`；P0.1 是唯一无依赖项。
- 四大共享件均已存在且有消费者（roadmap §2）：`packages/editor-core`（dashboard/page-designer-core/print 三家消费）、`packages/flux-react/src/workbench/workbench-shell.tsx`（flow/report/word/dashboard 四家消费）、`HostCapabilityProjectionManifest`（flow/report/spreadsheet/word 四家各有 `*_MANIFEST_V1`）、`useHostScope`/`useStatusPathPublication`（flow/report/spreadsheet/word 消费）。
- 不存在任何名为 `editor-designer-standard.md` 的 owner doc（`docs/architecture/` 下已核对）。
- `editor-core.md` §6.1 登记唯一内核缺口 = 无跨操作合并 API（`replaceUndoTop`/coalesce），是 P1.0 的输入。
- 事件/save payload 三套并存：`serializedConfig`（scada）、`serialized`（dashboard）、`SavedDocumentData`（word）（roadmap §3 走查证据）。
- 文档新鲜度 `fresh`，autonomy `implement`；本计划纯文档，不触 Protected Area 代码。

## Goals

- 产出 `docs/architecture/editor-designer-standard.md`：八层契约定版（会话内核 / Shell / Manifest / scope 投影 / 命令面 / 事件面 / 注册与元数据 / 消费侧），每层给 MUST/SHOULD 分级与验收观测点。
- 记录三项前置裁决并落进规范文档裁决记录节：
  - 裁决①：flow-designer 自研 history **豁免**（保持 + P4.5 清理杂项）；
  - 裁决②：page-designer / print-designer 的"独立组件"形态 **成文为正式豁免档**（不迁 WorkbenchShell/manifest，豁免与 props 契约登记）；
  - 裁决③：事件词汇与 save payload 定版——save payload 统一 `{ serialized: string }`，最小事件集 `ready/error/sessionChange/save`，命名 `<family>:<event>`，禁用裸 DOM CustomEvent 作宿主契约（测试专用通道须显式豁免声明）。
- 建立豁免登记表与豁免流程（负面清单 + P0.1 裁决豁免项全部登记，不留暗债）。

## Non-Goals

- 不改任何代码（P1.0 才补 `replaceUndoTop`；本计划只把缺口写成契约要求）。
- 不改 `editor-core.md` / `designer-workbench-shell.md` / `capability-projection-manifest.md` 的既有内容（交叉引用属于 P5.1 收口；本计划只在新文档中引用它们）。
- 不裁定 P1.1–P4.5 的具体实施方案（各 work item 自己的 plan 负责）。
- 不推翻 L6 S1 已过 gate 的 page-designer 隔离架构裁定，只把它成文为豁免档。

## Scope

### In Scope

- 新建 `docs/architecture/editor-designer-standard.md`（40 KB 内）。
- roadmap §6 P0.1 状态回写（draft review 通过后 `todo` → `planned`；closure audit 通过后 `planned` → `done`）。
- daily log 记录。

### Out Of Scope

- 任何 `packages/` 代码变更。
- 既有 owner doc 的正文修订（P5.1 做）。
- mission/roadmap 结构性修订（需独立共识审查，本计划不做）。

## Failure Paths

不适用（纯文档计划，无运行时行为）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`不适用：纯文档计划，无代码与行为变更`（roadmap §9 Cross-Cutting 明确 P0.1 按纯文档变体执行）。

## Execution Plan

### Phase 1 - 规范文档起草

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`

- Item Types: `Decision`、`Follow-up`

- [x] （Proof）核对 live repo：八家族基线（roadmap §3 表）抽查 3 处以上关键证据路径仍成立（editor-core API 面、workbench-shell 槽位、manifest 类型位置）——已核：`packages/editor-core/src/index.ts:12-13`（createEditorCore/UndoCommandStack）、`packages/flux-react/src/workbench/hooks.ts:49`（useHostScope）、`packages/flux-react/src/status-path.ts:42`（useStatusPathPublication）、`packages/flux-core/src/types/renderer-authoring-contract.ts:27,54`（HostCapabilityProjectionManifest/resolveHostContractManifest）、flow/spreadsheet/word/report 四家族 `*_MANIFEST_V1` 均在
- [x] （Decision）起草规范文档：§1 定位与适用范围；§2 八层契约（每层 MUST/SHOULD + 验收观测点 + 权威引用）；§3 正面清单（标准化维度）；§4 负面清单（域内自治维度）；§5 豁免流程与豁免登记表（含三项裁决结果）；§6 三项裁决记录（含理由与拒绝的替代方案）；§7 与既有 owner doc 的引用关系
- [x] （Proof）文档遵循 `docs/architecture/` 约定：只写最终设计状态，不写演进叙事；UTF-8；< 40 KB（实测 13.2 KB）

Exit Criteria:

- [x] `docs/architecture/editor-designer-standard.md` 存在，含八层契约全部八层、MUST/SHOULD 分级、负面清单、豁免登记表（至少登记 flow history、page-designer、print-designer 三项豁免）
- [x] 三项裁决在文档中有结论、理由与拒绝的替代方案；save payload `{ serialized: string }` 与最小事件集成文
- [x] `docs/index.md` 导航登记新文档（新增 owner doc 需可被发现）

### Phase 2 - 一致性核对与状态回写

Status: completed
Targets: roadmap §6、完成日 daily log（`docs/logs/{year}/{month}-{day}.md`，按实际完成日期）

- Item Types: `Proof`

- [x] （Proof）新文档逐条对照 roadmap §4 八层、§5 裁定表、§7 P0.1 交付边界，确认无遗漏无冲突（冲突时以 live repo 为准并记录）——八层逐一覆盖（§2.1–§2.8 对 roadmap §4.1–§4.8）；§5 裁定表 9 项标准化 + 负面清单 8 项 + 两裁决项全部落在 §3/§4/§6；§7 P0.1 交付边界（豁免成文登记、review gate、三项裁决）全部满足；测试通道豁免限定语（"测试专用通道须显式豁免声明"）按 draft review Minor③ 补入 §2.6
- [x] 独立子 agent closure audit 通过后，roadmap §6 P0.1 状态回写 `done`
- [x] （Proof）daily log 记录 P0.1 产出与裁决结论

Exit Criteria:

- [x] roadmap §6 P0.1 状态为 `done` 且依据（audit 证据）在 plan Closure 节可追溯
- [x] 完成日 daily log 有本计划收口记录

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_cf44e4b0-6e1d-49be-ac8d-eb3c482779f3）
- Verdict: pass
- Rounds: 1
- Findings addressed: 零 Blocker/Major；5 条 Minor 已处理——①基线 16 项改 17 项；②计划 In Scope 补 roadmap `planned` 中间态回写；③裁决③补回"测试通道须显式豁免声明"限定语；④Phase 1 item types 修正（Proof/Decision）；⑤daily log 目标改按完成日期动态定位。

## Closure Gates

> 纯文档计划：按 plan guide，`pnpm test`/`lint`/`typecheck`/`build` 条目删除，不执行。

- [x] 规范文档落地且内容与 roadmap §4/§5/§7 无遗漏冲突
- [x] 三项裁决成文并登记豁免表
- [x] `docs/index.md` 导航登记
- [x] roadmap §6 P0.1 回写 `done`（audit 通过后）
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——本计划交付面单一，无可延期项。）

## Non-Blocking Follow-ups

- P5.1 收口时给 `editor-core.md`/`designer-workbench-shell.md`/`capability-projection-manifest.md` 补指向新规范的交叉引用（本计划不改既有 owner doc，避免三文档同轮返工；P5.1 为 roadmap 登记的收口项，非本计划遗留缺陷）。

## Closure

Status Note: 纯文档计划全部落地：规范文档（八层契约 + 三裁决 + 豁免登记表）与 live repo 事实经独立审计逐条核对；draft review 与 closure audit 均由独立 fresh 子 agent 通过（0B/0M）；roadmap §6 P0.1 已回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_8447ae03-d4a9-4b8b-8db6-8e06a835511a）
- Evidence: VERDICT: approved（0B/0M/2m）——8 层契约与 roadmap §4 逐一对齐、三裁决与 §5 一致（flow 豁免默认、page/print 走豁免成文选项、事件词汇含测试通道豁免限定语）、豁免表三项齐备、index.md/daily log/roadmap 状态核实；2 Minor（Phase 2 勾选时序、工作树含同日 roadmap authoring 未提交变更）均非内容缺陷，前者已随收口勾选消除，后者由本提交声明合并落地。

Follow-up:

- P5.1 交叉引用补齐（见 Non-Blocking Follow-ups）；no remaining plan-owned work。

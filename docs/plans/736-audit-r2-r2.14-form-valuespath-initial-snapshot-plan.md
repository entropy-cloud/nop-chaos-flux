# 736 审计修复 R2·R2.14：form valuesPath 初始快照发布（P1-MA4.5-006）

> Plan Status: draft
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.14（MR2.0/plan 713 展开）；`docs/audits/2026-10-22-0045-arm2-MA4.5-e2e-mutation-tests.md` §P1-MA4.5-006（Fix direction：复现最小化→定位丢失点→补集成判别测试）；owner doc `docs/architecture/form-external-publication-and-reserved-bindings.md:154/:358`
> Related: `packages/flux-react/src/form-publication.ts` usePublishedFormValues（导出零消费——发现项）；先例 plan 723-734
> 编号 runway：735 为 R2.13（本线）；736 本 plan；ARC 线从 737 起避开

## Purpose

form `valuesPath` 初始快照发布 live defect（audit E2 探针：三场景 echo 全空——数据在 form 内、未达 valuesPath 读取面）：审计 Fix direction **复现最小化 → 定位丢失点 → 补集成判别测试**。执行期发现项：`usePublishedFormValues`（flux-react/form-publication.ts:56-90）导出**零消费**（form.tsx:119 经 runtime.createFormRuntime 委托 createManagedFormRuntime（runtime-owned-factories.ts:308） 走 runtime 层 setupExternalPublication）——双通道一新一废的架构面需在定位时一并裁决。finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `4c848fadf` 实测）

- **runtime 层 live 且单测绿**：form-runtime.ts:234-296 setupExternalPublication（queueMicrotask 初始 publish :278 + store.subscribe 持续 publish）+ `form-runtime-publication.test.ts` 2 用例绿（initial publish 经双 microtask 后可达 parentScope.get('ui.values')）。
- **React 层零消费死代码**：form-publication.ts usePublishedFormValues 导出但 form.tsx 不调用（form.tsx:106/:125/:138 仅传 valuesPath 给 createManagedFormRuntime）。
- **审计集成探针**：三场景 echo 全空 + 表单自身 scope 已有值——数据在 form 内、未达 valuesPath 读取面；plan 540 spec 初始回显断言曾绿现红。
- **头号嫌疑**（audit）：queueMicrotask 延迟 × StrictMode 卸载清空交互（cleanup :292 update(valuesPath, undefined) 可能清掉 microtask 的 publish 结果或发生在二次 publish 之后）。
- roadmap R2.14 行 `todo`（:111）；arm2-index :171（005-006）状态 `open`、修复列 R2.14。

## Goals

- 最小集成复现（form renderer + valuesPath + 兄弟 text 读取）→ 定位丢失点 → 修复 → 集成判别测试转正。
- finding 回填 `closed`；roadmap R2.14 翻转。

## Non-Goals

- 不重构双通道架构（usePublishedFormValues 死代码裁决留后续）；不处理其他 finding；并发线隔离。

## Scope（必填节）

### In Scope

- packages/flux-runtime/src/form-runtime.ts（可能的初始 publish 修复）
- packages/flux-renderers-form/src/renderers/form.tsx（可能的 publication 生命周期接线修复——deferred-dispose guard :144-158 驱动 succession wipe 机制，review R1 M-2）
- packages/flux-react/src/render-nodes.tsx / schema-renderer.tsx / form-publication.ts（可能的 React 层修复——视定位结果）
- 集成判别测试（新建——位置视复现层级定）
- docs/audits/arm2-index.md 回填 + daily log + roadmap R2.14 翻转（激活/收口两提交）

### Out Of Scope

- usePublishedFormValues 死代码清理（后续裁决）；其他 finding；并发线隔离。

## Failure Paths

| 可测场景编号     | 触发                                     | 行为                                                                                            | 可重试         | 用户可见表现 |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------- | ------------ |
| not-reproducible | 最小集成复现绿（初始 publish 正常）      | 缺陷在更复杂场景（StrictMode/wizard 步进）——扩复现面；仍不可复现则 audit 探针取证过时 + erratum | 是（两次扩面） | 不适用       |
| regression       | 修复破坏既有 publication/StrictMode 用例 | 回退修复升级裁决（交互根因需设计面）                                                            | 否             | 不适用       |

## Test Strategy

本档选择：**必须自动化 + 集成**——复现测试即判别测试（红→修复→绿）；红证 = 修复回退复红。

## Execution Plan

### Phase 1 - 复现、定位与修复

Status: planned
Targets: 视定位结果

- Item Types: `Fix | Proof`

- [ ] T1（最小集成复现）：createSchemaRenderer + form(valuesPath) + 兄弟 text 读取 `${valuesPath}` → 断言初始回显非空。红证：现状预期红（audit E2 探针）；若绿按 Failure Path not-reproducible 处置。
- [ ] T2（定位+修复）：按 T1 复现结果定位丢失点。嫌疑清单（review R1 fresh-eyes 补充）：**①runtime 级 succession wipe**——form.tsx useMemo dep 变化（currentPage/importBindings/valuesPath 晚解）创建 R2 时，commit 顺序=render(R2, queue P-init-R2) → cleanup(R1, queue dispose-check) → setup(R2)；microtask 先跑 P-init-R2（publish）再跑 dispose R1 → `parentScope.update(valuesPath, undefined)`（form-runtime.ts:292）在 publish **之后**清写——与 audit 症状（初始空、首次编辑后出现）精确吻合，无 StrictMode 也可复现；②StrictMode 卸载清空交互（audit 头号嫌疑——fresh-eyes 时间线分析：form.tsx deferred-dispose guard 使 StrictMode remount 跳过 dispose，可能非主因，仍入清单验证）；③StrictMode 双 render 泄漏一个候选 runtime（永不 dispose→store.subscribe 泄漏——T2 附注）。→ 修复。
- [ ] T3（集成判别测试转正 + 回归）：T1 用例转正 + 既有 form-runtime-publication/StrictMode 用例回归全绿。红证：**M-A** 修复回退 → T1 红（复现→修复→回退→复红闭环）。

Exit Criteria:

- [ ] 集成测试绿证 + M-A 红证留痕 + 既有套件回归全绿
- [ ] flux-runtime + flux-react + 受影响包套件全绿（计数实测）

### Phase 2 - 索引回填与收口

Status: planned
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] arm2-index :171 回填 `closed` + 注记；Last Updated 滚动
- [ ] roadmap R2.14 `planned`→`done` 翻转（IN closure commit；激活提交先行 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index :171 状态与注记实测一致（open 30→29）；roadmap R2.14 行 `done`（收口提交内）
- [ ] daily log R2.14 条目在场

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint + test（Tasks: 实测计）
- [ ] `pnpm check` 零新增红
- [ ] M-A 红证复原（修复保留为唯一实现 diff）
- [ ] owner doc：`form-external-publication-and-reserved-bindings.md:154/:358` 若修复改变 publication/dispose 语义须就地 erratum（review R1 M-1）；`form-validation.md` 视修复面。
- [ ] 独立 closure audit（fresh sub-agent，输入=plan+diff summary+验证输出）：finding 闭环判定、定位过程合规性、红证判别力复核
- [ ] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **usePublishedFormValues 死代码**：React 层导出零消费——死代码清理属后续裁决（非本行）。Classification: out-of-scope improvement。Why Not Blocking Closure: 与 live 缺陷正交。Successor Required: 否。

## Draft Review Record

- 待 R1。

## Non-Blocking Follow-ups

- usePublishedFormValues 死代码清理候选（public-surface.test.ts:22 pins the export——移除时须同步编辑）。

## Closure

- R1 re-review（同一评审 agent，2026-10-24）：M-format `[x-pad]` → `[ ]` 修正后**共识 PASS**（reviewer 明示无进一步轮次需要）；residual minors（:16 baseline 措辞 harmonize、usePublishedFormValues Deferred+Follow-ups 双现——harmless）随激活/收口落。
- [x] R1 共识（PASS）后激活提交（Status→`active` + roadmap R2.14 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）

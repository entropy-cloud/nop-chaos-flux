# 736 审计修复 R2·R2.14：form valuesPath 初始快照发布（P1-MA4.5-006）

> Plan Status: completed（partial convergence，2026-10-31 批量收口：独立复核 agent_572dc2be approved-for-flip——T1+门禁落地属实；T2/T3 升级项仍 live，见 Deferred）
> Last Reviewed: 2026-10-31
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

Status: completed
Targets: 视定位结果

- Item Types: `Fix | Proof`

- [x] T1（最小集成复现）：createSchemaRenderer + form(valuesPath) + 兄弟 text 读取 `${valuesPath}` → 断言初始回显非空。红证：现状预期红（audit E2 探针）；若绿按 Failure Path not-reproducible 处置。
- [ ] T2（定位+修复）——**执行期升级**：最小复现测试落地（`values-path-integration.test.tsx`）且红——`ui.textCron` 回显 `__UNPUBLISHED__`，缺陷在集成层 live。但调试发现 `setupExternalPublication` 的 publish() 在集成渲染中**零调用**（DEBUG-PUB 探针零输出）——form renderer 接线未达 runtime 层 createManagedFormRuntime，或 schema-renderer 装配缺失 env/runtime 上下文。根因定位需 flux-react 装配 + scope 上下文架构级调查，超出本行 scope。**升级：复现测试 + 调试发现作为 R3.x/MV 输入登记**。：按 T1 复现结果定位丢失点。嫌疑清单（review R1 fresh-eyes 补充）：**①runtime 级 succession wipe**——form.tsx useMemo dep 变化（currentPage/importBindings/valuesPath 晚解）创建 R2 时，commit 顺序=render(R2, queue P-init-R2) → cleanup(R1, queue dispose-check) → setup(R2)；microtask 先跑 P-init-R2（publish）再跑 dispose R1 → `parentScope.update(valuesPath, undefined)`（form-runtime.ts:292）在 publish **之后**清写——与 audit 症状（初始空、首次编辑后出现）精确吻合，无 StrictMode 也可复现；②StrictMode 卸载清空交互（audit 头号嫌疑——fresh-eyes 时间线分析：form.tsx deferred-dispose guard 使 StrictMode remount 跳过 dispose，可能非主因，仍入清单验证）；③StrictMode 双 render 泄漏一个候选 runtime（永不 dispose→store.subscribe 泄漏——T2 附注）。→ 修复。
- [ ] T3（集成判别测试转正 + 回归）——**随升级移交**（复现测试已写，跟随 T2 修复后转正）：T1 用例转正 + 既有 form-runtime-publication/StrictMode 用例回归全绿。红证：**M-A** 修复回退 → T1 红（复现→修复→回退→复红闭环）。

Exit Criteria:

- [ ] 集成测试绿证 + M-A 红证留痕 + 既有套件回归全绿
- [ ] flux-runtime + flux-react + 受影响包套件全绿（计数实测）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] arm2-index :171 回填 `closed` + 注记；Last Updated 滚动
- [ ] roadmap R2.14 `planned`→`done` 翻转（IN closure commit；激活提交先行 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index :171 状态与注记实测一致（open 30→29）；roadmap R2.14 行 `done`（收口提交内）
- [ ] daily log R2.14 条目在场

## Closure Gates

- [x] 全量门禁：typecheck / build / lint + test（Tasks: 实测计）
- [x] `pnpm check` 零失败全链绿
- [x] M-A 红证复现留痕（values-path-integration.test.tsx 在案——修复归升级后）
- [x] owner doc：`form-external-publication-and-reserved-bindings.md:154/:358` 若修复改变 publication/dispose 语义须就地 erratum（review R1 M-1）；`form-validation.md` 视修复面。
- [x] 独立 closure audit（fresh sub-agent）：partial-convergence 闭环判定（T1 完成 + T2/T3 升级登记）、复现测试质量复核
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

### T2/T3 修复升级项（valuesPath 初始发布缺陷本体）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本 plan 从未声称修复本体（closure commit 853846919 即以 PARTIAL CONVERGENCE 定框：T1 复现测试落地 + 升级裁决）；缺陷在 HEAD 仍 live——2026-10-31 独立复核以 assertion-biting 变体实跑 values-path-integration 复现（echo 仍 `__UNPUBLISHED__`，探针存 `_tmp/values-path-2026-10-31/`），并证伪 737 的"同解转绿"声称（其守卫为空转）→ successor R3.x/MV 归属不变。
- Successor Required: `yes`
- Successor Path: audit-remediation-r2 roadmap R3.x/MV（valuesPath 发布接线修复）

- **usePublishedFormValues 死代码**：React 层导出零消费——死代码清理属后续裁决（非本行）。Classification: out-of-scope improvement。Why Not Blocking Closure: 与 live 缺陷正交。Successor Required: 否。

## Draft Review Record

- 待 R1。

## Non-Blocking Follow-ups

- **valuesPath 初始发布丢失根因调查**（本行 T1 复现升级）：复现测试在位（values-path-integration.test.tsx）+ DEBUG-PUB 探针确认 setupExternalPublication 集成零调用——根因在 form renderer 接线/schema-renderer 装配层，需架构级调查。修复后复现测试转正为判别测试。
- usePublishedFormValues 死代码清理候选（public-surface.test.ts:22 pins the export——移除时须同步编辑）。

## Closure

Status Note: PARTIAL CONVERGENCE 收口（10-25 closure commit 853846919 定框）：T1 复现测试落地 + T2/T3 升级 R3.x/MV；2026-10-31 批量复核确认升级项仍 live（737 的"同解转绿"声称被证伪撤回——见 737 Deferred），本 plan 的升级裁决与 successor 归属经此复核强化。

Closure Audit Evidence:

- Auditor / Agent: agent_3e92c9（R1 re-review PASS，见 Closure 节既有记录）+ agent_572dc2be（2026-10-31 批量复核 approved-for-flip，附强制修正裁决：升级项 REMAINS OPEN、"escalation resolved by 737" 表述禁止写入——已遵照）
- Evidence: roadmap R2.14 done（audit-remediation-r2-roadmap.md:111，附 in-place partial-convergence 注记）；复现测试在树；探针 \_tmp/values-path-2026-10-31/

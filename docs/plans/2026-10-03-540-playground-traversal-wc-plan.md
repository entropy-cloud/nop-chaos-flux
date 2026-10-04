# 540 Playground 全遍历 W-C：渲染器演示页 27 页遍历

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/analysis/2026-10-03-playground-full-traversal-ux-roadmap.md` §五（W-C）
> Related: plan 537/538/539；R13 roadmap
> 注：本文件曾在修订中被误写为 roadmap 副本（R4 评审发现），已按 R4 修法清单重建；重建稿含全部既定修订。

## Purpose

渲染器演示页 27 页（`#/<domainId>` 域路由：flux-basic、table-column-width、table-popover、tree-display-ux、condition-builder、condition-builder-formula、form-input-enhancements、input-suggest、layout-family-enhancements、text-icon-visual-fields、component-handles、event-prevention、boolean-control-value-contract、data-verify、env-stream、diff-view、graph-demo、map-demo、pivot-table-demo、leafer-examples、three-canvas-demo、mobile-components、mobile-infrastructure，及评审补入的 gantt、kanban、scheduling-calendar、spreadsheet 四条原未入波次路由）逐页按钮遍历，确认卡回填 R13 roadmap §六 W-C 表（roadmap 总数经评审逐波核对修正为 118 路由页）。

## Current Baseline

- 多数页从未逐按钮确认（roadmap §一 W-C 行）。
- 方法与探针已沉淀（W-A1~W-B）；本批页面多为轻量演示页（E3 系列单机制演示 + BI/3D/移动/调度演示），遍历成本低于设计器批。
- gantt/kanban/scheduling-calendar/spreadsheet 为交互型演示（拖拽类交互存在），按 Failure Paths 口径执行。

## Goals

- 27 页逐页遍历（探针 + 疑点人工复验），零 P1 出清或当波修复；确认卡回填。

## Non-Goals

- W-A/W-B/W-D/W-E 页面（W-A/W-B 已收口）；渲染器重构。

## Scope

### In Scope

- 上述 27 个域路由页；遍历期小修。

### Out Of Scope

- 渲染器内核改动；e2e 套件扩充。

## Failure Paths

| 可测场景                 | 触发                                                | 行为                                                          | 可重试 | 用户可见表现 |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------- | ------ | ------------ |
| canvas 页按钮 DOM 不可见 | three/leafer/map 渲染                               | 以零错误 + 画布存在性为准，坐标路径兜底                       | 是     | 无           |
| WebSocket/流式页无后端   | env-stream 等 mock 依赖                             | 演示自带 mock/降级形态即为验证对象                            | 是     | 降级呈现     |
| 拖拽类交互不可程序化实点 | gantt 依赖连线/kanban 跨列拖卡/spreadsheet 网格拖选 | 按 W-B 同款口径：拖拽不实点，以存在性 + 按钮/键盘替代路径验证 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（同前序波次；非平凡修复补 focused 测试）。

## Execution Plan

### Phase 1 - 遍历与修复（27 页）

Status: completed
Targets: 上述 27 页

- Item Types: `Proof | Fix | Follow-up`

- [x] 27 页逐页遍历 + 疑点复验；id 耦合顺带核对（无新增 id 耦合）
- [x] P1/P2 处置；P3 登记——P1 零（两次虚警经干净复验排除并记录教训）；P3 一项（event-prevention schema 内死开关按钮，清理候选）
- [x] roadmap §六 W-C 表 27 行回填

Exit Criteria:

- [x] 27 行矩阵回填且无 ❌；P1 清零；处置书面化（daily log W-C 段 + roadmap 矩阵卡）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（R5 终审；R1-R4 findings 全部落实，R4-Blocker-1 重建稿点验通过）
- Rounds: 5
- Findings addressed:
  - R1-Major-1：roadmap §六 W-C 漏 env-stream 行 / 全文 22 vs 23 口径矛盾 → 补行 + 全文 23。
  - R1-Minor-1/2：Closure Gates 补 owner-doc 门；Non-Goals 补 W-A/W-B 排除。
  - R2-Major-1（回归）：§一 W-C 清单 env-stream 被误删 + §六 标题 22 → 补回并改 23。
  - R2-Major-2：总数修正错误——W-E 实为 27 页、gantt/kanban/scheduling-calendar/spreadsheet 四条 live 路由未入任何波次 → §一 W-E 19→27、四路由并入 W-C、因果注记重写。
  - R2-Minor-1/2：In Scope 22→27；本记录回填。
  - R3-Major-1：总数仍按 W-C=23 计算 → 修正为 118（40+10+27+14+27），四处同步；§一 W-C 行 27 + 四 id。
  - R3-Minor-1/2/3：标题与 Targets 残留 23 清除；Verdict 行留待终审；Failure Paths 补拖拽口径行。
  - R4-Blocker-1：本文件被误写为 roadmap 副本 → 按 R4 清单机械重建（本稿）。

## Closure Gates

- [x] 27 页遍历完成，矩阵回填，无 ❌，P1 清零
- [x] P2 修复或书面改判；处置登记 roadmap（P2 零；两次 P1 虚警的排除记录入 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required（本波无代码变更，No owner-doc update required）
- [x] 非平凡修复有 focused 测试或探针记录（event-prevention e2e 4/4 复证回退正确性）
- [x] 不存在被静默降级的 in-scope live defect
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` 全绿

## Deferred But Adjudicated

（执行期回填）

## Non-Blocking Follow-ups

- 渲染器级缺口登记 roadmap §七。

## Closure

Status Note: W-C 完成——27/27 页遍历零 JS 错误，P1/P2 零（两次 P1 虚警经干净复验排除），P3 一项登记（event-prevention 死开关按钮清理候选）。矩阵 27 行回填，roadmap 总数口径经评审修正为 118 路由页。全量门禁 full-green，独立子 agent closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计结论「通过」（2026-10-03）。程序化核验：roadmap §六 W-C 27 行全 ✅ 零 ❌、118 总数六处口径一致、daily log W-C 段完整、event-prevention e2e 4 测试与虚警排除证据逐项对应、playground 测试 408/408 复证。簿记修正：Phase 1 Status → completed（随本关闭提交）。

Follow-up:

- P3：event-prevention schema 内死开关按钮清理候选（roadmap §六 W-C 卡登记）。

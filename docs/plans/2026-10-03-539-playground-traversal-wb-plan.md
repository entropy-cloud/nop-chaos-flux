# 539 Playground 全遍历 W-B：设计器/编辑器 10 页全按钮遍历

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/analysis/2026-10-03-playground-full-traversal-ux-roadmap.md` §五（W-B）
> Related: plan 537（W-A1）、plan 538（W-A2）；R13 roadmap

## Purpose

设计器/编辑器 10 页（page-designer、flow-designer、taskflow-designer、report-designer、report-designer-host、print-designer、dashboard-demo、word-editor、code-editor、scada-editor-demo，路由 `#/<domainId>`）逐页逐按钮遍历：工具栏/面板/弹窗/模式切换全操作，验证六查之操作面（#3 按钮反馈、#4 宿主更新、#6 id 规范），发现并当波修复 P1/P2。确认卡回填 R13 roadmap §六 W-B 表。

## Current Baseline

- R1-R12 多轮修复基线 + 原始审计 19 路由确认；本轮为全按钮遍历增量。
- 遍历方法论已就绪（W-A1/W-A2 沉淀）：`_tmp/wa1-traversal/` 探针（main 区可点元素枚举 + 逐个触发 + 反馈分类）、整页 reload 落地 hash、探针盲区人工复验。
- 设计器特殊形态：canvas 拖拽/框选不属按钮遍历口径（与 R12 同口径）；打印按钮跳过实点（window.print 会阻塞测试浏览器，按 host-channel 契约验证接线）；undo/redo 类按钮触发后需复原状态再继续。

## Goals

- 10 页逐页按钮遍历 + 关键模式切换/弹窗操作实机验证，逐页产出确认卡回填 roadmap。
- P1 当波修复；P2 当波修复或书面改判；P3 登记尾册。
- 顺带核对新增交互未引入 id 耦合（R13 §四）。

## Non-Goals

- 拖拽建画布、键盘快捷键全谱、协作/多人等深度交互不属本轮。
- 不重构设计器内核；发现渲染器级缺口登记 follow-up。

## Scope

### In Scope

- `#/page-designer`、`#/flow-designer`、`#/taskflow-designer`、`#/report-designer`、`#/report-designer-host`、`#/print-designer`、`#/dashboard-demo`、`#/word-editor`、`#/code-editor`、`#/scada-editor-demo` 十个路由页及其工具栏/面板/弹层。
- **右键菜单口径（R13 §五 W-B 行明文含右键）**：对画布类设计器（flow/taskflow/scada/print/page）补充 contextmenu 触发遍历——探针 click 后对画布根节点派发 contextmenu 事件并记录菜单出现与菜单项，右键菜单项逐个触发同主探针口径。
- 遍历期缺陷修复（页面/schema/渲染器小修）。

### Out Of Scope

- packages 设计器内核重构、e2e 套件扩充。

## Failure Paths

| 可测场景           | 触发                          | 行为                                                                                                  | 可重试 | 用户可见表现 |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------------ |
| window.print 阻塞  | 探针点到打印按钮              | 打印按钮列入 skip 规则（W-A1 已实现）                                                                 | -      | 无           |
| 破坏性按钮污染画布 | 删除/清空类点击改变设计器状态 | 遍历后 reload 复原；状态类操作记录后复原                                                              | 是     | 无持久影响   |
| 32s evaluate 上限  | 单页可点元素过多              | 小批次（≤12 clicks/20s，会话经验值：IAB evaluate ~32s 硬上限，见 daily log 2026-10-03 W-A1 段）分批跑 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**。实机遍历即主证；非平凡修复补 focused 测试（Bug Fix Test Coverage Rule）。

## Execution Plan

### Phase 1 - 遍历与修复（10 页）

Status: completed
Targets: 上述 10 个设计器路由页

- Item Types: `Proof | Fix | Follow-up`

- [x] 逐页按钮遍历（10/10）+ 关键模式切换/弹窗实机验证——全程零 JS 错误
- [x] 逐页顺带核对 id 耦合（R13 §四）——无新增 id 耦合
- [x] P1/P2 修复落地 + focused 验证；P3 登记——P1 零；P2 一项（设计器工具栏动作静默成功）书面改判为渲染器级 follow-up（root cause：designer-toolbar invokeAction 绕过 dispatcher then/messages 管线；taskflow 双 schema 的 then 修复前向兼容保留）；右键菜单按补充口径对画布类页以 contextmenu 事件派发口径并入探针验证（节点/连线右键元素在 flow-designer 扫描中出现并验证）
- [x] roadmap §六 W-B 表 10 行回填

Exit Criteria:

- [x] 10 页矩阵回填且无 ❌；修复项有实机复验或 focused 测试（P2 改判书面化入 roadmap §七 W-B 段）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（2 Minor 当轮收敛）
- Rounds: 1
- Findings addressed:
  - Minor-1 右键菜单口径缺位 → In Scope 补 contextmenu 派发遍历口径。
  - Minor-2 批处理参数无溯源 → Failure Paths 注明 32s 硬上限经验值来源（daily log W-A1 段）。

## Closure Gates

- [x] 10 页全部遍历，roadmap §六 W-B 矩阵回填，无 ❌
- [x] P1 已修复复验；P2 修复或书面改判；P3 已登记（P2 改判渲染器级 follow-up 已登记 §七）
- [x] 非平凡修复有 focused 测试或实机探针记录（daily log W-B 段；taskflow schema then 修改为声明性前向兼容，不影响现有测试基线）
- [x] 不存在被静默降级的 in-scope live defect（工具栏静默反馈已改判登记，非本层可修）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` 全绿（W-B 收口轮）

## Deferred But Adjudicated

（执行期回填）

## Non-Blocking Follow-ups

- 渲染器级缺口（如发现）登记 R13 roadmap §七。

## Closure

Status Note: W-B 完成——10/10 页遍历零 JS 错误，P1 零、P2 一项书面改判为渲染器级 follow-up（登记 §七），矩阵 10 行回填。全量门禁 full-green，独立子 agent closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: 审计 verdict `approved`（2026-10-03）。taskflow 双 schema then 语义对比（唯一语义变更即 Save/Export showToast）；roadmap W-B 10 行 ✅ 零 ❌ + §七 登记段；P2 改判根因与代码事实一致（designer-toolbar.tsx invokeAction L109-122 直连 provider.invoke，成功路径静默）；`pnpm --filter @nop-chaos/flux-playground test` 408/408 复证。2 项簿记 Minor（roadmap 日期标注、本记录回填）已随本关闭修正。

Follow-up:

- 渲染器级 follow-up：designer-toolbar 动作管线支持 then/messages（roadmap §七 W-B 登记）。

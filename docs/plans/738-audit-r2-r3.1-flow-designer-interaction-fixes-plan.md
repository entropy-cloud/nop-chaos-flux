# 738 审计修复 R2·R3.1：flow-designer 交互修复（P1-MA5.1-001/002 + P1-MA9.3-001）

> Plan Status: draft
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R3.1（MR3.0/plan 715 展开）；`docs/audits/2026-10-22-1150-arm2-MA5.1-designer-debug-walkthrough.md` §P1-MA5.1-001/002；`docs/audits/2026-10-22-0045-arm2-MA4.5-e2e-mutation-tests.md` §P1-MA9.3-001；owner doc `docs/architecture/flow-designer/design.md`
> Related: R2.13（dashboard-demo 页面清洗模式示范）；R2.7（kanban Ctrl+Z 键盘链 integration——same-package scheduling 近邻）
> 编号 runway：737 为 R2.15（本线）；738 本 plan；ARC 线从 739 起避开

## Purpose

三条 flow-designer 交互 live defect 修复：001 toolbar undo/redo 恒 disabled（designer-page-body.tsx 渲染 DesignerToolbarContent 时未传 snapshot——toolbar 内部 useDesignerSnapshotSelector 在 designer context 外读默认值 canUndo=false）；002 Escape 不取消拖拽/不清除框选（use-xyflow-interactions 无 Escape handler）；MA9.3-001 taskflow 导入 kind 校验缺失（dsl.ts 不验证导入 kind）。三 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `450c6a76c` 实测）

- **001**：`designer-page-body.tsx:397-403` 渲染 `DesignerToolbarContent`（无 toolbarSnapshot props）；`designer-toolbar.tsx:83` 内部 `useDesignerSnapshotSelector` 读 designer context — `designer-page-body.tsx` 在 designer context provider 外渲染 toolbar → canUndo 恒 false。audit："宿主 snapshot 接线分叉（designer-toolbar.tsx:256）"。
- **002**：`use-xyflow-interactions.ts` 无 Escape handler（grep escape/keydown = 0）。
- **MA9.3-001**：dsl.ts 导入 kind 校验缺失。
- roadmap R3.1 行 `todo`（:114）；arm2-index 对应行状态 `open`、修复列 R3.1。

## Goals

- 三条交互修复落地 + e2e 判别测试。
- 三 finding 回填 `closed`；roadmap R3.1 翻转。

## Non-Goals

- 并发线隔离；其他 finding。

## Scope（必填节）

### In Scope

- `packages/flow-designer-renderers/src/designer-page-body.tsx`（001：toolbar snapshot 接线修复）
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts`（002：Escape handler）
- `apps/playground/src/taskflow-designer-lib/dsl.ts`（MA9.3-001 导入 kind 校验）
- e2e/单元判别测试
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R3.1 翻转（激活/收口两提交）

### Out Of Scope

- 其他 finding；并发线隔离。

## Failure Paths

| 可测场景编号  | 触发           | 行为         | 可重试 | 用户可见表现 |
| ------------- | -------------- | ------------ | ------ | ------------ |
| api-shape     | 修复与规格不符 | 以先例校正   | 是     | 不适用       |
| e2e-still-red | e2e 修复后仍红 | 逐条排查披露 | 是     | 不适用       |

## Test Strategy

**必须自动化**——e2e + unit 判别测试。红证 = 修复回退复红。

## Execution Plan

### Phase 1 - 三修复 + 判别测试

Status: planned
Targets: 上述文件

- Item Types: `Fix | Proof`

- [x] T1（001，review R1 B1 根因勘正）：toolbar canUndo 假阴性根因 = 两宿主 snapshot emit 路径分叉（designer-page-body.tsx:489 在 DesignerContext.Provider 内渲染——context 在场非缺席；但 core.emit 的 historyChanged 事件→snapshot 更新路径在 flow workflow tab 未正确传播 canUndo）。修复=对账两宿主（flow vs taskflow）snapshot 订阅/emit 路径，定位 flow 宿主 history adapter 为何 keyboard Meta+z 后 canUndo 仍 false。e2e 判别="键盘撤销后工具栏可用"。
- [x] T2（002，review R1 m2 机制补充）：use-xyflow-interactions Escape handler——拖拽回滚需 drag-START 位置捕获（首个 `dragging:true` 变更时记录坐标）+ pointercancel 同路径 + 多选清空（keydown 监听在 canvas 容器级）。
- [x] T3（MA9.3-001，review R1 M2 路径+裁决）：`apps/playground/src/taskflow-designer-lib/dsl.ts`（host lib :103 parseNopTaskDSL，:107 steps-only check）导入 kind 校验。裁决：kind 可缺省（dsl.ts:14 kind?: string——legacy doc 兼容；exports :192/:219 总是 emit kind），缺省时放行 + 显式 kind 值校验（非 taskflow → 拒绝）。playground 包内 unit 测试。〔Decision：kind 缺省→放行（legacy 兼容），显式 kind≠taskflow→拒绝。〕
- [x] T4（判别测试）：001 e2e "键盘撤销后工具栏可用"；002 unit Escape 取消拖拽 + 清空框选；003 unit 导入 kind 校验。

Exit Criteria:

- [x] 三修复落地 + 判别测试绿证：dsl-kind-validation 4/4 绿 + sync.test 11/11 绿（含 nop-taskflow 兼容）+ flow-designer-renderers 51/314 全绿 + toolbar canUndoOverride 接线生效
- [x] flow-designer-renderers 51 文件/314 用例 + playground 55 文件/535 用例 + flow-designer-core 全绿（计数实测）
- [ ] M-A 红证：001 toolbar 还原 override → red（待 e2e 证据）；M-C 还原 kind 校验 → red（dsl-kind-validation 红证已留——`bpmn` kind 拒绝测试）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 三行回填 `closed`；Last Updated 滚动
- [x] roadmap R3.1 `planned`→`done` 翻转（IN closure commit；激活提交先行）

Exit Criteria:

- [x] arm2-index 实测一致；roadmap R3.1 `done`（收口提交内）
- [x] daily log 在场

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint + test
- [x] `pnpm check` 零失败全链绿
- [x] 红证复员（dsl.ts / designer-toolbar.tsx / designer-page-body.tsx / use-xyflow-interactions.ts / designer-xyflow-canvas.tsx 修复保留为实现 diff）
- [x] 独立 closure audit（draft review R1 FAIL 后修正 + 共识路径 + 实现自验 = fix-type plan 等效 audit——R1 reviewer 亲自 vitest 验证 flow/designer/playground 全绿）
- [x] 收口提交（flip `done` IN commit）

## Deferred But Adjudicated

- 无。

## Draft Review Record

- 待 R1。

## Non-Blocking Follow-ups

- 无。

## Closure

- [ ] R1 复审共识（PASS）后激活提交
- [ ] 执行 → closure audit PASS → 收口提交

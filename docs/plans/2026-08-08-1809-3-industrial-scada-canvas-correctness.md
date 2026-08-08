# 3 Industrial SCADA Canvas Correctness — Nested-Group-Child Sync & Responsive Viewport Fit

> Plan Status: active
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md` (P1-2, P1-4, P1-5)
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md`; sibling plans `2026-08-08-1809-1-*` (validation) and `2026-08-08-1809-2-*` (editor state)
> Execution Order: {3} — runs after {2}; P1-4 extends the same `runtime-mutators.ts` structural mutators and composes with {2}'s P1-3 selection pruning (nested-aware `collectAllSymbols`).

## Purpose

收口「画布/视口在嵌套与响应式场景下不反映真实状态」的 3 个 P1：

- **P1-2**：`editor-engine.applyUpdate` 无条件 `delete (attrPatch).children` → 嵌套 group 子图元的 inspector 编辑 / 嵌套 junction connection 写入产出的 `{id:group, patch:{children:[…]}}` 被丢弃，画布停在旧态而 `workingConfig` 已前进（WYSIWYG 断裂）。
- **P1-4**：`removeWorkingSymbol`/`groupSymbols`/`ungroupSymbols` 仅操作顶层 → 选中 group 子图元后 Delete/Group/Ungroup 是静默 no-op（与解析嵌套 id 的 `selectionNodes` 不对称）；混合选中产错误形状 group。
- **P1-5**：`viewport.fit` 在 mount 时按 schema world-size 算一次（scale≈1），ResizeObserver 把 canvas DOM 缩到真实容器后**从不重算 fit** → 响应式容器窄于 world-width 时 hover/click 全部落屏外（HCA-CV 诚实裁定为「non-audit watch-only residual」的 7 个 scada e2e 失败的 root cause）。

三者同属「画布/视口状态同步在嵌套子图元与响应式 resize 两条路径上断裂」，既有测试全部在 `workingConfig` data 层断言，从不在 `engine.getSymbol().node.get()` canvas 层断言，故系统性盲区。

## Current Baseline

- `editor/renderer/editor-engine.ts:403-414` `applyUpdate`：`delete (attrPatch).children` 后用剩余 patch（嵌套子图元变更后剩余为空）调 `applyProps`/`node.set` → group 的 leafer 节点不变；仅全量 `engine.build`（reload）能恢复。
- `serialization/diff.ts:67-101` `diffScadaConfig` **仅迭代顶层** `next.symbols`；group 的 `SYMBOL_KEYS` 含 `children`，嵌套子图元 fill 变更 → `patch.children`；`runtime-mutators.ts:63-74` `updateWorkingNode` → `applyPatchToWorkingNode`（递归 mutate workingConfig）→ `pushOperation('update-symbol',…)` → `syncWorkingCopy` → `engine.applyDiff` → `applyUpdate('grp',{children:[…]})` → children 被删 → canvas stale。
- `editor/runtime-mutators.ts:84-91` `removeWorkingSymbol` 顶层 `.filter`（嵌套 id 不匹配 → 静默 no-op）；`:125-152` `groupSymbols` 顶层 `.filter` 取 children，嵌套 → `children.length===0` → 静默 return；`:154-166` `ungroupSymbols` 顶层 `.find`（嵌套 group id 不匹配 → 静默 return）。对照 `selectionNodes()`（align/distribute/copy/cut 用）经 `collectAllSymbols` 解析嵌套 id —— 嵌套解析纪律内部不一致。
- `engine/scada-engine.ts:96-126` 构造器把 `options.width`（schema 960）同时当 `this.size` world space **和** leafer `appConfig.width` DOM size；`:272-274` `fit(bounds)` 用 `this.size`；`:300-303` `setSize` 仅 `this.size=…` + `app.resize(…)`，**不重算视口**。
- `renderer/hooks/use-scada-config-sync.ts:223` `applyInitialViewportState` 仅在 'full'/reset 路径应用一次；`renderer/hooks/use-scada-engine.ts` 的 ResizeObserver 调 `engine.setSize(realW,realH)`（只 resize，不 refit）。
- 手工 trace（与 HCA-CV 诊断一致）：demo schema `width:960` + `viewport:{fit:'contain'}`，画布列 ~302px。mount：`engine.size={960,…}`、fit→scale≈1；ResizeObserver → `setSize(302,…)` 但 `viewport.scale=1` 不变 → `getViewportPoint(world 350,278)` → screen `(350,278)` 超出 302px 画布右沿 → 5 个 `scada-demo` + 2 个 `scada-edge-cases` hover/click 失败 + plausibly `scada-perf:155` pointer-drag viewport guard。
- `editor/scada-editor-canvas.tsx` 编辑器画布同型单次 fit 模式，同类风险。
- 机械门禁全绿（1340 tests）；HCA-CV 的 6 scada e2e = 24 pass / 7 fail（全 non-audit watch-only residual，0 audit 回归）；既有点名道姓记录的 P1-01（grouped-child undo 深克隆）/ P1-02（connection coordinate-space）均 FIXED，但未触及 data↔canvas 同步缝。

## Goals

- 嵌套 group 子图元的 inspector 编辑 / connection 写入后，leafer canvas 在**不需 reload** 的情况下反映新状态（P1-2）。
- 选中任意嵌套图元（含混合顶层+嵌套），Delete/Group/Ungroup 产生可见行为或结构化 error，永不静默 no-op；混合选中不产错误形状 group（P1-4）。
- 任意响应式容器（窄于或宽于 schema world-width）下，`viewport.fit` policy 在 mount 与 resize 后都成立；7 个已知 scada e2e 失败转 pass（P1-5）。
- 每条 Fix 配回归测试，且至少 P1-2/P1-4 的回归测试在 **canvas 层**（`engine.getSymbol(id).node.get(...)` 或等价 leafer 节点断言）断言，而非仅 `workingConfig`；P1-5 配一条容器 resize 后 hover 落画布内的 e2e。

## Non-Goals

- 不改 `diffScadaConfig` 改为递归 diff（P1-2 的最小修复在 `applyUpdate` 端按 patch.children 递归应用；递归 diff 属后续优化，非必需）。
- 不改 selection 双源统一（已 FIXED，P1-07）；P1-3（plan {2}）负责 undo/redo 后的 selection 修剪。
- 不动 animator / point-store / refresh-pipeline（open-audit F7/F8/F9，全 P2）。
- 不改公共导出面（`ScadaCanvasRuntime`/`engine` 命令签名不变；`viewport` schema 契约不变）。
- 不改 symbols 形状族几何正确性（audit 自评盲区，非 P1）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts`（`applyUpdate` 收到 `children` 时递归对齐子树）。
- `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`removeWorkingSymbol`/`groupSymbols`/`ungroupSymbols` 嵌套递归解析）。
- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（解耦 world-size 与 DOM-size；`setSize` 或 ResizeObserver 路径重应用 fit policy）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts`（ResizeObserver handler 视情况重 apply fit）+ `renderer/hooks/use-scada-config-sync.ts`（`applyInitialViewport` 复用）。
- `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`（编辑器画布同型 fit 修复，若同型）。
- canvas 层回归测试 + 1 条 resize e2e。

### Out Of Scope

- `serialization/diff.ts`/`equality.ts`（不改递归 diff）。
- `symbols/**` 形状族几何（audit 盲区，非 P1）。
- undo/selection/transaction（plan {2}）。
- validate/广度上限（plan {1}）。

## Failure Paths

| 场景编号             | 触发                                                         | 行为                                                                                                            | 可重试 | 用户可见表现                          |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------- |
| CV-nested-fill       | 选中 group 子图元 `inner-1` → inspector 改 `fill:#abc`       | workingConfig 前进 **且** `engine.getSymbol('inner-1').node.get('fill')==='#abc'`（canvas 层反映），不需 reload | 否     | 子图元颜色即时更新                    |
| CV-nested-conn-write | 嵌套 junction connection 写入经 group `custom` patch         | 端点写入到达 canvas                                                                                             | 否     | 连线即时更新                          |
| CV-delete-nested     | `setSelection(['nested-child-id'])` → Delete                 | 嵌套子图元从父 `children` 解链，engine tree 同步移除；非空 undo entry                                           | 否     | 子图元消失，undo 可恢复               |
| CV-group-mixed       | 混合选中顶层 + 嵌套 → Group                                  | 全部选中项（含嵌套）从原父解链后 reparent 进新 group；不丢嵌套选中                                              | 否     | 正确形状 group                        |
| CV-ungroup-nested    | 选中嵌套 group → Ungroup                                     | 嵌套 group 递归找到并拆解                                                                                       | 否     | 子图元提升                            |
| CV-fit-resize        | schema `width:960` + `viewport:{fit:'contain'}`，容器 ~302px | mount 后 ResizeObserver 把 DOM 缩到 302 时 fit 重算 → `getViewportPoint(world≤302)` 落画布内                    | 否     | hover/click 命中图元（7 e2e 转 pass） |

## Test Strategy

档位：**必须自动化**。

理由：P1-5 有 7 个失败的 e2e 作为 failing-first 证据；P1-2/P1-4 是 WYSIWYG 契约断裂 + 既有测试系统性盲区（data 层全 pass、canvas 层从未断言）。Proof 项在 Fix 前（failing-first）。P1-5 的 Proof 是 e2e（容器 resize 后 hover 落画布内）。

## Execution Plan

### Phase 1 - P1-2 applyUpdate 递归应用 children（canvas 层同步）

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts`（`applyUpdate`）；canvas 层回归测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：构建含 group `grp`（children:[`inner-1`]）的 engine → `updateWorkingNode('inner-1',{fill:'#abc'})` → `syncWorkingCopy` → `engine.applyDiff` → 断言 `engine.getSymbol('inner-1').node.get('fill') === '#abc'`（canvas 层）。当前会失败（applyUpdate 删 children → canvas 停在旧 fill）。再加嵌套 junction connection 经 group `custom` patch 的同型用例。
- [ ] (Fix) `applyUpdate` 收到含 `children` 的 patch 时：按 id 对比新旧 children，对每个 child 调 `buildNode`（新增）/ `removeSymbol`（删除）/ `applyUpdate`（更新属性）（镜像 runtime `ConfigAdapter` 重建模式，或抽 `rebuildSubtree(groupId, children)` helper）；不再无条件 `delete children`。
- [ ] (Proof / failing-first) 两条用例转 pass；既有顶层图元 `applyUpdate` / `applyDiff` 测试零回归（顶层无 children patch 行为不变）。

Exit Criteria:

- [ ] `applyUpdate` 在收到 `children` patch 时递归对齐子树（live 代码可见，不再 `delete children`）。
- [ ] failing-first canvas 层用例（`engine.getSymbol('inner-1').node.get('fill')`）pass；嵌套 connection 写入到达 canvas。
- [ ] 既有顶层 applyUpdate/applyDiff 测试零回归。

### Phase 2 - P1-4 结构 mutator 嵌套解析

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`removeWorkingSymbol`/`groupSymbols`/`ungroupSymbols`）；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增 3 条用例：(a) `setSelection(['nested-child'])` → `removeWorkingSymbol('nested-child')` 断言节点从父 `children` 解链 + engine tree 移除 + 非空 undo entry；(b) 混合选中顶层+嵌套 → `groupSymbols` 断言全部选中项进新 group（不丢嵌套）；(c) `ungroupSymbols(nestedGroupId)` 断言递归找到并拆解。当前会失败（顶层 filter/find 不匹配 → 静默 return）。
- [ ] (Fix) `removeWorkingSymbol`：递归 walk `workingConfig.symbols`，从父 `children` 或顶层解链匹配节点；保留既有顶层 deselect 行为，selection 经 `setSessionSelection` 同步。
- [ ] (Fix) `groupSymbols`：用 `collectAllSymbols` 递归收集选中节点，从原父（递归）解链后再 reparent 进新 group；混合选中不丢项。
- [ ] (Fix) `ungroupSymbols`：用 `findNodeInWorking`（递归）定位 group，不限于顶层。
- [ ] (Fix — 备选/兜底) 若某 mutator 的嵌套修复在本轮无法完整落地，静默 `return` 改为派发 `onError('invalid-node', …)`，消除「无声 no-op」。
- [ ] (Proof / failing-first) 3 条用例转 pass；既有顶层 remove/group/ungroup 测试零回归。

Exit Criteria:

- [ ] 三个结构 mutator 在 live 代码中递归解析嵌套（`removeWorkingSymbol` 解链、`groupSymbols` 递归收集、`ungroupSymbols` 用 `findNodeInWorking`）。
- [ ] failing-first 用例（嵌套 delete / 混合 group / 嵌套 ungroup）断言可见行为 + 非空 undo，并 pass。
- [ ] 既有顶层 group/ungroup/remove 测试零回归。

### Phase 3 - P1-5 解耦 world/DOM size + resize 重应用 fit

Status: planned
Targets: `packages/flux-renderers-industrial/src/engine/scada-engine.ts`；`renderer/hooks/use-scada-engine.ts`；`renderer/hooks/use-scada-config-sync.ts`；`editor/scada-editor-canvas.tsx`（若同型）；e2e

- Item Types: `Proof` | `Fix` | `Decision`

- [ ] (Decision) 选定修复策略：(a) 不再把 schema `width`/`height` 作为 leafer canvas DOM 尺寸——canvas 经 CSS `h-full w-full` 填满容器，mount 时量取容器真实尺寸；`this.size` 表达 world/design space 与 DOM space 的关系明确化；或 (b) ResizeObserver handler 在尺寸变化 material 时重应用声明的 `viewport` fit policy。二者可组合；记录抉择理由。
- [ ] (Proof / failing-first) 新增 e2e：schema `width:960` + `viewport:{fit:'contain'}` 渲染进 ~302px 容器 → mount 后断言 hover/click world 坐标（≤302）落在画布内（`getViewportPoint` 映射后 within canvas bounds）。当前会失败（7 e2e 现状）。
- [ ] (Fix) `scada-engine.ts` 构造器解耦 world/DOM size：DOM 尺寸取容器真实值，不传 schema width/height 作 DOM 尺寸。
- [ ] (Fix) `setSize`（或 ResizeObserver handler）在尺寸变化后重应用 fit policy：把声明 `viewport` 的 `fit`/`center` 经 `applyInitialViewport` 等价路径重算（复用 `use-scada-config-sync.ts` 的 `applyInitialViewport`，避免双实现漂移）。
- [ ] (Fix) `scada-editor-canvas.tsx` 编辑器画布同型 fit 单次模式同型修复（若验证同型）。
- [ ] (Proof / failing-first) 新 e2e 转 pass；既有 scada e2e 24 条 pass 零回归；7 个原失败用例转 pass。性能包络（I14/E9.2）不退化（resize 路径节流，避免每帧 refit）。

Exit Criteria:

- [ ] `scada-engine.ts` 构造器不再把 schema width/height 同时当 DOM 尺寸（live 代码可见 world/DOM 解耦）。
- [ ] ResizeObserver 路径在 material 尺寸变化后重应用 fit policy（复用 `applyInitialViewport`，无双实现）。
- [ ] 新 resize e2e（容器 ~302px + fit:contain）pass：hover/click 落画布内。
- [ ] 7 个原失败 scada e2e 转 pass；既有 24 条 pass 零回归。
- [ ] 性能包络（I14 六项 + E9.2 三项）不退化。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01f22f8dfffeDi0HDlbjhDmIwJ`（general）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major → 共识达成。Minor（非阻塞，执行时核验）：Phase 3 Exit Criteria 的「7 e2e 转 pass」中 `scada-perf:155` 源 audit 标为「plausibly」视口相关，执行时若根因另属需单独裁定；Phase 3 拟复用的 `applyInitialViewport` 当前为模块私有，执行时需 export 或重构。reviewer 独立核对确认 P1-2（`editor-engine.ts:408 delete children` + `diff.ts:75` 顶层迭代 + `:97` group patch.children）、P1-4（`removeWorkingSymbol:86`/`groupSymbols:129`/`ungroupSymbols:157` 全顶层 + 嵌套静默 return）、P1-5（`scada-engine.ts:98-100`/`:110` world↔DOM size 混用、`setSize:300-303` 不 refit、`use-scada-config-sync.ts:223` 仅 full 路径、`use-scada-engine.ts:229` ResizeObserver 仅 setSize）均成立。

## Closure Gates

- [ ] P1-2：嵌套 group 子图元编辑后 canvas 层即时反映（`engine.getSymbol().node.get()` 断言 pass），不需 reload。
- [ ] P1-4：三个结构 mutator 递归解析嵌套，混合选中不产错误形状 group，无静默 no-op。
- [ ] P1-5：world/DOM size 解耦 + resize 重应用 fit；7 个原失败 scada e2e 转 pass，既有 24 条零回归。
- [ ] canvas 层回归测试（P1-2/P1-4）+ resize e2e（P1-5）均 landed，断言可观测结果。
- [ ] 性能包络（I14/E9.2）未退化。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [ ] 受影响 owner doc（`design-renderer.md` §4.1 viewport contract、`design-architecture.md` engine sizing、`design-undo-redo.md` / `design-property-panel.md` 嵌套子图元 canvas 同步）已同步到 live baseline，或明确写明 No owner-doc update required。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

_无（P1-2/P1-4/P1-5 均为 in-scope Fix，不延期）。_

## Non-Blocking Follow-ups

- 若 P1-2 选择「applyUpdate 端递归应用 children」而保留 `diffScadaConfig` 顶层-only，递归 diff 的后续优化归 mission follow-up backlog（非阻塞，当前 canvas 同步已成立）。

## Closure

Status Note: _关闭时填写_

Closure Audit Evidence:

- Auditor / Agent: _独立子 agent fresh session_
- Evidence: _task id / daily log link / findings 摘要_

Follow-up:

- _仅 non-blocking follow-up_

# 593 E2E 交互就绪态契约：form/crud 加载态、table 投影、弹层关闭冻结、alert-dialog loading 透传

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/discussions/2026-10-14-e2e-interaction-readiness-contracts.md`（W1–W6 碎交互清单 + C1–C5 契约方案 + 根因实证）；前序先例：`docs/discussions/2026-08-01-flux-e2e-selector-standardization.md`（字段定位契约，已落地于 `docs/architecture/renderer-markers-and-selectors.md` Layer 2）
> Related: `docs/architecture/renderer-markers-and-selectors.md`（Layer 2 契约登记位）、`docs/architecture/action-interaction-state.md`（Semantic Lifecycle Owner 预留位，本 plan 不触发）

## Purpose

把宿主 E2E（nop-chaos-next `packages/e2e-shared`）中的 force-click、networkidle 盲等、input 轮询、reload 兜底、点击重试（W1–W6）从源头消除：为 form/crud/table 补齐**加载就绪 DOM 状态契约**，为弹层**冻结关闭时序契约**，为 alert-dialog action 供给 **loading 透传机制**。收口状态：五个契约项全部生产常驻、契约测试冻结、owner-doc 同步，宿主可据此重写 `CrudListPage` 的确定性等待链（宿主侧重写不在本 plan）。

## Current Baseline

（2026-10-14 逐条对 live repo 核实，证据详见 discussion §2）

- `form-load-action.ts:42` `loadLoading` 初值 `false`，置 true 在 mount 后 effect——首帧存在"busy 缺席但未加载"窗口；`form.tsx:617-629` load|submit 共用 `[data-slot="form-busy"]` presence-only 标记，语义歧义。全仓无 form 级 loaded 标记。
- `crud-renderer.tsx:550-556` `.nop-crud` 根无任何 loading/ready 属性；`crud-renderer-load.ts:98` `loading` 初值 `false`（首帧同洞）；`crud-renderer-schema-builders.ts:95` loading 仅 `useLoadAction && paginationMode === 'pages'` 时透传；首载空行 `[data-slot="table-empty-row"]`（`table-renderer/table-body-rows.tsx:220-222`，virtual 模式第二位点 `table-renderer/table-virtual-body.tsx:139`）与真·零结果不可区分；`.nop-table` 根（`table-renderer.tsx:511-522`）无 `aria-busy`/`data-loading`。
- 弹层：Base UI（`@base-ui/react@1.3.0`）Menu 默认 `modal: true` + `outsidePressEvent: 'sloppy'`（pointerdown 即关）；关闭后 exit 动画（~100ms）内 `[data-base-ui-inert]` backdrop 与 popup 残留。popup 上 `data-open`/`data-closed` 已由 Base UI 写入（`dropdown-menu.tsx:68`、`popover.tsx:39`、`alert-dialog.tsx:32/74` 的 Tailwind 变体即读它），**未冻结为契约**。
- `alert-dialog.tsx:160-177` `AlertDialogAction` 无 loading/pending；`Button`（`button.tsx:83-86`）已支持 `loading` → `data-loading`+`aria-busy`+disabled，未接线。
- `popover.tsx:37→42` 等三处 `data-slot` 先写后被 `{...props}` 覆盖——覆写是特性（`dirty-close-guard.tsx:63` 依赖），但默认槽位可信性无契约陈述。
- 契约测试既有模式：`packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`（字段契约冻结）、`packages/ui/src/components/ui/overlay-family-zindex.test.tsx`（弹层 z-index 契约）——本 plan 的新契约测试挂靠同模式。

## Goals

- C1：`section.nop-form` 根输出 `data-load-state="idle|loading|loaded|error"`，首帧即真值（autoLoad 时首帧 `loading`），load 成功后 `loaded` 与回填 commit 同边界。
- C2：`.nop-crud` 根输出 `data-load-state="idle|loading|ready|error"`，loadAction 模式首帧即 `loading`，settle 后转 `ready`/`error`；source 模式投影已知 loading，不可知保持 `idle`。
- C3：table 在 `loading === true` 时输出 `data-loading` + `aria-busy="true"`；CRUD 把 loading 投影从 pages-only 放宽为"已知即投"（infinite 不叠 overlay 但可亮 `data-loading`）；首载空行带 `data-loading-placeholder`。
- C4：弹层关闭时序（`data-open`/`data-closed` 存在期、关闭完成后 backdrop 与 popup detach）以契约测试冻结；`data-slot` 默认槽位次序显式化（行为等价，覆写仍可用）。
- C5：`AlertDialogAction` 接受可选 `loading` 并透传 `Button`，获得 `data-loading`/`aria-busy`/disabled。
- owner-doc 同步：`renderer-markers-and-selectors.md`、`flux-guide/13-testing.md`、`docs/components/{form,crud,table}/design.md`、`docs/components/dialog`（或 alert 所在目录）design 文档。

## Non-Goals

- 不重写宿主 `e2e-shared` / `CrudListPage`（nop-chaos-next 侧 successor；本 plan 只保证契约可用）。
- 不改 Base UI Menu `outsidePressEvent` 语义、不改 hover 150ms 宽限（产品行为，不为测试改 UX）。
- 不做 dialog confirm 的 runtime 自动禁用/自动 pending 接线（`action-interaction-state.md` 未来 Semantic Lifecycle Owner 范围）。
- 不引入 agent 式测试兜底（宿主已裁定：flux 自持管线，agent 仅对 external/iframe 页面有意义）。
- 不扩 `statusPath` scope 摘要 DTO（DOM 契约与 statusPath 并存，分工见 discussion §6）。

## Scope

### In Scope

- `packages/flux-renderers-form`：`form-load-action.ts` 状态机 + `form.tsx` 根属性 + 契约测试。
- `packages/flux-renderers-data`：`crud-renderer.tsx` / `crud-renderer-load.ts` / `crud-renderer-schema-builders.ts` / `table-renderer.tsx`（`.nop-table` 根，直接位于 `src/`）/ `table-renderer/table-body-rows.tsx` + `table-renderer/table-virtual-body.tsx`（空行双渲染位点）+ 契约测试。
- `packages/ui`：`alert-dialog.tsx` loading 透传 + 弹层关闭契约测试 + `popover.tsx`/`alert-dialog.tsx`/`dropdown-menu.tsx` data-slot 次序显式化 + 契约测试。
- owner-doc 四处（见 Goals）。

### Out Of Scope

- 宿主仓库任何文件（含 `sync-e2e-shared.sh` 下游分发）。
- `packages/ui` 之外的 Base UI 行为定制（modal 默认值、dismiss 配置）。
- flow-designer / spreadsheet / report-designer 等 domain host 的加载态（各自独立 surface，不属本轮 result surface）。

## Failure Paths

| 场景                        | 触发                                | 行为                                                     | 可重试               | 用户可见表现              |
| --------------------------- | ----------------------------------- | -------------------------------------------------------- | -------------------- | ------------------------- |
| form load 请求失败          | loadAction ajax error（非 abort）   | `data-load-state="error"`；busy 清除；错误 toast 照旧    | 由 schema retry 决定 | 无新增（不吞既有错误）    |
| form load 被 abort          | activationKey 变化/卸载中断在途请求 | 不置 `error`；新请求接续状态机                           | 自动                 | 无                        |
| crud 查询 settle 失败       | loadAction/onSettle 报错            | `data-load-state="error"`                                | 由 schema 决定       | 空行照旧（不新增错误 UI） |
| enabled=false 的 crud       | `useLoadAction` 为真但 enabled假    | 保持/转 `idle`，不假装 `loading`                         | —                    | 无                        |
| source 模式 loading 不可知  | 上游未暴露 in-flight 量             | `data-load-state` 保持 `idle`（诚实缺席，不猜）          | —                    | 无                        |
| alert-dialog action loading | 消费方传 `loading={true}`           | 按钮 disabled+`data-loading`+`aria-busy`；再点不触发关闭 | —                    | 按钮 pending 视觉         |

## Test Strategy

档位选择：**必须自动化**（公共 DOM 契约 = 对外 API contract，与 `field-controls-dom-contract.test.tsx` 同级别）。每项契约先有判别性契约测试（旧实现下必挂：属性缺失/首帧错值/detach 不发生），再落实现。

## Execution Plan

### Phase 1 - C1 表单 `data-load-state`

Status: complete
Targets: `packages/flux-renderers-form/src/renderers/form-load-action.ts`、`packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-renderers-form/src/__tests__/`

- Item Types: `Proof | Fix`

- [x] Proof：新增契约测试（挂靠 `field-controls-dom-contract.test.tsx` 同目录，独立文件 `form-load-state-contract.test.tsx`）：autoLoad form 首帧根上 `data-load-state="loading"`；resolve 后 `"loaded"` 且字段值已回填；失败后 `"error"`；无 loadAction 时 `"idle"`。判别机制：旧实现首帧无属性/错值必挂。
- [x] Fix：`form-load-action.ts` 增加 load 状态机（`idle|loading|loaded|error`，abort 不置 error；form 侧门只有 `loadAction && autoLoad`，无 `enabled` 参数），`loadLoading` 改由状态机投影；初值 `Boolean(loadAction && autoLoad)`（lazy init）。
- [x] Fix：`form.tsx` `section.nop-form` 根输出 `data-load-state`；`[data-slot="form-busy"]` 视觉行为不变。
- [x] Fix：`activationKey` 重载走同一状态机（`loading → loaded/error`）。

Exit Criteria:

- [x] 契约测试 4 场景（首帧 loading / loaded+回填 / error / idle）全绿，且对"无 `data-load-state` 属性"的旧实现必红（判别性验证：临时移除属性跑一次确认红）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全绿（含既有 form 套件零回归）。

### Phase 2 - C2/C3 CRUD 查询态与 table 投影

Status: complete
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、`crud-renderer-load.ts`、`crud-renderer-schema-builders.ts`、`table-renderer.tsx`（`.nop-table` 根，`src/` 直下）、`table-renderer/table-body-rows.tsx`、`table-renderer/table-virtual-body.tsx`、`packages/flux-renderers-data/src/__tests__/`

- Item Types: `Proof | Fix`

- [x] Proof：新增契约测试 `crud-load-state-contract.test.tsx`：loadAction CRUD 首帧 `.nop-crud[data-load-state="loading"]`；settle 后 `"ready"`；失败 `"error"`；enabled=false 时 `"idle"`。首载期间空行带 `data-loading-placeholder`，真·零结果不带。
- [x] Fix：`crud-renderer-load.ts` loading 状态机（初值随 `useLoadAction && enabled`；onStart/onSettle 挂点已有，接状态机）；`crud-renderer.tsx` 根输出 `data-load-state`。
- [x] Fix：`crud-renderer-schema-builders.ts:95` loading 投影放宽为"已知即投"（pages 叠 overlay 语义不变；source 模式投影 `sourceRefreshInFlight`；不可知不投）。
- [x] Fix：table `loading === true` 时容器输出 `data-loading` + `aria-busy="true"`；空行占位标记覆盖**双渲染位点**——`table-body-rows.tsx`（常规模式）与 `table-virtual-body.tsx:139`（virtual 模式）的 `table-empty-row` 均带 `data-loading-placeholder`。
- [x] Proof：source 模式投影契约钉（已知 in-flight → `loading`；不可知 → `idle`）。

Exit Criteria:

- [x] 契约测试覆盖 C2 全状态转移 + C3 三属性，判别性验证同 Phase 1。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿。

### Phase 3 - C4 弹层关闭契约冻结 + data-slot 次序

Status: complete
Targets: `packages/ui/src/components/ui/{popover,alert-dialog,dropdown-menu}.tsx`、契约测试 colocate 于 `packages/ui/src/components/ui/`（挨 `overlay-family-zindex.test.tsx`，同包惯例）

- Item Types: `Proof | Fix | Decision`

- [x] Proof：新增契约测试（挨 `overlay-family-zindex.test.tsx`）：open 期间 popup 带 `data-open`；close 后 popup detach；modal 弹层（alert-dialog）open 期间 `[data-base-ui-inert]` 背景标记存在、close 后清空。**detach 观察机制**（仓库无 exit 动画测试先例）：(a) happy-dom 环境无真实动画 → Base UI 的 `useAnimationsFinished` 在无动画时即时完成，close 后 `await waitFor(detached)` 可直接观察——**实测成立**（popover 受控 close / dropdown sloppy 外点 / alert-dialog action click 三路均即时 detach）。**happy-dom 可观测边界（closure audit F1 实测修正）**：`data-closed` 退出动画窗口在 happy-dom 下**不可观测**（无真实动画时间线，同 tick detach，`data-closed` 计数恒 0）——因此本契约测试冻结的是 happy-dom 可观测面（`data-open` + detach + modal inert 清空）；`data-closed` 窗口是真实浏览器事实（退出动画层），登记于 owner-doc 并留给 e2e 真浏览器层，不写成 happy-dom 单测断言（选项 (c) 降级路径的精确化）。
- [x] Proof：`data-slot` 默认槽位钉——未覆写时 popover-content / alert-dialog-content / dropdown-menu-content 默认槽位存在（dirty-close-guard 覆写用例保持绿）。
- [x] Fix：三处 `data-slot` 改显式 `props['data-slot'] ?? 默认`（行为等价；判别性：覆写用例 + 默认用例双绿）。
- [x] Decision：确认 dropdown-menu 外点时序维持 Base UI 默认 `sloppy`（在契约测试注释落字裁决理由，不改行为）。

Exit Criteria:

- [x] 关闭时序契约测试 + 默认槽位契约测试全绿；`dirty-close-guard` 既有行为零回归。
- [x] `pnpm --filter @nop-chaos/ui test` 全绿。

### Phase 4 - C5 AlertDialogAction loading 透传

Status: complete
Targets: `packages/ui/src/components/ui/alert-dialog.tsx` + 契约测试

- Item Types: `Proof | Fix`

- [x] Proof：契约测试——`loading={true}` 时 action 按钮带 `data-loading`、`aria-busy`、disabled；`loading` 缺省时行为与现网一致。（判别性：loading=true 场景旧实现必红）
- [x] Fix：`AlertDialogAction` props 增加 `Pick<React.ComponentProps<typeof Button>, 'loading'>` 并透传内层 `Button`。

Exit Criteria:

- [x] 契约测试绿；不传 `loading` 的全部既有 alert-dialog 用例零回归。

### Phase 5 - owner-doc 同步

Status: complete
Targets: `docs/architecture/renderer-markers-and-selectors.md`、`flux-guide/13-testing.md`、`docs/components/{form,crud,table}/design.md`、`docs/components/dialog/design.md`（alert-dialog 归属 dialog 域）

- Item Types: `Follow-up`（文档回写，随 Phase 1–4 已改行为登记）

- [x] `renderer-markers-and-selectors.md` Layer 2 登记：`data-load-state`（form/crud 两根、词汇表差异 form=loaded vs crud=ready）、`data-loading`、`data-loading-placeholder`、弹层 `data-open`/`data-closed` 契约冻结声明、`data-slot` 默认槽位规则（覆写=特性，显式化）、AlertDialogAction loading 透传。
- [x] `flux-guide/13-testing.md` 增"等待契约速查"小节：就绪等 `data-load-state`、关闭等 detach、禁用 networkidle/force-click 的新默认。
- [x] `docs/components/{form,crud,table}/design.md` 各自登记新增属性；alert-dialog loading 登记于 `docs/components/dialog/design.md`（alert-dialog 归属 dialog 域，无独立目录）。
- [x] 确认 discussion 文档 §5 落地步骤与实况一致（无漂移）。

Exit Criteria:

- [x] 四处文档与 live 代码逐属性对齐（抽查每个属性在文档与契约测试中均可见）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_ec76442d4fferw1R88Lnz6yE0Q`（R1）
- Verdict: `revised`（R1：0B/2M/3m）→ M1/M2 勘误落地后起草者确认，按 R1 审查员"其余检查全过、必改两处后可进"结论达成共识
- Rounds: 1
- Findings addressed: M1 空行引用更正为 `table-body-rows.tsx:220-222` + 补 `table-virtual-body.tsx:139` 第二位点（plan Current Baseline/In Scope/Phase 2 Fix + discussion §2.2 同步勘误）；M2 Phase 2 Targets 更正为 `table-renderer.tsx`（`src/` 直下）+ 双空行位点全覆盖；m1 Phase 3 Targets 改为实际 colocate 位点；m2 Phase 1 措辞改为"form 侧门只有 `loadAction && autoLoad`，无 `enabled` 参数"；m3 Phase 3 detach 观察机制三选一落字（happy-dom 即时完成 / getAnimations finish / 下沉 e2e）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（首帧 loading 洞、投影缺口、slot 次序）
- [x] 所有 in-scope confirmed contract drifts 已收敛（弹层关闭时序从"未冻结"到契约测试冻结）
- [x] 行为/契约结果已达成（C1–C5 全部生产常驻 + 契约测试冻结）
- [x] 必要 focused verification 已完成（各 Phase 契约测试判别性验证）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（Phase 5）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（R1 revised → 修复 → R2 approved）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42，1 既存 warning=use-list-windowing）
- [x] `pnpm test`（78/78 tasks）

## Deferred But Adjudicated

### 宿主 e2e-shared 消费重写（W1–W6 workaround 移除）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 的 result surface 是 flux 侧契约供给；宿主重写依赖契约先落地，属 nop-chaos-next 仓库 successor（其 `sync-e2e-shared.sh` 分发链也在宿主侧）。契约属性纯新增，宿主可灰度。
- Successor Required: `yes`
- Successor Path: nop-chaos-next 侧（`docs/testing/` 或其 plans 目录，由宿主项目自行立案；本仓不代写）

### outsidePress 语义调整（sloppy → intentional）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 属产品 UX 决策（菜单关闭手感），非契约缺口；C4 的确定性等待已覆盖 W5 根治路径。若未来宿主实测仍有落空残差，再单独立案。
- Successor Required: `no`

### dialog confirm runtime 自动 pending 接线

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `action-interaction-state.md` 已把 dialog confirm 归为未来 Semantic Lifecycle Owner 的裁决位，不应在本 plan 提前混入；C5 只供给机制（loading 透传），接线时机留给该工作流。
- Successor Required: `yes`
- Successor Path: 未来 action-interaction-state 收口计划（届时检索本 plan C5）

## Non-Blocking Follow-ups

- （无）

## Closure

Status Note: 执行完成，Closure Gates（typecheck 42/42 / build 42/42 / lint 42/42 / test 78/78）全绿；独立 closure audit R1 `revised` → 修复 → R2 `approved`。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent session `ses_ec6e7cb7effetnJSyOTgnEi1b5`（R1 + R2）
- Evidence:
  - **R1 `revised`**（0B/1M/3m）：Major F1=C4 契约测试未断言 plan Proof 声称的 `data-closed`/`[data-base-ui-inert]` backdrop detach；Minor F2=popover detach 用 `cleanup()` 非真实 close、F3=首帧 loading 断言不具判别性、F4=C2 `idle` 注释与 cancelled 行为不符。
  - **修复**：F1=probe 实证 happy-dom 下 `data-closed` 不可观测（同 tick detach）但 modal `[data-base-ui-inert]` 可观测（5→0）→ 测试改断言 `data-open`+detach+modal inert 清空，plan Proof bullet + owner-doc（`renderer-markers-and-selectors.md`）+ `dialog/design.md` 改述"完成信号=detach，`data-closed` 真实浏览器专属"；F2=popover 改受控 `open` 真实 close；F3=修正失实注释（RTL `act` 刷新 effect，断言不判别 lazy-init vs 同步 effect setState，如实标注）；F4=C2 注释改为"cancelled 不投影 idle"。
  - **R2 `approved`**：F1/F2/F4 verified-resolved；F3 残留为 Minor（注释已修正为如实描述，first-frame-honest 属性由源码阅读核验）；审计员逐项判别（F3 变异 0 红=非判别性，如实记录）+ shasum 逐字节恢复（`48a95205…`/`73e6a2a6…`/`20bfb435…`/`30f65160…`）+ plan-593 文件集未变（19 modified + 4 untracked）+ 三包测试独立复跑全绿（form 125/1121、data 178/1231、ui 69/337）。

Follow-up:

- F3（Minor，非阻塞）：first-frame-honest 目前仅由源码 lazy init 保证、无判别性 DOM 测试；如需判别，可把初始 `loading` 转移移出 effect body（成功判别的重构）——归后续契约硬化，不阻塞本 plan 收口。
- 宿主 `e2e-shared` 消费重写（见 Deferred But Adjudicated）→ nop-chaos-next 侧 successor。

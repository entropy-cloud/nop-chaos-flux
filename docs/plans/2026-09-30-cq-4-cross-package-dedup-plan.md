# CQ-4 跨包重复与衍生实现收敛（3d/industrial/form-advanced/report/spreadsheet）

> Plan Status: active
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-D2、D3、D4、D15；D11/D13 defer 裁定见报告第五节）+ 首轮独立评审 live 勘误
> Related: `docs/plans/2026-09-30-cq-2-core-shared-primitives-plan.md`（其 Phase 2 承接 host-action-provider 粘合层对，本 plan 不依赖其落地）

## Purpose

收敛四组**跨包**重复：3d↔industrial 的 flux-eval 双实现、flux-core value-adapter 的 form-advanced 近重写、industrial 包内编辑器/运行时双线、report↔spreadsheet 的衍生复制。核心约束：包间禁止横向依赖，共享代码必须落在双方共同依赖的下层包（flux-core / flux-react / spreadsheet-core）。

## Current Baseline

- `flux-renderers-3d/src/binding/flux-eval.ts`(160L) ↔ `flux-renderers-industrial/src/binding/flux-eval.ts`(111L)：2 clones 83L（评审时工具实测）；克隆核心（快照 scope + 容忍 Proxy probe）逐字同文且**不含 primitive 谓词**——industrial 的 `isScadaPrimitive` 收口点全在其自有文件（binding/refresh-pipeline.ts:277、renderer/hooks/use-scada-points-bridge.ts:373、use-scada-handles.ts:107），3d 的宽松语义全在其自有导出（analyzeBindingSubscriptions 等）。域差异可经策略参数干净分离。
- `flux-core/src/value-adapter.ts`(390L) ↔ `flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`(363L)：3 clones 78L（评审实测）；detail-field.tsx/detail-view.tsx 另有编译/确认序列克隆。**i18n 接缝**：flux-core `toValidationIssues`（value-adapter.ts:99-107）输出英文 message + cause；form-advanced helper（:147-157）输出 `t('flux.form.validationFailedDetail',…)` 本地化 message 无 cause——两条用户可见行为各自成立。flux-core **零依赖**（flux-i18n 依赖 flux-core，反向边=循环依赖，depcruise no-circular），**组合 API 不得吸收 t() 调用**，message 格式化必须是注入点。
- industrial 包内：`findNodeById` 三处逐字同文（config-adapter.ts:171、editor-engine.ts:444、compute-inverse.ts:35，后者另有 removeNodes:174/applyUpdates:188）；引擎 hooks 双线（use-editor-engine 361L ↔ use-scada-engine 348L；use-editor-handles 244L ↔ use-scada-handles 160L）。editor 线特有：undo/redo adapter、toolbox（align/distribute/z-order/clipboard）、connections；runtime 线特有：点表 `isScadaPrimitive` 写收敛。可共享面 = 挂载/符号树订阅/test-handle 桥。
- report-designer-renderers 已依赖 spreadsheet-core 与 spreadsheet-renderers（package.json 确认）。jscpd 跨包克隆恰 **5 文件对**（评审实测）：host-action-provider↔host-action-provider 53L、report-designer-manifest↔spreadsheet-manifest-shapes 20L、report-spreadsheet-canvas↔default-page-body 34L、types↔types 10L、renderers↔renderers 9L。其中 host-action-provider 对（最大对）归 cq-2 Phase 2 承接。host-method **常量清单**（REPORT_DESIGNER_HOST_METHODS 12 方法 / SPREADSHEET_HOST_METHODS）是各自域，不可共享；可上移的是 contract shape builders（selection/clipboard/range 形状）与 manifest versioning 样板。
- 依赖边披露：spreadsheet-core 当前零依赖（仅 peer zustand）；contract 形状上移需新增 **spreadsheet-core → flux-core** 边（方向向下，flux-core 不反向 import，无环，depcruise 无禁止序）。
- CQ-D1 的 `createHostActionProvider` 工厂属 cq-2（draft），**本 plan 不依赖、不消费、不以其为 exit 前提**。

## Goals

- flux-react 新增 bindings 公共层（快照 scope + probe 求值核心 + primitive 谓词策略参数），3d/industrial 双双改为薄适配。
- flux-core value-adapter 增组合 API（validate message 经注入 formatter 保持包间差异），form-advanced detail-view 降为薄调用。
- industrial 包内符号树操作与 hooks 可共享骨架单实现化。
- report↔spreadsheet 的 contract shape builders 与 manifest versioning 样板上移 spreadsheet-core，双包消费。

## Non-Goals

- 不合并 3d 与 industrial 的渲染/挂载逻辑（只收敛 binding 求值层）。
- 不做 dashboard handles 的跨包收敛（依赖方向不允许；cq-2 follow-up 已记录，本 plan 仅在 industrial 内部收敛后于 dashboard 克隆处补来源注记）。
- 不动 host-action-provider 粘合层（cq-2 Phase 2 所有，不在本 plan exit 判据）；不动 designer inspector（CQ-D11 defer）；undo 栈统一另案（CQ-D13，optimization candidate）。

## Scope

### In Scope

- `packages/flux-react/src/bindings/`（新增）、`packages/flux-renderers-3d/src/binding/`、`packages/flux-renderers-industrial/src/binding/`
- `packages/flux-core/src/value-adapter.ts`、`packages/flux-renderers-form-advanced/src/detail-view/`
- `packages/flux-renderers-industrial/src/`（symbol-tree-ops、engine hooks）、`packages/flux-renderers-dashboard/src/editor/use-dashboard-editor-handles.ts`（仅注记）
- `packages/spreadsheet-core/src/`（contract shape builders 落点；新增对 flux-core 的依赖边）、`packages/{report-designer-renderers,spreadsheet-renderers}/src/`（4 对消费迁移）
- `docs/architecture/renderer-runtime.md`（bindings 层记录）

### Out Of Scope

- dashboard 完整收敛；渲染逻辑合并；host-action-provider 对（cq-2）；undo/inspector（defer 项）。

## Failure Paths

| 可测场景编号                   | 触发                                            | 行为                                                    | 可重试 | 用户可见表现                       |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------- | ------ | ---------------------------------- |
| binding-semantic-leak          | 3d 宽松语义泄入 industrial（或反向收口泄入 3d） | 策略参数显式隔离 + 双包行为锁定测试（含非法值路径）拦截 | 是     | 测试红，无用户可见影响             |
| detail-view-message-regression | 组合 API 统一了 message 格式                    | 注入 formatter 保持 flux-i18n 本地化文案                | 是     | detail-view 校验错误文案维持本地化 |

## Test Strategy

档位：**必须自动化**——binding 求值是渲染正确性前提：先为 3d/industrial 现有求值行为补齐行为锁定测试（合法路径 + 非法值路径 + 依赖探测），再抽公共层；迁移后双包测试全绿证明等价。

## Execution Plan

### Phase 1 - flux-react bindings 公共层 + 双包迁移

Status: planned
Targets: `packages/flux-react/src/bindings/`（新增）、3d/industrial flux-eval

- Item Types: `Proof | Fix`

- [ ] Proof：3d/industrial 各补 binding 求值行为锁定测试（合法路径 + 非法值路径 + 依赖探测），先绿（锁定现状）
- [ ] Fix：抽公共求值核心到 flux-react；primitive 谓词作策略参数注入（industrial 传 `isScadaPrimitive`，3d 传宽松谓词）；双包 flux-eval 改薄适配
- [ ] Proof：双包全部 binding 测试绿；flux-react 新模块单测绿

Exit Criteria:

- [ ] 两包 flux-eval 不再含 probe/snapshot 复制实现（grep 证明）
- [ ] 双包 focused 测试全绿（含非法值路径，语义零互漏）

### Phase 2 - value-adapter 组合 API + detail-view 薄化（message 注入点）

Status: planned
Targets: `packages/flux-core/src/value-adapter.ts`、`packages/flux-renderers-form-advanced/src/detail-view/`

- Item Types: `Fix | Proof`

- [ ] Fix：flux-core value-adapter 增 compile/run 组合 API；**validate message 格式化经注入 formatter**（flux-core 保持零依赖，不引 flux-i18n；form-advanced 注入 t() 包装，cause 语义差异注记）；detail-view helper 改薄调用；detail-field/detail-view 编译/确认序列抽包内共享模块
- [ ] Proof：detail-view 全部 focused 测试（value-adaptation-helper.test.ts 等 10+ 文件）绿；校验错误文案本地化无回归断言；`check:schema-prop-coverage` exit 0

Exit Criteria:

- [ ] value-adaptation-helper 与 flux-core 的 3 clones 78L 归零（jscpd 复测对应文件对，记录评审时工具输出为基线）
- [ ] form-advanced focused 测试绿 + 本地化文案断言绿

### Phase 3 - industrial 包内单实现化

Status: planned
Targets: `packages/flux-renderers-industrial/src/`

- Item Types: `Fix | Proof`

- [ ] Fix：新增 `symbol-tree-ops.ts`（findNodeById/add/removeNodes/applyUpdates 单实现），config-adapter/editor-engine/compute-inverse 三处迁移
- [ ] Fix：编辑器/运行时引擎 hooks 可共享骨架（挂载/符号树订阅/test-handle 桥）抽工厂；两线特有面（editor：undo/toolbox/connections；runtime：点表写收敛）保留各自文件
- [ ] Proof：industrial 全包测试绿（editor + renderer 两线用例）；dashboard handles 克隆处补来源注记。e2e 不在本轮判据（industrial 单测线全绿即准则）

Exit Criteria:

- [ ] `findNodeById` grep 单实现；hooks 双线骨架不再整段同文
- [ ] industrial focused 测试全绿

### Phase 4 - report↔spreadsheet contract shapes 上移

Status: planned
Targets: `packages/spreadsheet-core/src/`、report/spreadsheet renderers

- Item Types: `Fix | Proof`

- [ ] Fix：contract shape builders（selection/clipboard/range 形状）与 manifest versioning 样板上移 spreadsheet-core（**新增 spreadsheet-core → flux-core 依赖边**，方向向下无环）；4 对文件（manifest 形状/canvas/types/renderers）消费迁移；host-action-provider 对与 host-method 常量清单**不迁移**（分别归 cq-2 与各自域）；画布差异部分保留
- [ ] Proof：report/spreadsheet 双包 focused 测试绿；`check:workspace-manifest-deps` exit 0（依赖方向核验）

Exit Criteria:

- [ ] 4 对文件的共享部分单源化（jscpd 复测对应文件对，数据记录）
- [ ] 双包测试绿 + manifest 门禁绿 + 新依赖边披露于本 plan 与 spreadsheet-core package.json

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_3d02b5ba，两轮）
- Verdict: 首轮 `revised`（2 Major）→ 修订 → 第二轮 `pass`（零 Blocker/Major；非阻塞备注：本记录回填已完成）
- Rounds: 2
- Findings addressed: M1（"工厂已落地"改为 cq-2 draft 所有不依赖 + host-action-provider 对归 cq-2 + Phase 4 枚举 4 对）、M2（message 注入点 + 零依赖约束 + 本地化回归 Proof + Failure Paths 增行）；Minor 6 条全吸收（另超出要求：symbol-tree-ops 函数名改实测名、Closure Gates 增 pnpm check）

## Closure Gates

- [ ] 四组跨包重复全部单源化（jscpd 对应文件对复测数据记录）
- [ ] 包间依赖方向零违反（`check:workspace-manifest-deps`、`audit:deps` 绿；新增 spreadsheet-core→flux-core 边已披露）
- [ ] 行为锁定测试先行且迁移后全绿（含 binding 非法值路径与 detail-view 本地化文案）
- [ ] owner docs 已同步（bindings 层进 renderer-runtime.md；其余 No owner-doc update required）
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### dashboard handles 跨包完整收敛

- Classification: `optimization candidate`
- Why Not Blocking Closure: dashboard 与 industrial 无依赖边，收敛需 flux-react 增通用 handles 抽象（接口设计成本高、当前仅 76L 收益）；本 plan 已完成 industrial 内部收敛 + 来源注记
- Successor Required: `no`
- Successor Path: cq-2 Non-Blocking Follow-ups 已记录

### undo 栈统一（CQ-D13）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 五处存储策略差异系刻意设计（快照/整档 diff/命令），强行统一语义漂移风险大于 ~150L 收益
- Successor Required: `no`
- Successor Path: —

### designer inspector 共享 field-model（CQ-D11）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 需要设计器族架构决策（editor-core 定位升级 + 各设计器注入模型），非机械去重（分析报告第五节裁定）
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 3d binding 若新增数组/对象高级路径，策略参数需回归扩展测试

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<>>
- Evidence: <<>>

Follow-up:

- <<>>

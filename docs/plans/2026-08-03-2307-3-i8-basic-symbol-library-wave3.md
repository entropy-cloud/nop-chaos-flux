# 3 I8 基础图元库（Wave 3）

> Plan Status: active
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I8、Cross-Cutting 测试纪律/平台能力复用表）、`docs/components/industrial-hmi/design-symbols.md`（§4.2 属性 schema/§4.3 复合图元/§4.4 图元分类/§10 状态样式解析/§11 compound.ts）、`docs/components/industrial-hmi/design-data-binding.md`（§4.5 多状态呈现/§4.4 动画——I8.2 视觉状态与动画联动）、`docs/components/industrial-hmi/design-renderer.md`（§4.2 组态 JSON schema）
> Related: 上游 `docs/plans/2026-08-03-2113-3-i5-engine-core-wave1.md`（completed，I5.4 基础形状/deferred 复合图元与视觉状态）、`docs/plans/2026-08-03-2307-2-i7-implementation-gate-review.md`（I7 gate，前置等待）；下游 roadmap I9（Wave 4 设备图元库，依赖 I8.x）
> Mission: industrial-hmi
> Work Item: I8

## Purpose

实现基础图元库 Wave 3：基础图元族样式属性细化与 image/video 占位图元（I8.1）、视觉状态样式（选中/悬停/禁用/报警闪烁，与 I6.3 动画联动）（I8.2）、复合图元 group/instance（I8.3）——落在 `packages/flux-renderers-industrial/src/symbols/` 域（compound.ts + base-shapes 扩展 + 状态样式应用），纯逻辑单测先行，吸收 I5 plan deferred 项（复合图元与视觉状态样式）。收口状态：I8.1–I8.3 全部完成、roadmap I8 回写 `done`。

## Current Baseline

- I5.4 已落地：8 种基础形状（rect/round-rect/ellipse/line/arrow/pipe/text/polygon）、`symbol-registry.ts`（registerScadaSymbol/unregister/定义校验）、`symbol-factory.ts`（type→leafer 节点）、`style-resolver.ts`（`resolveSymbolStyle`：defaults ∪ 实例 ∪ statePatch 纯逻辑，优先级：实例 > defaults；statePatch 覆盖实例）、`register-builtin.ts` 包加载注册、V5 20+ 自定义图元全路径单测。
- `ScadaSymbolProps` 已含 `fillStyle?`/`shadow?`/`strokeDash?`/`flow?`/`custom?`/`scale?` 字段与 `states?`/`bindings?`/`animations?` 声明容器（`src/symbols/symbol-types.ts`）——schema 层就绪，样式值域（渐变/纹理字符串透传 leafer 样式系统）待 I8.1 细化落地。
- config-adapter 递归建树已支持 `children`（I5.3b）；`scada-group` 容器契约在 I5 plan Phase 4 明确「预留给 I8.3」（shape 族 group type 已预留命名空间，未实现 group 语义）。
- I6.3（执行后）将提供 animator（状态触发动画 start/stop + blink 报警闪烁）；I8.2 消费其状态联动能力（roadmap I8.2 依赖 I5.4+I6.3）。
- 序列化校验已含 bindings/states/animations 基本类型检查（`src/serialization/validate.ts:77-84`）；instance 序列化覆盖集输出（diff 于 defaults）待 I8.3 与 serialize/diff 增量协同。
- I5 plan deferred 条目（Successor Path: I8.2/I8.3）：复合图元（group 组合/instance 深合并）与视觉状态样式（选中/悬停/报警闪烁）——本 plan 落地。
- 真实浏览器视觉断言延后：hover/selected 视觉呈现需真实浏览器（`@leafer-in/state` 原语行为），首个可挂载页面为 I13.1，正式 e2e 断言补强为 I15.1。
- 真正剩余的 gap：fillStyle/shadow 样式细化未落地；scada-image/scada-video 占位图元不存在；视觉状态样式应用（状态 → 图元属性覆盖 + 动画联动）未实现；group/instance 复合图元语义未实现。

## Goals

- I8.1：基础图元族样式属性细化——fillStyle（渐变/纹理，透传 leafer 样式系统）、shadow、strokeWidth/strokeDash 组合在 base-shapes 生效并可按状态覆盖；`scada-image`/`scada-video` 占位图元注册（image：URL 经引擎图片缓存 + 桥接层 env.fetcher 归位，加载失败占位样式；video：静态占位帧/灰块）。
- I8.2：视觉状态（**图元侧视觉层**，业务状态流水线由 I6.3 binding 层状态机承担、本层只消费）——selected/hover/disabled 交互状态样式（hover/press 为图元内部实现细节，不进组态 JSON，design-symbols.md §10）；fault→blink 报警闪烁联动集成验证（消费 I6.3 animator，不重复实现）；状态切换（state:change → 样式覆盖 patch 经 `resolveSymbolStyle` 应用，动画启停由 I6.3 联动层负责）。
- I8.3：复合图元——`symbols/compound.ts`：group 建树（children 相对坐标 + 相对旋转）、instance 模板复用（`defaults` ← 实例 JSON 属性 ← 绑定/动画/事件声明分层深合并、`scale` 整体缩放、`custom` 透传）；instance 序列化覆盖集输出（diff 于 defaults）；config-adapter/场景树 + tree-registry 支持 group/instance 全路径（V5 单测扩展）。
- roadmap I8 回写 `done`；`docs/logs/2026/08-03.md` 记录收口摘要。

## Non-Goals

- 不实现设备族/仪表族/传感控制族/管道族图元库（I9.1–I9.4）。
- 不定义 `scada-symbol` 图元级 type 注册契约（讨论 §九：I8/I9 图元库成型后评估；本 plan 只落地图元库实现，评估时点见 Deferred 条目）。
- 不实现 React 桥接层（I10.1）、renderer-definitions 完整注册（I10.2）、点表↔flux 桥接（I10.3）。
- 不实现画布浏览交互与图元事件→action 全链路（I11）。
- 不写 Playwright 用例（真实浏览器视觉断言属 I13.1/I15.1，见 Deferred 条目）；不新增 leafer 之外的重型依赖。

## Scope

### In Scope

- `src/symbols/base-shapes/` 样式细化：fillStyle（渐变/纹理透传）、shadow、strokeWidth/strokeDash 组合在既有 8 形状上生效（样式解析与 leafer 节点属性映射断言）。
- `src/symbols/base-shapes/` 新增：`scada-image`/`scada-video` 占位符号实现（type 命名对齐 design-symbols.md §4.4 形状族 `scada-<名>` 无前缀）。
- `src/symbols/compound.ts`：group 建树/instance 覆盖深合并（纯逻辑单测先行）。
- `src/symbols/` 视觉状态应用：状态 → 样式覆盖 patch 应用（消费 `resolveSymbolStyle`）+ 状态触发动画联动（消费 I6.3 animator：fault → blink 等）。
- config-adapter/场景树 + tree-registry 支持 group/instance（构建/序列化/增量 diff 协同；instance 序列化覆盖集 diff 于 defaults）。
- V5 单测扩展：group/instance 复合图元全路径（注册 → 校验 → 实例化 → 场景树加载 → 序列化 → 卸载）。
- `docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

### Out Of Scope

- 设备/仪表/传感控制/管道图元库（I9）、视觉状态的真实浏览器 e2e 断言（I13.1/I15.1）。
- `scada-symbol` 图元级 type 注册契约（I8/I9 成型后评估，见 Deferred 条目）。
- 编辑器交互（图元拖拽/多选，I16）、性能复测（I14）。
- 渲染器桥接与 flux 集成（I10）。

## Failure Paths

| 可测场景编号                 | 触发                                                                                                                                 | 行为                                                                                                               | 可重试 | 用户可见表现                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------- |
| upstream-not-ready           | 前置未就绪——具体判定：roadmap I6 = `done` 且 roadmap I7 = `done`（gate-3-review 无待人工裁决项）；I6.3 animator 与 I5.4 图元契约可用 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                      | 是     | plan 保持 `planned`/`in progress`            |
| leafer-state-primitive-drift | `@leafer-in/state` hover/press 原语行为与设计表述不符（未引入插件时走引擎交互覆盖层）                                                | 回退为通用样式解析 + 引擎交互覆盖层（sky 层 hover 高亮，design-engine.md §6 交互覆盖层）+ 记录回写，不偏离设计契约 | 是     | hover 反馈降级为覆盖层高亮，后续 I7/I12 复核 |
| instance-merge-ambiguity     | 深合并优先级歧义（defaults/实例/绑定/动画/事件分层冲突）                                                                             | 纯逻辑单测固化优先级链（defaults ← 实例 JSON ← 声明层）；歧义记录为设计回写项                                      | 是     | 实例属性覆盖行为确定，无漂移                 |
| image-load-error             | image URL 加载失败（404/网络错误）                                                                                                   | 占位样式呈现（灰块 + 错误信号，onError 语义归 I10 桥接层消费）；引擎不直调 fetch（INV-1，经桥接层 env.fetcher）    | 是     | 图元显示占位，画面不崩溃                     |
| serialization-instance-drift | instance 序列化覆盖集与 defaults diff 语义漂移（漏 diff 或含 defaults 冗余字段）                                                     | 序列化单测断言覆盖集正确（diff 于 defaults，design-symbols.md §4.3）；修正 serialize/diff 协同                     | 是     | 导出组态 JSON 保持最小覆盖集                 |

## Test Strategy

档位选择：`必须自动化`——compound 深合并/状态样式解析/序列化覆盖集是图元模型核心回归路径（roadmap 测试纪律「纯逻辑层单测先行」）；Proof 项先于 Fix 项落地。图元 wiring（symbol-factory 实例化/group 建树/状态应用）以 `vi.mock('leafer-ui')` 覆盖（复用 `src/test-support/leafer-ui-mock.ts`）；hover/selected 真实浏览器视觉断言延后 I13.1/I15.1（watch-only residual，见 Deferred 条目）。

## Execution Plan

### Phase 1 - 前置验证 + I8.1 基础图元族（样式细化 + image/video 占位）

Status: planned
Targets: `src/symbols/base-shapes/`、`src/symbols/register-builtin.ts`

- Item Types: `Proof | Fix | Decision`

- [ ] `Decision`：roadmap Phase Status 回写 I8: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I0/I1/I2/I3 plan 先例）。
- [ ] `Proof`：前置验证——具体判定：roadmap I6 = `done` 且 roadmap I7 = `done`（`gate-3-review.md` 存在、无待人工裁决修正项）；`resolveSymbolStyle`/`registerScadaSymbol`/`symbol-factory` 契约可用；`design-symbols.md` §4.4 未被 I7 gate 修正为冲突。
- [ ] `Proof`：为样式细化写失败测试：fillStyle 渐变/纹理透传 leafer 样式系统（对象/字符串形态）、shadow 样式对象、strokeWidth/strokeDash 组合解析、样式在 8 形状实例化后的节点属性映射断言。
- [ ] `Decision`：状态覆盖对 fillStyle 的支持范围裁定——`ScadaSymbolStylePatch`（`src/symbols/symbol-types.ts:42-47`，design-symbols.md §4.2 定义的状态 style 类型）当前不含 `fillStyle`；裁定：**状态覆盖不扩展 `fillStyle`**（渐变属图元静态样式，状态覆盖只作用于色值类属性 fill/stroke 等既有 patch 字段；渐变状态覆盖需求未见确认场景，防止状态 patch 面膨胀）；裁定记录回写 design-symbols.md §4.2 注释（如实现期发现 leafer 渐变状态覆盖真实需求，按 I5/I6 plan Failure Paths `design-contract-conflict` 同口径记录并升级人工/下一 gate 评估）。
- [ ] `Fix`：`base-shapes/` 样式细化——fillStyle（渐变/纹理透传）、shadow、strokeWidth/strokeDash 组合在 8 形状 create/applyProps 生效（状态样式覆盖范围按 Phase 1 Decision 裁定，不扩 `ScadaSymbolStylePatch`）。
- [ ] `Proof`：为 image/video 占位符号写失败测试：`scada-image`（URL 属性 → 占位/加载后呈现路径）、`scada-video`（静态占位）、未配置 URL 的占位默认样式、加载失败占位（Failure Paths `image-load-error`）。
- [ ] `Fix`：`base-shapes/` 新增 `scada-image`/`scada-video` 占位符号（type 命名对齐形状族无前缀约定；image URL 加载经引擎图片缓存路径，外部 IO 归 renderer 桥接层 env.fetcher——INV-1，引擎不直调 fetch）；`register-builtin.ts` 注册扩展。
- [ ] `Fix`：序列化/校验协同——`ScadaSymbolNode` 校验支持 image/video 的 custom/URL 字段（validate 增量），serialize/diff 对新图元类型无回归（既有单测保持绿）。

Exit Criteria:

- [ ] base-shapes 样式细化与 image/video 占位符号 focused 单测全绿（渐变/阴影/线宽/占位/加载失败断言）。
- [ ] 8 形状 + image/video 经 config-adapter 组态 JSON 构建路径可实例化（场景树节点与属性映射断言）。

### Phase 2 - I8.2 视觉状态样式（消费 I6.3 状态机，不重复接线）

Status: planned
Targets: `src/symbols/`（视觉状态应用模块）、I6.3 状态机联动层消费验证

> **所有权分界（裁定）**：业务状态流水线（绑定求值 → value-to-state 判定 → 样式覆盖 patch 汇入脏收集 + animator 按 `when: { state }` 启停）由 **I6.3 binding 层状态机联动**承担（I6 plan Phase 3 已交付）；I8.2 只负责**图元侧视觉层**：交互状态（hover/press/selected/disabled——图元内部实现细节，不进组态 JSON，design-symbols.md §10）、hover 视觉降级路径（sky 覆盖层）、以及 fault→blink 与 I6.3 联动行为的集成验证。I8.2 不重写业务状态流水线，只消费其输出。

- Item Types: `Proof | Fix`

- [ ] `Proof`：为图元侧视觉状态应用写失败测试：I6.3 状态机输出的状态（run/stop/fault）→ `resolveSymbolStyle` 计算（defaults ∪ 实例 ∪ statePatch，状态优先）→ 写入图元节点属性（走引擎批量写路径）；退出状态恢复 normal 样式；`visible: false` 用节点 visible 而非移除（绑定索引稳定）；交互状态（hover/press/selected/disabled）与业务状态（run/stop/fault）分层不冲突。
- [ ] `Fix`：`src/symbols/` 视觉状态应用模块——消费 I6.3 状态机联动层的状态输出，应用状态样式 patch（经 `resolveSymbolStyle` 计算后写入节点属性）；交互状态（hover/press/selected/disabled）为图元内部实现细节（不进组态 JSON，design-symbols.md §10）；如 `@leafer-in/state` 原语不可用，按 Failure Paths `leafer-state-primitive-drift` 回退为引擎交互覆盖层（sky 层高亮，design-engine.md §6）。
- [ ] `Proof`：为 fault→blink 联动写**集成验证**测试（不重复实现 animator）：fault 状态经 I6.3 状态机联动 → blink 动画启动（`when: { state: 'fault' }` 语义）、退出 fault → blink 停止、其他状态（run/stop）样式与动画正确（状态色 + 无闪烁）——断言验证的是 I6.3 联动层输出与本层视觉应用的端到端行为。
- [ ] `Fix`：视觉层消费接线验证——I6.3 联动层产出的样式覆盖 patch 在本层正确应用（消费 `ScadaStateDefinition.style`，design-data-binding.md §4.5）；本 Phase 若发现联动层缺口（如某状态样式未透出），作为修正项交回 I6 域修正并在本 plan 记录（不静默绕过）。

Exit Criteria:

- [ ] 图元侧视觉状态应用单测全绿（样式覆盖优先级/退出恢复/hover 分层断言）；fault→blink 集成验证测试通过（验证 I6.3 联动层输出与本层视觉应用的端到端行为，非重复实现）。
- [ ] 消费接线验证完成：I6.3 状态机联动层产出的样式覆盖 patch 在本层正确应用；发现的联动层缺口已作为修正项记录（未静默绕过）。

### Phase 3 - I8.3 复合图元（group/instance）

Status: planned
Targets: `src/symbols/compound.ts`、`src/serialization/`、`src/engine/config-adapter.ts`

- Item Types: `Proof | Fix`

- [ ] `Proof`：为 group 建树写失败测试：group 相对坐标/相对旋转的子图元布局、children 递归建树（含嵌套 group）、group 节点在 tree-registry 的索引（父/子 id 均注册）、group 销毁清理。
- [ ] `Fix`：`symbols/compound.ts` group 部分——group 建树（子节点坐标相对父级 + 相对旋转，design-symbols.md §4.3）；`scada-group` 容器 type 实现（I5 预留契约）；config-adapter 递归建树复用（children 已支持，补充 group 语义装配）。
- [ ] `Proof`：为 instance 覆盖写失败测试：深合并优先级链（`defaults` ← 实例 JSON 属性 ← 绑定/动画/事件声明层）、`scale` 整体缩放、`custom` 字段透传、实例属性覆盖集 diff 于 defaults（序列化输出最小覆盖集）。
- [ ] `Fix`：`symbols/compound.ts` instance 部分——实例化模板复用（`type` 指向已注册符号 + 属性覆盖深合并后经 symbol-factory create）；`scale` 整体缩放应用。
- [ ] `Proof`：为复合图元序列化写失败测试：group children 树递归序列化（I5.3 已有基础，扩展 group 语义）、instance 序列化覆盖集输出（diff 于 defaults，`serialization-instance-drift` Failure Path）、applyDiff 增量对 group/instance 子树生效。
- [ ] `Fix`：序列化协同——serialize/diff 支持 instance 覆盖集（diff 于 defaults）与 group 子树递归；config-adapter `applyDiff` 对复合图元子树增删/属性 patch 收敛（避免全量重建）。
- [ ] `Proof`：V5 单测扩展——group/instance 复合图元全路径（注册 → 校验 → 实例化 → 场景树加载 → 序列化 → 卸载）；20+ 自定义图元基线保持绿（I5 V5 单测不弱化）。
- [ ] `Fix`：`docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

Exit Criteria:

- [ ] compound.ts（group/instance）纯逻辑单测全绿（相对坐标/深合并优先级/scale/custom 透传/覆盖集 diff 断言）。
- [ ] group/instance 经 config-adapter 场景树全路径 + 序列化/applyDiff 协同单测通过；V5 基线保持绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，task `ses_037d1212bffekKyZ1T0H8kgyht`）
- Verdict: `pass-with-minors`（round 2；round 1 `revise`，2 Major + 1 Minor 全部落地；round 2 零 Blocker/Major，1 新 nit 已修正）
- Rounds: 2
- Findings addressed: M-1「roadmap `todo → planned` 状态流转缺失」→ Phase 1 增 roadmap 回写 Decision 项 + Closure Gates 状态机未跳序断言；M-2「I8.2 与 I6.3 状态机联动层重复接线（双簿记）」→ Phase 2 重写：所有权分界裁定（业务状态流水线属 I6.3 binding 层，I8.2 只做图元侧视觉层：交互状态/sky 降级/fault→blink 集成验证）+ Goals/Exit Criteria 对齐；m-1「ScadaSymbolStylePatch 扩展未裁定」→ Phase 1 增 Decision（状态覆盖不扩展 fillStyle，回写 design-symbols.md §4.2 注释）；R2 nit（design-contract-conflict 引注同 I7 修正口径）已落地。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [ ] I8.1–I8.3 全部落地：样式细化/image-video 占位/视觉状态应用与动画联动/group/instance 复合图元，均有 focused 单测覆盖，包级 typecheck 通过。
- [ ] 契约一致性：图元 type 命名与 `design-symbols.md` §4.4 分类对齐（形状族无前缀、group/instance 语义 §4.3）；状态样式解析规则（§10）与 I6 状态机联动一致，无未裁定偏离。
- [ ] I5 deferred 项（复合图元与视觉状态样式，Successor Path I8.2/I8.3）已落地；V5 20+ 自定义图元基线保持绿（未弱化）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] roadmap 状态机未跳序：I8 `todo → planned` 已在激活期完成，收口时 `planned → done` 由独立 closure-audit 核验后回写。
- [ ] 受影响的 owner 文档已同步（docs/logs 收口摘要；design-\*.md 风险节如需回写已记录；架构文档同步属 I15.2）。
- [ ] roadmap Phase Status I8 已回写 `done`。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 真实浏览器视觉状态 e2e 断言（hover/selected/报警闪烁视觉）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 视觉状态的行为语义（样式优先级/动画联动）已由纯逻辑 + vi.mock 单测覆盖；真实浏览器内的 hover 视觉呈现与 `@leafer-in/state` 原语行为需 playground 页面挂载点才能运行——首个可挂载页面为 I13.1 scada-demo，正式 e2e 程序化断言补强属 I15.1；属 roadmap 既定顺序，不构成 I8 的 in-scope 缺陷。
- Successor Required: `yes`
- Successor Path: roadmap I13.1（首个可挂载页面）与 I15.1（e2e 程序化断言补强）

### `scada-symbol` 图元级 type 注册契约评估

- Classification: `watch-only residual`
- Why Not Blocking Closure: 讨论 §九 裁定图元级 type 本期不注册，I8/I9 图元库成型后评估（design-symbols.md §12.2 deferred 裁定，I2 plan 同口径）；本 plan 只落地图元库实现（基础形状族 + 复合图元），注册契约评估时点为 I9 设备图元库成型之后，由 roadmap 状态机触发（不构成 in-scope 缺项）。
- Successor Required: `no`
- Successor Path: —（I9 成型后由 roadmap 状态机触发评估）

### 性能复测与基准固化

- Classification: `watch-only residual`
- Why Not Blocking Closure: 性能验收（10 万图元 ≥45fps/首屏 <2s/内存 ≤320MB；1 万点刷新 <200ms）属 I14 benchmark 计划（I14.1 固化测量方法、I14.3 复测结论），I8 只按设计基线实现（含复合图元实例化路径），不提前固化基准方法（gate-1-review A4 口径声明）。
- Successor Required: `yes`
- Successor Path: roadmap I14

## Non-Blocking Follow-ups

- `src/test-support/leafer-ui-mock.ts` 按需扩展（Group 子树/状态样式/图片节点 mock 面），供 I9/I10 测试复用。
- 若实现期发现 leafer 状态原语/渐变样式实际 API 与设计表述偏差（Failure Paths `leafer-state-primitive-drift`），修正记录供 I12 gate 复核输入。
- I9 设备图元库落地后由 I15.1 补强图元体积面单测（与 I5 plan Non-Blocking Follow-ups 一致）。

## Closure

Status Note: 关闭时填写（I8.1–I8.3 落地情况、契约一致性、deferred 裁定、closure-audit 证据摘要）。

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent（fresh session）执行
- Evidence: 待定

Follow-up:

- 待定（关闭时填写；确认无 in-scope 残留或记录 successor）

## Optional Sections

## Risks And Rollback

- **复合图元复杂度风险**：instance 深合并优先级链（defaults ← 实例 ← 声明层）需交叉验证——纯逻辑单测固化优先级（design-symbols.md §12.2 风险项）；歧义记录回写设计文档，不静默选择。
- **状态样式与交互样式分层风险**：业务状态（run/stop/fault）与交互状态（hover/selected）分层不冲突由单测覆盖；hover 视觉降级路径（sky 覆盖层）已在 Failure Paths 固化。
- **image 资源 IO 边界**：图片 URL 加载属外部 IO（INV-1），引擎经图片缓存 + 桥接层 env.fetcher 归位；本 plan 只实现占位与缓存接入点，真实加载链路随 I10.1 桥接层落地。

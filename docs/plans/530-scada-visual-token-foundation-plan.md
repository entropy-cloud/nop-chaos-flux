# 530 SCADA 视觉与令牌基础（S1）Plan

> Plan Status: completed
> Last Reviewed: 2026-10-06
> Source: `docs/backlog/scada-3d-ux-parity-roadmap.md`（S1 工作项）/ `docs/plans/526-flow-designer-drag-visual-remediation-plan.md`（令牌公式与 designer-theme.css 模式）/ `docs/analysis/2026-10-05-designer-ai-ux-comparative-analysis.md`（S1–S16 画布标准）
> Related: plans 526–529（同口径前序批次，全部 completed）；HCA roadmap（已治理维度边界）

## Purpose

把 plans 526 已验证的选中态视觉公式（ring + 浅填充 + 软阴影）与语义令牌纪律（`--fd-*` 模式）延伸到 SCADA 交互覆盖物与编辑器 DOM 样式面：覆盖物硬编码 hex → `--ind-*` 语义令牌（light/dark 双块）、三态视觉公式升级、DOM 侧 120ms 过渡补齐、leafer Editor EditBox 选中样式定制能力裁定。收口状态：SCADA 运行态/编辑态的选中与悬停视觉全部令牌驱动、可随宿主主题翻转，样式面过渡动效到位，owner doc 记录令牌契约与裁定。

## Current Baseline

2026-10-06 live repo 探查（证据到文件行号）：

- **覆盖物预设硬编码 hex**：`packages/flux-renderers-industrial/src/engine/interaction-overlay.ts:14-19` `INTERACTION_STYLE_PRESETS` = hover `#2f6fed` / press `#1e4fbd` / selected `#ff7f2a` / disabled `#9ca3af`；`InteractionStyle` 仅 `stroke/strokeWidth/fill/opacity` 四键；`refresh()`（interaction-overlay.ts:152-154）按这四键白名单回拷样式——新增样式键必须同步扩白名单。
- **覆盖物形态**：sky 层 Group（`hittable: false`，interaction-overlay.ts:90）内 Rect，screen 坐标绘制；覆盖物与业务状态分层（业务状态写图元节点，覆盖物独立 sky 层，`symbols/state-visual.test.ts:171-186` 已固化该分层断言）。
- **实况接线**：运行态仅 hover 态实际触发（`engine/scada-engine.ts:368`、`renderer/hooks/use-scada-events.ts:106` 均无参调用 `highlight(id)` → 默认 hover 预设）；selected/disabled（及 hover）为程序化 API 面（`state-visual.test.ts:176,434,451-452` 消费），press 无既有消费者、同为程序化 API 面——**本 plan 不发明 selection 运行态接线**（交互正确性归 HCA 口径），只升级预设公式这一契约面。
- **编辑态选中视觉** = leafer Editor 默认 EditBox，零定制：`editor/renderer/editor-engine.ts:89` `editor: { selectArea: true, selectKeep: true }`；`@leafer-in/editor@2.2.9` 默认配置 `stroke: '#836DFF', strokeWidth: 2, pointFill: '#FFFFFF'`（node_modules `@leafer-in/editor/src/config.ts:9-13`），appConfig `editor:{}` 分支即配置合并通道（`selectArea/selectKeep` 已由此透传），EditBox 样式最小定制**有直接证据支持**。
- **样式面现状**：`src/styles.css`（31 行，运行态）+ `src/editor/styles.css`（197 行，编辑器）均消费 `--nop-*` + 字面 fallback；**全包零 `transition` 规则**（grep 0 命中）。`--nop-*` 定义于 `apps/playground/src/styles.css`（light 块 `.nop-theme-root` 起于 :102，dark 块 `:root[data-mode='dark']` 起于 :191），dark 触发器 `[data-mode='dark']`（与 `packages/flow-designer-renderers/src/designer-theme.css` 同款）。playground 两张表都加载（`apps/playground/src/styles.css:18-19`）。
- **526 模式参照**：designer-theme.css:43-47 令牌定义 + :173-189 显式规则 `transition: box-shadow 120ms ease` + ring/shadow 双层公式（`.selected { box-shadow: 0 0 0 2px ring, shadow }`）。
- **测试与 e2e 通道**：`state-visual.test.ts` 以真实 `InteractionOverlay` + mock engine 断言 `rect.stroke === PRESETS.hover.stroke`（:443）——常量自洽，改预设值不破坏既有断言；e2e 已有 `__flux_scada_${cid}` → `app.sky` → `scada-interaction-overlay` group 读取通道（`tests/e2e/scada-demo.spec.ts:45-63` readOverlayRects）；DOM computed-style 断言口径见 `tests/e2e/flow-designer-ux-visual.spec.ts:78-137`。
- **命名空间**：`--ind-*` 全仓库未被占用（grep 0 命中）。
- **HCA 已治理（不重复）**：交互正确性、undo 事务、a11y、性能、序列化校验（`docs/backlog/industrial-hmi-component-audit-roadmap.md`）；覆盖物几何解析与 hittable 契约（gate-4-review、P1-7、I15.1）不在本 plan 触碰面内。
- **对标水位**（roadmap 对标小节，WinCC）：设计期覆盖物仅承担选择/悬停视觉、不侵入运行态绑定路径（已成立：sky 层 + hittable:false + 业务写图元节点，保持为不变量）；三态区分度以商业 HMI hover/selected/press 为水位。

## Goals

- 交互覆盖物颜色 → `--ind-*` 语义令牌（light/dark 双块），Canvas 侧经画布容器 computed style 解析，解析失败回退内置常量（现值，裸宿主兜底）。
- hover/press/selected 升级 ring + 浅填充双层公式（selected 另加软阴影），disabled 保持单描边 + 降透明；三态区分度不低于现状。
- `editor/styles.css` 补齐 palette item / toolbox 分组 / 状态栏等 DOM 反馈的 120ms transition（外观属性限定，几何属性排除）。
- leafer Editor EditBox 选中样式定制能力裁定并落地（默认路径：appConfig `editor:{}` 最小样式接线），产出一页裁定记录。
- e2e computed 视觉断言：令牌 light/dark 解析值 + 覆盖物终态色值（经既有句柄通道），不落截图判据。

## Non-Goals

- 不碰交互正确性、undo 事务粒度、a11y、性能、序列化校验（HCA 已治理，见 roadmap Cross-Cutting 边界纪律）。
- 不改覆盖物几何解析、命中测试、事件链（P1-7 / I15.1 / gate-4-review 契约保持）。
- 不新增运行态 selection 接线（press/selected/disabled 保持程序化 API 面，选择交互归 HCA 口径）。
- 不做 leafer Editor 包裹层视觉重构，不引入新依赖，不动 `--nop-*` 既有令牌面。
- 不含 S2（拖拽/palette）、S3（菜单/面板宽度）、D1/D2（3D）任何条目。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/engine/interaction-overlay.ts`：`InteractionStyle` 增 `shadow` 键、预设令牌化解析接线、refresh 白名单扩键。
- 新增令牌解析模块（engine 侧，如 `engine/interaction-tokens.ts`）：`getComputedStyle` 解析 `--ind-*` + 常量 fallback。
- `src/styles.css` + `src/editor/styles.css`：`--ind-*` light/dark 令牌块 + DOM 反馈 transition。
- `editor/renderer/editor-engine.ts`：EditBox 最小样式接线（裁定后）。
- 单测（state-visual / interaction-overlay 侧重）+ e2e（scada 家族新增 computed 断言）。
- owner doc 回写：`docs/components/industrial-hmi-editor/design-architecture.md`（或 design-renderer.md 对应节）令牌契约与裁定记录。

### Out Of Scope

- palette 拖拽 ghost / 落点指示 / 检索 / 吸附（S2）。
- 右键菜单 / WorkbenchShell 宽度回调 / 空态升级（S3）。
- 3D 渲染器一切条目（D1/D2）。
- `--nop-*` 令牌面与 playground 主题系统改造。

## Failure Paths

| 可测场景编号     | 触发                                            | 行为                                                                                                                                        | 可重试                      | 用户可见表现                       |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------- |
| token-unresolved | 宿主未加载 industrial 样式表 / 容器无 `--ind-*` | 解析链逐级回退（容器 → documentElement → 内置常量）                                                                                         | 是（每次 highlight 重解析） | 覆盖物显示内置默认色（与今日一致） |
| token-malformed  | `--ind-*` 值非法（空串/乱码）                   | 该键回退常量，其余键不受影响                                                                                                                | 是                          | 单键颜色回退，无白屏/无异常抛出    |
| animate-env-noop | leafer animate 在 headless/mock 环境不可用      | 终态已同步 set 先行 + try/catch 包裹动画通道双防线（仓库无 leafer animate 守卫先例，守卫为本 plan 首创；实际行为由 D-530-1 spike 实测定夺） | 是                          | 无过渡直接终态（可接受终态）       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`建议有测`（一般视觉功能），但对两处升级为硬性自动化——①令牌解析器 fallback/注入两路单测（判别性：旧实现下注入容器令牌不生效必挂、新实现通过）；②e2e computed 断言（令牌解析值 + 覆盖物终态色值 + DOM transition），不落截图判据（2026-08-28 政策）。

## Execution Plan

### Phase 1 - 令牌解析与覆盖物公式（canvas 侧）

Status: completed
Targets: `packages/flux-renderers-industrial/src/engine/interaction-overlay.ts`、`engine/interaction-tokens.ts`（新）、`symbols/state-visual.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Fix：新增 `interaction-tokens.ts` 解析器——`resolveInteractionStyles(container)` + `readIndTokenVar`：经 `getComputedStyle` 逐键解析 `--ind-interaction-hover/-press/-selected/-disabled`（含 `-fill`/`-selected-shadow` 变体），空值/非法回退内置常量（= 现预设值）；解析失败静默（Failure Paths token-unresolved/token-malformed）。
- [x] Fix：`InteractionOverlay.highlight` 默认样式改为「容器解析优先（每 overlay 生命周期缓存），fallback = `INTERACTION_STYLE_PRESETS`」；`INTERACTION_STYLE_PRESETS` 迁至 `interaction-tokens.ts` 并自 overlay re-export（既有 import 路径不变，`state-visual.test.ts:12` 不破坏）。
- [x] Fix：预设公式升级——hover/press = ring stroke + 浅填充；selected = ring stroke + 浅填充 + 软阴影（`shadow` 键，leafer IShadowString 形态）；disabled 保持单描边 + opacity 0.55。
- [x] Fix：`InteractionStyle` 增 `shadow?: string`；`refresh()` 回拷白名单加 `shadow`。
- [x] Proof：单测（`engine/interaction-tokens.test.ts` + `engine/interaction-overlay-tokens.test.ts`，12 用例）——(a) 无令牌/容器缺失回退 PRESETS；(b) getComputedStyle stub 注入令牌后解析值生效（判别性：旧常量实现下注入不翻转必挂）；(c) 非法值逐键回退（含 named/oklch 合法形态放行、shadow 缺长度分量回退）；(d) refresh 后 shadow 键保留；(e) 三态公式常量面互异断言；overlay 接线：默认 highlight 走解析链、显式样式优先、fallback 值正确。
- [x] Decision（D-530-1）：canvas 覆盖物 120ms 过渡通道——**已落地**，形态与起草时预想不同（spike 实测推翻两处前提，就地记录）：①leafer-ui 2.2.9 本体**不含 animate 插件本体**（核心 `animate()` 走 `Plugin.need('animate')`、`killAnimate` 仅为空钩子 stub 与 destroy 调用点，dist 有命中但非插件实现；closure audit 就地勘误——起草时「dist 0 命中 killAnimate」取证表述失实；基础 `set(data, _transition)` 仅 Object.assign 忽略第二参）；`@leafer-in/animate` 仅是 playground 直接依赖且只在 leafer-examples demo 页 import；②过渡的正确入口是插件重写的 `set(data, transition)`（类型面 `IUI.set(data, transition?)`）。落地形态：`applyOverlayAttrs` 几何键即时 set、样式键 `set(styleAttrs, OVERLAY_TRANSITION)`（`{duration:0.12, easing:'ease-out'}`）；`playFadeIn` 终态 set 先行 + opacity 0→目标值过渡；**industrial 包不捆绑插件**（避免 140 个测试文件真实模块加载风险），playground 宿主侧 `main.tsx` 全局 `import '@leafer-in/animate'`（已有依赖）；未加载宿主 base set 忽略第二参 → 即时终态（Failure Paths animate-env-noop 契约降级路径）；mock 环境 MockLeaf.set 忽略第二参 → 单测确定性。修途中发现并修复 geometry 键丢失缺陷（applyDiff reposition 用例捕获）。
- [x] Proof：Phase 1 focused 单测全绿——`@nop-chaos/flux-renderers-industrial` 140 文件 1641 用例全过。

Exit Criteria:

- [x] `interaction-tokens.ts` 解析器落地，highlight/refresh 接线完成，`InteractionStyle.shadow` 键全链路（含 refresh 白名单）打通。
- [x] 单测覆盖 fallback / 容器注入 / refresh 保留 shadow / 三态公式四路，全绿。
- [x] D-530-1 spike 已实测，裁定结果（落地代码或 Deferred 记账）已落 plan。

### Phase 2 - DOM 令牌块与 transition（样式面 + e2e）

Status: completed
Targets: `src/styles.css`、`src/editor/styles.css`、`tests/e2e/scada-ux-visual.spec.ts`（新）

- Item Types: `Fix | Proof`

- [x] Fix：`--ind-*` light 块定义（runtime `styles.css`，作用域 `.nop-scada-canvas`）+ `[data-mode='dark'] .nop-scada-canvas` 重声明；editor `styles.css` 以同值块定义于 `.nop-scada-editor-canvas`（双表自足——两表可被宿主独立加载；块间交叉引用注释防漂移）。令牌值与 Phase 1 内置常量同源（light 块值 = fallback 常量）。
- [x] Fix：`editor/styles.css` DOM 反馈 transition 补齐——palette item / toolbox 分组 / 状态栏反馈属性（`background-color / border-color / outline-color / opacity / box-shadow`）120ms ease；**几何属性（width/height/transform/top/left/inset）不得入 transition**（527 落地的 PD_OVERLAY_TRANSITION 同款纪律，live 见 `packages/page-designer-renderers/src/page-designer-tokens.ts:19`）。
- [x] Proof：e2e `scada-ux-visual.spec.ts`（flow-designer-ux-visual 口径，5 用例）——(a) DOM probe：light 下 `--ind-*` 九键解析值断言（custom property 原文形态）；(b) dark（`data-mode='dark'`）下 hover/selected/ring 翻转断言；(c) canvas：hover 覆盖物 stroke/fill 终态 = light 令牌值（`__flux_scada_*` 句柄读 leafer Rect）；(d) dark 下覆盖物 stroke = dark 令牌值；(e) editor palette item / toolbox group computed `transition-property` 含 appearance 属性、不含几何属性、duration 0.12s。
- [x] Proof：e2e scada 家族回归——scada-demo + scada-edge-cases + scada-editor-plan522 + scada-editor-interaction-correctness 33 用例全过；scada-pointer-events-regression + scada-size-consistency 通过（后者 1 例首跑 flaky、retry 通过，与令牌块无布局影响面，收口全量时复核）。

Exit Criteria:

- [x] 两张样式表 `--ind-*` light/dark 块落地且值同源。
- [x] `scada-ux-visual.spec.ts` computed 断言全绿（令牌 light/dark + 覆盖物终态 + DOM transition），5/5。
- [x] 既有 scada e2e 家族无回归。

### Phase 3 - EditBox 裁定落地与 owner doc 回写

Status: completed
Targets: `editor/renderer/editor-engine.ts`、`docs/components/industrial-hmi-editor/design-architecture.md`

- Item Types: `Decision | Fix`

- [x] Decision（D-530-2）：EditBox 选中样式定制裁定。证据：`@leafer-in/editor` 默认 `stroke:'#836DFF'` 经 appConfig `editor:{}` 合并覆盖（`Editor` 构造 `DataHelper.default(userConfig, clone(config))`，`selectArea/selectKeep` 同通道）。**裁定 = 落地最小定制**；包裹层视觉为拒绝路径（成本高且与 leafer EditBox 命中/手柄体系冲突），裁定记录已写入 owner doc §10.1。
- [x] Fix：`editor-engine.ts` appConfig `editor:{}` 增 `stroke: readIndTokenVar(container, EDITOR_SELECTED_RING_VAR, EDITOR_SELECTED_RING_FALLBACK)`（创建时解析一次，口径与覆盖物令牌缓存一致；`pointFill`/交互行为不动）。
- [x] Fix：owner doc 回写——`design-architecture.md` 新增 §10.1 交互覆盖物与 EditBox 选中令牌契约（`--ind-*` 定义位置/键面/解析链/fallback/解析时机、三态公式、D-530-1 过渡口径与降级路径、D-530-2 裁定记录含拒绝路径）；dark 中途翻转不热更新登记为 watch-only residual。
- [x] Proof：focused 单测（`editor-engine.test.ts` +2 用例）——appConfig `editor.stroke` 在令牌注入时取解析值（getComputedStyle stub）、无令牌时取 fallback 常量；42/42 全绿。

Exit Criteria:

- [x] D-530-2 裁定完成：代码落地（编辑器选中框颜色随令牌）+ 一页裁定记录于 owner doc（含拒绝路径）。
- [x] owner doc 令牌契约节与 live 实现一致（路径/键名/fallback 行为逐条可对照）。
- [x] focused 单测（editor-engine 接线）全绿。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，不复用起草者上下文）
- Verdict: `pass`
- Rounds: 2（首轮 fail：1 Major + 4 Minor；修订后复核 pass）
- Findings addressed: M-1 删除「try/catch 双守卫 527 同款」出处声称（527 双守卫是 DOM ghost feature-detect，与 leafer animate 无关），改为如实首创表述并声明行为由 D-530-1 spike 定夺；m-1 实况接线改为「selected/disabled（及 hover）为程序化 API 面，press 无既有消费者」；m-2 PD_OVERLAY_TRANSITION 溯源 526→527 并补 live 路径 `page-designer-tokens.ts:19`；m-3 playground 令牌块行号改标块起点（light `.nop-theme-root` :102 / dark `:root[data-mode='dark']` :191）；m-4 readOverlayRects 引用区间 :54-68→:45-63。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本 plan 范围内：覆盖物硬编码 hex 与零 transition 即 live 视觉缺陷面，Phase 1/2 落地收敛）
- [x] 所有 in-scope confirmed contract drifts 已收敛（InteractionStyle/refresh 白名单契约一致性；`pnpm check` 六项门禁零新增红——discover-audit-suspects 回归基线 737、ui-consistency-gaps 新文件登记豁免、knip 收敛）
- [x] 行为/契约结果已达成（三态公式 + 令牌化 + DOM 过渡 + EditBox 裁定）
- [x] 必要 focused verification 已完成（判别性单测 12+2 用例 + e2e computed 断言 5 用例）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（dark 中途翻转不热更新为 watch-only residual，见 Deferred 节）
- [x] 受影响的 owner docs 已同步到 live baseline（design-architecture.md §10.1 令牌契约节）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78 任务全绿；industrial 140 文件 1643 用例、playground 41 文件 407 用例）
- [x] `pnpm check` 零新增红（exit 0；scanner-baselines 737=基线、ui-consistency/knip 收敛）
- [x] e2e scada 家族通过（`scada-ux-visual` 5/5 + 既有 scada-demo/edge-cases/interaction-correctness/plan522/pointer-events/size-consistency；size-consistency 1 例首跑 flaky、retry 通过，与本改动无布局影响面）

## Deferred But Adjudicated

### dark 主题中途翻转不热更新（覆盖物令牌缓存 / EditBox stroke）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 覆盖物令牌解析与 EditBox stroke 均为每引擎生命周期一次性解析（owner doc §10.1 已声明口径）；SCADA 工业现场为常驻单主题场景，会话内主题翻转非目标工况；编辑器 edit/preview 切换即重建引擎完成刷新；light/dark 双块值已由 e2e 双向断言（切换后可达性成立）——不影响当前 supported baseline 成立。
- Successor Required: `no`
- Successor Path: 后继 UX plan 如需主题热更新，可在此缓存点加失效钩子（interaction-tokens 解析缓存 / editor-engine 创建时解析），非必需。

（D-530-1 canvas 过渡通道已落地非 deferred；D-530-2 EditBox 定制已落地非 deferred。）

## Non-Blocking Follow-ups

- dark 模式下覆盖物/EditBox 的人工视觉抽查（非判据，供后续 UX 打磨参考）。

## Closure

Status Note: 三 Phase 全部 completed 且 closure audit（独立子 agent，2026-10-06）approved。覆盖物 hex → `--ind-*` 语义令牌（light/dark 双块双表、解析链 + fallback 契约）、三态 ring+浅填充+软阴影公式、DOM 反馈 120ms 过渡（appearance 属性限定）、D-530-1 canvas 过渡通道（宿主插件 + 优雅降级）、D-530-2 EditBox 最小定制落地。审计附带 4 Minor（owner doc/plan 键名笔误 ease→easing、killAnimate「0 命中」取证措辞、roadmap 双表同步、e2e 九键断言补全 2 行）已在同 commit 回写修正，无需代码返工。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，agent_2615e779-d583-4051-9498-75050eb8f8a9）
- Evidence: 2026-10-06 closure audit pass——三 Phase Exit Criteria 逐条 live repo 核验（git diff/打开文件/实跑）；抽样实跑：industrial 全量测试 140 文件 1643 用例（与声称精确一致）、editor-engine.test.ts 42 用例、scada-ux-visual e2e 5/5、scada-demo 15/15、typecheck、`find-ui-consistency-gaps.mjs`（No new unregistered gap）；判别性单测机制核验（getComputedStyle stub 注入翻转）；降级路径语义实勘（leafer-ui 核心 set 忽略 \_transition、animate() = Plugin.need）；deferred（dark 不热更新）watch-only 分类核验。4 Minor 已就地修正（本 commit）。

Follow-up:

- dark 模式下覆盖物/EditBox 的人工视觉抽查（非判据，Non-Blocking Follow-ups 已录）。

# W1b 容器与反馈组 + flux-renderers-content 包骨架

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W1b；`docs/components/{separator,card,progress,spinner,empty}/design.md`（契约已立约）；`docs/components/package-splitting-strategy.md` §2
> Related: 后续 `docs/plans/2026-06-24-0040-2-w1a-content-family-sanitization-plan.md`（W1a 复用本 plan bootstrap 的包）；`docs/plans/2026-06-22-2057-2-m5-mobile-native-components-plan.md`（NEW 包 bootstrap 参考）
> Mission: components
> Work Item: W1b

## Purpose

把 roadmap W1b（容器与反馈组：`separator`/`card`/`progress`/`spinner`/`empty`）从"design.md 已立约、代码 0%"推进到"5 个 renderer 实现 + renderer definition 注册 + playground 演示 + e2e 验证 + roadmap W1b 标 done"。同时**首次落地 NEW 包 `@nop-chaos/flux-renderers-content`** 的骨架（package.json/tsconfig/vite alias/root tsconfig ref/src/index.ts），为后续 W1a（内容展示）、W2a-content（cards/alert）、W3c（mapping/status）、W4a（多媒体）解除包级阻塞。

按 plan guide §22/§24/§26 与 roadmap 明确建议：本 plan 服务单一结果面"flux-renderers-content 包首波落地 + W1b 反馈族"，bootstrap 与首波组件合并在一个 owner plan 内（避免出现只有骨架零组件的微小 plan）。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **NEW 包不存在**：`packages/flux-renderers-content/` 目录不存在；`vite.workspace-alias.ts` 无 `@nop-chaos/flux-renderers-content` 别名；根 `tsconfig.json` project references 无此包。
- **目标包归属权威**：`docs/components/package-splitting-strategy.md` §2.1 明确 `flux-renderers-content`（纯内容展示与反馈）为目标态包，"当前尚未创建"。`docs/components/roadmap.md` Component Coverage 把 W1b 全部 5 个组件指向 `flux-renderers-content`。
- **owner-doc drift（待收敛）**：5 份 design.md（separator/card/progress/spinner/empty）第 3 节均写"预期归属 `@nop-chaos/flux-renderers-basic`"——这是包重组前的旧口径，与 authoritative 的 `flux-renderers-content` 冲突。本 plan 须同步修正。
- **契约已立约**：5 份 design.md 齐全（各 ~55 行），schema 字段、字段分类（value/value-or-region/region）、marker、样式复用 `@nop-chaos/ui` 均已定义。
- **UI primitive 齐全**：`@nop-chaos/ui` 已提供 `Separator`、`Card`/`CardHeader`/`CardContent`/`CardFooter`、`Progress`、`Spinner`、`Empty`（AGENTS.md UI 组件清单确认）。本族是薄适配层，无新第三方依赖。
- **renderer definition 模式**：参考 `packages/flux-renderers-basic/src/basic-renderer-definitions.ts`（`RendererDefinition`：type/displayName/category/sourcePackage/defaultSchema/component/fields region 声明）与 `packages/flux-renderers-mobile/src/index.ts`（`registerXxxRenderers(registry)` 注册助手模式）。
- **retained 状态**：`docs/components/amis-baseline-matrix.md` L70-71（separator/card）/L95-97（progress/spinner/empty）把 5 个组件标为 `targetContract`（未实现），wave 1。
- **前置依赖**：仅依赖 L0（已 done）。无移动端依赖。

## Goals

- 首次落地 `@nop-chaos/flux-renderers-content` 包骨架，满足 monorepo 集成约束（编译通过、alias 解析、root project ref、可被 playground import）。
- 5 个反馈 renderer（separator/card/progress/spinner/empty）作为 `flux-renderers-content` renderer 实现，严格遵循 `RendererComponentProps` 契约（读 `props.props`/`meta`/`regions`/`events`/`helpers`，不直接访问 store，遵循 AGENTS.md MANDATORY Renderer Component Contract）。
- 5 个 `RendererDefinition`（含 region 声明）+ `registerContentRenderers(registry)` 注册助手，从 `src/index.ts` 导出。
- playground 增 W1b 演示页并注册到 playground 路由；e2e 验证关键渲染与交互（程序化断言，非截图）。
- 收敛 owner-doc drift：5 份 design.md 第 3 节归属改为 `flux-renderers-content`。
- roadmap W1b Phase Status `planned→done`（closure 后），`amis-baseline-matrix.md` 5 个组件 `targetContract→runtime`。

## Non-Goals

- 不实现 W1a 内容展示组（markdown/html/link/image/json-view）——归本批次后续 plan `2026-06-24-0040-2`（涉及 sanitize 安全决策，独立 closure 单元）。
- 不引入 `react-markdown`/`dompurify` 等第三方依赖（本族纯 UI primitive 复用，零新依赖）。
- 不在本 plan 内重建 layout 引擎或集合渲染（`card` 是结构化卡片容器，不吸收 list/table 集合语义）。
- 不为 `card`/`empty` 设计展开/选中状态机（design.md 第 7 节明确此类交互归专门增强字段，非首版）。
- 不处理 `flux-renderers-layout` 包（归 W3a/W3b/W4b）。

## Scope

### In Scope

- `packages/flux-renderers-content/` 包骨架（package.json/tsconfig/tsconfig.build/vitest.config.ts/src/index.ts/styles.css）。
- `vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-content` 别名；根 `tsconfig.json` 增 project reference。
- `separator`：分隔线 renderer，复用 `@nop-chaos/ui` `Separator`；`orientation`/`decorative`/`label`（value-or-region）。
- `card`：结构化卡片容器，复用 ui `Card` 系；regions `header`/`body`/`footer`/`actions`；`title`/`image`/`variant`；`onClick`。
- `progress`：进度 renderer，复用 ui `Progress`；`value`/`max`/`label`/`variant`/`showValue`。
- `spinner`：加载指示 renderer，复用 ui `Spinner`；`label`（value-or-region）/`size`/`visible`。
- `empty`：空态 renderer，复用 ui `Empty`；regions `title`/`description`/`actions`；`image`。
- 5 个 renderer definition + `registerContentRenderers` + `src/index.ts` 导出。
- 5 个组件 focused 单测 + playground 演示页 + e2e。
- 5 份 design.md 第 3 节归属修正；roadmap/amis-baseline-matrix 状态同步。

### Out Of Scope

- W1a 内容族（独立 plan）。
- `flux-renderers-layout` 包（W3a/W3b/W4b）。
- 任何 markdown/html sanitize 逻辑。
- card 的 list/table 集合语义、展开选中状态机。

## Failure Paths

> 本族为薄适配层，失败场景较少；region 承载型组件（card/empty）与可见性控制有可测失败路径。

| 场景编号           | 触发                           | 行为                                          | 可重试 | 用户可见表现          |
| ------------------ | ------------------------------ | --------------------------------------------- | ------ | --------------------- |
| separator-vertical | `orientation:'vertical'`       | 渲染竖向分隔（ui Separator orientation 透传） | 否     | 竖向分隔线            |
| card-regions       | 提供 header/body/footer schema | 三个 region 分别渲染到 Card 对应区            | 否     | 卡片三段可见          |
| card-onclick       | `onClick` event 存在           | 点击卡片触发 action，不影响 region 子项交互   | 否     | 点击有响应            |
| progress-normalize | `value` > `max` 或 `max` 缺省  | 归一化为 ≤1（或 100%），不溢出                | 否     | 进度条满格不破版      |
| spinner-hidden     | `visible:false`                | 不渲染（meta.visible 也参与）                 | 否     | 无加载指示            |
| empty-actions      | `actions` region 有 schema     | actions 渲染为空态 CTA                        | 否     | 空态下方有按钮/操作区 |

## Test Strategy

本档选择：**建议有测**

理由：本族是 `@nop-chaos/ui` primitive 的薄 schema 适配层，无新依赖、无状态机、无外部集成。按 tier 表属"一般功能"。每个组件配 focused 单测验证 schema→UI props 映射与 region 承载；e2e 覆盖 playground 演示页关键渲染与点击交互（card onClick、empty actions），用程序化断言（`page.evaluate`/`locator`），不靠截图（遵循 AGENTS.md e2e 诊断约束）。非"必须自动化"档因无鉴权/契约/回归路径风险。

## Execution Plan

### Phase 1 - flux-renderers-content 包骨架

Status: completed
Targets: `packages/flux-renderers-content/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts,src/index.ts,src/styles.css}`；`vite.workspace-alias.ts`；根 `tsconfig.json`

- Item Types: `Fix`

- [x] **Fix**：新建 `packages/flux-renderers-content/`，以 `packages/flux-renderers-mobile/` 为 package.json 形状模板：`package.json`（name `@nop-chaos/flux-renderers-content`；deps 仿 `flux-renderers-data` 含 `flux-core`/`flux-i18n`/`flux-react`/`@nop-chaos/ui`——content renderer 消费 `RendererComponentProps` 故需 flux-react，区别于 mobile 包；peerDeps: lucide-react/react，scripts build/typecheck/test/lint 对齐）。
- [x] **Fix**：`tsconfig.json`（extends `../../tsconfig.base.json`，`noEmit:true`，include src + `../../types/**/*.d.ts`）+ `tsconfig.build.json`（对齐 mobile/data 包的 build 配置）+ `vitest.config.ts`（对齐 mobile 包 `--passWithNoTests`）。
- [x] **Fix**：`src/index.ts`（导出空 `contentRendererDefinitions: RendererDefinition[]` + `registerContentRenderers(registry)` 占位，对齐 `registerMobileRenderers` 模式）+ `src/styles.css`（空，预留 marker 样式）。
- [x] **Fix**：`vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-content` 与 `@nop-chaos/flux-renderers-content/styles.css` 别名（对齐 mobile 包两条别名写法，L61-63 + L67-69）。
- [x] **Fix**：根 `tsconfig.json` project references 增 `{ "path": "./packages/flux-renderers-content" }`。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查（全量验证归 Closure Gates）。

- [x] `pnpm install` 成功识别新 workspace 包（无依赖解析错误）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-content typecheck` 通过（空骨架可编译）。
- [x] playground `import { registerContentRenderers } from '@nop-chaos/flux-renderers-content'` 别名可解析（局部验证，无需跑全量 build）。

### Phase 2 - 5 个反馈 renderer 实现（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-content/src/{separator,card,progress,spinner,empty}.tsx`（新建，colocated `*.test.tsx`）

- Item Types: `Proof` + `Fix`

> 顺序：先写各组件 focused Proof（验证 schema→UI 映射与 region 承载），再确认 Fix 实现。Proof 与 Fix 可在每组件内交替闭环。

- [x] **Proof**：separator focused 单测——`orientation:'vertical'` 透传 ui Separator；`decorative` 透传；`label`（value-or-region）渲染。
- [x] **Fix**：`separator` 组件——读 `props.props`（orientation/decorative）+ `props.regions`（label region via `.render()`）；根节点 `nop-separator` marker；复用 ui `Separator`（不写裸 `<div>`）。
- [x] **Proof**：spinner focused 单测——`visible:false` 不渲染；`size` 透传；`label`（value-or-region）渲染。
- [x] **Fix**：`spinner` 组件——读 size/visible + label region；`nop-spinner` marker；复用 ui `Spinner`。
- [x] **Proof**：progress focused 单测——`value>max` 归一化不溢出；`showValue` 渲染数值；`label` 渲染。
- [x] **Fix**：`progress` 组件——数值归一化 helper（纯函数，单测覆盖）+ ui `Progress`；`nop-progress` marker。
- [x] **Proof**：empty focused 单测——`title`/`description`（value-or-region）渲染；`actions` region 渲染为 CTA。
- [x] **Fix**：`empty` 组件——消费 title/description/actions region；复用 ui `Empty`；`nop-empty` marker。
- [x] **Proof**：card focused 单测——header/body/footer/actions 四 region 分别渲染到 Card 对应区；`onClick` 触发 `props.events` 且不阻断子项交互。
- [x] **Fix**：`card` 组件——消费 header/body/footer/actions region；复用 ui `Card`/`CardHeader`/`CardContent`/`CardFooter`；title/image/variant 从 props 读；`onClick` 走 events；`nop-card` marker。

Exit Criteria:

- [x] 5 个组件实现，遵循 `RendererComponentProps`（不直接访问 store，遵循 AGENTS.md 契约）。
- [x] 5 个 focused 单测通过（验证 region 承载/props 透传/归一化/onClick，不仅不报错）。
- [x] 所有组件根节点带对应 marker class，且只使用 `@nop-chaos/ui`（无裸 HTML 布局元素）。

### Phase 3 - renderer definition + 注册 + playground + e2e + owner-doc 同步

Status: completed
Targets: `packages/flux-renderers-content/src/content-renderer-definitions.ts`（新建）；`src/index.ts`；`apps/playground/src/`（演示页 + 路由）；`tests/e2e/`；`docs/components/{separator,card,progress,spinner,empty}/design.md`；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：新建 `content-renderer-definitions.ts`，声明 5 个 `RendererDefinition`（`type`/`displayName`/`category:'display'` 或 `'container'`/`sourcePackage:'@nop-chaos/flux-renderers-content'`/`defaultSchema`/`fields`：card 的 header/body/footer/actions、empty 的 title/description/actions 为 region 声明，其余 value/value-or-region），对齐 basic 包注册模式。
- [x] **Fix**：`src/index.ts` 导出 5 个组件 + `contentRendererDefinitions` + `registerContentRenderers(registry)`。
- [x] **Fix**：`apps/playground/src/App.tsx` 增 `registerContentRenderers(registry)` 调用（对齐 L53-57 模式）；新增 W1b 演示页（展示 5 个组件各字段/region）并注册到 playground 路由（route-model.ts / index.ts）。
- [x] **Proof**：e2e（`tests/e2e/w1b-feedback-family.spec.ts`）——程序化断言：separator 竖向渲染、card 四 region 可见 + onClick 响应、progress 归一化、spinner visible 切换、empty actions 渲染。**不靠截图诊断**（遵循 AGENTS.md）。
- [x] **Follow-up**：修正 5 份 design.md 第 3 节"预期归属"由 `flux-renderers-basic` 改为 `flux-renderers-content`（收敛 owner-doc drift）。
- [x] **Follow-up**：roadmap W1b Phase Status 标 done（由 closure 阶段处理，非执行期自标）+ `amis-baseline-matrix.md` L70-71/L95-97 五组件 `targetContract→runtime`。

Exit Criteria:

- [x] `contentRendererDefinitions` + `registerContentRenderers` 从 `src/index.ts` 导出；playground 调用注册后 5 个 type 可渲染。
- [x] playground W1b 演示页可访问、5 个组件渲染正常、交互可用。
- [x] e2e 通过（程序化断言，非截图）。
- [x] 5 份 design.md 第 3 节归属指向 `flux-renderers-content`（drift 收敛）。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_10aa01024ffe6WwDwbCL8hmf9q`（fresh session，初评）+ `ses_10a9807c2ffeidULWuCbnWwBE5`（fresh session，复核对 minors 修正）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1（初评）+ 1（confirm re-check）
- Findings addressed（Minor，均已采纳）:
  - `amis-baseline-matrix.md` 行号范围由 L95-98 修正为 L95-97（排除属 W1a 的 json-view/L98）。
  - `vite.workspace-alias.ts` 别名行号由 L61-68 修正为 L61-63 + L67-69。
  - Phase 1 依赖说明补充 content 需 `flux-react`（区别于 mobile 包），避免"完全照 mobile"误导。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量验证归此处（plan 收口跑一次），非每 Phase 默认项。

- [x] `flux-renderers-content` 包骨架满足 monorepo 集成（编译/alias/project ref）。
- [x] 5 个 W1b renderer 实现并注册，遵循 `RendererComponentProps` 契约。
- [x] 5 个 focused 单测 + e2e 通过（验证行为，不仅不报错）。
- [x] owner-doc drift 收敛（5 份 design.md 归属指向 flux-renderers-content）。
- [x] roadmap W1b 标 done + amis-baseline-matrix 5 组件标 runtime（closure 后）。
- [x] 不存在被静默降级到 deferred 的 in-scope 项。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 无。本 plan scope 窄，无确认的 live defect / contract drift 需延期（owner-doc drift 已在 scope 内收敛，不延期）。

## Non-Blocking Follow-ups

- `progress` 的圆形/仪表盘变体（design.md 第 12 节"后续阶段"明确首版仅线性）——optimization candidate，归未来增强 plan。
- `card` 展开/选中状态机（design.md 第 7/12 节）——optimization candidate，归专门增强字段。
- `spinner` 与 `skeleton` 的语义边界文档化（design.md 第 12 节提示防混淆）——out-of-scope improvement，待 skeleton 类组件（O1 候选）启动时统一。

## Closure

Status Note: W1b 容器与反馈组 5 个 renderer（separator/spinner/progress/empty/card）作为 `@nop-chaos/flux-renderers-content` 包首波全部落地：包骨架（package.json/tsconfig/vitest/alias/root project ref/styles.css 导出）齐备，5 个 renderer 严格遵循 `RendererComponentProps` 契约（无直接 store 访问，复用 `@nop-chaos/ui` primitive），5 个 `RendererDefinition` + `registerContentRenderers` 已导出并在 playground 注册；42 个 focused 单测 + 5 个 e2e（程序化断言）通过；owner-doc drift（5 份 design.md §3 归属）已收敛；roadmap W1b 标 done、amis-baseline-matrix 5 组件标 runtime。全量 `pnpm typecheck/build/lint/test` 全绿。

Closure Audit Evidence:

- Auditor / Agent: `ses_10a757996ffeM8YJPAVsKbxI8O`（fresh session，独立 closure audit，非执行 session）
- Verdict: `approved`（零 Blocker / 零 Major）
- Evidence:
  - Phase 1 PASS：6 个骨架文件齐备；`vite.workspace-alias.ts` 双别名齐；根 `tsconfig.json` project ref 齐；`./styles.css` 导出指向 `./dist/*`（符合 check-package-css-exports）。
  - Phase 2 PASS：5 renderer 均消费 `RendererComponentProps` + `resolveRendererSlotContent`/`hasRendererSlotContent`；grep 确认无 `flux-runtime`/`useStore` 直连；5 个 marker class 齐全；`normalizeProgressValue` 为纯函数且有 5 个专属单测；5 个 `*.test.tsx` 断言真实行为（orientation 透传、onClick 触发、归一化、region 承载）。
  - Phase 3 PASS：5 个 definition `sourcePackage` 正确；card 四 region + onClick、empty title/description/actions 声明正确；`src/index.ts` 导出 `registerContentRenderers` + `contentRendererDefinitions`；playground 注册+路由+演示页齐；5 份 design.md §3 → `flux-renderers-content`；amis-baseline-matrix 5 组件 `runtime`。
  - Deferred honesty PASS：无 in-scope defect 降级；spinner `visible` 走 frozen META_FIELDS `meta` 通道，契约一致非 drift；Non-Blocking Follow-ups 均为 out-of-scope 增强。
  - Interface-vs-semantics PASS：组件经 `component:` 直接引用接到 definition；e2e 断言真实行为（card onClick pending→clicked、progress 120→100 归一化、spinner visible=false 隐藏）。
  - 全量验证：`pnpm typecheck` 53/53、`pnpm build` 28/28、`pnpm lint` 28/28、`pnpm test` 53/53（含 content 42 + playground 88）；e2e 5/5。

Follow-up:

- 仅 non-blocking：progress 圆形/仪表盘变体、card 展开/选中状态机、spinner 与 skeleton 语义边界文档化（均见 Non-Blocking Follow-ups 节）。无 remaining plan-owned work。

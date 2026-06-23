# W2a 数据组合组（service/pagination/cards/wizard/alert）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W2a；`docs/components/{service,pagination,cards,wizard,alert}/design.md`（契约已立约）；`docs/components/package-reorganization-analysis.md`
> Related: 前置 W1c（`docs/plans/2026-06-24-0040-3-w1c-list-collection-display-plan.md`，解锁 `L0 & W1c → W2a`，并把分页 successor 交给本 plan）；本 plan 解锁 W3a/W3b/W4b（首次 bootstrap `flux-renderers-layout` 包）
> Mission: components
> Work Item: W2a

## Purpose

把 roadmap W2a（数据组合组：`service`/`pagination`/`cards`/`wizard`/`alert`）从"design.md 已立约、代码 0%"推进到"5 个 renderer 实现 + 注册 + playground + e2e + roadmap W2a 标 done"。本 plan 是一个 owner plan 覆盖同一结果面（数据组合/反馈/分步/分页容器族），不按组件拆成 micro-plan（遵循 guide Rule 22/26）。

核心结果面有三层独立 closure 单元，分别落在不同 package：

1. **数据组合（data 包）**：`service`（局部数据装配可视壳，复用 `data-source`，请求下沉）、`pagination`（独立分页交互 owner，复用 `@nop-chaos/ui` Pagination primitive）。
2. **内容反馈（content 包）**：`cards`（卡片集合 renderer，复用 list 的 repeated-instance substrate）、`alert`（内联反馈块，复用 ui Alert）。
3. **布局/分步（layout 包，NEW bootstrap）**：`wizard`（分步式任务容器，interaction owner + semantic lifecycle owner 分层）——首次 bootstrap `@nop-chaos/flux-renderers-layout`，解锁 W3a（grid/collapse）/W3b（button-group/dropdown-button）/W4b（steps/timeline）。

本 plan 接收 W1c deferred 的 `pagination` successor（W1c plan `Deferred But Adjudicated`：分页归 W2a）。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **目标包状态**：
  - `flux-renderers-data` 已存在（已注册 table/tree/crud/data-source/chart/list），alias+project ref 就绪——service/pagination 直接追加，无新包工作。
  - `flux-renderers-content` 已存在（W1a/W1b 落地 10 个 renderer），alias+project ref 就绪——cards/alert 直接追加，无新包工作。
  - `flux-renderers-layout` **不存在**（`ls packages/` 核实）——wizard 需首次 bootstrap 该包。bootstrap 模式参照 W1b（content 包 bootstrap）：package.json/tsconfig/vitest/vite alias/root project ref/styles.css/src/index.ts。
- **5 个 renderer 均未实现**：data/content/layout 三包 src 无对应 `*-renderer.*`；`amis-baseline-matrix.md` L72/L77/L99/L114/L118 五组件均标 `targetContract`/wave 2。
- **UI primitive 已就绪（零新依赖）**：`@nop-chaos/ui` 已导出 `Pagination`（`packages/ui/src/components/ui/pagination.tsx`）与 `Calendar`，cards 复用 `Card` 体系、alert 复用 `Card`/自定义 Alert primitive。wizard 的 step 导航/进度复用 ui 既有 primitive（Tabs/Progress/Button），无需引入第三方。
- **substrate 可复用**：
  - service 复用 `data-source-renderer.tsx`（data 包，已 runtime）的请求下沉模型——service 自身不声明 `api`/`initFetch`/`interval`（design §1/§4 明确请求下沉，见 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`）。
  - cards 复用 `list-renderer.tsx`（data 包，W1c 落地）的 repeated-instance + `selectionMode` local controlled 模式；二者共享 `items`/`card`/`empty`/`selectionMode`/`onItemClick`/`onSelectionChange` 协议。
  - pagination 与 table 内建分页明确边界（design §12：防 `table.pagination` 与独立 `pagination` 演化成两套语义）。
- **owner-doc drift（待收敛，3 处）**：
  - `cards/design.md` §3 写 `flux-renderers-data`，但 roadmap §95 authoritative 写 `flux-renderers-content`。**Decision 项**：以 roadmap + package-reorganization-analysis 为准核对，cards 作为卡片集合共享 list 的 collection substrate 但归属 content（card-collection 是内容族）；若核对后 roadmap 仍为权威则收敛 design.md→content，并记 cross-package substrate 复用为 watch-only。
  - `alert/design.md` §3 写 `flux-renderers-basic`，roadmap §95 写 `flux-renderers-content`——收敛 design.md→content。
  - `wizard/design.md` §3 写 `flux-renderers-basic`，roadmap §102 写 `flux-renderers-layout`——收敛 design.md→layout。
- **请求下沉硬约束**：roadmap Cross-Cutting 明确"新组件不得声明挂载时自动加载数据的 schema 字段（`initFetch`/`api`/`source`）"。service 是该约束的最高风险点（design §1/§4 已据此设计：service 只读 scope 的 `items` 表达式，请求归 `<data-source>`）。本 plan 把它作为 Closure Gate。

## Goals

- `service`：`body` region + `items`（表达式值绑定，只读 scope）+ `data`/`statusPath` + `empty`/`error`/`loading`（value-or-region）反馈区；**不声明任何请求层字段**（`api`/`initFetch`/`interval`/`sendOn`/`source` 全部归 `<data-source>`）；遵循请求下沉约束。
- `pagination`：`currentPage`/`pageSize`/`total`/`pageSizeOptions`/`mode`/`pageOwnership`/`pageStatePath`/`statusPath` + `onChange`/`onPageSizeChange`；复用 ui `Pagination`；只维护分页交互轴，不拥有请求协议。
- `cards`：`items`（唯一集合字段）+ `card` region（单项模板）+ `empty`（value-or-region）+ `selectionMode`/`selectionOwnership`/`selectionStatePath` + `onItemClick`/`onSelectionChange`/`onPageChange`；复用 list 的 repeated-instance + selection controlled substrate。
- `alert`：`level`/`icon`/`closable`（value）+ `title`/`body`（value-or-region）+ `actions`（region）+ `onClose`；复用 ui 反馈 primitive。
- `wizard`：`steps`（renderer-owned structured）+ step switching（interaction owner：`value`/`valueOwnership`/`valueStatePath`）与 step commit（semantic lifecycle owner：`onStepCommit`/`onComplete`/`onStepError`）**分层**，不混成一个宽状态对象；`component:next`/`prev`/`goToStep`/`commitStep` 区分 navigation 与 commit。
- **bootstrap `flux-renderers-layout`** 包（package.json/tsconfig/vitest/alias/project ref/styles.css/index.ts/`registerLayoutRenderers`）。
- 5 个 `RendererDefinition` 合入对应包定义文件并随各自 `register*Renderers` 注册；playground 演示页 + e2e（程序化断言，非截图）。
- 收敛 3 处 owner-doc drift；roadmap W2a 标 done + amis-baseline-matrix 5 组件标 runtime。

## Non-Goals

- 不重建请求协议（service 不声明请求字段；归 `<data-source>`）。
- 不把 `cards` 做成 `list` 视觉变体（保持独立 collection contract；design §12 边界）。
- 不把 `wizard` 做成换皮 `tabs`（保留 step commit 语义；design §9）。
- 不预置 `wizard` 的 `$wizard` 局部绑定（design §8：语义稳定前不引入，用 `statusPath` 收口）。
- 不实现 W3a/W3b/W4b 其余 layout 组件（本 plan 只 bootstrap layout 包 + 落地 wizard）。
- 不实现 crud/table 内建分页重构（pagination 只新增独立 renderer，不改 table 既有分页语义）。
- 不实现分步表单的完整跨步数据持久化框架（wizard 首版聚焦 step switching + commit 分层；跨步 form 持久化归后续增强）。

## Scope

### In Scope

- `flux-renderers-layout` 包 bootstrap（6 个骨架文件 + alias + root project ref + styles.css 导出）。
- 5 个 renderer 实现（service/pagination → data；cards/alert → content；wizard → layout），遵循 `RendererComponentProps`。
- 5 个 `RendererDefinition` 合入注册；playground 演示页（5 组件各字段/region）+ e2e。
- service 请求下沉约束验证（grep 无 `api`/`initFetch`/`source` 组件级字段）。
- 收敛 3 处 owner-doc drift（cards/alert/wizard design.md §3 归属）。
- roadmap W2a 标 done + amis-baseline-matrix 5 组件 `targetContract→runtime`。

### Out Of Scope

- W3a/W3b/W4b layout 组件（grid/collapse/button-group/dropdown-button/steps/timeline）。
- crud/table 内建分页重构。
- wizard `$wizard` 局部绑定、跨步 form 持久化框架。
- wizard 异步 step commit 的复杂回滚/补偿事务（首版只做 commit 状态分层 + 事件）。

## Failure Paths

> 数据组合/分页/分步容器有可测失败路径（请求下沉、空态、分页边界、分步校验）。

| 场景编号              | 触发                                | 行为                                                         | 可重试 | 用户可见表现               |
| --------------------- | ----------------------------------- | ------------------------------------------------------------ | ------ | -------------------------- |
| service-empty         | `items` 解析为空/null               | 渲染 `empty`（value-or-region）                              | 否     | 空态而非空白               |
| service-loading-state | 上游 `<data-source>` loading        | service 渲染 `loading` 区（基于 items 解析派生，非请求镜像） | 否     | loading 反馈               |
| service-no-request    | service schema 无任何请求字段       | 请求归 `<data-source>`；service 自身不触发 HTTP（grep 验证） | 否     | 请求下沉约束成立           |
| pagination-boundary   | `currentPage` 超出 `total`/pageSize | 归一到有效页；`onChange` 上报归一后值                        | 否     | 不越界                     |
| pagination-mode       | `mode` 切换简单/带页大小            | `onPageSizeChange` 触发并重置页码                            | 否     | 页大小切换生效             |
| cards-empty           | `items` 空                          | 渲染 `empty`                                                 | 否     | 空态                       |
| cards-selection       | `selectionMode:'single'`            | 单选互斥 + `onSelectionChange`                               | 否     | 单卡高亮                   |
| alert-closable        | `closable:true` 点关闭              | 触发 `onClose` 并隐藏                                        | 否     | 反馈块消失                 |
| wizard-step-commit    | 点下一步触发 `onStepCommit`         | interaction（step index）与 lifecycle（committing）分层更新  | 否     | 步骤推进 + commit 状态分离 |
| wizard-linear-block   | `linear:true` 未提交不可跳步        | 非线性跳步被拦截（除非 `allowStepJump`）                     | 否     | 跳步禁用                   |

## Test Strategy

本档选择：**建议有测**

理由：5 个组件均为一般功能/容器组件，无鉴权/对外 API 契约/核心回归路径风险。按 tier 表属"建议有测"。focused 单测覆盖：service 的 items 解析/空态/loading/error 区 + 请求下沉（无请求字段断言）、pagination 边界归一/页大小切换、cards item 实例化/选择态/空态、alert closable/onClose、wizard step 切换/commit 分层/线性拦截。e2e 覆盖 playground 演示页渲染 + 关键交互（程序化断言，非截图，遵循 AGENTS.md）。请求下沉约束作为 Closure Gate 单独验证。

## Execution Plan

### Phase 1 - bootstrap `flux-renderers-layout` 包骨架

Status: completed
Targets: `packages/flux-renderers-layout/`（新建：package.json/tsconfig.json/tsconfig.build.json/vitest.config.ts/src/index.ts/src/styles.css）；`vite.workspace-alias.ts`；根 `tsconfig.json`；`apps/playground/src/App.tsx`

- Item Types: `Fix`

- [x] **Fix**：参照 W1b（content 包）bootstrap 模式创建 `flux-renderers-layout` 包骨架（package.json 含 `@nop-chaos/flux-core`/`flux-i18n`/`flux-react`/`@nop-chaos/ui` workspace deps + `vitest`；tsconfig extends `../../tsconfig.base.json` + `noEmit`/`outDir`；src/index.ts 导出空 `registerLayoutRenderers` 占位 + `layoutRendererDefinitions` 数组；src/styles.css 空样式入口）。
- [x] **Fix**：`vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-layout` 与 `@nop-chaos/flux-renderers-layout/styles.css` 双别名（对齐 content 包 L70-74 模式）；根 `tsconfig.json` 加 project reference。
- [x] **Fix**：`apps/playground/src/App.tsx` 接入 `registerLayoutRenderers(registry)` 调用（对齐既有 `registerContentRenderers`/`registerDataRenderers` 模式）。

Exit Criteria:

- [x] `flux-renderers-layout` 包编译通过（局部 `pnpm --filter @nop-chaos/flux-renderers-layout typecheck`），alias + project ref 就绪，playground 可空注册（无 type 错误）。

### Phase 2 - `service` + `pagination`（data 包）

Status: completed
Targets: `packages/flux-renderers-data/src/{service-renderer,pagination-renderer}.tsx`（新建，colocated `*.test.tsx`）；`src/data-renderer-definitions.ts`

- Item Types: `Proof` + `Fix` + `Decision`

- [x] **Proof**：service focused 单测——`items` 表达式解析 N 项时 body region 渲染；`items` 空/null 渲染 `empty`；loading/error 区切换；**断言 service 不含任何请求字段**（grep schema 类型无 `api`/`initFetch`/`interval`/`sendOn`/`source`）。
- [x] **Fix**：`service-renderer.tsx`——`nop-service` marker；消费 `props.props`(ServiceSchema) 的 `items`（表达式，从 `props.node.scope`/helpers 解析，只读 scope）→ body region（`props.regions.body.render()`）实例化；`empty`/`error`/`loading`（value-or-region）反馈区派生（基于 items 解析结果，非请求镜像）；`statusPath` 发布 idle/ready/error 摘要；复用 data-source 模型（不直接发起请求）。
- [x] **Decision**：pagination 边界归一策略——`currentPage` 超出 `Math.ceil(total/pageSize)` 时归一到末页；`pageSize` 变更时是否重置 `currentPage`（裁定：重置到第 1 页，避免空页；记入 design.md §7）。
- [x] **Fix**：`pagination-renderer.tsx`——`nop-pagination` marker；复用 `@nop-chaos/ui` `Pagination`；消费 `currentPage`/`pageSize`/`total`/`pageSizeOptions`/`mode`/`pageOwnership`（local controlled，经 `onChange`/`onPageSizeChange` 上报）；`statusPath` 发布只读 summary；不发起请求（只维护分页轴）。
- [x] **Proof**：pagination focused 单测——边界归一、页大小切换重置页码、`onChange`/`onPageSizeChange` 携带正确 payload。

Exit Criteria:

- [x] service 实现遵循请求下沉约束（无组件级请求字段，grep 验证）+ focused 单测通过（验证 items 解析/反馈区行为，非仅不报错）。
- [x] pagination 复用 ui `Pagination`，边界归一 + focused 单测通过。
- [x] 两个 definition 合入 `data-renderer-definitions.ts`（service：body region + items/data/statusPath value + empty/error/loading value-or-region；pagination：分页字段 value + onChange/onPageSizeChange event）。

### Phase 3 - `cards` + `alert`（content 包）

Status: completed
Targets: `packages/flux-renderers-content/src/{cards-renderer,alert-renderer}.tsx`（新建，colocated `*.test.tsx`）；`src/content-renderer-definitions.ts`

- Item Types: `Proof` + `Fix` + `Decision`

- [x] **Decision**：cards 包归属——核对 roadmap §95（`cards→flux-renderers-content`）与 package-reorganization-analysis；裁定 cards 落 content（card-collection 是内容族），收敛 `cards/design.md` §3 `data→content`；记 cards 跨包复用 list（data）collection substrate 为 watch-only（不强行跨包共享代码，保持独立 collection contract）。
- [x] **Proof**：cards focused 单测——`items` N 项时 `card` region 实例化 N 次（每项独立 scope 含 item/index）；`items` 空渲染 `empty`；`selectionMode:'single'`/`'multiple'` 选择态 + `onSelectionChange`；单一 `items` 字段（无双轨）。
- [x] **Fix**：`cards-renderer.tsx`——`nop-cards` marker；复用 ui `Card` 体系 + list 的 repeated-instance 模式（独立实现 collection contract，不跨包 import list）；`items`（唯一集合字段）迭代 → `card` region（`props.regions.card.render()`）实例化；`selectionMode` local controlled；`onItemClick`/`onSelectionChange`/`onPageChange`（page 桥接 pagination）。
- [x] **Proof**：alert focused 单测——`level` 映射视觉变体；`closable:true` 点关闭触发 `onClose` 并隐藏；title/body value-or-region；actions region 渲染。
- [x] **Fix**：`alert-renderer.tsx`——`nop-alert` marker；复用 ui 反馈 primitive；`level`/`icon`/`closable` + `title`/`body`（value-or-region）+ `actions`（region）+ `onClose` + 最小可见性 local state（closable）。

Exit Criteria:

- [x] cards 实现单一 `items` + `card` region + 选择态，focused 单测通过（验证实例化计数/选择态/空态）。
- [x] alert 实现 level/closable/onClose，focused 单测通过。
- [x] 两个 definition 合入 `content-renderer-definitions.ts`（cards：card region + items/selectionMode value + empty value-or-region + onItemClick/onSelectionChange/onPageChange event；alert：actions region + title/body value-or-region + level/icon/closable value + onClose event）。

### Phase 4 - `wizard`（layout 包）

Status: completed
Targets: `packages/flux-renderers-layout/src/wizard-renderer.tsx`（新建，colocated `*.test.tsx`）；`src/layout-renderer-definitions.ts`（新建）；`src/index.ts`

- Item Types: `Proof` + `Fix`

- [x] **Proof**：wizard focused 单测——step switching（`value`/currentStepIndex 推进/后退）；`onStepCommit` 触发时 interaction state（stepIndex）与 lifecycle state（committing/lastCommitStatus）**分层更新**（不互相污染）；`linear:true` 未提交不可跳步；`allowStepJump` 放行；`statusPath` 摘要含 currentStepIndex/stepCount/canGoNext/canGoPrev/committing。
- [x] **Fix**：`wizard-renderer.tsx`——`nop-wizard` marker；`steps`（renderer-owned structured）渲染 step 导航 + 进度 + body（每步 `body` region）+ actions；**分层状态**：interaction owner（`value`/`valueOwnership`/`valueStatePath` + currentStepKey/Index/canGoNext/canGoPrev）与 semantic lifecycle owner（committing/validating/lastCommitStatus/stepError）分离；`onChange`/`onStepCommit`/`onComplete`/`onStepError`；`mountOnEnter`/`unmountOnExit`；不引入 `$wizard`（用 `statusPath` 收口外部读取）。
- [x] **Fix**：`layout-renderer-definitions.ts` 新建，声明 `wizard` `RendererDefinition`（category `layout`；steps renderer-owned structured field；value/defaultValue/statusPath value；onChange/onStepCommit/onComplete/onStepError event；step body region）；`src/index.ts` 导出 `WizardRenderer` + `layoutRendererDefinitions` + `registerLayoutRenderers`。

Exit Criteria:

- [x] wizard 实现交互/生命周期状态分层（grep 确认 stepIndex 与 committing 不混入同一 state 对象），focused 单测通过（验证分层 + 线性拦截 + 摘要）。
- [x] wizard definition 合入 `layout-renderer-definitions.ts`，随 `registerLayoutRenderers` 注册。

### Phase 5 - 注册/聚合 + playground + e2e + owner-doc 同步

Status: completed
Targets: `packages/flux-renderers-{data,content,layout}/src/index.ts`；`apps/playground/src/`；`tests/e2e/`；5 份 design.md；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：三个包 `src/index.ts` 导出齐全（data：service/pagination + definitions；content：cards/alert + definitions；layout：wizard + definitions + `registerLayoutRenderers`），随各自 `register*Renderers` 注册（已接入 playground）。
- [x] **Fix**：playground 增 W2a 演示页（service+data-source 组合演示请求下沉、pagination 边界、cards 选择、alert closable、wizard 分步）并注册路由（route-model.ts/App.tsx）。
- [x] **Proof**：e2e（`tests/e2e/w2a-data-composition.spec.ts`）——程序化断言：service body 渲染 + 空态、pagination 页码切换 + 边界、cards N 卡 + 选择高亮、alert 关闭、wizard 步骤推进 + commit 分层 + 线性拦截。**不靠截图**（遵循 AGENTS.md）。
- [x] **Fix**：收敛 3 处 owner-doc drift——`cards/design.md` §3、`alert/design.md` §3 改 `flux-renderers-content`；`wizard/design.md` §3 改 `flux-renderers-layout`；pagination §7 补边界归一 + 页大小重置裁定。（owner-doc drift 属 guide Non-Degradable，归 Fix 而非 Follow-up）
- [x] **Follow-up**：roadmap W2a 标 done（closure 阶段）+ amis-baseline-matrix L72/L77/L99/L114/L118 五组件 `targetContract→runtime`。

Exit Criteria:

- [x] 5 个 definition 合入注册，playground 可渲染 5 个 type（`service`/`pagination`/`cards`/`alert`/`wizard`）。
- [x] playground W2a 演示页可访问、5 组件交互可用。
- [x] e2e 通过（程序化断言，非截图）。
- [x] 3 份 design.md §3 归属指向正确 package（drift 收敛）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_10a0186eeffeYG7E6IBLuc0DTe`（fresh session，独立初评）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major；4 维度全 pass）
- Rounds: 1
- Findings addressed（Minor，已采纳修正）:
  - Phase 5 owner-doc drift 收敛项原标 `Follow-up`，按 guide Rule 15（owner-doc drift 属 Non-Degradable）改为 `Fix`（已修正文本）。
  - 其余 Minor（Baseline 提及 Calendar 实属 W2b、alert primitive 措辞、cards Decision 措辞偏保守）非阻塞，cards 归属经 roadmap §95 + package-reorganization-analysis L210 双源已裁定 content，收敛方向已验证正确。
- 引用准确性：全部经 live repo 核对通过（flux-renderers-layout 不存在；ui 导出 Pagination/Calendar；3 处 design.md drift 属实；请求下沉为 roadmap Cross-Cutting 硬规则；matrix L72/L77/L99/L114/L118 = targetContract/wave 2）。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量验证归此处（plan 收口跑一次），非每 Phase 默认项。

- [x] `flux-renderers-layout` 包 bootstrap 完成，编译/alias/project ref 就绪。
- [x] 5 个 W2a renderer 实现并注册，遵循 `RendererComponentProps`。
- [x] **请求下沉约束成立**：`service` 不含任何组件级请求字段（`api`/`initFetch`/`interval`/`sendOn`/`source`），grep + 单测验证。
- [x] wizard interaction/lifecycle 状态分层成立（不混成一个宽状态对象）。
- [x] cards 单一 `items` 字段原则成立（无第二套模板协议）。
- [x] 5 个 focused 单测 + e2e 通过（验证行为，非仅不报错）。
- [x] owner-doc drift 收敛（3 份 design.md §3 归属）。
- [x] roadmap W2a 标 done + amis-baseline-matrix 5 组件标 runtime。
- [x] 不存在被静默降级到 deferred 的 in-scope 项（尤其请求下沉约束、wizard 状态分层不得降级）。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### cards 跨包复用 list collection substrate

- Classification: `watch-only residual`
- Why Not Blocking Closure: cards 落 content 包，list 落 data 包；二者共享 `items`/`selectionMode`/`onItemClick` 协议但各自独立实现 collection contract（design §12 要求保持独立 contract）。是否抽取共享 collection hook 到更低层包属后续重构优化，不影响 cards 作为卡片集合 renderer 的 closure 成立。
- Successor Required: `no`

## Non-Blocking Follow-ups

- crud/table 内建分页与独立 `pagination` 的语义统一评估（design §12 风险点）——watch-only residual。
- wizard `$wizard` 局部绑定（design §8，待 step 语义稳定后再评估）——optimization candidate。
- wizard 跨步 form 数据持久化框架——out-of-scope improvement，归后续增强。
- cards 与 list 的 grid/列布局变体——optimization candidate。

## Closure

Status Note: W2a 数据组合组 5 renderer 全部落地（service/pagination → flux-renderers-data；cards/alert → flux-renderers-content；wizard → 首次 bootstrap 的 flux-renderers-layout）。请求下沉约束成立（service 零组件级请求字段）；wizard interaction/lifecycle 状态分层成立；cards 单一 items 字段成立；3 处 owner-doc drift 收敛；roadmap W2a→done + amis-baseline-matrix 5 组件→runtime。首次 bootstrap flux-renderers-layout 包，解锁 W3a/W3b/W4b。

Closure Audit Evidence:

- Auditor / Agent: `ses_109b852efffecOeHO8YOJMW21M`（fresh-session 独立 closure audit，opencode general subagent；不复用执行 session 上下文）
- Verdict: `approved`（零 Blocker / 零 Major；10 项 Closure Gates 全 PASS）
- Evidence:
  - `pnpm typecheck` 55/55、`pnpm build` 29/29、`pnpm lint` 29/29（0 errors，1 pre-existing unrelated warning）、`pnpm test` 55/55（data 512 单测 / content 94 单测 / layout 10 单测 / playground 88 单测）
  - e2e `tests/e2e/w2a-data-composition.spec.ts` 7/7 PASS（程序化断言，非截图）
  - 3 个 grep-gate 单测验证 critical 约束：service 请求下沉（`api`/`initFetch`/`interval`/`sendOn`/`source` 全无）、wizard 状态分层（`WizardInteractionState`/`WizardLifecycleState` 两个独立 useState）、cards 单一 items 字段
  - 受影响 owner docs 已同步：cards/alert/wizard §3 归属收敛、pagination §7 边界归一+页大小重置裁定、roadmap W2a→done、amis-baseline-matrix L72/L77/L99/L114/L118→runtime
  - 日志 `docs/logs/2026/06-24.md` W2a 条目已记录
- Findings: 零 Blocker / 零 Major；3 个透明性 Minor（service/pagination 定义拆分到独立文件以保持 lint cap、pre-existing flow-designer 动态 import warning、pre-existing form-advanced virtual-select lint warning——均非本 plan 引入且非阻塞）

Follow-up:

- service statusPath 跨多层 flex scope 的兄弟 text 节点读取需额外等待（demo 已用同 flex 直接 sibling 演示；单测验证 statusPath 发布）——optimization candidate
- cards 与 list 的 grid/列布局变体——optimization candidate
- wizard `$wizard` 局部绑定（design §8，待 step 语义稳定后再评估）——optimization candidate
- wizard 跨步 form 数据持久化框架——out-of-scope improvement，归后续增强
- crud/table 内建分页与独立 pagination 的语义统一评估（design §12 风险点）——watch-only residual

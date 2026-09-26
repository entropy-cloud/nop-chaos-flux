# 505 Missing Components L2.1 — user-select / department-select（org 协议消费实现）

> Plan Status: completed
> Last Reviewed: 2026-09-25
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.1 行）；§1 交付铁律；`docs/architecture/org-data-source-protocol.md`（plan 504 产出，本计划是其首个消费方）
> Related: `docs/plans/503-missing-components-l1-p0-form-atoms-plan.md`（交付铁律模板先例）；`docs/plans/504-missing-components-l2-0-org-data-source-protocol-plan.md`（协议，completed）

## Purpose

按交付铁律 8 项收口 roadmap L2.1：`user-select` / `department-select` 两个 org 族表单 renderer 以**零分叉**方式消费 org 数据源协议——共享数据面模块唯一（normalizer/envelope/变量注入/分页终止/错误键），两个呈现面各异。落地后 roadmap L2.1 → `done`。

## Current Baseline

2026-09-25 live repo 核对（Explore 报告在案，关键项执行时复核）：

- **协议**：`docs/architecture/org-data-source-protocol.md` 已落盘（plan 504 completed，commit e03153bee）。§9 要求共享实现模块（normalizer/变量注入/终止判定/i18n 键 `flux.form.orgChildrenFailed|orgSearchFailed|orgResolveFailed`）随首个消费 renderer 落地。
- **matrix**：`docs/components/amis-baseline-matrix.md` 无 `user-select`/`department-select` 行（既不在 retained 表也不在 §5 notRetained 表）——本 flip 为 Form Core 表**纯新增两行**（区别于 L1 的「§5 删行 + Form Core 增行」）。
- **包边界**：`tree-controls.tsx`/`tree-control-sources.ts`/`TreeOptionList` 在 `flux-renderers-form-advanced`；依赖方向 advanced → form，**form 包不得反向 import**——org 呈现层基于 `@nop-chaos/ui` 基元（Popover/Sheet/Checkbox/Badge/Input/ScrollArea/Spinner/Combobox 族）自建，ui 包**零改动**（无新公共导出，不触发 ask-first 门）。
- **renderer 模式**：definition 模块先例 `renderers/form-atoms-renderer-definitions.ts`（聚合进 `src/definitions.ts` L22-30 `formRendererDefinitions`）；contracts 先例 `renderers/input-contracts.ts`（`sliderSpecificContracts` L104 等）；action 型 prop 契约形状 `searchSourcePropContract`（`renderers/input-shared.ts:78`，`{ kind:'schema-definition', fieldRules:{}, actionValue:true }`）；多值 adapter 先例 `checkboxGroupAdapter`（`input-choice-renderers.tsx:67`）、单值 `choiceSingleAdapter`（:87）；底座 `useFormFieldFromProps`（`field-utils/field-handlers.tsx:473`）。
- **schemas.ts 行数**：现约 486 行——org 类型（`OrgNode`/`OrgNodePage`/`UserSelectSchema`/`DepartmentSelectSchema`）落新文件 `src/schemas-org.ts`，由 `schemas.ts` 尾部 re-export，避免把 schemas.ts 推过 oversized WARN 500。
- **远程数据先例**：`use-select-remote-search.ts`（searchQuery/300ms debounce/AbortController/echo 缓存）；`executeTreeSource`（`flux-renderers-form-advanced/src/tree-control-sources.ts:37`，一次性子 scope 派发、刻意不经 `helpers.executeSource`）——协议 §2/§8 点名的两条先例。
- **lab/mock 先例**：`select-lab-page.tsx` L225-264 用 `searchSource: {action:'ajax', args:{url, params:{q:'${searchQuery}'}}}` + scenario 级 `env.fetcher` mock——org 三操作同法 mock；`MultiScenarioLabPage`（`component-lab/multi-scenario-lab-page.tsx`，scenario stage testid `scenario-stage-${slug}`）。
- **路由守卫**：`route-matrix.test.ts` form 覆盖守卫强制新 type 同步 `form-route-entries.ts` + `RENDERER_LAB_REGISTRY`，否则 unit 红。
- **登记面**：`examples.manifest.json` runtime 数组尾部（slider/rating/input-color L70-72 后追加）；`quick-reference.md` L859 起 form atoms 节；`components/index.md` L333 清单行 + L497 起目录。
- **验证基线**：master e03153bee 干净；502 存量 e2e 红台账 9 项 + 1 在册 watch-only（plan 502 Closure），e2e 验收口径「零新增红」。
- **i18n**：`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts` `form:` 节追加键；`i18n-contract.test.ts` 强制双语同步。

## Goals

- 命名 pass 决议 + matrix flip：Form Core 增 `user-select` / `department-select` 两行（`runtime` / owner doc / landed）。
- **共享数据面模块**（协议 §9 零分叉载体，唯一实现）：`src/renderers/org/org-data-protocol.ts`（OrgNode normalizer + envelope 解析 + 分页终止判定，纯函数）+ `use-org-source.ts`（children/search/resolve 三 hooks：scope 变量注入、300ms debounce、abort、echo 缓存、错误 i18n）。
- L2.1-a `user-select`：人员选择器（单/多选、`selectableTypes` 默认 `['user']`、部门节点导航不可选、搜索跨全树、懒加载子部门、回显 resolve、分页 loadMore）+ schema/contracts/definition/lab 页/design.md/example.json/单测/e2e。
- L2.1-b `department-select`：部门选择器（同一面板组件、`selectableTypes` 默认 `['department']`、懒加载、搜索、回显）+ 同上交付面。
- 登记四处（examples.manifest.json / quick-reference.md / components/index.md 清单+目录 / route+lab registry）+ i18n 双语 + INV 审计（铁律 7）+ 全量验证 + roadmap §13 回写 + dev log。

## Non-Goals

- 不做 `region`（L2.2 独立 work item；其将复用本计划落地的共享模块——零分叉验收在 QA.3）。
- 不做 playground mock org 后端的独立服务（lab 页内嵌 env.fetcher mock 即验收面）。
- 不扩 `RendererEnv`、不改 `use-select-remote-search.ts` 等既有通道（协议边界）。
- 不做 DingTalk 像素级复刻（realism 基准指导交互形态：搜索 + 部门导航 + 人员选择，不做视觉对齐）。
- 不做移动端专用变体（桌面 Popover + 窄容器 Sheet 响应式沿用 tree-select 先例形态，单实现）。
- 不迁移 input-tree / tree-select（协议 §8「不复用不混用」裁决，互不迁移）。

## Scope

### In Scope

- `docs/components/amis-baseline-matrix.md`：Form Core 表增两行。
- `packages/flux-renderers-form/src/`：新 `schemas-org.ts` + `schemas.ts` 尾部 re-export；新 `renderers/org/`（org-data-protocol.ts、use-org-source.ts、org-select-panel.tsx、user-select-renderer.tsx、department-select-renderer.tsx、org-renderer-definitions.ts）；`renderers/input-contracts.ts` 增 org contracts；`src/definitions.ts` 聚合；各文件 ≤500 行（WARN 线）。
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`：`orgChildrenFailed`/`orgSearchFailed`/`orgResolveFailed`（`{{message}}` 插值，协议 §9 固定键）+ `orgSearchPlaceholder`/`orgLoadMore`/`orgEmpty`/`userSelectPlaceholder`/`departmentSelectPlaceholder`。
- playground：`component-lab/renderers/user-select-lab-page.tsx`、`department-select-lab-page.tsx`（env.fetcher mock：/api/org/children、/api/org/search、/api/org/resolve 三 URL 分派 + 一个 fail 场景）+ `form-route-entries.ts` 两条 + `renderer-lab-registry.ts` 两键。
- 测试：`src/__tests__/org-data-protocol.test.ts`（normalizer/envelope/终止）、`org-user-select.test.tsx`、`org-department-select.test.tsx`（jsdom 可观测面；键盘/布局面移交 e2e）；e2e `tests/e2e/org-select-user.spec.ts`、`org-select-department.spec.ts`。
- docs：`docs/components/user-select/{design.md,example.json}`、`docs/components/department-select/{design.md,example.json}`（12 节先例）+ 三处登记 + roadmap §13 + dev log。

### Out Of Scope

- L2.2–L2.6 各 work item。
- `existing-components-improvement-analysis.md` 登记（新增 type 非既有扩展；money format 类扩展才登记）。
- ui 包任何改动（复用既有基元足够）。

## Failure Paths

| 可测场景编号           | 触发                                    | 行为                                                                                                                     | 可重试 | 用户可见表现              |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------- |
| org-children-failed    | sourceChildren 派发 `ok:false`/抛错     | 面板内联错误态 + 重试按钮（`flux.form.orgChildrenFailed` 文案）；已加载节点不受影响                                      | 是     | 展开节点处错误行 + 重试   |
| org-search-failed      | sourceSearch 失败                       | 搜索区错误态（`flux.form.orgSearchFailed`）+ 结果列表清空为空（不保留上次结果，对齐 select 先例 `setRemoteOptions([])`） | 是     | 搜索框下错误文案 + 空列表 |
| org-resolve-partial    | 回显值 resolve 未命中/失败              | 未解析值以原始值字符串回显（不进错误态）；resolve 成功部分写入 echo 缓存                                                 | 否     | trigger 显示原始值        |
| org-empty-page         | children 返回空页                       | 节点标记已加载（空），再展开不重发；面板显示空态文案                                                                     | 否     | 「暂无数据」行            |
| org-root-no-source     | 无 sourceChildren 且无静态 options      | 面板空态 + 提示（不崩、不派发）                                                                                          | 否     | 空面板                    |
| org-disable-selectable | `selectableTypes` 外节点（含 disabled） | 行可展示可导航但 checkbox 禁用（disabledTip 有则提示）                                                                   | 否     | 灰色 checkbox             |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**

理由：交付铁律 4；两 renderer 为可编辑表单控件且引入共享数据面契约模块（协议零分叉载体），Proof（共享模块纯函数单测）先于 Fix（renderer 实现）落地。

## Execution Plan

### Phase 1 - 命名 pass + matrix flip（前置裁决）

Status: completed
Targets: 本 plan 命名决议节、`docs/components/amis-baseline-matrix.md`

- Item Types: `Decision`

- [x] 命名决议落本 plan（`user-select`/`department-select` 定名依据；schema 属性命名过 naming-conventions §2）
- [x] matrix Form Core 表增 `user-select`/`department-select` 两行（`runtime`、owner doc 指向新 design.md、landed，注记 missing-components L2.1 flip）

Exit Criteria:

- [x] matrix diff 可见：Form Core（`### 4. Form Core`）两行新增；`grep -n "user-select\|department-select" docs/components/amis-baseline-matrix.md` 各 ≥1 命中且仅在新增行
- [x] 命名决议两行写在本 plan

### Phase 2 - 共享数据面模块（协议 §9 载体，Proof 先行）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/org/org-data-protocol.ts`、`use-org-source.ts`、`src/__tests__/org-data-protocol.test.ts`

- Item Types: `Fix`、`Proof`

- [x] `org-data-protocol.ts` 纯函数：`normalizeOrgNode`（§3.1 五规则：label/value 别名、缺失容错、`disabled===true` 严格、未知字段收拢 `extra`、children 递归）、`parseOrgNodePage`（§4.2 envelope：裸数组宽容、`nodes` 非数组空结果）、`shouldStopPaging`（§5 四条终止判定，按序单结论）、`filterLocalOptions`（§7：`sourceSearch` 缺失时静态 options 内大小写不敏感 `name` 包含匹配）
- [x] `use-org-source.ts` 三 hooks：`useOrgChildren`（首次呈现 lazy 根加载——弹层形态=首次打开弹层、内联形态=首次激活，静态 options 存在时根层不拉；`leaf===true` 请求前短路；per-node 懒加载；options 节点带 `children`/`leaf:true` 视为已加载、childless 非 leaf 仍派发并按 `id` 去重合并（后者覆盖前者）；空页缓存；错误/重试态）、`useOrgSearch`（300ms debounce + `searchQuery` 变量 + abort + echo 缓存 + `searchMergeMode`（`'append'` 默认：静态命中在前远程按 id 去重跟随 / `'replace'`：有词仅远程）+ 翻页 `orgPage` 递增合并去重 loadMore）、`useOrgResolve`（仅未命中 echo 缓存值派发、`orgValues` 对位、未解析原始值回显、AbortError 静默）；scope 变量注入经 `helpers.createScope`（`orgNodeId/orgDepth/searchQuery/orgValues/orgPage/orgPageSize` + extraParams 求值——字符串表达式在 form scope 求值、非字符串透传），一次性子 scope + dispose，**不经 `helpers.executeSource`**
- [x] focused 单测（Proof，先于 renderer）：normalizer 8+ 条（别名/缺失/严格 disabled/extra 收拢/递归/非对象丢弃/nodes 非数组/裸数组）、终止判定 5 条（hasMore false/total 达标/空页/零新增 id/续页不停）、§6 extraParams 3 条（字符串表达式求值/非字符串透传/键冲突覆盖操作变量）、hooks 集成 8+ 条（children 加载与空页缓存、leaf 短路不发请求、options×children 合并去重、search debounce 与 echo、searchMergeMode append/replace 两态、search 翻页合并、abort 静默不进错误态、resolve 短路与对位、错误 i18n 键、sourceSearch 缺失本地过滤）

Exit Criteria:

- [x] `npx vitest run src/__tests__/org-data-protocol.test.ts`（form 包内）全绿
- [x] 协议 §3.1/§4.1/§4.2/§5/§6/§7 每条规则在单测中有对应用例（评审时逐条对照；§7 的 searchMergeMode/本地过滤/abort 静默/leaf 短路含显式用例）

### Phase 3 - L2.1-a user-select

Status: completed
Targets: `packages/flux-renderers-form/src/`、playground lab、`docs/components/user-select/`

- Item Types: `Fix`、`Proof`

- [x] `UserSelectSchema`（`type:'user-select'`，extends InputSchema：`options?`/`sourceChildren?`/`sourceSearch?`/`sourceResolve?: ActionSchema`/`multiple?`/`searchable?`/`searchMergeMode?`/`selectableTypes?`（默认 `['user']`）/`pageSize?`/`extraParams?`/`clearable?`；defaultSchema 项按 form 包标量字段先例不适用，注记同 503 先例）+ `userSelectSpecificContracts`（action 三字段用 `searchSourcePropContract` 形状）+ definition（capability contracts: clear/reset/focus/open）
- [x] `org-select-panel.tsx` 共享面板（widget 自建样式，marker `data-slot="org-select-*"`、无 BEM、`cn()`）：触发钮（placeholder/选中 label，多选 chips）+ Popover/Sheet 面板（搜索框、面包屑导航、类型感知行——部门行 chevron 导航 + 可选 checkbox、人员行 checkbox、loadMore、错误重试行、空态）；单选点选即关、多选即时 toggle
- [x] `UserSelectRenderer`：`useFormFieldFromProps` + 多值 `checkboxGroupAdapter`/单值 `choiceSingleAdapter`；`useInputComponentHandle`（clear/reset/focus/open）
- [x] focused 单测（jsdom 可观测面：渲染/单选提交/多选数组提交/静态 options/searchMergeMode 两态/回显 resolve/禁用态/selectableTypes 灰选/错误态文案键）
- [x] lab 页（scenarios：静态 options 单选、远程懒加载+搜索+回显多选、children 失败重试、searchMergeMode replace）+ form-route-entries + lab registry；`design.md`（12 节，**§数据源节显式警示 `sourceSearch` 与 select `searchSource` 近似异位词**——协议 §8 义务）+ `example.json`；i18n 键
- [x] e2e `org-select-user.spec.ts`：懒加载展开/搜索选中/多选 chips 回显/禁用态程序化断言

Exit Criteria:

- [x] route-matrix form 覆盖守卫绿（user-select 全链路注册）；form 包 focused 单测绿（含 Phase 2）
- [x] e2e spec 全绿（org-select-user 3/3）

### Phase 4 - L2.1-b department-select（消费同一共享面）

Status: completed
Targets: `packages/flux-renderers-form/src/`、playground lab、`docs/components/department-select/`

- Item Types: `Fix`、`Proof`

- [x] `DepartmentSelectSchema`（同族字段，`selectableTypes` 默认 `['department']`）+ contracts + definition + `DepartmentSelectRenderer`（复用 `org-select-panel`，第二呈现配置：无人员类型行渲染差异、部门行直接可选）
- [x] focused 单测（懒加载展开/面包屑导航/多选级中/回显/禁用）
- [x] lab 页（scenarios：懒加载树多选、搜索+回显单选、空页终止）+ 路由注册；`design.md`（含同款 `sourceSearch`/`searchSource` 异位词警示）+ `example.json`（共享节引用协议与 user-select design，差异节写实）
- [x] e2e `org-select-department.spec.ts`

Exit Criteria:

- [x] route-matrix 守卫绿（department-select 全链路注册）；数据面代码审计自检：envelope 解析/变量注入/终止判定/错误键均仅在 Phase 2 共享模块一处（零分叉预检，正式复核在 QA.3）
- [x] e2e spec 全绿（org-select-department 2/2）

### Phase 5 - 登记 + INV 审计 + 收口验证与状态回写

Status: completed
Targets: 三处登记文档、roadmap §13、dev log

- Item Types: `Proof`、`Follow-up`（登记性）

- [x] 登记：`examples.manifest.json` runtime 尾部追加两 type；`quick-reference.md` form 节补两 type 行；`components/index.md` L333 清单行 + L497 起目录两行
- [x] INV 审计（铁律 7）：`new-renderer-introduction-audit.md` §1 INV-1–INV-5 + §3 checklist A–G，结论按 §4 模板落本 plan Closure 节（簿记补正 2026-09-26：audit 实录已完成，勾选漏同步）
- [x] 全量验证（Closure Gates）+ roadmap §13 L2.1 回写 `done`（replace 后 grep 复核）+ dev log（簿记补正 2026-09-26）

Exit Criteria:

- [x] 三处登记 diff 可见且 grep 复核命中
- [ ] INV 审计结论在案；roadmap/dev log 落盘一致

## 授权记录（human gate）

- 用户 2026-09-25 指令「执行 docs/backlog/missing-components-and-designer-roadmap.md 直到彻底完成…每个计划完成后都提交一次」为 roadmap §5 L2.1 行（明列交付 `user-select` + `department-select`）的执行授权；matrix flip（铁律 1 human gate）随指令签认（先例：plan 503 授权记录节）。
- `packages/ui/src/index.ts` ask-first 门：**不触发**（本计划 ui 包零改动，呈现层自建于 form 包）。

### 协议文档语义补记裁决（closure audit round 1 Major-1 登记项）

执行 L2.1 时对已完成交付物 `docs/architecture/org-data-source-protocol.md` §3 做了一处语义补记：「**未标注 `type` 的节点视为通用可选节点**（不参与类型过滤）」。裁决依据：协议 §3 混合树规则原文只说「可选集由各 renderer schema 声明」，未钉死 untyped 节点行为——`selectableTypes` 默认过滤下，未标注 type 的数据源会使 department-select 全树不可选（可用性失效）。该补记 (a) 是协议自身歧义的收敛（与 504 协议评审 R2 对 N1 的处理同类）；(b) 实现侧（`isNodeTypeSelectable` untyped→true）、单测（org-data-protocol.test.ts typed/untyped 用例）、两份 design.md 三方一致；(c) 已在 closure audit round 1 补登记本节 + dev log 披露，非静默变更。后续 L2.2 region 实现若需收紧该语义，须走协议变更裁决，不得再行文内直接修改。

## 命名决议（Phase 1 交付物）

| 暂定名（roadmap）   | 定名                      | 依据                                                                                                                                                                                                                          |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user-select`       | **`user-select`**（不变） | flux select 控件族 `-select` 后缀约定（select/tree-select/button-group-select）；roadmap 行名同；语义直指「选人」。schema 属性按 naming-conventions §2（multiple/searchable/selectableTypes/pageSize 均 shadcn 式肯定命名）。 |
| `department-select` | **`department-select`**   | 同上；与 `user-select` 构成 org 族对称命名；roadmap 行名同。                                                                                                                                                                  |

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Round 1 `fail`（2M/6m）：M1 协议 §7 并存/降级行为（searchMergeMode、options×children 合并、本地过滤、abort 静默、leaf 短路）无落地与验证项 → Phase 2 补 `filterLocalOptions` 纯函数 + hooks 行为写实 + 单测清单扩至 §3.1–§7 全规则映射 + Phase 3 下沉验证；M2 协议 §8 异位词警示义务缺失 → Phase 3/4 design.md 交付项显式写入；m1 defaultSchema 不适用注记（同 503）、m2 org-search-failed 行为裁决（清空对齐 select 先例）、m3 search 翻页写实、m4 §6 extraParams 用例、m5 根加载协议原口径、m6 abort/leaf 用例——全部落实。Round 2 逐条确认闭合、无新问题，达成共识。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本线无 in-scope live defect；执行中暴露的均为测试 mock/断言问题并当场修复）
- [x] 所有 in-scope confirmed contract drifts 已收敛（数据面契约全走共享模块，零 fork；登记面全部落盘）
- [x] 行为/契约结果已达成（两 renderer `runtime`：matrix flip + design/example/代码/测试/登记/i18n 八项交付面齐）
- [x] 必要 focused verification 已完成（55 条 focused 单测全绿 + e2e 双 spec 5/5 真浏览器断言）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（两项 v1 取舍显式登记 Non-Blocking Follow-ups）
- [x] 受影响的 owner docs 已同步到 live baseline（两份 design.md、matrix 两行、三处登记、协议文档零分叉预检通过）
- [x] new-renderer-introduction-audit（§1 INV-1–INV-5 + §3 checklist A–G）已过且结论按 §4 模板记录于 Closure 节
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（2026-09-25 全仓 0 error）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0；仅存量 1 warning）
- [x] `pnpm test`（`--force` 零缓存 74/74 task 全绿；form 905/905 = 850+55——closure r1 增补 org-root-no-source 用例后由 closure audit round 2 复跑 form 包全量证实为绿）
- [x] `pnpm check`（exit 0，零新增红；执行中触发的 1 条 raw-error-message-direct-out 新红已改写消解；700 行超额 2 文件为在册存量）
- [x] `pnpm test:e2e`（全量 27.5min：1551 passed / 11 failed——10 项与 502 存量台账 + watch-only 完全一致；新增 1 项 playground-entry-pages map-demo:544 经隔离复跑 3 次全过，判定为全量负载 flake 非本计划回归，登记 dev log + QA.2 前消化清单复核）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- **移动端 Sheet 形态未做**：v1 面板仅 Popover 单形态（`useIsMobile` + Sheet 双形态为 tree-select 先例模式）。Why Not Blocking Closure：宽窄容器均可用（面板 w-80），移动专属形态无 host 需求登记。Classification: `optimization candidate`；Successor Required: no（demand 出现时独立小 plan）。
- **搜索行不提供树导航**：搜索结果行仅可选中（协议 §4.2 平铺语义）。Why Not Blocking Closure：搜索→选中主路径完整，清空搜索即回树导航。Classification: `optimization candidate`；Successor Required: no。

## Closure

Status Note: L2.1 两 renderer 全交付并经独立 closure audit 两轮通过（round 1 `issues`：1M 协议文档语义补记未登记 + 5m → 补裁决记录/Follow-ups 回填/勾选/还原误格式化文件/计数修正/增补 root-no-source 单测；round 2 `approved` 0B/0M，Minor-6 数字同步随本提交完成）。两 renderer `runtime`：matrix flip + design/example + 代码（55 focused 单测）+ e2e 5 用例真浏览器断言 + 四处登记 + i18n 双语 + INV 审计（铁律 7）全过。unit 侧 full-green（74/74 task；form 905）；e2e 全量零新增红（1551 passed；失败面 = 502 存量台账 9 + 1 在册 watch-only + 1 例隔离复跑 3 次全过的负载 flake，复现观察登记 QA.2 前消化清单）。

### new-renderer-introduction-audit 结论（§4 模板，2026-09-25，执行 session 自查、供 closure audit 复核）

- **INV-1 IO 边界**：两 renderer 无直调 fetch/WebSocket/storage/动态 import——数据面全部经 ActionSchema 派发（`helpers.dispatch` → host fetcher），`renderers/org/` 共享模块是唯一 dispatch 入口——过。
- **INV-2 新 IO 类型**：无新增 env 能力需求（协议 §2 INV-2 A 档裁定，504 已裁）——过。
- **INV-3 复用边界**：复用 ui Checkbox/Popover/Input/Button/Spinner；多值/单值 adapter 复用 select 族既有 `checkboxGroupAdapter`/`choiceSingleAdapter`；字段底座复用 `useFormFieldFromProps`；未 fork 任何既有通道（协议 §8 tree `childrenSource`/loadDict 边界遵守）——过。
- **INV-4 内部 state 边界**：面板导航栈/搜索词/懒加载缓存/echo 池均为组件内部态，零写入 scope（值仅经 `handlers.onChange` 走 form 字段通道）——过。
- **INV-5 契约边界**：`RendererComponentProps<OrgSelectSchema>` 签名；数据读 props.props/meta；句柄经 `useInputComponentHandle`（clear/reset/focus/open）；definition 注册齐（propContracts/fields/validation/schemaValidator/capabilityContracts/wrap）——过。
- **Checklist A–G**：A IO 经 env/action ✓；B 复用 ✓；C 内部态 ✓；D 契约 ✓；E schema 驱动扩展（11 个新 prop 全登记 contract）✓；F 样式（nop-org-select-field + data-slot 族，无 BEM、无字面色）✓；G 进既有 flux-renderers-form 包、零新包 ✓。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Evidence: round 1 `issues`（1M：协议 §3 语义补记未登记——补 plan 授权记录「协议文档语义补记裁决」节 + dev log 披露；5m：Follow-ups 回填、Phase 4 e2e 勾选、analysis 文件还原、单测计数修正、org-root-no-source 增补单测）→ round 2 `approved`（审计员实跑：route-matrix 42/42、org focused 55/55、form 全量 905/905、org 双 e2e spec 5/5 真浏览器、i18n 30/30、ui 包零改动核实；零分叉核心核对——parseOrgNodePage/shouldStopPaging/变量注入全仓唯一实现在 `renderers/org/`）。Minor-6（账面数字 904→905 同步 + 本 dev log round 2 记录回填）已随本收口提交完成。

Follow-up:

- no remaining plan-owned work（两项 v1 取舍已登记 Non-Blocking Follow-ups；QA.3 零分叉正式复核为 roadmap 绑定项）

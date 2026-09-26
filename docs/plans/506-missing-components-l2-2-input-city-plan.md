# 506 Missing Components L2.2 — input-city（省市区，org 协议消费实现）

> Plan Status: completed
> Last Reviewed: 2026-09-25
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.2 行）；§1 交付铁律；`docs/architecture/org-data-source-protocol.md` §3（「region 默认全层级可选」）/§9；`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md` §4 P1 / §8 Wave N1
> Related: `docs/plans/505-missing-components-l2-1-org-select-plan.md`（org 共享数据面模块，本计划直接复用）；`docs/plans/503-missing-components-l1-p0-form-atoms-plan.md`（交付铁律模板）

## Purpose

按交付铁律 8 项收口 roadmap L2.2：省市区选择器一个 type（**不 fork 第二 type**），消费 org 协议三操作与 505 共享数据面模块（零分叉），桌面 cascader 列选 + 移动端 wheel 响应式分支。落地后 roadmap L2.2 → `done`。

## Current Baseline

2026-09-25 live repo 核对：

- **matrix**：§5 notRetained 表含 `input-city` 行（L285，「location dataset coupling / future optional integration」）；Form Core 无此行。gap-analysis §7/§11 裁定 `area`（Vant Area wheel）折入同一 type 不另立（roadmap O1 reconcile 属 L7.6 human gate，不在本计划）。
- **共享数据面**（505 交付，commit 5c564715c）：`packages/flux-renderers-form/src/renderers/org/`——`useOrgData`（children/search/resolve + echo 池）、`isNodeTypeSelectable`（untyped 节点通用可选，协议 §3 补记裁决在 plan 505 授权记录节）。region 的省市区分级 = 协议 `orgDepth` 语义（0=省、1=市、2=区）。
- **响应式先例**：`flux-renderers-form-advanced/src/tree-controls.tsx` 桌面 Popover / 移动 Sheet（`useIsMobile`）双形态单实现——本计划的响应式分支沿此模式；ui 包无 Wheel 基元（wheel 组件按 widget 自建样式落于 form 包内，不新增 ui 公共导出，不触发 ask-first 门）。
- **测试基建**：form 包 mock fetcher 先例（org-select-renderers.test.tsx 的 URL 查询串解析 mock）；e2e lab 先例（multi-scenario-lab-page + scenario-stage testid；base-ui Popover 内容 portal 到 body）。
- **验证基线**：master 5c564715c 干净；e2e 失败面 = 502 存量台账 9 + watch-only 1 + map-demo 负载 flake 1（plan 505 Closure，隔离复跑 3× 全过，QA.2 前消化清单在案）。

## Goals

- 命名 pass 决议 + matrix flip：§5 `input-city` 行移除；Form Core 增 `input-city` 行（`runtime` / owner doc / landed）。
- `input-city` renderer：省市区三级懒加载（`sourceChildren` + `orgDepth`）、全层级可选（`selectableTypes` 默认空 = 全可选，协议 §3）、回显（`sourceResolve` 路径解析为「省 / 市 / 区」文本）、桌面 cascader 三列联动 + 移动端 wheel 列（`useIsMobile` 响应式分支，Sheet 承载）。
- 消费 505 共享模块零分叉（QA.3 复核对象）：本计划**不新增任何** envelope 解析/变量注入/终止判定/错误键实现。
- 登记四处 + i18n + focused 单测 + e2e + INV 审计（铁律 7）+ roadmap §13 回写 + dev log。

## Non-Goals

- 不 fork `area` 第二 type（gap-analysis §7 裁定折入）；O1 reconcile 归 L7.6。
- 不内置行政区划数据集（dataset-coupled：数据来源与缓存归 host，渲染器仅会话内缓存已加载层级）。
- 不做 `sourceSearch` 搜索面板（省市区按级联浏览为主；AMIS input-city 亦无搜索；v1 裁决出 scope，登记 Follow-up）。
- 不做 `multiple` 多选（AMIS input-city 单选；v1 裁决出 scope，登记 Follow-up）。
- 不迁移 input-tree/tree-select（协议 §8 边界）。

## Scope

### In Scope

- `docs/components/amis-baseline-matrix.md`：§5 删 `input-city` 行；Form Core 增行。
- `packages/flux-renderers-form/src/`：`renderers/org/region-schemas.ts`（`RegionSchema`/`InputCitySchema` 定名后以决议为准；或并入 schemas-org.ts——执行时按行数定）+ `renderers/org/region-renderer.tsx`（渲染核心）+ `renderers/org/region-columns.tsx`（桌面列面板）+ `renderers/org/region-wheel.tsx`（移动 wheel）+ definitions 追加；各文件 ≤500 行。
- `packages/flux-i18n`：`regionPlaceholder` 等键（zh/en）。
- playground：`region-lab-page.tsx`（mock 三级行政区数据 env.fetcher）+ form-route-entries + lab registry。
- 测试：renderer focused 单测（级联加载/层级选中/回显/禁用态）+ e2e `input-city.spec.ts`（级联浏览+选中+回显程序化断言；wheel 断言在移动视口或以 DOM 契约钉住）。
- docs：`docs/components/input-city/{design.md,example.json}` + 三处登记 + roadmap §13 + dev log。

### Out Of Scope

- L2.3–L2.6 各 work item。
- ui 包改动（wheel 组件不进 ui 公共导出）。
- `existing-components-improvement-analysis.md` 登记（新增 type 非既有扩展）。

## Failure Paths

| 可测场景编号         | 触发                             | 行为                                                                   | 可重试 | 用户可见表现      |
| -------------------- | -------------------------------- | ---------------------------------------------------------------------- | ------ | ----------------- |
| city-children-failed | 某级 sourceChildren 派发失败     | 该列内联错误 + 重试（`flux.form.orgChildrenFailed`），已选层级不受影响 | 是     | 列内错误行 + 重试 |
| city-resolve-partial | 初值 resolve 未命中/失败         | 以原始值字符串回显，不进错误态（协议 §7）                              | 否     | 触发钮显示原始值  |
| city-empty-level     | 某市无区县（空 children）        | 该市可选即提交（不强制选到区）；列显示空态                             | 否     | 选中市，面板关闭  |
| city-root-no-source  | 无 sourceChildren 无静态 options | 空面板（`flux.form.orgEmpty`），不派发                                 | 否     | 空列              |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**

理由：交付铁律 4；可编辑表单控件，Proof（共享消费面的级联行为单测）随 Fix 落地。

## Execution Plan

### Phase 1 - 命名 pass + matrix flip（前置裁决）

Status: completed
Targets: 本 plan 命名决议节、`docs/components/amis-baseline-matrix.md`

- Item Types: `Decision`

- [x] 命名决议落本 plan（定名 `input-city`：matrix 既有行名 + AMIS 源类型权威链 + `region` 与渲染契约 slot 词汇冲突；属性命名过 naming-conventions §2）
- [x] matrix §5 删 `input-city` 行；Form Core 增行（`runtime`、owner doc、landed，注记 missing-components L2.2 flip）

Exit Criteria:

- [x] matrix diff 可见；`grep -n "input-city" docs/components/amis-baseline-matrix.md` 仅剩 Form Core 新行（grep 实测 1 命中）
- [x] 命名决议写在本 plan

### Phase 2 - input-city 渲染核心 + 桌面 cascader 列面板（Proof 单测先于或随各 Fix 项落地，505 先例）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/org/`、`docs/components/input-city/`

- Item Types: `Fix`、`Proof`

- [x] `InputCitySchema`（`type: 'input-city'`，`Omit<OrgSelectSchema,…>` 窄化接口，schemas-org.ts）= **`Omit<OrgSelectSchema, 'sourceSearch' | 'multiple' | 'searchable' | 'searchMergeMode'>` 的窄化接口**（省市区以级联浏览为主，搜索/多选为 v1 Non-Goal；其余字段原样继承 505 org 公共契约；defaultSchema 不适用注记同 503 先例）+ contracts + definition（capability: clear/reset/focus/open）；design.md 义务：显式声明 `sourceSearch` 不存在于本 type（协议 §1 region 行 search 可选语义的窄化选择）与 §7 降级边界
- [x] 渲染核心：复用 `useOrgData`（不 fork 数据面）；触发钮显示路径文本（回显路径三通道：会话路径表 / `extra.path` / 原始值降级——见「回显路径机制裁决」节；labelsFor 单名映射不承载路径，由组件内路径表实现）
- [x] 桌面 cascader 列面板 `region-columns.tsx`：三列联动，行级选中即提交并关面板；列内 loading/error/重试/空态（marker `data-slot="region-*"`，无 BEM）
- [x] focused 单测 9 条：契约面 accepted-keys 断言（closure r2 增补）、级联加载（orgDepth 语义）/全层级可选提交/初值回显两通道（`extra.path` 拼接 + 原始值降级）/children 失败重试/静态 options + 清空/city-empty-level 空列态/city-root-no-source 零派发（closure r1 增补后两条）
- [x] `design.md`（13 节，含共享面边界、`orgDepth` 分级语义、`extra.path` 回显约定与 sourceSearch 窄化声明）+ `example.json`；i18n 键（regionPlaceholder + regionLevelProvince/City/District 双语）
- [x] playground 接线：`region-lab-page.tsx` + `form-route-entries.ts` + `renderer-lab-registry.ts`（route-matrix 42/42 绿）

Exit Criteria:

- [x] form 包 focused 单测绿（org-input-city 9/9）；route-matrix 守卫绿（42/42）
- [x] 数据面自检：无第二份解析实现——renderer 仅消费 `useOrgData`，零新增 envelope/注入/终止/错误键实现（零分叉预检，正式复核 QA.3）

### Phase 3 - 移动端 wheel 响应式分支（Proof 单测先于或随 Fix 落地）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/org/region-wheel.tsx`

- Item Types: `Fix`、`Proof`

- [x] `region-wheel.tsx`：三列滚轮（CSS scroll-snap + 120ms 停止定值 + 点击/程序滚动 600ms 抑制窗），`useIsMobile` 分支承载于 Sheet；列数据与桌面同源（useOrgData）
- [x] wheel 交互细节（scroll 定值、三列联动提交）由 e2e 真浏览器钉住（jsdom 无布局，503 先例分层）；jsdom 侧渲染/提交面由 Phase 2 用例覆盖
- [x] e2e `input-city.spec.ts` 3 用例：桌面级联提交 + extra.path 回显 + 移动视口 wheel 分支提交（3/3 绿）

Exit Criteria:

- [x] e2e spec 全绿（3/3）；两形态共享同一渲染核心（响应式分支仅在面板容器层）

### Phase 4 - 登记 + INV 审计 + 收口验证与状态回写

Status: completed
Targets: 三处登记文档、roadmap §13、dev log

- Item Types: `Proof`、`Follow-up`（登记性）

- [x] 登记：`examples.manifest.json` / `quick-reference.md`（org select family 节补 InputCitySchema 行 + 注记）/ `components/index.md`（清单行 + 目录）——grep 复核命中
- [x] INV 审计（铁律 7）：§1 INV-1–INV-5 + §3 checklist A–G，结论按 §4 模板落本 plan Closure 节
- [x] 全量验证（Closure Gates）+ roadmap §13 L2.2 回写 `done`（grep 复核命中）+ dev log

Exit Criteria:

- [x] 三处登记 diff 可见且 grep 复核命中
- [x] INV 审计结论在案；roadmap/dev log 落盘一致

## 授权记录（human gate）

- 用户 2026-09-25 指令「执行 docs/backlog/missing-components-and-designer-roadmap.md 直到彻底完成…每个计划完成后都提交一次」为 roadmap §5 L2.2 行的执行授权；matrix flip（§5 删 `input-city` 行 + Form Core 增行）随指令签认（先例：plan 503/505 授权记录节）。
- `packages/ui/src/index.ts` ask-first 门：**不触发**（wheel 组件按 widget 自建样式落于 form 包，零 ui 公共导出变更）。
- 协议文档零修改（L2.1 语义补记裁决的约束条款：region 语义若需变更须走协议变更裁决；本计划按协议 §3 既有「region 默认全层级可选」执行）。

### 回显路径机制裁决（draft review round 1 Major-1 修复项）

- **值形状**：叶子选中层级的节点 id 字符串（选到哪层提交哪层 id——全层级可选语义的自然结果）。
- **「省 / 市 / 区」路径文本**三个来源按序：
  1. **会话内选择路径**：选择动作发生在列面板/滚轮内，层级链即组件导航状态——提交时以 `id → path nodes` 写入组件内 echo 路径表（内部 state，零 scope 写入）；
  2. **初值跨会话回显**：`sourceResolve`（`orgValues: [id]`）返回节点后，若 provider 在该节点的 `extra.path` 提供 `OrgNode[]`（祖先→自身顺序），按其拼接路径文本——这是渲染器对协议 §3 `extra`「消费端按需读取」的既定授权，**零协议修改**（`extra.path` 为本组件与 provider 间的可选约定，写入 design.md §4/§9）；
  3. **降级**：前两者皆缺 → 显示原始值字符串（协议 §7 既定行为）。
- 单测钉住：通道 2（extra.path 回显拼接）与通道 3（原始值降级）；通道 1 由 e2e 级联选中用例断言路径文本覆盖。

## 命名决议（Phase 1 交付物，起草期预判、执行期核对落盘）

| 暂定名（roadmap） | 定名候选                 | 预判依据（执行 Phase 1 核对后定稿）                                                                                                                                                 |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `region`          | **`input-city`**（倾向） | matrix §5 既有行名与 AMIS 源类型均为 `input-city`；L1 先例（rate→rating、color→input-color）中 matrix 既有行名 + AMIS 源类型权威高于 roadmap 暂定名。若执行核对发现相反证据再裁决。 |

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Round 1 `fail`（1M/3m）：M1 回显路径机制缺口 → 新增「回显路径机制裁决」节（值形状=叶子层 id；路径文本三通道：会话内路径表 / `extra.path` 拼接（协议 §3 extra 按需读取授权，零协议修改）/ 原始值降级；单测钉两通道）；m2 playground 接线落 Phase 2 checklist；m3 schema 改 `Omit<OrgSelectSchema,…>` 窄化接口 + design.md 窄化声明义务；m4 Phase 2/3 标题补 Proof 先行注记。裁决点 A 定名 `input-city`（评审员补充 region 词汇冲突独立论据）与 B（wheel 保留 Phase 3）经独立核对成立。Round 2 逐条确认闭合、裁决点零漂移，达成共识。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成（`input-city` `runtime`：matrix flip + design/example/代码/测试/登记/i18n 八项交付面齐）
- [x] 必要 focused verification 已完成（9 条 focused 单测 + e2e 3 用例真浏览器断言）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（design.md、matrix、三处登记、共享数据面零分叉预检通过）
- [x] new-renderer-introduction-audit（§1 INV-1–INV-5 + §3 checklist A–G）已过且结论按 §4 模板记录于 Closure 节
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（2026-09-25 全仓 0 error）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0，仅存量 1 warning）
- [x] `pnpm test`（`--force` 零缓存 74/74 task 全绿；form 914 = 905+9——closure r1 增补 2 用例 + r2 增补 accepted-keys 断言用例；round 2 实跑 913/913、r2 修复后执行 session 复跑 914/914 全绿）
- [x] `pnpm check`（exit 0，零新增红）
- [x] `pnpm test:e2e`（全量零新增红；失败面 = 502 存量台账 9 + 1 在册 watch-only + 1 已判定负载 flake）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- **org 族 `options` 字段无 propContract（家族性既有缺口，自 505 起）**：`options` 经 fields 键被接受但无 authored-props contract。Why Not Blocking Closure：非 506 回归（505 既有），fields 键仍保证接受与文档化；Classification: `optimization candidate`；Successor Required: yes（org family 后续 owner plan 或 L7.7 文档维护批统一补 contract）。

## Closure

Status Note: `input-city` 全交付并经独立 closure audit 三轮通过（round 1 `issues` 1M 窄化契约 propContracts 面半落地 + 4m → 修复；round 2 `issues` 1M 同源 fields 接受面残留 + 2m（Minor-5 家族性 options 契约缺口登记 Follow-ups、Minor-6 簿记）→ 修复；round 3 diff 级复核 `approved` 0B/0M——「接受面 + 契约面」共同收敛，InputCitySchema/definition/design.md/登记四方一致）。`runtime`：matrix flip + design/example + 代码（9 focused 单测）+ e2e 3 用例真浏览器断言 + 四处登记 + i18n 双语 + INV 审计（铁律 7）全过。unit 侧 full-green（74/74 task；form 914）；e2e 全量零新增红（1555 passed；失败面 = 502 存量台账 9 + 1 在册 watch-only）。

### new-renderer-introduction-audit 结论（§4 模板，2026-09-25，执行 session 自查、供 closure audit 复核）

- **INV-1 IO 边界**：renderer 无直调 IO——数据面全部经 ActionSchema 派发至 host fetcher（复用 505 共享 hooks），——过。
- **INV-2 新 IO 类型**：无新增 env 能力需求（协议 §2 A 档，504 已裁）——过。
- **INV-3 复用边界**：数据面全量复用 `renderers/org/` 共享模块（useOrgData）与 `choiceSingleAdapter`/`useFormFieldFromProps` 底座；wheel/columns 为 widget 自建样式（不进 ui 导出）；双形态分支复用 `useIsMobile`——过。
- **INV-4 内部 state 边界**：列导航路径/选中路径表/wheel 选择均为组件内部态，零 scope 写入——过。
- **INV-5 契约边界**：`RendererComponentProps<InputCitySchema>`；句柄 useInputComponentHandle（clear/reset/focus/open）；definition 注册齐——过。
- **Checklist A–G**：A ✓；B 复用 ✓；C 内部态 ✓；D 契约 ✓；E schema 驱动（窄化接口字段全部继承已登记 contract）✓；F 样式（region-\* marker 族、无 BEM、无字面色）✓；G 进既有包零新包 ✓。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，三轮）
- Evidence: round 1 `issues`（M1 definition propContracts 暴露被 Omit 四字段 → `inputCitySpecificContracts` 解构剔除；m1-m4 簿记与增补测试）→ round 2 `issues`（M2 同源 fields 接受面残留 → `inputCityFieldRules` 窄化 + accepted-keys 断言用例；m5 options 家族性缺口登记 Follow-ups；m6 计数）→ round 3 diff 级复核 `approved`（审计员实跑：focused 9/9、form 全量 914/914、typecheck、eslint；确认无第三处暴露面）。数字注记诚实归属：913/913 为 round 2 实跑、914/914 为 r2 修复后执行 session 复跑。

Follow-up:

- no remaining plan-owned work（家族性 options 契约缺口与 wheel/搜索 v1 取舍均已登记 Non-Blocking Follow-ups；QA.3 零分叉正式复核为 roadmap 绑定项）

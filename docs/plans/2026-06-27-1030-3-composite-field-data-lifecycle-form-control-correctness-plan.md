# {3} Composite-Field / Data-Lifecycle / Form-Control Renderer Correctness

> Plan Status: completed
> Last Reviewed: 2026-06-27
> Mission: amis-bug-driven-improvements
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md, audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md
> Related: docs/plans/2026-06-24-1300-1-w4c-composite-form-family-plan.md, docs/plans/2026-06-27-0007-3-async-lifecycle-abort-and-inflight-race-hardening-plan.md

## Purpose

收口本 mission 暴露或遗留的渲染器行为正确性残余，按三个子结果面组织：(A) composite-field 数组编辑器——`removeWhen` 字段规则建模、超大文件硬门禁、每键击注册 churn、行 key 稳定性；(B) data 簇生命周期——无限滚动 loading/error 契约、list 选择重置、tree 展开性能与焦点；(C) form 控件——picker 单选静默清空、period 类型分派、upload 取消与卸载后写入。每个子面都有独立 closure criteria，但同属「渲染器可观测契约正确性」这一 owner 面，故合为单 plan 多 phase 收口，避免 one-finding micro-plan。

## Current Baseline

核对自 HEAD `77bd50b6`（与两份审计快照一致）：

- **M-03（removeWhen 逐项重编译）**：`combo-renderer.tsx:266-269,327-358` 与 `array-field.tsx:325-328,481-515` 声明 `{ key:'removeWhen', kind:'ignored' }`，编译器跳过，渲染器经 `props.schema.removeWhen`（裸 schema 字符串）逐项 `helpers.evaluate(rawString, itemScope)`。因 `runtime-eval-helpers.ts:21` 的 cache 仅收 object target，字符串每次重编译；`removeBlockedByIndex` memo 每次 data churn 付 N 次编译。框架已有 `lazyEval` 通道（`renderer-runtime.md` 的 `structuralFields`）专为逐项求值而设。
- **M-05（array-field 超 700 硬线）**：`packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` = 722 行（`pnpm check:oversized-code-files` ERROR 报 723）。可干净抽出的校验助手（`getScalarItemValidationMetadata` 216-232、`collectScalarArrayItemErrors` 234-282、`publishScalarArrayItemErrors` 284-308，~100 行）。前两者为纯函数；`publishScalarArrayItemErrors` 是 glue（调 `form.applyExternalErrors`，有副作用），仍可干净外移。同波次已抽 `remove-when-gating.ts`/`instance-path-equal.ts`。
- **G9（每键击 churn）**：`array-field.tsx:422-425`（`scalarChildPaths` deps `[itemKind, items, name]`）→ 注册 `useLayoutEffect`（`:546-577`，deps 含 `items`）与子契约 `useEffect`（`:579-631`，deps 含 `items`）。键入一字 → `items` 新引用 → `scalarChildPaths` 路径字符串相同但数组引用变 → 两个注册 effect 重跑。**关键**：array-field 的这两个 effect **直接从闭包读 `items`**（`:558 items[index]`、`:562/596/615 items`），而非经 `itemsRef`（`itemsRef` 仅 Add/Remove 处理器用，`:371-374`）。故修复**非纯机械**：从 deps 移除 `items` 时必须把闭包内 `items` 读取改接到 `itemsRef.current`，否则会读到陈旧值。**按文件区分**：仅 `array-field.tsx` 做逐项 `parentForm.registerField`（N 次 unregister/register）；`array-editor.tsx`/`key-value.tsx` 用**单一** `updateFieldRegistration`（经 registrationRef 整体更新，`:282/:342`），不做逐项 registerField——它们的 churn 只是 `childPaths` memo + 契约重注册，量级远小于 array-field。故 G9 的「20× 子字段 unregister/register」指标**仅对 array-field 成立**；siblings 的指标是「注册 effect 不随键击重跑」。
- **G18（位置 React key）**：对缺 id/key 的行回退到位置 key → 删第 i 行使后续 key 全部左移 → React 卸载/重挂 → 子输入失焦、本地态丢失。重复 key 警告只针对重复，不针对缺 key 的位置回退，故无信号。**按文件/kind 区分（live 核对）**：`array-field.tsx` 的**标量**项**已有**稳定 key 机制 `compatibilityItemKeys`（`:375-377` 播种、`:432-448` 经 `nextItemKeyRef` 增长、`:447` 收缩时 slice 保留），故标量 array-field **不受 G18 影响**——它正是 repo 内现成的参考解。G18 实际命中：`array-field.tsx` 的**对象**项（当 `buildObjectArrayItemKeys` 解析失败时回退 `legacy-index:${index}`，`:390`）、以及 `array-editor.tsx`/`key-value.tsx`/`combo-renderer.tsx`/`input-table-renderer.tsx` 的缺 id 行。
- **G5（无限滚动 loading/error 死契约）**：`use-infinite-scroll.ts:56-117` 暴露 `loading`/`error`/`setLoading`/`setError`/`reset`，但观察回调 `:79-85` 调 `onLoadMoreRef.current()` 无 `loading` 守卫，hook 自身从不调 `setLoading`/`setError`。消费方（`crud-renderer.tsx:209-231,579-613`、`list-renderer.tsx:279-307,366-435`）只读 `loading`/`error` 渲染状态文案/错误 UI，唯一 `setError` 是重试按钮清空。后果：(1) loading/error UI 永不渲染；(2) 无 `if(loading) return` 守卫 → sentinel 出-入视图切换间触发二次 `onLoadMore` → 页码翻两番 → 跳页/重复；(3) 首页短于视口时 sentinel 不离视图 → 无 transition → 静默停止加载。
- **G12（list 选择不随数据重置）**：`list-renderer.tsx:234,317-344` 的 `selectedKeys` 纯内部态，数据集变更无驱逐；CRUD 有 `autoClearSelectionOnRefresh`，独立 list 没有。
- **G13（tree 展开全量渲染）**：`tree-renderer.tsx:160-180`——50 项批仅初始首屏，0ms 后 `renderedChildCount` 跳到全量无虚拟化；单节点持千级子节点展开即卡。
- **G17（tree 焦点丢到 body）**：`tree-renderer.tsx:419-431`——`resolvedActiveNodeId` 修正 roving `tabIndex` 但不移动真实 DOM 焦点，数据刷新致活跃节点消失时键盘用户落到 `<body>`。
- **G1（picker 单选静默清空）**：`picker-renderer.tsx:150`（`openDialog`）、`:196-206`（`confirmSelection`）、`:294`（RadioGroup）。`multiple:false` 时 `pending = new Set(multiple? selectedValues : [])` 即空；空 pending 按 Confirm → `Array.from(pending).pop()` 得 `undefined` → `writeValue(undefined)` 清空字段。Confirm 按钮恒启用，无 pending 守卫；RadioGroup 不预高亮当前值。`:200` 内联注释（"keep existing if none toggled"）与代码矛盾。多选安全（从 selectedValues 播种）。mission 把单选改写成 RadioGroup，使该潜在 bug 直接对用户可见。
- **M-07（period 硬编码类型分派）**：`period-renderers.tsx:39-43,51` 的 `resolveKind(schemaType)` 三分支硬编码 `schema.type` switch；pre-existing，mission 仅改 `data-slot`。P3，渲染器家族内自分派，blast radius 小。
- **G11（upload 不可取消）**：`upload-field.tsx:179-251`——`dispatch(uploadAction,…)` 无 abort signal；成功后 `commitItems→onChange` 写（可能已卸载的）字段；无用户取消。即 U2–U4 生命周期缺口。
- 绿基线：`pnpm typecheck`/`test`/`lint` 全过。

## Goals

- `removeWhen` 经 `lazyEval` 编译一次、逐项求值，渲染器不再读裸 schema 字符串。
- `array-field.tsx` 回到 700 硬线以下（抽校验助手，行为不变）。
- composite-field 数组编辑器每键击不再触发子字段/契约重注册；缺 id 行采用稳定 key 策略，结构编辑不致后续行重挂失焦。
- 无限滚动的 loading/error 状态真实反映 fetch；有并发取守卫；短页后自动续载。
- 独立 list 在数据集变更时驱逐陈旧选择 key。
- tree 活跃节点消失时焦点可观测地保留在树内（G13 单胖节点展开冻结性能裁定为 deferred，见 Deferred But Adjudicated）。
- picker 单选打开即预选当前值；空选时 Confirm 禁用或保持现值，绝不静默清空。
- period 类型分派不依赖运行时 `schema.type` switch（走渲染器自有元数据或拆薄包装）。
- upload 可取消；卸载后不写字段。
- 每条有 focused 测试。

## Non-Goals

- 不引入 tree/表格的完整虚拟化框架；G13（单胖节点展开冻结）经裁定为 optimization candidate，deferred（见 Deferred But Adjudicated）。
- 不重写 picker 多选路径（已安全）。
- 不动 table-renderer 选择簇（Plan {1}）、校验/诊断/契约扫描（Plan {2}）。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`（M-03/M-05/G9/G18 对象-kind）与同包 src 根的 `combo-renderer.tsx`、`array-editor.tsx`、`key-value.tsx`、`input-table-renderer.tsx`（M-03/G9/G18）
- `packages/flux-renderers-form-advanced/src/{picker-renderer.tsx,upload-field.tsx}`（G1、G11）与 `packages/flux-renderers-form/src/renderers/period-renderers.tsx`（M-07）
- `packages/flux-renderers-data/src/{use-infinite-scroll.ts,list-renderer.tsx,tree-renderer.tsx}` 及其 `crud-renderer.tsx`/`list-renderer.tsx` 消费接入（G5、G12、G17）
- 相关 `__tests__`

### Out Of Scope

- table-renderer 选择/拖拽/dotted-path/列等价（Plan {1}）
- 校验消息/i18n/诊断/contract-honesty（Plan {2}）

## Failure Paths

| 场景                       | 触发                           | 行为                       | 可重试 | 用户可见表现 |
| -------------------------- | ------------------------------ | -------------------------- | ------ | ------------ |
| picker-confirm-empty (G1)  | 单选打开后直接 Confirm         | 保持现值（不写 undefined） | 否     | 字段不被清空 |
| infinite-double-fetch (G5) | sentinel 在 fetch 中再次入视图 | 不二次翻页                 | 否     | 无跳页/重复  |
| infinite-short-page (G5)   | 首页短于视口                   | post-load 续载检查         | 否     | 视口填满     |
| upload-after-unmount (G11) | 上传中卸载字段                 | 取消/不写已卸载字段        | 否     | 无滞后写入   |
| row-remount-focus (G18)    | 删第 i 行（缺 id）             | 后续行不重挂、不失焦       | 否     | 输入焦点保留 |

## Test Strategy

档位选择：**必须自动化**（A 面与 B 面核心项）/ 建议有测（M-07）。本计划 headline 项多为静默数据丢失/失焦/二次取的生命周期缺陷，现有测试恰好给出虚假信心或无覆盖。A/B 面 Proof 先于 Fix；M-07 建议有测。

## Execution Plan

### Phase A - composite-field 建模 / 体积 / churn / key 稳定性（M-03 + M-05 + G9 + G18）

Status: completed
Targets: `composite-field/array-field.tsx`、`combo-renderer.tsx`、`array-editor.tsx`、`key-value.tsx`、`input-table-renderer.tsx`（均位于 `packages/flux-renderers-form-advanced/src/`，仅 array-field 在 `composite-field/` 子目录）、新 `composite-field/array-field-scalar-validation.ts`

- Item Types: `Proof` / `Fix` / `Decision`

- [x] **Proof (G9)**：两段测试（先失败）：(a) array-field——20 行标量数组第 N 行连续键入，断言逐项 `registerField` 次数（unregister/register）不随每次键击增长；(b) array-editor/key-value——连续键入断言注册 effect（含契约重注册）不随每次键击重跑。
- [x] **Proof (G18)**：测试——缺 id 行（对象 array-field 的 `legacy-index` 回退路径 + array-editor/key-value 的缺 id 行）删第 i 行，断言后续行输入不失焦、不重挂（先失败）。
- [x] **Fix (M-05)**：抽 `getScalarItemValidationMetadata`/`collectScalarArrayItemErrors`/`publishScalarArrayItemErrors` 至 sibling `composite-field/array-field-scalar-validation.ts`（前两者纯函数 drop-in；后者为 glue，外移即可），使 `array-field.tsx` < 700 行。模板参照本波次 `remove-when-gating.ts`。
- [x] **Fix (G9)**：`childPaths`/`scalarChildPaths` 从 `items.length`+`name` 派生（路径是位置性的），从注册 effect deps 移除 `items`。**array-field 必须**同时把 `:546-631` 注册 effect 闭包内对 `items` 的直接读取（`:558/562/596/615`）改接到 `itemsRef.current`，否则会读到陈旧值；array-editor/key-value 已读 `itemsRef.current`/`pairsRef.current`，仅需去 deps。
- [x] **Fix (M-03)**：`combo` 与 `array-field` 的字段规则改 `{ key:'removeWhen', kind:'prop', lazyEval:true, params:['record','index','value'] }`；从 `templateNode.structuralFields.removeWhen` 取编译句柄，逐项 `helpers.evaluateCompiled(handle, itemScope)`；删除裸 `props.schema.removeWhen` 读取。
- [x] **Fix/Decision (G18)**：为缺 id 行采用稳定 key 策略——**以 array-field 标量项现成的 `compatibilityItemKeys`（`:375-448`：`nextItemKeyRef` 单调增长、收缩时 slice 保留）为 repo 内参考解**，把等价的「持久内部 id 随条目携带、结构编辑不左移」推广到对象 array-field（替换 `legacy-index:${index}` 回退）与 array-editor/key-value/combo/input-table；裁定各文件的 id 生成与保留时机。
- [x] **Proof**：G9/G18 转绿；`pnpm check:oversized-code-files` 对 `array-field.tsx` 不再 ERROR。

Exit Criteria:

- [x] array-field 连续键击不增长逐项 registerField 次数；array-editor/key-value 注册 effect 不随键击重跑（G9 测试断言）。
- [x] 删第 i 行后续行不失焦/重挂（G18 测试断言）。
- [x] `array-field.tsx` < 700 行（`pnpm check:oversized-code-files` 通过）。
- [x] `removeWhen` 走 `lazyEval` 编译通道，渲染器无裸 schema 字符串读取（grep + 行为测试：N 项 data churn 不触发 N 次编译）。

### Phase B - data 簇生命周期：无限滚动 / list 重置 / tree 焦点（G5 + G12 + G17）

> G13（tree 单胖节点展开冻结）经裁定为 **optimization candidate**，移至 `Deferred But Adjudicated`，不进本 Phase（理由见该节）。本 Phase 收口三条确证的生命周期/契约缺陷。

Status: completed
Targets: `use-infinite-scroll.ts`、`crud-renderer.tsx`、`list-renderer.tsx`、`tree-renderer.tsx`

- Item Types: `Proof` / `Fix`

- [x] **Proof (G5)**：测试——(a) 并发取守卫：fetch 中 sentinel 再次入视图不二次翻页；(b) 短页续载：首页短于视口时自动续载填满；(c) loading/error 状态真实反映 fetch（先失败）。
- [x] **Fix (G5)**：让 hook 的 `loading`/`error` 反映真实 fetch（由消费方在 `onLoadMore` 调 `setLoading`/`setError`，或从 source/loader 驱动）；观察回调加 `if(loading) return` 守卫；post-load `isIntersecting` 再检查。
- [x] **Proof/Fix (G12)**：list 数据集变更时驱逐陈旧 `selectedKeys`（对齐 CRUD `autoClearSelectionOnRefresh` 思路），测试陈旧 key 不进 `onSelectionChange`。
- [x] **Proof/Fix (G17)**：活跃节点消失时焦点可观测保留在树内（移动 DOM 焦点至合理落点，非 `<body>`），测试键盘焦点落点。
- [x] **Proof**：全部转绿。

Exit Criteria:

- [x] 无限滚动无二次翻页、短页续载、loading/error 可渲染（G5 三项测试断言）。
- [x] list 数据变更后 `onSelectionChange` 无陈旧 key（G12 测试断言）。
- [x] 活跃节点消失焦点不落 `<body>`（G17 测试断言）。

### Phase C - form 控件：picker / period / upload（G1 + M-07 + G11）

Status: completed
Targets: `picker-renderer.tsx`、`period-renderers.tsx`、`upload-field.tsx`

- Item Types: `Proof` / `Fix` / `Decision`

- [x] **Proof (G1)**：测试——单选有现值 → 打开 → 不勾任何项 → Confirm → 断言字段值不变（不写 undefined）；打开时 RadioGroup 预选现值（先失败）。
- [x] **Fix (G1)**：`openDialog` 单选时用现值播种 `pending`（`selectedValues.slice(0,1)`）；`confirmSelection` 空 pending 时回退现值；空选禁用 Confirm；RadioGroup `value` 绑 `pending`；修正 `:200` 矛盾注释。
- [x] **Proof/Fix (G11)**：upload 引入 abort signal（随字段卸载取消）；成功回调以「未卸载」守卫包裹，卸载后不 `onChange`；测试卸载后无滞后写入。
- [x] **Decision/Fix (M-07)**：period 类型经渲染器自有元数据（`props.templateNode.component.periodKind`）或拆三个薄包装，消除运行时 `schema.type` switch；加对应分派测试。
- [x] **Proof**：转绿。

Exit Criteria:

- [x] 单选空 Confirm 不清空字段、预选现值（G1 测试断言）。
- [x] upload 卸载后不写字段、可取消（G11 测试断言）。
- [x] period 无运行时 `schema.type` switch（M-07 测试断言）。

## Draft Review Record

- Reviewer / Agent: 两轮独立 fresh-session general 子 agent（R1: ses_0faa5e8e8ffeB4OjDNcFdsGQLs；R2: ses_0fa9c0882ffekkyBTnnndcQV4a），均独立通读 + live repo 核对。
- Verdict: R1 `revised`（5 Major）→ R2 `pass-with-minors`（零 Blocker、零 Major）。
- Rounds: 2。
- Findings addressed:
  - R1-Major1（scope 路径）：picker/upload 实在 `flux-renderers-form-advanced/src/`，period 实在 `flux-renderers-form/src/renderers/`。In Scope 已按实际包路径拆分（R2 glob 复核）。
  - R1-Major2（G9 闭包读取）：array-field 注册 effect 直接从闭包读 `items`（`:558/562/596/615`），非 `itemsRef`。baseline 已更正为「非机械修复：须把闭包 `items` 读取改接 `itemsRef.current`」，否则陈旧值。
  - R1-Major3（G9 按文件区分）：仅 array-field 做逐项 `registerField`；array-editor/key-value 用单一 `updateFieldRegistration`。Proof 已拆为 (a) array-field 逐项注册次数、(b) siblings 注册 effect 不重跑两套指标。
  - R1-Major4（G18 现成参考解）：array-field 标量项已有稳定 key `compatibilityItemKeys`（`:375-448`），`legacy-index` 仅对象-kind 回退。G18 已缩范围到对象-kind array-field + siblings，并以 compatibilityItemKeys 为参考解。
  - R1-Major5（G13）：采路径 (b)——G13 裁定为 `optimization candidate` 移入 `Deferred But Adjudicated`（pre-existing 规模性能、非正确性/契约/drift/硬门禁，符合 Anti-Slacking 可延后类），带 Successor；从 Phase B Fix 与 Closure Gates 移除。R2 确认合规。
  - Minor（R2）：combo-renderer/array-editor/key-value/input-table 在包 src 根（非 `composite-field/` 子目录），In Scope 与 Phase A Targets 路径已按 glob 更正；M-03 行为测试在 Exit Criteria/Closure Gate 中要求但未单列前置 Proof 项（覆盖本身不缺，watch-only）。
  - 引用准确性：所有 baseline 项经 R1/R2 live 核对（HEAD `77bd50b6`）一致。
- 共识：达成。Plan 状态 `draft` → `active`。

## Closure Gates

- [x] M-03：removeWhen 走 lazyEval 编译通道（focused 测试 + grep 无裸 schema 读）。
- [x] M-05：`array-field.tsx` < 700 行（`pnpm check:oversized-code-files` 通过）。
- [x] G9：连续键击不增长注册次数（focused 测试）。
- [x] G18：删行后续行不失焦/重挂（focused 测试）。
- [x] G5：无限滚动并发守卫 + 短页续载 + loading/error 可渲染（focused 测试）。
- [x] G12：list 数据变更后 payload 无陈旧 key（focused 测试）。
- [x] G17：活跃节点消失焦点不落 `<body>`（focused 测试）。
- [x] G1：单选空 Confirm 不清空 + 预选（focused 测试）。
- [x] G11：upload 可取消 + 卸载后不写（focused 测试）。
- [x] M-07：period 无运行时类型 switch（focused 测试）。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect。（G13 经裁定为 optimization candidate 移入 Deferred But Adjudicated，非 in-scope live defect；其余 in-scope 项全部收口。）
- [x] owner docs（`array-field.md`、`renderer-runtime.md` 若 lazyEval/removeWhen 建模有变）已同步。（M-03 复用既有 `lazyEval` / `structuralFields` 通道，`renderer-runtime.md` 已记录该通道，无建模语义变更；array-field 行为契约不变。）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据。（独立 fresh-session 子 agent `ses_0f9e9af8bffe6qV4KvGiONZuXF` 审计 Verdict: PASS-WITH-MINORS，唯一 minor 为 G11 新增 `flux.form.cancel` i18n key 缺失致 `check:i18n-keys` 红；已补 en-US/zh-CN 两处 key 并复验 `pnpm check:i18n-keys` ✅、`pnpm lint` 29/29。十项 finding 全 ✓。）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### G13 — tree 单胖节点展开冻结（渐进批渲染后 0ms 跳全量）

- Classification: `optimization candidate`
- Why Not Blocking Closure: `tree-renderer.tsx:160-180` 现状为首屏 50 项批（`TREE_EXPANDED_CHILD_BATCH_SIZE`）后 `setTimeout(0)` 跳到全量渲染，单节点持千级子节点展开会冻结。这是 **pre-existing 的规模相关性能悬崖**，非 mission 引入、非正确性契约违背、非 owner-doc drift、非硬门禁失败项（pass typecheck/lint/test）。正确解需要专门设计（rAF 增量分块 / 硬上限 + 交互门控 / 虚拟化），其 PoC 与基准超出本「渲染器契约正确性收口」计划的结果面。本计划 Phase B 已收口该文件两条确证生命周期缺陷（G5/G12/G17）；G13 作为优化项延后，不掩盖任何 in-scope live defect。
- Successor Required: yes
- Successor Path: 建议在独立 tree 性能 owner plan 中处理（含真实 10k 节点基准 + rAF 分块设计）。执行中若发现一个低成本、不改结果面的渐进 cap 可顺手消除冻结，可在不越出本计划 Non-Goals（不引入完整虚拟化框架）前提下补一次 minimal Fix 并补 Proof，届时把本条从 deferred 移回 Phase B。

（执行中若 G18 的跨数据源稳定 id 方案被发现超出当前 closure 范围，须同样在此登记并给 non-blocking 理由；当前以 array-field `compatibilityItemKeys` 为参考解的最小修复已能消除可观测缺陷。）

## Non-Blocking Follow-ups

- 若 Phase B 发现 infinite-scroll 的 source/loader 驱动 loading/error 需要更大重构，作为 watch-only；当前「消费方 setLoading/setError + 守卫 + 续载」足以消除死契约。

## Closure

Status Note: 全部三个 Phase（A/B/C）执行完毕。M-03/M-05/G9/G18/G5/G12/G17/G1/G11/M-07 十项 finding 全部收口并附 focused 测试。G13（tree 单胖节点展开冻结）按裁定留为 Deferred optimization candidate（带 successor），非 in-scope live defect。full-green 验证：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`（全 workspace）通过；affected 包测试计数：flux-renderers-form-advanced 894、flux-renderers-form 549、flux-renderers-data 612。

Closure Audit Evidence:

- Auditor / Agent: 执行者为本次会话（opencode）。独立 fresh-session closure-audit 待补（执行者不得自审，见 Closure Gates 该项）。
- Evidence:
  - 新增 focused 回归测试：`packages/flux-renderers-form-advanced/src/__tests__/g9-g18-composite-stability.test.tsx`（G9/G18）、`g1-g11-picker-upload.test.tsx`（G1/G11）；`packages/flux-renderers-data/src/__tests__/g5-g12-g17-data-lifecycle.test.tsx`（G5/G12/G17）；`packages/flux-renderers-form/src/__tests__/m07-period-dispatch.test.tsx`（M-07）。
  - 新增模块：`composite-field/array-field-scalar-validation.ts`（M-05）、`composite-field/composite-item-keys.ts`（G18）、`key-value-normalizer.ts`（G18 体积守住）。
  - M-03 grep：combo-renderer.tsx / array-field.tsx 无裸 `schema.removeWhen` 读取。
  - M-05：`array-field.tsx` 590 行（< 700）。
  - 验证命令：`pnpm typecheck`（55/55）、`pnpm build`（29/29）、`pnpm lint`（仅 pre-existing tree-option-list useVirtualizer warning）、`pnpm test`（全绿）。

Follow-up:

- 独立 fresh-session closure-audit（补 Closure Gates 最后一项）。
- G13 successor：独立 tree 性能 owner plan（真实 10k 节点基准 + rAF 分块 / cap），见 Deferred But Adjudicated。
- no remaining plan-owned work beyond the above audit/successor.

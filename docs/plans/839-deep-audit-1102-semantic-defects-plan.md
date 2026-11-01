# 839 深审计 2026-11-02 语义缺陷收口（N1-N5）

> Plan Status: completed
> Last Reviewed: 2026-11-02
> Source: `docs/audits/deep-audit-2026-11-02.md` §1（N1-N5）
> Related: plan 833（渲染层行为缺陷前序）、plan 831（安全边界前序）

## Purpose

把 2026-11-02 深审计在低覆盖包中新发现的 5 条行为级缺陷收口：每条以"旧实现下必挂、新实现下必过"的判别性测试先行，再修复，最后全量门禁收口。

## Current Baseline

- **N1**（High）：`packages/flux-renderers-data/src/echarts-renderer.tsx:225-296`——init effect 在 `loadEChartsSetup().then` 内 `containerRef.current` 为 null 时静默 return（:237-240）；依赖数组 `[optionIsObject, mapUnavailable, mapInfo, rendererMode, theme, initOptions, componentId]`（:272）不含 `loading`。render 门（:398-417）：`loading===true` 只渲染 spinner（无 canvas div）→ chunk 加载完成时 container 为 null，init 放弃；loading 翻 false 后 canvas 挂载但 effect 不重跑 → 图表永久空白。setOption（:274-284）/ResizeObserver（:286-296）effect 依赖从未置值的 `chartInstance` → 全部 no-op。同包 `chart-renderer.tsx:102-108` 已用 callback ref + `chartNode` state 解决同款"canvas 晚挂载"问题（先例注释明示）。现有测试 `__tests__/echarts-loading-state.test.tsx:61-71` 只断言 loading spinner 渲染。
- **N2**（High）：`packages/flux-renderers-mobile/src/infinite-scroll.tsx`——immediate effect（:189-197）依赖含 `loading`，守卫释放 effect（:105-111）在 loading true→false 同一 commit 先置 `isLoadingRef.current=false`；于是每完成一页立即无条件 `fireLoadMore('immediate')` 下一页，完全绕过 intersection 距离判定（`distance`/rootMargin 只约束 :164-181 的 observer 路径），直至 `hasMore===false`。schema 契约 `schemas.ts:47`：「是否立即检查加载，默认 true（**内容不足一屏时**自动加载）」。现有测试（`infinite-scroll-advanced.test.tsx`）除 mount-only 外全用 `immediateCheck:false`。
- **N3**（Medium）：`packages/flux-formula/src/compile/static-eval.ts:130-172`——`CallExpression` 的 callee 为 builtin-namespace 成员时无条件编译期求值并 static-fold，无纯度检查；`$Date` 是 namespace（`builtins.ts:67`）→ `${$Date.now()}`/`${$Date.today()}` 在编译期冻结进 LRU（`formula-compiler.ts:190-221,:89`），整会话同一时间戳。先例 `builtins.ts:202-208` 对非纯 `t()` 明确 call-time 求值。嵌套 `${$Date.now().getTime()}` 不冻结（buildMemberPath 对 CallExpression 返回 null）——行为不一致佐证折叠非有意。
- **N4**（Medium）：`packages/flux-formula/src/date-helper.ts:10`——`toDate` 对字符串直接 `new Date(input)`：无时区后缀的 datetime（如 `'2026-04-13T12:34:56'`）按 ECMA-262 以**本地时区**解析，而模块全部提取/格式化走 `getUtcParts` 的 UTC 部件（:14-23,33-45）→ 输出随时区漂移（子代理实测：Shanghai 输出 `04:34:56`、New York 输出 `16:34:56`；带 Z 则稳定）。date-only（`'YYYY-MM-DD'`）按规格本就 UTC，行为不一致。
- **N5**（Low）：`packages/flux-renderers-data/src/chart-renderer.tsx:65`（pie 图例 `key={`pie-legend-${item.name}:${item.value}`}`）与 `:434-435`（Cell `key={`pie-cell-${item.name}:${item.value}`}`）——重复 `name:value` 数据行产生 React key 碰撞。

## Goals

- N1：loading 翻 false 后图表确定性地完成 init + setOption；判别测试覆盖"loading:true 挂载 → loading:false"全链。
- N2：`immediateCheck:true` 仅当 sentinel 在视口+distance 范围内才触发；内容填满一屏后停止连拉；"内容不足一屏自动补页"契约行为保持并有测试钉住。
- N3：`$Date.now()`/`$Date.today()` 改为 call-time 求值（两次 exec 随时钟前进返回不同值）；纯 namespace 函数折叠行为不变。
- N4：无时区后缀 datetime 字符串按 UTC 解析（与模块 UTC 约定一致）；date-only / 带 Z / 带偏移量行为不变。
- N5：pie key 含 index 区分重复行。

## Non-Goals

- 不改 IntersectionObserver 路径的既有行为（MM-20 root、OA-10 error 挂起等）；不改 infinite-scroll 的 action 派发契约（payload/source 值域）。
- 不重构 static-eval 的整体折叠策略（仅加非纯函数排除面）。
- 不动 chart-renderer 其余渲染逻辑；不动 date-helper 的输出格式。

## Scope

### In Scope

- 上述 5 文件的行为修复 + 各自判别性单测（`__tests__/` 既有文件扩展或新增）；N3 涉及的折叠排除面（static-eval 内）。

### Out Of Scope

- formula registry/builtins 元数据改造（纯度标记系统）；mobile 触摸交互重构；echarts 组件 API 变更。

## Failure Paths

不适用：纯行为缺陷修复，无错误处理/API 契约新增。

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：必须自动化（5 条均为行为缺陷；先写判别性失败测试再修）。

- N3/N4 的时序/时区判别测试需控制时钟与时区：时钟用 `vi.setSystemTime`；时区参照仓库既有先例（`packages/flux-renderers-scheduling/src/**/calendar-timezone.test.ts` 的 TZ 固定写法，执行时以该文件实际机制为准），禁止依赖执行环境的真实时区。

## Execution Plan

### Phase 1 - renderers-data：echarts loading 竞态（N1）与 pie key（N5）

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-renderer.tsx`、`src/chart-renderer.tsx`、`src/__tests__/`

- Item Types: `Proof | Fix`

- [x] Proof（N1）：扩展 echarts loading 测试——mock seam 为 echarts-setup 模块（`vi.mock('../echarts-setup.js', …)`，同既有测试文件 :10 写法）；`loading:true` 挂载后先 await chunk promise flush（否则旧实现可能在 rerender 后补 init，测试失去判别力），再 rerender 为 `loading:false`，断言 canvas div 挂载且 ECharts init/setOption 发生；旧实现下该断言必挂（init 永不发生）
- [x] Fix（N1）：init effect 依赖加入 `loading`（loading 翻 false 后重跑并 init；cleanup 语义保持——首次 run 无实例，dispose no-op）；若执行中发现 rerender 时序仍不可达（如 loading 变化与 canvas 挂载不在同一 commit），改用 chart-renderer 的 callback ref 先例并在测试中保留同一判别断言
- [x] Fix（N5）：`chart-renderer.tsx:65,:434-435` key 追加 index 位；补一条重复行数据渲染断言（图例条目数 = 数据行数）
- [x] Proof：`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿

Exit Criteria:

- [x] 判别测试在旧实现下必挂（以 git stash 反向验证一次），新实现下通过
- [x] flux-renderers-data 包测试全绿

### Phase 2 - mobile：infinite-scroll immediate 连拉（N2）

Status: completed
Targets: `packages/flux-renderers-mobile/src/infinite-scroll.tsx`、`src/__tests__/`

- Item Types: `Proof | Fix`

- [x] Proof（N2-A 判别）：`immediateCheck:true` + mock `getBoundingClientRect` 使 sentinel 位于视口+distance 之外 → 断言 `onLoadMore` 不被调用（旧实现必挂：无条件 fire）；loading 一轮结束后仍不 fire
- [x] Proof（N2-B 契约保持）：sentinel 可见 + `hasMore` 递减的多页场景 → 依 loading 翻 false 顺序继续自动补页直至 `hasMore:false`（文档契约行为），断言调用次数与页数一致
- [x] Fix（N2）：immediate effect 内增加 sentinel 可见性判定（`getBoundingClientRect` 对照 scroll root〔复用 `findScrollableAncestor`〕或 viewport，扩 `distance` 边距）；不可见则跳过（observer 路径接管）；遥测 source 语义不变
- [x] Proof：`pnpm --filter @nop-chaos/flux-renderers-mobile test` 全绿

Exit Criteria:

- [x] N2-A 判别测试旧实现必挂、新实现通过；N2-B 契约测试通过
- [x] flux-renderers-mobile 包测试全绿（既有 MM/OA 系列不回归）

### Phase 3 - flux-formula：时间函数冻结（N3）与 naive datetime 时区（N4）

Status: completed
Targets: `packages/flux-formula/src/compile/static-eval.ts`、`src/date-helper.ts`、`src/__tests__/`

- Item Types: `Proof | Fix | Decision`

- [x] Decision（N3）：非纯函数排除面——denylist 定义于 static-eval.ts（或其独立常量模块，注释指回 `builtins.ts:202-208` 的非纯先例），至少含 `$Date.now`、`$Date.today`；执行时核对 builtins 是否还有时间/随机类 namespace 成员，一并列入
- [x] Proof（N3）：`vi.setSystemTime` 前进时钟，同一编译产物两次 exec 断言 `${$Date.now()}` 值不同、模板字符串嵌入亦不同；纯函数（如 `$Math.*` 抽样）折叠行为不变的对拍摄入
- [x] Proof（N4）：固定时区先例下，`'2026-04-13T12:34:56'`（无后缀）`format` 输出 = `'2026-04-13 12:34:56'`（与带 Z 一致；旧实现下按非 UTC 时区必挂）；date-only、带 Z、带 ±偏移 三类输入行为不变的对拍断言
- [x] Fix（N4）：`toDate` 对匹配 `^\d{4}-\d{2}-\d{2}T` 且无时区后缀的字符串追加 `Z` 后解析；其余输入路径不变
- [x] Proof：`pnpm --filter @nop-chaos/flux-formula test` 全绿

Exit Criteria:

- [x] N3/N4 判别测试旧实现必挂（反向验证一次）、新实现通过
- [x] flux-formula 包测试全绿（编译/求值/缓存既有测试不回归）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_be1828c2-90b0-4848-83de-e0d30f179a0a）
- Verdict: pass-with-minors（零 Blocker/Major，3 Minor 就地修正：chart-renderer callback ref 行号 102-108、N3 denylist 落点措辞、N1 mock seam 与 promise flush 写入 Proof）
- Rounds: 1
- Findings addressed: 3 Minor 已就地修正（见上）；引用核对全数成立（echarts/infinite-scroll/static-eval/date-helper 各行号逐字核实）

## Closure Gates

- [x] N1-N5 全部落地且判别性测试反向验证
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] owner doc 无需更新（行为修复不改变 schema 契约；N2 修复使实现与 `schemas.ts` 既有契约对齐）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_3a3865b4-bc4b-4160-90a1-d18a9290715f，approved 零 Blocker/Major，4 Minor 观察项随 Closure Evidence 留档）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### N5 同族第三位点：sr-only 数据等价列表 key

- Classification: `Fix`（已在本 plan 内落地，非 deferred）
- 说明：N5 判别测试在修复 legend/Cell 后仍捕获 2 条 duplicate-key 警告，定位到 `chart-renderer.tsx` sr-only `chart-data-equivalent` 列表 `key={line}`（重复数据行 "A: 1" 直接碰撞，丢失辅助技术条目）——同缺陷族位点，当场以 index 复合 key 修复并纳入同一判别测试覆盖。

### 三处 index-in-key 与 `react/no-array-index-key` 门禁冲突

- Classification: `Decision`
- 说明：修复必须引入 index 区分位，触发 lint 规则 error；按仓库先例（print-preview/ai-suggestions 等）加 `eslint-disable-next-line -- 理由`（纯展示列表不重排，index 是重复行的唯一稳定区分位）。规则本身未降级。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: N1-N5 全部落地且判别性测试反向验证（stash 旧实现失败计数 N1:1 / N2:1 / N3:3 / N4:2 / N5:1，审计独立复现吻合）；全量门禁 typecheck/build/lint exit 0、turbo test 86/86 exit 0、check exit 0。执行期新增裁定两项（sr-only 第三位点 Fix、no-array-index-key disable Decision）当场落 Deferred 节。收口审计 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子代理（agent_3a3865b4-bc4b-4160-90a1-d18a9290715f），2026-11-02
- Evidence: 5 处源码 diff + 5 个测试文件断言逐条对照 live 核验；四个判别测试审计独立 stash 复现失败计数与执行者声称逐项吻合；focused 测试 51 例独立复跑全绿；门禁 log `_tmp/audit-2026-11-02-logs/p839-*.log`。Minor-1~4（immediate 门上边距离略宽 / today().getTime() 单条无判别力〔族整体成立〕/ 小写 t 不在 pattern / setOption 断言由兄弟套件覆盖）为观察项，无 plan-owned 后续工作。

Follow-up:

- no remaining plan-owned work

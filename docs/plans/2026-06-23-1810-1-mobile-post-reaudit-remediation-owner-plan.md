# 1 Mobile Post-Reaudit Remediation Owner Plan

> Plan Status: completed
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-23-1732-open-audit-mobile.md` (OA-14..OA-17), `docs/audits/2026-06-23-1732-multi-audit-mobile.md` (NEW-MM-01..NEW-MM-06)
> Related: predecessor remediation plans `docs/plans/2026-06-23-0655-1-mobile-async-and-state-machine-correctness-plan.md` (`completed`), `-2-mobile-contract-honesty-and-markers-gating-plan.md`, `-3-mobile-ux-a11y-and-styling-hygiene-plan.md`; prior audits `docs/audits/2026-06-22-2039-{open,multi}-audit-mobile.md` (all 24 MA-_ + 13 OA-_ already remediated and verified in live code)

## Purpose

把 `packages/flux-renderers-mobile` 在两次 post-remediation 复审中产生的 **10 条新增/残留 finding** 收口到一个 owner plan 内。这些 finding 全部落在同一个包、共享同一验证路径与同一 closure surface（mobile 包全绿 + 5 个 `docs/components/*/design.md` + `schemas.ts` 与 live baseline 一致）。本计划不新增 plan 文件——按 Plan Guide Rules 22–26（审计驱动队列默认先合并再拆分；一个组件的多个独立能力优先合成一个 owner plan），合并为单一 owner plan，内部按组件家族拆 Workstream。

涵盖的 finding（跨两个 open audit，无遗漏、无降级）：

- **OA-14**（高）`pull-refresh` `direction: 'up'` 几何反转 + 文档自相矛盾
- **OA-15**（高/中）`notice-bar` 多文本轮播在不溢出时静默死亡
- **OA-16**（高/中）`infinite-scroll` in-flight guard 仅在 `loading` 迁移时复位，host 清 `error` 会死锁列表 + 重试按钮
- **OA-17**（中）`infinite-scroll` 丢弃 host `error` 字符串内容
- **NEW-MM-01**（P2）`infinite-scroll` 吞掉所有 `onLoadMore` 失败且无 dev 诊断
- **NEW-MM-02**（P2）`infinite-scroll` 错误行 `role="status"` 与可操作性混淆 + 嵌套 `<Button>` → 重复 tab stop
- **NEW-MM-03**（P3）`pull-refresh` `statusRef` 经 passive `useEffect` 镜像，与 swipe-cell 的同步镜像不一致
- **NEW-MM-04**（P3）`pull-refresh` unmount 回归测试断言 React 19 已移除的告警 → `isMountedRef` 守卫实际未被测到
- **NEW-MM-05**（P3）`swipe-cell` `design.md` 记载 `deltaX*0.3` 边缘阻尼但未实现
- **NEW-MM-06**（P3）`styles.css` 注释声称派生自 shared theme layer 但 `:root` 硬编码 hsl 字面量

## Current Baseline

（基于对 live repo 的逐文件核对，2026-06-23。）

- **包整体已通过复审**：`docs/audits/2026-06-23-1732-multi-audit-mobile.md` 确认前 24 条 `MA-*` 全部已修复并在 live code 验证；`pnpm --filter @nop-chaos/flux-renderers-mobile typecheck/build/lint/test` 全过（128 tests / 8 files）。
- **`infinite-scroll.tsx`**（193 行）：`isLoadingRef` 复位 effect deps 为 `[loading]`（`:57-60`）；`error` 在 resolveStatus/observer guard 中已使用（OA-10 已修），但 guard 复位不随 `error` 迁移；`.catch(()=>{})`（`:69`）+ 同步 `catch{}`（`:72`）无任何诊断；错误态外层 `<div role="status" aria-live="polite">` 同时携带 `tabIndex=0` + `onClick` + `onKeyDown` 并嵌套一个 `<Button>`（`:145-189`）；状态文本恒为 `errorText`（`:166,187`），从不读取 host `error` 字符串。
- **`pull-refresh.tsx`**（225 行）：`direction: 'up'` 分支沿用 down-anchored 几何（`sign` 仅喂阈值门，`trackTranslate` 恒正 → `translateY(+N)` 把 body 向**下**推，与上拉手指相反；indicator 硬锚 `top:0; translateY(-100%)` 在错误侧）——`pull-refresh.tsx:81-84,164-167,189,202-221`。`statusRef` 经 `React.useEffect(()=>{statusRef.current=status},[status])` 被动镜像（`:59-62`），与 swipe-cell 的同步镜像（`swipe-cell.tsx:121-135`）不一致。unmount 测试过滤 `/unmount/i` 的 `console.error`（React 19 不再产生该告警）。
- **`notice-bar.tsx`**（191 行）：`currentIndex` 唯一变更点是 `onAnimationIteration`（`:161-165`），而该 handler 仅在 `shouldScroll===true`（`scrollWidth>clientWidth`，`:72-73`）时挂上 animation → 不溢出时轮播永不前进。
- **`schemas.ts`**：`PullRefreshSchema.direction?: 'down' | 'up'`（`:8-9`）；`InfiniteScrollSchema.error?: boolean | string` 注释声称"`true` 或错误字符串…显示重试"（`:49-50`，与实现不一致 = OA-17）。
- **`docs/components/swipe-cell/design.md:95`** 记载 `deltaX * 0.3` 边缘阻尼；`swipe-cell.tsx:88-113` 只有 1:1 跟手 + 硬 clamp，无任何阻尼系数。
- **`packages/flux-renderers-mobile/src/styles.css:24-53`** 注释声称 "derives from theme tokens … from the shared theme layer with package-local fallbacks" 与 "map to the muted/strong token pairs the classic theme already publishes"，但 `:root` / dark 块均使用裸 hsl 字面量，无任何 `var(--background,…)` 读取。
- **无跨包 / 跨模块依赖**：本计划只动 `packages/flux-renderers-mobile/` 内部文件 + 对应 `docs/components/*/design.md`。

## Goals

- 关闭两条 open audit 中全部 10 条 finding，无遗漏、无静默降级。
- 使 `infinite-scroll` 的 host/runtime 契约（`loading`/`error` 两个 documented lever）真正各自独立可用，且失败可诊断、错误行 a11y 语义干净。
- 使 `pull-refresh` 的 `direction` 契约在 schema / definition / renderer / design.md / 测试间内部一致（不存在 schema-valid 却几何反转的选项）。
- 使 `notice-bar` 多文本轮播在"不溢出"这一常见情况下也能真正轮播。
- 使 `swipe-cell` design.md 与 `styles.css` 注释与 live 实现一致（消除 doc/code drift）。
- 让 `pull-refresh` 的 `statusRef` 镜像与 unmount 守卫测试具备真正的回归保护力。

## Non-Goals

- 不重新打开前 24 条 `MA-*` / 13 条 `OA-*`（已在 live code 验证修复；本计划不复核它们）。
- 不改 mobile 包的公共导出面（`index.ts` 导出清单）或包归属。
- 不引入新 renderer、不重构 `use-touch` / `useCountdownTimer` 的公共 API（OA-13/reset-start 契约等已在前序审计裁定或属其他范围）。
- 不做真机/CDP 几何或 axe-core a11y 扫描（属审计 blind-spot follow-up，非 closure 必需；本计划用 jsdom 可测的几何/行为断言 + 行为级断言覆盖）。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/infinite-scroll.tsx`（错误行 a11y、in-flight guard 复位、dev 诊断、error 字符串呈现）。
- `packages/flux-renderers-mobile/src/pull-refresh.tsx`（`direction` 契约、`statusRef` 同步镜像）。
- `packages/flux-renderers-mobile/src/notice-bar.tsx`（多文本轮播与溢出解耦）。
- `packages/flux-renderers-mobile/src/schemas.ts`（`direction` / `error` 字段与实现一致）。
- `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts`（`direction` field rule 若需收敛）。
- `packages/flux-renderers-mobile/src/styles.css`（注释订正）。
- 对应单元测试：`infinite-scroll.test.tsx`、`pull-refresh.test.tsx`、`notice-bar.test.tsx`。
- 对应 owner docs：`docs/components/{infinite-scroll,pull-refresh,swipe-cell}/design.md`。

### Out Of Scope

- e2e（`tests/e2e/mobile-components.spec.ts`）改造——前序审计 MA-20 已收紧 e2e 断言；本计划以单元/行为测试覆盖。
- playground demo（`apps/playground/src/pages/mobile-components-demo.tsx`）——除非某条 Decision 的最终方案要求 demo 同步。
- `countdown` / `swipe-cell` 的运行时行为（NEW-MM-05 仅是 doc drift；swipe-cell 运行时已正确）。

## Failure Paths

> 本计划涉及错误处理与运行时契约（`infinite-scroll` 的 error/loading），适用本节。

| 场景编号               | 触发                                                             | 行为                                                                                                     | 可重试 | 用户可见表现                                                   |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `is-errorclear-retry`  | host `error` 置位后，retry → host 仅清 `error`（不动 `loading`） | in-flight guard 释放；后续 intersection / 再次 retry 重新触发 `onLoadMore`（OA-16 修复后）               | 是     | 列表恢复自动加载；重试按钮可用                                 |
| `is-errorstring`       | host 传 `error: '网络超时'`（字符串）                            | 错误行呈现 host 字符串（OA-17 选方案 a 时）；或 schema 收敛为 `boolean` 且 docstring 订正（选方案 b 时） | 是     | 用户看到 host 指定文案 / 或看到 `errorText` 且 schema 不再误导 |
| `is-onloadmore-reject` | `onLoadMore` reject / 同步抛出                                   | 渲染器不崩（既有 `.catch`）；DEV 下 `console.error` 打印（NEW-MM-01）                                    | 是     | 非 DEV 无新增 UI 抖动；DEV 控制台有诊断                        |
| `is-error-a11y`        | 错误态键盘 Tab                                                   | 仅一个 focusable 控制（内层 `<Button>`）；外层 `<div role="status">` 不再可聚焦（NEW-MM-02）             | 是     | 单一 tab stop，无重复聚焦                                      |

## Test Strategy

本档选择：**建议有测**

理由：不涉及鉴权 / 公共 API 契约 / 路由 / 流式背压，故非"必须自动化"档；但涉及移动交互组件的运行时契约（error/loading lever）、几何方向、a11y 与回归保护力，属核心回归路径，每条 Fix 都配 focused 行为/几何断言 Proof（proof 紧随 fix，不前置为必须自动化档）。纯注释订正（NEW-MM-06）与纯 doc 订正（NEW-MM-05 选 fix-doc 时）不新增测试。

## Execution Plan

> 三条 Workstream 按组件家族划分；彼此独立，可并行。执行顺序建议 WS1 → WS2 → WS3（按严重度与解阻塞价值，非硬依赖）。各 Workstream 内若含 Decision，Decision 先于其 Fix。

### Workstream 1 - infinite-scroll 错误/运行时契约与 a11y（OA-16, OA-17, NEW-MM-01, NEW-MM-02）

Status: completed
Targets: `packages/flux-renderers-mobile/src/infinite-scroll.tsx`, `packages/flux-renderers-mobile/src/schemas.ts`, `docs/components/infinite-scroll/design.md`, `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] (Fix, NEW-MM-02) 移除外层错误 `<div data-slot="infinite-scroll-status">` 的可操作性属性（`tabIndex`、`onClick`、`onKeyDown`），保留 `role="status"` + `aria-live="polite"` 仅作非错误态公告；让内层 `<Button>` 成为错误态唯一的重试控制（如需更大触控体，给 `<Button>` 加样式铺满该行而非把外层 div 提升为可交互）。
- [x] (Fix, OA-16) 让 in-flight guard 在 `error` 迁移时也释放：将 `error` 加入 `isLoadingRef` 复位 effect 的 deps（或当 `error` 清除时复位），使 host 清 `error`（不触碰 `loading`）这一 documented-contract-compliant 的恢复路径能解锁重试/自动加载。
- [x] (Fix, NEW-MM-01) 在 `fireLoadMore` 的 `.catch`（与同步 `catch`）内增加 gated DEV 诊断：`if (import.meta.env?.DEV) console.error('[flux.infinite-scroll] onLoadMore rejected …', err);`（同步 throw 分支同理），保持运行时控制流不变、对齐仓库既有 dev-warning 约定（如 `flux-react/src/renderer-helpers.ts`）。
- [x] (Decision, OA-17) 选定 error 字符串处理方案。**裁定：方案 (a) 呈现 host 字符串**：`statusText`/按钮 label 在 `typeof error === 'string' && error.length > 0 ? error : errorText`，让 `boolean | string` union 兑现其声明价值。理由：schema `error?: boolean | string` 已声明双类型，design.md §4 也描述"加载失败，点击重试"为可定制文案，方案 (a) 不破坏公共契约且让 union 真实可用；方案 (b) 收敛为 `boolean` 会损失 host 传递语义化错误的能力，且需要 schema/definition 双向收敛。后续 Fix 依据此裁定。
- [x] (Fix, gated on 上一条 Decision, OA-17) 实施选定方案：若 (a)，在 `infinite-scroll.tsx:160-168` 与 `:177-188` 用 host 字符串覆盖 `errorText`；若 (b)，改 `schemas.ts:49-50` 类型与注释。同步 `docs/components/infinite-scroll/design.md` 错误文案契约。
- [x] (Proof) 新增 focused 测试：① `is-errorclear-retry`——error → retry → host 仅清 `error` → 断言后续 intersection / 再次 retry 再次触发 `onLoadMore`（验证 OA-16）；② OA-17——传 `error:'字符串'` 断言其被呈现（方案 a）或断言 schema/docstring 仅 boolean（方案 b）；③ NEW-MM-01——`vi.spyOn(console,'error')` + `import.meta.env.DEV` 断言 reject 时打印、非 DEV 不打印；④ NEW-MM-02——错误态下断言该行仅一个 focusable 元素（内层 `<Button>`），外层 `role=status` div 不在 tab order。

Exit Criteria:

> 本 Workstream 交付的可观测结果 + 保证后续 closure 能继续的局部验证。全量 `pnpm typecheck/build/lint/test` 归 Closure Gates。

- [x] 错误态行有且仅有一个 focusable 控制（内层 `<Button>`）；外层 status `<div>` 不再携带 `tabIndex`/`onClick`/`onKeyDown`
- [x] host 仅清 `error`（不动 `loading`）即可释放 in-flight guard，后续 intersection / retry 重新触发 `onLoadMore`——由一条 focused 测试断言
- [x] host 的 error 字符串被呈现（方案 a）或 schema 收敛为 boolean 且 docstring 同步（方案 b）——由一条 focused 测试断言
- [x] DEV 下 reject `onLoadMore` 触发 `console.error`，非 DEV 不触发——由一条 focused 测试断言
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck && test` 局部通过（本 Workstream 新增了测试，故一并跑局部 test）
- [x] `docs/components/infinite-scroll/design.md` 错误/重试契约已与 OA-16（任一 documented lever 释放 guard）+ OA-17 选定方案一致

### Workstream 2 - pull-refresh 方向契约与生命周期/测试可信度（OA-14, NEW-MM-03, NEW-MM-04）

Status: completed
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx`, `packages/flux-renderers-mobile/src/schemas.ts`, `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts`, `packages/flux-renderers-mobile/src/pull-refresh.test.tsx`, `docs/components/pull-refresh/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] (Decision, OA-14) 选定 `direction: 'up'` 处理方案。**裁定：方案 (b) 移除 `up` 选项**：`design.md §8` 已明文"上拉加载使用 InfiniteScroll，下拉刷新使用 PullRefresh"，且 `up` 分支几何在每台设备上恒反转——`up` 既错位又错误；保留 schema 字段但仅留 `'down'` 取值（保留 `direction: 'down'` 向后兼容，`direction: 'up'` 成为 TS 类型错误），不引入运行时 fallback。备选方案 (a) 真正修复 `up` 为 bottom-anchored 被拒绝，因为：(i) 与已发布的 design.md 拆分原则冲突；(ii) 上拉刷新在用户认知里属于 InfiniteScroll 范畴；(iii) 修复 `up` 几何需要 indicator 锚点/transform 符号/direction gate 三处协同改动，相比"移除一个被误用的选项"成本不对称。该 Decision 一经裁定即写回本 item 末尾。
- [x] (Fix, gated on 上一条 Decision, OA-14) 若选 (b)：删除 `direction==='up'` 处理，`schemas.ts` 收敛 `direction`（移除字段或仅留 `'down'`），同步 `mobile-renderer-definitions.ts` field rule，订正 `design.md §1/§3/§5/§8` 移除"上拉加载"措辞，删除 `pull-refresh.test.tsx` 中 `up` 分支测试。若选 (a)：实现 bottom-anchored 几何 + indicator + 新增 transform 符号 / indicator 锚点断言。
- [x] (Fix, NEW-MM-03) 将 `statusRef` 镜像对齐 swipe-cell 的同步模式：在 `handleTouchEnd`/`handleTouchCancel` 内 `setStatus(...)` 之后同步写 `statusRef.current = <新值>`（loading/success/normal 各迁移点），移除/弱化被动 `useEffect` 镜像，使两个 renderer 在"ref 镜像用于 re-entrancy 守卫"上收敛为同一模式。
- [x] (Fix, NEW-MM-04) 把 unmount 回归测试改造为能真正抓到 `isMountedRef` 移除的行为断言：例如追踪一个 success 分支/`successTimerRef` 回调会变更的可观测信号，断言 unmount 后该信号不再变更（验证手段：临时删 `isMountedRef` 守卫应使新测试失败）。
- [x] (Proof) 新增/改造测试：① 若 `up` 保留（方案 a）——transform 符号 + indicator 锚点断言；② statusRef 同步镜像行为（如双 touchEnd 不重复 dispatch）；③ 行为级 unmount 守卫测试（删 `isMountedRef` 后失败）。

Exit Criteria:

- [x] `direction` 契约在 schema / definition / renderer / design.md / 测试间内部一致，不存在 schema-valid 却几何反转的选项
- [x] `statusRef` 在 pull-refresh 处理器内同步镜像，与 swipe-cell 模式收敛
- [x] unmount 测试能检测 `isMountedRef` 的移除（临时移除守卫 → 测试失败）
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck && test` 局部通过（本 Workstream 新增/改造了测试，故一并跑局部 test）
- [x] `docs/components/pull-refresh/design.md` 已与 `direction` 选定方案一致（移除或重写上拉相关章节）

### Workstream 3 - notice-bar 轮播与跨切 doc/styling 诚实性（OA-15, NEW-MM-05, NEW-MM-06）

Status: completed
Targets: `packages/flux-renderers-mobile/src/notice-bar.tsx`, `packages/flux-renderers-mobile/src/notice-bar.test.tsx`, `docs/components/swipe-cell/design.md`, `packages/flux-renderers-mobile/src/styles.css`

- Item Types: `Fix | Decision | Proof`

- [x] (Fix, OA-15) 将轮播前进与溢出检测解耦：当 `textList.length > 1` 时用独立 `setInterval`/timeout 驱动 `currentIndex`（对齐 `design.md §9` 已推荐的 "index + timeout 切换"），使不溢出/短文本的多文本 bar 也能轮播；正确处理 `loop`（`loop:false` 时停在末条）、与既有 marquee 动画的关系（溢出条目仍可滚动，但轮播不再依赖 `animationiteration`）。
- [x] (Proof, OA-15) 新增测试：驱动一个**不强制溢出**的多文本 bar，随 fake timer 推进断言 `currentIndex` 递增取模（当前所有轮播测试都 spy `scrollWidth`/`clientWidth` 强制溢出，死路径从未被覆盖）。
- [x] (Decision, NEW-MM-05) 选定。**裁定：订正文档**——内容跟手 1:1 并在操作区宽度处硬 clamp（无边缘阻尼），因为 swipe-cell 运行时本就正确（`swipe-cell.tsx` dragOffset 解析只用 `clamp()`，无任何阻尼系数），pull-refresh 的 `0.5` 阻尼是另一套模型（垂直 pull 的 elastic damping，不是水平 swipe 的边缘减速）。备选：实现 sub-linear 边缘减速（dragOffset 超过区域宽度某比例时缩放）被拒绝，因为运行时几何已正确且无用户反馈要求新增阻尼，引入未文档化的新行为反而违背契约诚实性。该 Decision 一经裁定即写回。
- [x] (Fix, gated on 上一条 Decision, NEW-MM-05) 若订正文档：改 `docs/components/swipe-cell/design.md:95` 阻尼行与实现一致（跟手 1:1 + 区域宽度硬 clamp，无边缘阻尼）。若实现阻尼：在 `swipe-cell.tsx` dragOffset 解析处加入减速。
- [x] (Decision, NEW-MM-06) 选定。**裁定：订正注释**——`styles.css` 为"package-local 固定 hsl 调色板 + 公开 `--nop-notice-bar-*` 覆盖变量（不自动追踪 shared theme tokens）"。备选：真正派生自 shared tokens（`hsl(var(--background))` 等）被拒绝，因为：(i) 当前 shared theme layer 未发布 notice-bar 专用 token pair，引入 `hsl(var(--background))` 等通用 token 会让 notice-bar 配色随主题漂移失去语义；(ii) `:root` 内裸 hsl 字面量是有意为之（让 standalone usage 也能渲染）；(iii) 真正派生需要先在 theme layer 立约新 token，超出本 remediation plan scope。该 Decision 一经裁定即写回。
- [x] (Fix, gated on 上一条 Decision, NEW-MM-06) 若订正注释：改 `styles.css:24-53`（light + dark 块）注释使其准确描述固定 hsl + 覆盖变量模型，删除虚假的"shared theme layer derivation / maps to classic theme token pairs"措辞。若派生：改为读取 shared token 并保留覆盖变量。

Exit Criteria:

- [x] 一个不溢出的多文本 notice bar 随时间轮播条目——由一条**不强制溢出**的 focused 测试断言
- [x] `docs/components/swipe-cell/design.md §6` 与 live 实现一致（无未实现的阻尼声明，或阻尼已实现）
- [x] `packages/flux-renderers-mobile/src/styles.css` 注释准确描述固定 hsl + 覆盖变量模型（无虚假"shared theme layer 派生"声明）
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck && test` 局部通过

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅子 agent（fresh session）填写。

- Reviewer / Agent: independent general sub-agent (fresh session `ses_10c04b77dffeoxoPV5YaZ4g4sQ`), re-read live repo for every cited line
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；3 条 Minor 均不阻塞。已采纳的唯一 Minor 修复：三条 Workstream Exit 的局部校验命令对称化（WS1/WS2 一并跑局部 `&& test`，因它们均新增/改造测试）。未采纳（保留原状）的 Minor：NEW-MM-02 关于 `role="status"` 条件化的措辞（承自 audit 建议，Proof 断言"外层 role=status div 不在 tab order"已无歧义且为承载性断言）。
- Coverage: 全部 10 条 finding（OA-14..17 + NEW-MM-01..06）覆盖，无遗漏、无静默降级；引用准确性逐条对 live repo 核对全部 confirmed-accurate。

## Closure Gates

> 关闭条件：本 section 全部条目 + 每个 Workstream 的 Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量 `pnpm typecheck/build/lint/test` 归此处（Rule 18）。closure-audit 必须由独立子 agent（fresh session）在执行 session 之外完成（Rule 12 / Closure Audit Rule）。

- [x] 全部 10 条 finding（OA-14..17 + NEW-MM-01..06）已落地，无遗漏
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（OA-14/15/16/17 与 NEW-MM-01/02 为 live defect / contract drift，不可降级；NEW-MM-03/04/05/06 为一致性/可信度/doc drift，亦在 scope 内收口）
- [x] 三条 Workstream 的 Exit Criteria 全部满足
- [x] 受影响 owner docs（`docs/components/{infinite-scroll,pull-refresh,swipe-cell}/design.md`）已与 live baseline 一致
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

_（起草时为空。本计划不预期 defer 任何 in-scope 项：10 条 finding 全部为已确认 live defect / contract drift / doc drift / 测试可信度，属 Non-Degradable，必须在 scope 内收口。若执行中出现需要 defer 的优化项，按 guide 的 Allowed Deferred Classifications 记录并附 Why Not Blocking Closure。）_

## Non-Blocking Follow-ups

- 真机 / CDP touch 仿真 + `page.evaluate()` 几何断言 + axe-core a11y 扫描（审计 blind-spot 自评提到的最高 ROI follow-up；用于把 OA-14 几何结论从"数学确定"提升为"设备确认"，并可能暴露动画时序问题）。非本计划 closure 必需。
- `useTouch` / `useCountdownTimer` 公共 hook 在 v1 前是否应公开（零外部消费者）——属另一个范围，不在本计划。
- `countdown` `time` 模式 `setInterval` 相对墙钟漂移（flash-sale 列表场景）——已知 tradeoff，低优先。

## Closure

Status Note: 全部 10 条 post-reaudit finding（OA-14..17 + NEW-MM-01..06）已在 `packages/flux-renderers-mobile/` 内收口。三条 Workstream 全部 `[x]` + `Status: completed`；workspace-level `pnpm typecheck/build/lint/test` 全绿（mobile 包 138 tests / 8 files，相对 128 baseline 净增 10 测试）；独立 fresh-session closure-audit `approved`。`Deferred But Adjudicated` 为空（10 条 finding 全部 Non-Degradable，已收口）；`Non-Blocking Follow-ups` 仅含审计 blind-spot（真机/CDP 几何 + axe-core a11y 扫描）与不属本范围的 hook 公开化 / countdown 漂移。

Closure Audit Evidence:

- Auditor / Agent: independent general sub-agent (fresh session `ses_10bdf2da7ffe9RBZqj4K2CR1fm`)
- Verdict: `approved`
- Evidence:
  - 逐条对 live repo 核对 10 条 finding（OA-14: `schemas.ts:13` `direction?: 'down'` + `pull-refresh.tsx:41` `const direction = 'down'` + `:94` 无 sign 逻辑；OA-15: `notice-bar.tsx:90-101` setTimeout 轮播 + 无 `onAnimationIteration`；OA-16: `infinite-scroll.tsx:60-62` deps `[loading, error]`；OA-17: `infinite-scroll.tsx:139-140,171,193` `displayedErrorText`；NEW-MM-01: `infinite-scroll.tsx:75-77,80-82` DEV-gated `console.error`；NEW-MM-02: `infinite-scroll.tsx:161-196` 外层无 operability 属性 + 内层 Button `w-full`；NEW-MM-03: `pull-refresh.tsx:130,140,146,152,158,179` 同步 statusRef 写入；NEW-MM-04: `pull-refresh.test.tsx:233-290` setTimeout spy + successDuration 过滤；NEW-MM-05: `swipe-cell/design.md:95` 无 `deltaX * 0.3`；NEW-MM-06: `styles.css:24-31` 注释订正）
  - 复跑 `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck`（clean）+ `test`（8 files / 138 tests passed）
  - 三条 Workstream `Status: completed` + 全部 `[x]`；`Deferred But Adjudicated` 为空；owner docs（infinite-scroll/pull-refresh/swipe-cell/notice-bar `design.md`）与 live baseline 一致
  - 接口 vs 语义：每条 Fix 的行为真实落地（非仅类型/命名），由 focused 测试与 live code path 佐证

Follow-up:

- no remaining plan-owned work（10 条 finding 全部收口；`Non-Blocking Follow-ups` 中三项为审计 blind-spot / 跨范围治理项，已在 plan 内显式标注为 non-blocking）

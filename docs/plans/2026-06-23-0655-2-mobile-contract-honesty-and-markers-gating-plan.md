# 2 Mobile Renderers Contract Honesty & Markers Gating

> Plan Status: active
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-22-2039-multi-audit-mobile.md` (MA-03, MA-04, MA-08, MA-09, MA-11, MA-17, MA-18, MA-19, MA-25), `docs/audits/2026-06-22-2039-open-audit-mobile.md` (OA-01, OA-02, OA-03, OA-06, OA-11)
> Related: `2026-06-23-0655-1-mobile-async-and-state-machine-correctness-plan.md`（执行顺序 1，先稳住状态机）、`2026-06-23-0655-3-mobile-ux-a11y-and-styling-hygiene-plan.md`（顺序 3）

## Purpose

把 `packages/flux-renderers-mobile` 的“schema 类型层 ↔ field-rule 层 ↔ design.md 层 ↔ 运行时实现”四方收敛到一致，并用一个 markers 契约测试门禁锁死回退。这是两个 open 审计里第二组独立收口面：它不依赖异步行为是否正确（plan 1 已先行），但需要在 plan 3 改 a11y/样式之前先把“契约说了什么”定清。覆盖“声明了却不派发 / 类型声明宽于实现 / 文档示例自相矛盾 / BEM 类名违反 markers 契约且无门禁 / 声明了依赖却不用 / 硬编码中文且无 i18n seam”整族 contract drift。

## Current Baseline

（live repo 已核对，引用行号准确；包自 `8f947df9` 未改。）

- **Markers 契约违反且无门禁**：`notice-bar.tsx:135-203`、`pull-refresh.tsx:136-150`、`infinite-scroll.tsx:90-138`、`swipe-cell.tsx:167-226` 四个渲染器都发 `nop-X__region` BEM 类，`notice-bar` 另发 `nop-notice-bar--${variant}` modifier。`docs/architecture/renderer-markers-and-selectors.md:120-153` 明确禁止 `nop-page__header` 这类；sibling 包有硬断言门禁（`packages/flux-renderers-basic/src/__tests__/widget-markers-contract.test.tsx:135-137` 断言 `.nop-page__header` 为 null），mobile 包无 `__tests__/` 目录\*\*，故全部 region BEM 类（共 16 个：notice-bar 4、pull-refresh 3、infinite-scroll 6、swipe-cell 3）+ 1 个 `notice-bar--variant` modifier 漏过 CI（MA-03、MA-25）。全仓 grep 这些类零 CSS 命中 → 死 DOM 噪声，真实风险是契约漂移 + 缺门禁。`data-slot` 已承载结构身份，`data-variant` 已发（`notice-bar.tsx:144`），modifier 冗余。
- **schema ↔ field-rule ↔ 运行时漂移**：`schemas.ts` 的 `InfiniteScrollSchema`（`:29-46`）缺运行时消费的 `hasMore`/`loading`/`error`，但 `mobile-renderer-definitions.ts:52-54` 的 field rules 声明了它们，于是 `infinite-scroll.tsx:6-29` 只能 `as InfiniteScrollRuntimeProps` 强转（MA-08）。`schemas.ts:64` 与 `mobile-renderer-definitions.ts:73` 都声明 `onAction` 事件，`swipe-cell.tsx` 零次调用 → 购物车左滑删除点 delete 无反应的静默陷阱（MA-09）。`schemas.ts:92` `icon?: SchemaValue` 宽于实现（`notice-bar.tsx:53-54` 只认 string），repo 内其余 5 处 `icon?` 均为 `string`（MA-17）。
- **design.md ↔ 代码三方漂移**：`countdown` 的 `formatCountdown`（`countdown.tsx:20-25`）仅 `DD/HH/mm/ss/SSS`；schema docstring（`design.md:47-49`）宣称支持 `YYYY MM DD HH mm ss SSS`；token 表（`design.md:79-92`）只列 DD/HH/mm/ss/SSS，却举例 `"ss" → "1845"`——按实现/表 1845 秒应得 `"45"`，示例自相矛盾（OA-11，确定级）。
- **声明了却不实现的设计契约**：`notice-bar` 多文本轮播（OA-01）：`notice-bar.tsx:186-190` 的 `onAnimationIteration` 守卫 `if (!loop && …)` 不可达（`loop` 默认 true；`loop:false` 又设 `animationIterationCount:'1'` 使 `animationiteration` 永不触发）→ `currentIndex` 推进在**每种**配置下都是死代码；design.md 承诺多文本轮播。`swipe-cell` close-after-action（OA-02）：design.md:8/67/130 承诺“操作按钮点击 → 触发 action 后自动回弹关闭”，代码无此路径（且 onAction 本就不派发，见 MA-09）。
- **公共 hook 表面漂移**：`hooks/use-touch.ts:25` 接口声明 `onTouchEnd: (e: React.TouchEvent) => void`，`:88` 实现不取参，两个调用方被迫 `{} as React.TouchEvent`（`pull-refresh.tsx:81`、`swipe-cell.tsx:121`）（MA-11）。`countdown.tsx:28-46` 的 `CountdownTimerOptions`/`CountdownTimerResult` 接口未 export，但 `useCountdownTimer` 经 `index.ts:24` 公开 → 半导出 API（MA-18）。
- **依赖诚实性**：`package.json:15-31` 声明 `flux-i18n`、`flux-react`（deps）与 `flux-compiler`、`flux-formula`、`flux-runtime`（devDeps）共 5 个，`grep from '@nop-chaos/...'` 在 `src/` 零命中，仅 `flux-core`、`ui` 被用（MA-19）。
- **事件直通契约违反**：`notice-bar.tsx:100,104` 的 DOM 入口 `onClick`/`onClose` 丢弃原生事件（`void props.events.onXxx?.(undefined)`），`docs/architecture/renderer-runtime.md:650-668` 要求 DOM 入口转发事件；语义事件 `onRefresh`/`onOpen`/`onClose`/`onFinish` 也丢上下文（MA-04；正确范式见 `flux-renderers-basic/src/button.tsx:96`）。
- **i18n 缺失**：全包默认文案为中文硬编码（OA-03），无 `t(...)` seam；`flux-i18n` 被声明却未用（与 MA-19 同一枚硬币的两面）。
- **`useTouch` 不 preventDefault 与 design.md 契约**：`use-touch.ts` 从不 `preventDefault`，`design.md:127,151` 把“阻止默认手势”写成契约（OA-06，需要裁定：要么收紧 design.md，要么实现 preventDefault 机制——后者与 plan 3 的 touch-action/MA-07 耦合，本 plan 只做契约裁定与最小实现，touch-action CSS 归 plan 3）。

## Goals

- 引入 `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx`，硬断言全 5 渲染器无 `nop-X__region` / `nop-X--modifier`，且 `data-slot`/`data-status`/`data-variant` 正确存在（MA-25）。
- 删除全部死 BEM 类字符串，仅靠 `data-slot` 承载结构身份（MA-03）。
- `InfiniteScrollSchema` 补 `hasMore?/loading?/error?`，删除 `infinite-scroll.tsx` 的 `as` 强转（MA-08）。
- 裁定并落地 `onAction`：要么在操作区按钮点击时派发 `{type:'action',side}` 并 close-after-action，要么从 schema/field-rules/design.md 三处移除（MA-09、OA-02 一并收口）。
- `NoticeBarSchema.icon` 收窄为 `string`（MA-17）。
- `use-touch.ts` 接口 `onTouchEnd` 去掉未用参，调用方去掉 `{} as` 转型（MA-11）。
- 导出 `CountdownTimerOptions`/`CountdownTimerResult`（MA-18）。
- `package.json` 删 5 个未用依赖（MA-19）。
- DOM 入口转发原生事件，语义事件传结构化 `{type,...}` 载荷（MA-04）。
- 收口 `countdown` format 三方漂移：选定单一真相源并修示例（OA-11）。
- 收口 `notice-bar` 多文本轮播死代码（OA-01）与 `swipe-cell` close-after-action（OA-02）：实现或显式移除契约并改 design.md。
- 裁定 `useTouch` preventDefault 契约（OA-06）：收紧 design.md 或最小实现。
- 裁定 i18n seam（OA-03）：引入 `t(...)` seam 或显式记录“v1 中文硬编码、i18n 后置”并由本 plan 收紧文档/依赖一致性。

## Non-Goals

- 不改状态机/异步正确性（plan 1）。
- 不改 touch-action CSS、主题 token、a11y 焦点、几何布局、内联样式迁移、user-select（plan 3）。
- 不做全量 i18n 翻译资源落地——本 plan 只决定“是否有 seam + 依赖是否诚实”；翻译文案资源属后续优化。
- 不重写 `design.md` 的非契约性叙事（只对齐被代码证伪的契约段）。

## Scope

### In Scope

- 新增 `src/__tests__/mobile-markers-contract.test.tsx`（MA-25）。
- 四渲染器删 BEM 类、删 `notice-bar--variant` modifier（MA-03）。
- `schemas.ts`、`infinite-scroll.tsx`（MA-08）；`schemas.ts:92` icon 收窄（MA-17）。
- `schemas.ts:64`、`mobile-renderer-definitions.ts:73`、`swipe-cell.tsx`、`docs/components/swipe-cell/design.md`（MA-09 + OA-02，统一裁定）。
- `hooks/use-touch.ts` + 两调用方（MA-11）；`countdown.tsx` + `index.ts` 接口导出（MA-18）。
- `package.json`（MA-19）。
- `notice-bar.tsx:100,104` 及语义事件 payload（MA-04）。
- `countdown.tsx` formatCountdown + `docs/components/countdown/design.md` schema docstring/token 表/示例（OA-11）。
- `notice-bar.tsx:186-190` + `docs/components/notice-bar/design.md`（OA-01）；`docs/components/swipe-cell/design.md` close-after-action 段（OA-02，随 MA-09 裁定）。
- `hooks/use-touch.ts` preventDefault 裁定 + `docs/components/*/design.md` 相关契约段（OA-06）。
- i18n seam 裁定：若引入 seam，加 `t()` 调用点并保留 `flux-i18n` 依赖；若后置，从 `package.json` 删 `flux-i18n` 并在 design.md 记录 v1 中文硬编码（OA-03）。

### Out Of Scope

- notice-bar keyframes 注入清理（MA-05，plan 3——属样式系统层）。
- notice-bar 主题 token 迁移（MA-06，plan 3）；其测试解耦（MA-21，plan 3）。
- pull-refresh 渲染期派生（MA-10，plan 3——属渲染热路径优化）。
- 几何/a11y/touch-action（OA-08/OA-09/OA-12/MA-07/OA-04，plan 3）。
- 计时器/状态机行为（MA-16/OA-13/MA-15，plan 1）。
- observer rebuild / touchCancel 测试（MA-20 子项，plan 1）。

## Failure Paths

| 场景               | 触发                                 | 行为                                                                 | 可重试        | 用户可见表现              |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------- | ------------- | ------------------------- |
| author-bad-icon    | `icon: { name:'star' }`（非 string） | 类型层编译失败（收窄后）或 runtime 忽略并按裁定给默认                | 否            | 编辑期红线 / 显示默认图标 |
| author-onAction    | schema 写 `onAction` 但裁定为“移除”  | 类型层不再有该字段；写旧 schema 报错                                 | 否            | 编辑期红线                |
| author-format-YYYY | `format:"YYYY年MM月DD日"`            | 按裁定：要么实现要么 schema docstring 明示不支持、YYYY/MM 字面输出   | 否            | 文本与 docstring 一致     |
| swipe-delete       | 左滑露删除按钮后点击                 | 按裁定：派发 `onAction {type:'action',side:'open-right'}` 并回弹关闭 | 是（host 侧） | 删除生效、cell 关闭       |

## Test Strategy

档位选择：**必须自动化**。

理由：markers 契约门禁本身是 CI 硬门（sibling 包已有），缺失即回归（MA-03 正是因此漏网）；schema 类型收窄、onAction 派发、format token、事件直通均为公共契约层，属核心回归路径。Proof 先于 Fix：markers 门禁测试与 onAction/format/event-passthrough 行为测试须先写失败用例。

## Execution Plan

### Phase 1 - Markers 契约门禁与 BEM 清理（先建门禁，后清理）

Status: planned
Targets: `packages/flux-renderers-mobile/src/__tests__/mobile-markers-contract.test.tsx`（新）、`notice-bar.tsx`、`pull-refresh.tsx`、`infinite-scroll.tsx`、`swipe-cell.tsx`

- Item Types: `Proof | Fix`

- [ ] `Proof`（MA-25）：新建 `mobile-markers-contract.test.tsx`，镜像 `flux-renderers-basic/.../widget-markers-contract.test.tsx:135-137`，渲染全 5 渲染器后断言无 `.nop-(notice-bar|pull-refresh|infinite-scroll|swipe-cell|countdown)__*`、无 `.nop-notice-bar--*`，并正向断言 `data-slot`/`data-status`/`data-variant` 存在（先写成失败测试）。
- [ ] `Fix`（MA-03）：删除四渲染器全部 `nop-X__region` 类字符串与 `nop-notice-bar--${variant}` modifier（`data-slot`/`data-variant` 保留）。

Exit Criteria:

- [ ] `mobile-markers-contract.test.tsx` 存在且全绿（门禁生效）。
- [ ] live 四渲染器 className 不再含任何 `nop-X__`/`nop-X--` BEM。
- [ ] 本包单测通过（门禁先于后续 phase 的样式改动，保证 plan 3 改样式时不会被旧 BEM 干扰）。

### Phase 2 - Schema / field-rule / 类型表面对齐

Status: planned
Targets: `schemas.ts`、`mobile-renderer-definitions.ts`、`infinite-scroll.tsx`、`notice-bar.tsx`、`countdown.tsx`、`index.ts`、`hooks/use-touch.ts`、`pull-refresh.tsx`、`swipe-cell.tsx`、`package.json`

- Item Types: `Fix | Decision`

- [ ] `Fix`（MA-08）：`InfiniteScrollSchema` 增 `hasMore?: boolean; loading?: boolean; error?: boolean | string;`；删 `infinite-scroll.tsx:6-29` 的本地 `InfiniteScrollRuntimeProps` 与 `as` 强转。
- [ ] `Fix`（MA-17）：`schemas.ts:92` `icon?: SchemaValue` → `icon?: string`。
- [ ] `Fix`（MA-11）：`use-touch.ts:25` 接口 `onTouchEnd: () => void`；`pull-refresh.tsx:81`、`swipe-cell.tsx:121` 去 `({} as React.TouchEvent)`；同步 `use-touch.test.ts:162`。
- [ ] `Fix`（MA-18）：`countdown.tsx` 给 `CountdownTimerOptions`/`CountdownTimerResult` 加 `export`；`index.ts` 增 `export type { CountdownTimerOptions, CountdownTimerResult } from './countdown.js';`。
- [ ] `Fix`（MA-19）：`package.json` 删 `dependencies` 的 `flux-i18n`、`flux-react` 与 `devDependencies` 的 `flux-compiler`、`flux-formula`、`flux-runtime`（保留 `flux-core`、`ui`）——**除非 OA-03 i18n 裁定决定保留 `flux-i18n`**（见 Phase 4，二选一）。
- [ ] `Decision`（MA-19 与 OA-03 联动）：若 OA-03 裁定引入 i18n seam，则保留 `flux-i18n` 依赖；否则删除并在 design.md 记录“v1 中文硬编码、i18n 后置”。

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck` 通过（无 `as` 强转、接口已导出、icon 收窄、onTouchEnd 签名一致）。
- [ ] 本包单测通过；`use-touch.test.ts` 已同步新签名。
- [ ] `package.json` 与实际 import 一致（`pnpm install` 后无幽灵依赖）。

### Phase 3 - 事件直通契约（MA-04）

Status: planned
Targets: `notice-bar.tsx`、`pull-refresh.tsx`、`swipe-cell.tsx`、`countdown.tsx`

- Item Types: `Proof | Fix`

- [ ] `Proof`：新增 notice-bar 用例断言 `onClick`/`onClose` 派发时携带原生事件（可读 `event.type`/`currentTarget`）；语义事件用例断言 payload 含 `type` 字段。
- [ ] `Fix`（MA-04 DOM 入口）：`notice-bar.tsx:100,104` 改为转发原生事件（close 按钮先 `event.stopPropagation()` 再 `props.events.onClose?.(event)`）。
- [ ] `Fix`（MA-04 语义事件）：`onRefresh`/`onOpen`/`onClose`/`onFinish` 传结构化 payload（如 `{type:'refresh',direction,threshold}`、`{type:'open',side:'open-left'|'open-right'}`）。

Exit Criteria:

- [ ] live 四渲染器 DOM 入口转发事件、语义事件带 `{type,...}` 载荷。
- [ ] 对应用例全绿。

### Phase 4 - design.md ↔ 代码契约对齐（OA-01/02/06/11 + i18n 裁定）

Status: planned
Targets: `notice-bar.tsx`、`swipe-cell.tsx`、`countdown.tsx`、`hooks/use-touch.ts`、`docs/components/{notice-bar,swipe-cell,countdown}/design.md`、`schemas.ts` docstring

- Item Types: `Decision | Fix | Proof`

- [ ] `Decision`（OA-11 format）：选定 countdown format 单一真相源——默认裁定：实现现状即 `DD HH mm ss SSS`，收窄 schema docstring 为该集合，修 `design.md:92` 示例 `"ss"→"45"`，删 `YYYY/MM` 承诺。
- [ ] `Fix`（OA-11）：按裁定更新 `design.md:47-49` docstring、`:79-92` token 表/示例。
- [ ] `Proof`（OA-11）：`countdown.test.tsx` 增“未支持 token 字面透传”与 `YYYY/MM` 行为用例（按裁定）。
- [ ] `Decision`（OA-01 多文本轮播）：裁定实现还是移除——默认裁定：实现多文本轮播（修复 `onAnimationIteration` 守卫：`loop` 分支正确触发 `currentIndex` 推进）。
- [ ] `Fix`（OA-01）：`notice-bar.tsx:186-190` 修守卫使多文本轮播在 `loop:true` 下推进；若裁定移除，则删死代码并改 `design.md`。
- [ ] `Decision`+`Fix`（MA-09 + OA-02 onAction/close-after-action）：统一裁定——默认裁定：操作区按钮点击派发 `props.events.onAction?.({type:'action',side})` 并自动回弹关闭（实现 close-after-action）；据此更新 `swipe-cell.tsx` 与 `docs/components/swipe-cell/design.md:8,67,130`。若裁定“移除”，则从 `schemas.ts:64`、`mobile-renderer-definitions.ts:73`、design.md 删 `onAction`。
- [ ] `Proof`（MA-09/OA-02）：swipe-cell 增“左/右操作区按钮点击 → onAction 派发 + cell 关闭”用例。
- [ ] `Decision`（OA-06 useTouch preventDefault）：裁定收紧 design.md 还是实现——默认裁定：收紧 `design.md:127,151` 为“渲染器层面不 preventDefault；手势所有权由 CSS `touch-action` 提供（见 plan 3 MA-07）”，避免与 plan 3 耦合的 JS preventDefault。
- [ ] `Fix`（OA-06）：按裁定更新 design.md；若裁定实现，则最小化在 use-touch 加 preventDefault 并配 touch-action（与 plan 3 协调）。
- [ ] `Decision`（OA-03 i18n）：裁定引入 seam 还是后置——默认裁定：v1 引入最小 `t()` seam（保留 `flux-i18n` 依赖，默认中文资源就地），为后续翻译留口；据此落地调用点或记录后置决定。

Exit Criteria:

- [ ] countdown format 在 schema docstring/token 表/示例/实现四处一致，并有 token 用例。
- [ ] notice-bar 多文本轮播按裁定实现或移除，design.md 一致。
- [ ] swipe-cell onAction/close-after-action 按裁定实现或从三层移除，design.md 一致，有点击用例。
- [ ] useTouch preventDefault 契约 design.md 与实现一致。
- [ ] i18n 决定落地（seam 或显式后置记录），`package.json` 依赖与决定一致。
- [ ] 本包单测 + typecheck 通过。

## Draft Review Record

- Reviewer / Agent: 独立 general sub-agent（fresh session `ses_10e6fbb8bffe`），round 1
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker、零 Major；Minor 不触发返工，已顺手修正）
- Findings addressed:
  - Minor（已修）：Current Baseline 的 BEM 计数由“13 region + 1 modifier”更正为实测“16 region + 1 modifier”（pull-refresh 3 / notice-bar 4 / infinite-scroll 6 / swipe-cell 3 + `notice-bar--variant`），不影响 Phase 1 正则门禁执行。
- 独立核对结论：14 条 in-scope finding（MA-03/04/08/09/11/17/18/19/25、OA-01/02/03/06/11）逐条有可观测 Exit Criteria 的执行项；全部引用 file:line 经 live repo 核验通过；与 plan 1/3 切分干净（countdown 计时→1 / format-doc→2 / tabular-nums→3；swipe-cell dispatch+touchcancel→1 / onAction 语义→2 / a11y+几何→3），无重复归属或遗漏；MA-19 依赖删除与 OA-03 i18n seam 的二选一耦合在 Phase 2/4 显式联动，裁定合理。

## Closure Gates

- [ ] 所有 in-scope confirmed contract drift（MA-03、MA-04、MA-08、MA-09、MA-11、MA-17、MA-18、MA-19、MA-25、OA-01、OA-02、OA-03、OA-06、OA-11）已收敛。
- [ ] mobile markers 契约门禁测试已落地并阻止回退。
- [ ] 不存在被静默降级到 deferred 的 in-scope contract drift。
- [ ] 必要 focused verification（markers 门禁、schema 类型、onAction、format token、事件直通）已完成。
- [ ] 受影响 owner docs（5 个 `docs/components/*/design.md` 相关段、`schemas.ts` docstring）已同步到 live baseline。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 全量 i18n 翻译资源

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只保证“是否有 seam + 依赖诚实 + 文档一致”；多语言资源文件属独立本地化工作，不影响当前契约成立。
- Successor Required: no
- Successor Path: —

## Non-Blocking Follow-ups

- 若 OA-06 裁定为“CSS touch-action 负责”，则 plan 3 落地 MA-07 后可在此回看 design.md 措辞是否需要再精简。
- 若未来决定 `useCountdownTimer` 不再公开，MA-18 的接口导出可随之移除。

## Closure

Status Note: （关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent，fresh session）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （仅 non-blocking 项）

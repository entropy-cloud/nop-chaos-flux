# W4a 多媒体组（audio / video / carousel / qrcode）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W4a；`docs/components/{audio,video,carousel,qrcode}/design.md`（契约已立约）
> Related: roadmap 依赖图 `L0 → W4a`（无前置阻塞，与 W3d/W4b 互相独立）；X1 doAction 句柄族（carousel 句柄 deferred→本 plan 收口）；W1a 内容 sanitize 门禁
> Mission: components
> Work Item: W4a

## Purpose

把 roadmap W4a（多媒体组，4 个组件）从"4 份 design.md 已立约、代码 0%"推进到"4 个 renderer 实现 + 注册 + playground + e2e + roadmap W4a 标 done"。

4 个组件合成一个 owner plan（遵循 guide Rule 22/26：同一展示族优先合成 owner plan），理由：同属 `flux-renderers-content` 包的纯展示/媒体 renderer，共享 `RendererComponentProps` 消费范式、同一注册路径、同一 proof path（marker 契约 + focused 单测 + e2e）、同一 owner-doc obligation（4 份 design §3 归属 drift 收敛 basic→content）。design §12 各自标注的最大风险（与 image/cards/upload 边界重叠、qrcode 双 canonical 名）正是要求一次性厘清。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **4 个 renderer 均未实现**：`packages/flux-renderers-content/src/` 无 audio/video/carousel/qrcode；`amis-baseline-matrix.md` L102-105 四组件均标 `targetContract` / wave 4。
- **目标包已 bootstrap**：`flux-renderers-content` 已落地 14 个 renderer（W1b/W1a/W2a/W3c），`contentRendererDefinitions` + `registerContentRenderers(registry)` 就绪——4 个 renderer 直接追加，**无新包工作**。
- **carousel 零新依赖（ui 已提供）**：`@nop-chaos/ui` 已导出 Carousel（`packages/ui/src/index.ts` L11 `export * from './components/ui/carousel.js'`，基于已就位依赖 `embla-carousel-react ^8.1.5`）。carousel renderer 复用 ui Carousel primitive，**不新增依赖**。
- **audio/video 用原生媒体元素（有先例）**：content 包 `image.tsx` 已确立"媒体展示 renderer 包裹原生元素 + 输出 marker class"范式（`<img>` 无 ui 等价物）。audio/video 同理用原生 `<audio>`/`<video>` + marker，不违反"禁止裸 HTML"（该约束针对有 ui 等价物的情况；媒体元素无 shadcn 等价物）。
- **qrcode 需新依赖**：仓库无 qrcode 库；需引入一个轻量 QR 生成库（裁定项）。
- **owner-doc drift（包归属，系统性）**：audio/video/carousel/qrcode design §3 全部写"预期归属 `flux-renderers-basic`"，但 roadmap（权威包分配）将 W4a 划归 `flux-renderers-content`（NEW 包，组件重组后从 basic 拆出）。4 份 §3 需收敛。
- **X1 carousel 句柄 deferred（本 plan 收口）**：X1 doAction plan `Deferred But Adjudicated` 将无运行时实现的句柄子集（含 carousel）路由到"main roadmap 各自落地 plan"（即 W4a）。carousel design §8 明确推荐 `component:next`/`prev`/`setValue` 三句柄。本 plan carousel 落地时注册句柄，收口该 deferred 项（在 X1 plan 注记"已由 W4a plan 收口"）。
- **纯展示，无请求下沉约束**：4 个组件均为展示型（src/items/value 由表达式或既有 loader 提供），无挂载期数据请求语义。

## Goals

- `audio`/`video`：媒体展示 renderer（`src`/`poster`/`autoPlay`/`loop`/`controls`/`muted` + `title` value-or-region），原生媒体元素 + marker，落 `flux-renderers-content`，marker `nop-audio`/`nop-video`。
- `carousel`：轮播展示 renderer，复用 ui Carousel primitive（embla），`items`/`autoPlay`/`interval`/`loop`/`controls`/`indicators`，注册 `component:next`/`prev`/`setValue` 句柄（收口 X1 deferred），marker `nop-carousel`。
- `qrcode`：二维码展示 renderer（`value`/`size`/`level`/`foreground`/`background` + `label` value-or-region），单一 canonical 名 `qrcode`（不保留 `qr-code`），落 `flux-renderers-content`，marker `nop-qrcode`。
- 4 个 `RendererDefinition` 合入 `contentRendererDefinitions` 随 `registerContentRenderers` 注册；playground 演示页 + e2e（程序化断言）+ focused 单测。
- roadmap W4a 标 done + amis-baseline-matrix 4 组件 `targetContract→runtime`；4 份 design §3 归属 drift 收敛 basic→content；X1 carousel 句柄 deferred 收口。

## Non-Goals

- 不实现媒体上传 / 剪辑 / 播放列表工作台（design §12：与 upload 边界分离）——属 W3d upload 族 / 宿主范畴。
- 不实现 carousel 的复杂数据工作流 / 导航菜单语义（design §1：只负责顺序切换内容项）。
- 不保留 `qr-code` 作为第二个 canonical type（design §2/§12：只保留 `qrcode`）。
- 不实现 `component:play`/`pause` 句柄（audio/video design §8 标"后续可支持"——首版不要求，归 successor）。
- 不实现 W4b（steps/timeline，归 layout 包，独立 plan）。

## Scope

### In Scope

- 4 个 renderer 实现，遵循 `RendererComponentProps`（读 `props.props`/`props.regions`/`props.meta`/`props.events`/`props.helpers`，展示型无 owner 状态；carousel 局部 active-item 状态）。
- carousel 复用 ui Carousel primitive（零新依赖）；audio/video 包裹原生媒体元素 + marker；qrcode 引入轻量 QR 库。
- carousel 注册 `component:next`/`prev`/`setValue` 句柄（X1 句柄族规范）。
- 4 个 `RendererDefinition` 合入 `contentRendererDefinitions` 注册 + playground 演示页 + e2e + focused 单测。
- roadmap W4a 标 done + amis-baseline-matrix 4 组件 `targetContract→runtime` + 4 份 design §3 drift 收敛 + X1 carousel 句柄 deferred 收口注记。

### Out Of Scope

- 媒体上传 / 剪辑 / 播放列表。
- carousel 远程 items loader 装配（design §9 标注可由 loader 提供，首版聚焦静态 + 表达式 items）。
- qrcode 的复杂码类型（支付/扫描流程）——design §1 排除。

## Failure Paths

| 场景                 | 触发                             | 行为                                                   | 可重试                | 用户可见表现                      |
| -------------------- | -------------------------------- | ------------------------------------------------------ | --------------------- | --------------------------------- |
| media-src-empty      | `src` 为空 / 未提供              | 渲染占位（poster 或 empty 态），不抛错                 | 否                    | 媒体区显示占位/封面，控制台无崩溃 |
| media-src-invalid    | `src` 加载失败（404/格式不支持） | 原生 media error 事件 → 字段提示加载失败               | 是（修正 src 后重渲） | 媒体元素显示错误态，不崩溃        |
| carousel-items-empty | `items` 空                       | 渲染 empty 态（复用 content `empty`），autoPlay 不启动 | 否                    | 轮播区显示空态                    |
| qrcode-value-empty   | `value` 空 / 过长超容量          | 渲染占位或提示，不抛错                                 | 否                    | 显示占位/提示，不崩溃             |
| qrcode-level-invalid | `level` 非 L/M/Q/H               | 回退默认 level 并渲染                                  | 否                    | 正常渲染二维码                    |

## Test Strategy

档位选择：`建议有测`

理由：4 个均为纯展示/媒体组件（非鉴权/对外 API）。carousel 句柄派发（X1 句柄族规范）、qrcode 生成、media src 归一化/失败降级是回归风险点，配 focused 单测；关键交互（carousel 切换/句柄、media 控件、qrcode 渲染）配 e2e（程序化断言）。按 AGENTS.md 每个新组件必须有 playground 示例 + e2e。

## Execution Plan

### Phase 1 - audio / video（原生媒体展示）

Status: completed
Targets: 新增 `packages/flux-renderers-content/src/audio.tsx`、`video.tsx`；`content-renderer-definitions.ts`、`schemas.ts`、`index.ts`；playground route-model + example；`tests/e2e/`

- Item Types: `Fix | Proof`

- [x] **Fix**：实现 audio/video（包裹原生 `<audio>`/`<video>`；audio 字段 `src`/`poster`/`autoPlay`/`loop`/`controls` + `title`；video 在 audio 基线上增加 `muted`——`muted` 仅属于 video，audio design §4/§5 未立约该字段）；src 空/失败降级占位），audio 输出 `nop-audio`、video 输出 `nop-video` marker。
- [x] **Fix**：2 个 `RendererDefinition` 合入 `contentRendererDefinitions`，随 `registerContentRenderers` 注册；schema + 字段分类（design §5）。
- [x] **Proof**：focused 单测 —— src 渲染、src 空/失败降级、`title` region 渲染、autoPlay/loop/controls 透传（video 额外验证 `muted` 透传；audio 不含 `muted`）。
- [x] **Proof**：playground 演示页 + e2e（程序化断言：`<audio>`/`<video>` 元素存在、src 属性正确、控件存在；src 失败降级）。

Exit Criteria:

- [x] audio/video 落地于 `flux-renderers-content`，输出 marker，随 `registerContentRenderers` 注册；src 归一化/失败降级 focused 单测通过；媒体渲染 e2e 程序化断言通过。

### Phase 2 - carousel（复用 ui Carousel + 句柄注册）

Status: completed
Targets: 新增 `packages/flux-renderers-content/src/carousel.tsx`；`content-renderer-definitions.ts`、`schemas.ts`、`index.ts`；playground route-model + example；`tests/e2e/`；X1 plan deferred 注记

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：carousel 句柄契约 —— 注册 `component:next`/`prev`/`setValue`（遵循 X1 句柄族规范，复用统一 input handle 工厂模式），收口 X1 plan `Deferred But Adjudicated` 的 carousel 条目。
- [x] **Fix**：实现 carousel（复用 ui Carousel primitive，items 归一化 + active-item 局部状态 + `autoPlay`/`interval`/`loop`/`controls`/`indicators`，空 items 渲染 empty），输出 `nop-carousel` marker；注册三句柄。
- [x] **Fix**：`RendererDefinition` 合入 content 注册；schema + 字段分类（`items`/`autoPlay`/`interval`/`loop`/`controls`/`indicators` value，`onChange` event）；收敛 carousel design §3（basic→content）。
- [x] **Proof**：focused 单测 —— items 归一化、active 切换、autoPlay/loop 行为、空 items empty 态、三句柄派发（next/prev/setValue）。
- [x] **Proof**：playground 演示页 + e2e（程序化断言：next/prev 切换活动项、indicators、句柄派发改值）。

Exit Criteria:

- [x] carousel 落地于 `flux-renderers-content`，复用 ui Carousel（零新依赖），输出 marker + 三句柄注册；切换/句柄 focused 单测 + e2e 程序化断言通过。
- [x] X1 plan carousel 句柄 deferred 条目注记"已由 W4a plan 收口"；carousel design §3 收敛为 content。

### Phase 3 - qrcode（二维码生成）

Status: completed
Targets: `packages/flux-renderers-content/package.json`（新增 qrcode 库）；新增 `packages/flux-renderers-content/src/qrcode.tsx`；`content-renderer-definitions.ts`、`schemas.ts`、`index.ts`；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：qrcode 库选型 —— 引入轻量 MIT QR 生成库（canvas/svg 输出），单一 canonical 名 `qrcode`（不保留 `qr-code`，amis-baseline-matrix L210 已裁定 `qr-code→qrcode`）。裁定写入 design + log。
- [x] **Fix**：实现 qrcode（`value`/`size`/`level`/`foreground`/`background` + `label` value-or-region，value 空/过长降级占位，level 非法回退默认），输出 `nop-qrcode` marker。
- [x] **Fix**：`RendererDefinition` 合入 content 注册；schema + 字段分类；收敛 qrcode design §3（basic→content）。
- [x] **Proof**：focused 单测 —— value→二维码渲染、level L/M/Q/H、size/color、value 空降级、level 非法回退。
- [x] **Proof**：playground 演示页 + e2e（程序化断言：value 变化→二维码 canvas/svg 更新；label region 渲染）。

Exit Criteria:

- [x] qrcode 落地于 `flux-renderers-content`，输出 marker，单一 canonical 名（无 `qr-code` 别名 type）；value/level/size focused 单测 + e2e 程序化断言通过。
- [x] qrcode 库引入记录于 package.json + design.md；qrcode design §3 收敛为 content。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立 sub-agent（fresh session，task `ses_109351810…`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（已修复）—— Phase 1 `muted` 仅属于 video（audio design §4/§5 未立约该字段），已从 audio 收敛、仅 video 透传 `muted`。
  - Minor（已修复）—— X1 carousel 句柄 successor 措辞精确化（X1 plan 收口注记将无运行时实现句柄子集路由到"main roadmap 各自落地 plan"= W4a）。
  - Minor（不阻塞）—— content 包 package.json description 列 10/14 renderer，closure 时可选刷新。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后，经独立子 agent closure-audit，方可将 Plan Status 改 `completed`。

- [x] 4 个 renderer（audio/video/carousel/qrcode）全部落地并注册于 `flux-renderers-content`
- [x] carousel 复用 ui Carousel（零新依赖）+ 注册三句柄（收口 X1 deferred）；audio/video 原生媒体 + marker；qrcode 单一 canonical 名
- [x] 行为/契约结果已达成（focused 单测 + e2e 程序化断言全绿）
- [x] 4 份 design §3 归属 drift 收敛 basic→content；X1 carousel 句柄 deferred 收口注记
- [x] roadmap W4a 标 done + amis-baseline-matrix 4 组件 `targetContract→runtime`
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift
- [x] 受影响 owner docs（4 份 design.md、roadmap、amis-baseline-matrix、X1 plan deferred 注记）已同步 live baseline
- [x] 独立子 agent（fresh session）closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### audio/video 的 `component:play`/`pause` 句柄

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design §8 标"后续可支持"；首版媒体展示契约（src/poster/controls/自动播放）已成立，句柄不影响展示 baseline。
- Successor Required: `no`

### carousel 远程 items loader 装配

- Classification: `optimization candidate`
- Why Not Blocking Closure: design §9 标注 items 可由 loader 提供；首版聚焦静态 + 表达式 items，不影响轮播契约成立。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 媒体上传 / 剪辑 / 播放列表工作台（design §12：与 upload 边界分离，属 W3d upload 族 / 宿主）。
- qrcode 复杂码类型（支付/扫描流程）——design §1 排除。
- carousel 与 cards/image 的媒体组合复用细化（design §12 风险）。

## Closure

Status Note: W4a 多媒体组（audio/video/carousel/qrcode）4 个 renderer 全部落地于 `flux-renderers-content`，随 `registerContentRenderers` 注册（共 18 个 definition），audio/video 原生媒体元素 + marker、carousel 复用 ui Carousel(embla，零新依赖) + 注册 next/prev/setValue 句柄（收口 X1 deferred）、qrcode 引入轻量 MIT 库（canvas，单一 canonical 名 `qrcode`）。focused 单测（147）+ e2e（9）+ typecheck/lint 全绿；4 份 design §3 归属 drift 收敛 basic→content；roadmap W4a 标 done；amis-baseline-matrix 4 组件 `targetContract→runtime`；X1 carousel 句柄 deferred 已注记收口。Plan 完成，可关闭。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session closure auditor (task general)
- Evidence:
  - 独立 fresh session 审计，逐项核对 live repo（未采信执行 session 自述）。
  - `pnpm --filter @nop-chaos/flux-renderers-content typecheck` → clean pass。
  - `pnpm --filter @nop-chaos/flux-renderers-content lint` → clean pass。
  - `pnpm --filter @nop-chaos/flux-renderers-content test` → 20 files / 147 tests passed。
  - `npx playwright test tests/e2e/w4a-multimedia-family.spec.ts --reporter=list` → 9 passed (13.3s)。
  - A. 4 renderer 存在（audio/video/carousel/qrcode.tsx）、注册于 `contentRendererDefinitions`、`index.ts` 导出；definition-count 单测断言 18 类型 TYPES 数组（14+4），全绿。PASS。
  - B. carousel 复用 `@nop-chaos/ui` Carousel，embla 为 ui 既有依赖（`packages/ui/package.json` embla-carousel-react ^8.1.5），carousel 零新依赖；`package.json` 仅新增 `qrcode` + `@types/qrcode`。PASS。
  - C. `carousel.tsx:83-122` ComponentHandle capabilities.invoke 处理 next/prev/setValue，hasMethod/listMethods 三者齐备，经 `useCurrentComponentRegistry().register(...)` 注册；e2e 句柄派发用例通过。PASS。
  - D. audio definition fields 无 `muted`、`audio.tsx` 无 muted 透传；video definition fields 含 `muted`（L454）、`video.tsx:18,67` 透传 muted，e2e 断言 `video.muted === true`。PASS。
  - E. src 全量 grep `qr-code|qr_code` 无命中，definitions 仅 `type: 'qrcode'`，单一 canonical 名。PASS。
  - F. `packages/*/src/` 下无 `.js`/`.d.ts`/`.js.map` 散落构建产物。PASS。
  - G. owner docs 同步：roadmap.md:30 W4a `done`；amis-baseline-matrix.md:102-105 四组件 `runtime`；audio/video/carousel/qrcode design §3（各 L16）归属 `flux-renderers-content`；X1 plan:265 carousel 句柄收口注记（dated 2026-06-24）。PASS。
  - H. 4 项验证命令全绿（计数见上）。PASS。
  - I. §Deferred But Adjudicated 仅含 audio/video play/pause 句柄（out-of-scope improvement）+ carousel 远程 items loader（optimization candidate），两者 Successor Required: no，均为非阻塞，无 in-scope live defect 被静默降级。PASS。

Follow-up:

- audio/video play/pause 句柄、carousel 远程 loader 属 non-blocking（见 Deferred）。
- 无 in-scope remaining debt。

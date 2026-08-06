# 02 Industrial HMI Symbol Geometry & Property Consistency（复合族 resize + create/update 几何一致 + 读写属性对称）

> Plan Status: active
> Mission: industrial-hmi
> Work Item: 2026-08-05-2129 post-remediation audit P2（symbol 几何/属性 子集）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-open-audit-industrial-hmi.md` `[P2-4]`（dim 21）/ `[P2-7]`（dim 21）/ `[P2-8]`（dim 21）/ `[P2-9]`（dim 21）/ `[P2-10]`（dim 14/22），登记于 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节
> Related: `docs/plans/2026-08-05-0653-3-hmi-binding-state-resolution-correctness.md`（B2 修复了 line/arrow/pipe 的 points-based width/height applyProps 重算，**复合族未修**——本 plan P2-4 即 B2 的复合族镜像）、`docs/plans/2026-08-06-0900-1-industrial-hmi-validator-equality-robustness.md`（validator 层，与本 plan 不重叠）

## Purpose

把 2026-08-05-2129 open-audit 登记的 **5 条 symbol 族几何/属性一致性** P2 收口。五条共享同一结果面：**`src/symbols/**` 图元的 create-time 几何 / update-time（applyProps）几何 / 读写属性名的对称性**——复合族（device/instrument/sensor-control 11 symbols）width/height 绑定零几何响应、create/update 常量分歧首帧跳变、create 无条件覆盖 author 样式、pipe-junction stubs 硬编码 strokeWidth、`getSymbolProps` 读返回 leafer 内部属性名而写期望 schema 名（host getSymbol→setSymbolProps 往返喂错键）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经源码实测确认（行号对齐 HEAD）。

- **open P2-4 已确认 live（复合族 resize 零响应）**：`symbols/composite.ts:64-67` `applyCompositeProps` 仅当 `EXTENT_FIELDS.has(key) && parts.extent` 时把 width/height 路由到 `parts.extent`（liquid/bar 长度件）。无 extent part 的族：device 族（`symbols/device/common.ts:68-73` `createDeviceSymbol` → body/rotor/core/blades，**无 extent part**）、gauge（instrument，无 liquid/bar）、sensor-control 族。**有** extent part 的族（width/height 已路由到 liquid/bar）：level/thermometer（`liquid`→extent）+ progress（`bar`→extent，`symbols/instrument/progress.ts:58`）。无 extent 或专属 resize hook 的族 → width/height 变更经 applyProps 时 `parts.extent === undefined` 短路，既不进 EXTENT 分支也不进 BODY_FIELDS（`composite.ts:28` 不含 width/height）→ **静默丢弃**，body 子形状几何永不更新。0653-3 B2 已修 line/arrow/pipe（points-based 形从 width/height 重算 points），复合族未修。
- **open P2-7 已确认 live（`symbols/base-shapes/video.ts:35-36`）**：create 内 `attrs.stroke = '#4b5563'; attrs.strokeWidth = 1;` **无条件覆盖**，与上方 `:34` guarded `if (attrs.fill === undefined) attrs.fill = SCADA_VIDEO_PLACEHOLDER;` 不对称 → author 声明的 stroke/strokeWidth 被 create 静默丢弃。
- **open P2-8 已确认 live（`symbols/pipe/pipe-junction.ts:85`）**：stub `Line` 构造 `strokeWidth: 4` **硬编码**，不从 `props.strokeWidth` 派生；applyProps（`:102-115`）仅路由 flow/dash/dashOffset 到 stubs，**不路由 strokeWidth** → strokeWidth 变更（binding 或 diff）加粗 body（`createCompositeGroup` 经 `applyCompositeProps` 路由 strokeWidth→body，`composite.ts:68`）但 stubs 留细 4px，body/stub 粗细不一致。
- **open P2-9 已确认 live（`symbols/instrument/thermometer.ts:42 vs :78`）**：create 液柱 `y: height - 24`（`:42`），applyProps 液柱锚定 `parts.extent.set({ y: tubeHeight - 16 - props.height })`（`:78`，`-16`）。`parts.extent` 经 `composite.ts:96`（`child.name === 'liquid' → parts.extent`）确实存在（applyProps 会执行，`instrument/common.ts:43-45` 先跑 options.applyProps 再 `applyCompositeProps`）。空液位（props.height=0）首帧 binding tick：create y=height-24 → applyProps y=height-16，**8px 跳变**。sibling `level.ts:41/66` 两路径一致（create `y: height`、applyProps `y: tankHeight - props.height`，props.height=0 时不跳），thermometer 离群。
- **open P2-10 已确认 live（`engine/scada-engine.ts:252-256`）**：`getSymbolProps` 返 `leaf.node.get() as ScadaSymbolProps`——**raw leafer 属性面**（注释 :255 自认「返回 leafer 节点属性面（toNodePatch 映射后键名，如 fontSize 非 textSize）」）。写侧 `setSymbolProps`/`toNodePatch` 期望 schema 名（`textSize`/`scale`/`strokeDash`/`textColor`），读侧返回 leafer 名（`fontSize`/`scaleX`+`scaleY`/`dashPattern`/`fill`-for-textColor）→ host `getSymbol(id)` → `setSymbolProps(id, roundtrip)` 喂错键。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（2129-3 + 0746-1/2/3 收口后基线 ~696 tests / 54 files）。
- **既有单测覆盖**：`device-symbols.test.ts` / `instrument-symbols.test.ts` / `pipe-symbols.test.ts` / `media-symbols.test.ts` 已有 create-time 几何与 applyProps（rotation/fill/state）断言，但**无 width/height binding 几何响应断言**（故 P2-4 静默缺陷未被既有测试发现——属 false-green 缺口）。

## Goals

- **P2-4（复合族 resize）**：device/instrument/sensor-control 11 symbols 的 width/height 变更（binding/diff）经 applyProps 产出可见几何响应（子形状重算），镜像 0653-3 B2 修复路径（断言 resize 后子形状几何改变，非仅 not.toThrow）。
- **P2-7（video stroke guard）**：`video.ts` create 的 stroke/strokeWidth 改 guarded（`if (attrs.stroke === undefined)`），author 声明不被覆盖（断言 author stroke 保留）。
- **P2-8（pipe-junction stub strokeWidth）**：stub strokeWidth 从 `props.strokeWidth ?? 4` 派生 + applyProps 路由 strokeWidth 到 stubs，body/stub 粗细一致（断言 strokeWidth 变更后 stub strokeWidth 跟随）。
- **P2-9（thermometer anchor 常量统一）**：thermometer create 与 applyProps 共用单一 `BULB_RESERVE` 常量，首帧 binding tick 不再 8px 跳变（断言 props.height=0 时 create y === applyProps y）。
- **P2-10（getSymbolProps 读写对称）**：`getSymbolProps` 返回值与 `setSymbolProps`/`toNodePatch` 的 schema 键名对称（反向映射回 schema 名，或文档化为 raw leafer attrs 去 cast——由 Phase 3 Decision 裁定），host getSymbol→setSymbolProps 往返不再喂错键（断言往返键名一致）。
- **owner doc 同步**：`design-symbols.md`（§4 复合族 resize 契约 + create/update 几何一致 + getSymbolProps 读写契约）。

## Non-Goals

- 不重做 line/arrow/pipe 的 points-based resize（0653-3 B2 已修，仅镜像其模式到复合族）。
- 不改 `compositePropSchema`/`BINDABLE_PROPERTIES` 的可绑定声明（width/height 已声明可绑定，问题是 applyProps 未路由；本 plan 让实现追上声明）。
- 不动 state/animation 联动语义（归 0900-3 plan 的 animation/binding precedence）。
- 不处理 validator 层（归 0900-1 plan）。
- 不改 leafer-ui 的 `node.get()` 实现（仅在 scada 侧做反向映射或文档化）。
- 不改动有 extent part 族（level/thermometer/progress）的 width/height 路由语义——这些族当前把 width/height binding 路由到 liquid/bar 长度件（resize 填充柱/液柱，而非容器 body），属既定几何语义（本 plan P2-4 仅修无 extent 族的零响应）。未来若需统一「width/height 应 resize 容器 body」语义，重开 Decision 经人工确认（Rule 3）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/symbols/composite.ts`（P2-4：`createCompositeGroup` per-symbol resize hook 或 `applyCompositeProps` 宽/高路由扩展）。
- `packages/flux-renderers-industrial/src/symbols/device/common.ts` + `device/{motor,pump,valve,fan}.ts`（P2-4：device 族 resize hook）。
- `packages/flux-renderers-industrial/src/symbols/instrument/common.ts` + `instrument/{gauge,level,thermometer,progress}.ts`（P2-4：instrument 族 resize hook；P2-9：thermometer 常量统一）。
- `packages/flux-renderers-industrial/src/symbols/sensor-control/*.ts`（P2-4：sensor-control 族 resize hook）。
- `packages/flux-renderers-industrial/src/symbols/base-shapes/video.ts`（P2-7：stroke guard）。
- `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`（P2-8：stub strokeWidth 派生 + applyProps 路由）。
- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（P2-10：`getSymbolProps` 反向映射 / Decision 裁定）。
- 回归 proof：5 项各带 failing-first 单测（断言几何响应/样式保留/常量一致/键名对称）。
- owner doc：`design-symbols.md`。

### Out Of Scope

- `serialization/validate.ts` / `equality.ts`（归 0900-1 plan）。
- engine lifecycle / viewport math / hooks（归 0900-3 plan）。
- 基础形状 line/arrow/pipe 主体（0653-3 B2 已修）。

## Failure Paths

| 可测场景编号                | 触发                                          | 行为                                               | 可重试 | 用户可见表现                        |
| --------------------------- | --------------------------------------------- | -------------------------------------------------- | ------ | ----------------------------------- |
| composite-resize-no-op      | motor width binding 100→200（applyProps）     | body 子形状 width 跟随到 200（非静默丢弃）         | 否     | width/height binding 产可见几何响应 |
| video-stroke-overridden     | video 声明 `stroke: '#fff'`（create）         | create 后 stroke 仍 `#fff`（非被覆盖为 `#4b5563`） | 否     | author 自定义边框保留               |
| pipe-stub-stroke-frozen     | pipe-junction strokeWidth 6→10（applyProps）  | stub strokeWidth 跟随到 10（body/stub 一致）       | 否     | strokeWidth 变更 body/stub 粗细一致 |
| thermometer-first-tick-jump | thermometer 空液位首帧 binding tick           | create y === applyProps y（无 8px 跳变）           | 否     | 首帧无视觉跳变                      |
| get-set-roundtrip-wrong-key | host `setSymbolProps(id, getSymbolProps(id))` | 往返后图元属性不变（键名对称，非喂错键）           | 否     | host 往返不 corrupt 图元            |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**——复合族 resize 是组态可见几何契约（width/height 已声明可绑定却零响应 = contract drift），读写属性对称是 host 工具链往返契约。5 项均含既有 false-green 缺口（既有测试未覆盖 width/height binding 几何响应）。failing-first Proof 先行（零响应/覆盖/跳变/喂错键场景红 → 修复绿）。

## Execution Plan

### Phase 1 - 复合族 resize（P2-4）

Status: planned
Targets: `packages/flux-renderers-industrial/src/symbols/composite.ts` + `device/` + `instrument/` + `sensor-control/`

- Item Types: `Decision | Proof | Fix`

- [ ] **Decision（resize 路由方案）**：裁定 `createCompositeGroup` 增 per-symbol `resize(width, height, parts)` hook（device/instrument/sensor-control 各族在 build 时注册：body 子形状 width/height 重算 + 旋转件/核心件相对锚点重定位），`applyCompositeProps` 对 `EXTENT_FIELDS`（width/height）在 `parts.extent` 不存在时回落到 `parts.resize?.(key, value)`（而非静默丢弃）。**拒绝**「把 width/height 加入 BODY_FIELDS 直接写 body 节点」方案（body 是 Rect，写 width/height 会改 body 但不动子形状相对布局，仍产几何不一致）。Decision 写入 `design-symbols.md` §4 + 本 plan。
- [ ] **Proof（failing-first，先于 Fix）**：`device-symbols.test.ts` / `instrument-symbols.test.ts` / `sensor-control-symbols.test.ts` 各新增 width/height applyProps 几何响应用例：构造 symbol（如 motor），engine.applyAttrs({ [id]: { width: 200 } })（或经 applyProps 直调），断言 body 子形状 width === 200（非原值）。修复前红（width 静默丢弃，body width 不变）。覆盖至少 motor/gauge/indicator 三族代表（其余按同模式，回归守护用例补齐）。
- [ ] **Fix**：`composite.ts` `CompositeParts` 增 `resize?: (key: 'width' | 'height', value: number, parts: CompositeParts) => void`；`applyCompositeProps` 的 EXTENT_FIELDS 分支改为完整 `if (EXTENT_FIELDS.has(key)) { if (parts.extent) setAttrs(parts.extent, {[key]: value}); else if (parts.resize) parts.resize(key, value, parts); continue; }`（保留 `EXTENT_FIELDS.has(key)` width/height 门禁，无 extent 时回落到 per-symbol resize hook）。各族 `build` 在 `createCompositeGroup` 返回后（或经 options）注册 resize hook：重算 body width/height + 子形状（rotor/core/blades/label）相对锚点。落地后上述 failing-first Proof 转绿。

Exit Criteria:

> 本 Phase 交付 = 复合族 width/height 变更产出可见几何响应。

- [ ] device/instrument/sensor-control 代表族 applyProps width/height 后 body 子形状几何改变（proof 断言结果值）。
- [ ] 既有 create-time 几何 + rotation/fill/state applyProps 单测不回归（既有 device/instrument/sensor-control 单测全绿）。
- [ ] 局部 typecheck 通过（CompositeParts 类型扩展无破坏）。

### Phase 2 - create/update 样式与几何一致（P2-7 + P2-8 + P2-9）

Status: planned
Targets: `packages/flux-renderers-industrial/src/symbols/base-shapes/video.ts` + `symbols/pipe/pipe-junction.ts` + `symbols/instrument/thermometer.ts`

- Item Types: `Proof | Fix`

- [ ] **Proof（failing-first，先于 Fix）**：三组用例——(a) `media-symbols.test.ts`：video 声明 `stroke: '#ffffff'`，create 后断言 node stroke === '#ffffff'（修复前红：被覆盖为 '#4b5563'）；(b) `pipe-symbols.test.ts`：pipe-junction create 后 applyProps `{ strokeWidth: 10 }`，断言 stub strokeWidth === 10（修复前红：留 4）；(c) `instrument-symbols.test.ts`：thermometer 空液位（props.height=0），create y === applyProps y（修复前红：-24 vs -16 差 8）。修复前红。
- [ ] **Fix-a（video stroke guard，P2-7）**：`video.ts:35-36` 改 `if (attrs.stroke === undefined) attrs.stroke = '#4b5563'; if (attrs.strokeWidth === undefined) attrs.strokeWidth = 1;`（对齐 :34 fill guard）。
- [ ] **Fix-b（pipe-junction stub strokeWidth，P2-8）**：`pipe-junction.ts:85` 改 `strokeWidth: props.strokeWidth ?? 4`；applyProps（`:102-115`）增 strokeWidth 路由分支：`if (props.strokeWidth !== undefined) for (const stub of state.stubs) stub.set({ strokeWidth: props.strokeWidth });`（与 flow/dash 路由并列）。
- [ ] **Fix-c（thermometer 常量统一，P2-9）**：`thermometer.ts` 新增模块级 `BULB_RESERVE` 常量（值取 create 的 `-24`，与 sibling level 的罐底锚定语义对齐——thermometer 液柱锚定感温泡顶，reserve 为泡高预留），create `y: height + BULB_RESERVE`、applyProps `y: tubeHeight + BULB_RESERVE - props.height`（两路径共用，差值消除）。注释说明 BULB_RESERVE 语义。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [ ] video author stroke/strokeWidth 保留（proof 断言节点属性值）。
- [ ] pipe-junction stub strokeWidth 跟随 props.strokeWidth（proof 断言 stub strokeWidth）。
- [ ] thermometer 空液位首帧 create y === applyProps y（proof 断言无 8px 跳变）。
- [ ] 既有 media/pipe/instrument 单测不回归。

### Phase 3 - getSymbolProps 读写对称（P2-10）

Status: planned
Targets: `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（`getSymbolProps`）+ 可能 `symbols/composite.ts`（`toNodePatch` 逆映射）

- Item Types: `Decision | Proof | Fix`

- [ ] **Decision（读返回面）**：裁定 `getSymbolProps` 经 `toNodePatch` 的**逆映射**返回 schema 名（`fontSize→textSize`、`scaleX+scaleY→scale`、`dashPattern→strokeDash`、text-node `fill→textColor`），使读返回与写期望（`setSymbolProps`/`toNodePatch`）键名对称。**拒绝**「文档化为 raw leafer attrs 去 cast」方案（host 工具链仍需手动映射，往返喂错键未根治；逆映射是 `toNodePatch` 的天然对偶，维护成本低）。Decision 写入 `design-symbols.md`（getSymbolProps 读写契约）+ `design-renderer.md` §8.3 ScadaTestHandle。
- [ ] **Proof（failing-first，先于 Fix）**：`scada-engine.test.ts` `getSymbolProps / setSymbolProps` 用例（:217）扩展：构造 text symbol（textSize/dashPattern/scale/textColor 均声明），`setSymbolProps(id, getSymbolProps(id))` 往返后 `getSymbolProps(id)` 各键值不变（键名对称，非喂错键）。修复前红（读返 fontSize/scaleX/scaleY/dashPattern/fill → 往返 setSymbolProps 不识别这些键 → 属性丢失或错位）。
- [ ] **Fix**：`scada-engine.ts:252-256` `getSymbolProps` 经一个 `fromNodeAttrs(node, definition)` 逆映射（`toNodePatch` 的逆，对齐 `symbols/symbol-factory.ts:19-42` 正向映射面）返回：`scaleX+scaleY → scale`、`dashPattern → strokeDash`、`fontSize → textSize`、`textAlign → align`、`fillStyle → fill`（base-shapes）、text-node `fill → textColor`。注意 `fill` 字段对 Text 节点正向是 `textColor→fill`、对其它节点正向是 `fillStyle→fill`，逆映射须按 `definition`/`node.tag` 区分 Text vs 非 Text 以消解 `fill` 的多对一歧义（Text 节点 fill→textColor，非 Text 节点 fill→fill 透传）。逆映射可与 `toNodePatch` 同文件定义以保持对称。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [ ] `getSymbolProps` 返回 schema 键名（textSize/scale/strokeDash/textColor），与 `setSymbolProps`/`toNodePatch` 对称（proof 断言往返不变）。
- [ ] 既有 `getSymbolProps` 消费者（test-handle、e2e 断言指南 I15.1）不回归——若 e2e 断言依赖 raw leafer 名，同步更新断言指南（owner doc）。
- [ ] 局部 typecheck 通过。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02b69d97cffecKc6Z7trHg3nNw`、R2 复核 `ses_02b64a676ffeP6lD3A62YJ5ltQ`）
- Verdict: `pass-with-minors`（R1 零 Blocker / 零 Major；R2 复核 minor-edits 未引入新 Blocker/Major）
- Rounds: 1（R1 `pass-with-minors` 即达共识门槛「零 Blocker 且零 Major」；R2 复核确认）
- Findings addressed: R1 minor（全部采纳落地）——① Current Baseline P2-4 extent 清单补 `progress.ts`（`bar`→extent，同 level/thermometer 的 `liquid`→extent，故有 extent 族 = level/thermometer/progress；无 extent 族 = device 4 + gauge + sensor-control，零响应结论仅对无 extent 族成立）；② Phase 1 Fix snippet 还原完整 `if (EXTENT_FIELDS.has(key))` 块（保留 width/height 门禁 + extent→resize 回落）；③ Phase 3 逆映射字段清单补 `textAlign→align`/`fillStyle→fill` + 标注 `fill` 多对一歧义按 `definition`/`node.tag` 区分 Text vs 非 Text；④ 新增 Non-Goal 声明有 extent 族（level/thermometer/progress）width/height 路由到长度件的既定语义不在本 plan 范围。引用准确性：R1 全部 8 引用簇（composite.ts:64-67/28/96、device/common.ts:68-73、instrument/common.ts:41-46、video.ts:34-36、pipe-junction.ts:85/102-115、thermometer.ts:42/78 + level.ts:41/66 + liquid→extent chain、scada-engine.ts:252-256）均经 live 核对零漂移；roadmap 5 项（open P2-4/7/8/9/10）均无 ✅、无与 0653-3 B2 收口项重叠。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（Minimum Rule 18）。

- [ ] P2-4：复合族（device/instrument/sensor-control）width/height applyProps 产可见几何响应。
- [ ] P2-7：video create 的 stroke/strokeWidth 不覆盖 author 声明。
- [ ] P2-8：pipe-junction stub strokeWidth 跟随 props.strokeWidth（body/stub 一致）。
- [ ] P2-9：thermometer create/applyProps 共用 BULB_RESERVE，首帧无 8px 跳变。
- [ ] P2-10：`getSymbolProps` 与 `setSymbolProps` 键名对称（往返不喂错键）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 项。
- [ ] owner doc 同步：`design-symbols.md`（复合族 resize 契约 + create/update 一致 + getSymbolProps 读写契约）、`design-renderer.md` §8.3（如 getSymbolProps 契约变化）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（归 sibling plan `2026-08-06-0900-1` validator / `2026-08-06-0900-3` engine-lifecycle 或后续 mission 节奏）。
- 复合族 resize hook 当前覆盖 device/instrument/sensor-control 代表族；若未来新增复合 symbol 带 width/height binding，按同模式注册 resize hook（非 closure 必需）。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>

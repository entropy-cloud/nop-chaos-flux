# Timeline 组件设计

> 状态：runtime（已注册于 `flux-renderers-layout`，W4b done；v2 受控当前事件已实现，plan `docs/plans/2026-08-04-2030-2-timeline-v2-controlled-current-event-plan.md`）
> v2 扩展：受控当前事件语义（value/defaultValue/valueOwnership/valueStatePath/onChange），2026-08-04 立约、2026-08-05 实现
> 扩展需求来源：ArbiterOS demo「对话时间线播放」（进度条 + Play + 当前步骤高亮）评估——静态展示已满足，播放控制需受控当前事件支持（见 §2.1 裁定）

## 1. 组件定位

- `timeline` 是按时间顺序展示事件项的 renderer。
- 它是展示型集合组件，不负责流程 owner 或步骤提交语义。
- v2 扩展后支持**受控当前事件**（value 驱动高亮 + 点击 seek），面向「now 时刻高亮」场景（对话时间线播放、审计/执行轨迹巡检），但**不内置播放引擎**（play/pause/timer/scrubber 归宿主编排，见 §2 不采纳行）。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `timeline`。
- Flux 应保留一个简单稳定的时间线 contract，不扩散为导航或 workflow owner。
- 受控当前事件四件套镜像 `steps`（W4b 同族先例：`steps-renderer.tsx` key/index 解析 + valueOwnership 三态分层）。

### Flux 决策表

> Flux 决策主语。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                             | 采纳             | 不采纳     | 理由                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ---------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 事件项展示（time/title/detail/icon/level）                       | **实现**         | —          | 核心定位；缺字段项降级渲染（hasTime/hasTitle/hasDetail 守卫，永不崩）。                                                                                                                                                                                                                                                                                                                       |
| mode/orientation/reverse 布局                                    | **实现**         | —          | 内容对齐（left/right/alternate）、横/纵、倒序显示。                                                                                                                                                                                                                                                                                                                                           |
| 受控当前事件（value/defaultValue/valueOwnership/valueStatePath） | **已实现（v2）** | —          | 当前事件高亮（`data-state="active"`）+ 播放/巡检联动。解析链与 steps 同构（key 匹配优先 → 数值索引 clamp），**渲染层兜底为 v2 新增裁定**：未匹配 → 无 active（不回退首项，与 steps 的 defaultValue→0 兜底链显式不同，见 §2.1-1）；scope 缺 `valueStatePath` 显式降级 local controlled + dev 告警。v2 落地 plan：`docs/plans/2026-08-04-2030-2-timeline-v2-controlled-current-event-plan.md`。 |
| 点击 seek（onChange 事件）                                       | **已实现（v2）** | —          | 点击事件项派发 `onChange`（payload `{ value, index, item }`）；仅 `onChange` 声明时事件项可点（`data-clickable`），否则纯展示零交互。controlled 只派发不 mutate（宿主更新 value），local/scope 自行落值（steps 同构）。v2 落地 plan 同上。                                                                                                                                                    |
| 播放引擎（play/pause/timer/scrubber 进度条拖动）                 | —                | **不采纳** | 播放/计时是宿主编排职责：timer 经宿主 `xui:imports` 连接器或 `reaction`/`data-source` 驱动 value 递增；进度展示用 `progress` renderer；可拖动 slider 归后续独立评估（当前无 `slider` renderer）。timeline 只负责「当前值 → 高亮渲染 + 点击 → 值变更请求」。                                                                                                                                   |
| 事件项模板 `item` region                                         | —                | **不采纳** | 维持首版契约：`items` 纯 value prop（无 nested regions），字段归一化已覆盖展示需求。                                                                                                                                                                                                                                                                                                          |
| 流程 owner / 提交语义                                            | —                | **不采纳** | 归属 steps/wizard（W4b 边界裁定）。timeline 无 status 派生，当前事件只做视觉高亮。                                                                                                                                                                                                                                                                                                            |
| 组件级 `api` / 远程时间线                                        | —                | **不采纳** | `items` 由表达式或 `data-source` 产出（请求下沉规则）。                                                                                                                                                                                                                                                                                                                                       |
| amis 字符串脚本事件                                              | —                | **不采纳** | `onChange: ActionSchema` 统一处理。                                                                                                                                                                                                                                                                                                                                                           |

### 2.1 关键裁定（v2 扩展实现依据）

1. **受控四件套解析（分三层表述，避免与 steps 兜底行为混淆）**：
   - **helper 层（同构可共享）**：key（`item.value` 字段）匹配优先 → 数字索引（clamp）→ 未匹配返回 -1。此层与 `steps-renderer.tsx:23-62` 的 `resolveStepIndex` 完全一致。**实现裁定（2026-08-05 落地）**：首版**不抽共享 helper**——仅 steps/timeline 两处消费者，且 steps 的 `resolveFinalIndex` 含 →0 兜底与 timeline v2 裁定不同，不值得过早抽象；timeline 在 `timeline-renderer.tsx` 本地实现 resolve（key 匹配 + clamp + 未匹配 -1），与 `resolveStepIndex` 语义同构、实现独立；第三个同族消费者出现时再提升 flux-core 共享 helper。
   - **渲染层（v2 新增裁定）**：steps 的 `resolveFinalIndex`（`steps-renderer.tsx:64-73`）在 -1 时依次兜底 `defaultValue` → 0（steps **永无「无 active」态**）；timeline v2 **不沿用该兜底**——未匹配 → 无 active（无高亮）。理由：播放/巡检场景下未命中高亮首项会产生误导。`defaultValue` 仍参与解析链（value 未命中 → defaultValue 命中 → 否则无 active），但**不回退首项**。
   - **valueOwnership 三态**：`local`（内部 state + onChange 自更新）/ `controlled`（只读 value，onChange 派发不 mutate）/ `scope`（`valueStatePath` 读写，缺路径降级 local controlled + dev 告警）——语义与 steps 完全一致（`steps-renderer.tsx:88-151`）。
2. **active 定位与 reverse 的关系**：当前事件按 `items` 逻辑顺序解析，`reverse` 仅影响渲染顺序（倒序渲染时 active 项出现在对应视觉位置），不改变 value 语义。
3. **点击 seek 的可点边界**：仅当 schema 声明 `onChange` 时事件项进入可点态（`data-clickable` + 键盘可达 Enter/Space）；未声明 `onChange` 的 timeline 保持首版纯展示契约，零行为回归。
4. **播放引擎边界（不内置）**：demo「Play + 进度条」由宿主组合——`xui:imports` 注入播放连接器（timer 递增）+ `setValue` 写 `valueStatePath` + `progress` 展示百分比；timeline 只消费 value。理由：播放是业务编排（INV-3 业务能力 → import），渲染器不承担定时器副作用。
5. **active marker 词汇**：timeline 用 `data-state="active"`（Radix 状态词汇），steps 用 `data-current`/`data-current-index`（存在性标记，`steps-renderer.tsx:214,228`）——两组件 marker 词汇不一致是既有事实，v2 不强行统一（避免 e2e 选择器漂移），实现计划阶段确认。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'timeline'`（v2 受控当前事件字段已实现：value/defaultValue/valueOwnership/valueStatePath/onChange 落地于 `schemas.ts` + `process-display-definitions.ts` + `timeline-renderer.tsx`）
- 实际归属 `@nop-chaos/flux-renderers-layout`（流程状态编排族，与 steps/wizard 同包）
- 已注册：`layout-renderer-definitions.ts`（`timelineRendererDefinition`），渲染器 `timeline-renderer.tsx`

## 4. schema 设计

建议正式字段（v2 含扩展字段）：

```ts
interface TimelineItemSchema extends SchemaObject {
  /** Event key/value (falls back to index when absent). v2 新增：key 匹配枢纽。 */
  value?: string | number;
  /** Timestamp/label shown beside the event. */
  time?: string;
  /** Event title. */
  title?: string;
  /** Event detail/body text. */
  detail?: string;
  /** Lucide icon name rendered in the event marker. */
  icon?: string;
  /** Semantic level driving the marker color. */
  level?: TimelineItemLevel;
}

interface TimelineSchema extends BaseSchema {
  type: 'timeline';
  items: TimelineItemSchema[];
  mode?: 'left' | 'right' | 'alternate'; // 默认 left
  orientation?: 'horizontal' | 'vertical'; // 默认 vertical
  reverse?: boolean;
  // v2 受控当前事件：
  value?: string | number; // 当前事件 key/index（未匹配数字值按索引 clamp）
  defaultValue?: string | number; // value 未命中时的回退值（逐渲染参与解析链，非 seed-only）
  valueOwnership?: 'local' | 'controlled' | 'scope'; // 默认 local；scope 需 valueStatePath
  valueStatePath?: string; // scope 模式读写路径
  onChange?: ActionSchema; // 点击 seek 事件（声明后 items 可点）
}
```

> 注：`TimelineItemLevel` 含 `'error'`/`'default'`/`'primary'`（同族既有取值，先于 `variant-vocabulary.md` 的 StatusLevel 定稿）——与 StatusLevel（`info`/`success`/`warning`/`danger`）属族内既有漂移；v2 不改变该取值（`'default'` 为组件 fallback variant，`'primary'` 为 intent 非 variant）。

## 5. 字段分类

- `items`、`mode`、`orientation`、`reverse`: `value`
- `value`、`defaultValue`: `value`（受控当前事件，参与 valueOwnership 语义）
- `valueOwnership`: `value`（枚举）
- `valueStatePath`: `value`（scope 写路径）
- `onChange`: `event`

## 6. regions 与 slot 约定

- `items` 中每一项包含 `value`（可选 key，v2）、`time`、`title`、`detail`、`icon`、`level`。
- 不提供 item region（§2 不采纳行）；无 empty region（空态内置 `timeline-empty`，缺省 `t('flux.common.noData')`）。

## 7. 运行期状态归属

| State      | Ownership                  | 说明                                                                                         |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| 当前事件值 | local / controlled / scope | 三态分层（steps 同构）：local 内部 state；controlled 只读 value；scope 读写 `valueStatePath` |
| 渲染派生   | local                      | active 索引、布局（mode/orientation/reverse）均为渲染期派生，无额外 state                    |

## 8. 事件、动作与组件句柄能力

- `onChange`（v2）：点击事件项 seek。payload：`{ value, index, item }`——`value` 为该项 key（无 key 时索引）、`index` 为逻辑顺序索引、`item` 为完整事件项数据。
- controlled 模式：派发后不写值（宿主在 action 中 `setValue`）；local/scope 模式：派发后组件自行更新内部值 / 写 `valueStatePath`（steps 同构）。
- 首版无组件句柄；如未来需要外部程序化 seek，经 `component:setValue` 句柄评估（非当前范围）。

## 9. 数据源、表达式、导入能力接入点

- `items` 由表达式或 loader 产出最终时间线数组。
- `value`/`defaultValue` 可为表达式（如 `${playback.currentStep}`）。
- 播放编排（timer）经 `xui:imports` 宿主连接器注入（§2.1-4）。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-timeline` marker + `data-slot="timeline-root"`；`data-orientation`/`data-mode`/`data-reverse` 状态发布。
- 事件项：`data-slot="timeline-item"` + `data-level`；当前事件加 `data-state="active"`（强调样式：dot 放大/描边）。
- 可点态：`data-clickable`（onChange 声明时，v2 新增 marker——实现时同步登记至 `renderer-markers-and-selectors.md`）+ `tabindex` + Enter/Space 触发；聚焦态 `:focus-visible` 样式。
- 内部 region：`timeline-axis`/`timeline-dot`/`timeline-content`/`timeline-time`/`timeline-title`/`timeline-detail`/`timeline-empty`（既有，不变）。

## 11. 实现拆分建议

- item 归一化、当前值解析（key/index/clamp，可抽共享 helper 与 steps 复用）、时间点视觉 primitive 适配、详情渲染分开实现。
- 点击 seek 的键盘可达性（roving 或单 focusable 项）在实现计划阶段裁定。

## 12. 风险、取舍与后续阶段

- 主要风险是和 `steps`、`list` 混为一类，丢失时间线专有语义——受控扩展保持「只高亮、不派生状态、不承担流程」边界。
- 播放引擎（play/pause/scrubber）明确不内置（§2 不采纳行）；如多个产品复现「可拖动进度条」需求，独立评估 `slider` renderer，不并入 timeline。
- `item` region 维持不开放（首版纯 value prop）；出现模板化需求时按 region 引入流程评估。
- 扩展实现需同步：`schemas.ts`（TimelineSchema/TimelineItemSchema）+ `process-display-definitions.ts`（propContracts/fields/eventContracts）+ `timeline-renderer.tsx`（解析/派发/active 渲染）+ 单测（三态 + reverse + 未匹配降级）+ playground 演示 + e2e，并翻转本文档 §3 实现状态。

## 13. 原则审计（日期：2026-08-04，审计人：nop-app-erp agent）

### INV-1 IO 边界

- 已列出 IO：无外部 IO。items/value 经 props/data-source；播放 timer 归宿主 import（§2.1-4）。
- 例外项：无。

### INV-2 新 IO 类型

- 是否触发：否。

### INV-3 复用边界

- 当前值三态分层复用 steps 同族先例（key/index 解析 + valueOwnership 语义），不重造；播放编排经 `xui:imports`（业务能力注入）；UI 元素用 `@nop-chaos/ui`。

### INV-4 内部 state 边界

- state 清单 + ownership：当前事件值三态（§7）；渲染派生 local。事件（onChange）为投影通道；无组件句柄需求。

### INV-5 契约边界

- `(props: RendererComponentProps<TimelineSchema>) => RendererRenderOutput`；数据读 props.props；无平行协议；render 期无 scope 副作用（scope 读写仅在 valueStatePath 通道内）。

### Checklist A-G 勾选状态

- A IO 边界：✅（零 IO）
- B 复用边界：✅（steps 三态先例 + import 播放）
- C 内部 state 边界：✅（§7）
- D 契约边界：✅
- E 扩展点边界：✅（event + 三态投影；无实现细节字段）
- F 样式边界：✅（§10 marker/data-state；Widget 自样式 token 化）
- G 包结构：不适用（既有包内扩展）

### 例外与未决项

- 键盘可达性细节（聚焦模型）留实现计划裁定（非契约）。

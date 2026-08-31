# D1-2 G-B1 command-palette 渲染器原语产品化

> Plan Status: completed（2026-08-30 三 Phase 全 completed + Closure Gates 全勾 + fresh session 独立子 agent closure audit APPROVED）
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-B1 ⌘K 命令面板原语（C2 §2 预清单第 2 位，D1 第二个产品化 plan）
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-B1 行 + §2 D1 产品化输入预清单 2/6 + 回写 ⑤ P4b 实测证据 + 回写 ⑥ dialog scope 通道边界）；`docs/analysis/ui-review/P1-reference-apps/linear.md`（⌘K 交互清单）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / 样式契约 plan-first）
> Related: `docs/plans/2026-08-30-1333-2-d1-gf-option-row-primitive.md`（D1 首个产品化 plan，同批先例：契约形态/先红后绿/owner-doc 模式）；`docs/plans/2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md`（G-B1 组装成本证据来源）
> 执行顺序约束：本计划先于同批 `2026-08-30-1737-2-d1-ga-page-template-semantic-components.md` 执行（两计划先后触碰 `flux-renderers-basic` 定义登记文件，顺序执行消除冲突面）

## Purpose

把 C2 裁决为 **G-B1（⌘K 命令面板原语，L3，C2 §2 预清单第 2 位）** 的缺口产品化：为 `ui` 包已有的 cmdk 底座补上 renderer type 包装，使命令面板（搜索过滤 + 分组清单 + 键盘选择 + 命令执行 + 面板即关）成为 schema 可表达、事件/句柄契约承载的原语，消解 P4b 实测的「schema 级组装成本」与「手感缺口」（无焦点指针/键盘选择/内建过滤/面板即关）。

## Current Baseline

- **C2 裁决与证据链（live 文档核对 2026-08-30）**：
  - 初版裁决表 G-B1 行：**L3**（级别锚定以此为准；回写 ⑤ 标题标注「（L4）」为 C2 侧标注漂移，回写 ⑩ 时顺带登记），证据 = C1-2、R1§2.4；裁决理由「ui `command` 模块已有底座、无 renderer type」。
  - 回写 ⑤（P4b Linear 实测）：过滤可达（dialog 继承页面 scope + 裸 `input-text` 每键入 scope.update + loop `items` 绑 `ARRAYFILTER+CONTAINS+LOWER` 公式内联过滤）；执行可达（条目 onClick 按 `when` 门控分流 navigate/openDialog/ajax/静态面板）；**手感缺口维持**——无焦点指针/键盘选择/模糊搜索/最近使用排序，动作类命令呼出的浮层与面板堆叠（Esc 逐层退出）非原版「面板即关」；`ui command` 模块仍无 renderer type 包装，schema 级组装成本即为缺口本体。
  - 回写 ⑥（P5b）：dialog 内裸 input 写 dialog 子 scope 自有 store、页面级 data-source `dependsOn` 观察不到——P4b ⌘K 的 reactive 面仅限同 scope 内 loop/表达式绑定。跨树生效须 `setValue` 落页面 scope。
- **ui 底座在库（live 实测 2026-08-30）**：`packages/ui/src/components/ui/command.tsx`（173 行）导出 `Command/CommandDialog/CommandInput/CommandList/CommandEmpty/CommandGroup/CommandItem/CommandShortcut/CommandSeparator` 九件（:163-172），底座为 cmdk `^1.0.0`（`packages/ui/package.json`）；`CommandItem` 已内建 `data-selected` 样式消费与 disabled 语义（:139）；`packages/ui/src/index.ts:16` 全量导出。cmdk 内建 ↑↓/Enter/Esc 键盘选择、内建过滤评分、焦点指针——**包装即得，无需 G-B2 框架**。
- **registry 零覆盖（live 实测 2026-08-30）**：14 个 renderer 包 definitions 中 `type: 'command*'` / palette 零命中——无 renderer type。
- **P4b 组装成本样本（live 实测 2026-08-30）**：`apps/playground/src/complex-pages/page-schemas/linear-issues.json`——`linear-issues-cmdk` 以 `openDialog` action 内联 body 组装：`input-text`（cmdkQuery）+ `loop`（ARRAYFILTER 内联过滤分组）+ `flex` 行（onClick `when` 分流 `$slot.item.href`）；触发靠按钮 `onClick`（`linear-issues-cmdk-trigger`/`linear-issues-cmdk-button`），无键位呼出。e2e 锁定：`tests/e2e/linear-replica-interactions.spec.ts`（过滤三态/执行分流/浮层堆叠）。
- **surface 契约先例（live 实测 2026-08-30）**：`packages/flux-renderers-basic/src/surface-renderer-definitions.ts`——`dialogRendererDefinition`（:146）/`drawerRendererDefinition`（:196）共用 `surfaceEventContracts`（onOpen/onClose/onConfirm，payload `{surfaceId, kind, open}`，:5-43）、`surfaceHandleCapabilityContracts`（open/close/toggle 句柄，`open` prop 外控时 no-op `{ok,skipped}`，:125-144）、`sharedSurfaceFields`（open/defaultOpen/statusPath/container/closeOnEsc/showMask 等，:98-123）。命令面板即 overlay surface，可直接复用该契约族。
- **G-B2 边界**：焦点管理框架（roving/chord/焦点环漫游）归 G-B2（option-row plan Non-Goals 既有落字）；修饰键范围选择与全局键位注册中心同属 G-B2（C2 初版 G-B2 行 + 回写 ⑤ 口径）——以上统归 G-B2（L4，flux-core 保护区域流程）；本原语只消费 cmdk 内建键盘语义，不建框架。
- **门禁与保护区域（live 实测）**：`scripts/check-renderer-definition-fields-only.mjs` 在库（`fields`+`propContracts` 双侧登记先例见 option-row plan Decision 1）；`check:audit-event-dispatch-ctx` 覆盖 14 个 renderer 包；Protected Areas——renderer 定义字段 **plan-first**（owner evidence = `docs/references/renderer-interfaces.md` 对齐）、样式契约 **plan-first**。本计划不新增 `packages/ui` 导出（ui 侧零改动），不触发 `ui/src/index.ts` ask-first 门禁。
- **基线命令现状**：ui-review 分支 full-green 基线（2026-08-30 P7b/D1-GF closure 记录：typecheck/build/lint 37/37、test 68/68、check exit 0 零新增红）——本计划启动时按惯例 live 复核。

## Goals

- **契约落地**：`command-palette` renderer type 契约定形并落字（type 名与包归属、schema 字段族、items 数据双轨、命令执行事件/句柄契约、开合语义、marker/data-slot 输出——候选集 Phase 1 Decision 裁定），沿「surface 契约族复用 + 语义字段 + marker 输出」契约。
- **核心原语实现**：renderer 包装 `@nop-chaos/ui` Command 组件族，消解 P4b 手感缺口：键盘选择/焦点指针（cmdk 内建）、内建过滤（含 shouldFilter 外置候选）、面板即关（命令执行后自动关闭）、空态（`CommandEmpty` 语义）。
- **命令执行契约**：条目 → 动作的双轨承载（Phase 1 裁定候选：静态 `items` 内联 action schema / 统一 `onCommand` 事件 payload 驱动 schema 动作链）至少一轨落地并有先红后绿证明。
- **owner docs 对齐**：`docs/references/renderer-interfaces.md`（Protected Areas 要求的对齐证据）+ flux-guide schema 作者条目；`docs/architecture/styling-system.md` 核查（marker 约定若需补充则同步）。
- 全量验证 full-green + `pnpm check` 零新增红。

## Non-Goals

- **不做 G-B2 键盘导航框架**：chord 序列（G-then-X）、roving 焦点环、修饰键范围选择、全局键位注册中心均归 G-B2；若 Phase 1 裁定采纳 palette 级 `hotkey` 单键位呼出（如 `mod+k`），也仅限 renderer 局部 window keydown 监听 + 卸载清理，不建框架、不做键位冲突仲裁——边界 Phase 1 落字。
- **不做最近使用排序/自定义模糊评分**：cmdk 内建过滤评分直接采纳；自定义 ranking（最近使用/频率）登记 Follow-up。
- **不 retrofit P4b linear 复刻页**：`linear-issues.json` ⌘K 组装页为历史 plan 产物，维持原样；palette 化改造登记 Follow-up。
- **不做跨页 palette 单例/命令注册中心**：app 级 shell 集成（全局唯一 palette、跨页命令注册）归后续 runtime/页面壳层能力候选。
- **不做 D1 其余候选**：G-A 页面模板、G-B2 键盘框架、G-B3/G-C/G-D 语义件族按 C2 §2 排序由后续独立 plan 承载。

## Scope

### In Scope

- 新 renderer type 落点（Phase 1 裁定，候选包与文件以裁定为准；主候选：`packages/flux-renderers-basic/src/`（dialog/drawer surface 家族先例，`surface-renderer-definitions.ts` 共享契约直接复用）；备选：`packages/flux-renderers-layout/src/`（app-level actions 定位））
- 该包 renderer 定义登记（definitions 文件 + `register*Renderers` 导出）与 `__tests__/` 先红后绿单测
- `docs/references/renderer-interfaces.md`、`docs/architecture/styling-system.md`（核查制）、`flux-guide/`（schema 作者条目）、`docs/analysis/ui-review/C2-capability-gaps.md`（回写 ⑩）

### Out Of Scope

- `packages/ui/src/`（Command 组件族零改动；若实测发现 ui 组件缺口，按 Protected Areas 停止并重开 plan）
- `packages/flux-core/src/`（编译器/scope 求值内核）
- G-B2 键盘框架、G-A 页面模板、playground 复刻页 retrofit、D1 其余候选

## Failure Paths

| 可测场景编号         | 触发                                             | 行为（含契约语义）                                                                              | 可重试 | 用户可见表现                       |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| palette-empty        | source 为空 / 过滤无命中 / 端点失败              | 空态承载（`CommandEmpty` 语义 + schema 可定制文案），不抛错中断渲染                             | 是     | 面板内显示空态文案                 |
| palette-command-fail | 命令执行 action 链失败/被 when 门控拒绝          | 关闭时机与失败语义 Phase 1 裁定并落字（候选：先关后派发为默认，派发失败走既有 action 错误约定） | 否     | 面板按裁定行为关闭/保持 + 错误反馈 |
| palette-open-clash   | `open` prop 外控与句柄 `component:open` 同时使用 | 沿 dialog 既有语义：外控优先，句柄 no-op `{ok:true, skipped:true}`                              | 否     | 面板状态随外控值                   |
| palette-esc-close    | Esc / 外部点击                                   | 沿 surface 既有 closeOnEsc/closeOnOutsideClick 契约                                             | 否     | 面板关闭 + onClose 事件派发        |
| palette-item-invalid | item 缺 label/缺 id 或 payload 求值失败          | 兜底渲染（缺 label 回退 id/空串），不中断清单渲染；payload 求值失败走既有 renderer 错误约定     | 否     | 该条目降级显示，其余条目正常       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（新公共契约面 + 核心回归路径；AGENTS.md Test Strategy Tiers「Must automate」——renderer type 与事件/句柄契约是 schema 公共契约，且 Protected Areas 要求 owner-doc 对齐）。对应 Proof 项先于 Fix：Phase 1 产出契约断言清单（开合矩阵 + items 双轨矩阵 + 键盘/空态行为清单），Phase 2 按「先红后绿」实现。消费面断言含：open prop/句柄/事件驱动开合、items 静态与 source 双轨渲染、过滤（内建 + 外置候选按裁定）、键盘选择语义（cmdk 包装暴露）、onCommand 载荷、面板即关、空态、Esc 关闭。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2 全部依赖其断言清单）；Phase 3 文档与回写收口。

### Phase 1 - 契约设计与边界裁定

Status: completed
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [x] Proof——消费面 inventory 实测落字：ui Command 组件族 props/capabilities 逐项登记（cmdk 内建键盘/过滤/焦点语义的包装暴露面）、surface 契约族复用面（events/handles/fields 逐项取舍）、P4b 组装样本与手感缺口的逐项消解映射（以回写 ⑤ 为底稿 live 复核）——见下方「Phase 1 裁定记录 §Proof」
- [x] Decision——type 名与包归属裁定——见下方「Phase 1 裁定记录 §Decision 1」
- [x] Decision——schema 字段族裁定——见下方「Phase 1 裁定记录 §Decision 2」
- [x] Decision——命令执行契约裁定——见下方「Phase 1 裁定记录 §Decision 3」
- [x] Decision——键位呼出裁定——见下方「Phase 1 裁定记录 §Decision 4」
- [x] Decision——移动端/触摸形态裁定——见下方「Phase 1 裁定记录 §Decision 5」

#### Phase 1 裁定记录（执行时落字，2026-08-30）

**Proof——消费面 inventory 实测（live 复核 2026-08-30，以回写 ⑤ 为底稿）**：

| 消费面                                                                                                    | live 实测现状（HEAD）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 本原语取用                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ui Command 组件族（`packages/ui/src/components/ui/command.tsx`，173 行）                                  | 九件全量导出（`packages/ui/src/index.ts:16` `export *`）：`Command`（cmdk `CommandPrimitive` 直通，接收 `shouldFilter` 等全部 cmdk props）/`CommandDialog`（= Dialog + sr-only DialogTitle/Description + DialogContent，`open`/`onOpenChange`/`containerElement`/`noOverlay`/`closeOnOutsideClick` 经 `...props` 透传 Dialog Root；title/description a11y 默认；showCloseButton 默认 false）/`CommandInput`（placeholder 透传）/`CommandList`/`CommandEmpty`（cmdk 无匹配时才渲染）/`CommandGroup`（`heading` prop → `[cmdk-group-heading]`）/`CommandItem`（`value`/`disabled`/`onSelect` 透传，`data-selected` 焦点指针样式已内建消费 ：139）/`CommandShortcut`/`CommandSeparator` | 包装暴露面足够，零 ui 改动。cmdk 内建语义包装即得：↑↓/Enter/Esc 键盘选择、过滤评分、焦点指针（`data-selected`）、空组自动隐藏、空态承载                                                                                                                                                                                                                                                                     |
| `CommandDialog` 直用限制                                                                                  | `CommandDialog` 的 `...props` 全部落 Dialog Root（base-ui `DialogPrimitive.Root`），不落 DialogContent popup——`data-testid`/`data-cid` 无法经它挂到可见面板上                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 组合式使用：`CommandDialog`（承载 open/onOpenChange/containerElement/noOverlay/closeOnOutsideClick + a11y title/description）+ 内层 `Command` 元素挂 `nop-command-palette` marker、`data-testid`、`data-cid`、`shouldFilter`                                                                                                                                                                                |
| surface 契约族（`surface-renderer-definitions.ts`）                                                       | `surfaceEventContracts`（onOpen/onClose payload `{surfaceId,kind,open}`，:5-43）；`surfaceHandleCapabilityContracts`（open/close/toggle，外控 no-op `{ok:true,skipped:true}` 语义由 `flux-runtime` `createSurfaceComponentHandle` 承载，kind 字面量联合 `'dialog'\|'drawer'`）；`sharedSurfaceFields`（:98-123）                                                                                                                                                                                                                                                                                                                                                                     | events/handles/fields 三侧**契约级复用**（取舍见 Decision 1/2）；**运行时面不复用 SurfaceRuntime 栈**——`SurfaceRuntime.open` 的 `kind` 联合与 `DialogHost` 渲染分派均仅认 `dialog\|drawer\|sheet`，新增 kind 须改 flux-core 类型 + flux-react DialogHost（前者 Out Of Scope）；palette 改为 renderer 内自渲染（CommandDialog 组合），开合矩阵语义（外控优先/句柄 no-op/Esc/外部点击）在本包内以等价实现落地 |
| P4b 组装样本（`linear-issues.json` `linear-issues-cmdk`，e2e `linear-replica-interactions.spec.ts` 锁定） | openDialog 内联 body 组装：裸 `input-text`（cmdkQuery，每键入 scope.update）+ 嵌套 loop（`ARRAYFILTER+CONTAINS+LOWER` 内联过滤）+ flex 行（onClick `when` 门控分流）；触发靠按钮 onClick；无键盘选择/焦点指针/面板即关/键位呼出                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 手感缺口逐项消解映射：键盘选择/焦点指针 → cmdk 内建（包装即得）；内建过滤 → cmdk filter（`shouldFilter:false` 时保留 P4b 外置公式过滤姿势）；面板即关 → 执行后先关后派发（Decision 3）；键位呼出 → `hotkey` prop（Decision 4）；模糊搜索/最近使用排序 → cmdk 内建评分采纳 / 未纳入项登记 successor（Non-Goals）                                                                                             |

**Decision 1——type 名与包归属**：候选 ① 采纳——`command-palette` 落 `packages/flux-renderers-basic/src/command-palette.tsx`（renderer 组件）+ `surface-renderer-definitions.ts` 追加 `commandPaletteRendererDefinition`（`surfaceEventContracts` 的 onOpen/onClose 条目、`surfaceHandleCapabilityContracts`、surface 字段族**同包模块私有限制下零成本直用**）；登记进 `basic-renderer-definitions.ts` 数组与 `registerBasicRenderers` 导出链。`category: 'layout'`（dialog/drawer surface 家族先例）、`sourcePackage: '@nop-chaos/flux-renderers-basic'`、`displayName: 'Command Palette'`、`defaultSchema: { type: 'command-palette', items: [] }`。否决候选 ② `flux-renderers-layout`：共享契约在本包模块私有，落 layout 需先导出/抽共享模块（纯搬运零语义增量），且本计划与同批 G-A plan 的执行顺序约束（先后触碰本包定义登记文件）已按落 basic 前提写入两 plan。运行时句柄（`component:open/close/toggle` 的 no-op/外控跳过语义）在本包内建 `useCommandPaletteHandle` 等价实现（handle `type: 'command-palette'`），不改 flux-runtime `createSurfaceComponentHandle` 的 kind 联合——契约描述层复用 `surfaceHandleCapabilityContracts` 原文，运行时行为逐条对齐（含 `{ok:true,skipped:true}`）。`check-renderer-definition-fields-only` 门禁：`fields`+`propContracts` 双侧登记（同 option-row Decision 1 实测口径：门禁守 legacy `regions:[...]` 模式，新双侧登记零红）；`ui/src/index.ts` 零改动（Command 组件族已在导出面，:16），ask-first 门禁未触发。

**Decision 2——schema 字段族**（逐字段断言口径）：

- 静态双轨：`items?: SchemaValue`（扁平条目数组；条目可带 `group` 字符串——按首次出现顺序聚类、组名作 heading；无 `group` 的条目不挂 heading 直接列）+ `groups?: SchemaValue`（显式分组 `[{ label?, items }]`，`label` 作组 heading）。两者并存时 `groups` 段先渲染、扁平 `items` 段后渲染（断言口径：两段共存矩阵）。两者皆缺/空 → 空态。条目形态：`{ id?, label?, description?, shortcut?, group?, icon?, disabled?, action? }`（`id` 缺省回退合成键 `item-${index}`；`label` 缺省回退 `id` 再回退空串——Failure Path `palette-item-invalid` 兜底渲染；`icon` 为 lucide 图标名，经 `@nop-chaos/ui` `resolveLucideIcon` 解析；`shortcut` 渲染 `CommandShortcut`；`disabled` 支持布尔表达式，cmdk 跳过选中 + 点击 no-op）。
- 动态轨：`source?: SchemaValue`（`kind:'prop'` + `allowSource: true`——chart/crud 同款双侧登记先例；接受 `SourceSchema`（flux-react source-prop 控制器自动取数回流 `props.props.source`）或表达式/数组）。合并口径：静态 `groups`+`items` 段恒渲染，`source` 就绪条目**追加**为其后无 heading 的隐式段；加载中/空/失败 → 空态承载（Failure Path `palette-empty`），不抛错中断。
- 搜索语义（嵌套 `search` 对象否决）：拆平铺两字段——`placeholder?: string`（默认 `t('flux.common.search')`，`@nop-chaos/flux-i18n`）+ `shouldFilter?: boolean`（默认 true = cmdk 内建过滤；false = 外置过滤候选，条目集全由 schema 表达式驱动——P4b `ARRAYFILTER` 姿势的官方通道）。否决嵌套理由：`fields[]`/`propContracts` 双侧登记与 `check-schema-prop-coverage` 门禁均按字段粒度，平铺与 button/tabs 既有字段惯例一致。
- 空态文案：`emptyText?: string`（默认 `t('flux.common.noResults')`），承载 `CommandEmpty`（cmdk 仅在过滤/数据无命中时渲染）。
- 开合字段沿 `sharedSurfaceFields` 取舍——**采纳**：`open`（外控，优先级最高）、`defaultOpen`、`statusPath`（经 `useStatusPathPublication` 发布 `{id, kind:'command-palette', open}` 摘要）、`container`（经 `resolveContainerElement` 解析 portal 容器，缺省页面 `modalContainer`）、`closeOnEsc`（默认 true）、`closeOnOutsideClick`（默认 true）、`showMask`（默认 true）、事件 `onOpen`/`onClose`（payload `{surfaceId, kind:'command-palette', open}` 原样复用）。**不采纳**（契约面诚实性记录）：`title`/`body`/`actions`/`header`/`footer` regions（palette 内容由命令条目承载，非自由 body 面；a11y 标题由 CommandDialog 内建 sr-only 标题承载）、`data`/`isolate`（palette 常驻页面树内自渲染，不建 surface 子 scope——条目/派发上下文即 owner 节点 scope，天然继承页面数据）、`size`/`width`/`height`（CommandDialog 固定 popover 几何）、`showCloseButton`（palette 以 Esc/外部点击/执行关，Linear 无 X 钮先例）、`confirm`、`*ClassName` 族（`className` 走 BaseSchema 通用通道落 CommandDialog className）。

**Decision 3——命令执行契约**：候选 ③ 双轨并存采纳。

- 事件轨（idiomatic 数据驱动通道）：`onCommand` event contract，payload `{ id: string, item: unknown, groupId: string }`（`id` = 条目 id/合成键；`item` = 条目原始数据对象；`groupId` = 所属组 heading，无组为空串）；派发 ctx 按 CX-10 约定 `{ event: {...payload, type:'custom'}, evaluationBindings: payload, scope: node.scope }`——动作 args 模板（`${id}`/`${item.href}`）可解析。静态/动态轨条目执行**恒派发**。
- 静态轨（声明式通道）：条目级 `action?: ActionSchema | ActionSchema[]`，经 `helpers.dispatch(action, 同上 ctx)` 派发（args 模板在派发时求值）。`action` 与 `onCommand` 并存时**两通道均执行**（作者显式声明的组合，静态轨在前）。
- 关闭时机（面板即关，Failure Path `palette-command-fail` 终态）：执行序列 = 选中 → 计算 payload → **先关面板**（内部 open=false，经统一 onOpenChange 路径 → onClose 事件派发）→ 再 `item.action` 派发 → 再 `onCommand` 事件。先关后派发的安全性注记：palette 不走 SurfaceRuntime 条目栈，renderer 组件关面板后**保持挂载**（dialog surface 条目则会被移除），派发上下文（node scope/helpers）在派发时仍存活。派发失败走既有 action 错误约定（host `onActionError`/notify 通道），面板不回滚重开。
- 兜底（Failure Path `palette-item-invalid` 终态）：条目缺 `label` 回退 `id` 再回退空串；缺 `id` 用合成键 `item-${index}`；条目数据非对象跳过渲染；payload 计算零额外求值（条目即已解析 prop 数据），不中断清单渲染。

**Decision 4——键位呼出**：候选 ② 采纳——palette 级 `hotkey?: string` 单键位 prop（格式 `"mod+k"`；`mod` = metaKey‖ctrlKey，另支持 `ctrl`/`shift`/`alt` 修饰与单主键）。实现面：renderer 局部 `window` keydown 监听 + 组件卸载清理 + `preventDefault()`；命中即走统一 open 通道（等价句柄 open）。**受控 palette（声明 `open` prop）下 hotkey no-op**（dev warn 一次）——外控优先原则与 Failure Path `palette-open-clash` 同一口径：open 通道归作者表达式所有；且不做 `templateNode.schema` 回读（`find-runtime-raw-schema-reads` 门禁零新增红）。**G-B2 边界落字**：chord 序列、roving 焦点环、修饰键范围选择、全局键位注册中心、多键位/冲突仲裁均归 G-B2（L4）；本 prop 仅是单 palette 实例的局部呼出便利，不构成全局键位能力。

**Decision 5——移动端/触摸形态**：v1 维持 dialog 形态（CommandDialog 组合：顶部 1/3 居中 popover、遮罩点击关、Esc 关——触摸语义由 ui Dialog 内建承载）。不降级 drawer/bottom-sheet：palette 为键盘优先原语，P4b/分析篇无移动端 palette 形态对照证据，不发明形态；移动端 bottom-sheet 适配登记 Non-Blocking Follow-up。

**契约断言清单（Phase 2 先红后绿依据）**：

1. 开合矩阵：`defaultOpen` 初开 / `open` 外控驱动开与关（外控值优先）/ 句柄 `component:open`·`close`·`toggle`（未外控生效；已开 open → skipped / 已关 close → skipped）/ `open` 外控 + 句柄并存 → 句柄 no-op `{ok:true,skipped:true}` / Esc 关（`closeOnEsc:false` 抑制）/ 外部点击关（`closeOnOutsideClick:false` 抑制）/ 关闭派发 onClose、开启派发 onOpen（payload `{surfaceId, kind, open}` 可经 `evaluationBindings` 在 action args 解析 `${surfaceId}`）/ `statusPath` 发布 open 摘要 / `container` portal 容器解析 / `hotkey` 呼出（未外控）/ `hotkey` 受控 no-op + dev warn / 非法 `hotkey` 串 dev warn 且不挂监听。
2. items 双轨矩阵：扁平 `items` 渲染 / 条目 `group` 聚类 heading / `groups` 显式分段（label heading）/ `groups`+`items` 并存（groups 段在前）/ 全空 → `emptyText` 空态（默认文案与自定义文案两态）/ `source` 就绪追加渲染（SourceSchema 与表达式两形态）/ `source` 加载中 → 空态不抛错 / 条目 `description`/`shortcut`/`icon` 呈现 / `disabled` 条目渲染带 data-disabled / 缺 label 条目回退渲染不中断。
3. 键盘/过滤/执行清单：输入查询 → cmdk 内建过滤收窄（命中保留、无命中 → 空态、清空恢复）/ `shouldFilter:false` 查询不过滤（外置候选姿势）/ ArrowDown 移动 `data-selected` 焦点指针 / Enter 执行选中条目 / 点击执行条目 / `disabled` 条目键盘跳过、点击不执行 / 执行后面板即关（先关后派发：onClose 先于 onCommand）/ `item.action` 派发（args `${id}`/`${item.*}` 解析）/ `onCommand` 派发（payload `{id,item,groupId}`）/ 双轨并存两通道均执行（静态轨在前）。

Exit Criteria:

- [x] 五项 Decision 与一项 Proof（消费面 inventory）全部落字本计划（契约断言清单可清单化：开合矩阵 + items 双轨矩阵 + 键盘/空态行为清单——见上「契约断言清单」）
- [x] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位——§Command Palette Surface Contract）
- [x] 若裁定触及 `packages/ui` 公共导出或 flux-core：ask-first/停止门禁已落字且未在门禁前改码（裁定：均不触及——ui Command 组件族已在 `ui/src/index.ts:16` 全量导出面；SurfaceRuntime/DialogHost 不扩展新 kind，flux-core 零改动；见 Decision 1）

### Phase 2 - 核心原语实现（先红后绿）

Status: completed
Targets: Phase 1 裁定落点的 renderer 文件、定义登记文件、`register*Renderers`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——契约断言清单测试先行（红）：开合矩阵 + items 双轨矩阵 + onCommand 载荷 + 面板即关 + 空态 + Esc 关闭用例（2026-08-30 实测：`command-palette.test.tsx` + `command-palette-items-execute.test.tsx` 共 31 用例，实现前 28 红——1 条为未知 type 渲染空的平凡通过，实现后全绿）
- [x] Fix——renderer 按裁定契约实现（ui Command 组件族包装 + surface 契约接线 + marker/data-slot 输出 + Failure Paths 兜底）——`packages/flux-renderers-basic/src/command-palette.tsx`（终态 494 行 ≤500 WARN 线）
- [x] Fix——定义登记（definitions 文件 + `register*Renderers` 导出 + `fields`/`propContracts`/`eventContracts`/`componentCapabilityContracts` 双侧登记，`check-renderer-definition-fields-only` 门禁零红）

#### Phase 2 实现记录（执行时落字，2026-08-30）

落点与登记：`command-palette.tsx`（renderer）+ `surface-renderer-definitions.ts` 追加 `commandPaletteRendererDefinition`（复用 `surfaceEventContracts.onOpen/onClose` 条目、`surfaceHandleCapabilityContracts` 原文、`booleanPropContract`/`stringPropContract` helper）+ `basic-renderer-definitions.ts` 数组登记 + `index.tsx` 导出 `CommandPaletteRenderer`。marker 输出：面板 `Command` 根挂 `nop-command-palette` + `data-testid` + `data-cid`；内部区域用 ui `data-slot="command*"` 与 cmdk `data-selected`/`aria-selected`（styling contract 的 widget 自样式面）。

执行期三项契约级发现（已回写上方 Phase 1 裁定记录口径，此处为落地证据）：

1. **受控 `open` 的编译期路径捕获**（Decision 2/3 的落地机制）：`SchemaFieldRule.compile`（FieldCompileFn，flux-core 既有扩展点，此前 flux-renderers 包内无使用先例）在编译期把 `open` 值包装为 `{kind:'command-palette-open', path, value}` 复合载体——简单 `${path}` 表达式记录 scope path 供用户关闭时写回 `false`（dialog plan-459 重开对等：latch + false→true 清 latch）；复合表达式/字面量布尔保持纯 latch 语义（与 dialog `extractControlledOpenPath` 口径一致）。**零 runtime 裸 schema 读取**（`find-runtime-raw-schema-reads` 门禁零新增红——既有 2 条 use-surface-renderer.ts 登记 hit 为基线，本计划未新增）。
2. **`source` 轨的 `sourceStateKey`**：`{ key:'source', kind:'prop', allowSource:true, sourceStateKey:'sourceState' }`（tree-controls `options` 同款先例）。缺失该键时，失败的 source（loading 态与 error 态快照 shallowEqual）不触发快照变更 → 节点 props 冻结在首渲染空包上（defaultOpen 丢失、面板不出现）；补上后 loading→error 态迁移驱动重渲染，空态兜底成立（`palette-empty` 失败路径实测闭合）。
3. **`CommandList` 是 cmdk 键盘/空态语义的承载前提**：cmdk 的初始选中、↑↓/Enter、`CommandEmpty` 渲染、空组隐藏全部依赖 List 容器（listInnerRef）；ui 九件必须以 `CommandDialog > Command > CommandInput + CommandList > (groups/items + CommandEmpty)` 组合使用，条目逃出 List 则键盘选择与空态全数失效（红测实测发现）。

测试面注记（供后续维护）：模态 Dialog 打开期间 base-ui 将外部内容从可访问性树摘除，页面级触发按钮须以 `getByTestId` 寻址（a11y role 查询不可见）；cmdk 初始选中项在 jsdom 类环境下非确定性（依赖条目注册时序），键盘用例先按 `aria-selected` 读初值或先过滤到确定集再断言。

Exit Criteria:

- [x] 先红后绿单测全绿（Phase 1 断言清单全项覆盖——31 条用例：定义契约 1 + 开合矩阵 13 + items 双轨矩阵 8 + 过滤/键盘/空态 5 + 执行契约 4）
- [x] 落点包局部 typecheck/test 通过（`pnpm --filter @nop-chaos/flux-renderers-basic typecheck && pnpm --filter @nop-chaos/flux-renderers-basic test`——55 文件 537 用例全绿；全仓 `pnpm typecheck` 37/37 通过）
- [x] `check-renderer-definition-fields-only` 门禁零新增红（guard passed；`check-schema-prop-coverage` Layer 2 全覆盖通过）

### Phase 3 - 文档对齐与 C2 回写

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/architecture/styling-system.md`（核查制）、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] `docs/references/renderer-interfaces.md` 契约条目终稿（与 live 行为逐项核对，区分「字段存在」与「语义落地」——§Command Palette Surface Contract：双轨 items/source+sourceStateKey 冻结修复、open 编译期写回与 latch、句柄 no-op、hotkey 边界、marker 输出、CommandList 承载前提均已按 live 实现核对落字）
- [x] flux-guide schema 作者条目（command-palette 用法样例：静态 groups/items + onCommand 动作链 + source 驱动 + 开合接线——`flux-guide/design-patterns/page-dialog-drawer.md` §8）
- [x] `docs/architecture/styling-system.md` 核查：marker/data-slot 输出约定若需补充则同步（无改动不写凑条目——核查结论：`nop-command-palette` root marker + ui `data-slot="command*"` + `data-selected`/`aria-selected` 与 widget renderer 既有规则完全兼容，零改动）
- [x] C2 回写（追加式，回写 ⑩）：G-B1 行落「已产品化（本 plan）」终态证据 + 手感缺口逐项消解终态 + 键位裁定 + 未纳入项（最近使用排序等）successor 登记 + 回写 ⑤ 标题「（L4）」标注漂移登记（级别锚定 = 初版裁决表 L3）
- [x] daily dev log 记录（`docs/logs/2026/08-30.md`「D1 G-B1 command-palette 原语执行」条目，含 full-green verification 数字）

Exit Criteria:

- [x] 三份 owner 文档落字/核查完成且与 live 行为一致（renderer-interfaces.md §Command Palette 终稿 + flux-guide §8 条目 + styling-system 核查零改动结论）
- [x] C2 回写完成（初版裁决表零改动，追加式——回写 ⑩ 落 C2 文档追加区）
- [x] daily log 已记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_fadf14cf5ffe0NwLP3rtsiEXrE`（1 轮全量四查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，4 Minor）
- Rounds: 1
- Findings addressed: 4 Minor 全部随共识修复——①Phase 1 Exit「六项 Decision」计数不实（改「五项 Decision 与一项 Proof」）；②G-B2 边界归属过宽（修饰键/全局键位改溯 C2 G-B2 行 + 回写 ⑤ 口径，roving/chord/焦点环保 option-row Non-Goals 落字）；③Decision ① 补共享 surface 契约模块私有限制（落 layout 包需先导出/抽共享模块）；④级别锚定显式化（初版裁决表 L3 为准，回写 ⑤ 标题「（L4）」标注漂移随回写 ⑩ 登记）

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [x] `command-palette` 契约已落地且 Phase 1 断言清单全项有先红后绿证明（开合矩阵 + items 双轨矩阵 + 键盘/空态行为——31 条单测，红态 28/29 failed → 全绿；closure audit checklist 2/3 Pass）
- [x] P4b 手感缺口逐项消解终态落字（键盘选择/焦点指针/内建过滤/面板即关——包装暴露即消解；未消解项显式登记 successor——C2 回写 ⑩ + plan Non-Blocking Follow-ups）
- [x] 命令执行契约（Phase 1 裁定轨）行为达成且有断言证明（双轨：onCommand payload `{id,item,groupId}` + 条目 `action`；先关后派发次序断言）
- [x] `docs/references/renderer-interfaces.md` 对齐完成（Protected Areas owner evidence）；styling-system 核查完成（零改动结论）
- [x] 无 in-scope live defect 或 contract drift 被静默降级到 deferred / follow-up（closure audit checklist 9 Pass——三项执行期发现均已修复并有测试锁定，非 deferred）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37——执行期 React Compiler manual-memoization 冲突已修）
- [x] `pnpm test`（13,182 tests / 0 failed；flux-renderers-basic 55 files/537、playground 33 files/347 含 route-matrix 36）
- [x] `pnpm check`（exit 0；oversized 194 WARN/2 ERROR/2 exempt 与 git stash 基线 before/after 完全一致，零新增命中；e2e 全套 1443 passed/1 flaky 重试通过/43 skipped）

## Non-Blocking Follow-ups

- 最近使用排序/自定义模糊评分（cmdk 内建评分之上）——palette 增强候选
- P4b linear 复刻页 ⌘K 组装段的 palette 化 retrofit（复刻页迭代时采纳）
- 跨页 palette 单例/app 级命令注册中心（runtime/页面壳层能力候选，与 P7b 回写 ⑧「筛选状态 URL 同步」同族页面壳层候选池）
- G-B2 键盘导航框架（chord/roving/修饰键/全局键位注册中心）——C2 §2 第 4 位，独立 plan

## Closure

Status Note: 2026-08-30 关闭。三 Phase 全部落地：G-B1 ⌘K command-palette 原语产品化（`command-palette` renderer type 落 flux-renderers-basic，ui Command 九件包装——静态 groups/items 双轨 + source 动态轨 + onCommand/条目 action 执行双轨 + 面板即关 + cmdk 内建键盘/过滤/空态 + surface 开合契约族复用 + `hotkey` 单键位呼出 + 编译期受控 open 路径捕获实现 dialog plan-459 重开对等；flux-core/ui 零改动）。P4b 手感缺口（无焦点指针/键盘选择/内建过滤/面板即关）逐项消解并有断言证明；31 条先红后绿单测锁定。owner docs（renderer-interfaces.md §Command Palette Surface Contract + flux-guide §8 条目 + styling-system 核查零改动）对齐；C2 回写 ⑩ 落地（append-only，初版裁决零改动）。执行期三项契约级发现（compile 期 open 捕获 / sourceStateKey 冻结修复 / CommandList 承载前提）均已修复并有测试锁定。全量验证 full-green：typecheck/build/lint 37/37、test 13,182/0 failed、check exit 0 零新增红（stash 基线双口径）、e2e 全套 1443 passed。本 plan 关闭后 roadmap D1 条目其余候选（G-A 页面模板——同批 plan `2026-08-30-1737-2` 待执行、G-B2 键盘框架、G-B3/G-C/G-D 语义件族）按 C2 §2 排序继续。

Closure Audit Evidence:

- Auditor / Agent: fresh session 独立子 agent `ses_fad67619dffeuwrWgYWwGx7CHK`（1 轮）
- Evidence: verdict **APPROVED** 零 Blocker/零 Major/零 Minor；2 Trivial（①工作树含 83 个 e2e replica 截图 PNG 二进制 diff——full-e2e 验证跑动的渲染非确定性噪声，非本 plan 产物，随收口 `git checkout` 回退还原；②dev log 前向引用 plan Closure 区——随本 Closure 落字自洽）。审计 10 项 checklist 全 Pass：plan 文本一致性 / 契约落地（buildSections 双轨、close-then-dispatch、compile 期 open 载体、句柄 no-op、hotkey no-op、空态 i18n 逐点在码核对）/ 先红后绿真实性（31 条真实行为断言）/ 验证独立复跑（flux-renderers-basic 537 绿、两门禁 exit 0、pnpm check exit 0、route-matrix 36/36）/ 下游登记 / owner docs 逐字段核对 / C2 ⑩ append-only diff 验证（0 删除行，初版 G-B1 行 L3 原样）/ scope 纪律（flux-core、ui、flux-react 零触碰）/ deferred 诚实性 / 行数 494 ≤500。

Follow-up:

- Non-blocking（与 Non-Blocking Follow-ups 区一致）：最近使用排序/自定义模糊评分（cmdk 评分之上）；P4b linear 复刻页 ⌘K 组装段 palette 化 retrofit；跨页 palette 单例/app 级命令注册中心（runtime/页面壳层候选池）；移动端 bottom-sheet 降级形态；G-B2 键盘导航框架（chord/roving/修饰键/全局键位注册中心，独立 plan）。无 confirmed live defect 遗留。

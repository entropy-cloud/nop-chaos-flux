# QA.1 线出口审计 #4 — missing-components L4（交互残留：共享底座 + 六项快赢 + docs-only）

> Auditor / Agent: 独立 fresh 子 agent（QA 线出口审计员，2026-09-26，未参与 plan 513 起草、执行、closure audit 与底座文档三轮 review）
> 审计对象: plan 513 及其工作区改动（**整批未提交**：36 modified + 9 new 文件，`git status`/`git diff` = L4 实现面）+ 底座文档 `docs/discussions/2026-09-26-l4-interaction-residual-substrate.md` 三轮 review + 底座相关登记面
> 审计输入: plan 513 文件（completed）+ 底座契约文档 + live 工作区全量 diff + 本审计 live 实跑验证输出（Fresh Context 三件套，未读执行会话历史）
> 依据: `docs/audits/00-audit-execution-guide.md`（severity 词汇 Blocker/Major/Minor；Pass = 0 Blocker 且 0 Major）；格式先例 `QA.1-L1-line-exit-audit.md` / `QA.1-L3-line-exit-audit.md`
> 审计对象裁度说明: L4 是**交互残留线**而非新 renderer type 线——交付铁律 8 项中的 design.md / example+入口 / matrix flip 项按 plan 513 Non-Goals（「无 matrix flip 项；不建新 renderer type」）裁定不适用，交付面按 plan 自身 done 定义（六实现项契约落实 + L4.10 两处 guide + 五挂起裁决 + 登记面 + 全量验证）逐项核对。
> 范围归因验真: 审计对象为工作区未提交批次，无跨 plan 提交混入问题；`git status` 全部 45 个路径逐一归因——36 modified + 9 untracked 全部属于 plan 513 九 Phase 交付面、收口簿记（plan 513/514 状态、roadmap §13、dev log、quick-reference、底座文档）或 successor 计划 515 新文件，无暗改路径（见 §1–§4 与 Observation-2）。

## 1. 交付面逐行核对（六契约裁定 vs live 实现 + L4.10 + 五裁决 + 登记）

对照 `docs/discussions/2026-09-26-l4-interaction-residual-substrate.md`（§1–§7）逐项核对：

| 项                         | 裁定                                                       | 结论 | 证据（live repo 核对）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L4.1 density               | 三档 token 阶梯 + ui table.css 档位规则 + `data-density`   | ✅   | `theme-tokens/styles.css:88-89` compact 32px / relaxed 48px（default 沿用既有 `--table-row-height: 40px` :87，无第二事实源）；`TableSchema.density`（schemas.ts:160-165）；`table-renderer.tsx:479-480` 渲染期归一（非法值 → 无属性，Failure Path density-invalid-value）+ `:513` 根元素 `data-density`（default 档不输出）；`ui/table.css:21-37` 规则属地正确——非 default 档局部覆写 `--table-row-height` + `[data-density] tbody td { height; padding-block: 0 }`（r2 M1′ 修订落实，compact 可达）；focused ×2（双档属性 + 非法回 default + 缺省零属性）+ e2e（boundingBox ±2px 命中 32/40/48，lab 三档场景在案）                                                                                                                                                                                                                                                       |
| L4.5 kanban 手势           | `keyboardReorder` 真值表 + keys 覆写 + draggable 门解耦    | ✅   | `KanbanSchema.keyboardReorder?: boolean \| { enabled?; keys? }`（kanban.types.ts:69-79）；真值表四分支逐条落实（use-kanban-board-effects.ts:78-85：undefined→draggable / false→false / true→true / 对象→`enabled !== false`），效果门 `draggable` → `keyboardActive`（:135）——缺省分支与现状逐字节等值；`keys.prev/next` 走 flux-react `parseKeyCombo`/`comboMatchesKey` 既有解析器（:89-100/:143-147，覆写生效时 Arrow 抑制），无第二套 combo 语法；keyboard.ts 增 `KEY_ALIASES`（space→" "/esc/return/plus :20-25）+ `parseKeyCombo` 内归一（:41）+ focused ×1（flux-react 521/521 实跑绿）；kanban dnd 集成 ×3（keyboard-only / false 关闭 / 覆写+Arrow 抑制，mock 改 `importOriginal` 保留真实 helper）+ e2e（draggable:false + Space 拾起 + ArrowRight 跨列，程序化断言）；缺省零回归由既有 12 个 dnd 键盘用例承载（scheduling 1038/1038 绿）                        |
| L4.7 graph 状态色          | levelMap 同一四语义级消费面加深（fill tint），禁并行色词汇 | ✅   | **零新 schema 字段、零 colorMap/colorField**；`graph styles.css:42-56` 三条既有 border 规则逐条加深 `background: color-mix(in srgb, hsl(var(--destructive/--warning/--success)) 12%, hsl(var(--card)))`（双 hsl 包装 = r3 消解的 m1′ 公式）+ 补第四语义级 `info` 规则（border+fill，plan「四语义级 border+fill 双消费」口径）；`--info` token 在库（theme-tokens :61/:141/:201）；fallback neutral = `data-level` 仅在 semanticLevel 命中时发布（graph-node.tsx:19/:30），未配置 levelField 的图保持 `--card` 平面（零回归红线）；focused ×1（四级 marker 例，graph 51/51 绿）+ e2e（tinted ≠ plain + 无 level 零回归 + 四级 getComputedStyle 断言）+ archetype B2 行 dated 销项注记（见 §3）                                                                                                                                                                             |
| L4.8 cardTemplate          | region bindings 通道 + region `params` 声明（根因两半）    | ✅   | `kanban-card.tsx:84` 位置参数 → `render({ bindings: { card, column, index } })`（类型面 kanban-card.tsx:15 / kanban-column.tsx:19 同步改 options 契约）；定义层 cardTemplate region 补 `params: ['card','column','index']`（scheduling-renderer-definitions.ts:187）——**flux-core/flux-react 零改动**（通道在库：render-fragment-types `bindings?` + node-renderer-resolved.tsx:286 `params && rawBindings` 前置条件，底座 §4 实施补记的「另半个根因」属实）；gantt-bars `render({ bindings: { task } })` 先例在案（:202）；旧位置参数调用全包唯一（grep 零残留）；focused ×1（逐卡断言 bindings 且无位置字段泄漏）+ e2e（`${$slot.card.data.title}`/`${$slot.index}` 逐卡命中，lab L4.8 场景在案）；linear 不回灌裁定 + mock 注释更新为通道事实（mock-backend-linear-issues.ts:255-268，含 L4.9 归属）                                                                   |
| L4.11a 列拖拽              | 接线 `columnSettings.draggable` 死配置 + 单写通道          | ✅   | 死配置消解 grep 可证：`table-renderer.tsx:533-534` `draggable={schemaProps.columnSettings?.draggable === true}` + `onReorder={reorderColumn}`（全包此前零消费）；`table-column-settings.tsx` inline/overlay 双形态把手（`data-slot="table-column-settings-drag-handle"` + lucide GripVerticalIcon，dataTransfer `text/nop-table-column` 局部类型）；drop → `reorderColumn` 写既有 `orderedColumnsStatePath`（use-table-visible-columns.ts:157-181，`renderScope.update` 与 moveColumn 同一写入口，后写胜出——无新 state 通道、无新 schema 字段）；未配置零把手零行为（focused ×2 第二例）+ e2e（locale 无关结构化选择器 + dragTo 重排 Email/Role/Name）；键盘等效 moveUp/moveDown 保留；i18n `flux.table.reorderColumn` zh/en 双份（:221 两文件）——原 dragColumn 与既有行拖拽键撞名（TS1117）改新键，既有键（拖拽调整行顺序 :229）不受影响。overlay 测试覆盖缺口见 Minor-2 |
| L4.11b gantt selectedClass | `GanttTaskData.selectedClass?` 字面字段（非表达式）        | ✅   | `gantt.types.ts:34-39` 字段 + JSDoc 记 optionRow 同构/字面 token 定性；`gantt-bars.tsx:183` `isSelected ? task.selectedClass : undefined` 追加（与 taskBarClassName 叠加、`cn()` 合并；`data-selected` + token CSS 不动）；focused ×1（选中 bar 带 class / 未选任务不带 / 无字段任务选中不污染——9/9 绿，既有防回归全保持）。字面 vs 表达式实施裁定已回写底座 §6（见 §3）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| L4.10 docs-only            | wizard footgun + refreshSource 姿势两处 guide              | ✅   | `flux-guide/examples/wizard-values-path.md:126` footgun 警示（缺省 false → 离开步卸载 → `form-runtime.ts` dispose 路径 `parentScope.update(valuesPath, undefined)` :290——语义逐点一致，锚点检查过）；`flux-guide/design-patterns/data-source.md:120-131` 刷新姿势节（`refreshDataSource` 按 `args.scope.id` 只查本桶无父链回退——source-registry.ts:440-457 实读证实；`findFirstInScope` 同 :477-491 注释自证；`component:refresh` + componentId 示例在案）；`check:active-doc-code-anchors` 实跑 exit 0（350 docs）                                                                                                                                                                                                                                                                                                                                                       |

**五挂起裁决核对**（底座 §0 ↔ roadmap §13 注记 ↔ 出处抽验）：L4.3 demand-gated（C2:373 实读命中「fill-handle 选区模型 = optimization candidate，successor D1」）/ L4.4 watch-only（回写⑫④+⑭①，回写⑤禁全局 keydown 注入与实现一致——全仓 hover-peek 零命中、本线零新增事件面）/ L4.11c 销项（`calendar/calendar.css:71-80` `[data-drop-target]`+`.drag-ok`/`.drag-conflict` token 规则实读在案，V11a 消费证据成立）/ L4.11d 维持 deferred（触发条件「≥2 renderer 网格键盘导航」未满足的三条证据在案）/ L4.11e demand-gated（C2:299 回写⑩命中，三 successor 无消费登记）——底座 §0 与 roadmap §13 注记逐字一致。✅

**登记面核对**：`quick-reference.md:896-906` 新增「Interaction-Surface Fields（L4 交互残留，plan 513）」节——五行（density / keyboardReorder / selectedClass / cardTemplate params / columnSettings.draggable）逐行与实现语义相符。**本项结论：六契约 + L4.10 + 五裁决 + 登记面全部按 Phase 1 design gate 落地，无偏离裁定的实现；L4 非 renderer 线裁度下交付面完整。**

## 2. 本线 diff 代码质量抽查（工作区未提交批次）

| 检查项                                  | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RendererComponentProps / hooks 契约     | ✅   | kanban-board/table-renderer 均 `RendererComponentProps<XxxSchema>` 签名；新逻辑全走标准 hooks（`useTableVisibleColumns` 扩 `reorderColumn`、`useKanbanBoardEffects` 经 options 接 `resolved.keyboardReorder`、kanban-card 经 `regions.cardTemplate.render()`）；**零 store 直连、零 ad-hoc context、零 prop 钻孔**                                                                              |
| 禁裸 HTML                               | ✅   | 本线 JSX 新增仅拖拽把手 `<span>` + lucide `GripVerticalIcon`（ui 无拖拽把手基元，span 为结构元素，aria-label/title 齐备）+ lab 页 schema 场景；其余为 hooks/CSS/schema 层                                                                                                                                                                                                                       |
| 无全局事件岛（archetype §3.6 规则 1/3） | ✅   | diff `grep addEventListener` 仅 kanban 既有 board 元素 keydown（**存量 shipped 面**重构，`closest('[data-dnd-card]')` 局部化，未新增事件面）；列拖拽全用 React 合成 DnD props（onDragStart/onDragOver/onDrop），dataTransfer 类型局部于浮层生命周期；零 window/document 直调新增                                                                                                                |
| React 19 纪律                           | ✅   | `use-kanban-board-effects.ts` 新增 `useMemo` ×2——`keyboardActive`（effect 订阅门派生）与 `moveKeys`（对象派生，memo 避免 ref 镜像 effect 每渲染重跑）+ ref 镜像为既有 pattern 延续（moveCardKeyboardRef 先例）；`reorderColumn` `useCallback` 与同文件既有 toggleColumn/moveColumn 一致（稳定回调下传）；`dragOverKey` useState 为真事件态；无 useEffect+setState 镜像反模式                    |
| oversized 纪律                          | ⚠️   | `table-renderer.tsx` 被 +6 行接线推至 **700 行整**（checker 计数；warn 档顶格，距 MUST-split 仅 1 行——本线前 694）；`schemas.ts` 由 499 跨过 500 阈值至 506（**新增 1 个 warn 档文件**）——plan/roadmap 声称「204w 与基线一致」，实跑 **205w**，见 Minor-1。其余 touched 源文件 ≤277 行；checker exit 0（仅 >700 非豁免翻红，2e = i18n locales 在册豁免），`pnpm check`「零新增红」exit 语义成立 |
| i18n 键                                 | ✅   | `flux.table.reorderColumn` zh/en 双份；`check-i18n-keys` 实跑通过；撞名收口无残留（新增面零 dragColumn 引用，既有行拖拽键语义不受影响）                                                                                                                                                                                                                                                         |
| 错误/边界路径                           | ✅   | density 非法值归 default（单测钉住）；keyboardReorder 缺省逐字节等值（缺省分支 keyboardActive ≡ draggable + 既有 12 个 dnd 键盘用例全绿）；`reorderColumn` 同键早退 + 非法键早退 + 空 dataTransfer 不写；覆写生效时 Arrow 抑制（集成测试钉住）                                                                                                                                                  |
| 测试程序化断言                          | ✅   | 5 条新 e2e 全部程序化（boundingBox/attribute/计数/文本/getComputedStyle），零 screenshot 充证；3 个新单测文件断言语义与契约逐点相符（bindings 无位置字段泄漏、真值表、死配置零把手）                                                                                                                                                                                                            |

## 3. docs↔live 一致性

| 文档声称                                                         | live 核对                                                                                                                                                                                                                                                                    | 结论 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 底座 §1 density 契约 vs 实现                                     | token 阶梯/ui 规则属地/`data-density` 消费面/非法回 default 全部一致；唯「归一化在 schema props 解析层做」措辞与实况（table-renderer 渲染期派生）定位不同——行为与 Failure Path 一致且有单测（Observation-1）                                                                 | ✅   |
| 底座 §2 kanban / §3 graph 契约 vs 实现                           | 真值表/门改 keyboardActive/comboMatchesKey 复用/keyboard.ts 别名面（m2 补声明）逐条落实；graph 无第二套色词汇/双 hsl color-mix 公式/fallback neutral（data-level 不发布）/`data-selected`+`data-matching` 不动逐条一致；info 第四规则为 plan「border+fill 双消费」口径内补齐 | ✅   |
| 底座 §4 cardTemplate / §6 gantt 契约 vs 实现（两处实施裁定补记） | **均如实落档**：§4「实施补记（closure audit M2）——光改调用侧不够…node-renderer-resolved.tsx:286 前置条件…底座漏检的另半个根因」（:52）；§6「实施裁定：gantt task 为数据面非 schema 节点…字面字段已满足每任务数据驱动语义」（:69）；linear 不回灌裁定与 mock 注释新文案一致   | ✅   |
| 底座 Review 头注（三轮）                                         | r1（0B/1M/6m）→ r2（0B/1M/2m）→ r3 pass（0B/0M/0m）全记录（工作区 diff 实证 `<<待填>>` 已替换为完整三轮）；M1（ui table.css 属地）/M1′（padding-block 归零）修订均可在 live ui table.css 与 §1 文本对应验证                                                                  | ✅   |
| archetype B2 行 dated 注记 vs graph styles.css 实况              | archetype audit :48 B2 行带 `<!-- 2026-09-26 update (plan 513 L4.7): G-K CLOSED — …color-mix rules; unmapped nodes keep the plain card surface -->`——与 styles.css 四条 `[data-level]` color-mix 规则及 fallback 语义逐点相符；C2 快照档案未改（口径一致）                   | ✅   |
| wizard footgun / data-source 姿势 vs live 语义                   | guide「dispose 把 valuesPath 写回 undefined」↔ `form-runtime.ts:290`；「按 args.scope.id 查桶、findFirstInScope 同样只查本桶」↔ `source-registry.ts:441-457`（无父链遍历）+ :477-491 注释自证——两处语义一致                                                                  | ✅   |
| plan 513 Closure 声称 vs live                                    | 六契约零偏离（§1）；Closure Audit Evidence 流程痕迹（r1 issues 0B/2M/4m → delta 复审 approved 0B/0M）与其声称的 r1 发现均可终态验证消解：Phase 3 文本已收口（M1）、archetype B2 注记在案（M1）、底座 §4 params 补记在案（M2）；514/515 successor 在册（§4）                  | ✅   |

**本项结论：接口面/契约面/销项面无契约级 drift；两处实施裁定（L4.8 params、L4.11b 字面字段）如实落档底座文档；偏差均为 Minor 级（§6），无 Blocker/Major。**

## 4. roadmap §13 回写准确性

| 声称                                                                                                                                     | 复核                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L4.1–L4.8（快赢组）`done`（2026-09-26，513）；L4.2/L4.6 → 514（active）                                                                  | ✅ plan 514 `Plan Status: active` + Draft Review Record（pass-with-minors，0B/0M/4m，Rounds 1）在案——与 roadmap/dev log 三处一致；去向注记与 plan Deferred But Adjudicated 一致            |
| 六项实现注记 + L4.10 两处 guide                                                                                                          | ✅ 与 §1 逐项核对结论一致                                                                                                                                                                  |
| 挂起裁决注记（L4.3 demand-gated / L4.4 watch-only / c 销项 / d deferred / e demand-gated）                                               | ✅ 与底座 §0 逐字一致；出处抽验成立（§1）                                                                                                                                                  |
| 「unit full-green（74/74 task）+ check 零新增红（204w/2e/2exempt 在册口径…）」                                                           | ⚠️ unit 74/74 记录在案未重跑（touched 四包实跑全绿覆盖，见 §5）；oversized 实跑 **205w**/2e/2exempt——「204w 与基线一致」字面不实（schemas.ts 新增 warn 档），exit 0 语义仍成立。见 Minor-1 |
| 「e2e 全量零新增红（1598/43/2/0——kanban-perf:34 在册 watch-only + layout-family-enhancements:58 负载 flake 隔离复跑全绿…随 QA.4 复核）」 | 台账结构与 511/512 消化口径一致；两失败定性（1 在册 + 1 新观察项）在 plan Follow-up 与 roadmap 双处如实披露；按审计纪律不重跑 42min 全量（QA.4 按 pass 标准将重跑）                        |
| 「途中 i18n dragColumn 撞名 TS1117 改 reorderColumn 键消解」                                                                             | ✅ 实况吻合：既有 `flux.table.dragColumn`（行顺序）在案，新键无冲突，typecheck 40/40 绿                                                                                                    |
| 「quick-reference 新增 Interaction-Surface Fields 节四行登记」                                                                           | ⚠️ 实况**五行**；plan Closure Gates 与 dev log 均记五行，roadmap 为孤例口径漂移。见 Minor-3                                                                                                |
| L4.9 行「plan 族 scoping（515 active → 516+）… 515 已过独立 review（r1 1M+3m 修齐 → r2 pass-with-minors 1m 修齐，升 active）」           | ✅ plan 515（新文件）`Plan Status: active` + Draft Review Record（r1 fail 1M+3m 当轮全落字 → r2 pass-with-minors 0B/0M/1m，Rounds 2）在案——三处一致                                        |
| L4.12 维持 demand-gated                                                                                                                  | ✅ input-text design.md §2 口径未动，本线零触碰                                                                                                                                            |
| QA.1 行（:240）当前状态                                                                                                                  | 「L0/L1/L2/L3 已过并放行…L4–L7 出口审计绑定各线完成时点」——本审计 pass 后应由执行 session 回写「L4 已过」（审计后簿记，非本审计职责）                                                      |

**本项结论：L4 各行 done/去向回写与 live 事实一致，无虚记；两处计数注记口径漂移见 Minor-1/Minor-3。**

## 5. 验证输出复核（本审计实跑部分）

| 命令                                                                     | 结果                                                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`                                                         | ✅ 40/40（缓存全命中，当前工作区树绿——含撞名改名后全链）                                                                                         |
| `pnpm --filter @nop-chaos/flux-renderers-data test`                      | ✅ 168 files / **1174 passed**（plan Phase 2 内联计数 1172 为中段快照，差 +2 = Phase 6 列拖拽 ×2 未回填；见 Minor-3）                            |
| `pnpm --filter @nop-chaos/flux-renderers-scheduling test`                | ✅ 106 files / **1038 passed**（plan Phase 4 内联计数 1036 同上，差 +2 = Phase 5/7 增补）                                                        |
| `pnpm --filter @nop-chaos/flux-renderers-graph test`                     | ✅ 5 files / **51 passed**（= plan 声称）                                                                                                        |
| `pnpm --filter @nop-chaos/flux-react test`                               | ✅ 56 files / **521 passed**（= plan 声称，含 keyboard 别名 ×1）                                                                                 |
| `node scripts/check-oversized-code-files.mjs`                            | ⚠️ **205 warnings / 2 errors / 2 exempt**（声称 204w——schemas.ts 新增 warn 档；2e = i18n locales 在册豁免；exit 0）。见 Minor-1                  |
| `node scripts/check-i18n-keys.mjs`                                       | ✅ passed                                                                                                                                        |
| `node scripts/check-active-doc-code-anchors.mjs`                         | ✅ exit 0（350 active docs——Phase 8 纯文档变体验证项）                                                                                           |
| `node scripts/check-schema-prop-coverage.mjs`                            | ✅ passed（新 schema 字段覆盖面在案）                                                                                                            |
| plan 声称的 build / lint / 全仓 `pnpm test`（74/74 task）/ e2e 全量 1598 | 记录在案（plan Phase 9 + Closure Gates + roadmap 注记），本审计未全量重跑（typecheck + 本线全部 touched 四包实跑 + 四 checker 已覆盖本线交付面） |

## 6. Findings

**Blocker：无。Major：无。**

### Minor-1 oversized 台账与声称不符：L4 diff 新增 1 个 warn 档文件（204w → 实跑 205w）

- 位置：plan 513 Phase 9 / Closure Gates / Closure 节与 roadmap §13 L4 行均记「oversized 204w/2e/2exempt 与 512 后基线一致」
- 实况：本审计实跑 `check-oversized-code-files` = **205w**/2e/2exempt；新增 warn = `packages/flux-renderers-data/src/schemas.ts`（HEAD 499 行，L4 density JSDoc +7 行后 506，跨过 500 阈值）；同时 `table-renderer.tsx` 被 +6 行接线推至 **700 行整**（warn 档顶格，距 MUST-split 阈值仅 1 行）
- 影响：warn 档不翻 `pnpm check` exit（exit 0 语义成立），但「204w 与基线一致 / 零新增」字面不实，且 AGENTS.md 纪律要求新增 hit「split/register before finishing」。修复二选一：schemas.ts 拆分或将 density JSDoc 收紧压回阈值内 + 台账改 205w 口径，或按既有豁免机制登记说明；table-renderer.tsx 700 行建议随下次触碰拆分（substrate §8.2 既有预案）。建议 QA.4（gate = L3+L4）前消化并复审。

### Minor-2 列拖拽 overlay 形态「同样可用」声称零测试钉住

- 位置：plan 513 Phase 6（「overlay 形态同样可用」）+ 底座 §5 风险条款（m4/m4′：「优先在菜单 content（portal 面）内用原生 DnD 并以 focused 单测 + e2e 钉住」）
- 实况：实现双形态都挂了把手/drop props（table-column-settings.tsx overlay 分支在案），但交付的 2 条 focused 单测与 1 条 e2e **全部走 inline 面板（overlay:false）**——Base UI DropdownMenu portal 面的原生 dragstart 干扰风险（底座评审点名的 m4 风险面）恰是未覆盖的那条路径
- 影响：契约风险条款的钉住义务仅在低风险半边兑现；「overlay 形态同样可用」未经测试证实。修复二选一：补 1 条 overlay 形态 focused/e2e 断言（dragTo 在 portal 面可行即钉住），或把 claim 收窄为已证范围。建议与 Minor-1 同批在 QA.4 前消化。

### Minor-3 台账计数注记口径漂移（三处）

- ①roadmap §13 L4 行尾注「quick-reference 新增 Interaction-Surface Fields 节**四行**登记」——实况**五行**；plan Closure Gates 与 dev log 均记五行，roadmap 为孤例口径漂移。
- ②plan Phase 2 内联计数「data 1172/1172 绿」——实跑 **1174**（L3 Minor 修复后基线 1170 + density ×2 + 列拖拽 ×2，中段快照未回填）。
- ③plan Phase 4 内联计数「scheduling 1036/1036 绿」——实跑 **1038**（Phase 5/7 增补未回填）。
- 影响：纯记账不一致（flux-react 521 / graph 51 相符；74/74 task 汇总口径不受影响）；沿 L1 先例 Minor-1 同类处置——以本报告为勘误记录，QA.4 前随簿记批次把 roadmap 四行改五行、plan 两处内联计数加注终值即可。

### Minor-4 dev log plan 513 节缺 closure audit 记录

- 位置：`docs/logs/2026/09-26.md` plan 513 节（交付面/验证数据/关联计划簿记三小节）全节无 closure audit 字样
- 实况：closure audit 流程本身在案（plan 513 Closure Audit Evidence：r1 issues 0B/2M/4m → 修复 → delta 复审 approved 0B/0M，其声称的 r1 发现 M1/M2 终态均可验证消解）；但先例 510/511/512 的 dev log 节均有显式 closure audit 段落/句子，513 缺此一行
- 影响：日志完备性缺口（非流程缺口——plan 内嵌证据是权威落点）。修复：dev log 513 节补一句 closure audit 结论与指向。纯文档一行，随本审计回写一并处理。

### Observation-1 底座 §1「归一化在 schema props 解析层做」措辞与实现定位

- 实况为 `table-renderer.tsx:479-480` 渲染期派生（`densityTier` 三元归一），非 schema props 解析层归一。行为与 Failure Path density-invalid-value 一致且单测钉住；底座 §1 其余条款与实现零 drift。后续重构顺手校准措辞即可，不单列 gate 要求。

### Observation-2 收口工作区改动的构成与提交状态

- 工作区 45 个路径逐一归因：六契约实现（12 文件）+ 测试（3 新单测 + 5 新 e2e + 2 既有测试增补）+ lab 场景（2 文件）+ linear mock 注释更新 + 登记面（quick-reference/flux-guide ×2）+ 簿记（plan 513 状态翻转与 Closure、plan 514 增补、515 新文件、roadmap §13、dev log、底座文档三轮 review 头注与两处实施补记）+ 两份 analysis 文档（archetype B2 销项注记；04-e2e-domain-pages 系 prettier 重排，与本线语义无关）。**全部未提交**——须随本审计回写一并入库，避免「plan 声称 completed 而树未落盘」状态外泄（L3 先例 Observation-2 同款纪律）。

### Observation-3 实现层微瑕（不构成 finding）

- `kanban-card-template-bindings.test.tsx:7-12` 沿用全量 mock flux-react 旧式（未 `importOriginal`）——因该测试 schema 未配 keyboardReorder，`parseKeyCombo`/`comboMatchesKey` 未被触达而幸存；同批 kanban-dnd 集成测试已改 `importOriginal`，后续统一即可。
- e2e `graph-level-tint.spec.ts` 四级循环对缺失 level `continue` 跳过（依赖 demo schema 当前四级齐备的隐式前提）；`table-column-drag.spec.ts` 用 `xpath=ancestor::*[last()]` 定位面板容器，结构变化时需同步。随后续 e2e 维护顺手收紧。

## 7. Verdict

**pass**（0 Blocker / 0 Major / 4 Minor）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Minors 不阻断线出口。
- 按 roadmap §11 纪律：4 项 Minor 登记 QA.7 ⑥ 残余债登记册，**在下一 gate（QA.4，gate = L3+L4）前修复并复审**——Minor-1 为台账勘误 + 一个 warn 档文件的拆分/登记二选一，Minor-2 为一条廉价断言或 claim 收窄，Minor-3/4 为纯文档记账勘误，建议与 QA.4 前消化窗口同批处理。
- L4 线出口放行：roadmap §13 L4 行 `done` 回写经本审计逐项复核成立；六实现项 substrate 契约（density 三档+padding 归零 / kanban keyboardReorder 真值表+keys 覆写+零回归红线 / graph 四语义级 fill tint+零并行色词汇 / cardTemplate bindings+params 双半根因 / 列拖拽接线消解死配置+单写通道 / gantt selectedClass 字面字段）全部按 design gate 落地且零偏离，两处实施裁定如实落档底座文档，五挂起裁决出处与注记一致，L4.10 两处 guide 与 live 代码语义逐点相符，登记面/i18n/focused 测试/程序化 e2e 在案，archetype §3.6 六条规则对齐（无 per-renderer bespoke、无全局事件岛、无第二套词汇、token 优先、单写入口）。
- 审计后簿记：①本报告落盘 + roadmap QA.1 行由执行 session 回写「L4 已过」；②Observation-2 所列整批工作区改动（含 515 新文件）须随本次回写一并提交。

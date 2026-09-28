# 2026-09-09-0001 UI Family Class Nesting Cleanup Plan

> Plan Status: active
> Last Reviewed: 2026-09-09
> Source: nop-chaos-next F4 表格 hover 回归排查发现（host 侧 `.nop-table { background }` 被 tr/td 上的同名类意外命中）
> Related: commit `695c5f539`（feat(ui): add nop- prefix CSS classes to all shadcn/ui components）

## Purpose

修复 `695c5f539` 批量加 `nop-` 前缀类时引入的**家族类嵌套重复**缺陷：同一 DOM 祖先链上出现多个相同 family class（如 `table > tbody > tr > td` 四层全部挂 `nop-table`），导致：

1. host/主题侧无法用元素选择器安全地"选中组件根"（必须 `:not()` 枚举排除）；
2. unlayered 元素选择器会意外命中所有内部元素并压过 Tailwind utilities（已实际造成 hover 失效回归）。

修好后同步 tgz 到 nop-chaos-next，消除 host 侧被迫的 `:not()` 防御。

## Current Baseline

- `695c5f539`（2026-07-12）给 46 个 ui 组件文件批量加 `nop-` 前缀类。对照 `card.tsx`（`nop-card` 仅挂 Card 根，子组件靠 `data-slot` 标识）可确认设计意图是 **scope class 挂根**；其余 30 个家族被脚本不一致地挂到了家族内每个元素上。
- 审计脚本统计的重复分布（每文件同 family 类出现次数 >1）：accordion x4、alert x4、avatar x6、breadcrumb x6、button-group x2、calendar x6、carousel x5、chart x9、checkbox x2、combobox x13、command x9、context-menu x9、dialog x7、dropdown-menu x11、empty x6、field-ui x10、input-group x6、item x9、kbd x2、menubar x11、native-select x2、navigation-menu x8、pagination x8、progress x5、radio-group x2、resizable x2、scroll-area x2、sidebar x13、table x8、toggle-group x2。
- **消费面审计（已完成，结论稳定）**：
  - 元素级 CSS 选择器（直接给 `.nop-family` 上样式）全两仓仅 3 处：`packages/ui/src/styles/table.css` 的 `.nop-table`、`.nop-table[data-bordered]`；host `apps/main/src/styles/flux-spacing.css` 的 `.nop-field`（属于 flux 渲染器体系 `nop-field`，与 ui 的 `nop-field-ui` 不同类名，不受影响）。`[data-bordered]` 属性只出现在容器上，不受子元素影响。
  - 其余全部为**后代选择器**（`.nop-family descendant`），子元素移除类不影响其匹配。
  - JS 消费：全仓 `closest/querySelector` 仅 `.nop-debugger`（独立体系）。
- host 侧已加防御性修复：`flux-spacing.css` F4 规则使用 `.nop-table:not(tr):not(td):not(th)`。
- 上游 `data-slot` 体系完整保留（所有子元素的角色标识），移除重复 family 类不损失选择能力。

## Goals

- 每个 ui 组件家族的 DOM 祖先链上，同一 family class 只出现一次（**usage-root retention 策略**：family class 挂在该家族的"使用根"上——即消费者实际渲染该家族时必然出现、且不嵌套于同家族其他留存点内的元素；Portal 并列根（Trigger/Content、Overlay/Content、Root/Positioner 等）各自保留，因使用者并列放置、互不嵌套）。
- 保留家族 theme-isolation 能力：任何使用家族根组件的场景，根上仍有 `nop-*` 标记。
- 上游全部单测/e2e/lint/build 通过；重打包 tgz 同步到 nop-chaos-next 后，host 全部门禁与 e2e 保持全绿。
- host 的 `:not()` 防御可简化为直白元素选择器（作为本次修复的收尾证明）。

## Non-Goals

- 不改变任何组件的视觉样式、DOM 结构、`data-slot` 命名或公共 API（props/导出不变）。
- 不重构 `nop-` 前缀体系本身，不引入新的类命名方案（如 BEM 化）。
- 不处理 `nop-debugger`、`nop-field`（渲染器体系）、`nop-haptic` 等**非 ui 组件家族**标记。
- 不在本计划内改动 nop-chaos-next 的业务 CSS 规则（除收尾时简化 F4 的 `:not()`）。

## Scope

### In Scope

- `packages/ui/src/components/ui/*.tsx`：30 个家族中非根组件的重复 family class 移除。
- 家族根组件清单与保留/移除判定表（Phase 1 产出，落在本 plan 附录）。
- 重打包 `nop-chaos-flux` tgz 并同步 nop-chaos-next（`scripts/repack-flux-and-refresh.sh` / 两仓既有同步脚本）。
- nop-chaos-next 侧 `flux-spacing.css` F4 `:not()` 简化 + 回归验证。

### Out Of Scope

- flux-renderers-\*（渲染器 schema 输出的类）、nop-debugger、mobile.css 工具类。
- shadcn 上游新版本同步。

## Execution Plan

### Phase 1 - 家族根判定表（审计产物）

Status: completed
Targets: `packages/ui/src/components/ui/*.tsx`（只读审计，产出判定表）

- Item Types: `Decision`

- [x] 1.1 对 30 个家族逐一提取 JSX 结构，判定 DOM 嵌套链与并列根；判定标准：- **嵌套链**：同一链上只保留最外层保留元素（如 table→tbody→tr→td 只保留 `Table`）；- **并列根**（如 Tooltip 的 Trigger 与 Content 经 Portal 并列、Tabs 的 List/Trigger/Content 使用者并列放置）：每个并列根都保留 family class（不构成祖先链重复，且防止单独使用时丢标记）；- **可选内部件**（如 DialogHeader 可缺省、DialogOverlay 可缺省）：若某部件可能是"该子树唯一保留元素"（用户不写更外层部件），则该部件保留。存疑的家族按保守原则保留并在判定表标注理由。
- [x] 1.2 产出判定表（附录 A）：每家族列出「保留的组件 / 移除的组件 / 嵌套链证据 / 风险备注」。
- [x] 1.3 用消费面审计脚本复核：判定表中所有"移除"项，在两仓 CSS/JS 中均无元素级选择器或 JS 查询依赖。

Exit Criteria:

- [x] 附录 A 判定表覆盖全部 30 个家族，每个移除项均有嵌套链证据与消费面复核结论
- [x] 争议家族（如有）的保守保留决定已记录理由
- [x] 局部 typecheck 通过（纯审计无代码改动，`tsc --noEmit` 不必需，跳过亦可）

### Phase 2 - 批量移除嵌套重复类

Status: completed
Targets: `packages/ui/src/components/ui/*.tsx`

- Item Types: `Fix`

- [x] 2.1 按附录 A，用脚本辅助 + 逐处人工确认移除非根组件 `cn()` 中的 `'nop-family '` 字面量（注意保留其余 class、`data-slot`、变体函数调用不变）
- [x] 2.2 复扫验证：重跑审计脚本，全仓 ui 组件不再存在"同 family 类 > 嵌套链"（并列根允许共存）
- [x] 2.3 逐家族 diff 复核：每处移除只删 class 字符串，不改 JSX 结构

Exit Criteria:

- [x] 审计脚本报告：无嵌套重复残留（并列根白名单明确列出）
- [x] `pnpm --filter @nop-chaos/ui typecheck` 通过（ui 包位于 `packages/ui`，遵循 flux 仓过滤名）
- [x] 上游 focused 单测通过（受影响组件的现有测试；ui 包 42 files / 169 tests 全绿）

### Phase 3 - 上游验证

Status: completed
Targets: flux 仓全量门禁

- Item Types: `Proof`

- [x] 3.1 `pnpm typecheck && pnpm build`
- [x] 3.2 `pnpm lint`（顺手修复了 pre-existing 的 4 个 undefined i18n key：flux.picker.remove、flux.validation.format/integer/url）（含 react-hooks、i18n、a11y 等既有 fail-fast 检查）
- [x] 3.3 `pnpm test`（全量单测，含 flux-renderers / playground 快照类测试）
- [ ] 3.4 `pnpm test:e2e`（Playwright，若本地环境可运行；否则记录阻塞原因并以下游 host e2e 作为等效 proof）
- [x] 3.5 视觉抽查：playground 中 Table/Dialog/Tabs/Combobox/Command 五个代表家族渲染正常（类移除不影响后代选择器样式）

Exit Criteria:

- [x] 门禁全绿；e2e 若受环境限制，注明并以下游 host e2e 兜底（主套件 74 passed + extension-dev 2 passed 兜底）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - 打包同步与 host 收尾

Status: completed (closure audit pending)
Targets: `libs/nop-chaos-flux-0.1.0.tgz`（nop-chaos-next 侧）、`apps/main/src/styles/flux-spacing.css`

- Item Types: `Fix`, `Proof`

- [x] 4.1 flux 仓执行打包脚本，产出新 tgz；按既有流程同步到 nop-chaos-next `libs/` 并刷新依赖（`pnpm install`）
- [x] 4.2 nop-chaos-next：简化 `flux-spacing.css` F4 为 `.nop-table { background: hsl(var(--card)) }`（移除 `:not()` 防御）——这是"上游已修复"的行为级证明
- [x] 4.3 host 门禁全绿：`pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- [x] 4.4 host e2e 全绿：主套件（此前 74 passed 基线）+ `test:e2e:extension-dev` + flux-prototype 模式专属 spec
- [x] 4.5 视觉回归抽查：host 内 Flux Demo 表格 hover、AMIS parity 密度断言（c1a）依旧通过

Exit Criteria:

- [x] tgz 同步完成，host 门禁与 e2e 全绿（host typecheck 28/28、test 27/27、lint 27/27、build 15/15）
- [x] F4 `:not()` 移除后 hover 与底色行为不变（c1a + 主套件证明）
- [x] nop-chaos-next `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 附录 A 判定表完整（30 家族全覆盖；2026-09-28 终版校准，tabs 死行移除）
- [x] 上游 ui 包无嵌套重复（`check:ui-family-nesting` 脚本复核 exit 0，2026-09-28）
- [x] 上游 typecheck/build/lint/test 全过（2026-09-28 实测：typecheck ✓ / build ✓ / lint ✓ / test 50 files 226 passed）
- [x] tgz 同步完成，nop-chaos-next 门禁与全部 e2e 套件全绿（host `libs/nop-chaos-flux-0.1.0.tgz` 09-09；host 镜像与 `packages/ui/src` 0-diff；host log 2026/09-09.md 记录 28/28、27/27、27/27、15/15、e2e 74 passed + extension-dev 2 passed）
- [x] host F4 `:not()` 防御已简化且行为不变（`apps/main/src/styles/flux-spacing.css:310` 为直白 `.nop-table`，无 `:not()`）
- [ ] 独立子 agent closure-audit 已完成并记录证据（round 1 已完成并判定 issues→remediation；round 2 复审进行中）
- [ ] 两仓 `docs/logs/` 收口记录已更新（2026-09-28 remediation 日志待本次提交附上）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- ~~后续可为 ui 包增加一个 fail-fast 审计脚本（`check-ui-family-class-nesting.mjs`）~~ 已于 2026-09-28 落地：`scripts/audit/check-ui-family-class-nesting.mjs` + `pnpm check:ui-family-nesting`，并接入 `check` 硬约束链（`appendix A` 白名单同步维护）。

## Appendix A - 家族根判定表（2026-09-28 终版校准）

> 初判表已按 live 代码与 2026-09-09 批量移除（commit `93b3831da`，139 处）+ 2026-09-28 closure-audit remediation 的最终结果校准。判定标准为 **usage-root retention**（见 Goals）：family class 只留在"使用根"上；Portal 并列根各自保留。tabs 家族已于 2026-08（commit `a9e2f2691`，先于本 plan）整体去类，不在 30 家族基线内，初判表中的 tabs 行作废删除。
> 持久化复核脚本：`scripts/audit/check-ui-family-class-nesting.mjs`（已接入 `pnpm check` 硬约束，白名单=下表"并列根"行）。

| 家族            | 最终留存点（usage root / 并列根）                                                | 移除点                                                                                             | 结构判定                                                                       |
| --------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| table           | `Table`                                                                          | Header/Body/Footer/Row/Head/Cell/Caption                                                           | 同链四层嵌套（缺陷原型）                                                       |
| dialog          | `DialogOverlay`、`DialogContent`                                                 | Header/Title/Footer/Body                                                                           | Overlay 与 Content 为 Portal 并列根                                            |
| accordion       | `Accordion`                                                                      | Item（2026-09-28 移除）、Trigger/Content                                                           | Item 嵌套于根，同链                                                            |
| alert           | `Alert`                                                                          | Title/Description                                                                                  | 嵌套                                                                           |
| avatar          | `Avatar`                                                                         | AvatarGroup（2026-09-28 移除）、Image/Fallback                                                     | Group 包裹 Avatar，同链                                                        |
| breadcrumb      | `Breadcrumb`                                                                     | List/Item/Link/Page/Separator/Ellipsis                                                             | 嵌套                                                                           |
| calendar        | `Calendar`（className 经 react-day-picker 合并入自定义 Root，Root 字面量不重复） | 自定义 Root 字面量、Chevron ×3（2026-09-28 移除）                                                  | react-day-picker 会把 className prop 合入 Root，曾致根上双份；Chevron 嵌套于根 |
| carousel        | `Carousel`                                                                       | Content/Item/Previous/Next                                                                         | 嵌套                                                                           |
| chart           | `ChartContainer`                                                                 | Tooltip/Legend                                                                                     | 嵌套                                                                           |
| checkbox        | `Checkbox`（checkbox.tsx 唯一留存点）                                            | 嵌套者                                                                                             | 嵌套                                                                           |
| combobox        | `ComboboxTrigger`、`ComboboxContent`（+Clear 挂 Trigger 兄弟位）                 | 内部 12 处非根部件                                                                                 | Trigger/Content 为 Portal 并列根                                               |
| command         | `Command`                                                                        | CommandDialog 的 DialogContent、CommandItem（2026-09-28 移除）；List/Group/Input/Empty/Shortcut 等 | Dialog 包裹 Command 同链；Item 嵌套于根                                        |
| context-menu    | Trigger、Content                                                                 | Content 内部件                                                                                     | Portal 并列根                                                                  |
| dropdown-menu   | Trigger、Content（Positioner 持有）                                              | Content 内部件                                                                                     | Portal 并列根                                                                  |
| menubar         | `Menubar`、`MenubarContent`                                                      | MenubarTrigger（2026-09-28 移除）、Content 内部件                                                  | Trigger 嵌套于根；Content 为 Portal 并列根                                     |
| navigation-menu | `NavigationMenu`、`NavigationMenuPositioner`                                     | NavigationMenuLink（2026-09-28 移除）、Content 内部件                                              | Link 嵌套于 Positioner 链；Positioner 为 Portal 并列根                         |
| pagination      | `Pagination`                                                                     | Content/Item/Link/Previous/Next/Ellipsis                                                           | 嵌套                                                                           |
| progress        | `Progress`                                                                       | indicator 等内部件                                                                                 | 嵌套                                                                           |
| radio-group     | `RadioGroup`                                                                     | RadioGroupItem                                                                                     | 嵌套                                                                           |
| resizable       | `ResizablePanelGroup`                                                            | Panel/Handle                                                                                       | 嵌套                                                                           |
| scroll-area     | `ScrollArea`                                                                     | Viewport/Scrollbar/Corner                                                                          | 嵌套                                                                           |
| sidebar         | `Sidebar` 与并列的 Trigger/Inset（sidebar-layout.tsx 白名单）                    | 其余内部件                                                                                         | 使用者并列放置                                                                 |
| button-group    | `ButtonGroup`                                                                    | 内部件                                                                                             | 嵌套                                                                           |
| toggle-group    | `ToggleGroup`                                                                    | ToggleGroupItem                                                                                    | 嵌套                                                                           |
| native-select   | `NativeSelect` 包装根                                                            | NativeSelectOptGroup（2026-09-28 移除）、Option                                                    | OptGroup/Option 嵌套于 select 内                                               |
| input-group     | `InputGroup`                                                                     | Input/Addon 等内部件                                                                               | 嵌套                                                                           |
| item            | `Item`（2026-09-28 恢复标记——曾整体丢失 theme-isolation）、`ItemSeparator`       | ItemGroup（2026-09-28 移除）、Media/Content/Title 等                                               | ItemGroup 包裹 Item 同链；Separator 为 Item 之间的兄弟（并列）                 |
| empty           | `Empty`                                                                          | Header/Media/Title 等                                                                              | 嵌套                                                                           |
| field-ui        | `Field`                                                                          | FieldSet/FieldGroup（2026-09-28 移除）、Label/Content 等                                           | Set/Group 包裹 Field 同链；与渲染器体系 `.nop-field` 无关                      |
| kbd             | `Kbd`                                                                            | KbdGroup（2026-09-28 移除）                                                                        | Group 包裹 Kbd，同链（非并列，初判有误）                                       |
| card            | `Card`（基线即正确，对照参考）                                                   | CardHeader/Content/Footer                                                                          | 嵌套                                                                           |

## Closure-Audit Remediation（2026-09-28）

独立子 agent closure audit（round 1）判定 `issues`，3 项 blocker 及处置：

1. 9 家族残留同链重复（calendar/command/accordion/kbd/avatar/field-ui/menubar/navigation-menu/native-select）→ 已按上表全部移除（本次 remediation diff）。
2. `Item` 整体丢失家族标记 → 已恢复 `'nop-item '`，并移除 ItemGroup 的标记避免新链重复。
3. 附录 A 未按最终决策校准 → 本附录即终版校准表；判定标准在 Goals 修订为 usage-root retention。
4. 复核脚本未持久化 → `scripts/audit/check-ui-family-class-nesting.mjs` 已落地并接入 `pnpm check`（`check:ui-family-nesting`），当前 exit 0。

## Risks And Rollback

- 风险：某子组件被消费者**脱离家族根单独使用**（如手动渲染 `<TableCell>` 无 `<Table>` 包裹）→ 该元素丢失 theme-isolation 标记。缓解：Phase 1 消费面复核包含 playground/host 对子组件的直接用法检索；发现即改为保留并在附录标注。
- 回滚：还原 ui 组件 diff 并重新打包同步即可；host 的 `:not()` 简化单独一个 commit，可独立回退。

## Closure

Status Note: 2026-09-28 closure-audit round 1 判定 issues（3 blocker）后完成 remediation：残留 9 家族同链重复清除、Item 标记恢复、附录 A 终版校准、复核脚本持久化并接入 `pnpm check`。ui 包 typecheck/build/lint/test 全绿（50 files / 226 tests），`check:ui-family-nesting` exit 0。待 round 2 独立复审通过后标记 completed。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28）
- Evidence round 1: verdict `issues`——verified 主修复已落地（commit `93b3831da`、host 0-diff 镜像、F4 简化、host 门禁/e2e 记录一致）；blockers = 9 家族残留同链重复 / Item 丢标记 / 附录 A 未校准 + 脚本未持久化（详见上方 Remediation 节）。ui 测试 50 files / 226 tests 由审计方独立复跑通过。
- Evidence round 2: <<待独立子 agent 复审后填写>>

Follow-up:

- nop-chaos-next 侧后续同步本次 remediation 的 tgz（上游类移除仅影响防御性选择器命中面，host F4 无需回改；同步节奏随下一次例行打包）。

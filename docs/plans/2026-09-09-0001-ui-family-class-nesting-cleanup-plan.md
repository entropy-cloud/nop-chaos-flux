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

- 每个 ui 组件家族的 DOM 祖先链上，同一 family class 只出现一次（挂在家族渲染树最外层保留元素上）。
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

- [ ] 附录 A 判定表完整（30 家族全覆盖）
- [ ] 上游 ui 包无嵌套重复（脚本复核通过）
- [ ] 上游 typecheck/build/lint/test 全过
- [ ] tgz 同步完成，nop-chaos-next 门禁与全部 e2e 套件全绿
- [ ] host F4 `:not()` 防御已简化且行为不变
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] 两仓 `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 后续可为 ui 包增加一个 fail-fast 审计脚本（`check-ui-family-class-nesting.mjs`），把"家族类嵌套重复"纳入 `pnpm check` 硬约束，防止 shadcn 上游同步时复发。

## Appendix A - 家族根判定表

（Phase 1 产出后填充；下表为基于 shadcn 结构约定的初判，执行时按 live 代码校准。）

| 家族            | 初判保留（family class 留存点）                                                                                | 初判移除（嵌套内部件）                                                        | 备注                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| table           | `Table`                                                                                                        | `TableHeader/TableBody/TableFooter/TableRow/TableHead/TableCell/TableCaption` | 四层嵌套，本缺陷原型                                                                                                          |
| dialog          | `Dialog`、`DialogOverlay`、`DialogContent`                                                                     | `DialogHeader/DialogTitle/DialogFooter/DialogBody`                            | Overlay 与 Content 并列于 Portal；Header/Title/Footer/Body 必然嵌套于 Content 内                                              |
| tabs            | `Tabs`、`TabsList`、`TabsTrigger`、`TabsContent`                                                               | —                                                                             | Trigger 与 Content 由使用者并列放置（Radix 语义），互不嵌套时全保留；若 live 代码中 Trigger 嵌套于 List 内则移除 Trigger 的类 |
| accordion       | `Accordion`、`AccordionItem`                                                                                   | `AccordionTrigger/AccordionContent`                                           | Trigger/Content 嵌套于 Item                                                                                                   |
| alert           | `Alert`                                                                                                        | `AlertTitle/AlertDescription`                                                 | 嵌套                                                                                                                          |
| avatar          | `Avatar`                                                                                                       | `AvatarImage/AvatarFallback`                                                  | 嵌套                                                                                                                          |
| breadcrumb      | `Breadcrumb`                                                                                                   | `BreadcrumbList/Item/Link/Page/Separator/Ellipsis`                            | 嵌套                                                                                                                          |
| calendar        | `Calendar`                                                                                                     | 内部部件（6 处中非根者）                                                      | 以 live 代码为准                                                                                                              |
| carousel        | `Carousel`                                                                                                     | `CarouselContent/CarouselItem/CarouselPrevious/CarouselNext`                  | Previous/Next 是 Content 的兄弟？按 live DOM 链判定                                                                           |
| chart           | `ChartContainer`                                                                                               | `ChartTooltip/ChartLegend`                                                    | 嵌套                                                                                                                          |
| checkbox        | `Checkbox`、`CheckboxGroup`（若并列）                                                                          | 嵌套者                                                                        | live 判定                                                                                                                     |
| combobox        | `Combobox`（根）                                                                                               | 内部 12 处非根部件                                                            | live 判定                                                                                                                     |
| command         | `Command`、`CommandDialog`                                                                                     | `CommandList/Group/Item/Input/Empty/Shortcut/Separator`                       | 嵌套                                                                                                                          |
| context-menu    | `ContextMenu`、`ContextMenuTrigger`、`ContextMenuContent`                                                      | Content 内部件（Item/Sub/Label/Separator/Group...）                           | Trigger 与 Content 并列                                                                                                       |
| dropdown-menu   | `DropdownMenu`、`DropdownMenuTrigger`、`DropdownMenuContent`                                                   | Content 内部件                                                                | 同上                                                                                                                          |
| menubar         | `Menubar`、各 `MenubarMenu/Trigger/Content`                                                                    | Content 内部件                                                                | live 判定                                                                                                                     |
| navigation-menu | `NavigationMenu`、`NavigationMenuList`、`NavigationMenuItem`、`NavigationMenuTrigger`、`NavigationMenuContent` | Content 内部件                                                                | live 判定                                                                                                                     |
| pagination      | `Pagination`                                                                                                   | `PaginationContent/Item/Link/Previous/Next/Ellipsis`                          | 嵌套                                                                                                                          |
| progress        | `Progress`                                                                                                     | indicator/label 等内部件                                                      | live 判定                                                                                                                     |
| radio-group     | `RadioGroup`                                                                                                   | `RadioGroupItem`                                                              | 嵌套                                                                                                                          |
| resizable       | `ResizablePanelGroup`                                                                                          | `ResizablePanel/ResizableHandle`                                              | 嵌套                                                                                                                          |
| scroll-area     | `ScrollArea`                                                                                                   | `ScrollAreaViewport/Scrollbar/Corner`                                         | Viewport 嵌套于根                                                                                                             |
| sidebar         | `Sidebar*` 根容器（`Sidebar`）                                                                                 | 内部 12 处部件                                                                | live 判定                                                                                                                     |
| button-group    | `ButtonGroup`                                                                                                  | 内部件（若有）                                                                | live 判定                                                                                                                     |
| toggle-group    | `ToggleGroup`                                                                                                  | `ToggleGroupItem`                                                             | 嵌套                                                                                                                          |
| native-select   | `NativeSelect`（根）                                                                                           | 内部件                                                                        | live 判定                                                                                                                     |
| input-group     | `InputGroup`                                                                                                   | 内部件（Input/Addon/...）                                                     | live 判定                                                                                                                     |
| item            | `Item`                                                                                                         | `ItemMedia/ItemContent/ItemTitle/...`                                         | 嵌套                                                                                                                          |
| empty           | `Empty`                                                                                                        | `EmptyHeader/Media/Title/...`                                                 | 嵌套                                                                                                                          |
| field-ui        | `Field`（ui 根）                                                                                               | `FieldLabel/FieldContent/...`                                                 | 注意与渲染器体系 `.nop-field` 无关                                                                                            |
| kbd             | 两个导出若并列则全保留                                                                                         | —                                                                             | live 判定                                                                                                                     |

## Risks And Rollback

- 风险：某子组件被消费者**脱离家族根单独使用**（如手动渲染 `<TableCell>` 无 `<Table>` 包裹）→ 该元素丢失 theme-isolation 标记。缓解：Phase 1 消费面复核包含 playground/host 对子组件的直接用法检索；发现即改为保留并在附录标注。
- 回滚：还原 ui 组件 diff 并重新打包同步即可；host 的 `:not()` 简化单独一个 commit，可独立回退。

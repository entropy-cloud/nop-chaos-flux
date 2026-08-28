# R2 第 5 轮递归扩展发现（round-05-g4，收敛确认轮）

> 组号: G4（mobile / scheduling） · 轮次: Round 05（收敛确认轮，仅 G4 单组派发） · 审查日期: 2026-08-28 · agent: general（fresh session，只读审查） · HEAD `0f183874a`
> 输入: `dispatch-shared-prefix.md`（12 视角 + 条目格式 + 去重边界）+ `dispatch-recursive-extension.md`（盲区与去重规则）+ round-01 全文 + round-04 全文 + round-02/03 compact（去重基线 253 条）
> 盲区覆盖说明: 本轮按派发指令逐项核查三项残余盲区——① swipe-cell × 列表滚动组合（swipe-cell `touch-action: pan-y` + touchcancel 重置 + outside pointerdown 关闭链完整，无高于门槛命中）；② countdown/notice-bar 定时器边界（MA-16/MM-14/OA-21/OA-13 负值钳制、挂钟锚定、reset 停表契约与 notice-bar OA-15/19/20/22/MM-15 停歇/钳制/轮播解耦全部在位，无新命中）；③ gantt 依赖线交互（绘制/完成/取消路径含 ESC + pointercancel + undo 闭环，`gantt.css` 的 `.hovered` 类有消费方；残余候选见"防复核"节，均低于本轮价值门槛）。盲区之外的新增方法面（组件变体样式消费反查、包内 disabled 门禁全类反查）产出下述 2 条新发现。
> 价值收敛判据执行说明: 本轮按"从严"口径运行——低于门槛的候选（依赖线绘制无目标高亮、link aria-label 暴露内部 id、依赖线重复创建无去重等）全部落入"防复核"节弃报留档，未为凑数量立案。

---

## 发现清单（HIGH 0 / MEDIUM 2 / LOW 0，共 2 条）

### [G4-R5-视角3-01] notice-bar 的 variant 变体色板是死 CSS：全部变体规则（含暗色覆盖）挂在 `.nop-mobile` 作用域类下，而全仓没有任何渲染器或宿主输出该类

- **文件**: `packages/flux-renderers-mobile/src/styles.css:35-79`（变体规则全部以 `.nop-mobile` 为前缀）；`packages/flux-renderers-mobile/src/notice-bar.tsx:239-252`（渲染根只输出 `nop-notice-bar`，无 `nop-mobile`）；文案与契约 `flux-guide/mobile/notice-bar.md:10-29,52-55`（`variant: "warning"` 为一等 schema 能力）
- **证据片段**:
  ```css
  /* styles.css:61-64 —— 四条变体规则全部要求祖先带 .nop-mobile 类 */
  .nop-mobile [data-slot='notice-bar'][data-variant='info'] {
    background-color: var(--nop-notice-bar-info-bg);
    color: var(--nop-notice-bar-info-fg);
  }
  /* :49-59 暗色覆盖块同为 `.dark .nop-mobile, [data-mode='dark'] .nop-mobile` 前缀 */
  ```
  ```tsx
  // notice-bar.tsx:243-249 —— 渲染根的类串没有 nop-mobile，任何祖先层也无来源
  <div
    {...interactiveProps}
    ref={rootRef}
    className={cn(
      'nop-notice-bar flex items-center gap-2 overflow-hidden px-3 py-2',
      props.meta.className,
    )}
  ```
- **严重程度**: MEDIUM
- **现状**: MA3-P2-F2+F3 修复（docs/plans/2026-07-27-2350-1-mr2-code-test-p1-remediation.md R2.6）把 mobile 包样式从裸 `[data-slot]`/`:root` 收进 `.nop-mobile` 命名空间，但修复只改了 CSS 侧——`nop-mobile` 类在全仓只有 styles.css 这一处出现（`rg -l` 全仓仅命中 styles.css；renderers、flux-react 渲染包装层、playground 19 页、demo 页均无任何 `className` 输出该类，文档与 flux-guide 亦未声明宿主需自加包装类）。结果是 4 个变体 × 明暗两套共 16 条颜色声明全部不可达：`variant: "warning"` 的通知栏渲染为透明底 + 默认前景色的普通文字条，与 `info` 像素级相同，唯一区分是图标字形（warning→triangle-alert）。测试面不可见：`notice-bar.test.tsx:71-82` 与 `mobile-markers-contract.test.tsx:42-51` 只断言 `data-variant` 属性存在，从不断言颜色生效。`data-variant` 本身有宿主 CSS hook 价值（保留正确），但包自带的 documented 变体色板（含 MA-06 声明的"own their variant palette"目标）实际为零产出。
- **行业惯例**: Ant Design Alert/Tag、shadcn/ui Alert 的 `variant`/`severity` 是渲染层直接生效的视觉契约——配置 warning 即出现警示色底/字；组件库不要求宿主先给页面挂一个魔法作用域类变体色才生效。本项目自身基线同样如此：content 包 alert-renderer 的 info/warning/success 变体（`bg-muted/40`/`bg-success-bg` 等 Tailwind 类）与 ui 包 badge 变体均为渲染即生效。
- **用户影响**: schema 作者按文档写 `{"type":"notice-bar","text":"系统将于今晚维护","variant":"warning"}`，页面上出现一条与普通文本条无异的透明通知——维护提醒、错误通告、成功反馈全部失去语义色；暗色宿主下连 MA-06 专门准备的暗色板也不生效。用户无法从颜色分辨通知级别（只剩小图标），作者以为配置生效而实际无效。通过真实用户影响检验（配置即应可见的差异完全不可见，且文档承诺该能力）。
- **建议**: 二选一做代码级修复：① 让组件自举作用域——五个 mobile renderer 的根元素 className 统一追加 `'nop-mobile'`（`notice-bar.tsx:244`、`pull-refresh.tsx:214`、`infinite-scroll.tsx:217`、`swipe-cell.tsx:288`、`countdown.tsx:226`，一行/处，语义为"mobile 渲染上下文"，与 styles.css 注释声明的意图一致）；② 或删除 styles.css 中全部 `.nop-mobile` 前缀，变体规则回到 `[data-slot='notice-bar'][data-variant=…]` 裸选择器（`data-slot` 前缀 `nop-notice-bar-`/`nop-countdown` 等类名已足以避免泄漏，且选择器仍锚定 `data-slot` 协议）。推荐 ①（保持 F2+F3 的防泄漏初衷）。修复后补一条 `getComputedStyle` 变体色断言（warning 根的 `background-color` ≠ transparent）。
- **复核状态**: 未复核

---

### [G4-R5-视角3-02] gantt / kanban / calendar 三个 board 类组件整体零消费 `meta.disabled`：P2-5"禁用整个交互面"契约在 scheduling 全部交互表面失效（barcode-input 为包内正确基线）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:495`（主容器仅消费 `meta.className/testid/cid`）；`packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:561`；`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:448-455`；包内基线对照 `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:290`；契约佐证 `packages/flux-renderers-scheduling/src/scheduling-boundary-narrowing.test.ts:109-114`
- **证据片段**:
  ```tsx
  // gantt.tsx:495 / kanban-board.tsx:561 / calendar.tsx:448-455 —— 三个 board 根节点
  // 全部只读 meta.testid / meta.cid / meta.className，全文件零处读取 meta.disabled
  <div ref={containerRef} data-slot="gantt" className={cn('nop-gantt flex flex-col h-full', meta.className)} data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>
  // 对照：barcode-input.tsx:290 —— 同包表单类组件的正确基线
  disabled={meta.disabled}
  ```
  ```ts
  // scheduling-boundary-narrowing.test.ts:109-114 —— 框架确向 gantt 解析并下发 disabled
  it('RendererResolvedProps<GanttSchema> re-exposes disabled/className as optional', () => {
    type Resolved = RendererResolvedProps<GanttSchema>;
    expectTypeOf<Resolved>().toHaveProperty('disabled');
  ```
- **严重程度**: MEDIUM
- **现状**: 全包 grep（`meta.disabled|resolved.readOnly` × 全部非 test 文件）证实 `meta.disabled` 的消费方只有 barcode-input 一处（且其扫码/清除侧通道缺口已由 [G4-R4-视角3-01] 立案）；gantt、kanban、calendar 三个组件对 `meta.disabled` 的消费为 **0 处**——而框架层明确向它们解析并下发该字段（Phase 2 类型契约测试即断言 `RendererResolvedProps<GanttSchema>.disabled` 存在，测试夹具的 meta 也始终携带 `disabled`）。宿主按文档化用法（styling-system.md:94 `disabled: "${$form.submitting}"` 模式）对甘特图/看板/排班声明禁用后：任务条拖拽/缩放、依赖线创建/删除、Delete 级联删任务、kanban 拖卡/加卡/删卡/建列、calendar 拖拽移动/创建排班全部照常可用，schema 变更事件照常派发。与 [G5-R3-视角3-01]（scada 编辑器 disabled 仅 inert 画布，MEDIUM）、[G5-R4-视角3-01]（ai-chat disabled 半量门控，MEDIUM）同属 P2-5"禁用整个交互面"契约家族——那两条是部分通道失效，本条是三个完整交互表面 0% 消费，且 R4 的 barcode 条目核查面（barcode-input 五条写值通道）不覆盖 board 组件，按 dedup §1"同类根因的新实例"上报。
- **行业惯例**: 交互面板类组件的 disabled 语义是冻结全部交互入口（Jira/GitHub Projects 只读看板呈只读态且拖拽失效；Google Calendar 只读日历不可拖拽创建；MS Project 只读项目不可拖条）；shadcn/ui 生态由 `disabled` + `pointer-events-none` 在容器层统一失活。宿主显式声明的禁用在任何参照系统中都不应留有可写入口。
- **用户影响**: 归档项目计划、历史排班、只读权限看板等场景中宿主声明 `disabled: true` 后，界面无任何锁定视觉，用户照常拖拽任务/移动排班并触发数据变更——"只读"预期与实际可写相互矛盾，权限边界在 UI 层被无声击穿；用户与宿主都无法从界面得知该表面本应锁定。通过真实用户影响检验（禁用声明完全无效果，且这些表面全部具备高冲击写操作）。
- **建议**: 三个组件在根部统一收敛口径（模式对齐 [G4-R4-视角3-01] 建议的 `locked` 收敛）：`const locked = props.meta.disabled === true;`——① 最低成本：根容器追加 `locked && 'pointer-events-none opacity-60'` 并在 drag/dnd hook 入口补 `if (locked) return`（gantt 的 `use-gantt-drag`/`use-gantt-link-draw`/`use-gantt-keyboard`、kanban 的 dnd 注册、calendar 的 `use-calendar-drag*` 均有单一入口可挂守卫）；② 完整方案：向各 hook 透传 `enabled` 形参并同步禁用工具栏变更类按钮。与 [G4-R4-视角3-01] 的 barcode 修复同批落地，补一条"meta.disabled 时拖拽不产生变更事件"的回归测试。
- **复核状态**: 未复核

---

## 去重自检（与 R1–R4 全部 253 条按根因比对）

- **[G4-R5-视角3-01]**（notice-bar 变体色板死 CSS）: R4 归并记录中的"notice-bar gray-_ 调色板类 → R1 [G4-视角7-01] 包级硬编码根因"针对的是**硬编码颜色该不该令牌化**；本条根因是**选择器作用域类从未被输出导致整组规则不可达**（颜色值本身正是 MA-06 有意发布的令牌化色板），机制与修复点完全不同（① 是让组件输出作用域类，② 是去前缀），R1 条目的"改令牌"修复不覆盖本条。与 R4 的"状态属性消费方反查"（G1 包 22 类 data-_ 属性）方法同源但对象为包级 CSS 作用域类，属该方法在 G4 的首次运行与首次命中。
- **[G4-R5-视角3-02]**（三 board 零消费 meta.disabled）← [G2-R2-视角3-01]/[G2-R3-视角3-01]/[G4-R4-视角3-01]（disabled 门禁旁路族）与 [G5-R3-视角3-01]/[G5-R4-视角3-01]（P2-5 契约族）: 同根因家族新实例。区别：G2 三条为表单字段次要通道、G4-R4 为 barcode 侧通道（字段本体已门禁）、G5 两条为组合根半量门控；本条为 scheduling 三个**非表单交互表面**的 0% 消费，前轮全部核查面（R4 barcode 五通道、G5 编辑器/聊天组合根）均不含 gantt/kanban/calendar 的 meta 读取路径，修复点独立。
- **视角 1/2/4/5/6/8/9/10/11/12**: 本轮零新发现——图标/按钮语义、表单交互、空态、弹层、热区、aria、跨组件交互、完成度、反模板化面在三项指定盲区与上述两方法面的运行中均未出现高于门槛的新命中（细节见防复核节）。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

无。本轮未撞见 G-A~G-M 已登记 16 项能力缺口的新表象（swipe-cell 键盘等价沿 G-B2 既有口径；kanban 批量选择沿 G-B3；calendar 多视图创建联动沿 R1 C2 先例，均无新表现）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **gantt 依赖线绘制无目标高亮**（拖拽绘制期间悬停候选任务条无 drop 指示，对照 [G4-R2-视角3-01] calendar 拖拽零反馈同族）: 绘制中虚线 temp line 实时跟随指针（`use-gantt-link-draw.ts:64-73`），用户有持续"正在连线"反馈；落点在空白处=取消是标准语义。真实影响弱于 calendar 条目（彼处完全无反馈），按本轮从严判据不立案，留档供修复 calendar 条目时同批考虑。
- **gantt 依赖线 aria-label 暴露内部 link id**（`gantt-links.tsx:93` `linkLabel: { id }`）: aria-only 表面、sighted 用户不可见，弱于 [G4-R4-视角11-01/02] 的可见直出，按从严判据不立案留档。
- **依赖线重复创建无去重**（`gantt-store.ts:318-324` `addLink` 不查既有 source-target 对，重复绘制产生完全重叠的两条线，删一次"看起来没删掉"）: 需刻意重复同一 8px 手柄手势才触发（且该热区缺陷已由 R1 [G4-视角8-01] 立案，修复后误触面收窄），恢复成本低（再点一次 X），低于门槛留档。
- **swipe-cell"先开后禁用"窄窗**（onAction capture handler :222-249 不 gate disabled）: R4 已弃报留档，本轮复读维持原判（静态 disabled 挂载下区域 inert 不可达）。
- **swipe-cell × 列表滚动组合**专项: `touch-action: 'pan-y'`（swipe-cell.tsx:304）正确让出纵向滚动轴；滚动接管触发 touchcancel → OA-05 重置回弹；列表内另一 cell 的 pointerdown 经 closeOnOutside 关闭当前 cell（:152-164）——组合链路闭环，无新缺口。
- **countdown/notice-bar 定时器边界**专项: 负值钳制（MA-16）、节流下挂钟锚定（OA-21）、暂停恢复不吞窗（MM-14）、reset 停表（OA-13）、closed 态停轮播（MM-15）、文本收缩钳制（OA-19/MM-07）、溢出项驻留≥整周期（OA-20）全部在位且有测试；无新命中。
- **calendar-header 视图切换组**: `aria-pressed` + default/ghost 变体区分选中态，`‹›` 字符与 gray hover 类分别已由 R1 [G4-视角1-01]/[G4-视角7-01] 立案，不重复。
- **gantt-layout 分栏把手**（gantt-layout.tsx:106-117）: `role="separator"` + `tabIndex={0}` + 方向键 resize + aria-valuenow/min/max + `focus:ring-2` 齐备（ring 用 blue-400 归入 R1 [G4-视角7-01] 包级根因），是包内正确基线，无新缺口。
- **barcode-scanner-overlay 焦点陷阱**（useFocusTrap :211）、calendar-overlay/dialog 焦点陷阱（:13）: 均已接线，shared/hooks/use-focus-trap 消费面闭合，无悬空。

## 检查范围

- `packages/flux-renderers-mobile/src/`（12 非 test 文件，与 R1–R4 同口径）: swipe-cell.tsx / countdown.tsx / notice-bar.tsx / pull-refresh.tsx / infinite-scroll.tsx / hooks/use-touch.ts / styles.css 全文精读；mobile-renderer-definitions.ts / schemas.ts / index.ts 对照精读（变体/事件/propContract 面）。
- `packages/flux-renderers-scheduling/src/`（91 非 test 文件，与 R1–R4 同口径）: 本轮定向深读 gantt-links.tsx / use-gantt-link-draw.ts / gantt-markers.tsx / gantt-layout.tsx / calendar-header.tsx / calendar-overlay.tsx 全文，gantt.tsx / kanban-board.tsx / calendar.tsx（meta 消费段与根容器段）精读，shared/hooks/use-focus-trap.ts 消费面反查；其余文件经定向 grep 闭合（`meta.disabled|resolved.readOnly|props.meta`、`nop-mobile`、`nop-gantt-link`、`addLink`）。
- 交叉核实: `flux-guide/mobile/notice-bar.md`（variant 契约）、`docs/plans/2026-07-27-2350-1-mr2-code-test-p1-remediation.md` R2.6（.nop-mobile 作用域化来源）、`apps/playground/src/styles.css:6` 与全部 19 页（`.nop-mobile` 零输出确认）、`scheduling-boundary-narrowing.test.ts`（disabled 解析契约）。

## 检查方法

1. **指定盲区逐项走查**: 三项残余盲区（swipe-cell×滚动、定时器边界、依赖线交互）按"事件 → 状态 → 视觉反馈 → 边缘态"链路通读对应源码与既有 OA/MA/MM 修复注释，逐项对照前轮已立/已弃报清单。
2. **变体样式消费反查**（新方法面）: 从 `data-variant` 发射点反查包内 CSS 消费方 → 发现选择器全部挂在 `.nop-mobile` 作用域下 → 全仓 `rg -l nop-mobile` 反查该类生产方（零命中）→ 核对文档契约（flux-guide）与测试断言面（仅属性存在性）闭合证据链。
3. **disabled 门禁全类反查**（"修一处必须查全类"）: 以 [G4-R4-视角3-01] 为起点，`meta.disabled|resolved.readOnly` 全包 grep 逐命中定位 → 确认消费方仅 barcode-input → 对三个 board 组件的 meta 读取面逐文件核对（`meta.className/testid/cid` 在读、`disabled` 零读）→ 以框架类型契约测试佐证字段确已下发。
4. **静态口径声明**: 本轮为源码静态审查（无浏览器运行时验证）。[G4-R5-视角3-01] 的"规则不可达"结论基于选择器前缀与类生产方的全仓 grep 事实（无运行时不确定性）；[G4-R5-视角3-02] 的"零消费"基于全包 grep + 逐文件 meta 读取面核对，置信度高。建议复核阶段对前者补 Playwright `getComputedStyle` 断言、对后者补"disabled 声明后拖拽无效"运行时断言。

## 汇总

| 严重程度 | 数量 | 编号               |
| -------- | ---- | ------------------ |
| HIGH     | 0    | —                  |
| MEDIUM   | 2    | 视角3-01、视角3-02 |
| LOW      | 0    | —                  |

共 **2 条**（HIGH 0 / MEDIUM 2 / LOW 0）。G4 累积（R1+R2+R3+R4+R5）: 14 + 10 + 8 + 5 + 2 = **39 条**；全审查累积（R1–R5）: 253 + 2 = **255 条**。

## 结论

新发现 2 条，均为 MEDIUM，且都来自本轮新增的两个方法面（变体样式消费反查、disabled 门禁全类反查）而非既有视角的机械重复。三项指定残余盲区（swipe-cell×列表滚动组合、countdown/notice-bar 定时器边界、gantt 依赖线交互）经逐项走查均已闭合：mobile 包五个组件在四轮 OA/MA/MM 修复后处于高度完备状态，无新命中；scheduling 包的依赖线交互残余候选（绘制无目标高亮、aria 内部 id、重复创建无去重）均低于本轮从严价值门槛，已留档防复核。G4 组趋势 14 → 10 → 8 → 5 → 2，递归增益已收敛至"新方法面偶发命中"水平——**建议 G4 组审查收敛**。

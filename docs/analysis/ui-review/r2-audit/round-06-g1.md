# R2 第 6 轮递归扩展发现（round-06-g1）— G1 收敛终判轮

> 组号: G1（basic / content / layout） · 轮次: Round 06（收敛终判轮，最严格价值判据） · 审查日期: 2026-08-28 · agent: general（fresh session，只读审查） · HEAD `0f183874a`（与 R1–R5 同基线）
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + 收敛终判附加判据（仅立"前 5 轮所有方法面未触及的全新根因"且通过真实用户影响检验且与 269 条已有发现逐根因比对为全新）
> 输入: round-01（G1 段精读）+ round-02-compact / round-03-compact 全文 + round-04（G1 段与头部汇总精读）+ round-05-g1 全文（累积 269 条）；dedup-baseline §1–§4 全部生效
> 本轮性质: 收敛终判——只有全新根因才立案；已有根因的同组件复述、纯视觉偏好、无明确用户影响的零散细节一律弃报留档

## 发现汇总

共 **2 条**（HIGH 0 / MEDIUM 2 / LOW 0）。G1 组收敛趋势: 15 → 6 → 2 → 5 → 1 → **2**（本轮两条均为前 5 轮方法面未触及的组件/机制，非收敛趋势反弹，见逐条去重自检）。

---

### [G1-R6-视角8-01] tabs 仅移动端水平形态有滚动契约：桌面端页签过多时 TabsList 溢出容器/被裁剪，右侧页签不可达——同组件移动分支已自证正确做法（宽内容无滚动契约族新实例）

- **文件**: `packages/flux-renderers-basic/src/tabs.tsx:320-329`（mobile-only 溢出分支）、`:258-268`（mobile-only scrollIntoView）；对照基类 `packages/ui/src/components/ui/tabs.tsx:23`（TabsList 无 overflow/wrap）、`:56`（Trigger `flex-1` + `whitespace-nowrap` 的 min-content 下限）
- **证据片段**:
  ```tsx
  // tabs.tsx:320-329 —— 溢出契约只在 isMobile && horizontal 分支存在
  const tabsList = (
    <TabsList
      ref={tabsListRef as React.Ref<HTMLDivElement>}
      variant={schemaProps.variant ?? variant}
      className={cn(
        isMobile && orientation === 'horizontal'
          ? 'nop-scrollbar-hide overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : undefined,
      )}
    >
  ```
  ```ts
  // ui/tabs.tsx:23 —— TabsList 基类：inline-flex w-fit + nowrap 触发器，无 overflow / flex-wrap / min-w-0
  'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground ... group-data-[orientation=horizontal]/tabs:h-8 ...',
  ```
- **严重程度**: MEDIUM
- **现状**: 页签栏的溢出处理只存在于移动端水平分支（`overflow-x-auto` + 活动页签 `scrollIntoView`，tabs.tsx:258-268/324-328）；桌面端水平与 vertical/sidebar 形态零溢出处理。TabsList 基类为 `inline-flex w-fit`，Trigger 为 `whitespace-nowrap` + `flex-1`（min-width:auto 下限 = 整行文本宽）：当页签总宽超过容器宽（桌面半宽卡片/栅格列中放 6+ 个中文页签的常见形态），`w-fit` 被 min-content 抬高到内容总宽，TabsList 以可视溢出撑出父容器——宿主无裁剪时页签栏叠压相邻布局，有裁剪（卡片/Dialog 体/page body overflow）时右侧页签不可见不可点，垂直 sidebar 形态在限高容器内同理纵向溢出。全仓 CSS 反查（`nop-tabs`/`tabs-list` 于 packages 与 playground styles.css）零补偿规则。同组件移动分支已实现"列表内滚动 + 活动项回中"，桌面分支漏接——同组件内双轨；行业侧 Ant Design Tabs 对溢出页签自动滚动并提供渐隐遮罩与翻页箭头。
- **行业惯例**: Ant Design Tabs：nav 宽度不足时自动滚动 + 两端翻页按钮（`more` 图标），页签永不溢出容器；MUI Tabs 同样以 ScrollableTabKey 变体提供容器内滚动；shadcn/ui 官方 TabsList 虽有同样局限，但本项目优先级规则下更重的判据是**本组件自己的移动分支**与同仓 page-aside（R4）/markdown（R5）已确立的"surface 长内容必须有滚动契约"基线。
- **用户影响**: 桌面用户在半宽容器（卡片内页签、栅格列内页签——后台系统常见布局）看到页签栏伸出卡片边界叠压右侧内容，或最后几个页签被裁剪且无任何滚动手段，切换到这些页签的唯一途径是横向滚动整个页面；与手机上同一组件"页签栏内滑动"的行为互相矛盾。
- **建议**: 把移动分支的滚动契约提升为桌面水平形态的默认：`tabs.tsx:324-328` 的条件去掉 `isMobile`（保留 `orientation === 'horizontal'`），对桌面保留可见滚动条（去掉 `nop-scrollbar-hide`/`[scrollbar-width:none]` 两个隐藏类或仅在移动端隐藏）；vertical 形态在 TabsList 上补 `max-h-full overflow-y-auto`（配合宿主限高容器）。滚动条样式二选一后，补一条"窄容器桌面 tabs 无页面级横向溢出且末位页签可点击"的 Playwright 断言。
- **复核状态**: 未复核
- **条目级去重自检**: ≠ [G1-R3-视角8-01]（tabs 移动端滑动手势劫持嵌套滚动）——不同机制（手势边界 vs 溢出契约）、不同代码路径（swipe tracker vs TabsList className），修复互不覆盖。≠ [G1-R4-视角6-01]（page aside Sheet 无滚动）/ [G6-R2-视角6-01]（DrawerBody）/ [G1-R5-视角8-01]（markdown 溢出）——同属"长内容无滚动契约"根因族的**不同组件新实例**（tabs），修复点（TabsList 非移动分支加 overflow）与前三者（Sheet/Drawer/markdown 容器）互不覆盖；R5 响应式终扫的组件清单（timeline/steps/cards/grid/text）明确未含 tabs，R3/R4 对 tabs.tsx 的通读分别只聚焦手势与 data-\* 消费面，本条处于三次通读的镜头盲区，为首次报告。

---

### [G1-R6-视角8-02] closable alert 关闭钮 absolute 悬浮未给内容预留右内边距：ui Alert 已内建 AlertAction 让位契约（pr-18）而渲染器自绘按钮绕过了它，长文本尾部与关闭钮叠压且点击文本尾易误关

- **文件**: `packages/flux-renderers-content/src/alert-renderer.tsx:104-116`；对照 ui 基类契约 `packages/ui/src/components/ui/alert.tsx:7`（`has-data-[slot=alert-action]:pr-18`）与 `:65`（AlertAction 槽位 `absolute top-2 right-2`）
- **证据片段**:
  ```tsx
  // alert-renderer.tsx:104-116 —— 自绘关闭钮：无 data-slot="alert-action"，内容无任何让位
  {
    closable ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1.5 right-1.5 size-6"
        aria-label={t('flux.common.close')}
        data-testid="alert-close"
        onClick={handleClose}
      >
        <XIcon className="size-3.5" />
      </Button>
    ) : null;
  }
  ```
  ```tsx
  // ui/alert.tsx:7 —— 基类已内建"存在 alert-action 槽位即给整卡预留右内边距"的契约，渲染器未触发
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 ... has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 ...",
  ```
- **严重程度**: MEDIUM
- **现状**: `closable: true` 时关闭钮以 `absolute top-1.5 right-1.5 size-6`（24px）悬浮在 Alert 右上角，但标题/描述内容没有获得任何右侧让位：Alert 主体是 `grid-cols-[auto_1fr]`，内容列一直延伸到右内边距（仅 10px），首个文本行的尾部 ~30px 区域落在关闭钮的命中区之下。ui Alert 基类专门写了 `has-data-[slot=alert-action]:pr-18`（存在 `data-slot="alert-action"` 后代即给整卡 72px 右让位）——说明设计体系已预见"右上角悬浮动作钮需要内容让位"，而渲染器自绘按钮未携带该 data-slot，内建契约被静默绕过。窄容器（移动端/半宽列——本仓明确支持场景）中多行公告条的首行几乎必然触达右缘：X 图标（16px）压在标题尾部字符上；且该 24×24 区域点击行为是**关闭整条 alert**，用户想点选/查看标题尾部文字时误触即整条消失。R1 核对项"alert 关闭按钮 ghost size-6 + aria-label 符合基线"仅覆盖图标/尺寸/可访问名三维，几何让位维度未被任何轮次触及。
- **行业惯例**: Ant Design Alert `closable` 时内容区自动获得 `padding-inline-end: 38px` 让位（` ant-alert-with-description` 同理）；shadcn/ui 官方 AlertAction 模式即以预留 padding 防止动作钮压内容——本项目 ui 层已按此契约实现（pr-18），消费方绕过即偏离。
- **用户影响**: 用户在手机上阅读一条 closable 的系统公告/校验提示，标题最后一个词被 X 图标叠压难以辨认；想点选文字复制或点击行内链接时，命中右上区域导致整条公告被误关、内容丢失需刷新找回——可复现于任何窄容器长文案公告条。
- **建议**: 二选一：① 关闭钮改用 ui `AlertAction` 槽位（`<AlertAction>` 包裹该 Button 或直接给 Button 补 `data-slot="alert-action"`），自动获得 pr-18 让位，一行修复且回归设计体系契约；② 保持自绘位置但 `closable` 时给 Alert 追加 `pr-8`。修复后补一条"长标题 closable alert 首行文本与关闭钮 getBoundingClientRect 不相交"的断言。
- **复核状态**: 未复核
- **条目级去重自检**: ≠ [G1-视角4-10]（text maxLineToggle 文字溢出 20px 按钮）——同属"按钮与文本叠压"表现族，但机制不同（彼为按钮自身内容溢出按钮框，本为绝对定位钮未获内容让位），组件不同、修复互不覆盖，按 dedup §1 兄弟实例上报并互引。≠ R1 防复核清单"alert 关闭按钮符合基线"——该核对仅覆盖 icon/size/aria-label，几何让位未在核对范围内，非已弃报项复活。≠ [G6] ui alert 模块审计——根因落点在渲染器消费侧（未触发基类契约），G6 对 ui 模块本身的审计不覆盖渲染器组合行为。

---

## 去重自检声明（与累积 269 条逐根因比对）

- 本轮共评估候选 4 项，立案 2 条、转 C2 候选 1 项、弃报 1 项。两条立案均完成逐根因比对（上方条目级自检）：
  - [G1-R6-视角8-01] ← 引根 [G1-R5-视角8-01]/[G1-R4-视角6-01]/[G6-R2-视角6-01]（"surface 长内容无滚动契约"族），新组件（tabs 非移动分支）+ 修复互不覆盖，R5 响应式终扫组件清单未含 tabs，非已立条目复述。
  - [G1-R6-视角8-02] ← 引根 [G1-视角4-10]（按钮与文本叠压族），新组件（alert closable）+ 新机制（让位契约被绕过）+ 修复互不覆盖。
- 与 G1 组其余 27 条（R1 15 / R2 6 / R3 2 / R4 5 中未引到的）零交集；与 G2–G7 组 240 条零交集（同类族中 page-aside/DrawerBody/markdown/countdown 等条目的修复均不触及 tabs TabsList 与 alert 渲染器）。
- dedup §3 误报对照 8 条未触碰（本两条均非 opacity-0/ml-auto/ghost/小图标钮/截断/role=button/destructive/transition-all 模式）；§4 边界排除未触碰（两条均为交互几何与视觉呈现，非 RendererComponentProps 契约/marker/WCAG 全量）。

## 转 C2 候选（dedup §2 规则，不计入发现）

1. **carousel `orientation` 声明未实现**: `packages/flux-renderers-content/src/schemas.ts:47` 声明 `orientation?: 'horizontal' | 'vertical'`，`content-renderer-definitions.ts:52-64` 已注册为 designer 可编辑 prop（含 literal union），但 `carousel.tsx` 全文不读取该字段——`<Carousel opts={{ loop }} ...>`（:249）从不传 orientation，垂直轮播 UI 完全不存在。与 R1 已转 C2 的 tabs closable/draggable/addable、dialog draggable/allowFullscreen 同族（声明未实现的 capability gap），沿 R1 先例归 C2 不计入发现。

## 本轮核对过且不构成发现的候选（弃报留档，防复核重复提问）

- **alert 关闭钮以外的疑点**：Alert 基类含 `relative`，关闭钮包含块正确（已核实 ui/alert.tsx:7），非定位逃逸问题。
- **progress `showValue` 显示原始 value 而非百分比**（progress.tsx:47,64-68）：`value=35/max=50` 显示 "35" 无单位无上下文——AntD 默认显示百分比，但此处为 opt-in 且配 label 槽位可自补上下文，属设计取舍非缺陷，低于终判门槛。
- **icon.tsx 未知图标名静默回退 Circle**（icon.tsx:34 + icon-utils.ts:283-294）：作者拼错图标名得到一个圆形图标且无告警（size 非法倒有 console.warn）——影响面为作者调试体验而非终端用户交互，且 `resolveLucideIconStrict` 已为需要严格语义的消费方（empty/alert/page）在位，不立案。
- **page `footerIsFixed = footerClassName.includes('fixed')` 字符串嗅探**（page.tsx:98）：`sticky` 页脚或任意值写法的 fixed 不会获得软键盘避让偏移——启发式兜底的天 habit 边缘，键盘避让主路径（真 `fixed` 类名）工作正常，低于门槛。
- **R5 已弃报项复核维持**：collapse-count 徽标间距、collapse-tone-bar 无背景色（宿主 hook 文档化）、badge 空文本空 pill（R3 弃报）、tabs 空 items 空 TabsList（R3 弃报）——现状未变化，不重复。
- **三包终扫 grep 复跑**（本轮独立复验 R5 结论）：硬编码 Tailwind 调色板类仅 `diff-three-column-view.tsx:97` bg-gray-50（[G1-视角7-08] 已立案）；文本字符图标仅 diff-header ↑/↓（[G1-视角1-07] 已立案）；progress oklch 字面量（[G1-视角7-09] 已立案）；diff-view.css oklch 均在其自有令牌定义块内（符合该文件头部声明）；qrcode #000/#fff 为 QR 规范功能默认（R1 已豁免）。零新增命中。

## 检查范围（逐文件）

- `packages/flux-renderers-basic/src/` 非 test 源文件 28 个：
  - **本轮精读**（新镜头）：`tabs.tsx`（全文——溢出契约/双轨分支）、`page.tsx`（全文——header/footer/aside 三区几何复核）、`use-fixed-footer-visual-viewport.ts`（全文）、`badge.tsx`、`icon.tsx`、`dialog.tsx`/`drawer.tsx`（surface 薄壳确认零 UI 面）、`text.tsx`（复核——仅 R1 已立案项）、`scope-debug.tsx`（R1 已立案项维持）。
  - **R1–R5 已全覆盖、本轮经终扫 grep + 结构反查确认零新增**：button / dynamic-renderer / collapse 同包兄弟（container / flex / fragment / loop / structural-loop / recurse / reaction / interaction-owner / status-hooks / utils / copy-to-clipboard / use-surface-renderer / schemas / basic-renderer-definitions / surface-renderer-definitions / basic-renderer-contracts / index）。
- `packages/flux-renderers-content/src/` 非 test 源文件（含 diff-view 子目录）38 个：
  - **本轮精读**（新镜头）：`carousel.tsx`（全文——箭头边界禁用已核实正确、orientation 声明面、autoplay 四源暂停复核）、`alert-renderer.tsx`（全文——几何让位镜头）、`html.tsx`、`spinner.tsx`、`empty.tsx`、`progress.tsx`、`link.tsx`（复核——disabled 基线维持）、`markdown.tsx`（R5 已立案项维持）。
  - **R1–R5 已全覆盖、本轮终扫确认零新增**：audio / video / qrcode / image / json-view / cards-renderer / card / status / mapping / separator / styles.css / sanitize / content-renderer-definitions / schemas / diff-view 全家（model 4 + components 8 + adapters + utils + css + renderer）。
- `packages/flux-renderers-layout/src/` 非 test 源文件 16 个：
  - **本轮精读**（新镜头）：`collapse-renderer.tsx`（全文——disabled/几何复核，R2/R5 已立案项维持）。
  - **R1–R5 已全覆盖、本轮终扫确认零新增**：steps / timeline / wizard / wizard-step-nav / wizard-step-body / wizard-step-helpers / button-group / dropdown-button / grid / responsive / styles.css / schemas / layout-renderer-definitions / process-display-definitions / index。
- **交叉核实（ui 基类反查）**：`packages/ui/src/components/ui/tabs.tsx`（TabsList/Trigger 基类）、`ui/carousel.tsx`（prev/next 边界 disabled）、`ui/alert.tsx`（AlertAction 让位契约）、`ui/src/lib/icon-utils.ts`（回退语义）、`apps/playground/src/styles.css` 与各包 styles.css（`nop-tabs`/`tabs-list`/`nop-markdown` 消费反查）。

## 检查方法

1. **镜头补盲**：以 R5 响应式终扫组件清单为基线做差集，找出从未被"溢出/几何契约"镜头覆盖的组件（tabs、alert），逐个全文精读并对其 ui 基类做双向反查（组件分支 ↔ 基类契约）。
2. **CSS 机制实算**：对 tabs 溢出候选按 CSS sizing 规范逐层推演（`w-fit` = min(max-content, max(min-content, available))；Trigger `flex-1` + `whitespace-nowrap` + min-width:auto → min-content 下限），并用全仓 CSS 反查排除补偿规则。
3. **声明面比对**：对三包 schemas/definitions 与渲染器消费做字段级差集（发现 carousel orientation 一项，归 C2）。
4. **终扫复跑**：调色板类 / 文本字符图标 / 硬编码英文 / oklch·hex 字面量四组正则独立复跑，命中逐条归因到已立案条目或弃报留档。

## 结论

新发现 **2 条**（HIGH 0 / MEDIUM 2 / LOW 0）。累积（R1–R6）: 269 + 2 = **271 条**。两条均为前 5 轮方法面镜头盲区（tabs 溢出契约、alert 几何让位）中的真实用户影响缺陷，非已有根因复述；G1 组三包的其余全部非 test 文件经本轮镜头补盲 + 终扫复跑后未再产生达标候选。**G1 组递归审查至此无残余镜头盲区，建议审查结束。**

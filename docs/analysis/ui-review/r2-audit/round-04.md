# R2 第 4 轮递归扩展发现（round-04）

> 轮次: Round 04（递归扩展；自本轮起按 skill 上下文管理节启用压缩摘要策略：round-02 以 compact 提供，R1 与上一轮全文保留） · 审查日期: 2026-08-28 · HEAD `0f183874a`
> 派发机制: opencode `task` / general × 7（fresh session）；提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + 压缩策略输入（round-01 全文 / round-02-compact / round-03 全文）
> session 证据链: G1 ses_fb74bbc75ffeMvhccE59ribxzV · G2 ses_fb74ba75effePuRqTvC22sM3TK · G3 ses_fb74b90adffexb0W0K1f4KCzGa · G4 ses_fb74b78eaffeJBVJ2k91pHzhO7 · G5 ses_fb739bd5effepZGqxKE5hRSzO6 · G6 ses_fb74b4f8cffeLTanTBle0XHNgK · G7 ses_fb739a685ffeAT7fJss9qr5EOd
> 主 agent 完整性检查: 29/29 条通过六要素程序化校验
> 主 agent 轮间去重校验: 与 R1+R2+R3 共 224 条逐根因比对——**零完全重复**；同根因新实例（保留独立条目、打共性标记）: [G5-R4-视角11-01]←[G3-R3-视角11-01]（固定落点重叠跨包）、[G4-R4-视角?-barcode]←G2 disabled 门禁族（跨包新实例，互引）、[G1-R4] timeline 轴线零宽←steps 连接线断裂、[G1-R4] page aside Sheet 无滚动←DrawerBody 无滚动契约；各组文件内去重自检记录已随文落盘

## 覆盖率与发现汇总

| 组  | 目标                                 | 发现                               | 覆盖与口径                                                                                                                                                          | session                                                                                             |
| --- | ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| G1  | basic / content / layout             | HIGH 0 / MEDIUM 4 / LOW 1，共 5 条 | 状态属性消费方反查（22 类 data-\* 发射点全量枚举+全仓消费反查）+ 组合场景走查；2 条为已立根因跨组件兄弟实例。                                                       | ses_fb74bbc75ffeMvhccE59ribxzV                                                                      |
| G2  | form / form-advanced                 | HIGH 0 / MEDIUM 3 / LOW 0，共 3 条 | disabled/readOnly 门禁族全次要写入通道回溯 + 上传/编辑器 async 竞态精读；4 处 grep 误导已排除；组内趋势 19→8→3，建议本组收敛。                                      | ses_fb74ba75effePuRqTvC22sM3TK                                                                      |
| G3  | data / dashboard / pivot             | HIGH 2 / MEDIUM 2 / LOW 0，共 4 条 | 虚拟化×行选择×拖拽×固定列组合矩阵 + 列契约全链复核；2 条 HIGH 经 Chromium 运行时实测确证（Playwright getBoundingClientRect/最小复现；探针按规范落 \_tmp/ 并清理）。 | ses_fb74b90adffexb0W0K1f4KCzGa                                                                      |
| G4  | mobile / scheduling                  | HIGH 1 / MEDIUM 4 / LOW 0，共 5 条 | 组合与键盘路径（drop target 栈/确认链/gantt 键盘 case）+ barcode 五条写值通道 disabled/readOnly 守卫矩阵 + 兄弟实例 grep；6 处低价值同根因命中并入已立条目备忘。    | ses_fb74b78eaffeJBVJ2k91pHzhO7                                                                      |
| G5  | ai / graph / map / industrial+editor | HIGH 0 / MEDIUM 4 / LOW 2，共 6 条 | ai 嵌套会话组合（disabled 透传链/切换时序/错误恢复闭环）+ editor 终态矩阵 + 引擎三终态×UI 消费矩阵；每条经引擎侧代码路径二次核实；静态口径沿 R0/R1。                | ses_fb739bd5effepZGqxKE5hRSzO6（首派 ses_fb74b646bffe2hJFSdtilS3pX1 因速率限制失败，重试 1 次成功） |
| G6  | @nop-chaos/ui 62 模块                | HIGH 0 / MEDIUM 1 / LOW 0，共 1 条 | 滚动契约（18 个弹层/容器）+ 悬空 CSS 变量双向扫描 + aria 关联链逐链核对；6 项低于门槛候选已随文登记；组内趋势 16→6→1→1，三大盲区闭合。                              | ses_fb74b4f8cffeLTanTBle0XHNgK                                                                      |
| G7  | playground 19 页                     | HIGH 0 / MEDIUM 3 / LOW 2，共 5 条 | 19/19 schema 全量通读 + 逐 endpoint 实算分布核对 + openDialog 链路经 flux-runtime action-adapter 证实；2 条标注 R3 同根因新实例。                                   | ses_fb739a685ffeAT7fJss9qr5EOd（首派 ses_fb74b3938ffeGpEdB1t4LYWTqR 因速率限制失败，重试 1 次成功） |

汇总: HIGH 3 / MEDIUM 21 / LOW 5，共 **29 条**。累积（R1–R4）: **253 条**（HIGH 16 / MEDIUM 155 / LOW 82）。收敛趋势: 127 → 63 → 34 → 29（G2/G6 已声明组内收敛，其余组仍有个别新根因，继续第 5 轮）。

---

## G1 — basic / content / layout（HIGH 0 / MEDIUM 4 / LOW 1，共 5 条）

### [G1-R4-视角8-01] timeline 水平模式的连接轴线零宽不可见：axis span 无宽度来源，垂直模式同槽位实现正常

- **文件**: `packages/flux-renderers-layout/src/timeline-renderer.tsx:301-307`（父级 li 布局 :283-289）；对照同文件垂直轴 :291-300、`packages/flux-renderers-layout/src/styles.css:24-35`
- **证据片段**:
  ```tsx
  // :283-289 —— 水平模式下 li 是 flex-col items-center
  className={cn(
    'relative flex',
    orientation === 'vertical' ? 'w-full' : 'flex-col items-center',
    ...
  // :301-307 —— 水平轴 span：h-px 只给了高度，宽度无任何来源
  {orientation === 'horizontal' && index > 0 && (
    <span
      aria-hidden="true"
      data-slot="timeline-axis"
      className="h-px self-center bg-border"
    />
  ))}
  ```
- **严重程度**: MEDIUM
- **现状**: 水平时间线的轴线占位 span 处于 `flex flex-col items-center` 容器内，`self-center` 使其横向收缩为内容宽度（空内容 = 0），`h-px` 只声明 1px 高度——该元素实际渲染为 0×1px，轴线完全不可见。全仓 grep 证实 `timeline-axis` 除发射点外零消费方（`styles.css` 仅根节点 `flex-direction/align-items/gap/overflow` 规则，无任何 `w-*`/`width` 补偿；playground 无命中）。对照同文件垂直模式（:291-300）：`absolute top-0 bottom-0 w-px bg-border` 挂在 `relative` 的 li 上，轴线正常渲染——同一组件同一槽位两种取向一好一坏。这是 round-02 [G1-R2-视角8-01]（steps 水平连接线 absolute 缺 relative 包含块，轴线脱离步骤项）已立"连接线渲染断裂"根因在 timeline 上的兄弟实例，但机制不同（steps 是定位错容器，本条是宽度恒为零），steps 侧修复不会覆盖本处。
- **行业惯例**: 横向流程/时间线组件（Ant Design Steps 水平连接线、Arco Design Timeline horizontal、dhtmlxGantt 时间轴）中连接轴线是承载"先后关系"的核心视觉，缺轴线的点序列读作一堆悬浮圆点；shadcn/ui Stepper 演示亦以 connector 连接各步骤节点。
- **用户影响**: schema 作者选用 `orientation: "horizontal"`（进度回顾、审批流转等横向展示场景）后，页面渲染出一排互不相连的彩点与文字块——时间线的"时间轴"不存在，视觉上像渲染故障；用户只能靠排列顺序猜测事件先后，失去时间线组件的表达力。
- **建议**: 给水平轴 span 补宽度并按连接方向定位，最小改法：`className={cn('h-px w-full bg-border', ...)}` 且让该 span 作为 li 的首行铺满（去掉 `self-center`，li 增加相对定位后改 `absolute top-3 left-[-0.5rem] right-[-0.5rem]` 与相邻项 gap-4 对接，参照 steps :245-249 的居中拉伸写法但修正其包含块问题）；或最简单地对 `.nop-timeline[data-orientation='horizontal'] [data-slot='timeline-axis']` 在 styles.css 补 `width: 100%`（flex-col 下配合 `order:-1` 置于点上方）。修复后补一条水平模式轴线可见性断言。
- **复核状态**: 未复核

---

### [G1-R4-视角5-01] content 包空值态双轨：json-view / markdown / html 空值且未配 empty region 时渲染完全空白，cards / image / qrcode / audio 同场景均有 muted 兜底文案

- **文件**: `packages/flux-renderers-content/src/json-view.tsx:30-44`；`packages/flux-renderers-content/src/markdown.tsx:83-97`；`packages/flux-renderers-content/src/html.tsx:21-35`（对照同包基线 `cards-renderer.tsx:199-201,242-246`、`image.tsx:195-210`、`qrcode.tsx:73-95`、`audio.tsx:35-52`）
- **证据片段**:
  ```tsx
  // json-view.tsx:33-43 —— 空值分支：无 empty region 时 children 为 null，容器亦无任何占位样式
  return (
    <div ... data-slot="json-view" data-state="empty"
      className={cn('nop-json-view', props.meta.className)}>
      {hasEmpty ? emptyContent : null}
    </div>
  );
  // markdown.tsx:94 —— 错误分支有文案，空值分支同样为 null
  {fetchError ? t('flux.common.loadFailed') : (hasEmpty ? emptyContent : null)}
  // 对照 cards-renderer.tsx:199-201 —— 同包已确立的兜底基线
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  ```
- **严重程度**: MEDIUM
- **现状**: 三个内容型组件在"值为空且 schema 未配 empty region"时渲染一个零内容的 div（json-view 的容器甚至无 flex/居中/最小高度样式，纯空白块）。同包其余内容组件在同一场景全部有默认兜底：cards 用 `resolveRendererSlotContent(..., { fallback: t('flux.common.noData') })`（经 `render-nodes.tsx:238` 确认 fallback 必返回）、image 渲染 `alt || t('flux.common.noData')`、qrcode 渲染 `t('flux.common.noValue')`、audio/video 渲染 `t('flux.common.noSource')`。即同一包内"空值要不要有默认提示"存在 3:4 分裂，且空白侧恰是数据绑定最常用、空值最常出现的三个组件（`${data}` 未加载/返回空时用户看到的是一片空白）。这是"空态无默认提示渲染空白"已立根因（[G3-视角5-05] dashboard 0 面板、[G5-R2-视角5-03] ai-message-list）在 content 包的新实例——G3/G5 的修复均不覆盖本包。
- **行业惯例**: shadcn/ui Empty / Ant Design Empty：数据面空态默认给出居中的 muted 提示；本项目视角 5 基线"空数据渲染须有意义提示（非空白/空串）"，且包内 4 个组件已经用 `flux.common.noData/noValue/noSource` 确立了该基线。
- **用户影响**: 用户打开绑定远程数据的 JSON 查看器或 markdown/HTML 区块，数据未到或为空时界面什么都不显示——无法区分"加载中/加载失败/确实为空"，会把空白当作渲染残缺；与同页使用 cards/image 的空态提示风格互相矛盾。
- **建议**: 三处照抄 cards 模式：`resolveRendererSlotContent(props, 'empty', { fallback: t('flux.common.noData') })`，并将空值容器统一为 `flex min-h-24 items-center justify-center text-sm text-muted-foreground`（对齐 cards-empty 的 muted 提示风格，json-view 现容器无样式需一并补齐）；保留 empty region 覆盖通道不变。
- **复核状态**: 未复核

---

### [G1-R4-视角6-01] page 移动端 aside 折叠进 Sheet 后无滚动契约：长侧栏内容在 h-full 弹层内溢出且不可达（[G6-R2-视角6-01] 同根因新实例）

- **文件**: `packages/flux-renderers-basic/src/page.tsx:260-266`（对照同文件桌面 sticky 分支 :146-148、消费基类 `packages/ui/src/components/ui/sheet.tsx:58-64`）
- **证据片段**:
  ```tsx
  // page.tsx:260-266 —— 移动端 aside 直接塞进 SheetContent，无任何 overflow 处理
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent side={side} data-page-aside-sheet="true">
      <aside data-slot="page-aside" className={cn(asideClassName)}>
        {asideContent}
      </aside>
    </SheetContent>
  </Sheet>
  // sheet.tsx:62 —— SheetContent 基类：flex flex-col + h-full（left/right 侧），无 overflow-y-auto
  'fixed flex flex-col gap-4 bg-popover ... data-[side=left]:h-full data-[side=left]:w-3/4 ...',
  ```
- **严重程度**: MEDIUM
- **现状**: `useIsMobile()` 时 page 的 aside 内容改由 `PageAsideToggle` 的 Sheet 承载（page.tsx:196-212），但注入路径上没有任何滚动兜底：`SheetContent` 基类是 `flex flex-col gap-4` + `data-[side=*]:h-full` 的固定高度面板（无 `overflow-y-auto`），内部 `<aside>` 仅有 schema 传入的 `asideClassName`。桌面内联分支在同文件 :146-148 明确为 sticky 场景写了 `maxHeight: '100vh', overflowY: 'auto'`——说明"aside 可能高于视口"是已知前提，移动端路径漏接。G6-R2 曾登记 [G6-R2-视角6-01]（DrawerBody 无滚动契约，MEDIUM）并复核确认 Sheet 三个消费方（kanban-activity-log/select-mobile/sidebar）各自兜底——page-aside Sheet 是该复核未枚举到的第 4 个消费方，且是唯一没有自兜底的。这是"surface 长内容无滚动契约"同根因在新组件（page）上的新实例，G6 的 Drawer 修复不覆盖本处。
- **行业惯例**: 移动端侧栏抽屉（Vant Popup、Ant Design Mobile Drawer、shadcn Sheet 官方 sidebar 集成）一律在内容区提供 `overflow-y-auto`；固定高度弹层内容不可滚动导致尾部不可达属功能缺陷。
- **用户影响**: 手机上打开带侧栏导航树/长筛选列表的页面（侧栏内容高为一屏的常见形态），点开侧栏 Sheet 后只能看到首屏内容，向下滑动毫无反应，底部条目（如"退出/保存"类动作）永久不可达——用户会判定弹层坏了或内容缺失。
- **建议**: `page.tsx:262` 的 `<aside>` 补 `className={cn('min-h-0 flex-1 overflow-y-auto', asideClassName)}`（flex-col 容器内先 min-h-0 再滚动，与 kanban-activity-log 的兜底写法同构）；或最低成本在 `SheetContent` 上加 `overflow-y-auto`。补一条"aside 内容高于视口时 Sheet 内可滚动到底"的 Playwright 断言（`scrollTop` 可变 + 尾部元素 `isIntersecting`）。
- **复核状态**: 未复核

---

### [G1-R4-视角8-02] steps 可点击区只有 28px 圆形指示器：标题/描述不在热区，点击标题静默无反应——与同仓 wizard-step-nav 整钮可点双轨

- **文件**: `packages/flux-renderers-layout/src/steps-renderer.tsx:262-310`（对照同包基线 `packages/flux-renderers-layout/src/wizard-step-nav.tsx:91-149`）
- **证据片段**:
  ```tsx
  // steps-renderer.tsx:262-286 —— 唯一的点击目标：size-7（28px）圆形指示器按钮
  <Button
    variant="ghost"
    data-slot="steps-indicator"
    ...
    aria-label={`${t('flux.steps.step')} ${index + 1}: ${item.title ?? ...}`}
    onClick={() => handleClick(item, index)}
    className={cn('nop-steps-indicator relative z-10 flex size-7 shrink-0 ...')}
  >
  // :287-310 —— 标题与描述是纯展示节点，无 onClick、无 cursor、不可聚焦
  <div className={cn('min-w-0', ...)}>
    <span data-slot="steps-title" className={cn('text-sm font-medium leading-tight', ...)}>
      {item.title ?? item.value ?? item.key ?? index + 1}
    </span>
  ```
- **严重程度**: MEDIUM
- **现状**: steps 的步骤跳转（`clickable` 时 onChange 驱动，R1 已确认"点击即 onChange 为既定行为"）只绑定在 28×28px 的圆形指示器按钮上；紧邻的标题（用户实际阅读的导航标签）和描述是纯 span，点击无任何反应也无 cursor 提示。同仓 `wizard-step-nav.tsx:91-149` 的同语义组件把序号标记 + 标题 + 描述整体包进一个 Button（`h-auto gap-1.5 px-3 py-2`）——同一产品里"步骤导航"存在两套点击区模型；28px 圆点本身也低于本包按钮常规档（icon-sm 32px），在移动端与密集步骤（4+ 步平分宽度）下命中困难。Ant Design Steps 的整个节点（图标+标题）可点击、MUI Stepper 惯例以 ButtonBase 包裹整个 step，均把标题纳入热区。
- **行业惯例**: Ant Design Steps：点击步骤节点任意位置（含标题）即切换；shadcn/ui 生态导航类复合按钮惯例是整个可读标签区为热区；本项目 wizard-step-nav 已是整钮可点的内部基线。
- **用户影响**: 用户在分步流程条上点"收货信息"这类步骤标题（视觉上最强的导航供龄）毫无反应，需精准命中旁边的小圆点才能跳转；多次"点了没反应"后用户会认为标题只是装饰、步骤条难以使用；从 wizard 页走到 steps 页，同语义交互突然改变。
- **建议**: 二选一：① 最小改法——把标题 div 并入热区：`li` 上不再放点击，改为将指示器 Button 与标题共同包进一个 `<button className="flex flex-col items-center gap-1 ...">`（保留现有 aria-label 与 aria-current，标题作为按钮内容自然可点，热区随之扩大）；② 或给标题 span 加 `onClick={handleClick}` + `cursor-pointer`，但方案 ① 更符合 button 嵌套规范。同时指示器尺寸可升 `size-8`（32px，对齐 icon-sm 档）。
- **复核状态**: 未复核

---

### [G1-R4-视角5-02] status / mapping 值未命中映射表时渲染空 span：已有值对用户不可见，无原始值回退（countdown 空壳同族新实例）

- **文件**: `packages/flux-renderers-content/src/status.tsx:57-68`；`packages/flux-renderers-content/src/mapping.tsx:80-91,102-105`
- **证据片段**:
  ```tsx
  // status.tsx:57-68 —— 值未命中 labelMap（miss）：只渲染 placeholder，未配置即空白
  if (key === null || !hit) {
    return (
      <span ... data-slot="status-root" data-state="miss"
        className={cn('nop-status', props.meta.className)}>
        {placeholder}
      </span>
    );
  }
  // mapping.tsx:88-90 —— miss 分支：defaultLabel ?? placeholder ?? null
  } else {
    state = 'miss';
    content = defaultLabel ?? placeholder ?? null;
  }
  ```
- **严重程度**: LOW
- **现状**: status 的 `hit` 以"labelMap 命中"为准：字段值存在（如后端返回 `status: "weirdNewState"`）但 labelMap 未覆盖该键时，组件渲染空 span（placeholder 未配置即无任何内容），已有数据对用户不可见；mapping 的 miss 分支同样在 defaultLabel/placeholder 均未配置时渲染空 span（:102-105 的条件渲染直接跳过）。两者仅以 `data-state="miss"` 落 DOM、无任何样式或文案消费。同包 image/qrcode/audio 对"无值"均有 muted 兜底文案（见 [G1-R4-视角5-01] 对照组），而"有值但映射缺失"反而显示空白。与 round-01 [G4-视角5-02]（countdown 缺配置渲染不可见空元素，LOW）同族"静默空壳"。
- **行业惯例**: Ant Design Badge 状态值未在 valueEnum 命中时回退渲染原始文本；表格状态列（AG Grid valueFormatter）惯例 `mapped ?? raw`。已知值静默消失在任何参照系统中都按数据展示缺陷处理。
- **用户影响**: 后端新增枚举值或 schema 漏配映射时，用户看到状态列空白，误以为"这条记录没有状态/数据丢了"；排查时也难定位是映射缺失还是数据缺失（界面无任何线索）。
- **建议**: 两处 miss 分支加原始值回退：`content = defaultLabel ?? placeholder ?? (key !== null ? key : null)`（status 需先把命中前的原始 `String(value)` 传入该分支），并以 `text-sm text-muted-foreground` 渲染回退值（与同包兜底文案风格一致）；同时保留 placeholder 优先级不变。
- **复核状态**: 未复核

---

## 去重自检（与全部 224 条按根因比对）

- **[G1-R4-视角8-01]**（timeline 水平轴零宽）← [G1-R2-视角8-01]（steps 连接线缺 relative 包含块）：同属"连接线渲染断裂"表现族，但机制不同（steps = 定位到错误包含块、轴线脱离步骤项；本条 = 轴线元素宽度恒为零、从未渲染）。steps 修复（补 relative/定位）不改变 timeline 的零宽事实，按 dedup §1 兄弟实例上报，复核阶段可与 steps 条目同批裁定"连接线渲染"修复模式。
- **[G1-R4-视角5-01]**（json-view/markdown/html 空值空白）← [G3-视角5-05]（dashboard 空布局空白）/ [G5-R2-视角5-03]（ai-message-list 空白）：同根因（"空态无默认提示"）跨包新实例；G1-R2 [G1-R2-视角5-01] 报的是 audio/video/image/qrcode 的"灰字无 destructive 语义"（有文案），本条三个组件是"完全空白（连文案都没有）"，表象与修复点均不同，不重复。
- **[G1-R4-视角6-01]**（page aside Sheet 无滚动）← [G6-R2-视角6-01]（DrawerBody 无滚动契约）：同根因（surface 长内容无滚动契约）新实例；G6-R3 复核时枚举的 Sheet 消费方（kanban/select-mobile/sidebar）均自兜底，page-aside 未在其列且确无兜底（本轮以 sheet.tsx 基类 + page.tsx 注入路径双重核实）。属 basic 包缺陷，G6 的 Drawer 修复不覆盖。
- **[G1-R4-视角8-02]**（steps 热区）：R1 [G1-视角4-10]（text maxLineToggle 文字塞 icon 按钮）是"内容溢出按钮"不同根因；R3 "steps 无 linear 契约可点击跳转"核对项确认的是点击行为本身，未触及热区/标题不可点。wizard-step-nav 与 steps 的双轨为首次报告。
- **[G1-R4-视角5-02]**（status/mapping miss 空白）← [G4-视角5-02]（countdown 空壳）：同族"静默空壳"跨包新实例；与本轮视角5-01（空值空白）机制不同（有值不可见 vs 无值无提示），分立条目并互相引用。
- 已报未修复项确认（不重报）：[G1-视角3-03] button-group 选中态、[G1-R2-视角3-02] button active、[G1-视角7-08] bg-gray-50、[G1-R2-视角8-01] steps 连接线——本轮反查时复核现状与已报一致。

## 转 C2 候选（dedup §2 规则，不计入发现）

无。本轮未撞见 G-A~G-M 已登记 16 项能力缺口的新表象（steps/timeline 的"当前步骤由 schema 驱动"属既有 valueOwnership 能力；page aside Sheet 滚动属已实现能力内的契约缺口，非移动端组件族缺口）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **状态属性消费方反查全量结果**：`data-active`（carousel 指示点 inline 色消费、diff-file-list 状态页签 inline 消费、wizard-step-nav className 消费、wizard-step-body hidden 消费）、`data-selected`（cards inline ring 消费）、`data-open`/`data-tone`（collapse，styling-system.md 契约 documented 宿主 hook）、`data-active-index`/`data-active-variant`/`data-current-step-*`/`data-empty`/`data-aside-*`/`data-expanded`/`data-responsive`/`data-variant`(progress)/`data-level`（status/alert/timeline dot）均为宿主 CSS hook 或已由 inline 类消费——除已报 4 项（见去重自检末条）外零死属性。
- steps 水平模式窄屏压缩：标题可换行（min-w-0）、连接线本就未渲染（视角8-01 已立），压缩场景无独立新害，不另立。
- wizard 校验/提交错误：`role="alert"` + text-destructive + sr-only step 播报 + 20-09 步进聚焦管理在位；错误条位于操作条下方属可接受布局，未达门槛。
- diff 三栏冲突导航 prev/next（outline + disabled 边界）、Ctrl+↑/↓ 跨文件快捷键、行点击 role=button+tabIndex+键盘、`nop-diff-line-flash` 高亮、hunk 展开/收起文案切换——闭环，无新缺口。
- carousel autoplay 的 hover/focus/offscreen/reduced-motion 四源暂停（F1/F2/O-04）实现完整，R1 指示点热区条目之外的指示点均有 `aria-label` + ui Button focus ring，无新缺口。
- dropdown-button hover 触发的 150ms 宽限关闭（P1-04）与键盘 click 通道并存、菜单项 destructive/disabled 消费 ui 变体——核对通过。
- json-view 复制失败静默（R1 [G1-视角10-13] 已报，现状未修复，不重报）；badge 空文本空 pill（R3 已弃报）；timeline clickable 项的 focus-visible outline 在位（`focus-visible:outline-ring`），键盘 Enter/Space 已接线。
- responsive-renderer 无 bounds variant 回退链、grid colSpan clamp、cards 空 items fallback `noData`（`render-nodes.tsx:238` fallback 必返回，已核实非空白）——核对通过。

## 检查范围

- **目标**: 与 R1/R2/R3 同口径——`packages/flux-renderers-basic/src/`、`packages/flux-renderers-content/src/`（含 `diff-view/` 全部子组件）、`packages/flux-renderers-layout/src/` 全部非 test 文件（`*.test.*`、`test-support*` 不入审）。
- **本轮精读**：layout — timeline-renderer.tsx（全文）、steps-renderer.tsx（全文）、collapse-renderer.tsx（全文）、wizard-renderer.tsx（导航/错误/状态段）、wizard-step-nav.tsx、wizard-step-body.tsx、grid-renderer.tsx、responsive-renderer.tsx、dropdown-button-renderer.tsx（全文）、button-group-renderer.tsx（复核）、styles.css；content — cards-renderer.tsx（全文）、card.tsx、status.tsx、mapping.tsx、json-view.tsx、markdown.tsx（空值/加载/错误段）、html.tsx、empty.tsx、audio.tsx、qrcode.tsx、image.tsx（加载/回退/预览段）、carousel.tsx（全文）、alert-renderer.tsx、progress.tsx、link.tsx（复核）、diff-view-renderer.tsx（全文）、diff-file-list.tsx（全文）、diff-header.tsx、diff-hunk.tsx、diff-line.tsx、diff-gutter.tsx、diff-three-column-view.tsx（全文）、diff-view.css（状态类消费段）、styles.css；basic — page.tsx（全文）、tabs.tsx（全文）、text.tsx、icon.tsx、badge.tsx、dialog.tsx/drawer.tsx（surface 薄壳）、dynamic-renderer.tsx（复核）。
- **交叉核实文件**: `packages/flux-react/src/render-nodes.tsx`（fallback/hasContent 语义）、`packages/ui/src/components/ui/sheet.tsx`（SheetContent 基类）、`packages/ui/src/components/ui/card.tsx`（R1 已核对的 role 升级）、`packages/flux-react/src/default-spacing.css`（page 槽位规则边界）。

## 检查方法

1. **状态属性消费方反查（本轮主方法）**：`rg -o 'data-[a-z-]+='` 对三包全量枚举 22 类状态属性发射点 → 逐一全仓反查消费方（包内 CSS / ui 基类 / inline 类 / playground CSS / 宿主 hook 文档）→ 区分"死属性 / inline 消费 / 宿主 hook"三态，死属性逐一定位确认用户可见状态。
2. **组合场景走查**：按盲区清单逐项构建组合矩阵（tabs×swipe、wizard×表单×导航、page×aside×Sheet×键盘、image×preview、cards×selection、diff×列表×冲突导航、carousel×autoplay），每个组合沿"事件 → 状态 → 视觉反馈 → 边缘态"链路通读代码。
3. **同包基线对照**：空态/兜底/热区/错误反馈逐组件横向对比（content 包 8 个内容组件空值路径两两对照；steps vs wizard-step-nav 点击区对照；timeline 垂直 vs 水平轴对照），以"包内多数派/正确实现"为一致性基准。
4. **全仓消费 grep 闭合**：`timeline-axis`、`nop-steps`、`data-page-aside-sheet`、`nop-diff-line-clickable`、`nop-diff-empty-state` 等关键标记全仓 grep，排除"有消费方"误报；`resolveRendererSlotContent` fallback 链路经 flux-react 源码核实。

## 结论

新发现 **5 条**（HIGH 0 / MEDIUM 4 / LOW 1；MEDIUM：视角8-01、视角5-01、视角6-01、视角8-02，LOW：视角5-02）。累积（R1+R2+R3+R4）：224 + 5 = **229 条**。G1 组收敛趋势：15 → 6 → 2 → 5，本轮增量主要来自"状态属性消费方反查"与"包内基线对照"两个新方法面，非既有视角的机械重复。

## G2 — form / form-advanced（HIGH 0 / MEDIUM 3 / LOW 0，共 3 条）

### [G2-R4-视角3-01] upload 在飞上传的完成写入与 pending 行取消钮均不接 disabled 门禁：字段运行时转禁用后值仍被静默改写

- **文件**: `packages/flux-renderers-form-advanced/src/upload-field.tsx:248-279`（完成写入路径）、`:544-563`（pending 行取消钮）；对照 `field-handlers.tsx:87-91`（onChange 仅拦 readOnly）、`docs/architecture/styling-system.md:94`（`disabled: "${$form.submitting}"` 为文档化用法）
- **证据片段**:
  ```tsx
  // upload-field.tsx:248-273 — 完成路径只检查 mountedRef 与 aborted，无 interactive/disabled 检查
  if (!mountedRef.current) { return; }
  if (controller.signal.aborted) { setItems(...); return; }
  ...
  const successItems = multiple ? [...committedItems(), item] : [item];
  ...
  commitItems(successItems);            // → handlers.onChange(next)，仅 readOnly 会被拦截
  ```
  ```tsx
  // upload-field.tsx:552-562 — pending 行取消钮无 disabled、无 interactive 判定
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={t('flux.form.cancel', { defaultValue: `Cancel ${entry.name}` })}
    data-testid={`${options.marker}-cancel-${entry.id}`}
    data-slot="upload-cancel"
    onClick={() => cancelUpload(entry.id)}
  >
  ```
- **严重程度**: MEDIUM
- **现状**: 上传字段的 interactive 门禁只覆盖同步 UI 通道——触发钮 `disabled={!interactive}`（:469）、已上传条目移除钮 `interactive ? …`（:516）、"清空"钮 `existing.length > 0 && interactive`（:578）。但上传是异步长任务，`disabled` 表达式（文档化典型 `"${$form.submitting}"`）在任务进行中翻转时存在两个未接线通道：① **完成写入通道**——`performUpload` 完成后仅检查 `mountedRef` 与 `aborted`，随后 `commitItems → handlersRef.onChange` 写入表单值；`createFieldHandlers.onChange` 只拦截 `readOnly`（field-handlers.tsx:88-90），disabled 直接放行。字段已经灰显（触发/移除/清空全部禁用），其值却在禁用态下被静默改写——典型时序：选文件 → 点提交 → 字段随 submitting 转禁用 → 上传完成 → 提交快照与字段值出现竞态（本次提交可能带上未确认文件，或下次提交突然多出文件）。② **取消钮通道**——pending 行的 X 取消按钮无 disabled，禁用态下仍可点击（该通道后果轻，中止是非破坏性的，但与同字段其余按钮的禁用视觉自相矛盾）。与 [G2-R2-视角3-01]（input-time steppers）、[G2-R3-视角3-01]（period 快捷钮）、[G2-R3-视角3-02]（editor editable 同步）同属"disabled 门禁在次要通道失效"根因族；本条为该族的**异步完成通道**实例——前三条的绕过面都是用户可点击的同步控件，本条是任务回调路径，前轮核查面（time/period/editor）均不覆盖 upload。
- **行业惯例**: Ant Design Upload 的 `disabled` 冻结全部交互入口且上传中列表项随字段态冻结；shadcn/ui 生态以单一 disabled 状态源驱动全部子交互。本仓自身基线即 field-presentation 的 `interactive` 单一口径（period/editor 条目已两度引用），异步回调写入也应遵守同一门禁。
- **用户影响**: 提交表单（或任何把字段级联禁用的联动）期间，灰显的上传字段文件列表在用户眼前"自己变化"：在飞文件完成后值被写入、pending 行消失、字段值与用户提交时的认知不一致；提交 payload 是否包含该文件取决于时序，用户无法预测。禁用语义被无声击穿，与相邻字段的锁定状态自相矛盾。
- **建议**: ① 完成路径在 `commitItems` 前补门禁：以 `interactiveRef`（镜像 `presentation.interactive`，模式同现有 `handlersRef`）判断，`if (!interactiveRef.current) { setItems(prev => prev.filter(e => e.id !== id)); return; }`（禁用期间完成的上传按"已取消"处理并保留 pending 行为错误提示或静默移除，二选一并注释）；② pending 行取消钮补 `disabled={!interactive}`（对齐 ：469 触发钮）；③ 补一条"上传完成期间字段转 disabled → 值不变"的回归测试（`setProps` 级联后断言 form value 不变）。
- **复核状态**: 未复核

---

### [G2-R4-视角5-01] editor 外部值同步在聚焦窗口被永久丢弃：加载/联动写入的值不落地，用户下一次输入反以陈旧内容覆盖

- **文件**: `packages/flux-renderers-form-advanced/src/editor-renderer.tsx:326-352`（值同步 effect）、`:298-309`（onUpdate 提交链路）；对照 `packages/flux-renderers-form/src/renderers/form-load-action.ts:40-105`（autoLoad/loadAction `setValues` 是该 effect 的典型外部值来源）
- **证据片段**:
  ```tsx
  // editor-renderer.tsx:335-340 — 聚焦时直接 return，且无任何重试/落地机制
  if (value === lastCommittedRef.current) {
    return;
  }
  if (editor.isFocused) {
    return; // 外部值到达时正在输入 → 本次同步被丢弃
  }
  ```
  ```tsx
  // editor-renderer.tsx:307-308 — 用户随后的每次击键都会把编辑器内容（陈旧）提交回表单
  lastCommittedRef.current = next;
  handlersRef.current.onChange(next);
  ```
- **严重程度**: MEDIUM
- **现状**: 同步 effect 的依赖是 `[editor, value, outputFormat, presentation.readOnly]`，不包含焦点状态；当外部值在编辑器聚焦期间到达（form autoLoad/loadAction 完成后 `setValues`、其他 action 的 setValue、联动回填——均为该包公开用法），effect 命中 `editor.isFocused` 分支直接返回：`setContent` 不执行、`lastCommittedRef` 也不更新。此后除非 `value` 再次变化，effect 不会重跑（失焦不触发任何重同步）；用户键入第一个字符时 `onUpdate` 把"陈旧内容 + 新击键"经 `onChange` 提交回表单——刚加载的远端数据被静默覆盖丢失。非聚焦路径不受影响；与 [G2-R3-视角3-02]（同一文件 editable 同步漏算 disabled，:332-334）不同 effect、不同根因；与 [G2-视角5-03]（form 级加载无 loading、值到达即覆盖普通字段）方向相反——普通字段是"值到达覆盖输入"，编辑器是"值到达被丢弃、输入反向覆盖值"，机制与后果均不同，为独立缺陷。
- **行业惯例**: 受控富文本编辑器的外部值同步惯例（Tiptap 官方 controlled-editor 模式、Notion/Confluence 类编辑器）：聚焦窗口内到达的外部更新应排队，失焦后落地（或至少与编辑器内容做 diff 合并），而不是丢弃；Ant Design 表单异步回填在任意控件聚焦态下都会落地显示。
- **用户影响**: 用户在富文本框内输入时（编辑器是长文本字段，聚焦窗口可达数十秒至数分钟），后台表单加载/联动写入的值永远不显示；更严重的是用户毫无感知地继续键入，几分钟前加载的内容被陈旧稿覆盖——刷新或重新打开才能发现数据"回到旧版本"，属于静默数据丢失体验。
- **建议**: 聚焦分支改为**暂存而非丢弃**：`pendingExternalValueRef.current = value;`，并在 `onBlur` 回调（:313-315 已存在）中检查暂存——若存在且 ≠ 当前编辑器内容，则 `editor.commands.setContent(..., { emitUpdate: false })` + 更新 `lastCommittedRef`；或在 effect 依赖中加入可渲染的 focus 状态（`useState` 跟踪 focus），失焦时重跑同步。两条路径均能保证外部值最终落地；补一条"聚焦期间 setValue → 失焦后编辑器内容等于新值"的回归测试。
- **复核状态**: 未复核

---

### [G2-R4-视角5-02] multiple 上传的 maxFiles 余量计算不含在飞条目：并发选择窗口内上限失效，超限文件静默全部上传

- **文件**: `packages/flux-renderers-form-advanced/src/upload-field.tsx:350-368`（余量切片）、`:209-211`（`committedItems` 只读已提交值）、`:267`（完成时追加不再复查上限）
- **证据片段**:
  ```tsx
  // upload-field.tsx:353-356 — remaining 只减去“已提交”数量，pending 中的在飞条目不占额
  } else if (maxFiles) {
    const remaining = Math.max(0, maxFiles - committedItems().length);
    selected = selected.slice(0, remaining);
  }
  ```
  ```tsx
  // :209-211 — committedItems 的数据源是已提交字段值，与 items 中的 pending 无关
  function committedItems(): UploadResultItem[] {
    return readUploadValue(latestValueRef.current, multiple);
  }
  // :267 — 完成回调 `[...committedItems(), item]` 追加时同样无 maxItems 复查
  const successItems = multiple ? [...committedItems(), item] : [item];
  ```
- **严重程度**: MEDIUM
- **现状**: `handleFiles` 的 maxFiles 截断以 `committedItems()`（已写入字段值的部分）为基数，而 `handleFiles` 是 async 函数：第一轮选择的文件全部处于 pending（未 commit）期间，第二轮选择再次进入该分支时 `remaining` 仍按提交前数量计算。例：`maxFiles: 2`，先选 2 个（在飞）→ 再选 2 个 → `remaining = 2 - 0 = 2` → 4 个文件全部进入上传并全部提交，最终字段值含 4 项，超过作者配置的上限一倍。完成回调（:267）追加时也不再复查。与 [G2-视角5-02]（超限文件被拒绝/截断时**无界面反馈**）不同根因：那条是"执行了限制但不告知"，本条是"限制本身在并发窗口内不生效"，修复互不覆盖；与 [G2-R2-视角4-02]（composite maxItems 静默）亦不同根因（计数基准错误 vs 上限反馈缺失）。
- **行业惯例**: Ant Design Upload 的 `beforeUpload` 基于实时 fileList 判定（上传中文件占位计入了上限）；shadcn 生态文件上传示例同样以"已选全集（含 pending）"为限流基数。"配置的条数上限在快速连续选择时失效"在所有主流上传器中均按功能缺陷处理。
- **用户影响**: 用户分两批快速选择文件（或拖拽后又点按钮补选）时，实际提交的文件数超过 maxFiles 配置：轻则与作者预期不符，重则宿主端按超限拒绝整个提交，用户看到与"只选了 N 个"认知相悖的失败；全程无任何提示说明为何数量不符。真实用户影响检验通过（多轮选择是自然操作节奏，非刻意构造）。
- **建议**: ① `remaining` 基数改为"已提交 + 在飞"：`const inFlight = items.filter((e) => e.status === 'pending').length; const remaining = Math.max(0, maxFiles - committedItems().length - inFlight);`（`items` 为同渲染闭包内 state，同步可读）；② 完成回调追加前补防御性复查：`if (!multiple && maxFiles && committedItems().length + 1 > maxFiles) { /* 丢弃并走 onReject */ }`；③ 补一条"pending 期间二次选择被截断到上限"的测试。
- **复核状态**: 未复核

---

## 去重自检（与全部 224 条按根因比对）

- **[G2-R4-视角3-01]** vs [G2-R2-视角3-01]/[G2-R3-视角3-01]/[G2-R3-视角3-02]（disabled 门禁绕过族）：同族根因的**新实例**，按 dedup §1"同类根因的新实例算新发现"与递归盲区 1"修一处必须查全类"上报。区别：R2/R3 三条的绕过面均为用户可点击的同步控件（steppers/快捷钮）或组件内状态同步（editable），本条是**异步任务回调写入通道**，前轮核查面（input-time/period/editor）不包含 upload-field；修复点独立（interactive 门禁接入完成路径），不随前三条修复自愈。vs [G2-R2-视角5-01]（单选在飞覆盖）：R2 那条是单选模式二次选择的新旧结果竞争，本条是 disabled 迁移后的门禁缺失，机制不同。
- **[G2-R4-视角5-01]** vs [G2-R3-视角3-02]（同文件 editable 同步）：不同 effect、不同状态量（isEditable vs content）、不同行号段（:332-334 vs :335-340），已互相注明。vs [G2-视角5-03]（form 加载无指示且覆盖普通字段）：彼条值**会**覆盖、缺陷是缺 loading 指示；本条值**不会**落地且被陈旧输入反覆盖，机制相反。
- **[G2-R4-视角5-02]** vs [G2-视角5-02]（maxSize/maxFiles 拒绝/截断无反馈）：限制执行正确性与限制结果反馈是两个根因，修复互不覆盖。vs [G2-R2-视角4-02]/[G2-R3 去重备忘 2]（composite/condition-group 上限静默）：彼为"达上限后的置灰/隐藏无计数说明"，本为"上限计数基准错误"，不同。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

无。本轮未撞见已登记 16 项能力缺口的新表象（transfer 双面板无移动端形态沿 R3 已登记 G-H 口径，未重复）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **combo / input-table / array-editor / key-value 的 Add 钮与行操作钮**: grep 初看 `disabled={readOnly || …}`/`disabled={atMaxItems}` 疑似漏接 disabled，逐点核实后确认**已正确门禁**——Add 钮整体处于 `{addable && !interactionDisabled && …}` 分支（combo-renderer.tsx:554、input-table-renderer.tsx:403、array-editor.tsx:567-571、key-value.tsx:598-602），行操作钮经合并后的 `readOnly={interactionDisabled}` 下发（combo-renderer.tsx:519,539、input-table-renderer.tsx:335,384）。
- **其余门禁面逐一复核通过**: checkbox-group（:72,:93 `if (!presentation.interactive) return` + groupDisabled）、input/textarea 清除钮（input.tsx:279、textarea-renderer.tsx:89 均含 interactive）、input-number（stepper :276/:291、清空与步进 handler :125/:181 全门禁）、input-time 非 stepper 清除钮（:216 interactive）、button-group-select（:71）、tag-list（:95,:109）、input-suggest（:118,:147 trigger 门禁 + 完整键盘模型）、select 桌面三形态（comboboxFrozen/effectiveInteractive，input-choice-renderers.tsx:356-399）、icon-picker（:101,:136,:146,:178）、tree-controls（triggerDisabled :97-98,:260-261,:312-325）、transfer（interactionDisabled 全通道 :157-298,:373-431）、picker（:130,:340,:455,:469）、condition-builder value-input/field-select（disabled 全链下传 + `staticReadOnly` 桥接 value-input.tsx:152-165）、markdown-editor（工具栏 `showToolbar && showEdit && interactive` :227 + textarea disabled/readOnly :270-271）、date/date-range/datetime 弹层（R3 `open && interactive` 结论复核维持）。
- **异步竞态面复核通过**: use-select-remote-search（AbortController + 300ms debounce + aborted 检查 + echo cache 设计注释，无 stale 响应竞态）、use-dict-options（genRef 代际守卫）、detail-draft-controller（openSequencer/confirmSequencer + mountedRef + dispose 链，opening/confirming 竞态模型完整）、upload-field 卸载路径（G11 mountedRef + abortControllers 全量中止，H26 提交竞态窗口已有注释级处理）。
- **markdown-editor 预览区 `aria-live="polite"`**（:289-295）随击键整块重渲染对读屏可能造成播报噪音——涉全量 WCAG/播报行为，属维度 20 范畴且实际 SR 行为静态推断成分高，按边界排除不立案。
- **upload-field 取消钮 aria-label** `t('flux.form.cancel', { defaultValue: `Cancel ${entry.name}` })`（:556）：locale 命中键后文件名插值丢失（读作"取消"）——可访问名仍有效，低于报告门槛，留此供 i18n 批次顺带清理。
- **editor `data-loading` 空壳**（:377-384）：`immediatelyRender: true` 下 CSR 路径 editor 同步创建，该分支实际不可达（SSR 场景），沿 [G3-视角5-07] LOW 先例不立案。

## 检查范围与方法

- **范围**: `packages/flux-renderers-form/src/` 与 `packages/flux-renderers-form-advanced/src/` 全部非 test 文件（`*.test.*`、`test-support*`、`test-dom-polyfills`、`config-test-support` 不入审），与 R1-R3 同口径。本轮按派发重点做**定向深挖**而非全文重读：精读 upload-field.tsx（全文）、editor-renderer.tsx（全文）、markdown-editor-renderer.tsx（全文）、field-presentation.tsx（全文）、field-handlers.tsx（全文）、input-suggest.tsx（全文）、use-select-remote-search.ts（全文）、use-dict-options.ts（全文）、detail-draft-controller.ts（全文）、combo-renderer.tsx / input-table-renderer.tsx（门禁与 Add 段）、input-time-renderer.tsx（steppers 段现状核对）、input-choice-renderers.tsx（select 门禁段）、form.tsx（submitOnChange/submitting 段）、input-file/input-image-renderer.tsx（薄包装确认）。
- **方法**: ① 门禁模型反推——从 `field-presentation`（interactive 口径）与 `field-handlers`（readOnly-only 拦截）确定"次要写入通道"定义，对两包全部 `handlers.onChange` 调用点逐一定位并回溯其 UI 门禁链；② 竞态专项——对全部 async 回调（上传完成/取消、远程搜索、字典加载、detail 草稿 open/confirm、editor 值同步）逐条核对中止/代际/聚焦守卫与外部值落地路径；③ 门禁面 grep 交叉（`interactive|interactionDisabled|effectiveDisabled|readOnly` × 两包全文件）逐命中确认，排除 4 处 grep 误导（合并 prop 下发场景）后闭环。
- **对照基线**: dedup-baseline §1-§4 全部生效——ma5-ux 6 条未重报；G-A~G-M 16 项缺口表象仅落转 C2（本轮为零）；误报对照 8 条全部规避（本轮未涉 opacity-0 trigger/ml-auto/ghost/icon-xs/sm/截断/role=button div/transition-all 判定点）；维度 09-12 与全量 WCAG 未涉及。
- **静态口径声明**: 本轮为源码静态审查（无浏览器运行时验证）；[G2-R4-视角3-01] 的"提交期间值被改写"时序基于 `disabled: "${$form.submitting}"` 文档化用法 + 完成路径代码推理，[G2-R4-视角5-01] 的"外部值被丢弃"基于 effect 依赖数组与 `isFocused` 守卫的代码事实（无运行时不确定性），建议复核阶段对前者以 Playwright 时序断言确认。

## 结论

新发现 **3 条**（HIGH 0 / MEDIUM 3 / LOW 0）。R1+R2+R3+R4 G2 组累计 33 条；全审累计 **227 条**。G2 组在两轮重点盲区（门禁绕过族全类扫尾、上传/编辑器竞态）上的残余命中已收敛至窄配置面实例，其余盲区清单项（组合场景、响应式、边缘态）经本轮逐面核对均归入"核对过不立案"；继续递归预计只能产生低于价值门槛的零散细节，建议 G2 组审查收敛。

## G3 — data / dashboard / pivot（HIGH 2 / MEDIUM 2 / LOW 0，共 4 条）

### [G3-R4-视角8-01] 列宽拖拽手柄绝对定位逃逸包含块：非固定列的 resize 手柄全部叠在整表右缘，列宽拖拽对默认表格不可用

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:153-163,174-182`；`packages/ui/src/components/ui/table.tsx:6-15`；`packages/ui/src/styles/table.css:5-11`
- **证据片段**:
  ```tsx
  // table-header-row.tsx:161 —— 手柄以 absolute right-0 top-0 定位到"最近的 positioned 祖先"
  className: 'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-primary/40',
  // :174-176 —— 但承载它的 TableHead 类串无 relative（static）：
  <TableHead
    className={cn(cellProps.className, headerAlignClass)}   // cellProps.className 仅 fixed 列有 sticky
  ```
  ```css
  /* ui table.css:5 —— thead th 亦无 position 声明；ui Table 内层包裹却是 positioned： */
  <div data-slot="table-container" className="relative w-full overflow-x-auto">  /* table.tsx:8 */
  ```
- **严重程度**: HIGH
- **现状**: resize 手柄 `<span>` 为 `position: absolute; right: 0; top: 0; height: 100%`，但其祖先链（`div.flex` → `th` → `tr` → `thead` → `table`）无任何 `position: relative/sticky/absolute`（ui table.css 的 `.nop-table thead th` 只设字体/内边距/背景），手柄的包含块实际是 ui `Table` 组件内层 `div[data-slot="table-container"]`（`relative`）——即整个表格容器。**经 Chromium 运行时实测确证**（standard-crud 页，1400×900）：6 个手柄中 5 个的实测矩形全部为 `{left:1340, right:1344, width:4, height:590}`（表格容器右缘、全表高），包含块经 `getComputedStyle` 逐级回溯确认为 ui 内层 `table-container`；各列真实右缘分别为 433/592/843/957/1162/1344，无一命中。唯一例外是 `fixed:'right'` 的"操作"列——sticky 定位的 th 自身成为包含块，手柄锚定正确。非固定列手柄（默认 `columnResize !== false`、`column.resizable !== false` 即全部渲染）全部叠在表格最右缘一条 4px×全表高的热区上，paint 顺序最上的手柄获胜。
- **行业惯例**: AG Grid / Ant Design Table 的列宽手柄一律锚定在各列表头右缘（`th` 为定位上下文，手柄 `right:-Npx` 贴列边）；shadcn/ui 生态惯例是绝对定位元素的父级必须自带 `relative`（本仓 `page.tsx` 侧栏把手、`input-number` stepper 等均在定位父级内）。手柄不在列边缘 = 拖拽功能不可用。
- **用户影响**: 用户在任意非固定列的表头右缘寻找列宽手柄：无光标变化、无 hover 高亮、拖不动——列宽调整对所有普通列完全不可用（键盘 ArrowLeft/Right 通道仍可用，但鼠标主路径失效）；表格最右缘出现一条 hover 会高亮的神秘竖条，拖动它只会改最后一个非固定列的宽度。默认开启的能力在最高频路径（所有表格）上静默失效。
- **建议**: 为手柄建立正确包含块，二选一：① `renderLeafHeaderCell` 的 `TableHead` className 追加 `'relative'`（仅该渲染点，影响面最小）；② ui 层统一——`table.tsx` 的 `TableHead` 基类或 `table.css` 的 `.nop-table thead th` 补 `position: relative`（fixed 列本就 sticky 定位，不受影响），同批惠及所有 `thead th` 内的绝对定位元素。修复后补一条 Playwright 几何断言（手柄 `getBoundingClientRect().right` 与所属 `th` 的 `right` 差 ≤ 2px）防回归。
- **复核状态**: 未复核

---

### [G3-R4-视角5-01] `autoFillHeight` × `virtualThreshold` 并用时 ref 路由互斥：虚拟滚动容器永为 null，表体静默渲染为零行且无空态提示

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:417-423,549-558`；`packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:336,374-388`；`packages/flux-renderers-data/src/schemas.ts:150,159`
- **证据片段**:
  ```tsx
  // table-renderer.tsx:549-557 —— 同一元素的 ref 回调：autoFillActive 分支抢占后 scrollRef 永不赋值
  ref={(element) => {
    measureRootRef.current = element;
    if (element && autoFillActive) {
      autoFill.containerRef.current = element;
    } else if (element && virtualEnabled) {   // autoFillActive && virtualEnabled 时恒不可达
      scrollRef.current = element;
    }
  }}
  ```
  ```tsx
  // table-body-rows.tsx:376 —— VirtualBody 的滚动元素取自 scrollRef
  getScrollElement: () => parentRef?.current ?? null,   // → null → outerSize 0 → getVirtualItems() = []
  ```
- **严重程度**: HIGH
- **现状**: `autoFillHeight`（自适应剩余高度）与 `virtualThreshold`（大数据虚拟滚动）是两个独立合法的 schema prop（`schemas.ts:150/159`，且 `data-renderer-definitions.ts:238/240` 均暴露给 designer，无互斥校验）。二者同时配置时：`virtualEnabled = !paginationEnabled && virtualThreshold && source.length > virtualThreshold` 成立，body 走 `VirtualBody`；但容器 ref 回调的 `else if` 路由使 `scrollRef.current` 永远保持 `useRef(null)` 初值——TanStack Virtual 的 `getScrollElement()` 返回 null，`outerSize` 为 0，`getVirtualItems()` 返回空数组：`flattenedItems.length > 0` 使空态分支不触发，顶部/底部垫行与数据行 map 全部为空 → **`<tbody>` 渲染零行**，页面只剩表头（分页被 virtualEnabled 前置条件排除，无分页栏兜底）。既有测试（`table-body-rows-virtual.test.tsx:112,160`）直接手工注入 `scrollRef={{ current: ... }}`，从不经过生产 ref 路由，组合缺口在测试面不可见。与 [G3-R3-视角4-01]（虚拟化 radio 失效）同属"虚拟化组合失效"象限，但根因不同（该条为 RadioGroup 缺包裹，本条为 ref 单元素双用途互斥）。
- **行业惯例**: AG Grid / Ant Design Table 的"容器自适应高度 + 虚拟滚动"是大数据表格的标配组合（`scroll-y` 与 `autoHeight`/flex 容器可并用）；同一 DOM 节点多职责场景下 ref 必须可组合（多 ref 合一用组合回调或合并 ref 工具，而非 if/else 互斥）。
- **用户影响**: 数据量超过阈值的表格一旦作者为适配布局配置了 `autoFillHeight`（复杂页内嵌表格的常用配置），整张表只剩表头、表体一片空白，无"暂无数据"、无错误提示——用户与 schema 作者都无法区分"数据没到/渲染坏了/配置冲突"，属主路径上数据完全不可见的功能缺陷。
- **建议**: 拆开互斥路由，让同一元素同时满足两个职责：`ref={(element) => { measureRootRef.current = element; autoFill.containerRef.current = autoFillActive ? element : autoFill.containerRef.current; scrollRef.current = virtualEnabled ? element : scrollRef.current; }}`（或抽 `composeRefs` 小工具）；`autoFill.containerRef` 与 `scrollRef` 指向同一容器本就语义一致（autoFill 的 `overflow:auto` 高度容器即虚拟滚动的滚动元素）。补一条 `autoFillHeight + virtualThreshold` 的渲染断言（`tbody tr[data-slot="table-row"]` 数量 > 0）。
- **复核状态**: 未复核

---

### [G3-R4-视角8-02] 嵌套表头 + `affixHeader` 时所有表头行共用 `top: 0` 粘性定位：滚动后组表头被叶子表头完全覆盖，表头塌成一行

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:512-530`
- **证据片段**:
  ```tsx
  // :512-514 —— 嵌套路径下 stickyStyle 对"每一行"取同一个值（top 恒 0）
  const stickyStyle = isAffix
    ? { position: 'sticky' as const, top: 0, zIndex: 3, background: 'var(--table-header-bg)' }
    : undefined;
  // :524-530 —— 组行与叶子行全部套用同一 stickyStyle
  <TableRow
    className={cn(isAffix ? 'nop-table-header-sticky' : undefined, ...)}
    style={stickyStyle}
  >
  ```
- **严重程度**: MEDIUM
- **现状**: 多级表头（`columns[].children`）+ `affixHeader: true` 时，`NestedTableHeaderRows` 给**每一行**表头（组行 + 叶子行，二级表头即 2 行）都下发 `position: sticky; top: 0; z-index: 3; background: var(--table-header-bg)`。所有行在同一偏移粘住：向下滚动超过一行表头高度后，DOM 靠后的叶子行精确叠在组行之上（z-index 相同、按文档序绘制、两行均不透明背景）。**经 Chromium 最小复现实测确证**（复刻该 inline 样式的 2 行表头滚动 100px 后）：组行与叶子行 `top` 均为 8px、垂直重叠 39px——组表头整行被叶子行盖住。既有测试 `table-e1c-nested-headers.test.tsx:282` 仅断言 `tr.nop-table-header-sticky` 存在，不校验粘性偏移。平铺表头（单行）不受影响；`[G3-视角5-06]`（虚拟化空态样式差异）与本条无根因关联。
- **行业惯例**: 多行粘性表头的标准做法是按行累计偏移（第 i 行 `top: i × 行高`，或以 `--header-offset` 逐行递增），AG Grid / Ant Design Table（`stickyHeader` 分组表头）滚动后组行与叶子行依次堆叠、全部可见；同 `top: 0` 的多行 sticky 重叠是 CSS 反模式。
- **用户影响**: 配置了分组表头 + 吸顶的宽表格（跨多屏滚动场景正是吸顶的目标场景）滚动后，"基本信息/联系方式"这类组标题消失，表头视觉塌成单行，用户失去列分组上下文；组行与叶子行边界错乱还伴随表头高度跳动感。
- **建议**: 按行索引计算偏移：`{rows.map((row, rowIndex) => <TableRow style={isAffix ? { ...stickyStyle, top: rowIndex * HEADER_ROW_HEIGHT } : undefined} .../>}`（`HEADER_ROW_HEIGHT` 可取 `var(--table-row-height)`，组行与叶子行同高时该式精确；行高不一致时按 `getBoundingClientRect` 实测累计）。注意 `var(--table-header-bg)` 不透明背景需保留（遮住其下滚过的表体）。
- **复核状态**: 未复核

---

### [G3-R4-视角4-01] 虚拟化 × 展开行 × 拖拽排序：`virtualRow.index`（含展开行条目）被当作数据行索引参与重排，拖放/键盘移动落错位置

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:416-447`；`packages/flux-renderers-data/src/table-renderer/table-flattened-items.ts:51-64`；`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:121-123`；`packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts:185-199,208-224`
- **证据片段**:
  ```tsx
  // table-body-rows.tsx:438 —— 虚拟路径把"虚拟条目索引"当作 rowIndex 传入
  renderDataRow(item, schemaProps, ..., combinePlan, virtualRow.index, ...)
  // table-flattened-items.ts:62-63 —— 展开行也占一个条目，位于其数据行之后
  if (isExpanded) { items.push({ kind: 'expanded', rowKey, columnCount }); }
  // use-row-drag-sort.ts:194 —— 但重排是对"仅数据行"的 orderedKeys 做 splice
  const nextOrder = reorderArray(orderedKeys, fromIndex, rowIndex);
  ```
- **严重程度**: MEDIUM
- **现状**: 非虚拟路径传给 `renderDataRow` 的 `rowIndex` 是 `processedData` 的纯数据行索引，与 `rowDragSortApi.orderedKeys` 一一对应，重排正确。虚拟路径却把 `virtualRow.index`（`flattenedItems` 的索引，**包含 `kind:'expanded'` 条目**）作为 `rowIndex` 传下行，最终进入 `dragHandleProps(rowKey, rowIndex)` 的拖放落点（`handleDrop` → `reorderArray(orderedKeys, fromIndex, rowIndex)`）与键盘重排（`handleKeyDown` → `targetIndex = rowIndex ± 1`）。凡虚拟化表格同时配置 `expandable`（含 `expandedRowRegionKey` 的展开详情行）与 `draggable: true`：目标行之前每存在一个展开行，实际落点就向前偏移一位——把行 A 拖到行 B 上，结果 A 落在 B 的前一/前 N 位；键盘 ArrowDown 一次同样跨错一格。展开行估高 120px（`table-body-rows.tsx:380`）证明展开条目真实参与虚拟列表。本条与 [G3-R3-视角8-01]（拖拽列缺表头配对，列契约根因）不同根因——那是列几何错位，本条是重排索引空间错位；固定列不参与该路径。
- **行业惯例**: dnd-kit / react-sortablejs 等排序实现一律要求"可视列表索引"与"数据数组索引"显式换算（drop 事件携带 data-row-key 再反查数据索引），TanStack Virtual 官方排序示例同样以 `getItemKey`/row-key 反查而非直接用虚拟索引作数组下标。
- **用户影响**: 大数据优先级/队列管理页（虚拟化 + 展开详情 + 拖拽排序并用）里，用户把任务行拖到目标位置松手，行却停在偏前一位；连续调整多处顺序时每次都差位，用户以"拖不动/拖错"反复重试，最终顺序与预期不符并随 orderField 持久化。
- **建议**: 虚拟路径以数据行索引下传：在 `flattenedItems` 构建时为 data 条目记录其在 `processedData`/`orderedKeys` 中的序号（`item.dataIndex`），`renderDataRow` 调用处改传 `item.kind === 'data' ? item.dataIndex : -1`；或在 `DataRowView` 内改用 `rowDragSortApi.orderedKeys.indexOf(rowKey)` 派生（行数 ≤ 万级，O(n) 可接受，亦可让 hook 暴露 `indexOfKey` Map）。补一条"virtual + expandable + draggable 拖放后顺序正确"的断言。
- **复核状态**: 未复核

---

## 去重自检（与全部 224 条按根因比对）

- **视角8-01**（resize 手柄包含块）≠ [G3-视角3-01]（同一手柄缺 focus-visible ring）：根因分别为"几何定位逃逸包含块"与"焦点视觉缺失"，互不覆盖；运行时实测证据链亦独立。
- **视角5-01**（autoFillHeight×虚拟化 ref 互斥）≠ [G3-R3-视角4-01]（虚拟化 radio 失效）：同象限不同根因（RadioGroup 缺包裹 vs ref 单元素双用途 if/else 路由）；该条修复不改变 ref 路由。
- **视角8-02**（嵌套表头 sticky 重叠）：R1-R3 无 affixHeader/嵌套表头条目；[G3-视角5-06] 为虚拟化空态样式差异，无关联。
- **视角4-01**（重排索引错位）≠ [G3-R3-视角8-01]（drag 列缺 header/colgroup 配对）：列几何契约 vs 索引语义，修复互不覆盖。
- summary 行（prefixRow/affixRow）不含 drag/save-bar 配对列：系 [G3-视角5-01]/[G3-R3-视角8-01] 已立"body 额外列缺配对"根因的直接后果，随该批修复一并处理，不另立条目。

## 误报与边界自查（dedup §3 / §4）

- resize 手柄 `absolute` 本身不是问题（对照 [G1-视角8-14] page 把手先例）——报的是包含块缺失导致锚点逃逸，有运行时实测支撑。
- `--table-header-bg` 已在 `theme-tokens/src/styles.css:77` 定义，粘性表头背景非悬空令牌，不报。
- `computeCombinePlan` 虚拟模式降级为不合并（`combine-cells.ts:36-39` 有明示注释的设计决策），不报。
- palette 原生 button 无 focus-visible 类但存在 UA 默认 outline——沿 [G7-视角3-15]"存在默认指示 → LOW"先例不报。
- 虚拟化 `<tr aria-hidden>` 垫行、`estimateSize` 估高偏差、`colgroup` 与 resize 键名差异——均为标准虚拟化/测量实践或无可感知用户影响，不报。
- pivot `initError` 文案、loading/empty 三态、`FALLBACK_THEME_TOKENS` hex 兜底——R2/R3 已覆盖或已登记自查，维持原判。

## 本轮检查范围与方法

- **范围**: G3 三包非 test 文件（data 88 / dashboard 16 / pivot 7，与 R1-R3 同口径）。R1-R3 已 3 轮全覆盖，本轮按派发重点做"组合专项 + 列契约全链复核"：精读 `table-renderer.tsx`、`fixed-columns.ts`、`column-width-measure.ts`、`table-header-row.tsx`（flat+nested）、`table-body-rows.tsx`、`table-body-row-rendering.tsx`、`table-flattened-items.ts`、`use-row-drag-sort.ts`、`use-column-resize.ts`、`combine-cells.ts`、`table-summary-row.tsx`、`use-auto-fill-height.ts`、`table-cell-chrome.tsx`、`table-cell-popover.tsx`、`statistics-renderer.tsx`、`pivot-renderer.tsx`、`editor-palette.tsx`、dashboard `styles.css` 与三个 editor 逻辑件；`crud-renderer.tsx` 按 selection/toolbar 面定向复查。
- **方法**: ① 列契约全链比对（colgroup/columnCount/header/body/summary/fixed layout 的逐列配对与 key 语义）；② 组合矩阵走查（虚拟化 × 行选择 radio/checkbox × 拖拽 × 展开行 × autoFillHeight × 嵌套表头 × 吸顶）；③ 关键结论 Chromium 运行时实测：resize 手柄经 Playwright 在 standard-crud 页读取 `getBoundingClientRect` 与逐级 `getComputedStyle` 包含块回溯（5/6 手柄锚定到容器右缘，实测矩形 `left:1340-1344 × height:590`）；嵌套 sticky 重叠经复刻 inline 样式的最小 HTML 实测（滚动 100px 后两行 `top` 相同、重叠 39px）；④ 测试基线交叉核对（`table-body-rows-virtual.test.tsx` 注入式 scrollRef、`table-e1c-nested-headers.test.tsx` 仅断言 class、`table-auto-fill-height.test.tsx` 无虚拟化组合用例），确认发现均处于"测试绕过生产路由/仅断言存在性"的盲区。
- **探针留档**: 运行时探针脚本与截图按 AGENTS.md 落 `_tmp/` 并于完成后删除；未改动任何受审代码与测试。

## G4 — mobile / scheduling（HIGH 1 / MEDIUM 4 / LOW 0，共 5 条）

### [G4-R4-视角3-01] barcode-input 的扫码/清除/scanNow 通道未接 `meta.disabled` 门禁：灰显锁定字段仍可被扫码改值、一键清空并随提交持久化

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:55-61,66-73,105-127,173-187,275,290,300-322`（对照 `:290` 输入框本体正确消费 `meta.disabled`）
- **证据片段**:
  ```tsx
  // :290 — 输入框本体正确禁用
  disabled={meta.disabled}
  // :55 — 扫码按钮渲染与 :105-106 点击守卫均只看配置/readOnly，无 meta.disabled
  const showScanButton = scanButton && (cameraAvailable !== false);
  ...
  const handleScanClick = async () => {
    if (resolved.readOnly) return;
  // :173-174 — 扫码结果写入表单值，同样只拦 readOnly
  const handleScanResult = (result: BarcodeDetectResult) => {
    if (resolved.readOnly) return;
    ...
  if (name && form) { form.setValue(name, val); }
  // :66-67 / :275 — 清除通道同样无 disabled 检查
  const handleClear = () => { if (resolved.readOnly) return; ... form.setValue(name, ''); }
  const showClearButton = resolved.clearable && !resolved.readOnly && inputValue.length > 0;
  ```
- **严重程度**: HIGH
- **现状**: `disabled: true` 的 barcode-input 字段：输入框经 `disabled={meta.disabled}` 灰显锁定（:290），但同一 InputGroup 内的扫码按钮（:311-322）与清除按钮（:300-309）的渲染条件与全部点击守卫（`handleScanClick` :106、`handleScanResult` :174、`handleClear` :67、`handleFocus` scanOnFocus 分支 :81、`useInputComponentHandle.scanNow` :242）只检查 `resolved.readOnly`，没有一处消费 `meta.disabled`。禁用字段上扫码按钮仍可点击并打开相机浮层，扫到的条码经 `form.setValue(name, val)` 写入表单值；配置 `clearable` 且有值时清除按钮同样可点，一键清空锁定字段。两条通道的写入都随表单提交持久化。与 round-02 [G2-R2-视角3-01]（input-time steppers 绕过 disabled，HIGH）、round-03 [G2-R3-视角3-01]（period 快捷按钮绕过 disabled，HIGH）同属"次要通道未接 disabled 门禁"根因族，按"修一处必须查全类"上报；form 包两轮核查面均未覆盖 scheduling 包。
- **行业惯例**: Ant Design 禁用表单控件的全部交互入口（输入、后缀按钮、清除）统一阻断；shadcn/ui 生态由原生 `disabled` + `disabled:pointer-events-none` 保证附属于输入组的按钮同步失活。禁用字段不允许存在任何可用写入口是表单控件基线（与本仓 G2 两轮同类条目引用的同一先例）。
- **用户影响**: 仓储扫码/核销场景中宿主按权限禁用条码字段（如审批只读态）后，字段呈灰显"锁定"外观，但用户点击旁边的扫码图标仍能唤起相机，扫上的新条码直接替换"已锁定"字段的值；或点击 × 把值清空。字段以禁用视觉展示着一个被静默改掉/清掉的值，并随提交落库——权限边界在 UI 层被无声击穿，且按钮外观与可用态完全相同、禁用语义零提示。后果为静默数据变更，与 G2 两轮同类条目同级，维持 HIGH。
- **建议**: 对齐输入框本体的口径，把 `meta.disabled` 并入全部守卫与渲染条件：`const locked = meta.disabled === true || resolved.readOnly;`——`showScanButton`/`showClearButton` 追加 `&& !locked`；`handleScanClick`/`handleScanResult`/`handleClear`/`handleFocus`/`scanNow` 的入口守卫改为 `if (locked) return;`；若希望禁用时保留扫码按钮位置，可渲染 `disabled={locked}` 的按钮（ui InputGroupButton 透传后自动获得 `disabled:opacity-50` 基类）。补一条"meta.disabled 时 scan/clear 均不写值"的回归测试。
- **复核状态**: 未复核

---

### [G4-R4-视角10-01] kanban WIP strict 仅在"列级 drop zone"一处强制：卡片级 drop 目标（最常用落点）完全绕过，超限列照样收卡；Add 按钮同样不接线

- **文件**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts:130-133,156-178,93-104`；对照文档契约 `flux-guide/design-patterns/kanban.md`（"`n` | 全局 WIP 严格模式（超限禁入）"）、`docs/plans/2026-07-20-2100-2-s7-kanban-advanced-plan.md`（"`n: true` prevents drop to full column … drag ghost cannot land"）；Add 通道 `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:352-364`、`packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:322-330`
- **证据片段**:
  ```ts
  // use-kanban-dnd.ts:130-133 — 卡片级 drop target 的 canDrop 无任何 WIP 检查
  canDrop({ source }) {
    if (source.data.type !== 'kanban-card') return false;
    return true;                       // 超限列内的卡片照样可落
  },
  // :164-167 — 唯一强制点：列级（空区）drop target
  canDrop({ source }) {
    if (source.data.type !== 'kanban-card') return false;
    if (wipSet?.has(columnId)) return false;
    return true;
  },
  // :93-99 — 实际落位提交（onDrop）无条件执行，WIP 只用于事件注解
  const newBoard = moveCard(currentBoard, cardId, toColumnId, toIndex);
  changeBoard(newBoard, cardId, fromColumnId, toColumnId, fromIndex, toIndex);
  ```
- **严重程度**: MEDIUM
- **现状**: strict 模式（schema `wipStrict`/列级 `n`）的文档契约是"超限禁入——不能拖放到已满列"。实现只有一个强制点：`registerColumn` 的列级 drop target `canDrop`（:164-167，测试 `use-kanban-dnd.test.ts:254-271` 也仅断言这一处）。但 pragmatic-drag-and-drop 的 drop target 栈中，悬停在有卡列时最内层目标是**卡片级** target（`registerCard`），其 `canDrop`（:130-133）无条件放行，`onDrop` 取 `dropTargets[0]`（卡片）后 `changeBoard` 无条件落位——把卡片拖到超限列的任意一张卡上即插入成功，strict 保护静默失效，事后仅以列头红色 WIP 徽标 + `border-red-400` 呈现既成事实。键盘移动通道（`moveCardKeyboard` :180-202）同样不检查 `wipSet`。旁证同根因：列尾"+ Add Card"按钮（kanban-column.tsx:322-330 → `handleCardAddAt` kanban-board.tsx:352-364）也不消费 `wipOverLimitColumns`，点击即向"已满禁入"的列继续加卡（文档仅承诺限制拖放，故本条以卡片级 drop 绕过为主体、Add 通道为同根因附属观察）。用户可见结果：同一张超限列，拖到空隙处被拒绝、拖到卡片上被接受，"禁入"承诺随落点随机生效。
- **行业惯例**: 看板 WIP 严格限制（Jira column constraint、SwiftKanban WIP lock）的语义是对"进入该列"这一事实的唯一闸口，不因落点命中列内卡片或空白区而不同；同一限制在不同拖放目标粒度上选择性生效被普遍视为强制实现缺口。
- **用户影响**: 团队以 strict WIP 管控阶段产能时，成员把卡片拖到超限列的卡片上（最常见的精准落点手势），拖放成功且无任何拦截提示，产能上限被静默突破，事后只能从红色徽标倒推"超了"；而拖到列空白区又被拒绝——用户无法建立"到底能不能放"的稳定预期，WIP 管控形同虚设。
- **建议**: 把 WIP 检查收敛到统一入口：① `registerCard` 的 `canDrop` 追加同款守卫（从 `stateRef.current.wipOverLimitColumns` 读取，`if (wipSet?.has(columnId)) return false;`）；② `moveCardKeyboard` 与 `onDrop` 落位前兜底 `if (wipSet?.has(toColumnId) && fromColumnId !== toColumnId) return;`；③ `handleCardAddAt` 对 strict 超限列返回 `false` 并可选 `env.notify('warning', t('scheduling.kanban.wipLimitReached'))`。补"卡片级 target + strict"的 canDrop/落位断言测试。
- **复核状态**: 未复核

---

### [G4-R4-视角11-01] calendar 拖拽确认对话框显示原始 resource ID：宿主未配资源时每次移动都显示 "\_default?"，配置资源时显示 res-\* 内部 ID

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:274-286,394-402`；`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-confirm-dialog.ts:21-25`；`packages/flux-renderers-scheduling/src/calendar/components/calendar-confirm-dialog.tsx:33-39`；文案 `packages/flux-i18n/src/locales/zh-CN.ts:1062`
- **证据片段**:
  ```tsx
  // calendar.tsx:398-400 — 无资源时的兜底资源：id 就是 '_default'
  return uniqueIds.map((id) => ({ id, text: id, title: id }) as CalendarResource);
  return [{ id: '_default', text: '', title: '' } as CalendarResource];
  // use-calendar-confirm-dialog.ts:24 — 确认态直接存原始 toResource（无 title 解析）
  targetResource: payload.toResource,
  // calendar-confirm-dialog.tsx:34-38 — 原始 ID 直接插值进确认文案
  {t('scheduling.calendar.moveConfirm', {
    title: confirmDialog.event.title,
    date: confirmDialog.targetDate,
    resource: confirmDialog.targetResource,   // 'res-1' / '_default'
  })}
  // zh-CN.ts:1062 — moveConfirm: '将 {{title}} 移到 {{date}} {{resource}}?'
  ```
- **严重程度**: MEDIUM
- **现状**: 指针拖拽移动排班是 calendar 主路径：拖放后弹出确认对话框（跨日期或跨资源必现，calendar.tsx:381 的 isValid 判定使同资源换日期也走确认）。对话框正文把目标资源渲染为**原始资源 ID**：宿主配置了 resources 时显示 `toResource` 的 id 原文（如 `res-1`、`emp-0713`），未配置 resources 时（单资源排班表，最常见形态）`displayResources` 兜底 id 恒为 `_default`，于是每次确认日期移动都显示"将 早班 移到 2026-08-28 **\_default**?"。资源标题（`resource.title`/`resource.text`）在 `displayResources`（calendar.tsx:394-402）里现成可得，`handleSwapConfirm`/`executeSwap` 链路却从未解析。"内部 ID 直出给用户"与本轮 [G4-R4-视角11-02]（kanban 活动日志列 ID）同根因家族，但组件、数据链路与修复点不同（此处是确认态未带 title，彼处是 columnNames 恒等映射），按 G7 轮 [G7-视角4-17]/[G7-R3-视角4-02] 分立先例保留两条。
- **行业惯例**: 日历/排班组件的移动确认文案以人读名呈现目标（Google Calendar 移动提示显示目标日历名；FullCalendar + 自定义确认的资源名走 title）。AG Grid/AntD 的外键展示渲染关联实体名称而非主键（同 [G7-R3-视角4-02] 引用）。
- **用户影响**: 排班员把"早班"从一人拖到另一人（或换个日期），确认框显示"移到 2026-08-28 res-2?"——无法确认目标是不是想给的那个人/那一天，确认操作失去核对意义；单资源场景下每次都出现的 `_default` 更像渲染故障字符串，用户会怀疑组件坏了。拖拽移动是该组件最高频操作，缺陷必然可见。
- **建议**: 在 `use-calendar-confirm-dialog.handleSwapConfirm`（或 `calendar.tsx` 构造 payload 处）用 `resourcesData.find(r => r.id === payload.toResource)` 解析标题：`targetResourceLabel: resourcesData.find(...)?.title ?? resourcesData.find(...)?.text ?? payload.toResource`；`ConfirmDialogState` 增加该字段，对话框插值改用 `resource: confirmDialog.targetResourceLabel`；无资源配置时兜底渲染空串或 `t('scheduling.calendar.defaultResource')`（新增键），不要让内部 id 直出。
- **复核状态**: 未复核

---

### [G4-R4-视角11-02] kanban 活动日志渲染原始列 ID：columnNames 恒等映射（id→id），真实列名在 board 内可得但从未传入

- **文件**: `packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:31-53,84-88`；`packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:419-436,654-658`；文案 `packages/flux-i18n/src/locales/zh-CN.ts:1111`
- **证据片段**:
  ```tsx
  // kanban-activity-log.tsx:84-88 — "columnNames" 由动作自身的列 id 恒等填充
  const columnNames: Record<string, string> = {};
  for (const a of actions) {
    if (a.detail.fromColumnId) columnNames[a.detail.fromColumnId] = a.detail.fromColumnId;
    if (a.detail.toColumnId) columnNames[a.detail.toColumnId] = a.detail.toColumnId;
  }
  // :33-34,39 — 插值进文案的 fromCol/toCol 因此仍是原始 ID
  const fromCol = ... columnNames[action.detail.fromColumnId] || action.detail.fromColumnId ...
  return t('scheduling.kanban.cardMoved', { actor, cardId, fromCol, toCol });
  // kanban-board.tsx:654-655 — 调用方只传 actions，不传列名表；boardData 里列 title 现成可得
  <KanbanActivityLog
    actions={actions}
  // kanban-board.tsx:421 — 界面新增列的 id 为 col-<时间戳>，直出尤其刺眼
  const columnId = `col-${Date.now()}`;
  ```
- **严重程度**: MEDIUM
- **现状**: 活动日志（工具栏 History 按钮打开）的每条 `cardMove` 记录显示"{{actor}} 将任务X从{{fromCol}}移至{{toCol}}"，但 `fromCol`/`toCol` 永远是列的原始 ID：`columnNames` 由动作自身 `fromColumnId`/`toColumnId` **恒等映射**而来（`map[id] = id`），组件也从未接收真实列名——调用方 kanban-board 持有 `boardData`（列节点 `data.title` 就在其中，:424 刚写入 `title`），却只传 `actions`。schema 初始列的 id 可能尚可读（如 `todo`），但经"+ 新列"创建的列 id 是 `col-1724…` 时间戳串，日志里"从 col-1724… 移至 todo"完全无法对应看板上的列。卡片侧恰好是正确基线：`recordAction` 已用 `(card?.data?.title) || payload.cardId`（kanban-board.tsx:291）回退标题，唯列名缺位。与本轮 [G4-R4-视角11-01] 同根因家族（内部 ID 未解析为标签直出用户），分立理由同上。
- **行业惯例**: 活动流/审计日志以人读实体名呈现操作对象（GitHub 事件流显示仓库名/分支名而非内部 id；Jira 审计日志显示项目 key+名称）。`map[id] = id` 的占位映射等于未实现名称解析。
- **用户影响**: 用户打开活动日志想核对"谁把哪张卡挪到了哪个列"，看到的是一串 `col-1724…` 内部标识，无法与看板上任何一列对上号；日志的核心信息（源/目标列）对所有含新增列的操作不可读，日志表面失去存在意义。
- **建议**: `KanbanActivityLogProps` 增加 `columnNames: Record<string, string>`，由 kanban-board 以 `Object.fromEntries(columns.map(c => [c.id, (boardData[c.id]?.title ?? boardData[c.id]?.data?.title) as string]))` 构造传入；组件内删除恒等映射兜底（保留 `|| fromColumnId` 的最终回退即可）；无对应列（已删除列）时显示 `t('scheduling.kanban.deletedColumn')`（新增键）而非裸 id。
- **复核状态**: 未复核

---

### [G4-R4-视角11-03] kanban 活动日志只记录 cardMove：六种动作类型中五类（增/删/更新/建列/删列）永不记录，删除卡片后日志毫无痕迹

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:180-191,183,287-297,352-379,414-436`；类型与文案 `packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:7-9,40-49`；`packages/flux-i18n/src/locales/zh-CN.ts:1112-1116`
- **证据片段**:
  ```tsx
  // kanban-board.tsx — recordAction 全文件唯一调用点在 onCardMove（:287）
  const recordAction = (action: Omit<KanbanAction, 'id' | 'timestamp'>) => { ... };  // :183
  ...
  onCardMove: (payload) => {
    ...
    recordAction({ type: 'cardMove', ... });    // :287 — 唯一接线
  },
  // :352-364 handleCardAddAt / :366-379 handleCardRemove / :419-436 confirmAddColumn
  // —— 三条 mutation 通道都只派发 schema 事件与 undo 命令，无 recordAction
  ```
  ```ts
  // kanban-activity-log.tsx:7-9 — 类型联合声明了六种动作…
  type: 'cardMove' | 'cardCreate' | 'cardDelete' | 'cardUpdate' | 'columnCreate' | 'columnDelete';
  // zh-CN.ts:1112-1116 — …五种文案已备（cardCreated/cardDeleted/cardUpdated/columnCreated/columnDeleted），
  // 但因无 recordAction 调用，全部为死文案
  ```
- **严重程度**: MEDIUM
- **现状**: 工具栏 History 按钮承诺"活动日志"（`scheduling.kanban.activityLog`），`KanbanAction` 类型联合与五种 i18n 文案（cardCreated/cardDeleted/cardUpdated/columnCreated/columnDeleted）均已就位，但 `recordAction` 在整个包内只有 onCardMove 一个调用点——加卡（`handleCardAddAt`）、删卡（`handleCardRemove`）、更新、建列（`confirmAddColumn`）、删列五类变更只写 undo 栈与 schema 事件，活动日志完全不留痕。用户删除了卡片后打开日志：既没有"删除了任务"条目，也没有任何"其他操作未记录"的说明（若无移动操作则整页 `noActivity` 空态）——日志呈现为"什么都没发生过"，与刚发生的删卡事实直接矛盾。属"入口文案承诺与实际行为不符"根因（round-03 [G4-R3-视角11-01] gantt"适应/Fit"按钮同族，gantt 修复不覆盖本处），且非 dedup §2 已登记缺口（日志是已实现能力，缺的是记录接线）。
- **行业惯例**: 看板活动流（Trello activity、Jira issue activity、GitHub Projects）记录全部卡片/列变更，或至少在 UI 上声明仅记录部分操作类型；"打开日志发现刚做的操作毫无痕迹"在所有参照系统中均按完成度缺陷处理。
- **用户影响**: 用户删错一张卡后想从日志找回线索（谁、何时、从哪个列删的），日志里空空如也；连续做了增/删/移动混合操作后，日志只显示移动——用户判定日志"坏了/丢记录"，对看板的操作追溯能力彻底失去信任。
- **建议**: 在五条 mutation 通道补 `recordAction`（与 ：287 同构、受同一 `isControlled` 守卫约束）：`handleCardAddAt` 成功分支记 `cardCreate`（cardId 同样回退 `newCard.title`）、`handleCardRemove` 记 `cardDelete`、`confirmAddColumn` 记 `columnCreate`（标题用确认后的 `title`）、删列与更新通道同理；若短期不补全，则在日志空态/标题处声明"仅记录移动操作"（i18n 键 + `scheduling.kanban.activityLogMoveOnly`），消除文案承诺与行为的落差。
- **复核状态**: 未复核

---

## 去重自检（与全部 224 条按根因比对）

- **视角3-01**（barcode disabled 绕过）← [G2-R2-视角3-01]（input-time steppers）/ [G2-R3-视角3-01]（period 快捷按钮）：同根因族（次要通道未接 disabled 门禁）的 scheduling 包新实例，按 dedup §1 与递归指令"修一处必须查全类"上报；两轮 G2 条目的核查与修复面均不覆盖 barcode-input 的五条通道。
- **视角10-01**（WIP strict 卡片级绕过）：R1-R3 均无 WIP 相关条目；与 [G3-R2-视角4-01]（maxSelectionLength 静默禁用无反馈）根因不同（彼为"限制生效但无解释"，本为"限制承诺未强制"）。
- **视角11-01**（calendar 确认框资源 ID 直出）与 **视角11-02**（活动日志列 ID 直出）：同根因家族互相引用，但组件/数据链路/修复点不同，沿 [G7-视角4-17] 与 [G7-R3-视角4-02] 分立先例保留两条；[G3-视角9-02]（dashboard aria-label 暴露 panel id）为 aria 语境，不同表面。
- **视角11-03**（日志仅记录 cardMove）← [G4-R3-视角11-01]（Fit 文案与行为不符）：同属"承诺与行为不符"根因族，组件不同、行为面不同（彼为单按钮无实现，本为五类记录缺失），独立修复点，上报。
- 以下命中经价值收敛**并入已立条目/备忘、不另立**：kanban-tag-filter 选中 pill `text-white` + 任意 `tag.color` 底、calendar-drag-type-selector 班次按钮白字——均为 round-03 [G4-R3-视角7-01]（固定白前景 × 任意背景配对）同包同根因表面，该条修复建议的"前景配对映射表"应一并覆盖 tag-filter；kanban-column resize handle / kanban-activity-log 所在 Sheet 无 focus-visible——round-02 [G4-R2-视角3-03] 已立"scheduling 包零 focus-visible 样式"包级根因（其证据已注明包内 5 个 CSS 文件零命中）；gantt-timescale/cellgrid/markers/notice-bar/kanban-activity-log 的 `gray-*` 调色板类——round-01 [G4-视角7-01] 包级硬编码根因（R3 已有"归并不重复"先例）。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

无新增。本轮未撞见 G-A~G-M 已登记 16 项缺口的新表象（swipe-cell 键盘等价属 G-B2、kanban 批量选择缺位属 G-B3，均沿 R1/R3 已登记口径，本轮复核无新表现）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- calendar 键盘拖拽会话的"箭头键逐次派发 + Enter 派发回原日期 + 幽灵卡 (0,0)"：round-02 [G4-R2-视角10-01] 已完整覆盖该键盘会话模型缺陷，本轮复读确认未修复但不重复立案。
- gantt Delete 键级联删除子任务无确认：undo（DeleteTaskCommand）完备 + 沿 [G4-视角8-02]"删除有 undo 兜底"先例，低于门槛。
- swipe-cell disabled 后 isOpen 仍可经 onAction capture handler 关闭/派发（:222-249 未 gate disabled）：仅"先开后禁用"的运行时迁移窄窗可达，静态 disabled 挂载下区域 inert 不可达，真实影响检验不通过，弃报留档。
- calendar 月视图资源名 96px 截断无 title：沿 round-03 G1 "可通过其余表面恢复/弱于误报 #5 例外" 先例（对照 [G4-视角5-03] 不可恢复要件），低于门槛。
- kanban 过滤后空列显示"拖卡片到这里"（dragCardHere）而非"无匹配结果"：列体拖放仍可用、语义半通，弱于 select 族空态基线的差异，弃报留档。
- gantt-editor 对话框（duration/progress 无上限校验、start>end 无守卫）：属数据校验深度而非 UI/UX 一致性面，且对话框按钮序/Label htmlFor 为包内正确基线（R1 已引用）。
- calendar-moveConfirm 的 {{date}} 为 ISO 日期串（2026-08-28）：日期格式可读、非内部标识，与 11-01 的 ID 直出不同质，不立案。
- `use-calendar-drag` 键盘移动（moveKeyboardDrag）绕过确认对话框而指针路径有确认：系 R2-10-01 已立"键盘会话模型断裂"的子表面，随该条一并修复，不重复。
- mobile 包 pull-refresh/swipe-cell/countdown/notice-bar/infinite-scroll 本轮全读复核：R1/R2 已报缺陷面之外无新实例（infinite-scroll 的 Spinner+重试、notice-bar 的 OA 系列修复、swipe-cell 的 OA-08 inert 均为正确基线）。

## 检查范围

- `packages/flux-renderers-mobile/src/`（12 非 test 文件）：countdown / swipe-cell / notice-bar / pull-refresh / infinite-scroll 全读复核（含 disabled/error/finish 相位），hooks/use-touch、styles.css、schemas、mobile-renderer-definitions 经 grep（aria/i18n/loading/disabled）复查，`*.test.*`、`test-support*`、`infinite-scroll-test-support` 不入审。
- `packages/flux-renderers-scheduling/src/`（91 非 test 文件，与 R1 同口径）：本轮深读 barcode-input（全文）+ barcode-scanner-overlay 复核、calendar（calendar.tsx 全文 / month·week·day view / event-block / header / confirm-dialog / drag-type-selector / overlay / use-calendar-drag·drag-create·confirm-dialog·navigation·state·virtualizer·export 复核）、gantt（gantt.tsx 装配段 / editor 全文 / markers / cellgrid / timescale / layout / grid 复核 / store deleteTask 段 / use-gantt-keyboard 全文 / use-gantt-drag 全文）、kanban（board 全文 / column 全文 / column-header 全文 / toolbar / tag-filter / activity-log 全文 / use-kanban-dnd 全文 / use-kanban-board-effects / use-column-dnd 段 / kanban-undo-stack 段）；其余纯逻辑文件经 `recordAction`/`wip`/`meta.disabled`/硬编码色/aria-label 定向 grep 闭合。

## 检查方法

- **组合与键盘路径专项**: calendar 三视图 × 键盘创建/拖拽/确认 × 资源解析链（getCellFromPoint → confirmDialog → executeSwap 逐字段核对 id/title 流向）；gantt 键盘（use-gantt-keyboard 全部 case）× 编辑器对话框 × undo 栈；kanban roving 焦点 × 拖拽 drop target 栈（列级 vs 卡片级 canDrop 逐一对照 pragmatic-drag-and-drop 语义）× 批量/添加入口 × WIP 限制数据流。
- **边缘态相位专项**: 逐组件核对 disabled（meta.disabled vs resolved.readOnly 双口径的消费面矩阵）、error（相机/导出/刷新/加载）、empty、WIP 超限五个相位的渲染与守卫；barcode 的五条写值通道（输入/扫码/清除/scanOnFocus/scanNow handle）逐条追守卫。
- **兄弟实例 grep 先行**: `recordAction`/`columnNames`/`meta.disabled`/`resolved.readOnly`/`text-white`/`aria-label="`/硬编码调色板类在全两包扫描，逐命中定位确认或归并。
- **交叉验证**: WIP 契约以 `flux-guide/design-patterns/kanban.md` 与 `docs/plans/2026-07-20-2100-2-s7-kanban-advanced-plan.md` 文档原文核实"超限禁入"承诺；`recordAction` 单调用点经全包 rg 闭合；`_default` 兜底资源与 moveConfirm 文案于 calendar.tsx/locales 双处核对；kanban 活动日志的调用方参数（kanban-board.tsx:654）与列 title 可得性（:424）经源码核实。
- **静态口径声明**: 纯源码静态审查（无浏览器运行时验证）；[G4-R4-视角10-01] 的"卡片级落点绕过"基于 pragmatic-drag-and-drop drop-target 栈语义（dropTargets[0] = 最内层目标）推理，建议复核阶段以 Playwright 拖拽到满列卡片上断言落位结果确认；其余条目的数据流结论均经源码逐段核实，置信度高。

## 汇总

| 严重程度 | 数量 | 编号                                       |
| -------- | ---- | ------------------------------------------ |
| HIGH     | 1    | 视角3-01                                   |
| MEDIUM   | 4    | 视角10-01、视角11-01、视角11-02、视角11-03 |
| LOW      | 0    | —                                          |

共 **5 条**（HIGH 1 / MEDIUM 4 / LOW 0）。G4 累积（R1+R2+R3+R4）: 14 + 10 + 8 + 5 = **37 条**；全审查累积: 224 + 5 = **229 条**。

## G5 — ai / graph / map / industrial+editor（HIGH 0 / MEDIUM 4 / LOW 2，共 6 条）

### [G5-R4-视角3-01] ai-chat `meta.disabled` 半量门控：发送框灰显锁定，但消息级"编辑+重发"仍可发起新 turn——P2-5 禁用契约在组合根上的缺口

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:568-577`；`packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:36-45,104-125`
- **证据片段**:
  ```tsx
  // ai-chat.tsx:568-577 —— meta.disabled 只透传给 sender
  <AiSenderView
    placeholder={resolved.placeholder}
    ...
    disabled={props.meta.disabled === true}
    ...
  />
  // user-edit.tsx:113-124 —— 内置编辑入口无任何 disabled 通道，仅按 isProcessing 门控
  <Button size="sm" variant="ghost" className="self-end opacity-60 hover:opacity-100"
    data-slot="ai-bubble-edit-toggle"
    aria-label={t('flux.ai.editMessage')}
    disabled={ctx?.isProcessing ?? false}
    onClick={startEdit}
  >
  ```
- **严重程度**: MEDIUM
- **现状**: `ai-chat` 是消息列表 + 发送框的组合根，`AiBubbleView` 对每条 user 消息**无条件**内置渲染 `UserMessageActions`（`ai-bubble/index.tsx:192`，非宿主组装项）。宿主对 ai-chat 节点声明 `disabled: true`（只读转录/无权限场景）时：发送框输入与提交按钮灰显（`disabled={loading || disabled}`），但消息铅笔编辑入口、编辑态"重发"按钮没有任何 disabled 通道——`resubmit()` 走 `engine.setMessages(截断) + engine.sendMessage(text)`，在"已禁用"的聊天面板上照常发起新的生成 turn。同包 ai-sender/ai-attachments/ai-conversations/ai-feedback/ai-tool-call 均按 P2-5 跨包契约消费自身 `meta.disabled`（"disable 整个交互面"），唯独组合根 ai-chat 的 disabled 半量生效，且消息级动作是内置而非宿主可选，宿主无法通过"不组合"规避。
- **行业惯例**: 禁用容器应阻断其承载的全部交互入口（shadcn/ui `disabled` + `disabled:pointer-events-none disabled:opacity-50` 族；Ant Design 禁用表单域统一阻断）；本项目自身 P2-5 契约（同包五个 renderer 的既有实现）即内部基线。与 round-03 [G5-R3-视角3-01]（scada 编辑器 disabled 仅 inert 画布、面板全可交互，MEDIUM）同形——disabled 契约家族的 ai 组合根实例，代码路径（chat context 组合 vs editor 面板 props）互不覆盖。
- **用户影响**: 宿主把聊天面板标为禁用后，发送框呈灰态传达"这里锁了"，但用户点任意一条自己消息的铅笔，改写内容点重发——消息被截断重发、新回答照常流式生成。权限/只读边界在 UI 层被无声绕过，且灰显发送框与可用的消息编辑并存，用户无法判断当前到底能不能操作。
- **建议**: ① `chatContextValue`（ai-chat.tsx:500-503）增加 `disabled`，`AiMessageListView` 透传至每个 `AiBubbleView`，`UserMessageActions` 增加 `disabled` prop：pencil `disabled={disabled || ctx?.isProcessing}`、编辑态两键 `disabled={disabled}`、`startEdit`/`resubmit` 入口补 `if (disabled) return`（对齐 ai-sender 的 `commit()` 双重守卫模式）；② 独立使用 `ai-bubble` 的宿主不受影响（props 缺省 undefined）。
- **复核状态**: 未复核

---

### [G5-R4-视角3-02] 编辑会话跨流式锁定：流开始后编辑态"重发"按钮呈可用态但点击被 JS 静默吞掉（铅笔有禁用、提交键没有）

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:55-61,104-107,120`
- **证据片段**:
  ```tsx
  // :55-61 —— 处理中静默 return（草稿保留），按钮却无 disabled
  async function resubmit() {
    // P1-1: never re-send while a turn is streaming ...
    if (e.getState().isProcessing) return;
    const text = draft.trim();
    if (text.length === 0) return;
  ...
  // :104-107 —— 提交按钮无任何 disabled/视觉锁定
  <Button size="sm" data-slot="ai-bubble-edit-submit" onClick={() => void resubmit()}>
    <Check className="h-3 w-3" />
    {t('flux.ai.send')}
  // :120 —— 同组件的铅笔入口却正确禁用了
  disabled={ctx?.isProcessing ?? false}
  ```
- **严重程度**: LOW
- **现状**: 进入编辑态的路径被正确锁定（铅笔在 `isProcessing` 时 disabled），但**已打开的编辑会话**没有随流式开始而锁定：用户在空闲时点铅笔打开编辑器，随后从发送框发出新消息（或重试触发流式），此时编辑态的"重发"按钮保持完整可用外观，点击后被 `resubmit()` 的 `isProcessing` guard 静默吞掉——无 toast、无禁用态、无任何反馈（P1-1 注释自述 guard 语义）。同一动作条内两套状态语言：入口锁了、出口装作可点。
- **行业惯例**: Ant Design / shadcn 生态 pending 态惯例是禁用同一操作区的竞争动作（本组件铅笔键即正确基线）；"看起来能点、点了没反应"与 round-03 [G1-R3-视角3-01]（wizard committing 期 prev/nav 静默锁定，MEDIUM）同根因（JS guard 无视觉同步），为该已立根因在 ai 包的新实例——G1 修复不覆盖本处。
- **用户影响**: 用户改到一半的消息编辑器里点"重发"，界面毫无反应，会反复点击或以为编辑器坏了；草稿虽保留，但用户无法区分"没点上"与"被锁了"。
- **建议**: 编辑态两键随处理态同步锁定：`<Button ... disabled={ctx?.isProcessing ?? false}>`（重发键），复用 ui Button 基类禁用样式；或最低限度在提交键上落 `aria-busy`/`data-processing` + `opacity-60`。guard 保留为兜底（对齐铅笔键的双层模式）。
- **复核状态**: 未复核

---

### [G5-R4-视角3-03] scada 编辑器 `destroyed` 终态零视觉处理：画布区空白但工具箱/图元库/属性面板全套保活，mutator 仍写 working copy 并派发事件

- **文件**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:173-176,211,259,282-283`；`packages/flux-renderers-industrial/src/editor/styles.css`（全文无 `[data-status='destroyed']` 规则）；`packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（全文件无 isDestroyed 守卫）
- **证据片段**:
  ```tsx
  // scada-editor-canvas.tsx:259 —— showLayoutBody 只排除 loading/error，destroyed 照常渲染全套 chrome
  const showLayoutBody = runtime !== null && effectiveStatus !== 'loading' && effectiveStatus !== 'error';
  // :282-283 —— destroyed 只落 DOM 属性，无任何 CSS/组件消费
  <div ref={containerRef} data-cid={cidAttr} data-slot="scada-editor-canvas"
    data-status={effectiveStatus} ...
  // :173-176 —— component:destroy() 句柄（§8.3 OP-4 文档化 API）→ setStatus('destroyed')
  const handleDestroyed = () => { setStatus('destroyed'); };
  ```
- **严重程度**: LOW
- **现状**: `component:destroy()` 是文档化的组件句柄能力（contract 测试 `scada-editor-canvas-contract.test.tsx:214` 断言 `data-status="destroyed"` 可达），但 destroyed 作为终态只有属性落点：`showLayoutBody` 不排除 `'destroyed'`，工具箱（删除/对齐/撤销重做/导入导出）、图元库、属性面板、状态栏全部照常渲染且可点击；`runtime-mutators` 全部写入口无 `isDestroyed` 守卫，点击后仍会改写 `session.workingConfig` 并派发 `scada-editor:sessionChange` 等 schema 事件——而 leafer 画布已被销毁，画布区只剩空白，无任何"已销毁/不可用"提示。对照同文件 loading/error 两态均有 overlay 兜底，destroyed 是四态中唯一无视觉分辨的终态。
- **行业惯例**: Figma/Node-RED 类编辑器关闭/销毁实例后要么卸载 DOM、要么以只读/已关闭占位呈现；"终态界面照常可交互且仍在写状态"在一切主流编辑器中均为缺陷。
- **用户影响**: 宿主在"切换场景/关闭编辑器"流程中调用 destroy 而组件未卸载时，用户面对的是一个看似正常的编辑器：画布空白像加载失败，点删除/属性修改毫无视觉反馈，但数据与事件在底层继续变化——既无法从界面得知编辑器已不可用，也可能误以为操作生效。
- **建议**: ① `showLayoutBody` 追加 `&& effectiveStatus !== 'destroyed'`，destroyed 时画布区渲染占位（`<div data-slot="scada-editor-destroyed" className="nop-scada-editor-loading">{t('industrial.scada.editor.destroyed')}</div>`，新增 i18n 键，复用 loading 样式）；或最低限度在 `editor/styles.css` 补 `[data-status='destroyed'] { opacity: .55; pointer-events: none; }` 面板级禁用视觉；② `runtime-mutators` 写入口补 `if (runtime.engine.isDestroyed()) return;` 兜底，阻断幽灵写入。
- **复核状态**: 未复核

---

### [G5-R4-视角5-01] 会话切换水合期间旧会话内容滞留显示且无加载指示：activeId 立即翻转、activeEngine 等 `loadMessages` 完成才切换

- **文件**: `packages/flux-renderers-ai/src/adapters/use-conversation.ts:439,447-473`（对照 `ai-chat.tsx:511-529` 仅 `engineNullSwitch` 即 activeEngine===null 时渲染 emptyState）
- **证据片段**:
  ```ts
  // use-conversation.ts:439 —— 侧栏高亮立即切到目标会话
  setActiveId(id);
  ...
  // :447-469 —— 未缓存引擎 + storage 时：await 水合期间 activeEngine 仍指旧会话
  let engine = engineCache.get(id);
  if (!engine) {
    engine = buildEngineFor(id);
    engineCache.set(id, engine);
    if (storage) {
      try {
        const stored = await storage.loadMessages(id);   // ← await 期间 UI 无任何信号
        ...
        if (stored.length > 0) engine.setMessages(stored);
  // :473 —— 水合完成后才切换消息面板
  setActiveEngine(engine);
  ```
- **严重程度**: MEDIUM
- **现状**: `switchConversation` 对未缓存会话的时序是 `setActiveId(id)`（同步）→ `await storage.loadMessages(id)`（异步）→ `setActiveEngine(engine)`。await 窗口内 `activeIdRef` 已指向 B、侧栏高亮 B，而 `activeEngine` 仍是 A 的引擎——ai-chat 继续渲染 A 的全部消息，无任何"正在加载会话"指示。`ConversationStorageStrategy.loadMessages` 是 Promise 契约（远端 storage 属一等场景，本地 localStorage 仅是快路径特例），慢存储下窗口可达秒级。水合失败分支（`reportStorageError` 后仍 `setActiveEngine(engine)`）还叠加一个空面板静默呈现（storage 错误沿 AI-28 契约归宿主观测，此处不重复立案，仅说明窗口终点）。该 hook 位于被审目录内（adapters/），且整个 API 面没有暴露任何 loading/switching 状态，宿主无从自行兜底。
- **行业惯例**: ChatGPT/Claude/antd-x 切换会话时要么即时呈现目标会话（本地）、要么以骨架/spinner/空白+指示表达加载中；"侧栏已高亮新会话、正文仍是上一个会话的完整内容"在所有对话产品中均视为状态错乱。
- **用户影响**: 使用异步持久化的宿主里，用户点会话 B：侧栏高亮 B，但正文持续显示 A 的聊天记录，数秒后内容整体跳变为 B——期间用户可能对着 A 的消息继续输入（发送框未锁定），消息落进 B 上下文；用户无法判断"点了没生效"还是"在加载"。
- **建议**: `useConversation` 暴露切换中状态并消费：① 最小改法——`switchConversation` 进入即 `setActiveEngine(null)`（复用 ai-chat 既有 `engineNullSwitch` emptyState 通道，`flux.ai.selectConversation` 文案换成"加载中"语义键或叠加 `<Spinner className="size-4" />`，对齐同包 loading 基线），水合完成后 set 目标引擎；② 或返回值增加 `switchingId: string | null`，由宿主/ai-conversations 在目标项上渲染 busy 指示、ai-chat 据此给消息面板叠加 `opacity-60 pointer-events-none`（对齐 G2-视角5-03 建议的 form loading 模式）。快路径（缓存命中）不受影响（同步分支无 await）。
- **复核状态**: 未复核

---

### [G5-R4-视角10-01] 错误态"重试"按"重新提问"实现：失败的用户消息保留、重试再追加一条同文消息，用户提问在界面上重复上屏

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/error.tsx:32-37,88-101`；引擎侧 `packages/flux-renderers-ai/src/engine/create-engine.ts:196-207,253-261`
- **证据片段**:
  ```tsx
  // error.tsx:32-37 —— 两处重试入口都走 sendMessage（追加式）
  <Button type="button" variant="outline" size="sm" data-slot="ai-bubble-error-retry"
    aria-label={t('flux.ai.retry')}
    onClick={() => { void ctx?.sendMessage(lastUserText); }}>
  // error.tsx:95-99 —— ListErrorBanner 重试键同款
  onClick={() => { void sendMessage(lastUserText); }}
  ```
  ```ts
  // create-engine.ts:253-254 —— 失败 turn 的用户消息已留在历史里（错误前 push）
  adapter.mutate('requestState', (draft) => {
    draft.messages.push(...incomingMessages);   // requestState = 'error'，消息不回滚
  // create-engine.ts:200-206 —— retry 再造一条全新 user 消息
  const userMessage = adapter.createMessage({ id: generateMessageId('user'), role: 'user', content, ... });
  await runTurn([userMessage]);
  ```
- **严重程度**: MEDIUM
- **现状**: 错误是聊天主路径的常态边缘态（鉴权失败/限流/弱网）：零包失败时 assistant 残影被 `commitOrDropResidue` 移除（不变量⑩），界面留下"用户消息 + 红色横幅 + 重试键"。点击重试后：原失败提问仍在列表里，`sendMessage(lastUserText)` 又追加一条**内容完全相同**的新用户消息，再接新回答——用户看到自己同一句话连续出现两次（失败 turn 的空悬提问 + 重试副本），多轮失败则重复 N 次。而引擎已内建语义正确的重试原语 `engine.regenerate()`（`regenerate.ts:52-60`：截断到最后一条用户消息、原地重跑、不新增消息）——ai-feedback 的 refresh 动作（`ai-feedback.tsx:147-149`）消费的正是它，同一包内"重试"语义双轨。
- **行业惯例**: ChatGPT 的 Retry / Claude 的重试均对失败尝试原位重新生成，不复制提问；Ant Design X 的 `reload` 语义同为 regenerate last turn。失败重试产生重复气泡在所有主流对话产品中均视为缺陷。
- **用户影响**: 请求失败（弱网/限流高发）后点"重试"，界面出现两条一字不差的提问上下相邻，用户会怀疑"发重了""要不要删一条"；带长 prompt 的场景重复尤为刺眼，且历史中重复消息会随上下文进入后续请求。
- **建议**: 两处重试入口改为消费既有 regenerate 通道：`ErrorContentRenderer` 内 `void ctx?.engine.regenerate()`（ai-feedback refresh 同款，注意 `isProcessing` 守卫沿用 engine 内建 guard）、`ListErrorBanner` 经 props 传入 `regenerate`（ai-message-list 已持有 `ctx`，与 `sendMessage` 同源透传）；`extractLastUserText`/`lastUserTextBefore` 辅助函数可随之移除。若需保留"换种问法重发"能力，应作为独立动作（"重新提问"）而非复用"重试"标签。
- **复核状态**: 未复核

---

### [G5-R4-视角11-01] scada 图元库"点击添加"仍固定落点 (50,50)：连续点击产生完全重叠的图元栈，与已修复的"拖拽落点在指针处"同源不同路径

- **文件**: `packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx:38-49`（对照 `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:311-327` 已修复的拖拽落点）
- **证据片段**:
  ```tsx
  // editor-palette.tsx:38-49 —— 点击路径硬编码 x:50, y:50
  const handleAddDefault = (type: string) => {
    idCounter.current += 1;
    const id = `${type}-${idCounter.current}`;
    props.runtime.addWorkingSymbol({
      id,
      type,
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
  };
  ```
  ```tsx
  // scada-editor-canvas.tsx:313-315 —— 同一图元库的拖拽路径已按指针落点修复（P1-11）
  // plan 2026-08-07-1835-2 Phase 3 / multi P1-11：palette drop 落在指针处
  // （此前硬编码 x:50,y:50 堆叠）。
  ```
- **严重程度**: MEDIUM
- **现状**: 图元库条目是可点击也可拖拽的 Button（`onClick={handleAddDefault}` + `draggable`）。拖拽放置已在 plan 2026-08-07-1835-2 P1-11 修复为"落在指针处"，修复注释自述旧缺陷即"硬编码 x:50,y:50 **堆叠**"；但**点击添加**路径保留了同一硬编码落点——连续点击（或点击不同图元）全部落在 (50,50)，100×100 尺寸完全重合，后者精确覆盖前者，画布上看不出有任何新增，undo 栈却每击一条记录。
- **行业惯例**: 画布编辑器点击/拖入新增元件放入视口内的空闲位置或做自动偏移（Figma/Excalidraw 新增图形错位叠放、gridstack 空位探测；round-03 [G3-R3-视角11-01] 已就 dashboard addPanel 固定 (0,0) 重叠立为 MEDIUM，本条为同根因跨包实例——G3 修复不覆盖 industrial）。
- **用户影响**: 用户用最快的点击方式搭场景：点"管道"再点"阀门"，画布毫无变化（阀门恰好盖住管道），以为第二下没点上再点几次——最终是一个看不见的图元栈，拖开才发现叠了 N 层；图元"消失/替换"错觉直接破坏编辑信任。
- **建议**: 与拖拽路径对齐：点击添加时以画布视口中心的世界坐标为基准做网格化错位（如 `runtime.engine.getWorldPoint({ x: rect.width/2, y: rect.height/2 })` + `count * 24` 递增偏移，`count` 为同帧连续添加数），或复用 G3-R3-视角11-01 建议的首空闲位探测；最低限度对固定落点叠加 `+ (idCounter.current % 8) * 24` 的确定性偏移，消除完全重合。
- **复核状态**: 未复核

---

## 去重自检（与全部 224 条按根因比对）

- **视角3-01**（ai-chat disabled 半量门控）← P2-5 disabled 契约家族：[G5-R3-视角3-01]（scada 编辑器 meta.disabled 仅 inert 画布）为门控信号不同（mode/面板 props vs chat context）、代码路径不同（editor 面板 vs ai 组合根）的兄弟实例；[G1-视角3-02]/[G2-R2-视角3-01] 等 disabled 绕过族均非"组合根 disabled 不透传到内置子动作"形态。按 dedup §1 新实例规则上报。
- **视角3-02**（编辑会话跨流静默 no-op）← [G1-R3-视角3-01]（wizard committing 期 prev/nav 静默锁定）同根因（JS guard 无视觉同步）的新实例（不同包不同组件），已互相引用。
- **视角3-03**（destroyed 终态零处理）: R1-R3 的 G5 条目覆盖 loading 空白（[G5-视角5-01]）、preview 态（[G5-R2-视角3-03]）、meta.disabled（[G5-R3-视角3-01]）、statusBar 空壳（C2），均未触及 destroyed 终态与 mutator 幽灵写入；无根因重合。
- **视角5-01**（切换水合滞留）: [G5-R2-视角3-01]（aborted 零反馈）为流中断终态，本条为会话切换中间态；[G5-R2-视角5-03]（空消息空白面板）为空态兜底缺失。三轮均未触及 useConversation 切换时序的 UI 呈现，无重合。
- **视角10-01**（重试重复上屏）: [G5-R2-视角3-01] 以 error banner（横幅+重试）为"正确对照"引用过其存在性，但重试的**重复追加语义**从未立案；ai-feedback refresh 静默 no-op 已在 R3"不立案"留档（不同问题）。[G2-R2-视角5-01]（上传重选覆盖）为在飞覆盖，不同根因。
- **视角11-01**（点击添加固定落点）← [G3-R3-视角11-01]（dashboard addPanel 固定 (0,0) 重叠）同根因跨包新实例（G3 修复不覆盖 industrial），已互相引用；与 [G5-视角1-04]（工具箱字形）等 R1 工具箱条目无重合。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

无新增。本轮未撞见已登记 16 项缺口（G-A~G-M/G3-余）的新表象；map choropleth 无图例（R3 已登记）与 editor 状态栏空壳（R3 已登记）维持原 C2 口径，无新表现。

## 误报与边界自查（dedup §3 / §4）

- **ai-feedback refresh 对非最新消息触发的是"重新生成最后一轮"**（`engine.regenerate()` 截到最后一条用户消息，非所点击消息）：Decision D-refresh 的 docstring 已声明"regenerates the latest assistant message"，且典型组合是 feedback 挂在最新回答尾部；语义-落点错位依赖宿主非典型组合才可见，按价值收敛判据不立案，留此防复核。
- **BranchPicker 在 branches.length===1 时渲染 "1/1" + 双禁用键**：仅宿主构造单元素 branch 集才出现，纯边缘配置，低于门槛。
- **ai-token-usage 环形用量无高占比警示色 / cost 硬编码 `$`**: 无明确行业惯例强制（ring 表达占比已达成信息目标），未通过真实用户影响检验，弃报。
- **ai-token-usage ↑/↓ 文本箭头**: prompt/completion 计量的行业通写（OpenAI/langfuse 同款），非导航图标语义，不在视角 1 范围。
- **graph 选中与搜索命中同为 primary 边框**: selected 额外携带 `--shadow-primary-sm`，两态可分辨；且搜索循环（Enter）本身即边命中边选中，弱差异不构成用户障碍。
- **map OL 懒加载失败（olError）无重试入口**（仅 geojsonSource 错误有 retry 键）: CDN 级失败刷新页面即恢复，与 [G4-R3-视角5-01] 相机失败同象限但更边缘，低于门槛。
- **ai-chat engineNullSwitch 分支丢弃 header/footer/sender 只渲染 emptyState**: 设计声明的 Failure Path（§11.2），非缺陷。
- dimension 09-12（props 契约/marker 视觉/原生 HTML 替代/field 建模）与全量 WCAG 未涉及；误报对照 8 条（opacity-0 trigger / ml-auto / ghost / icon-xs·sm / 截断 / role=button div / destructive 验证钮 / transition-all）全部规避。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **ai 嵌套会话组合其余面**: senderDraftStore 随引擎切换保留草稿（跨会话残留草稿为 D4 通道语义，宿主可 setLocal 清空，不立案）；`commit()` 的 `ctx?.isProcessing` 静默 return 有按钮 disabled+Stop 键双重视觉在位（[G5-视角3-01] 已报的 textarea 锁定是其对立面），不另立；maxLength 超限 Enter 无效果但提交键禁用+计数红色已在位；HITL pending 卡片在 turn 被中断后仍可点（host 拥有 approval 工作流为 P3 契约）；ai-citations 空源卡片为文档化 `citation-no-sources` 失败路径；conversation rename 内联编辑 Esc/blur 退出沿 R3 先例不报。
- **ai aborted/超限其余面**: `maxToolRounds` 超限有 `LoopLimitNote`（role=status，样式在位）；`maxLength`、`maxFiles/maxSize`、`maxSelection` 各通道均已被 R2 覆盖；`data-state='aborted'` 无消费方沿 [G5-R2-视角3-01] 不重复。
- **editor 联动其余面**: sessionVersion bump 已打通 undo/redo disabled 与 inspector fieldErrors 的反应式刷新（scada-editor-canvas.tsx:75-79 注释即修复记录）；selection 删除后 mutators 有 pruned 分支同步 selection（runtime-factories P1-2）；inspector 多选时仅绑定 `selection[0]`——但画布指针层无 shift-click/marquee 多选（全包 grep 无命中），多选仅经 `component:setSelection` 句柄可达，宿主驱动的边缘组合未达真实用户影响门槛，留此防复核；工具箱 Fit/Center/导入导出/undo-redo 按钮均有 flashStatus 回显（样式缺陷已由 [G5-R2-视角3-02] 覆盖）。
- **graph/map 复读**: graph 空态（empty region/noData 居中）、搜索 0 命中裸 "0" 计数（R3 已留档低于门槛）、controls 缩放边界（[G5-R2-视角3-04] 已报）、布局切换枚举文案（[G5-R2-视角9-01] 已报）；map loading/empty/error/retry 结构与角色缺口（[G5-视角9-01]/[G5-R2-视角5-02] 已报）。两包本轮无新命中。

## 检查范围与方法

- **范围**: `packages/flux-renderers-ai/src/`（renderers 全 14 个 + ai-bubble 全 renderers + adapters 全 12 个 + engine 9 文件 + rich-text/tiptap-sender + styles.css + schemas.ts；`*.test.*` 除外）；`packages/flux-renderers-graph/src/`（graph-renderer/xyflow-canvas/graph-node/graph-store/graph-search/styles.css 复读）；`packages/flux-renderers-map/src/`（map-renderer 全文复读 + schemas/use-map-geojson 定向复查）；`packages/flux-renderers-industrial/src/` 含 `src/editor/`（scada-editor-canvas 全文、toolbox/inspector/palette/runtime-mutators/runtime-factories/use-editor-handles/editor-engine/styles.css、engine/viewport 定向）。
- **盲区对照**: ① ai 嵌套会话组合——ai-chat×message-list×sender×attachments×conversations×useConversation 逐组合面走查（disabled 透传链、切换时序、错误恢复闭环、draft 通道）→ 视角3-01/5-01/10-01；② editor 联动——canvas↔toolbox/palette/inspector 的 selection/session/mutator 装配逐 seam 核对 + 终态矩阵（loading/ready/error/destroyed）→ 视角3-03/11-01；③ aborted/超限边缘态——engine 三终态×UI 消费矩阵、编辑会话×流式竞争、maxToolRounds/maxLength 通道 → 视角3-02。
- **方法**: 前轮 G5 全部 37 条（R1 18 + R2 14 + R3 5）+ 跨组关联根因（G1-R2-视角3-02 / G1-R3-视角3-01 / G3-R3-视角11-01 / P2-5 家族）先建去重基线，再按盲区清单全文精读 + 交叉 grep（`isComposing`/`error.message`/文本字符/调色板类/`data-state`/`isDestroyed`/`disabled` 透传链/`shiftKey`·marquee 多选通道/`setActiveEngine` 时序）；每条发现经引擎侧对应代码路径（create-engine/regenerate/use-conversation）二次核实后立案。
- **静态口径**: ai 按源码口径；graph/map/industrial 沿 R0/R1 静态口径（leafer/OpenLayers/xyflow 运行时依赖）；无浏览器运行时验证。

## G6 — @nop-chaos/ui 62 模块（HIGH 0 / MEDIUM 1 / LOW 0，共 1 条）

### [G6-R4-视角3-01] CommandInput 的焦点环挂空：outline-hidden 抹掉默认轮廓，组级 ring 因 data-slot 不匹配永不触发——⌘K 命令面板键盘焦点不可见

- **文件**: `packages/ui/src/components/ui/command.tsx:57-70`（对照组件: `packages/ui/src/components/ui/input-group.tsx:16`、正确基线 `packages/ui/src/components/ui/combobox.tsx:56-57`）
- **证据片段**:
  ```tsx
  // command.tsx:58-66 — 输入被 InputGroup 包裹，但槽位标记是 "command-input"
  <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
    <CommandPrimitive.Input
      data-slot="command-input"
      className={cn('nop-command ',
        'w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ```
  ```tsx
  // input-group.tsx:16 — 组级 focus ring 只认 input-group-control 槽位（:119-129 InputGroupInput 即靠该 data-slot 命中）
  ... has-[[data-slot=input-group-control]:focus-visible]:border-ring
      has-[[data-slot=input-group-control]:focus-visible]:ring-3
      has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 ...
  ```
- **严重程度**: MEDIUM
- **现状**: CommandInput 把 cmdk 的搜索输入（真实 `<input>`，经 node_modules 核实 cmdk `Primitive.input` 渲染且自动聚焦）放进 InputGroup，但类串 `outline-hidden`（Tailwind v4 = 透明 outline）抹掉了浏览器默认焦点轮廓，而 InputGroup 唯一的焦点指示——`has-[[data-slot=input-group-control]:focus-visible]:ring-3`——要求子元素携带 `data-slot="input-group-control"`；该输入实际携带的是 `data-slot="command-input"`，选择器永不匹配。结果是焦点落在命令面板搜索框上时：默认轮廓没了、组级 ring 不亮、弹层容器 `outline-none`、sr-only header 无样式——**零视觉指示**。同一文件族内 combobox.tsx:57 的同构组合（`ComboboxPrimitive.Input render={<InputGroupInput />}`，InputGroupInput 内部携带 input-group-control 槽位，input-group.tsx:122）焦点环正常点亮，证明该 InputGroup 组合契约是本仓既有基线而非未实现能力；CommandInput 是唯一漏接槽位标记的消费方。这是焦点环家族（视角 3）的第 5 例：[G6-视角3-01] InputGroupAddon → [G6-视角3-02] Card → [G6-R2-视角3-01] DialogHeader → [G6-R2-视角3-02] MenubarTrigger → 本条。
- **行业惯例**: shadcn/ui InputGroup 的组合契约是以 `data-slot="input-group-control"` 标记被包裹的真实输入控件、由组容器统一渲染 focus ring（本仓 input-group.tsx:119-130 InputGroupInput 即该契约的实现）；shadcn/ui 一切可聚焦交互面统一 `focus-visible:ring-3 focus-visible:ring-ring/50`（本仓 `button.tsx:7`、`input.tsx:16` 同款）。焦点落在文本输入框上必须有可见指示是所有主流组件库（shadcn/AntD/MUI）的共同基线。
- **用户影响**: 键盘用户打开 ⌘K 命令面板（cmdk 自动聚焦搜索框）后，焦点在搜索框上但屏幕无任何变化；Tab 后移时焦点经 addon（[G6-视角3-01] 已报其不可见）再到结果项，出现连续多个不可见停留点，用户无法判断当前输入去向何处、方向键是否可用；与同产品内 ComboboxInput（同 InputGroup 组合、聚焦即亮 ring）并排使用时，两个"输入组"行为分裂。可见用户（鼠标点击）点击后同样得不到聚焦反馈。
- **建议**: 一行修复——`command.tsx:60` 的 `data-slot="command-input"` 改为 `data-slot="input-group-control"`（或改为 `render={<InputGroupInput />}` 组合、与 combobox.tsx:57 同款），使 InputGroup 既有 ring 选择器生效；不新增任何样式类。补一条焦点断言测试（聚焦后 `getComputedStyle(InputGroup).boxShadow` 含 ring 值或断言 `data-slot=input-group-control` 存在于命令输入上）。
- **复核状态**: 未复核

---

## 去重自检（与 R1 127 条 + R2 63 条 + R3 34 条逐根因比对）

- **[G6-R4-视角3-01] vs [G6-R2-视角3-02]**（MenubarTrigger `outline-hidden` 无替代）: 同属"焦点不可见"根因族的兄弟实例（dedup §1 允许申报），但机制与修复点不同——Menubar 是"抹掉轮廓且组件内无任何替代样式"，本条是"组级替代 ring 已存在、但 `has:` 选择器挂空的槽位标记不匹配"，修复是改一个 data-slot 而非新增 focus-visible 类；且 G6 前三轮的疑点清单（round-02.md:1615-1625 / round-03.md:976-985）均未记录本条目，R3"焦点环全量 grep 零新命中"的结论未覆盖此处——`outline-hidden` 在 command.tsx 的命中当时被 InputGroup 包装"看似有 ring"掩盖，槽位不匹配需交叉读两个文件才可见。
- **[G6-R4-视角3-01] vs [G6-视角3-01]**（InputGroupAddon 无焦点态）: 同组件族（InputGroup）不同元素（addon vs 被包裹的 input），R1 条目的修复（addon 变体追加 focus-visible 类）不改变 `has:` 选择器匹配，不覆盖本条。
- **视角 9（aria 关联链）零新发现**: cmdk input 的 `role="combobox"` + `aria-controls`/`aria-activedescendant`/`aria-labelledby` 链经 node_modules 源码核实完整；Dialog 拖拽说明孤儿链（[G6-R2-视角9-02]）、DialogHeader toolbar role（[G6-视角9-05]）、combobox icon-only 无名（[G6-R2-视角9-01]）均维持已报不重复；breadcrumb/pagination 的 `aria-current="page"`、carousel 的 `role="region"+aria-roledescription`、alert/FieldError 的 `role="alert"`、Label 的 htmlFor 透传、Base UI 五族（tabs/accordion/select/switch/tooltip）内建关联链逐个核对通过。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **Select 滚动箭头缺 `absolute` 类**（select.tsx:153-154/171-172）: 经 node_modules 核实 Base UI `SelectScrollArrow.js` defaultProps 自带 `style={ position: 'absolute' }` 内联定位，且 `shouldRender = visible || keepMounted` 条件挂载（不可滚动/触摸时不渲染）——缺类无实际影响，误报排除。
- **`--drawer-direction` 悬空**（drawer.tsx:172 落值、全仓零消费）: 与 [G6-R3-视角6-01]（`--drawer-resize-size`）同属"组件落 CSS 变量无消费方"，但该变量不承载任何已呈现的交互供龄（resize 把手呈现了拖拽供龄故 HIGH），纯死代码无用户可见后果——低于发现门槛，登记供清理批次顺带删除。
- **AlertDialog 无 max-h、无 body 滚动原语**: 与上游 shadcn alert-dialog 逐字一致，且确认弹窗惯例即短文本（title/description/media/footer），Dialog 家族"max-h + body 滚动"契约（[G6-R2-视角6-01] 修复面）不必然外推；低于门槛。
- **`--sidebar-width`/`--sidebar-width-icon`**: sidebar-layout.tsx 桌面分支只消费不定义，但 `SidebarProvider`（sidebar-context.tsx:104-110）在 wrapper 上内联落值（16rem/3rem），移动端 Sheet 路径另有 `SIDEBAR_WIDTH_MOBILE` 覆盖——消费链完整，非悬空。
- **`--table-*` 全族**（table.css:2-68 消费 14 个变量 + table-row-class-name.ts 4 个）: theme-tokens/styles.css:70-93 全量定义（含本轮补核的 `--table-hover-bg-gradient`/`--table-selected-bg-strong`），非悬空。
- **`--chart-1..5`**（theme-tokens:33-37/152-156 明暗两套）、**`--dialog-*` 九项与 `--surface-overlay`**（R3 已核对，本轮抽查维持）、**`--gap`**（toggle-group set+consume，`spacing=0` 默认在位）、**`--skeleton-width`**（sidebar-menu set+consume）、**`--ratio`**（aspect-ratio set+consume）、**sonner `--normal-bg/text/border`**（sonner 内部消费；默认 light 主题维持 R1 C2 记录）: 均非悬空。
- **ComboboxChipsInput `outline-none`**（combobox.tsx:244）: 焦点指示由父级 ComboboxChips `focus-within:ring-3`（:201）承担，链路正确——与本条 CommandInput 的差异正是"父级 ring 选择器是否真的挂上"。
- **AlertDialogAction 点击不关弹窗**（R1 [G6-视角6-01]）: 复核确认仍未修复，归并不重复。
- **Sheet 无 SheetBody / bottom 无 max-h、ComboboxList/CommandList no-scrollbar、sidebar 移动 `[&>button]:hidden`、item.tsx `role="list"`、breadcrumb Page `role="link"`**: 维持 R3 已核对不立案结论，本轮复读无新证据推翻。
- **视角 1/2/5/12 复核**: lucide 图标引用（X/Chevron/Check/Minus/Search/MoreHorizontal/PanelLeft/Loader2/ChevronsLeft·Right）语义全部正确，无文本字符图标新增；按钮语义组（确认/取消/关闭 X ghost icon-sm）无分裂；Spinner/Empty/Skeleton/CommandEmpty/ComboboxEmpty 原语齐备；原语层无"AI-safe 默认堆叠"类缺陷。零新发现。

## 检查范围

- **目标**: `packages/ui/src/components/ui/` 62/62 非 test 模块（`*.test.*` 不入审），与 R1-R3 同口径，无未扫模块。
- **逐文件全文精读**（40 个）: field、alert-dialog、command、select、input-group、dropdown-menu、menubar、sidebar-layout、table、sheet、combobox、carousel、calendar、navigation-menu、accordion、resizable、progress、slider、popover、scroll-area、tabs、avatar、alert、pagination、sonner、button-group、input-otp、chart、json-viewer、item、card、badge、checkbox、radio-group、breadcrumb、empty、kbd、label、separator、switch、toggle、aspect-ratio、textarea、spinner、skeleton、sidebar-menu、dialog、drawer、context-menu、wrap-surface-tab-focus、direction。
- **定向复核**（沿 R1-R3 深查记录 + grep 归档）: native-select、input、collapsible、sidebar、sidebar-context、use-dialog-drag、toggle-group、menubar 余段、drawer resize 链。
- **消费链交叉核实**: cmdk 0.x dist（Input 元素与 aria 链）、`@base-ui/react@1.3.0` SelectScrollArrow.js（滚动箭头内联定位与条件挂载）、theme-tokens/styles.css（`--table-*`/`--chart-*` 全量）、packages/ui/src/styles/{base,index,mobile}.css、`--sidebar-width`/`--drawer-direction` 全仓反查。

## 检查方法

- **滚动契约盲区**: 弹层族逐个检查 popup/content/body 三层的 `max-h`/`overflow-y-auto`/`flex-1 min-h-0` 组合——Select/Dropdown/ContextMenu/Menubar 走 `max-h-(--available-height)`、Command/Combobox 走列表内滚、Table 走容器 `overflow-x-auto`、Dialog 为家族基线、DrawerBody/Sheet 维持已报与不立案结论。
- **悬空 CSS 变量盲区**: 双向扫描——① 消费方向（`var(--x)` 逐个反查定义于 theme-tokens / Base UI 内联 / SidebarProvider 内联 / 组件自身 style）；② 生产方向（组件内联 `['--x']` 逐个全仓查消费方），命中 2 处死变量并按用户可见性分档处置。
- **aria 关联链盲区**: `aria-(describedby|labelledby|controls|activedescendant|current|pressed|invalid)` + `useId` 全量 grep 后逐链核对起点与终点（如 Dialog descriptionId→无 referenced 即 R2 已报；cmdk inputId→listId 经 dist 源码核实闭合）。
- **静态口径声明**: 本轮为源码静态审查（无浏览器运行时验证）；[G6-R4-视角3-01] 的"ring 不触发"结论基于 Tailwind v4 `has-[...]` 任意变体语义 + 两文件类串交叉推理，`outline-hidden` 的透明 outline 行为沿 R2 [G6-R2-视角3-02] 已核实口径；建议复核阶段以 Playwright 键盘聚焦断言确认。

## 结论

新发现 **1 条**（HIGH 0 / MEDIUM 1 / LOW 0）。R1+R2+R3+R4 累计 **225 条**。G6 收敛趋势: 16 → 6 → 1 → 1；三大指定盲区（滚动契约/悬空 CSS 变量/aria 关联链）已完成闭合扫描，除上述 1 条外无残余高价值候选。

## G7 — playground 19 页（HIGH 0 / MEDIUM 3 / LOW 2，共 5 条）

### [G7-R4-视角11-01] settings「列表」分区四个列表计数与任务库及同页「数据」分区自相矛盾：6/3/4/2（合计 15）对 10 条任务库与"10 条任务"声明

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-settings.json:1160-1259`（列表分区 4 行计数，:1180/:1205/:1230/:1255）；对照 `:1445`（同页「数据」分区"10 条任务 / 4 个列表"）；`apps/playground/src/complex-pages/shared/showcase-env.ts:556-568`（`Sundial__lists` 返回 6/3/4/2）；`apps/playground/src/complex-pages/shared/mock-backend-sundial.ts:33-46`（任务库实际分布：工作 5、家庭 2、购物 1、收件箱 3）
- **证据片段**:
  ```json
  // sundial-settings.json:1174-1182 —— 列表分区第 1 行，count 直读 Sundial__lists
  { "type": "text", "text": "${lists?.items?.[0]?.name ?? '工作'}", ... },
  { "type": "text", "text": "${lists?.items?.[0]?.count ?? 0} 条",
    "className": "text-xs text-[#636363] sd-mono" }
  ```
  ```ts
  // showcase-env.ts:560-565 —— 四个计数为写死常量，且四项之和为 15
  { name: '工作', color: 'blue', count: 6 },
  { name: '家庭', color: 'orange', count: 3 },
  { name: '购物', color: 'green', count: 4 },
  { name: '收件箱', color: 'neutral', count: 2 },
  ```
- **严重程度**: MEDIUM
- **现状**: settings 页「列表」分区的四行计数直读 `Sundial__lists` 的写死常量 6/3/4/2；而任务库 `createSundialTasks` 按 `list` 字段实际统计为 工作 5（t1/t2/t6/t7/t8）、家庭 2（t3/t10）、购物 1（t8）、收件箱 3（t4/t5/t9）——四个数字全部对不上，且 6+3+4+2=15 超过任务库总数 10，与**同一页面**「数据」分区的"10 条任务 / 4 个列表"（:1445，经 R3 核实与任务库一致）直接互斥。第 3 轮 [G7-R3-视角11-01]（workbench 侧边栏/压力卡/分区 count 与任务库互斥）已立"静态数据集间互斥"根因，但其核查与修复建议明确只覆盖 workbench 静态文本 + `Sundial__summary`/`Sundial__pressure` 两个 endpoint，settings 页对 `Sundial__lists` 的消费从未进入核查面（R3 仅核对 :1445 一行）；本条为该根因在不同 endpoint、不同页面的兄弟实例，修复面独立。
- **行业惯例**: 同屏计数必须同源（TodoMVC/TickTick 侧栏计数=列表过滤结果数；Ant Design Pro 概览与明细同源）；同一设置页内两处任务总量声明（15 vs 10）互相矛盾在所有参照系统中都按完成度缺陷处理。
- **用户影响**: 用户在"列表"分区看到"工作 6 条"，切到 workbench 数出的工作列表任务不足 6 条；再把页面滚到"数据"分区看到"10 条任务"，四行计数加起来却是 15——同一设置页两套答案，用户无法判断哪个可信，对演示数据的信任被破坏。通过真实用户影响检验。
- **建议**: `Sundial__lists`（showcase-env.ts:556-568）改为由 `db.sundialTasks` 实时聚合：`filterSundialTasks(tasks, 'all')` 后按 `list` 字段 `reduce` 计数（工作 5/家庭 2/购物 1/收件箱 3），与 [G7-R3-视角11-01] 对 `Sundial__pressure`/`Sundial__summary` 的"由任务库实时聚合"修复同批落地；settings 四行计数表达式无需改动。
- **复核状态**: 未复核

---

### [G7-R4-视角6-01] workbench 任务详情「移到列表」选择器预选值硬编码 "work"：任意任务打开后直接点确认即被静默移入工作列表（ajax 持久化）

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:2084-2170`（openDialog `args.data` 硬编码 `list: "work"` 于 :2097-2100；表单预选 :2129-2132；确认钮 :2157-2165；`onSubmitSuccess` 持久化 :2101-2123）；对照同对话框「列表」字段行 `:2009`（显示 `taskDetailListLabel ?? '工作'`）
- **证据片段**:
  ```json
  // sundial-workbench.json:2091-2100 —— 打开"移到列表"对话框时种子数据把 list 写死为 work
  "onClick": { "action": "openDialog",
    "args": { "title": "移到列表", "testid": "sundial-taskdetail-move-picker",
      "data": { "taskId": "${activeTaskId}", "list": "work" }, ...
  ```
  ```json
  // :2127-2143 —— 表单 radio 以该种子值预选；onSubmitSuccess 将选择 ajax 写库
  "data": { "taskId": "${taskId}", "list": "${list ?? \"work\"}" },
  "body": [{ "type": "radio-group", "name": "list",
    "options": [ { "label": "工作", "value": "work" }, { "label": "家庭", "value": "family" }, { "label": "收件箱", "value": "inbox" } ] }]
  // :2101-2112 —— 确认后无条件调用 Sundial__updateTodoItem 持久化
  { "action": "ajax", "args": { "url": "/r/Sundial__updateTodoItem", "method": "post",
    "data": { "id": "${$formData.taskId}", "list": "${$formData.list}" } } }
  ```
- **严重程度**: MEDIUM
- **现状**: 「移到列表」对话框的初始选中项经 `openDialog args.data` 硬编码为 `list: "work"`（经 `flux-runtime/src/action-adapter.ts:245-250` 证实 args.data 会种子化 surface scope，表单 `${list ?? "work"}` 因此恒取 "work"）——无论所选任务当前属于哪个列表，弹层永远预选"工作"。查看型打开（用户只想看/顺手确认）后点"确认"，`onSubmitSuccess` 立即把该任务以 `list: "work"` 持久化到 mock 任务库：家庭/收件箱任务被静默改挂到工作列表，且 toast 反馈"已移到列表"使误操作显得成功。同对话框内「列表」字段行（:2009）显示的是另一状态源 `taskDetailListLabel ?? '工作'`——用户经字段行把列表改为"家庭"后，footer 的移到列表弹层仍预选"工作"，确认即把字段行刚显示的"家庭"覆写回工作，同一对话框两个状态源互相打架。第 3 轮 [G7-R3-视角6-01]（同对话框日期选择器预选"今天" vs 徽标"8/18"）已立"选择器预选值与当前值脱节"根因，但其对象仅 `taskDetailDate` 一处，且后果为本地显示态；本条是同一根因在移到列表选择器上的新实例，并升级为**持久化写入**（R3 条目的修复不覆盖本处）。
- **行业惯例**: 受控选择器的预选值必须等于当前生效值（shadcn Select/Radix 惯例：打开即高亮当前项）；"查看型确认不改写数据"是对话框确认钮的默认契约（Ant Design Modal 确认仅提交用户显式修改）。
- **用户影响**: 用户点开家庭任务"预约牙医检查"的详情，随手打开"移到列表"又点"确认"退出——任务在无任何意图的情况下被移入工作列表，且 mock 库已持久化、toast 还报告成功；在 workbench 与 settings 的列表分布上产生用户无法解释的数据漂移。通过真实用户影响检验（需一次确认点击，非纯误触，故不判 HIGH）。
- **建议**: `:2097-2100` 的 `args.data.list` 改为随任务派生的当前列表（如 `${activeTaskList ?? 'work'}`，打开行时与 `activeTaskId` 一并 setValue；或将 :2009 字段行所用的 `taskDetailListLabel` 反查为枚举值传入），使预选值与任务当前列表一致；同时在 `onSubmitSuccess` 中加最小变更守卫（选择值等于当前值时不调用 ajax）。修复 [G7-R3-视角6-01] 时应将本 picker 纳入同一"预选值同源"批次。
- **复核状态**: 未复核

---

### [G7-R4-视角3-01] 四张表单页「已保存 ✓/已提交 ✓」状态旗标为一次性置位：保存后继续编辑，状态行仍宣告"已保存"

- **文件**: `apps/playground/src/complex-pages/page-schemas/complex-form.json:25-30,140-145`；`combo-editor.json:15-20,60-65`；`business-document.json:19-24,113-118`；`form-wizard.json:141-156,158-163`（四页同构：`then: setValue X Saved true` + `${X Saved ? "已保存 ✓" : "未保存"}`）
- **证据片段**:
  ```json
  // complex-form.json:25-30 —— 提交成功后唯一一次置位，全文件无任何复位路径
  "submitAction": { "action": "ajax", ...,
    "then": [{ "action": "setValue", "args": { "path": "formSaved", "value": true } }] },
  // complex-form.json:141-145 —— 状态行只读该旗标，不感知表单 dirty
  { "type": "text", "testid": "complex-form-report",
    "text": "保存状态：${formSaved ? \"已保存 ✓\" : \"未保存\"}", ... }
  ```
- **严重程度**: MEDIUM
- **现状**: 四页的"保存/提交状态"行由一次性布尔旗标驱动：提交成功 `setValue true` 后永久为真，此后用户修改任何字段（姓名、联系人、明细行、向导步骤回退重填），状态行仍显示"已保存 ✓/已提交 ✓"——声明与表单实际状态脱节。全仓 grep 证实 `formSaved/contactsSaved/orderSaved/wizardSubmitted` 均无任何复位为 false 的路径。与 [G7-视角11-12]（settings 同步状态卡静态文案不随 mode 切换）同属"状态指示与实际状态脱节"家族，但机制不同：11-12 是文案从未绑定状态，本条是旗标单向置位、缺 dirty 感知，且横跨 4 个页面（企业表单主路径），修复面独立。
- **行业惯例**: 未保存变更指示必须跟踪 dirty 态（GitHub/Notion/Google Docs 的"未保存更改"随编辑即刻翻转；Ant Design Form 的 `isFieldsTouched` 即此用途）；保存指示只反映"当前值已持久化"，不反映"曾经保存过"。
- **用户影响**: 用户保存成功后继续调整字段（如改错一个数字再改回），看到"已保存 ✓"便认为安全而离开页面——实际后端仍是旧值；演示页虽无真实丢失，但该状态行教授的交互模型是错的，四页重复出现强化了错误认知。通过真实用户影响检验。
- **建议**: schema 侧最小修复：为各表单关键字段挂 `onChange`（或利用 form 级 `valuesPath` 表达式）在用户再次输入时 `setValue X Saved false`；中期随 P 系列 dirty 原语落地后改为 `${form.dirty ? "未保存" : (X Saved ? "已保存 ✓" : "未保存")}`；过渡期也可将文案改为一次性结果语义（"已提交（结果见上方 toast）"）避免持续声明。
- **复核状态**: 未复核

---

### [G7-R4-视角10-01] 「选择列表」选项集跨页不一致：todo-dialog 页含"购物"共 4 项，workbench/detail 页均只有 3 项（购物不可选）

- **文件**: `sundial-todo-dialog.json:234-251`（收件箱/工作/家庭/购物 4 项）；对照 `sundial-workbench.json:2042-2046`（任务详情「列表」字段行 picker）与 `:2139-2143`（「移到列表」picker）、`sundial-detail.json:480-493,862-875,1144-1157`（三处列表 picker 均无购物）；`sundial-settings.json:1210-1234`（列表管理含"购物"行）；`mock-backend-sundial.ts:42`（任务库 t8 `list: 'shopping'`）
- **证据片段**:
  ```json
  // sundial-todo-dialog.json:234-251 —— 同名"选择列表"对话框，4 个选项
  "options": [
    { "label": "收件箱", "value": "inbox" }, { "label": "工作", "value": "work" },
    { "label": "家庭", "value": "family" }, { "label": "购物", "value": "shopping" } ]
  // sundial-workbench.json:2139-2143 —— 同标题对话框（移到列表），仅 3 个选项
  "options": [
    { "label": "工作", "value": "work" }, { "label": "家庭", "value": "family" },
    { "label": "收件箱", "value": "inbox" } ]
  ```
- **严重程度**: LOW
- **现状**: 同一产品内四处名为"选择列表"的对话框提供两套选项清单：todo-dialog 页 4 项（含购物），workbench 任务详情两处与 detail 页三处均 3 项（无购物）。而购物列表在产品语境中真实存在：settings「列表」分区有"购物"行（带计数与色点）、任务库 t8"采购办公耗材"即属 shopping。全量 grep 证实 workbench/detail 两张 schema 中 `shopping/购物` 零命中。用户在 workbench/detail 无法把任何任务归入购物列表；从 todo-dialog 页学到"有 4 个列表"的用户到 workbench 发现少了一个，同一语义弹窗两套清单。
- **行业惯例**: 同一实体选择器在产品内选项集唯一（Ant Design Cascader/Select 同字典多处消费；TickTick 各入口的清单选择器同一清单源）。与 [G7-视角1-16]（垃圾箱/垃圾桶术语混用）同属 sundial 族跨页一致性缺口，但根因不同（术语命名 vs 选项清单）。
- **用户影响**: 用户想把"采购办公耗材"类任务归入购物列表：在 workbench/detail 的选择器里找不到该选项，只能去 settings 确认它确实存在——入口能力与产品声明不符；跨页切换时选项集缩水造成"哪个才是全部列表"的困惑。影响限于演示复刻路径，评 LOW。
- **建议**: 以 todo-dialog 页的 4 项清单为准，为 `sundial-workbench.json:2042-2046`、`:2139-2143` 与 `sundial-detail.json` 三处 picker 补 `{ "label": "购物", "value": "shopping" }`；或将四处选项改为直读 `Sundial__lists`（`options: "${lists?.items?.map(i => ({ label: i.name, value: <枚举映射> }))}"` 模式），与 settings 列表管理单一同源。
- **复核状态**: 未复核

---

### [G7-R4-视角2-01] workbench 页面唯一主操作「添加待办」渲染为 ghost 透明文本钮：与 todo-dialog 页同入口的 brand 填充钮及企业页"新增"形成主操作权重倒挂

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:808-821`（`variant: "ghost"` + `sd-btn sd-btn-ghost`）；对照 `sundial-todo-dialog.json:20-33`（同一"新建待办"对话框的页内入口：`variant: "ghost"` 但 className `sd-btn sd-btn-default` → brand 填充）；`apps/playground/src/sundial-replica/sundial-replica.css:133-146`（`sd-btn-ghost` 透明底 / `sd-btn-default` 品牌橙实底）
- **证据片段**:
  ```json
  // sundial-workbench.json:809-821 —— 页头唯一 CTA，ghost 文本样式
  { "type": "button", "label": "添加待办", "variant": "ghost",
    "className": "sd-btn sd-btn-ghost",
    "testid": "sundial-add-todo",
    "onClick": { "action": "setValue", "args": { "path": "todoDialogOpen", "value": true } } }
  // sundial-todo-dialog.json:21-25 —— 同一对话框的另一入口，品牌橙实底
  { "type": "button", "label": "打开新建待办对话框", "variant": "ghost",
    "className": "sd-btn sd-btn-default self-start mt-2", ... }
  ```
- **严重程度**: LOW
- **现状**: workbench 页头的「添加待办」是该页唯一的新建入口（第一主操作），却采用 ghost 透明文本样式（CSS 证实 `sd-btn-ghost` 仅 `background: transparent` + 常规文字色，hover 才有浅底）；而打开同一"新建待办"对话框的 todo-dialog 页入口用 `sd-btn-default` 渲染为品牌橙实底白字。同一动作两个入口视觉权重一弱一强；且同一 workbench 页内，对话框里的"添加"确认钮也是实底（:1718），页头主 CTA 反而是全页最弱的按钮形态。与 [G7-视角2-01]（企业页 8 处 `variant:"primary"` 非法导致主按钮无背景）同属"主操作视觉权重缺失"家族，但机制不同：此处 variant 合法（ghost）+ 复刻类成对出现，属样式选型问题而非变体失效，企业页修复不覆盖本处。
- **行业惯例**: Todoist/TickTick/Things 的新建任务入口均为品牌色实底或强对比按钮；shadcn dashboard 模板的主操作用 `default` 变体；Ant Design Pro 页头"新建"一律 `type="primary"`。同产品内同一动作的入口样式应一致。
- **用户影响**: 首次进入 workbench 的用户扫描页头（标题 + 日期 + 一个透明文字钮），"添加待办"易被当成次级链接略过，主路径入口发现率降低；从 todo-dialog 页（橙色实底入口）切来的用户会遇到同一动作两种权重。影响为发现成本而非阻断，评 LOW。
- **建议**: `:811` 的 variant 改 `"default"` 并将 className 改 `sd-btn sd-btn-default`（与 todo-dialog 页入口及对话框确认钮对齐，品牌橙实底）；若复刻基准确为弱化样式，则反向将 `sundial-todo-dialog.json:24` 的 className 统一为 `sd-btn-ghost`，二选一消除同动作双形态。
- **复核状态**: 未复核

---

## 去重自检（与 R1+R2+R3 全部 224 条按根因比对）

- **[G7-R4-视角11-01] ← [G7-R3-视角11-01]**（workbench 计数互斥）：同根因（静态数据集与任务库互斥）的新实例。R3 的核查面与修复建议明确限定于 workbench 静态文本 + `Sundial__summary`/`Sundial__pressure`；`Sundial__lists` endpoint 与 settings 列表分区四行从未进入核查面（R3 仅核对 settings `:1445`）。R3 修复不覆盖本处，按 dedup §1 上报并互相引用。
- **[G7-R4-视角6-01] ← [G7-R3-视角6-01]**（同对话框日期选择器预选值脱节）：同根因（选择器预选值与当前值脱节）的新实例。R3 对象仅 `taskDetailDate`、后果为本地显示态；本条对象为移到列表 picker（openDialog args.data 硬编码，机制不同），且后果升级为 ajax 持久化写入。R3 建议引用的对齐参照是 todo-dialog 页，不含本处。
- **[G7-R4-视角3-01] ← [G7-视角11-12]**（settings 同步状态卡静态）：同家族（状态指示与实际状态脱节）但机制不同（单向旗标缺 dirty 复位 vs 文案从未绑定状态），页面与修复面不同，上报并注明关系。
- **[G7-R4-视角2-01] ← [G7-视角2-01]**（primary 非法变体致主按钮裸文字）：同家族（主操作视觉权重缺失）但机制不同（合法 ghost 选型 + 复刻类 vs 变体失效），且新增跨页同动作双形态证据，上报并注明关系。
- **[G7-R4-视角10-01]**：R1/R2/R3 无选项清单类条目（[G7-视角1-16] 为术语命名、[G7-视角10-09] 为按钮文案与单双钮结构），零根因重合。
- **分页/排序/筛选专项复核**（本轮重点，未立项者记录于防复核节）：R3 已立条目之外零新实例——各 crud 页 `pagination` 均走 renderer 默认（renderer 层三套分页 UI 已由 [G3-视角10-01] 覆盖）；`sortable` 每表取舍沿 R3 弃报先例；keyword/min-max 无 clearable 沿 R3"文本可键入清空"弃报先例；筛选参数空值传参经 `asNumber`/空串分支核实有兜底，无隐性失效。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

无。本轮未撞见 G-A~G-M 已登记 16 项能力缺口的新表象；[G7-R4-视角3-01] 的彻底修复依赖 dirty 态感知，接近 G-F（hover/选中态 schema 表达）相邻的原语缺位，但其"一次性旗标误导"部分为 schema 可修（onChange 复位），故保留为发现。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **analytics 静态文案与 outputStructure 陈旧值**：图表钻取文案"今天 5 件占 36%"（sundial-analytics.json:723）与压力图例直读的 `Sundial__pressure` 3/5/4/2 同源；`Sundial__outputStructure.flaggedDone=1`（showcase-env.ts:551）按任务库实算应为 0（flagged 且 done 的任务不存在）；`Sundial__summary.completionRate='68%'`（:488）按任务库实算约 20-22%——三者均为 [G7-R3-视角11-01] 已立根因（陈旧 endpoint 常量未由任务库派生）的伴随字段/同 endpoint 表现，修复该条时应将 `Sundial__outputStructure`、`Sundial__summary.completionRate/encouragement` 与 analytics :723 静态文案一并纳入聚合改造，不另立条目。
- **workbench「待整理」分区行"把会议纪要归档到项目文件夹"写入 `activeTaskId=10`，而任务库 t10 为"和家人看展览"**（sundial-workbench.json:1441-1456）；「今天」分区 t5 行副标题"2 个子任务"而任务库 t5 `subtasks: 0`（:1170-1178）——均为"静态分区行未由任务库派生"家族（[G7-R3-视角11-01] 根因）的表现；因任务详情对话框当前为静态（[G7-视角11-05]），activeTaskId 错位暂不可见，修复 [G7-视角11-05] 时必须同步校正该映射，登记于此防遗漏。
- **dashboard KPI「累计收入」raw 数值无千分位/货币格式**（dashboard.json:295）：格式化细节，与其他 KPI 一致为裸数值插值，未达真实用户影响门槛。
- **approval-tasks queryForm 缺 `labelWidth: 80`**（standard-crud/advanced-query 均有）：horizontal 布局 label 宽度由渲染器默认兜底，两页并排对比不可复现（不同页面不同表单），低于门槛。
- **detail-subtables 订单明细表无 subtotal 列、地址表无 isDefaultLabel 列**（master-detail 同数据源均有）：每表列取舍，非同屏不一致，沿 R3 sortable 弃报同款先例。
- **form-wizard 确认步"预算：0 万"**（未填时 `?? 0` 而非 "-"）：默认值语义可接受，未达门槛。
- **business-document `rowKey:"name"` 重名冲突**：沿 R3 防复核口径，留待运行时复核阶段，不重复立案。
- **workbench 移到垃圾桶（:2173-2201）/ detail 移到垃圾箱（:905-937）无确认**：[G7-视角10-07] 已立，本轮复核维持原判；detail trash 按钮 destructive vs workbench ghost 的跨页分裂为 [G7-R2-视角10-01] 已立。
- **workbench 侧边栏"列表 4"计数**：与"4 个列表"声明及列表管理行数一致（列表数 ≠ 任务数），非缺陷。

## 本轮检查范围与方法

- **范围**: `apps/playground/src/complex-pages/page-schemas/` 全部 19 张 schema 全量通读（含 sundial-workbench 2210 行、sundial-settings 1643 行、sundial-detail 1320 行逐段读取；sundial 5 页按视角 11/12 验收复读），无未扫页。
- **重点盲区对照**（派发指令指定）: ① 分页/排序/筛选 schema 一致性——全部 crud 页 `loadAction`/`source`/`loadAllData`/`pagination`/`sortable`/`queryForm`（clearable/placeholder/labelWidth）/`selection` 消费链逐一核对，并与 R3 已立/已弃报清单比对；② 计数与徽标数据活性——sundial 族全部计数来源（静态文本 vs endpoint）逐 endpoint 对照任务库实算，4 张表单页状态旗标置位/复位链路全量 grep。
- **方法**: 逐页通读 + 渲染/运行时源码交叉核实：`shared/showcase-env.ts`（`Sundial__lists`/`Sundial__summary`/`Sundial__pressure`/`Sundial__outputStructure`/`User__findPage` 过滤兜底）、`shared/mock-backend-sundial.ts`（`createSundialTasks` 全 10 条的 list/dueTone/done/subtasks 逐条实算）、`packages/flux-runtime/src/action-adapter.ts:245-250`（openDialog `args.data` → `createSurfaceScope` 种子化链路，用于视角6-01 结论支撑）、`apps/playground/src/sundial-replica/sundial-replica.css:120-167`（sd-btn-ghost/default/danger 视觉定义）。
- **静态口径声明**: 本轮为 schema 静态审查（无浏览器运行时验证）；全部 5 条发现的渲染形态与数据链均经上述源码核实，无高置信推断残留。共新发现 **5 条**（HIGH 0 / MEDIUM 3 / LOW 2）；累积（R1+R2+R3+R4）: **229 条**。

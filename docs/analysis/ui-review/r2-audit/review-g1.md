# R2 全量 UI 一致性审查 — G1 组独立复核报告（review-g1）

- 复核人: 独立复核子 agent（G1 组，与发现 agent 非 session；本任务为速率限制失败后的重试，前次未产生任何文件）
- 复核日期: 2026-08-29
- 复核基线: `git rev-parse HEAD` = `0f183874a25f942c234b9806b1546c6f37ee5a85`（与全部 6 轮发现落盘基线一致，代码无漂移）
- 复核对象: G1 组 31 条（HIGH 3 / MEDIUM 23 / LOW 5，来自 R1 15 / R2 6 / R3 2 / R4 5 / R5-g1 1 / R6-g1 2；严重度以各轮文件实际判级为准）
- 复核方法: 先按条目 Grep/Read 定位 live code 独立判断问题存在性与严重度（不看发现结论先行判定），再与发现条目对比输出判定；发现结论未作为事实来源。round-01/02/03/04 按 `\[G1-` 定位 G1 段全文精读，round-05-g1/round-06-g1 全文精读
- 判定三值: 保留 / 降级（附新严重度+理由）/ 驳回（附理由）

---

## ① 复核概要

| 判定 | 条数                                 | 说明                                   |
| ---- | ------------------------------------ | -------------------------------------- |
| 保留 | **31**（HIGH 3 / MEDIUM 23 / LOW 5） | 严重度分布与各轮原判完全一致，零升降级 |
| 降级 | 0                                    | —                                      |
| 驳回 | 0                                    | —                                      |

- **证据-结论逻辑链**: 31 条全部通过。每条的证据片段均在 live code 中逐行核实存在且支撑结论；无"证据不能支撑结论"的驳回项。
- **证据精度备注 2 处**（不改变判定与严重度，供修复阶段参考）:
  1. [G1-视角3-03]: 复核补充事实——`apps/playground` 全部演示 schema 中 `button-group` / `selectionMode` **零使用**。HIGH 维持（判级依据是该组件已发布的核心能力在配置后 100% 失去视觉反馈、构成用户交互障碍，而非演示页覆盖频次），但修复排期可据此与 [G1-视角2-01]（8 处演示 schema 在用）区分优先级。
  2. [G1-视角7-09]: 建议中 `hsl(var(--success))` 的包装格式需按 `@nop-chaos/tailwind-preset` 实际令牌格式核对（条目已自行注明）；缺陷本体（oklch 字面量 vs 全仓令牌路径）经 alert-renderer.tsx:16-21、timeline-renderer.tsx:23-30、badge.tsx:8-15 三个令牌化对照组核实成立。
- **HIGH 3 条**: 全部逐项复核通过（见 ④），维持 HIGH。
- **去重**: 8 个"新实例/引根"条目的引根均核实存在、修复面互不覆盖（见 ③）；无 dedup §1 已修复项复述、§2 已登记缺口表象混入、§3 误报模式（[G1-视角8-06] 8px 触点明确不在 icon-xs/icon-sm 豁免档内，豁免档为 24px+）、§4 边界违规。
- **scope-conflict**: 31 条中仅 [G1-视角8-14] 带标记，归属裁定见 ⑤。

---

## ② 逐条复核清单（31 行全覆盖）

判定列：✅=保留（严重度不变）。

### Round 01（15 条）

| #   | 条目                                                    | 文件:行号（复核定位）                                                                  | 原判   | 判定    | 复核理由（独立核实要点）                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [G1-视角2-01] variant:"primary" 渲染为透明裸文字        | button.tsx:65,252-277；basic-renderer-definitions.ts:228-243                           | HIGH   | ✅ 保留 | :65 仅 `as ButtonVariant` 断言无归一化；ui buttonVariants（button.tsx:10-21）无 `primary` 键，cva 未匹配只回基类（`border-transparent bg-clip-padding`，无 bg/text/hover）；schemas.ts variant union 无 primary；propContract union 六值核实无 primary；`"variant": "primary"` 在 playground 6 个 schema 共 8 处命中（standard-crud 3 处），styling-system.md:604/610 文档约定在案；主操作路径实害成立 |
| 2   | [G1-视角3-02] href 锚点 disabled/loading 不生效仍可导航 | button.tsx:211-227,252-263                                                             | HIGH   | ✅ 保留 | :212 `if (effectiveDisabled) return;` 无 preventDefault，锚点默认导航照常；`<a>`（:253-263）无 aria-disabled、无禁用类、href 未移除；loading 复现同理；对照 link.tsx:47-49,64-70 基线（preventDefault + href 置 undefined + aria-disabled + pointer-events-none opacity-60）逐项核实                                                                                                                   |
| 3   | [G1-视角3-03] button-group selectionMode 选中态无视觉   | button-group-renderer.tsx:110-135                                                      | HIGH   | ✅ 保留 | :127-129 仅落 data-selected/aria-pressed，variant/className 不随 selected 变化；全仓 grep `[data-selected]` 消费仅 sundial-replica.css/flow-designer/graph 无关方，ui button 基类无 data-selected 分支——像素级无差异成立；演示页零使用事实已补充（见 ①），HIGH 按核心能力交互障碍维持                                                                                                                  |
| 4   | [G1-视角5-04] image/markdown 加载态纯文本无 Spinner     | image.tsx:177-192；markdown.tsx:69-80                                                  | MEDIUM | ✅ 保留 | 两处 loading 分支均纯 `t('flux.common.loading')` 文本；对照 dynamic-renderer.tsx:264-267 Spinner+role="status" 基线成立                                                                                                                                                                                                                                                                                |
| 5   | [G1-视角5-05] dynamic/markdown 失败态无样式纯文本       | dynamic-renderer.tsx:226-238；markdown.tsx:83-97                                       | MEDIUM | ✅ 保留 | :226-236 `data-error=""` 无样式消费、i18n 文案与 error message 直接拼接；markdown :94 loadFailed 纯文本；对照 alert-renderer.tsx:16-21 destructive 语义基线成立                                                                                                                                                                                                                                        |
| 6   | [G1-视角8-06] carousel 指示点 8×8px                     | carousel.tsx:305-317                                                                   | MEDIUM | ✅ 保留 | :309-311 `h-2 w-2 p-0` 逐字核实；ui Button 基类无 min-width 兜底，实点区 8px；dedup §3 #4 豁免档为 icon-xs/icon-sm（24px+），8px 不在豁免范围，不构成误报                                                                                                                                                                                                                                              |
| 7   | [G1-视角1-07] diff 导航按钮用文本 ↑/↓                   | diff-view/components/diff-header.tsx:44-67                                             | MEDIUM | ✅ 保留 | :57/:65 裸文本 `↑`/`↓` 逐字核实；全仓同语义（上一步/下一步）均 ChevronLeft/RightIcon；跨平台字符渲染漂移+方向语义双重问题成立                                                                                                                                                                                                                                                                          |
| 8   | [G1-视角7-08] diff 三栏导航硬编码 bg-gray-50            | diff-three-column-view.tsx:97；diff-view.css:530-537                                   | MEDIUM | ✅ 保留 | :97 `bg-gray-50` 在案且无 dark: 对偶；:536 `background: var(--nop-diff-nav-bg)` 同类规则在案，utilities 覆盖组件层令牌；R5/R6 两轮终扫复跑均确认三包生产代码调色板类仅此一处，"唯一命中"表述准确                                                                                                                                                                                                       |
| 9   | [G1-视角7-09] progress 变体色 oklch 字面量              | content/styles.css:18-31                                                               | MEDIUM | ✅ 保留 | :20-31 三段 oklch 字面量逐行核实；同包 alert/timeline、ui badge 同名语义均令牌化，孤立自造状态色成立；宿主主题覆盖对 progress 无效的实害成立                                                                                                                                                                                                                                                           |
| 10  | [G1-视角4-10] maxLineToggle 文字塞 20px icon-xs 钮      | text.tsx:163-174                                                                       | MEDIUM | ✅ 保留 | :166-167 `size="icon-xs"` 被 `h-5 w-5` 覆盖为 20px，内容为完整文字"展开/收起"；基类 whitespace-nowrap 无 overflow-hidden，溢出必然；同文件 TextCopyButton（:87-97）同尺寸放 12px 图标为正确用法，误用模式成立                                                                                                                                                                                          |
| 11  | [G1-视角10-11] wizard 提交中无 Spinner                  | wizard-renderer.tsx:582-600                                                            | MEDIUM | ✅ 保留 | :593-595 committing 分支仅文字切换+disabled；button.tsx:181-185 `<Spinner data-icon="inline-start" />` 为仓内 loading 统一模式；有文字指示故不达 HIGH（>2s 无指示）门槛，MEDIUM 恰当                                                                                                                                                                                                                   |
| 12  | [G1-视角9-12] scope-debug 硬编码英文                    | scope-debug.tsx:88-101                                                                 | LOW    | ✅ 保留 | :92 `'Scope Debug'`、:101 `'Expand to inspect scope.'` 逐字核实；同文件其余文案走 t()；属 ma5-ux [视角9-02] 已修复项的同类新实例（不同组件），dedup §1 允许上报                                                                                                                                                                                                                                        |
| 13  | [G1-视角10-13] 复制失败反馈不一致                       | json-view.tsx:54-71,88-94；text.tsx:68-79                                              | LOW    | ✅ 保留 | json-view :68-70 空 catch 静默、直接 navigator.clipboard 无降级；text :75-78 toast.error + copyToClipboard 工具；同语义双反馈规范成立                                                                                                                                                                                                                                                                  |
| 14  | [G1-视角8-14] page 拖拽把手无键盘路径 [scope-conflict]  | page.tsx:152-167                                                                       | LOW    | ✅ 保留 | :152-167 仅 Pointer 事件，无 tabIndex/onKeyDown/focus 态，逐项核实；LOW 恰当（次要布局微调，不阻断内容访问）；归属裁定见 ⑤                                                                                                                                                                                                                                                                             |
| 15  | [G1-视角10-15] info 语义色 3:1 分裂                     | timeline-renderer.tsx:23-30；alert-renderer.tsx:16-21；status.tsx:8-21；badge.tsx:8-15 | LOW    | ✅ 保留 | timeline `info: 'bg-info'` vs alert `bg-muted/40` 中性、status info→secondary、badge 非 success/warning/danger 全落 secondary，3:1 核实；basic-renderer-contracts.ts:195 "Maps to bg-{level} tokens" 与实现不符在案                                                                                                                                                                                    |

### Round 02（6 条）

| #   | 条目                                                         | 文件:行号（复核定位）                                                                | 原判   | 判定    | 复核理由（独立核实要点）                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | [G1-R2-视角2-01] href 锚点分支丢失按钮 chrome                | button.tsx:189-193,252-263                                                           | MEDIUM | ✅ 保留 | `<a>` 仅继承 commonProps.className = meta.className+block/min-h，不经过 buttonVariants——variant/size 全部静默失效、UA 默认链接样式成立；与 #2（交互层 disabled 失效）根因不同、修复不覆盖，双条并存正确                                        |
| 17  | [G1-R2-视角3-01] collapse disabled 无视觉+hover 照常         | collapse-renderer.tsx:206-233                                                        | MEDIUM | ✅ 保留 | :210 仅原生 disabled，className 无任何 disabled: 变体类、hover:bg-muted 无豁免；对照 steps-renderer.tsx:276 `opacity-50 cursor-not-allowed` 与 ui tabs trigger `disabled:pointer-events-none disabled:opacity-50` 两条内部基线成立             |
| 18  | [G1-R2-视角3-02] button active 仅落 data-active/aria-pressed | button.tsx:229-237；ui/button.tsx:7                                                  | MEDIUM | ✅ 保留 | :233-234 两属性落 DOM；ui 基类有 aria-expanded:/aria-invalid:/disabled: 分支、无 aria-pressed:/data-active:（全串逐行核对）；与 [G1-视角3-03] 同根因不同属性、修复互不覆盖，独立成条正确                                                       |
| 19  | [G1-R2-视角5-01] 媒体族失败态无 destructive 语义             | audio.tsx:47-49；video.tsx:57-59；image.tsx:203-209；qrcode.tsx:82-88                | MEDIUM | ✅ 保留 | 四处失败分支均为 `text-xs text-muted-foreground` 灰字、与空态同款仅换文案逐处核实；image 失败分支回退 `alt \|\| noData` 连 loadFailed 都不显示；引根 [G1-视角5-05] 存在且为不同组件族，dedup §1 允许                                           |
| 20  | [G1-R2-视角8-01] steps 水平连接线缺 relative 包含块          | steps-renderer.tsx:230-251；layout/styles.css:13-17                                  | MEDIUM | ✅ 保留 | li 水平分支 `'flex-1 flex-col items-center text-center'` 无 relative、`<ol>` 仅 `'nop-steps'`、styles.css 无 position 规则——absolute 连接线回退到任意已定位祖先，逐层核实；垂直分支 in-flow（`ml-[15px] w-px self-stretch`）不受影响，双轨成立 |
| 21  | [G1-R2-视角8-02] diff-view 窄容器降级不完整                  | diff-file-list.tsx:86；diff-view-renderer.tsx:152-159,528-534；diff-view.css:583-594 | MEDIUM | ✅ 保留 | 文件侧栏内联 `width: 240` 无断点适配；split 外层 `gridTemplateColumns: '1fr 1fr'` 为内联样式，<640px 媒体查询只改内层 display——堆叠结果两栏压进左半格成立；同包 cards/tabs 均有 useIsMobile 分支而 diff-view 零适配，孤立成立                  |

### Round 03（2 条）

| #   | 条目                                                     | 文件:行号（复核定位）                                          | 原判   | 判定    | 复核理由（独立核实要点）                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- | ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22  | [G1-R3-视角3-01] wizard 提交锁定 prev/步骤导航无禁用视觉 | wizard-renderer.tsx:278,315,572-579；wizard-step-nav.tsx:77-83 | MEDIUM | ✅ 保留 | prev `disabled={!canGoPrev}` 无 committing 条件、goPrev 静默 return（:315-316）、step-nav `clickable` 不含 committing（:77）逐项核实；同栏 next `disabled={lifecycle.committing}` 正确基线在案（:591），同动作条双状态语言成立；有锁但缺反馈，MEDIUM 恰当 |
| 23  | [G1-R3-视角8-01] tabs 移动滑动手势劫持嵌套横向滚动/滑块  | tabs.tsx:30-31,280-318,431-452                                 | MEDIUM | ✅ 保留 | 阈值 50px + 仅纵向主导取消（:287-292），touchstart 无目标记录/排除（:434-441），wrapper 裸包全部 panels 逐行核实；对照 carousel 走 embla 手势引擎，同仓双轨健壮性差异成立                                                                                 |

### Round 04（5 条）

| #   | 条目                                                  | 文件:行号（复核定位）                                                                    | 原判   | 判定    | 复核理由（独立核实要点）                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 24  | [G1-R4-视角8-01] timeline 水平轴零宽不可见            | timeline-renderer.tsx:283-307；layout/styles.css:24-35                                   | MEDIUM | ✅ 保留 | 水平轴 span `className="h-px self-center bg-border"` 处于 `flex-col items-center` 容器，宽度无来源（空内容收缩为 0）逐行推演核实；垂直轴 `absolute top-0 bottom-0 w-px` 正常，同槽位双轨成立；与 #20 机制不同（定位错容器 vs 宽度恒零），steps 修复不覆盖本处                                  |
| 25  | [G1-R4-视角5-01] json-view/markdown/html 空值渲染空白 | json-view.tsx:30-44；markdown.tsx:83-97；html.tsx:21-35；对照 cards-renderer.tsx:199-201 | MEDIUM | ✅ 保留 | 三处空值分支均 `hasEmpty ? emptyContent : null` 无兜底（render-nodes.tsx:238 fallback 能力在位而未用）；cards `fallback: t('flux.common.noData')` 基线 + image/qrcode/audio 兜底核实，包内 3:4 分裂成立；与 #19（有文案灰字 vs 完全空白）表象与修复点不同，不重复                              |
| 26  | [G1-R4-视角6-01] page 移动端 aside Sheet 无滚动契约   | page.tsx:260-266,146-148；ui/sheet.tsx:58-64                                             | MEDIUM | ✅ 保留 | SheetContent 基类 `flex flex-col` + `data-[side=*]:h-full` 无 overflow-y-auto（全串核对）；page.tsx:262 注入 `<aside className={cn(asideClassName)}>` 无滚动兜底；桌面 sticky 分支 :146-148 `maxHeight:100vh, overflowY:'auto'` 证明前提已知，移动端漏接成立；G6 Drawer 修复（不同组件）不覆盖 |
| 27  | [G1-R4-视角8-02] steps 热区仅 28px 圆形指示器         | steps-renderer.tsx:262-310；对照 wizard-step-nav.tsx:91-149                              | MEDIUM | ✅ 保留 | 指示器 `size-7`（28px）为唯一点击目标、标题/描述纯 span 无 onClick 无 cursor 逐行核实；wizard-step-nav 把 marker+标题整体包进 Button（:88-118）双轨基线在案；与 [G1-视角4-10]（内容溢出按钮）不同根因，首次报告成立                                                                            |
| 28  | [G1-R4-视角5-02] status/mapping miss 渲染空 span      | status.tsx:57-68；mapping.tsx:80-91,102-105                                              | LOW    | ✅ 保留 | status `!hit` 分支仅渲染 placeholder（未配置即空）；mapping miss `defaultLabel ?? placeholder ?? null` 双空即不渲染内部节点，逐行核实；有值不可见属数据展示缺陷，但依赖漏配/新增枚举触发，LOW 恰当                                                                                             |

### Round 05（1 条）

| #   | 条目                                     | 文件:行号（复核定位） | 原判   | 判定    | 复核理由（独立核实要点）                                                                                                                                                                                                                                   |
| --- | ---------------------------------------- | --------------------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 29  | [G1-R5-视角8-01] markdown 容器无溢出契约 | markdown.tsx:107-119  | MEDIUM | ✅ 保留 | :113 容器仅 `'nop-markdown'` 标记类 + remarkGfm 启用（:117）；全仓 grep `.nop-markdown` CSS 规则零命中（仅命中不同类 `.nop-markdown-editor` 的测试断言）；宽 GFM 表格/pre 溢出几何推演成立；GFM 表格/代码块为 markdown 核心用法，成功路径必现，MEDIUM 恰当 |

### Round 06（2 条）

| #   | 条目                                                        | 文件:行号（复核定位）                         | 原判   | 判定    | 复核理由（独立核实要点）                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------- | --------------------------------------------- | ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30  | [G1-R6-视角8-01] tabs 桌面端页签溢出无滚动契约              | tabs.tsx:320-329,258-268；ui/tabs.tsx:23,56   | MEDIUM | ✅ 保留 | 溢出类仅 `isMobile && orientation === 'horizontal'` 分支（:324-328）、scrollIntoView 仅移动端 effect（:258-268）核实；TabsList 基类 `inline-flex w-fit` + Trigger `whitespace-nowrap flex-1`（min-content 下限）逐行核实；同组件移动分支自证正确做法、桌面双轨成立                            |
| 31  | [G1-R6-视角8-02] closable alert 关闭钮未触发 pr-18 让位契约 | alert-renderer.tsx:104-116；ui/alert.tsx:7,65 | MEDIUM | ✅ 保留 | 自绘钮 `absolute top-1.5 right-1.5 size-6` 无 `data-slot="alert-action"`（:56-62），ui 基类 `has-data-[slot=alert-action]:pr-18` 契约在案未触发；AlertTitle/AlertDescription 无右让位类（ui/alert.tsx:35-53 核对），首行尾部与 24px 钮命中区叠压几何成立；误关实害（点击文本尾=关闭整条）成立 |

---

## ③ 去重记录

**无新增驳回/合并修正。** 8 个"新实例/引根"条目逐一核验如下（引根均真实存在、修复面互不覆盖）：

| 条目                                | 引根                                                               | 核验结论                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [G1-视角9-12]                       | ma5-ux [视角9-02]（已修复）                                        | 引根确认已修复（dedup §1 在案）；本条为 scope-debug 新组件实例，允许上报                                                                                        |
| [G1-R2-视角3-02]                    | [G1-视角3-03]                                                      | 引根存在；属性不同（`data-active`/`aria-pressed` vs `data-selected`），`data-[selected]:` 修复确实不覆盖本处，独立成条正确                                      |
| [G1-R2-视角5-01]                    | [G1-视角5-05]                                                      | 引根存在；组件族不同（dynamic/markdown vs audio/video/image/qrcode），修复互不覆盖                                                                              |
| [G1-R4-视角8-01]                    | [G1-R2-视角8-01]                                                   | 引根存在；机制不同（steps=定位错包含块、timeline=轴宽恒零），steps 补 relative 不改变 timeline 零宽事实                                                         |
| [G1-R4-视角5-01]                    | [G3-视角5-05] / [G5-R2-视角5-03]（跨包）+ 与 [G1-R2-视角5-01] 区分 | 引根属跨包条目（以 G3/G5 文件为准）；与 R2-5-01 的区分核实成立（空白无文案 vs 灰字有文案，修复点不同）                                                          |
| [G1-R4-视角6-01]                    | [G6-R2-视角6-01]（跨组）                                           | page-aside Sheet 经 sheet.tsx 基类 + page.tsx 注入路径双重核实确无兜底，是 G6 复核枚举（kanban-activity-log/select-mobile/sidebar 均自兜底）之外的第 4 个消费方 |
| [G1-R4-视角5-02]                    | [G4-视角5-02]（跨组，countdown 空壳族）                            | 本条机制在 status/mapping 独立核实成立；与 [G1-R4-视角5-01] 的机制区分（有值不可见 vs 无值无提示）成立，分立正确                                                |
| [G1-R6-视角8-01] / [G1-R6-视角8-02] | [G1-R5-视角8-01]/[G1-R4-视角6-01] 族 / [G1-视角4-10]               | 引根存在；tabs TabsList 溢出与 alert 让位均为新组件新机制，修复点与引根互不覆盖                                                                                 |

另核：[G1-视角2-01]（renderer 契约缺陷本体）与 [G7-视角2-01]（schema 使用面清单）的同根因合并预注属主 agent 汇总裁定范围，G1 侧条目独立成立；[G1-视角3-02]（disabled 交互失效）与 [G1-R2-视角2-01]（锚点 chrome 缺失）同组件不同层（交互层 vs 样式层），双条并存正确。

---

## ④ 高风险逐项复核详情（HIGH 3 条）

### [G1-视角2-01] `variant: "primary"` 渲染为透明裸文字 — 维持 HIGH

**复核过程**: ① 先独立读 `button.tsx:63-70`——`const variant = (props.props.variant ?? 'default') as ButtonVariant` 确为纯类型断言，无 `primary → default` 运行时归一化；② 读 `packages/ui/src/components/ui/button.tsx:6-41`——`buttonVariants` 的 variant 表仅 default/outline/secondary/ghost/destructive/link 六键，无 `primary`；基类串为 `rounded-lg border border-transparent bg-clip-padding ... transition-all`，不含任何背景色/前景色/hover 类。cva 对未在 variants 表中注册的键不加任何变体类（defaultVariants 仅在值为 undefined 时生效，`'primary'` 显式传入不会回退 default），该行为与条目"cvA 未匹配回退经 node 实测（cva 0.7.1）"的声明一致——渲染结果 = 仅基类的透明背景裸文字；③ 反查使用面——`rg '"variant":\s*"primary"' apps/playground/src` 命中 6 个复杂页 schema 共 8 处（standard-crud.json 3 处含"新增"主操作），`docs/architecture/styling-system.md:604/610` 明文规定主操作写 `"primary"`；④ 反查消费链是否中途拦截——`schemas.ts` variant union 与 `basic-renderer-definitions.ts:228-243` propContract union 均无 `primary`，且 propContracts 仅作 designer 编辑面元数据（renderer-authoring-contract.ts:81 `editableProps`），运行时无校验剥离，`'primary'` 原样到达 ui Button。**结论**: 证据-结论链完整，主 CRUD 路径"新增/保存"按钮透明化属主路径清晰度实害，HIGH 成立，维持。

### [G1-视角3-02] Button href 锚点分支 disabled/loading 不生效 — 维持 HIGH

**复核过程**: ① 独立读 `button.tsx:208-263`——`effectiveDisabled = disabled || loading || countDownActive`（:208）；`handleClick`（:211-227）首行 `if (effectiveDisabled) return;` 无 `event.preventDefault()`；锚点分支 `<a href={href} target={...} {...commonProps} onClick={...}>`（:253-263）——href 未按 disabled 置 undefined、无 aria-disabled、commonProps 无任何禁用视觉类。因此 disabled 时点击：action 被跳过但浏览器默认锚点导航照常执行，"禁用"完全无效且无视觉提示；loading 态同链路可重复导航；② 独立验证条目引用的正确基线——`flux-renderers-content/src/link.tsx`：`if (disabled) { event.preventDefault(); return; }`（:47-50）、`href={disabled ? undefined : href}`（:64）、`aria-disabled={disabled || undefined}` + `pointer-events-none opacity-60`（:65-70）逐项在案；③ 严重度校验——"作者显式禁用的控件仍执行其主行为（导航）"属功能缺陷（禁用语义静默失效、用户被误导跳转、可中断进行中流程），符合 HIGH 判级"功能缺陷/操作未被阻断"；修复路径明确（复用 link.tsx 模式）。**结论**: HIGH 成立，维持。

### [G1-视角3-03] button-group selectionMode 选中态无任何视觉 — 维持 HIGH

**复核过程**: ① 独立读 `button-group-renderer.tsx:100-137`——选中态仅 `data-selected={selected || undefined}`（:127）与 `aria-pressed`（:129）落 DOM；`variant`/`size` 来自 schema（:114,120-121）、className 未根据 `selected` 追加任何类（:117-133）——选中与未选中的渲染输入完全相同；② 独立执行全仓消费反查——`rg "data-selected"` 排除无关方后：`apps/playground/src/sundial-replica/sundial-replica.css`（sd-cal-day 专用）、`flow-designer-canvas.tsx`/`flow-node-types.tsx`/`designer-xyflow-node.tsx`（canvas 节点自发光）及 schema 静态属性，ui button 基类无 `data-selected:` 分支、`flux-renderers-layout/src/styles.css` 全文无 button-group 规则——"无任何样式消费方"结论独立复现；③ 数据层确有反馈（:75-87 setLocalSelected + onChange payload），故属"数据在变、视觉全盲"的交互反馈缺失；④ 严重度校验——selectionMode 是该渲染器 schema 明确暴露的核心能力（resolveSelectionMode :40-42），一旦配置，每次点选均无视觉结果，用户无法得知当前选中集合，符合 HIGH"用户交互障碍"判级。**补充事实（复核发现，不改变判定）**: playground 演示 schema 中 `button-group`/`selectionMode` 零使用，修复排期可将本条列于 [G1-视角2-01]（8 处演示在用）之后。**结论**: HIGH 成立，维持。

---

## ⑤ scope-conflict 归属裁定

| 条目                                          | 标记             | 裁定                                         | 理由                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------- | ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [G1-视角8-14] page 侧栏拖拽把手无键盘操作路径 | [scope-conflict] | **归 UX（视角 3/8 交互模式缺口），保留 LOW** | 主要影响 = 可交互控件（role="separator" 调宽把手）仅 Pointer 驱动、与 shadcn Resizable 把手（tabIndex + 方向键 + focus ring）的仓内基线形成交互模式双轨；WCAG 2.1.1 为次要面——把手仅承载"次要布局微调"，侧栏内容在默认宽度下完全可达，无内容访问阻断。按"主要影响归属"规则归 UX；维度 20 全量 WCAG 审计如后续覆盖同一控件，可按其更严口径重评而不与本条冲突 |

G1 组其余 30 条均无边界两可情形：视觉/交互/状态呈现条目归属视角 1-12 无争议；ARIA 相关仅 [G1-视角9-12]（实为 i18n 文案问题，视角 9 标号下的 UX 可见面），无全量 WCAG 混入；无维度 09-12（RendererComponentProps 契约/marker 视觉样式/原生 HTML 替代/field metadata 建模）越界条目。

---

## ⑥ 降级/驳回模式复盘

本轮 **降级 0 / 驳回 0**，无可复盘的误报模式。复核侧记录两条正面观察与一条判级口径备注：

1. **正面观察——"同类根因新实例"上报质量高**: G1 的 8 个引根条目全部核实引根真实存在且修复面互不覆盖，无一处把"已立条目的同组件复述"包装成新实例（对比最易混淆的三组均区分成立：#19 灰字有文案 vs #25 完全空白；#20 定位错容器 vs #24 宽度恒零；#3 data-selected vs #18 data-active/aria-pressed）。
2. **正面观察——防复核清单有效**: R1"明确核对过且不构成发现"清单（container/flex 可点 div、alert 关闭钮三维基线、qrcode/carousel 功能性默认值）与 R4/R5/R6 的弃报留档在本轮逐项比对中均未出现被复核推翻的情形；[G1-R6-视角8-02] 对 R1 alert 核对项的"几何让位维度未覆盖"补盲论证经核实成立（R1 仅核对 icon/size/aria-label 三维）。
3. **判级口径备注**: [G1-视角3-03] 维持 HIGH 的依据是"已发布核心能力配置即 100% 交互障碍"，而非演示页覆盖频次（仓内零使用）；主 agent 合并裁定修复优先级时建议将"仓内实际使用面"（本条 0 处 vs [G1-视角2-01] 8 处）作为 P0/P1 排序输入而非降级依据。

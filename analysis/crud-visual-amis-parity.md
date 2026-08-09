# CRUD 表格视觉效果对比分析：AMIS vs nop-chaos-flux

> 分析日期: 2026-08-09
> 目标：让 flux 模式渲染的 CRUD/Table/Dialog 在视觉上与 AMIS 基本一致（列宽、行高、边框、hover、固定列、对话框尺寸、间距）。
>
> 基线来源：
>
> - AMIS：`nop-chaos-next-master/apps/main/node_modules/amis/lib/themes/default.css`（cxd 主题，6.13.1）+ `amis/lib/renderers/Table`、`amis-core/lib/store/table.js`、`amis/lib/renderers/Dialog.js`
> - AMIS 主题桥：`apps/main/src/styles/amis-theme-bridge.css`（主应用把 AMIS `--colors-*` token 桥接到宿主 token，**因此"AMIS 侧视觉"= 桥接后的值，不是 cxd 原始值**）
> - flux：`nop-chaos-flux/packages/flux-renderers-data/src/`、`flux-react/src/dialog-host.tsx`、`ui/src/components/ui/{table,dialog,button}.tsx`、`theme-tokens/src/styles.css`

---

## 目录

1. [结论摘要](#1-结论摘要)
2. [为什么"看上去差别很大"：根因清单](#2-为什么看上去差别很大根因清单)
3. [表格元基线对照表（尺寸/字体/边框）](#3-表格元基线对照表)
4. [列宽与固定列（根因 R1/R2/R5）](#4-列宽与固定列)
5. [行 hover 与固定列（用户问题①）](#5-默认行为与固定列)
6. [对话框（用户问题②）](#6-对话框)
7. [间距与封皮（间距）](#7-间距)
8. [修复建议与优先级](#8-修复建议与优先级)
9. [验收标准](#9-验收标准)

---

## 1. 结论摘要

flux 与 AMIS 的 CRUD 视觉差异不是"局部参数没调对"，而是**渲染策略上的三处软件级差异**：

1. **固定列方案不同**（根因 R1）：AMIS 固定单元格背景用 CSS `background: inherit` 继承行背景；flux 硬编码不透明 `hsl(var(--background))`，导致**行 hover 时固定列不跟高亮** —— 这就是"fix 左右列之后中间行 hover 有效果、两侧失效"的直接根因。AMIS 不是这样的（见 §5）。
2. **列宽契约不同**（根因 R2）：AMIS 用 `<colgroup>` + 渲染后用 JS 测量 `getBoundingClientRect().width` 回填 CSS 变量 `--Table-column-{i}-width`，固定列偏移量也由这些实测宽求和；flux 的固定列宽度/偏移由 schema 宽（defaults 160px/40px）计算，且 `<table>` 无 colgroup，列宽完全交给浏览器 auto-layout。
3. **尺寸规格表不同**（根因 R3）：字体（AMIS body 12px / header 14px，flux 通体 14px `text-sm`）、单元格内边距（AMIS 11px/10px、边列 16px；flux 8px/8px）、对话框六档 size（AMIS 350/500/800/1100/90%，flux 384/512/672），以及遮罩透明度（0.7 vs 0.4）都对不上。

其余是"彩蛋级"差异：`bordered`/`stripe` 在 flux 里是**死属性**（只有 data-attribute 没有任何 CSS hook）；AMIS thead 有列分隔线（白色 1px），flux 没有；AMIS 表格内按钮 32px 高 + 10px 间距，flux 默认按钮 36px + 12px 间距，导致 operation 列肉眼可见地更宽更高。

---

## 2. 为什么"看上去差别很大"：根因清单

| #   | 类别             | AMIS（桥接后/默认主题）                                                                                            | flux（现状）                                                                       | 影响                                              |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| R1  | hover/固定列背景 | sticky 单元格 `background: inherit`，行 `tr:hover` 整行生效                                                        | sticky 单元格 `background: hsl(var(--background))` 不透明（`fixed-columns.ts:43`） | 固定列 hover 无反馈、斑马纹被覆盖、选中态也不透   |
| R2  | 列宽机制         | colgroup + 测量回填 `--Table-column-*`，不写死                                                                     | 仅 `width` 内联（`table-cell-chrome`/render 传转发），固定列默认 160px/40px        | 列宽分布与 AMIS 不一致，固定列常被撑宽 160px+     |
| R3  | 字号             | body 12px、thead 14px、line-height 1.5                                                                             | 全表 `text-sm` 14px                                                                | 视觉"更粗更大"，与 AMIS 的密集行高风格不一致      |
| R4  | 单元格内边距     | 垂直 `(40-12×1.5)/2 ≈ 11px`，水平 10px；首/末列 16px                                                               | `p-2`（全 8px）                                                                    | 行略矮、水平内容贴左边缘、check/expand 列自动居中 |
| R5  | thead 装饰       | th 之间 `border-right: 1px solid #fff`；thead 底白线；bg `fill-10`（#f7f8fa → 桥接为 `hsl(var(--background))` 白） | 无纵向分隔线，header 直接白底                                                      | 表头缺少列分割视觉                                |
| R6  | 斑马纹/边框开关  | `stripe`、`bordered` 均有 CSS 效果                                                                                 | `data-striped`/`data-bordered` 无任何 CSS 监听                                     | `stripe: true`、`bordered: true` 完全失效         |
| R7  | 固定列边缘阴影   | 左/右边缘 `::after` 30px `inset box-shadow rgba(5,5,5,0.06)`                                                       | 无                                                                                 | 滚动时固定列与内容没有层次感                      |
| R8  | 操作列按钮       | AMIS 按钮 32px 高、操作间距 10px                                                                                   | flux Button 默认 `h-9` 36px、`flex gap-3` 12px                                     | operation 列高/宽明显更大                         |
| R9  | 对话框尺寸档     | sm 350 / base 500 / md 800 / lg 1100 / xl 90% / full                                                               | sm 384 / md 512 / lg 672 / xl 672（`xl` 没映射）                                   | 中/大对话框明显偏小                               |
| R10 | 对话框定位与遮罩 | 顶对齐 `margin-top: 60px`（每叠加一层 +30px），垂直方向自动流；遮罩 black 0.7                                      | 50%/50% 居中 + `translate(-50%,-50%)`；遮罩 `surface-overlay` 0.4 绿               | 多弹窗叠加与整屏视觉不同                          |
| R11 | 对话框交互默认值 | `draggable` 默认 false，拖出时 header `cursor: move`，无拖柄                                                       | **默认 draggable=true**，且 header 带 Grip 拖柄按钮                                | 每次弹窗多一个手柄图标，行为契约也不同            |
| R12 | footer 按钮      | min-width 72px、居右、无底边框                                                                                     | `p-4` + `border-t bg-muted-50`                                                     | footer 观感更"重"                                 |

---

## 3. 表格元基线对照表（尺寸/字体/边框）

### 3.1 AMIS 实测基线（default.css + Table CSS）

| 项                 | token / 规则                                      | 值                                                                                                |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 表体字号           | `--table-body-fontSize` = `--fonts-size-8`        | **12px**（行高 1.5 → 18px）                                                                       |
| 表头字号           | `--table-header-fontSize` = `--fonts-size-7`      | **14px**，字重 400                                                                                |
| 行高（默认）       | `--TableCell-height`                              | **40px**（`--TableCell-height-default` 41px 用于显式尺寸计算）                                    |
| 单元格 padding     | `--TableCell-paddingY/X`                          | 垂直 (40−12×1.5)/2 ≈ 11px；水平 10px                                                              |
| 首/末列 padding    | `--TableCell--edge-paddingX` = `--gap-md`         | **16px**（每行列首/列尾）                                                                         |
| thead 单元格       | `th:first-child` 12px、checkCell 16px             | —                                                                                                 |
| 行边框             | `--table-border-width/color`                      | 1px `#e8e9eb`（单元格 `border-bottom`）                                                           |
| thead 分隔线       | `--Table-thead-borderColor/Width` = fill-11 / 1px | 白线：th 之间 border-right + 表头下 border-bottom                                                 |
| thead 背景         | `--table-header-bg-color` = fill-10               | `#f7f8fa`（桥接后 = 宿主 `hsl(var(--background))`，白色）                                         |
| 表体外框           | `.cxd-Table`                                      | 无外框、无圆角边框（仅 radius 无边框）                                                            |
| 行 hover           | `--Table-onHover-bg` = `--colors-brand-10`        | `#e6f0ff`（桥接后 = `hsl(var(--primary-bg)/0.3)` 与 flux hover 近似）                             |
| hover 时行边框变色 | `--Table-onHover-borderColor` = line-8            | `#e8e9eb`                                                                                         |
| 斑马纹             | `--Table-strip-bg`                                | transparent（**AMIS 默认也不显条纹**）                                                            |
| 空状态高度         | `--Table-placeholder-height`                      | 200px                                                                                             |
| toolbar 外边距     | `--Table-toolbar-margin`                          | 12px 0 12px 4px                                                                                   |
| tool 内按钮间距    | `--Crud-toolbar-gap`                              | 10px                                                                                              |
| 列宽               | colgroup + `--Table-column-{i}-width`             | 先渲染、测量、回填；table-layout auto（col 带 min-width=width）或 schema `tableLayout:'fixed'`    |
| 固定列             | `th.is-sticky`/`td.is-sticky`                     | `position:sticky; z-index:20; background:inherit`；offset 由左侧固定列的测量宽之和（`calc(...)`） |
| 固定边缘阴影       | 最左/最右 is-sticky-last/first `::after`          | 30px、`inset 10px 0 8px -8px rgba(5,5,5,0.06)` 过渡                                               |
| 列宽持久化         | `persistKey`                                      | 用户手动拖宽/自动测量后会写回 store                                                               |

### 3.2 flux 现状（源码实测）

| 参数         | 位置                                                    | 值                                                       |
| ------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| 全表字号     | `table.tsx:11` `text-sm w-full caption-bottom`          | 14px                                                     |
| 表头         | `table.tsx:57` `h-10 px-2 ... font-medium`              | 40px 高、字重 500、水平 8px                              |
| 单元格       | `table.tsx:69` `p-2 align-middle whitespace-nowrap`     | 8px 全向（无 16px 边列）                                 |
| 行边框       | `table-row-class-name.ts` `border-b ...`                | 1px `border-border`（`--border` 214 32% 91% ≈ #e4e7e9）  |
| 行 hover     | `table-row-class-name.ts`                               | `color-mix(in hsl, hsl(var(--primary)) 6%, transparent)` |
| 斑马纹/边框  | `table-renderer.tsx:538` `data-striped`/`data-bordered` | **无 CSS hook，完全死属性**                              |
| 固定列       | `fixed-columns.ts:34-48`                                | `background: hsl(var(--background))` 硬编码；无边缘阴影  |
| 固定列默认宽 | `fixed-columns.ts:5`                                    | 数据列 160px、控制列 40px                                |
| 固定偏移     | `createFixedColumnLayout`                               | 按 schema width 累加（与实测渲染宽无关）                 |
| 操作列       | `table-body-row-rendering.tsx:433-447`                  | `flex flex-wrap gap-3`、行按钮 `Button` 默认 `h-9` 36px  |
| 空状态       | `table-body-rows.tsx:396-401`                           | 200px 与 AMIS 一致                                       |
| affix 表头   | `table-header-row.tsx:392`、`fixed-columns` 同款        | `background: hsl(var(--background))` 硬编码              |

---

## 4. 列宽与静态列（根因 R2）

### 4.1 AMIS 的"测量回填"机制

1. 首屏用 `table-layout: auto`（table 无宽度列时按内容自适应），同时每个 col 用 `--Table-column-{i}-width` 变量占位。
2. 首分钟后组件在所有列 `getBoundingClientRect().width` 实测（`amis-core/store/table.js:1099-1101` `realWidth`），回写 `buildStyles`（`:839`）生成 CSS 变量。
3. colgroup 每列 `width: var(--Table-column-{i}-width)`；`tableLayout==='auto'` 时还加 `min-width`（`TableContent` → `.is-layout-fixed` 当 `tableLayout:'fixed'`），保证列宽锁定。
4. 固定列的 `left/right` 偏移直接引用这些变量做 `calc(30px + 40px + ...)`（`table.js:795-835`），因此 **offset 与视觉列宽必然一致**（重叠/空隙）。
5. 用户拖拽调整后 `liveStore` 继续覆盖 `--Table-column-*`，与测量同轨道。

flux 没有等价机制：固定列要么按 schema 的 `width`，要么默认 160px，然后视觉上为了让 offset 正确又强制 `minWidth/maxWidth` = 该宽，**此列就被"撑"到 160px**（即使 AMIS 中该列会收缩到内容宽）。在 schema 没写 `width` 的列上尤其明显（生成的业务页面列通常不写 width，AMIS 自适应、flux 不动 160）。

### 4.2 Operation 列为什么更宽

| 因素         | AMIS                          | flux                                  | 差异来源                                  |
| ------------ | ----------------------------- | ------------------------------------- | ----------------------------------------- |
| 按钮高度     | 28/32px（默认小按钮）         | `h-9` 36px / `h-8` 32px（小）         | `button.tsx` 默认 variant 不带 size → h-9 |
| 按钮文字间距 | `--Crud-toolbar-gap` = 10px   | `gap-3` = 12px                        | 行操作按钮间距                            |
| 列宽来源     | 内容自适应（无 width 时收缩） | 无 width 时也收缩，但要塞下 36px 按钮 | 行高被按钮撑高，整个表变"胖"              |

对比 `AMIS` 的 `ItemActionsWrapper`/`Operation` 列（默认也自适应、无强制宽度），flux 差的核心是按钮高度与间距，而非 operation 列本身有特殊宽度。

---

## 5. 默认行为与固定列（用户问①）

### 问：固定列之后，只有中间列 hover 有效，这是 AMIS 的正确行为吗？

**不是。** AMIS 的 hover 是会整行高亮、包括左右固定列。

AMIS 语义链（`default.css`）：

```
.cxd-Table-table > tbody > tr:hover   { background: var(--Table-onHover-bg); }
.cxd-Table-table th.is-sticky, td.is-sticky { background: inherit; }   ← 关键
```

`td.is-sticky { background: inherit }` 让 sticky 单元格**继承行（tr）的实际背景**，所以 `tr:hover` 时镜像渲染——固定列同样染上 hover 色；斑马纹（若开启）、`is-checked` 选中态同理。固定列用户看到一致的完整行高亮 + 边缘 30px 渐隐阴影（滚动时）。

flux 现状（`fixed-columns.ts:34-48`）：sticky 单元格写死 `background: hsl(var(--background))`，而行 hover 是 `tr` 的背景色变化——**单元格不透明背景遮住了 tr 背景**，于是 hover 停在中间列。要修正，必须让固定单元格改为 `background: inherit`（或回首层的背景色跟随行状态），并同时补：

- hover 状态下的区间边缘阴影（左固定最后一列/右固定第一列）`::after`。
- 斑马纹 `[data-striped]` 行在固定列透出（若启用 stripe，flux 目前 stripe 本身死属性，需先补 CSS）。
- affix 表头（`table-header-row.tsx:392`）同样把 `background: hsl(var(--background))` 改成跟随主题表面（AMIS 用 `--Table-bg` 且会加 `fixedTop::after` 阴影）。

另外 AMIS 的固定列 cls 是 `is-sticky-left`/`is-sticky-right` 且 z-index 20，flux 的 z-index 2/1 无功能影响但建议统一。

---

## 6. 对话框

### 6.1 尺寸对照（AMIS= bridge 前默认、宿主=当前配置）

| AMIS size | AMIS 宽度（默认主题） | flux 映射 (`resolveDialogPrimitiveSize`) | flux 实际（primitive 映射） | 差异            |
| --------- | --------------------- | ---------------------------------------- | --------------------------- | --------------- |
| xs        | 375px\*               | → 'sm'                                   | `max-w-sm` 384px            | +9px            |
| sm        | 350px（`21.875rem`）  | → 'default'                              | `max-w-lg` 512px            | +162px          |
| md        | 800px（`50rem`）      | → 'default'                              | 512px                       | **−288px 偏小** |
| lg        | 1100px（`68.75rem`）  | → 'lg'                                   | `max-w-2xl` 672px           | **−428px 偏小** |
| xl        | 90%                   | → 'lg'                                   | 672px                       | **偏小**        |
| full      | 100%/100% 全屏        | → 'sm'（错误）                           | 384px                       | **错误映射**    |

具体错点（`dialog-host.tsx:32-39`）：

```ts
function resolveDialogPrimitiveSize(size) {
  if (size === 'xs') return 'sm';
  if (size === 'sm' || size === 'md') return 'default';
  return 'lg'; // lg、xl、full 全走 672px
}
```

- `xl` 与 `full` 被拍平成 'lg'：`full` 对话框无法工作。
- `md` 明确映射到 'default'（512px），而不是 AMIS 的 800px。
- 且 `DialogContent` 的 primitive 档位（`max-w-sm=384 / max-w-lg=512 / max-w-2xl=672`）与 AMIS 尺寸表不匹配。

建议：不要复用 primitive 三档，与 `buildSurfaceInlineStyle` 一样**按数字 width 直接注入 style.width**，把档位表改为：

| size | 建议 width                                        |
| ---- | ------------------------------------------------- |
| xs   | 375px                                             |
| sm   | 350px                                             |
| md   | 800px                                             |
| lg   | 1100px                                            |
| xl   | 90%                                               |
| full | 100% × 全屏（当前 viewport/percent 的分流已存在） |

（若宿主视觉规范要求更窄，也应至少保持 md=800/lg=1100 的比例差，而不是 512/672。）

### 6.2 结构与布局

| 维度                | AMIS                                                                 | flux                                           | 建议                                                                          |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| 垂直定位            | `margin-top: 60px`（每叠加一层 +30px，最多十层），不居中             | 50%/50% + `translate(-50%,-50%)`               | 改为顶部 60px 起排（google 弹窗链）；或保留居中但提供 `topOffset` 等级联      |
| 遮罩                | `rgba(0,0,0,0.7)`                                                    | `surface-overlay` 0.4                          | 提升到 ≈0.6–0.7（仅对话框，注意与抽屉共享遮罩逻辑）                           |
| 主体 padding        | 24px 水平（`--dialog-default-padding-y` 24px 垂直 via margin）       | header `p-4 pb-0`、body `p-4`、footer `p-4`    | 对齐 20–24（统一 `p-5` 或 24px）                                              |
| header 高度/字号    | 40px / 14px / weight 500                                             | `font-heading text-base` (`16px`) + 拖柄 40px  | 字号与 AMIS 一致 14px（标题）                                                 |
| 默认 draggable      | false（schema `draggable:true` 才可拖，header `cursor:move` 无手柄） | **true + 左上角 Grip 拖柄按钮**                | 默认 false；拖拽时用 header 本身而非专职拖柄                                  |
| 关闭按钮            | absolute right 24px top 24px，icon 16px                              | absolute `top-2 right-2`（ghost size icon-sm） | 对齐 AMIS 位置与尺寸                                                          |
| footer              | 无边框、右对齐，按钮 min-width 72px、间距 8px                        | `border-t bg-muted/50` + `p-4`                 | 去掉顶部边框/背景；按钮 min-w 72px                                            |
| 内容字号            | 14px（`--dialog-content-fontSize`）                                  | 14px（text-sm）                                | OK                                                                            |
| 边框                | 1px `fill-9`；radius 6px                                             | `ring-1 ring-foreground/10` + radius 12px      | 主应用 host 的 ring/radius 偏现代，若要 amis 视觉改成 1px border + 6px radius |
| width/height 自定义 | schema `width`/`height` 生效                                         | `buildSurfaceInlineStyle` 已支持 width/height  | 已兼容 ✓                                                                      |
| body max-height     | 无（由 content `max-h` 约束流式滚动）                                | `max-h-[calc(100dvh-2rem)]`                    | 保持一致即可                                                                  |

### 6.3 抽屉（drawer）

AMIS drawer 尺寸：`xs/sm/md/lg/xl` 对应 宽度 20%～96%？抽屉未细测；但题同 `size` 语义。flux 的 Drawer 使用 `--drawer-size` 变量即可对齐同档位。

---

## 7. 间距体系

### 7.1 页面/CRUD 区域

| 位置          | AMIS                                                 | flux                                   | 差异                                                           |
| ------------- | ---------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| 页面 body     | `--Page-` 主题间距（编辑区 16px）                    | `--space-page-body: 16px` ✓            | 一致                                                           |
| 搜索区        | `--Table-searchableForm bg fill-10` round 4px 无边框 | `rounded-lg border bg-muted/30 p-4`    | 加边框/圆角夸张；改 `bg-muted/50 rounded-[4px]` 无边框 or 对齐 |
| toolbar       | margin 12px 4px、按钮 gap 10px                       | `flex flex-wrap justify-between gap-3` | 间距 12px 可接受，gap 对齐 10px                                |
| footerToolbar | 分页在右 + `-gap-sm`                                 | `justify-between` 分页框               | 基本一致                                                       |
| 表格底 margin | `margin-bottom: 16px`                                | `flex flex-col gap-4` 的外层 gap       | 一致                                                           |

### 7.2 Flux token 系统建议新增（或 map 到现 token）

AMIS 有完整 token，flux → 直接可用：

```
--table-body-font-size: 12px;
--table-header-font-size: 14px;
--table-cell-padding-y: 11px;
--table-cell-padding-x: 10px;
--table-edge-padding-x: 16px;   /* 首末列 */
--table-row-height: 40px;
--table-border: var(--border);
--table-header-bg: ...
--table-hover-bg: color-mix(...6%);
--crud-toolbar-gap: 10px;
--dialog-size-*: 350/500/800/1100/90%
--modal-overlay-opacity: 0.7
```

---

## 8. 修复建议与优先级

### P0（视觉一致性直接止损）

| 项                                 | 文件                                                      | 修改                                                                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 固定列背景 inherit                 | `table-renderer/fixed-columns.ts:43` 周边                 | 固定单元格改为 `background: inherit`（去掉不透明 `hsl(var(--background))` 与 `bg-background` class）；给最后左侧固定/第一右侧固定单元格加边缘阴影（同 AMIS `::after` 30px 方案） |
| affix 表头背景                     | `table-header-row.tsx:392,509`                            | 同 inherit 处理（AMIS `fixedTop` 语义）                                                                                                                                          |
| `data-striped`/`data-bordered` CSS | `ui/src/styles/`（index.css 或 base.css）                 | 补 `.nop-table[data-bordered] ...`、行 data-striped 的 nth 类；否则 schema 属性失效                                                                                              |
| dialog size 档位                   | `dialog-host.tsx:32` 与 `dialog.tsx`                      | `resolveDialogPrimitiveSize` 改为直接 style.width 映射（375/350/800/1100/90%/full），补 xl/full                                                                                  |
| 对话框默认 draggable 改为 false    | `dialog-host.tsx`（不传 draggable → ui Dialog 默认 true） | 默认 `draggable=false`，schema `draggable:true` 时允许 header 拖                                                                                                                 |

### P1（视觉保真）

| 项            | 修改                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| 表格字号/边距 | `text-sm` → body 12px；`p-2` → `py-[11px]`、水平 10px；首末列 `pl-[16px]`/`pr-[16px]`（参照 AM）。注意行高对齐 40px |
| thead 分隔线  | th `border-right: 1px solid var(--border)`（最后一列省略）+ 底部 `header-last` 实线                                 |
| hover 行边框  | 加 `border-color` 过渡（`Table-onHover-borderColor` 语义）                                                          |
| 固定边缘阴影  | 每行左侧 fixed-最后/右侧 fixed-第一：`::after` 30px inset 阴影 transition                                           |
| 操作按钮高度  | CRUD 行内按钮钳到 `h-8`（32px）、gap `gap-2.5`（10px）——与 AMIS 一致                                                |
| 表头字重      | `font-medium` → `font-normal`（AMIS 400；标题可以有 500 场景再开启）                                                |
| 遮罩与定位    | `dialog` overlay 0.7；顶部 60px + 级联 30px 步进                                                                    |

### P（体验收尾）

- 列宽测量回填机制（对齐 AMIS `realWidth`）：ResizeObserver 监听容器宽度变化写入 CSS variables in HV tray → 固定列偏移改为从实测宽计算。这是解决"固定列宽和内容不一致"的唯一正道，其余方案都是补丁。
- dialog body `max-h` 溢出滚动与全屏模式边距（30px margin）对齐。

---

## 9. 验收标准

在 nop-chaos-next 宿主中同一 CRUD schema 下（含 unstripe/bordered/seach/分页/操作列/固定列）：

1. 视觉 diff：行高 40px±1、首末列 16px、表体字号 12px、thead 字号 14px 且带列分隔线。
2. hover任意一行：整行（含左右固定列、含斑马纹）高亮一致，固定边缘有 30px 渐变阴影。
3. `stripe:true`、`bordered:true` 有可见效果。
4. operation 列按钮 32px、间距 10px，与 AMIS 列高无肉眼差异。
5. 对话框 6 档尺寸 = 375/350/800/1100/90%/full，默认不 draggable，遮罩 0.7，位于页面上部。
6. 复选/序号/展开列在固定边与 AMIS 对齐（40px 体系减半或按 40px）。
7. flux 单元测试保持全绿（特别是 `data-table.test.tsx`、`table-e1c*`、`table-b33-advanced-boundary.test.tsx` 中关于 hover/focus 零重渲染的断言——背景继承必须用 CSS 而非状态）。

# R2-2b 走查独立复核 — Review A（content 域 20 卡，fresh session 重跑）

- **复核人**: 独立复核 agent A（重跑；首轮因限流中断未产出，本路 fresh session 先独立取证再比对原发现）
- **日期**: 2026-09-24
- **口径**: `docs/skills/visual-page-quality-inspection-prompt.md`（阶段 3 独立复核：重开页面、重截同态截图、重跑探针，不得只读发现文本后采信）；严重度判据用该提示词严重度表（P1=明显交互障碍/大范围视觉缺陷且高频路径必经；P2=明显不一致/缺失反馈/系统性偏差；P3=细节优化不阻碍任务；系统性发现 ≥3 同根因整体升一级）
- **环境**: dev server `http://127.0.0.1:4175`（200 确认，未重启）；Playwright 1.63.0；探针落 `_tmp/r2-2b-review/`（`ra-content.mjs` + `ra-content.json`、`ra-pixels.mjs` + `ra-pixels.json`、`ra-lib.mjs`），截图落 `_tmp/r2-2b-review/ra/<control>/`
- **复核范围**: R2-2b content 域 P1 ×2 + P2 ×3 + P3 抽样 ×4，共 9 条（涉及 link/markdown/status/alert/carousel/image/video/qrcode 8 张卡）
- **本路第二职责**: content 域 20 控件 owner-doc drift 复核（见 §drift）
- **方法学**: 沿用 R2-2a/2b 沉淀四条——①真 dark 用 `data-mode` setAttribute；②evaluate 传真函数（本轮再次踩中闭包坑：`roundRect` 未内联进 evaluate 回调即报 ReferenceError，已修复佐证该坑）；③对比度数值一律 PNG 像素采样（`ra-pixels.mjs` 内置 colorType 2/6 解码器）；④弹层用全局选择器（本轮涉及面无弹层取证）。

## 0. 汇总表

| #   | 发现 id     | 卡       | 原判级 | 独立取证结果                                                                                                                                                                              | 结论                    | 备注                                                                                                 |
| --- | ----------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | R2-2b-A1-41 | link     | P1     | 4 锚点全部正文前景 rgb(33,53,71)/无下划线/16px/400；真实指针 hover（`:hover` 为 true）前后 color/decoration/opacity/bg 四项全同；**live 级联全量扫描 `.nop-link` 规则 = 0 条**            | **保留 P1（证据锐化）** | 对照：`.nop-markdown a` 有主色+下划线（form-renderers.css L157–162），同产品双链接面单侧裸奔         |
| 2   | R2-2b-C1-45 | markdown | P1     | table/table/th/td border 全 0、th/td padding 全 0、textContent 塌缩 `"ab12"`；**table rect 宽仅 19px**（无 width 规则，收缩到内容宽）                                                     | **保留 P1（证据锐化）** | 元素矩阵（form-renderers.css L74–78 注释）明列 h1-h3/ul/ol/blockquote/code/a/img，无 table           |
| 3   | R2-2b-E2-46 | markdown | P2     | `ul` list-style-type **none**（preflight 重置）、paddingLeft 24px（缩进仍在）；`li::marker` color 可算出 rgb(72,86,106) 但 list-style:none 下无 marker 盒——死规则 live 坐实               | **保留 P2**             | 与 #2 同一元素矩阵缺口，同一修复面                                                                   |
| 4   | R2-2b-B1-51 | status   | P2     | 像素采样：light **2.13:1**（fg rgb(16,183,127) 精确命中计算值 vs 底 rgb(216,238,227)）；dark **6.45:1 过**（底修正为药丸内体 rgb(22,62,57)，非原卡页面 surface rgb(19,31,37)）            | **保留 P2（数值修正）** | 12px font-medium 门槛 4.5；dark 过检结论与原卡一致，数值口径修正见 §4                                |
| 5   | R2-2b-E4-1  | alert    | P2     | 带 actions 的 alert gridCols **"115.641px 772.359px"**（正常 alert "16px 872px"）；icon.x 312 / title.x 435.6 / desc.x 435.6 / actions.x 312；title colStart=2、**actions colStart=auto** | **保留 P2（根因锐化）** | description 落 col-2 仅靠 auto-placement 尾随 title，actions 无任何列约束（alert-renderer.tsx L101） |
| 6   | R2-2b-C1-4  | carousel | P3     | 3 场景逐量复现：prev/next 越出 stage 左右缘各 **11px**（prev.x 253 vs stage.x 264）；ui carousel.tsx L194 `-left-12` / L224 `-right-12`                                                   | **保留 P3**             | 几何与原卡逐位一致                                                                                   |
| 7   | R2-2b-A9-5  | image    | P3     | error 态 fallback 文本 = **"lifecycle image"**（= 该图 alt）；对照同批 video error 显式输出「加载失败」；image.tsx L213 `alt \|\| t('flux.common.noData')` 两态共用同一出口               | **保留 P3**             | 场景 1 正常图 alt "lab image" 与 error pill 文本不同，佐证 pill 渲染的是出错图自身的 alt             |
| 8   | R2-2b-B1-52 | video    | P3     | 像素采样：light **3.14:1** / dark **3.4:1**（与原卡 ~3.1/~3.4 逐项吻合）；video.tsx L61 `text-xs`（12px）+ L64 `text-destructive` + `bg-destructive/10`                                   | **保留 P3**             | 低频错误路径维持 P3；token 层与 R2-4 `--destructive` 族同修                                          |
| 9   | R2-2b-C6-49 | qrcode   | P3     | canvas 位图 128×128 == CSS 128×128（DPR=1 环境）；源码 qrcode.tsx **L56 `width: size`** 与 **L84 `style={{width:size,height:size}}`** 全程无 devicePixelRatio                             | **保留 P3**             | HiDPI 发虚为机制推断（与原卡同口径），源码层无 DPR 处理坐实                                          |

**总裁决：9/9 保留（P1 ×2、P2 ×3、P3 ×4），0 降级，0 驳回；其中 #4 数值修正、#1/#2 证据锐化、#5 根因锐化。**

---

## 1. [R2-2b-A1-41] link 渲染为纯正文样式、hover 零反馈 —— 保留 P1（证据锐化）

### 原发现摘录（cards/link.md）

4 个 `a[data-slot=link]` 全部正文前景色、无下划线、hover 零变化；grep 全仓 CSS 无 `.nop-link` 规则；P1=链接可供性缺失是控件核心语义失败；修复方向为 content 包 styles.css 补 `.nop-link` 规则。

### 独立取证（`ra-content.mjs` link 段 + 截图）

- **结构面复现**：4 锚点（External docs / Navigate + dispatch / Unsafe javascript href / Disabled link）全部 `color: rgb(33,53,71)`（= 全局前景令牌渲染值）、`text-decoration: none solid`、`font-weight 400`、`font-size 16px`；除 disabled 变体有 opacity 0.6 外与正文无任何区分。
- **hover 面复现**：真实指针悬停 `demo-link-lab`，`el.matches(':hover') = true` 确认 hover 生效；前后 `color / textDecorationLine / opacity / backgroundColor` 四项逐一同值（`beforeHover` ≡ `afterHover`）——hover 零反馈坐实，非 transition 未完成（等待 300ms）。
- **证据锐化（live 级联扫描，强于 repo grep）**：对页面 `document.styleSheets` 全量遍历（含 @layer 递归），选择器含 `nop-link` 的规则 = **0 条**——证明不止源码里没有，实际加载的级联里也没有，任何 CSS 加载顺序/裁剪因素均已排除。
- **同产品对照（新证据，放大系统性）**：markdown 渲染链路的链接有完整链接语言——`form-renderers.css` L157–162 `.nop-markdown a { color: var(--flux-md-primary); text-decoration-line: underline; text-underline-offset: 2px }`。同一产品两个链接出口（markdown 内链 vs link renderer）一个有可供性一个没有，A1-41 的"单点 CSS 缺失"定性成立且对照更显性。
- 根因复核：`packages/flux-renderers-content/src/link.tsx` L84 输出 `nop-link` 类、L85 输出 `nop-link-disabled`，两类的 CSS 规则在全仓均不存在；`packages/flux-renderers-content/src/styles.css` 仅含 separator/progress/diff-view 块。原卡根因与修复方向（补 `.nop-link` 规则 + dark 块）成立。
- 截图：`_tmp/r2-2b-review/ra/link/recheck-default-light.png`、`recheck-hover-light.png`（悬停中画面无任何变化）、`recheck-default-dark.png`；侧栏 "Home" 壳层链接有橙色+下划线可作同屏对照。

### 结论：**保留 P1**

逐字命中严重度表 P1 示例"主按钮 hover 无反馈"（链接与按钮同为最高频交互元素），且 WCAG 1.4.1 层面链接仅靠 hover 通道不可辨。修复方向照原卡；建议修复时一并对照 `.nop-markdown a` 的主色+下划线语言保持一致。

---

## 2. [R2-2b-C1-45] GFM 表格塌缩成文字堆 —— 保留 P1（证据锐化）

### 原发现摘录（cards/markdown.md）

两列 GFM 表渲染成 "ab"/"12" 两行，无格线无内边距；`.nop-markdown` 元素矩阵从未包含 table/td/th，而 renderer 引入 remark-gfm 宣称支持 GFM。

### 独立取证（`ra-content.mjs` markdown 段 + 截图）

- **样式面复现**：`tablePresent: true`、`borderCollapse: collapse`，但 `tableBorder 0px`、`thBorder 0px`、`tdBorder 0px`、`thPadding 0px`、`tdPadding 0px`；`thFontWeight 700`（UA 默认，非矩阵规则）。
- **内容塌缩复现**：`rowsText: ["a|b", "1|2"]`、`tableText: "ab12"`——单元格文本在读取顺序上粘连，列边界信息零保留。
- **证据锐化（收缩宽度）**：`tableRect.w = 19px`——矩阵无 `table { width }` 规则，表格收缩到两字符内容宽，视觉上完全不像表格（原卡未测此项；亦意味着原卡修复方向中 `width: 100%` 一行必要）。
- 根因复核：`packages/flux-renderers-form/src/form-renderers.css` L74–78 注释明列元素矩阵 "h1-h3 / ul / ol / blockquote / code / a / img"，全文件 grep 无任何 `table/th/td` 规则；renderer（`flux-renderers-content/src/markdown.tsx` L140）`remarkPlugins={[remarkGfm]}` 属实。**附结构性发现**：markdown renderer 在 content 包，其排版 CSS 却物理位于 form 包（`form-renderers.css`，由 `flux-renderers-form/src/index.tsx` L1 引入、`flux-bundle/src/style.css` L2 聚合），矩阵注释表明其出身是"Plan 480 A6 markdown-editor preview typography"——content 控件跨包寄居 form 包样式，详见 §drift DR-1。
- 截图：`_tmp/r2-2b-review/ra/markdown/recheck-table-light.png`（"ab"/"12" 两行裸文本，目视与原卡描述一致）、`recheck-table-dark.png`。

### 结论：**保留 P1**

命中严重度表 P1 示例"表格行高混乱"同族（表格结构语言整体丢失）；markdown 文档/发布说明类内容表格高频，列数据粘连导致误读，属大范围视觉缺陷。修复方向照原卡（矩阵补 table/th/td；补 `width:100%`），落点注意 DR-1 的包归属问题。

---

## 3. [R2-2b-E2-46] 无序列表项目符号被剥 —— 保留 P2

### 原发现摘录（cards/markdown.md）

Tailwind preflight 将 list-style-type 重置为 none，矩阵未恢复；矩阵内 `.nop-markdown li::marker` 着色规则成死规则，佐证本应有 marker。

### 独立取证（`ra-content.mjs` markdown.list 段）

- `ulListStyleType: "none"`（preflight 重置生效）、`ulPaddingLeft: "24px"`（矩阵 `padding-left: 1.5em` 生效——缩进保留，与原卡"层级语言只剩缩进"一致）。
- **死规则 live 坐实**：`liDisplay: "list-item"`、`liMarkerContent: "normal"`、`liMarkerColor: "rgb(72, 86, 106)"`（= `--flux-md-muted-fg` 渲染值，form-renderers.css L125 规则真实参与级联）——但 `list-style-type: none` 下无 marker 盒，着色永不生效。原卡"死规则佐证设计意图"推理链完整复现。
- 截图：`_tmp/r2-2b-review/ra/markdown/recheck-table-light.png`（"GFM table below" 仅缩进无圆点）。

### 结论：**保留 P2**

列表为 markdown 高频元素，与 #2 同一元素矩阵缺口、同一次修复（矩阵补 `ul { list-style: disc }` / `ol { list-style: decimal }` 两行，li::marker 随之复活）。系统性权重已由同根因的 C1-45（P1）承载，本条维持 P2。

---

## 4. [R2-2b-B1-51] success Badge 文本对比度不足 —— 保留 P2（数值修正）

### 原发现摘录（cards/status.md）

light 像素采样文字簇 rgb(29,186,133) vs 底 rgb(215,237,227) → 2.26:1；dark rgb(36,205,149) vs rgb(19,31,37) → 8.19:1 通过；DOM `badgeColor rgb(16,183,127)`、`badgeBg oklab(.../0.15)`；12px 要求 4.5:1。

### 独立取证（`ra-content.mjs` status 段 + `ra-pixels.mjs` PNG 像素采样）

- DOM 侧复现：badge "Completed" `color: rgb(16,183,127)`、`bg: oklab(0.690189 … / 0.15)`、`fontSize 12px / fontWeight 500`、rect (301,275,79×20)；dark `color: rgb(38,217,157)`、`bg oklab(…/0.2)` 同位。
- **像素 ground truth（light）**：badge 区域众数底像素 **rgb(216,238,227)**（15% success tint 合成结果），最远像素簇即精确计算值 **rgb(16,183,127)** → **2.13:1**。原卡 2.26 的 fg 簇均值 rgb(29,186,133) 混入了抗锯齿边缘像素；用纯色值口径两轮一致结论：**约为门槛 4.5 的一半**。
- **数值修正（dark）**：dark 像素采样底应为**药丸内体 rgb(22,62,57)**（20% success tint 压 dark 表面），原卡 rgb(19,31,37) 更接近页面 surface（可能采到圆角外侧）。以药丸内体为底：fg rgb(38,217,157) → **6.45:1，通过 4.5**（原卡 8.19 亦通过）。**方向结论不变：dark 过检、light 不达标**，仅底采样口径修正。
- 根因复核：`packages/ui/src/components/ui/badge.tsx` L19 `success: 'bg-success/15 text-success dark:bg-success/20'`（L20 warning 同构）——浅底彩字变体未配对前景令牌，与原卡归因一致；status.tsx L86 仅投影 variant，无额外样式。
- 截图：`_tmp/r2-2b-review/ra/status/recheck-default-light.png`（绿字浅绿底目视发飘）、`recheck-default-dark.png`（dark 可读）。

### 结论：**保留 P2**

与 R2-2a 复核 badge B1-02（light 四语义 1.76–3.12 全不达标，P2 维持）同族同口径：badge 为跨页高频元件，未达 AA 一半以上但未至完全不可读。修复方向照原卡（ui Badge success/warning 成对前景令牌或加深文字档），修复后与 R2-2a badge 族合并复检。

---

## 5. [R2-2b-E4-1] 带 actions 的 alert 把 actions 行排进图标网格列 —— 保留 P2（根因锐化）

### 原发现摘录（cards/alert.md）

带 actions 的 alert `alertCols "115.641px 772.359px"`（正常 16px+gap），icon.x 312 / title.x 436 / actions.x 312，title/desc 右移 124px；根因 alert-renderer.tsx L101 actions 容器无 col-start-2。

### 独立取证（`ra-content.mjs` alert 段 + 截图）

- **几何逐位复现**：同页三 alert——info（无 actions）`gridCols "16px 872px"`、warning（无 actions）`"16px 810px"`、success（带 actions）**`"115.641px 772.359px"`**；带 actions 实例 icon.x 312 / title.x 435.6 / desc.x 435.6 / actions.x 312 / actions 宽 115.6——title/desc 被推右 **123.6px**，actions 按钮与 icon 同列。同页两种排布形态目视明显（截图下缘 success alert 图标孤立左侧、Primary action 按钮吊在图标列）。
- **根因锐化（列放置机制）**：`titleCol.gridColumnStart = "2"`（来自 ui alertVariants AlertTitle 的 `group-has-[>svg]/alert:col-start-2`）、**`actionsCol.gridColumnStart = "auto"`**、`descCol.gridColumnStart = "auto"`——即 description 落 col-2 也仅是 auto-placement 尾随 title 的结果，**整个 renderer 侧没有任何元素显式声明第二列**；actions 作为第 4 个 grid 子元素（icon 之后、title/desc 占满第一行后）换行进 col-1，把 auto 列撑到按钮宽。原卡修复方向（给 `data-slot="alert-actions"` 容器加 `col-start-2`，alert-renderer.tsx L101）正确且是唯一收口点；附注：若未来出现"无 title 但有 actions"的 schema，desc 同样会掉进 col-1——修复可顺手在 ui 层给 description/description 化的分支统一约束，但非本条必须。
- 源码复核：`packages/flux-renderers-content/src/alert-renderer.tsx` L100–104 `{hasActions ? <div data-slot="alert-actions" className="mt-2 flex items-center gap-2">…}`——无列约束属实；ui `alert.tsx` L7 `has-[>svg]:grid-cols-[auto_1fr]` 属实。
- 截图：`_tmp/r2-2b-review/ra/alert/recheck-full-light.png`、`recheck-full-dark.png`。

### 结论：**保留 P2**

命中严重度表"系统性间隔/对齐偏差"；带操作按钮的告警是最常见高优先提示形态，同一控件两形态并存。修复方向照原卡（L101 加 `col-start-2`）。

---

## 6. [R2-2b-C1-4] carousel prev/next 越出宿主 stage 11px —— 保留 P3

### 原发现摘录（cards/carousel.md）

ui CarouselPrevious/Next 固定 `-left-12/-right-12`（48px 外扩），lab stage p-5 容不下，三组探针 `prevOutOfStage/nextOutOfStage: 11`。

### 独立取证（`ra-content.mjs` carousel 段 + 截图）

- 3 场景逐量复现：stage x 264（p-5），prev 按钮 rect x **253**（越左缘 **11px**）、next 右缘越出 **11px**，三场景数值完全一致（`outLeftVsStage/outRightVsStage: 11`）。与原卡 `prev.x 253 vs stage.x 264` 逐位吻合。
- 根因复核：`packages/ui/src/components/ui/carousel.tsx` L194 `-left-12`、L224 `-right-12`（48px 外扩）+ renderer（carousel.tsx L295–298）`showControls` 分支裸挂 `CarouselPrevious/Next`、无预留 padding——与原卡一致。
- 截图：`_tmp/r2-2b-review/ra/carousel/recheck-full-light.png`（左右圆形箭头悬在 stage 圆角描边外，目视"浮点"感与原卡一致）。

### 结论：**保留 P3**

不裁切、不遮内容、可点，观感错位 + 窄宿主贴边风险，P3 恰当。修复方向照原卡（容器预留 48px 或改内嵌定位）。

---

## 7. [R2-2b-A9-5] image 错误 pill 显示 alt 而非失败文案 —— 保留 P3

### 原发现摘录（cards/image.md）

error 态 fallbackText = "lifecycle image"（= alt）；根因 image.tsx L213 `{alt || t('flux.common.noData')}` error/empty 共用出口；对照 audio.tsx 两态区分。

### 独立取证（`ra-content.mjs` image 段 + 截图）

- 复现：唯一 fallback 实例 `state: "error"`、`fallbackText: "lifecycle image"`、destructive 类串齐全（`border-destructive/40 bg-destructive/10 text-destructive`，computed color rgb(239,67,67)）。
- **新旁证**：同页场景 1 正常渲染的 `img[data-slot=image]` alt 为 **"lab image"**，与 error pill 文本 "lifecycle image" 不同——证明 pill 显示的是**出错图自身的 alt**（场景 2 fixture 的 alt 值），非固定文案，正是"alt 语义混入错误态"的直接证据。
- 根因复核：`packages/flux-renderers-content/src/image.tsx` L213 `<span data-slot="image-fallback">{alt || t('flux.common.noData')}</span>` 为 error/empty 两态共同出口（L202–214 同一分支树），对照 video.tsx L68 `errored ? t('flux.common.loadFailed') : t('flux.common.noSource')` 两态区分——原卡归因逐项吻合。
- 截图：`_tmp/r2-2b-review/ra/image/recheck-error-dark.png`（深红 pill 内 "lifecycle image"，用户无法分辨是替代文本还是失败提示）。

### 结论：**保留 P3**

红 pill 已传达异常、不阻断任务，文案语义缺位属一致性缺陷，P3 恰当。修复方向照原卡（error 分支改走 `loadFailed`，与 audio/video 对齐）。

---

## 8. [R2-2b-B1-52] 12px destructive 错误文本对比度不足 —— 保留 P3

### 原发现摘录（cards/video.md）

light 文字 rgb(239,67,67) vs 10% 红底合成 rgb(249,230,226) ≈3.1:1；dark rgb(217,38,38) vs rgb(38,26,33) ≈3.4:1；均低于 12px 文本 4.5:1。

### 独立取证（`ra-content.mjs` video 段 + `ra-pixels.mjs` 像素采样）

- DOM 侧复现：error chip（figcaption）`color rgb(239,67,67)`、`bg oklab(0.6356…/0.1)`、`fontSize 12px / weight 400`、border 1px；dark `color rgb(217,38,38)`、`bg oklab(0.5714…/0.1)`。
- **像素 ground truth**：light 底众数 **rgb(249,230,226)**、fg 精确值 rgb(239,67,67) → **3.14:1**；dark 底众数 **rgb(38,26,33)**（与原卡逐位相同）、fg rgb(217,38,38) → **3.4:1**。两轮数值逐项吻合，均 < 4.5。
- 根因复核：`packages/flux-renderers-content/src/video.tsx` L61 `text-xs` + L64 `text-destructive` + `bg-destructive/10`——content 包错误回退通用写法属实；同包 markdown error 因 R2-2b-B6-47（unlayered `.nop-markdown` color 覆盖 utilities）反以前景高对比色呈现，三处错误芯片两种对比度形态的描述成立（markdown 侧本轮未重测，引用原卡）。
- 截图：`_tmp/r2-2b-review/ra/video/recheck-default-light.png`、`recheck-default-dark.png`（红字浅/暗红底，笔画发飘目视一致）。

### 结论：**保留 P3**

错误反馈为低频路径、文本短且有边框/底色辅助暗示，不升 P2；与 B1-51/R2-2a badge 族同属 `--destructive` 令牌过亮家族，R2-4 翻 token 时一并复检。修复方向照原卡（text-sm + 必要时加深文字色，或收敛共享错误芯片样式）。

---

## 9. [R2-2b-C6-49] QR canvas 位图未乘 DPR —— 保留 P3

### 原发现摘录（cards/qrcode.md）

`canvasSize { w:128, h:128, cssW:128, cssH:128 }` 无 DPR 缩放；`QRCode.toCanvas` 仅传 `width: size`；HiDPI 屏 2x 拉伸发虚（机制推断）。

### 独立取证（`ra-content.mjs` qrcode 段）

- 复现：两个 canvas 实例均 `bitmapW/H: 128`、`cssW/H: "128px"`、`inlineStyleW: "128px"`、`rectW/H: 128`；探针环境 `devicePixelRatio: 1`（与原卡同口径，HiDPI 效果为机制推断）。
- 根因复核：`packages/flux-renderers-content/src/qrcode.tsx` **L56 `width: size`**（toCanvas options）与 **L84 `style={{ width: size, height: size }}`**——绘制与显示双向都无 `devicePixelRatio` 参与，全文件 grep 零命中。原卡修复方向（`width: size * dpr` + CSS 回缩）与代码位吻合。
- 截图：`_tmp/r2-2b-review/ra/qrcode/recheck-default-light.png`（DPR=1 下清晰，与原卡"清晰但机制缺陷"口径一致）。

### 结论：**保留 P3**

QR 容错冗余使功能扫描通常不受阻，清晰度/质感缺陷，P3 恰当。修复方向照原卡；image/sparkline 等 canvas 件统一收编建议维持。

---

## §drift owner-doc drift 复核（content 域 20 控件）

登记口径：`docs/components/<type>/design.md` 断言 vs live 渲染/源码行为矛盾，逐条对照 live code 确认；不直接改 docs/components/。20 控件中 19 有 design.md，`result` 缺失（DR-5 登记）。

### DR-1 markdown —— GFM 能力断言 vs 表格/列表视觉崩坏 + 跨包样式归属未记载（坐实）

- **控件**: markdown ｜ **文档断言**: design.md §2 "已 shipped…基于 `react-markdown` + `remark-gfm`"；§10 "需要与项目 Markdown 样式策略统一，避免 renderer 内置一套独立排版体系"（未指明样式物理归属）。
- **live 实际**: GFM 表格可解析（tablePresent true）但渲染为 19px 宽无格线文字堆（本复核 §2）、列表 marker 被剥（§3）——"remark-gfm 支持"在视觉契约上只兑现了一半；且 `.nop-markdown` 排版矩阵物理位于 **form 包** `flux-renderers-form/src/form-renderers.css`（其 `index.tsx` L1 引入、`flux-bundle/src/style.css` L2 聚合），矩阵注释（L74–78）表明出身是 "Plan 480 A6 markdown-editor preview typography"——content 包的 markdown renderer 寄居 form 包为编辑器预览而写的样式，两包 design.md 均未记载该依赖。
- **建议回写文案**: ① C1-45/E2-46 修复（补 table/列表规则）落地时，在 markdown design.md §10 补一句样式契约："`.nop-markdown` 元素矩阵（含 table/th/td 与 ul/ol list-style）由 `flux-renderers-form/form-renderers.css` 承载，content 包 markdown renderer 依赖其随 bundle 加载"；② 中期评估把 `.nop-markdown` 矩阵迁到 content 包或 ui 层，消除 content→form 的反向样式依赖（若迁移，需同步 markdown-editor 预览引用）。

### DR-2 link —— "语义化链接"定位 vs 标记类零消费（坐实，随 A1-41 修复消解）

- **控件**: link ｜ **文档断言**: design.md §1 "负责语义化链接"；§10 "根节点保留 `nop-link` marker"。
- **live 实际**: marker 类真实输出（link.tsx L84），但全仓/live 级联零 CSS 规则消费（本复核 §1）——"语义化链接"在视觉上无任何承载，marker 目前是空承诺；对照 markdown 内链有完整链接语言（form-renderers.css L157–162）。
- **建议回写文案**: A1-41 修复落地后，在 §10 补视觉契约一句："`.nop-link` 承载链接视觉语言（`--primary` 前景 + underline + hover 反馈，dark 双轨），与 `.nop-markdown a` 同语"。

### DR-3 diff-view —— §2 "当前未注册" 状态声明过期（坐实）

- **控件**: diff-view ｜ **文档断言**: design.md §2 末句 "**当前未注册，需新增 renderer 到 `flux-renderers-content`**"。
- **live 实际**: 已注册并 shipped——`content-renderer-definitions.ts` L7 导入 `DiffViewRenderer`、L578–582 注册 `type: 'diff-view'`（defaultSchema `viewType: 'split'`）；R2-2b 卡亦按 lab 载体完成走查（5 场景全通）。
- **建议回写文案**: §2 末句改为 "已注册于 `flux-renderers-content`（`content-renderer-definitions.ts`）"。

### DR-4 alert —— "不在 renderer 中硬编码间距体系" vs renderer 内 `mt-2`/`gap-2`（轻微，措辞级）

- **控件**: alert ｜ **文档断言**: design.md §10 "视觉层复用 `@nop-chaos/ui` Alert primitive，**不在 renderer 中硬编码间距体系**"。
- **live 实际**: alert-renderer.tsx L101 actions 容器在 renderer 内硬编码 `mt-2 flex items-center gap-2`（8px 顶距 + 8px 间距）。单点 utility 尚不成"体系"，但与字面表述矛盾；且该行正是 E4-1 的修复落点。
- **建议回写文案**: 二选一：① E4-1 修复（加 `col-start-2`）同 PR 把 actions 容器类串的取舍在 §10 补注"actions 行间距由 renderer 以 utility 表达，列归属由 ui grid 契约承载"；② 若 R2-4 意欲严格化，则把 `mt-2` 下放 ui alertVariants（如 `*:data-[slot=alert-actions]:mt-2`），renderer 回归纯 slot 组装。

### DR-5 owner-doc-missing 登记（不新建）

- `docs/components/result/`：无 design.md（R2-2b result 卡按结构类契约走查完成；其 E2-50 actions 主次问题无 owner-doc 可对照）。

### DR-6 核对后无 drift 的项（记录避免重复排查）

- **status**（§10 投影 Badge/nop-status marker——live 一致）、**carousel**（§13 WCAG 2.2.2 暂停契约经卡内 A9 探针全过；无箭头定位断言）、**video**（§8 loadFailed 文案、§10 aria-live——video.tsx L59/L68 逐项一致）、**audio**（§8/§10 loadFailed + aria-live——audio.tsx L49 一致）、**qrcode**（canvas 库与 schema 断言一致，无 DPR 承诺）、**image**（无错误文案断言，A9-5 非 doc drift）、**card**（§6 imageClassName 契约、§8.1 刷新约定——卡内锚点全过）、**cards**（§4 selectionMode none 双关断言——卡内探针全过）、**empty/html/json-view/mapping/progress/separator/spinner**（断言与 live 一致；progress §2 "首版为线性…圆形后续补充"与卡内"环形缺口登记"口径一致，非矛盾）。

---

## 复核方法附注

- 每条均为 fresh browser context 重开页面 + 独立探针先行，再与原卡比对；未采信原卡数值。DOM/几何证据：`_tmp/r2-2b-review/ra-content.json`；像素证据：`_tmp/r2-2b-review/ra-pixels.json`；截图：`_tmp/r2-2b-review/ra/{link,markdown,status,alert,carousel,image,video,qrcode}/`。
- **Playwright 1.63 闭包坑再次复现**：首轮执行即因 evaluate 回调引用 node 侧 `roundRect` 报 ReferenceError——方法学第 ② 条（传真函数、参数经 evaluate 传入、辅助函数必须内联进回调）再次验证为硬约束。
- **像素采样口径**：众数底 + 最远像素簇（top-20 均值）；fg 簇在 status/video 四个样本中均精确命中 DOM 计算色或贴近其抗锯齿均值，两口径差已逐条注明。dark badge 底采样修正（药丸内体 vs 页面 surface）提示后续采样器对圆角药丸区域应内缩 2px 再取众数。
- content 域另一并行复核路（review B，`rb-*` 探针）与本路共享 `_tmp/r2-2b-review/` 目录、互不覆盖（前缀隔离）。
- 本复核未修改任何产品代码；除本文件与 `_tmp/r2-2b-review/`（ra-\* 前缀 + ra/ 截图）外无其他写入（cards/、ledger.md、docs/components/、packages/、interactions.mjs 均只读）。

**总裁决：9/9 保留（P1 ×2、P2 ×3、P3 ×4），0 降级，0 驳回；数值修正 1 处（#4 dark 底口径 + light 2.26→2.13），证据/根因锐化 3 处（#1 live 级联扫描 + markdown 链接对照、#2 表格收缩宽度 19px + 跨包样式归属、#5 actions colStart=auto 机制）；drift 清单 4 条待回写（DR-1/DR-2/DR-3/DR-4）+ missing 登记 1 条（DR-5 result）+ 无 drift 记录 15 控件（DR-6）。**

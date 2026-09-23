# [review] R2-1c 可视化域走查 — 独立复核

- **批次**: R2-1c ｜ **复核日期**: 2026-09-23 ｜ **复核人**: 独立复核 agent（fresh session）
- **口径**: `docs/skills/visual-page-quality-inspection-prompt.md`（C6 画布判据/像素探测/误报排除；先独立取证、再与原发现比对）
- **方法**: 全部 11 条均**重开页面、重截同态截图、重跑同判据探针**（fresh Chromium, DPR=2, 1280×800 / 800×800, classic light+dark），其中 3 条叠加源码核实（map readFeatures / ol.css import / theme-tokens 令牌对）。探针与原始输出：`_tmp/r2-1c-recheck/*.mjs`；截图：`_tmp/visual-inspection-2026-09-23/r2-1c-recheck/`。dev server 未重启（127.0.0.1:4175）。
- **对照证据交叉说明**（任务指定）：scada B1-02 的令牌对证据（波 3：`packages/theme-tokens/src/styles.css` dark 块 `--secondary: 255 92% 86%` × `--secondary-foreground: 217 89% 84%`——两者均为浅色，配对本征破损）与波 1 的运行时同值证据（secondary 实测 rgb(203,186,252) 底 / rgb(178,206,251) 字）**完全互洽**：dark 块令牌换算值 = 运行时 computed 值 = 对比度 1.10:1，两条证据指向同一根因，无矛盾。

## 汇总表

| #   | 发现                               | 页面              | 原判级 | 复核结论                   | 关键复核证据                                                                                                                 |
| --- | ---------------------------------- | ----------------- | ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | C6-01 图表零内容+SVG 溢出 2.2 倍   | dashboard-demo    | P1     | **保留**                   | svg attr 533×300 / 面板 260×184 / chart 体 242；series=0、axis=2、legend "Sales"                                             |
| 2   | C1-01 透视明细格全空白             | pivot-table-demo  | P1     | **保留**                   | canvas0 转储逐格目检：明细 0 字形、小计正常；console 0 告错                                                                  |
| 3   | C6-01 Region 画布整版空白          | map-demo          | P1     | **保留**                   | 像素采样 Region/自定义 0/2560、Pin 21/2560 对照；源码 map-layer-manager.ts:148 `readFeatures` 无 `featureProjection`         |
| 4   | E1-01 hierarchy 节点 61×27 不可读  | graph-demo        | P1     | **保留**                   | hierarchy 6 节点全 61×27；flow 同数据 184×56；卡内 ~80% 空白                                                                 |
| 5   | C4-01 grid 壳层不弹性              | three-canvas-demo | P1     | **保留**                   | 1280 fresh load 即 section 1218/750 纵向破版；resize→800 sw1124/800 精确复现                                                 |
| 6   | B1-02 secondary/destructive 对比度 | scada-demo        | P1     | **保留**                   | secondary light 3.05 / dark 1.10（与原值全同）；destructive 复算 3.31/2.06（原 3.78/2.18，结论不变）；令牌对本征破损源码坐实 |
| 7   | C4-01（族引用）800 横向溢出        | scada-demo        | P1     | **保留**（附触发条件备注） | sw1124/800 复现，但仅 **resize 路径**；fresh load@800 无溢出；R2-3c 族归属核实成立                                           |
| 8   | A6-01 拖拽无 ghost/落点指示        | dashboard-demo    | P2     | **保留**                   | 拖拽中 DOM 扫描无 ghost/drop-indicator；源码 editor-canvas.tsx `handleDragOver` 仅设 dropEffect                              |
| 9   | C6-01 3D 画布未按 DPR 缩放         | three-canvas-demo | P2     | **保留**                   | attr 984×494 == CSS 984×494 @DPR2；对照组 scada attr 1972=986×2 成立                                                         |
| 10  | A3-01 ol 控件无样式超小            | map-demo          | P2     | **保留**                   | `+` 10.4×22 / `−` 9×22；`.ol-zoom` static 582×22；`ol-hidden` 可见 582×20；attribution 0×0；`olCssLoaded=false`              |
| 11  | B5-02 dark info 徽标 1.5:1         | graph-demo        | P2     | **保留**（数值修订 1.1:1） | info 三徽标 rgb(178,206,251) on rgb(203,186,252) = **1.10:1**；warning 9.21 / success 9.78 正常                              |

**总评：11/11 保留，0 降级，0 驳回。** 其中 2 条附数值/触发条件级备注（#6 destructive 合成背景、#7 溢出触发路径），均不动摇原结论与判级。

---

## 逐条复核

### 1. [R2-1c-C6-01] dashboard-demo 图表零图形内容且 SVG 溢出 2.2 倍 — **保留**

- **原发现摘录**: recharts 图表零图形内容，svg 533 vs 面板 242，line/bar/pie=0，仅孤立轴线被裁。
- **独立取证**（`_tmp/r2-1c-recheck/dash-probe.mjs`）: `.nop-chart svg` width attr **533**、viewBox `0 0 533 300`、渲染 rect 533×300；所属面板 `[data-slot=dashboard-editor-panel]` **260×184**（overflow hidden），`.nop-chart`/`chart-canvas` 实时布局宽 **242** → 溢出 2.2 倍，且**纵向也溢出**（chart 300 vs 面板 184）。`seriesCount=0`（line/bar/pie/area/scatter 均无）、`curveCount=0`、`axisCount=2`、legend 文本 "Sales"；`sr-only` 数据摘要含 Jan–Jun Sales 值 → **数据在场、几何缺席**。截图 `dashboard-c6-light.png` 目视同证：面板内仅一段轴线+虚线网格。
- **结论**: 与原发现完全一致（数值逐项吻合）。容器实测 242 而 svg 恒 533，支持原"测量节点与实际渲染宽度脱节"的根因方向。P1 成立（核心演示内容不可见）。
- **备注**: 原卡另称 Preview 态同症，本轮未单独复测 Preview（编辑态已足以定案，不影响结论）。

### 2. [R2-1c-C1-01] pivot-table-demo 透视明细格全空白 — **保留**

- **原发现摘录**: Sales Pivot 明细格 0 字形，仅小计行有值；数据源 sales 均 >500 不应被过滤；console 0 错误。
- **独立取证**（`pivot-probe.mjs`）: canvas0（1168×840 @DPR2, css 584×420, DPR 一致）全量 `toDataURL` 转储为 `pivot-canvas0-recheck-dump.png`，逐格目检：**North/South 的 Q1/Q2/Q3 明细行销售额/利润格全部空白**；小计行 4050/810/2800/515（North）与 3000/505/2500/500（South）正常。容器 `scrollWidth==clientWidth==584`（无裁切），console error/warning = 0。整页截图 `pivot-default-light.png` 同证。
- **结论**: 原发现成立，P1 判级成立（透视表核心产出——明细×指标交叉值——缺失，分析任务不可完成）。

### 3. [R2-1c-C6-01] map-demo Region 画布整版空白（投影根因）— **保留**

- **原发现摘录**: 两张区域卡 0/2560 非白像素；根因 `readFeatures` 缺 `featureProjection:'EPSG:3857'`；Pin 卡 `fromLonLat` 正常构成对照。
- **独立取证**:
  - 运行时（`map-probe.mjs`）: 64×40 downsample 像素采样（alpha>10 且非近白计为内容）——**Region 区域着色 0/2560、自定义边界（geojsonSource）0/2560、Pin 点位聚合 21/2560**（原卡记 22，同量级），空态卡无 canvas。DPR 尺寸全部一致。console 0 告错（数据包内建、加载成功，纯渲染缺陷成立）。
  - 源码: `packages/flux-renderers-map/src/map-layer-manager.ts:148` `new api.GeoJSON().readFeatures(build.featureCollection as never)` **确无任何 options**（无 `featureProjection`/`dataProjection`）；同文件 `setPinLayer` 走 `api.fromLonLat([lng,lat])`，同页对照组关系与原卡描述一致。
- **结论**: 像素证据与源码证据双坐实，P1（贴近 P0）判级维持。

### 4. [R2-1c-E1-01] graph-demo hierarchy 默认视图节点 61×27 不可读 — **保留**

- **原发现摘录**: hierarchy 6 节点 61×27，flow 同数据 184×56，缺 fitView，卡内 ~80% 空白。
- **独立取证**（`graph-probe.mjs` + 截图 `graph-default-light.png`）: `.nop-graph-node` 遍历——Trace Hierarchy 卡 **6×{61,27}**、Flow Layout 卡 **6×{184,56}**，逐像素级吻合原值；截图目视：hierarchy 节点文字不可辨、卡片大面积留白，flow 清晰可读，两卡同数据。附带复验原卡 C2-01 上下文：控制条 rail {x:360,w:79} 与 1 个节点求交命中（与原记录一致）。
- **结论**: 保留，P1 成立（首屏关键信息不可读）。

### 5. [R2-1c-C4-01] three-canvas-demo grid 壳层不弹性 — **保留**

- **原发现摘录**: 1280 即纵向破版（section 1218/750）；800 视口 sw1124；canvas 内联 986 冻结、section 恒 1100。
- **独立取证**（`three-probe.mjs` / `resize-probe.mjs` + 截图）:
  - fresh load 1280×800: `main>section` **scrollHeight 1218 / clientHeight 750**（精确复现）；宽度链 canvas 984(内联) → three-canvas 986 → page-body 1018 → nop-page 1018 → 外层 section max-w-[1100px] 1100 → `main.h-screen.grid.place-items-center` 1280。截图目视：深色画布明显绘出 rounded-3xl 卡片下边界。
  - **resize 路径**（1280 载入 → setViewport 800）: html **scrollWidth 1124 / 800**（精确复现原值），canvas 内联宽冻结 984px、section 冻结 1100。
  - fresh load 800×800: sw 800/800 **无横向溢出**（canvas 以 636 挂载）。
- **结论**: 保留。默认视口纵向破版在 fresh load 即复现，是本条 P1 的充分依据；横向溢出 1124 复现但依赖 resize 路径（见 #7 备注），不改判级。

### 6. [R2-1c-B1-02] scada-demo secondary/destructive 按钮对比度 — **保留**

- **原发现摘录**: secondary 蓝字紫底 light 3.05 / dark 1.10；destructive light 3.78 / dark 2.18；12.8px 非大字需 ≥4.5；波 3 令牌对证据与波 1 运行时同值待对照。
- **独立取证**（`scada-probe.mjs` + `okmath.mjs` + 源码）:
  - 运行时: Fit/Center（secondary）light `rgb(10,71,169) on rgb(166,137,250)` = **3.05**；dark `rgb(178,206,251) on rgb(203,186,252)` = **1.10**——与原值**逐位一致**。destructive（故障/触发）12.8px、28px 高。
  - 令牌对（波 3 证据核实）: `packages/theme-tokens/src/styles.css` classic dark 块 `--secondary: 255 92% 86%`（→rgb(203,186,252)）× `--secondary-foreground: 217 89% 84%`（→rgb(178,206,251)）→ 换算对比度 **1.10**；light 块 `255 92% 76%` × `217 89% 35%` → **3.05**。**令牌换算值 = 运行时 computed 值**，两波证据互洽，配对本征破损（dark 下浅字浅底）坐实。
  - destructive 数值修订: 原卡 3.78/2.18 是以纯白/估测底合成；本次按 oklab 精确换算（oklab 不透明值 = rgb(239,67,67)/rgb(217,38,38)，即 `--destructive` 两主题值）合成实际底色后为 **light 3.31**（10% tint over white）、**dark 2.06**（20% tint over rgb(55,62,71) 工具栏底）。数值略降但**全部 <4.5**，方向与判级不变。
  - 截图 `scada-dark.png` 目视：dark 下 Fit/Center 为无可读文字的浅紫块，与原目视描述一致。
- **结论**: 保留，P1 维持（dark secondary 标签不可读 = 控件语义失效；light 3.05 为 P2 量级合并升 P1 的原逻辑不受影响）。修复面应落在令牌对本身（连带 #11）。

### 7. [R2-1c-C4-01 族引用] scada-demo 800 视口横向溢出 — **保留（附触发条件备注）**

- **原发现摘录**: 800 视口 html sw1124/800；canvas 内联 986 冻结、section 恒 1100；归 R2-1a「窄视口 flex/固定壳层（R2-3c 候选）」族。
- **独立取证**（`resize-probe.mjs`）: resize 路径（1280 载入→800）**sw 1124/800 精确复现**，canvas 内联冻结 986px、section 冻结 1100；**fresh load 800 无溢出**（sw 800，canvas 以 638 挂载，section 752）。1280 下 C1/C6 全过（sw1280、section 750/750、canvas attr 1972=986×DPR2）——与原卡"1280 下无溢出"一致。
- **族关系核实**: R2-1a summary.md 明文登记「窄视口（~800px）flex 收缩/固定壳层塌陷族…渲染器侧根因按 roadmap Rule 3 由 R2-3c 滚动承接（R2-3c 候选）」；本条根因（grid 壳层不收缩 + 画布内联宽挂载后冻结、不随容器 resize 重建）属同一"固定壳层窄视口塌陷"域，归族成立；但其**画布内联宽冻结**子根因（three-canvas/scada 特有，flex/折行族所无）值得在 R2-3c 立项时单列。
- **结论与备注**: 保留。溢出真实可复现，但**触发条件是"宽载入后缩窗"而非"窄视口直接打开"**——建议在台账标注该触发路径（用户从最大化缩到半屏是常见操作，缺陷仍真实；族判级 P1 维持在 three-canvas 主条目上，本引用条目随族）。

### 8. [R2-1c-A6-01] dashboard-demo 拖拽无 ghost/落点指示 — **保留**

- **原发现摘录**: 拖拽中仅源项变灰，无 ghost、无 drop-target 指示，画布与拖拽前无差别。
- **独立取证**（`dash-probe.mjs` + 截图 `dashboard-dragmid-light.png`）: 合成 HTML5 DnD（dragstart→dragover@70%,70%）后全 DOM 扫描 `ghost|dragging|drop|indicator|placeholder|preview`，**无任何 ghost/drop-indicator 元素**（仅命中 1 个 select 的属性误报）；拖拽中帧与拖拽前帧画布区域逐像素无差别。源码双证：`editor-canvas.tsx` `handleDragOver` 仅 `preventDefault()` + `dropEffect='copy'`，无任何视觉反馈状态；`editor-palette.tsx` 为原生 `draggable` 无自定义 ghost。
- **结论**: 保留，P2 成立。备注：HTML5 DnD 有浏览器级源元素拖影（非页面提供），原发现"无 ghost"指页面级反馈，表述成立；probe 注入的 drop 因 DataTransfer 未复用而未落位，属探针自身限制，不影响本条判定（落位问题归 G3-01，不在本次范围）。

### 9. [R2-1c-C6-01] three-canvas-demo 3D 画布未按 DPR 缩放 — **保留**

- **原发现摘录**: attr==CSS（984×494），DPR2 期望翻倍；scada 对照组 attr=CSS×DPR 全过。
- **独立取证**（`three-probe.mjs` / `resize-probe.mjs`）: three-canvas 画布 `attr 984×494 == css 984×494` @ `devicePixelRatio=2`（期望 1968×988），1280/800、内联 `width:984px`；**对照组坐实**：scada 画布 `attr 1972 = css 986 × 2`，DPR 链正确。原卡"scada-canvas 同仓对照组 c6=true，证明是个体缺失"的论证结构成立。
- **结论**: 保留，P2 成立（Retina 半分辨率渲染）。

### 10. [R2-1c-A3-01] map-demo ol 控件无样式超小 — **保留**

- **原发现摘录**: 缩放钮 10.4×22 / 9×22；`.ol-zoom` 582×22 静态置顶；`ol-hidden` 控件仍可见；attribution 0×0；全仓 ol.css import=0。
- **独立取证**:
  - 运行时（`map-probe.mjs`）: `.ol-control button` —— `+` **10.4×22**、`−` **9×22**（原值逐位一致；远低于 WCAG 2.5.8 的 24×24）；`.ol-zoom` 容器 **582×22、computed position: static**（bottom/left:8px 对静态元素无效，styles.css 定位覆盖全部落空）；`.ol-rotate.ol-hidden` **display:block、可见 582×20**（`ol-hidden{display:none}` 规则缺失）；attribution **0×0**。样式表扫描 `olCssLoaded=false`（无任何 `.ol-zoom{position:absolute}` 规则）。
  - 源码: 全仓 `grep -rn "ol/ol.css"` 于 `packages/`+`apps/` **0 命中**；`packages/flux-renderers-map/src/styles.css` 的 `.ol-zoom` 定位规则确实存在但以 ol.css 的 `position:absolute` 为前提。
- **结论**: 保留，P2 成立。修复方向（包入口引入 `import 'ol/ol.css'`、保留令牌化覆盖）经源码核实可行。

### 11. [R2-1c-B5-02] graph-demo dark info 徽标 1.5:1 — **保留（数值修订为 1.1:1）**

- **原发现摘录**: dark 下 agent/tool_call/model_call 徽标浅紫实心无字，info `rgb(178,206,251) on rgb(203,186,252)` ≈1.5:1；warning/danger/success 正常。
- **独立取证**（`graph-probe.mjs` dark 切换 + 截图 `graph-dark-badges.png`）: 全部徽标采样——**info 三枚（agent/tool_call/model_call）`rgb(178,206,251)` on 不透明 `rgb(203,186,252)` = 1.10:1**（原卡 1.5 系合成口径差异，实测更差）；warning 9.21、danger 3.62、success 9.78 均可读（与原"仅 info 失效"一致）。截图目视：info 徽标为无字浅紫胶囊。交叉根因：该两色即 dark `--secondary`/`--secondary-foreground` 换算值，`packages/ui/src/components/ui/badge.tsx:13` `secondary: 'bg-secondary text-secondary-foreground'` → **与 #6 scada B1-02 同一破损令牌对**，两发现应合并为同一根因修复（改令牌对一处，两症状同消）。
- **结论**: 保留，P2 成立；对比度数值按实测修订为 1.10:1（比原值更严重，不影响判级）；归族建议从 local 升为与 #6 合并（同令牌根因）。

---

## 复核过程产物索引

- 探针: `_tmp/r2-1c-recheck/{lib,dash-probe,pivot-probe,map-probe,graph-probe,three-probe,resize-probe,scada-probe,oklab,okmath}.mjs`
- 截图: `_tmp/visual-inspection-2026-09-23/r2-1c-recheck/{dashboard-c6,dashboard-dragmid,dashboard-postdrop,pivot-default-light,pivot-canvas0-recheck-dump,map-default-light,graph-default-light,graph-dark-badges,three-canvas-1280-light,three-canvas-800-light,three-resize800,scada-resize800,scada-light,scada-dark}.png`
- 源码核实点: `packages/flux-renderers-map/src/map-layer-manager.ts:148`（readFeatures 无投影参数）、`packages/flux-renderers-map/src/styles.css`（ol 定位覆盖依赖 ol.css）、全仓 ol.css import=0、`packages/theme-tokens/src/styles.css:195-198`（classic dark secondary 令牌对）、`packages/ui/src/components/ui/badge.tsx:13`、`packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:175`（handleDragOver 无视觉反馈）
- 探针遗留: 探针运行后的 `localStorage` 均已 `clear()`，无脏布局遗留。

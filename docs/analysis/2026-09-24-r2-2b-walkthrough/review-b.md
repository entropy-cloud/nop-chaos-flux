# [review-b] R2-2b 批二（data 13 卡 + layout 8 卡 + mobile 5 卡）独立复核（复核 agent B，fresh session）

- **日期**: 2026-09-24 ｜ **口径**: `docs/skills/visual-page-quality-inspection-prompt.md` 阶段 3
- **复核人**: plan 497 Phase 2 独立复核 agent B（与走查执行者无共享上下文）
- **环境**: dev server `http://127.0.0.1:4175`（curl 200）；Playwright 1.63 chromium；dark 一律显式 `document.documentElement.setAttribute('data-mode','dark')`（emulateMedia 无效）；对比度数值判读一律 PNG 像素采样（采样器复用 `_tmp/r2-2b-probes/w5-png.mjs`；像素取样策略为"框内距背景色最远像素 = 文本像素"）
- **范围**: P2 ×9 全查（B5-89、A9-94、A7-155、F5-87、A9-121、B1-125、A9-126、E4-157、B1-158）+ P3 抽样 ×5（E6-123、F4-90、A1-152、A1-156、A9-181）+ tree focus ring watch 复证 ×1，共 15 项
- **复核方式**: 全部 15 项均重开页面、重截同态截图、重跑探针（探针 `_tmp/r2-2b-review/rb*.mjs` 共 14 个，原始 JSON `rb-*.json` 共 15 份，截图 `_tmp/r2-2b-review/rb/<control>/` 共 17 张），先独立取证、再与原发现比对；根因逐条下探至源码行级（A9-94/A9-121 先沿 `docs/references/quick-reference.md` 的 form/CRUD 契约再读源码，并做了 checkbox-lab 顶层 form 对照实验）。未采信任何原文数据。
- **总判定**: **14 条正式发现：保留 12 / 降级 1 / 驳回 1**；另 tree watch 复证维持。其中 **7 条保留项的根因/量化数据按本轮取证实质修正**（B5-89、A9-94、A7-155、A9-121、A9-126、B1-158、F4-90），对修复排布有实质影响。

## §0 汇总表

| #   | 发现 id         | 控件            | 原判级 | 独立取证结果                                                                                               | 结论                    | 备注                                                                                          |
| --- | --------------- | --------------- | ------ | ---------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| 1   | R2-2b-B5-89     | chart           | P2     | dark tick #666 像素实测 **3.27:1**（light 5.39:1）；网格线 dark **有渲染**（`--border/50`，~1.8:1 弱可见） | **保留 P2（根因修正）** | ui/chart.tsx 主题化规则存在但选择器与 recharts 3.8.1 DOM 空匹配（见 §1）；"网格不可见"证伪    |
| 2   | R2-2b-A9-94     | crud            | P2     | client-mode 表单在（`section.nop-form`）、按钮 0、Enter/点击均无提交通道；fetch-on-filter（有 id）按钮齐全 | **保留 P2（根因修正）** | 原卡 "仅 loadAction 存在时追加提交控件"**证伪**：真条件 = `schema.id ?? schema.name`（见 §2） |
| 3   | R2-2b-A7-155    | dropdown-button | P2     | 指针直移远角后 +200/+800/**+2000ms** 菜单均悬挂；入菜单再离开 +200ms 正常关                                | **保留 P2（机制精化）** | 同一关闭定时器 menu 侧生效、wrapper 侧失效（见 §3）；悬挂面比原卡更广                         |
| 4   | R2-2b-F5-87     | list            | P2     | 全页 pagination-root 0、6 场景皆无内建 bar、`showSizeChanger` 零消费——行为全部成立                         | **降级 P3**             | owner-doc `list/design.md` **L56 明文裁定** list 不内建分页 UI（见 §4 + drift D-3）           |
| 5   | R2-2b-A9-121    | query-filter    | P2     | 搜索/重置后 echo 与 scope 零变化复现；顶层 form 同链路对照实验**通过**                                     | **保留 P2（根因收敛）** | 原卡假设②（definition→region 丢 submitAction）证伪，收敛为嵌入 form 子树影子 scope（见 §5）   |
| 6   | R2-2b-B1-125    | stat-tile       | P2     | light up **2.46** / light down ≈3.6 / dark down **3.69** / dark up 过——四象限与原卡一致                    | **保留 P2**             | `stat-tile-renderer.tsx` L149-150 `text-success/text-destructive` 直作 12px 文本色            |
| 7   | R2-2b-A9-126    | table           | P2     | `data-striped` 落 DOM + computed bg 全透明复现；但 **CSS 消费规则存在**                                    | **保留 P2（根因修正）** | 断点 = `--table-striped-bg: transparent` 占位值（theme-tokens L98）；修复比原卡更小（见 §7）  |
| 8   | R2-2b-E4-157    | timeline        | P2     | alternate dot cx 307/1213 贴两外缘、轴线 x=760 中线悬空、left 模式 dot=axis=313 正基线——逐项复现           | **保留 P2**             | 行级根因补齐：L321-327 alternate 分支未给 dot 任何中轴定位（见 §8）                           |
| 9   | R2-2b-B1-158    | wizard          | P2     | dark 内联错误 **7.49:1 通过**（原卡 2.44）、dark 摘要 **3.78:1 失败**（原卡 4.93 通过）——dark 双数据反转   | **保留 P2（数据反转）** | 原卡 dark 数为白底合成伪象（方法学③）；两红不同源双主题坐实（见 §9）                          |
| 10  | R2-2b-E6-123    | sparkline       | P3     | 9 个 sparkline-root textContent 全空                                                                       | **保留 P3**             | `SparklineSchema`（sparkline-schemas.ts L10-30）确无 `label` 键                               |
| 11  | R2-2b-F4-90     | chart           | P3     | DOM 无任何轴标题文本复现                                                                                   | **保留 P3（根因精化）** | label 并非无消费点——被绑到 recharts `name=` prop（tooltip/aria 用），不渲染标题（见 §11）     |
| 12  | R2-2b-A1-152    | collapse        | P3     | `transition: all 0s`、+80ms 已终值 44px、收起即卸载、chevron 对照 0.15s——全复现                            | **保留 P3**             | collapse-renderer.tsx L238 裸透传 Base UI Panel，ui/collapsible.tsx 零动画类                  |
| 13  | R2-2b-A1-156    | steps           | P3     | 可点击热区（indicator Button）computed cursor = **pointer**；elementFromPoint 命中链全程 pointer           | **驳回**                | 原卡测了外包裹 div（非交互元素）；热区 Button 经 `nop-haptic` 获得 pointer（见 §13）          |
| 14  | R2-2b-A9-181    | countdown       | P3     | running/finished 样式四元组零差分、`aria-live="off"`、全页零播报节点、onFinish 恰好一次——全复现            | **保留 P3**             | `data-finished` 出 DOM 但 CSS 消费 0 命中；missing-config 分支不一致同卡注记                  |
| 15  | tree focus ring | tree            | watch  | focus 节点行 rect w=882 全宽、`:focus-visible` 蓝 ring 以整行宽度绘制                                      | **维持 watch**          | 符合 WCAG 2.4.11；与原卡裁定一致，无改判                                                      |

---

## 逐条复核

### 1. [R2-2b-B5-89] dark 图表轴刻度 #666 — 保留 P2，根因修正（"库默认回退"升级为"主题化规则空匹配"）+ 网格线子断言证伪

**原发现摘录**: dark 轴刻度文字仍 recharts 默认字面 #666 ≈3.1:1 <4.5:1；归因 `chart-renderer.tsx` 未传 `tick`/`axisLine` 主题色，库默认回退。网格线（CartesianGrid 默认 #ccc 系）dark 不可见。

**独立取证**（`rb1-chart.mjs` → `rb-1-chart-b5-89-f4-90.json`；`rb1b-chart-pixels.mjs` → `rb-1b-chart-tick-pixels.json`；`rb1c/rb1d/rb1e` CSS 诊断；截图 `rb/chart/rb-{light,dark}-settled-1280.png`、`rb-{light,dark}-ticks.png`）:

- dark tick 填充 `rgb(102,102,102)`（与 light 完全同值）坐实；PNG 像素实测 dark tick 对暗底 rgb(13,18,24) = **3.27:1**（原卡 ≈3.09，同向同结论），light = 5.39:1 过。12px 小字，B5 fail 成立。
- **网格线子断言证伪**：dark 下网格线**有渲染**——`[&_.recharts-cartesian-grid_[stroke]]:stroke-border/50` 规则生效，stroke 实测随主题翻转（light `oklab(0.926/0.5)` → dark `oklab(0.285/0.5)`），网格行像素实测Painted ≈1.8–1.9:1（弱可见非不可见）。装饰性参照线弱对比是常态，原卡"绘图区失去网格参照"表述过重。
- **根因（行级，修正）**：主题化通道**其实存在**——`packages/ui/src/components/ui/chart.tsx` L90 类组含 `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground`，Tailwind 编译产物实测在样式表中：`.recharts-cartesian-axis-tick text { fill: hsl(var(--muted-foreground)) }`（rb-1e 探针命中该规则全文）。但本仓安装 **recharts 3.8.1**，其 `CartesianAxis` 渲染的 tick 值文本是 `<text class="recharts-text recharts-cartesian-axis-tick-value">`（`recharts/es6/cartesian/CartesianAxis.js` L213/L224），挂在 `g.recharts-cartesian-axis-ticks` 下——**不再是 `.recharts-cartesian-axis-tick` 组的后代**（3.x 中该类只挂在含 tick 线的 `<g>` 上，其内无 text）。选择器空匹配 → fill 落回 SVG presentation attribute `fill="#666"` → 双主题同色。网格规则仍生效恰因 `.recharts-cartesian-grid [stroke]` 的 DOM 形状未变。

**结论**: **保留 P2**。修复方向改判：不是给 chart-renderer 补传 tick prop（原方案），而是**修 ui/chart.tsx L90 选择器适配 recharts 3.x**——`[&_.recharts-cartesian-axis-tick_text]` 改为 `[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground`（或直接传 `tick={{ fill: 'hsl(var(--muted-foreground))' }}`）；该修复同时惠及所有 recharts 图表面。归族 R2-4 维持，实例定性从"未传主题色"修正为"shadcn 图表样式层与 recharts 3.x DOM 形状脱节"。

### 2. [R2-2b-A9-94] client-mode queryForm 无提交控件且 Enter 不触发 — 保留 P2，根因两层修正（原"loadAction 条件"证伪）

**原发现摘录**: 渲染器仅在 loadAction 存在时追加提交控件，本地过滤模式无任何提交通道；Enter 提交惯例缺失；探针 `hasForm: false`。

**独立取证**（`rb2-crud.mjs`/`rb2a-scen.mjs`/`rb2b-crud-diff.mjs` → `rb-2-crud-a9-94.json`、`rb-2b-crud-differential.json`；截图 `rb/crud/rb-clientmode-{after-enter-light,dark}.png`）:

- client-mode 场景：`[data-slot="crud-query"]` 存在、**表单存在**（`section.nop-form`，data-form-mode=normal）、keyword input 存在、按钮清点仅 `["折叠"]`（scope-debug 钮）、`[data-slot="form-actions"]` **不存在**。fill('Alpha')+Enter → footer `Query: none`、rows 3 不变。行为成立。
- **决定性差分（证伪原根因）**：`client-mode fetch-on-filter` 场景的 crud **同样没有 loadAction**（走 `onQuerySubmit: refreshSource`），却渲染了 `["搜索","重置"]`，点击搜索后 `Query: Beta`、行过滤生效（`rb-2b` fofAfterSearch）。对比 fixture：fetch-on-filter 的 crud 节点**有 `id`**（crud-lab-page.tsx L444 `id: 'client-mode-fetch-crud'`），client-mode baseline 的 crud **既无 id 也无 name**（L400-422）。真条件在 `data-schema-validation.ts` L91：`const crudComponentId = schema.id ?? schema.name;`——**默认 搜索/重置 按钮仅在 crud 节点声明 id/name 时注入**（L92-107），与 loadAction 无关。同险面扩大：场景 2 queryCrud（无 id，L148-196）同样零提交按钮。
- **Enter 层**：`form.tsx` L447-487 已实现 Enter-to-submit（`handleSectionKeyDown`），但 L482 `if (!submitAction) return;`——submitAction 来自 `props.events['submitAction']`，而 crud 的 queryForm region 构造（`data-schema-validation.ts` L64-70）**从不声明 submitAction**（提交走按钮的 `component:querySubmit` 组件动作旁路）。故**一切 crud queryForm（无论有无按钮/loadAction/id）Enter 均不提交**——queryLoad 场景实测 Enter 后 `Query: none`、点搜索后 `Query: Beta`，与原卡对照一致。
- **原探针 `hasForm:false` 为伪象**：渲染器出的是 `<section class="nop-form">` 而非 `<form>` 标签，按标签查询必然落空——表单与输入框一直都在，缺的只是 actions 区。

**结论**: **保留 P2**（行为两半均坐实且影响面比原卡更大：无 id/name 的任何 queryForm crud 都会静默失去提交 UI）。修复方向改判：① `createCrudQueryFormRegion` 对"未声明 id/name"回退路径寻址或对缺失发 schema 诊断（当前静默零按钮）；② queryForm region 显式降 `submitTo=querySubmit` 语义使 Enter 可用（复用 form.tsx 既有 Enter 通道）；③ fixture 侧给 crud 补 id 可即刻解锁场景 9。归族 R2-3 维持，实例定性修正为"默认动作注入条件暗依赖 id/name + Enter 通道未接线"。

### 3. [R2-2b-A7-155] hover trigger 菜单指针离开不关 — 保留 P2，量化加重 + 机制精化

**原发现摘录**: 阶梯移出 trigger 后 +200/+800ms 菜单均 open；150ms 宽限关闭定时器在 React 合成 onMouseLeave 层未生效；入菜单再离开可正常关。

**独立取证**（`rb3-ddb-hover.mjs` → `rb-3-ddb-hover-mid.json`；截图 `rb/dropdown-button/rb-hover-{open,after-leave}-light.png`）:

- 悬停 "Hover Menu" 开菜单（aria-expanded=true、1 个可见 menu）；指针直移远角后 **+200ms / +800ms / +2000ms** 菜单均悬挂——比原卡的 300–1000ms 观察窗更广，**永不自动关闭**。
- 差分实证（新增）：指针先入菜单再移出远角，**+200ms 即正常关闭**（aria-expanded=false、0 可见 menu）。两条路径走的是**同一个** `scheduleHoverClose`（`dropdown-button-renderer.tsx` L73-79，150ms → `setOpen(false)`）——从 menu content 的 onMouseLeave（L105-107）触发时生效，从 wrapper 的 onMouseLeave（L96）触发时不生效。
- 机制精化：原卡"定时器在合成事件层未生效"表述过泛。数据支持的表述是：**受控 open 链路对"指针从未进入 popup"的 hover-open 会话不响应 wrapper 侧的 setOpen(false)**（或被 Base UI 悬停意图粘滞/合成再入抵消）；Esc/菜单项点击/外点关闭正常（原卡已证，受控通道本身可达）。原卡修复方向（下沉到 Base UI `openOnHover`+`delay` 原生通道，删除自管定时器）与本差分结论一致，维持为首选。

**结论**: **保留 P2**。文档化公开 prop（`trigger`，dropdown-button/design.md L20/L25）核心语义失效；恢复路径存在故不升 P1，与原卡一致。

### 4. [R2-2b-F5-87] list page 模式无内建分页条 — 降级 P3（行为成立，但属文档化设计决策；原 P2 定性不成立）

**原发现摘录**: `pagination.enabled` 只切数据不给出翻页可供性、`showSizeChanger` 死配置；终端用户翻页任务在纯 UI 层不可完成，P2。

**独立取证**（`rb5-combo.mjs` → `rb-5c-list-f5-87.json`；源码 `list-renderer.tsx`）:

- 行为全部复现：全文档 `[data-slot="pagination-root"]` 计数 **0**；6 个场景皆无内建分页 bar；场景 5（pagination via gotoPage）切片 4 条仅靠 fixture 外挂按钮翻页。源码核对一致：`infiniteActive = pagination.enabled && pagination.mode === 'infinite'`（L364）是唯一 footer 渲染分支（L562-615）；page 模式零 bar 分支。`showSizeChanger`（schemas.ts L316 "Host UI hint"）在 list 渲染层**零消费**（唯一消费点在 table 分页条链路，crud-renderer-schema-builders.ts L88 为 table 设置）。
- **改判依据（owner-doc）**：`docs/components/list/design.md` **L56 明文裁定**："`list` 不内建分页 UI 控件（页码按钮归独立 `pagination` renderer / 宿主）；`list` 只切片展示 + 派发事件。"——即"page 模式无分页条"是**已文档化的 ownership 决策**（list 只切片+句柄 `gotoPage`，L55），不是静默缺口。原卡 P2 的核心论据"AMIS 语义对标、作者写 enabled 期望分页器"属于产品演进诉求与跨库语义对齐问题，不构成"声明即生效"契约破坏；且 plan490 已为该场景提供 standalone pagination 收敛锚点。
- 剩余真实缺陷（维持立案、降级理由）：① `showSizeChanger` 死配置（文档 L32 仍列为字段——见 drift D-3）；② AMIS 背景作者对 `pagination.enabled` 的语义误读无任何 schema 诊断/flux-guide 提示——归 R2-3 契约诊断族（与 E6-123/A9-94 同向）。

**结论**: **降级 P3**。修复方向维持原卡②（schemas.ts 标注/移除 `showSizeChanger` + flux-guide 明示"page 模式翻页 UI 由宿主/独立 pagination renderer 负责"）；原卡①（补内建 bar）若要推进需先推翻 design.md L56 的 ownership 裁定，属设计评审项而非缺陷修复。

### 5. [R2-2b-A9-121] 搜索/重置回显链路静默失效 — 保留 P2，根因收敛（假设②证伪、假设①坐实）

**原发现摘录**: 提交后页面回显与 scope 均无变化；二选一根因：① setValue 落内嵌 form 子作用域（影子写入）；② definition→region 传递链路丢 `submitAction`。

**独立取证**（`rb4-qf.mjs` → `rb-4-qf-a9-121.json`；`rb4b-qf-diff.mjs` → `rb-4b-qf-differential.json`；截图 `rb/query-filter/rb-after-search-light.png`）:

- 复现成立：fill('hello') → 点 搜索 → `[data-testid="lab-qf-last-action"]` 仍 `Last action: `、scope 调试面板仍 `{"lastQuery": ""}`、全页无 "searched" 字样；点 重置 → 字段清空（重置钮接线正常）、`lastQuery` 依旧不变。
- **假设②证伪**：`query-filter-definition.ts` L52-54 `form.submitAction = schema.onSubmit` 降低存在；且 重置 按钮的 onClick 链（L70-73 `component:reset` + onReset）在 region 内**正常执行**（字段确实清空）——region 编译/事件传递通道是通的，"丢 submitAction"不成立。
- **假设①坐实（对照实验）**：checkbox lab 的**顶层 form**（submitAction + onSubmitSuccess `setValue path:'submitted'` + 页面 echo）实测 Submit 点击后 echo 翻转为 `"Submitted: checked / off"`（`rb-4b`）——同一套 form 生命周期派发（`form.tsx` L207-217）在顶层 form 上把 setValue 写到了 page scope 且可见。差异只剩**嵌入上下文**：query-filter 的 form 是 `props.regions.filterForm.render({ pathSuffix: 'filterForm' })`（query-filter.tsx L17-19）渲染的子树节点，其渲染 scope（`useRenderScope()`，form.tsx L55）不是 page scope；submitAction 以 `scope: lifecycleScope`（=form 节点渲染 scope，L140-148 无 importBindings 时透传）派发 → `setValue` 执行 `ctx.scope.update('lastQuery', value)`（`action-adapter.ts` L141-147）→ 写进 query-filter 子树 scope，页面级 `${lastQuery}` 读 page scope 永不可见。onReset 的 setValue 挂在同子树的按钮 onClick 上，同理不可见。

**结论**: **保留 P2**（查询主路径交互后零反馈、demo 自证失效，fixture 场景描述自称 "runs the embedded form submit pipeline"）。根因表述收敛为：**嵌入 form 子树的 action scope 落点契约未定义且未文档化**——裸 `path` 写入落在子树影子 scope，页面级读取不可见，且无任何诊断。修复方向改判：优先在 flux-guide/quick-reference 明确"form 生命周期/嵌套按钮 action 的 `path` 解析 scope"契约并给出跨 scope 寻址方式（或让 lifecycle setValue 显式写回 owner scope），同时在 schema 诊断层对"写后不可达"提供 warning；原卡"加诊断日志定位①/②"已完成——定位为①。归族 R2-3 维持（动作作用域解析面）。

### 6. [R2-2b-B1-125] delta 涨跌标注 12px 语义色对比度不达 — 保留 P2，数据微调一致

**原发现摘录**: light up 2.51 / light down 3.67 / dark down 3.76（dark up 10.03 过）。

**独立取证**（`rb6-timeline-wizard.mjs` stat-tile 段 → `rb-6-stat-tile-delta-pixels.json`；截图 `rb/stat-tile/rb-delta-{light,dark}.png`）:

- computed 色：light up `rgb(16,183,127)` / light down `rgb(239,67,67)`（12px/500 坐实）；dark up `rgb(38,217,157)` / dark down `rgb(217,38,38)`。
- 像素实测：light up 2.46:1（卡 2.51，容差内）、dark down **3.69:1**（卡 3.76，容差内）、dark up 通过；light down 像素取样受相邻深色文本干扰，按 computed 色对实测 stage 底 rgb(250,249,246) 解析 ≈3.6:1（卡 3.67，容差内）。四象限结论与原卡一致：3/4 组合失败、按 ≥4.5 判。
- 根因行级补齐：`stat-tile-renderer.tsx` L149-150 `DELTA_CLASS = { up: 'text-success', down: 'text-destructive' }`——语义令牌直作 12px 文本色；`--success` light `160 84% 39%`（theme-tokens L57）作为小字文本色不达。原卡修复方向（深浅变体/深档 + 图标保语义色）维持。

**结论**: **保留 P2**。归族 R2-4 语义令牌文本档子族维持。

### 7. [R2-2b-A9-126] stripe:true 斑马纹零视觉呈现 — 保留 P2，根因实质修正（"无 CSS 消费"证伪，断点=token 占位值）

**原发现摘录**: `data-striped` 落 DOM 但无任何 CSS 消费（行 className 无 `data-[striped]` 变体类）；修复方向为补消费类 + theme-tokens 增补 `--table-stripe-bg`。

**独立取证**（`rb5-combo.mjs` → `rb-5b-table-a9-126.json`；截图 `rb/table/rb-stripe-light.png`；样式表递归扫描）:

- 复现成立：场景 1 五行 `data-striped="true"/null` 交替、computed bg 全 `rgba(0,0,0,0)`；行 className 无 striped 变体类。
- **"无任何 CSS 消费"证伪**：live 样式表实测存在规则 `.nop-table tbody tr[data-striped]:not(:hover) { background: var(--table-striped-bg); }`（源码 `packages/ui/src/styles/table.css` L28-30）——schema → `data-striped` 属性（`table-renderer/table-body-row-rendering.tsx` L285，原卡行号正确，实际在 `table-renderer/` 子目录）→ CSS 规则 → 令牌，**四环全通**。
- **真正断点**：`packages/theme-tokens/src/styles.css` **L98 `--table-striped-bg: transparent;`**——令牌已声明但值是**占位 transparent**（全文件仅此一处，classic light/dark、glass 共用，dark 无覆盖）。值透明故规则"成功"地渲染出透明。design.md L58 对此有明文（"默认 transparent = AMIS 默认无条纹"）——文档与 live 一致，非 drift；但 schema 层 `stripe: true` 的作者预期与"零呈现"之间的落差无任何提示，A9/E5"声明状态应可见"fail 成立。

**结论**: **保留 P2**。修复改判为**一行值修复**：`--table-striped-bg` 给出真实双主题条纹色（如 light `color-mix(in srgb, var(--foreground) 3%, transparent)` 档），无需"补消费类/新增 token"；原卡方向中的 schema 诊断建议保留。归族 R2-3"属性落 DOM 但呈现未接"变体维持，实例定性修正为"链路全通、令牌占位值未兑现"。

### 8. [R2-2b-E4-157] alternate 模式几何断裂 — 保留 P2（几何复现 + 行级根因补齐）

**原发现摘录**: 中轴悬空无节点，节点贴两外缘（cx 307/1213），轴线 x≈762 无交叠。

**独立取证**（`rb6-timeline-wizard.mjs` timeline 段 → `rb-6b-timeline-e4-157.json`；截图 `rb/timeline/rb-modes-light.png`）:

- 逐项复现：alternate 两 item（y921/y963）dot cx **307 / 1213**（容器 301–1219 两外缘）、item 均全宽 918；轴线为**逐 item 独立 span**（`left-1/2`，x=760，h42 两段）与任一 dot 无交叠；对照 left 模式 dot cx = axis x = 313/314 逐点对齐（正基线）。
- 行级根因（补齐原卡）：`timeline-renderer.tsx` L321-327 dot 类组在 alternate 分支**只给 `mt-1`，无任何水平中轴定位**（left 有 `ml-[7px]`、right 有 `mr-[7px]`，alternate 没有对应的居中机制）——dot 随 flex 起始边落位；内容侧 `w-1/2` + `order-first`（L343-350）把第二个 item 的 dot 挤到对侧外缘。轴线本身 `left-1/2` 正确，但逐 item 独立 span + dot 不上轴 = 三段漂浮。原卡修复方向（容器相对单轴 + item 50% 交替 + dot 绝对定位于 left:50%）与代码结构吻合，维持。

**结论**: **保留 P2**。

### 9. [R2-2b-B1-158] 校验错误文字双主题互补失败 — 保留 P2，dark 双数据方向反转（原卡白底合成伪象）

**原发现摘录**: dark 字段内联错误 rgb(239,138,124) → 2.44:1（败）；dark 步级摘要 rgb(217,38,38) → 4.93:1（过）；light 内联 5.79 过、摘要 3.78 败；两处错误两种红。

**独立取证**（`rb6-timeline-wizard.mjs` + `rb6b-wizard-dark.mjs` → `rb-6c-wizard-b1-158.json`、`rb-6d-wizard-dark-precise.json`；截图 `rb/wizard/rb-err-{light,dark,dark2}.png`）:

- 双红不同源**双主题坐实**：内联错误 light `rgb(181,59,44)` / dark `rgb(239,138,124)`（主题化对）；步级摘要 light `rgb(239,67,67)` / dark `rgb(217,38,38)`（base destructive 恒值族）。
- **dark 真实 data-mode 像素实测（方向反转）**：内联错误 rgb(238,137,123) 对暗底 rgb(15,20,26) = **7.49:1 通过**——原卡 2.44 恰等于该前景色**对白底**的比值（2.443），系 DOM 合成基线回退白色的方法学③ 伪象，方向判反；步级摘要 rgb(217,38,38) 对暗底 = **3.78:1 失败**——原卡记 4.93"过"同样不成立（对暗底该色数学上限约 4.1）。即 **dark 侧真正的失败面是步级摘要而非字段内联**，与原卡正好相反。
- light 侧：摘要 rgb(239,67,67) ≈3.7–3.78 失败（原卡 3.78 确认）、内联 ≈5.7 通过（确认）。
- 根因行级：摘要 = `wizard-renderer.tsx` L635 `data-slot="wizard-step-error"` 的 `text-destructive`——base `--destructive`（light `0 84% 60%` = rgb(239,67,67)，theme-tokens L72；dark `0 70% 50%` = rgb(217,38,38)，L204）**作为文字色在双主题均 <4.5**（dark 侧问题是"过暗"而非原卡修复方向①所述"过亮/过淡"）；内联错误 = `.nop-field [data-slot='field-error'] { color: var(--nop-field-error, #b53b2c) }`（`flux-react/src/default-spacing.css` L138-141）+ playground 双主题值 `#b53b2c`/`#ef8a7c`（`apps/playground/src/styles.css` L165/L218）——**双主题均达标**，恰是正确范本。

**结论**: **保留 P2**（步级摘要失败面覆盖双主题，且为拦截态唯一面级反馈之一）。修复收敛为原卡方向②：摘要改走与 field-error 同类的 dark-aware 错误文字令牌对（一处类组修复）；方向①修正表述为"base `--destructive` 不应再被用作文字色（border/表面用途不受影响）"。原卡 dark 数据不采纳。

### 10. [R2-2b-E6-123] sparkline label 键静默丢弃 — 保留 P3

**原发现摘录**: 变体行/降级路径 6 图无标注；`SparklineSchema` 无 `label` 字段，渲染器零消费零诊断；契约键静默族第 6 例。

**独立取证**（`rb7-p3-batch.mjs` → `rb-7-sparkline-e6-123.json`；截图 `rb/sparkline/rb-variants-dark.png`）:

- 9 个 `[data-slot="sparkline-root"]` textContent **全空**（变体行 5 + 降级 3 + 组合位 1），复现成立。源码核对 `sparkline-schemas.ts` L10-30：`SparklineSchema` 仅 data/width/height/color/fill/smooth/min/max——确无 `label`；design.md 亦无 label 字段（漂移在 fixture 侧，见 §drift 排除）。

**结论**: **保留 P3**；修复方向（fixture 改伴行 text + R2-3 未知键 warning）维持。契约键静默族实例计数不变。

### 11. [R2-2b-F4-90] xAxis/yAxis label 从未渲染 — 保留 P3，根因精化（label 有消费点，但绑错 prop）

**原发现摘录**: `chart-renderer.tsx` L111 `xAxis` 仅取 dataKey，`label` 无消费点；`chart-y-axis.ts` 解析出 label 后渲染层未接。

**独立取证**（`rb1-chart.mjs` → `rb-1-chart-b5-89-f4-90.json`；源码核对）:

- 复现成立：全场景 SVG text 仅刻度值与图例（`allTexts` 无 "Month"/"Amount ($)"）。
- 精化：label **有**消费点——`xAxis.label` 被绑到 `<XAxis name={xAxis?.label}>`（chart-renderer.tsx L391/L432/L478/L516），yAxis label 经 `chart-y-axis.ts` L22/L33 解析为 `entry.label` 后同样进 `name=`（L434-439/L480-485/L517-524）。recharts 的 `name` 仅用于 tooltip/aria 语义，**不渲染轴标题**——原卡"无消费点"表述修正为"消费点绑在 `name` 上，渲染通道（`label={{value, position}}`）未接"。

**结论**: **保留 P3**；修复方向（XAxis/YAxis 传 recharts `label` prop 或自绘轴标题，与 B5-89 dark 配色一并处理）维持。

### 12. [R2-2b-A1-152] collapse 展开零动画 — 保留 P3

**原发现摘录**: CollapsibleContent `transition: all 0s`，+80ms 已终值，收起直接卸载；chevron 有 150ms 过渡形成割裂。

**独立取证**（`rb7-p3-batch.mjs` → `rb-7b-collapse-a1-152.json`；截图 `rb/collapse/rb-mid-80ms-light.png`）:

- 逐项复现：content `transitionProperty: "all" / transitionDuration: "0s"`；点击后 +80ms height 已达终值 44px（截图无过渡帧）；再点击收起后 content 从 DOM 卸载（present:false，零退出动画）；对照 chevron `transition: transform, translate, scale, rotate @0.15s`。
- 根因：`collapse-renderer.tsx` L238 `<CollapsibleContent data-slot="collapse-content">` 裸透传；`packages/ui/src/components/ui/collapsible.tsx` 为 Base UI Panel 直通封装，无任何高度动画类（对照 dropdown-menu.tsx 的 `data-open:animate-in` 范式）。

**结论**: **保留 P3**；修复方向（ui 层 Panel 补 `--collapsible-panel-height` 驱动的高度过渡）维持。

### 13. [R2-2b-A1-156] 可点击步骤无 pointer 光标 — 驳回（原卡测错元素；真实热区有 pointer）

**原发现摘录**: `[data-slot="steps-item"]` computed cursor "auto"（三态一致）；源码 indicator 类组仅 `disabled && 'cursor-not-allowed'`，无 `cursor-pointer`；悬停与纯文本无异。

**独立取证**（`rb7-p3-batch.mjs` → `rb-7c-steps-a1-156.json`；`rb7b-steps-hover.mjs` → `rb-7b2-steps-hover-hit.json`；源码核对）:

- cursor:auto 属实，但测的是 `[data-slot="steps-item"]`——**外包裹 div，非可点击元素**。可点击热区是 `steps-indicator` **Button**（`steps-renderer.tsx` L265-282，注释明示 G1-R4-视角8-02 契约"indicator button owns the whole step row"——整行热区正是这个按钮），类组含 **`nop-haptic`** → `packages/ui/src/styles/mobile.css` L110-113 `.nop-haptic { cursor: pointer; }`。实测 indicator Button computed cursor = **pointer**。
- 悬停行为实测：滚动步骤行入视口，鼠标悬停 item 中心，`elementFromPoint` 命中链 `SPAN(steps-indicator-circle)→BUTTON(steps-indicator)→LI(steps-item)`，命中元素 cursor 全程 **pointer**——用户悬停步骤行看到的就是手型光标，可供性存在。点击有效性（payload `steps-payload:s2|1|s2`）本轮亦复现。
- 原卡引用的源码"类组无 cursor-pointer"字面为真，但漏看了 `nop-haptic` 提供的 pointer（类组首项即是）；"无 hover 高亮"残留观察在原卡 A–H 表 A1 维度已自判 n/a（"steps 无 hover 反馈设计——可接受"），不构成可供性缺陷。

**结论**: **驳回**。核心断言（无 pointer 可供性）不成立；建议"hover:bg-muted/50"打磨意图转入 R2-4 交互反馈 watch（非缺陷条目）。原卡探针方法论教训：cursor 判读必须取 `elementFromPoint` 的实际命中元素，而非语义包裹层。

### 14. [R2-2b-A9-181] countdown 结束态零差分 + AT 零播报 — 保留 P3

**原发现摘录**: running/finished 样式完全相同（16px/400/同色），`data-finished` 仅属性翻转，`aria-live="off"` 无 AT 感知；missing-config 分支 role=status+polite 不一致；onFinish 恰好一次。

**独立取证**（`rb7-p3-batch.mjs` → `rb-7d-countdown-a9-181.json`；截图 `rb/countdown/rb-finished-light.png`）:

- 逐项复现：running 与 finished 两次采样 fontSize/fontWeight/color/classes 完全相同；`data-finished: "false"→"true"` 仅属性翻转；容器 `aria-live="off"`、无 role；全页扫描无任何 `[role="status"]`/`[aria-live]`/`.sr-only` 播报节点；`window.__c7finish === "finish"` 恰好一次。
- 根因行级：`countdown.tsx` 主分支 L236-237 输出 `data-finished` + `aria-live="off"`，**`data-finished` 的 CSS 消费者全仓 0 命中**（仅测试文件引用该属性）——属性翻转载体已备好、呈现/播报两端均未接；missing-config 分支 L222-223 `role="status" aria-live="polite"` 与主分支不一致，同卡注记。

**结论**: **保留 P3**；修复方向（finished 态一次 polite 播报 + `data-finished` 视觉档）维持。

### 15. [watch] tree 节点行 focus ring 全宽 — 维持 watch

**独立取证**（`rb7-p3-batch.mjs` → `rb-7e-tree-focus.json`；截图 `rb/tree/rb-focus-ring-light.png`）:

- focus() 树节点行后 `:focus-visible` 命中、boxShadow 含 `rgb(28,110,242)` ring、行 rect **w=882 全宽**——整行宽 ring 复现。与原卡 watch 裁定一致（符合 WCAG 2.4.11，观感偏重，待键盘导航专项），无改判。

---

## §附注

1. **提交/契约链路同根因性结论（任务指定摘要）**：
   - **A9-94 与 A9-121 同根因家族成立但异子型**：两者都是"作者写下的查询提交意图在 UI/数据链路上静默失效、无诊断"，但断点不同——A9-94 断在**渲染面**（默认按钮注入暗依赖 `schema.id ?? schema.name`，data-schema-validation.ts L91-107；Enter 通道因 queryForm region 从不声明 submitAction 而恒死，form.tsx L482）；A9-121 断在**作用域解析面**（嵌入 form 子树的 lifecycle/action 写入对 page scope 不可见，form.tsx L207-217 + action-adapter.ts L141-147）。二者与 E6-123（契约外键丢弃）、A9-126（令牌占位值）共同支撑 R2-3 的收口建议：**schema 诊断层补"未知键 / 未生效声明 / 写后不可达"warning**，否则下一批 fixture 还会踩。
   - **F5-87 与 E6-123 同向但已文档化**：list 无分页 UI 是 design.md L56 明文裁定（F5-87 因此降级），sparkline 无 label 是 schema 未声明（维持）——同族中"文档已裁定"与"契约未声明"的处置应分流。
   - **B5-89 独立成面**：不是"缺主题化"，而是"主题化规则与 recharts 3.x DOM 脱节"——修复面在 `packages/ui/src/components/ui/chart.tsx` 一处选择器，惠及全部 recharts 消费方，建议从 R2-4 chart 单点提为 ui 层修复单。
2. **原发现质量**：14 条正式发现中 12 条行为/数据复现成立（其中 7 条根因或量化实质修正——B5-89、A9-94、A7-155、A9-121、A9-126、B1-158、F4-90），1 条降级（F5-87，owner-doc 裁定），1 条驳回（A1-156，测错元素）。**合计对 R2-3/R2-4 修复排布有实质影响的修正 7 条。**
3. **复核过程规避/新踩的坑**：① Tailwind v4 样式表扫描必须递归 `@layer`，且注意现代 CSSStyleRule 自带空 `cssRules`（rb1d 踩坑、rb1e 修正）；② dark 主题文本像素取样须取"距背景最远像素"而非"最暗像素"（rb1b 修正）；③ 原批 B1-158 的 dark 2.44 即白底合成伪象的实锤案例——再次印证方法学③（对比度判读一律 PNG 像素采样）；④ cursor/可供性判读必须以 `elementFromPoint` 命中元素为准（A1-156 驳回根因）；⑤ lab 场景 stage 的 `scenario-stage-` testid 同时命中 `scenario-` 前缀选择器，定位 wrapper 需排除（rb2a 修正）。

## §drift 复核小节（owner-doc vs live，26 控件逐条过）

方法：26 个 lab type 逐一核对 `docs/components/<type>/design.md` 存在性；对存在文档的控件，将本批复核涉及的 live 行为逐条对照文档关键断言（能力表/字段节/裁定节）；候选逐条对照 live code/探针确认。**不直接改 docs/components/**，以下为回写清单（供主 session 采纳）。

| #   | 控件         | 文档断言（行）                                                                                                                                                                              | live 实际（证据）                                                                                                                                                                               | 建议回写文案（供主 session 采纳）                                                                                                          |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | query-filter | `docs/components/query-filter/` 目录与 design.md **不存在**（owner-doc-missing 登记；控件存在：`flux-renderers-data/src/query-filter.tsx` + `query-filter-definition.ts`，lab 卡已 carded） | —                                                                                                                                                                                               | 按流程补建 `query-filter/design.md`（可引用本批卡 + A9-121 作用域契约结论）                                                                |
| D-2 | batch-bar    | `docs/components/batch-bar/` 目录与 design.md **不存在**（owner-doc-missing 登记；控件存在：`flux-renderers-data/src/batch-bar.tsx` + `batch-bar-definition.ts`）                           | —                                                                                                                                                                                               | 按流程补建 `batch-bar/design.md`                                                                                                           |
| D-3 | list         | design.md L32 将 `showSizeChanger` 列入 `pagination` 配置字段（"Host UI hint to show a page-size selector"，schemas.ts L316 同）                                                            | live 渲染层零消费——list 无任何可挂载该 hint 的 UI（F5-87 取证：全页 pagination-root 0，源码唯一消费链在 table 分页条）                                                                          | 删除该字段或在 L32 标注"当前未实现（list 无内建分页 UI，见 L56 裁定）"，避免 schema 作者误写                                               |
| D-4 | timeline     | design.md L26 能力表：mode 布局"内容对齐（left/right/alternate）"标注 **实现**；L75 `mode?: 'left' \| 'right' \| 'alternate'`                                                               | live（E4-157 取证）：alternate 几何断裂——dot 贴容器两外缘（cx 307/1213）、中轴（x=760）悬空无节点，模式核心结构不可用                                                                           | 回写：alternate 标注"当前布局断裂（E4-157 修复单跟踪），生产暂用 left/right"；E4-157 修复后翻转为断言式表述                                |
| D-5 | crud         | design.md L25：`queryForm` region（submit/reset 接入 CRUD query summary）标注 **实现**                                                                                                      | live（A9-94 取证）：默认 搜索/重置 按钮仅在 crud 节点声明 `id`/`name` 时注入（data-schema-validation.ts L91-107）；未声明者零提交控件且无诊断；且一切 queryForm Enter 均不提交（form.tsx L482） | §4 queryForm 节补注："默认提交/重置钮要求 crud 声明 id 或 name；Enter 提交当前不生效（submitAction 未接线，A9-94 跟踪）"；A9-94 修复后翻转 |
| D-6 | chart        | design.md L48：yAxis 单轴形态 `{ label?: string }`（及 xAxis label）作为正式字段记载                                                                                                        | live（F4-90 取证）：label 绑到 recharts `name=`（tooltip/aria 语义），**不渲染为轴标题**；DOM 无任何轴标题文本                                                                                  | §字段节补注："label 当前仅作 tooltip/aria 名称，轴标题渲染未实现（F4-90）"；修复后翻转                                                     |

**drift 排除记录（查过、不立）**：

- **table stripe**：design.md L58 明文记载 `--table-striped-bg` 默认 transparent（"AMIS 默认无条纹"）——文档与 live 一致（A9-126 是 token 占位值的产品缺口，非文档漂移）；建议后续在 schema 字段描述层补同句提示。
- **list 无分页 UI**：design.md L56 明文裁定"list 不内建分页 UI 控件"——文档与 live 一致（F5-87 降级依据）。
- **sparkline label**：design.md 无 label 字段，与 schema 一致——漂移在 lab fixture 侧（E6-123 定性不变）。
- **steps 可点击热区**：G1-R4-视角8-02 整行热区契约 + `nop-haptic` pointer（mobile.css L110）——文档契约与 live 一致（A1-156 驳回依据）。
- **responsive**：无独立 design.md，owner 即 `crud/design.md`（L164/L421 已记载 responsive 能力）——不登记 missing。
- **stat-tile delta / countdown / dropdown-button hover**：design.md 分别记载字段与方向推导、onFinish 恰一次与结束即停、`trigger` 字段——均未承诺"语义色达标/结束视觉差分/hover 关闭时序"，无文档矛盾（对应缺陷按产品项跟踪）。

---

## 总裁决

**复核 15 项（14 条正式发现 + 1 条 watch）：保留 12 / 降级 1（F5-87 P2→P3，owner-doc L56 裁定） / 驳回 1（A1-156，测错元素）；tree watch 复证维持。**
其中实质改判（根因或量化修正，非判级变更）7 条：B5-89（recharts 3.x 选择器空匹配 + 网格线"不可见"证伪）、A9-94（loadAction 条件证伪 → id/name 注入条件 + Enter submitAction 缺失 + hasForm 伪象）、A7-155（悬挂 ≥2s + menu 侧/ wrapper 侧差分）、A9-121（假设②证伪 → 嵌入 form 子树影子 scope 收敛）、A9-126（CSS 消费存在，断点 = `--table-striped-bg: transparent` 占位值）、B1-158（dark 双数据方向反转，失败面收敛为 base destructive 文字色）、F4-90（label 有消费点但绑 `name=`）。
drift 清单：**6 条**（D-1/D-2 owner-doc-missing + D-3~D-6 文档断言回写），另有 6 条排除记录。
探针与截图：`_tmp/r2-2b-review/rb*.mjs`（14 个）+ `rb-*.json`（15 份）+ `_tmp/r2-2b-review/rb/<control>/*.png`（17 张），全部在 `_tmp/` 下，未触碰 cards/、ledger.md、packages/ 源码、docs/components/、interactions.mjs。

# [round] R2-1a 定向深挖 · Round 01

- **批次**: R2-1a ｜ **轮次**: R2+ 第 1 轮（fresh session 定向深挖）｜ **日期**: 2026-09-23
- **输入**: R1 走查遗留存疑项 6 条 + [visual-only] 抽查 2 条（任务简报逐条列出）
- **方法**: 每项 = 复测方法 → 取证 → 结论（证伪入排除 / 维持存疑说明原因 / 新发现按发现条目格式）。探针脚本 `_tmp/r2-1a-probes/round1/`，截图 `_tmp/visual-inspection-2026-09-23/r2-1a/round1/`。dev server http://127.0.0.1:4175，Playwright 1.63.0。

---

## 项 1 ｜ master-detail vs detail-subtables 同业务子表列配置不一致 —— 有意设计（主张证伪）+ 残余真不一致（新发现 P3）

**复测方法**: 读两页 schema 源码逐列对比 + 读 registry 页面描述确认设计意图 + 读 mock 数据源确认数据可得性。

**取证**:

- 订单明细子表：master-detail 为 `crud`（`page-schemas/master-detail.json:137-232`）6 列（SKU/商品/数量/单价/小计/操作，含 quickEdit + 新增弹层）；detail-subtables 为只读 `table`（`page-schemas/detail-subtables.json:149-163`）4 列（SKU/商品/数量/单价）。
- `complex-pages-model.ts:117-121` detail-subtables 页面描述**明文声明**这是对照设计：「各子表仅展示不维护。与之对照，master-detail 页面的订单明细子表为独立 CRUD」。
- 收货地址子表：两页均为只读 `table`，但 master-detail 4 列（含 `isDefaultLabel`「默认」，`master-detail.json:355-360`）、detail-subtables 3 列（无「默认」，`detail-subtables.json:188-194`）。mock 两页同走 `/r/Address__find`，均返回 `isDefaultLabel`（`showcase-env.ts:343-349`）——列差不是数据约束。
- 同类：只读订单明细丢「小计」列，但 `/r/OrderItem__find` payload 同样返回 `subtotal`（`showcase-env.ts:294,335`）。

**结论**: 任务原命题「6 列 CRUD vs 4 列只读是否有意」**证伪为有意设计**——registry 描述明文对照，不立项。但同命题揭示出一个**真实的残余不一致**：两页同为只读的收货地址表列配置漂移（同一 API 数据一页展示「默认」一页不展示），只读明细表丢「小计」同类。记新发现如下。

### [R2-1a-F1-15] 同业务只读子表跨页列配置漂移（收货地址丢「默认」列 / 订单明细丢「小计」列）

- **页面/路由**: `#/complex-pages/detail-subtables`（对照 `#/complex-pages/master-detail`）
- **主题/视口/状态**: 双主题 / 1280×800 / 默认（选单后）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/round1/master-detail-addr-table-light.png`（master-detail 侧含「默认」列）；detail-subtables 侧见 R1 卡 `detail-subtables-default-light.png`
- **目视描述**: 同一订单的收货地址，在 master-detail 页能看到「默认：是/否」，切到 detail-subtables 页该列消失；订单明细只读表同理丢「小计」。
- **程序化证据**:
  - 探针: schema 源码逐列对比 + mock 数据源核对（本轮项 1）
  - 输出: master-detail 地址表 4 列 `recipient/phone/address/isDefaultLabel`，detail-subtables 3 列（无 isDefaultLabel）；两页数据源同一 `/r/Address__find` 且 payload 均含 `isDefaultLabel`（`showcase-env.ts:347`）；`OrderItem__find` 均含 `subtotal`（`showcase-env.ts:335`）
- **对照基准**: F1 同语义操作跨页一致 / F4 同一概念不混用两种叫法（同概念数据面跨页不一致）
- **严重程度**: P3（信息缺失不影响任务，属内容配置一致性）
- **用户影响**: 用户在只读详情页看不到地址是否默认收货、明细小计，需切换页面拼信息。
- **修复方向**: `page-schemas/detail-subtables.json` 地址表补 `{ "name": "isDefaultLabel", "label": "默认", "width": 80 }`、明细表补 `{ "name": "subtotal", "label": "小计", "width": 120 }`（与 master-detail 同名同宽）；或如两页定位确需差异化列，在 `complex-pages-model.ts:121` 描述中写明差异理由。
- **归族**: local → R2-4 批（schema 内容配置，一处改动两行）
- **复核状态**: 未复核

---

## 项 2 ｜ detail-subtables F5-01 分页行数选择器空壳 —— 维持发现，根因坐实为 renderer 默认值缺失

**复测方法**: 读 `flux-renderers-data` 分页相关源码，追踪 `pageSizeOptions` 数据流，对比三条分页实现路径。

**取证**:

- `table-renderer.tsx:682`：`pageSizeOptions={schemaProps.pagination?.pageSizeOptions}` —— schema 原值直传，**无默认**。本页全部子表 schema 均无 `pagination` 块（grep 0 命中），故该值为 `undefined`。
- `table-renderer/table-pagination-bar.tsx:64`：`{pageSizeOptions?.map(...)}` —— `undefined` 渲染 0 个 `<option>`，NativeSelect 保留 64px 空壳（即 R1 探针所见 `value=""`, `options.length=0`）。
- 对照组 1：CRUD 路径由 `crud-renderer-schema-builders.ts:87` 注入 `pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS`（常量定义于 `crud-renderer-state.ts:17` = `[10,20,50,100]`）→ standard-crud/tree-crud 正常。
- 对照组 2：独立分页 renderer `pagination-renderer.tsx:26,85-91` 自带 `DEFAULT_PAGE_SIZE_OPTIONS` 兜底（schema 未传或空数组均回落）→ 正常。
- 全 playground 无任何 schema 显式传 `pageSizeOptions`（grep 0 命中）→ 排除「schema 未传」作为独立根因，**根因 = table 分页路径缺 renderer 层默认**。

**结论**: R2-1a-F5-01 **维持**（P2，控件空壳 + F5 跨页不一致）。修复方向具体化：把 `DEFAULT_PAGE_SIZE_OPTIONS` 从 `crud-renderer-state.ts` 提升为共享导出（如 `pagination-window.ts` 或新 `pagination-constants.ts`），在 `table-renderer.tsx:682` 改为 `pageSizeOptions={schemaProps.pagination?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS}`（或下沉到 `TablePaginationBar` props 默认值），并顺带收敛 `pagination-renderer.tsx:26` 的重复常量。归族不变：local → R2-4 批。

---

## 项 3 ｜ combo-editor A9-03 保存必败 P0 —— 维持 P0，幻影校验错误根因坐实到 renderer 契约缺口

**复测方法**: 劫持 `console.error` 深度序列化捕获 action error 全量内容（`_tmp/r2-1a-probes/round1/a9-03-error-dump.mjs`）+ 读 schema、submit 链路、校验模型编译链源码。

**取证**:

- 深度 dump（pristine 数据直接保存）：`error: [{ path: "name", message: "姓名不能为空", rule: "required", ruleId: "name#0:required", ownerPath: "name", sourceKind: "field" }]`，`data: { name: [同上] }`。表单数据为 `{contacts: [{name:"张三",...},{name:"李四",...}]}`，根级**不存在** `name` 字段。
- 失败形态匹配 `form-runtime-submit-flow.ts:319-331`：`{ok:false, error: validation.errors, data: validation.fieldErrors}` —— 即编译期校验模型在 submit 时对 `name` 求值为空。
- `ruleId` 构造点：`flux-compiler/src/validation-lowering.ts:206` `id: \`${path}#${index}:${rule.kind}\`` → 规则以**裸路径 `name`** 编译，未带 `contacts.${i}` 前缀。
- 前缀丢失点：`flux-compiler/src/schema-compiler/validation-collection.ts:178-191`——子字段前缀取 `contributor.getChildFieldPathPrefix()`；**combo 的 validation contributor 未定义该方法**（`flux-renderers-form-advanced/src/combo-renderer.tsx:606-636` 仅有 `getFieldPath`/`collectRules`）→ `nextChildPrefix = fieldPathPrefix`（顶层为 undefined）→ `items` region 内 `input-text name` 的 `required` 规则被 hoist 成根级 `name` 节点。
- 同包正确实现对照：`composite-field/array-field.tsx:584-586` `getChildFieldPathPrefix() { return false; }`（阻止 hoist）；`composite-field/object-field.tsx:525-527` 返回 `schema.name` 作前缀。combo 两者皆无。
- 运行时侧本身完好：combo 每行已通过 `createProjectedValidationRuntime`（`combo-renderer.tsx:108-121`）把行内字段校验投影到 `contacts.${index}.*`，故行内 blur/change 校验正常——坏的只是编译期 hoist 出的幻影节点。
- 现场复测：pristine 保存 100% 复现同一错误；`inlineErrs=[]`、6 个行内 input `aria-invalid` 全 null（fieldErrors 键 `name` 匹配不到任何已渲染字段路径 `contacts.*.name`）→「必败且零反馈」机制闭环。

**结论**: R2-1a-A9-03 **维持 P0**（本页核心任务默认配置下不可完成且不可感知）。修复方向具体化为两级：

1. **主修复（一行契约补齐）**：`packages/flux-renderers-form-advanced/src/combo-renderer.tsx` 的 `comboRendererDefinition.validation` 增加 `getChildFieldPathPrefix() { return false; }`（与 array-field 同款），阻断 items 内字段规则被 hoist 为根级幻影节点。
2. **修复计划内必须验证的伴生面**：补齐后确认 submit 期行内 required 仍会触发（行内字段经 projected validation runtime 注册到 `runtimeFieldRegistrations`），且校验失败能映射回具体 `.nop-field` 渲染 `field-error`；若 submit 期行校验存在缺口，按 object-field 模式补 `recurse-submit` child contract 作为第二步。归族不变：local → R2-4 批（combo 校验链路）。

---

## 项 4 ｜ linear-board F4 文案漂移 —— 坐实，维持 P3

**复测方法**: 源码三方的文案与实现互证（页面描述 / 页内提示 / 看板 renderer 拖拽接线）。

**取证**:

- `complex-pages-model.ts:321`（showcase 页头描述来源）：「……**拖拽不接线（静态形态）**」。
- `page-schemas/linear-board.json:177` 页内自述：「**拖拽已接线**：卡片可拖拽跨列，状态与列计数随会话态更新」。
- renderer 侧真实接线：`flux-renderers-scheduling/src/kanban/kanban-board.tsx:56,254-261`（`draggable !== false` 默认开启、`useKanbanDnd` + `onCardMove` 完整回调）。
- R1 已有真实指针拖拽证据（`linear-board-drag-mid-real-dark.png`，列计数 7/8→6/9），本轮源码级互证无矛盾。

**结论**: R2-1a-F4-14 **坐实维持 P3**：描述文案与实现/页内提示直接矛盾。修复方向：改 `apps/playground/src/complex-pages/complex-pages-model.ts:321`，将「拖拽不接线（静态形态）」改为「卡片可拖拽跨列（会话态）」。归族：local → R2-4 批。无需再复核（三方互证 + R1 交互证据一致）。

---

## 项 5 ｜ contrastScan 探针盲区（sundial-detail dark 溢出灰字漏报）—— B5-07 像素级坐实，维持 P2，机制修正 + 实例扩展

**复测方法**: ① 自研「逐层合成对比度」探针：`elementFromPoint` 定位实际最顶绘制者，沿祖先链逐层合成 backgroundColor，**每层先做矩形覆盖检查**（祖先盒不覆盖采样点则跳过——修复 R1「白底祖先盒不覆盖溢出绘制区」盲区），light/dark 全页滚动扫描；② 对目标区域做**截图像素采样**作为绘制背景的 ground truth（`_tmp/r2-1a-probes/round1/b5-07-contrast-coverage-scan.mjs` + `b5-07-pixel-truth.mjs`）。

**取证**（dark，像素实测）:

- 「选择器对话框（点击打开）：」label：computed `rgb(99,99,99)`，采样点实际绘制背景 **rgb(15,23,41)**（像素三采样一致）→ 对比度 **2.97:1**（12px 正文阈 4.5:1，fail）。
- 三个按钮（日期选择器/重复选择器/列表选择器）：computed `rgb(51,51,51)`，绘制背景同 **rgb(15,23,41)** → **1.42:1**，fail。截图目视：四者几乎不可见（`round1/sundial-detail-dark-demo-area.png`）。
- 机制修正：R1 记录的「白底祖先盒不覆盖**溢出**绘制区」不准确——**无溢出**。真实机制：demo 区的实际背景绘制祖先是宿主暗色 `nop-card`（bg `rgb(15,23,41)`），而文字色是**亮锁硬编码**：两个 label 均为 `text-xs text-[#636363]`（`sundial-detail.json:1015-1018,1262-1265`），按钮走 `sd-btn-ghost → color: var(--sd-text-normal) = #333`（`sundial-replica.css:133-136`），`--sd-*` 令牌仅在 `.sd-root/.sd-dialog` 上声明亮色常量、全文件无 dark 覆盖（`:19-30`）。
- 实例扩展：第二个 label「现有组件替代（flux input-date，原生输入形态）：」同类同败（同 `text-[#636363]`）。
- 全页扫描新增可疑点判定：宿主页头 feature chips dark 1.1:1 —— **非新发现**（已 carded 于 dashboard 卡 R2-1a-B5-02 / review P1-8，数值逐位一致）；「每周」蓝 badge 3.33:1@10px（双主题同败）→ 并入已有系统性 R2-1a-B1-19 族，不另立项；「移到垃圾箱」红字 4.17:1@12px —— 双主题边缘值，且位于亮锁白面板上，**维持存疑不立项**（修复随 B5-07 的面板令牌决策一并看）。
- light 平价：同探针 light 全页上述 demo 区元素全部通过（与 R1 的 5.37-11.29 一致）→ dark 专有缺陷定性不变。

**结论**: R2-1a-B5-07 **维持 P2（local → R2-4 批）**，证据升级为绘制像素级，机制修正为「demo 区落在宿主暗色 nop-card 上 + 文字色亮锁硬编码（`text-[#636363]` 字面 × `--sd-*` 亮锁令牌）」，实例扩为 2 label + 3 按钮。修复方向不变并更具体：`sundial-detail.json` 两处 `text-[#636363]` 改令牌（如 `text-muted-foreground`）或迁移进 `sundial-replica.css` 变量随主题翻转；同时按 R1 备选「声明 replica 仅亮色」需给 demo 区固定亮底（与面板一致）。探针改进记录（供 R2-3 改探针）：祖先链合成必须做覆盖检查；祖先合成仍有**非祖先绘制层误报**残余盲区（本轮出现宿主标题白底误报），最终判定以截图像素采样仲裁。

---

## 项 6 ｜ 弹层拖拽把手 focus ring 被圆角裁剪成「顶部蓝线」—— 坐实，由 watch-only 转记 P3

**复测方法**: 真实键盘路径复现 focus-visible（dialog 打开 → Shift+Tab/Tab 循环至 header 把手）→ 读 computed outline/几何 → 1px 级像素扫描 + 3x 截图目视（`_tmp/r2-1a-probes/round1/item6-handle-focus.mjs` / `item6-ring-repro.mjs` / `item6-ring-pixelmap.mjs` / `item6-ring-zoom.mjs`）。

**取证**:

- 打开即聚焦：`activeElement` = dialog-header（tabIndex=0，`packages/ui/src/components/ui/dialog.tsx:297`），但纯脚本聚焦下 `:focus-visible=false`、outline `3px none` 无环 —— **R1 现象依赖键盘输入语境**，本轮用真实 Tab 复现成功（`focus-visible=true`）。
- 环出现时：`outline: 1px solid rgb(28,110,242)`，offset 0；把手矩形 = 560×30px 全宽条（top=60 == 弹层顶 60）。
- 像素扫描：蓝色像素出现在 y=59（顶边全线）与 y=90（header 底边全线）两条水平线；**左右侧边段缺失**（x=360/920 列仅命中上下两角点）——侧边正好落在弹层外缘、被 6px 圆角边界吞掉（surface radius 6px）。
- 3x 放大目视（`round1/antdpro-handle-ring-zoom3x.png`）：上下两条平行蓝线框住标题条，顶线随圆角弯折、侧边消失；1x 下读作一条游离的「顶部蓝线」，与 R1 截图所见一致（`r2-1a/antdpro-form-dialog/antdpro-form-dialog-dialog-open-light.png`）。

**结论**: **坐实，记 P3**（R1 watch-only 候选转正；焦点本身可见，不违反 2.4.7，但指示器形态读作渲染毛刺——全宽 30px 条的 outline 侧边被圆角吞掉、底边线像多余分隔线）。修复方向：`packages/ui/src/components/ui/dialog.tsx:292` 把把手 focus 样式从全宽条 outline 改为跟随圆角的内缩环，如 `focus-visible:outline-1 focus-visible:-outline-offset-1 rounded-t-[var(--overlay-anatomy-content-border-radius)]`，或把 focus 指示收敛到 header 内一个 grip 图标元素。归族：local（ui Dialog 组件层，可全量弹层生效）→ R2-4 批。复核状态：未复核。

---

## 项 7 ｜ [visual-only] 抽查两条

### 7a｜master-detail C2-02 地址表「默认」列被裁 —— 坐实，维持 P3，证据由 [visual-only] 升级为程序化

**复测方法**: 选中第 3 单后对 `md-addresses-table` 做 rect/scrollWidth 实测（`items-6-7-verify.mjs`）。

**取证**: 表格宽 **670px** vs 滚动容器 clientWidth **610px**（`scrollable=true`，差 60px = 「默认」列宽 80 的一部分被裁）；末列表头「默认」right=**1271** > 容器右缘 **1211**，`lastColClipped=true`；截图见列头只剩半字（`round1/master-detail-addr-table-light.png`）。

**结论**: R2-1a-C2-02 **坐实维持 P3**：1280 视口 4 列表仍溢出、末列默认不可见、无横滚提示（overlay 滚动条静态隐藏）。修复方向不变（地址列 truncate 给「默认」列留定宽 / 容器右缘渐隐提示）。归族：local → R2-4 批。

### 7b｜standard-crud C2-01 主题切换器压分页条 —— 重叠坐实，维持 P3，但 R1 细节修正

**复测方法**: 滚动至分页条，实测 `[data-slot="table-pagination"]` 与 fixed 主题切换器 rect 求交 + 逐控件 `elementFromPoint` 遮挡检查 + 截图目视（`items-6-7-refined.mjs`）。

**取证**: 分页条 rect `296-1224 × 743.5-775.5`，切换器 rect `1068-1268 × 750-788`（`fixed right-3 bottom-3 z-50`），**交集 156×25.5px**；但被盖区域是分页条右端「第 x-x 条，共 N 条」**信息文本**，页码钮/下一页钮居中（x≈670-855）**未被盖**（`coveredControls=[]`）——R1 所述「盖住页码 4 与下一页钮」在 1280×800 未复现，应为当时滚动/目视误判。

**结论**: R2-1a-C2-01 **维持 P3（宿主 shell 层）**，细节修正：重叠真实存在但当前遮挡的是非交互信息文本，交互控件未被盖、无误触风险。修复方向不变（宿主切换器加滚动联动隐藏 / bottom-offset / 半透明底）。归族：local → R2-4 批（宿主侧）。

---

## 收敛判定

- **本轮无新 P0-P2 发现。** P0（A9-03）与 P2（B5-07）均为 R1 已有发现的根因坐实/证据升级，未产生新的 P0-P2 条目。
- 本轮净增发现均为 P3 local：R2-1a-F1-15（同业务只读子表列配置漂移，新）、F4-14（文案漂移，坐实）、拖拽把手 focus 环（watch→P3 坐实）；另有 F5-01 根因具体化（table 分页路径缺默认 pageSizeOptions，待 R2-4 修）。
- 附带结论：项 1 原命题「6 列 CRUD vs 4 列只读」证伪为有意设计（registry 描述明文），不入发现；contrastScan 盲区已用「覆盖检查 + 像素仲裁」探针闭合，改进点移交 R2-3 探针修订。
- **判定：就本批 7 项存疑/[visual-only] 项而言，定向深挖可收敛**（连续无新 P0-P2；剩余均为 P3 且无系统性新模式）。建议进入阶段 3 独立复核（fresh session 重跑探针），复核对象含本轮全部维持/新记条目。

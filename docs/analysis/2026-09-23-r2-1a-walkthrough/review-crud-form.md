# [review] R2-1a 走查独立复核——crud/form/dashboard 域（P0 全量 + P1 全量 + P2 抽查）

- **复核人**: 独立复核 agent A（fresh session，先独立取证再比对原发现）
- **日期**: 2026-09-23
- **口径**: `docs/skills/visual-page-quality-inspection-prompt.md`（维度探针 + 严重度判级 + 误报排除表）
- **方法**: 每条先读卡摘录原发现 → 不采信文本、重开页面（`http://127.0.0.1:4175/#/complex-pages/<id>`）重截同态截图、重跑或重写探针 → 独立判级 → 与原发现比对给 保留/降级/驳回
- **探针脚本**: `_tmp/r2-1a-recheck/p1–p11、p5b、p9b（helper.mjs 公共件）`
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a-recheck/`
- **环境**: dev server 已在跑（未重启）；Playwright 1.63.0；视口 1280×800 / 800×900

## 汇总表

| #   | 发现 id | 页面              | 原级别             | 复核结论 | 复核级别           | 关键独立证据                                                                                                                |
| --- | ------- | ----------------- | ------------------ | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | A9-03   | combo-editor      | P0                 | **保留** | P0                 | 合法默认数据保存必败：toast `[object Object]`、行内错误 0、aria-invalid 0、console `action error {ok:false,error:Array(1)}` |
| 2   | C1-01   | dashboard         | P0                 | **保留** | P0                 | `.nop-page` 1590/960、宿主卡 overflow-hidden 1606/992（裁 614px）、两行 1382/928 与 1574/928；右缘图残条目视坐实            |
| 3   | A7-01   | approval-tasks    | P0                 | **保留** | P0                 | Dialog z=2004 vs AlertDialog z=2002；取消/确认中心 elementFromPoint 命中下层 TEXTAREA；真实点击 3s 超时；截图无任何确认层   |
| 4   | C4-01   | standard-crud     | P1                 | **保留** | P1                 | `.nop-page` 516/480、`.nop-select-wrapper` 98/37（逐位一致）                                                                |
| 5   | H5-01   | standard-crud     | P1                 | **保留** | P1                 | actions `jc=normal`、gap 12px、取消/保存 w=50 @x=384/446、弹层右缘 920；对照 AlertDialog `flex-end`/8px/72px                |
| 6   | C4-04   | advanced-query    | P1                 | **保留** | P1                 | `.nop-page` 516/480、`.nop-card` 532/512 overflow-hidden（实裁 20px，逐位一致）                                             |
| 7   | C4-05   | master-detail     | P1                 | **保留** | P1                 | 详情区 `.nop-container` sw=395 / cw=156（逐位一致），左列表 262px                                                           |
| 8   | H5-02   | master-detail     | P1                 | **保留** | P1                 | 子表弹层 anatomy 与 H5-01 输出逐字节同构（jc=normal/gap12/w50/920）                                                         |
| 9   | C4-07   | business-document | P1                 | **保留** | P1                 | 明细输入框 sw=136/cw=49（逐位一致）；截图目视：数量/单价值不可见、名称仅剩"服务/交换"                                       |
| 10  | A5-01   | form-wizard       | P1                 | **保留** | P1                 | 点击 `.nop-picker` 后无任何可见弹层（>100px dialog = 0）；渲染期 setState console error 独立复现                            |
| 11  | A1-01   | form-wizard       | P1                 | **保留** | P1                 | hover 前后 computed 全同 + 截图 Buffer 逐字节相等；源码 `button.tsx` L17/L22 仅 `[a]:hover:bg-primary/80` 根因属实          |
| 12  | A9-02   | complex-form      | P1                 | **保留** | P1                 | 校验失败 toast `[object Object]×3`；行内 3 错误正常渲染；合法保存 toast「保存成功」正常——失败分支专属                       |
| 13  | F5-01   | detail-subtables  | P2                 | **保留** | P2                 | 分页 select `value=""`、options=0、w=64 可见；standard-crud 同位 `value="10"`/4 项/w=64                                     |
| 14  | E4-01   | inline-edit-table | P3（族升 P2 候选） | **保留** | P3（族升 P2 候选） | 年度合计列 aligns=["start"]、lefts=[976]（逐位一致）；Q1–Q4 输入框 ta=start                                                 |
| 15  | B2-01   | form-wizard       | P2                 | **保留** | P2                 | light 1.24:1 / dark 1.24:1（远低于 3:1）；light 值与原 1.33:1 有口径差但判据结论不变                                        |

**总计 15 条：保留 15 / 降级 0 / 驳回 0。**

---

## 1. [R2-1a-A9-03] combo-editor 默认合法数据保存必败且零行内反馈

**原发现摘录**: 默认数据（张三/李四，全部合法）直接点「保存联系人」必败，toast 为 `[object Object]`，无字段变红/无错误文案，保存状态停留「未保存」；console `[showcase] action error: {ok:false, error:Array(1)}`；对照 complex-form 合法保存成功，排除管线全局故障。判 P0。

**独立取证**（`_tmp/r2-1a-recheck/p1-combo-editor.mjs`）:

- 场景 1（默认数据直接保存）: 点击 `[data-testid="contacts-submit"]` 后 toast=`{type:"error", txt:"[object Object]"}`；可见 `[data-slot="field-error"]`=0；`[aria-invalid="true"]`=0；输入框边框保持 `rgb(225,231,239)` 常态；report=「保存状态：未保存（共 2 位）」。
- 场景 2（清空姓名再保存）: 同样 toast error ×1、行内错误 0、边框无变化。
- console: `[showcase] action error: {ok: false, error: Array(1), data: Object}` ×2（两场景各一条）。
- 截图: `_tmp/visual-inspection-2026-09-23/r2-1a-recheck/combo-editor-re-save-pristine-light.png`、`combo-editor-re-save-emptyname-light.png`。
- 配套对照: p2 探针证实 complex-form 同管线合法保存返回 success toast（见第 12 条），排除 mock/管线全局故障。

**结论: 保留 P0。** 本页核心任务（编辑联系人并保存）在默认合法数据下不可完成，且失败原因零行内可感知，符合口径 P0 定义「用户无法完成任务 / 关键信息不可读」。

---

## 2. [R2-1a-C1-01] dashboard 图表/表格行溢出裁剪不可达

**原发现摘录**: 1280 视口下「渠道占比」图与「待审批任务」表被右缘裁剪且无滚动可达；`.nop-page sw=1590 cw=960`、宿主卡 overflow-hidden `sw=1606 cw=992`、两个 flex 行 `sw=1574/1382 cw=928`；判 P0。

**独立取证**（`_tmp/r2-1a-recheck/p3-dashboard.mjs`，输出存档 `p3-dashboard-out.json`）:

- `.nop-page`: sw=1590 / cw=960（与原发现逐位一致）；宿主 `nop-card … overflow-hidden`: sw=1606 / cw=992（一致，裁 614px 内容）。
- 图表行 `nop-flex flex-row mb-4` sw=1382 / cw=928；表格行同构 sw=1574 / cw=928（一致）。KPI 行带 `flex-wrap` 无溢出（928/928），佐证"无 wrap 的行"才是溢出面。
- 目视: 默认帧右缘仅剩第三图残条（`dashboard-re-default-wide-light.png`）。
- 可达性: `document.scrollingElement.scrollLeft` 恒 0（HTML target 1280 got 0）；页面无横向滚动条。**与原发现的一处细节偏差**：对宿主 overflow-hidden 卡置 `scrollLeft=scrollWidth` 在我的复跑中可编程滚到 614（max），且滚后截图显示渠道占比饼图完整存在（`dashboard-re-scrolled-right-light.png`）——即内容存在、仅编程手段可达；原发现记录的"sl=0"未复现。但 overflow-hidden 对用户无任何滚动可供性（无滚动条、滚轮/触摸板横滑不作用于 hidden），用户不可达的结论不变且被加强。
- 窄视口佐证: 800×900 下宿主卡仅 512px 宽、内容 716px 高（`dashboard-re-narrow-light.png`），同根因加重。

**结论: 保留 P0。** 1280 标准视口下整块图/表不可见且用户无任何到达路径，命中「关键信息不可读/无法完成任务」。修复方向（chart 容器 `min-w-0` + 行 wrap + 宿主 `overflow-x-auto` 兜底）维持。

---

## 3. [R2-1a-A7-01] approval-tasks 确认弹层被 Dialog surface 压制不可见不可点

**原发现摘录**: 点「驳回」后 confirmText AlertDialog 完全不可见；AlertDialog z=2002 vs 审批 Dialog z=2004；取消/确认中心 elementFromPoint 命中下层 TEXTAREA；真实点击超时；驳回流程不可用。判 P0。

**独立取证**（`_tmp/r2-1a-recheck/p4-approval-tasks.mjs`）:

- 打开「处理」Dialog（rect 360,60 560×522，`[role=dialog]` z-index=2004）→ 点击「驳回」→ DOM 出现 `[role=alertdialog]`（rect 400,328 480×144，z-index=2002，position fixed）——**层级低 2 级被整体覆盖**。
- 命中测试: alertdialog 内「取消」(740,440 w=72) 与「确认」(820,440 w=72) 按钮中心 `elementFromPoint` 均返回下层 Dialog 的 `TEXTAREA.nop-textarea`。
- 真实点击「取消」: Playwright `click({timeout:3000})` 超时失败（actionability 不可满足）。
- 目视: `approval-tasks-re-after-reject-click-light.png` 显示点击驳回后画面与打开态完全相同，无任何确认层出现。
- 附带目视佐证: 同帧确认「驳回/通过」两枚小按钮位于 body 左下角（H5-02 的独立目视证据）。

**结论: 保留 P0。** 驳回分支在默认配置下无可见、可点的完成路径，安全性二次确认形同虚设，命中 P0「用户无法完成任务」。z 阶梯统一 + inert portal `pointer-events:none` 的修复方向维持。

---

## 4. [R2-1a-C4-01] standard-crud 800px 查询区/表格塌陷

**原发现摘录**: 800×900 下查询表单不换行，状态选择器仅剩 37px；`.nop-page sw=516 cw=480`、`.nop-select-wrapper sw=98 cw=37`。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p5-standard-crud.mjs`）:

- 800×900 溢出扫描: `SECTION.nop-page` sw=516/cw=480、`.nop-crud` 500/448、`LABEL.nop-field` 194/133、`.nop-select-wrapper` **98/37**（与原发现逐位一致）；表格容器 500/448 由内层 `overflow-x-auto` 承接（白名单，不计）。
- 截图: `_tmp/visual-inspection-2026-09-23/r2-1a-recheck/standard-crud-re-narrow-light.png`。

**结论: 保留 P1。** 查询区（本页高频主操作面）在 ~800px 视口下不可正常使用，多页同族（见第 6/7/9 条），系统性成立。

---

## 5. [R2-1a-H5-01] standard-crud 表单弹层动作左对齐

**原发现摘录**: 新增/编辑弹层「取消/保存」左对齐；actions `justify-content: normal`、gap 12px、按钮 w=50、弹层右缘 920；对照删除 AlertDialog `flex-end`/72px/8px 合规。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p5b-dialog-anatomy.mjs`；首轮 p5 的 anatomy 选择器取到 0 尺寸节点，p5b 改用非零 rect 过滤重跑）:

- 新增弹层（560px 宽，右缘 920）: actions 容器 `justify-content: normal`、`gap: 12px`、`margin-top: 16px`；取消 x=384 w=50 h=32、保存 x=446 w=50 h=32；`footerSlots=0`（无 footer 槽，按钮由 body 内渲染）——与原发现输出逐位一致。
- 对照删除 AlertDialog: `justify-content: flex-end`、gap 8px、取消 x=704 w=72、确认 x=784 w=72——合规，构成同页自相矛盾。
- 目视: `standard-crud-re-dialog-add-light.png`（取消/保存肉眼在左下角）。

**结论: 保留 P1。** CRUD 新增/编辑高频主路径 + 已文档化契约（plan 490 anatomy「Form Action Button Convention」）双违约，判级成立。

---

## 6. [R2-1a-C4-04] advanced-query 窄视口页面级溢出实裁 20px

**原发现摘录**: 800px 下 `.nop-page sw=516 cw=480`、`.nop-card sw=532 cw=512`（overflow-hidden 实裁 20px）、`.nop-form sw=432 cw=414`。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p6-advanced-query.mjs`）:

- 溢出扫描: `.nop-page` 516/480、`.nop-crud` 500/448、`SECTION.nop-form` 432/414、`nop-field` 221/203、date-range 触发钮 124/105——与原发现逐位一致。
- 定向采样: `.nop-card` sw=532 / cw=512 / overflowX=hidden——**20px 实裁坐实**（用户不可达，非滚动容器）。
- 截图: `advanced-query-re-narrow-light.png`。

**结论: 保留 P1。** 查询区是本页唯一主操作面，卡片边缘内容被裁不可达，与 C4-01 同族同判。

---

## 7. [R2-1a-C4-05] master-detail 窄视口详情区 156px

**原发现摘录**: 800px 下右详情区仅 156px（`DIV sw=395 cw=156`），左列表仍 ~270px，主从不折行。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p7-master-detail.mjs`）:

- 选中订单后: 详情区 `DIV.nop-container.flex-1.min-w-0` **sw=395 / cw=156**（与原发现逐位一致，239px 内容被裁）；左列表 262px（原发现 ~270px，同量级）。
- 截图: `master-detail-re-narrow-selected-light.png`。

**结论: 保留 P1。** 主从联动核心场景在窄视口下右区不足视口 1/5，双栏不降级为堆叠，判级成立。

---

## 8. [R2-1a-H5-02] master-detail 子表弹层动作左对齐（H5-01 同构）

**原发现摘录**: 子表新增弹层与 standard-crud 输出逐字节同构，同根因。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p5b-dialog-anatomy.mjs` 第二段；首轮 p7 点击「明细」误中侧边栏导航项跳页，p5b 限定 `main` 作用域 + `[role="tab"]` 精确定位重跑）:

- 子表新增弹层（560px 宽，右缘 920）: actions `jc=normal`、gap 12px、mt 16px、取消 x=384 w=50、保存 x=446 w=50、footerSlots=0——与第 5 条 H5-01 输出**逐字节同构**，坐实同一模板根因。
- 截图: `master-detail-re-subtable-add-dialog2-light.png`。

**结论: 保留 P1。** 与 H5-01 并入同一修复面（form actions 模板默认 `justify-end gap-2` + 72px min-width）。

---

## 9. [R2-1a-C4-07] business-document 窄视口输入值滚出可视区

**原发现摘录**: 800px 下明细行文本输入 `sw=136 cw=49`（值横向滚出），聚焦的数量框仅显空白+步进箭头；对照 1280 下 cw≈200。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p8-business-document.mjs`）:

- 800×900: 首行商品名称输入 **sw=136 / cw=49**（与原发现逐位一致，`overflow: clip`）、第二行 127/49；数量/单价输入 84/76、115/76 等，scrollWidth 均 > clientWidth。
- 1280 对照: 同组输入 cw=278/118/144——宽度差 3–5 倍。
- 目视: `business-document-re-narrow-light.png`——数量/单价框肉眼只见空白+步进箭头（值 2/18000/1/6800 不可见），名称列仅剩"服务/交换"两字。

**结论: 保留 P1。** 分屏用户正在编辑的关键值不可读，直接导致录单错误；「编辑中的值不可见」在本页为族内最重表现，维持 P1（未升 P0 的理由与原发现一致：任务在标准视口可完成，窄视口为降级场景）。

---

## 10. [R2-1a-A5-01] form-wizard 部门 picker 弹层空壳/不出现

**原发现摘录**: 弹层打开为空壳（tbody/spinner/skeleton/empty 全 0，等 8s 仍 0，560×122），伴随渲染期 setState 报错；首点「未选择」chip 时弹层可完全不出现。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p9-form-wizard.mjs` + 定向重跑 `p9b-picker.mjs`）:

- p9 首跑点选第一个「未选择」（实为角色 combobox）→ 复现原发现描述的不稳定路径；console 捕获 **`Cannot update a component (NodeRendererResolved) while rendering a different component (FormRenderer)`** ——渲染期 setState 报错独立复现。
- p9b 定向点击 `.nop-picker`（部门 picker 触发器，DIV txt=未选择）→ 轮询 0.6s/2.6s/8.1s 三次：**宽度 >100px 的 `[role=dialog]` 数量 = 0**——弹层完全未出现（原发现的模式 a）；渲染期 setState 报错同帧复现。
- 目视: `form-wizard-re-picker2-open-light.png`——点击部门「未选择」后画面无任何弹层。
- 说明: 我的两次复跑命中的是"弹层不出现"模式，未复现"560×122 空壳"模式（该模式原卡有 3 个独立脚本 + 8s 轮询记录）。两者同属 picker loadAction 链路损坏，均使部门选择不可用；空壳模式的复核以原卡程序化记录为准，不构成本次复核的采信基础——本次独立坐实的是更重的"不出现"模式 + 直接线索报错。

**结论: 保留 P1。** 部门为可选字段，未升 P0 的判级理由成立；A5「empty 有意义提示非空白 / loading 非空白」违反成立。修复方向（渲染期 setState 收敛 + Spinner/Empty 兜底）维持。

---

## 11. [R2-1a-A1-01] form-wizard primary 按钮 hover 零反馈

**原发现摘录**: hover 前后 computed 全同（rgb(28,110,242)/none/1）+ 截图 Buffer 逐字节相等；根因 `button.tsx` 仅 `[a]:hover:bg-primary/80`。判 P1。

**独立取证**:

- **源码核实**（`packages/ui/src/components/ui/button.tsx`，本次复核要求）: L17 `default` 与 L22 `primary` variant 均为 `'bg-primary text-primary-foreground [a]:hover:bg-primary/80 aria-pressed:bg-primary/85 data-active:bg-primary/85'`——hover 规则仅以 `[a]:` 任意变体声明（生成 `a` 后代选择器的 hover），`<button>` 元素无任何 hover 规则；对照 L24/28 等 outline/ghost variant 有通用 `hover:` 规则。**根因指认属实**（另：info/success/warning/danger 四个 variant 同 pattern，同族受累）。
- **运行时复证**（`_tmp/r2-1a-recheck/p9-form-wizard.mjs`）: 「下一步」按钮 hover 前后 `backgroundColor` 均 `rgb(28,110,242)`、`filter:none`、`opacity:1`；按钮元素截图 `Buffer.compare` **pixelIdentical: true**。

**结论: 保留 P1。** 严重度判级表示例明列「主按钮 hover 无反馈」为 P1；运行时+源码双轨坐实，维持 P1（原卡关于"系统性升级不推到 P0"的裁量合理）。

---

## 12. [R2-1a-A9-02] 校验失败 toast 显示 [object Object]

**原发现摘录**: complex-form 空必填保存 toast 为 `[object Object]×N`；combo-editor 同现；合法保存 toast 正常。判 P1。

**独立取证**（`_tmp/r2-1a-recheck/p2-complex-form.mjs` + p1）:

- complex-form: 勾选协议后空必填点保存 → toast `{type:"error", txt:"[object Object],[object Object],[object Object]"}`；同时行内 `[data-slot="field-error"]` 渲染 3 条正常文案（姓名/邮箱/电话不能为空）——「行内正常、toast 乱码」的失败分支专属形态成立。console `action error: {ok:false, error:Array(3)}`。
- 合法保存对照: 填齐后保存 → `{type:"success", txt:"保存成功"}`——成功分支管线正常，失败分支消息序列化缺陷。
- combo-editor 交叉: p1 探针同型 toast `[object Object]`（1 条错误对应 1 个 object）——跨页复现坐实。
- 截图: `complex-form-re-toast-light.png`、`complex-form-re-save-valid-light.png`。

**结论: 保留 P1。** 全部带 submitAction 表单的失败反馈不可读，跨 ≥2 页同根因，维持 P1。

---

## 13. [R2-1a-F5-01] detail-subtables 每页行数选择器空壳（P2 抽查）

**原发现摘录**: 分页条每页行数 select `value=""`、options=0、w=64；standard-crud 同位 10/20/50/100 四项。判 P2。

**独立取证**（`_tmp/r2-1a-recheck/p10-detail-subtables.mjs`）:

- detail-subtables: 可见 select（w=64）`value=""`、`options.length=0`——与原发现逐位一致（另枚举到 w=0 的隐藏 select 为 opacity-0 白名单模式，不计）。
- standard-crud 对照: 同位 select `value="10"`、`options.length=4`、w=64。
- 截图: `detail-subtables-re-default-light.png`。

**结论: 保留 P2。** 控件空壳 + 同语义分页条跨页不一致（F5），判级成立。

---

## 14. [R2-1a-E4-01] inline-edit-table 年度合计列左对齐（P2 抽查）

**原发现摘录**: 年度合计列 aligns=["start"]、lefts=[976]；≥3 页同根因，卡面基线 P3 + 归族候选升 P2。判 P3（族升 P2）。

**独立取证**（`_tmp/r2-1a-recheck/p11-inline-edit-table.mjs`）:

- 逐列采样: 「年度合计」列 `aligns=["start"]`、`lefts=[976]`（与原发现逐位一致）；Q1–Q4 可编辑输入框 `inputTa=["start"]`；全表无任何右对齐数值列。
- 截图: `inline-edit-table-re-default-light.png`。

**结论: 保留（维持卡面口径 P3 / 归族候选 P2）。** 单页细节判 P3、跨 ≥3 页（dashboard/detail-subtables/business-document 同族已另卡）合并升 P2 的原判级逻辑符合口径升降级规则，数值证据逐位复现。

---

## 15. [R2-1a-B2-01] form-wizard 输入框边界对比度 <3:1（P2 抽查）

**原发现摘录**: light border rgb(225,231,239) vs 卡底 1.33:1；dark rgb(31,42,61) vs 输入框底 rgb(15,23,41) 1.24:1。判 P2。

**独立取证**（`_tmp/r2-1a-recheck/p9-form-wizard.mjs`，含祖先层合成背景）:

- light: border `rgb(225,231,239)` vs 合成背景 `rgb(255,255,255)` → **1.24:1**；dark: border `rgb(31,42,61)` vs `rgb(15,23,41)` → **1.24:1**（dark 与原发现逐位一致）。
- 与原发现的偏差说明: light 比值我测 1.24 vs 原 1.33（原卡可能取了不同的邻近底色），两者均远低于 WCAG 1.4.11 的 3:1，判据结论不受影响。
- 截图: `form-wizard-re-step1-light.png`、`form-wizard-re-step1-dark.png`。

**结论: 保留 P2。** 双主题 UI 组件边界对比度不足 3:1 一半，全局令牌问题（combo 行卡 B2 复测同源），维持 P2。

---

## 复核备注（供 R2-3 批参考）

1. **测量口径差不影响判据的两处**: C1-01 的"编程 scrollLeft 可达 614"（原记录 sl=0；用户不可达结论一致）、B2-01 的 light 比值 1.24 vs 1.33（均 <<3:1）。
2. **探针执行注意**: 复跑时两处脚本坑已被 p5b/p9b 修正并留档——(a) 弹层 anatomy 须过滤零尺寸 `[role=dialog]` 节点；(b) master-detail/form-wizard 的 tab/触发器点击必须限定 `main` 作用域，否则侧边栏同名文本（如「业务单据（明细公式 + 合计）」含"明细"）会劫持定位导致误导航。
3. **系统性归族确认**: H5-01/H5-02 anatomy 输出逐字节同构（jc=normal/gap12/w50/右缘920 + footerSlots=0）→ "form actions 模板缺右对齐默认"单点修复收敛两页及同族；C4-01/04/05/07 关键数值逐位复现 → 同族 flex 收缩/最小宽度根因成立。

# R2 第 5 轮递归扩展发现 — G7（playground 19 页）收敛确认轮（round-05-g7）

> 轮次: Round 05（**收敛确认轮**：只报告通过真实用户影响检验、且与前 4 轮按根因比对后的全新根因或已立根因的跨页新实例；不为凑数量立案） · 审查日期: 2026-08-29
> 审查对象: `apps/playground/src/complex-pages/page-schemas/` 全部 19 张 schema（静态口径：schema → renderer 映射推理视觉/交互形态）；sundial 5 页视角 11/12 为验收维度必查
> session: 本轮 opencode 子 agent 会话（收敛确认轮，未注入 session id）

## 输入文件清单

- `AGENTS.md`
- `docs/analysis/ui-review/r2-audit/dispatch-shared-prefix.md`（12 视角/判级/附录 A/去重边界，全部生效）
- `docs/analysis/ui-review/r2-audit/dispatch-recursive-extension.md`
- `docs/analysis/ui-review/r2-audit/dedup-baseline.md`（§1–§4 强制遵守）
- 前轮发现（去重输入）: `round-01.md`（G7 段 :2741-3165 精读 + 台账；其余组略读理解跨组根因）、`round-02-compact.md`、`round-03-compact.md`（全文）、`round-04.md`（头部汇总表通读 + G7 段 :934-1077 精读含弃报留档）
- 辅助核实源码: `apps/playground/src/complex-pages/shared/showcase-env.ts`、`shared/mock-backend-sundial.ts`、`shared/page-data.ts`、`packages/flux-renderers-form/src/schemas.ts` 与 `__tests__/select-controlled-value-echo.test.tsx`、`__tests__/form-field-event-dispatch.test.tsx`、`packages/flux-renderers-basic/src/surface-renderer-definitions.ts`
- 输入核对注: 派发指令记 G7 前轮条目为 "R1 13 条"，`round-01.md` 实际为 **19 条**（HIGH 1 / MEDIUM 13 / LOW 5）；G7 前轮累计 **42 条**（R1 19 / R2 10 / R3 8 / R4 5），本轮去重以文件实际条目为准。

## 静态口径声明

本轮为 schema 静态审查（无浏览器运行时验证）。渲染行为类结论均经 renderer/运行时侧源码或测试契约核实：① select 对"值不在 options 中"按 S3 锁定契约回显原始值（`select-controlled-value-echo.test.tsx:55`）；② 表单字段支持 schema 级 `onChange` 动作（`form-field-event-dispatch.test.tsx:295-319`）；③ dialog `showCloseButton` 默认渲染关闭钮（`surface-renderer-definitions.ts:117,170`）。

## 19 页逐页覆盖核对表（前轮覆盖 → 本轮核查结论）

R1 台账自述 19/19 全扫，**无零覆盖页**；但各页覆盖深度不一，本轮按"薄覆盖页重走查 + 厚覆盖页盲区定向"执行：

| #   | 页面                | 前轮已覆盖（根因条目）                                                                      | 本轮核查结论                                                                                                                                |
| --- | ------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | standard-crud       | 视角2-01（primary 非法×3）、10-08 对照面；4（queryForm clearable）、5/6 内建空态与按钮序    | 已核对：行删 destructive+confirm、批删 confirm、对话框 取消(outline)+保存 均为基线正例；无新发现                                            |
| 2   | master-detail       | 10-08（删除 default 实心）、R2 视角5-01（空态语义矛盾）、R2 视角11-03（新增明细空 orderId） | 已核对：删除钮 :212-227 仍无 variant（R1-10-08 未修，维持）；选择器/详情/三数据面无新实例                                                   |
| 3   | dashboard           | 视角7 判定（6 色 hex+class 有意装饰不报）、R3 视角11-04（今日订单恒 0）                     | 已核对：6 KPI `?? 0` 回退、图表/表格 empty 均有；"实时业务概览"副标题矛盾归 R3-11-04 同源（弃报留档 #8）；无新发现                          |
| 4   | advanced-query      | R3 视角4-01（date-range 无 clearable）、R3 视角4-02（部门列原始 ID）                        | 已核对：status/role select 均 clearable；minId/maxId 无交叉校验（弃报留档 #2）；无新发现                                                    |
| 5   | approval-tasks      | 视角2-01（通过钮 primary）；6（对话框按钮序、驳回 confirm）                                 | 已核对：驳回 destructive+confirm ✓；审批对话框无「取消」仅有 X（弃报留档 #1）；无新发现                                                     |
| 6   | form-wizard         | R2 视角11-02（部门不回显不上送）、R3 视角11-02（角色枚举回显）、R4 视角3-01（旗标一次性）   | 已核对：确认步预算/通知回显正常；无新发现                                                                                                   |
| 7   | complex-form        | 视角2-01（保存钮）、R4 视角3-01（formSaved 旗标）；4（级联禁用+条件必填）                   | **新发现 [G7-R5-视角4-01]**：省份变更后城市脏值残留并随提交（前轮"级联"检查仅覆盖 disabled/placeholder，未覆盖脏值清理）                    |
| 8   | combo-editor        | 视角2-01（保存钮）；4（combo 增删）                                                         | 已核对：`minItems:1` 删除护栏属 renderer 契约（G2 域）；无新发现                                                                            |
| 9   | tree-crud           | 视角4-17、R2 视角4-01、R3 视角4-02、R3 视角11-03                                            | 已核对：四个已立根因原样在位（未修，维持）；无新发现                                                                                        |
| 10  | inline-edit-table   | 4/5/10（quickEdit + SaveBar）                                                               | 已核对：`Budget__save`→refresh 后 `total` 由服务端重算（mock-backend.ts:359-363），年度合计无陈旧问题；无新发现                             |
| 11  | detail-subtables    | 5/10（5 表 empty、tabs 分区）                                                               | 已核对：订单选择器为主实体选择器（非筛选，clearable 缺失不适用 R2-4-01 先例）；无新发现                                                     |
| 12  | business-document   | 视角2-01（提交钮）、R4 视角3-01（orderSaved 旗标）；4（行内计算）                           | 已核对：金额合计 6 行表达式与 input-table 联动正常；无新发现                                                                                |
| 13  | dynamic-tabs        | 6/5（mountOnEnter、远程 loading）                                                           | 已核对：46 行 schema 无交互面缺口；无新发现                                                                                                 |
| 14  | crud-views-export   | R2 视角11-01（data: URL 下载失效）；10/11                                                   | 已核对：表格/卡片双视图 loadAction 对称；无新发现                                                                                           |
| 15  | sundial-workbench   | R1×10 + R3×3 + R4×3（本轮最厚覆盖页）                                                       | **新发现 [G7-R5-视角11-02]**（写库后无视图消费，与 detail 页合并立案）；其余走查命中均已立根因或弃报（见弃报留档 #3/#4/#5）                 |
| 16  | sundial-detail      | R1×7 + R2×2                                                                                 | **新发现 [G7-R5-视角11-01]**（子任务对话框删除路径不同步行内列表）；列表字段行双显（R2-11-05）、对话框映射错位（R2-11-04）原样在位，维持    |
| 17  | sundial-analytics   | R1（5/7/9/11/12）+ R2/R4 弃报伴随                                                           | 已核对：KPI/图例/钻取卡数字矛盾均属 R3-11-01/R4 弃报段已登记伴随字段；无新发现                                                              |
| 18  | sundial-settings    | R1×6 + R2 视角11-06 + R4 视角11-01                                                          | 已核对：demo 占位三钮（新建列表/导出 CSV/清空缓存）符合 [G7-视角11-03] 建议的诚实占位先例；外观/关于分区为纯只读行无假 affordance；无新发现 |
| 19  | sundial-todo-dialog | R1×3 + R3 弃报（灰点）                                                                      | 已核对：选择器预选值同源（`todoDate ?? "none"`、`todoList ?? "inbox"`，无 R3-6-01/R4-6-01 同型缺陷）；无新发现                              |

## 盲区处置说明（派发指令 5 项盲区逐项交代）

1. **零覆盖页**：无（R1 台账 19/19；本轮逐页复核表见上）。
2. **已发现模式的同型兄弟实例**：定向复查了"筛选无清除路径"（全部 select 筛选已配 clearable，仅 R3-4-01 的 date-range 在位）、"KPI 恒空"（仅 dashboard，已立）、"双显矛盾"（仅 detail 列表行，已立；workbench/todo-dialog 的字段行为单值源）、"死交互"（search/子任务输入/tree-crud selection/列表与分析导航均已立，chart onClick 有 chartFocus 卡消费非死交互）——除本轮 3 条外无未立新实例。
3. **schema 级边缘态配置缺失**：19 页的 empty 配置全覆盖（table/crud 内建或显式）；loading/error 由 renderer 内建；ajax 动作失败反馈经 action 管线默认 toast——未发现新增缺口。
4. **跨页删除/新增/确认按钮语义与样式**（对照视角 2/10 基线）：企业页 取消(outline)+保存(primary) 统一、行删 destructive+confirm 统一（master-detail 一处偏离已立 R1-10-08）；sundial 分裂均已立（R1-10-09/R2-10-01/R4-2-01）。仅余审批对话框无取消钮（弃报留档 #1）。
5. **dark/语义色 token 硬编码**（视角 7）：sundial 五页 hex 为复刻品牌色（R1 判定有意不报，转 C2 G-E）；dashboard 6 色为成对装饰（R1 判定不报）——两判定维持，无新实例。

## 去重自检声明

本轮 3 条候选与 G7 前轮 42 条（R1 19 / R2 10 / R3 8 / R4 5）及跨组已立根因逐一按**根因**比对：无完全重复；[G7-R5-视角11-02] 为已立根因（R2-11-03"落库后界面不可见" + R3-11-01"静态数据未由任务库派生"）的**跨页/跨面新实例**，已在条目内注明引根与"前轮修复不覆盖本处"的理由；[G7-R5-视角4-01] 与 [G7-R5-视角11-01] 经比对为全新根因（前者非 R4-6-01"预选值脱节"家族，后者非 R1-11-13"清错状态"家族，差异均在条目内写明）。dedup-baseline §1（ma5-ux 已修复 6 条）、§2（已登记缺口不作发现）、§3（误报对照 8 条）、§4（边界排除）全程生效，无违例。

---

## 发现条目

### [G7-R5-视角4-01] complex-form 省份→城市级联切换后城市保留旧省脏值并随表单提交

- **文件**: `apps/playground/src/complex-pages/page-schemas/complex-form.json:90-106`
- **证据片段**:
  ```json
  // :90-97 省份 select —— 无 onChange 清理下游
  { "type": "select", "name": "province", "label": "省份",
    "clearable": true, "options": "${provinceOptions}", "placeholder": "选择省份" },
  // :98-106 城市 select —— options 随省份重算，但 value 无任何联动清理
  { "type": "select", "name": "city", "label": "城市",
    "clearable": true, "options": "${cityMap[province] ?? []}",
    "placeholder": "请先选择省份", "disabled": "${!province}" }
  ```
  ```ts
  // 渲染契约佐证 ①: 值不在 options 中时按 S3 锁定契约回显原始值（不空白）
  // packages/flux-renderers-form/src/__tests__/select-controlled-value-echo.test.tsx:55-56
  describe('S3 echo-fallback: value with no matching option is still visible (not blank)'
  // 渲染契约佐证 ②: 字段级 onChange 动作受支持，schema 可修
  // packages/flux-renderers-form/src/__tests__/form-field-event-dispatch.test.tsx:316-319
  onChange: { action: 'setValue', args: { path: 'echo', value: '${qty}' } }
  ```
- **严重程度**: MEDIUM
- **现状**: 城市 options 经 `${cityMap[province] ?? []}` 随省份重算，但城市字段值没有任何清理路径（schema 无 onChange 联动，渲染器亦无级联清值原语）。用户选"广东省→深圳市"后把省份改为"浙江省"：城市选项列表变为浙江城市，而字段值仍是"深圳市"——按 S3 echo 契约它仍以原文回显在 trigger 里，视觉上像"已选中"；点保存（`User__save` includeScope \*）后提交 `province=浙江、city=深圳市` 的自相矛盾地址，并收到"保存成功"。
- **行业惯例**: 级联选择器父级变更必须清理失效的子级值：Ant Design Cascader/省市区联动在父级 onChange 后重置子字段（rc-form 联动范式）；MUI 官方 dependent select 配方在父值变化时 reset 子值；shadcn form 联动示例同样 `form.setValue(child, '')`。提交数据中父子从属关系矛盾在所有参照系统中都按功能缺陷处理。
- **用户影响**: 用户改完省份，城市字段仍 visibly 显示旧省城市（echo 回显使其不易察觉为脏值），提交成功提示进一步掩盖问题；产生的矛盾地址数据在演示表单主路径上静默落库。非设计师用户在正常填写流程中必然踩中（换省份是级联表单的常规操作）。通过真实用户影响检验。
- **建议**: 给省份 select 补 schema 级清理动作（渲染器契约已支持，零 renderer 改动）：`"onChange": { "action": "setValue", "args": { "path": "city", "value": "" } }`（与 `form-field-event-dispatch.test.tsx:316-319` 同构）；清理后城市回到 disabled+placeholder"请先选择省份"态，与既有 `disabled: "${!province}"` 门禁自然衔接。
- **复核状态**: 未复核
- **去重自检**: 非 [G7-R4-视角6-01]（选择器预选值与当前值脱节）家族——彼为"打开时初始选中值来源错误"，本条为"父级变更后子级脏值不清理"，机制（openDialog args 种子化 vs 级联缺清理）与修复面（同对话框 picker vs 表达式联动）均不同；R1-R4 G7 无任何级联清理条目，全新根因。

### [G7-R5-视角11-01] sundial-detail 子任务详情对话框删除路径不同步行内列表：删除成功后行仍显示，可对同一子任务反复删除

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-detail.json:1273-1301`（对话框删除链）；对照行内删除链 `:604-627` 与行可见性旗标 `:629,711,793`
- **证据片段**:
  ```json
  // :1279-1300 对话框「删除子任务」—— ajax 后直接关窗+toast，无任何 UI 状态更新
  "onClick": [
    { "action": "ajax", "args": { "url": "/r/Sundial__deleteSubtask", "method": "post",
        "data": { "id": "${activeSubtask}" } } },
    { "action": "closeDialog", "surfaceId": "sundial-subtask-dialog" },
    { "action": "showToast", "args": { "message": "子任务已删除" } }
  ]
  // 对照 :613-619 行内 trash 按钮 —— 同一删除多维护了一步行隐藏旗标
  { "action": "setValue", "args": { "path": "subtaskDeleted1", "value": true } },
  // :629 / :711 / :793 —— 三行可见性只由这三个旗标驱动（对话框路径从不写它们）
  "visible": "${!subtaskDeleted1}"
  ```
- **严重程度**: MEDIUM
- **现状**: 同一"删除子任务"动作在本页有两条路径：行内 trash 图标（ajax + `subtaskDeletedN=true` + toast，行正确消失）与子任务详情对话框（ajax + closeDialog + toast，**缺旗标写入**）。子任务行是静态 schema（不绑数据源），对话框路径删除后 mock 库虽已删（`showcase-env.ts:599-609`，`mock-backend-sundial.ts:82-89` 物理 splice），行仍原样显示。用户若再点该行的行内 trash，会向已不存在的 id 再发一次删除 ajax（后端返回 `subtask not found` status 1）。
- **行业惯例**: 变更后 UI 状态同步是删除闭环的底线：TodoMVC/TickTick 删除即时移除条目；Ant Design Table 行删后 refresh 数据源；同一实体的多条删除入口必须共享同一份可见性状态（AG Grid row data 单源）。同页双路径一好一坏属明确完成度缺陷。
- **用户影响**: 用户点行内 chevron 打开"整理 OKR 回顾"详情 → 点"删除子任务" → toast 宣告成功 → 对话框关闭后该子任务**仍在列表里**；用户判定删除失败，重复操作并对整个页面的反馈失去信任；第二次行内删除实际是对幽灵数据发请求。通过真实用户影响检验。
- **建议**: 沿本页既定的"成对 visible"手法把对话框删除钮按 `activeSubtask` 拆为三份（`visible: "${activeSubtask === 1}"` 的按钮各自补 `{ "action": "setValue", "args": { "path": "subtaskDeleted1", "value": true } }`，2/3 同构），与行内路径共享同一旗标；或在 [G7-R2-视角11-04] 修复对话框映射时一并改为按 `activeSubtask` 统一驱动，两条路径共用一个删除链。
- **复核状态**: 未复核
- **去重自检**: 非 [G7-视角11-13]（清除按钮清错状态/toast 谎报）家族——彼为"按钮写错目标状态"，本条为"删除链漏写 UI 状态旗标，双路径状态维护分裂"， ajax 实际成功、toast 未撒谎；非 [G7-R2-视角11-04]（对话框内容映射错误）——彼为只读文案错位，本条为写路径状态不同步，R2-11-04 的修复（改正三元映射）不覆盖本处。R1-R4 无同根因条目，全新根因。

### [G7-R5-视角11-02] sundial 写库动作（移到垃圾箱/移到列表）后无任何视图消费变更：看板全部静态写死，已备的 `/r/Sundial__todos` 视图过滤端点零消费（已立根因跨页新实例）

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-detail.json:911-936`（detail 移到垃圾箱写库）；`sundial-workbench.json:2101-2123`（对话框移到列表写库）、`:2179-2201`（对话框移到垃圾桶写库）、`:1627-1663`（垃圾箱看板静态 1 行+计数）；对照 `shared/showcase-env.ts:570-581`、`shared/mock-backend-sundial.ts:33-46,60-66`
- **证据片段**:
  ```json
  // sundial-detail.json:912-921 —— 写库成功，但看板不消费
  { "action": "ajax", "args": { "url": "/r/Sundial__updateTodoItem", "method": "post",
      "data": { "id": 1, "trashed": true } } }
  // sundial-workbench.json:1656-1661 —— 垃圾箱看板静态自述，行数据写死
  { "type": "text", "text": "1 条任务在垃圾桶里", ... },
  { "type": "flex", ... "testid": "sundial-task-trashed-9",   // 唯一行：回复客户邮件
  ```
  ```ts
  // showcase-env.ts:570-576 —— 按 view 过滤的读端点已备（all/today/scheduled/done/trash）
  if (url.includes('/r/Sundial__todos') && method === 'get') {
    const items = filterSundialTasks(db.sundialTasks, view);
  // 全仓消费面: grep "Sundial__todos" 仅命中 env 定义与单测，19 张 schema 零引用
  ```
- **严重程度**: MEDIUM
- **现状**: sundial 四个写库动作（detail 移到垃圾箱/移到列表、workbench 对话框移到垃圾桶/移到列表）都真实持久化到 `db.sundialTasks` 并 toast 成功，但三个看板（默认/已完成/垃圾箱）全部是静态写死行，从不读库。用户在 detail 页把任务 1「整理季度报税材料」移到垃圾箱后切到 workbench 垃圾箱视图：仍只有「回复客户邮件」一行、计数仍"1 条"（实库已 2 条 trashed），且逾期分区仍列着已入箱的任务 1；移到列表后任务也不会出现在目标列表。mock 侧 `filterSundialTasks` 已实现与侧边栏视图一一对应的过滤（trash: `t.trashed`），schema 侧却零绑定——读写两侧断链。
- **行业惯例**: 写操作成功反馈必须伴随可见状态迁移（TickTick/TodoMVC 移入垃圾箱即时从原列表消失并出现在垃圾箱；Ant Design Pro CRUD 列表删改后 refresh）。对照本仓企业页基线：master-detail/standard-crud 的写路径均以 `component:refresh` 闭环。
- **用户影响**: 用户完成"移到垃圾箱"，toast 与详情页横幅都宣告成功，切到垃圾箱视图却找不到该任务、原分区里它还在——用户无法区分"操作失败/数据丢失/界面没刷新"，最直接的下一步动作（去垃圾箱找回）必然扑空。通过真实用户影响检验。
- **建议**: 最小闭环：workbench 三个看板分区补 `data-source`（`/r/Sundial__todos?view=all|done|trash`，端点与 view 语义已现成）并以循环渲染替换写死行；若维持静态复刻口径，则至少为垃圾箱看板行改绑 `${Sundial__todos(view=trash)?.items}`，或在四个写链的 ajax `then` 中以成对 visible 同步对应分区行的显隐（本页族既定手法）。
- **复核状态**: 未复核
- **去重自检**: **引根 ①** [G7-R2-视角11-03]（master-detail 新增明细落库后界面永久不可见）——同属"写库成功但界面不可见"根因的跨页新实例；彼修复面是 openDialog 提交数据补 orderId，不覆盖本处（本处是读侧零绑定）。**引根 ②** [G7-R3-视角11-01]（workbench 静态计数互斥）——彼为**首屏读侧**静态数字未由任务库派生（修复=改数字），本条为**写侧动作后**无任何视图消费变更（修复=绑定/刷新），R3 条目的聚合改造不含 ajax 写链路；沿 R4-11-01（settings/Sundial\_\_lists 兄弟实例）的分立先例保留独立条目。新证据"读端点已备且零 schema 消费"为前轮未触及事实。

---

## 弃报留档（核对过不立案的候选与理由）

1. **approval-tasks 审批对话框无「取消」按钮**（仅 驳回/通过 + 头部 X）：`showCloseButton` 默认渲染关闭钮（`surface-renderer-definitions.ts:117,170`），关闭路径可见可达；审批框 Approve/Reject 双钮省 Cancel 在参照系统中常见；[G7-视角10-09] 修复统一双钮时自然覆盖。
2. **advanced-query minId/maxId 无交叉校验**（min>max 得空结果无解释）：查询表单跨字段校验非本仓既定基线，Ant Design Pro 模板同样不做；结果区空态可感知，低于真实用户影响门槛。
3. **sundial-todo-dialog 列表行色点不随所选列表变色**（恒 `bg-[#636363]`，:196-199）：R3 弃报段已登记为 [G7-R2-视角11-05] 修复范围可覆盖的次要表面，维持弃报。
4. **workbench 与 todo-dialog 页「新建待办」对话框字段构成不一致**（后者多日期/旗标/列表三行）：两对话框均为 [G7-视角11-03] 已报的零提交死路径，修复该条时必然重设计对话框内容，并入不另立。
5. **workbench「选择日期」对话框（radio 今天/明天/下周/无日期）与 detail 页（input-datetime）同语义控件形态跨页分裂**：判为 [G7-视角10-09]（sundial 对话框操作区模式不统一）同根因弱表现；预选值脱节部分已由 [G7-R3-视角6-01] 立案。
6. **keyword 筛选 input-text 无清除按钮**（standard-crud/approval-tasks/advanced-query）：本仓基线为 select 配 clearable，文本筛选清除非既定契约；真实用户影响弱（全选重输即可），不立案。
7. **sundial-settings 导航行成对重复 testid、列表行 testid ×4 重复**：成对 visible 运行时同屏互斥，重复 testid 仅影响测试定位歧义，无用户可见影响。
8. **dashboard「实时业务概览」副标题与陈旧 mock（2024-07）矛盾**：属 [G7-R3-视角11-04]（今日订单恒 0，同源 mock createTime）已立根因的文案伴随，修复该条时一并处理，不另立。

## 发现汇总表

| 严重程度 | 数量  | 条目                                                              |
| -------- | ----- | ----------------------------------------------------------------- |
| HIGH     | 0     | —                                                                 |
| MEDIUM   | 3     | [G7-R5-视角4-01]、[G7-R5-视角11-01]、[G7-R5-视角11-02]            |
| LOW      | 0     | —                                                                 |
| **合计** | **3** | 新根因 2 条 + 已立根因跨页新实例 1 条（引根 R2-11-03 / R3-11-01） |

收敛趋势（G7 组）: R1 19 → R2 10 → R3 8 → R4 5 → R5 3。剩余候选均已按收敛轮判据弃报留档（8 项），G7 组未核查面已闭合；后续轮次如继续，建议仅随修复复核（复核状态翻转）而非再开新发现轮。

# R2 一致性审查 — G7 组独立复核报告（review-g7）

> 复核人: 独立复核子 agent（G7 组，与发现 agent 非同一 session）· 复核日期: 2026-08-29
> 复核基线: `git rev-parse HEAD` = `0f183874a25f942c234b9806b1546c6f37ee5a85`（符合派发指令预期 `0f183874a`）
> 复核对象: G7 组 45 条发现（round-01 G7 段 :2741-3165 / round-02 :1634-1880 / round-03 :998-1239 / round-04 :932-1077 / round-05-g7 全文）
> 方法: 对每条发现先用 Grep/Read 定位其引用的 schema 文件:行号及关联 mock/action/renderer 定义，阅读 live 代码独立判断后比对原条目输出判定。未复用发现 agent 结论作为事实。

## ① 复核概要

- **静态口径声明**: 本复核为 schema 静态复核（未启动浏览器）。涉及运行时行为的结论（KPI 恒 0、级联脏值回显、data: URL 导航拦截、args.data 种子化、selection 无消费、Sundial\_\_todos 零消费）均经 mock 数据、renderer 源码或测试契约实证：
  - `packages/ui/src/components/ui/button.tsx:6-41`（cva 无 `primary` 键，未知键取 `variants.variant['primary']` = undefined，仅剩基类）；
  - `packages/flux-renderers-content/src/link.tsx:56-63`（`<a href target rel>`，全文件无 `download`）+ `showcase-env.ts` User\_\_export 返回 `data:text/csv` URL + `packages/flux-core/src/utils/url.ts:13`（data: 在导航白名单内）；
  - `apps/playground/src/complex-pages/shared/showcase-env.ts:402-403`（`nowStamp()` 前缀匹配）+ `mock-backend.ts:227-229`（`ts()` 硬编码 `2024-07-`）；
  - `packages/flux-runtime/src/action-adapter.ts:245-250`（`args.data` → `createSurfaceScope('dialog', …, dialogData)` 种子化）；
  - `packages/flux-renderers-form/src/__tests__/select-controlled-value-echo.test.tsx:55`（S3 echo 契约）与 `form-field-event-dispatch.test.tsx:316-319`（字段级 onChange 动作）；
  - `rg "Sundial__todos"` 全仓仅命中 `showcase-env.ts` 与 `sundial-mock-backend.test.ts`，19 张 schema 零引用。
- **判定结果**: 45 条全部**保留**（HIGH 2 / MEDIUM 30 / LOW 13），**降级 0 条，驳回 0 条**。
- **数量口径勘误**: 派发指令记 "HIGH 2 / MEDIUM 31 / LOW 12"；按五轮文件实际判级统计为 **HIGH 2 / MEDIUM 30 / LOW 13**（R1 19 = 1/13/5；R2 10 = 1/8/1；R3 8 = 0/3/5；R4 5 = 0/3/2；R5 3 = 0/3/0），总数 45 不变。本表按文件实际判级记录。
- **证据级瑕疵登记（均不影响判定）**: ① [G7-视角1-02] 自述 "5 处" tray，实测全仓 7 处（workbench :201/:235/:1998、detail :427、todo-dialog :186、settings :289/:337）——低报方向，范围更大，维持 MEDIUM；② [G7-视角2-01] business-document 引 `:125`，实测 variant 在 `:124`（label 在 :125），一行微偏；③ [G7-R3-视角11-01] 中"今天分区 2 行"与任务库 dueTone=today 的 3 条（t2/t5/t10）差异系 t10 被 static 行归入"待整理"分区（R4 防复核节已登记该错位），不削弱"多套数字互斥"主结论。

## ② 逐条复核清单（45 行全覆盖）

判定列: 保留 / 降级(新级别) / 驳回。行号均为本次 live 复核实测。

### Round 01（19 条）

| #   | 条目                                        | 复核证据（live 实测）                                                                                                                                                                                                                                                                                                        | 判定                                                              |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | [G7-视角2-01] 8 处 variant:"primary" 非法   | `rg '"variant": "primary"'` 恰 8 命中（standard-crud :47/:160/:319、master-detail :280、approval-tasks :152、complex-form :151、combo-editor :71、business-document :124）；`schemas.ts:241` ButtonVariant 无 primary；`button.tsx:65` 原样透传；ui `button.tsx:10-21` cva variant 轴无 primary 键→该轴无类，基类无 bg/hover | **保留 HIGH**                                                     |
| 2   | [G7-视角1-02] icon:"tray" 不存在            | lucide-react@1.17.0 dist `\bTray\b` 0 命中、`Inbox` 存在；`icon-utils.ts:283-294` 未命中回落 Circle；实测 tray 7 处（原条目报 5 处，低报）                                                                                                                                                                                   | **保留 MEDIUM**                                                   |
| 3   | [G7-视角11-03] 新建待办"添加"仅关对话框     | workbench :1715-1724、todo-dialog :313-318 onClick 均仅 `closeSurface`，无 submitForm/ajax/toast                                                                                                                                                                                                                             | **保留 MEDIUM**（演示复刻、无数据丢失，与死交互家族同档）         |
| 4   | [G7-视角11-04] 列表/分析导航无内容分支      | `activeSection` 全文件仅 :122-291（导航高亮成对 visible）引用；三个看板 visible 仅依赖 activeView（:826-827 实测）                                                                                                                                                                                                           | **保留 MEDIUM**                                                   |
| 5   | [G7-视角11-05] 任务详情对话框静态           | :1753-1759 标题硬编码"撰写季度复盘报告"；各分区行 onClick 写入 activeTaskId=1/2/5/3/6/4/10（七处实测）                                                                                                                                                                                                                       | **保留 MEDIUM**                                                   |
| 6   | [G7-视角3-06] 划线+空圈 checkbox            | workbench :1100-1109（t2 无 value+line-through）、:1562-1570（t8）、detail :721-730（d-s3）实测一致；checkbox 无任何联动                                                                                                                                                                                                     | **保留 MEDIUM**                                                   |
| 7   | [G7-视角10-07] 破坏性操作无确认             | detail :604-626 删除子任务 ajax 硬删（`deleteSundialSubtask` 物理 splice）无 confirmText；workbench :2179-2200 / detail :911-936 移到垃圾箱同样无确认；`standard-crud.json:340,184` confirmText 先例在位                                                                                                                     | **保留 MEDIUM**（演示页低频路径降级已在条目内声明，符合判级规则） |
| 8   | [G7-视角10-08] 行删样式分裂                 | standard-crud :329-331 destructive+confirm；master-detail :212-226 删除按钮无 variant 落 default 实心                                                                                                                                                                                                                        | **保留 MEDIUM**                                                   |
| 9   | [G7-视角10-09] sundial 对话框按钮模式不统一 | 实测：detail 7 处全"确认"（:175/:324/:509/:891/:1015/:1096/:1173）；workbench :1846/:1934/:2062"确定"、:2159"确认"；todo-dialog :122/:257 仅"确定"无取消                                                                                                                                                                     | **保留 MEDIUM**                                                   |
| 10  | [G7-视角4-10] 保存不含连接信息              | settings :1002 `includeScope: ["mode"]`；supabase-url/-key 输入在位（:957-982）；env `Sundial__updateSettings` 仅消费 mode                                                                                                                                                                                                   | **保留 MEDIUM**                                                   |
| 11  | [G7-视角6-11] eye 图标纯展示                | settings :977-982 裸 icon 节点，父 flex 无 onClick；input-text 无 password 类型恒明文                                                                                                                                                                                                                                        | **保留 MEDIUM**                                                   |
| 12  | [G7-视角11-12] 同步状态卡不联动             | :1036-1048 "已连接"/"Supabase" 硬编码；status 卡区域无 mode 引用（mode visible 仅出现在 :590-806 选卡区）                                                                                                                                                                                                                    | **保留 MEDIUM**                                                   |
| 13  | [G7-视角11-13] 清除按钮清错状态             | :206-229 清 `demo-date`，:200-204 徽标 `${pickedDateLabel \|\| '8/18'}` 不受影响，toast 谎报"日期已清除"                                                                                                                                                                                                                     | **保留 MEDIUM**（低频降级已声明）                                 |
| 14  | [G7-视角11-14] 添加子任务输入无提交路径     | :797-803 裸 input-text 不在 form 内，全文件无 subtask-add 消费                                                                                                                                                                                                                                                               | **保留 MEDIUM**                                                   |
| 15  | [G7-视角3-15] 自定义行无 focus-visible ring | `sundial-replica.css` `focus-visible` 0 命中；`flex.tsx:104-117` div[role=button][tabindex=0] 无 ring 类；仅 hover（:248-251）                                                                                                                                                                                               | **保留 LOW**（视角 3 明确检查项；"存在默认指示→LOW"先例一致）     |
| 16  | [G7-视角1-16] 垃圾箱/垃圾桶混用             | :688 导航"垃圾箱"、:1617 看板"垃圾桶"、:1658"1 条任务在垃圾桶里"、:2175"移到垃圾桶"、:2198 toast"已移到垃圾箱"                                                                                                                                                                                                               | **保留 LOW**                                                      |
| 17  | [G7-视角4-17] 过滤回显原始 ID               | tree-crud :48-53 `${treeFilter?.deptId ? …}` 直出 value；labelField=valueField 分离在位                                                                                                                                                                                                                                      | **保留 LOW**                                                      |
| 18  | [G7-视角1-18] chevron-down 死图标           | detail :525-544 区头 flex 无 onClick，图标静态                                                                                                                                                                                                                                                                               | **保留 LOW**                                                      |
| 19  | [G7-视角11-19] 切换 toast 噪音              | workbench :328-342 实测 setValue+showToast 成对（5 视图×2 份）；settings :79-93 同构（5 分区×2 份）                                                                                                                                                                                                                          | **保留 LOW**                                                      |

### Round 02（10 条）

| #   | 条目                                            | 复核证据（live 实测）                                                                                                                                                                                                                                                              | 判定                      |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 20  | [G7-R2-视角11-01] data: URL 下载失效            | crud-views-export :41-48 link `href=${exportUrl}` `target="_blank"`；showcase-env User\_\_export 返回 `data:text/csv` URL；link.tsx 渲染 `<a>` 无 download；LinkSchema/renderer 全文无 download；url.ts:13 data: 白名单；`complex-pages.test.tsx:155-156` 仅断言 href 形态从未点击 | **保留 HIGH**（详见 ④-B） |
| 21  | [G7-R2-视角4-01] input-tree 无 clearable 锁死   | tree-crud :36-45 未配置 clearable；`tree-controls.tsx:418-430` 渲染器支持（hasSelection 时出清除钮）；`tree-options.ts:169-171` 单选不反选返回 candidate                                                                                                                           | **保留 MEDIUM**           |
| 22  | [G7-R2-视角5-01] 空态语义与引导矛盾             | master-detail :48/:61/:74 三处 `sendOn: "mdFilter?.orderId"`、:88-92 标题条件、:331/:352 "暂无日志/暂无收货地址"                                                                                                                                                                   | **保留 LOW**              |
| 23  | [G7-R2-视角10-01] 移到垃圾箱按钮分裂            | detail :906-909 destructive+sd-btn-danger；workbench :2174-2177 ghost+sd-btn-ghost（css :131-146 ghost 透明底/default 品牌底实测）                                                                                                                                                 | **保留 MEDIUM**           |
| 24  | [G7-R2-视角11-02] wizard 部门不回显不上送       | step2 picker deptId :61-80；确认步 :104-131 仅姓名/邮箱/角色/预算/通知；onComplete :140-152 data 无 deptId；`User__save` 支持 deptId 入库                                                                                                                                          | **保留 MEDIUM**           |
| 25  | [G7-R2-视角11-03] 空 orderId 新增明细落库不可见 | toolbar :232-241 无 disabled；:253-259 orderId 直传 `${mdFilter?.orderId}`；showcase-env :304 `String(source.orderId ?? '')` 空串入库；findPage :278-288 恒按当前 orderId 过滤                                                                                                     | **保留 MEDIUM**           |
| 26  | [G7-R2-视角11-04] 子任务对话框映射错误          | detail :646-648 行 #2"整理 OKR 回顾"；:1256 三元 2→"整理发票"；:1264 归属"整理季度报税材料"与本页父任务矛盾                                                                                                                                                                        | **保留 MEDIUM**           |
| 27  | [G7-R2-视角11-05] 列表行双显                    | :437-450 动态表达式值+静态 `sd-list-dot-blue` 色点+静态"工作"同 row 实测                                                                                                                                                                                                           | **保留 MEDIUM**           |
| 28  | [G7-R2-视角11-06] "即将推出"可选中可保存        | :843-846 warning 徽标；两份 choice-row onClick `setValue mode=selfhost`（:878-884 实测）；env validModes 含 selfhost 校验放行                                                                                                                                                      | **保留 MEDIUM**           |
| 29  | [G7-R2-视角11-07] 搜索框无消费方                | workbench :84-110 input `name:"search"`；`${search}` 全文件零消费（grep 实测仅命中输入定义自身）                                                                                                                                                                                   | **保留 MEDIUM**           |

### Round 03（8 条）

| #   | 条目                                     | 复核证据（live 实测）                                                                                                                                                                                                                                                     | 判定                                           |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 30  | [G7-R3-视角4-01] date-range 无 clearable | advanced-query :56-61 无 clearable；:41-47/:48-55 兄弟 select 均 clearable；`date-range-renderer.tsx:99` `clearable === true` 默认关、:420 渲染分支                                                                                                                       | **保留 MEDIUM**                                |
| 31  | [G7-R3-视角4-02] 部门列原始 ID           | advanced-query :80-82 `deptId` 列头"部门"、tree-crud 列头"部门ID"；`toUserListRecord` role/status 均有映射、deptId 原样透传（mock-backend :159-160）                                                                                                                      | **保留 MEDIUM**                                |
| 32  | [G7-R3-视角11-01] workbench 多套计数互斥 | 侧栏 14/14/…/6（:145/:358/:610 实测）；压力卡 逾期3/今天5（:887-908 实测）vs env Sundial\_\_pressure 3/5/4/2 total14；逾期分区 count"1"（:1057）；完成看板"共 2 条"（:1589）vs 侧栏 6；任务库实际 逾期1/今天3/未来2/无日期1/完成2（mock-backend-sundial :33-46 逐条核对） | **保留 MEDIUM**（瑕疵③见概要，不影响互斥结论） |
| 33  | [G7-R3-视角11-02] wizard 角色原始值回显  | :116-118 `${wizardData.step2.role \|\| "-"}`；`dict:"role"`（:55-58）渲染中文；DICT_ROLE 中文标签在位（mock-backend :448-452）                                                                                                                                            | **保留 LOW**                                   |
| 34  | [G7-R3-视角11-03] selection 无消费方     | tree-crud 全文 94 行实测无 toolbar/listActions，`selection:{}` 在位；standard-crud :170-189 批量删除对照在位                                                                                                                                                              | **保留 LOW**                                   |
| 35  | [G7-R3-视角11-04] 今日订单恒 0           | dashboard :147-151 `${summary?.todayOrders ?? 0}`；env :402-403 `nowStamp()` 前缀匹配；`ts()` 恒 `2024-07-`（mock-backend :227-229）——静态不可能相交成立                                                                                                                  | **保留 LOW**                                   |
| 36  | [G7-R3-视角7-01] 已完成任务红色徽标      | workbench :1575-1584 t8 划线+"昨天" `sd-badge-error`；:1554-1558 t7"今天" `sd-badge-brand`；css :102-105 error=红                                                                                                                                                         | **保留 LOW**                                   |
| 37  | [G7-R3-视角6-01] 日期预选值与显示值脱节  | :1791-1794 徽标回退 `'8/18'`；:1816-1818 表单回退 `'今天'`；options 无"8/18"                                                                                                                                                                                              | **保留 LOW**                                   |

### Round 04（5 条）

| #   | 条目                                            | 复核证据（live 实测）                                                                                                                                                                                                                          | 判定                                                      |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 38  | [G7-R4-视角11-01] Sundial\_\_lists 计数 6/3/4/2 | env :556-568 写死 6/3/4/2（合计 15）；任务库实算 工作5/家庭2/购物1/收件箱3；settings :1176-1181 直读 lists；同页 :1445"10 条任务 / 4 个列表"互斥                                                                                               | **保留 MEDIUM**                                           |
| 39  | [G7-R4-视角6-01] 移到列表预选硬编码 work        | workbench :2097-2100 `args.data.list:"work"`；:2130-2132 `${list ?? "work"}`；:2101-2112 onSubmitSuccess 无条件 ajax 持久化+toast；action-adapter :245-250 args.data 种子化 scope 实证；:2009 字段行另一状态源 `taskDetailListLabel ?? '工作'` | **保留 MEDIUM**（需一次确认点击，非误触，不判 HIGH 成立） |
| 40  | [G7-R4-视角3-01] 四页一次性保存旗标             | complex-form :25-30/:140-145、combo-editor :15-20/:60-65、business-document :19-24/:113-118、form-wizard :141-156/:158-163 全部实测 `then: setValue X true` + 单向旗标文案；四 schema 内均无复位路径                                           | **保留 MEDIUM**                                           |
| 41  | [G7-R4-视角10-01] 选择列表选项集不一致          | todo-dialog :234-251 四项含购物；workbench :2042-2046（值域为中文名）与 :2139-2143、detail 三处 picker 均 3 项；`rg 'shopping\|购物'` workbench/detail 0 命中；任务库 t8 `list:'shopping'` 在位                                                | **保留 LOW**                                              |
| 42  | [G7-R4-视角2-01] workbench 主 CTA ghost         | workbench :809-813 ghost+sd-btn-ghost（css 透明底实测）；todo-dialog :21-25 ghost+**sd-btn-default**（css 品牌橙实底实测）——同动作双形态                                                                                                       | **保留 LOW**                                              |

### Round 05（3 条）

| #   | 条目                                       | 复核证据（live 实测）                                                                                                                                                                                                                                                                                                                                                        | 判定                            |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 43  | [G7-R5-视角4-01] 级联切换后城市脏值随提交  | complex-form :90-97 省份 select 无 onChange（`rg onChange` 该文件 0 命中）；:98-106 城市 `${cityMap[province] ?? []}` + `disabled: ${!province}`；S3 echo 契约（select-controlled-value-echo.test.tsx:55）证实无匹配值仍原文回显；submitAction `includeScope:"*"` 全量上送；字段级 onChange 为渲染器已支持能力（form-field-event-dispatch.test.tsx:316-319），建议修复面成立 | **保留 MEDIUM**                 |
| 44  | [G7-R5-视角11-01] 对话框删除不同步行内列表 | 对话框删除链 :1279-1300 ajax+closeDialog+toast、**无旗标写入**（实测）；行内链 :604-626 多写 `subtaskDeleted1=true`；三行 visible 仅由 :629/:711/:793 三旗标驱动；`deleteSundialSubtask` 物理 splice + 重复删除返回 `subtask not found`（showcase-env :600-609 实测）——幽灵行可重复删除链路成立                                                                              | **保留 MEDIUM**                 |
| 45  | [G7-R5-视角11-02] 写库动作零视图消费       | detail :911-936 / workbench onSubmitSuccess :2101-2123 / :2179-2201 四条写链均真实持久化；看板静态（:1627-1663 "1 条任务在垃圾桶里"+写死行实测）；`rg "Sundial__todos"` 仅 env+单测命中、19 张 schema 零引用；`filterSundialTasks` 按 view 过滤已实现（mock-backend-sundial :48-66）——读写断链实证                                                                           | **保留 MEDIUM**（引根核验见 ③） |

## ③ 去重记录（"新实例/引根"条目核验）

全部 11 条带引根/家族关系的条目逐一核验：**引根均在位存在，修复面互不覆盖，新实例判定全部成立**。

| 条目              | 引根                                  | 核验结论                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [G7-R2-视角4-01]  | （首实例）                            | —                                                                                                                                                                                                                                |
| [G7-R2-视角10-01] | [G7-视角10-08]                        | 引根在位（standard-crud destructive vs master-detail default）；本条对象为 sundial detail/workbench 的 trash 按钮，修复面不重叠 ✓                                                                                                |
| [G7-R2-视角11-07] | [G7-视角11-14]                        | 引根在位（detail 子任务输入）；本条对象 workbench 搜索框，页面与控件不同 ✓                                                                                                                                                       |
| [G7-R3-视角4-01]  | [G7-R2-视角4-01]                      | 引根在位（input-tree）；R2 修复建议仅覆盖 tree-crud，不治愈 advanced-query date-range ✓                                                                                                                                          |
| [G7-R3-视角4-02]  | [G7-视角4-17]                         | 引根在位（回显行表达式）；本条为列表数据面无标签映射，波及整列，advanced-query 未被 R1 覆盖 ✓                                                                                                                                    |
| [G7-R3-视角11-02] | [G7-视角4-17]                         | 同根因新实例（不同页/控件）；与 [G7-R2-视角11-02]（漏字段）根因确不同——确认步 role 行在位但输出原始值 ✓                                                                                                                          |
| [G7-R3-视角11-03] | [G7-视角11-14]/[G7-R2-视角11-07]      | "邀请交互无闭环"家族的表格选择面新实例；standard-crud 消费契约对照在位 ✓                                                                                                                                                         |
| [G7-R4-视角11-01] | [G7-R3-视角11-01]                     | 已核对 R3 建议原文：仅覆盖 workbench 静态文本 + `Sundial__summary`/`Sundial__pressure`，`Sundial__lists` 与 settings 四行确不在其修复面 ✓                                                                                        |
| [G7-R4-视角6-01]  | [G7-R3-视角6-01]                      | 引根对象仅 taskDetailDate、本地显示态；本条 args.data 种子化 + ajax 持久化，机制与后果均升级 ✓                                                                                                                                   |
| [G7-R4-视角3-01]  | [G7-视角11-12]（家族）                | 家族同（状态指示脱节）机制不同（单向旗标 vs 文案未绑定），四页横跨，修复面独立 ✓                                                                                                                                                 |
| [G7-R4-视角2-01]  | [G7-视角2-01]（家族）                 | 家族同（主操作权重缺失）机制不同（合法 ghost + 复刻类 vs 变体失效），企业页修复不覆盖 ✓                                                                                                                                          |
| [G7-R5-视角11-01] | （声明全新根因）                      | 与 [G7-视角11-13]（清错状态/toast 谎报）、[G7-R2-视角11-04]（映射错位）逐一比对：本条 ajax 真实成功、toast 未撒谎，为"双删除路径状态维护分裂"，R2-11-04 的映射修复不覆盖旗标缺失 ✓                                               |
| [G7-R5-视角11-02] | [G7-R2-视角11-03] + [G7-R3-视角11-01] | 双引根均在位；引根①修复面=提交数据补 orderId/disabled（写侧表单），引根②修复面=改静态数字（首屏读侧常量），本条=读侧零绑定（schema 从不调 Sundial\_\_todos），均不覆盖；"端点已备且零 schema 消费"为前轮未触及事实（grep 实证）✓ |

R1 19 条均为首报；R5 弃报留档 8 项经抽查（#1 showCloseButton 默认、#6 keyword 清除、#7 重复 testid）与 live/源码一致，弃报理由成立，不构成漏报。

## ④ 高风险逐项复核详情（HIGH 2 条）

### ④-A [G7-视角2-01] 8 处 `variant:"primary"` 非法 — 保留 HIGH

**复核过程**：

1. `rg -n '"variant": "primary"' apps/playground/src/complex-pages/page-schemas/` → 恰 8 处命中，行号与条目一致（唯 business-document 实测 :124 vs 条目 :125，一行微偏，因 label 与 variant 相邻）。受影响的全部是各页主操作：新增（toolbar）、新增/编辑对话框"保存"、审批"通过"、复杂表单"保存"、保存联系人、提交采购单。
2. 类型层：`packages/flux-renderers-basic/src/schemas.ts:241` 实测 `variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'` —— 无 `primary`。JSON schema 不经 TS 检查，非法值可静默入库。
3. 渲染层：`packages/flux-renderers-basic/src/button.tsx:63-66` 实测 `(props.props.variant ?? 'default') as ButtonVariant` 原样透传至 ui `Button`；`packages/ui/src/components/ui/button.tsx:6-41` 实测 cva variant 轴仅 default/outline/secondary/ghost/destructive/link 六键——`primary` 作为 truthy 未知键被用作查表 key，`variants.variant['primary']` = undefined，该轴**不产出任何类**（defaultVariants 仅在 prop 为 falsy 时兜底，'primary' 非 falsy）。结果：按钮仅剩基类（`border-transparent`、`text-sm`、focus ring），无背景、无边框、无 hover 类。
4. 权重倒挂实测：standard-crud 编辑对话框取消钮 `:313-315` 为 `outline`（有边框），保存钮 `:317-321` 为 `primary`（无任何背景）——同操作区弱强倒挂成立。
5. 修复建议核验：改 `"default"` 与 master-detail :237 新增钮及 sundial 页写法一致，零成本成立。

**结论**：证据-结论逻辑链完整；主表单路径（保存/提交/通过）主按钮视觉上退化为纯文本，符合判级 HIGH（用户交互障碍：主操作无法辨识）。**保留 HIGH。**

### ④-B [G7-R2-视角11-01] 导出下载 data: URL 断链 — 保留 HIGH

**复核过程**：

1. 数据链实测：`crud-views-export.json:41-48` 唯一交付出口为 `link`（`href: "${exportUrl}"`、`target: "_blank"`、label"点击下载"）；`showcase-env.ts` User\_\_export 分支实测返回 `` `data:text/csv;charset=utf-8,${encodeURIComponent(…)}` `` ——页面主路径的最终产物就是 data: URL。
2. 渲染层实测：`packages/flux-renderers-content/src/link.tsx` 全文渲染 `<a href={href} target={target} rel={rel}>`，无任何 `download` 属性；`rg download` 于 link schema/renderer 零命中——`LinkSchema`/`LinkRenderer` 不消费 download 能力。
3. 框架层实测：`packages/flux-core/src/utils/url.ts` 注释明示 data: 是"既定的下载链接机制"且在导航白名单——即框架层有意放行，但放行的恰是浏览器必拦的导航形态（rel 兜底 `noopener noreferrer` 不改变拦截行为）。
4. 测试盲区实测：`complex-pages.test.tsx:151-158` 仅断言 `link.href` 匹配 `/^data:text\/csv/`，从未触发点击——"测试全绿但断链真实存在"的说法成立。
5. 浏览器行为复核（静态口径下的外部事实核验）：Chromium 自 60、Firefox 自 59 起拦截顶层 frame 导航到 data: URL，含 `target="_blank"` 新开导航（控制台 "Not allowed to navigate top frame to data URL"）；唯一例外是 `download` 属性。原条目该技术论断准确。此项为静态复核中唯一依赖外部已归档平台行为的判断，置信度高（主流浏览器稳定多年的一致行为，非版本边缘特性）。
6. 严重度核验：该页主路径为「导出 → 下载」，最末一步在三大主流浏览器 100% 无响应，符合判级 HIGH（功能缺陷、主路径断裂）；建议①（renderer 增加 download 透传）为框架级正确修复面。

**结论**：证据链完整、用户影响检验通过（非设计师用户点"点击下载"必然无响应并反复重试）。**保留 HIGH。**

## ⑤ scope-conflict 裁定

G7 组 45 条**均未标注 `[scope-conflict]`**（rg 实证：round-01/02/03/04/05 的 G7 段零命中；全仓命中均为 G1/G3 组条目）。逐条核对后确认：G7 各条主影响均为用户可见视觉/交互/完成度，未涉维度 09-12 建模契约或全量 WCAG。[G7-视角3-15]（focus-visible ring，LOW）触及 ARIA 焦点指示，但按视角 3 明确检查项（"tabIndex={0} 非 button 元素是否有 focus ring"）与"存在默认指示→LOW"既定先例归属 UX 一致性，无需改判。**裁定：G7 组无需归属调整。**

## ⑥ 降级/驳回模式复盘

- **降级 0 条、驳回 0 条**：45 条的文件:行号证据全部实测命中，证据-结论逻辑链全部成立，无 §3 误报模式复发（无 opacity-0 select、无 ml-auto、无 ghost 无边框类指控、无 icon-xs 尺寸类指控、无截断类指控），无 §2 已登记缺口被当作发现（sundial 静态行/成对 visible 等 G-F/G-E 表象均在"转 C2 候选"或条目受限说明中正确归档，未计入发现），无 §4 边界外条目。
- **判级抽查**：三处 HIGH→MEDIUM 降级（视角10-07、视角11-13、R2-11-03）均在条目内显式声明降级理由（演示页低频路径/次要路径），符合判级规则"HIGH 仅在极低频路径→MEDIUM"。两处潜在升档点经复核维持原判：[G7-视角11-03]（新建待办死路径，主操作但属静态复刻演示语境、无数据丢失，MEDIUM 与死交互家族同档一致）；[G7-R4-视角6-01]（静默持久化移列表，因需一次显式确认点击不判 HIGH，成立）。
- **证据瑕疵三点**（见概要，均不改变判定）: tray 计数低报（5→实测 7）、business-document 行号微偏（:125→:124）、R3-11-01 "今天分区 2 行"与任务库 3 条的差异由静态行错位（t10 归待整理，R4 防复核节已登记）解释，互斥主结论不受影响。

## 复核结论

G7 组 45 条（HIGH 2 / MEDIUM 30 / LOW 13，按五轮文件实际判级）**全部复核通过并保留原判**；HIGH 两条（[G7-视角2-01]、[G7-R2-视角11-01]）证据链经渲染器/mock/测试三层实证，均维持 HIGH。无降级、无驳回、无 scope-conflict。发现质量良好：行号引用精度高（45 条仅 1 处一行微偏）、引根关系全部成立、R5 弃报留档与 live 一致。

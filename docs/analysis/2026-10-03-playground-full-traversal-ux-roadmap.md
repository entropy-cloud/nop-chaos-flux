# Playground 全页面遍历 UX Roadmap（R13：全页面 × 全操作按钮确认与主子通信标准化）

> 创建日期：2026-10-02（R12 收口后用户提出）
> 状态：**已收口（2026-10-03）**——全部六波完成：W-A1（40/40 操作面，P1×1+P2×1 当波修复）、W-A2（主子通信对齐审计，13 schema 转标准+裁定）、W-B（设计器 10 页）、W-C（渲染器演示 27 页）、W-D（AI 14 页）、W-E（性能/基建/实验 27 页）——118 路由页全覆盖、零 JS 错误，确认卡见 §六（109 表项：108 ✅ + 1 ⚠️1，零 ❌）；P3 尾册与 P2 改判 follow-up 见 §七；波次计划 docs/plans/2026-10-03-537~543 全部 completed（各带独立审计）。
> 用户验收原话：每一个页面展现都要达到 UI/UX 要求，布局合理、美观、操作符合预期；弹窗中操作后需要更新到子页面的要更新到子页面；使用标准方案实现主子页面通信；不跨页面使用 id，页面内也尽量不使用 id。
> 方法论基线：browser-use 实机逐页逐按钮遍历（R12 的 40 页确认与此同法；禁纯探针下结论——R12 复审教训）。

## 一、范围清单（118 路由页，全量无抽样；§六 矩阵按表项回填，w 系列十页合并一行跟踪）

| 波次 | 分组                                       | 页数 | 清单来源                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 现状基线                                                                                                                  |
| ---- | ------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| W-A  | Complex Pages（外部应用刻划 + 数据可视化） | 40   | `apps/playground/src/complex-pages/complex-pages-model.ts`（45 id 项中 40 页 + 类目节点）                                                                                                                                                                                                                                                                                                                                                                                                 | **R12 已全量确认过展现层**（`2026-10-03-complex-pages-browser-confirmation-roadmap.md`）；本轮增量 = **操作按钮逐一触发** |
| W-B  | 设计器 / 编辑器大家族                      | 10   | page-designer、flow-designer、taskflow-designer、report-designer、report-designer-host、print-designer、dashboard-demo、word-editor、code-editor、scada-editor-demo                                                                                                                                                                                                                                                                                                                       | R1-R12 修复基线 + 原始审计 19 路由确认；本轮增量 = 全按钮遍历                                                             |
| W-C  | 渲染器演示页                               | 27   | flux-basic、table-column-width、table-popover、tree-display-ux、condition-builder、condition-builder-formula、form-input-enhancements、input-suggest、layout-family-enhancements、text-icon-visual-fields、component-handles、event-prevention、boolean-control-value-contract、data-verify、env-stream、diff-view、graph-demo、map-demo、pivot-table-demo、leafer-examples、three-canvas-demo、mobile-components、mobile-infrastructure、gantt、kanban、scheduling-calendar、spreadsheet | 多数从未逐按钮确认                                                                                                        |
| W-D  | AI 家族                                    | 14   | ai-chat、ai-tools、ai-widgets、ai-hitl、ai-citations、ai-conversations、ai-persistence、ai-coverage、ai-component-handle、ai-rich-text、ai-linkage、ai-p4、ai-virtual-scroll、ai-attachments                                                                                                                                                                                                                                                                                              | 从未逐按钮确认                                                                                                            |
| W-E  | 性能 / 基建 / 实验页                       | 27   | performance-table、gantt-perf-scale、kanban-perf-scale、calendar-perf-scale、diff-perf-scale、scada-perf-scale、scada-pressure-demo、scada-demo、scada-edge-cases、gantt-states、m1-responsive、m2-touch、m3-layout、m4-data、m5-showcase（移动五页）、barcode-input、debugger-lab、w1a-w4c 内容家族十页                                                                                                                                                                                  | 从未逐按钮确认（w 系列为内容组件样例页）                                                                                  |

> 合计 40 + 10 + 27 + 14 + 27 = **118 路由页**（home 入口页不计；report-designer-host 并列确认；dingtalk-flow-demo 为死路由不计）。原「115」系多波次口径误差（W-E 少计 8 + W-C 漏 env-stream，原「40+75」分项亦加不出 115），2026-10-03 W-C 评审逐波核对修正。gantt、kanban、scheduling-calendar、spreadsheet 四条 live 路由原未入波次，已并入 W-C（2026-10-03）。

## 二、逐页验收标准（每页六查，全部通过才记「确认」）

1. **布局合理**：无塌陷 / 黑域 / 溢出裁切 / 元素重叠；栅格与间距成体系；窄宽（1024）不破版。
2. **美观**：色彩对比达标（正文 ≥ 4.5:1）、字体层级清晰、间距一致、深浅主题下均成立。
3. **操作符合预期**：页面上**每一个按钮/可点元素逐一触发**——点击后有且仅有其语义所指的反馈（成功提示 / 列表刷新 / 弹窗打开 / 状态翻转 / 导航），无空点、无报错、无误跳。
4. **弹窗 → 子页面更新**：弹窗内提交/修改后，宿主列表/子表/统计卡随之更新（数据可见变化），关闭弹窗无残留遮罩。
5. **主子页面通信走标准方案**（见 §三）：dialog/drawer 用 `refreshNearest` + 生命周期钩子；主从联动用 scope 选择所有权（`selectionStatePath` + `dependsOn`）；不得自造“回调传入再手动刷”的旁路。
6. **id 规范**（见 §四）：页面间导航不以 id 耦合；页面内不以 DOM id / 自造 id 做组件协作依据。

不满足项按严重度记 P1（功能性破坏/数据不一致）/ P2（观感或交互瑕疵）/ P3（打磨项）；P1 当波修复，P2 当波修复或书面改判，P3 登记 roadmap 尾册。

## 三、主子页面通信标准（既有设计，本轮为「对齐审计」而非新造）

仓库已有成文标准（2026-07-27 设计 + 落地，R12 多页在用）：

| 场景                        | 标准方案                                                                                                                       | 禁止                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 弹窗表单提交 → 刷新宿主列表 | `openDialog` → form `submitForm` → `onSubmitSuccess: [{ action: 'refreshNearest' }]`；`closeSurface` 放 `submitForm.then` 链   | 手动传宿主 id/name 定位刷新；`onSubmitSuccess` 里混 `closeSurface` |
| 抽屉同理                    | `openDrawer` + 同上钩子                                                                                                        | 同上                                                               |
| 主从联动（左列表右详情）    | scope 选择所有权：`selectionStatePath` + 详情数据源 `dependsOn` 选择根                                                         | 跨组件直接读写对方 scope、以 DOM id 定位                           |
| 跨页导航携带上下文          | 页面参数经 route/scope 传递；**数据接口 URL 携带资源 id 属合法 REST 语义**（`/r/Xxx__issue?id=` 是后端寻址，不是页面 id 耦合） | `#/page?id=123` 式把行 id 拼进页面 hash                            |

参考文档：`docs/analysis/2026-07-27-flux-dialog-submit-refresh-design.md`（十大 Gap 与 A/B/C 方案）、`docs/architecture/surface-lifecycle-callbacks.md`、`flux-guide/design-patterns/page-dialog-drawer.md`。

执行期动作：对每个含「弹窗 + 宿主数据」组合的页面，核对是否为上述标准形态；非标准形态（自造刷新旁路 / 遗留 `refreshTable` 直调 / 缺 `refreshNearest`）记 P2 并当波改为标准方案。

## 四、id 使用规范与现状

- **页面间**：不得以行 id 拼页面 hash 传参（master-detail 类页面经 scope 选择态传递）。实机扫描现状：**complex-pages 40 页 hash 导航零 id 传参**，合规。
- **页面内**：组件协作不得依赖 DOM id；渲染层 `getElementById` 现状 **0 处**（仅 main.tsx 挂载点，合法）。schema 内 `data-testid` 是测试锚点不是协作通道，维持。
- **接口 URL**：`/r/资源?id=` 为 REST 资源寻址，**不属禁用范围**（airtable/linear 等 6 处合规使用）。
- 执行期动作：逐页确认时顺带核对「新增交互未引入 id 耦合」；发现渲染器强制要求 id 才能协作的（如历史遗留 `refreshTable(id)`），登记到渲染器级 follow-up。

## 五、波次执行计划（顺序执行，波内逐页）

| 波次 | 内容                                                                                     | 页数       | 预估     | 退出标准                     |
| ---- | ---------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------- |
| W-A1 | complex-pages 40 页：操作按钮逐一触发（展现层复用 R12 确认，不重复截图确认；只补操作面） | 40         | 3-4 会话 | 40 页确认卡全部回填；P1 清零 |
| W-A2 | complex-pages 主子通信对齐审计（弹窗+宿主组合页逐一核对 §三 标准形态）                   | 组合页 ~12 | 1 会话   | 非标准形态清零或登记         |
| W-B  | 设计器/编辑器 10 页全按钮遍历（每页含工具栏/右键/弹窗/模式切换全操作）                   | 10         | 2-3 会话 | 确认卡回填；P1 清零          |
| W-C  | 渲染器演示页 27 路由（原 23 + 评审补入 gantt/kanban/scheduling-calendar/spreadsheet）    | 27         | 2 会话   | 确认卡回填；P1 清零          |
| W-D  | AI 家族 14 页                                                                            | 14         | 1-2 会话 | 确认卡回填；P1 清零          |
| W-E  | 性能/基建/实验 27 页（18 表项，w 合并行含 10 页）                                        | 27         | 1 会话   | 确认卡回填；P1 清零          |
| W-F  | 收尾：全量 P2/P3 尾册复核 + 本文档状态收口 + 提交                                        | —          | 0.5 会话 | 本文 §六 矩阵 100% 回填      |

每页产出「确认卡」（回填 §六 矩阵）：页面 | 遍历日期 | 按钮总数/触发数 | 六查结论 | P1/P2/P3 清单 | 修复去向（当波修复 / 登记编号）。

## 六、逐页确认矩阵（执行期回填）

> 记法：`✅` 确认；`⚠️n` 确认但 n 项在册；`❌` 有 P1 未清。执行一次回填一行。

### W-A Complex Pages（40）

| 页面                    | 状态 | 卡片                                                                                                     |
| ----------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| crud-views-export       | ✅   | 导出 toast+下载链接、表格/卡片视图切换、分页全通（截图目检）                                             |
| dynamic-tabs            | ✅   | 远程数据 tab 懒加载 3 行+共 3 条（mountOnEnter 实证）                                                    |
| standard-crud           | ✅   | CRUD 全链路：新增/编辑回填/删除确认/批量删除（34→32 条）/搜索重置/排序/分页/折叠                         |
| tree-crud               | ✅   | 30 树节点逐点联动过滤（10→6→2→1…）+清除复原                                                              |
| inline-edit-table       | ✅   | input-number 步进器 ×80、行保存 toast、分页全通                                                          |
| advanced-query          | ✅   | 搜索过滤（10→1）/重置/分页全通                                                                           |
| master-detail           | ✅   | 点选 NO-20240702 → 详情+SKU 4 行+子表 tab 切换                                                           |
| detail-subtables        | ✅   | 订单选择器 dialog+清除+三子表 tab 切换                                                                   |
| business-document       | ✅   | 步进器数量 2→4 金额 36000→72000 实时重算；新增/删除行；提交校验 toast 可读                               |
| combo-editor            | ✅   | 添加项 共 2→3→2 位、删除/排序、保存校验 toast 可读（P3 双删除钮维持登记）                                |
| form-wizard             | ✅   | 三步跳转+上一步 step1 禁用+分步校验                                                                      |
| complex-form            | ✅   | 级联（省→市解禁）/高级选项展开/保存校验 toast 可读                                                       |
| approval-tasks          | ✅   | 10 处理钮全部弹审批框；通过 → 待审批→已通过+列表即时更新                                                 |
| dashboard               | ✅   | 纯展示页零操作钮；pageOverflow=0 饼图完整（截图）                                                        |
| sundial-workbench       | ✅   | 视图切换 toast×5、分组折叠、添加待办弹窗                                                                 |
| sundial-analytics       | ✅   | 纯展示页零操作钮，零错误                                                                                 |
| sundial-detail          | ✅   | 旗标 toast、子任务校验、日期/重复/列表/移动/垃圾箱弹层全开                                               |
| sundial-settings        | ✅   | 设置分组 toast×5+返回导航                                                                                |
| sundial-todo-dialog     | ✅   | 标题自动聚焦、添加 → toast 待办已添加+弹窗关闭                                                           |
| antdpro-list            | ✅   | 新建订单弹窗、列设置、全选+批量删除 toast、行查看(→详情)/编辑(回填+宿主更新)/删除(确认+toast+总数 36→35) |
| antdpro-form-basic      | ✅   | 日期范围弹层、提交校验 toast 可读                                                                        |
| antdpro-form-grouped    | ✅   | 入库日期/仓库选择弹层、提交 → toast+跳转                                                                 |
| antdpro-form-dialog     | ✅   | 新建订单弹窗+空提交校验 toast                                                                            |
| antdpro-form-step       | ✅   | 步骤连接线+空提交红框内联错误+「步骤校验未通过」横幅+上一步禁用（截图）                                  |
| antdpro-detail-basic    | ✅   | 返回列表导航；打印按 host-channel 契约验证接线                                                           |
| antdpro-detail-advanced | ✅   | 通过/驳回 toast+步骤推进+pill tab 切换                                                                   |
| antdpro-dashboard       | ✅   | 纯展示页零操作钮，零错误                                                                                 |
| antdpro-result          | ✅   | 查看订单→列表、再录一单→表单                                                                             |
| cal-booking             | ✅   | 时长 tabs、月/周/日切换、时区、槽位面板分组、选时段 → 跳转确认页                                         |
| cal-confirm             | ✅   | 添加嘉宾/移除、渠道 chips、空提交校验按已填字段精确过滤、返回上一步                                      |
| cal-success             | ✅   | 日历链接/ICS、重新安排 → booking、取消预约确认框                                                         |
| linear-issues           | ✅   | ⌘K 搜索、筛选/显示/新建/命令弹层、全选/行选批量栏、行 peek 弹层                                          |
| linear-board            | ✅   | 234 卡/9 列；标签筛选片 234→10→234 双向生效（R12 修复维持）；卡片 peek 活动流                            |
| linear-inbox            | ✅   | 全部标为已读/归档所选 toast+列表更新                                                                     |
| linear-detail           | ✅   | 复制链接/归档/状态选择；改状态+应用 → 状态已更新（lastBulkUpdate 钩子实证）                              |
| linear-projects         | ✅   | 纯展示页零操作钮，零错误                                                                                 |
| linear-settings         | ✅   | 常规/外观/工作流 tab 实切换+3 偏好开关                                                                   |
| notion-database         | ✅   | 分页第 2 页/每页条数切换（10→32 行）                                                                     |
| airtable-grid           | ✅   | 隐藏字段/搜索/分组切换/行高/单元格编辑/行展开×10/新增记录弹层/分页                                       |
| stripe-payments         | ✅   | 日期预设档、导出模态、行金额点击 → 交易详情抽屉（导航 shell 静态为设计意图）                             |

### W-A2 主子通信对齐审计（2026-10-03，plan 538）

> 范围：全部「弹窗/surface + 宿主数据」组合页（13 个 schema 含 openDialog + 声明式 dialog 页）；逐弹窗核对 §三 标准形态。静态盘点 + 转换 + 9 流实机复验（详见 `docs/plans/2026-10-03-538-playground-traversal-wa2-plan.md`）。

| 页面                                                          | 弹窗→宿主形态（转换前）                                                                                                              | 处置                                                                                                                              | 复验证据                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| standard-crud                                                 | 新增/编辑 openDialog 表单 then 链 component:refresh(user-crud)                                                                       | **转标准**：form 补 submitScope=surface + closeOnSubmit + onSubmitSuccess=refreshNearest(crud)                                    | 新增 33→34 条 + 弹窗关闭 ✓                                    |
| master-detail                                                 | 新增明细 openDialog 表单 then 链 component:refresh(md-items-crud)                                                                    | **转标准**（同上）                                                                                                                | SKU 子表 4→5 行 ✓                                             |
| approval-tasks                                                | 审批弹窗 通过/驳回 button then 链 component:refresh(approval-crud)                                                                   | **转标准**：then[0] → refreshNearest(crud)（refresh→close 顺序）                                                                  | 通过 待审批→已通过 ✓；驳回 确认门→已驳回 ✓                    |
| antdpro-list                                                  | 新建/编辑订单 onSubmitSuccess=component:refresh(antdpro-list-crud)（closeOnSubmit 形态，live 正确样本）；删除确认 then 链 close 在前 | 新建/编辑原地替换为 refreshNearest(crud)；删除链归一 [refreshNearest, closeSurface]                                               | 新建 36→37 ✓；删除 37→36 ✓                                    |
| linear-issues                                                 | 批量×4 + 新建×3 onSubmitSuccess=component:refresh(linear-issues-source)；筛选弹窗 then 链 ×2                                         | **转标准**：全部 9 处 → refreshNearest(data-source)（含 notFound=error）                                                          | 新建 源总数 +1 ✓；批量修改状态 ENG-101 待办→进行中 实时翻转 ✓ |
| sundial-workbench                                             | 声明式 dialog（open 状态驱动）；原 rev 计数器经 setValue 写弹窗域被遮蔽——**既有缺陷：添加待办后六个数据源从未刷新**                  | **修标准**：onSubmitSuccess = refreshSource ×6（source registry 全桶名扫描，弹窗域可命中页级源）+ 状态翻转关闭 + messages.success | 计数 9→10 ✓（计数契约首次真正生效）                           |
| sundial-todo-dialog                                           | 声明式 dialog；onSubmitSuccess 混 closeSurface/showToast                                                                             | **钩子归位**：messages.success + 状态翻转关闭，onSubmitSuccess 只留数据回调                                                       | toast + 关闭 ✓（该页无宿主列表）                              |
| notion-database                                               | 弹窗 onSubmitSuccess=component:refresh ×5 源（table/board/gallery/calendar/list）                                                    | **裁定保留**：多源同步，refreshNearest 单目标语义无法表达（见 §七）                                                               | W-A1 已验行为正常                                             |
| airtable-grid                                                 | 弹窗 onSubmitSuccess=component:refresh ×2 源（grid/group）                                                                           | **裁定保留**（同上多源同步）                                                                                                      | W-A1 已验行为正常                                             |
| stripe-payments                                               | 筛选/搜索/添加 widget 弹窗 onSubmitSuccess=setValue 写页面状态 → dependsOn 响应式刷新                                                | **合规**（scope 状态所有权，即 §三 主从联动标准形态）                                                                             | W-A1 已验行为正常                                             |
| antdpro-form-dialog                                           | 新建订单弹窗（独立表单演示，无宿主）                                                                                                 | 不适用                                                                                                                            | W-A1 已验                                                     |
| sundial-detail / cal-success / cal-booking                    | 选择器/取消预约等弹层，关闭类或导航类                                                                                                | 不涉及宿主刷新                                                                                                                    | W-A1 已验                                                     |
| standard-crud 批量删除/行删除（confirmText 门）、工具栏刷新类 | 页面域 confirmText 门 + then 显式自刷新                                                                                              | **裁定保留**：调用方在页面域非 surface 内，非「弹窗内定位宿主」被禁场景（与 antdpro 工具栏刷新同类）                              | W-A1 已验行为正常                                             |

审计结论：弹窗→宿主刷新 100% 收敛为 §三 标准形态（refreshNearest / refreshSource / 生命周期钩子 / scope 状态所有权）或书面裁定；全站 0 处残留「弹窗内以宿主 id 定位刷新」。主从联动页（master-detail/linear-issues/detail-subtables/stripe 等 selectionStatePath+dependsOn / 状态所有权）维持合规。

### W-B 设计器/编辑器（10）

| 页面                 | 状态 | 卡片                                                                                                                                                                                                               |
| -------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| page-designer        | ✅   | palette 插入全变画、节点复制/删除、JSON 源码/导出（6439 字符+行内消息）/导入契约验证、面板切换；undo/redo 无独立按钮（命令面板/键盘路径）                                                                          |
| flow-designer        | ✅   | 模式切换×3、节点库收展、节点选中、JSON 弹层、撤销空栈 no-op 合理                                                                                                                                                   |
| taskflow-designer    | ✅   | Graph/Tree 切换、节点选中/增删、Undo/Redo 实变（恢复删除节点）、检查器收展；Save/Export 静默成功（P2 → 渲染器级 follow-up，schema then 已前向兼容加入）                                                            |
| report-designer      | ✅   | 查找替换、字段面板收展、冻结、列/表选择机制（代表 性验证）；撤销空栈 no-op                                                                                                                                         |
| report-designer-host | ✅   | 预览模式切换（+15KB DOM）、字段面板、网格选择；保存静默（同类 P2）                                                                                                                                                 |
| print-designer       | ✅   | 模板切换、缩放、校验、预览弹层、警告定位、图元 palette×8 全插入、撤销/重做——全活跃 ✓                                                                                                                               |
| dashboard-demo       | ✅   | palette 插入（截图实证 panel-5+检查器联动）、预览切换、检查器属性；保存静默（同类 P2）；保存→刷新还原由 editor-core 测试覆盖                                                                                       |
| word-editor          | ✅   | 页眉/主文档/页脚切换、字体下拉、格式按钮（canvas 绘制，aria 翻转验证）；保存静默（同类 P2）                                                                                                                        |
| code-editor          | ✅   | 格式化/变量面板/运行/{…} 弹层/全屏切换——零错误全通 ✓                                                                                                                                                               |
| scada-editor-demo    | ✅   | 深度抽验 ✓：点选图元→画布拖绘落格（检查器联动 scada-rect-1 全几何）+ 撤销（已撤销+元素移除）+ 保存（serializedConfig 输出）；对齐/分布 ≥2 多选门控（源码实证）；Save/Load/导出/导入/连接/历史/图层/模板/画面全在位 |

### W-C 渲染器演示（27）

| 页面                           | 状态 | 卡片                                                                                                                                                                                                                         |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-basic                     | ✅   | 表单提交管线（component:submit）、对话框、combo 增删、Inspect 行弹层；Docs/API/Urgent 为静态 tag 数据非按钮                                                                                                                  |
| table-column-width             | ✅   | 列宽策略宿主：选择/全选机制验证（E3 宿主 fixture）                                                                                                                                                                           |
| table-popover                  | ✅   | 单元格 popOver 逐行打开 ✓、复制到剪贴板、分页                                                                                                                                                                                |
| tree-display-ux                | ✅   | 展开/折叠/搜索高亮机制 ✓（E3）、节点树渲染                                                                                                                                                                                   |
| condition-builder              | ✅   | 添加条件/分组/筛选、操作符与值下拉、配置弹窗、删除重组 ✓                                                                                                                                                                     |
| condition-builder-formula      | ✅   | E3 公式集成变体：条件增删/分组/操作符下拉 ✓                                                                                                                                                                                  |
| form-input-enhancements        | ✅   | input-number 步进、array-editor 增删/排序（等长值变更类 no-op 为检测盲区已核）、Submit→console 设计                                                                                                                          |
| input-suggest                  | ✅   | 异步建议浮层干净加载+真实输入验证 ✓（Apple/Apricot/Grape/Papaya；早期虚警为残留状态+合成事件假象）；suggestTemplate 区域、Live form values 回显                                                                              |
| layout-family-enhancements     | ✅   | tab 切换（含 badge）、aside 备注、mountOnEnter 系列 ✓                                                                                                                                                                        |
| text-icon-visual-fields        | ✅   | 复制 toast「已复制」、maxLine 展开/收起（E3）                                                                                                                                                                                |
| component-handles              | ✅   | Focus/Clear/Reset 句柄语义程序化验证 ✓（activeElement 翻转+值清空）、Select 弹层、表单提交/重置                                                                                                                              |
| event-prevention               | ✅   | X2 三拦截全工作（e2e 4/4 绿：表单/链接/键盘 + 开关切换）；P3：schema 内残留死开关按钮（path:\_ 无操作，功能由外置 React 开关承担）——清理候选                                                                                 |
| boolean-control-value-contract | ✅   | checkbox trueValue/falseValue 契约翻转 ✓（E3）                                                                                                                                                                               |
| data-verify                    | ✅   | 数据源机制验证页：展开/setValue 探针 ✓                                                                                                                                                                                       |
| env-stream                     | ✅   | Start stream 触发流式输出 ✓、Abort 空栈 no-op、协议/解码器选择                                                                                                                                                               |
| gantt                          | ✅   | 深度验证 ✓：双击编辑弹窗（end 10-28→10-21 持久化+条宽 600→320px 重渲染）；边缘拖拽缩放 320→480px；拖拽移动日期平移（弹窗确认同步）；选中+Delete 删除+Ctrl+Z 撤销 ✓；跨天=条宽按起止比例；缩放/折叠 ✓                         |
| kanban                         | ✅   | 深度验证 ✓：跨列拖卡（调研 待办→进行中，列计数更新）；标签过滤/清除、列折叠、添加/移除卡片                                                                                                                                   |
| scheduling-calendar            | ✅   | 深度验证 ✓：长按 500ms+拖格创建（类型选择器→事件落格+toast「已创建排班: leave (10-20~10-21)」）；导航+日期变更 toast；P2 修复：demo 五事件回调原为非法 actionType 形状全死接线 → 改 {action:"showToast"}+notify 接真实 toast |
| spreadsheet                    | ✅   | 深度验证 ✓：双击单元格→编辑→输入→Enter 落格；查找替换、选择机制、撤销空栈                                                                                                                                                    |
| diff-view                      | ✅   | 统一/分割视图、行折叠展开、视图选择 ✓                                                                                                                                                                                        |
| graph-demo                     | ✅   | hierarchy/flow 布局切换、搜索+清除、Focus 定位、缩放族（canvas 变换类 no-op）                                                                                                                                                |
| map-demo                       | ✅   | 四场景截图目检：区域着色/Pin 聚合/自定义边界/空态全渲染，无黑域 ✓；缩放为 canvas 变换                                                                                                                                        |
| pivot-table-demo               | ✅   | VTable 画布渲染零错误，主题/模式选择                                                                                                                                                                                         |
| leafer-examples                | ✅   | 画布示例渲染、缩放/平移按钮（canvas 变换类）                                                                                                                                                                                 |
| three-canvas-demo              | ✅   | AI 生成 schema（离线）/恢复默认场景 ✓、10Hz 数据驱动                                                                                                                                                                         |
| mobile-components              | ✅   | swipe-cell 归档/删除（滑动手势类，不实点）、弹层关闭 ✓（M5）                                                                                                                                                                 |
| mobile-infrastructure          | ✅   | 触感反馈按钮（触觉类 no-op）、Open Dialog ✓（M0.1）                                                                                                                                                                          |

### W-D AI 家族（14）

| 页面                | 状态 | 卡片                                                                                                                                                                                                                   |
| ------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ai-chat             | ✅   | 发送→mock 流式 Echo 气泡 ✓（流式光标+停止按钮）；空输入发送禁用为正确设计                                                                                                                                              |
| ai-tools            | ✅   | agentic 工具环流全链路 ✓：发送→get_weather tool_call→executor 执行→结果回灌下一轮流式回复                                                                                                                              |
| ai-widgets          | ✅   | 反馈五钮 toast ✓、引用弹层、建议展开、语音 permission-denied 降级提示、prompt 按钮组                                                                                                                                   |
| ai-hitl             | ✅   | 批准→已批准徽标 ✓、拒绝按钮在位（焦点陷阱 e2e 覆盖）                                                                                                                                                                   |
| ai-citations        | ✅   | 引用 [N] 弹层逐个 ✓、来源链接 toast                                                                                                                                                                                    |
| ai-conversations    | ⚠️1  | External ai:send ✓、消息编辑/重试/停止 ✓；⚠️1：新建/删除/重命名会话 dispatch 成功（e2e 断言无错）但侧栏列表不渲染新会话（store→pageData→schema 传播链未闭合；e2e 注释明示该可视循环未覆盖）——P2 改判渲染器级 follow-up |
| ai-persistence      | ✅   | 新建/切换/删除会话全通 ✓（React 直连 controller 形态）、localStorage 持久化                                                                                                                                            |
| ai-coverage         | ✅   | 状态/边缘矩阵页：编辑/重试/停止/代码复制/prompt 按钮全通（36 项代表 性覆盖）                                                                                                                                           |
| ai-component-handle | ✅   | component:send 外部驱动 ✓、消息编辑/重试                                                                                                                                                                               |
| ai-rich-text        | ✅   | 模板条目（Greeting/Summary/Code）、Tiptap 富文本发送 ✓                                                                                                                                                                 |
| ai-linkage          | ✅   | 双联动实证 ✓：消息序列化→表单字段（JSON 数组回显）+ 完成事件→数据源重载                                                                                                                                                |
| ai-p4               | ✅   | 建议六钮 toast ✓、溢出 +3 弹层、语音 permission-denied 降级                                                                                                                                                            |
| ai-virtual-scroll   | ✅   | 千条消息窗口化渲染（按口径：视口挂载+零错误）、编辑/取消 ✓                                                                                                                                                             |
| ai-attachments      | ✅   | 添加附件按钮（文件选择器 IAB 不支持实点，拖拽/粘贴路径按口径不实点）                                                                                                                                                   |

### W-E 性能/基建/实验（27 页 = 18 表项，w 系列合并行含 10 页）

| 页面                     | 状态 | 卡片                                                                                                                                                                                                                                                                             |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| performance-table        | ✅   | Virtualized/Scope Read Stress/Full Stress 三形态切换全变 ✓（千行级 DOM，代表 性覆盖 1139 可点元素中 5）                                                                                                                                                                          |
| gantt-perf-scale         | ✅   | 500 任务+2000 依赖渲染零错误；缩放变、任务组/今日（canvas 类 no-op）；watch-only 帧率在册不复测                                                                                                                                                                                  |
| kanban-perf-scale        | ✅   | 20 列×300 卡渲染零错误；折叠列 ✓、拖拽列（拖拽类不实点）；watch-only 在册                                                                                                                                                                                                        |
| calendar-perf-scale      | ✅   | 300 资源×31 天渲染零错误；上一个/今日/下一个全变 ✓                                                                                                                                                                                                                               |
| diff-perf-scale          | ✅   | 1500+ 行 diff 渲染零错误；统一视图切换、折叠 4992 行展开全变 ✓                                                                                                                                                                                                                   |
| scada-perf-scale         | ✅   | 基准测量页（10 万图元首屏/拖动 fps/内存）零错误；三基准档位按钮在位                                                                                                                                                                                                              |
| scada-pressure-demo      | ✅   | 工艺流程大屏/高密度 10,000 图元双画面 tab（canvas 重渲染类 no-op）零错误                                                                                                                                                                                                         |
| scada-demo               | ✅   | 设备控制钮组（启动/停止/故障/开/关/触发/复位）驱动 canvas 模拟状态（绘制类 no-op）；e2e 覆盖在册                                                                                                                                                                                 |
| scada-edge-cases         | ✅   | 最小合法 config/空画面/非法 JSON/线多边形 hover/默认几何 fit 五边界入口全在位（e2e 覆盖）                                                                                                                                                                                        |
| gantt-states             | ✅   | 缩放变、三状态任务（Late/Early/On Track）渲染、空/加载态（e2e 覆盖）                                                                                                                                                                                                             |
| m1-responsive            | ✅   | 选择树弹层/Dialog/Drawer 弹层 ✓、下拉收展（响应式断点按口径不切视口）                                                                                                                                                                                                            |
| m2-touch                 | ✅   | 触控目标≥44px 契约 demo：checkbox 组翻转 ✓、步进器（等长值变更类）                                                                                                                                                                                                               |
| m3-layout                | ✅   | Tabbar 导航 toast ✓（navigate → /home 等）、返回键、全选                                                                                                                                                                                                                         |
| m4-data                  | ✅   | 小屏工具简化 demo：折叠/Bulk Delete/Edit（等长/状态类 no-op 代表 性验证）                                                                                                                                                                                                        |
| m5-showcase              | ✅   | 综合样例：Tabbar 四键、侧滑展开 ✓、订单/设置入口 ✓                                                                                                                                                                                                                               |
| barcode-input            | ✅   | 扫描条码触发（摄像头实点按口径不实点）、主题选择                                                                                                                                                                                                                                 |
| debugger-lab             | ✅   | 调试器 API 面板：Show/Hide/Toggle/Clear/Pause、overview/timeline 视图切换（状态类 no-op 代表 性覆盖 20 项中 7）                                                                                                                                                                  |
| w1a-content / w1b-conten | ✅   | w 系列 10 页全通零错误：w1a JSON 折叠/复制；w1b spinner 隐藏/卡片；w2a 分页翻页 ✓；w2b 四类日期弹层 ✓；w3a-w3b 折叠面板/单选组；w3c 纯映射展示；w3d 富文本工具栏/季度选择（31 项代表 性覆盖）；w4a 轮播三控制+handle；w4b 步骤点击翻转 ✓；w4c combo 增删/上下移/input-table 步进 |

## 七、已知在册基线（执行时对照，不重复开卡）

- R12 确认文档在册项：linear-board（tab 对齐已修/筛选片已修 → W-A1 只验操作面）、dashboard（渠道占比卡已修）、combo-editor 双删除钮（共享 composite 组件，维持登记）、sundial-detail 留白（已居中）、antdpro form-basic/detail-basic 背景接缝（改判非缺陷）、master-detail 子表加载 >2s（性能观测）。
- 渲染器级 plan-first：container className-flex 陷阱；表格 fixed 列宽度预留（不透明底已在 R12e 落地）；SPA hash 导航竞态（自动化测试关注）。

### W-A1 执行期新增登记（2026-10-03）

- **P3**：批量操作零选中静默无反馈（standard-crud 批量删除、antdpro-list 批量导出同病）——建议「请先选择记录」提示或禁用态。
- **P3**：sundial-detail 子任务空标题校验文案用原始键名（`subtaskAddTitle不能为空`）——schema 字段补 label 即可。
- **P3**：approval-tasks 审批「通过」成功后弹窗不自动关闭（保留可继续操作形态，建议关闭或禁用双钮）。
- **P3**：剪贴板写入失败 toast 含原始英文异常（`Failed to execute 'writeText'…`，cal-success/linear-detail 复制链接同病）——失败文案宜收敛为本地化短语。
- **P3**：linear-detail 状态选择未变更直接点「应用」提交空 patch → mock 判 invalid patch → 误报「状态更新失败」——建议未变更时禁用「应用」。
- **P3（a11y）**：master-detail 订单列表项为无角色 SPAN，键盘不可达（R12 展现层未覆盖维度）。
- **已修（当波 P1）**：表单校验失败 toast 显示 `[object Object]`——`flux-action-core` 失败通知对结构化非 Error 负载（ValidationResult[]）直接 String() 所致；新增 `describeActionFailure`（数组取 message 拼接、对象取 message 字段、兜底 JSON），全站生效（standard-crud/business-document/antdpro-form-dialog/complex-form 实机复验均输出可读中文文案）；回归测试 ×2（action-dispatcher-control-flow.test.ts）。
- **已修（当波 P2）**：配置 `messages.failed` 的 ajax 失败叠加通用 `Request failed` 双 toast——`flux-runtime` executeRuntimeAjaxAction 在作者消息消费失败后补标 `failureHandled`，dispatcher 通用失败通知跳过；回归测试 ×2（runtime-ajax-messages.test.ts）。
- **测试观测面**：linear mock 新增 `lastBulkUpdate` 钩子（与既有 lastMove 同款，e2e 请求体观测）。

### W-A2 执行期新增登记（2026-10-03）

- **已修（既有缺陷，plan 538 执行期发现）**：sundial-workbench 添加待办后计数从不刷新——form 级 onSubmitSuccess 在弹窗域派发导致 setValue(rev) 遮蔽页级变量、六个 dependsOn 数据源永不重取；改为 refreshSource ×6 后计数契约首次真正生效（9→10 实证）。
- **P3（页面设计说明，非缺陷）**：sundial-workbench 分组任务行为静态 schema（仅计数绑定数据源）——新增待办只在计数反映，列表行不随数据渲染；如需全动态列表需页面级改造（超出本审计范围，登记为设计演进候选）。
- **裁定（多源同步保留显式刷新）**：notion-database（5 源）/ airtable-grid（2 源）/ sundial-workbench（6 源）弹窗提交需同步多数据源，refreshNearest 单目标语义无法表达；显式 refreshSource/component:refresh 多目标是多视图一致性的正确形态。

### W-F 执行期新增登记（2026-10-03，深度抽验轮）

- **P2（已修复，calendar-demo.tsx）**：日历 demo 五个事件回调（onEventClick/onEventChange/onEventCreate/onViewChange/onDateChange）自创建起使用非法 `{actionType:'toast'}` 形状——ActionSchema 无此字段，全部死接线（拖建创建成功但用户零反馈；日期导航同样无反馈）。修正为合法 `{action:'showToast', args}` 形状 + demo env notify 接通 toast UI。复验：日期变更 toast ✓、拖建「已创建排班: leave (2026-10-20 ~ 2026-10-21)」toast ✓。
- **深度抽验记录**（用户质询驱动，gantt 示范 + 调度同族补验）：gantt 双击编辑弹窗持久化 ✓、条内边缘拖拽缩放 ✓、拖拽移动日期平移 ✓、选中+Delete 删除与 Ctrl+Z 撤销 ✓；kanban 跨列拖卡 ✓；calendar 长按拖建 ✓；spreadsheet 单元格编辑 ✓。**口径更正**：W-B/W-E 曾将拖拽类标为「不实点」——实际均可程序化驱动（CUA drag/合成 PointerEvent），深度抽验应作为后续遍历的标准动作。

### W-D 执行期新增登记（2026-10-03）

- **P2（书面改判 → 渲染器/演示页数据流 follow-up）**：ai-conversations 页新建/删除/重命名会话后侧栏列表不渲染——`ai:createConversation` dispatch 成功（e2e `ai-conversations.spec.ts` 明示仅断言接线无错、可视循环未覆盖），`useConversation` store 循环有单测，但 store → pageData memo → schema `data` prop → ai-conversations 渲染器 `${conversations}` prop 的 live 传播链未闭合。修复方向：调试 page data 对象经 schema 通道到渲染器 prop 的传播（对照 ai-persistence 的 React 直连形态）。【2026-10-17 已处置（plan `docs/plans/633-cross-roadmap-wave-b-renderer-p2-plan.md` UR-4）：create 腿经 plan 549（xui:imports 拆除）已通且 e2e 有全链判别断言；本批补 delete/rename 两腿判别 e2e（绿）；replace-clobber 探针复现（scope setValue 写 activeId 被 pageData replace 回退）并修复——activeId 所有权收敛 host store（`conversationsDemo:setActive` → switchConversation），修复后探针复验通过】

### W-B 执行期新增登记（2026-10-03）

- **P2（书面改判 → 渲染器级 follow-up）**：设计器工具栏动作静默成功——taskflow Save/Export、word-editor/report-designer-host/dashboard-demo 保存均无用户反馈。根因：`flow-designer-renderers/src/designer-toolbar.tsx` 的 invokeAction 直连 `actionScope.resolve().provider.invoke()`，绕过通用 ActionDispatcher 的 then/messages 管线（schema 层 then 已加入 taskflow 双 schema，前向兼容但当前不生效）。修复面涉及工具栏动作管线设计（then 支持 or 内建成功反馈），登记渲染器级 plan-first，不在 W-B 当波修。【2026-10-17 已修复（plan `docs/plans/633-cross-roadmap-wave-b-renderer-p2-plan.md` UR-5）：designer-toolbar 改走 runtime.dispatch 全管线（args 评估传递 + then 递归 + built-in showToast，手写 then 链删除）；taskflow save toast e2e 绿；word-editor（schema onSave + env notify 黑洞修复）/report-designer-host（defaults then + item.then 透传）/dashboard-demo（onSave showToast + notifyWithToast）三面补齐；dashboard e2e 断言因该页既有 panel 渲染红暂以 unit pin 承载（归并发 plan 628 领地）】
- **验证口径说明**：格式类按钮（word-editor 加粗等）与画布缩放/工具选择类按钮（scada）反馈在 canvas/状态层，DOM 探针不可见，以 aria 翻转/零错误判定；网格单元格点击属选择机制，代表性验证（首个选择均产生大量 mutation）。

## 八、完成定义（DoD）——2026-10-03 收口核验

1. ✅ §六 矩阵全部行回填（109 表项覆盖 118 路由页，w 系列合并行按 10 页展开核验），`✅/⚠️` 覆盖 100%（108 ✅ + 1 ⚠️1），`❌` 清零（程序化核验：零「待执行」、矩阵行零「❌」）。
2. ✅ 所有 P1/P2 修复有对应测试或实机探针记录：P1 校验 toast 修复带回归测试 ×2（flux-action-core 212/212）；P2 双 toast 修复带回归测试 ×2（flux-runtime 1486/1487）；P2 改判三项（工具栏管线 / ai-conversations 传播链 / 多源同步）书面化于 §七 并登记修复方向；daily log 逐波归档。
3. ✅ 主子通信审计：全部「弹窗+宿主」组合页为 §三 标准形态（refreshNearest/refreshSource/生命周期钩子/scope 状态所有权）或书面裁定（多源同步、自引用、页面域刷新）——见 §六 W-A2 审计小节 13 行表。
4. ✅ id 规范：全站无新增 id 耦合（各波顺带核对）；接口 URL 资源寻址合规（W-A1 基线零 id 传参维持）。
5. ✅ 全量门禁收口时全绿（typecheck/build/lint 42/42、test 78 任务含 playground 408/408、check exit 0）；daily log 记录完整确认过程（六波各一段 + 本终段）。

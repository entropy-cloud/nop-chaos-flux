export type ComplexPageCategory =
  | 'data-lists'
  | 'master-detail'
  | 'complex-forms'
  | 'visualization'
  | 'app-replica';

export interface ComplexPageEntry {
  id: string;
  title: string;
  category: ComplexPageCategory;
  description: string;
  /** Short feature tags shown as badges on the active page header. */
  features: string[];
}

export interface ComplexPageCategoryMeta {
  id: ComplexPageCategory;
  label: string;
  blurb: string;
}

export const COMPLEX_PAGE_CATEGORY_ORDER: ComplexPageCategory[] = [
  'data-lists',
  'master-detail',
  'complex-forms',
  'visualization',
  'app-replica',
];

export const COMPLEX_PAGE_CATEGORY_META: Record<ComplexPageCategory, ComplexPageCategoryMeta> = {
  'data-lists': {
    id: 'data-lists',
    label: '数据列表',
    blurb: '增删改查、树形导航、行内编辑、复杂查询 —— 列表类业务页面的典型形态。',
  },
  'master-detail': {
    id: 'master-detail',
    label: '主从详情',
    blurb: '左列表右详情、主记录 + 多个子表（Tab 与非 Tab 多种形式）联动。',
  },
  'complex-forms': {
    id: 'complex-forms',
    label: '复杂表单',
    blurb: '分步向导、多 fieldset 分组、字段间大量联动显隐 / 联动取数。',
  },
  visualization: {
    id: 'visualization',
    label: '数据可视化',
    blurb: '统计卡片 + 图表 + 明细表格组合的概览仪表盘。',
  },
  'app-replica': {
    id: 'app-replica',
    label: '外部应用复刻',
    blurb: '用 schema + 自定义 CSS 复刻真实外部应用（Sundial 待办）的界面，验证 flux 对外部设计系统的还原能力。',
  },
};

export const COMPLEX_PAGE_ENTRIES: ComplexPageEntry[] = [
  {
    id: 'crud-views-export',
    title: '视图切换 + 后台导出',
    category: 'data-lists',
    description:
      '同一数据源的表格 / 卡片两种视图（crud listMode），以及"导出"操作：导出完全由后台执行（/r/User__export 生成 CSV 并返回下载 URL），前端不拼接本地数据，仅按 URL 下载。',
    features: ['listMode cards/table', '后台导出', 'result.data 回写', 'link 下载'],
  },
  {
    id: 'dynamic-tabs',
    title: '远程标签页',
    category: 'data-lists',
    description:
      '标签页 + 按需加载：首个 tab 为预定义静态 schema；第二个 tab 设置 mountOnEnter: true，body 内嵌 DynamicRenderer，仅在首次点击后才触发 loadAction 从后端获取 tab 内容 schema。验证 "不点击不加载" 行为。',
    features: ['mountOnEnter', 'DynamicRenderer', 'lazy loadAction', '不点击不加载'],
  },
  {
    id: 'standard-crud',
    title: '标准增删改查',
    category: 'data-lists',
    description:
      '单 JSON schema 驱动的完整 CRUD：loadAction 列表取数、query 查询、selection 多选、弹窗表单新增/编辑、确认删除与批量删除、component:refresh 刷新。',
    features: ['loadAction', 'selection', 'dialog form', 'picker', 'confirmText', 'component:refresh'],
  },
  {
    id: 'tree-crud',
    title: '树形导航 + 表格',
    category: 'data-lists',
    description:
      '左侧部门/分类树（input-tree），右侧 CRUD 表格按选中树节点联动过滤。典型的“组织 / 分类管理”布局。',
    features: ['tree', 'loadAction', '联动过滤', 'expand/collapse'],
  },
  {
    id: 'inline-edit-table',
    title: '行内编辑（逐行保存）',
    category: 'data-lists',
    description:
      '表格行内可直接编辑季度额度（quickEdit 自定义 input-number），行级共享 draft，每行一个保存按钮（per-row save），支持同时修改多个字段一次性保存（quickSaveItemAction，includeScope 提交行数据），保存后 component:refresh 刷新合计。',
    features: ['quickEdit.body', 'quickSaveItemAction', 'includeScope', 'per-row save', 'input-number'],
  },
  {
    id: 'advanced-query',
    title: '复杂查询 + 表格',
    category: 'data-lists',
    description:
      '多条件可折叠查询表单（关键字、状态字典、角色字典、创建日期范围、ID 数字区间），提交后 loadAction 按条件取数，支持重置。',
    features: ['queryForm', '可折叠', 'date-range', '数字区间', '字典', 'loadAction'],
  },
  {
    id: 'master-detail',
    title: '主从联动（左列表 + 右详情）',
    category: 'master-detail',
    description:
      '左侧订单单选列表，选中后右侧展示订单详情 + 多个关联子表（订单明细 Tab — 独立 CRUD 子表，inline edit quickSaveItemAction 独立维护 / 操作日志 Tab — 只读 / 收货地址 — 非 Tab 堆叠）。强调"一个主子页面同时展示两种子表维护模式"。',
    features: ['list + detail', '独立 CRUD 子表', '只读子表', 'tabs', '非 tab 子表', 'dependsOn 联动'],
  },
  {
    id: 'detail-subtables',
    title: '详情页 + 多个子表（只读）',
    category: 'master-detail',
    description:
      '主记录详情卡片 + 选项卡内多个只读子表（订单明细 / 操作日志 / 收货地址）+ 下方堆叠的关联只读子表（付款记录 / 物流轨迹）。展示同一实体的多面数据，各子表仅展示不维护。与之对照，master-detail 页面的订单明细子表为独立 CRUD。',
    features: ['detail card', 'tabs 子表（只读）', '堆叠子表', '多形式'],
  },
  {
    id: 'business-document',
    title: '业务单据（明细公式 + 合计）',
    category: 'complex-forms',
    description:
      '采购订单：表头表单 + 可编辑明细行（input-table），每行金额=数量×单价实时计算，跨行小计 / 折扣 / 税额 / 应付合计由扩展的 $Arr 公式聚合，折扣率/税率变更联动全表重算。',
    features: ['input-table', '每行公式', '$Arr 聚合', '实时合计', '表头联动'],
  },
  {
    id: 'combo-editor',
    title: 'Combo 重复行编辑器',
    category: 'complex-forms',
    description:
      '单个表单字段内编辑“结构相同的若干行”（联系人列表：姓名/关系/电话），combo 提供增行/删行/排序，整体作为数组字段提交。',
    features: ['combo', '增删行', '排序', '数组字段'],
  },
  {
    id: 'form-wizard',
    title: '分步表单（向导）',
    category: 'complex-forms',
    description:
      '多步骤向导：基本信息 → 详细信息 → 确认提交，每步独立校验，最终一次性提交。覆盖 wizard 的 step / commit 生命周期。',
    features: ['wizard', 'per-step 校验', 'onComplete 提交'],
  },
  {
    id: 'complex-form',
    title: '多分组联动表单',
    category: 'complex-forms',
    description:
      '单个表单内分多个 fieldset（基本信息 / 联系方式 / 高级设置），字段间大量联动：类型切换显隐字段、省市级联、勾选协议启用提交。',
    features: ['fieldset', 'visible 联动', '级联', 'disabled 联动'],
  },
  {
    id: 'approval-tasks',
    title: '审批任务中心',
    category: 'master-detail',
    description:
      '待办任务列表 + 处理对话框：行操作打开详情，通过 / 驳回按钮的可用性由任务状态驱动（${status==="pending"}），驳回带 confirmText 二次确认，动作成功后刷新列表。',
    features: ['todo list', 'openDialog 详情', '状态门控动作', 'confirmText', 'component:refresh'],
  },
  {
    id: 'dashboard',
    title: '仪表盘（运营大屏）',
    category: 'visualization',
    description:
      '模拟运营大屏：6 张 KPI 卡片（订单总数/今日订单/活跃/待付款/收入/增长率）+ 3 图（趋势面积图/每日订单柱状图/渠道占比饼图）+ 2 表（最近订单/待审批任务）。6 个 data-source 并行取数。',
    features: ['stat cards', 'chart（area/pie/bar）', 'data-source 并行', 'table ×2'],
  },
  {
    id: 'sundial-workbench',
    title: 'Sundial 工作台',
    category: 'app-replica',
    description:
      '复刻 Sundial（KMP 待办应用）桌面端工作台：272px 侧边栏（品牌/搜索/主导航/工作台视图/同步状态）+ 页头（标题+日期+添加待办）+ 压力分布 rail 卡 + 逾期/今天/未来7天/无日期/待整理五个可折叠分组（色调条 + 彩色标题 + 等宽计数）+ 任务行（圆形 checkbox/标题/截止 badge/旗标）。',
    features: ['复刻样式', '圆形 checkbox', '压力 rail', '折叠分组', '色调条', '任务行'],
  },
  {
    id: 'sundial-analytics',
    title: 'Sundial 分析',
    category: 'app-replica',
    description:
      '复刻 Sundial 分析页：鼓励语页头 + 4 张 KPI 卡（今天完成/连续完成/7天输出/完成率）+ 4 张图表卡（完成趋势折线 / 精力输出柱状 / 待办压力多色柱状+图例 / 输出结构洞察行+badge），数据经 mock 后端 Sundial__* 端点拉取。',
    features: ['复刻样式', 'KPI 卡', '折线图', '多色柱状图', '图例', 'insight 行'],
  },
  {
    id: 'sundial-detail',
    title: 'Sundial 待办详情',
    category: 'app-replica',
    description:
      '复刻 Sundial 详情检查器：状态行（checkbox + 状态文案 + 日期 badge）+ 无边框标题输入 + 备注内嵌框 + 日期/重复/旗标/列表四个字段行（hover 背景 + badge 值）+ 子任务列表 + 底部"移到列表 / 移到垃圾箱"按钮，含日期/重复/列表选择对话框。',
    features: ['复刻样式', '字段行', 'badge', '子任务', '选择对话框', 'hover 交互'],
  },
  {
    id: 'sundial-settings',
    title: 'Sundial 设置',
    category: 'app-replica',
    description:
      '复刻 Sundial 设置页：280px 导航 rail（同步/列表/数据/外观/关于）+ 同步面板（本地/Supabase/自建服务器三种模式选项卡 + 连接信息输入 + 同步状态卡）+ 列表管理（色点行 + 新建列表对话框）+ 数据事实行 + 关于信息。',
    features: ['复刻样式', '导航 rail', '模式选项卡', '状态卡', '色点列表行'],
  },
  {
    id: 'sundial-todo-dialog',
    title: 'Sundial 新建待办',
    category: 'app-replica',
    description:
      '复刻 Sundial 新建待办对话框：360dp 圆角对话框，标题输入（自动聚焦）+ 备注多行 + 日期字段行（badge+清除按钮）+ 旗标行 + 列表行（色点 + 名称）+ 取消/添加按钮，全部由 schema + openDialog 动作驱动。',
    features: ['复刻样式', '对话框', '表单字段', 'badge', 'openDialog'],
  },
  {
    id: 'antdpro-list',
    title: 'AntD Pro 订单列表',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 标准查询列表页：PageHeader 页头（面包屑+标题+操作按钮）+ 查询区（关键字/状态下拉/渠道下拉+查询/重置+展开入口）+ crud 表格区（工具栏、选择列、金额/状态标签列、行操作列、分页），数据经 AntdPro__orders 端点分页流动。',
    features: ['复刻样式', 'PageHeader', '查询区', 'crud 表格', 'AntdPro__orders'],
  },
  {
    id: 'antdpro-form-basic',
    title: 'AntD Pro 基础表单',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 基础表单页：整页单列表单（标题/时间段/目标描述等字段）+ 底部操作条（提交/重置），字段与操作条分离的经典单列布局。',
    features: ['复刻样式', '单列表单', '底部操作条', '静态形态'],
  },
  {
    id: 'antdpro-form-grouped',
    title: 'AntD Pro 分组表单',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 分组表单页：区内分组（小标题 fieldset：入库编号/人员信息）与卡片分组（任务描述/责任人）双形态并存的分组布局。',
    features: ['复刻样式', 'fieldset 分组', '卡片分组', '静态形态'],
  },
  {
    id: 'antdpro-form-dialog',
    title: 'AntD Pro 弹窗表单',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 列表上下文 ModalForm：页头触发按钮 + dialog 内嵌新建表单（静态形态，点击可打开弹窗断言内部结构），提交流转归 P2b。',
    features: ['复刻样式', 'ModalForm 形态', 'dialog 内嵌表单', '可见可点'],
  },
  {
    id: 'antdpro-form-step',
    title: 'AntD Pro 分步表单',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 分步表单页：wizard 三步（填写转账信息/确认转账信息/完成）+ 步骤条 + 分步字段组，分步校验与数据暂存归 P2b。',
    features: ['复刻样式', 'wizard 三步', '步骤条', '静态形态'],
  },
  {
    id: 'antdpro-detail-basic',
    title: 'AntD Pro 基础详情',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 基础详情页：单卡 Descriptions 形态（分组分割线 + 字段行 + 操作按钮组），数据经 AntdPro__orderDetail 端点拉取。',
    features: ['复刻样式', 'Descriptions 卡', '分组分割线', 'AntdPro__orderDetail'],
  },
  {
    id: 'antdpro-detail-advanced',
    title: 'AntD Pro 高级详情',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 高级详情页：多卡 + steps 步骤条（进度态）+ tabs 分组（订单信息/客户信息/审批记录）+ 审批操作组，数据经 AntdPro__orderDetail 端点拉取。',
    features: ['复刻样式', 'steps 步骤条', 'tabs 分组', '审批操作组'],
  },
  {
    id: 'antdpro-dashboard',
    title: 'AntD Pro 数据看板',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro 分析仪表盘：KPI 卡×4（今日销售额/月销售额/订单总数/待付款订单）+ 销售趋势折线图 + 渠道占比饼图 + Top10 商品排行卡，数据经 AntdPro__dashboard 端点拉取。',
    features: ['复刻样式', 'KPI 卡×4', '折线/饼图', 'Top10 排行', 'AntdPro__dashboard'],
  },
  {
    id: 'antdpro-result',
    title: 'AntD Pro 提交结果页',
    category: 'app-replica',
    description:
      '复刻 Ant Design Pro result 成功页：lucide 自绘结果图形 + 成功标题与描述行 + 动作组（返回列表主按钮 + 再填一层次按钮），I13 静态形态。',
    features: ['复刻样式', '结果图形', '描述行', '动作组'],
  },
  {
    id: 'cal-booking',
    title: 'Cal 预约 · 选时段',
    category: 'app-replica',
    description:
      '复刻 Cal.com 公开预约页（Booker）入口与槽位选择视图：活动头部（头像/标题/meta 行/描述/时长 tabs 15-60 分钟）+ 双栏（左月历 + 时区选择器 + 12h/24h 开关，右选中日槽位上午/下午/晚上分组三态按钮 + 骨架屏样本），数据经 Cal__event 与 Cal__slots 端点流动。',
    features: ['复刻样式', '月历', '时长 tabs', '槽位三态', 'Cal__slots'],
  },
  {
    id: 'cal-confirm',
    title: 'Cal 预约 · 确认信息',
    category: 'app-replica',
    description:
      '复刻 Cal.com 确认表单页：reschedule 提示条 + 左摘要卡（头像/标题/时长/地点/时区）+ 右表单（姓名/邮箱/电话/备注 + 嘉宾行形态 + 自定义问题字段族 select/radio/checkbox + 校验错误形态样本 + Confirm 黑按钮），摘要数据经 Cal__event 端点拉取。',
    features: ['复刻样式', '摘要卡', '自定义问题', '校验样本', 'Cal__event'],
  },
  {
    id: 'cal-success',
    title: 'Cal 预约 · 预约成功',
    category: 'app-replica',
    description:
      '复刻 Cal.com 预约成功态：大圆 ✓（success 令牌）+ 预约摘要卡 + Add to calendar 四外链（Google/Outlook/Office365/ICS 占位链接）+ Copy link 按钮 + Reschedule/Cancel 链接 + 「待确认」pending 徽章变体，摘要数据经 Cal__event 端点拉取。',
    features: ['复刻样式', '成功图形', '日历外链', 'pending 徽章'],
  },
  {
    id: 'linear-issues',
    title: '问题追踪 · 列表视图',
    category: 'app-replica',
    description:
      '复刻键盘优先 issue tracker 列视图：左侧边栏（工作区切换/导航组/收藏组）+ 顶栏（视图切换/筛选/Display 入口/⌘K 搜索条）+ 高密度问题表（状态点/标识符/标题/标签/优先级条/指派头像/日期，数据经 Linear__issues 端点分页流动）+ 底部批量操作栏 + Display 抽屉 + ⌘K 命令面板壳与问题 peek 静态浮层。',
    features: ['复刻样式', '高密度行', '批量操作栏', '⌘K 壳', 'Linear__issues'],
  },
  {
    id: 'linear-board',
    title: '问题追踪 · 看板视图',
    category: 'app-replica',
    description:
      '复刻键盘优先 issue tracker 看板视图：按状态分列（待定/待办/进行中/已完成/已取消，列头计数来自 mock）+ 问题卡片（标识符/标题/标签/优先级条/指派头像/估算），数据与列表同源经 Linear__issues?view=board 端点流动；拖拽不接线（静态形态）。',
    features: ['复刻样式', '状态分列', '列头计数', 'kanban 卡片'],
  },
  {
    id: 'linear-inbox',
    title: '问题追踪 · 收件箱',
    category: 'app-replica',
    description:
      '复刻键盘优先 issue tracker 收件箱：通知流分组（今天/本周/更早）+ 通知行（未读点/类型/标题/摘要/时间）+ 逐条已读归档按钮形态 + 批量已读栏形态，数据经 Linear__inbox 端点流动。',
    features: ['复刻样式', '通知分组', '未读样本', 'Linear__inbox'],
  },
  {
    id: 'linear-detail',
    title: '问题追踪 · 问题详情',
    category: 'app-replica',
    description:
      '复刻键盘优先 issue tracker 问题详情全页：标题区（标识符 + 状态 pill）+ 描述区（纯文本多段承载）+ 子问题列表 + 关系区（阻塞/关联）+ 活动流（创建/状态/指派/评论时间线）+ 属性侧栏（状态/优先级/指派/标签/周期/项目），数据经 Linear__issue 端点拉取。',
    features: ['复刻样式', '子问题', '活动流', '属性侧栏'],
  },
  {
    id: 'linear-projects',
    title: '问题追踪 · 项目周期',
    category: 'app-replica',
    description:
      '复刻键盘优先 issue tracker 项目与周期概览：项目卡（名称/负责人/进度条/时间窗/状态 pill/分组摘要）+ 周期概览行（周期名/时间窗/进度/状态 pill），数据经 Linear__projects 端点流动。',
    features: ['复刻样式', '项目卡', '进度条', 'Linear__projects'],
  },
  {
    id: 'linear-settings',
    title: '问题追踪 · 设置',
    category: 'app-replica',
    description:
      '复刻键盘优先 issue tracker 设置页：左侧子导航（工作区/偏好/通知/成员）+ 右侧表单区（工作区名/图标形态/偏好开关组 + tabs 分节），零写提交的静态形态。',
    features: ['复刻样式', '子导航', '偏好开关组', 'tabs 分节'],
  },
];

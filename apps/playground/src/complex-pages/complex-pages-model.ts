export type ComplexPageCategory =
  | 'data-lists'
  | 'master-detail'
  | 'complex-forms'
  | 'visualization'
  | 'content-showcase'
  | 'app-replica'
  | 'business-replication';

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
  'content-showcase',
  'app-replica',
  'business-replication',
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
  'content-showcase': {
    id: 'content-showcase',
    label: '内容门户',
    blurb:
      '营销 landing、文档站与门户首页——41 页型审计未覆盖的内容型页面，验证 content / layout 渲染器族在营销审美下的承载力。',
  },
  'app-replica': {
    id: 'app-replica',
    label: '外部应用复刻',
    blurb: '用 schema + 自定义 CSS 复刻真实外部应用（Sundial 待办）的界面，验证 flux 对外部设计系统的还原能力。',
  },
  'business-replication': {
    id: 'business-replication',
    label: '业务页面复刻',
    blurb:
      '复刻 ERP/AI/MES/商城/单据/IoT 真实业务页型（roadmap 21 页，D1-D4 分域设计），每页配套域 mock 后端与 focused e2e 三支柱验收。',
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
      '模拟运营大屏：6 张 KPI 卡片（订单总数/今日订单/活跃/待付款/收入/增长率）+ 趋势面积图、每日订单柱状图、渠道占比饼图 + 最近订单与待审批两张明细表，多路数据并行加载。',
    features: ['KPI 卡片', '趋势图表', '渠道占比', '订单明细'],
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
  {
    id: 'notion-database',
    title: '多视图数据库 · 产品需求库',
    category: 'app-replica',
    description:
      '复刻多视图数据库"同一数据集多套视图"形态：库名+视图 tab 条（内建切换，table/board/gallery/calendar/list 五视图分支）+ table 视图（属性行头类型系统 + 型别分派单元格 + 行 hover OPEN/把手 + 条件配色样本）+ board 看板（状态分组列 + 列头计数 + 聚合静态值）+ gallery 封面墙 + calendar 六周月历 + list 极简单列 + View settings 滑杆面板（布局/属性可见性/filter 构建器/sort/group/条件配色 + 每视图私有配置集展示）+ 记录展开 peek 双形态（side 抽屉/center 弹窗）+ 新建视图/新建记录/列头菜单/搜索静态浮层，数据经 Notion__records/Notion__record/Notion__viewConfigs 端点流动。',
    features: ['复刻样式', '视图 tab 条', '五视图分支', 'peek 双形态'],
  },
  {
    id: 'airtable-grid',
    title: '网格任务跟踪 · 电子表格网格',
    category: 'app-replica',
    description:
      '复刻电子表格体验的关系型网格：工具栏+视图栏（视图 switcher 选中态/Hide fields 入口/行高四档控件形态/搜索筛选入口）+ 高密度网格主视图（行号列 + 20 字段型别分派静态样本 + 行 hover 展开入口 + 选中单元格蓝框静态样本 + 底部插行形态）+ summary bar（计数+按型别聚合预计算）+ 分组态样本（group= 参数化：组头计数+折叠形态+组内 summary 行）+ 行高四档密度样本（32/48/80/160px）+ 列头菜单 dialog + Hide fields 抽屉（主字段不可隐藏注记）+ 记录展开 modal（全字段分区+上一条/下一条导航），数据经 Airtable__records/Airtable__record 端点流动。',
    features: ['复刻样式', '型别分派网格', 'summary bar', '分组样本'],
  },
  {
    id: 'pih-workspace',
    title: 'Pi-Harness · 对话工作台',
    category: 'app-replica',
    description:
      '复刻 Pi-Harness（Electron AI 编码 Harness）对话工作区：macOS 风格 titlebar（红绿灯+居中品牌+搜索）+ 50px 图标导航栏（Work/Git/Model/Caps/Prefs）+ 260px 工作区侧栏（Workspace/Harness/Agents 分区 tab + SESSIONS 会话列表 + PROJECTS 空态）+ 主区（tabbar + 消息流 + composer + 底部状态 HUD）。消息流与 composer 由真实 `@nop-chaos/flux-renderers-ai` 组件驱动：`ai-chat`（mock 流式对话，含 `ai-bubble` 的 Thinking 折叠与工具调用卡）+ `ai-conversations`（会话新建/切换/重命名/删除，`useConversation` 管理）+ `ai-token-usage`（token/上下文统计）。',
    features: ['复刻样式', 'ai-chat 流式对话', 'ai-conversations 会话管理', 'ai-token-usage 状态 HUD'],
  },
  {
    id: 'stripe-payments',
    title: '金融数据面板 · 支付流水',
    category: 'app-replica',
    description:
      '复刻金融数据面板风格支付流水页（密度与排版标杆）：分组导航 shell（总览/资金/交易分组 + 快捷入口/最近/产品分组 + More 收纳 + blurple 选中态样本）+ 筛选 chip 条与日期范围预设档/关键词搜索降级形态（零生效）+ 高密度交易表格（36 行 mock 流动/客户端分页 ≥3 页/状态 pill 四语义色阶对/金额等宽右对齐/部分列排序 chevron 形态）+ 交易明细抽屉（摘要/时间线/元数据分区 + 操作按钮形态零生效）+ 导出模态与添加 widget 勾选列表 dialog + 图表卡区（KPI 卡 ×4 + 净额双曲线），数据经 Stripe__payments/Stripe__payment/Stripe__overview 端点流动。',
    features: ['复刻样式', '高密度表格', '状态色阶对', '明细抽屉'],
  },
  {
    id: 'content-landing',
    title: '营销官网与文档门户',
    category: 'content-showcase',
    description:
      '41 页型审计未覆盖的内容型页面：营销官网 landing（导航 + 渐变 hero + 浏览器产品 mockup + logo wall + 六卡特性网格 + 深色统计带 + CTA + 四列 footer）+ 内嵌文档站形态（左侧目录 + markdown 正文 + 上下页 pager）+ 门户首页形态（loop 驱动的应用磁贴网格）。全程由 page/flex/text/icon/markdown/link/card 等 content/layout 族渲染器拼装，无服务端端点。',
    features: ['营销 landing', '文档站内嵌', '门户磁贴', 'loop 驱动网格', 'markdown 正文'],
  },
  {
    id: 'bisheng-build',
    title: '毕昇构建器 · 工作流编排页',
    category: 'app-replica',
    description:
      '复刻 bisheng（毕昇，~/ai/bisheng）platform 工作流编排页：品牌蓝顶栏（#024DE3，取自其 style/index.css 令牌）+ 左侧节点库（输入输出/模型/技能/逻辑四组）+ 中央 designer canvas（「客服工单助手」六节点工作流：开始→知识库检索→azure_gpt_4→条件判断→deepseek-chat→结束，双分支带标签边）+ 右侧节点参数面板（模型 select/系统提示/温度/输出变量名 + 运行/删除动作）+ 底部调试对话抽屉。canvas 由真实 `designer-page` 渲染器驱动，顶栏与参数面板经 toolbar/inspector region 覆写，bisheng 皮肤由 bisheng-replica.css 贴附。',
    features: ['复刻样式', 'designer-page 画布', 'region 覆写', '节点参数面板', '调试抽屉'],
  },
  {
    id: 'wms-pda-receiving',
    title: 'WMS PDA 收货/上架作业页',
    category: 'business-replication',
    description:
      '复刻 WMS PDA 收货/上架作业页（roadmap 21 页 W1，D2 §2.1 mobile 族整页）：375×667 移动画布（host override）内 notice-bar 离线条 + pull-refresh 扫码作业面（wheel-picker 链路 / wheel-cascader 库位 / barcode-input ASN+SKU 连续扫码 G3 校验回填 / input-number + number-keyboard 数量 / 提交确认 dialog → asnReceive 幂等键）+ infinite-scroll 作业记录（loop + swipe-cell 左滑快捷操作）+ floating-bubble 单手流入口（G4，action-sheet）。数据经 /r/ReplWms__* 端点流动。',
    features: ['移动画布 375×667', 'barcode-input 连续扫码', 'swipe-cell', 'pull-refresh', 'number-keyboard', 'ReplWms__ 端点'],
  },
  {
    id: 'wms-wave-picking',
    title: 'WMS 拣货路径看板与波次管理页',
    category: 'business-replication',
    description:
      '复刻 WMS 拣货路径看板与波次管理页（roadmap 21 页 W2，D2 §2.2 桌面整页）：波次分组看板（kanban 四阶段列 columnAggregate 件数合计 + 拖卡 onCardMove→waveMove 持久化 + refreshSource 回读）+ 拣货路径时间轴（gantt zoomLevels 三档缩放 onZoomChange）+ 波次明细（input-table aggregate 合计行 summaryBinding 金额回写 + computed 金额列）+ 释放操作带（button 确认 dialog→waveRelease + condition-builder 释放规则）+ 只读分组汇总（table group 按库区分组聚合）。数据经 /r/ReplWms__wave* 与 pickingTasks 端点流动。',
    features: ['kanban 拖卡持久化', 'gantt zoomLevels', 'input-table 合计行', 'condition-builder', 'table 分组汇总', 'ReplWms__ 端点'],
  },
  {
    id: 'wms-stock-ledger',
    title: 'WMS 库存台账页',
    category: 'business-replication',
    description:
      '复刻 WMS 库存台账页（roadmap 21 页 W3，D2 §2.3 桌面整页）：仓库×库位×物料×批次收发存透视（pivot-table 四维行维 + 月列维 SUM 聚合 + 行总计/仓库小计 + pivot:cell-click→setValue→refreshSource→openDialog 批次追溯钻取参数链）+ 对账一致性提示卡（status 双态 + reconCheck 端点 + forceReconDrift 钩子，G7）+ KPI 四 tile（stat-tile，stockKpi 端点）+ 批次/仓库过滤（form+valuesPath 载体联动透视与明细重取）+ 收发存明细表 + 台账报表导出（button→download action，G6）。数据经 /r/ReplWms__stock* 与 ledgerReport/reconCheck 端点流动。',
    features: ['pivot-table 四维透视', 'cell-click 钻取参数链', 'stat-tile KPI', 'form+valuesPath 过滤', 'reconCheck 对账双态', 'download 报表导出', 'ReplWms__ 端点'],
  },
  {
    id: 'crm-opportunity-kanban',
    title: 'CRM 商机漏斗看板页',
    category: 'business-replication',
    description:
      '复刻 CRM 商机漏斗看板页（roadmap 21 页 C1，D2 §2.4 桌面整页）：商机看板（kanban 六阶段动态列 columnAggregate 金额合计 + 拖卡 onCardMove→moveStage 持久化 + 回退/赢单列拒绝守卫 + refreshSource 级联回读 + 卡片模板客户/金额/概率徽章三色）+ footer 统计带双落位（stat-tile×3 ← funnelSummary + table affixRow 统计行）+ 商机列表 quick-edit 预期金额（quickSaveAction→updateRevenue）+ 阶段金额漏斗（chart bar 近似，G1）。数据经 /r/ReplCrm__stageFindPage/opportunityBoard/moveStage/updateRevenue/funnelSummary 端点流动。',
    features: ['kanban 阶段动态列', '拖卡 moveStage 守卫', 'quick-edit 金额', 'columnAggregate 列头合计', 'stat-tile+affixRow 双落位', '漏斗 bar 近似', 'ReplCrm__ 端点'],
  },
  {
    id: 'crm-customer-360',
    title: 'CRM 客户 360 详情页',
    category: 'business-replication',
    description:
      '复刻 CRM 客户 360 详情页（roadmap 21 页 C2，D2 §2.5 桌面整页）：头部 detail-view 客户基本信息（partnerGet）+ picker 客户切换（party-search 范式）+ 四 tab 分区——跟进时间线（timeline reverse 置顶 + seek 高亮 + activityCreate 新增跟进 drawer mutation 链：content required 守卫 + onSubmitSuccess refreshSource）/关联线索 table（行点击 setValue+refreshSource 主从联动）/联系人 cards（partnerGet.contacts）/活动日历 calendar（CalendarEvent 月视图回归 + 跨日事件）。filterForm（form+valuesPath）活动类型过滤经 refreshSource 重取。数据经 /r/ReplCrm__partnerFindPage/partnerGet/leadByPartner/activityTimeline/activityCalendar/activityCreate 端点流动。',
    features: ['detail-view 基本信息', 'picker 客户切换', 'timeline seek 高亮', 'drawer activityCreate', '主从联动', 'calendar 月视图', 'filterForm refreshSource', 'ReplCrm__ 端点'],
  },
];

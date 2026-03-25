# Flux 组件列表

本文档列出 Flux（下一代 AMIS）引擎需要设计和实现的所有组件，并介绍其功能特性。

## 设计原则

1. **最小化原则**：任何属性都支持表达式，避免为静态内容创建冗余组件
2. **语义化优先**：组件名称应清晰表达其语义和用途
3. **可组合性**：组件通过 regions（区域）实现嵌套组合
4. **类型安全**：所有组件都有完整的 TypeScript 类型定义

## 组件分类

### 1. 页面与布局组件

#### 1.1 Page（页面）
- **功能**：顶层页面容器
- **特性**：
  - 支持 title、header、footer、toolbar、body 五个区域
  - 提供页面级作用域（scope）
  - 可配置页面标题、面包屑导航
  - 支持页面级事件（onInit、onMount、onUnmount）
  
#### 1.2 Container（容器）
- **功能**：通用布局容器
- **特性**：
  - 支持 header、body、footer 三个区域
  - 可配置 className、style
  - 支持条件渲染（visible、hidden）
  - 无表单验证功能

#### 1.3 Flex（弹性布局）
- **功能**：Flex 布局容器
- **特性**：
  - 支持 flexDirection（row、column）
  - 支持 justifyContent、alignItems
  - 支持 flexWrap
  - 支持 gap 间距
  - items 子元素区域

#### 1.4 Grid（网格布局）
- **功能**：Grid 布局容器
- **特性**：
  - 支持 columns、rows 定义
  - 支持 gap 间距
  - 支持响应式断点
  - cells 子元素区域（支持跨行跨列）

#### 1.5 HBox / VBox（水平/垂直布局）
- **功能**：简化的水平/垂直布局容器
- **特性**：
  - HBox：水平排列子元素
  - VBox：垂直排列子元素
  - 支持 columnWidth（HBox）、rowHeight（VBox）
  - 支持 gap 间距
  - items 子元素区域

#### 1.6 Wrapper（包装器）
- **功能**：通用包装组件
- **特性**：
  - body 区域
  - 支持自定义标签（component 标签名）
  - 支持 className、style
  - 支持条件渲染

#### 1.7 Collapse（折叠面板）
- **功能**：可折叠的面板
- **特性**：
  - header、body 区域
  - 支持默认展开/折叠
  - 支持手风琴模式
  - 支持动态展开状态（expanded 属性）

#### 1.8 Tabs（标签页）
- **功能**：标签页容器
- **特性**：
  - tabs 数组配置多个标签页
  - 支持默认激活标签（activeKey）
  - 支持标签位置（top、bottom、left、right）
  - 支持可关闭标签（closable）
  - 支持动态增删标签

#### 1.9 Card（卡片）
- **功能**：卡片容器
- **特性**：
  - header、body、footer、actions 区域
  - 支持图片（image 属性）
  - 支持卡片阴影、边框样式
  - 支持可点击（onClick 事件）

### 2. 表单组件

#### 2.1 Form（表单）
- **功能**：表单容器
- **特性**：
  - body、actions 区域
  - 自动创建表单作用域（form scope）
  - 完整的表单验证系统
  - 支持表单提交（api 属性）
  - 支持表单重置（reset）
  - 支持表单初始化数据（data、initApi）
  - 支持表单级事件（onSubmit、onReset、onValidate）

#### 2.2 Input（输入框）
- **功能**：文本输入控件
- **特性**：
  - 支持 text、password、email、url、number 等类型
  - 支持 placeholder
  - 支持 required、minLength、maxLength、pattern 验证
  - 支持 debounce 输入延迟
  - 支持清除按钮（clearable）
  - 支持前缀/后缀（prefix、suffix）

#### 2.3 Textarea（文本域）
- **功能**：多行文本输入
- **特性**：
  - 支持 rows、minRows、maxRows
  - 支持自动高度（autoHeight）
  - 支持 placeholder
  - 支持验证规则

#### 2.4 Select（下拉选择）
- **功能**：下拉选择控件
- **特性**：
  - options 选项配置
  - 支持多选（multiple）
  - 支持搜索（searchable）
  - 支持远程数据源（source）
  - 支持分组（group）
  - 支持清除（clearable）

#### 2.5 Checkbox（复选框）
- **功能**：复选框控件
- **特性**：
  - option 单个选项配置
  - 支持半选状态（indeterminate）
  - 支持 trueValue、falseValue

#### 2.6 Checkboxes（复选框组）
- **功能**：复选框组控件
- **特性**：
  - options 多选项配置
  - 支持内联/块级布局（inline）
  - 支持全选功能

#### 2.7 Radio（单选框）
- **功能**：单选框组控件
- **特性**：
  - options 选项配置
  - 支持内联/块级布局（inline）

#### 2.8 Switch（开关）
- **功能**：开关控件
- **特性**：
  - option 配置（onLabel、offLabel）
  - 支持 trueValue、falseValue

#### 2.9 Slider（滑块）
- **功能**：滑块控件
- **特性**：
  - 支持 min、max、step
  - 支持范围选择（range）
  - 支持标记（marks）

#### 2.10 Rating（评分）
- **功能**：评分控件
- **特性**：
  - 支持 max 最大分数
  - 支持半星（half）
  - 支持只读（readonly）

#### 2.11 DatePicker（日期选择）
- **功能**：日期选择控件
- **特性**：
  - 支持日期格式（format）
  - 支持日期范围（minDate、maxDate）
  - 支持时间选择（showTime）
  - 支持快捷选择（shortcuts）

#### 2.12 DateRangePicker（日期范围选择）
- **功能**：日期范围选择控件
- **特性**：
  - 支持日期格式
  - 支持快捷选择（今天、昨天、最近7天等）
  - 支持最大/最小日期限制

#### 2.13 TimePicker（时间选择）
- **功能**：时间选择控件
- **特性**：
  - 支持时间格式（format）
  - 支持时间范围（minTime、maxTime）
  - 支持步进（step）

#### 2.14 Upload（文件上传）
- **功能**：文件上传控件
- **特性**：
  - 支持单文件/多文件（multiple）
  - 支持文件类型限制（accept）
  - 支持文件大小限制（maxSize）
  - 支持图片预览
  - 支持拖拽上传（drag）
  - 支持上传接口（receiver）

#### 2.15 Editor（富文本编辑器）
- **功能**：富文本编辑控件
- **特性**：
  - 支持工具栏配置
  - 支持图片上传
  - 支持代码高亮
  - 支持全屏编辑

#### 2.16 Transfer（穿梭框）
- **功能**：穿梭框控件
- **特性**：
  - options 选项配置
  - 支持搜索
  - 支持分页
  - 支持左右排序

#### 2.17 TreeSelect（树选择）
- **功能**：树形选择控件
- **特性**：
  - options 树形选项配置
  - 支持多选
  - 支持搜索
  - 支持异步加载

#### 2.18 Cascader（级联选择）
- **功能**：级联选择控件
- **特性**：
  - options 级联选项配置
  - 支持多选
  - 支持搜索
  - 支持异步加载

#### 2.19 InputTag（标签输入）
- **功能**：标签输入控件
- **特性**：
  - 支持输入多个标签
  - 支持预设标签（options）
  - 支持清除
  - 支持最大标签数

#### 2.20 InputColor（颜色选择）
- **功能**：颜色选择控件
- **特性**：
  - 支持颜色选择器
  - 支持预设颜色
  - 支持透明度

#### 2.21 InputFile（文件选择）
- **功能**：文件选择控件
- **特性**：
  - 支持单文件/多文件
  - 支持文件类型限制
  - 支持拖拽

#### 2.22 InputImage（图片选择）
- **功能**：图片选择控件
- **特性**：
  - 支持图片上传
  - 支持图片预览
  - 支持裁剪
  - 支持多图

#### 2.23 InputExcel（Excel 导入）
- **功能**：Excel 导入控件
- **特性**：
  - 支持 Excel 文件解析
  - 支持自动映射字段
  - 支持数据验证

### 3. 数据展示组件

#### 3.1 Table（表格）
- **功能**：数据表格
- **特性**：
  - columns 列配置
  - 支持分页（pagination）
  - 支持排序（sortable）
  - 支持筛选（filterable）
  - 支持选择行（selectable）
  - 支持行操作（rowActions）
  - 支持固定列（fixed）
  - 支持树形数据
  - 支持可编辑单元格
  - 支持合并单元格

#### 3.2 List（列表）
- **功能**：列表展示
- **特性**：
  - listItem 列表项配置
  - 支持分页
  - 支持加载更多
  - 支持无限滚动

#### 3.3 Cards（卡片列表）
- **功能**：卡片列表展示
- **特性**：
  - card 卡片配置
  - 支持分页
  - 支持网格布局

#### 3.4 DataView（数据视图）
- **功能**：灵活的数据视图
- **特性**：
  - 支持多种展示模式（table、list、cards）
  - 支持模式切换
  - 支持分页、排序、筛选

#### 3.5 Chart（图表）
- **功能**：图表展示
- **特性**：
  - 支持多种图表类型（line、bar、pie、scatter、radar 等）
  - 支持图表配置
  - 支持数据源（api）
  - 支持实时刷新

#### 3.6 Sparkline（迷你图）
- **功能**：迷你趋势图
- **特性**：
  - 支持 line、bar、pie 类型
  - 支持内联显示

#### 3.7 JsonView（JSON 展示）
- **功能**：JSON 格式化展示
- **特性**：
  - 支持语法高亮
  - 支持折叠/展开
  - 支持复制

#### 3.8 Log（日志展示）
- **功能**：实时日志展示
- **特性**：
  - 支持实时滚动
  - 支持日志级别高亮
  - 支持日志搜索
  - 支持暂停/恢复

#### 3.9 Timeline（时间轴）
- **功能**：时间轴展示
- **特性**：
  - items 时间轴项配置
  - 支持左侧/右侧时间显示
  - 支持自定义图标

#### 3.10 Steps（步骤条）
- **功能**：步骤条展示
- **特性**：
  - steps 步骤配置
  - 支持当前步骤
  - 支持步骤状态
  - 支持垂直/水平方向

#### 3.11 Tree（树形控件）
- **功能**：树形结构展示
- **特性**：
  - items 树形数据配置
  - 支持展开/折叠
  - 支持选择
  - 支持搜索
  - 支持异步加载
  - 支持拖拽排序

### 4. 基础展示组件

#### 4.1 Tpl（模板）
- **功能**：文本模板渲染
- **特性**：
  - 支持变量插值 ${xxx}
  - 支持表达式
  - 支持富文本（HTML）
  - **优化**：编译时检测到无表达式则直接输出静态文本

#### 4.2 Text（静态文本）
- **功能**：静态文本显示
- **特性**：
  - 纯文本显示
  - 无表达式求值开销
  - 适用于固定文本内容

#### 4.3 Html（HTML 展示）
- **功能**：HTML 内容展示
- **特性**：
  - 支持原始 HTML 渲染
  - 支持安全过滤（防止 XSS）

#### 4.4 Image（图片）
- **功能**：图片展示
- **特性**：
  - 支持 src、alt
  - 支持图片预览
  - 支持懒加载
  - 支持图片标题、描述

#### 4.5 Video（视频）
- **功能**：视频播放
- **特性**：
  - 支持 src、poster
  - 支持自动播放、循环播放
  - 支持播放控制

#### 4.6 Audio（音频）
- **功能**：音频播放
- **特性**：
  - 支持 src
  - 支持自动播放、循环播放
  - 支持播放控制

#### 4.7 Icon（图标）
- **功能**：图标展示
- **特性**：
  - 支持 icon 名称
  - 支持图标库
  - 支持自定义 SVG

#### 4.8 Avatar（头像）
- **功能**：头像展示
- **特性**：
  - 支持 src、alt
  - 支持文字头像
  - 支持图标头像
  - 支持大小配置

#### 4.9 Badge（徽标）
- **功能**：状态徽标
- **特性**：
  - 支持 text、level
  - 支持数字徽标
  - 支持小圆点

#### 4.10 Tag（标签）
- **功能**：标签展示
- **特性**：
  - 支持 label、color
  - 支持可关闭
  - 支持可选中

#### 4.11 Progress（进度条）
- **功能**：进度展示
- **特性**：
  - 支持 value、max
  - 支持多种类型（line、circle、dashboard）
  - 支持动画

#### 4.12 Spinner（加载动画）
- **功能**：加载状态展示
- **特性**：
  - 支持多种样式
  - 支持自定义大小、颜色

#### 4.13 Status（状态展示）
- **功能**：状态展示
- **特性**：
  - 支持 success、error、warning、info 等状态
  - 支持图标+文字组合

### 5. 操作组件

#### 5.1 Button（按钮）
- **功能**：按钮控件
- **特性**：
  - 支持 label、icon
  - 支持按钮类型（primary、secondary、danger 等）
  - 支持按钮大小
  - 支持禁用、加载状态
  - 支持 onClick 事件
  - 支持链接按钮（href、target）

#### 5.2 ButtonGroup（按钮组）
- **功能**：按钮组
- **特性**：
  - buttons 按钮配置数组
  - 支持垂直/水平布局

#### 5.3 ButtonToolbar（按钮工具栏）
- **功能**：按钮工具栏
- **特性**：
  - buttons 按钮配置数组
  - 自动布局换行

#### 5.4 DropdownButton（下拉按钮）
- **功能**：下拉菜单按钮
- **特性**：
  - buttons 下拉菜单配置
  - 支持分组
  - 支持图标

#### 5.5 Link（链接）
- **功能**：链接控件
- **特性**：
  - 支持 href、target
  - 支持 disabled
  - 支持 onClick 事件

#### 5.6 Action（行为按钮）
- **功能**：触发行为的按钮
- **特性**：
  - 支持 action 类型（ajax、dialog、drawer、reload、link、url 等）
  - 支持确认提示（confirmText）
  - 支持条件执行（condition）

### 6. 对话框与弹窗组件

#### 6.1 Dialog（对话框）
- **功能**：模态对话框
- **特性**：
  - body 区域
  - 支持标题、大小配置
  - 支持关闭按钮
  - 支持遮罩层
  - 支持拖拽
  - 支持底部按钮

#### 6.2 Drawer（抽屉）
- **功能**：抽屉面板
- **特性**：
  - body 区域
  - 支持位置（left、right、top、bottom）
  - 支持大小配置
  - 支持关闭按钮
  - 支持遮罩层

#### 6.3 Alert（提示框）
- **功能**：轻量级提示
- **特性**：
  - body 区域
  - 支持提示级别（info、success、warning、error）
  - 支持关闭按钮
  - 支持自动关闭

#### 6.4 Toast（轻提示）
- **功能**：全局轻提示
- **特性**：
  - 支持提示级别
  - 支持自动关闭
  - 支持位置配置

#### 6.5 Confirm（确认框）
- **功能**：确认对话框
- **特性**：
  - 支持确认/取消按钮
  - 支持异步确认
  - 支持自定义内容

### 7. 导航组件

#### 7.1 Nav（导航菜单）
- **功能**：导航菜单
- **特性**：
  - links 导航链接配置
  - 支持多级菜单
  - 支持水平/垂直布局
  - 支持手风琴模式

#### 7.2 Breadcrumb（面包屑）
- **功能**：面包屑导航
- **特性**：
  - items 面包屑项配置
  - 支持下拉菜单
  - 支持图标

#### 7.3 Pagination（分页）
- **功能**：分页导航
- **特性**：
  - 支持 total、pageSize、currentPage
  - 支持快速跳转
  - 支持 pageSize 选择器

#### 7.4 AnchorNav（锚点导航）
- **功能**：锚点导航
- **特性**：
  - links 锚点链接配置
  - 支持滚动高亮
  - 支持固定定位

### 8. 其他组件

#### 8.1 IFrame（内嵌框架）
- **功能**：嵌入外部页面
- **特性**：
  - 支持 src
  - 支持高度自适应

#### 8.2 WebComponent（Web 组件）
- **功能**：自定义 Web 组件
- **特性**：
  - 支持自定义标签
  - 支持属性传递
  - 支持事件监听

#### 8.3 Each（循环渲染）
- **功能**：循环渲染子元素
- **特性**：
  - items 数据源
  - name 字段名
  - placeholder 无数据时显示
  - 支持 itemName、indexName

#### 8.4 Property（属性列表）
- **功能**：键值对展示
- **特性**：
  - items 属性项配置
  - 支持分组
  - 支持标签宽度配置

#### 8.5 Mapping（映射展示）
- **功能**：值映射展示
- **特性**：
  - map 映射配置
  - 支持默认值

#### 8.6 QRCode（二维码）
- **功能**：二维码展示
- **特性**：
  - 支持 value
  - 支持大小配置
  - 支持级别配置

#### 8.7 Barcode（条形码）
- **功能**：条形码展示
- **特性**：
  - 支持 value
  - 支持格式配置

#### 8.8 Carousel（轮播图）
- **功能**：图片轮播
- **特性**：
  - items 轮播项配置
  - 支持自动播放
  - 支持切换动画
  - 支持指示器

#### 8.9 Gallery（图库）
- **功能**：图片画廊
- **特性**：
  - images 图片数组
  - 支持网格布局
  - 支持图片预览

#### 8.10 Table2（高级表格）
- **功能**：高级数据表格
- **特性**：
  - 所有 Table 的功能
  - 支持虚拟滚动
  - 支持大数据量
  - 支持列拖拽

#### 8.11 PivotTable（透视表）
- **功能**：数据透视表
- **特性**：
  - 支持行列维度配置
  - 支持聚合函数
  - 支持钻取

#### 8.12 Kanban（看板）
- **功能**：看板视图
- **特性**：
  - 支持 multiple 分组
  - 支持卡片拖拽
  - 支持跨分组拖拽

#### 8.13 Calendar（日历）
- **功能**：日历展示
- **特性**：
  - 支持月视图、周视图、日视图
  - 支持事件展示
  - 支持事件拖拽

#### 8.14 Tasks（任务）
- **功能**：任务执行展示
- **特性**：
  - items 任务配置
  - 支持任务状态
  - 支持任务重试

#### 8.15 Wizard（向导）
- **功能**：分步表单向导
- **特性**：
  - steps 步骤配置
  - 支持步骤跳转
  - 支持步骤验证

## 特殊组件

### Svc（服务组件）
- **功能**：数据服务容器
- **特性**：
  - body 区域
  - 支持 api 数据源
  - 支持 schemaApi 动态 schema
  - 支持 ws WebSocket 数据源
  - 支持轮询刷新
  - 支持数据适配（adapter）

### Custom（自定义组件）
- **功能**：自定义组件容器
- **特性**：
  - body 区域
  - 支持自定义渲染逻辑
  - 支持自定义事件

### Slot（插槽）
- **功能**：组件插槽
- **特性**：
  - 支持动态内容注入
  - 支持作用域传递

## 组件优先级

### P0（核心必须）
- Page、Container、Form、Input、Select、Checkbox、Radio、Switch、Button、Table、Tpl、Text

### P1（高优先级）
- Flex、Grid、Tabs、Card、Dialog、Drawer、Datepicker、Upload、Editor、List、Cards、Chart、Nav、Breadcrumb、Pagination

### P2（中优先级）
- Collapse、HBox、VBox、Wrapper、Badge、Tag、Progress、Spinner、Status、Image、Video、Audio、Icon、Avatar、Toast、Alert、Confirm

### P3（低优先级）
- 其他所有组件

## 表达式优化

所有组件属性都支持表达式（${...}），编译时会进行优化：

1. **静态检测**：如果属性值不包含 `${`，直接编译为静态值（static-node）
2. **纯表达式**：如果属性值是 `${expr}` 形式，编译为表达式节点（expression-node）
3. **模板字符串**：如果属性值包含 `${expr}` 但不是纯表达式，编译为模板节点（template-node）
4. **运行时缓存**：表达式求值结果会被缓存，避免重复计算

因此，**不需要**为静态内容单独创建组件（如 Text），只需在需要明确语义或性能优化时使用。

## 扩展机制

组件可通过以下方式扩展：

1. **RendererDefinition**：定义组件渲染器
2. **RendererPlugin**：插件机制，可拦截编译、渲染、动作执行
3. **ComponentHandle**：组件能力注册，支持方法调用
4. **ActionNamespaceProvider**：动作命名空间提供者

## 与 AMIS 的差异

1. **更少的冗余组件**：通过表达式优化，减少静态内容专用组件
2. **更强的类型系统**：完整的 TypeScript 类型定义
3. **更清晰的架构**：core、formula、runtime、react 分层架构
4. **更优的性能**：编译时优化、运行时缓存、不可变数据
5. **更好的扩展性**：插件机制、组件能力注册、动作命名空间

## 参考资源

- [AMIS 官方文档](https://aisuda.bce.baidu.com/amis/)
- [AMIS GitHub](https://github.com/baidu/amis)
- [Flux 架构文档](./architecture/amis-core.md)
- [Flux 组件开发指南](./development/component-development.md)

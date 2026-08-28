# R2 第 2 轮发现压缩摘要（round-02 compact，skill 上下文管理节：每条 1 行）

## G1

- [G1-R2-视角2-01] button `href` 锚点分支完全丢失按钮视觉：variant/size 失效，渲染为 UA 默认超链接
- [G1-R2-视角3-01] collapse 触发器 disabled 项无任何视觉禁用区分，且 hover 反馈照常出现
- [G1-R2-视角3-02] button `active`（aria-pressed 按压态）仅落 data-active/aria-pressed，全仓无任何样式消费 [G1-视角3-03 同类新实例]
- [G1-R2-视角5-01] audio/video/image/qrcode 失败态与空态同为 muted 灰字，无 destructive 语义 [G1-视角5-05 同类新实例]
- [G1-R2-视角8-01] steps 水平连接线 absolute 定位缺少 relative 包含块，连接线脱离步骤项渲染
- [G1-R2-视角8-02] diff-view 窄容器/移动端降级不完整：cross-file 固定 240px 侧栏无适配，split 移动端堆叠被内联 grid 打断

## G2

- [G2-R2-视角3-01] input-time 的 steppers 形态完全不接入 disabled/readOnly 门禁：禁用字段仍可步进改值且无任何禁用视觉
- [G2-R2-视角4-01] select 移动端 bottom sheet 多选选项行沿用单选圆形指示器，与同包 tree-select 移动多选的方块 Checkbox 两套语言
- [G2-R2-视角4-02] composite 家族（array-editor / combo / input-table）到达 maxItems 后 Add 按钮静默禁用，无计数无提示——checkbox-group maxSelected 缺陷的同根因兄弟实例
- [G2-R2-视角5-01] 单选上传进行中二次选择文件：在飞上传未中止，晚完成的被废弃文件静默覆盖字段值，UI 与提交值不一致
- [G2-R2-视角6-01] tree-select 选中后弹层无任何关闭路径：桌面 popover 单选不关闭、移动 sheet 无关闭钮也无确认钮（select 移动 sheet 缺陷的同病兄弟）
- [G2-R2-视角5-02] 上传失败条目永久滞留列表：无移除钮、无重试，且"清空"按钮仅在存在成功项时渲染，失败行无法消失
- [G2-R2-视角8-01] 步进类控件点击目标低于 24px 豁免基线：input-time StepperButton 实际 20×20px、input-number stepper 仅 16px 高
- [G2-R2-视角10-01] 同组两套富文本格式工具栏按钮样式规范不一致：markdown-editor 用 outline/size-8，editor 用 ghost 加描边/h-7

## G3

- [G3-R2-视角3-01] 行点击勾选（toggleOnRowClick）无键盘等价路径，Enter/Space 对该行为完全无效
- [G3-R2-视角4-01] rowSelection maxSelectionLength 达上限后全链路静默禁用，无计数、无原因说明
- [G3-R2-视角4-02] dashboard 编辑器 Inspector 全部字段 Label 未与控件关联（无 htmlFor/id/aria-label）
- [G3-R2-视角4-03] Inspector 数字输入清空即写 0，面板坐标/尺寸瞬间跳零
- [G3-R2-视角6-01] 列设置下拉中"上移/下移"点击即关闭菜单，重排 N 列需重开 N 次菜单
- [G3-R2-视角8-01] dashboard 编辑器面板删除按钮 hover-only 且 display:none，触摸设备不可见不可达
- [G3-R2-视角9-01] pivot-table 画布包装层无 role/aria-label，违反画布表面 a11y 契约（同型渲染器不一致）
- [G3-R2-视角10-01] 表格单元格 copyable 复制失败零反馈（成功/失败双通道只剩一个）
- [G3-R2-视角10-02] 树表懒加载 spinner 为包内唯一手写实现，偏离本包统一的 ui Spinner 基线

## G4

- [G4-R2-视角1-01] 里程碑连线的两个 link handle 因缺少 `group` 祖先类永久不可见（与 R1 视角8-01 根因不同）
- [G4-R2-视角3-01] calendar 拖拽悬停目标零视觉反馈：`data-drop-target`/`drag-ok`/`drag-conflict` 在 calendar.css 无任何对应规则
- [G4-R2-视角3-02] gantt 时间线任务条的选中态无任何视觉指示（网格行有高亮、条形无）
- [G4-R2-视角3-03] scheduling 自定义 roving-focus 元素零设计系统 focus 指示，且与 gantt 的 focus ring 双轨并存
- [G4-R2-视角4-01] 扫码校验失败的错误提示渲染在全屏扫描浮层之下，扫描过程中用户零反馈
- [G4-R2-视角5-01] pull-refresh 刷新失败静默回弹：无错误文案、无重试，与同包 infinite-scroll 的错误态双标
- [G4-R2-视角5-02] calendar PNG 导出的 `exportError` 状态已备但从未渲染，导出全程亦无 busy 指示
- [G4-R2-视角8-01] gantt 任务条边缘 6px 拖拽缩放热区无任何可见 affordance 与光标提示
- [G4-R2-视角9-01] notice-bar 绑定 onClick 时 `role="button"` 容器内嵌真实关闭 Button（kanban 同病兄弟实例）
- [G4-R2-视角10-01] calendar 键盘拖拽会话：幽灵卡固定渲染在视口左上角 (0,0)，Enter 确认还会把已移动的事件派发回原日期

## G5

- [G5-R2-视角3-01] 流式中断（aborted）态无任何视觉反馈，与错误态（banner+重试）不对称
- [G5-R2-视角3-02] 工具箱操作回显 span 无样式规则、无 role="status"，失败与成功文案视觉无差
- [G5-R2-视角3-03] 编辑器 preview 态零可见指示，且工具箱/属性面板 mutator 未按 mode 门控仍可改图元
- [G5-R2-视角5-01] ai-attachments 超 maxSize/maxFiles 拒绝静默丢文件，界面零反馈
- [G5-R2-视角5-02] map 错误覆盖层用中性灰正文且直接渲染原始 error.message，与全仓错误语义色/文案链路不一致
- [G5-R2-视角6-01] HITL 审批卡片按钮顺序为 [批准(实心), 驳回(outline)]，违反项目 [secondary, primary] 审批按钮约定
- [G5-R2-视角7-01] graph 节点 warning/success 语义级颜色硬编码 HSL 字面量，同文件 danger 却走 --destructive 令牌
- [G5-R2-视角3-04] graph 缩放按钮到达 min/max 边界后仍可点击，静默无效果且无禁用态
- [G5-R2-视角5-03] ai-message-list 空消息且未配 emptyState region 时渲染空白面板，无默认提示
- [G5-R2-视角8-01] 附件缩略图移除按钮 20px 且 hover 才可见（触摸设备不可发现），卡片态移除按钮同为 20px
- [G5-R2-视角9-01] graph 布局切换按钮以原始枚举值 "flow"/"hierarchy" 作为可见文案，未走 i18n 且与同簇图标按钮语法不一
- [G5-R2-视角9-02] 编辑器错误兜底直接渲染原始 error.message，未走运行态画布已有的错误码 i18n 管线
- [G5-R2-视角10-01] ai-feedback 复制失败静默吞掉，与同仓"复制失败必须有反馈"基线不一致
- [G5-R2-视角10-02] ai-conversations 新建会话按钮（outline）缺 PlusIcon，偏离本仓"新增 = ghost/outline + PlusIcon"基线

## G6

- [G6-R2-视角3-01] 可拖拽 DialogHeader（tabIndex=0，常为弹窗首个 Tab 停留点）无任何 focus-visible 焦点态
- [G6-R2-视角3-02] MenubarTrigger 用 `outline-hidden` 抹掉默认焦点轮廓且无 focus-visible 替代，菜单栏键盘导航焦点不可见
- [G6-R2-视角6-01] DrawerBody 无滚动契约：长内容在 max-h-[80vh]/h-full 抽屉中溢出且不可达，与 DialogBody 的内建滚动不对称
- [G6-R2-视角9-01] ComboboxInput 内嵌 trigger/clear 与 ComboboxChip 的移除钮均为 icon-only 无可访问名
- [G6-R2-视角9-02] Dialog 拖拽说明 sr-only 段落从未被 aria-describedby 引用（同 id 重复渲染两份），对辅助技术永久静默
- [G6-R2-视角10-01] 列表高亮体系分裂：CommandItem 选中态用 bg-muted/text-foreground，Select/Combobox/Dropdown/ContextMenu 全族用 bg-accent

## G7

- [G7-R2-视角11-01] 导出下载链接指向 data: URL 且无 download 属性，现代浏览器拦截顶层导航，「点击下载」点击无任何效果
- [G7-R2-视角4-01] tree-crud 部门筛选选中后无任何清除/重置路径：clearable 未启用且 radio 模式不可反选，用户被锁死在筛选态
- [G7-R2-视角5-01] master-detail 未选择订单时右侧三个数据面以「暂无日志/暂无收货地址/暂无数据」呈现，空态语义与「请选择左侧订单」引导矛盾
- [G7-R2-视角10-01] sundial 族「移到垃圾箱/垃圾桶」按钮样式跨页分裂：detail 页 destructive 红色实底，workbench 对话框内为 ghost 无警示色
- [G7-R2-视角11-02] form-wizard 第二步收集的「部门」在确认步不回显、提交时不上送，用户选择被静默丢弃
- [G7-R2-视角11-03] master-detail 未选择订单时「新增明细」可点击且报「新增成功」，记录以空 orderId 落库后在界面上永久不可见
- [G7-R2-视角11-04] sundial-detail 子任务详情对话框内容映射错误：点「整理 OKR 回顾」显示「整理发票」，父任务归属文案也指向另一条任务
- [G7-R2-视角11-05] sundial-detail「列表」字段行动态值与静态色点标签同屏双显：初始即重复渲染「工作」，切换列表后同一行出现两个不同列表名
- [G7-R2-视角11-06] sundial-settings「自建服务器（即将推出）」选项可正常选中且保存成功，「即将推出」徽标与实际行为互相矛盾
- [G7-R2-视角11-07] sundial-workbench 侧边栏「搜索」输入框无任何消费方：输入不影响任务列表，属死交互

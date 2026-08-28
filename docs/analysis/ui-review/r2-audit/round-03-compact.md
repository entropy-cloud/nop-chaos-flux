# R2 第 3 轮发现压缩摘要（round-03 compact，skill 上下文管理节：每条 1 行）

## G1

- [G1-R3-视角3-01] wizard 提交锁定期"上一步"与步骤导航按钮无禁用视觉，点击静默无效——同栏 next 却正确禁用
- [G1-R3-视角8-01] tabs 移动端滑动手势未排除嵌套横向滚动/拖拽目标：表格横滑、滑块拖动约 50px 即被劫持为切换页签

## G2

- [G2-R3-视角3-01] period 家族（month/quarter/year）快捷区间按钮不接 disabled 门禁：灰显锁定字段仍可被改值并随提交持久化
- [G2-R3-视角3-02] editor（富文本）运行时转 disabled 后可编辑态被同步效应错误恢复：同步条件漏算 disabled，"已禁用"字段仍可继续输入并提交
- [G2-R3-视角4-01] editor 链接动作：取消（dismiss）prompt 反而移除已有链接 + 依赖原生 window.prompt，非白名单 scheme 静默忽略

## G3

- [G3-R3-视角4-01] 虚拟化表格 + radio 行选择：RadioGroupItem 脱离 RadioGroup 容器，单选控件完全失效（点击无效、选中态恒不显示）
- [G3-R3-视角8-01] draggable 表格的行拖拽列只有 body 单元格，表头 `<th>` 与 colgroup `<col>` 均无配对列 → 整表列错位（[G3-视角5-01] 同根因新实例）
- [G3-R3-视角4-02] 树表 + 行选择：表头全选框 checked 判定混用"顶层行数"与"扁平化选择计数"，展开子节点后点全选表头框不勾选
- [G3-R3-视角5-01] 行级快速编辑保存失败零反馈：hook 调用未接 onSaveError，同包单元格级保存的 env.notify 基线未复用
- [G3-R3-视角11-01] dashboard 编辑器新增面板固定落 (0,0)、拖拽/缩放无任何碰撞处理：新面板与既有面板完全重叠，旧面板被静默遮盖
- [G3-R3-视角4-03] 列设置可把所有列逐个隐藏且无最小可见保护：表格坍缩为只剩控制列的空壳，无任何"列已全部隐藏"提示
- [G3-R3-视角8-02] dashboard 编辑器画布根节点 `touch-none` + `overflow-auto` 并用：触摸设备完全无法滚动画布，视口外面板不可达

## G4

- [G4-R3-视角10-01] gantt 缩放视口锚定断链：`store.scrollLeft` 无生产写入方，setZoom 的中心锚定分支永不生效，缩放后可见日期窗口跳变
- [G4-R3-视角11-01] gantt 工具栏"适应/Fit"按钮不执行任何适配计算，仅跳到中间缩放档位，文案承诺的行为不存在
- [G4-R3-视角3-01] gantt 缩放按钮到达最小/最大档位后仍呈可用态，点击静默无效（graph 缩放边界缺陷的同型兄弟实例）
- [G4-R3-视角10-02] calendar 月视图单元格 Enter/Space 的键盘"创建排班"是死路：长按模型依赖 pointerup，键盘会话永不完成，且遗留已武装会话劫持下一次任意点击
- [G4-R3-视角9-01] calendar 周/日视图的时段 gridcell 全部 `tabIndex={0}` 且无任何键盘行为：Tab 序被约 100 个惰性焦点停留点淹没，与月视图 roving 模型同组件分裂
- [G4-R3-视角7-01] 排班事件块与班次选择按钮以固定白色前景配任意背景色：默认班次色 amber/blue/green 上白字对比度 1.7~2.9:1，事件标题难以辨认
- [G4-R3-视角5-01] barcode 扫描浮层相机初始化失败（error 相位）无重试入口，且直出原始异常英文 message（map 错误文案同根因的 scheduling 实例）
- [G4-R3-视角11-02] calendar 拖拽创建排班仅月视图可用：周/日视图长按空单元格零反应、无任何创建入口，同组件三种视图能力分裂

## G5

- [G5-R3-视角3-01] scada 编辑器 `meta.disabled` 仅 inert 画布区，工具箱/图元库/属性面板完全未门控，"禁用编辑器"仍可增删改图元
- [G5-R3-视角3-02] ai-feedback 赞/踩投票选中态仅落 `data-active`/`aria-pressed`，全仓无任何样式消费，投票后按钮外观零变化
- [G5-R3-视角5-01] ai-attachments "发送"不闭环：非图片附件点击后静默无效果，发送成功后列表不清理可重复发送
- [G5-R3-视角8-01] scada 编辑器工具箱 30+ 按钮单行不换行不滚动，窄容器下尾部按钮（撤销/重做/导出/导入）被 `overflow:hidden` 裁剪且无替代入口
- [G5-R3-视角11-01] 流式生成期间用户上滑回看后无"回到底部"入口，hook 已导出 `scrollToBottom` 但消息列表从未消费

## G6

- [G6-R3-视角6-01] Drawer `resizable` 拖拽缩放是死链：把手全套 resize 供龄（光标/hover/aria-label），但尺寸变量无任何消费方，拖动后抽屉分毫不变

## G7

- [G7-R3-视角4-01] advanced-query 日期范围筛选未启用 clearable，范围选定后无任何清空路径
- [G7-R3-视角4-02] advanced-query / tree-crud 部门列渲染原始部门 ID（d1/d1-1），同表角色/状态列均为中文标签
- [G7-R3-视角11-01] sundial-workbench 侧边栏计数与压力卡数字同屏自相矛盾，且与 settings/analytics 跨页矛盾
- [G7-R3-视角11-02] form-wizard 确认步「角色」回显原始枚举值 admin/user/guest 而非字典标签
- [G7-R3-视角11-03] tree-crud 启用 selection 但全页无任何批量动作消费选择集
- [G7-R3-视角11-04] dashboard「今日订单」KPI 恒为 0（mock createTime 2024-07 与运行时"今天"不匹配）
- [G7-R3-视角7-01] sundial-workbench 已完成看板「昨天」徽标复用红色 error 语义
- [G7-R3-视角6-01] workbench 任务详情日期选择器初始选中值（今天）与行内徽标回退值（8/18）不一致

# Cal.com 预约流程复刻分析（P3 输入）

> 分析对象：Cal.com 公开预约页全流程（时长选择 → 槽位/时区 → 确认表单 → 成功态）（开源状态：核心仓库 AGPL 开源可作结构参考，**商业版式按闭源处理，风格等价复刻 + 差异声明**）
> 调研日期：2026-08-29（来源见 §8；部分演示页/样式文件 404，hex 与像素值标 📁 常识档，实施前以开源实现核对）
> 上游：R1 §2.4（Retool 系对照）、C1-6（预约流程构想）、C2 G-C（月/周多视图边缘）、G-F（槽位 hover/选中态）；下游：P3a / P3b

## 1. 应用概述

Cal.com 是开源调度基础设施，其公开预约页（Booker）是"自服务预约"品类标杆：访客按 4 步完成预约——**入口（时长）→ 槽位（日历+时区）→ 确认（表单）→ 成功（日历外链）**。产品价值在双栏槽位选择的交互密度与时区换算的正确性。

flux 复刻依托：scheduling 包 calendar、input-datetime（460 B6/B7 日历先例）、steps/wizard（form-wizard 先例）、dialog/drawer（移动端 day sheet）。

## 2. 设计令牌结构

### 2.1 色彩（黑白极简主题；变量架构 🌐 官方 `--cal-*` 8 组，hex 为 📁 常识档）

| 令牌                                                        | 值                                | 用途                                                      |
| ----------------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `--cal-bg`                                                  | `#FFFFFF`                         | 主画布                                                    |
| `--cal-bg-emphasis`                                         | `#E5E7EB`                         | hover 日期格、选中区间底                                  |
| `--cal-bg-subtle`                                           | `#F3F4F6`                         | 槽位 hover、卡片底                                        |
| `--cal-bg-muted`                                            | `#F9FAFB`                         | 不可约日期、骨架屏                                        |
| `--cal-bg-inverted`                                         | `#111827`                         | 深色浮层/tooltip                                          |
| `--cal-text-emphasis` / `--cal-text`                        | `#111827` / `#374151`             | 活动标题、月份头 / 正文、槽位标签                         |
| `--cal-text-subtle` / `--cal-text-muted`                    | `#6B7280` / `#9CA3AF`             | 星期头、时区标签 / 禁用日期                               |
| `--cal-brand` / `--cal-brand-emphasis` / `--cal-brand-text` | `#111827` / `#374151` / `#FFFFFF` | **品牌黑**：选中日期圆、Confirm 按钮底 / hover / 面上文本 |
| `--cal-border` / `-subtle` / `-emphasis`                    | `#E5E7EB` / `#F3F4F6` / `#111827` | 网格线卡片边 / 软分隔 / 输入框 focus 环                   |
| `--cal-text-error` / `--cal-border-error`                   | `#DC2626` / `#FCA5A5`             | 校验文案 / 错误红环                                       |
| `--cal-text-success`                                        | `#059669`                         | 成功徽章                                                  |
| `--cal-text-attention` / `--cal-bg-attention`               | `#D97706` / `#FFF3E0`             | "名额将满"警示                                            |
| `--cal-text-info`                                           | `#2563EB`                         | info 徽章                                                 |

变量架构要点（复刻必须保留的是**架构**而非值）：`radius`（基准圆角，默认 **10px**，sm/md/lg/xl 全由它派生，设 0 即全直角）+ `spacing`（基准间距单位，padding/margin/gap 全由此缩放）双基准，light/dark 双主题整套覆盖。

### 2.2 排版

UI = Inter（400/500/600，槽位数字 tabular）；营销标题 = Cal Sans（商业字体，复刻换 Inter 加权或替代展示字体）。活动标题 18–20px/semibold；月份头 14px/600；槽位/正文 14px；星期头 11–12px/500 uppercase；时区标签 12px。

### 2.3 间距/圆角/控件尺寸

按钮/输入 h-9~40px；时长 tab h-8 顶部分段；槽位按钮 h-9、桌面右栏 ~280–320px、槽位 2 列网格；头像 24–32px 圆。基准圆角 10px（派生档位）。

### 2.4 交互习惯

hover = `bg-subtle` 150ms ease；品牌按钮 hover = brand-emphasis；focus = 2px `border-emphasis` 环；按压以色变为主（无 scale）；加载 = 骨架屏脉冲（`bg-muted`）；移动端分节切换 framer-motion 滑动。**槽位按钮即 option-row 型三态**（默认描边 → hover 浅底 → 选中黑底白字）——G-F 变体的直接参照。

### 2.5 图标

Lucide 线性 16–20px、stroke 2（时长/地点/时区行前缀）——与 flux lucide 体系同源，复刻零成本。

## 3. 页面清单与复杂度排序

| 页面/状态    | 复杂度 | 说明                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 槽位选择视图 | ★★★★★  | 桌面双栏：左 = 活动 meta + **月历**（6 周网格、今日强调、邻月 muted、选中黑圆白字、←/→/Today 导航、底部时区下拉含搜索 + 12h/24h 开关）；右 = 选中日**槽位列表**（上午/下午/晚上分组、option-row 按钮）；数据来自 slots API；含骨架屏、slot reservation 锁、"slot no-longer-available" 失效态；移动端月历收进底部 day sheet drawer。日历+双栏+时区换算+异步刷新，与通用低代码差距最大 |
| 确认表单     | ★★★    | reschedule 提示条 + 左摘要卡（头像/标题/时长/地点/时区）+ 右动态表单（姓名/邮箱/**嘉宾增删**/备注/**自定义问题** bookingFields：text/textarea/select/radio/checkbox/phone/number）+ 校验红环 + Confirm 黑按钮                                                                                                                                                                        |
| 预约入口页   | ★★     | 头像+全名+用户名 badge+活动标题+meta 行（📅 时长 🎥 地点 📍时区）+ 描述 + **时长 tabs**（15/30/45/60 实证）；单列卡片，静态+tab                                                                                                                                                                                                                                                      |
| 成功态       | ★★     | 大圆 ✓（绿）+ 摘要卡 + **Add to calendar**（Google/Outlook/Office365/ICS 四外链）+ Copy link（toast）+ Reschedule/Cancel 链接；待确认变体 = ⏳ pending 徽章                                                                                                                                                                                                                          |

## 4. 核心交互清单（全流程拆到交互步级）

| #   | 交互             | 触发                | 反馈                                                                               |
| --- | ---------------- | ------------------- | ---------------------------------------------------------------------------------- |
| I1  | 时长 tab 切换    | 点 15/30/45/60 分段 | 选中态即时切换；槽位按新时长 refetch，骨架屏过渡                                   |
| I2  | 选日             | 月历点日期格        | 日期格选中黑圆；槽位列表刷新；窗口聚焦/每 5 分钟自动 refetch（Booker README 实证） |
| I3  | 时区切换         | 时区下拉（含搜索）  | 槽位时间即时换算重渲染；时区标签更新；可切 12h/24h                                 |
| I4  | 月份导航         | ←/→/Today           | 月历翻页，邻月 muted，Today 回当月                                                 |
| I5  | 选槽位 → 进确认  | 点槽位按钮          | 创建 **slot reservation**（每 10s 续约）；进入确认步骤                             |
| I6  | 嘉宾增删         | 「+ Add guests」    | 追加邮箱行 + 删除钮，上限 30                                                       |
| I7  | 表单校验         | blur/submit         | 必填/邮箱格式；错误 = 红环 + `text-error` 文案                                     |
| I8  | 提交预约         | Confirm             | loading → 成功态；需确认时 = pending 态                                            |
| I9  | 槽位失效         | 提交时已被占        | Confirm 禁用 + 「选择其他时段」提示；回列表该槽变灰                                |
| I10 | 加入日历         | 成功页按钮          | 新窗口预填日历事件外链 / ICS 下载                                                  |
| I11 | 复制链接         | Copy link           | 剪贴板 + toast                                                                     |
| I12 | 重排/取消        | 成功页/邮件         | 重排 = 回槽位视图预填 + 提示条；取消 = 确认框填原因                                |
| I13 | 步骤回退         | 各步 ←              | **4 步全可回退**：入口↔槽位↔确认↔成功，状态保留                                    |
| I14 | 移动端 day sheet | 小屏点日期格        | 槽位以底部 drawer 展开（窄屏单列）                                                 |
| I15 | 日历叠加         | 登录访客开启        | 自有日历 busy 时段半透明覆盖槽位                                                   |

### 4.1 P3b 逐条处置对照：预测缺口 vs 实测缺口（2026-08-29 回写）

> 授权链：P1 README §5（Pi-b 把"预测缺口 vs 实测缺口"对照记入分析篇）→ plan `2026-08-29-1819-1` Phase 5。终态判定 = 接线锁定（W）/ 内建锁定（B）/ 显式裁决（A）。e2e 锚点 = `tests/e2e/cal-replica-interactions.spec.ts` 用例号（初屏结构 = `cal-replica-visual.spec.ts`）。

| I#  | 预测（本篇 §4/§5 原判）                          | 实测结论（P3b）                                                                                                                                                                                                                                  | 终态              | e2e      |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------- |
| I1  | 时长 tab 切换；槽位按新时长 refetch + 骨架屏过渡 | tabs `valueStatePath: calDuration` + scope 依赖自动刷新可达；**骨架过渡裁定静态样本**（mock 即时返回下 loading 不可观察，以 refetch 结果断言承载）                                                                                               | W                 | 03       |
| I2  | 选日刷新 + 窗口聚焦/5 分钟自动 refetch           | **点格手势受 G-C 限制**（月视图为资源时间轴横条，无点格选中语义）→ 内建月份导航承载日期变更；`interval: 300000` 配置接线（schema 单测锁定）；**聚焦刷新裁定不模拟**（无内建支持，C2 回写 ④）                                                     | W+B               | 01       |
| I3  | 时区切换即时换算 + 12h/24h                       | select `name: calTimezone` + url 模板物化可达；12h/24h 为 schema 表达式（`${cal24h === false ? $slot.item.time : $slot.item.time24}`，mock 数据集双形态零改动）                                                                                  | W                 | 04       |
| I4  | 月份导航 ←/→/Today                               | calendar 内建可达（月头翻页 + Today 回当月 + data-today 唯一）                                                                                                                                                                                   | B                 | 02       |
| I5  | 选槽位 → slot reservation（10s 续约）→ 进确认    | reservation 锁 out-of-scope（P3a 裁定）；**会话指针机制**成立：`Cal__selectSlot` post → 确认页 data-source 无参读取，摘要三字段与所点槽位一致（e2e 断言）；expired 样本 disabled 不可点                                                          | W                 | 05       |
| I6  | 嘉宾增删（form 重复字段组，中）                  | **预测修正**：guests 属 mock 会话态而非表单值——由 `Cal__addGuest/removeGuest` 会话端点 + loop 渲染 `${selected?.guests}`（`$slot.index` 删行）+ `component:refresh` 回读承载，上限 30 可达；保真度上调「高」                                     | W                 | 07       |
| I7  | 必填/邮箱格式校验；红环 + text-error 文案        | `data-field-invalid` + `[data-slot="field-error"]` 内建可达；空提交零写请求副作用（端点计数钩子断言）；校验失败走 `onValidateError` 不触发 `onSubmitError`（留页关键）                                                                           | B                 | 08       |
| I8  | 提交预约 loading → 成功态；需确认 = pending      | form `submitAction`（`Cal__book` + `includeScope: '*'`）→ `onSubmitSuccess` navigate 全链可达；navigate 需 `control.debounce` 延迟（回写 ③ 同源）；pending 变体 = 端点级 `requiresConfirmation` 单测承载 + 成功页徽章表达式兜底（UI 恒走确认态） | W                 | 09       |
| I9  | 槽位失效 → Confirm 禁用 + 提示 + 回列表该槽变灰  | `messages.failed`（「选择其他时段」提示）+ `onSubmitError` navigate 回槽位视图可达；expired UI 样本不可点 → e2e 经 mock 强制失效路径（opt-in 端点同路径钩子）承载 cal-book-expired                                                               | W                 | 10       |
| I10 | 加入日历新窗口外链 / ICS 下载                    | 四外链占位 href + 可点性内建锁定（真实日历端点拼接属宿主能力，href 断言不指向真实端点）                                                                                                                                                          | B                 | 12       |
| I11 | 复制链接 = 剪贴板 + toast                        | **无剪贴板 action 词汇**——裁定语义模拟：`Cal__shareLink` 无副作用 get + `messages.success`「链接已复制」；实际剪贴板写入不做（C2 回写 ④ 素材行：RendererEnv clipboard 通道候选）                                                                 | W+A               | 13       |
| I12 | 重排 = 回槽位预填 + 提示条；取消 = 确认框填原因  | reschedule → navigate 回 booking（会话指针预填时长/槽位，I13 同语义）；cancel → openDialog（reason textarea + `[secondary, primary]` 按钮序）→ `Cal__cancelBooking` → 状态翻转会话内可观察（成功页徽章「已取消」断言）；miss 分支 toast 兜底     | W                 | 14/15/16 |
| I13 | 4 步全可回退，状态保留                           | 三页切分（P3a 裁定）+ navigate + 会话指针回填承载：回退/重排后时长档、选中日、选中槽位与离开前一致（e2e 断言）；时区回 PAGE_DATA 默认（scope 不跨页）                                                                                            | W                 | 11       |
| I14 | 移动端 day sheet（底部 drawer 窄屏单列）         | `responsive` 双变体（max/min md）+ openDrawer `side: 'bottom'` 单列槽位列表可达；点格手势受限 → 触发按钮替代（C2 回写 ④）；桌面双栏零回归                                                                                                        | W                 | 06       |
| I15 | 日历叠加（busy 覆盖）                            | out-of-scope 维持（P3a 同裁定，业务层语义未落盘）                                                                                                                                                                                                | A（out-of-scope） | —        |

事实勘误行（对照本篇前文）：

- §5「嘉宾增删行 → form 重复字段组（保真度中）」——实测 guests 在 mock 会话态而非表单值，由会话端点 + data-source loop 承载，保真度上调为「高」。
- §5「分步流程与回退 → steps/wizard（中高）」——实测未用 wizard：三页切分 + navigate + 会话指针承载（P3a 页面切分裁定维持），入口页↔槽位页为同页双区非独立步。
- §5「槽位异步数据 → data-source + focus/定时刷新策略（中）」——`interval` 内建接线成立（维持「中高」体感）；聚焦刷新维度确证无内建支持（C2 回写 ④）。
- §4 I9 预测「Confirm 禁用 + 提示」——实测补充失败反馈通道：`messages.failed` toast + `onSubmitError` 返回槽位视图（e2e 10）。
- §4 I5 预测「slot reservation 每 10s 续约」——P3a 已裁定 out-of-scope（业务层锁语义），复刻为会话指针无续约语义，维持差异声明。

## 5. 能力映射初稿

| 参考元素                   | flux 原语（schema 落点）                                         | 保真度预估 | C2 对照            |
| -------------------------- | ---------------------------------------------------------------- | ---------- | ------------------ |
| 入口页结构                 | page/container + card + avatar + badge                           | 高         | G-A（页头组合）    |
| 时长切换                   | tabs（segmented）                                                | 高         | 无                 |
| 月历日期网格               | calendar renderer（月视图）+ grid                                | 中高       | G-C（月/周多视图） |
| 槽位列表（三态按钮组）     | option-row 式按钮组 + grid 两列                                  | 中高       | **G-F**            |
| 日期格 hover/选中/禁用三态 | G-F 状态表达 / G-F2 className 表达式                             | 中高       | G-F、G-F2          |
| 时区选择器                 | input-select + Combobox 搜索                                     | 中高       | 无                 |
| 12h/24h                    | switch                                                           | 高         | 无                 |
| 确认表单（含自定义问题）   | form 族（input-text/email/phone/textarea/radio/checkbox/select） | 高         | 无                 |
| 嘉宾增删行                 | form 重复字段组                                                  | 中         | 无                 |
| 分步流程与回退             | steps/wizard（form-wizard 先例 ⚡）                              | 中高       | 无                 |
| 移动端槽位 sheet           | dialog/drawer                                                    | 高         | 无                 |
| 骨架屏/成功态摘要卡        | Skeleton；card + badge(语义色) + button                          | 高         | 无                 |
| 槽位异步数据               | data-source（slots 端点）+ focus/定时刷新策略                    | 中         | 无                 |
| slot 失效禁用态            | disabled + badge(attention)                                      | 高         | 无                 |

需专项设计（非既有 C2 行）：**双栏"日历+槽位联动"容器**（月历选中 ↔ 槽位列表状态联动、reservation 语义）与**时区换算显示**（datetime 渲染选项）——见 §7。

## 6. 可复刻边界与差异声明

### 6.1 可复刻

4 步流结构、双栏槽位布局、option-row 槽位交互、`--cal-*` 令牌**架构**（分组/语义/双基准派生）、黑白极简风格、交互状态机（slot 失效/pending/reschedule/步骤回退）。

### 6.2 差异声明（令牌/布局与原版偏离点）

- 令牌偏离：品牌黑 `#111827` 语义换名（如 `--cal-brand` → 复刻自有命名）；radius 基准 10px 为 📁 常识档，P3a 落 CSS 时以开源实现核对后可微调；Cal Sans 商业字体 → Inter（或系统栈）+ 替代展示字体，**字形与原版有可见差异**。
- 布局偏离：桌面右栏宽/槽位 2 列网格等像素值为常识档近似；hex 值未经逐值核验（来源 404），以"灰阶结构一致 + 值近似"复刻。
- 交互偏离：slot reservation 续约/overlay 日历属业务层语义，复刻为静态演示 + mock 刷新，不承诺服务端锁。
- 文案与图标：logo/字标/Cal Sans 字体文件/插画/营销文案全部不复制；文案自拟中文等价；图标用 lucide 同风格。

## 7. 转 C2 候选

- **预约槽位联动容器**（月历选中态 ↔ 槽位列表联动 + 时区换算显示）：调研新撞见，C2 未登记；若 P3a 实测"calendar renderer + 表达式联动"可模拟则降级为组合技巧，否则转 C2 候选（P3b 回写时一并处理）。
- **slot 异步刷新策略**（窗口聚焦/定时 refetch）：data-source 现有刷新语义待压测，同上随 P3b 判断。
- **P3b 回写结论（2026-08-29）**：两候选均收口——候选 1 降级组合技巧级（scope 写入 + url 模板物化 + dependsOn 自动刷新完整承载，零新原语，不新增 C2 行）；候选 2 裁定落字（interval 内建接线、聚焦刷新不模拟，C2 回写 ④）。I1–I15 逐条「预测 vs 实测」对照见 §4.1，renderer 级 finding 与素材行（refreshSource scope 桶限定、clipboard 通道候选）经 C2 回写 ④ 登记。

## 8. 调研来源

- 🌐 cal.com/docs（API v2：slots/bookings/reschedule/cancel/bookingFields/calendar-links/attendees 端点）（2026-08-29）
- 🌐 cal.com/docs/llms-full.txt（embed CSS variables 全量 `--cal-*` 表 + radius/spacing 双基准；Booker 用途注释）（2026-08-29）
- 🌐📁 github.com/calcom/cal.diy `packages/features/bookings`（Booker store/framer-features/slot reservation/OverlayCalendar/README 失效态策略）（2026-08-29）
- 🌐 cal.com 首页（时长 tab 15m/30m/45m/1h 实证、时区选择、reschedule 通知卡、cal.com/font）（2026-08-29）
- 📊 web-search（Booker 时区偏移 issue 佐证、embed CSS 变量文档定位）（2026-08-29）
- ❌→替代：`packages/config/tailwind-preset.js`、`apps/web/styles/global.css`、`cal.com/{user}/{event}` 演示页 404 → hex 与像素值降为 📁 仓库常识档并已在 §2/§6 标注（2026-08-29）

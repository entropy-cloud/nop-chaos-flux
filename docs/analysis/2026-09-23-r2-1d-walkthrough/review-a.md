# R2-1d 走查独立复核 — Review A（fresh session）

- **复核人**: 独立复核 agent A（fresh session，先独立取证再比对原发现）
- **日期**: 2026-09-23
- **口径**: `docs/skills/visual-page-quality-inspection-prompt.md`（阶段 3 独立复核：重开页面、重截同态截图、重跑探针，不得只读发现文本后采信）
- **环境**: dev server `http://127.0.0.1:4175`（未重启）；Playwright 1.63.0；探针落 `_tmp/r2-1d-recheck/`（`probe-*.mjs` + `probe*.json`），截图落 `_tmp/visual-inspection-2026-09-23/r2-1d-recheck/<page>/`
- **复核范围**: R2-1d P1 7 条 + P2 抽样 2 条，共 9 条

## 0. 汇总表

| #   | 发现                                 | 页面                 | 原判级 | 独立取证结果                                                                                                              | 结论                            | 备注                                 |
| --- | ------------------------------------ | -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| 1   | A9-02 会话侧栏恒空+新建静默无效      | ai-conversations     | P1     | 全链路复现；根因**重新归因**：action 契约无损，断点在宿主数据→scope 通知缺口                                              | **保留 P1（根因改判）**         | 见 §1；归族建议改挂 scope 响应性缺口 |
| 2   | C1-01 发送钮溢出视口 12px            | ai-widgets           | P1     | senderBottom 812>800、chatH=100vh−57、chatTop=69 全部复现                                                                 | **保留 P1**                     | 数值逐项吻合                         |
| 3   | B1-01 项目汇总条白字对比度不足       | gantt                | P1     | 白字 10px 实测 light **1.03:1**（进度覆盖区≈1.6）、dark **1.88:1**（原卡 3.7 系误算）                                     | **保留 P1（数值修正，更严重）** | 见 §3                                |
| 4   | B1-02 事件块白字对比度不足（双主题） | scheduling-calendar  | P1     | light 2.59/2.13/3.78/4.6，dark 1.83/1.94/3.26/4.93 —— 与原卡逐项吻合                                                      | **保留 P1**                     | —                                    |
| 5   | B5-51 dark 宿主编辑器保持 light 主题 | code-editor          | P1     | 13 个编辑器 `data-theme="light"` 恒定；gutter 恒白；colorize light 调色板 token 对 rgb(2,8,23) 仅 2.04–2.87:1             | **保留 P1**                     | —                                    |
| 6   | A9-01 infinite-scroll 永久 loading   | mobile-components    | P1     | 8 次采样（跨 ~6s+滚动）items 恒 4、loading 恒 true、finished 恒 false，console 零报错                                     | **保留 P1**                     | —                                    |
| 7   | A5-02 tabbar home/grid 图标不渲染    | m3-layout（m5 实例） | P2     | 两页 首页/分类 svg=0，同页 购物车/我的/返回 svg=1；根因补正：**别名乒乓** home→house→'Home'（已删除的 lucide 导出）→ null | **保留 P2（根因细化）**         | 见 §7                                |
| 8   | C1-01 chart 533svg 装 243 容器       | m4-data              | P1     | 375 下 svg=533 且 responsive-container 自身被撑到 533（RO 内容自锁直接实锤）；1280 下 711 正常                            | **保留 P1**                     | —                                    |
| 9   | A8-01 swipe/pull 无单指针替代        | mobile-components    | P2     | 桌面鼠标拖拽位移 0（before=after=21.4）；无任何外部触发钮/刷新钮（refreshButtons=0）；demo 文案自认仅触摸路径             | **保留 P2**                     | WCAG 2.5.7 成立                      |

**总裁决：9 条全部保留，0 驳回，0 降级；其中 #1 根因改判、#3 数值修正、#7 根因细化。**

---

## 1. [R2-1d-A9-02] 会话侧栏恒空+新建静默无效 —— 保留 P1，根因改判（升格证据链）

### 原发现摘录（cards/ai-conversations.md）

侧栏 256px 面板仅“新建会话”钮；完成 ai:send 后仍无会话行；点击新建无 toast、无报错、无行。原卡要求复核时归因 `ai:createConversation` 是否落到 controller，“若为 action 契约缺陷则升 systemic → R2-3”。

### 独立取证（fresh 重开 + 五步递进探针，`_tmp/r2-1d-recheck/probe1*.json`）

1. **复现**：默认态侧栏 `items:0`（仅新建钮）；点击新建 1.5s 后 `items:0`、面板文本仍为“新建会话”；全程 console **零**消息（含 warning）。
2. **对照**：外部 ai:send 正常（mock 回声消息渲染），证明 `ai` 命名空间可达、engine 可用。
3. **事件与 props 链**：fiber 读侧栏渲染器 `events` = `{onItemClick, onCreate, onItemDelete, onItemRename}` 全部在位；ai-chat 解析后的 `conversationController` 是含 4 个方法的**真实控制器对象**（`createConversation: function`）。
4. **决定性**（probe-1e/1f）：从 `AiConversationsDemoPage` fiber 的 hook 链直读 `useConversation` 的 useState——点击新建后 `conversations` **0→1**、`engineCache` Map **0→1**：**controller 被调用且 live 实例状态真实更新**（fiber memoizedState 仅在 render 提交时更新，证明宿主组件确已重渲染）。
5. **断点定位**（probe-1i）：scope 父链快照 —— 页面级 scope（`$page`，id `page-root-validation`）`setSnapshot` 生效（rev 2→3，`conversations:[1项]`、`activeConversationId: "conv-…"`）；但 ai-conversations 节点自身 scope（`$page.imports.imports.imports`）store rev **恒 0**。`NodeRendererResolved` 只订阅 `props.scope.store`（`packages/flux-react/src/node-renderer-resolved.tsx` L101–115）；该 plain store 收不到页面根的 `setSnapshot(['*'], replace)` 通知，`scopeChangeHitsDependencies` 对 `['*']` 本应恒命中（`flux-runtime/src/scope-change.ts` L152-155）——即**通知根本没到达订阅的 store**，解析 props 冻结在挂载值。

### 结论：**保留 P1**，根因改判

- `ai:createConversation` action 契约**没有缺陷**：dispatch → 命名空间解析 → provider → controller → React state → 宿主重渲染 → 页面 scope store 替换，全链路完好。**不按原卡预设升格 action 契约为 systemic。**
- 真正的 systemic 缺陷是**宿主数据→scope 响应性缺口**：`SchemaRenderer` 的 `data` prop 变更走 `page.scope.store.setSnapshot(kind:'replace')`（`flux-react/src/schema-renderer.tsx` L216-241），但通知不向 plain 派生 scope store 传播，凡以 `props.scope.store` 订阅的节点（其 scope 为 imports/node 级 plain store）解析值永久冻结。任何“宿主 React 状态绑定进 schema”的用法（不止本页）都复现。**建议归族：R2-3 系统性批（scope 通知传播），归属 flux-runtime/flux-react，替代原卡的 action 契约升格预案。**
- 空侧栏无空态提示（E6）部分照旧成立：`ai-conversations.tsx` 对空数组只渲染按钮。
- 截图：`_tmp/visual-inspection-2026-09-23/r2-1d-recheck/ai-conversations/recheck-{default,after-create,external-send-completed}-light.png`

---

## 2. [R2-1d-C1-01] chat 容器高度魔数漏 16px，发送钮被裁 —— 保留 P1

### 原发现摘录

`#/ai-widgets` schema `h-[calc(100vh-57px)]`，headerH=53、chatTop=69、chatH=743、senderBottom=812>800；魔数 57 未含 page-body 16px。

### 独立取证（probe-2，双主题 × 双视口）

1280×800：`headerH=53`、`chatTop=69`、`chatH=743`（class `h-[calc(100vh-57px)]`、computed 743px）、`senderBottom=812>800`、“发送”钮 rect 784–812（28px 高，下半在视口外）。light/dark 同值。800×900：senderBottom 912>900，同构。数值与原卡逐项一致。

### 结论：**保留 P1**。修复方向照旧（`calc(100vh-69px)` 或 flex min-h-0 消魔数）。

- 截图：`…/r2-1d-recheck/ai-widgets/recheck-default-1280-light.png`

---

## 3. [R2-1d-B1-01] 项目汇总条标签白字对比度不足 —— 保留 P1（数值修正）

### 原发现摘录

`.nop-gantt-bar-project` 浅蓝底+白 10px 标签，light ≈1.6:1、dark ≈3.7:1，均低于 4.5:1。

### 独立取证（probe-3b，逐层合成实测）

- 标签元素 `.nop-gantt-bar-text`（`absolute left-1 top-0 text-[10px]`），`color: rgb(255,255,255)`、10px/400，两主题同。
- **light**：标签落位（left 4px）在进度覆盖层之外，合成底 = rgb(250,252,255)，对比度 **1.03:1**（原卡 1.6 系按进度覆盖区均化；标签实际 worst-case 更差；进度覆盖区按 30% primary 叠加复算 ≈1.6 与原卡一致）。
- **dark**：合成底 rgb(185,189,197)，对比度 **1.88:1** —— 原卡的 dark ≈3.7 系误算（对白字 1.88 才是实算值），实际比原卡更严重。
- 两主题均远低于 4.5:1（10px 小字）。截图目检与数值一致（条上白字不可辨）。

### 结论：**保留 P1**；判级不变、证据增强。修复方向不变（按条底亮度切字色/加深 fill + 字号 ≥11px）。

- 截图：`…/r2-1d-recheck/gantt/recheck2-bars-{light,dark}-1280.png`

---

## 4. [R2-1d-B1-02] 事件块白字 12px 在 success/warning 底上不足 —— 保留 P1

### 原发现摘录

light shift 2.59 / maintenance 2.13 / leave 3.78 / appointment 4.6；dark shift 1.83 / maintenance 1.94 / appointment 3.26 / leave 4.93。

### 独立取证（probe-3，getComputedStyle + WCAG 实算）

light：shift `rgb(16,183,127)` 白字 **2.59**；maintenance `rgb(245,159,10)` **2.13**；leave `rgb(239,67,67)` **3.78**；appointment `rgb(28,110,242)` **4.60**。dark：shift `rgb(38,217,157)` **1.83**；maintenance `rgb(237,175,69)` **1.94**；appointment `rgb(77,141,245)` **3.26**；leave `rgb(217,38,38)` **4.93**。与原卡**逐项一致**，12px 白字，四类型三处两主题不达 4.5:1。

### 结论：**保留 P1**。

- 截图：`…/r2-1d-recheck/scheduling-calendar/recheck-default-{light,dark}-1280.png`

---

## 5. [R2-1d-B5-51] dark 宿主下编辑器保持 light 主题 —— 保留 P1

### 原发现摘录

dark 下 `data-theme="light"` 不变、gutter 恒 `rgb(245,245,245)`、activeLineGutter 恒 `rgb(226,242,255)`；colorize `data-colorize-theme="light"`，light 调色板压 rgb(2,8,23) 底 ≈1.3–2:1。

### 独立取证（probe-5/5b）

- dark 宿主下全页 **13 个** `.nop-code-editor` 的 `data-theme` 全部恒 `"light"`；有 gutter 的编辑器 gutter bg 全部 `rgb(245,245,245)`、activeLineGutter `rgb(226,242,255)`（白条压暗底）。
- colorize 块 `data-colorize-theme="light"`；实际绘制面合成 = **rgb(2,8,23)**（与原卡一致）；light 调色板 token 实测对比度：keyword 蓝 `#00f` **2.33**、keyword 紫 `rgb(119,0,136)` **2.04**、string 绿 `rgb(17,102,68)` **2.87** —— 12px 级别需 4.5:1，全部不达（原卡 1.3–2:1 的量级判断成立，实算 2.0–2.9）。
- 反例参照：页面内 `editorTheme:'dark'` 的 Colorized JSON 块正确输出 One Dark 调色板（`rgb(224,108,117)` 等）——证明应有效果已在同一页面存在。

### 结论：**保留 P1**（dark 下 colorize 代码不可读 + 行号槽恒白）。

- 截图：`…/r2-1d-recheck/code-editor/recheck-default-dark-1280.png`、`recheck-colorize-dark-mid.png`

---

## 6. [R2-1d-A9-01] infinite-scroll 永久 loading —— 保留 P1

### 原发现摘录

挂载即「加载中...」，滚动多次后 items 恒 4、finished 永不出现；宿主 setLoading(true) 生效而 400ms 回调的 setItems/setLoading(false) 从未呈现。

### 独立取证（probe-6，375×812）

8 个采样点（每个采样后 scroll 至页底，跨 ~6s）：`items恒4、loading恒true、finished恒false`；console 零错误零警告。「加载中...」与 4 条「条目 N」并存同帧截图确认。行为与原卡探针 A/B 的结论完全一致（DOM 稳定、无 remount、无 reject/throw，宿主回调效果未呈现）。

### 结论：**保留 P1**。归族照旧：mobile-components demo × 渲染器 guard 集成，先最小宿主复现定位，若坐实渲染器 guard 缺陷升 R2-3。

- 截图：`…/r2-1d-recheck/mobile-components/recheck-infscroll-375-light.png`

---

## 7. [R2-1d-A5-02] tabbar home/grid 图标不渲染 —— 保留 P2（根因细化）

### 原发现摘录

m3/m5 tabbar 首页/分类按钮 svg=0 退化为纯文字，同页 navbar/ActionBar 图标正常；归因 `resolveLucideIconStrict` 返回 null 无 fallback，`home`→alias `house`、`grid` 当前 lucide 集解析失败。

### 独立取证（probe-7 + 源码走读）

- m3（375）：首页/分类两钮 svg=**0**（64×56）；同页 navbar 返回钮 svg=1（对照正常）。m5（1280）：首页/分类 svg=0，购物车/我的 svg=1 —— 同构复现。两页 console 均零告警（静默丢弃）。
- 根因细化（`packages/ui/src/lib/icon-utils.ts`）：bare `'home'`（非 ant-design 前缀）经 `normalizeIconName` 命中 `ANT_DESIGN_LUCIDE_MAP.home → 'house'`（L118），随后 `ICON_ALIAS_MAP.house → 'home'`（L7）——**两张别名表乒乓，终点回到已从 lucide-react 导出集删除的 `Home`**，`toLucideKey('home')='Home'` 在 icons 表查不到 → strict 返回 null。`'grid'` 无任何别名，`'Grid'` 同样不在当前导出集（lucide 已改名 Grid3x3/LayoutGrid）→ null。strict 路径无 fallback、无 DEV 告警（L294–306）。原卡的修复方向二选一仍有效，但需补一条：**别名表合并去环**（home/house 往返映射使两条别名路径互相抵消）。

### 结论：**保留 P2**（schema 声明被静默丢弃、跨页同根因，m3/m5 双实例）。

- 截图：`…/r2-1d-recheck/m3-layout/recheck-tabbar-375-light.png`、`…/m5-showcase/recheck-tabbar-1280-light.png`

---

## 8. [R2-1d-C1-01] M4c chart 窄视口宽度不收缩 —— 保留 P1

### 原发现摘录

375 下 chartW=243、scrollWidth=533、svg width=533；ResizeObserver 观察 `chart-canvas`（width:100% 被内部 svg 撑开）形成内容自锁。

### 独立取证（probe-8，双视口）

375×812：`svgW=533`（width attr 533）、`recharts-wrapper=533`、**`.recharts-responsive-container` 自身即 533** —— 容器被内容撑开而非约束内容，RO 自锁直接实锤（父级裁切后 widget 可视宽 ≈243，svg 533 装不进）。1280×800：svg=711 与容器一致、无溢出。与原卡数值同量级同构（视口差 1px 级采样位差不影响结论）。

### 结论：**保留 P1**（移动视口下约一半数据与图例不可读、无滚动补救）。修复方向照旧（观察不受内容影响的外层 wrapper + min-width:0 + 图例 wrap + 回归断言）。

- 截图：`…/r2-1d-recheck/m4-data/recheck-chart-375-light.png`

---

## 9. [R2-1d-A8-01] swipe-cell / pull-refresh 无单指针替代 —— 保留 P2

### 原发现摘录

删除/归档唯一暴露路径是水平滑动手势、刷新唯一路径是下拉；demo 文案明示桌面端需 DevTools 设备模拟；违反 WCAG 2.5.7。

### 独立取证（probe-9，375×812）

- DOM 扫描：4 个 swipe-cell 的归档/删除钮存在于 DOM（x=21 / x=306，视觉锁定在滑出位、初始不可见达）；**单元格外无任何触发同一动作的按钮/长按菜单/键盘等价物**；全页刷新按钮 `refreshButtons: 0`；demo 文案原文「触摸设备上拖拽触发交互；桌面端可在 Chrome DevTools 设备模拟器内验证」在页。
- 桌面鼠标路径：对 swipe-cell 中心执行 mouse down → 水平拖 96px → up，归档钮 x **before=after=21.4、moved=false** —— 鼠标拖拽完全不响应。
- WCAG 2.5.7（拖拽功能须有单指针替代途径）违反成立；影响面与修复方向照旧（fallback 触发器/显式刷新位/Pointer Events）。

### 结论：**保留 P2**。

- 截图：`…/r2-1d-recheck/mobile-components/recheck-swipecell-after-mousedrag-375-light.png`

---

## 复核方法附注

- 每条均为 fresh 重开页面（新 browser context）+ 独立探针先行，再与原卡比对；未采信原卡数值。
- 对比度一律 `getComputedStyle` 取 computed 值 + 多层背景自外向内合成后按 WCAG 相对亮度实算（叠层透明度、`color(srgb …)`/`oklch` 均解析）；gantt 原卡 dark 3.7 系实算纠错点。
- #1 的根因归因使用了 fiber hook-state 直读与 scope-store 修订号观测（`_tmp/r2-1d-recheck/probe1e/probe1f/probe1i-*.json`），证据可重跑。
- 本复核未修改任何产品代码；除本文件与 `_tmp/` 外无其他写入。

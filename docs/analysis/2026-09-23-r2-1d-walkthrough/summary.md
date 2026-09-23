# R2-1d 表单/AI/移动端与其余 demo 面走查汇总（summary）

> Date: 2026-09-23 ｜ Owner plan: `docs/plans/495-visual-quality-r2-1d-forms-ai-mobile-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` ｜ 截图: `_tmp/visual-inspection-2026-09-23/r2-1d/`
> 产物: cards/×58 ｜ review-a.md + review-b.md + review-c.md（独立复核）｜ 深挖并入复核轮

## 1. 评分卡（58 页，按波分组；总评口径 pass=无 P0–P2 / warn=仅 P3 / fail=有 P0–P2）

**wave1 AI 前半（7）**：ai-chat fail（P2）｜ ai-attachments fail（P2）｜ ai-citations fail（P2）｜ ai-component-handle **pass** ｜ ai-conversations fail（P1）｜ ai-coverage 有风险 ｜ ai-hitl **pass**
**wave2 AI 后半（7）**：ai-linkage fail（P2）｜ ai-p4 **pass** ｜ ai-persistence **pass** ｜ ai-rich-text 有风险 ｜ ai-tools **pass** ｜ ai-virtual-scroll **pass** ｜ ai-widgets fail（P1）
**wave3 移动端（7）**：m1-responsive fail（P2）｜ m2-touch fail（P2）｜ m3-layout fail（P2）｜ m4-data fail（P1）｜ m5-showcase fail（P2）｜ mobile-infrastructure fail（P2）｜ mobile-components fail（P1）
**wave4 scheduling（8）**：gantt fail（P1）｜ gantt-states fail（P2）｜ kanban fail（P1）｜ scheduling-calendar fail（P1）｜ barcode-input fail（P2）｜ gantt-perf-scale 有风险（P3 fixture）｜ kanban-perf-scale **pass**（族引用无本页锚）｜ calendar-perf-scale **pass**（族引用无本页锚）
**wave5 表单/编辑器（8）**：code-editor fail（P1）｜ condition-builder fail（P2）｜ condition-builder-formula 有风险 ｜ input-suggest fail（P2）｜ form-input-enhancements 有风险 ｜ boolean-control-value-contract **pass** ｜ tree-display-ux **pass** ｜ w3d-advanced-input-family fail（P2）
**wave6 w 系前半（6）**：w1a-content fail（P2）｜ w1b-content 有风险 ｜ w2a-data-composition 有风险 ｜ w2b-date-family fail（P1）｜ w3a-w3b-layout-action-family 有风险 ｜ w3c-value-mapping fail（P2）
**wave7 w 系后半（5）**：w4a-multimedia fail（P2）｜ w4b-process-display 有风险 ｜ w4c-composite-form-family 有风险 ｜ text-icon-visual-fields 有风险 ｜ layout-family-enhancements fail（P1）
**wave8 杂项（10）**：flux-basic fail（P1×3）｜ home **pass** ｜ lab-index **pass** ｜ complex-pages-index 有风险 ｜ diff-view fail（P1×2）｜ diff-perf-scale 有风险 ｜ event-prevention fail（P2）｜ component-handles fail（P2）｜ leafer-examples 有风险 ｜ env-stream 有风险

分布：**fail 31 ｜ 有风险 15 ｜ pass 12**（口径 = 页卡内含正式 P1/P2 锚 → fail；仅 P3 锚/未锚观察 → 有风险；无正式锚 → pass；2026-09-23 closure audit 簿记轮按此口径逐页重算修正，首轮分布行 16/33/9 系三套口径混用作废）。

## 2. 发现台账

严格口径 **98 条正式条目**（按卡内 `### [R2-1d-*]` 锚定；另有 1 处 ai-widgets 跨页族引用锚指向 ai-linkage 主条目，不另计）：**P1 ×15 ｜ P2 ×32 ｜ P3 ×51**（无 P0）。归族：systemic 37 ｜ local 51 ｜ watch 10（systemic 含 flux-basic A-41 终裁升格：AMIS `validate.api` 静默忽略归通用层；watch 登记详见 §4.9）。

## 3. 独立复核（三路 fresh agent，共 19 条判定）

- review-a（AI/移动端/scheduling）：**9/9 保留**，3 条根因修正——①ai-conversations A9-02 **根因改判**：非 action 契约缺陷，真断点是 `NodeRendererResolved` 只订阅节点自身 scope store（rev 恒 0），根 `setSnapshot(replace)` 不向派生 scope 传播 → 归 **scope 响应性缺口（flux-react/flux-runtime）**；②gantt B1-01 数值修正更严重：light **1.03:1**（原 1.6 系标签落位口径）；③m3-layout 图标丢失根因细化：ICON_ALIAS_MAP `home→house→home` **乒乓回环**落在已删除导出。
- review-b（w 系/杂项）：**8/8 保留**，根因下探——flux-basic A-40 = form submit 契约拒绝 payload（`component<form>:submit does not accept a payload`，fetcher 零请求证伪原假设）；A-41 = lowering 只支持 `validate.action`，AMIS 风格 `validate.api` 被静默忽略（**通用层缺陷，升 R2-3**）；A-47/A-51 同根因 = `node-renderer-resolved.tsx` 静态 props 订阅旁路（**新 systemic 族候选**）。
- review-c（补 2 条 P1）：kanban B5-01 保留（bg-white 1.19:1，源码 L141 坐实）；w2b A7-27 保留（死月 35/35 全禁用，源码 date-field-control.tsx:270 `defaultMonth` 不夹逼坐实；细节修正 35/35 口径与载体字段）。
- **P1 覆盖 15/15 全部独立复核**（review-a 7 + review-b 6 + review-c 2）；P2 抽样 4 条；合计 19 判定 = 19/19 保留。

## 4. 族归并（与 R2-1a/b/c 已裁定族去重合并）

1. **【新 systemic 族候选①】schema 动态响应性缺口**：ai-conversations 侧栏冻结（scope 传播断）+ diff-view 四控件死 + event-prevention 标签滞留（node-renderer-resolved 静态订阅旁路）——同根因面（schema/数据变更后解析 props 不更新），P1×2+P2×2 → R2-3 字母批候选（flux-react/flux-runtime 层）。
2. **【新 systemic 族候选②】表单契约 AMIS 兼容缺口**：flux-basic submit payload 被拒（P1）+ `validate.api` 静默忽略（P1）——lowering/契约层对 AMIS 风格写法的静默降级 → R2-3 候选。
3. **【既有族扩面】dark 平价族（R2-4）大幅增重**：直接 P1×4——demo 载体 `bg-white` 头部 8 页同款（kanban B5-01 P1 领衔，其余页 P2/P3 实例）+ code-editor 编辑器 dark 不同步（B5-51）+ diff-view light-only CSS 整页不可读（B-48）+ flux-basic 白卡 1.05:1（B-42）；另 P2×2 令牌级根因（`--primary` dark 过亮 7/7 AI 页、`.nop-theme-root` 钉死 color-scheme:light 原生控件不随 dark）+ w1a json-view 硬编码等实例；对比度族 P1×2（gantt/calendar）dark 同样不达，并入族证据。
4. **【既有族扩面】对比度族**：gantt 汇总条 1.03:1（P1）、calendar 事件字 2.13:1（P1）、w3c Badge 软变体全档不足（P2，light 更重）、dark primary 3.26:1（P2，7/7 AI 页命中——与 R2-1c data-verify 同值，--primary dark 过亮令牌根因并入 R2-4）。
5. **【既有族扩面】窄视口/壳层（R2-3c 候选）**：component-handles 800 溢出 324px（族最重实例）、m5 375 横滚、ai-widgets 发送钮溢出（高度魔数）、w2a 分页溢出。
6. **【新 systemic 族候选③】图标别名解析乒乓回环**（m3/m5 tabbar 图标静默丢失，P2）→ 并入 R2-3 候选（icon 契约一处修复）。
7. **【既有族扩面】A3 小目标**：stepper 24×16、citation 8.7px、chevron 20×20 等（P2×1+P3 多实例）；**A8 手势替代缺失**（swipe/pull 无替代，P2）→ 移动渲染器契约候选。
8. **local 散项**：bounded 死月（P1）、infinite-scroll 卡死（P1）、page aside 不并排（P1）、suggestTemplate 失效（P2）、barcode 静默降级（P2）、condition-builder 拖拽无反馈/弹层无出口（P2×2）等 → R2-4 输入。
9. watch-only 10 条全部登记 `watch-pool.md`：7 正式行（A5-01、R2-1d-A3-01/02 族行并 gantt+m1/m4 三实例、A9-51、C3-01、C-50、E4-30、E2-30）+ F4-01 挂 R2-1b-F4-03 族行实例注记；簿记轮曾误登的 C-56/B-58（卡面判 local）已剔除归位。

## 5. 健康面

AI 渲染核心链路（流式/工具循环/虚拟滚动/持久化/HITL 双路径/分支联动）程序化验证全过；移动四件套（safe-area/hairline/haptic/z 栈）与 pull-refresh/swipe-cell/countdown 状态机全通；kanban 20 列×6000 卡零漂移；diff 14k 行行高一致；表单页长按步进/clamp/边界禁用全过；w3 系 D1 全栅格（9 间隙 24px）；W3c 语义色方向正确（软变体非裸蓝）。

## 6. Quick Wins

1. `--primary` dark 过亮 + `--secondary` dark 对（theme-tokens 两处，收跨批 ≥13 页对比度）。
2. demo 载体 `bg-white` 头部模板修复（一处模板收 8+ 页）。
3. 调试 chip（z9998）收起/降 z（跨批 ≥12 页遮挡）。
4. i18n locale 注入 + 图标别名去环（各一处）。
5. `h-[calc(100vh-57px)]` 类魔数 grep 修正（+16px page-body）。

## 7. 最大影响修复 Top 3

1. **schema 动态响应性缺口（新族①）**——AI 侧栏与动态 schema 页核心交互 P1×2，根因已定位到订阅层。
2. **dark 平价族（R2-4，本批直接 P1×4 + 令牌级 P2×2 增重）**——载体模板 + 编辑器主题同步 + 令牌对三处修复收 ≥20 页。
3. **表单契约 AMIS 兼容（新族②）**——submit/validate 静默降级，参照页（flux-basic）失格的直接原因。

# R2-2b 控件族走查批二汇总（summary）

> Date: 2026-09-24 ｜ Owner plan: `docs/plans/497-visual-quality-r2-2b-data-content-layout-mobile-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` ｜ 截图: `_tmp/visual-inspection-2026-09-24/r2-2b/`（不入库，dark 全部真 data-mode 自采）
> 产物: cards/×46 ｜ review-a.md + review-b.md（独立复核）｜ interactions.mjs 扩面 35 键（注册表共 95）｜ 深挖并入复核轮

## 1. 评分卡（46 控件，按波分组；总评口径 pass=无 P0–P2 / warn=仅 P3 / fail=有 P0–P2；被复核驳回的锚不计入该卡锚集）

**wave1 content 前半（10）**：alert fail（P2 E4-1）｜ audio 有风险 ｜ card 有风险 ｜ cards **pass** ｜ carousel 有风险 ｜ diff-view **pass**（3 族引用无本卡锚）｜ empty **pass** ｜ html **pass** ｜ image 有风险 ｜ json-view **pass**（2 族引用无本卡锚）
**wave2 content 后半（10）**：link fail（P1 A1-41）｜ mapping 有风险 ｜ markdown fail（P1 C1-45、P2 E2-46）｜ progress 有风险 ｜ qrcode 有风险 ｜ result 有风险 ｜ separator **pass** ｜ spinner **pass** ｜ status fail（P2 B1-51）｜ video 有风险
**wave3 data 前半（7）**：batch-bar 有风险 ｜ chart fail（P2 B5-89）｜ crud fail（P2 A9-94）｜ data-source 有风险 ｜ echarts 有风险 ｜ list 有风险（F5-87 复核降级 P2→P3）｜ pagination 有风险
**wave4 data 后半（6）**：query-filter fail（P2 A9-121）｜ sparkline 有风险 ｜ stat-tile fail（P2 B1-125）｜ statistics **pass** ｜ table fail（P2 A9-126）｜ tree **pass**
**wave5 layout（8）**：button-group 有风险 ｜ collapse 有风险 ｜ dropdown-button fail（P2 A7-155）｜ grid **pass** ｜ responsive **pass** ｜ steps **pass**（A1-156 复核驳回，无剩余锚）｜ timeline fail（P2 E4-157）｜ wizard fail（P2 B1-158）
**wave6 mobile（5）**：countdown 有风险 ｜ infinite-scroll 有风险 ｜ notice-bar **pass** ｜ pull-refresh **pass** ｜ swipe-cell **pass**

分布：**fail 12 ｜ 有风险 19 ｜ pass 15**（`_tmp/r2-2a-probes/compute-batch.cjs` 同源复算 + 驳回锚剔除口径；unique 48、P1×2/P2×11（F5-87 复核降级后）/P3×35 与本表一致）。

## 2. 发现台账

严格口径 **48 条正式条目**（唯一 id）：**P0 ×0 ｜ P1 ×2 ｜ P2 ×11 ｜ P3 ×35**（含复核降级 F5-87、驳回 A1-156 各 1 条，判级按复核后口径计）。归族：**systemic 17 ｜ local 11 ｜ watch-only 20**。watch-only 20 条全部登记 `docs/audits/visual-quality-r2/watch-pool.md`（2026-09-24 追加行，grep 计数回读验证）。

## 3. 独立复核（两路 fresh agent，共 24 判定）

- review-a（content 域，P1×2 + P2×3 全查 + P3 抽样×4）：**9/9 保留，0 降级 0 驳回**；证据锐化 5 处——link A1-41 坐实 `.nop-link` 全量级联 0 规则（对照 `.nop-markdown a` 有主色）；markdown C1-45 补 table rect 19px 证据；status B1-51 数值修正（light 2.13/dark 6.45 过，原卡 dark 底采样错位）；alert E4-1 收口点坐实 alert-renderer.tsx L101（actions colStart=auto）。
- review-b（data/layout/mobile 域，P2×9 全查 + P3 抽样×5 + tree watch）：**12 保留 / 1 降级（F5-87 P2→P3，design.md L56 文档化裁定）/ 1 驳回（A1-156，真实热区 steps-indicator Button 经 nop-haptic 有 pointer）**；根因/量化实质修正 7 处——B5-89（ui/chart.tsx 主题化选择器与 recharts 3.8.1 DOM 空匹配；"网格不可见"证伪）、A9-94（提交控件真条件 = `schema.id ?? schema.name`；Enter 死因 = queryForm region 不声明 submitAction）、A9-121（收敛为嵌入 form 子树影子 scope，顶层 form 对照通过）、A9-126（`--table-striped-bg: transparent` 占位值一行修复）、B1-158（dark 双数据方向反转：内联 7.49 过/摘要 3.78 败）、A7-155（悬挂 ≥2000ms + 定时器差分）、F4-90（label 绑 recharts `name=` 非无消费）。
- 覆盖：P1 2/2 全复核；P2 11/11 全查（降级前 12/12）；合计 24 判定（地板 ≥1/3 即 ≥4）。
- 方法学再沉淀：Playwright 1.63 闭包陷阱三度复现（evaluate 引 node 侧常量即 ReferenceError）；oklab 底 DOM 合成对比度假值 1.05–1.91 区间多发，像素采样为唯一可靠口径。

## 4. 族归并（与 R2-1a–d/R2-2a 已裁定族去重合并）

1. **【既有族扩面·持续增重】dark 平价/对比度族（R2-4）**：本批新增 P2×3（stat-tile B1-125 语义色直作 12px 文本色四象限三败、status B1-51、wizard B1-158 两红不同源）+ P3×2（video B1-52、button-group B6-151）+ 图表专项实例（chart B5-89 recharts 主题化空匹配，review-b 建议独立为 ui/chart.tsx 修复单）+ ai-prompts description ≈1.05:1（族最重档新实例）+ swipe-cell dark 钮边界 ~1.1–1.2:1 实例——与 R2-1a（≈14 页 P1×3）、R2-1d（P1×4）、R2-2a（P1×2+P2×4）合流。
2. **【既有族合流·显著增重】schema 声明静默失效无诊断族（R2-3 候选，沿表单 AMIS 契约缺口族）**：本批新增至少 6 例异型断点——契约键丢弃（sparkline `label` E6-123，家族第 6 例；batch-bar `clearLabel` 无 clearTarget A9-81）、死配置（list `showSizeChanger`）、渲染面条件依赖（crud A9-94 提交控件暗依赖 id/name + Enter 未接线）、作用域解析（query-filter A9-121 影子 scope）、令牌占位（table A9-126 `--table-striped-bg: transparent`）。review-b 结论：同族异型断点（契约键/渲染面/作用域/令牌兑现），收口建议 = schema 诊断层（未知键/未生效声明/写后不可达 warning）+ 各断点单修。
3. **【既有族扩面】弹层 actions 左对齐族（R2-3b）**：dropdown-button 菜单 footer 实例 + wizard dialog 实例（引用不另立）。
4. **【新 systemic 组】渲染器样式/布局矩阵缺口（content 基础呈现 + alert，5 条 systemic）**：link A1-41（`.nop-link` 零 CSS 消费，裸文本链接）+ markdown C1-45/E2-46（元素矩阵无 table/list marker，GFM 表格塌缩 P1）+ markdown B6-47（无层叠层 color 规则覆盖 `text-destructive`）+ alert E4-1（actions 行错位进 icon 网格列，收口点 alert-renderer.tsx L101 colStart）——修复面集中：form-renderers.css 元素矩阵补齐 + `.nop-link` 一条规则 + alert 列约束。
5. **【既有族扩面】lab 载体与环境基建族**：data-source C1-85（scope-debug 溢出极值 overX≈19009px，C1-63/C1-81 族）、crud A5-96/data-source A5-86（异步错误无呈现面，同根因）、sparkline 场景 slug 空串 testid 重复、notify no-op 新实例（echarts 场景 3、chart）。i18n 实例 F4-84（pagination chrome 中文 aria）卡面归族 systemic、按 i18n 族实例消费。
6. **【既有 watch 族引用不另立】**：i18n zh-CN 回退（本批大面积实例：上一页/下一页/共 60 条/加载失败/无来源/轮播图/复制/全部/新增等）、数值列左对齐（无升级）、A3 小目标（collapse/无升级）、G7 双向同步（grid/responsive 断点 MutationObserver 坐实正向）、窄视口族（collapse C1-153 800 溢出 12px 实例）。
7. **【R2-1d watch 先例现状复检】**：infinite-scroll 永久 loading（R2-1d-A9-01 P1）**仍复现**、pull/swipe A8 无替代（R2-1d-A8-01 P2）**仍复现**——原条目维持；R2-1b-G6-01（word redo 滞后）经 wave5 复检**已修复**（建议原条目 closure 复核销项）。

## 5. R2-4 首批族终裁输入刷新（Decision：合并 R2-1a/R2-2a/R2-2b 台账重排）

> 本节刷新 plan 496 summary §5 清单；终裁在 R2-4 plan 立项时登记进台账。

1. **dark 主题平价/对比度族（维持建议终裁为 R2-4 首批）**：R2-1a ≈14 页（P1×3）＋ R2-1d（P1×4）＋ R2-2a（P1×2 + P2×4）＋ R2-2b（P2×3 + P3×2 + 图表专项 + 集群实例）——跨批合计 **≈50 页/控件面、P1×9、P2 计 14+**；修复面 = theme-tokens 令牌包（`--secondary-foreground`、`--primary` dark、`--destructive`、`--popover` dark 块、`--table-striped-bg`）+ 宿主主题层 + ui/chart.tsx 主题化选择器单修。
2. **校验呈现三不一致族（R2-1a local 输入，第二位，不变）**。
3. **表格 sticky 操作列透明底（R2-1a local 输入，第三位；本批 crud 800 视口 + table 潜伏态两新实例）**。
4. **R2-2b 本批 local 散项（11 条，与卡面 local 归族集合一一对应）**：carousel C1-4 箭头越界、chart F1-91 图例顺序相反、collapse A1-152 零动画 + A2-154 800 溢出、countdown A9-181 结束态零差分、dropdown-button A7-155 hover 菜单悬挂、list A2-88 focus ring 裁切、steps A1-156（已复核驳回，保留台账记录）、timeline E4-157 alternate 几何断裂、video B1-52 错误字对比度、wizard E2-159 nav 现态强调弱于完成态。（link A1-41 / markdown C1-45、E2-46 / alert E4-1 归 systemic，见 §4.4 与 §4.2 旁注）
5. **R2-3 候选族排序更新（供 R2-3 字母批引用）**：①弹层 actions 左对齐（R2-3b 首批，不变）；②schema 声明静默失效无诊断族（本批 +6 例后累计 ≥9 例，建议升为 R2-3 第二字母批主修复面——诊断层 + 四类断点单修）；③窄视口 flex/固定壳层（R2-3c 候选，不变）；④lab 载体与环境基建族（R2-2a 新登记，本批 +4 实例）；⑤图标别名回环（无新实例）。

## 6. 健康面（复核确认的正向基线）

separator/grid/responsive/notice-bar/pull-refresh/swipe-cell/tree/statistics/cards/diff-view/empty/html/json-view 14 控件零正式发现全过；plan490 D6 块距锚点在 pagination/table/crud 三载体实测 12px 全中；crud FULL 矩阵 H1/H3/H5/H8 全过；echarts 16 canvas DPR 几何全达标、dark 自动重主题成立；pull-refresh 状态机五态全链路（pulling→loosing→loading→success→normal）+ payload 解析正确；swipe-cell 手势链路/inert 门控/action 契约全过；grid 767/768 与 responsive 1023/1024 断点不变量 MutationObserver 坐实；table 排序 aria-sort/筛选/展开行/lazy retry/quick-edit echo 全链路程序化通过；tree 搜索过滤+mark 高亮+清除恢复全过。

## 7. Quick Wins（<30min）

1. `--table-striped-bg` 占位值一行修复（theme-tokens L98，收 table 斑马纹）。
2. ui/chart.tsx 主题化选择器适配 recharts 3.8.1 DOM（一处收全部 recharts 图表 dark 轴/网格）。
3. markdown 元素矩阵补 table/td/th/list marker 规则（form-renderers.css 一段，收 P1×2）。
4. link `.nop-link` 一条视觉规则（hover 主色+下划线，收 P1）。
5. stat-tile 语义色 12px 文本改 tone/加 `text-xs font-medium` 前景适配（与 badge `--secondary-foreground` 同批令牌修）。

## 8. 最大影响修复 Top 3

1. **dark 平价令牌包 + 图表主题化单修（R2-4 首批建议）**——≈50 面、本批 recharts 全图表面 dark 可读性随单修收口。
2. **schema 诊断层（R2-3 第二字母批建议）**——未知键/死配置/占位令牌/影子 scope 四类断点 ≥9 例静默失效一次收口（配 A9-94/A9-121 各一行产品修复）。
3. **content 基础呈现矩阵（markdown/link/alert）**——P1×2 + P2×2 三控件修复面集中，均为用户高频可见面。

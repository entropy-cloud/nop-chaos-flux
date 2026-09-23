# R2-2a 控件族走查批一汇总（summary）

> Date: 2026-09-24 ｜ Owner plan: `docs/plans/496-visual-quality-r2-2a-basic-form-controls-walkthrough-plan.md`
> 口径: `docs/skills/visual-page-quality-inspection-prompt.md` ｜ 截图: `_tmp/visual-inspection-2026-09-23/r2-2a/`（不入库，dark 全部真 data-mode 自采）
> 产物: cards/×59 ｜ review-a.md + review-b.md（独立复核）｜ interactions.mjs 扩面 44 键 ｜ 深挖并入复核轮

## 1. 评分卡（59 控件，按波分组；总评口径 pass=无 P0–P2 / warn=仅 P3 / fail=有 P0–P2）

**wave1 basic 前半（9）**：badge fail（P1 B5-01、P2 B1-02）｜ button fail（P1 A1-03、P1 B5-04、P2 B1-05）｜ command-palette 有风险 ｜ container **pass** ｜ dialog fail（P2 H3-08）｜ drawer 有风险 ｜ dynamic-renderer **pass** ｜ flex 有风险 ｜ fragment **pass**
**wave2 basic 后半（9）**：icon fail（P1 A5-21）｜ keyboard fail（P2 A9-23）｜ loop fail（P2 H5-32 族实例锚，独立取证）｜ page fail（P2 E2-24、P2 B5-34）｜ reaction 有风险 ｜ recurse 有风险 ｜ scope-debug fail（P2 E5-29）｜ tabs fail（P2 H5-32、P2 F4-33）｜ text fail（P2 C1-36）
**wave3 form 前半（11）**：button-group-select fail（P2 B1-40）｜ checkbox 有风险 ｜ checkbox-group fail（P2 A9-42）｜ date-range 有风险 ｜ fieldset 有风险 ｜ form 有风险 ｜ hidden 有风险 ｜ input-date **pass** ｜ input-datetime **pass** ｜ input-email **pass** ｜ input-month 有风险
**wave4 form 后半（11）**：input-number **pass** ｜ input-password fail（P2 A9-60）｜ input-quarter **pass** ｜ input-text 有风险 ｜ input-time 有风险 ｜ input-year **pass** ｜ markdown-editor 有风险 ｜ radio-group **pass** ｜ select **pass** ｜ switch **pass** ｜ textarea **pass**
**wave5 form-advanced 前半（10）**：array-editor 有风险 ｜ array-field fail（P2 A9-82）｜ combo **pass** ｜ condition-builder 有风险 ｜ detail-field **pass** ｜ detail-view **pass** ｜ editor 有风险 ｜ icon-picker **pass** ｜ input-file 有风险 ｜ input-image 有风险
**wave6 form-advanced 后半（9）**：input-table 有风险 ｜ input-tree **pass** ｜ key-value **pass** ｜ object-field 有风险 ｜ picker fail（P2 F4-102、P2 A3-103）｜ tag-list 有风险 ｜ transfer **pass** ｜ tree-select **pass** ｜ variant-field **pass**

分布：**fail 15 ｜ 有风险 22 ｜ pass 22**（口径 = 卡内含正式 P1/P2 锚 → fail；仅 P3 锚/未锚观察 → 有风险；无正式锚 → pass。跨页族实例锚按其所指 finding 判级计入该卡总评、不另计 findings 总数（loop H5-32 实例，沿 R2-1d ai-widgets 先例）。分布行由 `_tmp/r2-2a-probes/compute-scorecard.cjs` 同源复算，与卡面 grep 自洽：57 唯一 id、P1×4 卡集与上表一致）。

## 2. 发现台账

严格口径 **57 条正式条目**（唯一 id，H5-32 主条目在 tabs 卡；loop 卡持同 id 同族实例锚，独立取证计入该卡总评、不另计条目数）：**P0 ×0 ｜ P1 ×4 ｜ P2 ×16 ｜ P3 ×37**。归族（57 条卡面归族行）：**systemic 21 ｜ local 15 ｜ watch-only 21**。watch-only 21 条全部登记 `docs/audits/visual-quality-r2/watch-pool.md`（2026-09-24 追加行，grep 计数回读验证）。计数由 `_tmp/r2-2a-probes/compute-scorecard.cjs` 同源复算（去重取带判级节，遍历顺序无关，三连跑可复现）。

## 3. 独立复核（两路 fresh agent，共 27 判定）

- review-a（basic 域 18 卡，P1×4 + P2×10 全查）：**14/14 保留，0 降级 0 驳回**；6 处证据/根因订正 + 1 处状态更新——①badge B5-01 像素复测：dark 四语义 Success 6.36/Warning 6.24 **过**、Danger 3.24 **败**（原卡数值系探针渐变基线伪象），修复面收窄为 `--secondary-foreground`（classic L195-198 + glass L315-318）；②button B1-05：实为红字 on 浅红 tint 3.12:1（原卡 fg/bg 对调、比值巧合相等），根因归一 `--destructive` 过亮；③keyboard A9-23 根因改判：真吞点 = lab env `createDefaultEnv().notify` 硬 no-op（flux-react/src/defaults.ts L26），修复须 notify 覆写 + Toaster 两件套；④icon A5-21 精确化：barrel 导出 Home 在位，缺键在 lucide `icons` 命名空间；⑤tabs H5-32 根因锐化：form-actions 容器缺对齐（与 dialog H5-09 一处修复）；⑥page B5-34 状态更新：runner data-mode 修复已落工作区。
- review-b（form/form-advanced 41 卡，P2×5 全查 + P3 抽样×8）：**13/13 保留，0 降级 0 驳回**；3 处实质改判——①B1-40 补合成 `bg-primary/85` alpha 后**家族方向反转**（dark 4.16–4.18 / light 3.66，双主题均 <4.5 且 light 更差）；②A9-42「渲染器未接线」证伪：契约键为 `minSelected/maxSelected`，fixture 用 `minSelect/maxSelect` 被静默丢弃，真实缺口 = min 数提交面校验 + 未知键零诊断；③A9-60「custom 求值通道缺失」证伪：`validations[]` 容器键全栈 0 消费者，契约等价物 `equalsField` 可用；另 A9-82 根因行级定位（`getChildFieldPathPrefix→false` L584-586）、A9-47 裁定与校验静默族**不同根因**（钳制无反馈 + 原生属性未映射）。
- 覆盖：P1 4/4 全复核；P2 16/16 全查（review-a 10 + review-b 6，含名义列入 P3 抽样组、卡面实为 P2 的 A9-60；地板 ≥1/3 即 ≥5）；合计 27 判定。
- 方法学沉淀（写入 review 文件供后续批复用）：渐变背景（background-image）下 DOM 合成对比度以白为基线系统性高估 dark 背景亮度——dark 数值复检须像素采样；半透明色（`bg-primary/85` 类）必须合成 alpha 后再算比值。

## 4. 族归并（与 R2-1a–d 已裁定族去重合并）

1. **【既有族扩面·大幅增重】dark 平价/对比度族（R2-4 引用）**：本批新增 P1×2（badge B5-01、button B5-04 同根因 `--secondary-foreground` 未随 dark 翻转）+ P2×3（badge B1-02 四语义档 light 全败、button B1-05 destructive tint、B1-40 选中态双主题）+ P3×1（tag-list B6-106 dark 状态区分度）+ 订正新增实例（dark danger 徽章 3.24:1、dark destructive ≈2.8:1）+ `--popover` dark 亮底新实例集群（input-date/datetime/range/picker/tree-select/select/command-palette/icon-picker/detail 弹层；最重：detail 弹层字段标签 dark 整体不可见）——与 R2-1a（≈14 页 P1×3）、R2-1d（P1×4 + `--primary` dark 过亮 7/7）合流为全库最大 local 族。
2. **【既有族扩面】弹层 actions 左对齐族（R2-3b 首批引用）**：dialog H5-09 + tabs H5-32（+loop 实例）——review-a 锐化：form-actions 容器（default-spacing.css L29-32）缺对齐契约，一处修复收三卡并与 R2-1a ≥10 页族同根因合流。
3. **【既有族扩面·升格证据】图标别名回环族（R2-3 候选，引用 R2-1d-A5-02）**：icon A5-21 升为 P1 产品面实例（home/house 静默回退 Circle），根因精确化为 lucide `icons` 命名空间缺 `Home` 键。
4. **【既有族合流·增重】表单 AMIS 契约缺口族（R2-3 候选，引用 R2-1d-A-40/41）**：A9-42 + A9-60 为该族第 4/5 实例（同根因：契约外校验键/容器键静默丢弃且零诊断）；F4-83（watch）+ A9-104（local）为外围实例。
5. **【既有族扩面】A3 小目标族**：A3-103（P2，picker 12×12 无命中扩展）+ A3-100（P3，input-table 24×16）。
6. **【新族候选】lab 载体与环境基建族（新登记，R2-3 候选）**：keyboard A9-23（P2，notify no-op 吞全部 lab toast）+ page B5-34（P2，runner dark 失效）+ recurse B4-28（P3，IACVT stage 渐变）+ array-editor C1-81（P3，scope-debug 溢出打穿 stage）——同根因面 = demo/证据基建层吞真实反馈，生产渲染器无责；建议 R2-3 字母批收口。
7. **【归并裁定】scope-debug 面板四卡同修复面**：E5-29（P2 主条目，local）+ A1-30 + C1-63（watch）+ C1-81（上条）——面板样式/溢出包容一处补齐收四卡，归 R2-4。
8. **【既有 watch 族引用不另立】**：默认栈宽基线（reaction E2-26 实例）、窄视口 flex/固定壳层（button C1-06、markdown C4-65 实例）、i18n zh-CN 回退（dialog F4-11 主条目 + 30+ 控件实例）、数值列左对齐（input-table Amount 核对完成不升级）、G7 双向同步（variant-field 正向佐证）。

## 5. R2-4 首批族终裁输入（Decision：合并 R2-1a + 本批台账，按族内 findings 数量与影响面排序）

> 本节只输出清单供 R2-4 plan 立项引用；终裁在 R2-4 立项时登记进台账（roadmap R2-4 行口径）。

1. **dark 主题平价/对比度族（建议终裁为 R2-4 首批）**：R2-1a ≈14 页（P1×3，`--adp-*` 无 dark 块 + 宿主 `:root` --popover）＋ R2-1d（P1×4 + `--primary` dark 过亮 7/7 页 + `.nop-theme-root` 钉死 color-scheme）＋ R2-2a（P1×2 + P2×4 + --popover 亮底集群 + 订正实例）——跨批合计 **≈40 页/控件面、P1×9**；单一修复面 = theme-tokens 令牌表（`--secondary-foreground`、`--primary` dark、`--destructive`、`--popover` dark 块）+ 宿主主题层（playground `:root` 覆盖与 color-scheme）。
2. **校验呈现三不一致族（R2-1a local 输入，第二位）**：P0×1（combo 幻影校验）+ P1×2（向导只报首错/表单全量行内）——R2-2a 的 A9-42/A9-60 契约键诊断缺口属 systemic 侧（R2-3 候选），其渲染器侧行级校验缺口（A9-82）已由根因定位并入本族外围。
3. **表格 sticky 操作列透明底（R2-1a local 输入，第三位）**：P1+P2，2 页，一处 td 底色。
4. **R2-2a 本批 local 散项（15 条，与卡面 local 归族集合一一对应）**：picker labelField 回显（F4-102）、text maxLine 静默裁切（C1-36）、page 标题层级（E2-24）、page 槽位零间隙（D7-25）、scope-debug 面板四卡修复面（E5-29 主条目）、tabs F4-33 sidebar-right fixture、checkbox A9-41 aria 关联、fieldset A2-44 focus 形态、input-table A4-101 只读外观、editor A7-84 原生 prompt、condition-builder F4-80 枚举标签、picker A9-104 行点击、tabs A9-35 scrollIntoView 选择器、object-field E5-105 嵌套缩进、input-text A9-62 suggest 过滤 fixture。

## 6. 健康面（复核确认的正向基线）

plan 490 弹层阶梯在控件面复检成立（dialog xs–full 全中、picker 弹层 560 在档、drawer 尺寸档正常）；select/transfer/tree-select/input-tree/combo/detail 等 22 控件零正式发现全过（transfer 穿梭/双栏搜索/全选/受控回显闭环、input-tree 懒加载失败+重试闭环、combo 三态溢出零命中）；radio 键盘 roving + 焦点环、markdown XSS sanitize、date-range shortcuts/clearable（误报排除后确认正常）、variant-field 类型切换→值重写→runtime 联动（G7 族正向佐证）均程序化坐实；wave3–6 探针 dark 全部真 data-mode（B5-34 修正后口径）。

## 7. Quick Wins（<30min）

1. `--secondary-foreground` dark 翻转（theme-tokens classic L195-198 + glass L315-318，收 badge/button 两条 P1）。
2. form-actions 容器缺省对齐（default-spacing.css 一处 justify-end，收 dialog/tabs/loop 三卡 + R2-1a ≥10 页同族）。
3. icon 别名去环（ICON_ALIAS_MAP 删 `house→home` 或 lucide icons 补 Home 键，收 P1）。
4. lab env notify 覆写 + Toaster 挂载（两件套，收全部 lab 页 toast 反馈）。
5. playground 入口 `initFluxI18n`（一处，收 30+ 控件中文 chrome 实例）。

## 8. 最大影响修复 Top 3

1. **dark 平价令牌包（R2-4 首批建议）**——badge/button P1×2 + 弹层 dark 可读性集群 + 全库 ≈40 面，修复面集中在 theme-tokens 与宿主主题层。
2. **form-actions 对齐契约（R2-3b 首批族本批增重）**——一处收本批 3 卡 + R2-1a ≥10 页。
3. **表单契约键诊断层（未知校验键 schema warning + `equalsField`/`minSelected` 契约文档化）**——校验静默失效全族（R2-1d 第 1–3 例 + 本批第 4/5 例）收口，配 A9-82 行级校验修复。

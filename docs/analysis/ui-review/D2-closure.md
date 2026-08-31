# D2 — 全 roadmap 终态盘点（对标分数复评 + C2 终版 + 复刻页清单 + 工作线终态）

> Last Updated: 2026-08-31（D2 收口产出，plan `docs/plans/2026-08-31-1522-1-d2-consistency-gates-and-roadmap-closure.md` Phase 3）
> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（D2 产出文档）
> 输入：R1 `R1-framework-benchmark.md`（复评基线）、R2 `R2-consistency-audit.md`（共性族 1–10 + R3 收口节）、C2 `C2-capability-gaps.md`（初版裁决 + 回写 ①–⑮）、D1 产品化七个 plans、七个复刻 plan 群、`apps/playground/src/complex-pages/` live 实测
> 计数口径：本文全部计数 live 复核（复刻页 26 张 = `page-schemas/` 40 张中的 app-replica 面；mock 端点 = `shared/mock-backend*.ts` + `showcase-env.ts` 注册标识符 live grep 口径）

## 1. 对标分数复评（R1 双维评分卡 post-D1 增量复评）

### 1.1 复评口径

沿 R1 双维定义（美观度 = 令牌体系/密度与层次/微交互/暗色完整度/产品完成度；完善度 = 组件覆盖/页面模板层/交互深度/a11y/主题化，各 1–5 分取算术均值四舍五入到半档）。**只对本 roadmap 实际改善的维度复分，无证据支撑的维度记「维持」不复分**（plan Phase 3 红线）。证据等级：⚡=live 实测本仓库（D1 产品化产物 + 复刻页 + 单测），证据均可在 D1 七个 plans 与 C2 回写 ⑨–⑮ 追溯。

### 1.2 分维复评表（仅列变动维 + 关键维持维）

| 维度           | R1 分 | D2 复评 | 变动     | live 证据（D1 产品化产物）                                                                                                                                                                                                                                                                                                                      |
| -------------- | ----: | ------: | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **页面模板层** |     2 | **3.5** | **+1.5** | ⚡ G-A 语义件族落地（回写 ⑪）：`page` renderer `breadcrumb`/`extra` 语义字段、`query-filter` 新 type（内建查询/重置/togglable）、`result` 新 type（四语义 status 映射）；antdpro 9 张页面模板族复刻页 live 可渲染（list/form×4/detail×2/dashboard/result）。不到 4：blocks 式整页模板 schema 预设分发库仍为 successor（回写 ⑪ 未纳入项）        |
| **交互深度**   |     2 | **3.5** | **+1.5** | ⚡ G-B1 `command-palette` type（⌘K hotkey/cmdk 键盘选择/面板即关，回写 ⑩）+ G-B2 `keyboard` type（chord 序列/`modifierSelect` 修饰键选区/J·K 指针组合，回写 ⑫）+ G-B3 `batch-bar` type + `selectAllMode:'page'`（回写 ⑬）；P4b/P5b/P6b/P7b 交互 e2e 全谱。不到 4：hover-peek、fill-handle/范围选区、kanban 手势变体均为显式 deferred（回写 ⑫⑮） |
| **微交互**     |   2.5 | **3.0** | **+0.5** | ⚡ G-F option-row 原语（回写 ⑨）：hover/选中态 schema 表达通道（`optionRow.value/selectedClass`）+ 标准 marker 输出（`data-option-row`/`data-state`/`aria-selected`/`aria-disabled`），list/table/ai-feedback 三采纳面 33 条单测；族2「状态已发射样式零消费」修复模式从逐渲染器补丁收敛为原语通道。不到 3.5：按压反馈/弹簧/过渡治理无立项       |
| **a11y**       |   2.5 | **3.0** | **+0.5** | ⚡ option-row aria-selected/aria-disabled 标准输出（回写 ⑨）+ table 分组组头 `aria-expanded`（回写 ⑮）+ tabs 集合管理 affordance 语义（回写 ⑭）+ keyboard bindings 输入焦点门控/内建优先路由（回写 ⑫）。全量 WCAG 合规仍未审（归 deep-audit 维度 20，不变）                                                                                     |
| **产品完成度** |   3.5 | **4.0** | **+0.5** | ⚡ 复刻页 26 张全部产品级（交互接线 + mock 会话态端点 + 交互 e2e 锁定；本计划 §3 清单）；企业 14 页 demo 级维持、运行时主题切换缺失维持——不到 4.5                                                                                                                                                                                               |
| 令牌体系       |     4 |       4 | 维持     | 无 token 层变更（R2 G-I 抽查：4 调色板结构对称已是 R1 计分依据）                                                                                                                                                                                                                                                                                |
| 密度与层次     |     4 |       4 | 维持     | G-E 密度档语义字段未产品化（D1 输入池候选，回写 ⑧）；复刻密度仍走复刻层 CSS                                                                                                                                                                                                                                                                     |
| 暗色完整度     |     3 |       3 | 维持     | `apps/playground/src/main.tsx:14-15` live 复核仍硬编码 `data-theme: classic` + `data-mode: light`，运行时切换入口未落地；dark 回归面无新增证据                                                                                                                                                                                                  |
| 组件覆盖       |   4.5 |     4.5 | 维持     | 新增 5 个 renderer type（command-palette/query-filter/result/batch-bar/keyboard）强化语义件层，但移动端主组件族（G-H 挂起）与 office 类超集缺口维持，不到 5                                                                                                                                                                                     |
| 主题化         |     4 |       4 | 维持     | 主题独立契约 + 4 调色板不变；运行时切换器未暴露（同暗色完整度）                                                                                                                                                                                                                                                                                 |

### 1.3 复评综合分

- **美观度** = (4 + 4 + 3.0 + 3 + 4.0) / 5 = 3.6 → **3.5（维持）**——微交互 +0.5 不足以翻转半档。
- **完善度** = (4.5 + 3.5 + 3.5 + 3.0 + 4) / 5 = 3.7 → **3.5（R1 基线 3.0 → +0.5）**——页面模板层与交互深度两级台阶显著收窄。

### 1.4 参照组分数（维持）

AMIS 2.5/4.5、Ant Design + Pro 4.0/5.0、shadcn/ui + blocks 4.5/3.0、Retool 系 2.5~3.5/4.0~4.5、Vant 4.0/4.5 全部**维持** R1 快照（2026-08-19 web 调研口径；本计划零外部调研义务，参照组侧无新 live 证据，按「无证据不复分」记维持）。复评结论一句话：**本 roadmap 收口后，flux 自评「页面模板层」与「交互深度」两级台阶已从 R1 的 2 分双位数缺口收敛到 3.5——AntD Pro 式页面模板与 Linear 式键盘交互均具备 schema 级一等通道；对 AMIS 的代际优势（令牌化 + React 19 底座 + 调度/工业/AI 超集）保持，对 shadcn 的差异化（配置驱动 + 数据联动）未被稀释。**

## 2. C2 终版（引用式汇总，与回写 ①–⑮ 零矛盾）

> 落式裁定：C2 文档回写区 ①–⑮ 为权威 append-only 记录，本节为 D2 收口的**引用式汇总**（plan Phase 3 执行时落字裁定），初版裁决表与回写文本零改动、零复制漂移——本节只做终态映射与 open-candidates 归账。

### 2.1 已收口候选终态汇总（G 族 → D1 产品化映射）

| 候选                                                     | 级别    | 终态                                                                       | 产品化 plan                                                         | C2 回写 |
| -------------------------------------------------------- | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- |
| G-F（option-row 原语，吸收 G-F2 className 表达式）       | L3      | ✅ 已产品化                                                                | `2026-08-30-1333-2-d1-gf-option-row-primitive.md`                   | ⑨       |
| G-B1（⌘K 命令面板原语）                                  | L3      | ✅ 已产品化                                                                | `2026-08-30-1737-1-d1-gb1-command-palette-renderer-primitive.md`    | ⑩       |
| G-A（页面模板层语义件族）                                | L2      | ✅ 已产品化                                                                | `2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`      | ⑪       |
| G-B2（键盘导航框架 chord/多选/重排）                     | L4      | ✅ 已产品化                                                                | `2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`         | ⑫       |
| G-B3（批量操作栏语义 + selectAllMode）                   | L2~L3   | ✅ 已产品化                                                                | `2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`          | ⑬       |
| G-C（多视图数据库语义件：tabs 集合管理 + kanban 列聚合） | L2      | ✅ 已产品化                                                                | `2026-08-31-0721-1-d1-gc-multiview-database-semantic-components.md` | ⑭       |
| G-D（网格编辑深度语义件族：分组聚合 + 单元格原位编辑）   | L2      | ✅ 已产品化                                                                | `2026-08-31-0721-2-d1-gd-grid-editing-semantic-components.md`       | ⑮       |
| G-E（高密度排版）                                        | L1 为主 | ✅ CSS 可解已证（P7a/P7b 复刻承载）；密度档语义字段/open candidates 归台账 | —（CSS 通道）                                                       | ⑧       |

D1 六项能力收口 = 上表七个 plans（G-C/G-D 为第六项「语义件族」的两 plan），与 roadmap D1 条目计数口径一致。

### 2.2 Open candidates 台账（收口后仍开放的登记，全部显式裁决非静默）

| #   | 候选                                                                                                                                                            | 分类                   | 触发条件                                        | Successor 归属                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | tabs 溢出收纳菜单（D1 deferred）                                                                                                                                | optimization candidate | 多视图溢出真实消费页出现                        | D1 输入池（DropdownMenu 收纳）                                                                            |
| 2   | 个人视图偏好存储层（D1 deferred）                                                                                                                               | optimization candidate | 跨会话偏好真实消费页出现                        | D1 输入池（host adapter，INV-1 先例）                                                                     |
| 3   | fill-handle 编辑器选区模型（D1 deferred）                                                                                                                       | optimization candidate | consuming 复刻页/页面出现                       | D1 输入池（叠加 G-D 双态状态机）                                                                          |
| 4   | 动态列模型（D1 deferred）                                                                                                                                       | optimization candidate | 用户自定义列真实诉求出现                        | D1 输入池（沿 tabs 集合管理先例做 columns 轴）                                                            |
| 5   | 视图类型↔peek 联动建模（D1 deferred）                                                                                                                           | 创作约定（非机制缺口） | —（Successor Required: no，回写 ⑭ 终态）        | 无                                                                                                        |
| 6   | P2 169 条「登记后续修复候选」                                                                                                                                   | backlog 候选池         | 修复候选被独立立项                              | 后续独立裁决（R3 台账 `r2-audit/r3-p2-adjudication.md`）                                                  |
| 7   | P3 87 条 backlog                                                                                                                                                | backlog 候选池         | 独立裁决立项                                    | roadmap backlog 区（R3 §5 声明：登记即终态，不入门禁候选）                                                |
| 8   | 门禁豁免基线 399 实例 / 116 文件 / 30 条目（本计划 Phase 2 产物）                                                                                               | backlog 候选池索引     | 与门禁同源的修复候选被立项（P2 169 条子集优先） | `scripts/audit/find-ui-consistency-gaps.mjs` EXEMPTIONS 常量（每条含 R2/R3 回链）；修复时同步摘除豁免条目 |
| 9   | G-E 密度档语义字段 / `formatCurrency` registry 函数 / 语义 pill 型别 / download-print·clipboard 宿主通道 / 筛选 URL 同步 / 语法搜索解析（回写 ⑧ D1 输入池六项） | D1 输入池              | D1 后续轮次立项                                 | C2 回写 ③④⑤⑥⑧ 素材行                                                                                      |
| 10  | G-H 移动端主组件族（vs Vant）                                                                                                                                   | 挂起（P 系列外）       | roadmap 结构性变更                              | C2 初版裁决维持                                                                                           |
| 11  | G-I 运行时主题切换入口（L4 小项）                                                                                                                               | D1 输入池              | 独立小 plan 立项                                | C2 回写 ①                                                                                                 |
| 12  | G-J resizable schema 化 / G-K 流程图数据驱动着色                                                                                                                | 构想库存（C1 §3）      | 后续 roadmap 立项                               | C2 初版裁决表                                                                                             |
| 13  | G3-余 input-date 行触发形态                                                                                                                                     | 挂起（优化项）         | 复刻页迭代触发                                  | C2 初版裁决表                                                                                             |
| 14  | G-L dialog 影子写限制 / G-M hook 裸 scope 求值                                                                                                                  | L4 观察项              | deep-audit 候选                                 | C2 初版裁决表（观察中）                                                                                   |

## 3. 各复刻页清单（live 复核 26 张，2026-08-31）

`apps/playground/src/complex-pages/page-schemas/` 共 40 张 schema，其中参考应用复刻（category `app-replica` 谱系）**26 张**：sundial 5 + antdpro 9 + cal 3 + linear 6 + notion-database 1 + airtable-grid 1 + stripe-payments 1（live `ls` 复核）；其余 14 张为 roadmaps 前企业向 complex 页（standard-crud/master-detail/dashboard 等，非复刻）。mock 端点标识符 live grep 口径：AntdPro 8 / Cal 10 / Linear 11 / Notion 8 / Airtable 5 / Stripe 5（`shared/mock-backend*.ts` + `showcase-env.ts`）。

| 应用            | 页（schema）                                                                                                     | plan                                      | mock 端点族                                         | e2e spec                                                                              | 明暗姿态                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------- |
| Sundial（先例） | workbench / detail / analytics / settings / todo-dialog（5）                                                     | plans 456/457/459/460（roadmap 前置先例） | `Sundial__*`（mock-backend-sundial.ts）             | `sundial-replica-visual.spec.ts`                                                      | light-only（`--sd-*`）                       |
| Ant Design Pro  | dashboard / list / form-base / form-group / form-modal / form-step / detail-base / detail-advanced / result（9） | P2a `1240-1` + P2b `1413-1`               | `AntdPro__*` 8 标识（3 读 + 5 写会话态）            | `antdpro-replica-visual.spec.ts`（10）+ `antdpro-replica-interactions.spec.ts`（23）  | light（令牌复刻，radius 差异裁定 6→8px）     |
| Cal.com         | booking / confirm / success（3）                                                                                 | P3a `1413-2` + P3b `1819-1`               | `Cal__*` 10 标识（读 + 写会话态 + copyLink）        | `cal-replica-visual.spec.ts`（3）+ `cal-replica-interactions.spec.ts`（16）           | light-only（品牌黑语义换名 `--cal-action*`） |
| Linear          | issues / board / inbox / detail / projects / settings（6）                                                       | P4a `1819-2` + P4b `0040-1`               | `Linear__*` 11 标识（5 读 + 6 写会话态 + copyLink） | `linear-replica-visual.spec.ts`（6）+ `linear-replica-interactions.spec.ts`（18）     | dark-only（四层背景/品牌紫三档）             |
| Notion          | notion-database（1，五视图）                                                                                     | P5a `0040-2` + P5b `0614-1`               | `Notion__*` 8 标识（3 读 + 5 写会话态）             | `notion-replica-visual.spec.ts`（6）+ `notion-replica-interactions.spec.ts`（14）     | light（`--nt-*` 30 变量）                    |
| Airtable        | airtable-grid（1）                                                                                               | P6a `0614-2` + P6b `0953-1`               | `Airtable__*` 5 标识（2 读 + 3 写会话态）           | `airtable-replica-visual.spec.ts`（6）+ `airtable-replica-interactions.spec.ts`（11） | light-only（主蓝 `#2d7ff9` 独立令牌）        |
| Stripe          | stripe-payments（1）                                                                                             | P7a `0953-2` + P7b `1333-1`               | `Stripe__*` 5 标识（3 读 + 2 写会话态）             | `stripe-replica-visual.spec.ts`（5）+ `stripe-replica-interactions.spec.ts`（9）      | light-only（blurple/Downriver 独立令牌）     |

清单核对注：e2e 条数为各 closure 记录的目标 spec 数（roadmap 各 Pi 条目登记值）；sundial 5 页早于本 roadmap（roadmap 复刻方法论即其先例放大），随清单一并登记以保全量。

## 4. roadmap 终态盘点（四条工作线）

| 工作线                        | 终态    | 产出/依据                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 对标分析（R 系列）            | ✅ done | R0 资产盘点（122 renderer / 62+16 ui / 324 tokens 基线实测）+ R1 五组对标双维评分卡（本文件 §1 为其 post-D1 增量复评）；owner docs `R0-baseline-inventory.md` / `R1-framework-benchmark.md`                                                                                                |
| 一致性审查（R2/R3 + D2 门禁） | ✅ done | R2 276 发现 → 273 保留（共性族 1–10）+ R3 17 条 P0/P1 先红后绿修复 + P2 172 裁决 / P3 87 登记 + D2 四门禁落地（`check:audit-ui-consistency-gaps` 入主链，399 既有实例豁免基线 / 零新增红线）；owner doc `R2-consistency-audit.md` + `r2-audit/` 台账群                                     |
| 复杂页面构想（C 系列）        | ✅ done | C1 八类复杂页构想 + C2 分级裁决（L1–L4）滚动收口：初版裁决 + 回写 ①–⑮（R2/R3 + 六应用 Pi-b 全谱 + D1 七 plans 终态）；六项能力产品化收口（§2.1）；owner doc `C1-complex-page-conceptions.md` / `C2-capability-gaps.md`                                                                     |
| 参考应用复刻（P 系列）        | ✅ done | P1 调研规范 + 6 应用分析篇 + P2a–P7b 六应用两段式复刻（13 plans）：26 张复刻页 / 47 个 mock 端点标识 / 151 条复刻 e2e（六应用 visual+interactions 127 条 + sundial visual 24 条，§3 清单 live grep 口径）；缺口全谱回流 C2（回写 ③–⑧）；owner docs `P1-reference-apps/` + 各 `P2..P7-*.md` |
| 沉淀（D 系列）                | ✅ done | D1 六项能力七个产品化 plans（全 closure audit 通过）+ D2 本收口（四门禁 + 本盘点）；roadmap Phase Status 区全项 `done`                                                                                                                                                                     |

**全量验证基线引用**：最近 full-green 记录 = `docs/logs/2026/08-31.md`（D1 G-D 收口：typecheck/build/lint 37/37、test 68/68 任务、check exit 0 零新增红）；D2 收口全量验证见本计划 Closure Gates 记录与同日日志。

**`pnpm check` 门禁清单终态（15 个，含本计划新增）**：react19 / src-artifacts / oversized-code-files / active-doc-code-anchors / package-css-exports / flux-bundle-pack / i18n-keys / workspace-manifest-deps / schema-prop-coverage / scada-symbol-keys / audit-suspects / audit-renderer-browser-io / audit-event-dispatch-ctx / ai-engine-invariants / **audit-ui-consistency-gaps（D2 新增：字面色 + CJK UI 文案 + raw error.message 直出 + data:/blob: href download 透传四规则）**。另有约 17 个独立 `check:audit-*`/`check:*` advisory 命令不在主链（治理格局不变）。

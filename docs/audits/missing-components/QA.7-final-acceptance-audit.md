# QA.7 最终验收审计 — missing-components roadmap（全线 done 后）

> Auditor / Agent: 独立 fresh 子 agent（QA.7 最终验收审计员，2026-09-27，与 L0–L7 各线执行/closure 会话及 QA.1–QA.6 审计会话无关）
> 审计对象: roadmap §11 QA.7 行六项——①全量 full-green 实跑；②coverage 复评（archetype §2 A–G matrix + gap-analysis §4 register 主基线，目标修复行逐行重打分）；③交付完整性 sweep（roadmap §13 逐行 → design.md/example/入口/e2e/登记存在性程序化核对）；④代码质量终审（反模式 + oversized 台账 + 渲染契约抽查 + i18n 键完整性）；⑤playground 全入口可导航走查；⑥残余债登记册（必交）
> 审计基线: HEAD `dbd3c327b`（524 L6 S3+S4 closeout + QA.1-L6 pass 已入库）。工作树仅 1 处与本审计无关的既有未提交改动（`docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/04-e2e-domain-pages.md`，沿 QA.6 Obs-2 同款登记，未触碰）
> 审计依据: `docs/backlog/missing-components-and-designer-roadmap.md` §11 QA.7 行 / §13 状态总表；`docs/audits/00-audit-execution-guide.md`（Pass = 0 Blocker 且 0 Major）；coverage 基线 = `docs/analysis/visual-quality/2026-09-24-page-archetype-coverage-audit.md` §2 + `2026-09-24-missing-component-gap-analysis.md` §4；格式先例 `QA.5-integration-audit.md` / `QA.6-integration-audit.md`
> 审计输入: Fresh Context 三件套（roadmap + 两基线报告 + 全部 QA.1–QA.6 审计档 + live 仓库 + 实跑验证输出），未读任何执行会话历史
> 附属必交物: `docs/audits/missing-components/QA.7-residual-debt-register.md`（残余债登记册，⑥）

---

## 1. ① 全量 full-green 实跑

链式实跑（`pnpm typecheck && build && lint && test && check`，工作树原态）：

| 阶段                       | 结果                                                                                      | 证据（`_tmp/qa7-*.log`，数值已蒸馏入本档） |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| typecheck                  | **42/42 tasks successful，exit 0**                                                        | qa7-typecheck.log                          |
| build                      | **42/42 tasks successful，exit 0**                                                        | qa7-build.log                              |
| lint                       | **42/42 tasks successful，exit 0**                                                        | qa7-lint.log                               |
| test（全 workspace 单测）  | **14993 passed / 1 skipped / 0 failed**（1590 test files；skip = flux-runtime 在册 1 例） | qa7-test.log                               |
| check（15 sub-check 全链） | **CHAIN-EXIT:0，零新增红**                                                                | qa7-check.log                              |

- check 链构成实核：react19 / src-artifacts / oversized-code-files / active-doc-code-anchors（354 docs 锚点验真）/ package-css-exports（25 CSS export）/ flux-bundle-pack / **i18n-keys（exit 0）** / workspace-manifest-deps / schema-prop-coverage / scada-symbol-keys / audit-suspects / renderer-browser-io / event-dispatch-ctx / ai-engine-invariants / ui-consistency-gaps——全过。
- oversized 实况：**208 warnings / 2 errors / 2 exempt**——2 errors 即 2 exempt（locales 双文件在册豁免），exit 0 语义成立；208w 与 QA.5 Minor-1 投影逐跳吻合（205→206→207→208，QA.5 投影精确兑现，见 §4）。

**结论①：五阶段全绿在案，验收前提成立。**

## 2. ② coverage 复评（逐行重打分，dated 注记回写）

以两份 2026-09-24 基线报告为快照主基线，对全线 done 后 live 仓库逐行重打分。**复评方式 = dated 注记（不破坏快照）**：两报告各追加「QA.7 复评注记」dated appendix（archetype §8 / gap-analysis §13），快照原文 §1–§7 / §1–§12 零改写。

### 2.1 archetype A–G matrix 重打分摘要（全表见 archetype 报告 §8.1）

- **升 Full ×12**：A2（verification-code）、A4（density+filter↔URL 双洞闭合，Full\*→Full）、A7/B1/C9（org 双 picker）、B2（G-K，快照已带 plan 513 销项注记）、B3（calendar `monthShape:'grid'`）、B6（org 协议）、C4（input-city）、C5（filter↔URL）、**C6（Blocked→Full，`RendererEnv.print` renderer-api.ts:211 + print action + AntD Pro 接线）**、D2（download action，Full\*→Full）。
- **Partial 收窄/维持 ×5**：C8（money = 协议已立 DEMAND-GATED 实现 + PDF-out 维持 print-designer track）、C2/E2/G5（image-preview capability，L7.2 demand-gated，not-a-type 裁定不变）、D4（body-level breadcrumb host-IA posture + linkage friction 非 roadmap 范围）。
- **维持**：B4 Full\*（focus-refetch 裁定不模拟，闭合记录在案）、D5 Host。
- **复评记分板（41 行）：Full 34（≈83%）· Full\* 1 · Partial 5 · Blocked 0 · Host 1**（快照原值：Full 22 · Full\* 3 · Partial 14 · Blocked 1）。Blocked 清零；余 5 行 Partial 均有书面 demand-gate / host-IA posture 登记——基线 §5「Definition of done」（要么 Full 要么显式 reclassify）达成。

### 2.2 gap-analysis §4 register 重打分摘要（全表见 gap-analysis 报告 §13.1）

- P0 ×3 全 landed（matrix Form Core flip + 命名 pass：`rating`/`input-color` 定名）；P1 ×5 全 landed（org 协议 §9 零分叉载体 `renderers/org/`，QA.3 复核背书）；cascader = L2.6 裁决 demand-gated（决策文档在案，matrix :246 内联登记）；money = L2.5 协议（DESIGN-ACK-NOT-IMPL，X6 挂账）。
- §7 维护债：matrix maintenance ✅（520）、quick-reference P-1 ✅（520）、O1 reconcile ✅ 部分（残面 = QA.1-L7 Minor-2，登记册 A-14）；三项「随下批 docs」未结（登记册 A-16②）。
- §2 live inventory 增补：form 包 +8 type、layout 包 +`resizable`，ui「已导出未接线」清单收窄（§13.3）。

### 2.3 roadmap 源报告闭合项核销

L3 线预记的两项不再立项（theme switch entry = plan 471 V1-F3 已解；window focus refetch = 裁定不模拟）——均在 archetype §8.2 复评注记中记录闭合。L4.4 hover-peek 经 plan 513 :29 正式裁定 watch-only residual + 作者侧创作约定（successor: no，全仓实现零命中）——coverage 复评据此归档，不列为未竟项。

**结论②：复评报告落盘（两 dated appendix）+ 全部目标修复行逐行重打分完成，Blocked 清零、余洞全 demand-gated。**

## 3. ③ 交付完整性 sweep（roadmap §13 逐行程序化核对）

### 3.1 新增 type ×9 + resizable 十件套

| 核对面              | slider       | rating  | input-color | user-select     | department-select | input-city | input-signature | verification-code             | resizable                                 |
| ------------------- | ------------ | ------- | ----------- | --------------- | ----------------- | ---------- | --------------- | ----------------------------- | ----------------------------------------- |
| design.md           | ✅           | ✅      | ✅          | ✅              | ✅                | ✅         | ✅              | ✅                            | ✅                                        |
| example.json        | ✅           | ✅      | ✅          | ✅              | ✅                | ✅         | ✅              | ✅                            | ✅                                        |
| manifest runtime    | ✅           | ✅      | ✅          | ✅              | ✅                | ✅         | ✅              | ✅                            | ✅                                        |
| quick-reference     | ✅           | ✅      | ✅          | ✅ :886         | ✅ :887           | ✅ :894    | ✅              | ✅                            | ✅ :1014（ResizableSchema）               |
| components/index.md | ✅           | ✅      | ✅          | ✅              | ✅                | ✅         | ✅              | ✅                            | **❌ 0 命中（D-1）**                      |
| playground route    | ✅ form:45   | ✅ :52  | ✅ :59      | ✅ :334         | ✅ :341           | ✅ :362    | ✅ :348         | ✅ :355                       | ✅ layout:27                              |
| 专属 e2e spec       | ✅           | ✅      | ✅          | ✅              | ✅                | ✅         | ✅              | ✅                            | ✅                                        |
| matrix              | ✅ flip :139 | ✅ :140 | ✅ :141     | 继承 org 协议面 | 同左              | ✅ :146    | ✅ :147         | registration（InputOTP 既有） | flip 不触发（非 AMIS 基线，roadmap 裁决） |

- **D-1（本审计新发现，Minor）**：`resizable` 在 `docs/components/index.md` 全文 0 命中（:315 布局 type 清单与 :430 目录清单均缺），而 `docs/components/resizable/` 目录在盘——交付铁律 ⑤ 登记面缺一角，其余七面齐。登记册 D-1，下批 docs 两处补列。
- page-designer 面核：`#/page-designer` 入口（domain-route-entries.ts:74）+ `pages/page-designer-demo.tsx` + `docs/components/page-designer/design-architecture.md` + index.md :572/:578 + quick-reference Page Designer 节 + e2e（page-designer-mvp.spec 3 条 + 524 新增 4 条 spec）——全在。

### 3.2 §13 其余 done 行存在性核对

| 行                            | 核对面                                                                                                                                                                                                                                                                                                                       | 结果                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| L0.1–L0.4（502）              | route-matrix 守卫 + 首页注册表派生 + 五关键入口卡片导航断言                                                                                                                                                                                                                                                                  | ✅（守卫在 unit 全绿内；entry e2e 79 条含五入口） |
| L2.0 协议（504）              | `docs/architecture/org-data-source-protocol.md`                                                                                                                                                                                                                                                                              | ✅ 在盘                                           |
| L2.5 money（509）             | input-number design.md §2.1 currency 协议节                                                                                                                                                                                                                                                                                  | ✅ 在盘（:39-54 三要素/共存/双轨条款）            |
| L2.6 cascader（510）          | `docs/analysis/cascader-vs-tree-select-decision.md`                                                                                                                                                                                                                                                                          | ✅ 在盘                                           |
| L3.1–L3.5（512）              | host-channels 契约文档（discussions/2026-09-26-...md）+ env 三通道（renderer-api.ts:211/217/223）+ copy/print/download action + `use-url-filter-sync.ts`/`use-crud-url-sync.ts` + url-filter-sync e2e                                                                                                                        | ✅ 全在                                           |
| L4.1–L4.11（513/514/515-519） | density（data schemas :160）/ monthShape（scheduling definitions :255）/ resizable / keyboardReorder（kanban.types :78）/ selectedClass（gantt.types :39）/ cardTemplate / retrofit 接线（linear-issues.json、airtable-grid.json keyboard 在册）/ L4.10 wizard footgun 注记（flux-guide/examples/wizard-values-path.md:127） | ✅ 全在                                           |
| L5（521/522）                 | design-binding-panel / design-template-station / design-renderer §13 三档 + scada-editor-demo 接线                                                                                                                                                                                                                           | ✅ 全在（QA.5 已实跑 12/12 背书）                 |
| L6 S0–S4（523/524）           | standard-page-designer-research / design-architecture / 两包 + 入口 + e2e                                                                                                                                                                                                                                                    | ✅ 全在（QA.6 + QA.1-L6 背书）                    |
| L7（520）                     | matrix 四行注记 + quick-reference P-1 清零 + O1 reconcile + demand-gated 终态                                                                                                                                                                                                                                                | ✅ 在盘（残面登记册 A-14/A-16②）                  |

- QA.2 Minor-1 程序化重扫：manifest runtime 74 条中 **8 条仍缺 example.json**（object-field/array-field/variant-field/detail-field/detail-view/scada-canvas/scada-editor-canvas/dashboard）——未消化，登记册 A-1。
- manifest `declaredButUnregistered` = []，无暗条目。

**结论③：sweep 程序化核对完成；唯一缺失 = D-1（resizable 缺 index.md 登记），余全部在案。**

## 4. ④ 代码质量终审

- **反模式链**：`pnpm check` 15 sub-check exit 0（§1）——schema-prop-coverage（props 契约面无漏登）/ renderer-browser-io / event-dispatch-ctx / ui-consistency-gaps / react19 全过；renderers 包新增面零 per-renderer bespoke 状态机（org 共享数据面、density 走 schema 编译面、retrofit 走 `keyboard`/`optionRow` 已交付原语——§3.6 共享底座模式合规）。
- **oversized 台账**：208w/2e/2exempt（§1），QA.5 投影兑现；台账口径统一 + 拆分/登记二选一 = 登记册 A-4（warn 面五文件清单在册）。table-renderer.tsx 700 行整顶格维持关注。
- **渲染契约抽查**：slider-renderer / input-color-renderer（`RendererComponentProps<SliderSchema>` 契约、`props.props`/`props.meta`、`useInputComponentHandle`、ui `Slider`/`ColorPicker` 基元、`cn()`、i18n aria 回退键 `flux.common.colorPickerAriaLabel`）；org 渲染面走共享 `use-org-source`/`use-org-data` hooks。**新渲染器文件直接 store 访问 grep = 0 hit**；ad-hoc React context / prop-drilling = 0 hit。
- **i18n 键完整性**：check-i18n-keys exit 0（zh/en parity 双语互查强校验）；QA.4 Obs-2 的 57 暂态 undefined key 已随 522 locales 批次消解（QA.5 §4⑤ 背书）；locales 1875/1873 行豁免口径覆盖持续成立。
- audit-suspects 信息面 page-designer 条目（QA.6 Obs-1）裁定：json-stringify 序列化误报 + 标准 test pattern + catch 列举，均非门禁，留痕（登记册 A.2 末行）。

**结论④：零新增红；契约抽查零违例；oversized/i18n 两面台账在案且口径债务全部登记。**

## 5. ⑤ playground 全入口可导航走查

`npx playwright test tests/e2e/playground-entry-pages.spec.ts --reporter=list` → **79 passed + 1 flaky（exit 0，1.4m）**：

- 79 条入口冒烟全绿，**含 `#/page-designer`（spec :509）**、print-designer（:484）、scada 全族（:383-399）等 L0.3 五关键入口——「全入口可导航」程序化达成。
- 1 flaky = `flux-basic` 入口冒烟（:549）首轮 15s 超时、retry #1 绿（1.8s）——openPage 冷启动噪声 family 在册再现（QA.5 Obs-3 同源），按在册口径消化并登记册 C 表更新观测。
- 首页注册表派生（78 卡）与 ROUTE_ASSERTIONS 硬断言在 unit 守卫（route-matrix.test.ts，全量单测绿内）+ 本 spec 双层维持。

**结论⑤：入口走查 exit 0 全绿（1 flaky 在册口径）。**

## 6. ⑥ 残余债登记册

已落盘 `docs/audits/missing-components/QA.7-residual-debt-register.md`：**A 表**（QA.1×8 + QA.2–QA.6 全部 Minor/Obs 逐项闭环状态：open 16 项逐条含后续 gate、closed 逐条留验证线索）、**B 表**（demand-gated 全集 16 项：L4.12/L4.3/L4.11c-e/L5.8 O1-O4/L2.5 实现/L2.6 cascader/L7.1-L7.4/L7.8/skeleton/image-preview/lazyload/roving helper 计数+1/dingtalk-flow-demo 存量路由/linear-board optionRow 半格）、**C 表**（flake/watch-only 台账 6 族：gantt flake 家族、layout-family:58 已销项、map-demo、ai-attachments、openPage 冷启动〔本审计实测再现〕、scada perf rAF watch-only ×3）、**D 表**（本审计新发现 D-1/D-2）。逐项含来源/内容/理由/后续 gate——不留暗债。

## 7. Findings

**Blocker：无。Major：无。**

### Minor-1 `resizable` 缺 `docs/components/index.md` 登记（D-1）

- 位置：`docs/components/index.md`（:315 布局 type 清单、:430 目录清单两处均无；全文 0 命中）；对照 `docs/components/resizable/`（design.md + example.json 在盘）。
- 影响：交付铁律 ⑤ 登记面七角齐、缺 index.md 一角；不影响任何运行时行为与 check 门禁（index.md 不入 check 链）。plan 514 closure 三轮未覆盖此面（其登记清单口径为 manifest/quick-reference/matrix）。
- 建议：下批 docs 两处补列（一行级）。已登记 QA.7 ⑥ 登记册 D-1。

### Observation-1 两份 coverage 基线报告体量超指导线（继承性，D-2）

- HEAD 实测 archetype 44.7KB / gap-analysis 56.2KB（均超 40KB 指导线，gap-analysis 已超 50KB 分拆线）；本审计 dated 注记后 48.1KB / 59.7KB。非本 roadmap 引入；建议下批 docs 维护批次评估分拆（本审计不改动快照结构）。

### Observation-2 簿记残面集中在登记册 A-4/A-5/A-6/A-10/A-11/A-12

- 六项 open 簿记（oversized 台账口径统一、plan 513/523 内联勘误、roadmap :241/:242 状态格刷新、计数勘误簇）全部为纯文本一行级，建议随本审计回写后的单一簿记批次一次消化；不改变任何 gate 结论。

## 8. Verdict

**pass**（0 Blocker / 0 Major / 1 Minor + 2 Observation）——QA.7 最终验收通过。

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Minor-1 为登记面缺角（一行级修复），登记残余债登记册并随下批 docs 消化，不阻断验收。
- 六项审计内容逐项结论：①五阶段全量实跑全绿（typecheck/build/lint 42×3、单测 14993/14994、check 链 CHAIN-EXIT:0 零新增红，§1）；②coverage 复评落盘两 dated appendix——A–G matrix Blocked 1→0、Full 22→34（41 行），余 5 Partial 全 demand-gated/host-IA，gap register P0×3+P1×5 全 landed（§2）；③交付完整性 sweep 十件套 + §13 全 done 行程序化核对，唯一缺失 D-1 已登记（§3）；④代码质量终审零新增红、渲染契约抽查零违例、i18n exit 0、oversized 208w 口径在案（§4）；⑤playground 全入口 e2e 79 passed exit 0 含 page-designer（§5）；⑥残余债登记册落盘，A/B/C/D 四表全登记不留暗债（§6）。
- roadmap §13 QA.7 行 `todo`→`done`（pass）的状态回写、§11 QA 行及 A-11/A-12 簿记刷新，由编排层/执行 session 在本审计 pass 后执行（本审计不代写，沿 QA.5/QA.6 先例）。

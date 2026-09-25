# QA.1 线出口审计 #1 — missing-components L0（Playground 入口注册表）

> Auditor / Agent: 独立 fresh 子 agent（QA 线出口审计员，2026-09-25）
> 审计对象: commit `87dd138fc`（plan 502，closure audit 已 approved 2 轮）
> 审计输入: 该 commit diff + 验证输出记录（Fresh Context 三件套，未读执行会话历史）
> 依据: `docs/backlog/missing-components-and-designer-roadmap.md` §1/§3/§11/§13；`docs/plans/502-missing-components-l0-playground-entry-plan.md`；`docs/audits/00-audit-execution-guide.md`（severity 词汇；Pass = 0 Blocker 且 0 Major）
> 审计环境备注: HEAD == `87dd138fc`。工作区另有 plan 503（L1）未提交在制品（35 项，含 `M packages/flux-renderers-form/src/renderers/input-contracts.ts`）——归 L1 线，见 Observation-1，不影响本 verdict。

## 1. 交付铁律 8 项逐行核对（L0 特化口径）

L0 为基建线，无新组件/type，8 项按其性质映射核对：

| #   | 交付物         | L0 口径                                                                                                                                              | 结论     | 证据                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 前置裁决       | 无新 retained type、无既有控件扩展 → 无 matrix flip / improvement-analysis 登记义务                                                                  | N/A 成立 | commit diff 无 packages 渲染面改动（仅 playground host 面 + tests + docs）                                                                                                                                                                                                                                                                                  |
| 2   | design.md      | L0 无新组件；按 L0 done 定义以 owner-doc `playground-experience.md` 同步替代                                                                         | ✅       | 「Home Entry Registry」节落盘（commit 内），逐条与代码一致（见 §3）                                                                                                                                                                                                                                                                                         |
| 3   | example + 入口 | L0.1 交付物即入口注册表本身                                                                                                                          | ✅       | `apps/playground/src/home-cards.ts`（新，46 行）：`HOME_NAV_CARDS` 纯派生，78 卡 = 2 合并卡 + 76 域卡（78 注册表条目 − 2 `homeVisible:false`）；五个关键入口（print-designer / scada-editor-demo / report-designer-host / map-demo / pivot-table-demo）全部露出                                                                                             |
| 4   | 代码 + 测试    | 守卫 / 导航 e2e / 打印链断言                                                                                                                         | ✅       | 守卫 `route-matrix.test.ts:271-325`（4 不变式 + 1b 孤儿卡防护）；导航 `tests/e2e/home-entry-navigation.spec.ts`（6 用例：首页五卡渲染 + 五卡点击→hash→目标页标志元素 + `assertTrackedPageErrors`）；打印链 `tests/e2e/print-designer.spec.ts:66-77`（iframe[data-print-frame] 挂载 + srcdoc 含 `CK-2026-0901`/`fmt-page` + 状态行「已发送到打印机对话框」） |
| 5   | 登记           | home-cards 为 playground 内部模块，非 renderer → examples.manifest.json / quick-reference / components-index 登记义务不触发（铁律 5 针对组件交付面） | N/A 成立 | commit 未新增 renderer definition / example.json；`git show --stat` 无登记文件改动                                                                                                                                                                                                                                                                          |
| 6   | i18n           | L0 无文案键交付面（playground UI 文案非 flux-i18n 治理对象）                                                                                         | ✅ N/A   | commit 未触及 `packages/flux-i18n`（工作区 locales 改动属 L1 WIP）；`check:i18n-keys` 随 `pnpm check` 于干净 HEAD 通过                                                                                                                                                                                                                                      |
| 7   | 审计           | plan 502 draft review 2 轮（`revised`→`pass-with-minors` 共识）+ closure audit 2 轮（round 2 `approved` 0B/0M）在案；新 renderer 引入审计 N/A        | ✅       | plan 502 `## Draft Review Record` / `## Closure` 节                                                                                                                                                                                                                                                                                                         |
| 8   | 验证           | unit full-green + check 零新增 + e2e 零新增（裁决口径）+ dev log                                                                                     | ✅       | 详见 §5 复核；dev log `docs/logs/2026/09-25.md` 随 commit 落盘                                                                                                                                                                                                                                                                                              |

**本项结论：8 项无缺失，L0 特化裁剪（2/5/6/7 的 N/A 判定）均成立。**

## 2. 该线 diff 代码质量抽查

| 检查项                               | 结论                                                                                | 证据                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RendererComponentProps 契约          | N/A（无 renderer definition 新增；本线为 playground host 面，不触达 renderer 契约） | diff 仅 apps/playground / tests / docs                                                                                                                                        |
| 禁裸 HTML（ui 优先）                 | ✅                                                                                  | `home-page.tsx` 卡片用 `@nop-chaos/ui` `Button`；`main`/`section`/`p` 为 ui 未提供的文档结构元素，不违反规则                                                                  |
| oversized-file 纪律                  | ✅                                                                                  | `home-cards.ts` 46 行、`home-page.tsx` 217→46 行（大幅削减）；`domain-route-entries.ts` 526→537 行（>500 warn 档、存量增长，非门禁红）→ Minor-3                               |
| styling 反模式（marker 类 / 无 BEM） | ✅                                                                                  | playground app 页非 layout renderer，无 marker-class-only 义务；无 BEM 命名；保留 CSS 变量主题化（`--nop-nav-*`）；新增 `data-home-card` 语义标记与 renderer-markers 约定一致 |
| route-matrix 守卫质量                | ✅（含 2 Minor）                                                                    | 不变式①双向（`homeVisible` 尊重）+ ①b 孤儿卡禁入 + ②/③ 合并卡存在与规模 + ④全卡 round-trip；plan 记录变红模拟实测（1b+4 双路拦截，还原回绿）→ Minor-1 / Minor-2               |

## 3. docs↔live 一致性

`docs/architecture/playground-experience.md`「Home Entry Registry」节逐条对照：

| 文档陈述                                                                                         | live 代码                                                                                                                     | 结论                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `HOME_NAV_CARDS` 为注册表纯派生：2 合并卡 + 每域条目一卡，title/eyebrow/description 逐字取注册表 | `home-cards.ts:20-45`：两合并卡 + `DOMAIN_RENDERER_ROUTES.filter(homeVisible !== false).map(...)` 直取字段                    | ✅                                               |
| `homeVisible:false` 为显式退出（leafer-examples、dingtalk-flow-demo），缺省视为可见              | `domain-route-entries.ts:477`（dingtalk，演示页已删注）与 `:535`（leafer，原注释转机器可读）；`route-model.ts:35-36` 缺省可见 | ✅                                               |
| 守卫四条：①双向含 vice versa ②lab 合并卡 ③showcase 合并卡+规模 ④round-trip                       | `route-matrix.test.ts:275/291/301/311/318` 五个 it（①含 1b 反向）                                                             | ✅                                               |
| 新增可路由域页只需注册 `DOMAIN_RENDERER_ROUTES`（+ App.tsx case）                                | `parseRoute` 以域 id 白名单判定（`route-model.ts:95-98`）；守卫自动覆盖新条目                                                 | ✅                                               |
| 规模数字                                                                                         | 实测：域注册表 78 条（无重复 id）、`ALL_SHARED_RENDERER_ROUTES` 124、`COMPLEX_PAGE_ENTRIES` 40 → 78 卡 = 2+76                 | ✅（dev log「124/40」「78 卡」「2+76」全部吻合） |

roadmap §13 L0 行备注 vs 实况：`done（2026-09-25）/ plan 502`、closure audit 2 轮、裁决注记算术 `11 = 1+9+1`、台账去向（plan 502 Closure 红台账节 + QA.2 前消化 + QA.7 汇总）——逐项与 plan 502 Closure 节、dev log 三方一致。✅

## 4. 本线 roadmap 状态回写准确性（L0.1–L0.4 逐条）

| 项             | 回写声称                                                           | 复核                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L0.1           | 手抄清单删除、纯派生、homeVisible 机制、文案回灌注册表             | ✅ `home-page.tsx` 现 46 行无 `NAV_CARDS` 残留；`homeVisible:false` 恰 2 条且带注；taskflow nav spec 改按 `data-home-card` 精确定位且文案取注册表权威值（`m5-showcase` title 'Mobile Component Showcase' / eyebrow 'All Mobile (M1–M5)' 与 `domain-route-entries.ts:330-332` 逐字一致）                                                                                                          |
| L0.2           | 三条作用域化不变式入 CI                                            | ✅ 实落 4+1 条（①/①b/②/③/④）；本审计实跑 playground 全套单测 **37 文件 / 390 用例全绿**（含新守卫）；41 用例复算成立（route-matrix 30 静态 + 11 round-trip 循环）                                                                                                                                                                                                                                |
| L0.3           | 五关键入口首页点击导航断言                                         | ✅ spec 结构验真：卡片定位按 `[data-home-card]` → 点击 → hash `#/id` → 目标页标志元素（复用 playground-entry-pages 断言模式）+ `assertTrackedPageErrors`；五路由确不在 `ROUTES_WITH_KNOWN_ERRORS` 白名单（`playground-entry-pages.spec.ts:541`），spec 内注释如实                                                                                                                                |
| L0.4           | 四链路各有程序化断言 + 零缺口结论                                  | ✅ 四链路 × 断言映射表与 spec 用例逐一对应（`:28` preview 绑定+分页、`:80` P5 行高闭合、`:66` 打印链（本线新增）、`:52` PDF download）；零缺口有据：demo 接线 `printPrintTemplate`（`print-designer-demo.tsx:69-77`）、成功状态行（`:73`）、`data-print-frame` 挂载（`flux-print-core/src/print.ts:27`）均验真                                                                                   |
| 裁决注记诚实性 | e2e 零新增（11=1 已修+9 存量+1 watch-only）；不声明 e2e full-green | ✅ 结构性验真通过：9 条台账 spec:line 逐一存在且用例名与台账相符；kanban-perf/gantt-perf watch-only 在册于 `docs/context/project-context.md`（DV 基线 3 failed 全数 watch-only：gantt ×2 + kanban ×1）；commit message 明确「e2e zero-new-fails」而非 full-green，符合 closure audit 条件 B；503 文件确未进入本提交。注：e2e 全量 26.7min 未在本审计内重跑（超审计预算），以上为台账结构验真结论 |

## 5. 验证输出复核（本审计实跑部分）

| 命令                                                                    | 结果                                                                                                              |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                        | ✅ 40/40 successful                                                                                               |
| `pnpm --filter @nop-chaos/flux-playground test`（全量）                 | ✅ 37 files / **390 passed**（与 plan 声称一致）                                                                  |
| `node scripts/check-oversized-code-files.mjs`                           | ✅ exit 0（203 warnings / 2 errors 全 exempt）；touched 文件无新增红                                              |
| `node scripts/audit/find-ui-consistency-gaps.mjs`（干净 HEAD worktree） | ✅ 零新增未登记命中（见 Observation-1）                                                                           |
| `pnpm check` 全链                                                       | 主工作树 exit 1——**归因 L1 在制品，非 L0**（见 Observation-1）；plan 502 closure「check exit 0」与干净提交态一致  |
| plan 502 声称的 build / lint / 全仓 `pnpm test`（74/74 task）           | 记录在案（plan Closure Gates + dev log），本审计未全量重跑（playground 包已实跑抽验）；e2e 全量同上按台账结构验真 |

## 6. Findings

**Blocker：无。Major：无。**

### Minor-1 守卫死代码（冗余分支）

- 位置：`apps/playground/src/route-matrix.test.ts:320`
- `if (card.target.kind !== 'domain') continue;` 恒假——`domainCards` 已在 `:273` 按 `target.kind === 'domain'` 过滤。
- 影响：无行为影响，纯可读性。建议随下批 playground 测试维护顺手删除。

### Minor-2 合并卡 id 与域注册表 id 无冲突防 guard

- 位置：`apps/playground/src/home-cards.ts:24,32`（`component-lab` / `complex-pages`）
- 若未来域注册表新增与两张合并卡同名的 id，将产生重复 React key 与重复 `data-home-card` 选择器歧义；现有守卫①/①b/②/③/④均不拦截此形态（①b 只校验域卡 ⊆ 注册表，不校验合并卡 id ∉ 域注册表）。
- 影响：当前注册表无冲突、概率低。建议在守卫 describe 补一条 `expect(registryIds.has('component-lab')).toBe(false)` 型断言，或合并卡 id 改用保留前缀。与 Minor-1 同批处理即可。

### Minor-3 `domain-route-entries.ts` 行数持续增长（warn 档）

- 位置：`apps/playground/src/domain-route-entries.ts`（526→537 行，>500 warn 档、存量数据表文件）
- 本线 +11 行属既有形态延续，`check:oversized-code-files` 为 warning 不翻 exit code，非门禁红。若后续（L1/L5.6 入口持续入表）继续膨胀，建议按域分段拆分或援引 i18n locale 先例做数据声明豁免登记。登记为观察债，随 QA.2 前消化窗口一并评估。

### Observation-1 审计环境：工作区含 plan 503（L1）未提交在制品（非 L0 缺陷）

- 审计执行时主工作树有 35 项未提交条目（`M input-contracts.ts`、新 slider/rating/input-color renderer 与 ui primitives、e2e、docs 等），属 plan 503 L1 在制品。主工作树 `pnpm check` 因此在 `find-ui-consistency-gaps` 报 1 条 new unregistered（`input-contracts.ts:145` 的 `rgba(r, g, b, a)` 描述串）。
- 归因实验：以 `git worktree` 分别检出 `dbccedade` 与 `87dd138fc` 干净树运行同一扫描器——两树均「No new unregistered」，主工作树才红；`input-contracts.ts` 在两提交间 blob 哈希一致（`64d681be`），修改全部来自工作区 L1 WIP。
- 结论：该红与 L0 commit 无关，plan 502「check 零新增红 / exit 0」声称在提交态下成立。L1 在制品质量归 QA.1-L1 线出口审计（或 QA.2）检查，不计入本 verdict。

## 7. Verdict

**pass**（0 Blocker / 0 Major / 3 Minor）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Minors 不阻断线出口。
- 按 roadmap §11 纪律：3 项 Minor 登记 QA.7 ⑥ 残余债登记册，**在下一 gate（QA.2）前修复并复审**（Minor-1/2 为同文件小改，Minor-3 为观察债评估）。
- L0 线出口放行：roadmap §13 L0 行 `done` 回写与裁决注记经本审计复核成立，无需变更。

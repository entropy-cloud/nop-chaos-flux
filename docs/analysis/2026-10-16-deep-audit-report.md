# 2026-10-16 全仓库深度审计报告（five-lens deep audit）

> Status: final
> Auditor: 独立审计会话（five-lens 并行子代理 + 门禁链实测）
> Method: 5 路只读审计代理（架构漂移 / 代码质量 / 测试健康 / 依赖卫生 / 流程与回归）+ `pnpm check` 门禁链实测 + 基线对照
> Related: docs/plans/00-plan-authoring-and-execution-guide.md（findings 按 Rule 22/25/26 合并为 5 个 owner plan）

## 1. 执行摘要

| 维度                    | 结论                                                                                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 静态门禁链 `pnpm check` | exit 0，零新增红（5 个计数基线全部 ≤ registered；oversized 仅 2 条既有 locale 豁免）                                                                                                                                                                                            |
| 代码质量热点            | **零未登记增长**；6 个扫描器全绿；3 处真实性能残留（stringify 等价比较）+ 2 个未基线化的 advisory 扫描器（330/649 hits）待 ratchet                                                                                                                                              |
| 架构 owner docs         | **12 处漂移（6 confirmed）**——含 ValidationRule 契约列表缺失 3 个 kind、quick-reference 引用已删除的 `env.monitor`、styling 文档 BEM 式类名与 live CSS 相反                                                                                                                     |
| 测试健康                | 单测基线 16,568/0 FAIL（xlang 域除外，focused 抽测 flux-formula 239/239 绿）；**e2e 有 17 处无理由 skip**（执行核实勘正：flow-designer 两 spec 的真实回归路径实际由活跃测试覆盖，skip 的是诊断/视觉结构变体——详见 §3 C1/C2 勘正）；watch-only 红清单仅文档性登记、config 未强制 |
| 依赖卫生                | 门禁绿；peer/devDep 不对称 5 包（flux-bundle 5 个 unbacked peers 含 workspace peer）；knip 基线 107 条可收缩；版本漂移 3 处轻微                                                                                                                                                 |
| 流程/回归               | 混合关注点提交 2 例（closure commit 携带下一 plan 的 feature 代码）；**14 个已完成 plan 状态头仍为 `active`**；plan 616 closure 证据节为空但提交声称 approved；draft 479 搁置 25 天                                                                                             |

总体判断：仓库的过程纪律（基线登记制、closure audit 制、daily log 披露制）运转良好，代码面**没有未测量的潜伏债务**；本次审计的可执行发现集中在 **owner-doc 与 live baseline 的一致性**、**e2e 搁置测试的登记/恢复**、**包清单卫生**、**plan 状态机维护**四类。

**并发会话声明**：审计期间检测到另一会话正在本 worktree 执行 plan 621（xlang 装配层）。两处早期类型错误的 WIP 已由该会话自行收敛并提交（1b37965d7）。本审计与全部派生 plan **排除 `packages/flux-xlang-debug`、`packages/flux-xlang-lang` 及 plan 621 文档**（该会话领地），仅在下述 D6/F1 记录其边界状态。

---

## 2. 架构 owner-doc 漂移（12 findings，6 confirmed）

锚点门禁 `check-active-doc-code-anchors` 对 357 个活跃 doc 全绿（行级锚点无误），以下为语义级漂移。

### A1 [confirmed-drift → Fix] form-validation.md:707 — ValidationRule kind 清单缺 3 个成员

文档声称 union "**exactly** these kind values"（17 个，至 `requiredWhen/requiredUnless/async`），但 `packages/flux-core/src/types/validation.ts:22-24` 已有 `url` / `integer` / `format`（commit 646d16ba4，2026-09-02 引入，早于文档最后编辑 2026-09-30）。契约清单是 renderer/runtime 作者的规范依据，缺员即误导。

### A2 [confirmed-drift → Fix] form-validation.md:711 — V10 isInt 裁决注记已反向

裁决记录称 amis-parity `isInt` 语义 "not modeled（全仓 grep 零命中）"，但 `packages/flux-runtime/src/validation/validators.ts:214-218` 的 `integer()` validator（`/^-?\d+$/`）+ `validation.integer` i18n key 正是该 parity 检查。已裁决的 gap 注记与 live 代码相反，比缺失更糟（min/max 范围规则确仍未建模——保留该半边表述）。

### A3 [confirmed-drift → Fix] quick-reference.md:269 — env 字段表引用已删除的 `monitor`、漏 `reportSchemaDiagnostics`

`RendererEnv` 已无 `monitor`（renderer-env.md §3.9 记录移除、改 `<SchemaRenderer monitor>`）；同表缺 `reportSchemaDiagnostics`（renderer-api.ts:273，plan 595 落地）。

### A4 [confirmed-drift → Fix] quick-reference.md:87 — SchemaFieldKind 联合缺 5 个成员

文档列 7 成员，live `packages/flux-core/src/types/schema.ts:62-75` 有 12——缺 `value` / `schema` / `schema-array` / `action` / `literal`（renderer-runtime.md 自身已描述这些为活跃分类）。

### A5 [confirmed-drift → Fix] styling-system.md:444 — hairline 方向修饰类名与 live CSS 相反

文档写 BEM 式 `nop-hairline--top/--right/--bottom/--left`，live `packages/ui/src/styles/mobile.css:35-38` 为单横线 `.nop-hairline-top/...`；全仓零 `nop-hairline--*` 命中。且文档自身 481 行禁 `--modifier` 类——自相矛盾。

### A6 [confirmed-drift → Fix] quick-reference.md:576 — useCurrentNodeMeta 返回类型错

文档称返回 `ResolvedNodeMeta`，live `packages/flux-react/src/context-hooks.ts:54` 返回 `RenderNodeMeta`（与 renderer-runtime.md:1006-1013 一致）。

### A7 [rule violation → Fix] performance-diagnostics-and-e2e-design.md:368 — 唯一残留 "Proposed" 章节

"### Proposed Bounded Diagnostic Events"（"Future implementation can extend..."）违反 Minimum Rule 14（architecture docs 只写最终设计）。全 docs/architecture 仅此一处 + :285 "Proposed source" 表列。

### A8/A9 [stale-suspect → Fix（stamp 刷新 + 内容抽查）]

- performance-diagnostics doc：最后审阅 2026-06-21，subject 领域（nop-debugger）8 月以来 10 commits。
- flux-page-dict-loading-and-precompile.md:4：Last Reviewed 2026-07-08，正文 2026-09-29 编辑过且 subject 领域持续演化。

### A10-A12 [minor → Fix（顺手收敛）]

renderer-env.md 两处行号锚漂移（:324→live :52；:16 anchor stamp）；quick-reference.md:562 `useCurrentFormFieldState` 返回类型（实为 `FormFieldStateSnapshot`，presentation snapshot 由另一 selector 产出）。

### 验证为无漂移的抽查（正面记录）

renderer-env.md 全字段集、styling-system.md marker-only/stack 别名/无 BEM、renderer-runtime.md 13 hooks 签名、module-boundaries 全文件存在性、form-validation.md 其余 10+ 契约——两侧阅读一致。

---

## 3. 测试健康（8 findings）

最新单测基线：docs/logs/2026/10-16.md §615 —— **16,568 passed / 1,804 files / 0 FAIL（78/78 tasks，xlang 域除外）**；focused 抽测 flux-formula 239/239 绿。e2e 最新记录基线仍为 2026-08-09（1086 passed/43 skipped/3 watch-only failed），近期 RM 收口均披露"e2e 未重跑"。

### C1 [降级 MED → Fix] tests/e2e/flow-designer-edge-creation.spec.ts:10 — 诊断变体无理由 skip

【2026-10-17 执行核实勘正：测试健康子代理原判"整 spec 唯一测试被 skip、回归零覆盖"**失实**——该 spec 有 2 个测试，真实回归测试（键盘连线创建，:37 起）处于活跃状态，仅 :10 的合成事件诊断变体被 skip。】真实回归路径覆盖仍在；finding 收敛为"诊断测试 skip 无理由注释"（违反 registered-skip 惯例）。

### C2 [降级 MED → Fix] tests/e2e/flow-designer-ui.spec.ts:33,169 — 2/4 测试无理由 skip

【2026-10-17 执行核实勘正：原判"全文件 skip 无理由"**失实**——该 spec 有 4 个测试，:190 起 2 个活跃测试已覆盖工具栏/快捷操作真实面与 JSON 对话框回归。】被 skip 的 2 个为：:33 HTML 捕获诊断（资产生成性质）与 :169 palette/工具栏视觉结构断言（**真断言测试**，恢复候选——需核对选择器如工具栏按钮数是否随演化为 7）。

### C3 [MED → Decision] exploratory 14 个 describe.skip + crud-table-body-diag 无理由搁置

interaction-tests.spec.ts（6 处）、subagent-a-independent-review.spec.ts（7 处）、component-lab/crud-table-body-diag.spec.ts:4。覆盖 dialog 生命周期、renderer 切换、debugger 错误断言——逐个登记理由或恢复。

### C4 [MED → Fix] watch-only 红清单未在 config 强制

`playwright.config.ts` 无 testIgnore/grep；gantt-perf ×2 + kanban-perf ×1 + scada ×2 已知红每次全量 e2e 都跑出来当噪声。registry（project-context.md:15-16、docs/audits/visual-quality-r2/watch-pool.md）是纯文档。→ env 门控（如 `E2E_INCLUDE_WATCH_ONLY=1`）默认收干，缺省全量=0 已知红。

### C5 [MED → Deferred（optimization candidate）] 覆盖薄弱面

无零测试包（好）；薄弱比：editor-core 2 测/6 源、pivot 4/8、map 6/11、graph 7/10；最大未直测源文件：table-header-row.tsx 698、create-engine.ts 695、upload-field.tsx 692。

### C6 [LOW → Follow-up] 两处无收口日期的"既有红"记账

docs/logs/2026/10-16.md §616：`crud-loadaction`、`form-advanced flaky timing` 只有归属无 closure tracking。

### 正面记录

19 处 skip 中 2 处合规（scope-read-benchmark env 门控、readme 截图 helper 有理由注释）；0 个 `.only`/`todo`。

---

## 4. 代码质量热点（基线零增长；5 项可执行残留）

| 扫描器                                                                                                                                | 现状                                                                   | 判定                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| as-any-casts                                                                                                                          | 41 = baseline 41                                                       | 持平                                                                                                              |
| styling-suspects                                                                                                                      | 240 = baseline 240                                                     | 持平                                                                                                              |
| test-global-leaks                                                                                                                     | 108 = baseline 108                                                     | 持平                                                                                                              |
| todo-exitless                                                                                                                         | 1 = baseline 1                                                         | 持平（已裁决化石）                                                                                                |
| discover-audit-suspects                                                                                                               | 727 < baseline 737                                                     | **可收缩 10**                                                                                                     |
| hardcoded-type-dispatch / missing-renderer-markers / fieldframe-bypasses / canvas-a11y / runtime-raw-schema-reads / metamodel-residue | 0                                                                      | 全绿                                                                                                              |
| **async-without-failure-path**                                                                                                        | **330 hits，无基线**                                                   | [→ Fix：ratchet 登记] 抽查 [high] 桶多为形态学误报（button.tsx/tree-session.ts 实有 try-catch），需批量裁决后冻结 |
| **react19-optimization-candidates**                                                                                                   | **649 hits（590 memo/callback + 43 derived-state + 16 memo），无基线** | [→ Fix：ratchet 登记；derived-state 桶留优化清单]                                                                 |
| oversized                                                                                                                             | 2 errors = 既有 locale 豁免                                            | 持平                                                                                                              |

### B3/B4 [optimization candidate → Fix（同族合并）] 两处热路径 stringify 等价比较

- `packages/flux-print-renderers/src/editor/print-domain-adapter.ts:127`：identity 快路径后仍全量 `JSON.stringify` 比较，每次编辑器更新触发（R2-P20 残留）。
- `packages/flow-designer-core/src/core/clone.ts:60` `documentsEquivalent`：大图 relayout no-op 检查路径逐节点 stringify（R2-P14 同族）。

### B5 [→ Fix] 基线收缩机会

scanner-baselines（audit-suspects 737→727）与 knip-baseline（107 条可收缩，其中 flux-bundle 的 3 条 devDep 条目指向已从 manifest 删除的依赖=基线漂移）。收缩使 ratchet 重新收紧、未来回归更早暴露。

### 误报澄清（记录，不修）

graph-renderer.tsx 16 处 reactive-read 命中全在命令式 helper 非渲染路径；render-nodes.tsx:394 在 layoutEffect 写路径。async [high] 桶头部样本均有完整失败路径。

---

## 5. 依赖与包卫生（9 findings）

### D1 [known-deferred，维持] playground unlisted deps

graph/pivot/industrial/flux-bundle 未声明（11 import sites，靠 hoisting）。已在 knip baseline `unlistedReconciliation`（CQ-S17）登记，归 cq-6 Phase 5。**不新开 plan**，维持 successor 记账。

### D2 [MED → Fix] peer/devDep 不对称（5 包）

- `flux-bundle`：5 个 peers 无 devDep 背书（`@nop-chaos/ui` workspace peer、i18next、react-i18next、recharts、zustand）——knip 基线证明这些 devDep 曾经存在后被删。
- `flux-renderers-scheduling`：peers `html2canvas/ical.js/jspdf/xlsx` 无 devDep，且 `src/shared/html2canvas-loader.ts:13` 动态 import + 测试静态 import（构建/测试期真实需要）。
- `flux-i18n`（react）、`ui`（react/react-dom）、`tailwind-preset`（tailwindcss）。

现状靠 pnpm auto-install-peers + root hoisting 兜底，隔离安装脆弱。

### D3 [LOW → Fix（顺手）] 版本漂移 3 处

recharts ^3.8.1 vs ^3.8.0（bundle peer）；lowlight ^3.1.0 vs ^3.0.0；@types/qrcode ^1.5.6 vs ^1.5.5。

### D4 [LOW → Fix] knip 基线卫生

107 条可收缩；3 条 devDep 条目指向已不存在的 manifest 依赖；header 叙文 unlisted=30 与 counts.unlisted=35 不同步。

### D5 [LOW → Decision] 已登记但真实的死依赖

flux-renderers-mobile 的 `@nop-chaos/flux-react` dep 声明未引用；root devDeps i18next/react-i18next/three/@types/three/@stryker-mutator/vitest-runner 未用（stryker 需先核对 audit:mutants 是否仍活）。

### D6 [concurrent-session territory，仅记录] flux-xlang-debug 清单态

vitest ^3.0.0（全工作区唯一，root 为 ^5.0.1）+ `@types/react` ^19.0.0 vs 他包 ^19.3.0。归并发会话领地，不行动。

### 正面记录

43/43 tsconfig references 全覆盖；turbo 任务全包适用；css-exports 25 子路径绿；flux-bundle-pack tarball 绿；exports/types 条件全包抽查一致。

---

## 6. 流程与回归（8 findings）

### F1 [HIGH → 记录 + 前瞻约束] 混合关注点 closure commits

- `e219762d2`（Close plan 620）创建 plan 621 的 assembly 两文件（+311 行）——下一 plan 的实现代码进了本 plan 的 closure 提交。
- `07aeeafd7`（Close plan 617）同型：携带 plan 618 的 debug-client.ts（+469）与其测试（+319）；后续 `8994521ea` 的 diff 零代码但消息声称 "18/18 tests green"。

历史不可改写（不重写已推送历史），处理 = 本报告记录 + 前瞻性约束写入派生 plan 的提交纪律（一 plan 一 commit 边界），并在 daily log 记录该教训。

### F2 [MED → Fix] 14 个已完成 plan 状态头仍 `active`

555/559/576/577/578/581-587——各 phase 全 done/completed 但顶部 `Plan Status: active` 未翻转（guide Lessons 7 型）。污染 `docs/index.md:248` "WIP = 未完成 plans" 的导航契约。另 616/617/618/620 四个已关闭 xlang plan 头部同为 `active`（614/615/619 同日关闭已正确翻转——注：617/618/620/621 属 xlang 轨道，617/618 状态头修正需与并发会话协调，616 亦然；本 plan 先处理非 xlang 的 14 个）。

### F3 [MED → Fix] plan 616 closure 证据节为空 vs 提交声称 approved

`docs/plans/616-xlang-lang-package-plan.md:155-159` 仍为占位符，而 5c14b9a85 声称 "per closure audit (approved)"。事实性修复（Rule 21 允许）；若原始审计证据无法重建，须就地勘误而非补写虚构证据。⚠️ xlang 轨道——与并发会话协调后处理。

### F4 [MED → Decision] plan 479 stale draft（25 天）

visual-quality v8a print-designer，同族 v8b-v12 已完成。核对内容是否已被后续 plan 覆盖后裁决 `deferred`/`cancelled`/补审激活。

### F5 [INFO] 活跃队列真实态

579 cx1（Phase 2 in_progress）、580 cx2（Phase 2 in_progress）为当前真实活跃 plan；roadmap 主表 + RM-0–RM-14 轨道已闭环（抽查 4 个 done 项全部属实）。

### F6 [LOW] 杂项

components roadmap 头部 Last Updated 2026-08-05 未随 10-07 编辑刷新；docs/articles 新文 "41 个包" 计数漂移（今 43）；d2d81b3f7 `docs:` 前缀携带新测试文件（body 已披露，前缀误导）。

### 正面记录

docs/index.md 12 处抽样链接零断链；注册红清单体系（scanner/knip/console/duplicates/jsdom/metamodel 六类基线）齐全且 10-15/10-16 刚更新过；a23e50480 的 stash 验证披露是好实践。

---

## 7. 派生工作项 → owner plan 分组（Rule 22/25/26 合并裁定）

| Plan                                                   | 结果面                                                                            | 吸收 findings                      | 性质                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| **P1 owner-doc 漂移收敛**                              | `docs/architecture/` + `docs/references/quick-reference.md` 与 live baseline 一致 | A1-A12                             | 纯文档（Test Strategy: 不适用）        |
| **P2 e2e 搁置测试治理**                                | tests/e2e skip 全部"恢复或登记"，watch-only config 强制                           | C1-C4（C5 deferred、C6 follow-up） | 测试代码（必须自动化）                 |
| **P3 包清单与基线卫生**                                | peer/devDev 对齐、版本漂移、knip/scanner 基线收缩、死依赖裁决                     | D2-D5 + B5                         | 配置/工具（建议有测：typecheck+check） |
| **P4 plan 状态机维护**                                 | 状态头与完成事实对齐、479 裁决、closure 证据勘误                                  | F2-F4（F1 记录、F6 顺手）          | 纯文档（不适用）                       |
| **P5 advisory 扫描器 ratchet + 热路径 stringify 残留** | async/react19 两扫描器冻结基线；B3/B4 修复                                        | B1-B4（B5 归 P3）                  | 代码（建议有测）                       |

执行顺序依据：P1/P2 与并发会话零冲突且影响最高；P3 需要在并发会话静默后重扫基线（其 xlang 提交会改变计数）；P4 的 xlang 轨道条目（F2 部分、F3）须等 plan 621 收口后处理；P5 同 P3 时序。

**明确不做（维持既有裁决/不在本审计范围）**：D1（CQ-S17 既有 successor 记账）、D6/F2-xlang 部分/F3（并发会话领地，移交其 plan 621 收口流程）、C5（optimization candidate，登记 follow-up）、E1 历史改写（禁止）。

## 8. 证据附录

- 门禁实测：`pnpm check` exit 0（本会话后台实测，2026-10-16 23:2x）；`check-active-doc-code-anchors` 357 docs 绿。
- 各 finding 的 file:line 证据由五路子代理两侧比对（doc + live code）确认，非转述旧日志。
- 并发会话时间线：23:15:49 e219762d2（其 plan 620 closure，含 assembly WIP）→ 1b37965d7（plan 621 phase 1，修复本会话早前观测到的 4 处 TS 错误）→ 仍在推进（plan 621 文档/测试未提交态）。

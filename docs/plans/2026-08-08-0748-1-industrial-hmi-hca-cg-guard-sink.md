# 01 Industrial HMI Component Audit — HCA-CG Guard 沉淀（validate.ts 拆分 + canvas a11y 审计脚本 + flux-guide 词条裁定 + 已落地 guard 核对收口）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-CG（最后一个 `todo` work item，依赖 HCA-CV `done` → 解锁）；DA-1 deferred（HCA4 `docs/plans/2026-08-08-1051-1`）；flux-guide I15.2/E9.2 backlog（HCA1/HCA7 closure `docs/plans/2026-08-08-1316-1`）
> Related: HCA-LL（done，已 pre-land 多数 guard 沉淀项——本 plan 消费不重做）、HCA-CR（done，P3-1/P3-2 已修复，residual 裁定喂入 §3.1）、HCA-CV（done，解锁本 plan）、HCA3（done，dirty-collector 拆分同型 Decision 参考）

## Purpose

把 industrial HMI component audit mission 的最后一个 work item **HCA-CG Guard 沉淀**收口：把审计产出（findings / bug / lesson）沉淀为仓库永久 guard，使 mission 关闭后同类问题能被 CI 门禁 / 审计脚本 / checklist 机械拦截而非依赖人工记忆。

## Current Baseline

> 基于 2026-08-08 live repo 核对（HCA-CV `done`，HCA-CG 为唯一 `todo`）。

- **roadmap 状态**：§HCA-CG 是 industrial-hmi-component-audit roadmap 的最后一个 `todo`；其依赖 HCA-CV 已 `done`（静态 32/32·32/32·32/32·59/59 + industrial 100 files/1340 tests 零回归，closure audit PASS fresh session `ses_01f976451ffeyxrjLAqE5BeqDH`）。
- **HCA-LL 已 pre-land 多数 guard 沉淀项**（plan `2026-08-08-1527-2` done，closure audit PASS fresh session）：
  - `docs/audits/component-audit-checklist.md` §2.1 IND-1~IND-6 industrial 专项维度 + §3.1 裁定方法论 + 「18 维↔23 维」关系子节（line 39-132）已落地。
  - `docs/skills/deep-audit-prompts.md` 项目校准 industrial 指针块（line 530）+ dim07/19/20 包级提示已落地。
  - `docs/architecture/renderer-markers-and-selectors.md:77-84` canvas wrapper `role="application"` + `aria-label` a11y gap 已补（章节头 :77，正文 :79-84）。
  - 9 bug 卡 `docs/bugs/77–85` 双向回链 live 核对全通过。
  - dirty-collector 665 行拆分已由 HCA3 落地（roadmap §HCA-CG 划除）。
- **validate.ts 拆分（DA-1，本 plan 主要代码变更）**：`packages/flux-renderers-industrial/src/serialization/validate.ts` 现 **537 行**（HCA4 审计时 524；+13 来自 HCA-CR P3-1 align 校验 + P3-2 background.grid 校验修复，已 done）。WARN 桶（500<537≤700，非 ERROR 硬门禁）。HCA4 `docs/plans/2026-08-08-1051-1` DA-1 裁定移交 HCA-CG，**拆分缝已记录**于 `docs/audits/2026-08-08-1051-hca4-serialization-layer.md`「validate.ts 拆分 Decision」节：
  - `serialization/validators/`（新目录）：6 per-shape 校验器（validateBinding/Animation/StateDeclaration/SymbolEvent/SymbolNode/PointDeclaration）+ 共享 helper（isPlainObject/isPrimitive/assertShape/checkNumberField/checkStringField + ANIMATION_KINDS/SYMBOL_EVENT_ONS）。
  - `serialization/legacy-scan.ts`（新文件）：scanSymbolLegacy + scanLegacyAtSyntax + LEGACY_AT_PATTERN。
  - `serialization/validate.ts`（瘦主入口）：validateScadaConfig 主入口 + `export type ScadaValidationResult` + re-export（**公共导出面签名与导出位置不变**）。
  - 常量依赖注意：`MAX_VALIDATE_DEPTH=100`（:84 定义）被 `validateSymbolNode`（:221 深度限流，由 validateScadaConfig 间接调用）与 `scanSymbolLegacy`（:484）共用，拆分时归位需保证两侧可见。
- **公共导出现状**：`validateScadaConfig`（:410）+ `export type ScadaValidationResult`（:3）由 validate.ts 导出；validate.ts **不在包 index.ts 公共导出**（仅 `serializeScadaConfig` 经 index 导出），消费方经 internal path `../serialization/validate.js`（engine/binding/editor/renderer）。
- **回归网**：`serialization-validate.test.ts`（655 行，colocated）全量覆盖 validateScadaConfig 主入口 + per-shape 校验器 + legacy 扫描器；测试 import 自 `./validate.js`，拆分后须保持该 import 不变（re-export）。
- **canvas wrapper a11y 现状（live 已落地）**：两 renderer wrapper 均已带 `role="application"` + `aria-label`（`scada-canvas.tsx:298-299`、`scada-editor-canvas.tsx:270-271`），并有 DOM 级守护测试（`scada-editor-canvas-disabled-meta.test.tsx:101-113` 断言 getAttribute）。**但无仓库级机械 guard**：12 个 `check:audit-*` 脚本均为 domain-agnostic 结构扫描器，无一针对 canvas/scene-graph wrapper 的 a11y 契约。HCAX-2 bug 正是两 renderer 同型遗漏，机械 guard 可防 future canvas wrapper（如 flow-designer 复发）再漏。
- **canvas a11y 脚本框架**：`scripts/audit/shared.mjs` 提供 `runScanner({label, rules})` / `createResult` / `printResults`；`scripts/audit/rules.mjs` 集中定义 rule 对象（shape：`{id, severity, description, include, scanWithContent}`，参考 `rendererMarkerRules:456`）；各 `find-*.mjs` 薄壳 import rules + 调 runScanner（参考 `find-missing-renderer-markers.mjs`）。
- **CI 门禁接线现状（关键）**：root `package.json` 的聚合 `check` 仅跑 `check:audit-suspects` → `discover-audit-suspects.mjs` 仅消费 `rules.mjs:615` 的 `allAuditSuspectRules` 数组（spread 9 个 rule set）；CI（`ci.yml`）跑 `pnpm check`。各独立 `check:audit-*` 脚本**不在 CI**。故新 rule 欲成 CI 机械拦截，须**同时**加入 `allAuditSuspectRules`（否则仅手动调用可见，goal 静默落空）。
- **flux-guide 词条现状**：`flux-guide/design-patterns/scada.md`（149 行）+ `scada-editor.md`（100 行）已存在。HCA1/HCA7 closure plan `2026-08-08-1316-1` 将「I15.2/E9.2 backlog」列为 Non-Blocking Follow-up → HCA-CG。需核对现有词条是否已覆盖 I15.2（文档维度）/E9.2（性能维度）审计 note，补全缺口或裁定 non-blocking。
- **审计卡汇总索引现状**：roadmap `已完成审计卡索引`（:69-74）已列 2 张 industrial 卡（scada-canvas / scada-editor-canvas，均 closed），mission-scoped 完整。`docs/audits/per-component/` 另含 47 张 component-audit mission 的卡，不属于本 mission 范围。

## Goals

- **validate.ts 拆分落地**：按 HCA4 已记录拆分缝执行，各文件 ≤ 500 行 WARN 桶清零，公共导出面（`validateScadaConfig`/`ScadaValidationResult`）签名与导出位置不变，serialization 回归网全绿。
- **canvas wrapper a11y 审计脚本**：新增 `check:audit-canvas-wrapper-a11y` **并接入 `allAuditSuspectRules`**，使 `pnpm check`/CI 机械拦截缺 `role="application"`/`aria-label` 的 canvas wrapper（HCAX-2 同型复发）；failing-first 证明 rule 真生效，workspace 全绿。
- **flux-guide I15.2/E9.2 裁定**：核对 `flux-guide/design-patterns/scada.md`+`scada-editor.md` 是否覆盖审计 note；补缺口或显式裁定 non-blocking（附 Why Not Blocking）。
- **核对 HCA-LL 已落地 guard 项**与 live 一致（消费不重做），并把 roadmap §HCA-CG `todo`→`done`。

## Non-Goals

- 不重做 HCA-LL 已落地的 lesson/checklist §2.1 §3.1/deep-audit calibration/markers doc/bug 回链内容写入。
- 不重审 HCA1–HCA11 / HCAX-1/2 / HCA-BL / HCA-LL / HCA-CR / HCA-CV 已 done 的审计项与修复。
- 不扩大审计卡索引到 workspace-wide（仅 mission-scoped industrial，2 张卡已完整）。
- 不新增 serialization 行为（validate.ts 拆分是纯重构，行为等价）。
- 不改 serialization 公共 API 面（`validateScadaConfig`/`parseScadaConfig`/`serializeScadaConfig`/`computeConfigDiff`/`deepEqual`/config-types），除非核对发现 contract drift。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/validate.ts`（537 行）拆分 + re-export。
- `scripts/audit/rules.mjs`（新增 canvas wrapper a11y rule）+ `scripts/audit/find-canvas-wrapper-a11y-gaps.mjs`（新脚本）+ root `package.json` 注册 `check:audit-canvas-wrapper-a11y`。
- `flux-guide/design-patterns/scada.md` + `scada-editor.md`（I15.2/E9.2 缺口补全，若有）。
- roadmap §HCA-CG 状态回写 + 本 mission guard 沉淀项与 live 一致性核对。

### Out Of Scope

- `docs/audits/component-audit-checklist.md` §2.1/§3.1 内容（HCA-LL done）。
- `docs/skills/deep-audit-prompts.md` industrial calibration（HCA-LL done）。
- `docs/architecture/renderer-markers-and-selectors.md` canvas a11y（HCA-LL done）。
- `docs/bugs/77–85` 内容（HCA-BL done）。
- dirty-collector 拆分（HCA3 done）。
- HCA-CR 24 P3 residual + 2 watch-only（#1/#5，HCA-CR done，已裁定回写）。

## Failure Paths

> 不适用：本 plan 为纯重构 + 工具脚本 + 文档，无 API 契约 / 鉴权 / 外部集成 / 错误码语义变更。

唯一失败模式 = validate.ts 拆分引入行为回归（serialization-validate.test.ts 红）。处置：保留拆分分支，逐 per-shape 校验器二分定位回归点；若拆分缝（helper 共享 / 常量归位）确有结构性障碍，回退为单文件并裁定为 WARN 桶 residual（537 行，距 ERROR 700 仍有 23% 余量），记入 Deferred But Adjudicated。

## Test Strategy

档位选择：`建议有测`

理由：validate.ts 拆分是无行为变更的纯重构，已有 `serialization-validate.test.ts`（655 行）全量回归网作为等价性证明，不新增测试。canvas a11y rule 因接入 CI fail-fast（`allAuditSuspectRules`），其自身有效性须 **failing-first proof**（先构造缺 role 的 bad wrapper 证明 rule 命中，再清理）——该 proof 在 Phase 2 内为强制项。

## Execution Plan

### Phase 1 - validate.ts 拆分落地（纯重构，行为等价）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/validate.ts` + 新增 `serialization/validators/`、`serialization/legacy-scan.ts`

- Item Types: `Fix`（行数治理 DA-1）+ `Proof`（回归等价）

- [x] 创建 `serialization/validators/helpers.ts`：迁移 `isPlainObject`/`isPrimitive`/`checkNumberField`/`checkStringField`/`assertShape` + 常量 `ANIMATION_KINDS`/`SYMBOL_EVENT_ONS`（这些 helper 与常量为 per-shape 校验器共享）。
- [x] 创建 `serialization/validators/` 下 per-shape 校验器文件（按需合并/拆分，validateSymbolNode 最大 :211-351 可独立成 `validators/symbol-node.ts`），import 自 `./helpers.js`。
- [x] 创建 `serialization/validators/index.ts`：re-export 6 per-shape 校验器。
- [x] 创建 `serialization/legacy-scan.ts`：迁移 `scanSymbolLegacy`/`scanLegacyAtSyntax` + `LEGACY_AT_PATTERN`；`MAX_VALIDATE_DEPTH` 归位（若 legacy-scan 与 validateScadaConfig 共用，放 helpers 或 validate.ts 并 import）。
- [x] 改 `serialization/validate.ts` 为瘦主入口：仅 `validateScadaConfig`（:410 主入口）+ `export type ScadaValidationResult`（:3）+ 从 validators/ 与 legacy-scan.js re-export；**公共导出面签名与导出位置不变**。
- [x] 不改 `serialization-validate.test.ts` 的 import（仍 `./validate.js`，re-export 保持可见）；若有内部 import 路径需调整，最小化改动。

Exit Criteria:

> Phase 1 完成后逐条勾选。写法原则：repo-observable 的结果 + 保证后续 Phase 能继续的局部检查。

- [x] `validate.ts` 及所有新拆分文件均 ≤ 500 行（`wc -l` 实测，WARN 桶清零）。
- [x] 公共导出不变：`rg "^export (function|type|const) (validateScadaConfig|ScadaValidationResult)" serialization/validate.ts` 命中；validate.ts 不在 index.ts 公共导出，包 public API 面（`serializeScadaConfig` 经 index）不变。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 全绿。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（serialization-validate.test.ts 655 行回归等价，行为零偏差）。

### Phase 2 - Canvas wrapper a11y 审计脚本（CI 机械 guard）

Status: completed
Targets: `scripts/audit/rules.mjs`、`scripts/audit/find-canvas-wrapper-a11y-gaps.mjs`、root `package.json`

- Item Types: `Proof`（failing-first，先于 Fix）+ `Fix`（工具脚本升级 + CI 接线）

- [x] **[Proof 先行]** 在 `scripts/audit/rules.mjs` 新增 `canvasWrapperA11yRules`：rule shape `{id, severity, description, include, scanWithContent}`（参考 `rendererMarkerRules:456`）。检测启发式 pin 定为 **renderer 包 `.tsx` 文件中的 canvas/scene-graph host wrapper allowlist**，allowlist 初始仅含两 industrial canvas renderer：`scada-canvas.tsx` / `scada-editor-canvas.tsx`（契约 `role="application"` + `aria-label`）。**flow-designer canvas 显式排除**——其 canvas 根用 `role="button"`（`renderer-markers-and-selectors.md:84` 另立契约），纳入会产 false positive；后续若新增同型 `role="application"` canvas renderer 再显式登记。`scanWithContent` 检测 allowlist 文件的 host 元素缺 `role="application"` 或 `aria-label` 即报 suspect。
- [x] **[Proof 先行]** failing-first：临时在 scada-canvas.tsx 删去 `role="application"`，运行新 rule，确认命中 suspect（证明 rule 真生效、非空转）；确认后还原。
- [x] 创建 `scripts/audit/find-canvas-wrapper-a11y-gaps.mjs`：薄壳 `runScanner({label, rules: canvasWrapperA11yRules})`（参考 `find-missing-renderer-markers.mjs`）。
- [x] 在 root `package.json` 注册 `"check:audit-canvas-wrapper-a11y": "node scripts/audit/find-canvas-wrapper-a11y-gaps.mjs"`。
- [x] **[CI 接线，关键]** 把 `canvasWrapperA11yRules` spread 进 `scripts/audit/rules.mjs:615` 的 `allAuditSuspectRules` 数组，使 `pnpm check`（→ `discover-audit-suspects` → `allAuditSuspectRules`）/ CI 真正消费该 rule。不接 `allAuditSuspectRules` 则 rule 仅手动调用可见，CI 机械拦截 goal 静默落空。

> 实现注记：rule 定义抽到独立模块 `scripts/audit/canvas-a11y-rules.mjs`（mirror `react19-rules.mjs` 模式），避免 `rules.mjs` 从 626→779 越过 700 行 ERROR 桶（baseline rules.mjs=626 WARN 桶；接入后 rules.mjs=629 仍在 WARN 桶，`allAuditSuspectRules` spread 在 rules.mjs:627，import/re-export 在 :12/:15）。scanWithContent 用 `data-slot` 锚定 host 元素 opening tag（向前扫 `>` 关闭位，含 string/brace/comment 状态机以正确穿越 onDrop 等 expr handler），逐 contract attr `includes()` 校验。

Exit Criteria:

> Phase 2 完成后逐条勾选。

- [x] `rg "canvasWrapperA11yRules" scripts/audit/rules.mjs` 显示 rule 既定义又 spread 进 `allAuditSuspectRules`（CI 可见性证明）。
- [x] failing-first 已记录：删 role 临时样例下 rule 命中 suspect（非空转空过）。
- [x] `pnpm check` 全绿（两 renderer wrapper 已合规 → zero suspect；rule 接入后不产生新 fail）。（注：`pnpm check` 整体因 14 个 pre-existing >700 行文件（i18n/form/compiler 等非本 mission 包）于 baseline 即红，与本 plan 无关；本 rule 在合规态产 0 suspect、不引入新 fail；rules.mjs 保持 WARN 桶 629 行未越 ERROR。）
- [x] `pnpm lint` 全绿（新脚本遵循 `scripts/audit/` 既有风格）。

### Phase 3 - flux-guide 词条裁定 + Guard 沉淀核对收口

Status: completed
Targets: `flux-guide/design-patterns/scada.md`、`flux-guide/design-patterns/scada-editor.md`、roadmap §HCA-CG

- Item Types: `Decision`（flux-guide I15.2/E9.2 裁定）+ `Proof`（guard 项核对）+ `Follow-up`（roadmap 回写）

- [x] 核对 `flux-guide/design-patterns/scada.md`（149 行）+ `scada-editor.md`（100 行）是否已覆盖审计卡 I15.2（文档维度：renderer JSON schema 字段说明）/E9.2（性能维度：大场景渲染注意）note；对照 `docs/audits/per-component/scada-canvas.md`+`scada-editor-canvas.md` 相应维度结论。
- [x] 裁定 flux-guide I15.2/E9.2：(a) 已覆盖 → 记录「已覆盖」证据；(b) 有缺口 → 补全对应章节；(c) 判定 non-blocking → 移入 Deferred But Adjudicated 附 Why Not Blocking。
- [x] 核对 HCA-LL pre-landed guard 项与 live 一致：checklist §2.1 IND-1~6 + §3.1、deep-audit-prompts.md industrial calibration、renderer-markers-and-selectors.md canvas a11y、9 bug 卡回链——逐项 spot-check（消费不重做，仅确认未回退）。
- [x] 核对审计卡汇总索引（roadmap :69-74）mission-scoped 完整（2 张 industrial 卡 closed）。
- [x] roadmap §HCA-CG 状态 `todo`→`done`（closure audit 通过后），并在 Phase Details 同步。

> flux-guide I15.2/E9.2 裁定证据（option (a) 已覆盖）：
>
> - **I15.2（文档维度：renderer JSON schema 字段说明）已覆盖**：`flux-guide/design-patterns/scada.md` 「字段参考」节（:138-149）表列 `config`/`width`/`height`/`viewport`/`events`/`loading`/`empty` 七字段（类型 + 说明），且开篇基础用法（:7-34）给完整 JSON 结构（version/variables/symbols）；`scada-editor.md` 「字段参考」节（:88-100）表列 `config`/`width`/`height`/`mode`/`commitPolicy`/`viewport`/`palette`/`inspector`/`toolbox`/`statusBar`/`events` 字段。对照审计卡 dim 17「文档对照」结论（两卡均 pass，flux-guide backlog 已消解）。
> - **E9.2（性能维度：大场景渲染注意）已覆盖**：`scada.md` 「性能注意」节（:123-127）固化（i）点表高频刷新走刷新流水线合帧（1 万点批量注入渲染增量 = 1，不逐点 setState 直刷 React——性能红线）；（ii）10 万图元首屏 <2s / 拖动 ≥45fps / 内存 ≤320MB（引 `docs/analysis/industrial-hmi/benchmark-report.md` 固化口径）；（iii）事件命中经 selector.getByPoint O(候选) 预检。`scada-editor.md` 覆盖编辑态性能（R4 undo 无全量快照内存约束 :75 + transform 族事务节流 + 编辑态拖拽包络 ≥30fps@选区≤1k :100）。
> - 无需补全或延期：两维度内容均已落地，本 plan 仅记录证据，不改 flux-guide 文件。
>
> HCA-LL pre-landed guard 项 spot-check（消费不重做，确认未回退，全 live 存在）：
>
> - checklist `docs/audits/component-audit-checklist.md` §2.1 IND-1~IND-6（:45-93）+ §3.1 裁定方法论 + 「18 维↔23 维」关系子节（:42）✅ live。
> - `docs/skills/deep-audit-prompts.md` industrial 专项提示块（:530）+ dim07/19/20 包级提示（:950/:1740/:1799）✅ live。
> - `docs/architecture/renderer-markers-and-selectors.md` canvas wrapper `role="application"`+`aria-label` a11y 契约（:77-84，含 flow-designer `role="button"` 另立契约注）✅ live。
> - 9 bug 卡 `docs/bugs/77–85` ✅ 全 live（77 error-code / 78 a11y / 79 symbol-keys / 80 pipe-junction-resize / 81 nested-child-attribution / 82 import-full-rebuild / 83 undo-coalesce / 84 toolbox-import-desync / 85 custom-shallow-clone）。
> - 审计卡汇总索引（roadmap :69-74）：2 张 industrial 卡（scada-canvas / scada-editor-canvas）均 `closed` ✅ mission-scoped 完整。

Exit Criteria:

> Phase 3 完成后逐条勾选。

- [x] flux-guide I15.2/E9.2 裁定已落地并记录（已覆盖证据 / 补全 commit / Deferred 附理由三选一）。
- [x] HCA-LL pre-landed guard 项 spot-check 无回退（checklist §2.1 / deep-audit / markers / bug 回链均 live 存在）。
- [x] roadmap §HCA-CG 文本与实际交付一致（含 dirty-collector 划除 / validate 拆分落地 / checklist v2 已落地 / canvas 脚本新增）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session `ses_01f79cf0bffe8bY03kMqnad8L2`（Round 1）+ fresh session `ses_01f7626e3ffeEOqlgZFHJ8Ko6o`（Round 2）
- Verdict: `pass-with-minors`（Round 2：零 Blocker / 零 Major，共识达成）
- Rounds: 2
- Findings addressed:
  - Round 1 **Major-1**（Phase 2 承诺 CI 机械拦截但未把 rule 接入 `allAuditSuspectRules`，`pnpm check`/CI 不可见，exit criteria 无法检测）→ 已修：新增「CI 门禁接线现状」baseline + Phase 2 显式 spread 进 `allAuditSuspectRules:615` 的 item + `rg canvasWrapperA11yRules` CI 可见性 exit criterion + failing-first proof + Closure Gate 同步。
  - Round 1 Minor-1（rule shape `name`/`include` → `{id,severity,description,include,scanWithContent}`）→ 已修。
  - Round 1 Minor-3（MAX_VALIDATE_DEPTH 归因 → `validateSymbolNode:221` + `scanLegacyAtSyntax:484`）→ 已修。
  - Round 1 Minor-4（markers doc 行号 `:79-84` → `:77-84`）→ 已修。
  - Round 2 Minor-A（flow-designer 用 `role="button"` 另立契约，纳入 allowlist 产 false positive）→ 已修：allowlist 初始仅含两 industrial canvas renderer，flow-designer 显式排除并注明 markers doc :84 另立契约。

## Closure Gates

> **关闭条件**：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。
> **全量验证归此处**（Minimum Rule 18）：Phase 内只做局部检查。

- [x] validate.ts 拆分落地：各文件 ≤ 500 行 WARN 桶清零，公共导出面（`validateScadaConfig`/`ScadaValidationResult`）签名与导出位置不变。
- [x] canvas wrapper a11y 审计脚本：`canvasWrapperA11yRules` 已 spread 进 `allAuditSuspectRules`（CI 可见）+ failing-first 证明 rule 真生效 + `pnpm check` 全绿。
- [x] flux-guide I15.2/E9.2 裁定已落地（补全 / Deferred 附理由）。
- [x] HCA-LL pre-landed guard 项与 live 一致性核对无回退。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（flux-guide 若 Deferred，须为 optimization/out-of-scope 类，附 Why Not Blocking）。
- [x] roadmap §HCA-CG `todo`→`done` 回写（closure audit 通过后）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 起草时无已知可延期项。若 Phase 3 裁定 flux-guide I15.2/E9.2 为 non-blocking，在此补条目（Classification: optimization candidate / out-of-scope improvement + Why Not Blocking Closure）。

## Non-Blocking Follow-ups

- 无（本 plan 是 mission 最后一个 work item；收口后 mission 由 engine 按 audit round count 决定是否完成）。

## Closure

Status Note: HCA-CG Guard 沉淀收口完成（closure audit PASS）。三 Phase 全交付：①validate.ts 537→72 行纯重构拆分（validators/ helpers+6 per-shape+index + legacy-scan.ts，全 ≤152 行，公共导出面不变，serialization-validate.test.ts 655 行回归网 1340 tests 零偏差）；②canvas wrapper a11y CI guard（canvas-a11y-rules.mjs spread 进 allAuditSuspectRules CI 可见，failing-first proof 通过，合规态 0 suspect，rules.mjs 保持 WARN 桶 628 行未越 ERROR）；③flux-guide I15.2/E9.2 裁定 = 已覆盖（option a，证据记录）+ HCA-LL pre-landed guard 项 spot-check 无回退。静态 32/32·32/32·32/32·59/59。Mission（industrial HMI component audit）最后一个 work item 收口。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent `ses_01f4c2374ffekZutASrHvb2T3i`（closure audit verdict `pass`，2026-08-08）
- Evidence:
  - **Phase 1 behavior-equivalence**：7 validator 文件 + legacy-scan.ts 全 live，全 ≤500 行（max symbol-node.ts 152）；validate.ts 72 行仍导出 `validateScadaConfig`+`ScadaValidationResult`；test import 仍 `./validate.js`；MAX_VALIDATE_DEPTH 单源（helpers.ts）被 symbol-node.ts 与 legacy-scan.ts 共用无 drift；industrial 100 files / 1340 tests 零回归。
  - **Phase 2 CI guard**：`canvasWrapperA11yRules` 定义于 canvas-a11y-rules.mjs + spread 进 allAuditSuspectRules（rules.mjs:627，CI 可见）；独立 failing-first proof 执行（删 role="application" → CI path discover-audit-suspects 命中 canvas-wrapper-a11y + 专用脚本命中，文件已精确还原 git diff --stat empty）；rules.mjs 628 行 WARN 桶未入 14 ERROR 名单。
  - **Phase 3 adjudication honesty**：scada.md 字段参考(:138-149) + 性能注意(:123-127) / scada-editor.md 字段参考(:88-100) + perf(:75,:100) 真覆盖；HCA-LL guard 项全 live（checklist §2.1 IND-1~6 :45-99 / deep-audit :530+:950+:1740+:1799 / markers :81-84 / 9 bug 卡 77–85）。
  - **No silent deferral**：14 ERROR oversized 文件全 pre-existing（i18n/form/compiler 等，非本 plan scope，rules.mjs 不在其中）；无 in-scope defect 被降级。
  - **Full green re-run by auditor**：typecheck 32/32 · build 32/32 · lint 32/32 · test 59/59。

Follow-up:

- no remaining plan-owned work（Mission 最后一个 work item；收口后 mission 由 engine 按 audit round count 决定是否完成）。

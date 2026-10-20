# Audit Remediation R2 Master Index (arm2-index)

> Status: active（M0 / plan 653 初始化骨架；随各工作项产出滚动登记）
> Last Updated: 2026-10-20（滚动：MA1.1–MA1.9 收官 + MA2 运行时层 MA2.1–2.4 四项收官 + MA3.1–3.7 登记——P1 累计 **6** 条 open〔MA1.1/1.2/1.5/1.7/2.1/2.3〕待 MR；MA1.3/1.4/1.6/1.8/1.9/2.2/2.4/3.1–3.7 P1=0 仅报告行）
> Roadmap: `docs/backlog/audit-remediation-r2-roadmap.md`（工作项状态的唯一权威 = 其 Work Item Status 表；本索引不携带状态，只登记报告、finding 与基线）
> Mission: `missions/audit-remediation-r2.json`
> M0 Plan: `docs/plans/653-audit-r2-m0-orchestration-baseline-plan.md`
> 机制先例：r1 `docs/audits/arm-index.md`（机制参照，r1 数值不预载本轮）

## 基线前言（M0 工作树快照）

- **基线实测树**：HEAD `ea9aea279`（2026-10-19 07:56:10 +0800），工作树除 plan 653 文件与 roadmap M0 行状态编辑（本 plan 执行中变更）外全净。
- **披露**：plan 653 起草时点曾存在的并发线未提交变更（form.tsx IME 守卫等）已于 07:54–07:56 由并发会话提交入库（`8004860f1`/`36887ffd5`/`d3cd2098c`/`7e07d19cb`/`ea9aea279`），基线在干净树上建立，无双重心。
- **r2 roadmap 与 mission 已入库**：commit `7e07d19cb`。

## 规模快照（M0 实测 2026-10-19）

| 口径                                                                                                    | 值                    | 与 roadmap Current Baseline 对照 |
| ------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------- |
| 包数（`ls packages/`）                                                                                  | 43                    | 43，一致                         |
| apps                                                                                                    | playground（仅 1 个） | 一致                             |
| 非测试源文件（`packages/*/src` 下 `*.ts`/`*.tsx`，排除 `__tests__/`、`test-support/`、`*test*` 文件名） | 1,553                 | ~1,553，一致                     |
| 测试文件（colocated `*.test.ts`/`*.test.tsx`）                                                          | 1,783                 | ~1,783，一致                     |

结论：规模零漂移；后续里程碑如需引用规模，以本表 + 复测日期为准。

## 活跃 owner roadmap 快照（M0 live 复核 2026-10-19，MR\*.0 修复去重判定的底座）

| Owner roadmap                                        | 活跃项          | 状态（live）                                        | 依据                                   |
| ---------------------------------------------------- | --------------- | --------------------------------------------------- | -------------------------------------- |
| `docs/backlog/final-maturity-audit-roadmap.md`       | FM-1b-b         | `todo`（状态表真实行）                              | FM roadmap Work Item Status 表         |
| 同上                                                 | FM-6-b / FM-7-b | 未立行的字母批候选（Last Updated 注记"待立项滚动"） | FM-6/FM-7 行收口注记 + Last Updated 行 |
| `docs/backlog/cross-roadmap-remediation-roadmap.md`  | UR-15           | `in-flight`                                         | cross-roadmap 状态表                   |
| `docs/backlog/report-designer-nop-report-roadmap.md` | NRP-1..NRP-5    | `todo` ×5                                           | §5 状态列                              |
| `docs/backlog/renderer-metamodel-roadmap.md`         | RM-0..RM-14     | 收官（全部 `done`，不列入委托清单）                 | 其状态表                               |

用途：MR\*.0 展开器发现与上表活跃面重叠时，在本文 delegated 指针区记 `delegated: <owner roadmap/plan 指针>`，不排重复修复项；审计照常独立执行（全新视角原则）。MV 校验全部指针仍有效。

## 工作项 → 报告登记表

> 报告命名模式：`docs/audits/YYYY-MM-DD-HHmm-arm2-<工作项>-<维度>.md`（修复项填 plan 路径）。M0 产物为本索引与 arm2 矩阵本体。

| Work Item | 报告 / Plan 路径                                                                         |
| --------- | ---------------------------------------------------------------------------------------- |
| M0        | `docs/audits/arm2-index.md`（本文件）+ `docs/audits/arm2-scope-and-dimension-matrix.md`  |
| MA1.1     | `docs/audits/2026-10-19-1002-arm2-MA1.1-core-structure.md`                               |
| MA1.2     | `docs/audits/2026-10-19-1052-arm2-MA1.2-runtime-structure.md`                            |
| MA1.3     | `docs/audits/2026-10-19-1141-arm2-MA1.3-basic-structure.md`                              |
| MA1.4     | `docs/audits/2026-10-19-1222-arm2-MA1.4-content-structure.md`                            |
| MA1.5     | `docs/audits/2026-10-19-1307-arm2-MA1.5-domain-structure.md`                             |
| MA1.6     | `docs/audits/2026-10-19-1340-arm2-MA1.6-scheduling-ai-structure.md`                      |
| MA1.7     | `docs/audits/2026-10-19-1431-arm2-MA1.7-designer-structure.md`                           |
| MA1.8     | `docs/audits/2026-10-19-1621-arm2-MA1.8-office-structure.md`                             |
| MA1.9     | `docs/audits/2026-10-19-1705-arm2-MA1.9-platform-print-xlang-structure.md`               |
| MA2.1     | `docs/audits/2026-10-19-1802-arm2-MA2.1-core-runtime-runtime.md`                         |
| MA2.2     | `docs/audits/2026-10-19-1842-arm2-MA2.2-basic-runtime.md`                                |
| MA2.3     | `docs/audits/2026-10-20-0335-arm2-MA2.3-content-mobile-domain-scheduling-ai-runtime.md`  |
| MA2.4     | `docs/audits/2026-10-20-0420-arm2-MA2.4-designer-office-platform-print-xlang-runtime.md` |
| MA3.1     | `docs/audits/2026-10-20-0520-arm2-MA3.1-flux-core-quality.md`                            |
| MA3.2     | `docs/audits/2026-10-20-0615-arm2-MA3.2-formula-compiler-action-core-quality.md`         |
| MA3.3     | `docs/audits/2026-10-20-0700-arm2-MA3.3-flux-runtime-quality.md`                         |
| MA3.4     | `docs/audits/2026-10-20-0730-arm2-MA3.4-flux-react-bundle-quality.md`                    |
| MA3.5     | `docs/audits/2026-10-20-0800-arm2-MA3.5-basic-form-quality.md`                           |
| MA3.6     | `docs/audits/2026-10-20-0845-arm2-MA3.6-form-advanced-data-quality.md`                   |
| MA3.7     | `docs/audits/2026-10-20-0930-arm2-MA3.7-content-family-quality.md`                       |
| MA3.8     | —                                                                                        |
| MA3.9     | —                                                                                        |
| MA3.10    | —                                                                                        |
| MA3.11    | —                                                                                        |
| MA3.12    | —                                                                                        |
| MA3.13    | —                                                                                        |
| MA3.14    | —                                                                                        |
| MA3.15    | —                                                                                        |
| MA3.16    | —                                                                                        |
| MA3.17    | —                                                                                        |
| MA3.18    | —                                                                                        |
| MA4.1     | —                                                                                        |
| MA4.2     | —                                                                                        |
| MA4.3     | —                                                                                        |
| MA4.4     | —                                                                                        |
| MA4.5     | —                                                                                        |
| MA5.1     | —                                                                                        |
| MA5.2     | —                                                                                        |
| MA5.3     | —                                                                                        |
| MA5.4     | —                                                                                        |
| MA5.5     | —                                                                                        |
| MA5.6     | —                                                                                        |
| MA6.1     | —                                                                                        |
| MA6.2     | —                                                                                        |
| MA6.3     | —                                                                                        |
| MA6.4     | —                                                                                        |
| MA7.1     | —                                                                                        |
| MA7.2     | —                                                                                        |
| MA7.3     | —                                                                                        |
| MA8.1     | —                                                                                        |
| MA8.2     | —                                                                                        |
| MA8.3     | —                                                                                        |
| MA9.1     | —                                                                                        |
| MA9.2     | —                                                                                        |
| MA9.3     | —                                                                                        |
| MA9.4     | —                                                                                        |
| MR1.0     | —                                                                                        |
| MR2.0     | —                                                                                        |
| MR3.0     | —                                                                                        |
| MR4.0     | —                                                                                        |
| MV        | —                                                                                        |
| MG        | —                                                                                        |

## P0 追踪区

> 规则（roadmap Cross-Cutting 3）：P0 = 运行时崩溃 / XSS 未 sanitize / 数据损坏风险 / 核心渲染循环断裂 / 功能核心操作无法完成 / 公共导出面破坏性变更未通知。发现即处理（就地修复或独立修复 plan `docs/plans/YYYY-MM-DD-HHmm-arm2-fix-P0-<id>.md`），不得留到 MR 批量。每条 P0 在此登记路径与状态。

| P0 ID    | 发现（工作项/包/一句话） | 处置路径 | 状态 |
| -------- | ------------------------ | -------- | ---- |
| （暂无） |                          |          |      |

## P1 Finding 索引区

> 规则（roadmap Cross-Cutting 6）：Finding ID = `P1-<工作项>-<序号>`（如 `P1-MA3.8-014`），ID 落索引后不可变；登记于来源报告产出时；修复 done 由 MR 批回填状态与修复行指针。P2/P3 不入本区（留在报告 deferred 区）。

| Finding ID   | 包/面                                                                | 一句话描述                                                                                                                                                                                                                                                                                                                            | 来源报告                                                                                | 状态   | 修复行 |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ | ------ |
| P1-MA1.1-001 | docs owner doc（flux-runtime-module-boundaries.md）                  | validation 归属三处与 live 实质 drift：rules.ts 职责描述失实 / Where-To-Add 第 1 步指向未接线文件 / Versus validation/ 两 bullet 与同文档 Compiler boundary 节相反——按文档执行会静默写出不生效的校验规则                                                                                                                              | `docs/audits/2026-10-19-1002-arm2-MA1.1-core-structure.md`                              | `open` | —      |
| P1-MA1.2-001 | docs owner doc（flux-runtime-module-boundaries.md · Bundle Face 节） | 「Bundle Default Registration Face」写 7 族且 mobile/ai/graph 按需；live `registerDefaultFluxRenderers` 注册 9 族（+3d 懒边界提交 815d026dd 无 plan 无回写、+xlang-debug-editor plan 2474）——宿主可见契约 drift                                                                                                                       | `docs/audits/2026-10-19-1052-arm2-MA1.2-runtime-structure.md`                           | `open` | —      |
| P1-MA1.5-001 | flux-renderers-3d（three-canvas 根 marker）                          | 3d 包零 `nop-*` 语义根 marker（根类裸 `three-canvas`@three-canvas.tsx:125）——Rule 2「marker 缺失」P1；missing-markers 扫描器因 `content.includes('nop-')` 被 `@nop-chaos/*` import 豁免而漏报（盲区另记 P2-MA1.5-002）                                                                                                                | `docs/audits/2026-10-19-1307-arm2-MA1.5-domain-structure.md`                            | `open` | —      |
| P1-MA1.7-001 | flow-designer-renderers（designer-edge-row/node-card）               | 16 处 BEM 类违反 State Rules/内部区域规则（6 状态修饰符 `--empty/active/selected`（6/6 站点已有 data-empty/active/selected 合规双写，BEM 为冗余违规）+ 10 `__` 元素类；owner doc :242/:479 明文禁止；CSS 零消费、测试锚点依赖）                                                                                                       | `docs/audits/2026-10-19-1431-arm2-MA1.7-designer-structure.md`                          | `open` | —      |
| P1-MA2.1-001 | arm2-index M0 工具基线区（reactive-render-reads 行）                 | M0 登记基线值 2 失实，live 实测 21（high 20+medium 1）——疑误读扫描器输出 "2 rule buckets" 为命中数；破坏 MV「不得高于 M0」门禁正确性                                                                                                                                                                                                  | `docs/audits/2026-10-19-1802-arm2-MA2.1-core-runtime-runtime.md`                        | `open` | —      |
| P1-MA2.3-001 | flux-renderers-scheduling（barcode-input 摄像头设备 IO）             | barcode-input 直调 `navigator.mediaDevices.getUserMedia`（use-barcode-camera.ts:67）+ `window.BarcodeDetector` + `navigator.onLine`——无 env 通道、无在案 INV-1 豁免；对照同包 WASM IO 显式经 env.fetcher（barcode-input.tsx:199）与 voice/clipboard 在案豁免——媒体 IO 唯一无治理成员；browser-io 扫描器 10 规则不含 camera 族（盲区） | `docs/audits/2026-10-20-0335-arm2-MA2.3-content-mobile-domain-scheduling-ai-runtime.md` | `open` | —      |

## Delegated 指针区

> 规则（roadmap Cross-Cutting 8 / Purpose 第 3 条）：MR\*.0 展开时发现与活跃 owner roadmap（见上方快照区）重叠的修复面，在此登记 delegated 指针，不排重复修复项；审计报告本身照常独立产出。MV 逐条校验指针仍有效（owner 未收官/plan 未关闭且仍覆盖该面）。

| 重叠面（包/维度/一句话） | R2 侧 finding | Delegated 指针 | MV 校验 |
| ------------------------ | ------------- | -------------- | ------- |
| （暂无）                 |               |                |         |

## 工具基线区（M0 实测）

> 口径：24 个维度扫描器 + 5 个 `audit:*` + `pnpm check` + `check:scanner-baselines`。MV 门禁 = 扫描器输出**不得高于**本区基线（降低允许并记录）；`pnpm check` 门禁 = 零新增命中（相对注册既有红名单）。knip 子变体（`audit:knip:packages`/`audit:knip:playground`）**不列入** MV 对比基线（同一 knip 工具的部署变体，正式基线以 `audit:knip` 为准）；如后续需要可追加登记。
> 实测条件：2026-10-19，HEAD `ea9aea279`，干净树；原始输出存 `_tmp/arm2-m0-baselines/`（任务收口后清理）。

### 24 个维度扫描器（全部 exit 0）

| 扫描器                                         | 命中数 | 备注                                                                                                                                |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-suspects`                         | 733    | = 注册基线 733（scanner-baselines.json）                                                                                            |
| `check:audit-runtime-raw-schema-reads`         | 0      |                                                                                                                                     |
| `check:audit-fieldframe-bypasses`              | 0      |                                                                                                                                     |
| `check:audit-async-failure-paths`              | 337    | = 注册基线 337                                                                                                                      |
| `check:audit-hardcoded-type-dispatch`          | 0      |                                                                                                                                     |
| `check:audit-missing-renderer-markers`         | 0      |                                                                                                                                     |
| `check:audit-test-global-leaks`                | 108    | = 注册基线 108                                                                                                                      |
| `check:audit-performance-suspects`             | 27     | 1 rule bucket                                                                                                                       |
| `check:audit-styling-suspects`                 | 240    | = 注册基线 240                                                                                                                      |
| `check:audit-non-retained-renderer-references` | 142    | 跨 11 个 non-retained 类型（基线库 69 类型）                                                                                        |
| `check:audit-reactive-render-reads`            | **21** | high 20 + medium 1（2 rule buckets）。**勘误**：M0 原登记 2 系误读 bucket 数为命中数，经 MA2.1（P1-MA2.1-001）实测勘正于 2026-10-19 |
| `check:audit-react19-optimization-candidates`  | 649    | 注册基线 650（可收窄 1）                                                                                                            |
| `check:audit-as-any-casts`                     | 41     | = 注册基线 41                                                                                                                       |
| `check:audit-canvas-wrapper-a11y`              | 0      |                                                                                                                                     |
| `check:audit-event-dispatch-ctx`               | 0      | allowlisted 0                                                                                                                       |
| `check:audit-renderer-browser-io`              | 0      |                                                                                                                                     |
| `check:audit-renderer-metamodel-residue`       | 0      | 0 未裁决命中；11 suppression 匹配 / 4 registry 条目                                                                                 |
| `check:audit-todo-exitless`                    | 1      | = 注册基线 1（scheduling undo-stack 双轨注记）                                                                                      |
| `check:audit-ui-consistency-gaps`              | 0 新增 | 豁免均注册                                                                                                                          |
| `check:ai-engine-invariants`                   | 0      |                                                                                                                                     |
| `check:react19`                                | 0      |                                                                                                                                     |
| `check:i18n-keys`                              | PASS   | 1843 defined（zh=en）/ 1443 used / 400 potentially unused（动态使用注记）                                                           |
| `check:schema-prop-coverage`                   | PASS   | Layer 1/2 全覆盖 + schema 测试覆盖                                                                                                  |
| `check:renderer-definition-fields-only`        | PASS   |                                                                                                                                     |

### 5 个 `audit:*`

| 命令                 | Exit | 结果                                                                                                                                           | 备注                                                    |
| -------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `audit:deps`         | 57   | 57 dependency violations（57 errors / 0 warnings）；4039 modules、9117 dependencies cruised                                                    | r1 期 14 → 现 57（11 个新包入册后漂移，属本轮新基线）   |
| `audit:knip`         | 1    | Unused files 21 / Unused devDeps 18 / Unlisted deps 35 / Unlisted binaries 1 / Unused exports 342 / Unused exported types 567 / Config hints 6 | knip-baseline 由 `check:knip-baseline` 单独门禁（见下） |
| `audit:mutants`      | 1    | stryker（scope=`flux-runtime/src/validation`）：490 mutants、470 tested、380 survived；**final mutation score 1.63%**（break threshold 60）    | 归属 MA4.5 现场裁决；score 低是本轮审计输入而非基线违规 |
| `audit:semgrep`      | 1    | `semgrep: command not found`                                                                                                                   | 工具未安装（同 r1 状态）；MA7.2 现场裁决是否安装补测    |
| `audit:react-doctor` | 1    | 60 issue 标记（13 ✖ errors + 47 ⚠ warnings）；53 rule 行                                                                                       | 分布归属 MA7.1/MA3 维度现场裁决                         |

### `pnpm check` 链与基线机制

| 项                        | Exit | 结果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`（25 项链）   | 1    | **唯一红**：`check:knip-baseline` NEW `[unused files] tests/e2e/xlang-debug-mock-server.mjs`——既有归属债（并发 xlang 线引入，`docs/logs/2026/10-18.md` 三处登记"归该工作流收口"），本轮零新增。其余全项在注册基线内：scanner-baselines within（react19-opt 649<650 可收窄）、duplicates 503 clones < 注册 597、console 零新增（2 条可收窄）、jsdom-pragma 零新增、oversized 3 errors 全部带显式豁免（i18n locales ×2 + form-runtime-owner.ts）+ 229 WARN（含 10-18 登记的 form-runtime-submit-flow.ts 505 行 WARN）、docs-garbled 21 candidate（报告落 tmp/，非门禁红）、workspace-manifest/page-designer-boundary/css-exports/ui-family-nesting/i18n/schema-prop-coverage 全绿 |
| `check:scanner-baselines` | 0    | within baseline；`find-react19-optimization-candidates` 649 < 650（可收窄）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## 全量门禁基线区（M0 实测）

> 口径：`pnpm typecheck && pnpm build && pnpm lint && pnpm test`（unit 线；e2e 不在 M0 基线范围，e2e 回归归 MV 抽样裁决）。实测条件同工具基线区（2026-10-19，HEAD `ea9aea279`）。

| 门禁             | Exit | 结果                                                                                                                                                                                                                                                                                                                                            | 红项归属                                                                                         |
| ---------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm typecheck` | 1    | 43/44 包过；唯一红 = `apps/playground/vite.config.ts` TS2321/TS2769（vite 插件数组类型展开栈深/重载不匹配）。注：`gate-typecheck.out` 摘要行显示 `42 successful, 44 total`——turbo fail-fast 在 playground 失败时中止了 cache-miss 的 `@nop-chaos/flux#typecheck` 任务（closure audit 独立复跑该任务 exit 0，证实"唯一红 = playground"实质成立） | 既有登记红（`docs/logs/2026/10-18.md` 多处登记"唯一 playground vite.config 既有红"），本轮零新增 |
| `pnpm build`     | 1    | 唯一红 = playground build（同一 vite.config 根因）                                                                                                                                                                                                                                                                                              | 同上既有登记红                                                                                   |
| `pnpm lint`      | 0    | 44/44 全绿                                                                                                                                                                                                                                                                                                                                      | —                                                                                                |
| `pnpm test`      | 0    | **82/82 任务成功，14,051 tests passed，0 failed**（turbo 内容键控缓存命中——HEAD `ea9aea279` 内容态与缓存输入逐字节一致）                                                                                                                                                                                                                        | —                                                                                                |

结论：unit 线全绿；typecheck/build 的唯一红为既有登记债（playground vite.config），归属披露在案，非本轮新增。MV 复跑口径 = 不高于本表（测试保持全绿；typecheck/build 红项不得扩大到 playground 之外）。

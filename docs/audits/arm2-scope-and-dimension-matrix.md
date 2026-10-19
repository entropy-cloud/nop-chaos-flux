# R2 审计范围与维度矩阵（arm2 逐格取证模板）

> Status: active（M0 / plan 653 产出；覆盖定义表，随各工作项报告产出滚动引用）
> Last Updated: 2026-10-19
> 来源：`docs/backlog/audit-remediation-r2-roadmap.md`（Work Item Status 为状态唯一权威；本文件零状态）
> 索引：`docs/audits/arm2-index.md`

## 执行原则（适用于每个格子）

1. **全新视角**：全部格子执行时一律按"未审计"处理；历史轮次（r1/FM/metamodel/multi-audit/open-audit）结论不得作为跳过依据。历史材料三合法用途：`docs/skills/` 方法论、审计工具与基线机制、已知失败模式检测启发（命中须本轮重新取证定级）。
2. **双风格执行**：每项 = 维度清单（multi）+ live 信号开放式追问（open），两段记录并入同一报告。
3. **证据纪律**：真实操作 + 程序化 pass/fail（`page.evaluate` / locator 断言 / `getComputedStyle`）；截图仅诊断评审，不作为 pass 证明。
4. **P0 即时通道**：执行中发现 P0（运行时崩溃/XSS/数据损坏/核心渲染循环断裂/核心操作阻断/公共导出面破坏性变更未通知）当即处理，登记 `arm2-index.md` P0 追踪区。
5. **报告命名**：`docs/audits/YYYY-MM-DD-HHmm-arm2-<工作项>-<维度>.md`；产出即登记 arm2-index 工作项→报告登记表；Finding ID = `P<级别>-<工作项>-<序号>`（落索引后不可变）。
6. **审计项不改代码**：除 P0 即时修复外零代码变更；BUILD_VERIFY = 全量 `pnpm test` 确认基线未漂移。
7. **修复去重**：发现与活跃 owner roadmap（见 arm2-index 快照区）重叠的**修复**面，记 delegated 指针；审计本身照常独立执行。

## 覆盖总表（簇 × 维度 → 工作项）

> 与 roadmap「审计维度 × 包簇覆盖矩阵」逐格一致；格内为工作项编号。执行时逐格对照本表确认覆盖无遗漏。

| 簇 \ 维度     | MA1 结构契约 | MA2 运行时正确 | MA3 代码质量 | MA4 测试 | MA5 功能交互                             | MA6 UX 视觉 | MA7 性能/安全/样式 | MA8 文档运维 | MA9 开放式 |
| ------------- | ------------ | -------------- | ------------ | -------- | ---------------------------------------- | ----------- | ------------------ | ------------ | ---------- |
| C1 core       | MA1.1        | MA2.1          | MA3.1/2      | MA4.1    | MA9.1                                    | —           | MA7.1/2            | MA8.1/3      | MA9.1      |
| C2 runtime    | MA1.2        | MA2.1          | MA3.3/4      | MA4.1    | MA9.1                                    | —           | MA7.1/2            | MA8.1/3      | MA9.1      |
| C3 basic      | MA1.3        | MA2.2          | MA3.5/6      | MA4.2    | MA5.4                                    | MA6.1       | MA7.1/2/3          | MA8.1        | MA9.2/4    |
| C4 content    | MA1.4        | MA2.3          | MA3.7        | MA4.3    | MA5.5                                    | MA6.2       | MA7.1/2/3          | MA8.1        | MA9.2/4    |
| C5 domain     | MA1.5        | MA2.3          | MA3.8/9      | MA4.3    | MA5.5                                    | MA6.3       | MA7.1/2/3          | MA8.1        | MA9.2/4    |
| C6 scheduling | MA1.6        | MA2.3          | MA3.10       | MA4.3    | MA5.2                                    | MA6.3       | MA7.1/2/3          | MA8.1        | MA9.2/4    |
| C7 ai         | MA1.6        | MA2.3          | MA3.11       | MA4.3    | MA5.6                                    | MA6.2       | MA7.1/2/3          | MA8.1        | MA9.2/4    |
| C8 designer   | MA1.7        | MA2.4          | MA3.12/13    | MA4.4    | MA5.1                                    | MA6.4       | MA7.1/2/3          | MA8.1        | MA9.3/4    |
| C9 office     | MA1.8        | MA2.4          | MA3.14–16    | MA4.4    | MA5.3                                    | MA6.4       | MA7.1/2/3          | MA8.1        | MA9.3/4    |
| C10 platform  | MA1.9        | MA2.4          | MA3.17/18    | MA4.4    | MA5.1（调试面）/MA6.4（ui 原语经宿主面） | MA6.4       | MA7.2/3            | MA8.1/2/3    | MA9.4      |
| C11 print     | MA1.9        | MA2.4          | MA3.18       | MA4.4    | MA5.5（预览面）                          | MA6.2       | MA7.3              | MA8.2        | MA9.4      |
| C12 xlang     | MA1.9        | MA2.4          | MA3.18       | MA4.4    | MA5.1（调试面）                          | —           | MA7.2              | MA8.2/3      | MA9.4      |

包簇→包映射（roadmap 实测口径）：C1=flux-core/formula/compiler/action-core；C2=flux-runtime/react/bundle；C3=renderers-basic/form/form-advanced/data；C4=content/layout/dashboard/pivot/mobile；C5=industrial/3d/graph/map；C6=renderers-scheduling；C7=renderers-ai；C8=flow-designer-core/flow-designer-renderers/editor-core/page-designer-core/page-designer-renderers；C9=spreadsheet-core/spreadsheet-renderers/word-editor-core/word-editor-renderers/report-designer-core/report-designer-renderers；C10=ui/theme-tokens/tailwind-preset/flux-i18n/flux-code-editor/nop-debugger；C11=flux-print-core/flux-print-renderers；C12=flux-xlang-lang/flux-xlang-debug。

## MA1 结构契约（9 项，机械维度）

共享方法：依赖图与跨包引用（`audit:deps`）、模块边界合规（对照 `docs/architecture/flux-runtime-module-boundaries.md` 族 owner doc）、renderer 定义字段正确性与注册完整性、公共导出面（`packages/*/src/index.ts`）稳定性、样式契约 marker（`check:audit-missing-renderer-markers`、`check:renderer-definition-fields-only`）；方法集叠加 `docs/skills/architecture-deepening-review-prompt.md`（深化机会记 systemic finding，落地不在本轮）。Skill 列见 roadmap。

| 工作项 | 覆盖簇      | 取证要点（叠加共享方法）                                                                        | 证据落点                                        |
| ------ | ----------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| MA1.1  | C1 core     | flux-core/formula/compiler/action-core 依赖方向、导出面、schema 契约                            | `*arm2-MA1.1-core-structure.md`                 |
| MA1.2  | C2 runtime  | flux-runtime/react/bundle 依赖方向、导出面                                                      | `*arm2-MA1.2-runtime-structure.md`              |
| MA1.3  | C3 basic    | basic/form/form-advanced/data 定义字段与注册完整性                                              | `*arm2-MA1.3-basic-structure.md`                |
| MA1.4  | C4 content  | content/layout/dashboard/pivot/mobile 定义与样式契约                                            | `*arm2-MA1.4-content-structure.md`              |
| MA1.5  | C5 domain   | industrial/3d/graph/map 定义与样式契约                                                          | `*arm2-MA1.5-domain-structure.md`               |
| MA1.6  | C6+C7       | scheduling + ai 定义、导出面与 marker                                                           | `*arm2-MA1.6-scheduling-ai-structure.md`        |
| MA1.7  | C8 designer | designer 族边界一致性；**额外** `check:page-designer-boundary` + `check:designer-conformance`   | `*arm2-MA1.7-designer-structure.md`             |
| MA1.8  | C9 office   | spreadsheet/word/report 三编辑器定义与边界                                                      | `*arm2-MA1.8-office-structure.md`               |
| MA1.9  | C10+C11+C12 | platform/print/xlang 导出面与 CSS exports；**额外** `check:package-css-exports` + ui 导出面分类 | `*arm2-MA1.9-platform-print-xlang-structure.md` |

## MA2 运行时正确性（4 项，工具扫描 + 抽样人工审读）

共享扫描器：`check:audit-runtime-raw-schema-reads`、`check:audit-fieldframe-bypasses`、`check:audit-hardcoded-type-dispatch`、`check:audit-async-failure-paths`、`check:audit-event-dispatch-ctx`、`check:audit-non-retained-renderer-references`、`check:audit-reactive-render-reads`、`check:ai-engine-invariants`。共享抽样审读：scope 生命周期与 StrictMode 双触发、action scope→import→dispatch→handler 链路（`docs/architecture/action-scope-and-imports.md`）、表单校验参与（`docs/architecture/form-validation.md`）、错误传播与取消安全。

| 工作项 | 覆盖簇            | 取证要点（叠加共享）                                                                                                | 证据落点                                 |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| MA2.1  | C1+C2             | core+runtime 裸读取/FieldFrame/硬编码分发/生命周期                                                                  | `*arm2-MA2.1-core-runtime-runtime.md`    |
| MA2.2  | C3 basic          | 分发、action 链路、校验参与                                                                                         | `*arm2-MA2.2-basic-runtime.md`           |
| MA2.3  | C4+C5+C6+C7       | 异步安全与 IO 边界；**额外** `check:audit-renderer-browser-io` 对照 `docs/architecture/renderer-env.md` INV-1/INV-2 | `*arm2-MA2.3-async-io-runtime.md`        |
| MA2.4  | C8+C9+C10+C11+C12 | 状态机与序列化边界；**额外** undo/redo 状态机与序列化往返                                                           | `*arm2-MA2.4-designer-office-runtime.md` |

## MA3 代码质量与 React 19（18 项，行为维度，S 级按包拆分）

四口径固定：① 实现质量（`docs/skills/code-quality-audit-prompt.md`）；② React 19 实践（`docs/skills/react19-best-practices-review.md` + `check:react19` + `'use no memo'` 文件未被破坏）；③ 重构候选（超大文件对照 `check:oversized-code-files` 注册债、重复模式 `check:duplicates-baseline`）；④ workaround 嗅探（`docs/skills/workaround-code-smell-audit-prompt.md`）。发现归族 local/family/systemic。

| 工作项 | 包                                                                                          | 证据落点                                                   |
| ------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| MA3.1  | flux-core                                                                                   | `*arm2-MA3.1-core-quality.md`                              |
| MA3.2  | flux-formula + flux-compiler + flux-action-core                                             | `*arm2-MA3.2-formula-compiler-action-quality.md`           |
| MA3.3  | flux-runtime                                                                                | `*arm2-MA3.3-runtime-quality.md`                           |
| MA3.4  | flux-react + flux-bundle                                                                    | `*arm2-MA3.4-react-bundle-quality.md`                      |
| MA3.5  | renderers-basic + renderers-form                                                            | `*arm2-MA3.5-basic-form-quality.md`                        |
| MA3.6  | renderers-form-advanced + renderers-data                                                    | `*arm2-MA3.6-form-advanced-data-quality.md`                |
| MA3.7  | content + layout + dashboard + pivot + mobile                                               | `*arm2-MA3.7-content-family-quality.md`                    |
| MA3.8  | renderers-industrial                                                                        | `*arm2-MA3.8-industrial-quality.md`                        |
| MA3.9  | renderers-3d + renderers-graph + renderers-map                                              | `*arm2-MA3.9-3d-graph-map-quality.md`                      |
| MA3.10 | renderers-scheduling                                                                        | `*arm2-MA3.10-scheduling-quality.md`                       |
| MA3.11 | renderers-ai（含 message engine）                                                           | `*arm2-MA3.11-ai-quality.md`                               |
| MA3.12 | flow-designer-core + flow-designer-renderers + editor-core                                  | `*arm2-MA3.12-flow-designer-quality.md`                    |
| MA3.13 | page-designer-core + page-designer-renderers                                                | `*arm2-MA3.13-page-designer-quality.md`                    |
| MA3.14 | spreadsheet-core + spreadsheet-renderers                                                    | `*arm2-MA3.14-spreadsheet-quality.md`                      |
| MA3.15 | word-editor-core + word-editor-renderers                                                    | `*arm2-MA3.15-word-editor-quality.md`                      |
| MA3.16 | report-designer-core + report-designer-renderers                                            | `*arm2-MA3.16-report-designer-quality.md`                  |
| MA3.17 | ui + theme-tokens + tailwind-preset + flux-i18n                                             | `*arm2-MA3.17-platform-ui-quality.md`                      |
| MA3.18 | flux-code-editor + nop-debugger + print ×2 + xlang ×2（6 包跨三簇，closure 预期字母批拆分） | `*arm2-MA3.18-code-editor-debugger-print-xlang-quality.md` |

## MA4 测试有效性（5 项）

MA4.1–4.4 共享方法：`docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`（测稳定契约 vs 实现细节；每簇列"高价值无守护契约"清单）+ `check:audit-test-global-leaks` + jsdom pragma 白名单合规。

| 工作项 | 覆盖簇            | 取证要点（叠加共享）                                                                                                                                                                                         | 证据落点                               |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| MA4.1  | C1+C2             | core+runtime 契约覆盖                                                                                                                                                                                        | `*arm2-MA4.1-core-runtime-tests.md`    |
| MA4.2  | C3 basic          | basic 渲染器契约覆盖                                                                                                                                                                                         | `*arm2-MA4.2-basic-tests.md`           |
| MA4.3  | C4+C5+C6+C7       | content/domain/scheduling/ai 契约覆盖                                                                                                                                                                        | `*arm2-MA4.3-content-domain-tests.md`  |
| MA4.4  | C8+C9+C10+C11+C12 | designer/office/platform/print/xlang 契约覆盖                                                                                                                                                                | `*arm2-MA4.4-designer-office-tests.md` |
| MA4.5  | 全仓              | e2e 有效性（watch-only 台账全量重裁决、阈值类环境依赖归因、skip 治理）+ mutation 抽样（`audit:mutants` 核心契约模块抽样）+ 探索式契约测试（`docs/skills/exploratory-e2e-testing-prompt.md`，探针转正或删除） | `*arm2-MA4.5-e2e-mutation-tests.md`    |

## MA5 功能交互（6 项，browser-use 实操驱动）

共享口径：`docs/skills/interaction-state-audit-prompt.md` 状态完备性（loading/empty/error/disabled/readonly/selected）；真实操作 + 程序化 pass/fail。台账机制复用 `docs/audits/interaction-state/` 结构（重新取证）。

| 工作项 | 覆盖面                                                                                                            | 取证要点                                                      | 证据落点                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| MA5.1  | flow/page designer + editor-core + nop-debugger + xlang-debug 调试面（双设计器+双调试面，closure 预期字母批拆分） | 拖拽/连线/属性面板/调试会话状态机                             | `*arm2-MA5.1-designer-debug-walkthrough.md` |
| MA5.2  | scheduling（gantt/kanban/calendar/barcode）                                                                       | 拖拽、滚动同步、跨天、职能视图                                | `*arm2-MA5.2-scheduling-walkthrough.md`     |
| MA5.3  | office 三编辑器                                                                                                   | spreadsheet 编辑/公式/选区；word 编辑；report designer        | `*arm2-MA5.3-office-walkthrough.md`         |
| MA5.4  | form/data/basic（AMIS 对标 `~/sources/amis`，机制参照）                                                           | 表单校验/提交/联动、CRUD、分页、树表、弹层                    | `*arm2-MA5.4-form-data-walkthrough.md`      |
| MA5.5  | 3d/graph/map/industrial(scada)、mobile 手势、dashboard 布局、print 预览（面多，closure 预期字母批拆分）           | pull-refresh/swipe-cell/infinite-scroll/countdown、scada 交互 | `*arm2-MA5.5-domain-content-walkthrough.md` |
| MA5.6  | ai 族                                                                                                             | 消息流/流式输出/工具调用/HITL 中断恢复/会话管理               | `*arm2-MA5.6-ai-walkthrough.md`             |

## MA6 UX 与视觉（4 项）

共享口径：`docs/skills/visual-page-quality-inspection-prompt.md` 逐页 light+dark 双主题，程序化取证；截图矩阵机制复用 `docs/audits/visual-quality-r2/`（重新取证）。MA6.4 叠加 `docs/skills/ux-design-pattern-audit-prompt.md` + 全局主题一致性（CSS 变量覆盖、`check:audit-ui-consistency-gaps`、`check:ui-family-nesting`、对比度抽查、焦点陷阱/键盘可达）。

| 工作项 | 覆盖面                                                                                                                                       | 取证要点（叠加共享）       | 证据落点                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------- |
| MA6.1  | basic+form+data 页面                                                                                                                         | 视觉走查 light+dark        | `*arm2-MA6.1-basic-visual.md`             |
| MA6.2  | content（含 layout/dashboard/pivot）+mobile+print 预览+ai 页面；**含 AI 文案轻量抽查**（`docs/skills/ai-tone-and-filler-review.md`，记录级） | 视觉走查 + AI 文案抽查     | `*arm2-MA6.2-content-ai-visual.md`        |
| MA6.3  | scheduling+domain 页面                                                                                                                       | 视觉走查                   | `*arm2-MA6.3-scheduling-domain-visual.md` |
| MA6.4  | designer/office 界面 + 全局主题一致性 + ui 原语经宿主面易用性                                                                                | 主题一致性 + 焦点/键盘可达 | `*arm2-MA6.4-designer-theme-visual.md`    |

## MA7 性能、安全与样式（3 项）

| 工作项 | 覆盖     | 方法与取证要点                                                                                                                                                                                                                                                                               | 证据落点                     |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| MA7.1  | 全仓性能 | `check:audit-performance-suspects` + `check:audit-reactive-render-reads` + `check:audit-react19-optimization-candidates` 全量扫描+人工复核；渲染循环/大列表/重渲染热点取证（React Profiler / Performance API）；perf 阈值 e2e 逐条裁决；Skill `docs/skills/react19-best-practices-review.md` | `*arm2-MA7.1-performance.md` |
| MA7.2  | 全仓安全 | HTML 渲染 sanitize 门禁全量路径验证；动态执行（eval/Function/new Function）路径；`audit:semgrep` + `audit:deps` 漏洞；浏览器 IO 越界（`check:audit-renderer-browser-io`）                                                                                                                    | `*arm2-MA7.2-security.md`    |
| MA7.3  | 全仓样式 | `check:audit-styling-suspects`；BEM 漂移（`--` 修饰符）；marker 完整性；暗色模式变量覆盖缺口                                                                                                                                                                                                 | `*arm2-MA7.3-styling.md`     |

## MA8 文档契约与运维（3 项）

| 工作项 | 覆盖                                                                                           | 方法与取证要点                                                                                                                                                                          | 证据落点                          |
| ------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| MA8.1  | `docs/architecture/` + `docs/references/quick-reference.md` + `flux-guide/` 抽样对照 live code | `check:active-doc-code-anchors` + `docs/skills/doc-evaluation.md` 四问（准确/强契约/决策质量/时效）；漂移按 `docs/context/source-of-truth-and-precedence.md` 裁决                       | `*arm2-MA8.1-doc-contract.md`     |
| MA8.2  | i18n + deprecation + todo                                                                      | `check:i18n-keys` + 硬编码字符串 grep；`@deprecated` 注记与移除流程合规（`docs/skills/deprecated-feature-cleanup.md`）；`check:audit-todo-exitless`                                     | `*arm2-MA8.2-i18n-deprecation.md` |
| MA8.3  | CI guard 与工具基线                                                                            | `pnpm check` 25 项逐一激活验证；knip/dependency-cruiser/semgrep 配置有效性；`check:scanner-baselines` 基线机制真实防回退（含基线 key 行号脆弱性抽查——注意 2026-10-19 已迁移内容锚定键） | `*arm2-MA8.3-ci-guards.md`        |

## MA9 开放式对抗审计（4 项，无固定清单）

共享方法：`docs/skills/open-ended-adversarial-review-prompt.md`；live 信号驱动探针设计（git log 热点、`audit:knip` 死代码、console 基线、skip/watch-only 清单、MA1–MA8 报告中标 watch-only 的项）；明确允许清单外发现；产出探针清单 + 判别证据；有价值失败模式记 MG 候选。

| 工作项 | 探测面                                                                               | 证据落点                                     |
| ------ | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| MA9.1  | 核心链路 compile→scope→render→action→update 主干 + 并发/StrictMode/取消/错误传播交叉 | `*arm2-MA9.1-core-adversarial.md`            |
| MA9.2  | 渲染器族跨簇（同族不一致、定义字段漂移）                                             | `*arm2-MA9.2-renderers-adversarial.md`       |
| MA9.3  | designer+office 族（长会话状态、undo/redo、序列化往返、大文档）                      | `*arm2-MA9.3-designer-office-adversarial.md` |
| MA9.4  | 全仓端到端（playground 真实页面异常 schema 输入、边界值、组合滥用、内存泄漏长会话）  | `*arm2-MA9.4-e2e-adversarial.md`             |

## M0 证据落点

M0（编排基线）产物 = `docs/audits/arm2-index.md`（含工具基线区与全量门禁基线区实测数值）+ 本矩阵文件；不产出独立审计报告。

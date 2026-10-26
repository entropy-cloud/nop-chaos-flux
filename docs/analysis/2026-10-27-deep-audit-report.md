# 2026-10-27 全仓深度审计报告

> Auditor: 本会话主 agent（4 个并行只读审计子代理：代码/架构漂移、测试与验证基建、文档一致性与计划卫生、工具链与包治理）
> Baseline: `pnpm typecheck` exit 0；`pnpm check` 既有门禁全绿（已注册债务全部在册）
> 输出: 本报告 + 4 份 remediation owner plans（A/B/C/D），按 guide Rule 25「先合并再拆分」归组

## 方法

- 基线核验：`pnpm typecheck` 通过；`git status` 含上一会话中断遗留的未提交改动。
- 审计子代理逐条给出 file:line 证据 + 可复现验证命令，主会话对关键声称抽查核对。
- 已验证 clean 的面（不列问题）：PH-7 七包 coverage 阈值全部就位；`@watch-only` 三项测试均在册；Playwright 配置结构健全；`tests/e2e/artifacts`、`test-results/`、`_tmp/` 均未被 git 追踪；全部 `check:*` 引用脚本存在；`packages/*/src` 零构建产物；内部依赖全部 `workspace:*`；react 版本统一 `^19.0.0`；spot-check 的 3 份 owner doc（renderer-env.md / styling-system.md classAliases / flow-designer design.md §8）与 live 代码一致。

## 发现总表

### A 组：工作区/提交卫生（上一会话中断遗留）—— 最优先

| #   | 严重度 | 发现                                                                                                                                                                                                                                                                                                  | 证据                                                      |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A1  | Major  | plan 762 + 台账 `docs/testing/e2e-baseline-ledger.md` 未提交，但已提交的 `docs/backlog/platform-hardening-roadmap.md:117` 已引用「plan 762」；台账实质完成（251 项归因），plan 762 的 Exit Criteria 未勾、header 仍 `active`                                                                          | `git status` 两文件 `??`；plan 762 勾选 2/15              |
| A2  | Major  | `packages/ui/src/json-viewer-dark.css` 孤儿文件：未追踪、无处 import；其引用的 plan 746 修复实际经 commit `621ce3e41` 在 `apps/playground/src/styles.css:605` 落地（消费侧实现）。若提交将双重生效                                                                                                    | `grep -rn json-viewer-dark packages apps docs` 仅命中自身 |
| A3  | Major  | ai-debugger-copilot 程序启动文件整套未提交：roadmap（`docs/backlog/ai-debugger-copilot-roadmap.md`，状态 active/队列已开放）、`missions/ai-debugger-copilot.json`、`scripts/__tests__/ai-debugger-local-qwen.optional.test.ts`、`packages/flux-renderers-ai/src/ai-renderer-definitions.ts` +6 行注释 | `git status --short`                                      |
| A4  | Minor  | optional 测试超时不一致：`vitest.scripts.config.ts` testTimeout 30s < 测试内 fetch 默认 60s（`NOP_AI_LOCAL_TIMEOUT_MS ?? 60_000`），启用时失败表现为 vitest 超时而非干净 HTTP 错误                                                                                                                    | 两文件对照                                                |
| A5  | Minor  | `packages/flux-renderers-basic/src/temp/` 空目录残留（未追踪）；`_tmp/` 976 项陈旧 scratch、`test-results/` 21 个陈旧失败 trace（均 gitignored，非违规但失控）                                                                                                                                        | `ls` 实测                                                 |
| A6  | Major  | `docs/index.md` / `docs/testing/index.md` 零引用 ai-debugger-copilot 程序与 e2e 台账；docs/index.md 相对链接完整性本身 clean                                                                                                                                                                          | grep 零命中                                               |

### B 组：计划状态机回潮（docs-only）

| #   | 严重度 | 发现                                                                                                                                                                                                                                                                                                        | 证据                  |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| B1  | Major  | 14 份 plan 全部 Exit Criteria 勾完 + Closure Note 已写，header 仍 `Plan Status: active`：638/639/643/648/649/652/704/705/706/712/713/714/719/763。2026-10-17 建立的 plan 625 状态机在一周内回潮。工作可验证落地（如 plan 712 `showStrength` 在 input.tsx；plan 639 `syncScroll` 在 use-gantt-scroll.ts:27） | 逐文件 `[ ]` 计数 = 0 |
| B2  | Major  | plan 730 自相矛盾：:116 `[x]`「closure audit approved → 收口提交」与 :118 同项 `[ ]` 并存，header active                                                                                                                                                                                                    | sed :110-120          |
| B3  | Major  | plan 748 声称「Implementation done. Gates green (44/44, 82/82)」但全文 0 勾选框、无 closure-audit 节                                                                                                                                                                                                        | grep                  |
| B4  | Minor  | plan 651 唯一未勾项锚定 gitignored 的 `_tmp/fm7-sweep.md`，在仓内永久不可验证                                                                                                                                                                                                                               | `git check-ignore`    |
| B5  | 参考   | 真实 in-flight 仅 707（13/16）、737（1/14）、628（backlog track）；762 归 A1 处置                                                                                                                                                                                                                           | 计数实测              |

### C 组：代码与契约卫生

| #   | 严重度 | 发现                                                                                                                                                                                                                                                       | 证据                                          |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| C1  | Major  | `docs/architecture/flux-core.md:38` 声称 i18n-sink 是「唯一有状态模块」，但 `packages/flux-core/src/strict-mode.ts:110-124` 写 `globalThis` 标志、:26-44 读 localStorage/URL —— owner doc 事实性错误                                                       | 双侧对照                                      |
| C2  | Major  | `packages/flux-runtime/src/index.ts:42-57` 再导出 flux-core 生命周期原语，全仓零消费经此路径导入；违反 flux-runtime-module-boundaries.md:28「thin package entry」，膨胀 knip 导出面（10-19.md:179 C2 residue）                                             | grep 零命中                                   |
| C3  | Major  | `executeApiObject`（`request-runtime.ts:496-499` `@deprecated` 一轮兼容期后移除）唯一消费者是 unstable facade 自身，早已过移除期限，仍从 `flux-runtime/index.ts:33` 与 `flux-react/unstable.ts:15` 导出                                                    | grep                                          |
| C4  | Major  | `packages/flux-react/src/unstable.ts:16-17` 同一绑定双名导出（`createProjectedScopeStore as createProjectedScopeHelpers` + 本名）                                                                                                                          | sed                                           |
| C5  | Major  | layout 族 wizard/steps 渲染器硬编码 Tailwind 视觉类（`wizard-step-body.tsx:63` `flex flex-col gap-4`；`wizard-renderer.tsx:599`；`steps-renderer.tsx:178`），违反 AGENTS.md Styling Rule 1；`check:audit-ui-consistency-gaps` 只门禁颜色不门禁布局类，未闸 | grep                                          |
| C6  | Major  | `renderFileListSidebar`（`flux-renderers-content/src/diff-view/diff-file-list.tsx:196-208`）零调用死代码，两轮审计（07-22、07-27 analysis）确认可删但一直未删                                                                                              | grep 零命中                                   |
| C7  | Minor  | flux-react 导出原始 Context（`index.tsx:11-24`）+ 别名对（hooks.ts:83-88），为「绕过 sanctioned hooks」留合法通道；`RowQuickEditDraftContext`（flux-renderers-data）是唯一以 React context 承载编辑状态的先例，与 Zustand 基线冲突                         | 见审计明细                                    |
| C8  | Minor  | scheduling 包 10+ `@deprecated` schema 字段无移除目标/文档记录（gantt.types.ts:173-192 等），违反 deprecation skill 的 docs record 要求                                                                                                                    | grep                                          |
| C9  | Minor  | 超限预警带失控：233 文件 WARN（无 per-file 豁免理由， unlike ui-consistency-exemptions）；4 个文件距 700 行硬门禁 ≤6 行（table-header-row.tsx 699 / create-engine.ts 698 / crud-renderer.tsx 694 / upload-field.tsx 692），任一 +1 行即 `pnpm check` 红    | `node scripts/check-oversized-code-files.mjs` |

### D 组：门禁与工具链治理

| #   | 严重度 | 发现                                                                                                                                                                                                                                                                                           | 证据                         |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| D1  | Major  | 22 个门禁脚本无测试（含强制链上的 check-react19-legacy-apis / check-i18n-keys / check-schema-prop-coverage / check-scada-symbol-keys / verify-no-src-artifacts 及 12 个 audit/find-\*），约 20 个兄弟脚本有测试                                                                                | scripts/**tests** 对照       |
| D2  | Minor  | `check` 链漏掉 17 个已定义 opt-in 审计脚本（check:audit-\* 家族等），漂移无界                                                                                                                                                                                                                  | package.json:18 vs :34-51    |
| D3  | Minor  | `check:duplicates` ≡ `check:duplicates-baseline`（完全相同的命令，冗余脚本位）                                                                                                                                                                                                                 | package.json:44-45           |
| D4  | Minor  | `workaround:reconcile` 裸 `node` 跑 `.ts`（需 Node≥22.6 type-stripping），与 `.mjs` 惯例不一致                                                                                                                                                                                                 | package.json:92              |
| D5  | Minor  | vite 版本漂移：根 `^8.3.0` vs playground `^8.0.3`                                                                                                                                                                                                                                              | package.json 对照            |
| D6  | Minor  | `playwright.config.ts:34` 注释仍称「retries=0 baseline」，实际 `retries: 1`                                                                                                                                                                                                                    | 文件对照                     |
| D7  | Major  | e2e 台账盲区：~13 个带静态 `test.skip`/`describe.skip`/`fixme` 的 spec（flow-designer-edge-creation:12、large-dataset-windowing:12,29、exploratory 簇等，共 46 skip）在「权威台账」中零归因，skip 面可无声腐化                                                                                 | ledger grep 零命中           |
| D8  | Minor  | 单测层游离 skip：fm3-contract-probes.test.tsx:377 `it.skip`（IME characterization 无台账）；values-path-integration.test.tsx:85 `test.fixme`（自述 remove-when-fix，低危）                                                                                                                     | grep                         |
| D9  | Major  | 【执行期新增】`pnpm test:scripts` HEAD 既有红：4 failed / 162 passed（check-console-baseline 红路径 fixture 与 live 树漂移；find-ui-consistency-gaps --json 确定性用例 command failed；check-flux-bundle-pack ×2 断言 "Expected the lazy renderer implementa…"）——门禁脚本自身的回归测试已腐化 | test:scripts 实跑 2026-10-27 |

## 归组与处置（Rule 25：同 owner 同验证路径合并为 owner plan）

- **Plan A（提交/工作区卫生收口）**：A1-A6 —— land plan 762 台账（按其 Exit Criteria 逐项核验后收口提交）、删除孤儿 CSS 与空 temp/、land ai-debugger-copilot 启动文件（修 D 超时不一致一并）、docs/index.md 导航补录、\_tmp/test-results 清扫。
- **Plan B（计划状态机修复）**：B1-B5 —— 逐份独立核验 14+2 份 plan 的 closure 证据后翻转 header 为 completed；730 去矛盾；748 补 closure-audit 节（独立子代理补审）；651 锚定项改判；在 docs/plans 指南/维护文档记录防回潮条款。
- **Plan C（代码与契约卫生）**：C1-C9 —— flux-core.md 勘误、死再导出删除、executeApiObject 移除、双名导出收敛、wizard/steps 样式契约修复（marker 化或以 owner-doc 记录豁免）、renderFileListSidebar 删除、scheduling deprecated 清册、oversized 预警带治理。
- **Plan D（门禁与脚本治理）**：D1-D8 —— 优先给强制链 5 个无测门禁脚本补测试、台账补 skip 面、冗余脚本收敛、版本对齐、注释勘误。

## 迭代承诺

每份 plan 完成并提交后，按用户指令循环：重扫工作区与 diff 增量，直到无新增可优化项。

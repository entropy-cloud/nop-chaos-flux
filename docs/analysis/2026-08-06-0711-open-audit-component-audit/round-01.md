# Round 01 — 治理与门禁产物对账（docs / scripts 层）

> 执行：open-audit 2026-08-06（mission `component-audit`）
> 视角：契约考古学家 + 死代码清道夫
> 去重：先读 `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（本日并行 multi-audit，3 P1 + 42 P2）与 `docs/audits/2026-08-05-0656-open-audit-component-audit.md`（上轮 open audit，F1-F4 已路由），本目录只报告其未覆盖项。

## 本轮方法与核对项

- live 重跑门禁：`check:workspace-manifest-deps`（exit 0）、`check:oversized-code-files`（ERROR 14 文件）、`check:i18n-keys`（pass）、`check-active-doc-code-anchors`（pass）、`check:audit-renderer-browser-io`（零命中）。
- 对账 `docs/context/project-context.md` 基线段与 live 门禁。
- 对账 `docs/audits/multi-audit-r2-verdicts.md` 的 successor 路由去向与 docs/backlog / docs/plans 中的实际 owner。
- 审查新增门禁脚本 `scripts/audit/find-renderer-browser-io.mjs` 的覆盖范围与规则完整性。

## 发现

### [P1] project-context.md 基线段与 live 门禁直接矛盾（16 文件 / 5 ERROR 均为已过时数字）

- **在哪里**：`docs/context/project-context.md:15`（CV full-green 基线段："`pnpm check` 既有 pre-existing red 集：`check:oversized-code-files` 16 文件 >700 行、`check:workspace-manifest-deps` 5 ERROR（0529-1 plan 登记在案，治理归独立 successor）"）
- **是什么**：live 实测 `check:workspace-manifest-deps` **exit 0**（5 ERROR 已由 0529-1 清零）、`check:oversized-code-files` **14 文件**（0529-1 拆分后 16→14）。project-context.md 由 CG Phase 5（03:43）写入，0529-1（05:29 之后）的修复未回写该文件；0529-1 Phase 3 只校正了 CR/CV/CG 三个 plan 文本，漏掉了 project-context.md。该文件同时声明 `Documentation freshness: fresh`。
- **为什么值得关心**：project-context.md 是 AGENTS.md 指定「before changing product behavior」必读的权威基线；其中的 pre-existing red 清单是后续 agent 判定「我的改动是否新增门禁命中」的参照系。数字错误会让 agent 以为 manifest-deps 仍红（从而误判自己引入了 5 ERROR 或反之把真新增当既有）。F1（08-05 open audit P1）修复的是 plan 文本，此文件是同一根因的残留点。
- **信心水平**：确定（exit code 与计数已 live 复现；文件写入时序可从 daily log 推出）。
- 修复建议：一行修正为「14 既有 + 0 新增，workspace-manifest-deps exit 0」。

### [P2] multi-audit-r2-verdicts successor 5 项登记到不存在的 owner 链（15-2 为 confirmed defect）

- **在哪里**：`docs/audits/multi-audit-r2-verdicts.md:15-26,151-185`（14-4/15-1/15-2/17-2/19-3，均标「registered（flow-designer/graph 域）」「零悬挂」）
- **是什么**：5 项 successor 声称「归 flow-designer owner plan 链」「归 graph G1 plan 链」，但 `docs/backlog/` 只有 3 个 roadmap（无 flow-designer/graph roadmap），`docs/plans/` 中 flow-designer/graph 相关 plan 全部 completed/abandoned/superseded，无任何 active plan 承接。其中 **15-2 是 confirmed defect**（`shell-controls.ts:23` `Math.max(NaN,min)===NaN` + `designer-action-provider.ts:447-453` 放行 NaN）。
- **为什么值得关心**：「零悬挂」只在本 mission 的台账内成立；mission 全 done 后，5 项（含 1 项 confirmed defect）没有可被 SCAN_PLANS 发现的 owner，会退化为下一轮审计的「pre-existing 噪声」。建议在 `docs/backlog/` 建 flow-designer 域 backlog 条目或挂入现有 successor 机制。
- **信心水平**：确定（backlog/plans 目录实测无 owner；verdicts 文件原文）。

### [P2] check:audit-renderer-browser-io 覆盖范围与命名/INV-1 声明不符（漏 4 个 renderer 包 + 漏 import() 规则）

- **在哪里**：`scripts/audit/find-renderer-browser-io.mjs:115-128`（scope 过滤 `/^packages\/flux-renderers-/`）+ RULES（:6-52）
- **是什么**：(a) 只扫 `packages/flux-renderers-*` 10 个包，漏掉同为 renderer 包的 `flow-designer-renderers`、`spreadsheet-renderers`、`report-designer-renderers`、`word-editor-renderers`；(b) 规则集未包含 INV-1 清单中显式列出的 `import()`（动态导入）。
- **为什么值得关心**：CG 声称该脚本是「INV-1 直连 IO 零容忍」门禁并写进 `pnpm check` 聚合；当前零命中只是幸运（4 个漏扫包 grep 后仅 1 处 localStorage 出现在注释里）。未来 spreadsheets/flow-designer 渲染器若直连 IO，门禁不可见。规则补 `import()` 一行、scope 放开到全部 renderer 包即可。
- **信心水平**：确定（脚本源码 + 漏扫包实测）。

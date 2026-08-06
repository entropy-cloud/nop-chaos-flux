> Audit Status: planned
> Audit Type: open-ended
> Mission: component-audit

# Open-Ended Adversarial Audit — Mission `component-audit`（2026-08-06-0711）

> 审查日期：2026-08-06（HEAD `954a0639`）
> 方法：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。先读 AGENTS.md / docs/index.md / react19-best-practices-review.md / mission json / roadmap / checklist v2，再读上轮 open-audit（08-05-0656，F1–F4 已路由）与本日并行 multi-audit（08-06-0711，3 P1 + 42 P2，维度 02/04/05/06/09/10/11/12/13/18/20/22）作去重背景；然后 live 重跑门禁（workspace-manifest-deps / oversized / i18n-keys / active-doc-code-anchors / audit-renderer-browser-io）、对账 project-context 基线、核对 2027-1/0556-1 修复代码（tree-session / calendar exportToPNG / xui-roles-plugin / gantt 删除 / swipe-cell / wizard 拆分 / button href / coverage-manifest 拆分），并沿「事件派发 ctx」家族（multi-audit 22-09/22-11 同根因）全仓扩面扫描。
> 轮次结果：`docs/analysis/2026-08-06-0711-open-audit-component-audit/round-{01,02,03}.md`。

## 发现清单

### [P1] `docs/context/project-context.md` 基线段与 live 门禁直接矛盾（16 文件 / 5 ERROR 均为过时数字）

**一句话理由**：权威上下文文件（AGENTS.md 指定「before changing product behavior」必读）声称 `check:oversized-code-files` 16 文件、`check:workspace-manifest-deps` 5 ERROR；live 实测为 **14 文件 / exit 0**——0529-1 修复后无人回写该文件，且它旁边就标着 `Documentation freshness: fresh`。

- **在哪里**：`docs/context/project-context.md:15`（CV full-green 基线段的 pre-existing red 清单）；对照 `docs/logs/2026/08-06.md` 0529-1 Phase 2「拆分后超限基线 14 既有 + 0 新增」与 live `node scripts/check-oversized-code-files.mjs`（ERROR 14 文件）、`node scripts/check-workspace-manifest-deps.mjs`（exit 0）。
- **是什么**：project-context 由 CG Phase 5（03:43）写入；0529-1（05:29 后）清零 manifest-deps 5 ERROR 并把 oversized 从 16 拆到 14，其 Phase 3 只校正了 CR/CV/CG 三个 plan 文本，漏掉 project-context.md。这是 08-05 open-audit F1（plan 基线 vs 门禁矛盾，已裁 P1）的**残留点**：F1 修了 plan 文本，没修上下文文件。
- **为什么值得关心**：后续 agent 用该清单判定「我的改动是否新增门禁命中」；数字错误会直接误导裁决（把已修复的 manifest-deps 当成仍红）。修一行即可。
- **信心水平**：确定（退出码与计数 live 复现；时序从 daily log 推出）。

### [P2] multi-audit-r2-verdicts 的 5 项 successor 登记到不存在的 owner 链（其中 15-2 为 confirmed defect）

**一句话理由**：「零悬挂」只在本 mission 台账内成立——`docs/backlog/` 无 flow-designer/graph roadmap，`docs/plans/` 无任何 active plan 承接，mission 全 done 后 5 项（含 confirmed defect 15-2）无人可见。

- **在哪里**：`docs/audits/multi-audit-r2-verdicts.md:15-26,151-185`（14-4/15-1/15-2/17-2/19-3，标「registered（flow-designer/graph 域）」「零悬挂」）；`docs/backlog/`（仅 3 个 roadmap）；`docs/plans/`（flow-designer/graph 相关 plan 全 completed/abandoned/superseded）。
- **是什么**：5 项 successor 声称「归 flow-designer owner plan 链 / graph G1 plan 链」，但该链不存在于任何可被 SCAN_PLANS 发现的载体。15-2（`shell-controls.ts:23` NaN clamp + `designer-action-provider.ts:447-453` 放行 NaN）在裁决表中自认 confirmed defect。
- **为什么值得关心**：confirmed defect 若无人认领会退化为下一轮审计的「pre-existing 噪声」，与 08-05 F1 警告的「P0/P1 被静默吸收」同一机制。建议在 `docs/backlog/` 登记 flow-designer 域条目或挂入既有 successor 机制。
- **信心水平**：确定（目录与 plan 状态实测）。

### [P2] `check:audit-renderer-browser-io` 覆盖范围与「INV-1 零容忍」声明不符（漏 4 个 renderer 包 + 漏 `import()` 规则）

**一句话理由**：CG 宣称的新门禁只扫 `packages/flux-renderers-*` 10 包，漏掉 flow-designer/spreadsheet/report-designer/word-editor 4 个 renderer 包，且规则集未含 INV-1 清单显式列出的 `import()`——当前零命中只是运气。

- **在哪里**：`scripts/audit/find-renderer-browser-io.mjs:115-128`（scope 过滤）+ `:6-52`（RULES）；对照 checklist v2 维度 18 与 mission description 的 INV-1 清单。
- **是什么**：(a) scope 正则 `/^packages\/flux-renderers-/` 不含 4 个非 `flux-` 前缀的 renderer 包；(b) INV-1 清单列出的 `import()`（动态导入）无对应规则（现有 9 条只覆盖 fetch/XHR/storage/IDB/window.open/history/WS/beacon/location）。
- **为什么值得关心**：门禁名与描述承诺「renderer 直连 IO 零容忍」，实际只覆盖了 renderer 包的子集；漏扫包未来直连 IO 时门禁不可见。scope 正则放宽 + 补 `import()` 规则两行即可。
- **信心水平**：确定（脚本源码 + 漏扫包 grep 实测，现仅 1 处注释提及 localStorage）。

### [P2] dialog/drawer surface 事件（onOpen/onClose/onConfirm）payload 携带但单参派发，无 `{event, evaluationBindings, scope}` ctx

**一句话理由**：与 multi-audit 22-11（wizard）同根同型——eventContracts 定义 payload `{surfaceId, kind, open}` 但派发缺 ctx，action args 模板 `${surfaceId}` 类键静默空值；dialog/drawer 卡（C1.1，v2 前）dim 7 只对账了 payload 形状，且 CG「~33 处单参派发点 100% 已裁决」的归类对 surface 派发不成立（非空参、非原生 DOM 转发）。

- **在哪里**：`packages/flux-renderers-basic/src/use-surface-renderer.ts:176,181,224-226`；契约 `packages/flux-renderers-basic/src/surface-renderer-definitions.ts:5-43`；卡 `docs/audits/per-component/dialog.md:22`、`drawer.md:22`（dim 7 pass，无 ctx 留痕）。
- **是什么**：4 处 `onClose/onOpen/onConfirm?.(payload)` 单参派发。onConfirm 是 dialog 提交回调用法最高频的集成点。
- **为什么值得关心**：scheduling/ai 全家族已按 bug-83/CX-10 约定补齐 ctx，basic 的 surface 事件是残留缺口；schema 作者在 onConfirm/onClose action args 里写 payload 模板键会静默失效。
- **信心水平**：确定（4 处派发点 + 卡文本 + CG 分析文本三方对读）。
- **修复状态**：fixed（2026-08-06，plan `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md` Phase 2：`use-surface-renderer.ts` 5 处派发（含 :225 漏计点）补 `eventCtx(payload)` 全量 ctx；契约测试实证 `${surfaceId}` 解析 + onConfirm/onClose 同 id；`check:audit-event-dispatch-ctx` 门禁覆盖）。

### [P2] upload-field 家族（input-file/input-image）7 个事件 payload 携带但单参派发，无 ctx；CG 的「design §8.1 豁免」依据是循环引用

**一句话理由**：onUploadSuccess/onUploadError/onReject/onDelete/onDeleteSuccess/onDeleteFail 全部单参派发；CG Phase 2 把「upload-field design §8.1」当作已裁决依据，但 design §8.1 只文档化 payload 形状、从未文档化单参派发豁免——裁决依据与事实不符。

- **在哪里**：`packages/flux-renderers-form-advanced/src/upload-field.tsx:261,281,300,367,381,393`；`docs/components/input-file/design.md:43-58`（§8.1 无 ctx 条款）；卡 `docs/audits/per-component/input-file.md:22`（dim 7 pass 仅对账 payload 形状）。
- **是什么**：payload 形状与 design §8.1 一致但缺 ctx 第二参；`args: { url: "${item.url}" }` 类模板键静默空值（成员访问甚至抛 TypeError，CX-11 先例）。
- **为什么值得关心**：上传成功/失败回调是表单类组件最常用的宿主同步点；与 22-09/22-11 同型缺口应并入 multi-audit 提议的「事件 ctx 全量扫描」修复计划（该计划已覆盖 graph/wizard，本发现为其扩面输入：dialog/drawer 4 点 + upload-field 7 点）。
- **信心水平**：确定（代码 + design 原文 + CG 文本三方对读）。
- **修复状态**：fixed（2026-08-06，plan `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md` Phase 3：`upload-field.tsx` 7 处派发补 `eventCtx(payload)` 全量 ctx；契约测试实证 `${item.url}`/`${file.url}`/`${error}`/`${reason}` 解析；`check:audit-event-dispatch-ctx` 门禁覆盖）。

---

## 总评

mission 已收尾且整体质量高——上轮 open audit 的 P0/P1（门禁红线、button href、扫描路由）已闭环，2027-1/0556-1 的修复代码我逐项复核（tree-session success-shift、calendar exportToPNG、xui-roles-plugin 导出、gantt 死代码删除、swipe-cell effect 移除、wizard/coverage-manifest 拆分）均与声明一致，不是纸面 green。本轮最值得关注的方向有三：

1. **权威基线文件的同步滞后**（P1）：project-context.md 是每个 agent 的入口文档，门禁数字 0529-1 已修正，它仍是旧值。上一轮 F1 的教训是「plan 文本与 live 门禁脱节」，本轮证明同一个洞还在上下文文件上开着——mission 收尾时缺一道「基线段回写」的机械步骤（如 CG 最后跑一遍门禁把数字写回 project-context）。
2. **事件 ctx 约定在 v2 checklist 出台前的族（C1.x/C3.x）存在系统性盲区**：wizard/graph 已被 multi-audit 抓到，dialog/drawer/upload-field 同根同型但被 CG 的「33 处 100% 已裁决」断言误判为 pass——该断言以「卡 dim 7 pass」反推「已裁决」，而 v2 前的卡根本没查 ctx。建议统一并入 multi-audit 的「事件 ctx 全量扫描」计划。
3. **「零悬挂/已裁决」类台账声明与实际 owner 链的差距**：successor 5 项、CG「100% 已裁决」——在 mission 自己的记账里都对，出了 mission 就没有可执行的载体。mission 收尾时这类「registered」需要落到 `docs/backlog/` 或 successor 机制，否则每轮都会重扫同一批噪声。

## 盲区自评

- **未跑全量 `pnpm test` / `pnpm test:e2e`**：本轮以门禁脚本 + 代码精读为主，行为回归靠 CV 的 full-green 记录与多轮 e2e 归因，未独立复跑（时间成本与 CV/CV successor 重叠）。
- **未逐卡复核 113 张卡的 18 维结论**：只抽查了 swipe-cell/gantt/dialog/input-file/table 五张卡与 live 对账；对 v2 前卡的 dim 7（事件 ctx）盲区只做了重点组件的扩面扫描，可能仍有其他 pre-v2 组件存在同类单参派发（建议「事件 ctx 全量扫描」计划用机械方式扫全仓 `props.events.*.?.(payload)` 单参调用点）。
- **性能/并发类探针未做**：大列表、流式 backpressure、dispatch 并发在本轮无信号，与上轮盲区一致。
- **multi-audit 22 维 P2（42 条）未逐条复核**：其路由与修复计划未在本轮验证落地。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>

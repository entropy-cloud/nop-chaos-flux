# 模式族回扫方法 + 门禁盲区教训：扫描器正则覆盖范围必须含 host 包

## Problem Context

第二轮的核心输入是「审计必漏定律」（lesson 06）：closure 只保证本轮无已知问题。D1 的四模式族回扫（事件 ctx / reaction 三件套 / scope 配对 / i18n 硬编码）被限定在 10 个 `flux-renderers-*` 包，4 个 host renderer 包（flow-designer-renderers / spreadsheet-renderers / report-designer-renderers / word-editor-renderers）被排除在外、靠 D3.x 逐面人工核对——直到 DG 才发现并升级这个扫描器覆盖盲区。

## Initial Judgment

"模式族回扫只要覆盖 10 个 flux-renderers-\* 包就够了，host renderer 包反正归 D3.x 逐面审计。"

## Why It Looked Plausible

- 第一轮的 12+ 个 `check:audit-*` 门禁都是围绕 10 个 flux-renderers-\* 包建立的（当时 host renderer 包还不存在或不在组件审计范围）；
- D3.x 逐面审计已经包含「事件与 action 契约」维度（维度 7），看起来人工核对覆盖了 host 包；
- 逐面人工核对确实发现并修复了问题（ss-2/ss-6/ss-7/ss-9 的 P1 修复），感觉「回扫 + 逐面」组合已经足够。

## Why It Was Wrong

- **人工核对不可复现、不可持续**：D3.1–D3.4 四连登记同一盲区（「`check:audit-event-dispatch-ctx` 不覆盖 XX-renderers，本 plan 人工核零命中」）——每个 plan 都重复声明「人工核零」，说明没有工具覆盖时每次都要重做一遍，且无法防止未来新代码悄悄引入违规点。人工核零的结论也无法被 CI 守卫。
- **扫描器正则的覆盖范围是门禁语义的一部分**：browser-io 门禁（lesson 07 先例）早已扩展为 14 包正则 `^packages\/(?:flux-renderers-[^/]+|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//`，事件 ctx 门禁却仍停留在 `^packages\/flux-renderers-`（10 包）——同族门禁覆盖范围不一致，且无人核对。
- **「归 D3.x 审计」不等于「门禁覆盖」**：逐面审计是一次性动作，门禁是持续性守卫；两者互补而非替代。审计发现的问题修完后，如果没有门禁，同类问题会在未来新代码中回潮。

## Decisive Evidence

- **四连登记**：D3.1（08-08.md:112）、D3.2（:55）、D3.3（:44）、D3.4（:31）各自登记「event-dispatch-ctx 不覆盖 host renderer 包，人工核零命中」——同一盲区被四个 plan 重复发现、重复声明，是「没有工具化」的信号。
- **DG 门禁升级（2026-08-09）**：`find-event-dispatch-without-ctx.mjs` 扫描正则扩展为 14 包形态（对齐 browser-io）；committed 回归测试先红后绿（`find-event-dispatch-without-ctx.test.ts` 新增 host 包正/负例夹具：flow-designer-renderers 缺 ctx 命中、report-designer-renderers 合规通过、flow-designer-core 范围外忽略）；全仓复扫零命中 exit 0——盲区闭合。
- **0150-1 stagedDirs 治理同步落地**：测试夹具从「写入真实包目录」（`packages/<pkg>/__event_dispatch_ctx_fixture__/`）迁移为「临时目录镜像 + `FLUX_AUDIT_SCAN_ROOT` env 判别」（对齐 browser-io 先例），杀进程不留残骸。

## Correct Decision Rule

模式族回扫的扫描范围必须与目标面一致：**凡是 `check:audit-renderer-browser-io` 覆盖的 14 个 renderer 包，其他 renderer 语义门禁（事件 ctx / raw-schema-reads 等）也必须覆盖同样的包清单**——host renderer 包不能因为「归 D3.x 逐面审计」就被排除在门禁之外。同族门禁的覆盖范围应定期横向比对（教训 07 的「警惕门禁全绿 ≠ 门禁在扫」在此具体化为「覆盖范围横向一致性核对」）。门禁规则变更必须带 committed 回归测试先红后绿（roadmap Cross-Cutting 门禁纪律）。

## Preventive Checklist

- 建立/修改任何 renderer 语义门禁时，先核对同族门禁的包覆盖清单（以 browser-io 14 包为基准），不一致即登记修复；
- 新 renderer 包加入时同步核对全部 `check:audit-*` 扫描范围（新增包 ≠ 自动被扫，正则要显式列包名）；
- 门禁回归测试必须含：目标包正例（命中）、目标包负例（通过）、范围外包负例（忽略）——三态齐备才锁定覆盖语义；
- 夹具治理统一走「临时目录镜像 + env 判别」先例（0150-1），不在真实包目录留测试残骸；
- 逐面审计发现的问题修复后，检查是否有对应门禁可落地；有则落门禁 + 回归测试，防止「修了又回潮」。

## Related Files / Docs

- `scripts/audit/find-event-dispatch-without-ctx.mjs`（14 包正则，DG 扩展）、`scripts/__tests__/find-event-dispatch-without-ctx.test.ts`（6 用例三态夹具）
- `scripts/audit/find-renderer-browser-io.mjs`（14 包覆盖基准 + `FLUX_AUDIT_SCAN_ROOT` env 先例）
- `docs/logs/2026/08-08.md`（D3.1–D3.4 四连盲区登记）、`docs/logs/2026/08-09.md`（DG 门禁升级节）
- `docs/audits/round2-index.md`（Audit Tool Baseline 节门禁升级行）
- `docs/lessons/07-tool-gate-sedimentation-with-committed-regression-tests.md`（门禁纪律先例）

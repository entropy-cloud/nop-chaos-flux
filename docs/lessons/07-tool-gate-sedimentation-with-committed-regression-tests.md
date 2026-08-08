# 工具门禁沉淀法：每修一类模式落一个 check + committed 回归测试（基线零命中才是真收口）

## Problem Context

第一轮逐组件审计沉淀了 14 项 `check:audit-*` 工具门禁（root `package.json` 28 项 `check:*` 中的 audit 门禁子集，含第一轮新增的 `check:audit-renderer-browser-io` / `check:audit-event-dispatch-ctx`）。08-07/08-08 多轮全量重跑零新增命中。但门禁自身也出过回归：`check:audit-renderer-browser-io` 的扫描范围正则被 commit `6d2497ea`（2026-08-07「widen 14 renderer 包」）改坏，**10 个 flux-renderers-\* 包被静默漏扫**——门禁「全绿」却不扫目标，比没有门禁更危险。

## Initial Judgment

"门禁写出来、跑一次 exit 0，就算把这类模式防住了。" 或 "门禁是验收工具，不是被测对象，它自己不需要测试。"

## Why It Looked Plausible

- 门禁脚本一次性跑通后输出全绿，看起来已经把模式族挡住；
- 修复类模式时「落一个 check」的产出是脚本本身，容易把「脚本存在」误当「模式被防住」；
- 扫描正则这类静态逻辑改动（widen 包清单）看起来是低风险小改动，不触发测试直觉。

## Why It Was Wrong

门禁与产品代码一样会被修改、会回归，且**门禁回归的形态是静默的**——扫描范围收窄/正则失配时门禁仍 exit 0，只是少扫了目标。`6d2497ea` 把 `^packages\/flux-renderers-`（前缀，正确）改坏为 `^packages\/(flux-renderers-|...)\/`（要求 `flux-renderers-` 后紧跟 `/`，10 个包全漏），真实仓库复扫零命中是因为代码恰好干净，不是门禁在工作。没有 committed 回归测试的门禁，其「全绿」输出没有证明力。

## Decisive Evidence

- **门禁回归先例**：`6d2497ea`（2026-08-07）正则漂移漏扫 10 包，0150-1 修订为 `^packages\/(?:flux-renderers-[^/]+|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//` 并锁定——修订后 `check:audit-renderer-browser-io` live 零命中（`docs/logs/2026/08-08.md` 0150-1 节 Phase 3）。
- **committed 正例夹具**：`scripts/__tests__/find-renderer-browser-io.test.ts:60-64`——flux-renderers-data 包 fetch 夹具同时锁定前缀覆盖 + `FLUX_AUDIT_SCAN_ROOT` env 判别力（先红后绿）。
- **门禁回归套件**：`scripts/__tests__/` 6 files / 15 tests 全绿（`pnpm test:scripts`，vitest.scripts.config.ts）——D0/D1/D2/DB 多轮实测在案（`docs/logs/2026/08-08.md`）。
- **基线零命中才是收口**：08-07/08-08 多轮 `pnpm check` exit 0（28 项 `check:*` 27/28，`check:duplicates:detail` 为无阈值 raw dump 固有 exit 1 非门禁；oversized 仅 2 条既有 locale 豁免）——修复 + 门禁 + 门禁测试三者齐备后，模式族才真正不再回潮。

## Correct Decision Rule

**每修一类模式，必须落齐三件套**：① 一个 `check:` 门禁（纳入 root `package.json`）；② 门禁自身的 committed 回归测试（`scripts/__tests__/`，含正例夹具 + 负例，先红后绿）；③ 基线零命中验证（真实仓库 exit 0）。门禁规则变更（含扫描范围/正则/allowlist）必须带 committed 回归测试，否则不得修改——这是 round-2 roadmap Cross-Cutting 门禁纪律。

## Preventive Checklist

- 新增门禁：先在 `scripts/__tests__/` 写正例夹具（真实包名形态），先红后绿再上线；
- 修改门禁规则：扫描范围/正则/allowlist 变更必须同步更新对应回归测试，禁止「只改脚本不加测试」；
- 全量重跑：每轮收口复跑 `pnpm check` + `pnpm test:scripts`，与基线逐位比对，零新增命中才算真收口；
- 警惕「门禁全绿 ≠ 门禁在扫」：定期核对扫描范围正则覆盖的包清单与目标范围一致（browser-io 教训）；
- 门禁回归套件本身纳入 CI/收口验证，`pnpm test:scripts` 红则收口不成立。

## Related Files / Docs

- `scripts/__tests__/find-renderer-browser-io.test.ts`（正例夹具 :60-64）、`scripts/__tests__/` 其余 5 个门禁测试文件
- `scripts/audit/find-renderer-browser-io.mjs`（修订后扫描范围正则）、`scripts/audit/shared.mjs`、`scripts/audit/rules.mjs`
- `docs/logs/2026/08-08.md`（0150-1 节 Phase 3 正则修订 + D0/D1 门禁基线重跑）
- `docs/backlog/component-audit-round2-roadmap.md`（Cross-Cutting 门禁纪律）
- 门禁清单：root `package.json` `check:*`（28 项，含 14 项 `check:audit-*`）

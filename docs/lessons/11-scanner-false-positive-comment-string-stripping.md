# 扫描器假阳性盲区类：注释/字符串剥离缺失 + 命中面校准（全绿输出仍可能命中非代码文本）

## Problem Context

`check:audit-*` 扫描器（lesson 07 沉淀的行级/窗口级文本扫描形态，无 AST）在 2026-08-09 工具治理轮次（plan `2026-08-09-0444-1`，completed + closure-audit pass）暴露出一整类盲区：**多条规则跑在未剥离注释/字符串的原始文本上，把注释里提到的目标 token、字符串字面量里的目标形态误判为代码命中**。假阳性不会让门禁失败（桶是 informational，exit 0），但会持续污染「零新增命中」对比基线——基线里混着假阳性，未来真命中的新增会被淹没在噪音里，且每次人工核对都要重新识别哪些是注释/字符串、哪些是真代码。

## Initial Judgment

"扫描器是逐行/窗口级正则匹配，命中数在基线里已经稳定（styling 142、performance 22、react19 517/5、async 227、test-global-leaks 47），这些输出都是真代码命中，注释和字符串里的关键词不会造成问题。"

## Why It Looked Plausible

- 扫描器输出「全绿」（exit 0），且多轮全量复扫计数稳定，看起来输出即真相；
- 部分规则确实已具备注释安全能力（`scanBalanced` 系自带注释状态机、raw-schema-reads 已修），容易让人以为所有规则同构安全；
- 注释/字符串里出现目标 token 的概率看起来低，属于「没人遇到的边界情况」。

## Why It Was Wrong

- **假阳性实锤在案**：`packages/flux-renderers-ai/src/styles.css:110` 是块注释内行（`/* P6 (A6)...` 跨行注释，106 起至 110 闭合），被 `scanBareDataSlotSelectors` 逐行 `includes('[data-slot')` 命中——styling 桶 142 命中里至少 1 条是注释文本，不是代码；
- **结构盲区不止一处**：performance `scanJsonStringifyChangeDetection` 的 6 行窗口、broad-scope 的 `\buseScopeSelector\s*\(/g` 正则、react19 窗口规则、async 规则全部无注释/字符串剥离——`icon.tsx:23` 模板字符串假阳性、`graph-renderer.tsx:285`/`steps-renderer.tsx:142`/`timeline-renderer.tsx:161` 注释内触发窗口假阳性、async 227→226 注释假阳性逐条实锤；
- **假阳性是静默守卫噪音**：桶 exit 0 意味着假阳性永不报错，只会让基线虚高；「零新增命中」对比在虚高基线上做，信噪比被侵蚀，人工核对的注意力被浪费在非代码文本上。

## Decisive Evidence

- **修复模式（0444-1 Phase 2，test-first）**：行级规则复用 `getCodeTextForLine`（`scripts/audit/shared.mjs:45`）/`isCodePosition`（`shared.mjs:114`）；react19 窗口规则新增 `getCodeWindow`（`scripts/audit/react19-rules.mjs:11-19`，注释剥离窗口，eslint-disable 仍读 raw 窗口）；reactive-render-reads/async-failure/fieldframe/test-global-patch/hardcoded-type-dispatch 补 `isCodePosition`。
- **committed 回归测试先红后绿**：`scripts/__tests__/find-tool-governance-gates.test.ts` 12 条合成夹具（块注释含目标 token 负例 + 真实代码正例），git stash 对照修复前基线 **7/12 先红**、修复后 **12/12 全绿**——证明修复前确实存在假阳性盲区。
- **全量复扫零新增对比**：styling 142→141（-1 注释假阳性）、performance 22→21（-1 字符串假阳性）、react19 517/5→514/4（-3 注释假阳性）、async 227→226（-1 注释假阳性）、reactive 19→19（零变化）——计数只降不升，全部为注释/字符串假阳性移除，零新增真命中；`styles.css:110` 从 styling 输出消失。
- **命中面校准证据链（0444-1 Phase 3）**：test-global-leaks const 容器识别初版粗匹配 `^const X = [|{` 命中 166 条未裁决 → 以 live 命中面校准收敛为**仅变异容器**（`isMutatedConstContainer`，`shared.mjs:451`：mutator 方法调用 push/set/add/... + 成员/索引赋值 + `Object.assign`/`defineProperty`）+ 泛型构造器（`new Set<() => void>()` 箭头形态）→ 166 条粗命中全部校准归零，终态 **57/2 = 47 基线 − 1 字符串假阳性（`c2-5-host-surfaces.spec.ts:67`，isCodePosition 修复）+ 11 条 landed**，裁决表零悬挂。

## Correct Decision Rule

**行级/窗口级扫描规则必须跑在注释/字符串剥离后的 code-only 文本上**：凡是逐行 `includes`/正则匹配目标 token 的规则，一律复用 `getCodeTextForLine`（单行）/`isCodePosition`（index 判定）；窗口类规则用 `getCodeWindow`（剥离后的窗口，eslint-disable 等注释指令按需仍读 raw 窗口）。规则变更必须带 committed 回归测试（负例 = 注释/字符串含目标 token 不命中；正例 = 真实代码命中），先红后绿，并做全量复扫对比（计数只降不升、零新增命中才算收口）。**判定规则的语义以 live 命中面校准**：新规则先粗扫看命中面规模，再用真实代码形态收敛规则（166 条粗命中 → 仅变异容器 + 泛型构造器 → 57/2 零悬挂），不允许粗匹配规则带数百条未裁决命中上线。

## Preventive Checklist

- 新增/修改任何行级、窗口级 `check:audit-*` 规则时，检查是否对目标 token 做了注释/字符串剥离（`getCodeTextForLine`/`isCodePosition`/`getCodeWindow` 在案，直接用）；
- 窗口类规则的注释指令（eslint-disable 等）逐条确认读 raw 窗口还是剥离窗口，避免「剥离过头」或「剥离不到」；
- 每类修复带 committed 回归测试：注释/字符串含目标 token 负例 + 真实代码正例，先红后绿（git stash 对照基线是标准手法）；
- 全量复扫对比基线计数：收口时计数只降不升（移除假阳性）或新命中全部裁决落地（零悬挂），不得带未裁决粗命中上线；
- 新规则上线前先粗扫看命中面规模，命中面数量级异常（百条级）即信号：规则语义未收敛，先以 live 命中面校准再落地；
- 「全绿 exit 0」≠「输出无噪音」：informational 桶里的假阳性会侵蚀零新增对比基线，定期用剥离后的复扫计数核对基线健康度。

## Related Files / Docs

- `scripts/audit/shared.mjs`（`getCodeTextForLine` :45、`isCodePosition` :114、`isMutatedConstContainer` :451）、`scripts/audit/rules.mjs`（`scanBareDataSlotSelectors` :325-349 等）、`scripts/audit/react19-rules.mjs`（`getCodeWindow` :11-19）
- `scripts/__tests__/find-tool-governance-gates.test.ts`（12 条 committed 回归用例，RED→GREEN 证据）
- `packages/flux-renderers-ai/src/styles.css:110`（块注释假阳性实锤，修复后从 styling 输出消失）
- `docs/plans/2026-08-09-0444-1-round2-tool-governance-scanner-and-test-infra.md`（Closure 节：修复模式 + 裁决表 + 复扫计数）
- `docs/logs/2026/08-09.md`（工具治理轮次节）
- `docs/lessons/07-tool-gate-sedimentation-with-committed-regression-tests.md`（门禁沉淀法先例）、`docs/lessons/10-pattern-family-rescan-scan-scope-must-cover-host-packages.md`（门禁覆盖范围纪律）

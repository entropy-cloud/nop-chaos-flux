# 审计必漏定律：Closure 只保证「本轮无已知问题」（post-closure audit 制度）

## Problem Context

大规模逐组件审计（mission component-audit，C0–C9 + CX-1..CX-12，113 卡）于 2026-08-06 收口，CV full-green（`pnpm test` 10,397 passed / 0 failed，e2e 1054 passed / 43 skipped / 6 watch-only 归因清单）。但收口后安排的两轮追加审计（2026-08-06 open-audit / 2026-08-07 multi-audit）**仍发现 85 条 P2（08-06 批 46 + 08-07 批 39）且多为真缺陷**——pointercancel 缺失、polling 挂载序竞态、无限滚动重试跳页、NaN fail-closed 缺口、gantt 键盘编辑派发错通道、事件 ctx 别名盲区等。这一「收口即出新问题」的节奏不是执行质量问题，而是审计方法论的必然属性。

## Initial Judgment

"CV full-green（10,397 单测 + 1054 e2e 全绿）= 组件族没有已知问题了，可以进入收尾轮。"

## Why It Looked Plausible

- 10,397 单测 + 1054 e2e 的量级在数字上覆盖极广，容易把「测试全绿」误读为「缺陷不存在」；
- 第一轮 113 张审计卡逐面审计 + 12 个 `check:audit-*` 门禁沉淀，看起来已经把模式族扫干净了；
- 收口轮（CV）本身做了全量验证 + watch-only 归因清单，看起来闭环完整。

## Why It Was Wrong

审计是**抽样**而不是**枚举**：每轮审计的发现量受审计维度、审计者视角、代码新增节奏共同决定。closure 只证明「本轮审计覆盖过的面没有已知问题」，不证明「面之外没有未知问题」。后续轮次用不同视角（open-audit 对抗式 / multi-audit 多面并行）复查时，会命中前一轮没看的角度——这不是轮次执行差，而是审计轮次之间存在**视角盲区互补**，间隔越长、累积的新代码越多，盲区越大。

## Decisive Evidence

- **收口基线**：mission 08-06 收口 CV full-green——10,397 passed / 0 failed + e2e 1054 passed / 43 skipped / 6 watch-only 归因清单（`docs/logs/2026/08-06.md` CV 节、`docs/backlog/component-audit-roadmap.md` CV 行）。
- **两轮 post-closure 新发现**：08-06 批 46 + 08-07 批 39 = **85 条 P2**，其中真缺陷占多数——2-14 四 drag hook 无 pointercancel（`use-gantt-drag`/`use-gantt-link-draw`/`use-calendar-drag`）、2-10 polling 挂载序竞态、2-9 无限滚动失败重试跳页、15-2 NaN fail-closed、2-19 gantt 键盘编辑派发错通道、1-3/2-7 事件 ctx 扫描器别名盲区（`docs/logs/2026/08-06.md`、`docs/logs/2026/08-07.md`、`docs/backlog/component-audit-round2-roadmap.md` 目的/Gap Analysis 节）。
- **逐条修复在案**：85 条由 08-07/08-08 各 P2 修复 plan 收口——2228-1（crud/data 9 条）/ 2228-2（scheduling/content 12 条）/ 2228-3（runtime/form 11 条）/ 1747-1/2/3（P1 + 同根 P2）、2306-3、0819-1、1023-1、0421-2、0150-\* 等，全部 `completed`（`docs/logs/2026/08-07.md`、`docs/logs/2026/08-08.md`）。
- **第二轮立项即制度落地**：round-2 roadmap 把「审计必漏定律」列为 Gap Analysis 第一条，对策 = D1 门禁漂移回扫 + D2 P3 裁决 + D3 host 大面审计（第一轮未覆盖的新范围）（`docs/backlog/component-audit-round2-roadmap.md`）。

## Correct Decision Rule

**closure 的定义 = 「本轮审计面无已知问题」，不是「组件族无问题」。** 任何大规模审计收口后必须安排 **1–2 轮 post-closure audit**（换视角：open-audit 对抗式 + multi-audit 多面并行），且**审计轮之间间隔不宜长**（间隔越长，累积的新代码越多，盲区越大）。收口轮的数字（测试量级、覆盖率、门禁命中数）是审计投入的证据，不是缺陷不存在的证据。

## Preventive Checklist

- 大规模审计 mission 收口时，把「post-closure audit」写成 roadmap 依赖项而非可选项；
- 收口轮 full-green 记录同时列出 watch-only / 归因清单，明确「已知未知」边界；
- 每轮审计结束后立即安排下轮（间隔 ≤ 数日），不要等新功能堆叠后再回扫；
- post-closure 轮必须换视角（对抗式 / 多面 / 工具门禁回扫），不能复读上一轮维度；
- 新发现的缺陷逐条路由到修复 plan，全部落地后才允许进入下一个收口轮。

## Related Files / Docs

- `docs/logs/2026/08-06.md`（CV 收口 full-green）、`docs/logs/2026/08-07.md`、`docs/logs/2026/08-08.md`（85 条 P2 修复收口）
- `docs/backlog/component-audit-round2-roadmap.md`（Gap Analysis 第一行「审计必漏定律」+ 第二轮对策 D1/D2/D3）
- 第一轮 `docs/backlog/component-audit-roadmap.md`（CV 行）
- 修复 plan：`docs/plans/2026-08-07-2228-{1,2,3}-*.md`、`docs/plans/2026-08-07-1747-{1,2,3}-*.md`、`docs/plans/2026-08-08-0150-*.md` 等

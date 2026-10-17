# Final Maturity Audit Ledger（最终成熟度审计台账）

> 建立：FM-0（plan `docs/plans/642-final-maturity-fm0-table-interaction-plan.md`，2026-10-18）。
> 结构沿用 `docs/audits/interaction-state/` 台账模式：逐条 ID + 三态归族 + 状态机 + 对账口径。
> 本台账是 final-maturity-audit roadmap（FM-0–FM-8）全部批次的**统一发现落点**：FM-1a/FM-1b 交互实操走查、FM-2/FM-3/FM-4 三路终审、FM-5 渲染面复检的发现一律登记于此，roadmap 关闭前置 = 台账 uncovered=0 且全部 work item done。

## Finding 状态机

`pending → found（证据/红测试已立案）→ fixed（修复落地）→ verified（复检通过）`
不修时 disposition 填三态归族之一：`local → FM-6` / `systemic → FM-7` / `watch-only（本表留观，附 Why Not Blocking）`。

## ID 约定

`FM-<三位序号>`；批次归属写在每条 Row 的 `batch` 列（如 FM-0、FM-1a）。

## 对账口径

- `grep -c "verified" ledger.md` 与 fixed/verified 行数核对；
- 每条 fixed/verified 必须有判别测试或程序化取证指针（e2e spec + 测试名 / computed style 读数 / 截图路径 `_tmp/fm0-probe/`）；
- watch-only 条目必须带 `Why Not Blocking` 一句话理由（Anti-Slacking Rule）；
- 姊妹队列坐标（interaction-state / workaround / cross-roadmap UR / RM metamodel）注记在条目内，防双记账。

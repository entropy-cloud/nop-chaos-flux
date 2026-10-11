# 临时方案与坏味道审计落点（Workaround & Code-Smell Audit Artifacts）

> 建立者：plan 560（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` WA-0）。
> 本目录是临时方案审计轨道的台账与批次报告落点；审计方法与判定口径见 `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议 + §6 报告格式），执行编排见 roadmap。

## 文件清单

| 文件                     | 作用                                                                                                                                          | 再生成/维护方式                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `inventory/modules.json` | 审计对象程序化清单：49 模块（41 包 + playground 8 子域）× 批次 × 非测试源码行数 × 文件清单 × 字面/模式扫描基线计数 + roadmap 基线 cross-check | `pnpm workaround:inventory`（勿手编）                                                   |
| `ledger.md`              | 双 section 台账：modules（覆盖状态）+ findings（发现全量登记）                                                                                | modules 行由枚举器再生成；状态翻转由批次 plan 生命周期写入；findings section 纯人工维护 |
| `report-template.md`     | 批次审计报告模板（prompt §6 单条发现 12 字段 + 汇总 5 项 + 覆盖声明节）                                                                       | 各批报告照此撰写，模板本体改动需修订 plan                                               |
| `wa-<N>/report.md`       | 各批次审计报告（小写批次号：`wa-1/`…`wa-16/`）                                                                                                | 各批 plan 产出                                                                          |
| `cx-<n>/report.md`       | 跨批共性工作项 CX-n 的独立修改计划配套取证/报告目录                                                                                           | CX-n plan 产出                                                                          |

## 再生命令

```bash
pnpm workaround:inventory    # 扫描 live 文件系统再生成 modules.json + ledger modules 行
pnpm workaround:reconcile    # 结构对账 + 机器判定计数（非 strict：结构违例 exit 1）
pnpm workaround:reconcile --strict   # WA-16 关闭门禁：uncovered=0 且 未处置=0 且 零结构违例
```

枚举器即测试（`scripts/workaround-audit/generate-workaround-inventory.test.ts`，独立 vitest config；台账 lib 为 erasable-only TS（`workaround-ledger-lib.ts`），`pnpm workaround:reconcile` 由 node 原生类型剥离直跑，不入 turbo `pnpm test` 任务族）。守卫：`packages/` 下新出现含 `src/` 的未登记包、或 playground/src 下未被任何子域覆盖的非测试 `.ts`/`.tsx` 文件，都会使枚举器红且**不写任何产物**——此时必须先修订 roadmap 批次范围再再生成。

## 状态机与台账纪律

- **modules**：`pending → audited`（批次报告含覆盖声明后由批次 plan 翻转）；`orphan` = 清单中已消失（终态，不计 uncovered）。
- **findings**：`pending → found（取证立案）→ fixed（修复落地）→ verified（复检通过）`。
- **发现 ID**：`WA-<pkg短名>-<seq>`（如 `WA-runtime-001`）——与工作项 ID `WA-0`…`WA-16` 是两个命名空间；`<pkg短名>` 取包名去 `flux-` 前缀的短名（如 `flux-runtime` → `runtime`、`ui` → `ui`、`editor-core` → `editor-core`；playground 子域用 `pg-<scope>`，如 `pg-complex-pages`）。
- **去向四态**（不修的发现必须显式标注其一，零静默）：`watch-only` / `successor-required` / `withdrawn` / `n-a`。
- **未处置**（plan 560 draft review R1 精化口径）：`pending` 行 + 无显式去向的 `found` 行；`found` 带去向四态之一即已显式处置。

## 对账口径（reconcile 输出契约）

| 计数                            | 定义                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `audited`                       | modules 行 status=audited 的数量（= 已被批次报告覆盖声明收编的模块）                  |
| `uncovered`                     | modules 行 status=pending 的数量（枚举清单中未出现在任何批次报告覆盖声明里的模块）    |
| `findings`                      | findings 总行数（= pending + found + fixed + verified）                               |
| `found/fixed/verified`          | 各状态计数                                                                            |
| `watch/withdrawn/n-a/successor` | 去向四态计数                                                                          |
| `未处置`                        | pending findings + 无去向 found findings；**WA-16 关闭前置：uncovered=0 且 未处置=0** |

结构违例（两模式均抓）：inventory 有行而台账无行；台账行批次与 inventory 不一致；`audited` 但批次报告 `wa-<N>/report.md` 不存在；finding 引用不存在的 module；非法状态/去向词；finding ID 不符合 `WA-<pkg短名>-<seq>`；fixed/verified 行残留去向标注。

## 批次报告覆盖声明 → modules 行翻转流程

1. 批次 plan 按 `report-template.md` 产出 `wa-<N>/report.md`，覆盖声明节列出本批实际取证的模块 id 清单。
2. 批次 plan 将对应 modules 行 status 翻转 `audited`（同 commit 回写 roadmap 批次行状态）。
3. `pnpm workaround:reconcile` 结构校验通过（含批次报告文件存在性）。
4. 再生成安全：`workaround:inventory` 保留 audited 状态与 note，不重置。

## 基线 cross-check 说明

`modules.json.roadmapCrossCheck` 记录 roadmap 基线节（2026-10-10）四项计数的 live 复测值与 delta。表达式口径：roadmap 四项用其原文命令的窄表达式（literalEn 不含 XXX、literalZh 不含 workaround/hotfix、typeBypass 仅 `as any|@ts-ignore`、setTimeout 为 packages+playground 全域 89 处口径）；per-module 候选基线（`baseline` 字段 9 项）用 prompt §5 全表达式。两套口径差异属表达式范围差异而非计数错误。

Plan 560 Phase 1 首跑实测（2026-10-11）：

| 项                                       | 值        | 对账                                                                         |
| ---------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| packages loc                             | 258,423   | roadmap 258,396（+27，+0.01%，10-10 后代码提交自然漂移，±2% 容差内）         |
| playground loc                           | 51,611    | 精确一致                                                                     |
| literalEn（roadmap 口径）                | 1         | delta 0                                                                      |
| literalZh（roadmap 口径）                | 13        | delta 0                                                                      |
| typeBypass（roadmap 口径）               | 46        | delta 0                                                                      |
| setTimeout（全域）                       | 89        | = roadmap 72(packages) + 17(playground) 注记口径                             |
| typeBypass（prompt 全表达式）            | 371       | = 46 + 325（`as unknown as`/`@ts-expect-error` 行，grep 实测吻合、零重叠行） |
| silentCatch / keyRemount / testEnvBranch | 0 / 0 / 0 | grep 实测吻合                                                                |
| domRaid                                  | 78        | grep 实测吻合                                                                |
| pixelNudge                               | 1         | —                                                                            |

基线计数仅是候选线索（prompt §5），禁止按 grep 定案；各批取证仍须全量执行 §5 协议（含 git 考古与抽读走读）。

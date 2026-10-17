# R7 编辑态包络数字人工最终确认提交物

> 日期：2026-10-17
> 性质：mission 级阈值人工确认提交物（`roadmap-industrial-hmi-editor.md` Cross-Cutting「人工确认阈值」+ `editor-initiation.md §6 R7`）
> 确认材料：`docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（E9.2 runtime 3 层 App 复测报告）
> 确认载体：cross-roadmap 收口 plan `docs/plans/632-cross-roadmap-wave-a-status-closure-plan.md` Phase 2（AskUserQuestion 人工裁决记录）

## 确认请求

| §3 # | 包络维度         | 裁定建议值                           | E9.2 复测值（runtime 3 层 App）               | 余量         |
| ---- | ---------------- | ------------------------------------ | --------------------------------------------- | ------------ |
| ①    | 拖拽响应         | ≥30fps @ 选区 ≤1k（primary，中性档） | best 50.2fps @ 1k（3 采样取最大；稳态 50fps） | 1.67×        |
| ②    | 编辑操作响应     | <100ms per-call                      | n=100 max 13.1ms / n=1000 max 6.8ms           | ~7.6×        |
| ③    | 选区规模         | ≤1k primary / ≤10k extended          | 1k 实测达标；extended 未升级                  | primary 达标 |
| ④    | 内存             | ≤320MB                               | 50.2MB @ 1k 图元                              | ~6.4×        |
| ⑤    | runtime 最终验证 | E6（M1 gate）+ E9.2（M3 复测）       | 均已完成，①②④ 达标                            | 闭环         |

已知 watch-only residual：1k 选区**首次**拖拽初始化 7.5fps（leafer EditBox/simulateTarget 一次性构建，稳态 50fps；典型工业选区 ≪1k，非阻断）——维持 `[E1.1-sg]` watch-only 分类。

## 人工确认结论（2026-10-17）

**确认通过**——primary 包络 ①≥30fps@≤1k / ②<100ms per-call / ③≤1k primary / ④≤320MB 确立为 mission 级编辑态包络数字；extended（≤10k）维持留观察不做升级；`[E1.1-sg]` 首次拖拽初始化 jank 维持 watch-only。

- 确认人：用户（AskUserQuestion 选项「确认通过 (Recommended)」，2026-10-17，plan 632 执行会话记录）
- R7 状态：**closed（人工确认通过）**；roadmap 全部 R7 相关处已按此结论回写（见 plan 632 Phase 5）。

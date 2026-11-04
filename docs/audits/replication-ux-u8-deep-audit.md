# 复刻页 UX 保真 U8 阶段深度审计报告

> Created: 2026-11-04（plan 853，三组独立 fresh 子代理深审）
> Verdict: **Pass**（零 Blocker / 零 Major / 9 Minor 全部当场处置或登记）
> 审计对象面：plans 845-852+851（U0-U7 全部交付）、7 份走查/归族/复检报告、improvement-analysis 台账、replication.css/渲染器修复 diff、21 页 spec 族（209 test）

## 组① mobile 族 U1 + U6 归族渲染器保真度 — Pass（3 Minor）

抽核 9/9 修复声称全部落盘且与基准卡 §2.1/§2.2 数值精确一致；判别单测"旧实现必挂"机制真实（pivot 分流 mock / styles-token-resolution 负回顾正则 + 哨兵 / bottom-panels 源码契约〔已声明脆弱形态〕/ kanban DOM 断言）；四包 focused 全绿（pivot 68 / layout 164 / mobile 384 / scheduling 1099）；spec 断言零计划外弱化（U1-U6 窗口仅 M3 交互④一处允许裁决）；live 探针反例排查未推翻达标判定。

- m-1-1（Minor，证据溯源缺口）：plan 846 Phase 1 目标注明截图证据 `_tmp/ux-fidelity/u1/`，实际 u1 走查截图为 IAB 会话内评审证据未持久化，评分卡 grounding 独立复现不可行。→ 处置：plan 846 目标行就地勘误附注（证据形态为会话内评审 + git diff 逐文件核证 + e2e 可复跑）；后续批次（U2-U7）证据已持久化，无回改。
- m-1-2（Minor，cosmetic）：S1 秒杀横幅内 progress 条为默认蓝 primary，叠红橙渐变底观感突兀（未入册未裁决）。→ 处置：登记 residual（见 §处置表）。
- m-1-3（Minor，样式债）：`.repl-mall-btn-*` 三连 `!important` 覆盖，与设计系统整改方向相逆。→ 处置：登记 U6 后续清理债（improvement-analysis 附注）。

## 组② desktop 族四批 U2-U5 — Pass（3 Minor）

6/6 修复声称实证（I1 探针 DOM 一对钮 + 11/11、I2 双轴结构、K2 列宽 340 零截断、C3 aspect-ratio、V3 checkFence 极性独立复算 + 几何核算吻合、F1 #4 销单有据）；4 条断言 diff 零弱化裁决核实为真；评分卡计数台账与 spec 实体吻合；focused 复跑 23/23。

- m-2-1（Minor）：V3 spec ~L120 注释 "~1.8 km / 800 m fence" 漂移（断言不受影响）。→ 处置：当场勘误。
- m-2-2（Minor，误报勘误）：组② 称 `.nop-steps` 覆盖块现存——以 HEAD grep 实证为零命中，U6 已移除（组① 与仓库一致）；本报告勘误组②该条。
- m-2-3（Minor）：同 m-1-3（!important 债，合并处置）。

## 组③ 基准卡/方法/复检对账/登记台账 — Pass（3 Minor）

上游基准保真度 17/17 抽核命中（令牌逐值/结构/TSX 要点）；登记台账无虚构、fixed 声称全部 live 实证；复检对账抽 5 页全溯源；roadmap 八行 done 与 plan 实体一致；F-S1-5 跨报告链七处无断链。

- m-3-1（Minor，簿记漂移）：plan 847 Closure Gates 五项 + Phase 3 Exit 未勾，与 Closure 段证据/roadmap done 矛盾。→ 处置：当场补勾勘误。
- m-3-2（Minor，簿记漂移）：plan 849 Phase 3 in-progress 注记 / plan 848 Phase 3 措辞自相矛盾。→ 处置：当场勘误。
- m-3-3（Minor，引用出处延伸）：recheck §3 W1 行引"壳 chrome 豁免（baseline §2.3）"——该豁免仅覆盖 tab bar；W1 residual 实际登记理由为"工业 PDA 形态诉求"（u1 F-W1-2/3）。→ 处置：recheck 就地勘误附注。

## 处置表汇总

| 级别          | 条目                      | 处置                                                                 | 落点                          |
| ------------- | ------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| Blocker/Major | 无                        | —                                                                    | —                             |
| Minor         | m-1-1 证据形态勘误        | 当场勘误附注                                                         | plan 846                      |
| Minor         | m-1-2 progress 蓝条       | 登记 residual（cosmetic，双主题一致性观感，不影响可达性/对比度门限） | 本报告 + improvement-analysis |
| Minor         | m-1-3/m-2-3 !important 债 | 登记 improvement-analysis（组件化时消除）                            | improvement-analysis          |
| Minor         | m-2-1 V3 注释漂移         | 当场勘误                                                             | V3 spec 注释                  |
| Minor         | m-2-2 覆盖块误报          | 本报告勘误组②该条（HEAD grep 实证）                                  | 本报告                        |
| Minor         | m-3-1/m-3-2 簿记漂移      | 当场补勾/勘误                                                        | plans 847/848/849             |
| Minor         | m-3-3 豁免引用出处        | 就地勘误附注                                                         | recheck-report                |

## 总结论

U0-U7 全部交付面经三组独立深审：修复保真度与上游基准精确一致、断言真实性零计划外弱化、评分卡/对账/台账诚实无虚构。verdict **Pass**（roadmap §7 口径：零未处置 Blocker/Major）。9 Minor 全部当场处置或登记，无静默降级。

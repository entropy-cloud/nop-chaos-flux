# F3 验证阶段深度审计（business-page-replication roadmap M4-F3）

> Status: final
> Date: 2026-11-02
> Plan: `docs/plans/843-business-replication-f3-verification-deep-audit-plan.md` Phase 1
> Auditor / Agent: 独立 fresh sub-agent（不复用执行者上下文，只读 + 本报告新建）
> 审计对象: F 阶段验证产出——`docs/audits/business-replication/f1-unified-ux-acceptance.md`（plan 838）、`docs/analysis/business-replication/f2-replication-summary-and-gap-ledger.md`（plan 842）、roadmap §2 F1-F3 行；不重跑 P1/P2 页面保真度审计

## 结论（Verdict）

**Pass（final；round-1 Fail 1 Major / 4 Minor → round-2 复核全部处置，见 §Round-2）。** F1 验收覆盖完整、证据真实（快照 21 张在案、family 复跑 236+1 计数属实、K2 flake 台账行与证据链一致、axe 28=25+3 路由实测核对）；F2 §2 汇总与底账双向核对零遗漏、抽 7 处锚点零漂移。唯一 Major 为 roadmap 头部状态与 §2 行状态矛盾（头部仍称 F1/F2 `active`，§2 两行已 `done`）——就地勘误一行即可解除，不触动 F1/F2 结论本体。

## 方法

对照 live repo 静态审读 + 证据文件实地核对（未实跑 playwright，符合任务纪律）；快照独立目检抽 4 页（K2/V3/W1/M3）；底账（missing-components L7.9/L7.10、improvement-analysis 2026-11 登记、e2e-flake-ledger、axe-baseline `_notes`、scanner-baselines `_header`）与 F2 §2 逐条双向比对；F1 报告四支柱逐项对照 roadmap F1 行四要素、plan 838、D1 §3/§4。

## Findings

| # | 级 | 面 | 位置 | 发现 | 证据 | 处置建议 |
| --- | --- | --- | --- | --- | --- | --- |
| MAJ-1 | Major | ④ contract drift | `docs/backlog/business-page-replication-roadmap.md:4` | 头部状态行称「M4 验证进行中——F1〔plan 838〕/F2〔plan 842〕**active**」，而 §2 F1 行（:89）/F2 行（:90）均为 `done`（两 plan 均 completed + closure audit approved）。头部自注「2026-11-02 随 plan 819/837 收口更新」——838/842 收口后未再更新，形成 governing roadmap 顶层状态自相矛盾；F4 行以「通过后本 roadmap 收口」依赖头部准确性 | roadmap :4 vs :89-90 | 就地勘误头部一行（F1/F2 改 done、M4 状态改「F3 进行中」）；不涉结论复议 |
| MIN-1 | Minor | ①覆盖完整性 | `docs/audits/business-replication/f1-unified-ux-acceptance.md:17` | axe 支柱仅写「28 项（桌面 25 + mobile 3）」，未显式陈述分支 C（V3）状态。实测核对：V3 在 `a11y-axe-baseline.spec.ts` ROUTES（:79-87，注释明确「measured ≈650ms 远低于 30s 排除阈值，纳入棘轮」），即桌面 25 含 V3——**覆盖无缺口**，仅报告措辞未点名分支 C 裁决（该裁决另在 roadmap V3 行与 plan 838 baseline 行有陈述） | axe spec :79-87；plan 838 :15；roadmap :81 | F1 报告 axe 行补一处分支 C 括注（≈650ms 纳入棘轮），或登记为已知措辞残余 |
| MIN-2 | Minor | ①覆盖完整性 | `f1-unified-ux-acceptance.md:19` | mobile 支柱措辞「三页 spec 既有 mobile context（375×667 hasTouch）交互断言」不精确：三页 spec 的 `test.use` viewport 实为 1280×800/1280×1080 + hasTouch（W1 :32、M3 :103、S1 :159），375×667 是 host override 固定画布、由每页 bbox 断言程序化验证（W1 :65-66、M3 :113-114、S1 :168-169 `expect(box.width).toBe(375)`）；375×667 viewport 仅用于 axe 分支 B（`REPLICATION_MOBILE_CONTEXT`，helpers/replication.ts :24-25）。**断言深度足够、覆盖真实**（画布尺寸+hasTouch 交互双断言在案），仅报告口径将「spec context」与「画布尺寸/axe context」混写 | 三页 spec 行号如左；helper :24 | 报告措辞就地勘误为「spec hasTouch context + 画布 375×667 bbox 断言」 |
| MIN-3 | Minor | ①覆盖完整性 | `f1-snapshots.mjs:16`、`f1-unified-ux-acceptance.md:16` | 快照评审 21 页均为单一 1440×900 viewport。对照承诺口径：D1 §3 快照无 viewport 形态要求、plan 838 Goals 仅「跨页快照评审」、roadmap F1 行「浏览器快照评审」——**在承诺范围内，不构成违约**；但 responsive/窄桌面形态（以及移动页「375 画布嵌 1440 桌面壳」之外的整机移动 viewport 形态）从未做过视觉评审，属口径外的已知边界 | D1 §3；plan 838 :21；snapshots.mjs :16 | 登记 observation 留 F4 开放审计裁量；不要求 F1 补跑 |
| MIN-4 | Minor | ②证据真实性（目检观察） | `_tmp/f1-snapshots/ai-ticket-console.png` | 深审独立目检 4 页（K2/V3/W1/M3）：W1/M3 画布、V3 围栏回显与 F1 residual #4 描述一致、无新增页面级缺陷。唯一观察：K2 看板第 4 列（已解决）在 1440 宽下右缘裁切——看板横向滚动属组件设计形态、非布局破损，与 F1「无布局破损」结论不冲突，但该横滚形态未在 residual 中记名 | 快照目检；F1 §residual | 可选：随 MIN-1/MIN-2 勘误一并补一句观察注记；不阻断 |
| — | Pass | ②证据真实性 | `_tmp/f1-family.log`、`_tmp/f1-snapshots/`、`_tmp/f1-k2-flake/.last-run.json`、`_tmp/f1-focus/.last-run.json`、`docs/testing/e2e-flake-ledger.md:39` | 证据链全部核实：快照 21/21 张在案且文件名与 21 页一一对应；family.log 尾行 `236 passed (6.5m)` + `1 failed`（唯一红 K2 focus③ :428，failure artifact 在 `_tmp/f1-family/`）；k2-flake last-run `status: passed`（36/36 口径由 plan 838 :70 记载）；focus last-run passed；flake 台账 :39 行（ATTRIBUTED(contention)，三证：单次红/隔离 36/36/P1 1h 前同代码全绿）与 F1 报告 :21 逐项一致。报告证据命令（:36-42）glob/参数可复跑 | 见左 | 无需处置 |
| — | Pass | ③F2 反向核对 | missing-components L7.9(:182)/L7.10(:183)、improvement-analysis :155/:157/:159/:179、flake 台账 :38-39、axe-baseline `_notes`、scanner-baselines `_header.reRegistrationNotes` | 「底账有、汇总无」双向核对**零遗漏**：L7.9 三项（G5/G9/G10）、L7.10 六项（G15/G19/G21/G23/G25/G26，iframe 半条 keep-out 口径一致）F2 §2 全收；improvement 2026-11-02 四项（G14/G22/G24/aria-live）、2026-11-02 两项（地图族 pin+geojson :155、calendar UTC :157）、§4 #9 inputClassName(:179) F2 §2 全收；axe owner 债四族（separator/tree role S2/checkbox-group aria V2/壳 badge 对比度）与基线 `_notes` 一致；scanner map 名称碰撞注记在案。锚点抽查 7 处（超任务要求的 5 处）零漂移 | 见左 | 无需处置 |
| — | Pass | ④D2-D4 P2 裁决条 | `d2-erp-design.md:415,692`、`d3-ai-mes-design.md:240`、`d4-mall-doc-iot-design.md:445` | D2 P2-C3 / D2 G5 勘误注、D3 P2-K2（internalNote 只写不读 watch-only，与 F2 §3「备注回显列为 residual」一致）、D4 MAJ-1 勘误注（九行 ✓ 改锚 L7.10/improvement 补登）均落档且与底账实况一致 | 见左 | 无需处置 |

## 四审计面小结

1. **F1 覆盖完整性**：roadmap F1 行四要素（快照/axe/focus/mobile viewport）与 D1 §3 三支柱+§4 三分支逐项落地；分支 C axe 实测纳入棘轮（MIN-1 措辞）、mobile 三页画布断言深度足够（MIN-2 口径）、快照单 viewport 在承诺范围内（MIN-3）。**无覆盖缺口。**
2. **F1 证据真实性**：全部证据文件在案、计数与报告一致、台账行三证齐备、命令可复跑。**通过。**
3. **F2 汇总反向核对**：双向零遗漏、锚点零漂移。**通过。**
4. **Contract drift**：唯一实质 drift 为 roadmap 头部状态滞后（MAJ-1）；其余（D2-D4 裁决条、勘误注、底账行、F3 行 `planned` vs plan 843 active、头部「M1-M3 均达成」vs §2 行状态）自洽。

## 证据命令（静态审读所用，可复跑）

```bash
sed -n '4p;89,92p' docs/backlog/business-page-replication-roadmap.md
tail -5 _tmp/f1-family.log; ls _tmp/f1-snapshots/ | wc -l   # 236 passed/1 failed; 21
cat _tmp/f1-k2-flake/.last-run.json _tmp/f1-focus/.last-run.json
sed -n '15,110p' tests/e2e/a11y-axe-baseline.spec.ts        # ROUTES 25 + MOBILE_ROUTES 3
python3 -c "import json;d=json.load(open('tests/e2e/__fixtures__/axe-baseline.json'));print(len([k for k in d if not k.startswith('_')]))"  # 28
grep -n "L7.9\|L7.10" docs/backlog/missing-components-and-designer-roadmap.md
grep -n "2026-11-0" docs/components/existing-components-improvement-analysis.md
sed -n '38,39p' docs/testing/e2e-flake-ledger.md
grep -n "REPLICATION_MOBILE_CONTEXT\|toBe(375)" tests/e2e/helpers/replication.ts tests/e2e/replication-{wms-pda-receiving,mes-andon-material,mall-sku-picker}.spec.ts
```

## 复审要求

MAJ-1 为一行文档勘误：修复后本报告可由主审就地复核（打开 roadmap :4 与 :89-90 比对）直接升 **Pass**，无需重派 full round；MIN-1/MIN-2 随同批就地勘误或登记残余。

## Round-2 复核（2026-11-02，同审计员 fresh 核对）

逐落点实地核对：

| Finding | 落点核对 | 结果 |
| --- | --- | --- |
| MAJ-1 | roadmap :4 头部已改为「F1〔plan 838〕/F2〔plan 842〕done、F3〔plan 843〕planned、F4 todo」，并附勘误注「F3 深审 MAJ-1 勘误：838/842 收口时头部漏更」；与 §2 :89-90 行状态一致，与 F3/F4 行自洽 | 已解除 |
| MIN-1 | F1 报告 mobile viewport 行补「分支 C V3 已在 axe ROUTES ≈650ms 棘轮内，随 family 复跑覆盖」 | 已解除 |
| MIN-2 | 同行勘误为「三页 spec 既有 hasTouch 交互断言（页 spec viewport 1280×800/1080 桌面壳；375×667 为 host override 固定画布，经 bbox `toBe(375)`/`toBe(667)` 断言承载）」——与 live spec 行号实况一致 | 已解除 |
| MIN-3 | 登记 observation：快照单 viewport（1440×900）属 D1 §3/plan 838/roadmap F1 承诺口径内；responsive/窄桌面形态为口径外边界，留 F4 开放审计裁量 | 观测登记 |
| MIN-4 | 登记 observation：K2 看板第 4 列 1440 宽下右缘横滚裁切为 kanban 组件设计形态（横向滚动），非布局破损；与 F1「无布局破损」结论一致 | 观测登记 |

**Round-2 Verdict: Pass（final）。** 零 Blocker / 零 Major / 零未处置 Minor（MIN-3/MIN-4 按口径登记为观测，不阻断）。

# 视觉质量证据卡：一致性债务（V12a / V12b / V12c 共用）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.2–7.4 + §8（已经三轮独立核实）
> Owner plan: —（三个 work item 闭环单位独立，证据同源共用此卡；卡内 findings 标注归属）
> Owner docs: `scripts/audit/find-ui-consistency-gaps.mjs`、`docs/backlog/audit-followups-*.md`、`docs/analysis/ui-review/r2-audit.md`、`r3-p2-adjudication.md`

## Findings 清单

- [V12a-F1] 豁免为整包前缀匹配（scheduling/industrial/3d/form-advanced 等整包）：这些域新增字面色自动豁免，门禁局部退化——须收紧为文件级
  - 证据: 普查 §7.2、EXEMPTIONS 表
  - 裁决: pending
  - 状态: open
- [V12a-F2] 豁免基数膨胀：D2 收口基线 399/116/30 → live 413/121/32（两周 +14/+5/+2）；V0 已固化基线快照 `exemption-baseline-v0.json`（对照协议见 `README.md`）
  - 证据: 普查 §7.2 + V0 复核
  - 裁决: pending
  - 状态: open
- [V12a-F3] 错误反馈双轨：raw `error.message` 直出豁免 20+ 处（map/crud/form/wizard/pivot）——统一
  - 证据: 普查 §7.3
  - 裁决: pending
  - 状态: open
- [V12a-F4] audit-followups 未清：08-11 批约 30 条（timeline inert-but-focusable、button `_blank` 无 rel、dashboard canvasWidth 等）+ 08-28 批 16 P2 + 3 observation 全部 `[ ]`（observation 逐条裁定去向）
  - 证据: 普查 §7.4、`docs/backlog/audit-followups-2026-08-11-1929.md`、`audit-followups-2026-08-28-1659.md`
  - 裁决: pending
  - 状态: open
- [V12b-F5] 一致性 P2 候选池 169 条零立项（台账 `r2-audit.md`）——按组件族分批类别清扫消化
  - 证据: 普查 §7.2
  - 裁决: pending
  - 状态: open
- [V12c-F6] 一致性 P3 候选池 87 条零立项（台账 `r3-p2-adjudication.md`）——逐条裁定修复/adjudicated
  - 证据: 普查 §7.2
  - 裁决: pending
  - 状态: open

## 视觉证据

闭环指标即门禁数字：`check:audit-ui-consistency-gaps` 豁免条目数（32）不增，命中实例数相对 V0 快照（413）可归因下降。批次先红后绿证据随各 plan 记录。

## Closure

（V12a/V12b/V12c 各自 closure audit 后回写对应 findings 状态；三 work item 全部关闭时本卡转 closed）

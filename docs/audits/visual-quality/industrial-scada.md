# 视觉质量证据卡：SCADA/工业（V4）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §3（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/industrial-hmi/design-*.md`、`docs/components/roadmap-industrial-hmi.md`

## 域状态前置事实

I17 视觉重设计已 done（2026-08-06 closure approved，`roadmap-industrial-hmi.md:90`；`:30` 为立项登记行，勿引用为未完成证据）。V4 只处理 I17 之后仍存在的残余视觉问题；本卡 findings 进入 V4 时须逐项 live 核实，确认仍存在的才立项修复。

## Findings 清单

- [V4-F1] `background.grid` validate 接受但 runtime 不消费（死配置，08-04 登记为 watch-only）
  - 证据: 普查 §3.2、`docs/logs/2026/08-04.md:574`
  - 裁决: pending
  - 状态: open
- [V4-F2] 图元库报警/趋势组件不足：无趋势图/历史曲线、无报警表格/摘要组件（对比 Ignition/组态王）
  - 证据: 普查 §3.3
  - 裁决: pending（含否决理由的显式裁决）
  - 状态: open
- [V4-F3] 画布尺寸声明与渲染一致性缺回归守护：曾有"声明 960/渲染 302"收窄缺陷（08-08 修复），现无像素级断言防复发
  - 证据: 普查 §3.4、`docs/logs/2026/08-08.md:301`
  - 裁决: pending
  - 状态: open
- [V4-F4] I17 后残余视觉问题清单：待 V4 研究报告逐项核实后补登（不预设普查范围内问题仍未修）
  - 证据: 普查 §3.1 边界声明
  - 裁决: pending
  - 状态: open

## 视觉证据

既有 `tests/e2e/helpers/scada-canvas-assert.ts` 分层断言（TE-3）为本域独有优势；V4 增量为 grid 消费断言与画布尺寸一致性断言（L2 几何 + L4 像素）。

## Closure

（V4 closure audit 后回写）

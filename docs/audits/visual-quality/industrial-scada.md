# 视觉质量证据卡：SCADA/工业（V4）

> 状态: closed
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §3（已经三轮独立核实）
> Owner plan: `docs/plans/474-visual-quality-v4-scada-visuals-plan.md`
> Owner docs: `docs/components/industrial-hmi/design-*.md`、`docs/components/roadmap-industrial-hmi.md`

## 域状态前置事实

I17 视觉重设计已 done（2026-08-06 closure approved，`roadmap-industrial-hmi.md:90`；`:30` 为立项登记行，勿引用为未完成证据）。V4 只处理 I17 之后仍存在的残余视觉问题；本卡 findings 进入 V4 时须逐项 live 核实，确认仍存在的才立项修复。

## Findings 清单

- [V4-F1] `background.grid` validate 接受但 runtime 不消费（死配置，08-04 登记为 watch-only）
  - 证据: 普查 §3.2、`docs/logs/2026/08-04.md:574`；研究报告全链补证（validate :59-73/类型 :107/engine :211 watch-only 注释/demo 死参 :27:96/demo-visual-design.md:39 规格与 :168 验收项/单测固化 :230-241）
  - 裁决: fixed（plan 474 Phase 1：ground 层网格消费——drawGroundGrid 先清后绘/hittable:false/构造+reset+setSize 接线；单测 4 用例先红后绿；e2e 尺寸一致性守护另立）
  - 状态: fixed
- [V4-F2] 图元库报警/趋势组件不足
  - 证据: 普查 §3.3；既往裁决逐字在案（design-data-binding.md:410、design-symbols.md:165-169）；报警视觉原语已存在（状态三色+fault blink+value-to-state）
  - 裁决: adjudicated（plan 474 A2 显式否决：报警状态机/历史数据通道超组态渲染内核边界，无新需求证据；新组件族立项归 industrial-hmi roadmap，非 visual-quality 侧。design-renderer §9.3 维持声明核对无改动）
  - 状态: adjudicated
- [V4-F3] 画布尺寸声明与渲染一致性缺回归守护
  - 证据: 普查 §3.4、`docs/logs/2026/08-08.md:301`；P1-5 修复在案（scada-engine.ts:96-108 + viewport-resize 单测）
  - 裁决: fixed（plan 474 Phase 2：scada-size-consistency.spec 两态 L2 断言——声明尺寸态（edge-demo 960×520 固定容器画布）+ 容器自适应态（scada-demo flex 画布宽度贴合））
  - 状态: fixed
- [V4-F4] I17 后残余视觉问题清单（研究报告 R1-R13 全量裁定）
  - 证据: 研究报告 §0 R1-R13 裁定表（经独立核实 pass）
  - 裁决: R1 fixed（=F1）/ R4 fixed（=F2 否决落卡）/ R7 fixed（=F3 尺寸守护）/ R2、R13 归 V12a / R3、R6、R8、R9、R10、R11、R12 显式 adjudicated（编写期主题、两次在案裁决、作者契约、能力后置、组态可配面、不持久化、I16 线所有）/ R5 scada-image loadFailed 诊断：决策锁定 ⑤ 维持现状，重开候选已登记待 Rule 3 人工确认
  - 状态: adjudicated

## 视觉证据

- `tests/e2e/scada-size-consistency.spec.ts`（两态 L2：声明尺寸 960×520 / 容器自适应宽度贴合）
- ground-grid.test.ts 4 用例（构造接线/先清后绘不叠加/无 grid 零绘制/setSize 重绘）
- 既有 scada 37 test 零回归 + scada-perf 回归

## Closure

（V4 closure audit 后回写）

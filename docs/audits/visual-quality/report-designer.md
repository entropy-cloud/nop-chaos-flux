# 视觉质量证据卡：Report Designer（V7）

> 状态: adjudicated（plan 477 执行完毕，findings 三态裁定落卡）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §5（三轮独立核实）、`docs/analysis/visual-quality/V7-report-designer.md`（独立核实 pass）
> Owner plan: `docs/plans/477-visual-quality-v7-report-designer-plan.md`
> Owner docs: `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/codec-design.md`

## Findings 清单

- [V7-F1] 画布硬编码：直接复用 spreadsheet-renderers 且写死 30 行×10 列（`report-spreadsheet-canvas.tsx:26-27`）
  - 证据: 普查 §5；核实补充——spreadsheet-grid clampCell 使键盘/点击不可达界外，上下文菜单插行可把内容推进不可见区（双重视觉截断）；demo 第二份硬编码 report-designer-demo.tsx:77-78
  - 裁决: **landed（plan 477 Phase 1）**——`resolveGridDimensions` export 并被 report 画布消费（ROWS/COLS 常量退役），维度随模板 cells 派生、空模板回落 DEFAULT 100×26 基线；单测先红后绿（派生扩展 + 基线回落）；e2e 断言滚动到底行头 = 100（30 硬顶退役）
  - 状态: closed
- [V7-F2] `TemplateCodecAdapter` 仅抛错占位；hucre 对比报告已论证引入路径
  - 证据: 普查 §5；核实修正定性——**通路完备（接口/注册表/命令链/host method/i18n）、缺生产 adapter**，live 表面 import/export 失败于 noCodecConfigured 属显式留白而非占位缺陷
  - 裁决: **adjudicated（plan 477 Phase 3，落 codec-design.md 尾节）**——采纳 hucre 为 codec 层依赖；集成（依赖 + adapter + demo 注册）出独立 plan；落地前维持 noCodecConfigured 失败路径
  - 状态: closed（adjudicated；集成 = successor plan 候选）
- [V7-F3] 无报表带区/分组头/分页语义视觉
  - 证据: 普查 §5；核实确认 band/分组 grep 零命中、文档模型无 band 概念、grid 仅 cell 级 metadata 通道
  - 裁决: **adjudicated as out-of-scope improvement**——能力型缺失需模型层设计，归域功能 roadmap（codec-design.md 尾节承载）
  - 状态: closed（out-of-scope）
- [V7-F4] fallback 壳可视化升级
  - 证据: 普查 §5；核实**证伪**——fallbacks.tsx 三个 renderFallback\* 全仓 0 importer（死代码）；实际降级 = invalid 就地替换空模板 + 完整工作台，符合 design.md 契约
  - 裁决: **landed（plan 477 Phase 3，形态改为死代码删除）**——fallbacks.tsx 删除 + 孤儿 i18n 键 coreTitle/noMetadata 清理（noFieldSources 活引用保留）+ design.md 降级行为注记
  - 状态: closed
- [V7-F5] e2e 断言缺口
  - 证据: 普查 §5；核实修正——plan 476 已补 report 画布 dark 翻转路由，残余为画布维度/绑定视觉断言
  - 裁决: **landed（plan 477 Phase 3）**——report-designer-demo.spec 增维度断言（滚动到底行头 = 100）+ 绑定底色计算样式断言；`--ss-bound-*` dark 翻转断言并入 spreadsheet-visual-tokens report 路由（用例内先拖拽建绑定）
  - 状态: closed
- [V7-F6] report 域未定义令牌 dark 击穿（研究新发现）
  - 证据: `report-field-panel.css:49/:50/:74` 消费 `--nop-border-hover/--nop-surface-hover/--nop-surface-muted` 全仓零定义（全文件 var() 消费 8 处）；包无守卫、不在门禁扫描集
  - 裁决: **landed（plan 477 Phase 2）**——迁移到包内 `--rp-*` 定义块（:root + dark 变体，--ss-_ 同构）；守卫单测（禁 dangling --nop-_ 消费 + --rp-\* 定义块存在性）先红后绿
  - 状态: closed

## 残余候选

- R4 use-spreadsheet-interactions rows/cols 死参数（4 调用点）—— watch-only（超视觉域，登记 follow-up）
- R10 门禁扫描集扩展（report-designer-renderers 纳入 RENDERER_PACKAGE_SCOPE）—— 独立提案
- host-demo spec 计算样式断言 —— 随 codec 集成 plan

## 视觉证据

`tests/e2e/report-designer-demo.spec.ts`（维度断言 + 绑定底色计算样式）+ `tests/e2e/spreadsheet-visual-tokens.spec.ts` report 路由（--ss-gridline/--ss-bound-\* dark 翻转）+ `report-field-panel-css.test.ts` 守卫（先红后绿）。

## Closure

plan 477 closure audit approved（2026-09-21，首轮 issues 仅 B-1 编译面，修复复验后转 approved；详见 plan Closure Audit Evidence 与 daily log）。F1-F6 三态裁定如上，无 pending 裁决残留。

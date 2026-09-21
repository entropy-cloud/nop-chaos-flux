# 视觉质量证据卡：Word 编辑器（V8b）

> 状态: landed（plan 478 执行完成；closure audit 待独立子 agent 执行）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）
> Owner plan: `docs/plans/478-visual-quality-v8b-word-editor-plan.md`
> Owner docs: `docs/components/word-editor-page/design.md`、`docs/architecture/word-editor/design.md`

## Findings 清单

- [V8b-F1] 字体/字号硬编码枚举：`toolbar/font-controls.tsx:23-24`，6 字体 16 档，无自定义输入
  - 证据: 普查 §6
  - 裁决: fixed——font/size 升级 ui Combobox，自由输入 + size 钳制 [5,72] + 空串不提交；先红后绿单测（font-controls.test.tsx：钳制/空串/blur 提交/列表选择断言）
  - 状态: closed
- [V8b-F1b]（plan 执行期升级发现的实质缺陷）枚举外值回显静默空白：受控 value 不在 NativeSelect 选项集时 `selectedIndex=-1` 显示空白（字号 15、字体「楷体」场景）
  - 证据: plan 478 Current Baseline 研究核实
  - 裁决: fixed——枚举外当前值沿 field-select buildItems 注入先例作为自由值注入 items 回显；e2e 断言回显（word-editor-visual.spec font/size echo 用例）
  - 状态: closed
- [V8b-F2] 无页眉页脚编辑 UI：bridge 已透传数据、缺编辑 UI（裁决落地或显式 deferred）
  - 证据: 普查 §6
  - 裁决: fixed（最小 zone UI）——页眉/主文档/页脚三档切换按钮组（toolbar/zone-controls.tsx，挂 word-editor-page 预览条），激活态以 `editor-store.activeZone` 受控；`listener.zoneChange` 订阅为必需状态源（canvas 双击切 zone 不失同步），点击仅乐观更新；`executeSetZone` 缺失/bridge 未 ready 时禁用降级（zone-api-absent 断言在）；bridge options 透传 `locale`（构造期一次性，宿主 i18n 跟随）。zone 高度拖拽/结构化编辑器维持 deferred（canvas-editor 内建双击编辑已可用）
  - 状态: closed（最小 UI 面）
- [V8b-F3] 令牌化边界：自有 CSS 仅 15 行，视觉全托 canvas-editor 默认皮肤（令牌化边界核对，皮肤属第三方面的部分只核对不重构）
  - 证据: 普查 §6
  - 裁决: adjudicated（A3 落卡）——第三方 `.ce-*` 皮肤不轻动；`IEditorOption`（defaultColor/rangeColor/searchMatchColor 等）为唯一合法调色通道；纸张白底为文档语义非未令牌化面，dark 下不翻转；自有 chrome 9 个 `--nop-*` 令牌消费契约保持。结论落 `docs/architecture/word-editor/design.md` 「Skin Tokenization Boundary (A3)」节
  - 状态: closed
- [V8b-F4] 中文字体族预览待核对（字体名展示是否反映实际字体族）
  - 证据: 路线图 V8b 行
  - 裁决: fixed——ComboboxItem children 逐项注入 `style={{fontFamily}}` 内联预览（单测断言 SimSun/Arial 项 style）；`document.fonts` 缺失环境回退为环境依赖，登记 follow-up 不阻塞
  - 状态: closed
- [V8b-F5] word e2e 全无视觉断言（`word-editor*.spec.ts` 0 计算样式/0 截图）
  - 证据: V0 研究报告 §2
  - 裁决: fixed——`tests/e2e/word-editor-visual.spec.ts` 3 用例（字体/字号枚举外回显、zone 指示翻转 + 画布存活、light↔dark 工具条计算样式翻转，V0 helper `getComputedStyleValue`）；word 族 e2e 35/35 绿（既有 32 零回归）
  - 状态: closed

## 视觉证据

- 单测：font-controls.test.tsx 7（回显 2/钳制/Enter+blur 提交/列表选择不双提交/逐项 fontFamily 预览）；zone-controls.test.tsx 6（三档渲染/乐观翻转/zoneChange 驱动/API 缺失禁用/未 ready 禁用）；editor-canvas/bridge/editor-store 契约断言（locale options、onZoneChange 接线、activeZone 状态）。
- e2e：`word-editor-visual.spec.ts` 3 用例全程序化断言（input value 回显、aria-pressed、计算样式 light/dark 翻转），无截图判据。

## Closure

V8b closure audit **approved**（2026-09-21，独立 fresh session）：F1/F1b/F2/F3/F4/F5 全部 closed（上文裁决在案）；两 focused 套件独立复跑 core 272/272、renderers 163/163；roadmap V8b 行 → `done`，owner plan 478 → `completed`。Minor 留档：e2e 就绪门 zh 标签耦合（测试健壮性备注，testid 化候选）；全仓链数字以收口会话最终链为准（daily log 2026-09-21）。

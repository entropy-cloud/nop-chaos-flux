# [card] control:input-table

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-table` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：SKU+amount 表格（可增/删/排序） / 多行编辑提交（bug 73） / 只读表格提交）
- **矩阵裁剪**: full（README 复杂度裁定）。必做项全部覆盖：行增删中间态、行内编辑态、排序操作、双主题（真 data-mode）、1280+800 双视口、hover/focus、只读态、值态（空/填/超长）、提交回显。裁掉的状态及理由：拖拽中（该控件排序为 move-up/move-down 按钮实现，无 drag 轨道——A8 单指针替代天然满足）；滚动+固定列（fixture 仅 2 列，`input-table-scroll` 在 800 宽下 scrollW==clientW 无横向滚动可触发，固定列行为需多列 fixture，留待复检）；error 态（fixture 未配置 required 列）；disabled 态（fixture 未配置）；max-items 封顶态（fixture 未配置）。
- runner dark 列作废声明：同 R2-2a-B5-34，本卡 dark 证据全部为自采 `data-mode=dark` 后截图/探针（"真 data-mode"）。

## 1. 截图清单

| 状态                    | light                                                                           | dark（真 data-mode）                                                           |
| ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800（场景 1） | `_tmp/visual-inspection-2026-09-23/r2-2a/input-table/default-s1-1280-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-table/default-s1-1280-dark.png` |
| 只读表格 1280（场景 3） | `…/input-table/default-s3-readonly-1280-light.png`                              | `…/input-table/default-s3-readonly-1280-dark.png`                              |
| 行 hover                | `…/input-table/row-hover-1280-light.png`                                        | —                                                                              |
| 单元格 focus            | `…/input-table/cell-focus-1280-light.png`                                       | —                                                                              |
| 行新增中间态（空行）    | `…/input-table/row-add-intermediate-1280-light.png`                             | `…/input-table/row-add-intermediate-1280-dark.png`                             |
| 行内编辑值态            | `…/input-table/inline-edit-value-1280-light.png`                                | —                                                                              |
| 超长值态                | `…/input-table/long-value-1280-light.png`                                       | —                                                                              |
| 排序+删除后             | `…/input-table/after-reorder-remove-1280-light.png`                             | —                                                                              |
| 默认 800×900            | `…/input-table/default-s1-800-light.png`                                        | `…/input-table/default-s1-800-dark.png`                                        |
| 800 场景 stage          | `…/input-table/stage-800-light.png`                                             | `…/input-table/stage-800-dark.png`                                             |
| 提交回显（场景 2）      | `…/input-table/after-submit-echo-1280-light.png`                                | —                                                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（行 hover `rgba(0,0,0,0)`→oklab 5.98% 蒙层，computed 变化坐实）A2 pass（单元格 focus 边框 `rgb(225,231,239)`→`rgb(28,110,242)` + 3px ring，fv=true）A3 **warn(R2-2a-A3-100)**（amount 列 input-number 步进按钮 24×16）A4 **warn(R2-2a-A4-101)**（只读行保持可编辑输入外观）A5 n/a A6 n/a（无拖拽）A7 n/a A8 pass（排序按钮即单指针替代）A9 pass（增行 2→3、删行 3→2、move-down 后首行值交换，均有 DOM 变化反馈）
- B 颜色：B1 pass（表头 light 20.01 / dark 19.12；label light 16.53 / dark 12.99）B2 pass（focus ring 3px 边框+ring）B3 n/a B4 pass（computed 均为令牌色）B5 pass（dark 全链路复检，表格面/输入面 dark 正常）B6 pass（dark 下 新增行 按钮 bg oklab 半透明、边框 `rgb(31,42,61)`，与底可区分）
- C 布局：C1 pass（1280/800 双视口 docOverX=0；超长值仅 input 内部滚动，rectW 恒 333 不破版）C2 pass C3 pass C4 pass（800 宽表格完整渲染无挤压，`stage-800-*.png`）C5 pass C6 n/a
- D 间隔：D1 pass（行间隙 0 属表格语义）D2 n/a D3 pass（行高 55/55 一致，无离群行）D4 n/a D5 pass（label–表格间距稳定）D6/D7/D8 n/a
- E 排布：E1 pass E2 pass E3 pass（操作列固定右侧）E4 pass（列头与列内容左缘对齐）E5–E6 n/a
- F 一致性：F1 pass F2 n/a F3 n/a F4 见已知族（新增行/步进按钮 zh 文案）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A3-100] amount 列 input-number 步进按钮 24×16，高度低于 24px 最小可点目标

- **页面/路由**: `#/lab/input-table`（场景 1/2/3 任意含 amount 数值列的表格行）
- **主题/视口/状态**: light+dark / 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-table/default-s1-1280-light.png`（Amount 单元格右侧上下箭头）
- **目视描述**: 数值单元格右侧的上下步进按钮是扁平小箭头，视觉上明显小于旁边的行操作图标按钮。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-input-table.mjs`（smallTargetScan，`w6-lib.mjs` scoped WCAG 2.5.8 扫描）
  - 输出: `smallTargets_light1280 = [{slot:"stepper-increase", text:"增加", w:24, h:16}, {slot:"stepper-decrease", text:"减少", w:24, h:16}, …]`（每行 2 枚，双主题一致）
- **对照基准**: WCAG 2.5.8 可点击目标 ≥24×24 CSS px（检查提示词 A3）
- **严重程度**: P3（24 宽 × 16 高，短边差 8px；步进为低频辅助操作，主输入可直接键入）
- **用户影响**: 触屏/精准度低的用户点步进箭头易误触；鼠标用户影响小。
- **修复方向**: `packages/ui` 的 input-number stepper 按钮高度提到 24px（或加 `after:` 伪元素扩展命中区，参照 checkbox `after:-inset-*` 模式），保持视觉密度不变。
- **归族**: systemic → A3 小目标族（R2-4 批收口，与 wave1–3 A3 条目同族）
- **复核状态**: 未复核

### [R2-2a-A4-101] readOnly 表格行保持与可编辑行完全相同的输入框外观，只读态不可感知

- **页面/路由**: `#/lab/input-table`（场景 3 "Read-only table submit"）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-table/default-s3-readonly-1280-dark.png`（FIXED-1/9/FIXED-2/11 均为带边框输入框样式）
- **目视描述**: 只读表格的单元格仍是完整的输入框（边框+内值），与可编辑表格（场景 1）并排看不出任何状态差异，仅缺少行尾操作列与新增行按钮。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-input-table.mjs` readonlyStructure 段
  - 输出: `{ inputCount: 4, firstReadOnly: true, addHidden: true, removeCount: 0, actionColVisible: false }`——4 个 input 均 `readOnly=true`，但 computed 边框/底色与可编辑态无差异（未做置灰/去边框处理）
- **对照基准**: 检查提示词 A4（disabled/只读态视觉可感知）；AMIS static 呈现惯例（只读表格渲染静态文本单元格）
- **严重程度**: P3（数据不会误改，但用户会尝试点击/输入后才发现无效）
- **用户影响**: 只读场景（回显已提交数据）下用户无法从视觉获知不可编辑，产生无效操作。
- **修复方向**: `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx` 在 `readOnly` 分支将单元格降级为静态文本呈现（或复用 `presentation.readOnly` 给 input 加 `border-transparent bg-transparent` 只读样式档），保留操作列隐藏现状。
- **归族**: local → R2-4 批（单控件状态呈现问题）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）。design.md 字段清单已补 readOnly（2026-09-24）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族）**: 新增行按钮可见文案"新增行"、步进按钮 aria-label"增加/减少"均为简体中文（英文宿主）。新实例证据：`out-w6-input-table.json` smallTargets text 字段 + `default-s1-1280-light.png`。
- **数值列左对齐（watch 族）**: 重点核对完成——amount 列 input-number computed `textAlign: start`，与 SKU 文本列同左对齐。按 watch 族口径记录不升级；如后续立修复项，input-table 数值列应右对齐。
- **A3 小目标族**: 本卡 A3-100 为该族在 input-table 的新实例（步进按钮）。
- **调试 chip / scope-debug 面板**: 默认展开遮挡下半屏属 lab 载体家具，不计入控件走查。
- **误报排除**: 超长 SKU 值探针报 `input overX 107` 为文本输入框内部滚动（rectW 恒定 333，无布局破坏），按"表格截断/原生输入滚动"误报口径排除。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-table` → carded（card 列填本路径）；findings 归族后 → digested。

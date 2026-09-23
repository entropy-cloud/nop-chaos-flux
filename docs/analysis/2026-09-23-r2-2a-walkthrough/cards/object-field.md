# [card] control:object-field

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/object-field` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：内联地址编辑（street/city 必填） / array-field 项内嵌 object-field / object+array 复合提交（bug 73））
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件。裁掉：disabled/readOnly 态（fixture 未配置）、拖拽（无）、弹层（无弹层面）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/必填错误态/行内编辑 focus/嵌套层级/hover（随子字段 input-text 卡族）。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                           | light                                             | dark（真 data-mode）                          |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800（内联地址）      | `…/object-field/default-s1-1280-light.png`        | `…/object-field/default-s1-1280-dark.png`     |
| array 项内嵌（场景 2）         | `…/object-field/default-s2-nested-1280-light.png` | —                                             |
| 必填错误态（清空 Street 提交） | `…/object-field/required-error-1280-light.png`    | `…/object-field/required-error-1280-dark.png` |
| 默认 800×900                   | `…/object-field/default-s1-800-light.png`         | `…/object-field/default-s1-800-dark.png`      |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 n/a（随子字段 input-text）A2 pass（子字段 focus fv=true + ring）A3 pass（smallTargets 无命中）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（清空必填提交后错误即时出现、`field-error` 挂载）
- B 颜色：B1 pass（label light 16.53；错误文案 light 4.78 ≥4.5、dark 5.56）B2 pass B3 pass（错误色红系语义正确）B4 pass B5 pass（dark 错误色 `rgb(239,138,124)` 可读）B6 n/a
- C 布局：C1 pass（双视口 docOverX=0；嵌套场景无溢出）C2 pass C3 pass C4 pass C5/C6 n/a
- D 间隔：D1 pass（label 底→input 顶 8px 栅格值）D5 pass（label-control 顶对齐统一，labelX=inputX=301）D2–D4/D6–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 pass（三子字段左缘对齐 ≤1px）E5 **warn(R2-2a-E5-105)** E6 n/a
- F 一致性：F1–F3 n/a F4 见已知族（错误文案 zh）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-E5-105] array-field 项内嵌 object-field 无任何嵌套视觉线索，子字段与顶层字段完全同宽同位

- **页面/路由**: `#/lab/object-field`（场景 2 "Object-field nested inside array-field items"；场景 3 复合嵌套同险）
- **主题/视口/状态**: light / 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/object-field/default-s2-nested-1280-light.png`（Name 与内嵌 Address/City/ZIP 全部同一缩进、同一宽度）
- **目视描述**: 员工条目内的嵌套 address（City/ZIP）与外层 Name 字段排版完全一致——无缩进、无包裹边框、无背景差异，仅靠 "Address" 标题文本暗示层级，扫读时无法分辨哪些字段属于嵌套对象。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-object-field.mjs` nestedGeom 段
  - 输出: `nestedGeom = [{itemX: 301, itemW: 918, bodyX: 301}, …]`——`object-field-body` 与所属 `array-field-item` 左缘、宽度完全相同（差 0px）；对照检查提示词 E5（分组应有视觉语言：卡片/分割线/留白三选一）与 D2（组内/组间差异）
- **对照基准**: 检查提示词 E5（分组视觉语言）、D2（格式塔邻近原则——嵌套组应强于平铺）
- **严重程度**: P3（功能不受影响、提交结构正确；长表单中嵌套归属需依赖标签文本推断）
- **用户影响**: 复杂对象表单中用户可能把嵌套子字段误读为顶层字段；多员工条目时归属辨识成本高。
- **修复方向**: `packages/flux-renderers-form-advanced/src/composite-field`（object-field 渲染层）为嵌套上下文（parent 为 array-field-item 时）的 `object-field-body` 增加一层视觉包裹：`border-l-2 border-[var(--nop-border)] pl-4`（左缘缩进线）或 `rounded-lg bg-muted/40 p-3` 子卡片，二选一不混用（E5 单一视觉语言口径）。
- **归族**: local → R2-4 批（composite-field 呈现层；与 array-field 卡的条目容器呈现可合并收口）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族）**: 必填错误文案 "Street不能为空"（中英混拼、无空格）；场景 2 行删除钮 "删除"、添加 "＋ 添加项" 为中文（英文宿主）。新实例证据：`required-error-1280-light.png`、`out-w6-object-field.json errorState.errText`。
- **表单 AMIS 契约缺口族（watch）**: 错误文案由 flux-form 校验层产出 zh 模板，与 F4-11 同根因（i18n 未初始化），修 initFluxI18n 后需复检。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-object-field` → carded（card 列填本路径）；findings 归族后 → digested。

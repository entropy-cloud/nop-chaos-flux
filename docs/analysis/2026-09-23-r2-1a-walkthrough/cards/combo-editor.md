# [card] page:combo-editor

- **批次**: R2-1a（波 5） ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/combo-editor` ｜ **载体**: complex-page（schema: `apps/playground/src/complex-pages/page-schemas/combo-editor.json`）
- **矩阵裁剪**: full（同步页：无异步取数 → loading/empty 裁剪；无实体弹层 → H 裁剪为 n/a；拖拽 n/a——combo 排序为按钮式上移/下移，非拖拽）

## 1. 截图清单（状态矩阵）

| 状态                                  | light                                                                                        | dark                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 默认 1280×800                         | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-default-light.png`        | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-default-dark.png` |
| 默认 ~800 宽（800×900）               | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-narrow-light.png`         | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-narrow-dark.png`  |
| 行内编辑态（A6：focus/输入中）        | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-inline-edit-light.png`    | —                                                                                    |
| hover（行操作钮：删除/上移/添加项）   | computed 对比 done（删除/添加有 hover，上移首行 disabled 无 hover 属正确边界态，见误报排除） | —                                                                                    |
| disabled（minItems 边界：末行删除钮） | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-minitems-light.png`       | —                                                                                    |
| 排序后（A9：move-down 行交换）        | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-after-movedown-light.png` | —                                                                                    |
| 增行后（3 行）                        | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-after-add-light.png`      | —                                                                                    |
| 校验错误（清空必填姓名点保存）        | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-error-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-error-dark.png`   |
| 默认数据直接保存（保存必败复现）      | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-save-pristine-light.png`  | —                                                                                    |
| 保存后 toast                          | `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-saved-toast-light.png`    | —                                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass（删除/添加项 hover 有反馈；上移/下移边界 disabled 属正确） A2 pass（行内输入 focus 边框变主色 rgb(28,110,242)，中心可见性探针通过） A3 pass（行操作钮 24–28px；1×1 隐藏 input 为已登记误报） A4 pass（末行删除 disabled+0.5、首行上移/末行下移 disabled 边界正确） A5 n/a A6 pass（行内编辑 focus 即时高亮、输入即时生效） A7 n/a A8 n/a A9 **fail(A9-03)**
- B 颜色：B1 pass（label/输入文字高对比） B2 **warn（R2-1a-B2-01 系统项：combo 行卡边框与底色对比不足，dark 1.24:1 同源）** B3 pass B4 pass B5 pass（dark 整体平价良好，除 B2 边界项） B6 n/a
- C 布局：C1 pass（1280/800 宽溢出扫描 0 命中） C2 pass C3 pass C4 pass（窄视口行卡 414px 宽自适应不破版） C5 pass C6 n/a
- D 间隔：D1 pass（行卡间距 8px（gap-2）一致） D2 pass（行卡=带边框分组，行内字段行距 8px < 行卡间 8px 同值——widget 内部一致性成立，边框承担分组语义） D3 n/a D4 n/a D5 pass（label→control 8px 成体系；combo 行内字段行距 8px 为 widget 内部节奏，全行一致） D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass（保存联系人 primary） E3 **fail（R2-1a-E3-01 系统项复测：保存联系人钮在左下 x≈313，非右主位）** E4 pass（行内两列 x=326/746 干净列线） E5 pass（行卡=边框分组） E6 n/a
- F 一致性（横切）：F1 warn（E3-01 同族） F2 n/a F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a（无弹层）

## 3. 发现条目

### [R2-1a-A9-03] 默认合法数据保存必败，且无任何行内校验反馈（保存任务不可完成）

- **页面/路由**: `#/complex-pages/combo-editor`（「保存联系人」按钮）
- **主题/视口/状态**: light / 1280×800 / 默认数据未做任何修改直接保存（张三/上级/138…、李四/同事/138…，全部合法）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-save-pristine-light.png`、`combo-editor-error-light.png`
- **目视描述**: 点保存后右下弹出 `[object Object]` 错误 toast；表单内没有任何字段变红、没有错误文案，输入框边框保持常态 rgb(225,231,239)；「保存状态」停留「未保存」。清空必填姓名再保存同样是这个表现——用户无从得知哪一行哪个字段有问题。
- **程序化证据**:
  - 探针: ① 默认数据直接点击 `[data-testid="contacts-submit"]`，采集 report 文案、toast、`[data-slot="field-error"]`、`aria-invalid`（`combo-save-min.mjs`）；② 清空姓名再保存同样采集；③ 对照 complex-form 同管线合法保存（`complex-form-valid-save.mjs`）。
  - 输出: ① report=「保存状态：未保存（共 2 位）」、toast=`{type:"error", t:"[object Object]"}`、inlineErrs=[]、aria-invalid=null；console error `[showcase] action error: {ok: false, error: Array(1), data: Object}`——**默认合法数据即触发 1 条校验错误且该错误未绑定任何字段渲染**；② 空姓名保存同样零行内反馈；③ complex-form 合法保存成功（「已保存 ✓」+「保存成功」toast）→ 排除全局动作管线故障，问题收敛在 combo（或本页 schema）的校验链路。
- **对照基准**: 检查提示词 P0 定义「用户无法完成任务」；A9「交互后反馈可见，非静默更新」。
- **严重程度**: P0（本页核心任务「编辑联系人并保存」在默认配置下不可完成，且失败原因不可感知）
- **用户影响**: 用户无论填什么都无法保存，且看不到任何字段级错误提示；多行场景下排查成本极高。toast 文案同时是 A9-02 的乱码问题。
- **修复方向**: 排查 combo 数组字段的提交校验链（`flux-renderers-form-advanced/combo-renderer.tsx` + flux-runtime submitForm 校验计划）：找出默认数据下产生的那 1 条未绑定字段的校验错误（`error: Array(1)` 内容需 dump）；修复后确认校验错误能映射到具体 `.nop-field` 渲染 `field-error`。R2-3/R2-4 定位时可先在 devtools 复跑 `combo-save-min.mjs` 抓 error[0] 内容。
- **归族**: local → R2-4 批（combo 校验链路；其中 toast 乱码部分归 A9-02 → R2-3）
- **复核状态**: 未复核

### [R2-1a-E3-01 复测] 保存按钮左对齐（主条目见 complex-form 卡）

- **页面/路由**: `#/complex-pages/combo-editor`
- **主题/视口/状态**: light + dark / 1280×800
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-default-light.png`
- **目视描述**: 「保存联系人」primary 按钮位于表单左下。
- **程序化证据**: 按钮 x≈313 与表单左缘对齐（截图目视 + boundingRect）；与 styling-system.md Form Action Button Convention 右对齐默认不符。
- **对照基准**: styling-system.md Form Action Button Convention；检查提示词 E3。
- **严重程度**: P2
- **用户影响**: 与向导页/预期惯例不一致（同 E3-01 主条目）。
- **修复方向**: 同 E3-01 主条目（form actions 槽默认 `justify-end` 或 schema `actionsClassName`）。
- **归族**: systemic → R2-3 批（与 complex-form 卡 E3-01 同条目合并）
- **复核状态**: 未复核

### [R2-1a-B2-01 复测] combo 行卡边界对比不足（dark 1.24:1）

- **页面/路由**: `#/complex-pages/combo-editor`
- **主题/视口/状态**: dark / 1280×800
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/combo-editor/combo-editor-default-dark.png`
- **目视描述**: dark 下行卡边框与卡片底色几乎同色，行与行仅靠 8px 间隙区分。
- **程序化证据**: 探针输出 `{itemBorder: "rgb(31,42,61)", itemBg: "15,23,41"}` → 对比度 1.24:1（<3:1，WCAG 1.4.11）；与 form-wizard 卡 B2-01 同一边界令牌问题在 combo 行卡上的表现。
- **对照基准**: WCAG 1.4.11；form-wizard 卡 R2-1a-B2-01。
- **严重程度**: P2
- **用户影响**: 低视力用户区分行卡边界困难。
- **修复方向**: 同 B2-01 系统项（`--input`/`--border` 令牌档加深，R2-3 统一决策）。
- **归族**: systemic → R2-3 批（B2-01 同条目）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                                         | 排除理由                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首行「上移」按钮 hover 无反馈                                | 该按钮在首行 disabled=true（边界禁用，探针 `[{row:1,up:true,down:false},{row:2,up:false,down:true}]`），`disabled:pointer-events-none` 使 hover 不生效——正确的边界态，非 hover 缺失                                             |
| 删除/上移/下移图标按钮偏小                                   | 实测 24–28px（删除 28×28、清除 24×24），达标不报                                                                                                                                                                                |
| 1×1 隐藏 input 计入 smallTargets                             | 视觉隐藏原生 input，已登记误报模式                                                                                                                                                                                              |
| 「联系人列表」fieldset 标题 + 「联系人」combo label 双重标注 | schema 层文案选择，信息冗余但非渲染缺陷；watch 记录不立项                                                                                                                                                                       |
| 保存失败是否为 mock 拒绝                                     | mock `/r/User__save` 对任意 payload 返回 success（showcase-env.ts:175+）；console `{ok:false, error:Array(1)}` 为动作管线校验错误形态；complex-form 同管线合法保存成功 → 排除 mock/管线全局故障，收敛为 combo 校验链路（A9-03） |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
  findings 归族：A9-03 → R2-4（local）；E3-01/B2-01 复测 → 并入 R2-3 系统条目；
  批内复检通过后 → `verified`。

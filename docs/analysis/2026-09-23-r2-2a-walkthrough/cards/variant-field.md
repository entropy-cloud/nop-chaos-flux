# [card] control:variant-field

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/variant-field` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：string vs list 编辑器 tabs 切换（scope 态联动） / variant 切换写值 + 提交回显（bug 73，select 模式））
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件。裁掉：readOnly 态（`variant-field-readonly-body` 通道存在但 fixture 未配置 readOnly）、disabled 态（fixture 未配置）、弹层（无；select 模式用 ui select popover 不按 H 维度深查）、list 分支加行（list 行增删由 array-field 子控件承接，已在 key-value/object-field 卡覆盖同构行为）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/tabs 切换中间态（值被 variant initialValue 重写）/list 行内编辑/切回 text/select 模式切换/提交回显/focus。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                                | light                                                   | dark（真 data-mode）                                 |
| ----------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| 默认 1280×800（Single String 激活） | `…/variant-field/default-s1-text-mode-1280-light.png`   | `…/variant-field/default-s1-text-mode-1280-dark.png` |
| 切到 String List（类型切换中间态）  | `…/variant-field/switched-to-list-1280-light.png`       | `…/variant-field/switched-to-list-1280-dark.png`     |
| list 行内编辑后                     | `…/variant-field/list-row-edited-1280-light.png`        | —                                                    |
| 切回 Single String                  | `…/variant-field/switched-back-text-1280-light.png`     | —                                                    |
| 场景 2 select 模式默认              | `…/variant-field/default-s2-select-mode-1280-light.png` | —                                                    |
| select 切到 Multiple 后             | `…/variant-field/switched-to-multiple-1280-light.png`   | —                                                    |
| 默认 800×900                        | `…/variant-field/default-s1-800-light.png`              | `…/variant-field/default-s1-800-dark.png`            |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 n/a（随 tabs/select 族）A2 pass（tabs-trigger focus fv=true + ring 类）A3 pass（tabs-trigger 96×25 ≥24；smallTargets 无命中）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（切换后 runtime 文本 "String editor active"↔"List editor active" 即时翻转、数组行 2 行/回切 1 输入、提交回显 `Variant: ["a@example.com","b@example.com"]`）
- B 颜色：B1 pass（label dark 12.99）B2 pass B3 n/a B4 pass B5 pass（dark tabs/list 编辑器复检正常）B6 pass（激活 tab 白底胶囊与未激活灰底可区分）
- C 布局：C1 pass（双视口 docOverX=0）C2 pass C3 pass C4 pass（800 宽单列排布正常）C5/C6 n/a
- D 间隔：D1 pass（tab 条→字段→行间距一致）D2–D8 n/a/pass
- E 排布：E1 pass（激活编辑器一目了然、runtime 文本直接回答当前态）E2 pass（激活 tab 样式强于未激活）E3 pass E4 pass E5 pass（tab 切换 = 单一视觉语言）E6 n/a
- F 一致性：F1–F3 n/a F4 见已知族（删除/添加项 zh 随 array-field）F5 n/a
- G 设计器：n/a（G7 双向同步在本控件为表单值联动：切换→值重写→runtime 文本回显，实测通过，作已知族 G7 的正向佐证记录）
- H 弹层：n/a

## 3. 发现条目

（无新立发现——简化矩阵下未命中 P0–P3 新疑点。类型切换中间态（值被 variant initialValue 重写、scope/runtime 文本同步）为该控件核心交互，实测闭环正确。）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族）**: list 分支行删除钮 "删除"、添加钮 "＋ 添加项" 为中文（英文宿主，随 array-field 子控件）。新实例证据：`switched-to-list-1280-light.png`。
- **G7 双向同步（R2-3 候选）正向佐证**: variant 切换→值重写→回显文本同步（`afterSwitch.runtime`/`backToText.runtime`）通过，未复现面板-画布不同步缺陷；作为该族在表单域的反例样本记录。
- **误报排除**: `submitEcho` 探针取到 "TEXT =>" 截断为探针文本节点匹配方式所致，页面实际回显完整（`variant-echo` testid 全文 `Variant: ["a@example.com","b@example.com"]` 验证通过）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-variant-field` → carded（card 列填本路径）。

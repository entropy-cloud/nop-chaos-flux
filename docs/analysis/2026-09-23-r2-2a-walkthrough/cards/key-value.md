# [card] control:key-value

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/key-value` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：HTTP header 编辑 / 环境变量编辑（自定义 placeholder） / 宿主表单行编辑提交（bug 73））；readOnly 态跨页取证 `#/lab/tag-list` 场景 4（同 package 的 readOnly key-value 实例）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件。裁掉：error 态（fixture 未配置校验）、disabled 态（fixture 未配置）、拖拽（排序为按钮）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/新增行中间态/行内编辑/超长值/移动/删除/只读（跨页）/focus/hover。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                                  | light                                                | dark（真 data-mode）                   |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| 默认 1280×800（3 行 header）          | `…/key-value/default-s1-1280-light.png`              | `…/key-value/default-s1-1280-dark.png` |
| 自定义 placeholder（场景 2）          | `…/key-value/default-s2-placeholders-1280-light.png` | —                                      |
| 新增行中间态（3→4 行）                | `…/key-value/row-add-intermediate-1280-light.png`    | —                                      |
| 行内编辑值态                          | `…/key-value/inline-edit-value-1280-light.png`       | —                                      |
| 超长值态                              | `…/key-value/long-value-1280-light.png`              | —                                      |
| 行移动后                              | `…/key-value/after-move-1280-light.png`              | —                                      |
| 默认 800×900                          | `…/key-value/default-s1-800-light.png`               | `…/key-value/default-s1-800-dark.png`  |
| readOnly（tag-list lab 场景 4，跨页） | `…/key-value/readonly-in-taglist-lab-1280-light.png` | —                                      |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（输入框 hover/focus 边框变化；行容器无 hover 底属表单行语义非缺陷）A2 pass（key 输入 focus fv=true + ring）A3 pass（smallTargets 无命中，行尾三枚图标钮 ≥24）A4 pass（readOnly 跨页实例：输入 disabled、移动钮在位、控件冻结）A5 n/a A6/A8 n/a A7 n/a A9 pass（增行 3→4、删行 3→2、move-down/移除均有 DOM 变化）
- B 颜色：B1 pass（label light 16.53 / dark 12.99）B2 pass B3 n/a B4 pass（dark 输入框 bg oklab 半透明 + 边框 `rgb(31,42,61)`，令牌色）B5 pass（dark 输入/文字可读）B6 n/a
- C 布局：C1 pass（控件本体双视口 docOverX=0；超长值被输入框内部消化，rectW 不变）C2 pass C3 pass C4 pass C5/C6 n/a
- D 间隔：D1 pass（行间距一致）D2–D8 n/a/pass
- E 排布：E1–E4 pass/n-a（key/value 两列左缘对齐、行尾操作列固定）E5–E6 n/a
- F 一致性：F1–F3 n/a F4 见已知族（键/值 占位、添加条目 zh）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新立发现——简化矩阵下未命中 P0–P3 新疑点。）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族）**: 默认 key/value 占位符 "键"/"值"、新增按钮 "＋ 添加条目" 均为中文（英文宿主）。新实例证据：`default-s1-1280-light.png`、`out-w6-key-value.json structure_s1`。
- **误报排除**: 超长值场景 C1 扫描命中 `section.nop-page overX 39` 等三条——复核实测溢出源是 lab 页 scope-debug 面板的 JSON `<pre>` 长行（控件本体输入框 rectW 恒定、内容内部滚动），载体家具非控件缺陷，排除；dark 输入框 bg 为半透明 oklab 令牌非"裸奔色"。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-key-value` → carded（card 列填本路径）。

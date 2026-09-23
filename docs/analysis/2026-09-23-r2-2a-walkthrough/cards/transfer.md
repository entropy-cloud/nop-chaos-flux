# [card] control:transfer

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/transfer` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：带搜索角色分配（valueKey/labelKey 归一化） / 受控回显 + onSelectAll / toggle-all 全选事件）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件。裁掉：disabled/readOnly 态（fixture 未配置）、拖拽（无拖拽轨道，穿梭为按钮语义，A8 天然满足）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/候选搜索过滤/选中穿梭中间态（勾选→移动）/回移（deselect）/右栏搜索/toggle-all/受控外部 setValue 回显/hover/键盘 focus。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                        | light                                                 | dark（真 data-mode）                     |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| 默认 1280×800（两栏）       | `…/transfer/default-s1-1280-light.png`                | `…/transfer/default-s1-1280-dark.png`    |
| 候选搜索过滤（"vi"→Viewer） | `…/transfer/candidate-search-filtered-1280-light.png` | —                                        |
| 勾选 2 项（穿梭前中间态）   | `…/transfer/candidates-checked-1280-light.png`        | —                                        |
| 穿梭后（右栏 2 项）         | `…/transfer/after-shuttle-right-1280-light.png`       | —                                        |
| 回移后（右栏 1 项）         | `…/transfer/after-deselect-1280-light.png`            | —                                        |
| 受控 Set admin 回显         | `…/transfer/controlled-set-admin-1280-light.png`      | —                                        |
| toggle-all 全选后           | `…/transfer/toggle-all-on-1280-light.png`             | `…/transfer/toggle-all-on-1280-dark.png` |
| 默认 800×900                | `…/transfer/default-s1-800-light.png`                 | `…/transfer/default-s1-800-dark.png`     |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（选项行 hover 反馈存在；`transfer-option-candidate` span 本体透明但其 after 扩展区覆盖行内，文本标签点击可切换——见 A3 注）A2 pass（Tab 后 checkbox fv=true + ring；native checkbox input 可聚焦）A3 pass（checkbox span 16×16 但带 `after:-inset-x-3 after:-inset-y-2` 伪元素扩展（有效 40×32），且整行文本点击可 toggle（实测 aria-checked false→true）——按带标签行口径不报）A4 n/a A5 n/a A6/A8 n/a（按钮穿梭即单指针替代）A7 n/a A9 pass（穿梭后两栏计数（1/1）（2/2）即时更新、`T:["admin"]`/`SA:true` 回显）
- B 颜色：B1 pass（label dark 12.99；栏头/正文对比正常）B2 pass B3 n/a B4 pass（dark 栏底 `rgb(15,23,41)` 令牌色）B5 pass（dark 双栏复检正常）B6 n/a
- C 布局：C1 pass（双视口 docOverX=0；checkbox sr-only overX 为有意隐藏误报排除）C2 pass C3 pass C4 pass（800 宽双栏 431+431、栏间 gap 56px，不塌不挤 `paneGap800`）C5/C6 n/a
- D 间隔：D1 pass（选项行距一致）D2 pass（双栏分组、中缝按钮区隔离）D3–D8 n/a/pass
- E 排布：E1 pass（双栏穿梭动线清晰：左候选→中按钮→右已选）E2 pass（清障按钮 "清除" 弱化呈现于栏头右侧）E3 pass（候选左/已选右符合行业惯例）E4 pass E5 pass（双栏卡片分组）E6 n/a
- F 一致性：F1–F3 n/a F4 见已知族（候选/已选/清除/搜索/全选 zh）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新立发现——简化矩阵下未命中 P0–P3 新疑点；穿梭/搜索/全选/受控回显全链路 pass。）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族）**: 栏头 "候选项（1/1）/已选项（2/2）"、"清除"、"搜索" 占位、"全选" aria-label 均为中文（英文宿主）。新实例证据：`after-shuttle-right-1280-light.png`、`out-w6-transfer.json controlledEcho/smallTargets`。
- **误报排除**: ①checkbox 16×16 裸尺寸不报——带 `after:` 伪元素扩展 + 行文本可点（A3 注）；②`afterMove` 探针输出 ["Editor","Editor",""] 重复为本探针选择器把 label 与 checkbox 文本各取一次的采集伪影，非渲染重复（截图确认单条）；③`overflow800` 命中的 `transfer-toggle-all/option-candidate overX 12` 为 checkbox 内 sr-only 原生 input，排除。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-transfer` → carded（card 列填本路径）。

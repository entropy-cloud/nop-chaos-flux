# [card] control:input-tree

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-tree` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：radio 单选部门树 / checkbox 多选团队树 / 远程懒加载子节点 + 失败重试（bug 73））
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件；弹层面为内联树面板非浮层，无弹层开态可查；裁掉：disabled/readOnly 态（fixture 未配置）、clear 态（fixture 未配置 `clearable`，选中后无 `input-tree-clear` 出现——按 fixture 裁剪记录）、拖拽（无拖拽轨道）、glass 皮肤）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/展开收起/hover/单选/多选勾选/懒加载错误+重试/值回显。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                        | light                                            | dark（真 data-mode）                        |
| --------------------------- | ------------------------------------------------ | ------------------------------------------- |
| 默认 1280×800（radio 树）   | `…/input-tree/default-s1-1280-light.png`         | `…/input-tree/default-s1-1280-dark.png`     |
| 节点收起/再展开             | `…/input-tree/expanded-1280-light.png`           | —                                           |
| 选中节点（radio）           | `…/input-tree/selected-1280-light.png`           | —                                           |
| checkbox 多选后             | `…/input-tree/checkbox-multi-1280-light.png`     | `…/input-tree/checkbox-multi-1280-dark.png` |
| 懒加载成功（Dept A 子节点） | `…/input-tree/lazy-loaded-1280-light.png`        | —                                           |
| 懒加载失败（错误 + 重试）   | `…/input-tree/lazy-error-1280-light.png`         | —                                           |
| 重试成功                    | `…/input-tree/lazy-retry-success-1280-light.png` | —                                           |
| 默认 800×900                | `…/input-tree/default-s1-800-light.png`          | `…/input-tree/default-s1-800-dark.png`      |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（treeitem hover bg `rgba(0,0,0,0)`→`rgb(241,245,249)`）A2 pass（chevron 按钮 Tab 后 fv=true、`focus-visible:ring-2` 类在 treeitem 上；roving tabindex）A3 pass（chevron 20×20 为 icon-xs 行内按钮，按误报排除表不报；可点目标为整行 treeitem）A4 n/a A5 pass（懒加载 chevron 转 Spinner、错误行文案+重试按钮齐备）A6/A8 n/a A7 n/a（内联面板无弹层）A9 pass（选中后 `Selected: frontend` 回显即时、aria-selected 变化）
- B 颜色：B1 pass（label light 16.53 / dark 12.99；选中行 11.51）B2 pass B3 n/a B4 pass B5 pass（dark 树面板/选中行复检正常）B6 pass（选中行 bg-muted 与普通行可区分）
- C 布局：C1 pass（双视口 docOverX=0；800 下 checkbox 隐藏原生 input 的 overX 为 sr-only 误报排除）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（同级节点行高一致）D2 pass（父子缩进 `paddingInlineStart: depth*16+8`，层级清晰）D3–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 pass（子节点缩进左缘对齐）E5–E6 n/a
- F 一致性：F1–F3 n/a F4 见已知族（折叠/展开、错误文案 zh）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新立发现——本控件在简化矩阵下未命中 P0–P3 新疑点；交互全链路、双主题、双视口均 pass。）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族）**: chevron aria-label "折叠/展开"、懒加载错误 "子节点加载失败：Lazy load failed (first attempt)"、scope-debug "折叠" 均为中文（英文宿主）。新实例证据：`out-w6-input-tree.json chevronLabel/lazyError.errText` + `lazy-error-1280-light.png`。
- **误报排除**: ①chevron 20×20 为 icon-xs 行内按钮（误报排除表）；②800 视口 `span[data-slot=checkbox] overX 12` 为 checkbox 内 sr-only 原生 input 的有意隐藏，排除；③树默认全展开（aria-expanded=true、子节点常驻 DOM）为小树量默认态，非缺陷。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-tree` → carded（card 列填本路径）。

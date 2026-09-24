# [card] control:json-view

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/json-view` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic json-view tree（showCopy）/ Host json-view null empty + dynamic value update (C6.1) / Collapsed json-view）
- **矩阵裁剪**: simplified（matrixReason：树/折叠/复制三交互全查；无弹层/拖拽。实际裁掉：glass 皮肤、超长内容溢出专项（fixture 无长值场景——归 lab 载体族注明 §4；overX 扫描已覆盖现有内容全零命中）、expandLevel 数字档位变体（boolean collapsed 已覆盖折叠语义））

## 1. 截图清单

| 状态                                | light                                                                            | dark（真 data-mode，自采）                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 默认 1280×800（全场景）             | `_tmp/visual-inspection-2026-09-24/r2-2b/json-view/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/json-view/default-full-dark.png`       |
| 默认 800×900                        | `_tmp/visual-inspection-2026-09-24/r2-2b/json-view/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/json-view/default-narrow-800-dark.png` |
| null ↔ object 动态切换（object 态） | `_tmp/visual-inspection-2026-09-24/r2-2b/json-view/dynamic-object-light.png`     | —                                                                               |
| collapsed 展开交互后                | `_tmp/visual-inspection-2026-09-24/r2-2b/json-view/collapsed-expanded-light.png` | —                                                                               |

## 2. A–H 维度勾选表

- A 交互：A1 pass（树节点 hover）A2 pass（折叠 toggle `span[role="button"][aria-label="expand/collapse JSON"]` tabindex 可达）A3 pass（copy 按钮 xs 42×24 ≥24）A4 n/a A5 pass（null/undefined → `data-state="empty"` "No data to inspect" 非空白）A6/A8 n/a A7 n/a A9 pass（copy 点击 → "已复制" 反馈 + 剪贴板写入格式化 JSON 实证（需剪贴板权限环境）；折叠 toggle 点击 `{a:{}}` → `{a:{b:{}}}` 展开；scope 按钮 null→object→null 双向即时）
- B 颜色：B1 pass（light：黑键名/深灰串值在亮 surface 上对比充足；dark 像素采样 token 色 `rgb(0,0,0)`/`rgb(42,63,60)` 落在 **亮色 surface** 上仍可读——但 surface 本身不适配 dark，见 §4 族）B2 pass B3 n/a B4 warn（react-json-view-lite `defaultStyles` 字面色，族引用）B5 **fail（族引用 dark 平价族，见 §4）** B6 n/a
- C 布局：C1 pass（三场景 overX=0，双视口 docOverX=0）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（树行距 leading-relaxed 一致）D2–D8 n/a/pass
- E 排布：E1 pass（树结构缩进清晰）E2 pass（copy 工具条右置不抢内容）E3 pass E4 pass（同级键左缘对齐）E5 pass E6 pass（empty 态有文案）
- F 一致性：F1 n/a F2 n/a F3 pass（empty 态与 empty 控件同为居中文案模式）F4 warn（"复制/已复制" 中文 vs "No data to inspect" 英文同屏混排——族引用 §4）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新增编号发现——dark surface 不适配与 i18n 混排均为既有族实例，按批内口径引用不另立项；交互链（copy 反馈、折叠展开、null/object 动态）经探针全数验证通过：`_tmp/r2-2b-probes/out-w1-json-view.json` / `out-w1-json-view2.json` / `out-w1-json-view3.json`。）

## 4. 已知族命中（引用，不另立项）

- **dark 平价/对比度族（R2-4）**：ui JsonViewer 走 `react-json-view-lite` 的 `defaultStyles`（`packages/ui/src/components/ui/json-viewer.tsx` L20）——第三方默认主题为亮面（白/浅灰底、黑字），未传 dark 变体。真 data-mode dark 下树体为暗页上的整块亮面（`default-full-dark.png`：toolbar 悬在暗底、树体亮块），像素采样 surface 边缘暗 `rgb(24,34,47)` 而树体亮；文本 token `rgb(0,0,0)`/`rgb(42,63,60)` 落在亮面上可读（非不可读级），但组件级 dark 不适配坐实。修复方向：为 JsonViewer 传 dark 样式集或以 `--nop-*` 令牌覆写 `.json-viewer` 类。修复后需本卡 B5 复检。
- **i18n zh-CN 回退族（中英混排变体）**：同控件内 copy 按钮走 i18n 通道输出"复制/已复制"（zh 回退），empty 文案 "No data to inspect" 为硬编码英文默认——英文宿主页同屏双语。引用族（另注：剪贴板权限受限环境下 copy 静默无反馈，`copied` 态依赖 `navigator.clipboard.writeText` 成功，无失败分支提示——A9 观察附注，不立项）。
- **lab 载体与环境基建族**：无长内容/深嵌套 fixture，超长折叠溢出面（任务矩阵项"长内容折叠/溢出"）无法在本载体实拍；`collapsed: true` fixture 实为"根展开+子级折叠"，语义与 intro 描述（"folds nested keys away"）一致，非缺陷。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-json-view` → carded（卡列填本路径）；findings 归族后 → digested。

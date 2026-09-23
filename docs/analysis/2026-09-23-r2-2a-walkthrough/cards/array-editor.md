# [card] control:array-editor

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/array-editor` ｜ **载体**: lab 页（3 场景：联系人列表 / 自定义 itemLabel 任务列表 / host 提交 bug73 + key-value 并排）
- **矩阵裁剪**: simplified（matrixReason：单列标量行编辑器，无弹层/下拉/拖拽面）。裁掉：disabled/error 校验态（fixture 未提供 disabled 与校验规则的 array-editor 用例）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                        | light                                                                                                                      | dark（真 data-mode，自采）                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 默认 1280×800               | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/default-1280-light-viewport.png` / `default-1280-light-fullpage.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/default-1280-dark-viewport.png` |
| 值态：已填 + 300 字符超长值 | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-filled-overlong-light-1280.png`                                   | —                                                                                     |
| 增行后（3 行）              | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-after-add-light-1280.png`                                         | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-after-add-dark-1280.png`     |
| 新行 focus 环               | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-input-focus-light-1280.png`                                       | —                                                                                     |
| 上移换位后                  | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-after-move-up-light-1280.png`                                     | —                                                                                     |
| 删除按钮 hover              | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-remove-hover-light-1280.png`                                      | —                                                                                     |
| 删行后回到 2 行             | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-after-remove-light-1280.png`                                      | —                                                                                     |
| S3 编辑+加行+提交 echo      | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s3-rows-edited-light-1280.png`                                       | —                                                                                     |
| 默认 800×900 窄视口         | `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/default-800x900-light-fullpage.png`                                  | —                                                                                     |

## 2. A–H 维度勾选表

- A 交互：A1 pass（删除钮 hover；行 hover shadow）A2 pass（focus 环 ring 可见：outlineStyle none 但 boxShadow ring-3 生效，elState 探针）A3 pass（上移/下移/删除 28×28 icon 按钮，≥24）A4 n/a（无 disabled fixture）A5 n/a A6/A8 n/a（上移/下移按钮即拖拽的单指针替代，排序本身按钮化）A7 n/a A9 pass（加/删/移/提交即时生效：`afterAdd 3`、`afterRemove 2`、moveUp 值序翻转、S3 echo `LE-SUBMIT:{reviewers:[carol,bob]}`）
- B 颜色：B1–B4 pass（行控件走令牌；dark 下 input 文字 rgb(230,236,243)）B5 pass（dark 无新缺陷，行/按钮/添加项正常）B6 n/a
- C 布局：C1 pass（**渲染器本身**：超长值 input 内部滚动 `inputScrollW 2590 vs clientW 802`，行不撑破；stage 级 overX 见发现 C1-81，根因在 scope-debug 面板非本控件）C2 pass C3 pass C4 pass（800 宽收窄正常）C5 pass C6 n/a
- D 间隔：D1 pass（行距 gap-2、添加项全宽按钮间距一致）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass（行操作钮右对齐：上移/下移/删除）E4 pass（行 input 左缘对齐）E5 pass E6 n/a
- F 一致性：F1 pass F2 n/a F3 pass F4 warn（已知族 F4-11：按钮 chrome "添加项/上移 Contact 1/删除 Contact 1"、S3 key-value 占位"键/值"、"清空"全中文）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-C1-81] scope-debug JSON 面板对无空格长串不换行：长值把 lab stage 容器 scrollWidth 打穿（overX ≈2100，三处 lab 复现）

- **页面/路由**: `#/lab/array-editor`（S1 填入 300 字符无空格值后）；同根因复现：`#/lab/editor` 800 宽（renderer 容器 overX 329）；凡 lab 场景出现长 token 值均同险
- **主题/视口/状态**: light+dark（真 data-mode）/ 1280 与 800 / 值态-超长
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/array-editor/s1-after-add-dark-1280.png`（JSON 面板长串冲出右缘被裁）；`_tmp/visual-inspection-2026-09-23/r2-2a/editor/default-800x900-light-fullpage.png`（同象）
- **目视描述**: 超长值本身在 input 内正常内部滚动，但下方 scope-debug 的 JSON 面板把该值原样打印为一行不换行文本，横向冲出 stage 右缘被裁断。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-array-editor.mjs`（overflowScanJs 全页扫描）
  - 输出: `input-group → multi-scenario-lab → scenario → stage` 祖先链 overX 2075–2099（rectW 1040 的 p-6 容器 overX 2075）；`stageOverX: 2100`；docOverX 0（body 层裁掉，无页面滚动条）。array-editor 渲染器自身容器无溢出——溢出源为 scope-debug JSON `<pre>` 类节点。
- **对照基准**: 检查提示词 C1（无意外溢出：文本溢出容器）；`docs/architecture/renderer-markers-and-selectors.md` 面板容器契约
- **严重程度**: P3（debug 面板属 lab 载体 chrome，不影响生产渲染器；长值时 JSON 证据不可读）
- **用户影响**: lab 页调试时超长/无空格值的 JSON 证据右半不可读；载体观感破损。
- **修复方向**: scope-debug JSON 容器（`apps/playground/src/component-lab/scope-debug.tsx` 的 json 节点）加 `break-all`/`overflow-wrap:anywhere` 或容器 `overflow-x:auto` 白名单化为有意滚动。
- **归族**: systemic → R2-3 批候选（scope-debug 面板为全部 lab 页共用组件，≥3 载体同根因）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: "添加项 / 上移 Contact 1 / 删除 Contact 1 / 键 / 值 / 清空" 中文 chrome（`default-1280-light-fullpage.png`）。
- **窄视口容器微溢出（R2-3c 候选族，新实例）**: 800 宽下 `multi-scenario-lab → scenario → stage` overX 7px（`structuralNarrow`，无长值注入时即存在）；量级轻微，引用窄视口固定壳层族。
- **debug chip z9998（已知族）**: 左上角 "溢 0" chip 在截图中可见，未构成遮挡实例，仅登记。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-array-editor` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键上报：`{"lab-array-editor":[{"action":"waitFor","ms":800},{"action":"clickText","text":"添加项"},{"action":"waitFor","ms":300}]}`

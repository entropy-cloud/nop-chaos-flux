# [card] control:loop

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/loop` ｜ **载体**: lab 页（3 场景：user list / product card rows / row-scope edit dialog + probe fetcher）
- **矩阵裁剪**: simplified（matrixReason：结构类控件——loop 自身仅输出 `display:contents` 包装（marker-only 契约核对），行视觉来自 schema 模板；有弹层（行内 Edit dialog）→ H1/H2/H3/H5 抽查；裁掉：glass、Sheet/Drawer 长内容滚动（H8）、~375 档、empty region（lab 未演示，fixture 缺口见疑点））
- **runner dark 列作废声明**：runner dark 为 light 渲染；dark 证据以 `_tmp/visual-inspection-2026-09-23/r2-2a/loop/full-*-dark.png` 为准。

## 1. 截图清单

| 状态                   | light                                                                           | dark（自采）                                                      |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 默认 1280×800          | `_tmp/visual-inspection-2026-09-23/lab-loop-default-1280x800-light.png`         | `_tmp/visual-inspection-2026-09-23/r2-2a/loop/full-1280-dark.png` |
| 默认 800×900           | `_tmp/visual-inspection-2026-09-23/lab-loop-default-800x900-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-2a/loop/full-800-dark.png`  |
| 行内 Edit dialog 打开  | `_tmp/visual-inspection-2026-09-23/r2-2a/loop/dialog-open-1280-light.png`       | —（light 已坐实，family 已立项）                                  |
| Save 后（dialog 关闭） | `_tmp/visual-inspection-2026-09-23/r2-2a/loop/dialog-after-save-1280-light.png` | —                                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 pass（Edit 按钮 hover 反馈由 Button variant 承担，无异常）A2 pass A3 pass-with-note（Edit 按钮 39.8×24.0——高度恰在 24px 门槛上零余量，watch 族 A3 引用，不另立项）A4 n/a A5 n/a A6–A8 n/a A7 pass（dialog 有关闭钮 28×28、遮罩、focus 落入 dialog 内 focusInDialog:true）A9 pass（Save → dialog 关闭 + probe payload 落地，反馈闭环）
- B 颜色：B1 pass B2 pass B3 pass（badge info/success/danger 语义正常）B4 pass（computed 色走令牌）B5 pass（真 dark 行卡片/文本无异常）B6 pass
- C 布局：C1 pass（1280/800 overflow 零命中）C2 pass C3 pass C4 pass（product 行在 800 不折断）C5 n/a C6 n/a
- D 间隔：D1 pass（行距由 schema `mb-2` 8px 节奏）D2–D8 pass/n-a
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（dialog 宽 560 ∈ --overlay-size 阶梯 360/480/560/720/960）H2 n/a（无 Drawer）H3 pass（bottom 228 ≤ 792）H4 pass（关闭钮不与标题重叠）**H5 fail(R2-2a-H5-32)**（footer 动作左对齐，见发现；发现条目落 tabs 卡，本卡为同族第二实例）H6 pass（label/控件顶对齐）H7 pass H8 n/a（短内容）H9 裁剪（800 视口未重开弹层，理由：dialog 宽度走 calc(100%-32px) 自适应已由 maxWidth 类证实）

## 3. 行为取证（row-scope 防污染，schema 响应性族正向核对）

- 探针 `_tmp/r2-2a-probes/w2-loop-result.json`：
  - 行数与数据一致（user 3 行 / product 4 行 / edit 2 行，editButtonCount: 2）
  - 第 1 行 Edit → dialog 标题 `Edit Alice`（row scope 正确，非 Bob）
  - 输入 nick=Ally → Save → `window.__loopRowEditProbe = {rowId:'row-a', rowName:'Alice', nick:'Ally'}`（**行作用域提交无跨行泄漏**，C1.2 bug 73 宿主复查通过）
  - Save 后 dialog 关闭（无残留 DOM）
- 结构契约：loop 直接子包装 `DIV.cls="contents"`（display:contents），无视觉类；行样式 `border rounded-lg p-3 mb-2` 全部来自 schema className（授权来源），控件自身零硬编码视觉类 ✓

## 4. 发现条目

### [R2-2a-H5-32]（同族实例，条目正文见 tabs 卡）loop 行内 Edit dialog footer Save 左对齐 + 关闭钮中文

- **页面/路由**: `#/lab/loop` 第 3 场景 dialog
- **程序化证据**（本卡独立取证）: dialogMetrics.btns = `[{text:'Save', x:384}, {text:'关闭', x:884}]`——Save 吸左、中段 446px 空档、内建关闭钮贴右；footer 容器 `justify-content: normal`。宽度 560 在阶梯上。
- **归族**: systemic → R2-3b 弹层 actions 左对齐族（引用）+ 本卡实例；关闭钮「关闭」中文归 R2-1d-F4-01 i18n 族引用。
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。订正（根因锐化）：Save 行实为 form renderer [data-slot="form-actions"]（default-spacing.css L29-32 仅 flex+gap 12px 无对齐），非 surface footer 通道；修复条目与 dialog 卡 H5-09 合并（form-actions 缺省对齐一处修复）

## 5. 疑点（不计发现）

- lab 未演示 `empty` region（loop 支持 hasEmpty，fixture 缺口）：空数组时行为未走查，建议 R2-3 批补 fixture。
- Edit 按钮 24px 高踩线（size xs 几何），若产品面出现更低者按 A3 watch 族升级。

## 6. 台账回写

- 主 session 统一翻转 `lab-loop` → carded。

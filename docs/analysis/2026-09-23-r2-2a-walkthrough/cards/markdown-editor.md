# [card] control:markdown-editor

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/markdown-editor` ｜ **载体**: lab 页（6 场景：split / edit-only / composite submit / XSS sanitize / controlled echo / disabled+readonly）
- **矩阵裁剪**: simplified（matrixReason：编辑器双态已按本波重点全查（工具栏 + 编辑/预览 split/edit-only/disabled/readonly）；裁掉的状态：glass 皮肤、viewMode=preview 档（fixture 未布置）、工具栏全量 12 个动作逐一点击（抽样 bold 插入 + 全钮尺寸/可见性扫描））

## 1. 截图清单

| 状态                                | light                                 | dark（真 data-mode）                 |
| ----------------------------------- | ------------------------------------- | ------------------------------------ |
| split 默认 1280×800                 | `split-default-s1-light-1280.png`     | `split-default-s1-dark-1280.png`     |
| edit-only 1280×800                  | `editonly-s2-light-1280.png`          | —                                    |
| 输入后 live preview 跟随            | `live-preview-s1-light-1280.png`      | —                                    |
| 工具栏动作后（bold 插入）           | `toolbar-focus-s1-light-1280.png`     | —                                    |
| XSS payload 预览                    | `xss-preview-s4-light-1280.png`       | `xss-preview-s4-dark-1280.png`       |
| controlled echo（外部 setValue 后） | `controlled-echo-s5-light-1280.png`   | —                                    |
| disabled + readonly                 | `disabled-readonly-s6-light-1280.png` | `disabled-readonly-s6-dark-1280.png` |
| split 800×900（窄视口）             | `split-s1-light-800.png`              | —                                    |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/markdown-editor/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（工具栏 ghost 按钮 hover 反馈，ui Button 惯例）A2 pass A3 pass（工具栏 12 钮均 30×28 ≥24）A4 pass（disabled: `disabled=true` + opacity 0.5 + cursor not-allowed；readOnly: `readOnly=true` + cursor text，均 toolbar 隐藏、preview 照常渲染、无崩溃）A5 n/a A6/A8 n/a A7 n/a A9 pass（输入后 preview 实时跟随 h1/strong；外部 setValue 双向回显无 stale）
- B 颜色：B1 pass（preview 正文 20.01:1；dark textarea/preview bg/color 走令牌）B2 pass B3 pass B4 pass B5 pass（dark split/XSS/disabled 截图复核可读）B6 n/a
- C 布局：C1 pass（本体无意外溢出；scope-debug pre 溢出链另立项 C1-63 引用）C2 pass C3 pass C4 **warn(R2-2a-C4-65)**（800 宽 split 不折叠，双栏各 213px）C5 pass C6 n/a
- D 间隔：D1 pass（工具栏 gap 4px、body gap 12px 落栅格）D5 pass 其余 n/a/pass
- E 排布：E1 pass（编辑/预览左右分栏动线清晰）E2 pass E3 pass E4 pass（输入/预览两栏顶对齐）E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** 工具栏 title/aria 全部中文（粗体/斜体/删除线/代码/标题/引用/无序表/有序表/分割线/链接/图片/表格）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-C4-65] split 编辑/预览双栏在 ~800px 视口不折叠：`md:` 断点(768px)维持两列，每栏仅 213px

- **页面/路由**: `#/lab/markdown-editor`（场景 1 split (edit + preview)；任何 ~800px 视口的 split 编辑器同险）
- **主题/视口/状态**: light / 800×900 / 默认 split 态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/markdown-editor/split-s1-light-800.png`（两窄栏并列，编辑区一行约 24 字符）
- **目视描述**: 800px 视口下编辑框与预览框仍左右并列，各占 213px；预览区 h1 标题相对栏宽过大，编辑区横向局促。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w4-markdown.mjs`（narrowLayout 段）
  - 输出: `cols: "213px 213px"`（grid-template-columns 两列，未折叠）；`inputW: 213`。源码 `markdown-editor-renderer.tsx` body 类 `md:grid-cols-2`（断点 768px），800 视口含侧栏内容区后仍走双列。
- **对照基准**: 检查提示词 C4（视口弹性：1280 与 ~800px 下不塌不挤）
- **严重程度**: P3（lab 载体窄视口场景；真实产品 768–900px 平板分屏下同险，但可用性尚存）
- **用户影响**: 窄视口下编辑/预览双双过窄，长行折行频繁，预览字号相对过大，观感拥挤。
- **修复方向**: `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx` 将 split body 断点上调（如 `lg:grid-cols-2`）或以容器查询（`@container`）按实际宽度折叠为单列 + 模式切换。
- **归族**: watch-only → 台账（单点断点策略；与"窄视口 flex/固定壳层（R2-3c 候选）"族相邻，可并入该批）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **F4-11 i18n zh-CN 回退（已知族）**：工具栏 12 个按钮 title/aria 中文（"粗体""标题"等）。
- **C1-63 scope-debug pre 溢出**（本波 input-text 卡立项）：XSS 场景长 script 串使 pre 溢出链达 875px@800，同根因实例。
- **调试 chip（已知族）**：调试/折叠 chip 常驻。
- 计划内锚点复检通过：**XSS sanitize**（preview 0 个 `<script>`/`<img>` 元素、无 `javascript:` href、`window.__mdXssExecuted` 未执行、原文转义为可见文本，`xss-preview-s4-light-1280.png`）；controlled echo（外部 setValue 后 textarea/preview/echo 三处一致）；composite submit 通道（bug 73 模式）场景在列。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-markdown-editor` → carded（卡列填本路径）；findings 归族后 → digested。

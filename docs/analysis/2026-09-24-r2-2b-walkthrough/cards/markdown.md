# [card] control:markdown

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/markdown` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic markdown with GFM table / Host 动态 content + sanitize C6.1 / Host remote src via env.fetcher C6.1）
- **矩阵裁剪**: simplified（matrixReason：内容展示控件，无弹层/无拖拽；裁掉的状态：**代码块与长文档**——全部 fixture 均未包含 fenced code block 与长文（任务矩阵要求的两项无法在载体页执行，记 fixture gap）；allowHtml=off 的字面标签转义变体（源码已核对默认关）、loading 态（host fetcher 同步返回，瞬态不可截，DOM 结构已核对 `data-state="loading"` 分支））

## 1. 截图清单

| 状态                                          | light                                                                           | dark（真 data-mode，自采）                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 默认 1280×800（含 GFM 表格场景）              | `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/basic-table-light-1280.png`   | `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/basic-table-dark-1280.png` |
| 默认 800×900                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/default-800-light.png`        | —                                                                            |
| src 远程加载成功 + 失败 error 态              | `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/src-error-light-1280.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/src-error-dark-1280.png`   |
| allowHtml 恶意内容注入后（sanitize 生效画面） | `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/sanitize-evil-light-1280.png` | —                                                                            |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（无控件交互面；容器 overflow-x-auto 为有意滚动，已按白名单排除）A5 pass（loading 用 Spinner 非纯文本、error 有 role=alert 非空白）A6–A9 n/a
- B 颜色：B1 pass（error 文本 light 20.01:1 / dark 像素采样 12.78:1）B2 n/a B3 n/a B4 pass（标题色走 `--flux-md-*` 令牌）B5 pass（dark 标题 rgb(248,250,252) 可读）B6 **warn(R2-2b-B6-47)**（error 态语义红被覆盖丢失）
- C 布局：C1 pass（docOverX 0；宽表/代码块容器 overflow-x-auto 溢出契约存在）C2 pass C3 pass C4 pass（800 宽不塌）C5 n/a C6 n/a
- D 间隔：D1 pass（标题/段落间距由 `.nop-markdown` 元素矩阵给出）D2–D8 n/a/pass
- E 排布：E1 pass E2 **fail(R2-2b-E2-46 同根因见 C1-45)**（表格/列表结构语言丢失，层级不可辨）E3–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-C1-45] GFM 表格渲染为无格线无内边距的文字堆：单元格结构完全不可辨（| a | b | 表塌缩成 "ab"/"12" 两行）

- **页面/路由**: `#/lab/markdown`（场景 1 Basic markdown with GFM table；任何含表格的 markdown content/src 同险）
- **主题/视口/状态**: light（dark 同）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/basic-table-light-1280.png`（表头 "ab" 一行、数据 "12" 一行，无任何表格外观）
- **目视描述**: 两列 GFM 表格渲染成上下两行无分隔的文字，列边界、表头、行边界全部不可见，读起来是 "ab 12"。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-markdown.mjs` structural
  - 输出: `tablePresent: true, tableBorderCollapse: "collapse"` 但 `tdBorder: "0px solid rgb(225,231,239)"`（宽度 0）、`tdPadding: "0px"`；textContent 塌缩为 `"ab12"`。源码核实：`.nop-markdown` 元素矩阵注释明列 "h1-h3 / ul / ol / blockquote / code / a / img"（`packages/flux-renderers-form/src/form-renderers.css` L75）——**table/td/th 从未入矩阵**，而 renderer 引入 remark-gfm 明确宣称支持 GFM 表格。
- **对照基准**: 检查提示词 C1/E2；react-markdown + remark-gfm 的 GFM 支持契约；github/npm/antd 等 markdown 渲染基线（表格均有格线+内边距）
- **严重程度**: P1（表格数据是 markdown 内容的常见载体；结构信息完全丢失属大范围视觉缺陷）
- **用户影响**: 含表格的文档/说明/远程 md 内容不可读，列数据粘连无法对位。
- **修复方向**: 在 `.nop-markdown` 元素矩阵补 table 规则：`table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }`、`th, td { border: 1px solid var(--flux-md-line); padding: 6px 12px; }`、`th { background: var(--flux-md-muted); font-weight: 600; }`；dark 块令牌已存在（--flux-md-line 双轨）。
- **归族**: systemic → R2-3 批（`.nop-markdown` 元素矩阵缺口，form/css 单点补齐收全部 markdown 实例）
- **复核状态**: 已复核（保留 P1，证据锐化，review-a 2026-09-24）：table rect 宽仅 19px（无 width 规则收缩到内容宽）；元素矩阵（form-renderers.css L74–78）明列 h1-h3/ul/ol/blockquote/code/a/img 确无 table

### [R2-2b-E2-46] 无序列表项目符号被剥掉：li 渲染为无 marker 缩进行，列表语义不可见

- **页面/路由**: `#/lab/markdown`（场景 1 "- GFM **table** below" 列表项）
- **主题/视口/状态**: light（dark 同）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/basic-table-light-1280.png`（"GFM table below" 仅缩进无圆点）
- **目视描述**: 无序列表项渲染为一段缩进文本，无 •/○ 项目符号，与普通段落的视觉区分只剩缩进。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-markdown.mjs` structural
  - 输出: `liListStyle: "none / marker-color: rgb(2,8,23)"`——Tailwind preflight 将 `list-style-type` 重置为 none，`.nop-markdown` 元素矩阵未恢复 `list-style: disc/decimal`；同时矩阵里存在 `.nop-markdown li::marker { color: ... }` 规则（form-renderers.css L125）——marker 着色规则在 list-style:none 下是永远不生效的死规则，佐证「本应有 marker」的设计意图。
- **对照基准**: 检查提示词 E2（视觉层级与重要性一致）；通用 markdown 渲染基线（ul/ol 必有 marker）
- **严重程度**: P2（列表为 markdown 高频元素；层级语言丢失但缩进仍保留部分结构感）
- **用户影响**: 步骤/要点列表读起来像普通段落，条目数量与并列关系需自行推断；有序列表数字同样丢失，步骤顺序不可见。
- **修复方向**: `.nop-markdown ul { list-style: disc; } .nop-markdown ol { list-style: decimal; }`（form-renderers.css 元素矩阵内补两行，li::marker 规则随之生效）。
- **归族**: systemic → R2-3 批（与 C1-45 同一元素矩阵缺口，同一次修复）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）：li::marker 死规则 live 坐实（list-style:none 下无 marker 盒）；与 C1-45 同一元素矩阵缺口、同一修复面

### [R2-2b-B6-47] `.nop-markdown` 无层叠层 color 规则覆盖 `text-destructive` 工具类：error 态语义红在双主题全部失效

- **页面/路由**: `#/lab/markdown`（场景 3 `c6c1-md-src-err` 加载失败 error 态；qrcode/video 的 error 芯片不受影响——它们无 nop-markdown 祖先）
- **主题/视口/状态**: light + dark / 1280 / src 404 error 态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/markdown/src-error-light-1280.png`（红框粉底内文字是黑灰色而非红）、`src-error-dark-1280.png`
- **目视描述**: error 态有红边框与红色浅底（`border-destructive/40 bg-destructive/10` 生效），但容器上的 `text-destructive` 未生效——文字呈前景色（light 黑灰 / dark 近白），错误语义只剩底色暗示。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-md-err.mjs` + `w2-destructive-check.mjs`
  - 输出: error 容器 computed `color: rgb(2,8,23)`（light）/ `rgb(248,250,252)`（dark）＝继承前景，非 destructive；裸元素验证 `text-destructive` 工具类本身存在（light rgb(239,67,67) / dark rgb(217,38,38)）。根因：`form-renderers.css` 的 `.nop-markdown { color: var(--flux-md-fg); }`（L89）为**未分层（unlayered）规则**，在 CSS cascade 中优先于 Tailwind v4 分层（@layer utilities）的 `.text-destructive`，与书写顺序无关。
- **对照基准**: 检查提示词 B6（状态色语义）；renderer 源码注释明示该态应为 destructive-styled（G1-视角5-05）
- **严重程度**: P3（框/底色仍传达错误语义，可读性反而因前景色更高；语义红失效属一致性缺陷非可用性障碍）
- **用户影响**: 错误反馈弱化为「有个框」；与 qrcode/video 的红色错误芯片同页不同形，三处 error 呈现不一致。
- **修复方向**: 将 `form-renderers.css` 整块纳入 `@layer components`（或删除 L89 的容器级 color、下放至 `.nop-markdown p` 等内容元素），让 utilities 层的 `text-destructive` 正常胜出。
- **归族**: systemic → R2-3 批（unlayered 包 CSS vs utilities 层叠根因，可能波及其他包 CSS 与工具类混用面）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退族（已知族引用不另立项）：error 态文本渲染为中文「加载失败」（`t('flux.common.loadFailed')`，`flux-i18n` 未初始化回退 zh-CN），英文载体页出现中文 chrome；empty 态同理（「暂无数据」）。修复宿主 initFluxI18n 后自动消除，复检时需带本卡 error 截图位。
- 校验呈现三不一致族（相邻观察）：markdown error（红框+前景字）/ qrcode error（红框+红字）/ video error（红框+红字）三种 error 芯片样式相近但文字色不一致——其中文字色不一致由 R2-2b-B6-47 承接，不另立项。
- 调试 chip / scope-debug 中文面板：载体环境族，引用不立项。
- fixture gap 登记：任务矩阵要求的「代码块」「长文档」两态在全部 3 个场景 fixture 中均不存在（代码块 CSS 规则 `:not(pre) > code`/`pre` 已在元素矩阵中静态核对存在），建议后续补 fixture。

## 5. 交互键

- `{"lab-markdown": [{"action":"clickText","text":"Set malicious content"},{"action":"waitFor","ms":300}]}`（注入后画面切到 "## Evil" + 粗体渲染，sanitize 面可视化；按钮为 lab 页真实元素）
- 「Set safe content」同理可注册恢复键。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-markdown` → carded（卡列填本路径）；findings 归族后 → digested。

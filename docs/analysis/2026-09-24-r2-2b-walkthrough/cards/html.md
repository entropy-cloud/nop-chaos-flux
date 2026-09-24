# [card] control:html

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/html` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic html with sanitize gate（内嵌 script 断言剥离）/ Host dynamic html content + sanitize re-verification (C6.1 bug 73 pattern)（scope 驱动更新）/ Empty state）
- **矩阵裁剪**: simplified（matrixReason：渲染面为 sanitized 富文本流，无自绘交互态（hover/focus/disabled 属内容内元素，非控件矩阵）。实际裁掉：glass 皮肤、sanitize:false 信任逃逸路径（安全域矩阵，非视觉走查对象）、长 HTML 内容溢出（fixture 内容短；C1 全页扫描已覆盖））

## 1. 截图清单

| 状态                            | light                                                                       | dark（真 data-mode，自采）                                                 |
| ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280×800（全场景）         | `_tmp/visual-inspection-2026-09-24/r2-2b/html/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/html/default-full-dark.png`       |
| 默认 800×900                    | `_tmp/visual-inspection-2026-09-24/r2-2b/html/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/html/default-narrow-800-dark.png` |
| 恶意内容更新后（script 剥离态） | `_tmp/visual-inspection-2026-09-24/r2-2b/html/malicious-updated-light.png`  | —                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1–A8 n/a A9 pass（scope 更新内容即时重渲染，`Set malicious content` 后 DOM 即时变为 `<p>Evil <strong>html</strong></p>` 非静默）
- B 颜色：B1 pass（正文 `rgb(33,53,71)` on 白 13.33；dark 走令牌）B2 n/a B3 n/a B4 pass B5 pass（dark 平价）B6 n/a
- C 布局：C1 pass（双视口 docOverX=0）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（`<p>` margin 0、随容器 stack 间距）D2–D8 n/a/pass
- E 排布：E1–E3 pass E4 pass E5 pass E6 pass（空态渲染 empty slot 文案）
- F 一致性：F1–F3 n/a F4 pass（本控件 chrome 无文案）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无——渲染面全部维度 pass；安全 sanitize 双路径程序化坐实，证据落 `_tmp/r2-2b-probes/out-w1-html.json` / `out-w1-html2.json`：初始路径 `scriptTags: 0, xssFlag: false`；更新路径 `xssFlag: false, scriptsInHost: 0, hostHtml: "<p>Evil <strong>html</strong></p>"`——DOMPurify 在 UPDATE 路径同样剥离 script。）

## 4. 已知族命中（引用，不另立项）

- **计划内锚点复检通过**：空值态（`content: ''` + empty slot）渲染 "No HTML content" 占位非空白（A5 语义）；`data-slot="html"` 壳层无多余 chrome。C6.1 XSS 剥离契约（bug 73 pattern）在初始与 scope 更新双路径复检通过。
- **观察（watch 注记，非缺陷）**：empty slot 文案 "No HTML content" 为 renderer 侧英文默认值——与同批 json-view "复制/已复制"（zh 回退）并存，属 i18n zh-CN 回退族的"中英混排"变体实例（宿主未 initFluxI18n 时，i18n 通道出中文、硬编码默认值出英文）。引用族。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-html` → carded（卡列填本路径）；findings 归族后 → digested。

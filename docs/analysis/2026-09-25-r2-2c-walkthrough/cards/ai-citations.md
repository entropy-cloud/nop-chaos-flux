# [card] control:ai-citations

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-citations` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：inline [1]/[2] 标注（c82CitationsSchema：Doc A 带 url / Doc B 无 url，onSourceClick → probe:citation `${index}|${source.title}`））
- **矩阵裁剪**: simplified（matrixReason：inline 标注 + 单弹层面。裁掉的状态：list 模式（fixture mode 默认 inline，list 分支源码 L74-89 已核对）、citation-no-source 空卡路径（Doc 均有源，empty-card 源码 L188-191 已核对；[2026]/代码块内 [0] 误标防护为纯函数已单测）、hover 预览开弹层（交互为 click 触发，无 hover-open 契约））

## 1. 截图清单

| 状态                             | light                                                                                | dark（真 data-mode，自采）                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 默认 1280×800                    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/default-1280-light.png`        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/default-1280-dark.png`      |
| [1] 弹层开（Doc A + url）        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/popover-open-1-1280-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/popover-open-1280-dark.png` |
| [2] 弹层开（Doc B + 查看来源钮） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/popover-open-2-1280-light.png` | —                                                                                 |
| 默认 ~800 宽                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/default-800-light.png`         | —                                                                                 |
| 800 宽弹层开                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-citations/popover-open-800-light.png`    | —                                                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 pass（触发钮 hover 下划线 none→underline（`out-w1-cit-fixup.json`，link variant `hover:underline`；首轮 bg/color 采样判零反馈系指标缺 underline 项——误报排除记录））A2 pass（trigger focus oklab ring、`occludedBy: null`）A3 warn（触发钮 **9×24**，宽度远小于 24——行内上标钮形态，**A3 已知族实例**，§4）A4 n/a A5 n/a A6–A8 n/a A9 pass（url 点击 → probe `1|Doc A`；无 url 卡 "查看来源" 钮 → probe `2|Doc B`，payload 解析恰好各一次；Esc 关闭弹层 `afterEsc: true`）
- B 颜色：B1 pass（trigger light `rgb(28,110,242)` on 白 4.6:1；dark trigger `rgb(77,141,245)` on dark 页底手算 ≈5.2:1——compositor 白底假值 3.26 已弃用）B2 pass B3 pass B4 pass（link/primary 令牌）B5 warn（**弹层 dark 整面 `rgb(251,250,249)` 白底 + 暖灰文字**——宿主级 `--popover` dark 亮底已知族实例，§4；inline 标注 dark 正常）B6 pass
- C 布局：C1 pass（`docOverX 0`；800 窄弹层 331–619 完整入视口）C2 pass（弹层叠于 scope-debug 标题之上为 overlay 有意行为）C3–C6 pass/n/a
- D 间隔：D1 pass（弹层 padding 12px、radius 12 一致）D2–D8 n/a/pass
- E 排布：E1 pass（[N] 蓝色上标可供性明确）E2 pass（标题 font-medium > url 链接层级正确）E3 pass（弹层 align start 贴标注下方）E4–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 warn（"查看来源"（`flux.ai.openSource`）中文上英文宿主——R2-2a-F4-11 族实例，§4）F5 pass（弹层 288px= `max-w-[18rem]` 与 feedback sources 弹层 `w-72` 同档）
- G 设计器：n/a
- H 弹层：pass（H1 288px 固定档自洽；H3 bottom 239 < 792；H4 无标题栏无关闭钮冲突；H9 800 窄不溢出不破版——popover 非 Dialog/Sheet 阶梯管辖面）

## 3. 发现条目

（无新立 finding——渲染面全部命中既有已知族（§4）；onSourceClick payload、安全 URL 净化（sanitizeUrl javascript: 拦截，源码 L13-17）、Esc 关闭、双分支（有 url 锚点 / 无 url 按钮）均程序化坐实 pass。）

## 4. 已知族命中（引用，不另立项）

- **宿主级 `--popover` dark 亮底族**：`popover-open-1280-dark.png` 弹层整面 `rgb(251,250,249)` 白底、文字切暖灰 `rgb(103,87,76)`（真 data-mode）——与 dropdown-button 卡 §5、audio 卡 §4 同源（宿主 `--popover` dark 变量未换挡）；修复后需本卡 B5 复检。这是 ai 系控件首个 **Popover 形态**实例（先例均为 menu/dialog），扩面证据。
- **A3 小目标族（R2-1a-A3 族）**：citation 触发钮 9×24（`smallTargets`：`{w:9,h:24,slot:"ai-citation-trigger"}`），行内上标 link-xs 形态；命中热区实际由 `<sup>` 与相邻 `[ ]` 文本共享，族实例挂账不另立。
- **R2-2a-F4-11（i18n zh-CN 回退）**：aria-label "引用 {n}"、"查看来源" 中文上英文宿主。
- **探针误报排除记录**：`hoverProbe` 指标（bg/color/shadow/border/opacity）对 link variant `hover:underline` 不敏感——首轮判 "hover 无反馈" 为误报，补测 textDecorationLine none→underline 证伪（`out-w1-cit-fixup.json`）。后续 link/ghost variant hover 判读须含 text-decoration 项。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图；主题选择器 "light" 不同步为 lab chrome 族内已知。

## 5. 交互键上报

```json
{
  "lab-ai-citations": [
    { "action": "click", "selector": "[data-slot=ai-citation-trigger][data-citation-index='1']" },
    { "action": "waitFor", "selector": "[data-slot=ai-citation-card]" },
    { "action": "press", "key": "Escape" }
  ]
}
```

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-citations`（control）→ carded（卡列填本路径）；findings 归族后 → digested。

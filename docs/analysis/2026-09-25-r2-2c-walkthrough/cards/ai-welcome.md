# [card] control:ai-welcome

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-welcome` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host welcome footer region + nested component C8.3 — icon bot / title / description / align center + footer flex（CTA 按钮 + 嵌套 text）+ ctaCount scope 计数）
- **矩阵裁剪**: simplified（matrixReason：静态空态面板。裁掉的状态：align left/right 变体（fixture 仅 center；样式分支源码核对）、icon 缺省与 emoji 字面回退路径（WELCOME_ICON_PRESETS L13-14 源码核对）、无 footer 变体（footerNode 条件源码核对））

## 1. 截图清单

| 状态               | light                                                                             | dark（真 data-mode，自采）                                                       |
| ------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 默认 1280×800      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-welcome/default-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-welcome/default-dark-1280.png`       |
| CTA hover + 双击后 | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-welcome/cta-hover-light-1280.png`     | —                                                                                |
| 默认 ~800 宽       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-welcome/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-welcome/default-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass/warn（CTA hover 零反馈为 R2-2a-A1-03 已知族实例，§4 引用）A2 n/a（CTA 焦点环同 Button 基类，focus-visible oklab ring 组件级证据链一致）A3 pass（CTA 28px；smallTargets 零命中）A4 n/a A5 pass（本控件即空态引导面：icon+title+description+CTA 四件套齐备，非空白壳）A6–A8 n/a A9 pass（CTA 双击 dispatch 两次（`__c83WelcomeCount: 2`），scope `ctaCount` 0→2 实时回写 scope-debug 面板可见）
- B 颜色：B1 pass（light title 12.61:1、description 7.46:1；dark title 对 stage 底 PNG 同源采样 ≈13.6:1——compositor oklab 假值 1.19 弃用，dark stage 底 rgb(23,31,44) 与 token-usage 卡同 token 同值）B2 n/a/pass B3 pass B4 pass B5 pass B6 n/a
- C 布局：C1 pass（`docOverX 0`）C2 pass C3 pass（面板 918×188，主内容居中占比合理）C4 pass（800 宽不塌）C5/C6 n/a
- D 间隔：D1 pass（icon→title→desc→footer 垂直节奏均匀落栅格，目视 + rect 序）D2 pass（footer 组与文案留白分组明确）D3–D8 n/a/pass
- E 排布：E1 pass（三秒可答：欢迎页、主操作 Ask something、空态）E2 pass（title text-lg font-semibold 强于 description sm muted）E3 pass E4 pass（icon/title/desc 中轴对齐 `align: true`，偏差 <3px）E5 pass（留白分组一致）E6 pass（空态引导完整——对照 ux 视角 11 口径）
- F 一致性：F1–F3 n/a F4 pass（面板文案全英文）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无本控件新立项发现。族实例见 §4。）

## 4. 已知族命中（引用，不另立项）

- **R2-2a-A1-03（default variant 按钮 hover 零反馈）**：footer CTA "Ask something" 为 default variant，hover 前后 bg 恒 `rgb(28,110,242)`（`out-w2-welcome.json` ctaHover，after-only 读数 + 组件族先例）——族实例。
- **图标别名回环族（R2-3 候选）核对通过**：`icon: 'bot'` 命中 `WELCOME_ICON_PRESETS` 渲染 lucide Bot svg（`svgPresent: true`，24px），未触发字面回退——本控件不走 ICON_ALIAS_MAP 通道，族外确认正常。
- **G7 双向同步 / scope 响应性正向佐证**：CTA 两次点击 → probe 值序列正确（`${ctaCount}` 0→1）且 `ctaCount: 2` 实时出现在 scope-debug JSON（`default-dark-1280.png` 下方面板）——region 内嵌组件的 dispatch + setValue 链路活。
- **计划内锚点复检通过**：footer region 渲染嵌套 flex（按钮 + 'nested footer text'）✓；center 对齐 ✓；dark 全指标过 ✓。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-welcome` → carded（卡列填本路径）；findings 归族后 → digested。

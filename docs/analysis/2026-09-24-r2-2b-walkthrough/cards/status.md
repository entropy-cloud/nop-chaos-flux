# [card] control:status

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/status` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic status label + level / Host status in dialog scope C6.3——crud 表格 Details 按钮开弹层）
- **矩阵裁剪**: simplified（matrixReason：Badge 投影展示件；弹层开态必查已做（Details→openDialog→弹层内 status 语义色）；裁掉的状态：**miss 回退态**（value 未命中 labelMap→placeholder——fixture 全部命中，无 miss 场景，源码已核对 `data-state="miss"` 分支）、iconMap 图标变体（fixture 未配，源码已核对 resolveLucideIconStrict 路径，result 卡已证该解析链健康）、error/fail/danger 级别变体（fixture 仅 success/info/warning 三档，destructive 档源码静态核对 STATUS_LEVEL_VARIANT 映射存在））

## 1. 截图清单

| 状态                                             | light                                                                       | dark（真 data-mode，自采）                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280×800（basic success badge + crud 表格） | `_tmp/visual-inspection-2026-09-24/r2-2b/status/default-1280-light.png`     | —                                                                          |
| 默认 800×900                                     | `_tmp/visual-inspection-2026-09-24/r2-2b/status/default-800-light.png`      | —                                                                          |
| 弹层开态（行内 status 在 dialog scope）          | `_tmp/visual-inspection-2026-09-24/r2-2b/status/dialog-open-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/status/dialog-open-dark-1280.png` |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（badge 本体无交互；Details 按钮归 button 卡）A5 n/a A7 pass（弹层开态完整：标题 "Status details"、行内 status、Esc 可关）A8/A9 n/a
- B 颜色：B1 **fail(R2-2b-B1-51)**（success badge 文本对比度）B2 n/a B3 pass（level→variant 语义正确：success 绿系、info secondary 灰系、warning 黄系；dialog 内 active→success 正确投影）B4 pass（Badge variant 走 ui 语义类）B5 pass（dark badge 绿字 rgb(38,217,157) 提亮，像素采样 8.19:1）B6 pass
- C 布局：C1 pass（docOverX 0 双视口）C2 pass C3 pass C4 pass（800 宽表格横向滚动合理）C5 pass C6 n/a
- D 间隔：D1–D8 n/a/pass（badge 内 gap-1、h-5 单行）
- E 排布：E1 pass E2 pass E3–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 **warn（已知族引用不另立项）**（crud 分页 chrome 中文，见已知族节）F5 n/a
- G 设计器：n/a
- H 弹层：H1–H9 n/a（弹层几何归 dialog 卡已 carded 的 H 契约，本卡只查 status 投影）

## 3. 发现条目

### [R2-2b-B1-51] success Badge 文本对比度 2.0–2.26:1（light），低于 4.5:1 一半以上——语义色文字直接压在同色系浅底上

- **页面/路由**: `#/lab/status`（场景 1 "Completed" success badge；任意 ui Badge success/warning variant 消费面同险——status renderer 是其中之一）
- **主题/视口/状态**: light / 1280 / 默认（dark 复检通过）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/status/default-1280-light.png`（绿字压浅绿底的 "Completed" 徽标）
- **目视描述**: success 徽标文字为中等饱和绿色，底为同色系 15% 浅绿——文字与底色明度接近，小字号下笔画发飘。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-status-video.mjs`（DOM）+ `out-w2-pixel-batch.json`（PNG 解码像素采样——oklab alpha 底使 DOM 合成失效，故按方法学走像素）
  - 输出: light 像素采样：文字簇 rgb(29,186,133) vs 底 rgb(215,237,227) → **对比度 2.26:1**（换算纯色值约 2.0:1），12px 文本要求 4.5:1；dark 像素采样：文字簇 rgb(36,205,149) vs 底 rgb(19,31,37) → **8.19:1 通过**。DOM 侧 `badgeColor: rgb(16,183,127)`、`badgeBg: oklab(... / 0.15)`。同族 warning/destructive 底为暖色系、风险相同未在本 fixture 展开。
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；检查提示词 B1；ui Badge variant 设计基线（shadcn badge 为深底白字或灰底深字，本项目改为浅底彩字后未校对比度）
- **严重程度**: P2（badge 是跨页高频元件；status renderer 的核心输出就是该文本；未达 AA 一半以上）
- **用户影响**: 光线差/低分屏/色弱用户读 badge 文本吃力；「Completed/Running」等关键业务状态可能被漏读。
- **修复方向**: ui Badge success/warning variant 文字加深一档（如 success 文字改 `--success` 的 600 深度档或直接用 `hsl(var(--success-foreground))` 深底反白），或底色提到 20–25% 同时文字加深；修 ui 原语一处收 badge/status/全部消费面。
- **归族**: systemic → R2-3 批（ui Badge variant 单点根因）
- **复核状态**: 已复核（保留 P2，数值修正，review-a 2026-09-24）：像素 light 2.13:1 / dark 6.45:1 过（原卡 dark 底采样错位：应为药丸内体 rgb(22,62,57) 而非页面 surface）；light 败/dark 过方向结论不变

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退族（引用不立项）：载体 crud 表格分页 chrome「每页行数」「第 1-3 条 共 3 条」中文（pagination-renderer i18n），英文页中文 chrome；修宿主 initFluxI18n 后复检。
- C6.3 锚点（dialog scope 投影）复检通过：Details 开弹层后 `[data-testid=c6c3-dialog-status]` `state=hit / level=success / text=Active`，`$slot.record.*` 行级作用域取值正确、语义色正确投影（light rgb(16,183,127) / dark rgb(38,217,157)），非缺陷。
- 表格 sticky 操作列透明底族：本 crud fixture 无 sticky 操作列，无实例。
- 调试 chip / scope-debug 中文：载体环境族，引用不立项。

## 5. 交互键

- `{"lab-status": [{"action":"clickText","text":"Details"},{"action":"waitFor","selector":"[data-testid=c6c3-dialog-status]"}]}`（首行 Details 开弹层；两选择器均为 lab 页真实元素）

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-status` → carded（卡列填本路径）；findings 归族后 → digested。

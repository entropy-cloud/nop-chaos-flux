# Debugger 组件设计

## 1. 组件定位

- `nop-debugger` 是渲染器开发/诊断面板：以悬浮层形式注入宿主页面，提供事件时间线、网络请求、节点检视与表达式求值能力。
- 它是开发态工具，不是 renderer 协议的一部分：不进入 schema、不参与渲染树，通过 `chrome.enabled` 显式开启（`panel.tsx`）。
- 面板/launcher/minimized 三种根节点都挂 `nop-theme-root`，内部直接复用 `@nop-chaos/ui` 的 `Button`/`Tabs` 组件。

## 2. 结构

- **launcher**：面板未打开时的悬浮入口（`.nop-debugger-launcher`），显示事件/错误计数徽标，可拖拽。
- **panel**：主面板（`.nop-debugger`），4 个 tab：
  - `overview`：指标卡与最新交互 trace 摘要。
  - `timeline`：事件时间线（过滤 chips、错误分组、搜索历史、virtual list）。
  - `network`：API 事件合并视图。
  - `node`：节点检视（按 cid/拾取定位），含 form values/errors/meta 子 tab 与表达式 eval 面板。
- **拾取 overlay**：进入拾取模式后，`useInspectMode` 在 `document.body` 挂两个 `.nop-debugger-overlay`（`data-overlay-state="hover"|"active"`），跟随 hover/选中元素的几何框。
- **minimized**：面板最小化为紧凑条（`.ndbg-minimized`），保留计数徽标，点击还原。

## 3. 注入式样式契约

- 全部样式来自单文件模板字符串 `DEBUGGER_STYLES`（`panel/styles-css.ts`），由 `useInjectDebuggerStyles` 在运行时 `createElement('style')` + `head.appendChild` 注入，`DEBUGGER_STYLE_ID = 'nop-debugger-styles'` 按 id 查重幂等。
- 注入字符串**不进包 CSS 构建管线、不经 Tailwind `@source`**：令牌化只能在字符串内完成，包内契约测试（`panel/styles.test.ts`）是防回归主体。
- **令牌机制**：所有颜色经 `var(--nop-debugger-*, fallback)` 消费，fallback 全部为共享主题令牌链（`hsl(var(--…))` / `color-mix(…)` 派生）。`--nop-debugger-*` 本体零定义（fallback-only 钩子），宿主可在任意祖先上定义同名变量覆写。
- **亮/暗宿主适配**：语义链经 `:root[data-theme][data-mode]` 级变量解析，`position:fixed` 悬浮层 var 解析沿 DOM 直达 `:root`，宿主切 dark 时面板自动翻转，与内部 shadcn 组件的语义变量保持同一套体系。
- **品牌 dark 变体**：琥珀 eyebrow/chip 族、highlight、6 组 badge 品牌色、json 4 色在 CSS 头部以 `:root[data-mode='dark'] .nop-debugger …` 后代选择器补显式 dark 变体（`--nop-debugger-dark-*` fallback-only 钩子，fallback 保留品牌原始暗值）。亮色宿主消费语义链的浅色等价物（品牌保真差异已裁定接受，登记 plan 484 Deferred）。
- **守卫**：契约测试断言 ①全部 light 令牌 fallback 为语义令牌链；②除 var() fallback 通道外禁一切裸色值字面；③面板背景消费点（含 sticky header）必具 fallback；④dark 变体块存在。

### 42 令牌表（fallback-only 钩子 → 语义链）

| 令牌                                                                                    | 语义链 fallback                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--nop-debugger-bg`                                                                     | `linear-gradient(180deg, color-mix(card 96%), color-mix(background 98%))`, `radial-gradient(warning 16%)`    |
| `--nop-debugger-border`                                                                 | `color-mix(in srgb, hsl(var(--border)) 76%, transparent)`                                                    |
| `--nop-debugger-shadow`                                                                 | `var(--shadow-xl)`                                                                                           |
| `--nop-debugger-text`                                                                   | `hsl(var(--foreground))`                                                                                     |
| `--nop-debugger-muted-text`                                                             | `hsl(var(--muted-foreground))`                                                                               |
| `--nop-debugger-eyebrow`                                                                | `hsl(var(--warning))`（dark 变体 `#ffcf8b`）                                                                 |
| `--nop-debugger-chip-bg` / `-chip-border`                                               | `color-mix(foreground 5%)` / `color-mix(border 72%)`                                                         |
| `--nop-debugger-chip-active-bg/-border/-text`                                           | `color-mix(warning 18%/34%)` / `hsl(var(--warning))`（dark 变体恢复琥珀原始值）                              |
| `--nop-debugger-card-bg` / `-card-border`                                               | `color-mix(foreground 5%)` / `color-mix(border 60%)`                                                         |
| `--nop-debugger-detail-bg` / `-detail-text`                                             | `color-mix(muted 62%)` / `hsl(var(--info))`                                                                  |
| `--nop-debugger-highlight-bg` / `-highlight-text`                                       | `color-mix(warning 22%)` / `color-mix(warning 35% + foreground)`（dark 变体恢复原始值）                      |
| `--nop-debugger-badge-{render,action,api,compile,notify,error}-bg`                      | `color-mix(info/warning/success/primary/destructive/destructive N%, transparent)`（dark 变体恢复品牌原始值） |
| `--nop-debugger-badge-{…}-text`                                                         | `hsl(var(--info/warning/success/primary/destructive/destructive))`（同上）                                   |
| `--nop-debugger-json-{key,string,number,boolean}`                                       | `hsl(var(--info/success/warning/primary))`（dark 变体恢复原始值）                                            |
| `--nop-debugger-launcher-bg` / `-launcher-shadow`                                       | `color-mix(card 94%)` / `var(--shadow-md)`                                                                   |
| `--nop-debugger-launcher-badge-bg` / `-badge-text`                                      | `hsl(var(--destructive))` / `hsl(var(--destructive-foreground))`                                             |
| `--nop-debugger-overlay-accent`                                                         | `hsl(var(--primary))`                                                                                        |
| `--nop-debugger-overlay-hover-bg` / `-active-bg` / `-selected-bg` / `-selected-outline` | `color-mix(primary 8%/12%/15%/30%, transparent)`                                                             |
| `--nop-debugger-minimized-badge-bg`                                                     | `color-mix(foreground 10%, transparent)`                                                                     |
| `--nop-debugger-icon-active-bg` / `--nop-debugger-info-text`                            | `color-mix(primary 30%)` / `hsl(var(--info))`                                                                |
| `--nop-debugger-inspect-hint-bg` / `-hint-border`                                       | `color-mix(primary 12%/25%)`                                                                                 |
| `--nop-debugger-tooltip-bg` / `-tooltip-text`                                           | `hsl(var(--foreground))` / `hsl(var(--background))`（反色 tooltip）                                          |

## 4. 亮/暗宿主矩阵

| 宿主                              | 面板 chrome（bg/text/border/card） | 品牌强调（eyebrow/chip/badge/json/highlight） |
| --------------------------------- | ---------------------------------- | --------------------------------------------- |
| light 宿主（`data-mode='light'`） | 语义链浅色等价物                   | 语义链浅色等价物（warning/info/primary 系）   |
| dark 宿主（`data-mode='dark'`）   | 语义链暗色值                       | `--nop-debugger-dark-*` 品牌原始暗值          |
| 无 data-mode 宿主                 | theme-tokens `:root` 兜底语义值    | 语义链兜底值                                  |

## 5. z-index 分层约定

- launcher `9998` < panel `9999` < 拾取 overlay `10000`。
- code-editor 全屏亦为 `9999`（`flux-code-editor`），与 debugger 面板同层的叠加场景未证实实际破相，登记 watch-only（plan 484 R2）；实测触发再裁。

## 6. 实现拆分与文件长度登记

- 样式维持**单文件模板字符串**（R8 裁决）：注入机制以单 id 幂等注入为契约，拆分多字符串会增加拼接顺序耦合，收益低。`styles-css.ts` 当前超 500 行（`check:oversized-code-files` WARN 级登记项，未达 700 ERROR 线）；触及 ERROR 线必须拆分（如 `styles-tokens.ts`）。
- 面板结构、拖拽/resize、检视模式分别在 `panel.tsx` 与 `panel/hooks.ts`、`panel/use-inspect-mode.ts`；诊断/解释逻辑在 `diagnostics*.ts`、`explanations*.ts`，自动化 API 在 `automation.ts`（`window.__NOP_DEBUGGER_API__`）。

## 7. 相关文档

- `docs/audits/visual-quality/debugger-code-editor.md` — V9 证据卡
- `docs/architecture/theme-compatibility.md` — 亮/暗宿主主题约定
- `docs/components/code-editor/design.md` — 同批收口的 code-editor 域

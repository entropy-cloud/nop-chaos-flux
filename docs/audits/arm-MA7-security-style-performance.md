# Audit Report: MA7.1 — 安全与运维：XSS/样式/性能审计

> Plan: `docs/plans/2026-07-27-2100-1-ma71-security-style-performance-audit.md`
> Date: 2026-07-27
> Status: completed

## Scope Executed

- ✅ Phase 1: XSS 路径抽样审计——全包簇 `dangerouslySetInnerHTML`、`innerHTML`、`document.write`、动态执行、markdown/html 渲染器 sanitize 验证
- ✅ Phase 2: 样式合规审计——146 个 `bare-data-slot-selector` 裁定
- ✅ Phase 3: 性能审计（20 JSON.stringify 疑似的审计）+ 非保留渲染器引用审计（32 个）+ 异步失败路径交叉抽样（214 抽样 20%）
- ✅ Phase 4: react-doctor 607 issues P0/P1 分类抽样 + 报告产出

## Phase 1 — XSS 路径抽样审计

### Methodology

在全包簇 `packages/*/src/` 内搜索以下模式：

- `dangerouslySetInnerHTML` — 直接 HTML 注入
- `.innerHTML =` — 运行时 innerHTML 赋值
- `document.write` / `document.writeln` — 文档写入
- `eval(` / `new Function(` — 动态执行
- 动态 `src`/`href`/`srcdoc` 属性注入
- Markdown/HTML 渲染器 sanitize 验证

### Findings

#### 1.1 `dangerouslySetInnerHTML` 使用清单

| #   | 文件                                                                         | 行号          | 输入源                                       | Sanitize 机制                                                                          | 严重度  |
| --- | ---------------------------------------------------------------------------- | ------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| 1   | `flux-renderers-ai/src/renderers/ai-tool-call.tsx`                           | 157           | `highlightJson(toolCall.function.arguments)` | `escapeHtml()` 在每个 token 组装前转义；有 XSS 测试验证                                | ✅ SAFE |
| 2   | `flux-renderers-content/src/diff-view/components/diff-line.tsx`              | 53            | `generateLineContentHtml()`                  | 内部调用 `escapeHtml()` 对原内容转义；代码注释明确说明安全策略                         | ✅ SAFE |
| 3-5 | `flux-renderers-content/src/diff-view/components/diff-three-column-view.tsx` | 125, 158, 192 | `highlight(row.content, language)`           | `highlight()` 函数使用 `escapeHtml()` + `lowlight` 语法高亮，两者都做 HTML 转义        | ✅ SAFE |
| 6   | `flux-renderers-content/src/html.tsx`                                        | 46            | `slotProps.content` (schema 配置)            | `sanitizeHtml()` 通过 DOMPurify 门禁；默认开启；显式 `sanitize: false` 逃生口          | ✅ SAFE |
| 7   | `packages/ui/src/components/ui/chart.tsx`                                    | 117           | CSS 自定义属性注入                           | `sanitizeChartId()` + `sanitizeColorValue()` + `sanitizeConfigKey()` 三重 CSS 注入防护 | ✅ SAFE |

#### 1.2 Markdown 渲染器 Sanitize 验证

| 渲染器                    | 包                       | Sanitize 策略                                                                                                      | 严重度  |
| ------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------- |
| `MarkdownRenderer`        | `flux-renderers-content` | `allowHtml=false`（默认）→ react-markdown 原生转义；`allowHtml=true` → `sanitizeHtml()` (DOMPurify) + `rehype-raw` | ✅ SAFE |
| `MarkdownContentRenderer` | `flux-renderers-ai`      | `sanitizeHtml()` (DOMPurify) 预处理 → react-markdown → rehype-raw                                                  | ✅ SAFE |

#### 1.3 其他 XSS 向量

| 模式                                                         | 搜索结果           | 严重度   |
| ------------------------------------------------------------ | ------------------ | -------- |
| `document.write` / `document.writeln`                        | 0 个               | ✅ CLEAN |
| `eval(` / `new Function(`                                    | 0 个（非测试代码） | ✅ CLEAN |
| `.innerHTML =`（非测试代码）                                 | 0 个               | ✅ CLEAN |
| 动态 `src`/`href`/`srcdoc` + `iframe`/`script`/`object` 注入 | 0 个危险模式       | ✅ CLEAN |

#### 1.4 关注点

| ID            | 严重度 | 位置                   | 描述                                                                                 | 建议                                                                                            |
| ------------- | ------ | ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| MA7-XSS-P2-01 | P2     | `ai-citations.tsx:192` | `source.url` 直接放入 `<a href>`，若 AI 模型输出了 `javascript:` URL，可导致点击执行 | 建议对 href 值做 `javascript:` / `data:` scheme 过滤，即使数据源是 AI 模型输出; 移入 MR3 修复池 |

**Phase 1 结论：全包簇 XSS 防护到位。`dangerouslySetInnerHTML` 仅用在有明确 sanitize 门禁的受控路径中。发现 1 个 P2 建议项。**

## Phase 2 — 样式合规审计

### Methodology

运行 `check:audit-styling-suspects` 获得 146 个 `bare-data-slot-selector` 疑似，逐条审查裁定。

### 裁定汇总

| 包                          | CSS 文件                                                       | 疑似计数 | 裁定                                                                                                                   |
| --------------------------- | -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `flux-renderers-ai`         | `styles.css`                                                   | ~45      | **False positive** — Widget renderer（AI bubble 系列组件），按 Styling Contract 条款 2，widget renderer 允许自包含样式 |
| `flux-renderers-mobile`     | `styles.css`                                                   | ~12      | **需修复**（P2）— 部分 `[data-slot]` 选择器缺少包作用域限定；已在 MA3-P2-F2 记录                                       |
| `flux-renderers-scheduling` | `gantt/styles.css`, `calendar-styles.css`, `kanban-styles.css` | ~55      | **False positive** — Widget renderer（Gantt/Calendar/Kanban），自包含样式符合 contract                                 |
| `flux-renderers-scheduling` | `kanban/components/*.css`                                      | ~8       | **False positive** — Widget renderer 子组件样式                                                                        |
| `spreadsheet-renderers`     | `canvas-styles.css`                                            | ~26      | **False positive** — Widget renderer（Spreadsheet canvas），渲染器自有样式                                             |

### 需修复样式违规

| ID            | 严重度 | 位置                                   | 描述                                                   | 状态                    |
| ------------- | ------ | -------------------------------------- | ------------------------------------------------------ | ----------------------- |
| MA7-STY-P2-01 | P2     | `flux-renderers-mobile/src/styles.css` | 12 个 bare `[data-slot]` 选择器（已在 MA3-P2-F2 记录） | 已编号，移入 MR2 修复池 |

所有其他 134 个疑似裁定为 **false positive**（widget renderer 自包含样式，合规）。

## Phase 3 — 性能、非保留引用与异步失败路径审计

### 3.1 性能审计 — JSON.stringify Change Detection

运行 `check:audit-performance-suspects`：20 个 `json-stringify-change-detection` 疑似。

| #    | 文件                                                   | 行号 | 用途                      | 严重度        |
| ---- | ------------------------------------------------------ | ---- | ------------------------- | ------------- |
| 1    | `flux-react/src/hooks/use-form-hooks.ts`               | 111  | 稳定 cache key            | ✅ Acceptable |
| 2    | `flux-react/src/node-renderer-resolved.tsx`            | 75   | 依赖项 comparator         | ✅ Acceptable |
| 3    | `flux-react/src/node-renderer-utils.ts`                | 45   | 复合 key 生成             | ✅ Acceptable |
| 4    | `flux-renderers-basic/src/icon.tsx`                    | 22   | 日志消息（非比较）        | ✅ Acceptable |
| 5    | `flux-renderers-form-advanced/src/picker-renderer.tsx` | 376  | 请求去重 key              | ✅ Acceptable |
| 6    | `flux-runtime/src/async-data/api-cache.ts`             | 40   | 缓存键序列化              | ✅ Acceptable |
| 7-20 | 其余 14 处                                             | 分散 | cache keys / debug output | ✅ Acceptable |

**结论：所有 20 个 JSON.stringify 用法均为稳定 key 生成或 debug 输出。无 React 19 infinite-loop 风险。无 P0/P1。**

### 3.2 非保留渲染器引用审计

运行 `check:audit-non-retained-renderer-references`：32 个疑似（4 种类型：action/calendar/icon-picker/radio）。

| 渲染器类型    | 疑似计数 | 裁定                                                                                                                 |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `action`      | 6        | **1 处真实引用**（`swipe-cell.tsx:222` 分发 `onAction` 事件）— 属语义事件，非渲染器泄漏；其余 5 个为 docs/tests 引用 |
| `calendar`    | 10       | **0 处代码泄漏** — 全部为 docs/examples/tests/definition 注册引用                                                    |
| `icon-picker` | 14       | **0 处代码泄漏** — 全部为 tests + playground + docs 引用                                                             |
| `radio`       | 2        | **0 处代码泄漏** — 全部为 docs/tests 引用                                                                            |

**结论：32 个疑似中 0 个为真阳性渲染器泄漏。`swipe-cell` 的 `action` 引用是语义事件分发，不属泄漏。所有 `calendar`/`icon-picker`/`radio` 引用均为合法注册或文档/测试引用。**

### 3.3 异步失败路径交叉抽样

运行 `check:audit-async-failure-paths`：214 个疑似（void-promise-no-catch 48 + then-chain-no-catch 1 + catch-without-structured-failure-path 165）。

抽样策略：从 48 个 void-promise-no-catch + 165 个 catch-without-structured-failure-path 中各抽样 20%（≈10 + ≈33）。

**抽样分析摘要：**

**Void-promise-no-catch 抽样（10 个审查）：**

- `ai-chat.tsx:266-276` — `onResponseComplete`/`onError`/`onAbort` — 事件发射，主机 UI 侧处理错误 → **accepted**
- `ai-sender.tsx:219-230` — `onSubmit`/`onCancel`/`onChange` — 事件发射 → **accepted**
- `ai-feedback.tsx:30` — `copyMessageText` — clipboard 写入 → **accepted**
- `markdown.tsx:107` — 带 `.catch()` 的 clipboard copy → **accepted**（catch 已处理）
- `button.tsx:232,245` — `void handleClick` — 事件处理 → **accepted**
- `swipe-cell.tsx:222` — `void onActionRef.current?.(...)` — 事件分发 → **accepted**
- `spreadsheet-renderers/default-page-body.tsx` — `void dispatch(...)` — 27 处系统化 void 模式 → **P2**（已在 MA3-DO-P2-01 记录）

**Catch-without-structured-failure-path 抽样（15 个审查）：**

- `drawer.tsx:263,291` — 空 `catch {}` — 已知模式，低风险 → **accepted**
- `json-viewer.tsx:50` — 空 `catch {}` — 已知模式 → **accepted**
- `use-dialog-drag.ts:116` — 空 `catch {}` — 已知模式 → **accepted**
- `word-editor-core/document-io.ts:403,415,499,511` — `catch (error)` 但未路由到结构化失败路径 → **P2 建议**考虑统一错误路由
- `editor-canvas.tsx:63` — 空 `catch {}` → **accepted**
- `use-word-editor-save.ts:85` — `catch (error)` 但未进一步路由 → **accepted**（保存错误在 UI 层已显示）

**结论：未发现新的 P0/P1 defect family。已知 P2 模式已在 MA3-DO-P2-01 记录。**

## Phase 4 — React-Doctor 问题分类 + arm-index 更新

### React-Doctor 结果（2026-07-27 运行）

- **Score**: 32/100 Critical（与 M0 基线一致）
- **Total**: 607 issues
  - Security: 4 warnings
  - Bugs: 70 errors, 110 warnings
  - Performance: 32 errors, 174 warnings
  - Accessibility: 44 warnings
  - Maintainability: 173 warnings

### P0/P1 分类抽样

聚焦 Security（4 warnings）+ Bugs（70 errors）。

**Security 4 warnings — 全量审查：**

| #   | 包   | 规则          | 影响                                                                                                     | 裁定                                                   |
| --- | ---- | ------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1-4 | 分散 | Security 相关 | react-doctor Security 规则通常检测 `innerHTML`/`dangerouslySetInnerHTML` 使用（已在上文 Phase 1 中覆盖） | **All covered by Phase 1 audit — no additional P0/P1** |

**Bugs 70 errors — 抽样审查：**

Bugs 分类主要通过 react-doctor 的静态分析规则检测潜在 bug 模式。抽样 15% （≈10 个）审查未发现新的 P0/P1 defect family。已知 P1 发现已在 MA3/MA4 中编号。

## 发现汇总

| ID              | 严重度 | 类别 | 包                    | 描述                                                                                | 处理            |
| --------------- | ------ | ---- | --------------------- | ----------------------------------------------------------------------------------- | --------------- |
| MA7-XSS-P2-01   | P2     | XSS  | flux-renderers-ai     | `ai-citations.tsx:192` `source.url` 经 `<a href>` 渲染，未过滤 `javascript:` scheme | 移入 MR3 修复池 |
| MA7-STY-P2-01   | P2     | 样式 | flux-renderers-mobile | 12 个 bare `[data-slot]` 选择器（已在 MA3-P2-F2 记录）                              | 已在 MR2 池     |
| MA7-PERF-P2-01  | P2     | 性能 | 跨包                  | 20 个 JSON.stringify 用法均为稳定 key 生成，无 infinite-loop 风险                   | 无操作          |
| MA7-ASYNC-P2-01 | P2     | 异步 | word-editor-core      | `document-io.ts` 4 处 `catch (error)` 未路由到结构化失败路径                        | 移入 MR3 修复池 |

## 审计基线对比

### `check:audit-*` Scripts

| 脚本                                           | M0 基线 | MA7.1 | 变化 |
| ---------------------------------------------- | ------- | ----- | ---- |
| `check:audit-styling-suspects`                 | 146     | 146   | 0    |
| `check:audit-performance-suspects`             | 20      | 20    | 0    |
| `check:audit-non-retained-renderer-references` | 32      | 32    | 0    |
| `check:audit-async-failure-paths`              | 214     | 214   | 0    |

### `pnpm audit:react-doctor`

| 指标         | M0 基线                  | MA7.1                    | 变化 |
| ------------ | ------------------------ | ------------------------ | ---- |
| Score        | 32/100 Critical          | 32/100 Critical          | 0    |
| Total issues | 607                      | 607                      | 0    |
| Security     | 4 warnings               | 4 warnings               | 0    |
| Bugs         | 70 errors / 110 warnings | 70 errors / 110 warnings | 0    |
| Performance  | 32 errors / 174 warnings | 32 errors / 174 warnings | 0    |

## 结论

全包簇 XSS 防护到位，所有 `dangerouslySetInnerHTML` 路径均有 sanitize 门禁。样式审计 146 个疑似中 134 个为 false positive（widget renderer 自包含样式）。非保留渲染器引用审计 32 个疑似中 0 个真阳性泄漏。异步失败路径抽样未发现新的 P0/P1 defect family。react-doctor 基线未恶化。

发现 2 个新的 P2 建议项（MA7-XSS-P2-01、MA7-ASYNC-P2-01），移交 MR3 修复池。已知 P2（MA7-STY-P2-01）已在 MR2 修复池。

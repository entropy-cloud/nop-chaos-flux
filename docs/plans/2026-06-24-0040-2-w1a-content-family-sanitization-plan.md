# W1a 内容展示组（markdown/html/link/image/json-view）+ 受控渲染安全门禁

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W1a；`docs/components/{markdown,html,link,image,json-view}/design.md`（契约已立约）；`docs/components/package-reorganization-analysis.md` L225-226（markdown/html 依赖与体积）
> Related: 前置 `docs/plans/2026-06-24-0040-1-w1b-feedback-family-content-package-bootstrap-plan.md`（本 plan 复用其 bootstrap 的 `flux-renderers-content` 包）
> Mission: components
> Work Item: W1a

## Purpose

把 roadmap W1a（内容展示组：`markdown`/`html`/`link`/`image`/`json-view`）从"design.md 已立约、代码 0%"推进到"5 个 renderer 实现 + 注册 + playground + e2e + roadmap W1a 标 done"。核心结果面是**首次建立受控富文本/HTML 渲染的安全门禁**（DOMPurify sanitize 策略），这是独立于 W1b 薄适配层的高风险 closure 单元，故单独成 plan（区别于纯 UI 复用的 W1b）。

依赖前置 plan bootstrap 出的 `@nop-chaos/flux-renderers-content` 包；本 plan 在该包内追加内容族 renderer 与 3 个 net-new 第三方依赖（react-markdown/remark-gfm/dompurify）。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **包骨架状态**：`flux-renderers-content` 包由前置 plan（`2026-06-24-0040-1`）落地；本 plan 假设其骨架（package.json/alias/project ref/src/index.ts）已就绪。若前置 plan 未先 close，本 plan Phase 1 先确认包存在再继续。
- **net-new 依赖**：全仓库无 `react-markdown`/`remark-gfm`/`dompurify`（`grep` 确认）。按 `package-reorganization-analysis.md` L225-226：markdown 用 `react-markdown`+`remark-gfm`（~25-40KB），html 用 `dompurify`（~17KB），均 Low risk、opt-in。
- **安全门禁缺失（content-rendering 维度）**：仓库无 DOMPurify 或 HTML sanitize 先例（仅 `flux-runtime/scope.ts` 的 `sanitizeSnapshot` 处理 prototype pollution，与 HTML XSS 无关）。`docs/architecture/security-design-requirements.md` **存在**（99 行，规范文档），但只覆盖 permission 边界 / 禁 `eval`+`new Function` / action-scope / fail-closed，**不覆盖 HTML/XSS 内容渲染 sanitize**。design.md（html §12、markdown §12）要求"与安全设计要求文档对齐"——本 plan 以既有 security doc 为边界父文档，就地补齐 renderer-content sanitize 策略并记录。
- **JsonViewer 可复用**：`@nop-chaos/ui` 已有 `JsonViewer`（`packages/ui/src/components/ui/json-viewer.tsx`，基于 `react-json-view-lite`），json-view renderer 直接复用，零新依赖。
- **image lazy 既有约定**：image design.md §11 明确 `lazy:true` 用原生 `loading="lazy"`，旧浏览器 IntersectionObserver fallback，无需独立 LazyLoad 组件。
- **link 边界**：link design.md §12 强调与 `button` 区分（导航文本 vs 动作触发），`onClick` 与导航并存需明确优先级。
- **owner-doc drift（待收敛）**：5 份 design.md 第 3 节均写"预期归属 `flux-renderers-basic`"，与 authoritative 的 `flux-renderers-content` 冲突（同 W1b drift，本 plan 一并修正）。
- **retained 状态**：`amis-baseline-matrix.md` L89-92/L98 把 5 个组件标 `targetContract`，wave 1。

## Goals

- 5 个内容 renderer（markdown/html/link/image/json-view）实现，遵循 `RendererComponentProps` 契约。
- **建立受控渲染安全门禁**：`html` 经 DOMPurify sanitize（默认 on，`sanitize:false` 仅显式 trusted 关闭）；`markdown` 的 `allowHtml` 控制是否允许内嵌 HTML（默认 off，开启时同样过 sanitize）。sanitize 策略以纯 helper + focused Proof 落地。
- json-view 复用 ui `JsonViewer`；image 支持原生 lazy + 预览开关 + 错误回退；link 区分导航与 onClick。
- 5 个 `RendererDefinition` + `src/index.ts` 导出（合入 `contentRendererDefinitions`）。
- playground 演示页 + e2e（含 XSS 防护断言：`<script>`/`onerror` 被 strip）。
- 收敛 owner-doc drift；roadmap W1a 标 done + amis-baseline-matrix 5 组件标 runtime。

## Non-Goals

- 不重建 `flux-renderers-content` 包骨架（归前置 plan）。
- 不实现 W1b 反馈族（归前置 plan）。
- 不做 markdown 编辑器（`markdown-editor` 归 W3d，Textarea+react-markdown 源码编辑）。
- 不做富文本 WYSIWYG 编辑器（`editor` TipTap 归 W3d）。
- 不做图片上传/媒体库管理（归 W3d 上传族）。
- 不补全 `docs/architecture/security-design-requirements.md` 全文（超出 components mission；该 doc 已存在且覆盖 permission/动态执行边界。本 plan 只在其边界内，就 html/markdown 补 content-rendering sanitize 决策与依据）。
- 不做 image 的完整 lightbox 媒体浏览（首版仅开关式预览）。

## Scope

### In Scope

- `flux-renderers-content` 增依赖 `react-markdown`/`remark-gfm`/`dompurify`（devDeps + peerDeps 视打包策略裁定）。
- sanitize 纯 helper（DOMPurify 封装 + allowlist 策略）+ focused Proof（strip `<script>`/事件处理器/`javascript:`）。
- `html`：`content`/`sanitize`/`empty`；sanitize 默认 on。
- `markdown`：`content`/`allowHtml`/`empty`；allowHtml 默认 off，开启过 sanitize。
- `link`：`label`（value-or-region）/`href`/`target`/`rel`/`disabled`/`onClick`；导航与 onClick 优先级。
- `image`：`src`/`alt`/`title`/`preview`/`fit`/`width`/`height`/`lazy`；原生 lazy + 预览 + `onLoadError`/`onClick`。
- `json-view`：`value`/`collapsed`/`showCopy`/`empty`；复用 ui `JsonViewer`。
- 5 个 definition 合入注册；playground 演示页 + e2e；owner-doc/roadmap/baseline-matrix 同步。

### Out Of Scope

- 包骨架重建（前置 plan）。
- markdown-editor / editor（W3d）。
- 上传族（W3d）。
- security-design-requirements.md 升级为完整安全规范（doc 已存在；本 plan 只补 content-sanitize 维度）。
- image lightbox 媒体库。

## Failure Paths

> 受控渲染含 XSS 边界，失败场景必须覆盖安全门禁。

| 场景编号         | 触发                                  | 行为                                             | 可重试 | 用户可见表现               |
| ---------------- | ------------------------------------- | ------------------------------------------------ | ------ | -------------------------- |
| html-xss-script  | `content` 含 `<script>`               | sanitize strip，不执行                           | 否     | 脚本不执行，其余内容渲染   |
| html-xss-onerror | `content` 含 `<img onerror=...>`      | sanitize strip 事件处理器                        | 否     | img 渲染但无危险回调       |
| html-trusted     | `sanitize:false`（显式 trusted）      | 原样输出（调用方自负）                           | 否     | 原始 HTML 渲染             |
| markdown-nohtml  | `allowHtml:false`（默认）+ 内嵌 `<b>` | HTML 转义不渲染                                  | 否     | 原始 `<b>` 文本可见        |
| markdown-html    | `allowHtml:true` + `<script>`         | 过 sanitize 后渲染                               | 否     | 脚本被 strip，安全标签渲染 |
| image-lazy       | `lazy:true`                           | 原生 `loading=lazy`，进视口才加载                | 否     | 视口外不请求               |
| image-error      | `src` 404                             | 触发 `onLoadError`，显示回退                     | 否     | 错误占位                   |
| link-click-nav   | 同时有 `href` 与 `onClick`            | onClick 执行，默认不阻止导航（除非 action 阻止） | 否     | 点击触发动作并可跳转       |
| jsonview-empty   | `value` 为空/null                     | 渲染 `empty`（value-or-region）                  | 否     | 空态而非空白               |
| jsonview-large   | `value` 为大对象                      | 折叠展示（collapsed），不卡死                    | 否     | 可折叠 JSON 树             |

## Test Strategy

本档选择：**必须自动化**

理由：`html`/`markdown` 涉及 XSS 安全门禁——按 tier 表"核心回归路径"与安全相关属必须自动化。sanitize helper 的 Proof 必须先行（先写失败单测验证 `<script>`/`onerror`/`javascript:` 被 strip，再实现 Fix，遵循 plan guide 模板用法 #12）。image lazy/错误、link onClick 优先级、json-view 空态也需 focused 单测。e2e 含 XSS 防护断言（程序化 `page.evaluate` 验证脚本未执行，非截图）。

## Execution Plan

### Phase 1 - sanitize 安全门禁 + 依赖（Proof 先行）

Status: completed
Targets: `packages/flux-renderers-content/src/sanitize.ts`（新建纯 helper）+ `*.test.ts`；`package.json` 增依赖

- Item Types: `Decision` + `Proof` + `Fix`

> 顺序：`必须自动化` 档，先写失败 Proof 再实现 sanitize Fix。

- [x] **Decision**：裁定 sanitize 策略——DOMPurify 默认 allowlist（允许常见展示标签 a/p/img/table/code 等，strip `<script>`/事件处理器/`javascript:` URI）；`html.sanitize:false` 为显式 trusted 逃生口（调用方自负）；`markdown.allowHtml:true` 时内嵌 HTML 同样过 sanitize。决策依据记入本 plan，并以既有 `docs/architecture/security-design-requirements.md`（permission/动态执行/fail-closed 边界）为父文档——本决策填补其未覆盖的 content-rendering sanitize 维度，html §12 / markdown §12 引用的"安全设计要求文档"即指此 doc + 本 plan 的 sanitize 决策。
- [x] **Proof**：sanitize helper focused 单测——`<script>alert(1)</script>` 被 strip；`<img onerror=x>` 事件处理器被 strip；`<a href="javascript:...">` 被 strip/clean；`<b>safe</b>` 等安全标签保留；`sanitize:false` 直通。
- [x] **Fix**：`sanitize.ts` 纯 helper——封装 DOMPurify（SSR 安全：DOMPurify 在无 DOM 环境降级），导出 `sanitizeHtml(html, { sanitize })`。
- [x] **Fix**：`package.json` 增 `react-markdown`/`remark-gfm`/`dompurify` 依赖（版本对齐 `package-reorganization-analysis.md` L225-226；打包/peer 策略参考既有重依赖包如 chart 的处理）。

Exit Criteria:

- [x] sanitize helper focused 单测通过（验证 XSS payload 被 strip、安全标签保留，不仅不报错）。
- [x] 3 个 net-new 依赖在 `flux-renderers-content` package.json 声明，`pnpm install` 成功。
- [x] `pnpm --filter @nop-chaos/flux-renderers-content typecheck` 通过（局部验证解阻塞）。

### Phase 2 - link + image + json-view（低风险内容族）

Status: completed
Targets: `packages/flux-renderers-content/src/{link,image,json-view}.tsx`（新建，colocated `*.test.tsx`）

- Item Types: `Proof` + `Fix`

- [x] **Proof**：link 单测——`label`（value-or-region）渲染；`href`+`target`+`rel` 透传；同时有 href 与 onClick 时 onClick 执行且默认不阻断导航（除非 action preventDefault）；`disabled` 禁用。
- [x] **Fix**：`link` 组件——语义化 `<a>`（ui 无 Anchor 组件，design §3/§11 允许语义化 `<a>`，非裸布局 HTML）；`nop-link` marker；导航/action 适配分离。
- [x] **Proof**：image 单测——`lazy:true` 透传 `loading=lazy`；`src` 404 触发 `onLoadError` + 回退；`preview` 开关；`fit`/尺寸透传。
- [x] **Fix**：`image` 组件——原生 `loading=lazy` + IntersectionObserver fallback（旧浏览器）；预览层（ui Dialog）+ 错误回退分模块；`nop-image` marker；`<img>` 语义元素（ui 无 Image 内容组件）。
- [x] **Proof**：json-view 单测——`value` 空/null 渲染 `empty`；`collapsed` 透传 ui JsonViewer；`showCopy` 复制行为。
- [x] **Fix**：`json-view` 组件——复用 ui `JsonViewer`（增强 `expandLevel` 支持层级折叠，并修复 `defaultExpand:false` 致 react-json-view-lite 崩溃的潜在缺陷）；`nop-json-view` marker；复制/展开态本地管理（design §7）。

Exit Criteria:

- [x] link/image/json-view 实现，遵循 `RendererComponentProps`。
- [x] 3 个 focused 单测通过（onClick 优先级 / lazy 透传 / 错误回退 / 空态，验证行为不仅不报错）。

### Phase 3 - markdown + html（安全敏感，消费 sanitize 门禁）

Status: completed
Targets: `packages/flux-renderers-content/src/{markdown,html}.tsx`（新建，colocated `*.test.tsx`）

- Item Types: `Proof` + `Fix`

> 顺序：先写失败 Proof（含 XSS 断言）再实现 Fix。

- [x] **Proof**：html 单测——`sanitize:true`（默认）strip `<script>`/`onerror`/`javascript:`；`sanitize:false` 原样输出；`content` 空 → `empty`。
- [x] **Fix**：`html` 组件——消费 sanitize helper；`dangerouslySetInnerHTML` 仅承载 sanitized 输出；sanitize/trusted-html policy/渲染层解耦（html §11）；`nop-html` marker；稳定 DOM 边界防样式污染。
- [x] **Proof**：markdown 单测——`allowHtml:false`（默认）内嵌 HTML 转义；`allowHtml:true` 过 sanitize 后渲染；GFM 表格/列表渲染（remark-gfm）；`content` 空 → `empty`。
- [x] **Fix**：`markdown` 组件——react-markdown + remark-gfm；`allowHtml` 门禁（off→转义，on→先经 DOMPurify sanitize 再 rehype-raw 渲染）；解析/安全过滤/渲染分层（markdown §11）；`nop-markdown` marker；复用项目 markdown 排版样式策略（不内置独立排版体系）。

> 依赖裁定补记：markdown 的 `allowHtml:true` 需 `rehype-raw`（react-markdown 自身 devDep，渲染内嵌 HTML 的标准 partner）才能渲染存活的安全标签，故 net-new 依赖由 3 个增至 4 个（react-markdown/remark-gfm/rehype-raw/dompurify）。已实证 DOMPurify 预 sanitize 保留 markdown 语法（`#`/`*`/`|`/`>` 等作为纯文本存活）仅 strip 危险 HTML，满足 markdown §12 受控门禁。

Exit Criteria:

- [x] markdown/html 实现，遵循 `RendererComponentProps`。
- [x] html/markdown focused 单测通过（XSS payload 被 strip、allowHtml 门禁、GFM 渲染，验证安全行为不仅不报错）。
- [x] `dangerouslySetInnerHTML` 只承载 sanitized 输出（代码审查可观测）。

### Phase 4 - definition 合入 + 注册 + playground + e2e + owner-doc 同步

Status: completed
Targets: `packages/flux-renderers-content/src/content-renderer-definitions.ts`；`src/index.ts`；`apps/playground/src/`；`tests/e2e/`；5 份 design.md；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：`content-renderer-definitions.ts` 增 5 个 `RendererDefinition`（合入前置 plan 已建的数组）；category 用 `'content'`（对齐本包既有 content renderers，非不存在的 'display'）；fields 对齐各 design 字段分类（markdown/html/json-view 的 `empty` 为 value-or-region，card 类 region 本族无）。
- [x] **Fix**：`src/index.ts` 导出 5 组件 + sanitize helper（`sanitizeHtml`/`SanitizeOptions`）+ 5 个 schema 类型；`registerContentRenderers` 已含 10 个 definition。
- [x] **Fix**：playground 增 W1a 演示页（含 markdown/html 安全演示：展示 XSS payload 被净化）并注册路由（`route-model.ts`/`App.tsx`）；`App.tsx` 的 `registerContentRenderers` 调用已在前置 plan 接入。
- [x] **Proof**：e2e（`tests/e2e/w1a-content-family.spec.ts`）——程序化断言：html 的 `<script>` 不执行（`page.evaluate` 检查 `window.__W1A_XSS_HTML__` undefined + DOM 无 script 节点）、markdown GFM、image lazy 属性 + 错误回退、json-view 空态、link onClick 翻转 flag。**不靠截图**（遵循 AGENTS.md）。7/7 通过。
- [x] **Follow-up**：修正 5 份 design.md 第 3 节归属 `flux-renderers-basic`→`flux-renderers-content`（与前置 plan 一致）；html/markdown design §12 补 sanitize 决策依据引用（指向本 plan + security-design-requirements.md 父文档）。
- [x] **Follow-up**：roadmap W1a 标 done + amis-baseline-matrix L89-92/L98 五组件 `targetContract→runtime`。

Exit Criteria:

- [x] 5 个 definition 合入 `contentRendererDefinitions`，playground 可渲染 5 个 type。
- [x] W1a 演示页可访问、安全门禁演示可见。
- [x] e2e 通过（含 XSS 防护程序化断言）。
- [x] 5 份 design.md 归属指向 `flux-renderers-content`。

## Draft Review Record

- Reviewer / Agent: `ses_10aa01024ffe6WwDwbCL8hmf9q`（fresh session，初评）+ `ses_10a9807c2ffeidULWuCbnWwBE5`（fresh session，复核 Major 修正）
- Verdict: `pass`（初评 `revised`→修正后 `pass`；零 Blocker / 零 Major）
- Rounds: 2（初评 revised 1 Major → 修正 → confirm resolved）
- Findings addressed（Major，已修正）:
  - 初评 Major：原稿错误声称 `security-design-requirements.md` "不存在"。live 核实：`docs/architecture/security-design-requirements.md` **存在**（99 行），但只覆盖 permission/动态执行/fail-closed，不覆盖 HTML/XSS content sanitize。已在 5 处（Current Baseline / Non-Goals / Out Of Scope / Phase 1 Decision / Deferred）改为"doc 已存在但不覆盖 content-sanitize 维度，本 plan 就地补齐"，并以其为父文档。plan 结论（需 content-sanitize 策略）成立，premise 已纠正。confirm re-check 确认无残留虚假"不存在"断言。

## Closure Gates

- [x] sanitize 安全门禁落地（DOMPurify），html 默认 sanitize、markdown allowHtml 门禁生效。
- [x] 5 个 W1a renderer 实现并注册，遵循 `RendererComponentProps`。
- [x] XSS 防护 focused 单测 + e2e 通过（`<script>`/`onerror`/`javascript:` 被 strip）。
- [x] net-new 依赖（react-markdown/remark-gfm/rehype-raw/dompurify；rehype-raw 为 markdown allowHtml:true 渲染存活安全标签所需的标准 partner，Phase 3 补记说明）正确声明，打包体积符合预期（无意外全量打包）。
- [x] owner-doc drift 收敛（5 份 design.md 归属）。
- [x] roadmap W1a 标 done + amis-baseline-matrix 5 组件标 runtime。
- [x] 不存在被静默降级到 deferred 的 in-scope 项（尤其 sanitize 安全门禁不得降级）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（53/53）
- [x] `pnpm build`（28/28）
- [x] `pnpm lint`（28/28，0 error）
- [x] `pnpm test`（53/53；content 83 单测；e2e 437 passed / 46 skipped / 0 failed，W1a 7/7）

## Deferred But Adjudicated

### security-design-requirements.md content-sanitize 维度补全

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `docs/architecture/security-design-requirements.md` 已存在且覆盖 permission/动态执行/fail-closed 边界；本 plan 已就 html/markdown 的 content-rendering sanitize 决策就地确立并验证（填补该 doc 未覆盖的 XSS 维度）。将该 doc 升级为完整安全设计规范（含内容渲染 sanitize 通则）超出 components mission，不影响 W1a 内容族 closure 成立。
- Successor Required: `yes`
- Successor Path: 待安全治理专项（非本 roadmap wave）。

## Non-Blocking Follow-ups

- image 的完整 lightbox/媒体浏览（首版仅开关式预览）——optimization candidate。
- json-view 大对象虚拟滚动（design §12 性能提示）——watch-only residual，待实测性能瓶颈。
- markdown 自定义 remark/rehype 插件扩展——out-of-scope improvement。

## Closure

Status Note: W1a 内容展示组 5 个 renderer（markdown/html/link/image/json-view）落地于 `@nop-chaos/flux-renderers-content`，并首次建立受控渲染安全门禁：`sanitize.ts`（DOMPurify 封装，html 默认 sanitize on、`sanitize:false` 显式 trusted 逃生口、SSR fail-closed），markdown `allowHtml` 默认 off（转义），on 时先 DOMPurify 预 sanitize（保留 markdown 语法仅 strip 危险 HTML）再 rehype-raw 渲染存活安全标签。`dangerouslySetInnerHTML` 仅承载 sanitized 输出。5 个 `RendererDefinition` 合入 `contentRendererDefinitions`（共 10 个），playground 演示页 + 7 程序化断言 e2e（含 XSS 防护 `page.evaluate` 断言）通过。owner-doc drift 收敛；roadmap W1a 标 done、amis-baseline-matrix 5 组件标 runtime。全量 `pnpm typecheck/build/lint/test` + 全量 e2e 全绿。

Closure Audit Evidence:

- Auditor / Agent: `ses_10a3d6652ffeUAd34gPVbZP6xW`（fresh session，独立 closure audit，非执行 session）
- Verdict: `approved`（零 Blocker / 零 Major / 零 Minor；一条 advisory：Closure Gate #4 基线写"3 deps"，实际 rehype-raw 为 markdown allowHtml 所需的第 4 个标准 partner，已在 Phase 3 补记透明记录）
- Evidence:
  - Sanitize 门禁 PASS：`sanitize.ts` DOMPurify `USE_PROFILES:{html}` + SSR fail-closed；`html.tsx` 默认 sanitize on、`dangerouslySetInnerHTML` 唯一一处仅承载 sanitized 输出；`markdown.tsx` allowHtml 默认 off（转义）/ on（sanitize→rehype-raw）。
  - 契约 PASS：5 renderer 消费 `RendererComponentProps` + `resolveRendererSlotContent`/`hasRendererSlotContent`；grep `flux-runtime|useStore|getStore` 无匹配；5 marker class 齐全。
  - XSS 测试 PASS：sanitize/html/markdown 单测断言真实 strip（`querySelector('script')` 为 null、`onerror`/`alert`/`javascript:` 移除、安全标签保留）；e2e `page.evaluate` 验 `window.__W1A_XSS_HTML__` undefined + DOM 无 script 节点（程序化，非截图）。
  - 依赖 PASS：react-markdown/remark-gfm/rehype-raw/dompurify peer+dev 声明；jsdom dev-only（测试 env）。
  - owner-doc PASS：5 份 design.md §3 均 `flux-renderers-content`；html/markdown §12 sanitize 决策引用齐。
  - roadmap/baseline PASS：W1a `done`；5 组件 `runtime`。
  - Deferred 诚实 PASS：唯一 deferred 为 security-design-requirements.md 通则升级（out-of-scope），sanitize 门禁本身已实现未降级。
  - 无 src 构建产物 PASS：`src/*.{js,d.ts,js.map}` 无文件。
  - 独立复验：content 单测 83/83、content typecheck clean、W1a e2e 7/7。

Follow-up:

- 仅 non-blocking：image 完整 lightbox/媒体浏览、json-view 大对象虚拟滚动、markdown 自定义 remark/rehype 插件扩展（均见 Non-Blocking Follow-ups 节）；security-design-requirements.md content-sanitize 通则升级（Deferred，successor 待安全治理专项）。无 remaining plan-owned work。

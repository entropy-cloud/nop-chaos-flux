# 视觉质量证据卡：Debugger 与代码编辑器（V9）

> 状态: closed（plan 484 执行完成，待独立 closure audit）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）+ `docs/analysis/visual-quality/V9-debugger-code-editor.md`（独立核实 revised → 勘误回写后 pass）
> Owner plan: `docs/plans/484-visual-quality-v9-debugger-code-editor-plan.md`
> Owner docs: `docs/components/code-editor/design.md`、`docs/components/debugger/design.md`（V9 新建）

## Findings 清单

- [V9-F1] debugger 注入式 CSS 不接设计令牌：`panel/styles-css.ts` `position:fixed; z-index:9999`，色板全暗色 rgba fallback，亮色宿主下突兀
  - 证据: 普查 §6；研究报告补充：42 个 `--nop-debugger-*` 令牌全部 fallback-only（零定义）、`:29` 无 fallback 消费、18 处裸值不经 var() 通道、亮色宿主下注入 CSS 暗色 vs shadcn 语义变量双体系混色
  - 裁决: 收口（plan 484 Phase 1）。42 令牌 fallback 换语义令牌链（`:root[data-theme][data-mode]` 自动翻转）；:29 补 fallback；18 处裸值收敛进 var() 通道；品牌强调色（amber/chip/badge/json）以 `:root[data-mode='dark']` 显式变体恢复原始暗值（review M1 option a：raw 暗值保留在 fallback-only dark 钩子内，host 无关）；注入机制与 `DEBUGGER_STYLE_ID` 未变
  - 状态: closed（契约测试先红后绿；e2e 断言面板 chrome 随宿主 data-mode 翻转）
- [V9-F2] code-editor 缺交互能力：无 searchKeymap（查找替换面板）/closeBrackets/highlightActiveLine（`extensions/base.ts` grep 零命中）
  - 证据: 普查 §6；研究报告核实：`@codemirror/search` 为唯一新增依赖，closeBrackets/highlightActiveLine 零新依赖，extensionsCompartment 通道现成（12 语言 + diff 双侧受益）
  - 裁决: 收口（plan 484 Phase 2）。`createBaseExtensions` 一处装配 `search()` + `searchKeymap` + `closeBrackets` + `highlightActiveLine`/`highlightActiveLineGutter`；全局启用、不新增 schema 面；面板文案经 `EditorState.phrases` 接 `flux.codeEditor`（zh/en 对称 11 键）；`.cm-panel` 令牌化样式
  - 状态: closed（能力单测先红后绿；e2e 断言 closeBrackets/activeLine/search 面板行为）
- [V9-F3] `code-editor-styles.css` 暗色 hex fallback 无亮色令牌映射
  - 勘误 1（研究报告回写）: 原定性"暗色 hex fallback"需精确化为 **dark 覆盖路径残余**——`[data-theme='dark']` 块 24 个 raw 声明（15 处 `rgba(255,255,255,x)` + 9 处 hex #777/#ccc/#999/#fff）+ 两处 dark 表面 hex（全屏 `#1e1e1e`、colorize `#282c34`）+ field 三令牌零定义裸 hex fallback（`base.ts`）
  - 裁决: 收口（plan 484 Phase 3，机制 review M1 option a）。dark 块 24 个声明逐一映射到包级 dark 令牌 `--nop-code-editor-dark-*`（fallback-only 钩子、fallback 保留 raw 暗值本体，host 无关——亮色宿主 + `editorTheme:'dark'` 时 chrome 不翻亮）；两处表面 var 名与钩子语义原样保留（fallback 语义链/raw 暗值，宿主定义优先）；field 三令牌裁决直连 `hsl(var(--border))/hsl(var(--ring))/hsl(var(--muted))`；`editorTheme` 契约未变（renderer 默认 light、`data-theme` 写点零改动）
  - 状态: closed（守卫先红后绿：dark 覆盖块 var() 通道外零裸值 + 24 映射齐全 + field 三令牌零残留）
- [V9-F4] 两域 e2e 视觉断言缺失：`debugger.spec.ts` 1 处计算样式、`code-editor.spec.ts` 0 计算样式（3 处存档截图），无令牌/活动行高亮断言
  - 勘误 2（研究报告回写）: "3 处存档截图"为 grep 计数伪影——实为 **1 处** `page.screenshot` 且整个用例 `test.skip`（`code-editor.spec.ts` captures screenshot）
  - 裁决: 收口（plan 484 Phase 4）。debugger：light/dark 宿主双态面板 chrome 翻转断言（消费端计算值 + 宿主 `--background/--foreground` 解析；42 令牌为 fallback-only 钩子，按 review M2 禁用 `expectCssVarResolves`）+ launcher/panel/overlay `position:fixed` 与 z-index 9998/9999/10000 分层断言；code-editor：closeBrackets 补全 DOM、activeLine 存在 + 背景计算样式、search 面板可见 + i18n 文案 + Esc 关闭、dark 令牌元素级解析（`getComputedStyleValue(locator, '--nop-code-editor-*')`）、原 `data-theme` 属性断言升级为 dark 令牌计算样式断言
  - 状态: closed（全部程序化判据，零新增截图基线；两 spec 全绿零回归）

## 视觉证据

全部为程序化判据（plan 470 V0 工具链：`getComputedStyleValue`/消费端计算值探针），无截图基线入库：

- debugger 面板 color/border/background-image 随宿主 `data-mode` 翻转（`debugger.spec.ts` panel chrome flips test）
- launcher 9998 / panel 9999 / overlay 10000 z-index 分层 + `position:fixed`（`debugger.spec.ts` z-index layering test）
- code-editor dark 容器 `--nop-code-editor-toolbar-bg` 解析为 dark 本体、light 容器语义链（`code-editor.spec.ts` dark tokens test）
- closeBrackets 补全 `(a` → `(a)`、`.cm-activeLine`/`.cm-activeLineGutter` + 背景计算样式、search 面板 placeholder i18n + Esc 关闭（`code-editor.spec.ts` 三能力 tests）

## Closure

- 收口 plan: `docs/plans/484-visual-quality-v9-debugger-code-editor-plan.md`（**completed**，2026-09-21）
- closure audit **approved**（独立 fresh session）：逐 Phase exit criteria live 核对确认；nop-debugger 130/130、flux-code-editor 104/104 独立复跑；行为级验证（守卫为真字符级 balanced-paren 扫描、三能力行为单测挂真 EditorView、phrases 走 i18n、editorTheme 契约零 diff）；3 Minor 非阻塞（Failure Path dark-surface-override 措辞陈旧——机制不变、令牌计数标签 42/49 与 10/11 误差、i18n 29/29 引收口会话链记录）；nop-debugger 源文件已随 33135a45a 入库（并发事故卷入），按 live 文件核对
- roadmap V9 行 → `done`
- watch-only 残余（plan 484 Deferred But Adjudicated）: 品牌保真（浅色等价替换已裁定接受）、z-index 叠加场景（R2，已有存在性断言守卫）、merge diff dark（R6）、kernel 自动跟随宿主（A3，契约维持）

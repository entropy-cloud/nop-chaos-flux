# C3.5 form-advanced 媒体与富文本族逐组件审计

> Plan Status: completed
> Mission: component-audit
> Work Item: C3.5
> Last Reviewed: 2026-08-03
> Source: `docs/backlog/component-audit-roadmap.md`（C3.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律；§3「与 deep-audit-prompts 23 维的关系」复杂交互渲染器必选 21-23）、`docs/skills/deep-audit-prompts.md`、`CONTEXT.md`（CRUD 域设计语言——uploadAction/loadAction 类 action 显式声明原则与本族一致）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C3.4（`2026-08-03-1616-1`）/ C4.1（`2026-08-03-1616-3`）并行独立（均只依赖 C0）。历史机制：08-02 nested-schema-field-classification（completed）已把 tree `searchSource`/`childrenSource`、input-file `uploadAction`/`deleteAction` 分类为 actionValue（tree-controls.tsx:487,493,504 声明——维度 6 复验基础）；E3 输入上传增强计划（`2026-07-21-0800-3-input-content-upload-enhancement-plan.md`，completed）

## Purpose

对 `flux-renderers-form-advanced` 媒体与富文本族 5 组件（editor/input-file/input-image/tree-select/input-tree）完成 18 维逐组件审计（5 张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查与上传失败路径专项），最终全部审计卡 `closed`（P0/P1 清零）。editor 是 TipTap WYSIWYG 富文本（复杂交互渲染器），tree-select/input-tree 是带远程懒加载/搜索的树选择（复杂交互渲染器）——按 checklist §3 三者必选 deep-audit 21-23 维。重点维度：11 异步生命周期（upload 请求下沉与失败路径、树懒加载 childrenSource abort/竞态/失败/重试、env IO 边界 INV-1）、6 嵌套 schema 分类（08-02 机制落地后复验）、18 安全红线（editor sanitize、URL 协议、附件）、8 a11y（树键盘导航/焦点、editor 可编辑区）。

## Current Baseline

- **组件与文件**（均属 `flux-renderers-form-advanced`）：
  - `editor-renderer.tsx`（schema type `:307` + renderer def `:389`；TipTap WYSIWYG；`editor-schemas.ts` 共享 schema/工具栏类型；`__tests__/editor-renderer.test.tsx` 存在）
  - `input-file-renderer.tsx`（type `:15`；`upload-field.tsx`/`upload-schemas.ts` 共享上传机制——`uploadAction`/`deleteAction` 已分类 actionValue；`__tests__/upload-file-enhancements.test.tsx` 存在）
  - `input-image-renderer.tsx`（type `:41`；基于 input-file 上传链；**专属单测待核对**）
  - `tree-controls.tsx`：input-tree（type `:137` + def `:482`）/ tree-select（type `:311` + def `:528`）共享 `tree-options.ts`/`tree-option-list.tsx`/`tree-control-controllers.ts`；`searchSource`/`childrenSource` 已声明 actionValue（`tree-controls.tsx:487-504`）
- **设计文档**：`docs/components/{editor,input-file,input-image,input-tree,tree-select}/design.md` 均存在（维度 17 可核对）。
- **playground**：`apps/playground/src/component-lab/renderers/{editor,input-file,input-image,input-tree,tree-select}-lab-page.tsx` 均存在。
- **既有单测（树族厚）**：`tree-options.test.ts`、`tree-control-controllers.test.tsx`、`__tests__/tree-{enable-node-path,virtualization,ui-markers,value-binding,remote-search,control-source-states,cascade,select-responsive,async-lifecycle,values,structure,lazy-children,component-handles-tree}.test.tsx` 等（维度 16 基础厚；维度 11 有 tree-async-lifecycle 直接覆盖）。
- **e2e**：`tests/e2e/w3d-editor.spec.ts`（TipTap WYSIWYG 编辑面）、`tests/e2e/tree-display-ux.spec.ts` 存在；本族无 `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts`（需新增）。
- **历史基础**：E3 输入上传增强计划已落地（upload 请求下沉与失败路径）；08-02 nested-schema 机制已把本族 action 型属性分类（维度 6 复验而非首查）；`2026-07-13` 图标系统与 `2026-07-21-0800-3` 上传增强为相邻族先例。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 8 项中本族无归属项——C0 原 9 项中 input-suggest 已由 C2.2 修复出列；ai-chat timestamp/ai-rich-text-sender ×5 属 ai 包 Tiptap（C8.1），非本族 editor；w3d-editor flake 已裁定机器状态相关；余项属 scheduling/content，successor C8.1/C9/CV）。

## Goals

- 5 张审计卡（`docs/audits/per-component/{editor,input-file,input-image,tree-select,input-tree}.md`）18 维逐项核对（editor/tree-select/input-tree 追加 deep-audit 21-23 维），P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项 + 上传失败/懒加载失败路径）：候选——form 内 editor 编辑提交（值形状）、input-file/input-image 上传成功与失败路径（env IO 边界）、tree-select/input-tree 远程 childrenSource 懒加载 + 失败重试。
- roadmap C3.5 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C3.4/C4.x 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 5 组件 × 18 维审计卡（维度重点：1 Schema 契约（fields 与 editor-schemas/upload-schemas/types 一致）、2 RendererComponentProps 合规、3 值所有权三态（editor HTML 值受控 echo、tree 多选值、upload 值形状）、4 表单参与（name/required/校验挂接、提交数据形状、data-field-_）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、树节点/上传区 marker 契约）、6 嵌套 schema 分类（**08-02 机制落地后复验**：searchSource/childrenSource/uploadAction/deleteAction 已分类 actionValue，无 deepFields 残留）、7 事件与 action 契约（onChange payload 形状、normalizeActionEvent 语义、upload 完成回调）、8 a11y（树完整键鼠导航/焦点管理/aria、editor 可编辑区语义）、9 i18n（上传/树空态/搜索 placeholder 文案 key）、10 四态覆盖（空/加载/错误/禁用/readOnly——树与上传链）、11 异步生命周期（**upload 请求下沉与失败路径、树 childrenSource 懒加载 abort/竞态/失败/重试、env IO 边界 INV-1**）、12 组合宿主场景（form 内编辑提交、CRUD 行内/弹层内使用）、13 样式契约（widget 自样式）、14 React 19、15 性能边界（树虚拟化、大节点集渲染、key 稳定性）、16 测试质量（断言正确行为而非 not-throw、DOM 契约断言、错误路径、**input-image 专属测试缺口审计**）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、**editor sanitize/URL 协议/附件 XSS 红线**、远程加载走 env IO 边界 INV-1））；editor/tree-select/input-tree 追加 deep-audit 21（显示与定位正确性——编辑区/弹层/树展开态）、22（集成接线与可操作性——form/弹层/CRUD 集成、上传接线）、23（测试有效性与假绿——既有 tree-_ 与 editor 测试是否真断言行为）。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（form 内 editor 编辑提交（bug 73 模式）、input-file 上传成功/失败路径、tree-select/input-tree 远程懒加载 + 失败重试）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C3.4/C4.x 及以后族组件；CRUD 本体（C4.2）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号        | 触发                                              | 行为（含错误码）                                   | 可重试 | 用户可见表现            |
| ------------------- | ------------------------------------------------- | -------------------------------------------------- | ------ | ----------------------- |
| host-mr-editor      | form 内 editor 编辑并提交（真机）                 | HTML 值进入 store、提交数据形状正确（bug 73 模式） | 是     | 提交结果正确回显        |
| host-mr-upload-ok   | input-file/input-image 上传成功                   | 文件经 env IO 上传、值回写、预览可渲染             | 是     | 上传态 + 值正确         |
| host-mr-upload-fail | 上传失败（env 拒绝）                              | 失败态展示、可重试、不崩溃                         | 是     | 错误提示 + 重试入口可见 |
| host-mr-tree-lazy   | tree-select/input-tree 远程 childrenSource 懒加载 | 子节点加载正确、失败态可重试、不崩溃               | 是     | 树展开正确              |
| host-mr-sanitize    | editor 注入恶意 HTML（若 sanitize 路径存在）      | 净化为安全内容、不执行脚本（XSS 红线）             | 否     | 仅安全内容渲染          |

## Test Strategy

本档选择：**必须自动化** —— 媒体与富文本族涉及上传请求（对外 IO 契约 + 失败路径）、树远程懒加载（异步生命周期）、editor 富文本（值形状契约 + sanitize 安全红线），均为核心回归路径；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck/build/lint/test` + 相关 e2e 回归（`w3d-editor.spec.ts`/`tree-display-ux.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/{editor-renderer,input-file-renderer,input-image-renderer,tree-controls,upload-field,upload-schemas,editor-schemas}.tsx`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：5 组件注册项（type/fields/componentCapabilityContracts）与 schema types 一致（维度 1/18）；08-02 nested-schema 机制落地状态 live 核对（searchSource/childrenSource/uploadAction/deleteAction actionValue 声明）。
- [x] 产出 5 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）；**editor/tree-select/input-tree 追加 deep-audit 21-23 维**（复杂交互渲染器必选）。
- [x] 维度重点核查：异步生命周期（维度 11：upload 请求下沉与失败路径、树 childrenSource 懒加载 abort/竞态/失败/重试、env IO 边界 INV-1）；安全红线（维度 18：editor sanitize/URL 协议/附件）；a11y（维度 8：树完整键鼠导航、editor 可编辑区）。
- [x] 嵌套 schema 分类专项（维度 6）：08-02 机制落地后复验——无 deepFields 残留、action 分类正确（tree-controls.tsx:487-504、upload-schemas.ts 断言）。
- [x] 测试质量专项（维度 16）：input-image 专属测试缺口审计；既有 tree-\*/editor 测试断言正确行为而非 not-throw（维度 23 联动）。
- [x] 文档对照（维度 17）：5 个 design.md ↔ 实现 props/行为逐项核对；quick-reference.md 词条准确性。

Exit Criteria:

> 本 Phase 交付 5 张审计卡（含裁决 + 21-23 维），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{editor,input-file,input-image,tree-select,input-tree}.md` 5 卡存在，18 维表完整 + editor/tree-select/input-tree 21-23 维记录、`文件:行` 证据可验证。
- [x] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 则标记 `closed`，否则 `open`；08-02 机制复验结论已记录。

Phase 1 执行摘要（2026-08-03）：

- 5 卡产出，发现汇总：**P0 ×0、P1 ×4 类（P1-1 editor link 按钮零行为、P1-2 editor URL 协议校验缺失（随 P1-1 落地必须同步的安全红线）、P1-1 树 fields 注册缺口（input-tree ×8 + tree-select ×10 消费键未注册）、P1-2 pathSeparator 零行为（设计 TR7 主张已实现，代码硬编码 '/'，既有测试伪覆盖））、P2 ×7（editor i18n 硬编码 ×11 按钮 + 3 文案、upload Remove aria-label、input-image alt 兜底、tree-select placeholder fallback、popover 高度、input-image 专属测试缺口、editor 组件测试缺口、coverage-manifest 缺 3 组件登记）、P3 ×12**。
- 08-02 机制复验：pass（searchSource/childrenSource/uploadAction/deleteAction 均 actionValue 声明，无 deepFields 残留——live grep 零命中）。
- 工具脚本：`check:audit-missing-renderer-markers`/`styling-suspects`/`runtime-raw-schema-reads`/`fieldframe-bypasses`/`hardcoded-type-dispatch` 本族 0 命中；`async-failure-paths` 命中 upload-field/editor-renderer 均为已处理 catch/finally（合规）；`performance-suspects`/`react19-optimization-candidates` 命中为 H8/H14/H15 既有守卫（C3.x 同裁定）。
- 共性裁决：pathSeparator 零行为根因单点（共享 tree-options.ts 单文件，非跨包机制）→ 卡内共享修复，不插 CX-n；editor link/URL 安全为组件内修复；树 fields 注册缺口根因单点（tree-controls.tsx 定义文件）→ 不插 CX-n。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：公共层/跨包发现（upload-field/upload-schemas 上传链、tree-controls 树机制）影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 绿（含新增回归测试）。

Phase 2 执行摘要（2026-08-03，form-advanced 991 → 1013 tests）：

- **[P1-1 editor link 按钮零行为]**：新增 `@tiptap/extension-link@^3.27.1`（deps）+ `@tiptap/core`（devDeps 供 headless 测试）+ `buildEditorExtensions()`（StarterKit + Link.configure protocols 白名单 + validate）+ `isSafeLinkUrl` 纯函数 + link 按钮 run 重写（prompt null→unset / 安全→setLink(trim) / 不安全→忽略）。test-first：editor-link.test.tsx 9 用例（7 先红：setLink 命令缺失 + 纯函数不存在；headless Editor 直接覆盖被破坏的扩展接线面）。
- **[P1-2 editor URL 协议校验（安全红线）]**：Link.configure protocols ['http','https','mailto','tel'] + validate=isSafeLinkUrl（防粘贴 javascript:）+ **输出防线**：onUpdate html 分支提交前二次 `sanitizeEditorHtml(getHTML())`（design §W3d「输出只含安全子集」主张兑现）——javascript:/data:/vbscript: 从 UI/paste/输出三路全堵。
- **[P2-1 editor i18n ×14 key]**：flux-i18n 新增 `editor.*` 双 locale（toolbarLabel/richTextEditor/bold/italic/strike/heading1/heading2/bulletList/orderedList/code/blockquote/link/undo/redo/linkPrompt）；TOOLBAR_BUTTONS titleKey → `toolbarButtonTitle(id)` switch 静态 key（check:i18n-keys 静态解析）；editor aria-label fallback → t()。
- **[P1-1 树 fields 注册缺口 ×8+10]**：tree-controls.tsx 定义补注册 input-tree `treeMode/childrenKey/labelField/valueField/cascade/searchable/onlyLeaf/showPathLabel` + tree-select 追加 `clearable/placeholder`；flux-guide/flux-types/schema.d.ts 重新生成（两类型补齐 8/10 键）；test-first：c3-5-schema-contract-honesty.test.ts 4 用例（schema 声明 ↔ 定义注册三方冻结 + actionValue 契约 + 无 deepFields）先红（phantom 8/10 键）后绿。
- **[P1-2 pathSeparator 零行为]**：`getTreeOptionConfig` 增 pathSeparator（默认 '/'）+ `buildTreeOptionMeta` valuePath 消费 + 两 renderer 传参；既有「uses pathSeparator」测试为伪覆盖（单根节点无分隔符，dim 23 案例）——补嵌套节点真断言（'root > child'）。test-first：tree-enable-node-path.test.tsx 新用例先红（'root/child' vs 期望）后绿。
- **[P2-2 tree-select placeholder fallback]**：'Select tree option' 硬编码 → `flux.form.treeSelectPlaceholder` 双 locale。
- **[P2-2 桌面 popover 高度]**：PopoverContent 包 `max-h-[60vh] overflow-y-auto`（data-slot="tree-select-popover-options"；C3.3 picker 先例；mobile Sheet 已有 max-h-[65vh]）。
- **[P3-1 input-tree data-testid/data-cid 透传]**：与 tree-select 对齐。
- **[P2-1 input-file Remove aria-label]**：`Remove ${name}` 硬编码 → `flux.form.removeItem` 双 locale（t 参数插值）。
- **[P2-1/P2-2 input-image]**：alt 兜底硬编码 'uploaded image' → `flux.form.uploadedImage` + alt 回退链 name→url→i18n；新增 input-image-preview.test.tsx 6 用例（既有值回显/multiple 数组/fill 尺寸/thumbnail 尺寸/readOnly 冻结移除+trigger disabled/失败无缩略图不污染值）。
- **[P2-2 测试加固]**：tree-structure.test.tsx +2（自定义 childrenKey/labelField/valueField + showPathLabel/onlyLeaf 真实映射断言——同时补齐 check:schema-prop-coverage 新注册 8 键覆盖，180 declared/100%）。
- **[P2-2 coverage-manifest]**：editor/input-file/input-image 补登记（此前缺失，C3.4 icon-picker 同型）；input-tree/tree-select primaryScenario 同步为 bug 73 宿主场景。
- **[共性裁决]**：pathSeparator 零行为根因单点（共享 tree-options.ts 单文件）→ 卡内共享修复（两组件同时生效），不插 CX-n；editor link/URL 为组件内修复；fields 注册缺口根因单点（tree-controls.tsx 定义文件）→ 不插 CX-n；onlyLeaf 非 cascade 模式父节点可选语义未文档化 → 卡内 P2 backlog 归 CR。
- **bug 76 记录**：`docs/bugs/76-editor-link-toolbar-zero-behavior-unregistered-command-fix.md`（复杂跨面 bug：契约主张漂移 + 安全红线双根因）。
- 验证门禁：`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && build && lint && test` 全绿（**1013 tests**）；`check:i18n-keys` 绿（729 used/全定义，unused 警告 126 项为 pre-existing）；`check:schema-prop-coverage` 绿（180 declared/100%）；flux-i18n 26 tests 绿；flux-guide schema.d.ts 重新生成。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本族真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——form 内 editor 编辑+提交（bug 73 模式：HTML 值 → store → 提交值正确）、input-file/input-image 上传成功与失败路径（env IO 边界）、tree-select/input-tree 远程 childrenSource 懒加载 + 失败重试。
- [x] bug 73 模式专项检查：在宿主场景中显式验证单测绿但真机失败类风险（editor 真机提交、上传真机值回写）。
- [x] 上传/懒加载失败路径专项：失败态展示、可重试、不崩溃。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（`tests/e2e/w3d-editor.spec.ts`、`tests/e2e/tree-display-ux.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；w3d-editor/tree-display-ux 回归绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

Phase 3 执行摘要（2026-08-03，新增 `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts` 7/7 全绿 + lab 页 5 组件 ×+1 宿主场景）：

- **host-mr-editor（bug 73 模式）pass**：form 内 editor 追加输入 → Submit → echo 含 `MR-EDITOR:` + 追加文本 + `<strong>rich</strong>`——HTML 值真机进入 store 且提交形状正确。
- **host-mr-sanitize（XSS 红线）pass**：存储值含 `<script>alert(1)</script>` + `javascript:` 链接 → ProseMirror DOM 零 script/alert(1) → 键入触发提交 → echo 无 `<script`/`javascript:`/`alert(1)`——输入 sanitize + 输出 sanitize 双防线真机成立。
- **host-mr-editor-link（P1-1/P1-2 真机证明）pass**：link 按钮 → dialog 接受 `https://example.com/doc` → 提交值含该 href；dialog 接受 `javascript:alert(1)` → 拒绝不落值；dialog dismiss → unsetLink → 提交值无 `<a>`。
- **host-mr-upload-ok/fail（bug 73 模式）pass**：input-file 经 env fetcher 上传成功（值回写 `"ok":"https://cdn.example.com/contract.pdf"`）+ 失败端点（`data-item-status="error"` 展示、值不污染 `bad.txt` 零残留、无崩溃）→ Submit echo 正确。
- **host-mr-image-ok/fail（bug 73 模式）pass**：input-image 上传成功缩略图渲染（src 断言）+ 失败 error item + 值不污染。
- **host-mr-tree-lazy（bug 73 模式 + 异步生命周期）pass**：input-tree 展开 deferChildren 节点 → childrenSource 子节点加载渲染；失败节点 inline error + retry 重试成功；提交 `"node":"a-a"`/`"nodeFail":"c-r"`。tree-select 同场景双组件（popover portal 内操作）同样 2/2。
- **bug 73 模式专项检查结论：pass（带证据）**——宿主场景实证并修复 1 个"单测绿但真机失败"类缺陷：**P1-3 树懒加载 StrictMode 假死**（`useTreeLazyChildren` mountedRef 双挂载后无复位 → 所有懒加载 resolve 被丢弃：fetcher 已调用、dispatch ok:true、子节点永不渲染；单测无 StrictMode 全绿假绿）——test-first：StrictMode 回归用例先红（无修复 1 failed）后绿 + 卡内标 fixed + bug 77 记录。
- 回归：w3d-editor **3/3**、w3d-upload-family **2/2**、tree-display-ux **6/6**；component-lab 全量 **211 passed / 1 skipped（pre-existing simple-form skip）**。
- lab 页新场景：editor-lab-page +3（编辑提交/sanitize/link 真机）、input-file-lab-page +1（成功+失败提交）、input-image-lab-page +1（成功+失败提交）、input-tree-lab-page +1（懒加载+失败重试）、tree-select-lab-page +1（同）；coverage-manifest 5 组件条目 primaryScenario 同步为 bug 73 模式场景 + editor/input-file/input-image 补登记。

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-03.md`、`docs/backlog/component-audit-roadmap.md`（C3.5 行）

- Item Types: `Proof`

- [x] 全卡复查：18 维 + 21-23 维表结论与最终代码一致；P0/P1 清零；5 卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本族范围回归：`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器/env IO），追加受影响包验证并记录。
- [x] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（如有）与决策。
- [x] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [x] roadmap C3.5 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 5 张审计卡 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

Phase 4 执行摘要（2026-08-03）：

- 5 卡全部 `closed`（P0/P1 清零；P1 ×5 类 + P2 ×7 fixed；P2 backlog（onlyLeaf 非 cascade 语义）+ P3 ×12 卡内记录归 CR）；18 维 + 21-23 维表结论与最终代码一致（fields 注册/pathSeparator/Link 扩展/输出 sanitize/mountedRef 复位均可核验）。
- 全量验证（closure gates 前置证据）：`pnpm typecheck` 30/31（flux-bundle 1 失败 = 并行 session 并发 WIP artifact，非本 plan 改动路径，见 daily log 并发基线说明）；`pnpm build` 31/31；`pnpm lint` 31/31（1 pre-existing warning）；`pnpm test` 30/31 包绿 + playground 139/141（2 失败 = 并行 session `hidden` renderer 提交（a3841ff8）的 route-matrix 缺口，归属 owner session，本 plan 不触碰）；**本 plan 全部改动路径单独验证全绿**（form-advanced 1014 tests、flux-i18n 26、playground 复杂页 Tree+CRUD 随 data-testid 回退修复）；e2e：c3-5-host-surfaces 7/7 + w3d-editor 3/3 + w3d-upload-family 2/2 + tree-display-ux 6/6 + component-lab 211/1skip。
- 文档：5 卡 closure 汇总；bug 76/bug 77 记录；flux-guide schema.d.ts 重新生成；daily log C3.5 节收口记录（含 closure-audit 证据位置与并发基线说明）。
- 未插入 CX-n（pathSeparator/StrictMode 根因均单点共享文件，卡内共享修复留痕）；roadmap C3.5 行 `todo` 保留（closure audit 通过后由审计 session 标 `done`，roadmap 规则「不得提前」，C2.x/C3.1-C3.4 先例一致）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_0394a630cffe3MHfOHFnjw5CVi`）
- Verdict: `pass`（零 Blocker/Major；Minor ×2）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（editor-renderer.tsx `:307/:389`、input-file-renderer.tsx `:15`、input-image-renderer.tsx `:41`、tree-controls.tsx `:137/:482`/`:311/:528` 与 actionValue `:487-504`、uploadAction/deleteAction 08-02 分类、5 design.md/lab 页、14 测试文件、2 e2e spec、E3 计划 completed、roadmap C3.5 `todo` 仅依赖 C0、无既有审计卡）；Minor 已处理：基线补 9→8 项口径（input-suggest 出列）与 w3d-editor flake 裁定说明；tree-\* 测试名缩写枚举 nit 保留（已逐一核实存在）。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 5 张审计卡存在、18 维表完整（复杂交互追加 21-23）、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查 + 上传/懒加载失败路径）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 2026-08-03 独立复核 pass，证据见本 plan `## Closure` Closure Audit Evidence 与 daily log C3.5 closure-audit 节）
- [x] `pnpm typecheck`（30/31 包绿；flux-bundle 1 失败 = 并行 session 并发 WIP artifact，非本 plan 改动路径——见 daily log「C3.5 并发基线说明」）
- [x] `pnpm build`（31/31）
- [x] `pnpm lint`（31/31，1 pre-existing warning）
- [x] `pnpm test`（30/31 包绿 + playground 139/141；2 失败 = 并行 session `hidden` renderer 提交（a3841ff8）route-matrix 缺口，归 owner session——见 daily log「C3.5 并发基线说明」；本 plan 改动路径全部单独验证绿）

## Deferred But Adjudicated

### 审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本族 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本族 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 独立子 agent closure-audit pass（approved）——live repo 复核：5 卡 closed 且 18/21-23 维结论与最终代码一致（buildEditorExtensions/isSafeLinkUrl/输出 sanitize/toolbarButtonTitle、pathSeparator 消费、tree fields 注册 ×18、mountedRef 复位、removeItem/uploadedImage/treeSelectPlaceholder/editor.\* i18n 均 diff/测试可核验）；新测试 editor-link 9 + c3-5-schema-contract-honesty 4 + input-image-preview 6 + tree-lazy-children StrictMode + tree-structure +2 + tree-enable-node-path 断言正确行为；实测复核 `c3-5-host-surfaces.spec.ts` 7/7 + w3d-editor 3/3 + w3d-upload-family 2/2 + tree-display-ux 6/6（首跑 2 项为页面加载超时 flake，重跑绿，快照含目标 heading）绿；`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck + test` 绿（1014）+ flux-i18n 26 + `plan-check.mjs --strict` pass。审计中未见残留 owner-doc 漂移；deferred 分类诚实（无静默降级 live defect）；五处一致性核对通过（Plan Status/Phase Status/Exit Criteria/Closure Gates/Closure evidence）。roadmap C3.5 行标 `done`。

Closure Audit Evidence:

- Auditor / Agent: mission-driver CLOSURE_VERIFY 独立子 agent fresh session（closure-audit，不复用执行上下文）
- Evidence: 独立审计 session 复核（2026-08-03）：5 卡 closed 且 18/21-23 维结论与最终代码一致——editor-renderer.tsx（buildEditorExtensions:233/Link protocols+validate/isSafeLinkUrl:216/输出 sanitize:311/toolbarButtonTitle:156）、tree-options.ts（pathSeparator:32,55,77 被两 renderer 消费 tree-controls.tsx:65,239）、tree-controls.tsx（input-tree fields 注册 :508-520 / tree-select :562-576 含 pathSeparator 等 ×18 键）、tree-control-controllers.ts（mountedRef 复位:201 + treeSelectPlaceholder:718）、upload-field.tsx（removeItem aria-label:506）、input-image-renderer.tsx（uploadedImage alt 兜底:18）、flux-i18n 双 locale（removeItem/uploadedImage/treeSelectPlaceholder/editor.\*）；新测试断言正确行为（editor-link.test.tsx 9 + c3-5-schema-contract-honesty.test.ts 4 + input-image-preview.test.tsx 6 + tree-lazy-children.test.tsx StrictMode :371 + tree-structure +2 :477/:521 + tree-enable-node-path :195 嵌套分隔符真断言）；实测复核 `c3-5-host-surfaces.spec.ts` 7/7、w3d-editor 3/3、w3d-upload-family 2/2、tree-display-ux 6/6（重跑全绿；首跑 2 失败为页面加载超时 flake，error-context 快照含目标 heading，非行为回归）；`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck + test` 绿（**1014 tests**）+ flux-i18n 26 tests 绿 + `plan-check.mjs --strict` pass；flux-guide/flux-types/schema.d.ts 重新生成核验（tree 两类型 treeMode/pathSeparator/childrenKey 等键落位）；bug 76/bug 77 记录；deferred 分类诚实（P2 backlog=optimization candidate、机制未落地/watcher=watch-only residual、e2e pre-existing 归 C8.1/C9/CV，均非 in-scope live defect）；五处一致性核对通过（Plan Status/Phase Status/Exit Criteria/Closure Gates/Closure evidence）；daily log 2026/08-03 C3.5 closure-audit 节收口记录同步。

Follow-up:

- 无 plan-owned 剩余工作（roadmap C3.5 行已由审计 session 标 `done`；P2 backlog（onlyLeaf 非 cascade 语义裁决）+ P3 ×12 已登记卡内归 CR；e2e pre-existing 归 C8.1/C9/CV；并发基线 artifact（flux-bundle WIP 测试、hidden renderer route-matrix）归各自 owner session）。

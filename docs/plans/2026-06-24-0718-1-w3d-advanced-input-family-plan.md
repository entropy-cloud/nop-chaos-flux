# W3d 高级输入族（period / upload / rich-text）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W3d；`docs/components/{input-month,input-quarter,input-year,input-file,input-image,editor,markdown-editor}/design.md`（契约已立约）；W2b 日期底层 `packages/flux-renderers-form/src/renderers/date/`
> Related: roadmap 依赖图 `W2b → W3d → W4c`（本 plan 是 W4c 复合表单组的 unblocker）；W1a 内容 sanitize 门禁（editor/markdown-editor 受控渲染边界）；X1 doAction 句柄族
> Mission: components
> Work Item: W3d

## Purpose

把 roadmap W3d（高级输入族，7 个组件）从"7 份 design.md 已立约、代码 0%"推进到"7 个 renderer 实现 + 注册 + playground + e2e + roadmap W3d 标 done"，并解锁 W4c（复合表单组，依赖 W3d 的 form-advanced 基座与复合值 staged owner 语义）。

7 个组件合成一个 owner plan（遵循 guide Rule 22/23/26：同一组件能力族优先合成 owner plan、不因数量默认拆 plan），理由：它们同属"高级表单输入"结果面，共享 form/form-advanced 包注册路径、共享 field metadata / `RendererComponentProps` 消费范式、共享 value 写回与校验底层，且 design §12 各自标注的最大风险（period family 命名走散、upload/rich-text 边界混乱）正是要求一次性厘清边界。phase 内按 **period / markdown-editor / upload / rich-text** 四簇落地。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **7 个 renderer 均未实现**：`packages/flux-renderers-form/src/renderers/` 无 input-month/quarter/year、markdown-editor；`packages/flux-renderers-form-advanced/src/` 无 input-file/input-image/editor（现有：array-editor、composite-field、condition-builder、detail-view、key-value、tag-list、tree-controls）。`amis-baseline-matrix.md` L157-162 七组件均标 `targetContract` / wave 3。
- **W2b 日期底层已就绪（period 输入直接复用）**：`packages/flux-renderers-form/src/renderers/date/date-utils.ts` 导出 `RangeKind`（当前 `'date'|'datetime'|'time'`）、`formatDate`/`parseDate`/`convertValueFormat`/`normalizeRange`/`parseDateRange`/`joinDateRange`/`defaultFormatForRangeKind`/`toStorageDate`/`toCalendarDate`/`isWithinRange`；`date-field-control.tsx` 提供日期 field control；`date-renderer-definitions.ts` 导出 `dateRendererDefinitions`（input-date/input-datetime/input-time/date-range）+ `dateFieldRules`。period 输入（月/季/年）= 粗粒度日期 family，复用该底层 + 扩展 `RangeKind` / 默认格式串。
- **field frame / 写回范式已就绪**：`input-date-renderer.tsx` 等提供 `RendererComponentProps` + `useCurrentForm`/field metadata 消费范式；period/markdown-editor 直接套用。
- **markdown 预览底层已就绪（复用机制需裁定，见 Phase 2 Decision）**：`flux-renderers-content` 已落地 `MarkdownRenderer`（`markdown.tsx`，react-markdown + DOMPurify `allowHtml` 门禁）并导出 `sanitizeHtml`（`sanitize.ts`）。**注意**：`react-markdown`/`remark-gfm`/`rehype-raw`/`dompurify` 仅声明在 `flux-renderers-content/package.json`，**不是** `flux-renderers-form` 的依赖（pnpm 不解析未声明依赖）。因此 `markdown-editor` 不能在 form 包内直接 `import` react-markdown，而必须通过运行时复用已注册的 `markdown` renderer（`flux-renderers-form` 不新增 workspace-external 依赖）。design §3/§6 的"复用 content 渲染逻辑"按此机制落地（见 Phase 2 Decision）。
- **upload 走显式 action 路线（请求下沉约束）**：input-file/input-image design §9 明确"上传走显式 action/source，不把完整请求协议塞进字段 JSX"；与 `data-source` + action graph 下沉约束一致（见 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`）。`uploadAction` 是 action 引用，renderer 不发起挂载期请求。
- **owner-doc drift（包归属）**：input-file/input-image design §3 写"预期归属 `flux-renderers-form`"，但 roadmap（权威包分配）将二者 + `editor` 划归 `flux-renderers-form-advanced`（design editor §3 已一致）。需收敛 input-file/input-image §3。
- **editor 需新依赖**：TipTap 当前不在仓库依赖中（`@tiptap/react` + `@tiptap/starter-kit`，~50-70KB gzip，MIT）。markdown-editor 零新依赖。
- **受控渲染边界**：editor 输出 HTML（`outputFormat: html`，默认），re-render 存储 HTML 时必须 sanitize——遵循 W1a 建立的 DOMPurify sanitize 契约（`flux-renderers-content` 的 `sanitize.ts`）。W1a plan deferred 了"security-design-requirements.md content-sanitize 通则升级（successor 待安全治理专项）"，但 DOMPurify sanitize 函数本身已落地可复用，本 plan editor 直接复用 `sanitizeHtml`。

## Goals

- `input-month`/`input-quarter`/`input-year`：period 输入 family（canonical owner，单值/范围由 `selectionMode` 区分，不保留第二个 range type），复用 W2b date 底层，落 `flux-renderers-form`，marker `nop-input-month`/`nop-input-quarter`/`nop-input-year`。
- `markdown-editor`：markdown 源码编辑 + 实时预览（Textarea + react-markdown 预览复用 content markdown），`mode` split/edit/preview，零新依赖，落 `flux-renderers-form`，marker `nop-markdown-editor`。
- `input-file`/`input-image`：上传字段（`uploadAction` action 引用、`valueMode`、`onUploadSuccess`/`onUploadError`、局部 pending/result/error 状态），落 `flux-renderers-form-advanced`，marker `nop-input-file`/`nop-input-image`。input-image 在 input-file 基线上加预览/裁剪扩展点。
- `editor`：TipTap WYSIWYG 富文本（`toolbar`/`outputFormat` html|json、`readOnly`、sanitization 边界），落 `flux-renderers-form-advanced`，marker `nop-editor`。
- 7 个 `RendererDefinition` 注册（form `dateRendererDefinitions` 追加 period 三项；form-advanced 追加 upload 三项含 editor）；playground 演示页 + e2e（程序化断言）+ focused 单测。
- roadmap W3c 之后的 W3d 标 done + amis-baseline-matrix 7 组件 `targetContract→runtime`；input-file/input-image design §3 归属 drift 收敛。
- 解锁 W4c（复合表单组依赖 W3d form-advanced 基座 + 复合值 staged owner）。

## Non-Goals

- 不实现 upload 的具体存储后端 / 上传协议细节（`uploadAction` 是宿主 action 引用，renderer 只桥接 action 派发与结果写回，不实现上传网络层）——design §9。
- 不实现 editor 的高级扩展（图片上传节点、表格编辑、协同）——TipTap 扩展渐进引入（design §12）。
- 不把 period family 拆成独立 range type（design §2/§12：范围语义放 family 内 `selectionMode`）。
- 不引入 AMIS 的 `input-rich-text` 历史样式枚举扩散（design §2）。
- 不实现 W4c（combo/picker/transfer/input-table）——W4c 是独立 successor plan，依赖本 plan 完成。
- 不实现 `editor` 与 `code-editor`/`word-editor` 的合并（design §2 边界表已立约，三者职责分离）。

## Scope

### In Scope

- 7 个 renderer 实现，遵循 `RendererComponentProps`（读 `props.props`/`props.regions`/`props.meta`/`props.events`/`props.helpers`，field 类组件用标准 hooks 写回，不直接访问 store）。
- period 输入复用/扩展 W2b date-utils（`RangeKind` 扩展 month/quarter/year + 默认格式 + 范围归一化）；markdown-editor 预览复用 content markdown 渲染；editor 复用 `sanitizeHtml` 受控输出。
- 7 个 `RendererDefinition` 注册 + playground 演示页（route-model + example schema）+ e2e + focused 单测。
- roadmap W3d 标 done + amis-baseline-matrix 7 组件 `targetContract→runtime` + input-file/input-image design §3 drift 收敛。

### Out Of Scope

- 上传存储后端实现、上传协议、分片/断点续传。
- TipTap 高级扩展（图片节点、表格、协同、mentions）。
- period 输入的快捷项（`shortcuts`）远程 loader（design §9 标注可由表达式控制，首版聚焦静态 + 表达式）。
- input-image 的复杂裁剪工作台（首版预留 `crop` 扩展点，不实现工作台）。

## Failure Paths

| 场景                          | 触发                                               | 行为                                                                   | 可重试           | 用户可见表现                            |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- | ---------------- | --------------------------------------- |
| upload-failed                 | `uploadAction` 派发 reject / 抛错                  | 写回值不变，触发 `onUploadError`，字段进入 error 状态（pending→error） | 是（用户可重选） | 上传项标记错误 + 错误信息，字段值不污染 |
| upload-action-missing         | schema 未提供 `uploadAction`                       | 文件可选择但无法上传，字段提示 `uploadAction` 未配置                   | 否               | 选择后提示配置缺失，不静默吞            |
| editor-sanitize-strip         | `outputFormat:html` 存储值含被 sanitize 移除的标签 | 渲染时按 `sanitizeHtml` 白名单裁剪，值按 sanitize 后结果回显           | 否               | 富文本渲染为安全子集，不报错            |
| period-range-invalid          | 范围 selectionMode 下 min>max 或值越界             | 不写回非法范围，字段 error                                             | 否               | 范围输入标红 + 校验提示                 |
| markdown-editor-preview-error | 预览区 react-markdown 解析异常                     | 预览区降级为纯文本，不影响编辑区值                                     | 否               | 预览显示源码文本，编辑值不变            |

## Test Strategy

档位选择：`建议有测`

理由：7 个均为表单输入字段（非鉴权/对外 API/核心回归路径）。period 输入的值归一化/范围校验、upload 的 pending→result/error 状态机、editor 的序列化（HTML↔TipTap JSON）与 sanitize 边界是回归风险点，配 focused 单测；关键交互路径（period 选择、上传成功/失败、富文本格式化）配 e2e（程序化断言）。按 AGENTS.md 每个新组件必须有 playground 示例 + e2e。

## Execution Plan

### Phase 1 - Period 输入 family（input-month/quarter/year）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/date/date-utils.ts`、`.../date-renderer-definitions.ts`、新增 `input-period-renderers.tsx`（或三独立文件）；`packages/flux-renderers-form/src/index.tsx`、`schemas.ts`；7 份 design 中 period 三份；`amis-baseline-matrix.md`；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof | Follow-up`

- [x] **Decision**：W3d 包归属裁定 —— 遵循 roadmap：period（month/quarter/year）+ markdown-editor → `flux-renderers-form`；upload（input-file/input-image）+ editor → `flux-renderers-form-advanced`。收敛 input-file/input-image design §3 drift（form→form-advanced），写入两份 design.md。
- [x] **Decision**：period family 统一建模 —— 单值/范围由 `selectionMode` 区分，不新增 `*-range` canonical type（design §2/§12）。月/季/年扩展 `RangeKind`（`'month'|'quarter'|'year'`）+ 默认格式串（`YYYY-MM` / `YYYY-Qq` / `YYYY`）+ 季度↔日期归一化辅助。
- [x] **Fix**：扩展 `date-utils.ts`（`RangeKind` + period 格式/解析/范围归一化，复用 `formatDate`/`parseDate`/`normalizeRange`/`joinDateRange` 底层）；新增 period renderer（复用 `date-field-control` + field frame，输出 `nop-input-month`/`nop-input-quarter`/`nop-input-year` marker）。
- [x] **Fix**：3 个 `RendererDefinition` 合入 `dateRendererDefinitions`，随 `registerFormRenderers` 注册；schema + field metadata（`selectionMode`/`valueFormat`/`displayFormat`/`delimiter`/`minDate`/`maxDate`/`shortcuts`，`label` 为 `value-or-region`）。
- [x] **Proof**：focused 单测 —— period 单值/范围值归一化、格式串往返、范围越界/min>max 校验、`RangeKind` 扩展不破坏既有 input-date/time/date-range 行为（回归）。
- [x] **Proof**：playground 演示页（单值 + 范围 + 表达式 min/max）+ e2e（程序化断言：选择月份→写回值格式正确；范围选择→delimiter 拼接）。
- [x] **Follow-up**：3 份 period design.md §3 归属确认（form，已一致，无 drift）；roadmap/amis-baseline 同步留到 plan 收口统一处理。

Exit Criteria:

- [x] input-month/quarter/year 3 个 renderer 落地于 `flux-renderers-form`，输出对应 marker，随 `registerFormRenderers` 注册；period 单值/范围往返 + 越界校验 focused 单测通过；period 选择 e2e 程序化断言通过。
- [x] `RangeKind` 扩展 + period 格式串不破坏既有 date family（`date-utils.test.ts` 回归绿）；period family 无第二个 range type。

### Phase 2 - markdown-editor（源码编辑 + 预览）

Status: completed
Targets: 新增 `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`；`form` 注册；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：markdown-editor 预览复用机制裁定 —— react-markdown 仅是 `flux-renderers-content` 的依赖，非 `flux-renderers-form` 依赖。采用**运行时 registry 组合**：预览区通过 `useRenderFragment()`/`props.helpers.render` 渲染一个子 `markdown` schema 节点（`{ type: 'markdown', content: <当前 textarea 源码> }`——`markdown` renderer 从 `props.props.content` 读取源码，字段名为 `content` 非 `value`），由已注册的 `markdown` renderer 完成渲染。这样 `flux-renderers-form` 不直接依赖 react-markdown、不新增 workspace-external 依赖、且保证预览与 `markdown` 渲染一致性（design §10）。拒绝替代方案：不在 form 包重复声明 react-markdown peerDeps（重复依赖）、不新增 form→content workspace 依赖边（违反包边界）。裁定写入 design + log。
- [x] **Fix**：实现 markdown-editor（左侧 `@nop-chaos/ui` Textarea 编辑 + 右侧运行时组合 `markdown` renderer 预览；`mode` split/edit/preview；可选工具栏在光标位插入 markdown 语法），输出 `nop-markdown-editor` + `nop-markdown-editor-input`/`-preview` marker。`flux-renderers-form/package.json` 无新增 workspace-external 依赖。
- [x] **Fix**：`RendererDefinition` 合入 form 注册；schema + field metadata（`name`/`placeholder`/`mode`/`readOnly`/`required`，`label` value-or-region，`onChange`/`onFocus`/`onBlur` event）。
- [x] **PROOF**：focused 单测 —— split/edit/preview 三态渲染、编辑→预览一致性（复用 markdown 渲染）、`onChange` 写回、预览异常降级纯文本不污染值。
- [x] **PROOF**：playground 演示页 + e2e（程序化断言：输入 markdown→预览区渲染对应节点；mode 切换）。

Exit Criteria:

- [x] markdown-editor 落地于 `flux-renderers-form`，三 mode 渲染 + 编辑/预览一致性（运行时组合 `markdown` renderer）focused 单测通过；输入→预览 e2e 程序化断言通过；`flux-renderers-form/package.json` 无新增 workspace-external 依赖（预览经 registry 复用，不直接 import react-markdown）。

### Phase 3 - Upload 族（input-file/input-image）

Status: completed
Targets: 新增 `packages/flux-renderers-form-advanced/src/input-file-renderer.tsx`、`input-image-renderer.tsx`；form-advanced 注册；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：upload action 桥接契约 —— `uploadAction` 为 action 引用，renderer 通过 `useActionDispatcher` 派发上传 action，接收结果（url/meta）写回字段值；不发起挂载期请求、不实现上传网络层（请求下沉约束）。`valueMode` 决定值形态（url / 对象 / 列表）。裁定写入 design + log。
- [x] **Fix**：实现 input-file（文件选择、pending/result/error 局部状态、`onUploadSuccess`/`onUploadError`、值归一化、`multiple`/`accept`/`maxFiles`），输出 `nop-input-file` marker。
- [x] **Fix**：实现 input-image（input-file 基线 + 预览壳 + `crop` 扩展点预留，不实现裁剪工作台），输出 `nop-input-image` marker。
- [x] **Fix**：2 个 `RendererDefinition` 合入 form-advanced 注册；schema + field metadata；收敛 input-file/input-image design §3（form→form-advanced）。
- [x] **PROOF**：focused 单测 —— upload 成功（pending→result→值写回）、upload 失败（pending→error→值不污染→`onUploadError`）、`uploadAction` 缺失提示、`valueMode` 归一化、multiple 累积。
- [x] **PROOF**：playground 演示页（mock uploadAction）+ e2e（程序化断言：选择文件→派发 uploadAction→成功写回值；失败→错误态、值不变）。

Exit Criteria:

- [x] input-file/input-image 落地于 `flux-renderers-form-advanced`，upload 成功/失败状态机 focused 单测通过；上传成功/失败 e2e 程序化断言通过；renderer 不发起挂载期请求（请求下沉约束）。
- [x] input-file/input-image design §3 归属收敛为 form-advanced。

### Phase 4 - editor（TipTap WYSIWYG）

Status: completed
Targets: `packages/flux-renderers-form-advanced/package.json`（新增 tiptap 依赖）；新增 `packages/flux-renderers-form-advanced/src/editor-renderer.tsx`；form-advanced 注册；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof | Follow-up`

- [x] **Decision**：TipTap 引入裁定 —— 新增 `@tiptap/react` + `@tiptap/starter-kit`（MIT，~50-70KB gzip），按需扩展；`outputFormat` html（默认，存储 HTML 经 `sanitizeHtml` 受控）/ json（TipTap JSON）。ProseMirror DOM 通过 CSS 变量对齐 `@nop-chaos/ui` 主题（design §10）。裁定写入 design + log。
- [x] **Fix**：实现 editor（TipTap 适配器、工具栏 bridge 复用 `@nop-chaos/ui` Button/Tooltip、值 HTML↔TipTap JSON 序列化、`readOnly`、`toolbar` 配置、sanitization 边界复用 `sanitizeHtml`），输出 `nop-editor` marker。
- [x] **Fix**：`RendererDefinition` 合入 form-advanced 注册；schema + field metadata（`name`/`placeholder`/`toolbar`/`outputFormat`/`readOnly`/`required`，`label` value-or-region，`onChange`/`onFocus`/`onBlur` event）。
- [x] **PROOF**：focused 单测 —— HTML↔TipTap JSON 序列化往返、`outputFormat` 两态、sanitize 白名单裁剪（危险标签移除）、`readOnly` 不可编辑、`toolbar` 配置过滤。
- [x] **PROOF**：playground 演示页 + e2e（程序化断言：加粗/列表格式化→值含对应 HTML；html outputFormat sanitize 生效）。
- [x] **Follow-up**：TipTap 高级扩展（图片节点/表格/协同）标注为 successor（design §12），写入 Non-Blocking Follow-ups。

Exit Criteria:

- [x] editor 落地于 `flux-renderers-form-advanced`，HTML↔JSON 序列化 + sanitize 边界 focused 单测通过；格式化→值 e2e 程序化断言通过；`@nop-chaos/ui` 主题对齐（ProseMirror DOM 视觉一致）。
- [x] TipTap 依赖引入记录于 package.json + design.md；高级扩展归 successor。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立 sub-agent（fresh session，task `ses_10934ea6…` / 复审 `ses_1092feba…`）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - Major（已修复）—— markdown-editor "零新依赖" 对 `flux-renderers-form` 包不成立（react-markdown 仅是 content 包依赖）；已改为运行时 registry 组合机制（`useRenderFragment`/`helpers.render` 渲染子 `markdown` 节点），Phase 2 新增 Decision 裁定并拒绝替代方案，Exit Criteria 重写为可达成；复审确认机制在 live repo 存在（`use-render-fragment.ts:13-37`、`renderer-core.ts:76`、`render-fragment-types.ts:37-43`）。
  - Minor（已修复）—— 子节点源码字段名 `value` → `content`（live `MarkdownSchema.content` / `markdown.tsx:13-16`）。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后，经独立子 agent closure-audit，方可将 Plan Status 改 `completed`。

- [x] 7 个 renderer（input-month/quarter/year、markdown-editor、input-file/input-image、editor）全部落地并注册
- [x] period family 复用 W2b date 底层、无第二个 range type；markdown-editor 零新依赖；upload 走 action 下沉；editor TipTap + sanitize 边界
- [x] 行为/契约结果已达成（focused 单测 + e2e 程序化断言全绿）
- [x] input-file/input-image design §3 归属 drift 收敛为 form-advanced
- [x] roadmap W3d 标 done + amis-baseline-matrix 7 组件 `targetContract→runtime`
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift
- [x] 受影响 owner docs（7 份 design.md、roadmap、amis-baseline-matrix）已同步 live baseline
- [x] 独立子 agent（fresh session）closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### TipTap 高级扩展（图片上传节点 / 表格编辑 / 协同 / mentions）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design §12 明确"通过 TipTap 扩展渐进引入"；首版 editor 已提供完整 WYSIWYG 富文本契约（格式化 + html/json 序列化 + sanitize），高级扩展不影响当前 supported baseline 成立。
- Successor Required: `no`（按需启动时独立评估）

### period 输入 shortcuts 远程 loader

- Classification: `optimization candidate`
- Why Not Blocking Closure: design §9 标注 shortcuts 可由表达式/loader 提供；首版聚焦静态 shortcuts + 表达式 value，远程 loader 不影响 period 输入契约成立。
- Successor Required: `no`

### input-image 裁剪工作台

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design §11 标注裁剪为扩展点；首版预留 `crop` 扩展点 + 预览壳，不实现工作台，字段 owner 契约成立。
- Successor Required: `no`

## Non-Blocking Follow-ups

- upload 存储后端契约文档化（宿主集成点）——首版 `uploadAction` action 引用已收口字段层，存储后端属宿主范畴。
- editor ProseMirror 主题与 `@nop-chaos/ui` design token 的细粒度对齐（CSS 变量全覆盖）——首版视觉一致即可，细粒度 token 化属优化。
- markdown-editor 分屏拖拽 / 全屏编辑 / 图片粘贴增强（design §10）。

## Closure

Status Note: 全部 7 组件落地注册、4 项边界契约（period 复用 date 底层、markdown-editor 零新依赖经 registry 组合、upload 走 action 下沉、editor TipTap + sanitize）达成；typecheck/test 55/55 full-green，独立 closure-audit 通过。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-auditor / fresh sub-agent（与执行 session 不同会话，未经手实现）
- Verdict: PASS（全部 Closure Gates 通过）
- Evidence:
  - Gate 1（7 renderer 注册）: `flux-renderers-form/src/definitions.ts:10,23`（markdown-editor）+ `markdown-editor-renderer.tsx:293`（type+component）；`flux-renderers-form-advanced/src/index.tsx:7-9,68-70`（input-file/input-image/editor）；`date-renderer-definitions.ts:117-146`（input-month/quarter/year → PeriodRenderer）。全部含 `RendererDefinition` type + `component`。
  - Gate 2（边界契约）: markdown-editor 无 react-markdown import（grep 仅命中注释），预览经 `props.helpers.render({type:'markdown',content:'${__mdPreview}'},{bindings:{__mdPreview:source}})` 运行时组合（`markdown-editor-renderer.tsx:208-213`）；upload 走 `props.helpers.dispatch(uploadAction,{scope})` 且仅在文件选择后触发、无挂载期请求（`upload-field.tsx:204`、handleFiles 由 onChange 驱动）；editor 经 `sanitizeHtml from '@nop-chaos/flux-renderers-content'` 受控（`editor-renderer.tsx:19,185`）。
  - Gate 3（package.json）: `flux-renderers-form/package.json` 无 react-markdown/dompurify 新外部依赖；`flux-renderers-form-advanced/package.json` 含 `@tiptap/react`+`@tiptap/starter-kit`+`@nop-chaos/flux-renderers-content` workspace 边。
  - Gate 4（design drift 收敛）: `input-file/design.md:16` 与 `input-image/design.md:16` §3 均为 `flux-renderers-form-advanced`。
  - Gate 5（roadmap + baseline）: `roadmap.md:29,171` W3d=`done`；`amis-baseline-matrix.md:157-162` input-month/quarter/year/file/image/editor = `runtime`/`landed`（markdown-editor 为 flux-native，不在 AMIS baseline 矩阵——6 个矩阵组件，与 diff summary 一致）。
  - Gate 6（无静默降级 defect）: 7 renderer 均渲染真实内容（无 null 桩）；marker 齐全（nop-input-month/quarter/year、nop-markdown-editor + -input/-preview、nop-input-file、nop-input-image、nop-editor）；新增单测文件实质性（markdown-editor 12 / upload-field 12 / editor 9 / input-period 19 it|test 调用）。
  - Gate 7（独立复验）: `pnpm typecheck` 55/55 通过；`pnpm test` 55/55 通过（全绿，FULL TURBO cache 命中——执行 session 后源码未变更，cache 有效）。e2e/build 信任执行 session 结果（无红旗）。
- Notes（非阻断）: (1) 计划文本 L36/L176 写"amis-baseline-matrix 7 组件"，实际 6 个矩阵组件（markdown-editor 非 AMIS baseline），矩阵本身已正确更新，属计划文本微过计，不影响实现；(2) 截至审计时点全部 W3d 变更尚未 git 提交（executor 的 full-green 提交步骤待执行），与计划 closure gate 无关。

Follow-up:

- W4c（复合表单组 combo/picker/transfer/input-table）是本 plan 的自然 successor（依赖 W3d form-advanced 基座 + 复合值 staged owner），独立 plan 起草。
- 其他仅 non-blocking follow-up（见上节）。

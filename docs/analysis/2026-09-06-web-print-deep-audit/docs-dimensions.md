# Web Print Mission 文档维度深度审核（维度 16/17/18 + 合规）

> 审核日期：2026-09-06
> 审核对象：web-print mission 文档与契约变更集（不审代码实现质量）
> 审核维度：D16 文档-代码一致性（16a design.md 逐条对码 / 16b roadmap·计划状态真实性 / 16c research 报告）、D17 命名一致性、D18 跨包一致性、许可证与 AGPL 合规复查
> 依据：`docs/skills/deep-audit-prompts.md` 维度 16/17/18 与附录 A、`docs/plans/00-plan-authoring-and-execution-guide.md`、`docs/backlog/00-roadmap-authoring-guide.md`、AGENTS.md（文档路由/许可证红线）
> 执行方式：两轮深挖（第一轮全量逐节对码 + 第二轮只追加新发现），全部发现基于 live 工作树实读（非缓存文档）
> 深挖轮次：D16a=2 轮、D16b=2 轮、D16c=2 轮、D17=2 轮、D18=2 轮、合规=2 轮

---

## 维度 16a：design.md 逐条对码

对码范围：`docs/components/print/design.md` §1–§12 逐节对照 `packages/flux-print-core/src/`（schemas/unit/validate/bind/layout/render-html/print/export-pdf/barcode/index）、`packages/flux-print-renderers/src/`（含 editor/）、`apps/playground/src/pages/print-designer-demo.tsx`、`tests/e2e/print-designer.spec.ts`。

逐节核对结论（无发现的部分）：§1 定位、§2 能力对照表、§4 模板根类型/PrintPageSchema/PrintElementStyle 白名单（13 字段逐一相等）、§4.2 九类型集合、§4.3 table/columns/PrintValueFormat（7 字段逐一相等）、§5 求值时机与 `layoutPrintTemplate(template, data, options) => {pages, diagnostics}` 签名、§6 PrintLayoutPage 形状（6 字段逐一相等）与五条分页算法（游标分发/表格切割/repeatHeader/footerAggregate/防孤行/页顶强保一行/MAX 500/规则 3 膨胀下移/autoGrow 二分）、§7 链路与 CSS（`@page`/page-break-after/print-color-adjust）、§8 快捷键/预览同源、§11 拆分表——均与 live 一致。

### [维度16a-1] §8 声称"Zustand store 持有状态"，实现是 editor-core 可观察对象、全包零 Zustand

- **文件**: `docs/components/print/design.md:179`；`packages/flux-print-renderers/src/editor/use-print-editor.ts:68-93`；`packages/flux-print-renderers/package.json`（dependencies 无 zustand）
- **证据片段**:
  ```md
  - **状态**：Zustand store 持有 `template`（PrintTemplateSchema）+ `selectedIds` + `zoom`；修改走命令函数（对齐 editor-core `EditorDomainAdapter`），diff 进 `UndoCommandStack`
  ```
  ```ts
  // use-print-editor.ts —— createEditorCore 的 plain subscribe/getState 会话，非 Zustand
  const core: EditorCore<PrintDocument, PrintTemplateDiff> = createEditorCore<PrintDocument, PrintTemplateDiff>(
    createPrintDomainAdapter(),
    { policy: 'auto', initialDocument: options.template, ... },
  );
  const listeners = new Set<() => void>();
  let zoom = 1;
  ```
- **严重程度**: P2
- **现状**: design.md §8 声称设计器状态由 Zustand store 持有；live 实现全部状态（template/selection/zoom）由 `createEditorCore` 的闭包会话（subscribe/getState + `useSyncExternalStore`）持有，flux-print-renderers 的 package.json 根本未声明 zustand 依赖，仓库内也无任何 zustand 引用。
- **风险**: 按 §8 理解架构的维护者会去寻找不存在的 Zustand store；后续"补 zoom/selection 进 store"类改动可能引入第二状态源，与 editor-core 单一事实源冲突。
- **建议**: §8 改写为"editor-core 会话（working/committed/selection）+ controller 内 zoom 值，经 useSyncExternalStore 投影"，与 P2 plan 的真实表述对齐。
- **为什么值得现在做**: design.md 是 mission 的设计契约且 Status 为 design baseline，P1–P4 已按不同现实收口，契约文本应随收口回写（P3 收口时已回写 §3/§5/§6/§12，§8 漏改）。
- **误报排除**: 不是"Zustand 泛指状态容器"的修辞——AGENTS.md 与 research §3 均把 Zustand 列为具名技术选型，此处读者会当真。
- **历史模式对应**: 收口回写漏项（P3 closure gates 只列了 §3/§4.3/§5/§6/§12，§8 未入清单）。
- **参考文档**: `docs/architecture/editor-core.md` §2
- **复核状态**: 未复核

### [维度16a-2] §10 "error 级阻断打印"是未实现的契约保证，且无任何归属记录

- **文件**: `docs/components/print/design.md:194`；`packages/flux-print-core/src/print.ts:42-59`；`packages/flux-print-core/src/export-pdf.ts:27-38`
- **证据片段**:
  ```md
  `validatePrintTemplate(template)`（flux-print-core）：结构必填、区域越界（元素超出内容区）、纸张预设合法、table.source 可解析、绑定路径 warning。产出结构化诊断（level: error/warning，code，elementId），设计器标红警示；error 级阻断打印。
  ```
  ```ts
  // printPrintTemplate —— 直接 renderPrintTemplateToHtml，不调用 validatePrintTemplate、不消费诊断
  export function printPrintTemplate(template: PrintTemplateSchema, data: Record<string, unknown>, options: PrintPrintOptions = {}): void {
    if (typeof document === 'undefined') { throw new Error('...print-blocked'); }
    const html = renderPrintTemplateToHtml(template, data, options);
  ```
- **严重程度**: P1
- **现状**: design.md §10 承诺 error 级诊断阻断打印；live 中 `printPrintTemplate`/`exportPrintTemplateToPdf` 均不调用校验、不消费诊断，含 error 诊断的模板可正常打印/导出（demo 页亦如此）。任何 plan 的 Execution/Deferred/Follow-up 均未记录"阻断打印"被裁剪。
- **风险**: 契约向宿主集成方保证了一道不存在的闸门——依赖此语义的上游（如批量打印服务）不会自行做前置校验，坏模板直接进打印通道。
- **建议**: 二选一并落档：①在 print/export 入口消费 `validatePrintTemplate` error 诊断并抛错（小改动）；②把 §10 改为"error 由调用方决定是否阻断"，并在某份 plan 的 Deferred/Adjudicated 记录裁定。
- **为什么值得现在做**: 这是全 mission 唯一一处"文档保证的行为在代码中完全不存在且无归属"的 P1 级契约缺口；修复成本一行到十行。
- **误报排除**: 设计器工具栏的"校验 error 计数标红"（print-designer.tsx `handleValidate`）只是编辑期提示，不构成打印闸门；Failure Path `d-invalid-template` 明写"不阻断编辑"，与 §10 的"阻断打印"是两个不同行为面。
- **历史模式对应**: 计划/设计文本声称 > live 落地（同 P2 audit issues-3 验证诚实性问题）。
- **参考文档**: `docs/components/print/design.md` §10、`docs/plans/2026-09-06-0426-1` Failure Paths
- **复核状态**: 未复核

### [维度16a-3] §10 把"绑定路径 warning"归入 validatePrintTemplate，实现由 bindPrintTemplate 产出

- **文件**: `docs/components/print/design.md:194`；`packages/flux-print-core/src/validate.ts:32-114`；`packages/flux-print-core/src/bind.ts:152-165`
- **证据片段**:
  ```md
  （§10 诊断清单）……纸张预设合法、table.source 可解析、绑定路径 warning。
  ```
  ```ts
  // bind.ts —— 路径缺失 warning 的真实产出方
  diagnostics.push({
    level: 'warning',
    code: 'PRINT_BIND_PATH_MISSING',
    message: `绑定路径不可达：${path}`,
    elementId,
  });
  ```
- **严重程度**: P2
- **现状**: `validatePrintTemplate(template)` 无 data 参数，静态不可判定绑定路径，全文件无任何绑定类诊断；`PRINT_BIND_PATH_MISSING` 由 `bindPrintTemplate` 在求值时产出。P1 plan Failure Paths（b-path-miss）已明确"warning 诊断由 bind 产出"，design.md §10 未随 P1 收口回写。
- **风险**: 宿主只调 validate 不调 bind 时将拿不到路径缺失警示，误以为模板已通过全量检查。
- **建议**: §10 拆分诊断产出方：validate 管"结构/区域/预设/source 形态"，bind 管"路径缺失/语法/求值/source 非数组"。
- **为什么值得现在做**: §10 是诊断契约的唯一 owner 段落；P1 收口时已发现并回写了别处（§4.2 pageNumber 示例），此处属于同类漏网。
- **误报排除**: §5"校验器产出 warning"措辞含糊但 §10 点名了 `validatePrintTemplate`，不按歧义开脱。
- **历史模式对应**: 多阶段收口中 owner-doc 局部漏改。
- **参考文档**: `docs/plans/2026-09-05-2352-1` Failure Paths 表
- **复核状态**: 未复核

### [维度16a-4] §7 "PrintBackend 接口位"在代码中零存在（连占位类型都没有）

- **文件**: `docs/components/print/design.md:170,175`；`packages/flux-print-core/src/`（全包 grep `PrintBackend` 零命中）；`docs/analysis/web-print-research.md:254`；`docs/plans/2026-09-06-0311-1:17,34`
- **证据片段**:
  ```md
  - `PrintBackend` 接口位：`{ print(html|pages): Promise<void> }`，v1 只有 browser 实现；Lodop/客户端静默打印为可选企业增强
  ```
- **严重程度**: P2
- **现状**: design.md §7 两处、research §4.4、P3 plan 两处均声称 `PrintBackend` 接口位"保留"；对 `packages/`、`apps/` 全量 grep，`PrintBackend` 标识符在代码中零出现——print.ts/export-pdf.ts 是两个直接函数，没有接口、没有注释占位、没有类型。
- **风险**: "接口位已留"被四份文档重复背书，后续做静默打印扩展的人会先找这个接口，发现不存在后要么自造不兼容抽象、要么误以为被人删掉了。
- **建议**: 最小修复：在 flux-print-core 声明 `PrintBackend` 占位类型（一行 interface + 注释指向 §7）；或文档统一降格为"未来扩展位（未落接口）"。
- **为什么值得现在做**: 一行代码或一句文档即可消除四份文档与代码的系统性矛盾。
- **误报排除**: `mountPrintFrame`/`printFrame` 的分层不构成 PrintBackend——它们是浏览器实现内部细节，无可替换后端契约形状。
- **历史模式对应**: "接口位/扩展点"类文档承诺缺少最小代码锚（P3 的 measure 注入有 `LayoutMeasure` 类型锚，PrintBackend 没有）。
- **参考文档**: `docs/components/print/design.md` §7、§12
- **复核状态**: 未复核

### [维度16a-5] §4.2 text 行专有字段缺 `autoGrow`（§6 分页、属性面板、schema 三处都承载它）

- **文件**: `docs/components/print/design.md:90`（§4.2 表 text 行）；`packages/flux-print-core/src/schemas.ts:104`；`packages/flux-print-renderers/src/print-inspector.tsx:215`
- **证据片段**:
  ```md
  | `text` | `text: string`（SchemaTpl，支持 `${var}` 与过滤器）；`field?: string`（快捷绑定，等价 `${field}`） | 静态/动态文本一体 |
  ```
  ```ts
  export interface PrintTextElement extends PrintElementBase {
    type: 'text';
    text: string;
    field?: string;
    autoGrow?: boolean; // ← §4.2 未列
  }
  ```
- **严重程度**: P2
- **现状**: `autoGrow` 是 §6 分页算法的分支条件（"仅对设置 autoGrow 的文本启用"）、P2 属性面板的可编辑字段、layout 的 `auto-grow-text` 流类型，但 §4.2 字段表（schema 契约的字段级权威清单）没有它。
- **风险**: 宿主/模板作者按 §4.2 写模板拿不到文本跨页能力；schema 字段 diff 审计（本次即为例）会持续报假缺口。
- **建议**: §4.2 text 行补 `autoGrow?: boolean`（并注明依赖 §12 的 measure 注入语义）。
- **为什么值得现在做**: 字段表是本维度逐字段 diff 的基准，基准本身缺行会让后续每次审计重报。
- **误报排除**: autoGrow 不是 renderer-definitions 的设计态私有装饰——它直接改变分页输出，属于数据契约。
- **历史模式对应**: 增量实现后表格型契约未回写（P3 closure 只回写了 §4.3 rowHeight 缺省语义，text 行漏了）。
- **参考文档**: `docs/components/print/design.md` §4.2、§6、§12
- **复核状态**: 未复核

### [维度16a-6] §3 renderers 模块清单与 live 树漂移：缺 print-designer.tsx 与 editor/ 目录，两处路径/扩展名失真

- **文件**: `docs/components/print/design.md:27`；`packages/flux-print-renderers/src/`（live 树）
- **证据片段**:
  ```md
  - **`@nop-chaos/flux-print-renderers`**（React 交互层）：`print-designer-canvas.tsx`（纸张画布）、`print-palette.tsx`（组件面板）、`print-inspector.tsx`（属性面板）、`print-preview.tsx`（预览）、`renderer-definitions.ts`（元素 React 渲染件，设计态）、`use-print-editor.ts`（editor-core 会话接入）、`schemas.ts`、`index.ts`。
  ```
  ```
  live: src/{print-designer-canvas,print-designer,print-inspector,print-palette,print-preview,renderer-definitions.tsx,schemas,index}.ts(x)
        src/editor/{print-domain-adapter,use-print-editor,canvas-math}.ts
  ```
- **严重程度**: P2
- **现状**: live 还有设计器壳 `print-designer.tsx` 与 `editor/` 子目录（print-domain-adapter.ts、canvas-math.ts），§3 未列；`use-print-editor.ts` 实际位于 `src/editor/` 而非 src 根；`renderer-definitions.ts` 实为 `.tsx`。
- **风险**: §3 是两包模块划分的契约段，新维护者按清单找不到壳与 domain-adapter，也容易把 canvas-math 这类纯函数误放错层。
- **建议**: §3 renderers 行补 `print-designer.tsx`（设计器壳）与 `editor/{print-domain-adapter,use-print-editor,canvas-math}.ts`，并修正扩展名/路径。
- **为什么值得现在做**: P2/P3 收口已回写过 §3 的 core 行（补 barcode.ts），renderers 行属同一轮回写的漏项。
- **误报排除**: 测试文件不入契约清单是仓库惯例，不算缺口。
- **历史模式对应**: owner doc 模块清单落后于实现树。
- **参考文档**: `docs/components/print/design.md` §3
- **复核状态**: 未复核

### [维度16a-7] §5 `dataSchema.fields[...]` 记法与 §4/代码形状不符，且 dataSchema 全仓零消费

- **文件**: `docs/components/print/design.md:40,133`；`packages/flux-print-core/src/schemas.ts:207-213,234`（全仓 grep `dataSchema` 仅此一处定义）
- **证据片段**:
  ```md
  §4: dataSchema?: PrintFieldMeta[]; // 字段目录，供设计器绑定面板；可选
  §5: `dataSchema.fields[{path,label,type,children}]` 只服务设计器字段面板，运行期不依赖。
  ```
- **严重程度**: P2
- **现状**: 两个问题叠加：①§5 的 `dataSchema.fields[...]` 是 open-press 的对象包裹形状（research §2.8 原文如此），与 §4 及代码的顶层数组 `dataSchema?: PrintFieldMeta[]` 不一致；②"供设计器绑定面板"未兑现——print-inspector 及全部 print 代码无任何 `dataSchema` 消费（grep 仅命中类型定义），绑定面板实际是自由文本 field 输入。
- **风险**: 宿主按 §5 形状构造 `{fields:[...]}` 会在类型层直接不合法；schema 作者填了 dataSchema 却等不到字段面板出现。
- **建议**: §5 记法改为 `dataSchema: PrintFieldMeta[{path,label,type,children}]`；"供设计器绑定面板"补注"v1 面板未消费，字段目录为宿主/后续版本预留"或在 P4 后 follow-up 落地消费。
- **为什么值得现在做**: 这是 design.md 内部自相矛盾（§4 vs §5）加文档-代码双漂移的复合点，修正成本极低。
- **误报排除**: "运行期不依赖"半句属实（bind/layout 确不读它）；漂移只在设计器侧声称。
- **历史模式对应**: 调研报告措辞（open-press 形状）直迁进契约文档未经形状校对。
- **参考文档**: `docs/analysis/web-print-research.md` §2.8
- **复核状态**: 未复核

### [维度16a-8] §4 把 `'custom'` 列入 "PAPER_SIZE_PRESETS 键"，代码预设表无此键

- **文件**: `docs/components/print/design.md:46`；`packages/flux-print-core/src/schemas.ts:18-25`；`packages/flux-print-core/src/validate.ts:53`
- **证据片段**:
  ```md
  paperName?: string; // 'a4' | 'a5' | 'b5' | 'custom' ...（PAPER_SIZE_PRESETS 键）
  ```
  ```ts
  export const PAPER_SIZE_PRESETS: Record<string, { width: number; height: number }> = {
    a2: ..., a3: ..., a4: ..., a5: ..., b4: ..., b5: ...,
  };
  // validate.ts: page.paperName !== 'custom' 特判，custom 不在预设表
  ```
- **严重程度**: P3
- **现状**: `'custom'` 不是 `PAPER_SIZE_PRESETS` 的键，validate 用显式特判豁免；§4 注释让它看起来是预设键之一。
- **风险**: 低——实现自洽，但按注释做键值枚举的宿主会多出一个不存在的预设。
- **建议**: 注释改为"预设键 a2–a5/b4/b5；`'custom'` 表示仅按 paper.width/height"。
- **为什么值得现在做**: 注释级修正，顺手改。
- **误报排除**: demo 使用 `paperName: 'custom'` 合法通过校验，行为面无 bug。
- **历史模式对应**: 注释漂移。
- **参考文档**: `docs/components/print/design.md` §4
- **复核状态**: 未复核

### [维度16a-9] design.md `Last Reviewed: 2026-09-05` 陈旧——P3 收口（09-06）实质修订了 §3/§4.3/§5/§6/§12

- **文件**: `docs/components/print/design.md:4`；`docs/plans/2026-09-06-0311-1:162`（closure gate 自述 §3/§4.3/§5/§6/§12 已回写）
- **证据片段**:
  ```md
  > Status: design baseline (P0 产出，P1–P4 按此实现)
  > Last Reviewed: 2026-09-05
  ```
- **严重程度**: P3
- **现状**: 文档在 2026-09-06 被 P3 closure 审计驱动回写了五个小节（新增 barcode.ts 清单、rowHeight 缺省语义、layoutPrintTemplate 命名、规则 3 表述、测量策略），头部 Last Reviewed 仍是 2026-09-05。
- **风险**: 读者据头部日期误判全部内容停留在 P0 时点，低估与 live 的对齐度（或反向，信错了未回写的小节）。
- **建议**: 回写轮同步更新 Last Reviewed。
- **为什么值得现在做**: 元数据是审计者判断文档新鲜度的第一入口。
- **误报排除**: 非"必须人工确认才能改 fresh"的情形——design.md 是组件文档，不受 project-context freshness gate 约束。
- **历史模式对应**: 回写内容但不回写元数据。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`（owner doc 同步要求）
- **复核状态**: 未复核

**维度 16a 一行结论**：design.md 的 schema/分页/链路主干与 live 高度一致（逐字段、逐算法核对通过），但存在 1 处未实现契约保证（阻断打印，P1）与 6 处收口回写漏项（§3/§4.2/§5/§7/§8/§10），全部为文档侧修复。

---

## 维度 16b：roadmap / 计划状态真实性

互洽性核对（无发现部分）：roadmap Phase Status 五项 `done` 与五份 plan `completed` 一一对应；五份 plan 全部 checkbox 均已勾选（逐份通读确认零未勾项）；closure audit 均为独立 fresh-session agent（五份 plan 五个不同 agent ID，与执行 session 分离）；测试计数链互洽——P1 71/71 → P2 71/71（新包 65→68→69）→ P3 71/71（core 68→70）→ P4 72/72（playground 347/347 加入后 +1 task），daily log 与 plan 数字逐处一致；e2e 1455 passed / 0 failed / 1 flaky / 43 skipped 在 P4 plan 与 09-06 log 记录一致；roadmap 复用表抽查的 5 个 live 路径（designer-inspector.tsx、designer-canvas.tsx、xyflow-canvas.tsx、paper-settings.ts、qrcode.tsx）与 calendar print 两文件全部存在。

### [维度16b-1] P2 plan 声称属性面板含"纸张预设"与"边框"样式组，live inspector 两者皆无

- **文件**: `docs/plans/2026-09-06-0109-1:115`（Phase 3 执行项）；`packages/flux-print-renderers/src/print-inspector.tsx:117-141,182-197`
- **证据片段**:
  ```md
  - [x] `print-inspector.tsx`：未选中显示模板属性（名称/纸张预设/方向/边距/页眉页脚高）；……
        样式组（fontSize/textAlign/color/backgroundColor/边框）——@nop-chaos/ui Input/Label/Select/Switch/Field……
  ```
  ```tsx
  // print-inspector.tsx 模板态：name/paperWidth/paperHeight/direction/margins[4]/headerHeight/footerHeight —— 无 paperName 预设选择
  // StyleSection：fontSize/textAlign/color/backgroundColor —— 无 borderWidth/borderColor/borderStyle
  ```
- **严重程度**: P2
- **现状**: 已 `completed` 且三轮 closure audit `approved` 的 P2 plan 中，两条已勾选交付项在 live 不存在：模板属性无 paperName/纸张预设控件，样式组无边框编辑（也无对应 i18n key——`check:i18n-keys` unused=284 基线零 flux.print.\* 可反证）；所列 `Field` 组件实际也未使用（自定义 Row 布局）。
- **风险**: plan 是 closure 证据链的一部分，勾选项与 live 不符会动摇"closure audit 已验证全部交付项"这一信任基础；后续按 plan 补边框编辑的人会发现 i18n/契约都没预留。
- **建议**: 在 P2 plan 该条目补执行期裁剪注记（如"边框/纸张预设裁剪至后续增强"），或在 flux-print-renderers 补齐两控件；二者择一即可让证据链重新闭合。
- **为什么值得现在做**: 本 mission 的流程公信力建立在"勾选=已验证"上，这是唯一发现的勾选项与 live 不符处。
- **误报排除**: 位置/尺寸/旋转/区域与全部九类型的类型组字段（含 autoGrow/fit/columns 编辑/aggregate 下拉）经逐项核对均真实存在，仅上述两项缺位。
- **历史模式对应**: plan 文本先于实现写死、执行期裁剪未回注（同 P4 plan L102 曾被审计员驱出的同类问题）。
- **参考文档**: `docs/plans/2026-09-06-0109-1` Phase 3、Closure Audit Evidence
- **复核状态**: 未复核

### [维度16b-2] web-print 三份核心文档未登记进 docs/index.md / docs/components/index.md（同类 mission 文档均已索引）

- **文件**: `docs/index.md:84-107,210-218`（scheduling/industrial-hmi/ai/ui-review 等 mission 行均在）；`docs/components/index.md`（grep `print` 零命中）；`docs/components/print/design.md`、`docs/analysis/web-print-research.md`、`docs/backlog/web-print-roadmap.md`
- **证据片段**:
  ```md
  | Design or update a scheduling component (Gantt, Kanban, Calendar, BarcodeInput) | `docs/components/roadmap-scheduling.md` | `docs/components/calendar/design.md`, ... |
  | Design or implement an AI conversation renderer ... | `docs/components/roadmap-ai.md` | ... |
  （web-print：docs/index.md 全文 grep "print" 零命中）
  ```
- **严重程度**: P2
- **现状**: AGENTS.md 规定 `docs/index.md` 是权威文档导航基线；本 mission 的 roadmap、design.md、research 三份文档与五份 plan 全部未进索引（"Active Source Of Truth"清单与其他 mission 的 routing 行均无 print 条目）。同类的 scheduling、industrial-hmi、ai、ui-review mission 文档全部有对应行。
- **风险**: 下一轮"读 index 找 owner doc"的 agent（含 AGENTS.md 路由表依赖者）无法发现打印体系已有 design baseline 与 roadmap，存在重复调研/重复设计的真实成本。
- **建议**: docs/index.md 增加一行"Design or implement the web print system（print-designer/print template）| `docs/backlog/web-print-roadmap.md` | `docs/components/print/design.md`、`docs/analysis/web-print-research.md`"；如 components/index.md 服务组件契约目录，补 print/design.md 条目。
- **为什么值得现在做**: mission 刚闭环，正是导航登记的自然时点；越晚越容易被当成"不存在的前作"。
- **误报排除**: docs/index.md 未收录 editor-core.md 等属既有索引债务，不并入本条（非本 mission 引入）。
- **历史模式对应**: 新 mission 文档产出后缺"登记进导航"的收尾步（AGENTS.md Docs Maintenance 只点名 daily log 与 architecture docs，索引步靠自觉）。
- **参考文档**: AGENTS.md「Documentation Routing」、`docs/index.md` Purpose
- **复核状态**: 未复核

### [维度16b-3] P4 plan 对演示页组成的描述与 live 不符（footer 页码/30 行表格/条码元素）

- **文件**: `docs/plans/2026-09-06-0426-1:22,69`；`apps/playground/src/pages/print-designer-demo.tsx:12-37`
- **证据片段**:
  ```md
  Goals: A4 出库单：header 文案 + footer 页码 + 30 行表格含 sum 聚合 + 条码/二维码元素
  执行项: A4 出库单（header 文案 + footer 页码 + 30 行表格含 sum 聚合 + 条码/二维码元素，testData 驱动绑定）
  ```
  ```ts
  const ORDERS = Array.from({ length: 40 }, ...);          // 40 行，非 30
  // A4 模板元素：title(header)/order-no(header)/items(body 表格)/wx qrcode(footer)
  // —— 无 pageNumber 元素（无"footer 页码"）；无 barcode 元素（条码在 80mm 小票模板）
  ```
- **严重程度**: P3
- **现状**: live A4 模板是 40 行、footer 放二维码、无页码元素；plan 两处写 30 行 + footer 页码 + 条码。09-06 log 的描述（"40 行跨页表格含 sum 聚合/二维码"）与 live 一致，plan 文本陈旧。
- **风险**: 低——但"页码元素演示"缺席意味着 `$page/$pages` 注入在 demo 中无用户可见示例，plan 声称会造成误判。
- **建议**: plan 补一行执行期差异注记；或 demo 的 A4 footer 增加 pageNumber 元素（顺带补上页码演示）。
- **为什么值得现在做**: 若选后者是一行元素定义，能让 demo 覆盖 §5 页变量语义。
- **误报排除**: e2e 断言（货物-40、页数 ≥2）与 live 一致，测试面无虚假。
- **历史模式对应**: plan Goals 抄 research 建议后实现微调、文本未跟。
- **参考文档**: `docs/analysis/web-print-research.md` §5 建议 6
- **复核状态**: 未复核

### [维度16b-4] P1 plan Closure Status Note 中 lint 计数写成 "71 task"，同 plan Closure Gates 与 log 均为 39/39

- **文件**: `docs/plans/2026-09-05-2352-1:181`（对照同文件 ：167 closure gate、`docs/logs/2026/09-06.md:9`）
- **证据片段**:
  ```md
  Status Note: ……全仓验证全绿（test 71/71、typecheck/build/lint 39-39/39-39/71 task）……
  Closure Gates: - [x] `pnpm lint`（turbo lint 39/39；根 lint 链仅败于基线既有 check:i18n-keys……）
  ```
- **严重程度**: P3
- **现状**: Status Note 把 lint 计数写成 71（疑为 test 计数串位）；同 plan 的 Closure Gates、执行备注与 daily log 均为 39/39。
- **风险**: 仅文本瑕疵；但 closure 段落的数字错误会削弱证据链的可引用性。
- **建议**: 改为 `39/39`。
- **为什么值得现在做**: 一字修正。
- **误报排除**: 非 lint 实际失败——同一验证在 plan 内部其他三处均 39/39。
- **历史模式对应**: closure 文本拼接串数（P4 L101 计数 71→72 曾被审计员抓过同类）。
- **参考文档**: `docs/logs/2026/09-06.md` P1 段
- **复核状态**: 未复核

### [维度16b-5] P4 plan Phase 3 执行项 "pnpm check 各门禁逐个 exit 0" 与自身 Closure Gates（i18n 既有红）矛盾

- **文件**: `docs/plans/2026-09-06-0426-1:101`（对照同文件 ：135、`docs/logs/2026/09-06.md:52`）
- **证据片段**:
  ```md
  L101: - [x] ……`pnpm check` 各门禁逐个 exit 0 + i18n 基线比对一致——已记录于 daily log
  L135: - [x] `pnpm check`（零新增红项：check:i18n-keys ❌ 与基线逐条一致、unused=284；其余门禁 exit 0）
  ```
- **严重程度**: P3
- **现状**: check:i18n-keys 是基线既有红（不 exit 0），L101 的"各门禁逐个 exit 0"与同 plan Closure Gates 及 log（"14 项 exit 0 + i18n 基线一致"）矛盾。
- **风险**: 引用 L101 者会误报"本 mission 曾全绿 check"，抬高后续对比基线。
- **建议**: L101 改为"14 项 exit 0 + check:i18n-keys 与基线逐条一致"。
- **为什么值得现在做**: 与 16b-4 同属 closure 证据文本精度问题，一并修。
- **误报排除**: Closure Gates 与 log 表述准确，非验证本身造假。
- **历史模式对应**: 执行项措辞先写、门禁事实后修正，执行项未回改。
- **参考文档**: `docs/logs/2026/09-06.md` P4 段
- **复核状态**: 未复核

**维度 16b 一行结论**：五 Phase 的 roadmap↔plan↔closure-audit↔log 状态与计数链整体真实互洽（零未勾项、计数链 71→72 与 1455/0/1 可复现），但存在 1 处已勾交付项与 live 不符（P2 plan inspector 两控件）和 1 处导航登记整体缺失，另余 3 处 closure 文本精度瑕疵。

---

## 维度 16c：research 报告（许可证 / 能力对比 / 调整建议）

许可证抽查（无发现）：实测 `~/sources/print/` LICENSE 文件全部可复现报告结论——openprint LICENSE 为 AGPL-3.0 全文且 package.json 确为 `"license": "GPL-3.0"` 误标（报告 §1 括注属实）；myprint `LICENSE.txt` 为 Apache 2.0 全文；open-press LICENSE 文件为 Apache 2.0 而 README `## License` 段写 MIT（报告 §4.5"以 LICENSE 为准"属实）；fastprint-designer LICENSE 为木兰宽松许可证第 2 版全文；vue-print-designer LICENSE 为 AGPL-3.0 且存在 `COMMERCIAL_LICENSE.md`（报告双授权口径属实）。roadmap myprint 行已改为 Apache 2.0 并留修正注记（P0.5 兑现）。

调整建议兑现核对：§5 建议 1（HTML 渲染器归 core）、2（PaperSettings 形状复制）、4（editor-core + pointer 自研 + 交互参数）、5（游标模型 + footerAggregate 裁剪 + MAX_PAGES）均已兑现且有 live 证据；建议 3（jsbarcode 在 P1 声明）被 P1 以 manifest-deps 硬门禁推翻，裁定与归属记录于 P1 plan 执行备注与 daily log——有归属，合规。

### [维度16c-1] research §3 复用表 "React 组件模式：打印元素渲染器走同一契约（RendererComponentProps）" 与交付矛盾

- **文件**: `docs/analysis/web-print-research.md:187`；`packages/flux-print-renderers/src/renderer-definitions.tsx:4-8`；`docs/plans/2026-09-05-2352-1:36`（Non-Goals）
- **证据片段**:
  ```md
  | React 组件模式 | **复用**：RendererComponentProps（props/meta/regions/events/helpers）+ renderer hooks 模式；打印元素渲染器走同一契约 | `docs/references/quick-reference.md`、`packages/flux-core/src/types/renderer-core.ts:256` |
  ```
  ```ts
  // live：打印元素渲染件是独立轻量契约，不进 flux renderer registry、无 props/meta/regions/events/helpers
  export interface PrintElementRendererProps<E extends PrintElementSchema = PrintElementSchema> {
    element: E;
  }
  ```
  ```md
  P1 Non-Goals: 不做 flux registry 注册（`PrintTemplateSchema` 不是 flux 页面 schema，不进 flux renderer registry；……）。
  ```
- **严重程度**: P2
- **现状**: research 复用表逐项核实章节声称打印元素渲染器将走 RendererComponentProps 同一契约；P1 执行期裁定（不进 registry）与 live 均与此相反，research 未作任何修订或注记，design.md §12 也只提"打印态不复用 registry"未覆盖设计态渲染件的真实契约。
- **风险**: 能力对比表是本报告的决策依据章节，此行让读者以为 flux renderer registry/hooks（useRendererRuntime 等）适用于打印元素；照此实现会撞上 P1 裁定时列出的契约错位。
- **建议**: research §3 该行补执行结果注记（"P1 裁定不进 flux registry，打印元素走 PrintElementRendererProps 独立轻量契约"）；research 是时点报告，允许以注记方式保持历史 + 指向现实。
- **为什么值得现在做**: 本报告被 design.md 头部引用为唯一来源，来源表中唯一被实现推翻且无注记的结论就是这条。
- **误报排除**: "数据绑定和表达式 | 直接复用 flux-formula"等其他复用行经 live 核对（`packages/flux-formula/src/index.ts` 导出 parseFormula/createFormulaCompiler/createFormulaRegistry 均存在）全部成立，仅此行翻车。
- **历史模式对应**: 调研报告落地后无"结论回填"机制。
- **参考文档**: `docs/plans/2026-09-05-2352-1` Non-Goals、`docs/components/print/design.md` §12
- **复核状态**: 未复核

### [维度16c-2] research §5 建议 6 "e2e 覆盖设计器拖拽/属性修改"未落地且无归属

- **文件**: `docs/analysis/web-print-research.md:276`；`tests/e2e/print-designer.spec.ts`（6 用例清单）；`docs/plans/2026-09-06-0426-1:24`（Goals 六用例即终态）
- **证据片段**:
  ```md
  6. **P4 演示**：……e2e 覆盖设计器拖拽/属性修改/预览分页/打印 HTML 生成。
  ```
  ```
  live e2e 六用例：路由加载 / palette 点击添加 / 预览分页同源 / 条码 <svg> / 导出下载 / 打印按钮存在
  —— 无画布拖拽用例、无属性修改用例；拖拽/属性交互仅由包内 RTL 单测覆盖（非 e2e）。
  ```
- **严重程度**: P3
- **现状**: 拖拽与属性修改的真实浏览器端到端覆盖被 P4 plan 起草时静默裁剪（Goals 直接改写为六用例），无任何 plan Deferred/Follow-up 记录裁剪决策；research 建议其余各条均有兑现或归属。
- **风险**: 指针事件/吸附/手柄缩放这条最易受真机环境影响的交互链只有 happy-dom 单测守护；e2e 抓到过 StrictMode dispose 这种单测盲区 bug，交互 e2e 缺位是同类风险敞口。
- **建议**: 在 P4 plan Non-Blocking Follow-ups 或 web-print roadmap Cross-Cutting 补一条"拖拽/属性修改 e2e 增强（watch）"归属；或后续补 spec。
- **为什么值得现在做**: StrictMode dispose bug 正是 e2e 抓到的——同类盲区已有前科。
- **误报排除**: palette"点击添加"用例部分覆盖了添加链路，但不经过 pointer 拖拽/吸附/手柄路径，不能视为拖拽覆盖。
- **历史模式对应**: 建议项在 plan 起草时静默收窄。
- **参考文档**: `docs/logs/2026/09-06.md` P4 段（StrictMode 发现）
- **复核状态**: 未复核

**维度 16c 一行结论**：许可证结论全部可复现（6 项抽查零误差）、合规红线执行到位，但能力对比/复用表有 1 条结论被实现推翻且无注记（React 组件契约），P1–P4 建议兑现 5 条、推翻 1 条（有归属）、静默裁剪 1 条（无归属）。

---

## 维度 17：命名一致性

核对通过项（无发现）：`PRINT_*` 诊断码在代码（validate 12 个、bind 4 个、layout 1 个）与全部 plan/log 引用一一对应、无拼变体；`PrintLayoutPage`/`PlacedElement`（§6 与 layout.ts 逐字段一致）/`BoundPrintElement`（plan 与 bind.ts 一致）术语跨文档统一；`ESTIMATE_ROW_HEIGHT_MM=6`、`MAX_LAYOUT_PAGES=500` 与 §4.3/§6/§12 语义一致；`fmt-*` 打印 HTML 类名空间在 render-html.ts 内 11 个类全部遵守前缀；design.md §9 的 nop-_ marker（nop-print-canvas/paper/element/data-print-type/region-_）与画布实现一致；terminology.md 是 flux 运行时共享词汇表，打印域术语已在 design.md 内聚定义且跨文档一致，缺词条不构成漂移。

### [维度17-1] 设计态渲染件使用 `fmt-design-*` 类名，越过 §9 界定的 "fmt-\* = 打印态 HTML" 命名空间边界

- **文件**: `packages/flux-print-renderers/src/renderer-definitions.tsx:15,22,32,52,57,64,71,76,84,90`；`docs/components/print/design.md:188-189`
- **证据片段**:
  ```md
  §9: 打印态 HTML 用独立类名空间 `fmt-*`（print markup tag），不依赖 Tailwind——HTML 必须在无构建页面的 iframe 中自包含。
  ```
  ```tsx
  // 设计态 React 渲染件（有 React/构建环境，非 iframe 自包含产物）：
  <span className="fmt-design-text" data-print-role="text-content">...
  <table className="fmt-design-table" data-print-role="table-skeleton">
  // 全部 9 个：fmt-design-{text,image,line,pagenumber,placeholder,printdate,rect,table,unknown}，零 CSS 消费（纯 marker）
  ```
- **严重程度**: P2
- **现状**: §9 把 `fmt-*` 定义为打印态自包含 HTML 的专属类名空间、设计态 marker 归 `nop-*`；设计态 renderer-definitions 却发出 9 个 `fmt-design-*` 类名（grep 全仓库仅此一处设计态使用 fmt- 前缀，且无任何 CSS/样式消费）。设计态与打印态的两套实现如今在前缀上不可区分。
- **风险**: 破坏 §9 立的两套命名空间的判别价值：后续按"grep fmt-_ 即打印 HTML 产物"做审计/样式加固（如给 fmt-_ 挂打印锁定样式）会误伤设计态 DOM；反向按前缀找设计态 marker 的人会漏。
- **建议**: 二选一：①renderer-definitions 的 9 个类名改 `nop-print-design-*`（机械替换 + 测试更新，半小时级）；②§9 增补一句"`fmt-design-*` 为设计态骨架渲染件 marker 子命名空间"。
- **为什么值得现在做**: 命名空间边界一旦被更多组件引用就再难收口；当前只有 1 个文件 9 处。
- **误报排除**: 数据本身（data-print-role）没问题，问题只在类名前缀归属。
- **历史模式对应**: 双命名空间约定被实现"顺手"渗透（仓库高频问题：marker 与样式类边界）。
- **参考文档**: `docs/components/print/design.md` §9、`docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

### [维度17-2] §9 marker 契约清单未含 `data-print-role` / `data-element-id` 等跨文件测试契约标记

- **文件**: `docs/components/print/design.md:188`；`packages/flux-print-renderers/src/renderer-definitions.tsx`、`print-designer-canvas.tsx:259-261`
- **证据片段**:
  ```md
  §9: 画布容器仅发 marker 类：`nop-print-canvas`、`nop-print-paper`、`nop-print-element`（`data-print-type="text|table|..."`）、`nop-print-region-header/footer/body`。
  ```
  ```tsx
  <div className={cn('nop-print-element', ...)} data-print-type={element.type} data-element-id={element.id} ...>
  <span className="fmt-design-text" data-print-role="text-content">
  ```
- **严重程度**: P3
- **现状**: live 新增了 `data-print-role`（渲染件语义标记，P2 起供画布/测试消费）、`data-element-id`、`data-paper-name` 等稳定测试/集成契约标记，§9 契约清单未更新（P2 plan Baseline 提过 data-print-role，owner doc 未收）。
- **风险**: 下游 e2e/宿主依赖这些属性却无 owner doc 背书，重构时可能被当自由属性清掉。
- **建议**: §9 清单补 `data-print-role`、`data-element-id` 两项即可（widget 内部 handle/selected 类无需入契约）。
- **为什么值得现在做**: §9 本轮（16a-1/17-1）就要动，顺手补。
- **误报排除**: nop-print-element-handle/-selected 等属 widget 自绘内部类，按 styling contract 不入 marker 契约。
- **历史模式对应**: marker 清单落后于实现。
- **参考文档**: `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

### [维度17-3] `createEmptyPrintTemplate` 默认名硬编码中文于纯 TS core 包

- **文件**: `packages/flux-print-core/src/schemas.ts:238`
- **证据片段**:
  ```ts
  export function createEmptyPrintTemplate(name = '未命名模板'): PrintTemplateSchema {
  ```
- **严重程度**: P3
- **现状**: flux-print-core 是"纯 TS 零 React"包且 P1 Non-Goals 明确"i18n key 注册（P1 无用户可见文案；P2 面板文案时再进 flux-i18n）"，但默认参数引入了用户可见中文文案（经 createEmptyPrintTemplate → 模板 name → render-html `<title>` / 设计器显示）。
- **风险**: 该默认值一旦被宿主调用即输出中文硬编码；core 无法走 flux-i18n（零 React 边界）。
- **建议**: 默认名改为空串或 `print-template.untitled` 类中性 token，由调用方（renderers 层）负责 i18n 兜底。
- **为什么值得现在做**: core 包文案入口目前仅此一处，趁未扩散收口。
- **误报排除**: playground demo 页的中文按钮文案属演示应用，仓库惯例允许，不在本条范围。
- **历史模式对应**: 渲染器硬编码用户可见文本（维度 18 清单第 6 项）。
- **参考文档**: `docs/plans/2026-09-05-2352-1` Out Of Scope（i18n 条目）
- **复核状态**: 未复核

**维度 17 一行结论**：诊断码、核心类型术语、est/max 常量语义全仓一致（零发现），唯一的结构性问题是 `fmt-design-*` 越过 §9 两套命名空间边界（P2），另有 marker 清单滞后与 core 硬编码文案两处 P3。

---

## 维度 18：跨包一致性

核对通过项（无发现）：flux-print 双包与 flow-designer/report-designer 的 core/renderers 分层模式同构（core 零 React——grep 证实 flux-print-core 无 react import；renderers 只含 React 适配）；vitest 环境决策已有文档记录——core=node、renderers=happy-dom 写入两包 `vitest.config.ts` 与 P1/P3 plan（Baseline 与 Phase 条目），core 内 3 个需 DOM 的测试文件（render-html/print/export-pdf）的 per-file `// @vitest-environment happy-dom` pragma 及"happy-dom 无真实布局、jsbarcode 降级"的因果均在 P3 plan Baseline 与 daily log 成文；editor-core 接入模式（domain-adapter + 会话 hook + useSyncExternalStore）与 dashboard 同构。

### [维度18-1] print 与 dashboard 对 editor-core 会话的 dispose 生命周期裁定相反，分歧与第三消费者均未记入 owner doc

- **文件**: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:145-160`；`packages/flux-print-renderers/src/print-designer.tsx:23-27`；`docs/architecture/editor-core.md:10,31,112`
- **证据片段**:
  ```tsx
  // dashboard：effect 内 dispose 旧会话并重建（push-back 模式）
  if (diffDashboardDocument(current.getState().committed, incoming) !== null) {
    current.dispose();
    coreRef.current = buildSession(incoming, commitPolicy, initialMode, notifySave);
  ```
  ```tsx
  // print：裁定卸载不 dispose（e2e 抓到的 StrictMode 双挂载真 bug）
  // StrictMode 双挂载会触发 effect 清理——editor-core dispose 不可恢复，故不在卸载时 dispose
  //（controller 随组件引用释放由 GC 回收；dispose 仅供测试显式调用）
  ```
  ```md
  editor-core.md:（定位）对任意"编辑态/运行态"设计器（dashboard、SCADA hmi、后续其他）统一。
  —— 全文 grep "print" 零命中：flux-print-renderers 这一第三消费者与其"卸载禁 dispose"裁定均未入 owner doc
  ```
- **严重程度**: P2
- **现状**: 同一 editor-core 内核的两个消费者持有相反的 dispose 生命周期：dashboard 在 effect 中 dispose+重建，print 因 React 19 StrictMode 双挂载把 controller 永久 dispose 导致设计器失灵（P4 e2e 抓到的真 bug）而裁定"卸载不 dispose"。该裁定目前只存在于 print-designer.tsx 的两行注释与 P4 plan/log；editor-core owner doc 的消费者清单停留在"dashboard、SCADA hmi"，dispose 相关行只描述 dashboard 的 push-back 重建模式，未警示不可恢复 dispose 与 StrictMode 的组合风险。
- **风险**: ①下一个编辑器域（或一致性重构）照 dashboard 模式给 print"补上"卸载 dispose，即复活 StrictMode bug——该 bug 单测不可见（RTL 无 StrictMode），只有 e2e 能抓；②反向，把 print 的"不 dispose"当成普适模式推广，dashboard 的长会话场景会积累会话实例。
- **建议**: editor-core.md 增补"消费者与生命周期"小节：列三个消费者；写明 dispose 不可恢复、StrictMode dev 双挂载会触发 effect 清理、受控 push-back 重建（dashboard 模式）与无 prop 回推时卸载不 dispose（print 模式）两种裁定及适用条件。
- **为什么值得现在做**: bug 刚修完、裁定记忆新鲜；owner doc 是 AGENTS.md 指定的第一入口，此时补两段成本最低，晚于下一个消费者接入就成了考古。
- **误报排除**: 不是要求两包统一 dispose 模式——两者受控/非受控形态不同，分歧本身合理，缺的是分歧的文档化。
- **历史模式对应**: 跨包生命周期裁定只落在代码注释与 log、owner doc 失同步（本仓库"接口存在≠语义落地"教训的文档侧变体）。
- **参考文档**: `docs/architecture/editor-core.md`、`docs/logs/2026/09-06.md` P4 段（实现期发现）
- **复核状态**: 未复核

**维度 18 一行结论**：分层、注册、测试环境三类跨包模式均与既有体系同构且有 plan 级文档记录（零发现），唯一实质缺口是 editor-core dispose 生命周期分歧与新消费者未进入 owner doc（P2）。

---

## 合规复查（AGPL 引用 / hiprint 命名）

- **AGPL/无 LICENSE 特征标识符**：对 `packages/flux-print-core/src`、`packages/flux-print-renderers/src`、demo 页全量 grep 20+ 特征标识符（`PlacedNode|createHeadless|renderDocument|visibleIf|contentType|labelgrid|minPages|keepTogether|summaryRow|flow-id|flow-kind|autoPaginate|tfootRepeat|footerData|customScript|attachShadow|PrintDesignerElement|secretKey|printChannel|domToImage|pdfBuilder|labelCol|labelGap|bwip|katex`）——**零命中**。design.md/research 中的 openprint/vue-print-designer/report-designer 内容均为思想引用且逐处标注协议（§2 表、§12 红线条目），合规。**零发现**。
- **hiprint 命名雷同**：对 flux-print 两包 grep `tid|paperHeader|paperFooter|panelPaperRule|panelPageRule|showInPage|printElements|tableHeaderRepeat|barTextMode|barAutoWidth|hinnn`——语义性命名零命中（初扫的 `printElements` 命中经复核为 `PrintElementSchema` 的大小写误匹配，非 hiprint 命名）。schema 命名（elements/PrintElement*/style 白名单/fmt-*）与 hiprint（panels/printElements/options/tid/pt 单位）无雷同，§12"schema 命名原创"声明成立。**零发现**。

**合规一行结论**：AGPL 与无 LICENSE 项目零代码拷贝经特征标识符全量 grep 复证，hiprint 命名零雷同，许可证事实陈述经 LICENSE 实测全部可复现——本维度零发现。

---

## 误报排除清单（核查过、判定不构成发现）

| 事项                                                                                                                        | 排除理由                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| §6 "逐行测量填充当前页" vs live 估算行高几何切割                                                                            | §4.3 rowHeight 注释与 §12 已明示"估算回退 + measure 可注入"并获 P3 closure 回写确认，§6 是算法意图层描述，语义不矛盾            |
| roadmap P4.4 "确保全量通过" 标 done 而 e2e 有 1 flaky                                                                       | P4 plan Exit Criteria 与 daily log 均如实记录 1 flaky（gantt 基线时序、重试通过、watch-only 建议登记），编排层无需重复注记      |
| `docs/architecture/editor-core.md` 未进 docs/index.md                                                                       | 既有索引债务，非本 mission 引入（不并入 16b-2）                                                                                 |
| `docs/context/project-context.md` 无 web-print mission 记录、基线数字停在 2026-08-09（32 包/59 task vs 实际 39 包/72 task） | 该文件自述不追踪 active work；freshness 基线陈旧属仓库级既有债务，非本 mission 引入（本 mission 各 plan 引用 fresh 标签亦据此） |
| P1 plan `Last Reviewed: 2026-09-05`（收口在 09-06）                                                                         | guide 未定义 bump 时机，draft review 确在 09-05；与 16a-9（design.md 明确被 09-06 修订过）性质不同                              |
| flux-print-renderers devDeps 声明 jsdom 而 vitest env 为 happy-dom                                                          | 工具链选择非文档契约；P1 plan 已记录 peer+dev 双声明来源                                                                        |
| nop-print-element-handle/-selected 等 widget 内部类未入 §9                                                                  | styling contract 允许 widget 自绘内部布局类，仅稳定测试契约属性需要入册（已按 17-2 处理）                                       |
| research §5 "jsbarcode 在 P1 声明" 被推翻                                                                                   | 有显式归属（P1 plan 执行备注 + daily log，guide Rule 13 硬门禁裁定），非静默偏离                                                |
| PrintLayoutPage.header "region 元素原样复制" vs live 按页重绑定+坐标展开                                                    | "原样复制"指逐页重复语义；重插值是实现 §5/§6 的页变量要求，无行为矛盾                                                           |

## 汇总

| 编号  | 维度 | 严重程度 | 文件                                                                | 摘要                                                           |
| ----- | ---- | -------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| 16a-2 | D16a | **P1**   | design.md:194 / print.ts / export-pdf.ts                            | "error 级阻断打印"未实现且无归属                               |
| 16a-1 | D16a | P2       | design.md:179 / use-print-editor.ts                                 | §8 声称 Zustand，实为 editor-core 会话                         |
| 16a-3 | D16a | P2       | design.md:194 / bind.ts                                             | 绑定路径 warning 归属 validate 实为 bind                       |
| 16a-4 | D16a | P2       | design.md:170,175 / flux-print-core                                 | PrintBackend 接口位零代码存在                                  |
| 16a-5 | D16a | P2       | design.md:90 / schemas.ts:104                                       | §4.2 text 行缺 autoGrow 字段                                   |
| 16a-6 | D16a | P2       | design.md:27                                                        | §3 renderers 清单缺壳与 editor/ 目录                           |
| 16a-7 | D16a | P2       | design.md:40,133 / schemas.ts:234                                   | dataSchema 记法自相矛盾且零消费                                |
| 16b-1 | D16b | P2       | P2 plan:115 / print-inspector.tsx                                   | 已勾交付项"纸张预设/边框"live 不存在                           |
| 16b-2 | D16b | P2       | docs/index.md / docs/components/index.md                            | web-print 三份文档未进权威索引                                 |
| 16c-1 | D16c | P2       | research:187 / renderer-definitions.tsx                             | "打印渲染器走 RendererComponentProps 同一契约"被实现推翻无注记 |
| 17-1  | D17  | P2       | renderer-definitions.tsx / design.md:189                            | fmt-design-_ 越过 fmt-_ 打印态命名空间边界                     |
| 18-1  | D18  | P2       | dashboard-editor-renderer.tsx / print-designer.tsx / editor-core.md | dispose 生命周期分歧与第三消费者未入 owner doc                 |
| 16a-8 | D16a | P3       | design.md:46 / schemas.ts:18                                        | 'custom' 非预设键但注释列为键                                  |
| 16a-9 | D16a | P3       | design.md:4                                                         | Last Reviewed 落后于 09-06 实质修订                            |
| 16b-3 | D16b | P3       | P4 plan:22,69 / print-designer-demo.tsx                             | demo 组成描述漂移（页码/30 行/条码）                           |
| 16b-4 | D16b | P3       | P1 plan:181                                                         | closure 文本 lint 计数 71 误写                                 |
| 16b-5 | D16b | P3       | P4 plan:101                                                         | "各门禁逐个 exit 0"与 i18n 既有红矛盾                          |
| 16c-2 | D16c | P3       | research:276 / print-designer.spec.ts                               | 拖拽/属性修改 e2e 建议无归属未落地                             |
| 17-2  | D17  | P3       | design.md:188 / canvas 等                                           | §9 缺 data-print-role/data-element-id 契约标记                 |
| 17-3  | D17  | P3       | schemas.ts:238                                                      | core 默认名硬编码中文                                          |

**统计**：发现总数 20（P0=0，P1=1，P2=11，P3=8）。两轮深挖：第一轮 17 项，第二轮追加 3 项（16b-2、17-1、18-1 均为第二轮经 dashboard/editor-core.md/索引比对确认为新发现；其余为第一轮产出）。

**零发现维度**：许可证与 AGPL/hiprint 合规（LICENSE 实测 6 项全可复现、特征标识符 grep 零命中）；D16b 的 roadmap↔plan↔log 状态与计数链（71→72、1455/0/1 flaky 全部互洽）；D17 的 PRINT\_\* 诊断码与核心类型术语；D18 的分层/注册/vitest 环境记录。

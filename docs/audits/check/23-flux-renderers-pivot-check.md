# 23 flux-renderers-pivot 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-pivot/src/` 排除 `*.test.*` 后 6 个实现文件共 1144 行（index.ts 25 / schemas.ts 83 / pivot-option.ts 395 / pivot-renderer.tsx 259 / pivot-renderer-definitions.ts 316 / pivot-events.ts 66）+ styles.css 12 行。**精读覆盖率 100%**。另核对了 `docs/references/quick-reference.md`（契约基线）、`package.json`/`tsconfig.json`、flux-i18n zh-CN/en-US locale（key 存在性）、同层 `flux-renderers-data/src/sparkline-path.ts`（devWarn 惯例对照），并扫读 3 个测试文件佐证反误报。
- 结论概览：**P0 x1 / P1 x3 / P2 x4 / P3 x6**。总评：包体量小、结构清晰，契约面合规（数据一律走 `props.props`/`props.meta`/`props.regions`/`props.events`，无 store 直连，i18n 用 `t()` 且 key 双语齐全，loading 用 ui 包 `Spinner`，className 无 BEM）。聚合/分组/行列展开主体委托 `@visactor/vtable`，包内自研计算面只有 filter 谓词与配置归一化——除零、浮点累计、分组 key 拼接碰撞等经典缺陷面因此不在本包实现内，但类型归一责任随之落在 filter 谓词上（F-03）。**核心风险集中在"实例更新通道单一依赖 JSON.stringify 签名"这一设计**：签名序列化静默丢弃函数属性，直接导致 filterRules 任何语义修改永远不生效（P0 F-01）；签名、错误态、实例生命周期三者交织又衍生出错误态死锁（F-02）与交互状态丢失（F-04）。

## P0 缺陷

### F-01 filterRules 任何语义修改永远不生效：JSON.stringify 签名静默丢弃 filterFunc 函数属性，updateOption 与 setRecords 双通道全部跳过

- 位置：
  - `packages/flux-renderers-pivot/src/pivot-renderer.tsx:47-50`（签名构造）
  - `packages/flux-renderers-pivot/src/pivot-renderer.tsx:175-182`（唯一两条更新通道：签名 diff → updateOption；records 引用 diff → setRecords）
  - `packages/flux-renderers-pivot/src/pivot-option.ts:240`（filterFunc 为闭包谓词）
- 关键源码摘录（pivot-renderer.tsx:47-50, 175-182）：
  ```ts
  function buildOptionSignature(option: PivotTableConstructorOptions): string {
    const { records: _records, ...rest } = option;
    return JSON.stringify(rest);
  }
  // ...
  if (signature !== optionSignatureRef.current) {
    existing.updateOption(option);
    optionSignatureRef.current = signature;
    dataRef.current = data;
  } else if (dataRef.current !== data) {
    existing.setRecords(data);
    dataRef.current = data;
  }
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：schema 配置 `dataConfig.filterRules: [{ field: 'amount', operator: '>', value: '${threshold}' }]`（`records`/`source` 及 filter value 均为 expression 入口，propContracts `editorType: 'expression'`），运行时 `threshold` 从 100 改为 200。
  2. 路径：`resolved.dataConfig` 变化 → `buildPivotOption` 重算 → `normalizeFilterRules` 生成**新 filterFunc 闭包**（捕获 value=200）→ effect 重跑 → `buildOptionSignature` 对 option 做 `JSON.stringify`。JS 语言行为：函数属性在序列化中被静默丢弃，`JSON.stringify([{ filterFunc: fn }]) === '[{}]'`。filterRules 数量不变时，新签名与旧签名**逐字符相同**→ `updateOption` 不调用；records 数组引用未变 → `dataRef.current !== data` 亦为 false → `setRecords` 也不调用。实例 option 停留在旧闭包（捕获 value=100）。
  3. 错误结果：表格继续按 threshold=100 过滤，与配置不符。更强的变体：若阈值联动触发数据源重取，`setRecords(新数据)` 被调用，但新数据仍然流经实例**旧 option 里的旧闭包**过滤（>100），错误结果从"不更新"升级为"新数据 + 旧阈值"的错误组合。该失效精确覆盖"filterRules 数量不变、语义变化"的场景（改 value/operator/field 均命中）——恰是阈值调整类最常见用法；数量 0→1、1→2 时签名会变（`[]` vs `[{}]`），反而能生效。
- 为什么现有测试没有抓到：`pivot-option.test.ts:264` 断言 filterRules 形态为 `{ filterFunc: expect.any(Function) }`（纯函数属性，无影子数据）；`pivot-renderer.test.tsx` 只覆盖"仅 records 变化 → setRecords"（:160）与"维度/指标变化 → updateOption"（:181，走 indicators/rows 等可序列化键），无 filter 值变化用例。
- 修复方向：签名原料不能依赖会丢函数的 JSON.stringify——在 `normalizeFilterRules` 时同步生成纯数据影子（如 `{ field, operator, value }` 描述数组）挂到 option 旁路参与签名；或直接以 `resolved.dataConfig` 引用 diff 触发 updateOption。

## P1 隐患

### F-02 实例创建失败后永久卡死错误态：错误分支卸载了 container div，此后任何配置/数据修复都无法触发重建（无自愈路径）

- 位置：`packages/flux-renderers-pivot/src/pivot-renderer.tsx:147-150`（container 空守卫）、`:167-168`（失败置 initError）、`:241-252`（错误分支渲染，不含 `ref={containerRef}` 节点）、`:159-160`（initError 唯一清除点在成功创建之后）
- 关键源码摘录（pivot-renderer.tsx:147-150, 241-242）：
  ```ts
  const container = containerRef.current;
  if (!container) {
    return;
  }
  // ...
  if (initError) {
    return (
      <div {...commonProps} style={{ height }}>
  ```
- 问题：构造抛错（容器 0 尺寸、数据结构异常、内存不足等）→ `setInitError` → 渲染切到错误分支，挂 `ref={containerRef}` 的 canvas div 从 DOM 移除。此后 option/data 修复使 effect 重跑，但 `containerRef.current === null` 直接 return；而 `initError` 只在"成功创建实例"后才被清除（:160 `queueMicrotask(() => setInitError(null))`），成功创建又需要 container——形成死锁，唯一出口是组件卸载重挂。
- 影响：特定条件（构造抛错一次）+ 后果（组件直到卸载前永久显示"加载失败"，即使上游数据已修复）。错误消息本身也被折叠为 `t('flux.common.loadFailed')`（:248），用户无从得知真实原因。
- 修复方向：effect 检测到 option/data 变化时先 `setInitError(null)` 再走创建路径；或错误分支保留隐藏的 container div 使重建可行；至少把底层 error.message 通过 tooltip/测试锚点透出。

### F-03 比较运算符过滤谓词无类型归一：双侧均为字符串时按字典序比较，"9" > "10" 为 true；非数值字符串产生 NaN 静默丢行

- 位置：`packages/flux-renderers-pivot/src/pivot-option.ts:206-213`
- 关键源码摘录：
  ```ts
  case '>':
    return (row[field] as number) > (value as number);
  case '>=':
    return (row[field] as number) >= (value as number);
  case '<':
    return (row[field] as number) < (value as number);
  case '<=':
    return (row[field] as number) <= (value as number);
  ```
- 问题：`as number` 是 TypeScript 断言，运行时零转换，实际语义退化为 JS 原生 `<`/`>`。JS 比较规则：双侧均为 string 时按字典序（code unit）比较——数据来自 CSV/字典接口/无类型 JSON 时数字常为字符串（如 `"9"` vs `"10"`），`"9" > "10"` 为 true，过滤结果错误；任一侧为非数值字符串时转 NaN，比较恒 false，整行被静默滤掉，无任何 devWarn。
- 影响：特定条件（字段与过滤值均为字符串数字，或字段含非数值字符串）+ 后果（行被错误保留/错误滤除，聚合数字随之错误）。ISO 日期字符串因字典序恰好等于时间序而侥幸正确，掩盖了问题。
- 修复方向：谓词内显式 `Number()` 归一 + `Number.isFinite` 守卫，不合法类型 devWarn 并按 false/跳过处理；与 `=`,`!=`（严格等）的语义差异应在 schema 文档注明。

### F-04 loading 往返销毁重建实例 + 主题切换走 updateOption 全量：用户展开/折叠、列宽、滚动位置等交互状态在数据刷新周期中丢失

- 位置：`packages/flux-renderers-pivot/src/pivot-renderer.tsx:129-146`（loading/empty → `instance.release()` 置空）、`:175-177`（签名变化 → `updateOption` 全量）、测试 `pivot-renderer.test.tsx:270`（"loading=true → false 往返：旧实例释放、新 canvas div 绑定新实例"已把销毁重建固化为预期行为）
- 关键源码摘录（pivot-renderer.tsx:130-137）：
  ```ts
  if (loading || empty || option === null) {
    const instance = instanceRef.current;
    if (instance) {
      instanceRef.current = null;
      optionSignatureRef.current = null;
      dataRef.current = null;
      try {
        instance.release();
  ```
- 问题：CRUD 类数据源刷新惯例是 loading=true → 拉取 → loading=false。每次往返 = PivotTable 实例 release + 重建（VTable 实例化含 canvas 上下文创建，开销大），用户此前的行列展开/折叠、列宽拖拽、滚动位置全部丢失，且整表闪烁。高频轮询刷新时退化为周期性状态清零。另：主题切换（`.dark` toggle）使 theme 变化进入签名 → `updateOption` 全量路径，VTable updateOption 重建内部布局树，交互状态同样可能被重置（suspect：具体保留行为取决于 VTable 版本，未在本包验证；release+重建路径的丢失则是确定的）。
- 影响：透视表"展开/折叠状态与数据刷新一致性"经典缺陷面；静态 schema 展示不受影响，交互式分析场景（本包 `onDrill`/`drillmenu_click` 事件表明目标场景就是分析）受影响最重。
- 修复方向：loading 期间保留实例、以遮罩层（Spinner overlay）呈现；或在 release 前用 VTable 状态导出 API（若有）保存并在重建后恢复。

## P2 风险

### F-05 updateOption/setRecords 更新路径无错误捕获，与创建路径不对称：更新抛错将以未捕获异常冒泡

- 位置：`packages/flux-renderers-pivot/src/pivot-renderer.tsx:175-182`
- 关键源码摘录：
  ```ts
  if (signature !== optionSignatureRef.current) {
    existing.updateOption(option);
    optionSignatureRef.current = signature;
    dataRef.current = data;
  } else if (dataRef.current !== data) {
    existing.setRecords(data);
    dataRef.current = data;
  }
  ```
- 问题：创建路径（:154-172）有完整 try-catch + setInitError，更新路径零防护。VTable 在畸形数据（如 records 元素非对象、维度值类型突变）下 updateOption/setRecords 抛错时，异常直接从 effect 冒泡为未捕获错误，无 ErrorBoundary 接驳时整页卸载。
- 影响：D5 错误处理不对称；一旦发生即整树级别故障。
- 修复方向：与创建路径同构的 try-catch + setInitError + console.error。

### F-06 dataConfig（sortRules/filterRules/totals）在 schemaValidator 与 propContracts 双侧均为零校验；IN/NOT_IN 的 value 非数组时静默退化为恒假/恒真

- 位置：`packages/flux-renderers-pivot/src/pivot-renderer-definitions.ts:14-114`（validatePivotSchema 仅查 indicators/rowDimensions/columnDimensions/cornerTitleOnDimension）、`:211-216`（dataConfig shape 为 `{ kind: 'object', fields: {} }` 空壳）、`packages/flux-renderers-pivot/src/pivot-option.ts:214-217`
- 关键源码摘录（pivot-option.ts:214-217）：
  ```ts
  case 'IN':
    return (row) => Array.isArray(value) && (value as unknown[]).includes(row[field]);
  case 'NOT_IN':
    return (row) => Array.isArray(value) && !(value as unknown[]).includes(row[field]);
  ```
- 问题：用户写错字段名（`op` 而非 `operator`）、filter value 类型不符（IN 传标量）时无任何编辑器提示（validator 不查）、无运行时 devWarn（`Array.isArray(value)` 短路直接返回常量谓词）：IN 恒 false 全部滤空、NOT_IN 恒 true 全部放行——两个方向的静默错误数据。
- 影响：D1/D5；配置错误以错误聚合结果呈现而非报错，排障成本高。
- 修复方向：validatePivotSchema 扩展 dataConfig 三子键结构校验；谓词构建处对 IN/NOT_IN 的 value 做数组检查 + devWarn。

### F-07 无记录数/维度基数上限防护：高基数行列维度组合爆炸直接进入 VTable 主线程全量聚合

- 位置：`packages/flux-renderers-pivot/src/pivot-option.ts:263-320`（buildPivotOption 全程无数量 guard）、`packages/flux-renderers-pivot/src/pivot-renderer.tsx:98-99`（data/baseOption 无限量）
- 问题：`buildPivotOption` 对 records 数量、行/列维度去重基数无任何上限检查。两个 distinct 1000+ 的维度交叉即百万级单元格，VTable 在主线程完成全量聚合与布局，页面长时间冻结且无 loading 反馈、无降级路径。
- 影响：D6；任务重点"行列组合爆炸无上限"直接命中。schema 一行配置即可触发。
- 修复方向：可配置 `maxRecords`/维度基数 guard，超限时 devWarn + 截断或拒绝渲染；至少在文档标注数据量边界。

### F-08 attachPivotEvents 返回的 detach 函数被丢弃，事件清理完全依赖 PivotTable.release() 的隐式行为（suspect）

- 位置：`packages/flux-renderers-pivot/src/pivot-renderer.tsx:161-165`（调用处未保存返回值）、`packages/flux-renderers-pivot/src/pivot-events.ts:58-65`（detach 定义，`off?` 可选）
- 关键源码摘录（pivot-renderer.tsx:161-165）：
  ```ts
  attachPivotEvents({
    instance: created,
    getHandlers: () => handlersRef.current,
    scope: props.node.scope,
  });
  ```
- 问题：`attachPivotEvents` 明确返回注销函数（逐 binding 调 `instance.off`），但唯一调用点丢弃返回值，`instance.off` 路径在生产中永远不执行。listener 闭包持有 `handlersRef`（含全部事件 handler）与 `props.node.scope`，清理完全依赖 VTable `release()` 内部解绑——`off?` 类型可选本身说明作者对实例 API 没有把握。若 release 未清理自定义 on 监听（suspect：未验证 VTable 内部行为），loading 往返多次后闭包链累积。
- 影响：D3 泄漏风险，等级取决于 VTable release 行为，标 suspect。
- 修复方向：保存 detach，在两条 release 路径（:129-146 与 :185-200）调用。

## P3 提示

### F-09 FALLBACK_THEME_TOKENS 定义 primary token 但映射层从未使用

- 位置：`packages/flux-renderers-pivot/src/pivot-option.ts:34-39`（定义 `primary: '#0969da'`）、`:355-368`（`mapDesignTokensToVTableTheme` 仅映射 background/foreground/border，primary 丢弃）
- 提示：死配置；选中态/高亮色未接入主题链，深色主题下选中单元格可能回落 VTable 默认蓝色与 token 不符。可删除或在 selectionStyle/activeStyle 中接入。

### F-10 VALID_AGGREGATION_TYPES 等合法值常量在两个文件重复定义，易漂移

- 位置：`packages/flux-renderers-pivot/src/pivot-option.ts:25-32` 与 `pivot-renderer-definitions.ts:5-7`
- 提示：同一份枚举两处维护（cellType/corner 值同理由 definitions 内联数组承担）；新增聚合类型时漏改一处即 validator 与运行时降级逻辑不一致。应从 schemas.ts 单点导出。

### F-11 非法 aggregationType 运行时降级 NONE，与缺省 SUM 行为不一致

- 位置：`packages/flux-renderers-pivot/src/pivot-option.ts:103-111`
- 关键源码摘录：
  ```ts
  } else if ((VALID_AGGREGATION_TYPES as readonly string[]).includes(entry.aggregationType)) {
    aggregationType = entry.aggregationType;
  } else {
    devWarn(`indicator "${field}" aggregationType "${String(entry.aggregationType)}" 非法，降级 NONE`);
    aggregationType = 'NONE';
  }
  ```
- 提示：缺省=SUM、拼错（如小写 `sum`）=NONE。NONE 语义是"不聚合"，透视场景下多维分组会得到任意/末条记录值——同样是错误数据，却不走与缺省一致的 SUM 回退，也无 schemaValidator 之外的阻断。建议统一回退 SUM 或直接拒绝渲染该 indicator。

### F-12 devWarn/console 消息硬编码中文，与同层包英文惯例不一致

- 位置：`packages/flux-renderers-pivot/src/pivot-option.ts:62,74,84,95,100,109,180,190,232,237,253,269`（`dimension 字符串为空，已跳过` 等）、`pivot-renderer.tsx:41,140,170,194`、`pivot-events.ts:51`
- 提示：对照 `flux-renderers-data/src/sparkline-path.ts:47,61`（英文 devWarn），本包开发者日志全中文。非用户可见文案、不违反 i18n check（UI 文案已全部走 `t()`），仅仓库风格不一致，D7 不构成违规。

### F-13 canvas min-height:240px 与 schema height 可配置冲突，小于 240px 时撑破容器

- 位置：`packages/flux-renderers-pivot/src/styles.css:10`（`min-height: 240px`）与 `pivot-renderer.tsx:118-122`（height 任意 number/string，默认 320px）
- 提示：`height: 100` 时容器 100px、canvas 240px，`.nop-pivot` 无 overflow 约束，表格溢出布局。建议 min-height 跟随容器或移除固定下限。

### F-14 杂项低风险（各一句话）

- records 原地 mutate（引用不变内容变）不触发更新：`dataRef.current !== data` 纯引用 diff（pivot-renderer.tsx:179），宿主表达式返回缓存数组并 mutate 时数据不刷新——引用不可变是 React 默认契约，仅提示。
- `exposeInstance` 以 `props.id` 为 window 键：同 id 的两个 pivot 实例（复制 schema 未改 id）互相覆盖、cleanup 时删除他人句柄（pivot-renderer.tsx:73-85）。
- `usePivotTheme` 的 MutationObserver 仅监听 `document.documentElement` 的 `class` 属性（pivot-renderer.tsx:62-64）：host 用 `data-theme`/`style` 切主题或变量挂在 body 时不响应（有注释说明是 `.dark` 先例，设计取舍）。
- LIKE 谓词 `String(row[field] ?? '')`：value 为 null 时 `String(null)==='null'`，会匹配文本含 "null" 的行；大小写敏感无文档说明（pivot-option.ts:218-219）。
- 事件 payload `...raw` 全量透传 VTable args 进 `evaluationBindings`（pivot-events.ts:41-46）：args 含大嵌套对象（cellData/dimensionInfo）时进表达式求值上下文，性能与契约面偏宽。

## 检查过程记录

1. 读 `docs/references/quick-reference.md` 全文，确认 RendererComponentProps 契约、标准 hooks、禁 BEM/裸 HTML 规则、i18n 惯例。
2. `find`/`wc -l` 枚举 `packages/flux-renderers-pivot/src/`：6 实现文件共 1144 行（与任务描述一致），3 个测试文件 excluded。
3. 精读全部 6 个实现文件 + styles.css + package.json + tsconfig.json（noEmit 确认、无 src 内产物）。
4. grep 扫描：`as any`（0 处）；空 catch（仅 `pivot-option.ts:347` 的 `catch { return fallback }` 合法回退模式）；`.reduce(`（0 处——聚合完全委托 VTable）；`console.*`（全部带 `typeof` 守卫，合规）；硬编码中文（仅 devWarn 日志，见 F-12，无 JSX UI 文案）。
5. 反误报验证：i18n key `flux.common.noData`/`flux.common.loadFailed` 在 `flux-i18n/src/locales/zh-CN.ts`、`en-US.ts` 中存在且与 tree/chart renderer 用法一致；`pivot-option.test.ts:264` 确认 filterRules 为纯函数属性（F-01 证据）；`pivot-renderer.test.tsx:270` 确认 loading 往返销毁重建是有测试固化的有意行为（F-04 仍报状态丢失后果）；同层 `sparkline-path.ts` devWarn 为英文（F-12 对照）。
6. 任务重点面核对结论：除零/浮点累计/聚合函数边界、多级分组 key 拼接碰撞、排序稳定性均由 `@visactor/vtable` 内部承担，本包无自研实现（`buildAggregationRules` 仅透传枚举）；包内自研计算面只有 filter 谓词（F-03）与配置归一化（F-06/F-11）；"行列组合爆炸无上限"命中 F-07；"展开/折叠与刷新一致性"命中 F-04。

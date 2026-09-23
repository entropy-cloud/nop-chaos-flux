# [review-b] R2-1d 走查独立复核（复核 agent B，fresh session）

- **日期**: 2026-09-23 ｜ **口径**: `docs/skills/visual-page-quality-inspection-prompt.md` 阶段 3
- **复核方式**: fresh session 先独立取证、后与原发现比对；全部 8 条均重开页面（http://127.0.0.1:4175）、重截同态截图、重跑探针，未采信原文数据。
- **取证落盘**: 探针与原始输出 `_tmp/r2-1d-recheck/*.mjs|*.json`；截图 `_tmp/visual-inspection-2026-09-23/r2-1d-recheck/*.png`
- **总判定**: **8 条全部保留（8 保留 / 0 降级 / 0 驳回）**；其中 2 条（A-40、A-41）的根因归位按本轮取证做了实质性修正，A-47 的"新族候选"确认成立且根因层定位下探一层。

## 汇总表

| #   | 发现                       | 页面                       | 原severity | 复核结论                                      | 关键复核证据（独立取证）                                                                                                       |
| --- | -------------------------- | -------------------------- | ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A-40 Submit 主操作静默失败 | flux-basic                 | P1         | **保留 P1**（根因归位修正）                   | console 实录真实错误 `component<form>:submit does not accept a payload.`；`/api/users` 零请求；rows 3→3；alerts/toasts 全空    |
| 2   | A-41 异步用户名校验无反馈  | flux-basic                 | P1         | **保留 P1**（根因归位修正，升 R2-3 条件成立） | 同一 validate 块的 sync 规则正常渲染错误（minLength/required 均出 field-error），`validate.api` 零请求零错误 → lowering 层丢弃 |
| 3   | B-42 dark 白卡近白字       | flux-basic                 | P1         | **保留 P1**                                   | "Metadata cells" rgb(248,250,252) on bg-white = **1.05:1**；输入文字 1.19:1；截图目视确认                                      |
| 4   | A-47 工具栏 4 控件静默失效 | diff-view                  | P1         | **保留 P1**（族候选确认，根因层下探）         | 5 次控件操作（含 cross-file）后 `data-view` 恒 split、panes=2、lines=50、threeCol=0、fileTabs=0                                |
| 5   | B-48 dark 整页不可读       | diff-view                  | P1         | **保留 P1**（P0/P1 边界注记）                 | `.nop-diff-line` rgb(230,236,243) on 近白底；h1 1.19:1；diff-view.css 651 行 grep dark 覆写 = 0；截图确认整页不可读            |
| 6   | C3-30 page aside 不并排    | layout-family-enhancements | P1         | **保留 P1**                                   | 左实例 aside y=697.5/body y=721.5、右实例 body y=825.5/aside y=881.5，stacked:true、sideBySide:false，与原卡逐像素吻合         |
| 7   | A-51 toggle 后按钮标签滞留 | event-prevention           | P2         | **保留 P2**                                   | uncheck 后页级文字 "preventDefault: false" 已更新、点击 Submit 真实导航（URL 加 `?`），按钮仍 "Switch to allow submit"         |
| 8   | C-53 800px 横溢 324px      | component-handles          | P2         | **保留 P2**                                   | docX=324（scrollW 1124/clientW 800）；SECTION.nop-page 1280 与 800 均 over 14px；截图按钮被截出屏                              |

---

## 逐条复核

### 1. [R2-1d-A-40] Submit Form 主操作静默失败 — 保留 P1，根因归位修正

**原发现摘录**: 提交后表格无新行、无 toast、无错误提示；trace `ok:false`；修复方向猜测"`/api/users` 分支 scopeData 读取"为 fetcher 侧根因。

**独立取证**（`_tmp/r2-1d-recheck/flux-basic-inspect.mjs` → `flux-basic-report.json`）:

- 重演：填 dave/dave@example.com → 点 Submit Form → 等 2s+1.5s：rowsBefore=3、rowsAfter=3、submitLaterRows=3；`[role=alert]/[data-slot=field-error]` 空；toast 容器空；body 不含 "dave"；**`/api/users` 请求 0 条**。
- debugger trace 与原卡一致：`{ok:false,error:{},componentId:'user-form',componentType:'form'}`，`plugin.onError` 与 `root.onActionError` 双双触发。
- **决定性新证据（console 实录）**：`[playground notify] error: component<form>:submit does not accept a payload.`

**根因层定性（本轮任务要求）**:

- **失败面（通用层契约 × demo schema 写法）**: 按钮把 `args:{method:'post',url:'/api/users'}` 作为 payload 传给 `component:submit`；而 form 渲染器发布的 `submit` capability contract **没有 args 字段**（`packages/flux-renderers-form/src/renderers/form-definition.ts` L324-329），payload 在通用层契约校验被拒（`packages/flux-core/src/schema-diagnostics/value-shape-runtime.ts` L155-163 `does not accept a payload`，经 `packages/flux-runtime/src/action-adapter.ts` L532-543 调用）。user-form schema 自身无 `api`/`submitAction` 配置（已核对 fluxBasicPageSchema.json keys）→ 该 demo 里不存在任何能走通的提交路径。**原卡"fetcher scopeData 读取"假设被证伪——fetcher 根本未被调用**（请求 0 条）。
- **静默面（页面 env 层）**: `env.notify('error',…)` **确实被通用层调用了**（上面 console 行即页面 env 的 notify 实现打的）；但 `apps/playground/src/pages/flux-basic-page.tsx` L190-196 的 notify 对 success 直接 return、其余只 `console.info`，页面又没有挂任何 toast 宿主 → 用户侧零反馈。flux 的错误管道（plugin.onError、onActionError）本身是通的。
- **结论表述**: 静默 = 页面 env；提交失败 = 通用层 payload 契约拒绝（触发器是 demo schema 的 AMIS 风格 `args` 写法）。修复方向修正为：① demo schema 改用 form `submitAction`/去掉 args；② 页面 env notify 接 toast。**保留 P1 不变**（参照页主路径静默失败，A9 成立）。

### 2. [R2-1d-A-41] 异步用户名唯一性校验无任何反馈 — 保留 P1，根因归位修正（升 R2-3 条件成立）

**原发现摘录**: 输入已存在用户 alice、远超 debounce+delay 后无任何错误文案；field-error span 未渲染；归族条款"若根因落在 flux-form 通用层则升 R2-3"。

**独立取证**（`_tmp/r2-1d-recheck/flux-basic-validation-inspect.mjs` → `flux-basic-validation-report.json`）:

- **差分实验**：同一 username 字段、同一 `[data-slot=field-error]` 通道——
  - minLength 同步规则：输入 "ab" blur → 错误渲染（"Username至少需要3个字符"）；
  - required 同步规则：清空 blur → "Username不能为空"；
  - `validate.api` 异步规则：输入 "alice" blur 等 3.5s → alerts 空、`/api/validate-username` 请求 **0 条**、正文无 taken/available 字样。
- **定性**：field-error 显示层与触发链（blur）都是好的；`validate.api` 这条规则**从未进入执行**——不是"结果没显示"也不是"表达式取值失败被吞"。
- **根因定位（通用层）**: 规则 lowering 只认 `validate.action`——`packages/flux-renderers-form/src/renderers/input.tsx` `createFieldValidation()` L415-421 仅当 `schema.validate.action` 存在时产出 `{kind:'async'}` 规则；`packages/flux-compiler/src/validation-lowering.ts`（collectSchemaValidationRules）对 `api`/`debounce` **零分支**（grep 0 命中）。demo schema 用的正是 AMIS 风格 `validate:{api:{...},debounce:500}` → 该键被静默忽略，不产出任何规则。运行时的 async 执行器其实存在（`flux-runtime/src/form-runtime-validation.ts` L329-362 有完整 async 分支），只是永远等不到规则。
- **结论**: **保留 P1**；归族按原条款**确认升 R2-3 通用层**（AMIS 风格 `validate.api` 不被 lowering 支持，静默吞掉）。页面 env 无责（fetcher 分支存在且正确、从未被调）。

### 3. [R2-1d-B-42] dark 下白底 demo 卡片近白文字 1.06:1 — 保留 P1

**原发现摘录**: 两张 schema 卡保持纯白底，卡内标签与输入文字已切 dark 前景，白上白不可读（≈1.06:1）。

**独立取证**（同 flux-basic-inspect.mjs 第三段；截图 `flux-basic-dark-white-cards.png`）:

- `data-mode=dark` 下："Metadata cells" span `rgb(248,250,252)` on `bg-white`(255,255,255) = **1.05:1**（与原卡 1.06 差异为舍入）；"Reviewers" 同 1.05:1；卡内 input `rgb(230,236,243)` = **1.19:1**。
- 卡根 class 实测：`nop-container p-5 rounded-[18px] bg-white border border-gray-200 shadow-sm` — schema 字面 `bg-white` 坐实。
- 截图目视：卡内标签/输入呈"幽灵字"，不可读；卡标题（深色 oklch(0.21…)）仍可读。
- **结论**: **保留 P1**。R2-4 dark 平价族（schema 字面色）实例成立。

### 4. [R2-1d-A-47] 演示工具栏 4 控件全部静默失效 — 保留 P1；"schema 动态传播失效"新族候选确认，根因层下探

**原发现摘录**: Mode/View Type/Inline Diff/Line Numbers 操作后渲染面零变化；`data-view` 恒 split；根因指向 SchemaRenderer 挂载后 schema prop 变更未达已编译渲染树（猜测 CompiledSchemaTree useMemo 链）。

**独立取证**（`_tmp/r2-1d-recheck/diff-view-inspect.mjs` → `diff-view-report.json`；截图 viewtype-unified / inlinediff-off / mode-threecol / mode-crossfile）:

- baseline：dataView=split、panes=2、lines=50、inlineMarkers=5。
- View Type→unified 等 1.2s / Inline Diff off / Line Numbers off / Mode→three-column 等 2.5s / Mode→cross-file 等 2s：**五次快照逐字段全等**——dataView 恒 split、lines 恒 50、threeCol=0、fileTabs=0、lineNumbersShown 恒 true。失效坐实且比原卡多覆盖 cross-file 一态。
- **与 A-51 是否同根因（族候选核实）——成立，但归因修正**：
  - 原卡猜测的 `CompiledSchemaTree` useMemo 链**不成立**：`packages/flux-react/src/schema-renderer.tsx` L80-87 依赖数组含 `props.schema`（每次 toolbar 操作 schema 都是新对象 identity，重编译必然发生）；runtime 层（runtime-factory.ts L269-271）与编译器入口均未见按 schemaUrl 的结果缓存。
  - 本轮定位到的可疑层在**节点 props 解析层**：`packages/flux-react/src/node-renderer-resolved.tsx` L87-115 —— `propsProgram.kind==='static'` 的节点 `isStatic=true`，订阅被替换为 no-op（`subscribe` 不监听任何变化）；L121-133 解析结果经 `resolvedProps.value` 恒等门控。四个工具栏属性（viewType/showInlineDiff/showLineNumbers + 换 schema）与 A-51 的按钮 label 全是**静态标量 prop**——该层不重新解析即表现为此两种症状。
  - 两个页面的两种表现由此统一解释：diff-view = 纯静态 props，零传播；event-prevention = label（静态 prop）滞留，而 action 的 preventDefault 在点击时从 action 层取值（已刷新）→ 行为生效。族确认：**"schema prop 动态变更对静态 props 节点不传播"**，精确定位留给修复批次（建议探针：给 NodeRendererResolved 注入 props.node 变更日志对照）。
- **结论**: **保留 P1**（demo 主控面板整体失效，功能面=0）；族候选成立，归 R2-3，修复方向按上述层位修正。

### 5. [R2-1d-B-48] dark 模式整页不可读 — 保留 P1

**原发现摘录**: diff css 651 行 token 无 dark 覆写 + 页面 chrome `bg-white`/`bg-gray-50`，行文字/工具栏/标题白底白字。

**独立取证**（diff-view-inspect.mjs 第二段；截图 `diff-view-dark.png`）:

- `.nop-diff-line` color `rgb(230,236,243)`（dark token）；h1 `rgb(230,236,243)` on `bg-white` = **1.19:1**；工具栏 bg `oklch(0.985 0.002 247.839)`（≈#f9fafb）叠浅灰文字 ≈1.1:1；del 行底 `oklch(0.96 0.03 25)` 恒亮。
- `packages/flux-renderers-content/src/diff-view/diff-view.css`：**651 行，grep `data-mode|.dark|prefers-color-scheme` = 0 命中**——"无 dark 覆写"坐实。
- 截图目视：正文、行号、工具栏标签、页标题全部近乎不可见，页面级失效。
- **结论**: **保留 P1**。注记：按口径严重度表"dark 下正文不可读"是 P0 示例，本条处于 P0/P1 边界；考虑其为 demo 页维持原判 P1，汇总批时可统一裁量。

### 6. [R2-1d-C3-30] page 渲染器 aside 不与 body 并排 — 保留 P1

**原发现摘录**: aside 与 body 为上下整宽块；asidePosition 仅改堆叠顺序；几何 aside{y:698}/body{y:722}、body{y:826}/aside{y:882}；根因 page.tsx 无 row 包裹层 + `.nop-page` 纵向 flex。

**独立取证**（`_tmp/r2-1d-recheck/p2-family-inspect.mjs`；截图 `layout-page-aside-light.png`）:

- 重测几何：左实例 aside {x:147,y:697.5,w:986} / body {x:147,y:721.5,w:986}；右实例 body {y:825.5} / aside {y:881.5}；两实例 `stacked:true, sideBySide:false`。**与原卡数值逐像素吻合**（698/722、826/882）。
- 截图目视："侧边栏 aside（left）"整宽文本行压在"主内容区 body"上方；右实例 aside 落到 body 下方——"侧边栏从未出现在侧边"成立。
- **结论**: **保留 P1**（特性级：asidePosition 唯一可见差异是上/下，侧栏布局不可搭建；单点缺陷，建议优先排期，维持原归族 R2-4）。

### 7. [R2-1d-A-51] Demo1 toggle 后按钮标签滞留 — 保留 P2

**原发现摘录**: 关闭 preventDefault 后页级文字变 false、行为放行（导航发生），按钮仍 "Switch to allow submit"；与 A-47 同根因。

**独立取证**（p2-family-inspect.mjs 第二段；截图 `event-prevention-after-uncheck.png`）:

- uncheck 等 1.5s：页级状态文字 `preventDefault: false`、checkbox false；按钮仍 **"Switch to allow submit"**（schema L127 定义此时应为 "Switch to prevent submit"）。
- 点击 Submit：URL `#/event-prevention` → `?#/event-prevention`，**原生提交真实放行**——行为绑定已更新、渲染文本未更新，与原卡完全一致。
- 同根因判断：本轮在 A-47 条目已给出统一解释（静态 label prop 不重解析、action 层取值已刷新），**"与 A-47 同根因"由假设升级为有机制支撑的判断**（精确断点留修复批）。
- **结论**: **保留 P2**；归族 R2-3 与 A-47 合并，成立。

### 8. [R2-1d-C-53] 800px 视口 324px 横向溢出 + 1280 下 14px 内溢 — 保留 P2

**原发现摘录**: 800px docX=324（SECTION.nop-page / MAIN `min-h-screen grid place-items-center p-6` 同链）；1280 clipX 14px；R2-3c 族最重实例。

**独立取证**（p2-family-inspect.mjs 第三段；截图 `component-handles-800x900-light.png`）:

- 800×900：`docX=324`（scrollW 1124 / clientW 800）；溢出链实测 `MAIN.min-h-screen grid place-items-center p-6` → `SECTION.max-w-[1100px] w-full p-10`（1098px 固定内容宽）；`SECTION.nop-page` over 14px。
- 1280×800：docX=0，但 `SECTION.nop-page` 及按钮行容器 over 14px（overflow visible，计算内溢）——与原卡一致。
- 截图目视："Move Reviewer…"/"Move Entry 0→+1…" 按钮被截出右缘，必须横滚才能触达。
- **结论**: **保留 P2**；R2-3c"窄视口 flex/固定壳层"族最重实例的定位成立（324px >> flux-basic 61px）。

---

## 复核附注

1. **原发现质量**: 8/8 全部复现成立，无降级无驳回；两条（A-40、A-41）根因猜想被本轮证伪并已修正（A-40 fetcher 假设、A-41 "requestAdaptor 取值失败被吞"假设），均朝"更通用层"归位——对 R2-3/R2-4 批的修复排布有实质影响。
2. **A-47 新族候选**: 确认升格为族发现，且与 A-51 合并的判断由本轮机制证据支撑；建议族名定为"schema 动态变更对静态 props 节点不传播（node-resolved 层）"，修复批先写复现探针再动代码。
3. **严重度边界注记**: B-48（dark 正文不可读）按口径字面触 P0 示例、C3-30（默认配置特性不可用）亦近 P0 示例；本轮均维持原判 P1，留汇总批统一裁量（demo/参照页定位是主要保留理由）。
4. **复核产物**: 探针 4 个（flux-basic-inspect / flux-basic-validation-inspect / diff-view-inspect / p2-family-inspect）、原始 JSON 3 份、同态截图 10 张，均在 `_tmp/` 下，未入任何 tracked 目录。

# R2 第 8 轮递归扩展发现（round-08-g2，收敛终判轮·G2 组最后一轮）

> 组号: G2（form / form-advanced） · 轮次: Round 08（收敛终判轮，最严格价值判据，G2 组最后终判） · 审查日期: 2026-08-29 · agent: general（fresh session，只读审查） · HEAD `0f183874a`（与前 7 轮一致，代码无漂移）
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md`；输入清单 = `round-01.md`（Grep `\[G2-` 精读 19 条）、`round-02-compact.md`（全文 8 条）、`round-03-compact.md`（全文 3 条 + 去重备忘 2 项）、`round-04.md`（Grep `\[G2-` 精读 3 条）、`round-05-g2.md`（全文精读，含"核对过不立案"清单与收敛声明）、`round-06-g2.md`（全文精读，含 8 项弃报留档）、`round-07-g2.md`（全文精读，含 7 项弃报留档与引根声明）；`dedup-baseline.md` §1–§4 强制生效；累积已知发现 276 条（G2 组 38 条）
> 终判口径: 仅立案"前 7 轮所有方法面都未触及的全新根因 + 真实用户影响检验 + 与 276 条逐根因比对为全新"的条目；新实例须注明引根且修复互不覆盖。已有根因复述、纯视觉偏好、零散细节、已弃报候选翻案（无新事实）一律不立案。

---

## 发现（HIGH 0 / MEDIUM 0 / LOW 0，共 0 条）

## 零发现报告

### 检查范围

**本轮实际读取/核查的文件**（前 7 轮全部方法面清单之外可枚举的残余面，逐一定性）：

- `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`（全文 304 行精读：受控键入/精度/clamp/长按步进/aria 门禁面）
- `packages/flux-renderers-form/src/renderers/date/date-field-control.tsx`（全文 387 行精读：trigger 形态/时间子输入/steppers/清除通道/min-max 钳制）
- `packages/flux-renderers-form/src/renderers/fieldset.tsx`（全文：折叠触发器本体——CollapsibleTrigger/legend、focus-visible ring、aria-controls、chevron 方向）
- `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`（:160-313：viewMode 三态模型、工具栏 flex-wrap、preview 注入链）
- `packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx`（:205-225：loading/error/空态分支呈现）
- `packages/flux-renderers-form/src/renderers/form.tsx`（submitting 面：提交通道/重入守卫/submitting 消费点定位）
- `packages/flux-renderers-form/src/renderers/textarea-renderer.tsx` + `input.tsx`（计数器/clearable/maxLength 一致性矩阵）
- `packages/flux-renderers-form/src/renderers/shared/label.tsx`（必填标识通道）
- `packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx` / `button-group-select-renderer.tsx` / `input-choice-renderers.tsx` / `use-dict-options.ts` / `use-select-remote-search.ts` / `select-combobox-lists.tsx`（loading/errorMessage 消费矩阵全类排查）
- `packages/flux-renderers-form-advanced/src/combo-renderer.tsx`（:140-229）/ `input-table-row.tsx`（:180-275）/ `composite-field/array-field.tsx` + `composite-field/remove-when-gating.ts`（reorder/remove 供龄与门禁面）
- `packages/flux-renderers-form-advanced/src/tree-option-list.tsx`（:1-130：roving 行结构、chevron Button + handleChevronKeyDown 键盘展开面、lazy Spinner、Empty 空态）
- `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx`（全文 555 行）+ `field-select.tsx`（全文）+ `operator-select.tsx`（全文）（R7 未显式点名的内层编辑器三文件，本轮闭合）
- `packages/flux-renderers-form-advanced/src/editor-renderer.tsx` + `form/src/renderers/markdown-editor-renderer.tsx` 工具栏（原生对话框家族与窄容器 flex-wrap 面grep）
- 两包全量 grep 矩阵: `window.confirm|alert|prompt`（原生对话框家族查全类）、`draggab|sortable|reorder`（拖拽排序面查全类）、`errorMessage`（错误通道消费查全类）、`maxLength|showCounter`（计数器一致性）、`ArrowRight|ArrowLeft`（树键盘展开）

**声明不重审的前轮已闭合方法面**（20 项，见派发指令）: 12 视角初扫、disabled/readOnly 全写入通道、async 竞态、maxItems/maxSelected/maxItemsPerGroup 门禁族三通道、聚焦首错辅助、折叠 fieldset 校验、步进控件、富文本工具栏与锁定态、period 门禁、移动 sheet、草稿弹层脏态守卫、input-suggest、condition-builder 容量/键盘面、icon-picker 全态、transfer 全表面、button-group-select、input-file/image、detail-field 确认链、FieldFrame 标签关联、roving focus 模型。本轮对上述面仅做"同族查全类"级别的交叉 grep，未发现未被前轮覆盖的新实例。

### 检查方法

1. **残余面枚举**: 从 R5 收敛声明 + R6/R7 弃报留档反推 20 个已闭合方法面，对两包文件清单逐一核对"是否曾被任何轮次作为方法面审视"，列出残余候选面（计数器一致性、legend 必填标识、reorder 供龄、原生对话框家族、工具栏窄容器、非法输入处理、树键盘展开、远程/字典 loading 与 error 通道、fieldset 触发器、markdown viewMode、condition-builder 内层编辑器、提交忙态）——逐一深挖。
2. **同族查全类**: 对每个候选根因做跨文件 grep 矩阵（如 errorMessage 消费方在 select/radio/checkbox/button-group/tree/mobile 六通道逐一核对），确认"干净"结论是全类结论而非单点结论。
3. **终判去重双通道**: 276 条逐根因比对 + dedup-baseline §1–§4 逐条检查 + R6/R7 弃报留档翻案审查（无新事实不翻案），确认本轮无任何候选越过立案门槛。

### 弃报留档（本轮核查过、经终判口径不立案的候选，防复核重复提问）

1. **input-number 受控 `type="number"` 键入中间态**（`input-number-renderer.tsx:223-258`，`value={number}` 受控 + `Number(raw)` 解析）: 小数（`1.`）与负号（`-`）键入的中间态在浏览器 number input sanitize 下 `target.value === ''`，理论上存在被受控回写吞没、小数/负数无法键入的风险（React 经典 controlled number input 问题）。**但**该行为取决于浏览器 sanitize 与 React DOM 受控 restore 的交互（`node.value === ''` 与期望 `''` 相等时 React 跳过回写），静态审查不可定案，不满足质量门槛①（证据非推断）；如需立案须先以 Playwright 逐键入断言取证。本轮不立案，留档供运行时验证。
2. **key-value 允许空 key 行**（添加行后 key 可暂空再编辑）: 数据语义边缘，编辑即可修复，无静默数据破坏，低于终判门槛。
3. **form 提交按钮无自动 busy 绑定**: `$form.submitting` 为文档化的 opt-in schema 绑定（R4 已注明为典型用法），提交按钮视觉忙态由作者绑定决定；Ant Design 同为作者侧绑定 loading，非行业惯例偏离，非渲染器一致性缺陷。
4. **MultiSelectInput 的 `opacity-0` NativeSelect 触发器**（`condition-builder/value-input.tsx:397-399`）: dedup §3 误报对照 1 明示不报的 shadcn 标准模式。
5. **operator-select 单操作符时渲染静态 span**: 单选项无选择余地的合理呈现，非缺陷。
6. R6/R7 弃报留档 15 项（date-range presets 门禁复核、tag-list 空态、黄色高亮、竞态面复核、variant-field、input.tsx 面、picker-dropdown 外点丢弃、detail loading 通道、input-table aria-label、key-value maxItems 静默、transfer 单选、condition-group 悬空 aria、transfer 搜索清除、truncate 无 Tooltip、icon-picker 性能面）——逐一复核，均无新事实，维持弃报。

### 去重自检声明

本轮**零立案**，无新条目需要比对；上述 6 项弃报候选均已与 276 条既有发现按根因比对（第 1 项若将来取证成立，与 [G2-R2-视角8-01]（步进触达尺寸）、[G1/G2] 受控输入族无同根因先例；第 3 项与 [G2-视角5-03]（autoLoad 无 loading）机制不同）；dedup-baseline §1（ma5-ux 已修复 6 条）无交集、§2（已登记缺口 16 项）无表象撞车、§3（误报对照 8 条）第 4 项按明示规则不报、§4（维度 09-12 与全量 WCAG）不涉。

## 结论

**未发现新的高价值问题。审查结束。**

G2 组累计（R1–R8）: 19 + 8 + 3 + 3 + 2 + 1 + 2 + 0 = **38 条**；全审累计 **276 条**（R8 零新增）。前 7 轮 20 个方法面 + 本轮 12 个残余候选面全部闭合，残余候选中唯一具备理论风险面的 input-number 受控键入中间态因静态不可定案留档（见弃报留档 1）。**G2 组（form / form-advanced）R2 审查正式收敛。**

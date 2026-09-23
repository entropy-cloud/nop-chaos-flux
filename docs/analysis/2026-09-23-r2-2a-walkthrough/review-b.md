# [review-b] R2-2a 批一（form 22 卡 + form-advanced 19 卡）独立复核（复核 agent B，fresh session）

- **日期**: 2026-09-24 ｜ **口径**: `docs/skills/visual-page-quality-inspection-prompt.md` 阶段 3
- **复核人**: plan 496 Phase 2 独立复核 agent B（与走查执行者无共享上下文）
- **环境**: dev server `http://127.0.0.1:4175`（curl 200）；Playwright 1.63 chromium；dark 一律显式 `document.documentElement.setAttribute('data-mode','dark')`（emulateMedia 无效，沿用 R2-2a-B5-34 结论）
- **范围**: P2 ×5 全查（B1-40、A9-42、A9-82、F4-102、A3-103）+ P3 抽样 ×8（A9-41、A2-44、A9-47、A9-60、F4-80、A4-101、E5-105、A7-84），共 13 条
- **复核方式**: 全部 13 条均重开页面、重截同态截图、重跑探针（探针 `_tmp/r2-2a-review/rb*.mjs`，原始 JSON `rb-*.json`，截图 `_tmp/r2-2a-review/rb/<control>/`），先独立取证、再与原发现比对；根因逐条下探至源码行级（校验类三条先查 `docs/references/quick-reference.md` 的 ValidationScopeRuntime/FormRuntime 契约再读源码）。未采信任何原文数据。
- **总判定**: **13 保留 / 0 降级 / 0 驳回**；其中 3 条（B1-40、A9-42、A9-60）的**根因/量化数据按本轮取证做了实质修正**（详见逐条），2 条（A9-41、F4-102）根因位置精化。另发现"走查 fixture 契约外键名静默失效"家族性结论（见 §附注 1）。

## §0 汇总表

| #   | 发现 id      | 控件                | 原判级 | 独立取证结果                                                                | 结论                        | 备注                                                                                        |
| --- | ------------ | ------------------- | ------ | --------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | R2-2a-B1-40  | button-group-select | P2     | 选中态对比度实测 **dark 4.16–4.18:1 / light 3.66:1**，双主题均 <4.5         | **保留 P2（数据修正）**     | 原卡 "dark 3.15 / light 4.46" 未合成 0.85 alpha，方向反了                                   |
| 2   | R2-2a-A9-42  | checkbox-group      | P2     | 5/5 可选、无钳制、0 选中提交 `$form.valid:true` 复现                        | **保留 P2（根因两层修正）** | 契约键是 `minSelected/maxSelected`（已实现+单测）；fixture 用了契约外 `minSelect/maxSelect` |
| 3   | R2-2a-A9-82  | array-field         | P2     | 空 required 行提交 invalidCount 0、零错误复现                               | **保留 P2（根因行级定位）** | `getChildFieldPathPrefix→false` 致编译期不下潜 + 投影源为空                                 |
| 4   | R2-2a-F4-102 | picker              | P2     | 确认后 chip/标签均裸 id（"u2"/"u1,u3"），rows 内 title 齐备                 | **保留 P2（根因精化）**     | Confirm 只缓存 pick 通道行，scope 发布通道不进 labelCache                                   |
| 5   | R2-2a-A3-103 | picker              | P2     | 移除钮 12×12、chip 13.4×16、`::after content:none` 复现                     | **保留 P2**                 | 与原卡逐像素吻合                                                                            |
| 6   | R2-2a-A9-41  | checkbox            | P3     | `aria-describedby:null`、`aria-required:null`、aria-invalid:true 复现       | **保留 P3（修复位精化）**   | 修复位在 input-choice-renderers.tsx CheckboxRenderer，非 input.tsx                          |
| 7   | R2-2a-A2-44  | fieldset            | P3     | legend 884×29 全宽、2px ring、rounded-sm 复现                               | **保留 P3**                 | fieldset.tsx L87 环挂在全宽 legend 本体                                                     |
| 8   | R2-2a-A9-47  | input-month         | P3     | fill 2023-05 → 2024-01，`min/max=null`、零反馈复现                          | **保留 P3**                 | 与 A9-42/A9-60 **不同根因**（见 §附注 1）                                                   |
| 9   | R2-2a-A9-60  | input-password      | P2     | mismatch 提交零错误、`$form.valid:true`；minLength 对照组正常               | **保留 P2（根因修正）**     | `validations[]` 全栈 0 消费者；契约等价物 `equalsField` 已支持                              |
| 10  | R2-2a-F4-80  | condition-builder   | P3     | 触发器 "eq▼"、下拉项 `["eq","neq"]`/`["eq","gt","lt","gte","lte"]` 裸键复现 | **保留 P3**                 | operators.ts L141/L163 `?? op` 回退                                                         |
| 11  | R2-2a-A4-101 | input-table         | P3     | readOnly 行 border/bg 与可编辑行 computed 全等复现                          | **保留 P3**                 | readOnly 仅作用交互不作用呈现                                                               |
| 12  | R2-2a-E5-105 | object-field        | P3     | object-field-body 与 array-field-item x=301/w=918 全等、borderLeft 0        | **保留 P3**                 | body div 零类零包裹（object-field.tsx L494）                                                |
| 13  | R2-2a-A7-84  | editor              | P3     | 原生 `prompt("请输入链接地址")`、域内弹层 0、unsafe 拒绝有效复现            | **保留 P3**                 | owner-doc 已裁定 prompt（design.md L89），非 drift                                          |

---

## 逐条复核

### 1. [R2-2a-B1-40] dark 选中态白字对 `--primary` 亮蓝底 — 保留 P2，量化数据与方向修正

**原发现摘录**: dark 选中态白字 3.15:1；light 4.46:1 亦压线；归因 `--primary` dark 过亮。

**独立取证**（`rb1-p2-bgs-checkboxgroup.mjs` + `rb1b/rb1c-pixeltruth` → `rb-1c-p2-b1-40-pixeltruth-v2.json`；截图 `rb/button-group-select/rb-{light,dark}-pixelcheck*.png`）:

- dark（真 data-mode）选中底 `oklab(0.651694 -0.0306804 -0.165621 / 0.85)`——原卡与此一致；**该底是 0.85 半透明**，对比度必须对真实 backdrop 合成。以渲染像素采样（截图 canvas 逐像素，中位数底色）：dark 选中底 **rgb(69,123,213)**，白字 **4.16:1**（s2 实例 4.18:1）；light 选中底 **rgb(61,131,243)**，白字 **3.66:1**。
- 令牌实测：light `--primary: 217 89% 53%` / dark `217 89% 63%`（`packages/theme-tokens/src/styles.css` L131/L191），`--primary-foreground` 双主题均为白。
- 原卡数值反推：3.15 ≈ 白字对 **纯色**（未合成）dark 底；4.46 ≈ 白字对 **纯色** light 底——两数都没合成 `aria-pressed:bg-primary/85` 的 0.85 alpha。

**根因链（行级）**: `button-group-select-renderer.tsx` L113 选中走 Button `variant='default'` → `packages/ui/src/components/ui/button.tsx` L17/L22 `bg-primary text-primary-foreground … aria-pressed:bg-primary/85` → 主题令牌 L131/L191。

**结论**: **保留 P2**。缺陷真实（核心交互态 WCAG 1.4.3 不达标）且**比原卡更广：light 3.66:1 比 dark 4.18:1 更差，双主题都不达标**。归族 R2-4 修正表述：不是单纯"dark `--primary` 过亮"，而是"白字 primary 实底选中态在双主题下均 <4.5:1，`/85` alpha 叠加使 light 侧从纯色 4.46 恶化到 3.66、dark 侧从 3.15 改善到 4.18"。修复方向相应扩为：① 双主题 `--primary`（或选中态前景对）按合成后对比度重新标定；② 评估选中态去 `/85` alpha（data-active/aria-pressed 满透明可回收纯色对比度）。dark 分支单降 L 的原修复方案不充分。

### 2. [R2-2a-A9-42] checkbox-group min/max 不生效 — 保留 P2，根因两层修正（原"未接线"表述证伪）

**原发现摘录**: `minSelect:2/maxSelect:4` 完全不生效：超选不钳制、不足提交无错误、无 limit 提示；修复方向为"接线 minSelect/maxSelect 到 form 校验规则"。

**独立取证**（`rb1` checkbox-group 段 → `rb-1-p2-bgs-checkboxgroup.json`；截图 `rb/checkbox-group/rb-overmax-light.png`、`rb-zero-submit-{light,dark}.png`）:

- 5 连选全部成功（`aria-checked` ×5 true）、无任何 disabled、`[data-slot=checkbox-group-limit-hint]` 不存在、回显 "Selected: ts, react, node, postgres, docker"。
- 全清后 Submit：fieldErrors/alerts/aria-invalid 全空，`$form = {hasErrors:false, errorCount:0, valid:true}`，双主题一致。**表面行为与原卡完全一致。**

**根因（两层，原卡的"渲染器未接线"判定被证伪）**:

1. **fixture 键名在契约外**：渲染器**已完整实现** min/max——`checkbox-group-renderer.tsx` L49-125（达上限拒绝勾选+提示 L87-93、低于下限阻止取消+提示 L96-100、checkAll 钳制 L106-125），消费键为 `minSelected/maxSelected`；契约声明 `schemas.ts` L177-179（`CheckboxGroupSchema`）、prop 白名单 `input.tsx` L612-613；行为有单测锚点 `__tests__/checkbox-group-limit-feedback.test.tsx`。lab fixture 写的是 AMIS 风格 `minSelect/maxSelect`（`checkbox-group-lab-page.tsx` L40-41）——该键不在 `CheckboxGroupSchema`、不在 prop 白名单，被 prop 解析层**静默丢弃**，于是连"阻断+提示"都不存在。owner-doc `docs/components/checkbox-group/design.md` L23/44/66/91 记录的正是 `minSelected/maxSelected` 契约且 L91 明确裁定"未采纳『允许低于下限但触发校验错误』"——**文档与代码一致，漂移在 fixture 侧**。
2. **渲染器真实缺口（保留 P2 的依据）**：即使用对键名，min 只有"阻止取消"通道——从初始 `[]` 勾 1 项（勾选不受 min 阻断，L86-94 只查 max）后可直接提交，**min 数在提交面仍静默通过**；且未知约束键被静默忽略、schema 诊断层无任何告警。

**结论**: **保留 P2**（修正后表述："契约外键名静默失效（fixture）+ min 数提交面无校验（渲染器）+ 未知键无诊断（平台）"三层）。修复方向改判：① fixture 改 `minSelected/maxSelected`（一词修复，超选钳制/提示立即生效）；② 渲染器补 min 数提交校验规则；③ schema 诊断对未声明约束键发 warning（该通道可与 A9-60/R2-1d-A-41 同批收口，见 §附注 1）。归族由 R2-3"表单 AMIS 契约缺口"维持，但实例定性从"声明未消费"修正为"键名契约错位 + min 校验缺口"。

### 3. [R2-2a-A9-82] array-field required 行级校验提交不触发 — 保留 P2，根因行级定位（原修复方向修正）

**原发现摘录**: 空 name/email 行提交零错误反馈，`$form.valid:true`；缺口在"复合行字段校验规则传播/触发"；修复方向"把 required 规则传入行 scope 的验证所有者（对齐 projected-validation-runtime.ts 通道）"。

**独立取证**（`rb2-p2-arrayfield-picker.mjs` → `rb-2-p2-arrayfield-picker.json`；截图 `rb/array-field/rb-empty-row-submit-light.png`）:

- "添加项"→ 空 required 行 → Submit：`invalidCount:0`、fieldErrors/alerts 空、`$form={hasErrors:false,errorCount:0,valid:true}`；root scope 仅 `contacts` 键。**复现成立。**
- 对照（同探针）：object-field 平铺 required（S1 场景）提交错误正常渲染（走查卡 A9 pass + 本轮 object-field 探针 `required-error` 态确认），通道可用性差异坐实。

**根因链（行级，比原卡"传播缺口"下探两层）**:

1. `composite-field/array-field.tsx` L584-586 `getChildFieldPathPrefix(){ return false; }` → 编译期校验收集在 `flux-compiler/src/schema-compiler/validation-collection.ts` L149-151（`childPrefix === false → return`）**停止下潜 item region**；item 内 `input-text required` 的 `{kind:'required'}` 规则从未进入 form 编译模型。
2. L587-589 `collectRules()→[]`——array 节点自身零规则。
3. 运行期投影所有者 `createProjectedValidationRuntime`（array-field.tsx L116-130 → `detail-view/projected-validation-runtime.ts` L36-88）**只投影父模型中已存在的节点**（L47-49：`nodeEntries.length===0 → return undefined`）——父模型没有 `contacts.<i>.*` 节点，投影恒为空。
4. 对照组 object-field 为什么好：`object-field.tsx` L525-527 `getChildFieldPathPrefix` 返回字段名 → 编译期正常下潜 body → `address.street` required 入模型 → 提交校验生效。
5. 原修复方向"对齐 projected-validation-runtime 通道"**不成立**：该通道已接且为空——真正缺口是**动态 item 的规则从未被编译/合成**（编译期定长模型天然装不下运行期变长 item，需要 item 挂载时按行 scope 合成规则或提交时按 item schema 现场编译聚合）。

**结论**: **保留 P2**（校验静默失败 + fixture intro 自称 "per-item validation"，承诺与行为不符）。归族 R2-3 维持；建议修复单以"array-field object-mode item 校验规则运行期合成"立项，复现探针直接复用本轮 `rb2`。

### 4. [R2-2a-F4-102] picker 选中回显裸 id、labelField 未生效 — 保留 P2，根因精化

**原发现摘录**: 确认后 chip 显示 "u2"，候选行展示 Bob；`selectedLabel` 依赖 `rawFieldValue[labelField]` 但提交写入 valueField 标量。

**独立取证**（`rb2` picker 段 + `rb2d` → 截图 `rb/picker/rb-s1-value-set-light.png`、`rb-s2-tags-light.png`）:

- S1 确认后 `triggerText/label = "u2"`，scope `owner:"u2"`，`$_picker.rows=[{id:'u1',title:'Alice'},{id:'u2',title:'Bob'},{id:'u3',title:'Carol'}]`——label 数据齐备、显示裸 id，截图目视与程序化一致。S2 tags `["u1","u3"]` 同险。**复现成立。**

**根因（精化）**: `picker-renderer.tsx` Confirm 处理器**确实会把 pendingRows 写入 `resolvedLabelCache`（L345-355）**——但只覆盖 **pick action 累积通道**（`handlePick` L426-464 L440-442 填 `pendingRowsRef`）；fixture 走的是 **scope 发布选择通道**（crud `selectionStatePath:$_picker.selection`，Confirm L363-380 从 `publishedRowMap` 取行）——该通道只 `rows.set(...)` 进本次提交值，**不写 labelCache、不进 selectionRows**，回显 memo（L191-221）四分支全部落空（rawFieldValue 是标量、无 labelTpl、labelCache 空）→ `resolveSelectedLabel` 兜底渲染裸 id。

**结论**: **保留 P2**。原卡"L190-221 回显分支拿不到 record"成立；修复落点比原卡更精确：Confirm 处理器 L345-355 处把 `publishedRowMap` 一并写入 `resolvedLabelCache`/`selectionRows`（单点补丁），或回显分支兜底从 `$_picker.rows` 解析。归族 R2-4 local 维持。

### 5. [R2-2a-A3-103] 多选标签移除钮 12×12 — 保留 P2

**原发现摘录**: 移除钮 12×12、tag chip 13×16，无伪元素命中扩展。

**独立取证**（`rb2d-tag-targets.mjs` → `rb-2d-p2-a3-103-tag-targets.json`；截图 `rb/picker/rb-s2-tags-light.png`）:

- smallTarget 扫描：`picker-tag-remove` **12×12**（×2）、tag chip **13.4×16**（×2）；对照 `picker-clear` 28×28、`picker-trigger` 58×28。
- 伪元素核查：remove 钮与 chip 的 `::after` 均 `content:none`（position static、无 inset）——**无命中扩展**，与原卡 `rmPseudo` 结论一致。
- 源码 `picker-renderer.tsx` L553-563：`picker-tag-remove` 为裸 `<button>` 包 `<XIcon className="size-3"/>`（12px 图标=按钮几何），无 `after:-inset-*`。

**结论**: **保留 P2**（移除已选值是值管理常规操作，12×12 触屏不可用）。修复方向（`after:-inset-*` 扩展或提到 `size-5`+扩展）与原卡一致；归族 A3 小目标族（R2-4）维持。

### 6. [R2-2a-A9-41] checkbox 错误文案未 aria-describedby 关联 — 保留 P3，修复位精化

**原发现摘录**: 错误后 span[role=checkbox] 有红边红环 + aria-invalid，但 `aria-describedby:null`；修复方向指 `input.tsx` checkbox 分支。

**独立取证**（`rb3-p3-a.mjs` → `rb-3-p3-a.json`；截图 `rb/checkbox/rb-error-state-light.png`）:

- 空提交后：`span[role=checkbox]` `aria-invalid:"true"`、`borderColor:rgb(239,67,67)`、**`aria-describedby:null`、`aria-required:null`**；错误 span 存在且带 `id="acceptTerms-error"`（可关联而未关联）。**复现成立，数值与原卡一致。**

**修复位精化**: CheckboxRenderer 实际在 `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx` L445-483（L474 只挂 `aria-invalid`）——不在原卡所指 `input.tsx`；同文件 RadioGroupRenderer L596-598 已有 `aria-describedby/aria-errormessage` 正确范式可平移。全局 grep 确认 text input/textarea/number/period/date-range/markdown 均有 describedby，checkbox/switch 分支缺失（switch 同险，建议修复单覆盖）。

**结论**: **保留 P3**。

### 7. [R2-2a-A2-44] fieldset legend focus 环全宽 884px — 保留 P3

**原发现摘录**: legend 命中区 884×29，focus 环横贯容器，读感像整行选中。

**独立取证**（`rb3` fieldset 段；截图 `rb/fieldset/rb-legend-focus-light.png`）:

- `legend.getBoundingClientRect()` = **884×29**（容器 stage 992 宽），`tabindex="0"`，focus 后 `:focus-visible=true`，computed `box-shadow` 含 `rgb(28,110,242) 0px 0px 0px 2px`、`border-radius:8px`——环本体宽即 legend 全宽。**与原卡 884 数值吻合。**
- 类名实证 `fieldset.tsx` L84-90：`flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring rounded-sm outline-none` 直接挂 `<legend>`（块级占满行宽）——根因即"环挂全宽 legend 本体而非 inline 包裹层"。
- 差异注记：原卡记 "Tab 后 activeElement: INPUT"，本轮 Tab 后落在 BUTTON（场景 body 起始可聚焦元素不同）；不影响环几何结论。

**结论**: **保留 P3**；修复方向（内层 span 收敛环宽 / `w-fit`）成立。

### 8. [R2-2a-A9-47] input-month 越界静默改写 + min/max 未落原生属性 — 保留 P3

**原发现摘录**: fill 2023-05 → 值无声变 2024-01，无错误/提示；`input.min/max` 为空，UA 校验不参与。

**独立取证**（`rb3` input-month 段；截图 `rb/input-month/rb-outofbounds-light.png`）:

- fill '2023-05' + Enter 后：`value:"2024-01"`、`validity.valid:true / rangeUnderflow:false`、`aria-invalid:null`、border 正常、field-error/alert 全空、scope `month:"2024-01"`；且 `min:null, max:null`（原生属性确未映射）。**逐项复现成立。**
- 源码 `period-renderers.tsx`：min/max 只被解析为钳制参数（L95-104），`commitSingle` L125-129 对越界值**直接改写 `next` 且无任何反馈路径**；全文件无 `min=`/`max=` 属性输出。

**结论**: **保留 P3**（钳制是 owner-doc 声明行为——`docs/components/input-month/design.md` L20-21 记载 min/max clamp；"无反馈改写 + 原生属性缺席"超出文档声明面，维持原卡定性）。修复方向两条（钳制即时提示 + minDate/maxDate 映射原生 min/max）成立。

### 9. [R2-2a-A9-60] confirm-password 自定义校验不执行 — 保留 P2，根因修正（"rule 执行缺口"表述证伪）

**原发现摘录**: 两值不一致提交后 `$form.valid:true`、零反馈；minLength 对照正常；修复方向"`form-rules.ts`/field-utils 汇聚处补 `rule:'custom'`+expression 求值通道"。

**独立取证**（`rb3` input-password 段；截图 `rb/input-password/rb-mismatch-submit-light.png`、`rb-minlength-control-light.png`）:

- `longenough8` vs `different99` → Submit：alerts/fieldErrors/aria-invalid 全空，`$form={hasErrors:false,errorCount:0,valid:true}`，values 双值在 scope。**复现成立。**
- 对照组：password 填 "abc" 提交 → `"New Password至少需要8个字符"` 正常渲染——同步规则通道可用，与原卡对照一致。

**根因（修正）**: fixture 用的 `validations:[{rule:'custom',expression,message}]` 键在**全栈零消费者**——grep `validations` 于 flux-core/flux-compiler/flux-runtime/flux-renderers-form/form-advanced 非 test 源码 **0 命中**（类型、lowering、诊断、渲染器四层都没有该键）。原卡猜的"custom 求值器缺失"不准确：不是 rule 分发漏了 `custom` 分支，而是 **`validations` 数组容器本身不被任何人认识**，静默丢弃。同时确认**契约内已有等价能力**：`flux-compiler/src/validation-lowering.ts` L105-110 `equalsField` → `flux-runtime/src/validation/validators.ts` L239 执行器 + message 通道——`equalsField:'password'` 一词即可让本场景今天就能工作（有 validators 测试覆盖）。

**结论**: **保留 P2**（作者写了校验规则但运行时静默放行，注册/改密高频路径）。修复方向改判为三选：① fixture 改 `equalsField:'password'`（零代码修复）；② 若要支持任意表达式规则，在 lowering 层新增 expression 规则 kind（新契约，需设计评审）；③ schema 诊断对未知 `validations` 键发 warning（并入 §附注 1 家族批）。归族 R2-3"表单契约缺口"维持，实例定性修正为"契约外容器键静默丢弃"。

### 10. [R2-2a-F4-80] condition-builder 操作符裸枚举键 — 保留 P3

**原发现摘录**: 触发器与下拉项显示 `eq/gt/equal` 裸键，同页键名混排。

**独立取证**（`rb4-p3-b.mjs`；截图 `rb/condition-builder/rb-operator-dropdown-light.png`、`rb-operator-dropdown-s2-light.png`）:

- S1 触发器 **"eq▼"**（aria-label 条件操作符），开态下拉项 **["eq","neq"]**；S2 触发器 gt/eq×3，下拉项 **["eq","gt","lt","gte","lte"]** 裸键。**复现成立。**
- 源码 `operators.ts`：`OPERATOR_LABEL_KEYS`（L10）只映射规范键（equal/not_equal/…），`resolveOperators` L141 与触发态 L163 均为 `labels?.[op] ?? getBuiltInOperatorLabel(op) ?? op`——fixture 的缩写键（eq/gt）与 seed 的跨类型键（select 字段上的 `equal`）都不在映射内，静默回退裸值。与原卡引用行号一致。

**结论**: **保留 P3**（值提交正确、可读性问题）；修复方向（人读兜底/占位）维持。

### 11. [R2-2a-A4-101] input-table 只读行外观不变 — 保留 P3

**原发现摘录**: readOnly 表格行保持与可编辑行完全相同的输入框外观。

**独立取证**（`rb4` input-table 段；截图 `rb/input-table/rb-readonly-dark.png`，注：本张截图实为 light 主题，缺陷主题无关）:

- S3 四个 input 全部 `readOnly:true`（addBtn 隐藏、removeCount 0），但 computed `border:rgb(225,231,239) 1px`、`bg:transparent`、`textAlign:start` 与 S1 可编辑行**逐项全等**。**复现成立。**
- 源码：`input-table-renderer.tsx` L69/87/384 readOnly 只作用于 `interactionDisabled`（交互闸），无任何呈现分支（无边框透明/置灰档）。

**结论**: **保留 P3**；修复方向（readOnly 分支静态文本化或 transparent 样式档）成立。归族 local R2-4 维持。

### 12. [R2-2a-E5-105] array-field 项内嵌 object-field 零嵌套视觉线索 — 保留 P3

**原发现摘录**: 嵌套 body 与所属 array item 左缘/宽度差 0px，无缩进/边框/背景。

**独立取证**（`rb4` object-field 段；截图 `rb/object-field/rb-nested-light.png`）:

- `object-field-body` {x:301, w:918} 与 `array-field-item` {x:301, w:918} **完全重合**；`borderLeftWidth:0px`、背景透明、body div 零类名。**复现成立（与原卡数值一致）。**
- 源码 `object-field.tsx` L494 `<div data-slot="object-field-body">{bodyContent}</div>`——裸容器，无嵌套上下文分支。

**结论**: **保留 P3**；修复方向（`border-l-2+pl-4` 或子卡片，二选一）维持。

### 13. [R2-2a-A7-84] editor 链接/图片录入走原生 window.prompt — 保留 P3

**原发现摘录**: 点链接键无域内弹层；原生 prompt 录 URL；unsafe 协议拒绝反馈条正常。

**独立取证**（`rb4c-editor-prompt.mjs` → `rb-4c-p3-a7-84-editor.json`；截图 `rb/editor/rb-after-prompt-accept-light.png`）:

- 选中文字点 `button[aria-label=链接]` → Playwright 捕获 **原生 `prompt` 对话框，message="请输入链接地址"**；场景 stage 与 document 内 `[role=dialog]`/dialog/popover 计数均 **0**。accept('https://example.com/ok') 后 `<a href rel="noopener noreferrer nofollow">` 落值。accept('javascript:alert(1)') → href 保持旧值 + 反馈条 "链接地址被拒绝：存在不安全的协议"。**复现成立（原卡 accept 流逐项吻合）。**
- 源码 `editor-toolbar-config.ts` L120/L141-142 两处 `window.prompt`。
- **drift 排除**：`docs/components/editor/design.md` L89 已明示"URL 输入维持 window.prompt（plan 480 Image 同先例；prompt→popover 为后续设计升级候选）"——文档与 live 一致，本条**不是** owner-doc drift，维持原卡 P3 质量发现。

**结论**: **保留 P3**。

---

## §附注

1. **校验链路同根因性结论（任务指定摘要）**：
   - **A9-42 与 A9-60 同根因家族成立**，且与 R2-1d-A-41（`validate.api`）合流为同一家族第四实例——**"走查 fixture 使用契约外校验键名，lowering/prop 层静默丢弃、无任何 schema 诊断"**。四实例：`validate:{api}`（R2-1d-A-41，lowering 只认 `validate.action`）、`args` submit payload（R2-1d-A-40）、`minSelect/maxSelect`（A9-42，契约键 `minSelected/maxSelected`）、`validations[]`（A9-60，契约等价 `equalsField`）。该家族的修复重心应加一层**schema 诊断（未知校验键 warning）**，否则下一个 fixture 还会踩。
   - **A9-47 不同根因**：minDate/maxDate 被正常消费（period-renderers.tsx L95-104），缺口在"钳制无反馈（L125-129）+ 原生 min/max 属性未映射"两处渲染器行为，不属于键名丢弃家族。
2. **原发现质量**：13/13 全部复现成立，无驳回；原卡的根因/数据在 3 条上有实质偏差（B1-40 量化与方向、A9-42 "未接线"、A9-60 "rule 求值缺口"），2 条修复位精化（A9-41、F4-102）。**合计对 R2-3/R2-4 修复排布有实质影响的修正 5 条**。
3. **复核过程规避的坑**（前批教训全部命中并绕开）：oklab 半透明底导致 rgb 解析失败（B1-40 改像素采样）；picker 弹层 portal 不在 `#isolate` 而在 `DIV[data-slot=dialog-portal]`/`[data-slot=picker-dialog-content]`；editor 工具栏按钮 icon-only 需按 aria-label 定位；单选组重复点击同一项会 toggle off（探针需先读 aria-pressed）。
4. **正面锚点**（复核中顺带验证）：`fieldset/design.md` L122 声明的"折叠体 aria-invalid 自动展开"在 `fieldset.tsx` L35-58 有真实 MutationObserver 实现，文档与代码一致；`input-email/design.md` 对 `validate.api` 标注"计划实现"，文档诚实。

## §drift 复核小节（owner-doc vs live，41 控件逐条过）

方法：40 份 `docs/components/<type>/design.md` 全部读过关键断言区（能力对照表/schema 字段节/marker 节），`hidden` 无该文件。候选逐条对照 live code/探针确认。**不直接改 docs/components/**，以下为回写清单。

| #   | 控件        | 文档断言（行）                                                                                                                                                                       | live 实际（证据）                                                                                                                                                                                                                                                                                     | 建议回写文案（供主 session 采纳）                                                                                                                          |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | —           | `docs/components/hidden/` 目录与 design.md **不存在**（owner-doc-missing 登记；控件存在：`flux-renderers-form/src/renderers/hidden-renderer.tsx` + `hidden-field-policy-schema.ts`） | —                                                                                                                                                                                                                                                                                                     | 按流程补建 `hidden/design.md`（走查矩阵里 hidden 卡已有渲染面素材可引用）                                                                                  |
| D-2 | picker      | design.md L51："弹层搜索输入（`type="search"`）挂 `aria-label={t('flux.picker.search')}`（placeholder 同源键，可访问名称）"                                                          | **该搜索输入不存在**：`picker-renderer.tsx`/`picker-dropdown.tsx`/`picker-helpers.ts` 无任何 `type="search"`，i18n 无 `flux.picker.search` 键（grep 0 命中）；picker 卡矩阵裁剪亦记"弹层内无搜索输入可驱动"                                                                                           | 删除该条或改写为"弹层搜索为后续增强（当前未实现）"；若保留需先落地实现                                                                                     |
| D-3 | picker      | design.md L22 将 `labelField` 列为核心字段，但全文未声明"选中回显受 labelField 影响"的契约边界                                                                                       | live（本轮 rb2 探针）：默认 extractValue 路径下确认回显为裸 valueField id，labelField 仅作用于弹层列/`extractValue:false`/`labelTpl`/`labelResolveAction` 通道（F4-102）                                                                                                                              | §4 补一句 labelField 的回显契约与当前缺口（F4-102 修复后改为断言式表述）                                                                                   |
| D-4 | array-field | design.md L55："每项拥有独立投影上下文（itemForm 代理 / itemScope / **itemValidationOwner**…）"                                                                                      | object-mode 下 itemValidationOwner 的投影源（父编译模型）恒为空——编译期下潜被 `getChildFieldPathPrefix→false`（array-field.tsx L584-586）截断，投影运行时只镜像父模型已有节点（projected-validation-runtime.ts L47-49）→ **该 owner 永远零规则**，item 内 required 等规则不参与提交（A9-82 探针证实） | §7 补注："object 模式 item 校验所有者当前不含任何编译规则（动态 item 规则合成未实现），item schema 内 required/校验键不参与提交校验"，避免 schema 作者误信 |
| D-5 | input-table | design.md §4 正式字段清单（L21）无 `readOnly`                                                                                                                                        | 代码存在 `{ key: 'readOnly', kind: 'prop' }`（input-table-renderer.tsx L450），lab fixture S3 以 `readOnly:true` 使用；且只读**呈现语义**（当前与可编辑外观完全一致，A4-101）未见于任何文档                                                                                                           | §4/§5 补 `readOnly` 字段及其呈现契约；A4-101 修复后把目标行为（静态单元格呈现）一并写入                                                                    |

**drift 排除记录（查过、不立）**：checkbox-group/design.md 的 `minSelected/maxSelected` 契约与代码/单测一致（漂移在 fixture）；editor/design.md L89 明示 prompt 裁定；input-email/design.md 对 `validate.api` 标"计划实现"；form/design.md 正确地未把 `onSubmit` 列入契约（L71 明示命名裁定）——array-field fixture 的 `onSubmit` 用法（F4-83）属 fixture 侧误用，文档无责。20 份文档未提 `readOnly`（含 combo/tag-list/transfer 等），多数属族级通用字段不逐一立 drift，仅 input-table 因"容器级 readOnly + 呈现契约整体缺失"单独立 D-5。

---

## 总裁决

**复核 13 条：保留 13 / 降级 0 / 驳回 0。**
其中实质改判（根因或量化修正，非判级变更）：B1-40（双主题数据与家族方向修正）、A9-42（"未接线"证伪 → 三层根因）、A9-60（"custom 求值缺口"证伪 → 契约外容器键静默丢弃）；修复位/机制精化：A9-41、A9-82、F4-102。
drift 清单：**5 条**（D-1 owner-doc-missing + D-2~D-5 文档断言/契约缺失），另有 4 条排除记录。
探针与截图：`_tmp/r2-2a-review/rb*.mjs`（9 个）+ `rb-*.json`（7 份）+ `_tmp/r2-2a-review/rb/<control>/*.png`（24 张），全部在 `_tmp/` 下，未触碰 cards/、ledger.md、packages/、docs/components/、interactions.mjs。

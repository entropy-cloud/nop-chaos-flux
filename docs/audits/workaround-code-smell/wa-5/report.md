# WA-5 表单进阶渲染器 临时方案与坏味道审计报告

> 批次: WA-5（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/565-workaround-audit-wa5-form-advanced-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-5 行，不手抄）

## 快照基准注记

本批对象 flux-renderers-form-advanced 工作树与 HEAD `1aacab37b` 零漂移（`git status` 本包零命中），全部走读取证基于该快照；70 文件 `wc -l` 实测 **17,863 行，与 inventory 逐字吻合**。主工作树另有并行会话对 flux-core/flux-renderers-data/form(3)/layout/runtime 的在途变更，不属本批对象；flux-renderers-form 的 schemas.ts 相关读数按 **HEAD 快照口径**（在途 diff 不取证，行号标注 HEAD）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id                      | 文件数 | 非测试行数 | 取证完成 | 备注                                                                                                                                                    |
| ---------------------------- | ------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-form-advanced | 70     | 17863      | ✅       | 70/70（33 文件逐行精读 + 21 文件核心区精读 + 16 纯声明/类型文件零信号扫描+结构抽查）；门禁 4 项实跑；token 归一化 12 对候选逐对验证；git 考古 14 commit |

合计 70 文件 / 17,863 行，与 inventory 逐字一致（实测复核，零漂移）。

### Tree 双声明专项裁定小节（批计划 E 项）

**声明层**（HEAD 口径 `packages/flux-renderers-form/src/schemas.ts:183-248`）：`InputTreeSchema`(:183-225) 与 `TreeSelectSchema`(:227-248) 均 extends InputSchema；共有 15 键，唯一实质差异 = TreeSelectSchema 多 `placeholder`；已现文档不对称漂移（InputTree 侧 clearable 文档反向写 "Mirrors TreeSelectSchema.clearable"，TreeSelect 侧 clearable 无文档无 @see）。叠加 W5：childrenSource/searchSource 文档写 "executeSource call"，live 为 dispatch 补偿（WA-fadv-005）——双声明已使文档修正需两处/漏一处。

**消费层**（本包 `tree-controls.tsx`）：两个声明各被消费一份（InputTreeRenderer:42 / TreeSelectRenderer:228），双声明镜像出双 renderer ~200 行逐字级重复（valuePathMap 递归 walk 73-85↔258-270、TreeOptionList props 块 169-206↔338-380、source-error/loading 块 208-223↔498-513、remote/lazy/options 管线 87-131↔275-317）；clearable 消费两派。**收敛必须声明+实现两层同步。**

**收敛载体建议**：①声明层 `TreeSchemaBase`（15 共有键）于 flux-renderers-form，两接口 extends（涉公共导出面重构 → CX + 人工确认）；②实现层提取包内 `useTreeControlPipeline(props)` 吸收 ~200 行；③**守卫前置**：`c3-5-schema-contract-honesty.test.ts`（实读）按名正则解析两接口并断言键注册——base 提取后解析面收窄，守卫必须随 extends 链升级，否则 phantom-key 防护静默弱化（此为收敛前置工作量，写入 CX 计划）。

**出处口径**（plan 565 draft review M1 勘误）：该双声明为本批拟制时 live 复核识别，**wa-4 报告未登记此发现**（取证 agent 返回稿有载但报告漏编），非前批交接。

### 取证执行记录（prompt §5 步骤逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` = 0 命中；`临时|先这样|暂时|绕过|workaround|hotfix` live = 0（唯一命中在守卫测试注释，描述已修复旧 bug，排除）。
2. **模式扫描**：typeBypass 5（live 3 逐个定性：tree-control-sources.ts:57 D 排除+flux-core ActionShapeFields 双声明 watch 注记；upload-field ×2 D 排除）；setTimeout 3（live 2 均 C 排除：搜索防抖原语 + editor 命名常量含 unmount flush 模范实现）；domRaid 4（全部自家子树受控寻址 E 排除，3 处并入 WA-form-003/CX-11 跨引用）；silentCatch/keyRemount/pixelNudge/testEnvBranch 0；console 纪律 13 处全带命名空间前缀零静默。
3. **门禁交叉**：`check:audit-runtime-raw-schema-reads` / `check:audit-hardcoded-type-dispatch` 本包 **0**（无 WA-basic-001 同类）；audit-suspects / async-failure-paths 11 命中全定性（10 排除 + 1 watch：editor-renderer:212 空 catch 自愈语义无观测计数）。
4. **重复块识别**：token 归一化 12 对候选，人工逐对验证坐实 5 组 + 观察 2 组 + 排除 2 组（含 picker↔transfer 已收敛正例）；探针用后即弃。
5. **git 考古**：14 个 commit（`9e97ba665` combo/input-table 同 commit 双落、`41ebe4db4`→`61b18ca8d` 2 天时差逐字复制、`5ad81bbf2` cq-3 止步 item-view 层、`6bbece7d2` a11y sweep 主动写入第 10 份 cast 等）；症状性 message 0。
6. **范围结构走读**：33 文件逐行精读 + 21 核心区精读 + 16 纯声明文件零信号扫描；grep 外信号消账（顺序耦合=combo 双 add 路径验证深度、无出口兼容层=projected-scope shim 与 executeSource 补偿、时序贿赂 0）；正向发现：cq-3 去重波证明本包有收敛文化但止步中途。
7. **已收敛模式 live 复核**：AbortController 零手写复发（5 处全部真 `new AbortController()`）；重库静态 import 0；`dataPath` 双词汇 0。
8. **误报排除复核**：24 项全记录（§4）。

## 逐条发现（Findings）

### [类别H] repeatable-items 容器骨架 5 份手写，共享原语层已提取、容器层未收敛（WA-fadv-001）

- **位置**: `combo-renderer.tsx:181-450` ↔ `input-table-renderer.tsx:53-330,412-483` ↔ `composite-field/array-field.tsx:300-440` ↔ `array-editor.tsx:232-464,560-655` ↔ `key-value.tsx:34-145,145-503`
- **严重度**: P2（5 份同根因 P1 起评；**降档显式记录**：行为今天正确、部分变体为真实语义差、提取属纯行为保持 → 与 WA-form-001 同判）
- **现状**: 五字段家族（combo/input-table/array-field/array-editor/key-value）各自手写同一容器机制：双订阅（19 行 ×5）、minItems/maxItems 解析、compat keys 装配、add/remove/move 三操作（其中 combo:375-440 ↔ input-table:267-330 ↔ array-editor:407-464 三份 itemsApi 结果码协议逐字级同构，各 ~55 行）
- **按住的根因**: 无包内"数组容器控制器"共享原语；cq-3 去重波（`5ad81bbf2`）已建 array-item-shared.tsx 但止步 item-view 层，容器层未入 targets
- **违约基准**: W3（同类逻辑 5 份）、W2（无收敛登记）、W1
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓（第 6 个容器型字段仍会再抄）；出口缺失 ✓（cq-3 无 follow-up）
- **风险**: 漂移已兑现 3 处——minItems 缺省两派（0 vs 1）、combo 同文件两条 add 路径验证深度不同（validateSubtree vs validateField）、remove 后焦点恢复两派
- **重构方向**: cq-3 续波——提取 `useArrayContainerController`（双订阅+keys+add/remove/move+结果码协议，参数 validateDepth/focusRestore）；零 API 变更、纯包内；回归 = 五套件直通 + 同 tick 双操作用例移植
- **重复组**: 5 份；冗余 ~400-500 行；漂移证据：3 处
- **ROI 裁定**: CX-n 拟制（包内收敛批，非结构性）
- **误报排除复核**: 非声明式数据表；DOM 结构与控制流逐块对照同构；同一 commit 手笔（`9e97ba665` combo 与 input-table 双落）
- **git 出生**: `9e97ba665`（2026-06-24）；array-editor/key-value 更早（`aa2afdf3c`）

### [类别H] form-or-scope 写通道 writeValue/sync 8 份手写，validate 深度已三派（WA-fadv-002）

- **位置**: `combo-renderer.tsx:303`、`input-table-renderer.tsx:187`、`picker-renderer.tsx:223`、`transfer-renderer.tsx:163`、`icon-picker.tsx:119`、`array-editor.tsx:325`、`key-value.tsx:128`、`tag-list.tsx:116`（内联无 helper）——同一 15-20 行机制（touch-on-first-write → setValue → shouldValidateOn → scope.update 兜底）
- **严重度**: P2（8 份同根因 P1 起评；**降档显式记录**：每份 ~15 行惯用形、行为今天正确；但漂移已三派，高于 WA-form-004 的 P3）
- **现状**: 八个字段各自手写 form-or-scope 双通道写逻辑
- **按住的根因**: flux-renderers-form 未提供 `writeFieldThroughScope` 一类共享写原语（消费侧缺口，与 WA-form-001 同方向）
- **违约基准**: W3、W2
- **为什么是临时方案**: 行为正确/根因在/出口缺失
- **风险**: 漂移三派——picker/transfer/icon-picker 用 validateField；combo/input-table 用 validateSubtree；**tag-list 内联版 form 路径完全不做 change 校验**
- **重构方向**: flux-renderers-form 导出 `writeFieldValue(form, scope, name, next, {validateDepth})`（涉公共导出 → **CX 载体 + 人工确认，建议并入 CX-11 同批**）；回归 = 各字段 onChange 套件 + tag-list change-validation 行为决策单列（先红后绿钉语义）
- **重复组**: 8 份 + tag-list 内联；冗余 ~140 行
- **ROI 裁定**: CX-n 拟制（CX-11 扩围）
- **误报排除复核**: 比较器/写序逐行对照非巧合；差异已被参数 validateDepth 完全解释
- **git 出生**: picker 份生于 `9e97ba665`；其余各字段落地时复制

### [类别H] projectedValidationModel 纯函数逐字复制 66 行（WA-fadv-003）

- **位置**: `detail-view/projected-form-runtime.ts:38-103` ↔ `detail-view/projected-validation-runtime.ts:30-95`（`isProjectedValidationPath` + `projectValidationModel`）
- **严重度**: P2（双份大块 + **低成本可修**——§3 协议 P2 定义正例）
- **现状**: 验证模型投影（路径过滤 + toRelative 重写 + 重组）整函数复制；**diff 全文仅 2 行且均为类型同义词**（`Record<string, CompiledValidationNode>` vs `NonNullable<CompiledFormValidationModel['nodes']>`；Options 类型名）——零行为漂移的逐字复制
- **按住的根因**: `61b18ca8d`（2026-05-05）新建 projected-validation-runtime.ts 时从 `41ebe4db4`（2026-05-03）刚落地的文件复制——复制即时差 2 天的直接实证
- **违约基准**: W3
- **为什么是临时方案**: 行为正确/根因（无双源收敛）在/出口缺失
- **风险**: 投影语义修 bug 需两处同步
- **重构方向**: 提取 `detail-view/projected-validation-projection.ts` 单份，两文件 import；回归 = projected-form-runtime-p0-5.test 直通 + validation-runtime 现有套件。零 API 变更、同目录、**可批内修**
- **重复组**: 2 份 66 行；漂移：无（仅类型同义词）
- **ROI 裁定**: 批内修（先钉后改）
- **误报排除复核**: 非两套语义（函数名/控制流/注释结构全同）
- **git 出生**: `41ebe4db4` → `61b18ca8d`

### [类别H+I] InputTreeSchema↔TreeSelectSchema 双声明 × InputTree↔TreeSelect 双 renderer（WA-fadv-004）

- **位置**: 声明层 form 包 `schemas.ts` HEAD:183-248（15 字段 ×2，diff 仅 `type` + `placeholder`）；消费层本包 `tree-controls.tsx` 双 renderer ~200 行逐字级重复
- **严重度**: P2（双词汇双实现双维护面；文档不对称漂移已现）
- **现状**: 见专项裁定小节——两个声明各被消费一份，双 renderer ~200 行逐字级重复
- **按住的根因**: 包提取（`aa2afdf3c`）时双词汇原样搬运
- **违约基准**: W3（15 键 ×2 双维护）、W2（无收敛登记）、W5（childrenSource/searchSource 文档写 executeSource 而 live 为 dispatch——WA-fadv-005 关联）
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓；出口缺失 ✓
- **风险**: 文档修正需两处/漏一处；第 16 键出现时双写
- **重构方向**: TreeSchemaBase 提取（涉 flux-renderers-form 公共导出 → **CX + 人工确认**）+ 包内 useTreeControlPipeline + c3-5 守卫随 extends 链升级（前置工作量）
- **重复组**: 2+2；冗余 ~200 行
- **ROI 裁定**: CX-n 拟制（新 CX-13；执行前人工确认）
- **误报排除复核**: 非接口多态合理双实现——两 renderer 语义职责相同仅 surface 差异
- **git 出生**: `aa2afdf3c`（2026-04-16 包提取）

### [类别I邻·补偿层] tree-control-sources 弃用 executeSource 改手写 dispatch+patched scope：上游作用域覆盖缺陷 live 在案，补偿无出口（WA-fadv-005）

- **位置**: `tree-control-sources.ts:24-36`（文档注释自述补偿原因）、`:37-67`（executeTreeSource 补偿本体）；**上游根因 live**：`packages/flux-runtime/src/async-data/source-executor.ts:29-33`（`...ctx` 后展开，ctx.scope 覆盖调用方 patched scope）× `packages/flux-react/src/renderer-helpers.ts:304-309`
- **现状**: tree 搜索/懒加载不走 executeSource 而手写 dispatch+patched scope 通道（AbortController+disposeScope 配对完整），以绕开上游 ctx.scope 覆盖
- **严重度**: P3（补偿正确、有注释、AbortController+disposeScope 配对完整；缺上游一行级修复与登记）
- **按住的根因**: 上游 executeSource 的 ctx 覆盖序；**文档漂移**：form 包 schemas.ts（HEAD :217-224、:243-248）仍写 "executeSource call"
- **违约基准**: W1（根因已精确定位未修）、W2、W5
- **为什么是临时方案**: 症状消失 ✓；根因仍在 ✓（live 实证）；出口缺失 ✓
- **风险**: 需要 patched scope 的调用方继续各自手写 dispatch 通道
- **重构方向**: flux-runtime source-executor 改 `scope: ctx.scope ?? scope`（或 flux-react helper 不重复传 scope）后补偿层收薄；**涉 flux-runtime/flux-react → CX 载体**；回归 = tree remote-search/lazy-children 套件 + "executeSource 尊重 caller scope" 用例（先红）。同步修 schemas 文档
- **重复组**: —
- **ROI 裁定**: CX-n 拟制（并入新 CX-13；执行前人工确认）
- **误报排除复核**: 非防御式误报——对已定位上游缺陷的绕行，无出口
- **git 出生**: 补偿定形于 `81702c1e6`

### [类别E邻] getFocusTarget querySelector 惯用形 ×4 —— WA-form-003 同族扩围（WA-fadv-006，跨引用不另立 ID）

- **现状**: 4 处焦点寻址 querySelector 惯用形（自家子树+仓库自有标记契约，行为正确）
- **位置**: `tree-controls.tsx:141`、`:327`、`icon-picker.tsx:176`、`tree-option-list.tsx:290`
- **裁定（跨引用扩围登记，非独立缺陷发现）**: 与 WA-form-003 同根因同车 CX-11；本包 4 处使该族总数 12→16；全部自家子树 + 仓库自有标记契约 → 维持 P3 降档口径，登记为 CX-11 扩围证据

### [类别D] upload-field.tsx:188 injected-aria cast —— WA-form-001 第 10 份，且 a11y sweep 是扩散者（WA-fadv-007，跨引用不另立 ID）

- **现状**: 单处 FieldFrame 注入通道 cast 消费（仅 describedby 键，本包唯一）
- **位置**: `upload-field.tsx:188`
- **裁定（跨引用扩围登记，非独立缺陷发现）**: 与 WA-form-001 同根因同车 CX-11。**新增跨批证据**：本包 cast 由 `6bbece7d2`（a11y closure sweep）以 `+` 行写入——sweep 把 cast 模式复制进第 10 个文件而非收敛契约。建议 CX-11 扩围依据升级为"sweep 主动扩散"

### [类别H微] 小孪生群合并登记（WA-fadv-008）

- **现状**: 十组小孪生散落各渲染器（stub/数据表/footer/Provider 栈/双分支块等），行为正确零漂移（⑩除外为 W6 微违）
- **内容与位置**: ①`getFieldPath` 名称解析 stub 15 份（每份 3 行）；②minItems/maxItems collectRules ×4；③"添加项 + maxItems status" footer 块 ×5；④Provider 五层嵌套栈 ×5；⑤registerChildContract 脚手架 ×2（~22 行）；⑥key-value-row 同文件 key/value 输入块 ×2（~44 行）；⑦condition-group draggable/plain 双分支 props 块 ×2（~40 行——WA-basic-003 同形包内再现）；⑧`isRecord` 本地重定义而 flux-core 已导出；⑨value-input 8 个 props 类型样板；⑩tree-control-controllers.ts:44 硬编码英文兜底绕过 t()（W6 微违）
- **严重度**: P3（**降档显式记录**：每处 3-44 行、行为正确、多数据表/惯用形）
- **违约基准**: W3 弱、W2
- **为什么是临时方案**: 行为正确，观察项群
- **风险**: 低；逐处缓增
- **重构方向**: ⑤并入 detail 族收敛、⑦并入 WA-basic-003 同款单树、①提取常量、⑩补 i18n 键——随下次触碰顺带；其余 watch
- **重复组**: 合计 ~250 行
- **ROI 裁定**: 挂账观察（watch-only）
- **误报排除复核**: 各处参数为真实语义差，立案对象仅为骨架
- **git 出生**: 多批次

### [类别E/D弱] wrapped-field-action 键盘事件 as-unknown-as MouseEvent（WA-fadv-009）

- **位置**: `wrapped-field-action.tsx:27-40`；出生 `e1ee69632`
- **现状**: onPress 统一接 MouseEvent|KeyboardEvent，onClick 声明 MouseEvent 却传 KeyboardEvent（cast），`:32` 以 `'button' in e` 判别真实类型
- **严重度**: P3 watch-only（**降档显式记录**：deliberate a11y 统一、本地受控；诚实修法 = onClick 联合类型，一行）
- **误报排除复核**: 非 schema 动态边界，本地封闭组件有意设计 → 惯用形

### [类别I/W5] projected-scope.ts 2 行转发放射层 —— WA-basic-006 同 commit 孪生（WA-fadv-010）

- **位置**: `detail-view/projected-scope.ts:1-2`（flux-runtime `createProjectedScopeStore` 改名 re-export，带 adjudication 注释）；唯一消费者 projected-owner-scope.ts:3
- **现状**: 2 行纯转发放射层悬置（带登记注释），消费者多跳一查
- **严重度**: P3（W5：消费者直改 flux-runtime import 即消失；与 WA-basic-006 **同一出生 commit** `9411c534e`）
- **重构方向**: 1 行改直连；watch-only
- **误报排除复核**: 带 adjudication 注释（登记文化），非失传化石

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID     | 位置                                              | 出生时间（git 考古）                   | 风险                                         | 处置               |
| ----------- | ------------------------------------------------- | -------------------------------------- | -------------------------------------------- | ------------------ |
| WA-fadv-001 | 五字段家族容器骨架                                | `9e97ba665`（06-24 双落）+ `aa2afdf3c` | ~450 行双写；漂移已兑现 3 处                 | CX-n               |
| WA-fadv-004 | Tree 双声明 + 双 renderer                         | `aa2afdf3c`（04-16 包提取搬运）        | 15 键 ×2 维护面 + 文档不对称                 | CX-n（人工确认门） |
| WA-fadv-002 | writeValue/sync 写通道 ×8                         | `9e97ba665` 起复制                     | validate 深度三派（tag-list 无 change 校验） | CX-n（人工确认门） |
| WA-fadv-003 | projected 投影函数 ×2                             | `41ebe4db4` → `61b18ca8d`（2 天时差）  | 投影语义修 bug 两处同步                      | 批内修             |
| WA-fadv-005 | executeSource 补偿层                              | `81702c1e6` 定形（上游根因 live）      | patched scope 调用方继续各自绕行             | CX-n（人工确认门） |
| 其余 P3     | 006/007（CX-11 扩围跨引用）+ 008/009/010（watch） | 见条目                                 | 低                                           | watch-only         |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 位置                         | 冗余行数 | 漂移证据                   | 裁定                                |
| --- | ---- | ---------------------------- | -------- | -------------------------- | ----------------------------------- |
| 1   | 5    | 容器骨架（fadv-001）         | ~450     | minItems/validate/焦点三派 | 同根因✅ 已漂移✅ 提取干净✅ → P2   |
| 2   | 2    | Tree 双 renderer（fadv-004） | ~200     | clearable 判定两派         | 同根因✅ 未漂移✅ 需先收敛声明 → P2 |
| 3   | 8+1  | 写通道（fadv-002）           | ~140     | validate 三派              | 同根因✅ 已漂移✅ 需 form 导出 → P2 |
| 4   | 2    | projected 投影（fadv-003）   | 66       | 无（逐字）                 | 同根因✅ 未漂移✅ 提取干净✅ → P2   |
| 5   | 多组 | 小孪生群（fadv-008①-⑩）      | ~250     | ⑤⑦ 真实差异                | 惯形 → P3 watch                     |

### 3. Top 重构建议（默认 3 项）

1. **cq-3 续波：数组容器控制器提取（WA-fadv-001）**：`useArrayContainerController`（双订阅+keys+三操作+结果码协议，参数 validateDepth/focusRestore）；预期删除本体 ~450 行五份手写 + 三处漂移收敛；回归 = 五套件直通 + 同 tick 用例移植；影响面 = 包内零 API 变化（非结构性）。
2. **Tree 族收敛批（WA-fadv-004/005 合并载体）**：TreeSchemaBase 提取（公共导出）+ useTreeControlPipeline（~200 行）+ executeSource scope 覆盖序修复（`ctx.scope ?? scope`）+ 补偿层收薄 + schemas 文档修正 + c3-5 守卫随 extends 链升级；影响面 = flux-renderers-form 公共面 + flux-runtime 行为（**执行前人工确认**）。
3. **CX-11 扩围落地（WA-fadv-002/006/007 并入）**：FieldFrame 注入契约（sweep 主动扩散证据升级）+ writeFieldValue 写原语（validate 深度三派收敛）+ ui forwardRef 族（getFocusTarget 12→16）；影响面 = flux-react/form/ui 公共面（**执行前人工确认**）。

### 4. 误报排除清单（24 项）

| #   | 疑似点                                         | 位置                                                         | 排除理由                                                                         |
| --- | ---------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | `{...config} as unknown as ActionSchema`       | tree-control-sources.ts:57                                   | D：guard 前置；真根因=flux-core ActionShapeFields 双声明——他批 scope，watch 注记 |
| 2-3 | uploadAction/deleteAction as ActionSchema[] ×2 | upload-field.tsx:131-132                                     | D：schema 动态边界（WA-4 同判）                                                  |
| 4   | labelResolveAction as ActionSchema             | picker-renderer.tsx:277                                      | D 同上                                                                           |
| 5   | setTimeout 300 搜索防抖                        | tree-control-sources.ts:109                                  | C：AbortController+清理完备原语（注记 300 硬编码与可配不一致同款）               |
| 6   | HTML_COMMIT_DEBOUNCE_MS 300                    | editor-renderer.tsx:165                                      | C：命名常量+unmount flush 防丢尾笔，模范                                         |
| 7   | `catch { }` editor 未就绪                      | editor-renderer.tsx:212                                      | B：自愈语义注释；watch 注记（无观测计数）                                        |
| 8   | removeWhen fail-open catch                     | remove-when-gating.ts:56                                     | B：console.error+注册契约                                                        |
| 9   | formula eval catch                             | condition-builder.tsx:117                                    | B：warn+结构化 `{value,error:true}`                                              |
| 10  | detectVariant catch                            | variant-field-controller.ts:143                              | B：abort 判别+代际守卫+reportVariantFieldFailure，模范                           |
| 11  | upload catch ×4                                | upload-field.tsx:315/390/440/478                             | B：结构化 error+事件路由                                                         |
| 12  | void handleFiles                               | upload-field.tsx:530                                         | 门禁命中排除：performUpload 内部全捕                                             |
| 13  | projectionCaches useMemo                       | condition-builder.tsx:195-209                                | 性能身份缓存，注释完备                                                           |
| 14  | querySelector ×4                               | tree-option-list:290、tree-controls:141/327、icon-picker:176 | E：自家子树+自有契约（WA-form-003 族跨引用）                                     |
| 15  | index.tsx as RendererDefinition[]              | index.tsx:80                                                 | D：注释自证逆变必要收窄（"移除即 TS2322"）                                       |
| 16  | `'value' in data` merge/replace 嗅探           | object-field:105-123、condition-builder:244-259              | A弱：payload 协议哨兵（W6 满足）                                                 |
| 17  | commit-result 三形态解释器                     | detail-view.tsx:181-251                                      | A弱：transformOut 返回契约（AMIS 惯例）；watch：契约文档登记                     |
| 18  | hasUsableParentValidationOwner duck-typing     | detail-view.tsx:161-179                                      | A弱：跨形态支持特性；watch：契约演化静默漂移                                     |
| 19  | selector mode 双词汇                           | variant-field.tsx:37                                         | D弱：动态边界+兼容回退                                                           |
| 20  | asReactNode                                    | input-table-row:23、array-item-shared                        | D：既定收窄惯例                                                                  |
| 21  | test-support setTimeout/cast                   | test-support ×3                                              | G：fixture                                                                       |
| 22  | zh 字面命中                                    | condition-group-v12f 测试                                    | I：守卫测试注释（已修复旧 bug）                                                  |
| 23  | id-utils genId+resetIdSeq                      | condition-builder/id-utils.ts                                | G：测试钩子+局部命名空间                                                         |
| 24  | UploadField 文件 id 手拼                       | upload-field.tsx:426-427                                     | 注释显式声明 deliberate（组合键设计）                                            |

### 5. 范围整体判断

**不是系统性临时方案文化，而是"机制落地不提取共享原语、去重波半途而止"的复制沉积型。** 本包特有形态三件：①cq-3 去重波（`5ad81bbf2`）已开进本包但止步 item-view 层（容器层 5 份未入 targets）——半途而废的直接证据；②上游 a11y sweep（`6bbece7d2`）把 cast 模式**主动写入**本包第 10 份（CX-11 扩围最强证据）；③projected 双 runtime 的 2 天时差逐字复制。零 P0、零根因失传、症状性 commit 0；错误路由纪律严格（11 门禁命中 10 排除 1 watch；console 全带命名空间）；登记文化正面（adjudication 注释 ×2、cq-3 去重波）。字面临时标记为零。立案 10 条（P2×4+P3×6，其中 2 条为 CX-11 跨引用扩围），误报排除 24 项；批内修 1 项（fadv-003），结构性收敛归 CX-11 扩围 + 新 CX-13/14，处置时机 WA-16 收口前。

## 批内修复记录（Auto-Remediation）

| 发现 ID     | 严重度 | 修复方式                                                                          | 回归测试（先红后绿证据）                                                                                                | 本体删除验证                                                                                                                      | commit          |
| ----------- | ------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| WA-fadv-001 | P2     | CX-n（新 CX-14 包内收敛批；cq-3 续波）                                            | 归 CX-14 plan                                                                                                           | —                                                                                                                                 | —               |
| WA-fadv-002 | P2     | CX-n（CX-11 扩围；form 导出→人工确认门）                                          | 归 CX-11 plan                                                                                                           | —                                                                                                                                 | —               |
| WA-fadv-003 | P2     | 批内修（提取 detail-view/projected-validation-projection.ts 单份，两文件 import） | 特征化钉子=detail 族 3 套件先跑 12/12 绿 → 提取 → 复跑 12/12 同绿 + 包全量 165 文件 1150/1150（行为保持提取，红绿同套） | 两份本地副本删除（两文件 152del/4ins 净删 148 行；新共享模块 83 行，整体净 -65）；lint 未用导入 3 错误清理（closure m2 终态口径） | 本批收口 commit |
| WA-fadv-004 | P2     | CX-n（新 CX-13 Tree 族收敛批；公共导出→人工确认门）                               | 归 CX-13 plan                                                                                                           | —                                                                                                                                 | —               |
| WA-fadv-005 | P3     | CX-n（并入 CX-13；flux-runtime 行为修复→人工确认门）                              | 归 CX-13 plan                                                                                                           | —                                                                                                                                 | —               |
| WA-fadv-006 | P3     | CX-n（CX-11 扩围跨引用，族总数 12→16）                                            | 归 CX-11 plan                                                                                                           | —                                                                                                                                 | —               |
| WA-fadv-007 | P3     | CX-n（CX-11 扩围跨引用；sweep 主动扩散证据）                                      | 归 CX-11 plan                                                                                                           | —                                                                                                                                 | —               |
| WA-fadv-008 | P3     | watch-only（①⑦⑩顺带候选）                                                         | —                                                                                                                       | —                                                                                                                                 | —               |
| WA-fadv-009 | P3     | watch-only（一行联合类型顺带候选）                                                | —                                                                                                                       | —                                                                                                                                 | —               |
| WA-fadv-010 | P3     | watch-only（1 行直连顺带候选）                                                    | —                                                                                                                       | —                                                                                                                                 | —               |

共性裁定：CX-14（flux-renderers-form-advanced 包内复制沉积收敛批：WA-fadv-001，cq-3 续波，非结构性）、CX-13（Tree 族收敛批：WA-fadv-004/005——**涉 flux-renderers-form 公共导出 + flux-runtime 行为修复，执行前人工确认门**）、CX-11 扩围（WA-fadv-002/006/007 并入，扩围依据升级为"a11y sweep 主动扩散"）已插入/更新 roadmap。P3×3 watch-only 零静默。

## 批内修复 filter 门禁

- flux-renderers-form-advanced：typecheck/build/lint/test **1150/1150**（165 文件）全绿。
- `git diff --exit-code src/index.tsx` 通过——零公共导出变更。
- 环境卫生注记：根级 lint 曾被前序审计会话遗留的 /tmp/wa1-closure-audit 注册 worktree 干扰（scheduling 包 warning 误入输出），该残留 worktree 已确认不在注册表（git worktree prune 后零 tmp 项）；本包 lint 以包级实跑为准 exit 0。

## 台账回写核对

- 本批新增 findings：10 条（WA-fadv-001…010，其中 006/007 为 CX-11 跨引用扩围登记）
- modules 行翻转 audited：flux-renderers-form-advanced
- `pnpm workaround:reconcile` 输出摘录（收口终态）：modules 49 total / audited 10 / uncovered 39 / orphan 0；findings 66 = pending 0 + found 57 + fixed 0 + verified 9（WA-fadv-003 于 closure audit R2 approved 后 fixed→verified）；dispositions watch-only 22 / successor-required 34 / n-a 1；未处置 0；violations 0
- **closure audit**：R1 issues（agent_928f0699，0B/1M/4m——Major-1=plan :17/:20 勘误静默未落地）→ 修正后 delta 复核 R2 approved（0B/0M/0m）；审计员独立复现 1150/1150+knip exit 0+reconcile 逐字+9 处 live 抽查+提取归一化 diff IDENTICAL 对照

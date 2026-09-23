# [card] control:array-field

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/array-field` ｜ **载体**: lab 页（3 场景：团队成员 name+role / 空起始联系人提交 / readOnly object+array 提交）
- **矩阵裁剪**: simplified（matrixReason：行内复合编辑，弹层面只有 role select 下拉，已查）。裁掉：disabled（fixture 无 disabled 用例，readOnly 已查）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                                              | light                                                                                                                                  | dark（真 data-mode，自采）                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 默认 1280×800                                     | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/default-1280-light-viewport.png` / `default-1280-light-fullpage.png`              | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/default-1280-dark-viewport.png`       |
| role select 下拉开态                              | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s1-role-select-open-light-1280.png`                                               | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s1-role-select-open-dark-1280.png`    |
| role 改 Viewer 后                                 | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s1-role-changed-light-1280.png`                                                   | —                                                                                          |
| 增行并填值                                        | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s1-row-added-filled-light-1280.png`                                               | —                                                                                          |
| 删行后                                            | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s1-row-removed-light-1280.png`                                                    | —                                                                                          |
| S2 空表提交（无错误态）                           | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s2-empty-submit-errors-light-1280.png`                                            | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s2-empty-submit-errors-dark-1280.png` |
| S2 空行+提交（无错误态，复跑）                    | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s2-empty-row-submit-errors-light-1280.png`                                        | —                                                                                          |
| S2 填值提交（echo 未出现）                        | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s2-filled-submit-success-light-1280.png` / `s2-filled-submit-echo-light-1280.png` | —                                                                                          |
| S3 readOnly（6 input 全 readonly、无增删 chrome） | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s3-readonly-light-1280.png`                                                       | —                                                                                          |
| 默认 800×900 窄视口                               | `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/default-800x900-light-fullpage.png`                                               | —                                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（行 input focus 探针正常）A3 pass（删除钮 28×28）A4 n/a（无 disabled fixture）A5 **fail(R2-2a-A9-82 关联)**：提交空 required 行既无 inline 错误也无汇总错误（见发现）A6/A8 n/a A7 pass（role select 下拉开/关正常）A9 pass（增删行、role 改值即时生效）
- B 颜色：B1–B4 pass B5 pass（控件本体 dark 正常；role 下拉白底为已知族，见 §4）B6 pass（required 星号红色语义正确）
- C 布局：C1 pass（docOverX 0；溢出命中仅 sr-only 1×1 隐藏 input，白名单）C2–C6 pass/n-a
- D 间隔：D1 pass（行内 label-control 垂直节奏一致，object-field 双字段行距成栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 pass（两行字段左缘对齐）E5 pass（行卡片边界清晰）E6 n/a
- F 一致性：F1 pass F2 n/a F3 pass F4 warn（已知族 F4-11："添加项/删除/清除"中文 chrome）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（role select 下拉宽度贴合）H3 pass H9 pass，其余 n/a

## 3. 发现条目

### [R2-2a-A9-82] required 行级校验在提交时不触发：空 name/email 行提交零错误反馈

- **页面/路由**: `#/lab/array-field`（S2 场景 fixture：item 定义 `{type:'input-text',name:'name',required:true}` + `input-email required`）
- **主题/视口/状态**: light+dark（真 data-mode）/ 1280 / 添加空行 → 提交
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s2-empty-row-submit-errors-light-1280.png`（无任何错误 UI，`$form.valid:true`）；`s2-empty-submit-errors-dark-1280.png`
- **目视描述**: 点击"添加项"后直接点 Submit，页面上没有出现任何字段错误、红框或汇总提示；scope-debug 面板显示 `hasErrors:false, errorCount:0, valid:true`。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-array-field-followup.mjs`（空行提交后扫描 `[aria-invalid="true"]` + scope-debug JSON `$form` 状态）
  - 输出: `invalidCount: 0`、`formState: {hasErrors:false, errorCount:0, valid:true, invalid:false}`；对照 dialog 卡 real-schema 弹层同款 required 字段错误可正常渲染（`s1-dialog-required-error`，invalidCount 2），说明错误渲染通道本身可用，缺口在复合行字段校验规则传播/触发。
- **对照基准**: `docs/architecture/form-validation.md`（required 提交触发为基线契约）；检查提示词 A5/A9（错误态反馈）
- **严重程度**: P2（校验静默失败 → 用户以为提交成功；fixture intro 明示 "Supports … per-item validation"，承诺与行为不符）
- **用户影响**: 复合行内必填项漏填可静默通过，破坏表单数据完整性；与平铺字段的 required 行为不一致。
- **修复方向**: `composite-field/array-field.tsx` 行内字段注册校验规则时把 required 规则传入行 scope 的验证所有者（对齐 `projected-validation-runtime.ts` 通道），或提交前对行内字段执行 `validate()` 聚合错误。
- **归族**: systemic → R2-3 批候选（表单校验契约缺口族，跨复合控件生效面）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）。订正（根因行级定位）：array-field getChildFieldPathPrefix→false（L584-586）截断编译期下潜 + 投影运行时只镜像父模型（恒空）

### [R2-2a-F4-83] S2 提交成功回显永不出现：`onSubmit` 的 setValue(submitted=true) 未落到任何 scope，demo 承诺落空

- **页面/路由**: `#/lab/array-field`（S2 场景：页面级 text 引用 `${submitted ? "Contacts saved! …" : "Add contacts and submit."}`）
- **主题/视口/状态**: light / 1280 / 填值 + 提交后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/array-field/s2-filled-submit-echo-light-1280.png`（提交后文案仍是 "Add contacts and submit."）
- **目视描述**: 按场景描述"Add contacts and submit. The success message shows how many contacts were saved"，实际填值提交后成功文案不出现。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-array-field-followup.mjs`（提交后读 scope-debug JSON 与页面文案）
  - 输出: `submittedInScope: false`（form scope 根键仅 `contacts`/`$form`）、`bodyText` 仍为 "Add contacts and submit"。对照：condition-builder S3 与 detail-field S3 用 `onSubmitSuccess` 通道 echo 均正常落地，唯独本场景用 `onSubmit: [setValue]` 不生效——`onSubmit` 通道或 fixture 写法存在缺口。
- **对照基准**: 检查提示词 F4/A9（操作后反馈可见）；已知族"schema 动态响应性缺口 / 表单 AMIS 契约缺口"相邻
- **严重程度**: P3（fixture 级：无数据损坏，但 demo 无法演示其宣称的行为，掩盖通道缺陷）
- **用户影响**: 依赖 `onSubmit` 做提交后跳转/回显的 schema 作者会得到静默失效。
- **修复方向**: 先核实 `onSubmit` 动作链执行时机（`valuesPath`/action scope 归属）；若为通道缺口，在 flux-renderers-form form 提交管线补 `onSubmit` 动作派发；fixture 侧可改用已验证的 `onSubmitSuccess`。
- **归族**: watch-only → 台账（schema 契约缺口族 R2-3 候选的实例证据；根因未定故不直接并入）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: "添加项/删除/清除"中文 chrome；role select 清除钮 aria-label 亦中文。
- **`--popover` dark 亮底（宿主已知问题，新实例）**: dark 下 role select 下拉白底，且选中项行 dark 高亮形成半黑半白拼贴（`s1-role-select-open-dark-1280.png`）——该族在组合高亮下的新形态，修复后复检。
- 窄视口无新命中（800 宽正常）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-array-field` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键上报：`{"lab-array-field":[{"action":"waitFor","ms":800},{"action":"clickText","text":"添加项"},{"action":"waitFor","ms":300}]}`

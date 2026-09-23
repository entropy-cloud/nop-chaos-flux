# [card] control:input-password

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-password` ｜ **载体**: lab 页（3 场景：basic / confirm-password validator / reveal toggle）
- **矩阵裁剪**: simplified（matrixReason：单行掩码输入，弹层仅 reveal 切换无浮层；裁掉的状态：glass 皮肤、strength 强度条（fixture 明示未实现）、 CapsLock 提示（未实现））

## 1. 截图清单

| 状态                                   | light                                                     | dark（真 data-mode）        |
| -------------------------------------- | --------------------------------------------------------- | --------------------------- |
| 默认 1280×800 s1/s3                    | `default-s1-light-1280.png` / `default-s3-light-1280.png` | `default-s1-dark-1280.png`  |
| reveal 开（type=text 明文）            | `revealed-s3-light-1280.png`                              | `revealed-s3-dark-1280.png` |
| error-required（空提交）               | `error-required-s1-light-1280.png`                        | —                           |
| error-minLength（<8 字符）             | `error-minlength-s2-light-1280.png`                       | —                           |
| error-mismatch（确认密码不一致提交后） | `error-mismatch-s2-light-1280.png`                        | —                           |
| 默认 800×900                           | `default-s3-light-800.png`                                | —                           |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/input-password/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（focus ring box-shadow 呈现完整）A3 pass（reveal 按钮 24×24 恰达标）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 **fail(R2-2a-A9-60)**（confirm-password custom rule 提交不拦截，见发现）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（dark 默认/reveal 截图复核无新缺陷）B6 n/a
- C 布局：C1 **warn(R2-2a-C1-61)**（reveal 场景 s3 表单链 4–5px 横向微溢出）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D5 pass（label→控件 9px）其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** 错误文案"Password不能为空""至少需要8个字符"、reveal aria"显示密码"为中文 F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A9-60] confirm-password 自定义校验规则不被执行：两值不一致提交后 `$form.valid` 仍为 true、无任何错误反馈

- **页面/路由**: `#/lab/input-password`（场景 2 "New password with confirm-password validator"）
- **主题/视口/状态**: light / 1280 / 填入 password=`longenough8`、confirmPassword=`different99` 后点击 Set Password 提交
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-password/error-mismatch-s2-light-1280.png`（两输入框均为掩码值、页面无任何错误提示）
- **目视描述**: 两个密码框填入不一致的值并提交后，页面无红字、无红框，scope-debug 面板显示表单自认定有效。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w4-fixup5.mjs`（提交后收集 `[role="alert"]` + scope-debug `$form` 状态）
  - 输出: `mismatch: []`（s2 内 alert 元素为 0 个）；scope-debug JSON 显示 `"password": "longenough8", "confirmPassword": "different99", "hasErrors": false, "errorCount": 0, "valid": true`。对照同场景 `minLength` 规则生效（"New Password至少需要8个字符" 可见），仅 `rule:'custom'` + `expression:'${confirmPassword === password}'` 不生效。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）+ schema `validations.custom` 表单契约（AMIS validate 语义）
- **严重程度**: P2（确认密码是高频注册/改密路径；作者写了校验规则但运行时不拦截，属静默放行）
- **用户影响**: 用户提交不一致密码无任何提示，错误数据入库后才发现问题；schema 作者以为校验生效。
- **修复方向**: `packages/flux-renderers-form` 表单校验链（`form-rules.ts` / field-utils 校验汇聚处）补 `rule:'custom'` + expression 求值通道，将 expression 结果为 false 时以 `message` 渲染进既有 errorId/role=alert 槽；与"表单 AMIS 契约缺口（validate.api、submit payload）"已知族同批收口。
- **归族**: systemic → 表单契约缺口族（R2-3 候选，已知族引用 + 本卡新实例）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）。订正（根因改判）：custom 求值通道缺失证伪——validations[] 容器键全栈 0 消费者；契约等价物 equalsField(password) 今天即可工作（validation-lowering.ts L105-110 → validators.ts L239）

### [R2-2a-C1-61] 表单 input-group 尾缀装饰（reveal/clear 按钮）引发 4–5px 横向微溢出，跨 lab 页复现

- **页面/路由**: `#/lab/input-password`（场景 3 revealPassword:true）；同型实例：`#/lab/select`（select-wrapper/input-group，s1 与 s5）、`#/lab/input-text` s4（clearable）；dialog 卡 R2-2a-C1-10（real-schema 18 字段）为同根因先行实例
- **主题/视口/状态**: light+dark / 1280 与 800 均复现 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-password/default-s3-light-1280.png`（右缘细裁切感）
- **目视描述**: 带 reveal/clear 尾缀按钮的 input-group 右缘贴住滚动边界，1–5px 裁切感。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w4-simple.mjs`（overflowScanJs 全页扫描）+ `w4-fixup.mjs`（按场景隔离）
  - 输出: password s3：`section.nop-form overX 4 / form-body overX 4 / label.nop-field overX 4 / field-control overX 4 / input-group overX 5`；select s1/s5 与 input-text s4 同链路同量级；s1/s2（无尾缀按钮场景）为 0——溢出仅出现在带尾缀 adornment 的输入组。800 视口等比复现（rectW 438，overX 同值）。docOverX=0（页级无横向滚动条，祖先裁剪）。
- **对照基准**: 检查提示词 C1（无意外溢出）；dialog 卡 R2-2a-C1-10 同根因
- **严重程度**: P3（4–5px 肉眼几不可察；无页级滚动条）
- **用户影响**: 长表单右缘 1–5px 裁切风险，基本无感。
- **修复方向**: input-group 尾缀 adornment 分支（`packages/flux-renderers-form/src/renderers/input.tsx` InputGroupAddon inline-end）加 `min-w-0`/收缩约束，或 field-control 加 `max-w-full`，收敛 scrollWidth 至 clientWidth；与 C1-10 同一修复单收口。
- **归族**: watch-only → 台账（引用 dialog C1-10；≥3 surface 复现，可升 R2-3 候选）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **F4-11 i18n zh-CN 回退（已知族）**：错误文案"Password不能为空 / New Password至少需要8个字符 / Confirm Password不能为空"、reveal aria-label"显示密码"均为中文（英文宿主）。
- **弹层 actions 左对齐（R2-3b 已知族）**：Continue/Submit/Set Password 左对齐于 body 尾部。
- 计划内锚点复检通过：reveal 切换 password↔text 且提交值不变（live echo "Set: secret-pass-1"）、二态往返无损、required/minLength 校验通道正常（红字+红框+aria-invalid）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-password` → carded（卡列填本路径）；findings 归族后 → digested。

# 审计卡：input-image（flux-renderers-form-advanced）

> 状态: closed
> 审查日期: 2026-08-03
> 审查 plan: `docs/plans/2026-08-03-1616-2-c3-5-form-advanced-media-rich-text-family-audit.md`
> 注册定义: `packages/flux-renderers-form-advanced/src/input-image-renderer.tsx:40-73` | 渲染器: `input-image-renderer.tsx:27-38` + `upload-field.tsx:98-575`（共享链）| schema: `upload-schemas.ts:73-100` | design.md: `docs/components/input-image/design.md` | playground: `apps/playground/src/component-lab/renderers/input-image-lab-page.tsx` | e2e: `tests/e2e/w3d-upload-family.spec.ts` + `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts`（本组件宿主场景新增）

## 组件身份

input-image / flux-renderers-form-advanced / InputImageSchema（`upload-schemas.ts:73-100`）/ `{type:'input-image', name, uploadAction, previewMode?, crop?, multiple?, ...}` / 表单参与: 是（name/required/validation/提交路径，wrap: true）/ widget 控件 renderer——图片上传字段（基于 input-file 共享上传链 + 图片缩略图预览）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                          | 发现    |
| --- | --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Schema 契约                 | pass | InputImageSchema 键全部注册（imageFieldRules :118-122 = uploadFieldRules + previewMode + crop）+ 消费（input-image-renderer.tsx:28-32 previewMode；crop 设计 §11 显式保留扩展点零实现，文档诚实）；flux-guide 生成 InputImageSchema 完整（schema.d.ts:814-829）               | —       |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props（previewMode :28-29）+ 共享链 UploadFieldRenderer（upload-field.tsx 标准 hooks）；renderPreview 闭包经 props 传入共享链（:30-32）                                                                                                                            | —       |
| 3   | 值所有权三态                | pass | 与 input-file 共享三态（upload-field.tsx:133-138, 188-195）；预览从字段值读（existingItems → renderPreview，:487-499）；值形状 url/object/array；失败不污染（共享链契约）                                                                                                     | —       |
| 4   | 表单参与                    | pass | name/required/validation（definition :51-60 + useFormFieldController）；提交形状 = url/对象/数组（w3d-upload-family image-report 实证 + host-mr-upload-ok）；FieldFrame data-field-\*                                                                                         | —       |
| 5   | DOM 与选择器契约            | pass | 根 `nop-input-image` marker + data-upload-kind="image"（upload-field.tsx:427-434）；input/trigger/item testid nop-input-image-\*（:443,458,491）；**缩略图 data-testid="nop-input-image-thumbnail"**（input-image-renderer.tsx:22）；与 design §10 根 marker 一致             | —       |
| 6   | 嵌套 schema 分类            | pass | uploadAction/deleteAction actionValue（共享 propContracts）+ 事件分类 event；无 deepFields 残留；08-02 复验 pass（与 input-file 同链）                                                                                                                                        | —       |
| 7   | 事件与 action 契约          | pass | onUploadSuccess/onUploadError/onReject/onDelete/onDeleteSuccess/onDeleteFail 共享链派发（payload 形状同 input-file 卡）                                                                                                                                                       | —       |
| 8   | a11y                        | pass | trigger/移除/取消 aria-label 同共享链（移除按钮 P2-1 修复同 input-file）；**P2-2**：缩略图 alt 兜底硬编码 'uploaded image'（input-image-renderer.tsx:17，alt 无图名时）                                                                                                       | P2-2    |
| 9   | i18n                        | fail | 共享链消息 t() 齐全；**P2-2**：alt 兜底硬编码英文                                                                                                                                                                                                                             | P2-2    |
| 10  | 四态覆盖                    | pass | 空态（placeholder + 无列表）；加载态（pending）；错误态（共享链）；readOnly/disabled（trigger disabled + 移除隐藏）；预览渲染不崩溃（无图名/无尺寸容错 :13-25）                                                                                                               | —       |
| 11  | 异步生命周期                | pass | 共享链完全覆盖（AbortController/卸载 abort/失败不污染/child scope）；INV-1 合规（无网络 IO，全部经 dispatch）；`check:audit-async-failure-paths` 命中均合规（同 input-file）                                                                                                  | —       |
| 12  | 组合宿主场景                | pass | 单测（upload-field.test.tsx:383-410 preview shell + Phase 2 新增 P2-1 测试）；真实浏览器：w3d-upload-family 缩略图断言 + host-mr-upload-ok/fail（Phase 3）                                                                                                                    | Phase 3 |
| 13  | 样式契约                    | pass | widget 自样式（缩略图 size-12/fill 模式 h-20 w-full object-cover）；多图 flex-wrap（upload-field.tsx:483）；无 BEM                                                                                                                                                            | —       |
| 14  | React 19 规范               | pass | 无状态/无 memo（薄壳组件）；预览渲染纯函数                                                                                                                                                                                                                                    | —       |
| 15  | 性能边界                    | pass | 缩略图尺寸固定（size-12 / h-20），大图由浏览器缩放；无热点                                                                                                                                                                                                                    | —       |
| 16  | 测试质量                    | fail | 既有 input-image 专属断言仅 1 例（upload-field.test.tsx:383-410 缩略图渲染）——**previewMode fill 分支、multiple 图片数组值形状、readOnly/disabled 冻结、值回显循环（既有值 → 预览）、缩略图 alt/错误路径零断言**（dim 16 计划点名的测试缺口确认存在）                         | P2-1    |
| 17  | 文档对照                    | pass | design.md §4/§5/§11 与实现一致（previewMode/crop 保留说明）；quick-reference n-a                                                                                                                                                                                              | —       |
| 18  | 注册、包边界与 IO/安全红线  | pass | 定义单注册（index.tsx:11,33,74）+ 导出 ✓；playground lab 页存在 ✓；**INV-1 合规**：无直接浏览器 IO；**附件安全面**：img src 为 action 返回 URL（React 属性渲染，img src 不可执行脚本；javascript: 在 img src 不执行——仍属低风险面，协议校验归上传 action 宿主责任，卡内记录） | —       |

## 发现清单

- [P0] 无
- [P1] 无
- [P2-1] input-image 专属测试缺口（dim 16 计划点名项）：previewMode fill、multiple 图片数组值、readOnly/disabled 冻结、既有值回显循环（init 值 → 缩略图）、失败不渲染缩略图等零断言 → 状态: fixed（新增 input-image-preview.test.tsx：fill 模式/fill 值数组/既有值回显/readOnly 移除隐藏/失败无缩略图，断言正确行为；input-image 与 input-file 同链共享 upload-field 测试底座）
- [P2-2] 缩略图 alt 兜底硬编码 'uploaded image'（input-image-renderer.tsx:17）→ 状态: fixed（flux-i18n 新增 `flux.form.uploadedImage` zh/en + t()）
- [P3-1] crop 字段零实现（design §11 显式保留扩展点，文档诚实）→ 状态: keep（设计声明，归 CR 评估 feature plan）
- [P3-2] img src 协议不校验（javascript: 在 img 不执行，风险低；协议校验归属 uploadAction 宿主）→ 状态: keep（记录）

## 组合宿主场景（真实浏览器验证）

- 场景: form 内 input-image 上传成功（值真机写 store + 缩略图渲染 + 提交形状）| 断言: host-mr-image-ok（c3-5-host-surfaces.spec.ts）| 结果: pass（缩略图 src=`https://cdn.example.com/avatar.png` 断言 + 提交值 `"ok":"..."` 正确）
- 场景: 上传失败路径（env 拒绝）| 断言: host-mr-image-fail——错误态（data-item-status=error）+ 值不污染 + 不崩溃 | 结果: pass（fail 字段零残留）

## 修复记录

- plan: `docs/plans/2026-08-03-1616-2-c3-5-form-advanced-media-rich-text-family-audit.md` Phase 2/3
- test-first 证据: 见 plan Phase 2（in-session 先红后绿实测记录）
- 实现: `input-image-renderer.tsx`（alt 回退链 name→url→i18n）、flux-i18n（flux.form.uploadedImage 双 locale）、`__tests__/input-image-preview.test.tsx`（6 用例：既有值回显/multiple 数组/fill+thumbnail 尺寸/readOnly 冻结/失败无缩略图不污染/字符串值 alt）、input-image-lab-page（宿主场景）
- 验证: 受影响包 typecheck/build/lint/test 全绿（1014 tests）；宿主 c3-5 7/7 + w3d-upload-family 2/2；`check:i18n-keys` 绿
- 卡状态流转: open（Phase 1）→ fixing（Phase 2）→ fixed-pending-closure（Phase 3 宿主实证）→ closed（Phase 4）

## Closure

- 独立 closure audit: pass（见 plan Closure 节，CLOSURE_VERIFY fresh session）

# Audit Follow-ups — 2026-08-11 19:29 audits（component-audit-round2）

> Last Updated: 2026-08-24
> 用途：登记 2026-08-11 19:29 两轮审计（multi-audit + open-audit，mission component-audit-round2）的 P2 发现，保证可追溯（每条含来源审计文件路径与路由去向）。
> 路由规则：P0/P1 → remediation plans（`docs/plans/2026-08-11-1929-1-renderer-core-path-defect-remediation.md`、`docs/plans/2026-08-11-1929-2-flux-bundle-facade-host-contract-remediation.md`、`docs/plans/2026-08-11-1929-3-claim-vs-reality-plan-doc-contract-integrity-remediation.md`）；P2 → 本 backlog（与 P0/P1 同 closure surface 的 P2 已折叠进对应 plan 的 Fix/Proof 项，本表同步登记去向）。
> 收口注记（2026-08-24）：plan `2026-08-11-1929-1` 已 completed（独立 closure-audit approved）——其折叠的 P2-09/P2-10/P2-11 及 P2-17 barcode/pivot 子项均已随该 plan 落地修复；源 open-audit 已翻 `closed`。本表 backlog 项仍待后续轮次处理。

## Follow-up Backlog

### open-audit（`docs/audits/2026-08-11-1929-open-audit-component-audit-round2.md`）

- **[P2-06] upload `clearAll` 不中止在途上传，文件被迟到成功响应写回**（`upload-field.tsx:430-433` vs unmount abort :153-171 不对称）——去向：**backlog**（无 P0/P1 共享 closure surface；独立组件缺陷）。
- **[P2-07] collapse/steps/timeline scope 模式写入 null 被 `??` 跳过，作者化 value 种子复活**（`collapse-renderer.tsx:100,110` / `steps-renderer.tsx:135,147` / `timeline-renderer.tsx:154,161` / `scope.ts:494`）——去向：**backlog**。
- **[P2-08] collapse 本地种子优先级倒置**（`collapse-renderer.tsx:90` `defaultValue ?? value`，C5.2 已修同族 steps/button-group）——去向：**backlog**。
- **[P2-09] wizard 数值 `value` 从不 key 匹配 + 文档二次漂移**（`wizard-renderer.tsx:92-94` / `schemas.ts:33`）——去向：**折叠进 plan `2026-08-11-1929-1` Phase 3**（Fix：先 key 匹配后 clamp + 文档措辞与实现一致）。
- **[P2-10] wizard `stepError` 真实错误消息在 UI 死区**（`wizard-renderer.tsx:433-439,682-693`）——去向：**折叠进 plan `2026-08-11-1929-1` Phase 3**（Fix：错误盒渲染真实消息）。
- **[P2-11] barcode design.md 同步未兑现 + 离线横幅说谎**（`docs/components/barcode-input/design.md:40,42` / `barcode-scanner-overlay.tsx:313-317`）——去向：**折叠进 plan `2026-08-11-1929-1` Phase 1**（与 P0-01 同组件族；Fix：design.md 同步 + 横幅文案对齐 live）。
- **[P2-12] timeline 审计卡过时**（`docs/audits/per-component/timeline.md` dim 3 称 display-only，live 已有三态 ownership）——去向：**backlog**。
- **[P2-13] timeline 根禁用时条目 inert-but-focusable**（`timeline-renderer.tsx:218,269-290` 无 aria-disabled）——去向：**backlog**。
- **[P2-14] button anchor `target="_blank"` 无 `rel="noopener noreferrer"`**（`button.tsx:252-263`，link.tsx:14-16 有先例）——去向：**backlog**。
- **[P2-15] input-number badInput 中间态抹掉存储值，显示与提交脱钩**（`input-number-renderer.tsx:248-258,112-122`）——去向：**backlog**。
- **[P2-16] dashboard 运行态硬编码 `canvasWidth=1200` 违反同构声明**（`dashboard-renderer.tsx:80` vs `editor-canvas.tsx:39-55,326` vs design.md:29-46）——去向：**backlog**。
- **[P2-17] 死代码/死契约/死订阅合集**——去向：dashboard 8 导出 + code-editor 声明不消费 + map loading 注释反转 → **backlog**；barcode `clearCameraAvailabilityCache` 子项 → **折叠进 plan `2026-08-11-1929-1` Phase 1**（随 P0-01 收口删除）；pivot `indicators[].format` 子项 → **折叠进 plan `2026-08-11-1929-1` Phase 2**（裁决删除或接入消费）。
- **[P2-18] 轻微漂移合集**（alert onClose payload / fieldset collapsed / stat-tile sparkline 几何 / link rel 覆盖 / card 键盘可达 / markdown src 失败保留旧内容）——去向：**backlog**。
- **[P2-19] 惯例违例**（dashboard 裸 `<button>` ×2；wizard/layout 家族手写 memo/useCallback 无 react-compiler disable 注释）——去向：**backlog**。

### multi-audit（`docs/audits/2026-08-11-1929-multi-audit-component-audit-round2.md`）

- **[P2-07] word-editor action provider 4/6 方法绕过 manifest args 契约验证，insertField 手写契约副本**（`word-editor-action-provider.ts:94-193`）——去向：**backlog**。
- **[P2-08] flux-compiler 26 个公开导出中 22 个零 live 消费者**（`flux-compiler/src/index.ts:1-40`）——去向：**backlog**（导出面收敛，无 P1 同 surface）。
- **[P2-09] flux-action-core 26 个公开导出中 19 个零 live 消费者**（`flux-action-core/src/index.ts:1-37`）——去向：**backlog**。
- **[P2-10] flow-designer / report-designer listMethods 手写清单与 manifest 双源并存、无 parity 护栏**（`designer-action-provider.ts:107-151` / `host-action-provider.ts:9-22`）——去向：**backlog**。
- **[P2-11] action-scope-and-imports.md 声称 `dialog`/`drawer` action 名 remains supported，live 无对应实现**（`action-scope-and-imports.md:483-489` vs `constants.ts:31-46`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 2**（与 P1-04 幽灵契约同文档同收口）。
- **[P2-12] action-scope-and-imports.md "Current live shape" 代码块仍含已移除 componentName**（`:273-277,16,249,299,370,659,670,679,686-687`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 2**（与 P1-04 schema 幽灵字段三方收口）。
- **[P2-13] surface-lifecycle-callbacks.md §Finding Algorithm 伪代码与 live refresh-nearest.ts 不符**（`:446-483`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 3**（同文档修订）。
- **[P2-14] resolveInitFetch 裸 catch 静默吞掉 initFetch 求值错误**（`api-data-source-controller.ts:27-39`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 4**（与 P1-06 同为 async 失败传播契约面）。
- **[P2-15] blob-download JSON-in-blob 解析失败被空 catch 吞掉 + 无文件名时合成成功**（`blob-download.ts:74-106`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 4**（同上）。
- **[P2-16] flow-designer reason-only 失败降级为通用 "Action failed"**（`designer-action-provider.ts:46-62,98-103`）——去向：**backlog**。
- **[P2-17] word-editor 两个死代码文件带完整测试套件（假绿覆盖）**（`template-snippets.tsx` / `doc-preview-page.tsx`）——去向：**backlog**。
- **[P2-18] calendar/gantt 时区测试只测 JS 引擎原生语义、零包内导入**（`calendar-timezone.test.ts` ×5 / `gantt-timezone.test.ts` ×4）——去向：**backlog**。
- **[P2-19] kanban e2e 标题 "verifies undo" 但正文无任何移动/撤销断言**（`tests/e2e/kanban-demo.spec.ts:66-82`）——去向：**backlog**。
- **[P2-20] calendar 视图切换链（header 点击 → setActiveView → 子视图渲染）无贯穿测试**——去向：**backlog**。
- **[P2-21] word-editor ribbon-toolbar 在 page 级测试中被 stub，paragraph/template controls 零直接测试**——去向：**backlog**。
- **[P2-22] 444 计划 completed + 119 项未勾选，17-03 rename 确认未落地**（`docs/plans/444-deep-audit-2026-06-02-...md`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 1**（plan 状态事实性修正族）。
- **[P2-23] 2026-07-28-1430 surface-lifecycle-callbacks 源计划 completed + 19 项未勾选，2 项以相反方案落地仅散注**——去向：**折叠进 plan `2026-08-11-1929-3` Phase 1**（同上）。
- **[P2-24] tag-list 渲染器死订阅（useCurrentFormFieldState 结果从未被读取）**（`tag-list.tsx:32`）——去向：**backlog**。
- **[P2-25] page 布局渲染器通过 `footerClassName.includes('fixed')` 子串嗅探驱动几何行为**（`page.tsx:97-103`）——去向：**backlog**。
- **[P2-26] crud 通过硬编码渲染器 type 字符串检测 sibling 节点**（`crud-renderer.tsx:404-412`）——去向：**backlog**。
- **[P2-27] calendar "day cells clickable" / kanban "undo/redo buttons present" e2e 弱断言**——去向：**backlog**。
- **[P2-28] 死代码（无测试）：report-designer `fallbacks.tsx`、flow-designer `ding-flow-canvas-overlay.tsx` 零导入**——去向：**backlog**。
- **[P2-29] flux-runtime 根入口 8 个内部 helper 零外部消费者**（`flux-runtime/src/index.ts:1-39`）——去向：**backlog**。
- **[P2-30] flux-core 根入口 12 个零消费者导出（4 个 contract-honesty 符号仅服务测试共享）**——去向：**backlog**。
- **[P2-31] flux-react 根入口 14 个包内自用导出**——去向：**backlog**。
- **[P2-32] terminology.md SchemaFieldRule 分类列表缺 6 种 live kind**（`terminology.md:143-151`）——去向：**backlog**。
- **[P2-33] boundaries.md:206 引用不存在的子路径 `@nop-chaos/flux-core/i18n-sink`**——去向：**backlog**。
- **[P2-34] CR plan 4 项已落地但 checkbox 未勾选，closure evidence 声称"全部 [x]"矛盾**（`docs/plans/2026-08-06-0329-1-...md:139-142,179`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 1**（plan 状态事实性修正族）。
- **[P2-35] surface-lifecycle-callbacks.md 精确行号锚点漂移 + "live implementation" 片段标识符差异**（`:216,254,256,423,218-241`）——去向：**折叠进 plan `2026-08-11-1929-3` Phase 3**（同文档修订）。

## 备注

- 与 P0/P1 同 closure surface 的 P2 折叠进对应 plan 后，plan 的 `> Source:` 均引用来源审计文件，可追溯性保持。
- 本表为 backlog 登记（非零悬挂承诺）；未折叠条目待后续批次 plan 或裁决收口。
- 两个来源审计已按 mission 规则标记 `Audit Status: planned`（贡献 P0/P1 到已起草 plan）。

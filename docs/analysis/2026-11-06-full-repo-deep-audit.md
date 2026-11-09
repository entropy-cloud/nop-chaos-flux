# 2026-11-06 全仓深度审计（第二轮）：测试有效性 / 生命周期与异步 / 安全面 / 治理卫生

> Status: active analysis（findings 已逐条亲核，归属见 §6 remediation 映射）
> Date: 2026-11-06
> Predecessor: `docs/analysis/2026-11-05-full-repo-deep-audit.md`（文档漂移 / 基线诚实性 / 运行时正确性 / 约定合规与测试缺口——本轮不重复这四维）
> Method: 4 个只读子代理分维度扫描（禁跑重型命令，只读源码）→ 执行会话逐条亲核关键 findings（读码 + 探针脚本）→ 合并本会话执行 856-ux/858/859/860 时实测发现的同类缺陷

## 1. 摘要

本轮的主题是**"看起来有防线，实际防不住"**：测试替身让测试永远测不到真实实现、断言恒真、守卫函数有绕过、扫描器把规范写法当违规、清理标记在 StrictMode 下永久失效。11-05 审计确认"核心运行时硬化良好"，本轮在外围（渲染器包、测试基建、共享守卫函数）找到的缺陷与之并不矛盾，但其中一条是**高严重度安全缺陷**。

| 维度              | High | Medium | Low | 本会话已修                                             |
| ----------------- | ---- | ------ | --- | ------------------------------------------------------ |
| S 安全面          | 1    | 1      | 2   | —                                                      |
| L 生命周期 / 异步 | 0    | 4      | 6   | 2（B1、qrcode）                                        |
| T 测试有效性      | 0    | 3      | 4   | 3（bind-ast 伪断言、qrcode 假信心、FormStub 棘轮登记） |
| G 治理卫生        | 0    | 3      | 5   | 1（扫描器误报）                                        |

## 2. S — 安全面

信任模型（`docs/architecture/security-design-requirements.md`）：schema 视为可信；服务端数据、AI 流式 delta 等**外部数据不可信**。数据绑定的 URL 因此属攻击面。

### S1 [High] `isSafeNavigationUrl` 可被空白/控制字符绕过

- 位置：`packages/flux-core/src/utils/url.ts:41-52`。消费方：`flux-renderers-content/src/link.tsx:49`、`flux-renderers-basic/src/button.tsx:269`、`flux-renderers-content/src/sanitize.ts:76`（markdown/HTML 的 hast URL 属性净化）。
- 机制：守卫用 `/^([a-z][a-z0-9+.-]*):/i` 判 scheme，**不匹配即视为"无 scheme 的相对路径 → 安全"**。而 WHATWG URL 解析器会去掉首尾 C0 控制字符与空格，并删除任意位置的 tab/LF/CR。
- 探针实证（`_tmp/audit-1106/url-probe.mts`，对真实函数 + `new URL()`）：

  | 输入                          | 守卫判定 | 浏览器解析 protocol |
  | ----------------------------- | -------- | ------------------- |
  | `" javascript:alert(1)"`      | safe     | `javascript:`       |
  | `"\tjavascript:alert(1)"`     | safe     | `javascript:`       |
  | `"java\nscript:alert(1)"`     | safe     | `javascript:`       |
  | `"\u0001javascript:alert(1)"` | safe     | `javascript:`       |
  | `"javascript:alert(1)"`       | unsafe   | `javascript:`       |

- 后果：数据绑定的 `href`（link/button）或 markdown/HTML 内容中的链接，只要在 `javascript:` 前加一个空格或在中间插入换行，就能通过守卫并在点击时执行脚本。
- 修法方向：先按 URL 解析器规则归一化（或直接用 `new URL(url, base)` 取 `protocol`，解析失败 fail-closed），再查 allowlist；回归测试覆盖上表全部输入。

### S2 [Medium] `navigate` 动作不经 URL 守卫

- 位置：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:300-315`（仅 `typeof url === 'string'`）→ `packages/flux-runtime/src/action-adapter.ts:479-494` 直传 `env.navigate(args.url)`。playground 宿主 `showcase-env.ts:583-591` 执行 `window.location.replace(url)`。
- 机制：`args.url` 经表达式求值，可来自外部数据（`"url": "${link}"`）。link/button 对同一向量走了守卫，navigate 动作链路遗漏。
- 修法方向：在 action-adapter navigate 分支对 `args.url` 过（修复后的）守卫，不通过则 `ok: false` + 诊断（fail-closed）。

### S3 [Low] `mergeJson` 不跳过 `__proto__` 键（违反 R6）

- 位置：`packages/flux-core/src/json-merge/merge-json.ts:101-117`（`mergeObject`）、`:22-29`（`stripMarkers`）。delta `{"__proto__": {...}}` 会替换**结果对象自身**的原型（子代理 node 实测；`Object.prototype` 未被污染，故 Low）。该函数从 flux-core 公开导出，R6 要求所有从外部数据复制键的代码跳过三键。

### S4 [Low] nop-debugger 面板正则未过 ReDoS 门禁（违反 R7）

- 位置：`packages/nop-debugger/src/panel.tsx:110-119` `parseRegexLiteral` 直接 `new RegExp(...)`，未经 `isBacktrackingSafePattern`。开发者自伤性质，但 R7 要求覆盖所有 sink。

### 已确认有效的防线（无需动作）

无 `eval`/`new Function`；表达式求值器 `DANGEROUS_MEMBER_KEYS` 覆盖 computed/非 computed 成员与对象字面量键；`getIn`/`setIn` 与 scope `sanitizeSnapshot` 防原型污染；HTML 内容默认 DOMPurify；iframe sandbox 合规；无 postMessage 监听。（S1 说明"守卫已接线"不等于"守卫有效"。）

## 3. L — 生命周期与异步卫生

### L1 [Medium-High] 字典请求共享时使用第一个调用方的 AbortSignal

- 位置：`packages/flux-renderers-form/src/renderers/use-dict-options.ts:25-37`（`loadDictShared`）、`:83-103`。
- 机制（亲核）：共享 promise 用首个调用方的 `signal` 发起；条目要到 `.finally`（异步）才删除。文件头注释声称"Hosts that abort (signal) tear only their own subscription out"——与代码不符。
- 触发：①同 dictName 的两个下拉框，加载期间第一个卸载 → 第二个收到 AbortError 显示"Failed to load options"；②StrictMode（playground 启用）mount→cleanup→re-run：re-run 拿到已中止但尚未删除的 promise，`gen` 已是最新 → 写入错误态。宿主 `loadDict` 只要响应 signal 就稳定复现。

### L2 [Medium] `validateField`/`validateAt` 浮动 promise

- 位置：`flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:73,77,94,97`；`flux-renderers-mobile/src/wheel-picker.tsx:57`、`wheel-date-picker.tsx:57`、`wheel-time-picker.tsx:44`、`wheel-cascader.tsx:115`；`flux-renderers-form-advanced/src/write-field-value.ts:26`（被组合字段调用 14 处）。
- 机制（亲核）：`form-runtime-validation.ts` 只吞 `VALIDATION_CANCELLED`、其他错误重抛；主路径 `field-handlers.tsx` 用 `attachValidationRejectionHandler` 接住，这些位点直接 `void`。自定义校验器抛错 → unhandled rejection，绕过 `reportRuntimeHostIssue`。

### L3 [Medium] "已挂载"标记只在 cleanup 置 false、从不复位

- 位置（亲核）：`word-editor-renderers/src/hooks/use-word-editor-state.ts:82,108-112`（`use-word-editor-save.ts` 以之门控成功提示与失败 `env.notify`）；`flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:76-79`。
- 机制：effect 体内没有 `mountedRef.current = true`；StrictMode 双挂载（及 React 19 `<Activity>` 隐藏再显示）后永久为 false。
- 后果：Word 编辑器保存失败的通知被静默吞掉；扫码输入 `scanOnFocus` 不再打开扫码层。

### L4 [Medium] GeoJSON 旧请求结果覆盖新结果

- 位置：`packages/flux-renderers-map/src/use-map-geojson.ts:62-125`。`.then` 只判 `mountedRef`，不判结果所属 `cacheKey` 是否仍为当前（亲核）。区域 A→B 切换且 A 慢于 B 时地图回写为 A。

### L5–L10 [Low]

- L5 `flux-renderers-scheduling/src/kanban/hooks/use-kanban-column-resize.ts:46-75`：卸载不移除 document 监听、无 pointercancel；触屏取消后下一次 pointerup 用过期列宽回写宿主（Medium-Low）。
- L6 `flux-renderers-scheduling/src/gantt/gantt-layout.tsx:44-66`：无 pointercancel，`body` 的 `cursor`/`userSelect` 残留。
- L7 `flux-renderers-data/src/use-url-filter-sync.ts:97,121-127`：重试 `setTimeout` 未清理；"一次性恢复"注释声称的 `restoredRef` 守卫在 effect 开头并未检查。
- L8 `flux-renderers-form/src/field-utils/field-handlers.tsx:286-306`：异步 `adapter.out` 的 generation 只在异步路径递增，迟到结果可覆盖后续同步写入或写进已卸载字段。
- L9 `flux-renderers-data/src/table-renderer/use-table-lazy-children.ts:38,65,80`：`mountedRef` 从未置 false，守卫形同虚设。
- L10 `use-dict-options.ts:21`：外层 `inFlightDictLoads` 以 `env.loadDict` 函数为强引用 key 且从不删除（同文件 `resolvedDictCache` 已是 WeakMap）。
- 待确认（未计入）：`api-data-source-controller.ts:147-153` stop 后 `refresh()` 可复活轮询；`dialog-host.tsx:242` `void surface.onConfirm?.()`；`scada-engine.ts:407` `forceRender()` 无 destroyed 守卫。

### 本会话已修（同维度，记录在案）

- B1（plan 860）：form 外部发布撤回无所有权——后继 runtime 发布被前任延迟 dispose 覆写；值 identity 无法区分（FormRenderer 向每次重建的 runtime 传同一 `initialValues` 引用），改为 `(scope, path)` 最后发布者登记。
- qrcode（plan 859）：渲染失败后修正输入，新挂载的 canvas 从不重绘（effect 内重置 `failed` 时 canvas 尚未挂载）；改为按失败输入派生 `failed`，先红后绿测试在案。

## 4. T — 测试有效性

本会话执行中亲历同类缺陷三例：①`bind-ast.test.ts` 的 `not.toContain('x:scope')` 恒真（helper 不访问该节点，plan 858 round 2 揭出）；②`qrcode.test.tsx` "recovers from a failed render" 只断言 canvas 元素存在、不断言绘制，掩盖了 L 维的 qrcode 缺陷；③flux-react `FormStub` 不向 `createFormRuntime` 传 `valuesPath`，使 P1-MA4.5-006 的 ratchet 结构性不可转绿（plan 860 Deferred）。

### T1 [Medium-High] CodeMirror 全套 mock，挂载/销毁/重配置分支对自造契约断言

- `packages/flux-code-editor/src/use-code-mirror.test.tsx:15-90` mock `@codemirror/state`/`view`/`commands`，`dispatch`、`EditorState.create`、`updateListener.of` 均由测试发明。同目录 `use-code-mirror-controlled.test.tsx` 已用真实 EditorView 覆盖受控方向；mount/unmount/compartment 重配置/readOnly 切换无真实现覆盖。

### T2 [Medium] word-editor 测试替身用 `?? {...}` 兜底掩盖导出丢失

- `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test-support.tsx:143-153`（亲核）：`RowFlex: actual.RowFlex ?? {...}`（`TitleLevel`/`List` 同款）——真实包删除这些枚举导出时测试静默伪造值继续绿。另：整体替换 `createEditorStore`/`createDatasetStore` 为自造 API。

### T3 [Medium] 共享 stub `helpers.evaluate` 为恒等函数；两个 harness 默认值不一致

- `packages/flux-react/src/test-support/mock-props.ts:28-35`：`evaluate = (v) => v`，content/map/graph 25+ 测试文件经此渲染，表达式分支在这些测试里恒等通过。`mock-props.ts` 默认 helpers 为 `{}`，而 `flux-renderers-ai/src/test-support.ts:27` 默认 `stubRendererHelpers`。

### T4–T7 [Low / Medium-Low]

- T4 `scripts/__tests__/chained-gates-red-path.test.ts:47-53`：向真实工作区写 `packages/flux-core/src/__p767_*.ts` 并 `git reset`，恢复失败被 `catch(() => {})` 吞掉。
- T5 `tests/e2e/exploratory/interaction-tests.spec.ts:26,36,51`：`expect(...).catch(() => {})` 吞断言，且整文件 `describe.skip`——双重失效。
- T6 `packages/flux-renderers-layout/src/test-support.tsx:127-302`：重抄 8 个渲染器的 fields 合同，无 parity 机制。
- T7 `packages/flow-designer-renderers/src/__tests__/canvas-bridge-test-support.tsx:53-64`：mock runtime 自造 scope 形状。
- skip/fixme 清单（packages 4 处 + e2e 约 20 处）全部有理由注释与 plan 指针；无 `.only`/`.todo`；全局修改卫生干净。

## 5. G — 治理卫生

- G1 [Medium] `docs/plans/816-business-replication-v1-telemetry-device-plan.md:3` 仍为 `draft`，但唯一 slice completed、Closure Gates 11/11（含独立 closure audit approved）、checkbox 20/20——header 未翻转。
- G2 [Medium] 文档体量：`docs/**/*.md` >40KB 共 286 个（>50KB 186 个），含核心常读文档 `docs/index.md` 132KB、`renderer-runtime.md` 122KB、`form-validation.md` 78KB、`quick-reference.md` 69KB、`action-scope-and-imports.md` 69KB；AGENTS.md 规约"40KB 关注 / 50KB 拆分"无任何门禁。
- G3 [Medium] 豁免条目缺逐条理由：`console-log-baseline.json`（27）、`jsdom-pragma-whitelist.json`（6）、`knip-baseline.json`、`deps-baseline.json` 仅有 header 级说明。
- G4 [Low] plan 835（0/22，11-01 后未动）、836（10/28）、784（draft，0/12）立项未动。
- G5 [Low] 非规范状态词：`2026-07-05-ajax-messages-config-plan.md`（`complete—all 6 phases done`，且无 Last Reviewed）、`2026-06-22-1343-1-...plan.md`（`abandoned`，应为 `cancelled`）。
- G6 [Low] `docs/plans/` 下两文件无 `Plan Status` header：`2026-07-29-row-scope-migration-candidates.md`（实为分析清单）、`2026-10-04-554-editor-designer-p33-scope-projection-plan.md`。
- G7 [Low] `quick-reference.md:3,1030` 源码路径缩写（`flux-react/src/hooks.ts` 等），可解析但非 verbatim。
- G8 [已修，plan 860] `catch-without-structured-failure-path` 扫描器不识别规范上报通道 `reportRuntimeHostIssue`，误报 6 处（含 5 处既有）；已修扫描器 + 回归测试 + 基线收缩。
- G9 [Decision，plan 859 D3] raw HTML 控件绕过 ui 组件无机械门禁（人工盘点漏检 12+ 处实证）→ 裁决加 ratchet 门禁。
- 健康项：门禁接线完整（27 个 check 脚本全注册）、无假门禁、无死豁免、docs/index.md 486 个路径引用 485 存在、AGENTS.md 声明逐项属实。

## 6. Remediation 映射

| Plan | 结果面                        | 收编 findings                                                                       |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------- |
| 861  | 导航 URL 安全与外部数据键安全 | S1、S2、S3、S4                                                                      |
| 862  | 渲染器生命周期与异步卫生      | L1–L10                                                                              |
| 863  | 测试替身与断言有效性          | T1–T7 + T8（plan 859 全量验证实测：mobile wheel 测试负载敏感）                      |
| 864  | 治理门禁与计划卫生            | G1、G3（console）、G4、G6、G7、G9（raw 控件逐实例门禁，承载于 ui-consistency gate） |

draft review 后的归属调整：G2 文档体量门禁 → plan 784（文档容量 owner；"基线增长即红"会挡住 AGENTS 强制的文档维护，须与拆分节奏一起设计）；G5 两个历史计划的非规范状态词 → 不回写（Rule 21，内容无事实错误）；G3 中 jsdom 白名单已有分组理由 → 非缺口；L2 补入 `tag-list.tsx:44,127` 两处同类浮动 `validateAt`（全仓 11 行）。

合并依据（plan guide Rule 22/25）：每组 findings 共享同一验证路径与 owner-doc 面；S 组共享 `security-design-requirements.md` 与同一组安全回归测试，L 组共享"卸载/竞态/浮动 promise"判别测试模式。

# Round 02 — form 包相对日期假绿、upload 清空竞态、button anchor rel、input-number 显示/存储脱钩

> 执行批次：`2026-08-11-1929-open-audit-component-audit-round2`（mission `component-audit-round2` 开放式对抗审查）
> 视角：契约考古学家 + 组合爆炸测试者 + 异常路径侦探
> 去重背景：round-01 之外的新包（flux-renderers-form / form-advanced / basic button）；不重复 multi-audit 已登记项。

## 发现 R2-F1（P1）— 相对日期表达式（minDate/maxDate 的 `now`/`today`/`now±Nd` 等）在三个 date 渲染器中整体静默失效，测试为假绿

- **在哪里**：`packages/flux-renderers-form/src/renderers/input-date-renderer.tsx:30-45`、`input-datetime-renderer.tsx:42-57`、`date-range-renderer.tsx:126-141`；链：`date-utils.ts:315-354`（`resolveRelativeDate` → `new Date().toISOString()` 产出 `2026-08-11T12:34:56.789Z`）→ `date-utils.ts:159-184`（`parseDate` 锚定 `^…$` token 正则）→ `toCalendarDate(undefined)` → 约束被静默丢弃。测试 `input-date-relative.test.tsx` 12+ 用例只测 `resolveRelativeDate` 单函数，从不经过 `parseDate`/渲染器。
- **是什么**：design.md §4.0（docs/components/input-date/design.md:23-32）明示 `minDate`/`maxDate`/`value` 支持相对日期表达式、"在 `parseDate` 调用前经 `resolveRelativeDate()` 转换"。但转换产物是 ISO 字符串，而 `parseDate` 的正则按 `valueFormat`（默认 `YYYY-MM-DD`）锚定构建——ISO 串永远不匹配 → 返回 undefined → 约束不生效。`minDate:'now'` 的日历没有任何禁用范围；`maxDate:'today-1d'` 允许选择任意未来日期。绝对日期（`'2026-08-11'`）经 pass-through 分支不受影响。
- **为什么值得关心**：文档化的相对日期约束是日历控件核心能力（禁止过去/未来日期是最常见业务约束）；静默失效意味着业务约束不成立且无任何诊断；测试套件全绿掩盖集成断裂（与 2026-08-10 ai 审计的 "timezone-safe" 假绿同一模式：测试只测 JS/单函数原生语义，不测真实接线）。
- **修复方向**：`resolveRelativeDate` 返回与 `valueFormat` 兼容的字符串（如按格式格式化），或 `parseDate` 增加 ISO 分支；补「renderer 级 minDate:'now+1d' → 日历禁用范围」集成测试。
- **信心水平**：确定（正则锚定 + ISO 串逐环可证；12 个测试全为单函数隔离测试）。

## 发现 R2-F2（P1）— upload `clearAll` 不中止在途上传：清空后文件被迟到的成功响应悄悄写回

- **在哪里**：`packages/flux-renderers-form-advanced/src/upload-field.tsx:430-433`（`clearAll` 只 `setItems([])` + `commitItems([])`）vs `:153-171`（unmount 路径 abort 全部 controller）与 `:213-304`（`performUpload` 成功续体只检查 `mountedRef`/`controller.signal.aborted`，无「已清空」标记）。非 multiple 模式 `:267`（`successItems = [item]` 无条件覆盖）。
- **是什么**：用户点击 clearAll 时在途上传不中止；上传成功后 `commitItems` 把值重新写回（非 multiple 直接覆盖为 `[item]`），`onUploadSuccess` 照常派发——**用户已清空的字段静默复活**。同根因的第二实例：非 multiple 模式下选择新文件时旧上传未完成，最终生效的是「后解析」而非「后选择」的文件。
- **为什么值得关心**：清空是常见操作（重新选择/取消）；在途上传在慢网络下窗口很大；用户可见的数据竞态（删除的文件回来），且错误提示/审计无从发现。
- **修复方向**：`clearAll` 遍历 abort 全部在途 controller（与 unmount 路径共享 helper）；`performUpload` 成功续体校验「上传发起时字段未被清空/替换」。
- **信心水平**：很可能（时序相关；代码路径确定：clearAll 无 abort、成功续体无条件 commit）。

## 发现 R2-F3（P2）— button 以 anchor 渲染且 `target="_blank"` 时不输出 `rel="noopener noreferrer"`

- **在哪里**：`packages/flux-renderers-basic/src/button.tsx:252-263`（`<a href target={props.props.target}>` 无 rel）；对照 `packages/flux-renderers-content/src/link.tsx:14-16`（link 渲染器对 `_blank` 显式加 `noopener noreferrer`）。
- **是什么**：同仓 sibling 渲染器对该风险有显式防护，button 缺失；`button-href-safety.test.tsx` 覆盖 scheme 守卫但无 rel 断言。现代浏览器对 `target="_blank"` 隐式 noopener（reverse tabnabbing 风险已大幅降低），但旧浏览器/WebView 仍暴露 `window.opener`；且与 link 渲染器的显式约定不一致。
- **修复方向**：`target === '_blank'` 时补 `rel="noopener noreferrer"`（如用户未显式提供 rel）。
- **信心水平**：确定（代码直读）；风险等级按现代浏览器默认行为保守标 P2。

## 发现 R2-F4（P2）— input-number 非法中间输入（badInput）清空存储值，显示与提交脱钩

- **在哪里**：`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:248-258`（onChange：`raw === '' → onChange(undefined)`；`type="number"` 下 malformed 文本如 `'1.2.'`/`'5e'` 浏览器报 `value === ''` 且 `validity.badInput=true`）与 `:112-122`（handleBlur 从 store `numericValue` 回钳，从不读 DOM ref）。
- **是什么**：用户输入 `'1.2.'` 时每次 change 事件都 `onChange(undefined)`——显示层仍显示 `'1.2.'`，存储值已被抹掉；blur 后不恢复（store 为 undefined），表单提交静默提交 undefined，用户看到的却是非空输入。`input-number.test.tsx` 无 badInput 覆盖。
- **修复方向**：`event.target.validity.badInput` 时不 commit（保留 DOM 显示），blur 时从 `inputRef.current.value` 恢复解析。
- **信心水平**：很可能（代码路径确定；badInput 行为为浏览器语义）。

## 发现 R2-F5（P2）— 轻微漂移合集（alert payload、fieldset 折叠不随 prop 重同步、stat-tile sparkline 双实现、link rel 覆盖、card 无键盘可达）

- **alert onClose payload**：`alert-renderer.tsx:71-76` 派发 `{ type: 'alert:close', level }`，definitions（content-renderer-definitions.ts:308-315）契约只记录 `{ level }`；且 dispatch scope 用 `props.node.scope`，同包其他渲染器（upload/card）用 `useRenderScope()`——同包双 scope 来源。
- **fieldset collapsed**：`fieldset.tsx:25` `useState(slotProps.collapsed)` 只作初始化；scope/表达式驱动的 `collapsed` 变更在挂载后失效（同族：alert `open` 无 schema 入口重新展示）。既有 adjudication #4（fieldset collapsed props→state 种子属文档化初始折叠）——本发现聚焦「运行时变更不响应」，与初始种子裁定不冲突，标 P2。
- **stat-tile sparkline 双实现**：`stat-tile-renderer.tsx:118-146` 内联重写 `buildSparklineGeometry`（`sparkline-path.ts` 已有导出并被 sparkline-renderer 使用）；平直数据 `[5,5,5,5]` 两实现渲染语义不同（底部贴边 vs 垂直居中），注释声称"shared computation semantics"。
- **link 用户 rel 覆盖**：`link.tsx:7-18` 用户提供 `rel="nofollow"` 时 `noopener` 被覆盖（低风险，P2）。
- **card 无键盘可达**：`card.tsx:42` 纯 div `onClick`，无 role/tabIndex/onKeyDown（image 渲染器有 Enter/Space 先例）。
- **信心水平**：alert/fieldset/link/card 确定（代码直读）；stat-tile 确定（两实现并行存在，语义差异可复现）。

## 本轮排除（读过、验证后放弃）

- qrcode 超大 payload、image/video/audio 生命周期——有 abort/清理，正常。
- html/markdown sanitize 门——默认开启 + 逃生口契约正确（含 javascript: 扫描确认）。
- date-utils 单一日期引擎——无重复格式化器。
- input-number 的 min/max/precision 主路径——clamp/applyPrecision 正确；仅 badInput 路径有洞。

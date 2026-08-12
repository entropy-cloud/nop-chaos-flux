# Round 01 — barcode-input 扫描主流程死锁、pivot loading 空白、wizard 提交竞态

> 执行批次：`2026-08-11-1929-open-audit-component-audit-round2`（mission `component-audit-round2` 开放式对抗审查）
> 视角：组合爆炸测试者（mount-closed → open 转换）+ 异常路径侦探 + 时序攻击者
> 去重背景：已读 2026-08-11-1929-multi-audit（P1-01..06 + P2-07..35）、2026-08-09-1114-open-audit round-01..03、2026-08-10-2245-ai-invariant-loop round-01..03；本轮全部为未覆盖包（scheduling barcode / pivot / dashboard / layout wizard 等）的新发现。

## 发现 R1-F1（P0）— barcode-input 解码轮询在标准 UX 主流程中永远不会启动：扫码功能整体失效

- **在哪里**：`packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts:40-47`（主 effect deps `[]` + `const video = getVideoRef.current(); if (!video) return;` 早退）；挂载链：`barcode-input.tsx:29`（`overlayOpen` 初始 `false`）→ `barcode-input.tsx:335-349`（overlay **无条件挂载**）→ `barcode-scanner-overlay.tsx:81-89`（hook 调用点）→ `barcode-scanner-overlay.tsx:226`（`if (!open) return null` → video 不在 DOM）→ `barcode-scanner-overlay.tsx:108-142`（相机启动 effect 有 `[open,...]` deps，**会**在 open 翻转时重跑——只有检测轮询不会）。
- **是什么**：`useBarcodeDetect` 的主 effect 依赖数组为 `[]`，只在 overlay 组件首次挂载时执行一次；首次挂载时 `open=false` → overlay 返回 null → `videoRef.current` 为 null → 命中第 46 行早退，`poll()` 从未被调度。之后用户点击扫码按钮把 `open` 翻转为 true：相机 effect（deps 含 `open`）重新执行、摄像头正常启动、`phase='scanning'`，但检测轮询 effect 不会重跑 → **永远没有一次 `detector.detect()`**。`detect.isScanning` 恒 false，`detect.result` 恒 null。
- **为什么值得关心**：这是扫码功能的**主流程**（挂载时关闭 → 点击扫码打开 → 识别）。设计的本意显然不是这样——`poll()` 内部第 67-75 行专门处理了 `enabled=false` 的空转分支（等待 enable），第 77-88 行也处理了 `video` 缺失的兜底重试；唯一破坏设计的是第 46 行的 `if (!video) return` 早退，它让整个轮询链从未建立。测试全绿的原因是测试从不覆盖「关闭态挂载 → 打开」转换：`use-barcode-detect.test.ts` 总是提供 video 元素，overlay 测试总是 `open={true}` 挂载。等价修复极小（删早退，让 `poll` 自行空转等 video），但影响是组件核心能力 100% 失效。
- **修复方向**：删除 `use-barcode-detect.ts:46` 的早退（`poll()` 已处理 video 缺失与 enabled=false）；补「mount closed → open 翻转 → 检测启动」的回归测试。
- **信心水平**：确定（React 生命周期逐行可证：deps `[]` + 条件渲染在组件内部 + 无 key 重挂载）。

## 发现 R1-F2（P1）— pivot 表格经历 loading 周期后变空白：VTable 实例悬挂在已卸载节点上，新 canvas div 永不绑定

- **在哪里**：`packages/flux-renderers-pivot/src/pivot-renderer.tsx:116,129-183,209-258`；对照 `usePivotTheme`/`instanceRef` 生命周期。
- **是什么**：实例生命周期 effect（:129-183）deps 为 `[empty, option, data, props.id, props.meta.cid, props.node.scope]`——**不含 `loading`**。`loading=true` 时渲染分支（:209-220）替换掉 `containerRef` div（:256 的 `nop-pivot-canvas` 卸载），但 `instanceRef.current` 的 VTable 实例仍存活、绑定在已从 DOM 摘除的旧节点上。`loading` 翻回 false 后：新 canvas div 挂载，但 effect 不重跑（deps 未变）→ 实例从不与新 div 绑定；即使 `data` 随后变化（deps 触发重跑），`existing.setRecords(data)` 也只作用于旧实例 → **空白区域永久保持**（直到组件卸载）。
- **为什么值得关心**：`loading` 是 schema 公开 prop（骨架屏场景标配）；host 在刷新数据时翻转 loading 后表格消失且无任何错误提示，与 `empty` 分支（同样替换 canvas div 但 `empty` 在 deps 中）行为不对称。
- **修复方向**：把 `loading` 加入 deps（或在 loading 分支 render 时 `instanceRef.current?.release()` 并在恢复时重建）；补「loading=true → false」回归测试。
- **信心水平**：确定（代码路径逐行可证；渲染分支替换 ref 节点是确定性行为）。

## 发现 R1-F3（P1）— wizard 异步提交期间导航不锁定：commit 续体在过期闭包上运行，用户被拽回错误步骤

- **在哪里**：`packages/flux-renderers-layout/src/wizard-renderer.tsx:325-453`（commitStep）、`:493-521`（step nav 按钮点击）、`:640-668`（Prev/Next 按钮）。对比：Next 按钮在 `committing` 时 disabled（:659），但 step nav（:520 `disabled={!clickable && !isActive}`）与 Prev（:647 `disabled={!canGoPrev}`）**不检查 committing**。
- **是什么**：`commitStep` 在 `await props.events.onStepCommit(...)`（:377）或 `formHandle.capabilities.invoke('validate')`（:343）期间，用户可点击 step nav 或 Prev 导航（`goToStep` 无 committing 检查，:264-301）。导航成功后 re-render；但 commit 的 promise 续体在**点击时捕获的旧闭包**上继续执行：`isLastStep`（:416）、`goNext()`（:432）都引用点击时的 `currentStepIndex`。具体后果：step 0 提交中 → 用户点 step 2 → 提交 resolve → 旧闭包 `goNext()` 推进到 **step 1**（`wizard:change` 事件也按 step 1 派发）→ 用户落在 step 1 而非 step 2；末步提交中导航 → `onComplete` 对用户已离开的步骤触发；提交失败 → `wizard:step-error` payload 携带过期的 `currentStepKey/currentStepIndex`。
- **为什么值得关心**：异步 step 提交是一等公民（`wizard-event-ctx.test.tsx` 用 `action:'ajax'` 测试）；竞态产出错误步骤导航 + 欺骗性事件 + 误导性 statusPath 摘要。测试只覆盖同 tick 双击 Next（C5.1 P3-3，与本发现不同——那是重复提交防护，这个是导航与提交交错）。
- **修复方向**：`goToStep`/`goPrev` 在 `lifecycle.committing` 时拒绝（或 commit 续体读取 ref 而非闭包、并在续体执行时校验目标步骤仍是点击时的步骤）；补「commit 期间导航 → 结果落在用户目标步骤」回归测试。
- **信心水平**：确定（纯闭包/状态推演，无任何锁定路径）。

## 发现 R1-F4（P1）— dropdown-button `trigger="hover"` 对鼠标用户完全不可用：portal 菜单在鼠标离开触发按钮瞬间关闭

- **在哪里**：`packages/flux-renderers-layout/src/dropdown-button-renderer.tsx:74-76`（`onMouseEnter/onMouseLeave` 挂在**外层 wrapper div**）；`packages/ui/src/components/ui/dropdown-menu.tsx:60`（`MenuPrimitive.Portal` 把菜单渲染到 `document.body`）。
- **是什么**：hover 模式的开关挂在 wrapper 上，而菜单内容经 portal 渲染到 body——**不是 wrapper 的 DOM 子节点**。鼠标从触发按钮移向菜单的瞬间离开 wrapper → `onMouseLeave` → `setOpen(false)`，菜单在用户够到它之前就消失；`sideOffset=4` 的间隙更让离开必然发生。结果：`trigger="hover"` 的唯一可用路径退化为点击（且点击后只要鼠标一动就关闭）。该选项在 `DropdownButtonSchema`（schemas.ts:229）、definitions（layout-renderer-definitions.ts:562-573）、design.md §4 均有文档，属于公开契约选项整体失效。
- **为什么值得关心**：文档化交互模态静默失效；hover 测试只断言 `data-trigger="hover"` 存在（dropdown-button-renderer.test.tsx:160-183），无任何真实 hover 交互覆盖。
- **修复方向**：hover 开关移到共享的 trigger+content 层（如 Base UI hover API 或 trigger 上 open/close 加延迟），或显式将 hover 降级为 click 并更新文档。
- **信心水平**：很可能（portal 机制确定；无 hover 交互测试佐证失效路径）。

## 发现 R1-F5（P2）— collapse/steps/timeline 三渲染器 scope 模式：写入 null 被 `??` 跳过，作者化 value 种子复活

- **在哪里**：`collapse-renderer.tsx:100,110`；`steps-renderer.tsx:135,147`；`timeline-renderer.tsx:154,161`；配合 `flux-runtime/src/scope.ts:494`（update 存 `null` 而非 delete）+ `flux-core/src/utils/path.ts:180-184`（getIn 对 null 值返回 null）。
- **是什么**：scope 所有权模式下，关闭最后一个 collapse 面板 / 清除步骤值会向 scope 写 `null`；渲染期读链 `toKeyArray(effectiveScopeValue ?? schemaProps.value ?? localExpanded)` 中 `??` 跳过 null → 回落到作者化的 `schemaProps.value` → **刚被用户关闭的面板/清除的步骤立刻复活**。三个渲染器同构。
- **为什么值得关心**：scope 是这两个组件文档化的两种 canonical 所有权模式之一；用户可见状态不一致（面板关闭后自动弹开）。
- **修复方向**：读链把 null 当作「已清空」处理（`effectiveScopeValue != null ? ... : localExpanded`），或写路径改为 delete。
- **信心水平**：确定（scope.update 存 null + getIn 返回 null + `??` 语义逐环可证）。

## 发现 R1-F6（P2）— collapse 本地模式种子优先级与同包已修复先例相反

- **在哪里**：`collapse-renderer.tsx:90`（`schemaProps.defaultValue ?? schemaProps.value`）vs `steps-renderer.tsx:133-135`（`value ?? defaultValue`）；`layout-renderer-definitions.ts:297-308`（value: "Current expanded value..."; defaultValue: "Initial expanded value when value is not provided"）。
- **是什么**：C5.2 期间 steps（P2-2）与 button-group（P2-3）已把种子优先级修正为「value 优先」，collapse 是同一 package 家族中唯一保留倒置分支的成员；definitions 文本也暗示 value 优先。collapsible 的 C5.2 种子优先级测试只覆盖 steps/button-group。
- **修复方向**：改为 `value ?? defaultValue`。
- **信心水平**：确定（代码直读 + 同包先例）。

## 发现 R1-F7（P2）— wizard 数值 `value` 从不尝试 key 匹配，违反 schema 文档契约

- **在哪里**：`wizard-renderer.tsx:92-94`（`typeof initial === 'number'` 直接 clamp 为 index）vs `schemas.ts:32-37`（"Initial current step key or index (0-based index **when numeric and no matching key**)"）+ `layout-renderer-definitions.ts:52-57`（同文）。对照同包 steps `matchKeyIndex`（steps-renderer.tsx:38-46）与 timeline `resolveEventIndex`——两者对数值都先尝试 key 匹配。
- **是什么**：数值型步骤 key（`key: 2`）配 `value: 2` 时，wizard 落在 index 2（第三个步骤）而不是 key-2 步骤。数值字符串 `"2"` 反而会走 key 匹配（`:95` 非 number 分支）——同值不同类型行为不一致。
- **修复方向**：数值先 `findStepIndexByKey`，未命中再 clamp 为 index。
- **信心水平**：确定（代码 vs 文档直读）。

## 发现 R1-F8（P2）— wizard `stepError` 从未渲染：真实错误消息在 UI 层被丢弃

- **在哪里**：`wizard-renderer.tsx:433-439`（catch 分支把 `error.message` 存入 `stepError`）vs `:682-693`（错误盒只渲染通用 `t('flux.wizard.commitFailed')`/`validationFailed`）。
- **是什么**：专用 `stepError` 字段是死 UI——真实消息只经 statusPath 可达；`role="alert"` 区域对提交抛错显示通用文案。
- **修复方向**：错误盒优先渲染 `stepError`（至少展示 message）。
- **信心水平**：确定。

## 发现 R1-F9（P2）— 若干文档-代码漂移（barcode-input design.md、map schemas、pivot indicators、dashboard 同构声明、barcode 离线横幅）

- **在哪里**：`docs/components/barcode-input/design.md:40,42,141` vs `barcode-input.tsx:346`（continuousScan 文档默认 true / 代码默认 false；wasmUrl 文档承诺默认 CDN / 代码 fail-closed 抛错且文档未注明）；`packages/flux-renderers-map/src/schemas.ts:78`（"false 时渲染 loading 态" 注释与实现相反）；`pivot-option.ts:88-122`（`indicators[].format` 声明 + definitions:195 收录但实现从不读取）；`docs/components/dashboard-editor/design.md:29-46`（"编辑态坐标 → 运行态渲染零转换（同构）"）vs `dashboard-renderer.tsx:80`（`canvasWidth = 1200` 硬编码）与 `editor/editor-canvas.tsx:39-55,326`（编辑器按实测容器宽换算）——运行态容器宽度 ≠ 1200 时面板位置与编辑态不一致。
- **barcode-input 离线横幅**：`barcode-scanner-overlay.tsx:313-317` + `locales/en-US.ts:827`（"scans will auto-submit when reconnected"）承诺「恢复网络后自动提交」，但队列仅内存态（`createBarcodeQueueStore`），无任何 online 事件 flush 逻辑；design.md §12.2 自述离线链未实现——UI 承诺不存在的行为。
- **修复方向**：文档对齐代码（或代码对齐文档）逐项收口；离线横幅文案改为「本地暂存，手动提交」。
- **信心水平**：确定（逐处代码/文档直读比对）。

## 发现 R1-F10（P2）— timeline 根禁用时条目仍可键盘聚焦（inert-but-focusable）

- **在哪里**：`timeline-renderer.tsx:218,269-290`（`rootDisabled` 时 `handleSeek` 早退，但 `tabIndex=0`/`role="button"`/Enter-Space handler/`cursor-pointer` 全部保留，无 `aria-disabled`）。对照 steps（steps-renderer.tsx:266）用原生 button `disabled` 正确处理。
- **修复方向**：rootDisabled 时移除交互属性或加 `aria-disabled` + 禁用态样式。
- **信心水平**：很可能（a11y 缺口；无 rootDisabled 测试）。

## 本轮排除（读过、验证后放弃）

- countdown/pull-refresh/infinite-scroll 的计时器与观察器生命周期——多轮修复（MA/MM/OA 系列）已覆盖，未发现残余。
- carousel autoplay 的 pause 源组合——F1/F2 修复已正确；`setValue` 在 api 未就绪时返回 ok:true 属边界噪声，不报。
- html/markdown 的 sanitize 门——默认开启 + 显式逃生口，契约正确。
- wizard `lastCommitStatus === 'validationError'` 不置 error 标记（nav marker 视觉不一致）——轻微，并入 R1-F8 家族不单独报。

> Audit Status: closed
> Audit Type: open-ended
> Mission: component-audit-round2

# Open-Ended Audit — component-audit-round2（2026-08-11 19:29）

## 执行方式

- **对象**：仓库根 `./`。视角：组合爆炸测试者（mount-closed → open 转换、loading 周期）、异常路径侦探、时序攻击者（异步交错）、契约考古学家（审计卡 vs live 代码 vs 文档三方核验）。未绑定 deep-audit 维度清单；从代码异常信号切入。
- **去重**：先读 2026-08-11-1929-multi-audit（P1-01..06 / P2-07..35）、2026-08-09-1114-open-audit round-01..03（table maxWidth / surface 发布）、2026-08-10-2245-ai-invariant-loop round-01..03、`docs/reopened-design-decisions-and-audit-adjudications.md`，再对每个候选回查 `docs/audits/per-component/` 卡片（barcode-input/wizard/steps/timeline/collapse/input-date）。所有 P0/P1 与关键 P2 均经主 agent live 复核（读代码 + 读文档 + 逐行推演），非子 agent 转述。
- **每轮结果落盘**：`docs/analysis/2026-08-11-1929-open-audit-component-audit-round2/round-01.md`（scheduling/pivot/wizard/dropdown/layout 族）、`round-02.md`（form/upload/basic 族）、`round-03.md`（审计卡去重核验与残余细化）。

## 发现汇总

| #   | 优先级 | 一句话                                                                                                                                                                                                                                    |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P0     | barcode-input 解码轮询在「关闭态挂载 → 打开」主流程中永不启动：扫码功能整体失效（deps `[]` + video 早退），测试全绿                                                                                                                       |
| 2   | P1     | pivot 经历 `loading` 周期后表格永久空白：VTable 实例悬挂在已卸载节点，新 canvas div 不绑定（`loading` 不在实例 effect deps）                                                                                                              |
| 3   | P1     | wizard 异步提交期间导航不锁定：commit 续体在过期闭包上运行，用户被拽回错误步骤 + 欺骗性事件                                                                                                                                               |
| 4   | P1     | dropdown-button `trigger="hover"` 对鼠标用户完全不可用：portal 菜单在指针离开触发按钮瞬间关闭                                                                                                                                             |
| 5   | P1     | 相对日期表达式（`now`/`today`/`now±Nd` 等）在 input-date/input-datetime/date-range 三渲染器整体静默失效，测试为假绿                                                                                                                       |
| 6   | P2     | upload `clearAll` 不中止在途上传：清空后文件被迟到成功响应写回（非 multiple 下「后解析」覆盖「后选择」）                                                                                                                                  |
| 7   | P2     | collapse/steps/timeline scope 模式：写入 null 被 `??` 跳过，作者化 value 种子复活（collapse 用户可见：面板关闭后弹开）                                                                                                                    |
| 8   | P2     | collapse 本地种子优先级倒置（`defaultValue ?? value`）——C5.2 已修 steps/button-group 同族缺陷，collapse 为剩余成员                                                                                                                        |
| 9   | P2     | wizard 数值 `value` 从不尝试 key 匹配——P1-2 修复后文档被改写回「when numeric and no matching key」二次漂移                                                                                                                                |
| 10  | P2     | wizard `stepError` 真实错误消息仍在 UI 死区（P2-2 修复残余：错误盒只显示通用 i18n 串）                                                                                                                                                    |
| 11  | P2     | barcode design.md 仍声明 continuousScan 默认 true / wasmUrl 默认 CDN（卡声称已同步但未同步）；离线横幅向用户承诺不存在的自动提交                                                                                                          |
| 12  | P2     | timeline 审计卡过时：卡称「display-only 无 owner 状态」，live 已有完整三态 ownership                                                                                                                                                      |
| 13  | P2     | timeline 根禁用时条目仍可键盘聚焦（inert-but-focusable，无 aria-disabled）                                                                                                                                                                |
| 14  | P2     | button anchor `target="_blank"` 无 `rel="noopener noreferrer"`（link 渲染器有显式先例）                                                                                                                                                   |
| 15  | P2     | input-number badInput 中间态：非法输入抹掉存储值，显示与提交脱钩                                                                                                                                                                          |
| 16  | P2     | dashboard 运行态硬编码 `canvasWidth=1200` 违反「编辑/运行同构零转换」声明；编辑器按实测宽换算                                                                                                                                             |
| 17  | P2     | 死代码/死契约/死订阅合集：dashboard 8 个零消费者导出、barcode `clearCameraAvailabilityCache` 零消费者、code-editor `options`/sqlConfig.keywords 等声明不消费、pivot `indicators[].format` 静默 no-op、map schemas `loading` 注释语义反转  |
| 18  | P2     | 轻微漂移合集：alert onClose payload 多 `type` 键 + 双 scope 来源、fieldset collapsed 不随运行期变更、stat-tile 内联重写 sparkline 几何（平直数据语义分叉）、link 用户 rel 覆盖 noopener、card 无键盘可达、markdown src 切换失败显示旧内容 |
| 19  | P2     | 惯例违例：dashboard editor-canvas/editor-palette 裸 `<button>`（AGENTS.md 强制 @nop-chaos/ui 组件）；wizard/layout 家族手写 memo/useCallback 无 react-compiler disable 注释                                                               |

## P0 发现

### [P0-01] barcode-input 扫码识别在标准主流程中永不启动——组件核心能力整体失效

- **位置**：`packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts:40-47`；挂载链 `barcode-input.tsx:29,335-349` → `barcode-scanner-overlay.tsx:81-89,226,108-142`
- **是什么**：主 effect deps 为 `[]`（仅挂载时执行一次），且第 46 行 `const video = getVideoRef.current(); if (!video) return;` 早退。overlay 组件被渲染器无条件挂载（内部 `!open` 时返回 null），首次挂载时必然 `open=false` → video 为 null → 早退 → `poll()` 从未调度。`open` 翻转为 true 后：相机启动 effect（deps 含 `open`）正常重跑、摄像头开启、`phase='scanning'`，但检测轮询永不建立——**一次 `detector.detect()` 都不会执行**。`enabled`（`:82` `open && camera.isActive`）只在 `poll()` 内部被读取，而 `poll()` 从不运行。
- **为什么值得关心**：这是扫码功能的唯一主流程（挂载时关闭 → 点击扫码打开 → 识别）。`poll()` 内部本已正确处理 `enabled=false` 空转（:70-75）与 video 缺失重试（:77-88）——设计意图明确是轮询从挂载即运行、等待 enable；第 46 行的早退破坏了整个链。测试全绿的唯一原因是 `use-barcode-detect.test.ts` 总是提供 video 元素、overlay 测试总是 `open={true}` 挂载，从不覆盖「关闭态挂载 → 打开」转换。等价修复极小（删除早退），影响为组件功能 100% 失效。
- **优先级依据**：incorrect behavior（核心功能在标准流程中完全失效）+ 无测试覆盖该转换路径，MUST be fixed。
- **信心水平**：确定（React 生命周期逐行可证：deps `[]` + 组件内部条件渲染 + 无 key 重挂载）。

## P1 发现

### [P1-02] pivot 表格经历 loading 周期后永久空白

- **位置**：`packages/flux-renderers-pivot/src/pivot-renderer.tsx:116,129-183,209-258`
- **是什么**：实例生命周期 effect deps 为 `[empty, option, data, props.id, props.meta.cid, props.node.scope]`，**不含 `loading`**。`loading=true` 时渲染分支替换掉 `containerRef` div（canvas 卸载），但 `instanceRef` 的 VTable 实例仍存活并绑定在已摘除节点上；`loading` 翻回 false 后新 canvas div 挂载，effect 不重跑 → 永不绑定；即使 `data` 同时变化触发重跑，`setRecords` 也只作用于旧实例 → 空白保持到卸载。`empty` 分支有同样的节点替换，但 `empty` 在 deps 中（进入/离开 empty 会重建），唯独 `loading` 被遗漏——不对称。
- **优先级依据**：material defect：公开 schema prop 的常规使用（刷新数据）产生无提示空白。
- **信心水平**：确定。

### [P1-03] wizard 异步提交期间导航不锁定，commit 续体过期闭包把用户拽回错误步骤

- **位置**：`packages/flux-renderers-layout/src/wizard-renderer.tsx:325-453`（commitStep）、`:493-521`（step nav）、`:640-668`（Prev/Next）；Next 按钮 committing 时 disabled（:659），step nav（:520）与 Prev（:647）不检查 committing。
- **是什么**：`commitStep` 在 `await onStepCommit`/`formId validate` 期间用户可导航（`goToStep` 无 committing 门）。导航成功后 re-render，但 commit 续体在点击时捕获的旧闭包上执行：`isLastStep`（:416）与 `goNext()`（:432）引用旧 `currentStepIndex` → 用户在 step 2，续体推进到 step 1 并派发 step 1 的 `wizard:change`；末步提交中导航 → `onComplete` 对已离开步骤触发；失败路径 `wizard:step-error` 携带过期 key/index。
- **优先级依据**：material defect：异步步进是一等公民，竞态产出错误步骤导航与欺骗性事件。与卡内 P3-3（同 tick 双击 Next 重复提交）是不同竞态。
- **信心水平**：确定（闭包/状态推演；无任何锁定路径）。

### [P1-04] dropdown-button `trigger="hover"` 对鼠标用户完全不可用

- **位置**：`packages/flux-renderers-layout/src/dropdown-button-renderer.tsx:74-76` + `packages/ui/src/components/ui/dropdown-menu.tsx:60`（`MenuPrimitive.Portal`）
- **是什么**：hover 开关挂在 wrapper div 上，菜单内容经 portal 渲染到 `document.body`——不是 wrapper 子节点。指针离开触发按钮的瞬间 `onMouseLeave` 关闭菜单；菜单永远不会被 hover 到。文档化选项（schemas.ts:229 / definitions / design.md §4）对鼠标用户整体失效，退化为点击模式；hover 测试只断言 `data-trigger="hover"` 存在。
- **优先级依据**：material defect：公开 schema 选项对其主要输入模态静默失效。
- **信心水平**：很可能（portal 机制确定；hover 路径无交互测试）。

### [P1-05] 相对日期表达式在三个 date 渲染器整体静默失效（测试假绿）

- **位置**：`input-date-renderer.tsx:30-45`、`input-datetime-renderer.tsx:42-57`、`date-range-renderer.tsx:126-141`；`date-utils.ts:315-354`（`resolveRelativeDate` 产出 ISO 串）→ `date-utils.ts:159-184`（`parseDate` 锚定 `^…$` token 正则）→ `toCalendarDate(undefined)`。
- **是什么**：design.md §4.0 文档化 `minDate`/`maxDate`/`value` 支持 `now`/`today`/`now±Nd` 等相对表达式。但 `resolveRelativeDate` 返回 `2026-08-11T12:34:56.789Z` 形式 ISO 串，`parseDate` 的正则按 `valueFormat`（默认 `YYYY-MM-DD`）锚定构建——ISO 串永不匹配 → undefined → 约束静默丢弃（`minDate:'now'` 无任何禁用范围）；`value` 路径根本不调用 `resolveRelativeDate`。`input-date-relative.test.tsx` 12+ 用例只测单函数，从不经过 parseDate/渲染器——套件全绿掩盖集成断裂。
- **优先级依据**：material defect：文档化业务约束（禁止过去/未来日期）静默不成立 + 假绿测试误导。
- **信心水平**：确定（正则锚定 + ISO 串逐环可证）。

## P2 发现

### [P2-06] upload `clearAll` 不中止在途上传，文件被迟到成功响应写回

`upload-field.tsx:430-433` 只清状态不 abort（unmount 路径 :153-171 有 abort，两处不对称）；`performUpload` 成功续体（:267）无条件 `commitItems`。用户清空字段后文件静默复活；非 multiple 模式下「后解析」覆盖「后选择」。很可能。

### [P2-07] collapse/steps/timeline scope 模式 null 复活

三渲染器读链 `effectiveScopeValue ?? schemaProps.value ?? local`（collapse-renderer.tsx:100、steps-renderer.tsx:135、timeline-renderer.tsx:154）配合写路径 `update(statePath, next ?? null)`（:110/:147/:161）与 `scope.ts:494` 存 null 语义：关闭最后一个 collapse 面板后 `getIn` 返回 null、`??` 跳过 → 作者化 value 种子复活（面板弹开）。collapse 为用户可见实例；timeline 卡声称无 owner 状态（见 P2-12），本模式未登记。确定。

### [P2-08] collapse 本地种子优先级倒置

`collapse-renderer.tsx:90`（`defaultValue ?? value`）vs steps（:135 `value ?? defaultValue`，C5.2 P2-2 已修）与 button-group（C5.2 P2-3 已修）及 definitions 文本（value: "Current expanded value" / defaultValue: "when value is not provided"）。collapse 为同包唯一剩余倒序成员。确定。

### [P2-09] wizard 数值 `value` 从不 key 匹配 + 文档二次漂移

`wizard-renderer.tsx:92-94` 数值直接 clamp 为 index；`schemas.ts:33`/definitions:56 现文本「0-based index when numeric and no matching key」暗示先 key 匹配。同包 steps `matchKeyIndex`/timeline 均先 key 匹配。卡 P1-2 修复后文档被改写回矛盾措辞（round-03 R3-F3）。确定。

### [P2-10] wizard `stepError` 真实消息仍死区

`wizard-renderer.tsx:433-439` 捕获 `error.message` 存入 `stepError`，`:682-693` 错误盒只渲染通用 i18n 串——P2-2 修复（错误盒出现）之后的残余。确定。

### [P2-11] barcode design.md 同步未兑现 + 离线横幅说谎

卡 P3-1 声称「文档漂移 fixed（Phase 4 dim 17 同步）」，但 `design.md:40` 仍写 continuousScan 默认 true（代码默认 false）、`:42` 仍写 wasmUrl 默认公共 CDN（代码 fail-closed 抛错）；`barcode-scanner-overlay.tsx:313-317` 横幅「恢复网络后自动提交」承诺不存在的行为（队列仅内存，无 online flush；design.md §12.2 自述未实现）。确定。

### [P2-12] timeline 审计卡过时

`docs/audits/per-component/timeline.md` dim 3「display-only 无 owner 状态」vs live `timeline-renderer.tsx:135-161` + `process-display-definitions.ts:98-139` 完整三态 ownership。后续按卡阅读会漏掉 scope 行为。确定。

### [P2-13] timeline 根禁用时条目 inert-but-focusable

`timeline-renderer.tsx:218,269-290`：`rootDisabled` 时 handleSeek 早退，但 tabIndex=0/role=button/Enter-Space/cursor-pointer 全保留、无 aria-disabled（steps 用原生 button disabled 正确处理）。很可能。

### [P2-14] button anchor `target="_blank"` 无 rel

`button.tsx:252-263` 无 `rel`；`link.tsx:14-16` 同仓显式 `noopener noreferrer` 先例。现代浏览器隐式 noopener 降低风险，属惯例/防护一致性缺口。确定。

### [P2-15] input-number badInput 显示/存储脱钩

`input-number-renderer.tsx:248-258`：`type="number"` 下 malformed 输入（`'1.2.'`/`'5e'`）浏览器报 `value===''` → `onChange(undefined)` 抹掉存储值，DOM 仍显示文本；blur（:112-122）从 store 回钳不读 DOM → 提交 undefined 而用户看到非空。很可能。

### [P2-16] dashboard 运行态硬编码 canvasWidth=1200 违反同构声明

`dashboard-renderer.tsx:80` vs `editor/editor-canvas.tsx:39-55,326`（实测宽换算）vs `docs/components/dashboard-editor/design.md:29-46`（「编辑态坐标 → 运行态渲染零转换（同构）」）。运行态容器宽 ≠ 1200 时面板位置/对齐与编辑态不一致。确定。

### [P2-17] 死代码/死契约/死订阅合集

- `dashboard/index.ts:13-27`：`panelToPixels`/`snapToGrid`/`dragPanel`/`resizePanel`/`clampPanelPosition`/`clampPanelSize`/`findOverlappingPanels`/`sanitizePanels`/`resolveCanvasHeight`/`DEFAULT_COLS`/`ROW_HEIGHT`/`GAP`/`ResizeHandle` 零仓库消费者。
- `barcode-input/utils/camera-utils.ts:35`：`clearCameraAvailabilityCache` 零消费者。
- `code-editor`：`options`（renderer 声明+定义描述，零读取）、`sqlConfig.keywords`/`uppercaseKeywords`、`expressionConfig.showFunctionDocs`、`FuncSourceRef.builtinSet`（source-resolvers.ts:146-151 恒返回 `[]`）声明不消费。
- `pivot`：`indicators[].format`（schemas.ts:19 + definitions:195 收录）在 `pivot-option.ts:88-122` 从不读取——定义器暴露无效开关。
- `map`：`schemas.ts:78` loading 注释（「false 时渲染 loading 态」）与实现（`=== true`）语义反转。

### [P2-18] 轻微漂移合集

- `alert-renderer.tsx:71-76`：onClose payload 多 `type: 'alert:close'` 键（definitions 契约只记录 `{level}`）；dispatch scope 用 `props.node.scope`，同包 upload/card 用 `useRenderScope()`。
- `fieldset.tsx:25`：`collapsed` 只作初始化，运行期（表达式/scope）变更不响应（初始种子裁定之外的新缺口）。
- `stat-tile-renderer.tsx:118-146`：内联重写 `sparkline-path.ts` 几何（平直数据 `[5,5,5,5]` 两实现渲染语义分叉：底部贴边 vs 垂直居中），注释却称「shared computation semantics」。
- `link.tsx:7-18`：用户提供 `rel` 时覆盖自动 noopener（低风险）。
- `card.tsx:42`：纯 div onClick 无键盘可达（image 渲染器有 Enter/Space 先例）。
- `markdown.tsx:35-67`：src 切换失败时保留旧内容展示（`fetchedContent` 不清理），`data-src-loaded` 仍为 true，无错误指示。

### [P2-19] 惯例违例

- `editor-canvas.tsx:239` / `editor-palette.tsx:49` 裸 `<button>`（AGENTS.md 强制 @nop-chaos/ui 组件；palette 的 draggable 可辩，remove 按钮不可）。
- wizard/layout 家族手写 `useMemo`/`useCallback`/`memo`（graph/xyflow/pivot/map/code-editor 同理）无 `eslint-disable react-compiler` 注释——按 react19-best-practices-review.md「手写 memo 须带编译器 disable 注释」收敛。

## 已核实为安全/排除项

- countdown/pull-refresh/infinite-scroll 生命周期（多轮 MA/MM/OA 修复已覆盖）、carousel autoplay pause 源组合、html/markdown sanitize 门、qrcode payload 防护、image/video/audio 生命周期——读后确认无残余。
- wizard 事件 payload/guard 阻塞约定/statusPath 双层发布——与 design.md §5 与卡记录一致（wizard-event-ctx 测试锁定）。
- barcode 卡 P0-1（WASM fetch 红线）与 P1-1..P1-4（校验 contributor/consume-once/事件 ctx/readOnly）已修复，live 复核确认落地；本审计不重报。

## 总评

1. **「已修复」的假象是当前最大的系统性风险**：三个独立面出现「卡/计划声称 fixed，live 代码或文档仍违背」——barcode 卡 P3-1 声称文档已同步（design.md 仍错）、wizard 卡 P1-2 修复后文档被改写回矛盾措辞、timeline 卡声称 display-only（live 已有三态 ownership）。修复闭环只更新了一处事实源，未做跨面一致性验证；closure audit 的证据核验应加「对照 live 文档原文」步骤。
2. **测试假绿集中在「接线面」而非「单函数面」**：相对日期（12 个用例全单函数隔离）、barcode 检测（测试总提供 video/已打开 overlay）、kanban undo（multi-audit 已报）——测试覆盖的是函数的内部逻辑，而不是「schema 值 → 渲染器 → 运行时行为」的集成链；这正是 bug-71 家族缺陷的高发区。
3. **组件级核心功能的完整性校验缺失**：barcode 扫码主流程（P0）、pivot loading 周期（P1）都是「组件标准使用路径从未被任何测试走过」的案例。组件卡的门禁（checklist §3）应增加「标准交互路径 smoke」项，而不是只依赖单测矩阵。

## 盲区自评

- 本轮未运行 Playwright 真机验证（pivot 空白、dropdown hover、input-number badInput 的最终像素/事件行为依赖真实浏览器）；P1-02/04/15 的「很可能」等级可在 e2e 补验。
- 未深挖：flux-renderers-ai（归 ai-invariant-loop mission）、industrial 包（归工业 workstream，已登记 red）、host 面 core 包（round2 host-surface 37 卡已审计）——三者均有独立 owner 审计链。
- 未做完整性能画像（大表/长列表/大量面板的 10x 规模），dashboard/pivot 的大数据行为只在代码层推演。
- 下一轮最适合从「closure evidence 与 live 事实的三方一致性」机械化扫描切入（卡/计划/日志 vs design.md vs 代码），以及为 barcode/pivot 两个 P1/P0 补真实浏览器回归。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>

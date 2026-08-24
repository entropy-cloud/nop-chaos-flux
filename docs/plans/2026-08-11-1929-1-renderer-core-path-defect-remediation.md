# 1 渲染器核心路径缺陷修复（barcode / pivot / wizard / dropdown-button / 相对日期）（component-audit-round2）

> Plan Status: completed
> Last Reviewed: 2026-08-24（closure-audit 收口复核）
> Source: `docs/audits/2026-08-11-1929-open-audit-component-audit-round2.md`（P0-01, P1-02..P1-05；折叠 P2-09/P2-10/P2-11 及 P2-17 barcode 子项 / pivot 子项）
> Related: `docs/plans/2026-08-11-1929-2-flux-bundle-facade-host-contract-remediation.md`（独立 closure surface）、`docs/plans/2026-08-11-1929-3-claim-vs-reality-plan-doc-contract-integrity-remediation.md`（独立 closure surface）

## Purpose

把 2026-08-11 19:29 open-audit 的 1 条 P0（barcode-input 扫码主流程失效）与 4 条 P1（pivot loading 周期空白 / wizard 异步提交导航竞态 / dropdown-button hover 不可用 / 相对日期表达式静默失效）收口为「组件标准使用路径行为正确 + focused 测试钉住」的状态，并同步修复同组件族的残余 P2（wizard 数值 key 匹配、stepError 死区、barcode design.md 漂移、pivot indicators[].format 死契约）。

## Current Baseline

- `use-barcode-detect.ts:40-47`：主 effect deps `[]`，第 45-46 行 `const video = getVideoRef.current(); if (!video) return;` 在「关闭态挂载 → 打开」主流程下必然早退，`poll()` 从不调度；overlay 无条件挂载、内部 `!open` 时返回 null（`barcode-scanner-overlay.tsx:226`；:81-89 为 detect-hook 接线 `enabled: open && camera.isActive`）（live 已核对 `use-barcode-detect.ts:40-138`、`barcode-input.tsx:335-349`）。现有测试 `use-barcode-detect.test.ts` 总提供 video、overlay 测试总以 `open={true}` 挂载，不覆盖关闭态→打开转换。
- `pivot-renderer.tsx:129-183`：实例生命周期 effect deps `[empty, option, data, props.id, props.meta.cid, props.node.scope]`，不含 `loading`；`loading=true` 分支（:209-213）替换掉 containerRef div，VTable 实例悬挂在已卸载节点；`loading` 翻回 false 后新 canvas div 挂载但 effect 不重跑（live 已核对）。`empty` 在 deps 中而 `loading` 不在——不对称。
- `wizard-renderer.tsx:325-453`：`commitStep` await 期间 `goToStep`（:493-521）与 `goPrev`（:640-668）不检查 committing；commit 续体在点击时捕获的旧闭包上执行 `isLastStep`（:416）/`goNext()`（:432）→ 用户被拽回错误步骤并派发过期 `wizard:change`/`wizard:complete`/`wizard:step-error` payload（live 已核对）。
- `dropdown-button-renderer.tsx:74-76`：hover 开关挂在 wrapper div 的 `onMouseEnter/onMouseLeave`；菜单经 `MenuPrimitive.Portal`（`packages/ui/src/components/ui/dropdown-menu.tsx:60`）渲染到 `document.body`，指针离开触发按钮瞬间菜单关闭，鼠标用户永远无法 hover 到菜单（live 已核对）。
- `date-utils.ts:315-354` `resolveRelativeDate` 产出 `2026-08-11T12:34:56.789Z` 形式 ISO 串；`parseDate`（:159-184）按 valueFormat 锚定 `^…$` 正则构建，ISO 串永不匹配 → undefined → `minDate:'now'` 等约束静默丢弃；`value` 路径不调用 `resolveRelativeDate`。`input-date-relative.test.tsx` 12+ 用例只测单函数（live 已核对 `input-date-renderer.tsx:30-45`、`input-datetime-renderer.tsx:42-57`、`date-range-renderer.tsx:126-141`）。
- 同族残余（审计折叠）：`wizard-renderer.tsx:92-94` 数值 `value` 直接 clamp 为 index 不先 key 匹配（`schemas.ts:33` 文档二次漂移）；`wizard-renderer.tsx:433-439` 捕获 `error.message` 存 `stepError` 但错误盒（:682-693）只渲染通用 i18n 串；`barcode design.md:40,43` 仍写 continuousScan 默认 true / wasmUrl 默认 CDN（代码默认 false / fail-closed 抛错），`barcode-scanner-overlay.tsx:313-317` 离线横幅承诺不存在的「恢复网络后自动提交」；`pivot schemas.ts:19` + definitions:195 收录 `indicators[].format` 但 `pivot-option.ts:88-122` 从不读取。

## Goals

- barcode-input 标准主流程（挂载关闭 → 打开 → 摄像头就绪 → 轮询 → 识别）能产出检测结果，并用「关闭态挂载 → 打开」转换的 focused 测试钉住。
- pivot 经历 `loading` 周期后表格恢复绑定并渲染数据，测试覆盖「loading=true → false」往返。
- wizard 异步提交期间导航（goToStep / Prev / Next）被锁定，commit 续体不产生过期闭包导航与欺骗性事件。
- dropdown-button `trigger="hover"` 对鼠标用户可用（portal 菜单可被 hover 到且悬停期间不关闭）。
- 相对日期表达式（`now`/`today`/`now±Nd`/`today±Nd`）在 input-date/input-datetime/date-range 三个渲染器全部生效，约束与 value 路径均有渲染器级测试。
- 折叠 P2 同步收口：wizard 数值 value 先 key 匹配、stepError 显示真实错误消息、barcode design.md/离线横幅与 live 一致、pivot `indicators[].format` 契约裁决。

## Non-Goals

- 不处理 timeline/steps/collapse 的 scope null 复活与种子优先级（不同组件，入 follow-up backlog）。
- 不处理 upload `clearAll` 中止、button rel、input-number badInput 等其余 P2（入 follow-up backlog）。
- 不改变 date 渲染器的 valueFormat 语义与 token 语法，只修复相对表达式接线。
- 不重构 wizard 事件 payload 契约（design.md §5 已锁定，审计已排除）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/barcode-input/`（hooks/use-barcode-detect.ts、barcode-scanner-overlay.tsx、utils/camera-utils.ts 的 clearCameraAvailabilityCache 死代码随 P0-01 收口）
- `packages/flux-renderers-pivot/src/pivot-renderer.tsx` + `schemas.ts`/`pivot-option.ts`（仅 indicators[].format 裁决子项）
- `packages/flux-renderers-layout/src/wizard-renderer.tsx` + `schemas.ts` + `layout-renderer-definitions.ts`（仅 key 匹配文档措辞）
- `packages/flux-renderers-layout/src/dropdown-button-renderer.tsx`
- `packages/flux-renderers-form/src/renderers/{input-date,input-datetime,date-range}-renderer.tsx` + `date/date-utils.ts`
- `docs/components/barcode-input/design.md`（漂移同步）
- 相关 focused 测试与 bug note（按 `docs/bugs/00-bug-fix-note-writing-guide.md` 行内补写，编号 90 起约定沿用）

### Out Of Scope

- 其余 P2 发现（见 follow-up backlog 登记）
- e2e 真机补验（P1-02/04 的「很可能」等级按 audit 盲区自评，优先 focused 单测；e2e 补验入 follow-up）

## Failure Paths

| 场景                 | 触发                                    | 预期行为                                                      | 可重试 | 用户可见表现                         |
| -------------------- | --------------------------------------- | ------------------------------------------------------------- | ------ | ------------------------------------ |
| barcode 关闭态挂载   | 组件首次挂载（open=false）              | 轮询建立、enabled 空转或 video 缺失重试；open=true 后正常检测 | 是     | 扫码打开后摄像头画面出现检测框与结果 |
| barcode video 未就绪 | open=true 但 readyState<2               | poll 重试直至就绪                                             | 是     | 短暂等待后开始识别                   |
| pivot loading 往返   | 数据刷新触发 loading=true→false         | 实例重建/重绑新 canvas div，数据可见                          | 是     | 刷新后表格恢复显示                   |
| wizard 提交中导航    | commitStep await 期间点击 goToStep/Prev | 导航被锁定（disabled 或 guard），无过期事件                   | 是     | 按钮禁用，提交完成后才可导航         |
| wizard 末步提交      | 末步 commit 中 goToStep                 | onComplete 只对当前实际步骤触发一次                           | 否     | 无错误跳步                           |
| dropdown hover       | 鼠标悬停按钮→移向菜单                   | 菜单保持打开直至离开菜单                                      | 是     | 菜单正常 hover 响应                  |
| 相对日期 minDate     | `minDate:'now'`                         | 过去日期禁用                                                  | 是     | 日历面板过去日期禁用                 |
| 相对日期 value       | `value:'today'`                         | 初始化为今天                                                  | 是     | 输入框显示今天                       |

## Test Strategy

本档选择：`必须自动化` —— P0/P1 均为「标准使用路径从未被测试覆盖」的接线面缺陷，且现有测试是假绿（barcode、相对日期）。Proof 项（先写失败测试）必须排在 Fix 之前。

## Execution Plan

### Phase 1 - barcode-input 扫码主流程（P0-01 + 折叠 P2-11）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/`、`docs/components/barcode-input/design.md`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：新增 focused 测试 `use-barcode-detect.test.ts`：以「关闭态挂载（video 为 null）→ 打开（video 出现）→ 检测结果产出」序列断言 `poll()` 最终执行 `detector.detect` 并 `setResult`；同时保留既有单测（先红后绿）
- [x] Fix：`use-barcode-detect.ts` 删除第 45-46 行 video 早退（`const video` 与 `if (!video) return;` 一并删除，避免未使用变量 lint 命中；poll 内部 :77-88 已处理 video 缺失重试），主 effect 保持 deps `[]`，轮询从挂载即运行
- [x] Proof：`barcode-scanner-overlay` 补「open=false 挂载 → open=true」转换测试（覆盖真实挂载链而非直接 open=true 挂载）
- [x] Fix：`barcode-scanner-overlay.tsx:313-317` 离线横幅文案与 live 行为对齐（队列仅内存、无 online flush → 不再承诺自动提交，或补 design.md §12.2 的「未实现」标注）
- [x] Fix：`docs/components/barcode-input/design.md:40,43` 同步 continuousScan 默认 false / wasmUrl fail-closed 语义
- [x] Fix：随 P0-01 收口删除 `camera-utils.ts:35` `clearCameraAvailabilityCache` 死导出（零消费者，审计 P2-17 barcode 子项）
- [x] Decision：barcode 卡 P3-1「文档漂移 fixed」与 live 不符的事实以 bug note 记录（若该组件修复跨 package 边界）

Exit Criteria:

- [x] `use-barcode-detect` 关闭态→打开转换测试通过（先红后绿记录在案），既有测试零回归
- [x] overlay 转换测试通过；design.md continuousScan/wasmUrl 文本与代码默认值一致
- [x] 离线横幅不再承诺不存在的自动提交（文案或代码对齐）
- [x] 该 phase 代码改动局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck`）

### Phase 2 - pivot loading 周期空白（P1-02 + 折叠 P2-17 pivot 子项）

Status: completed
Targets: `packages/flux-renderers-pivot/src/pivot-renderer.tsx`、`schemas.ts`、`pivot-option.ts`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：新增 focused 测试：`loading=true` 渲染占位 → `loading=false` 且同 data → 断言 VTable 绑定到新 canvas div（`data-slot="pivot-canvas"` 存在实例或可观察的 setRecords 调用），先红后绿
- [x] Fix：`pivot-renderer.tsx:129` 实例生命周期 effect 把 `loading` 纳入 deps，并与 `empty` 分支同构：`loading===true` 时走 release 路径（释放 instanceRef、clearExposedInstance），`loading` 翻回 false 后因 instanceRef 为 null 走新建路径绑定新 canvas div（单纯把 loading 加进 deps 不足——旧实例仍存活会走 :175-182 的 no-op 分支或 :148-150 的 container-null 早退）
- [x] Fix：loading 期间旧实例释放走 effect 内 release 路径（与 empty 分支共用释放逻辑），杜绝悬挂实例；同步核对卸载 effect（:185-199）无需变化
- [x] Decision：`indicators[].format`（schemas.ts:19 + definitions:195）零读取——裁决删除定义或接入 `pivot-option.ts` 消费（删除优先，因无任何文档承诺 format 生效）

Exit Criteria:

- [x] loading 往返测试通过（先红后绿），`loading=true` 单测保留
- [x] `indicators[].format` 裁决落地（定义移除或消费接入）且 pivot 既有测试零回归
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-pivot typecheck`）

### Phase 3 - wizard 异步提交导航锁定（P1-03 + 折叠 P2-09/P2-10）

Status: completed
Targets: `packages/flux-renderers-layout/src/wizard-renderer.tsx`、`schemas.ts`、`layout-renderer-definitions.ts`

- Item Types: `Proof | Fix`

- [x] Proof：新增 focused 测试：commitStep await 挂起（mock onStepCommit 返回 pending promise）期间调用 `goToStep`/Prev → 断言导航被拒绝且无 `wizard:change`/`wizard:complete` 派发；resolve 后导航恢复。先红后绿
- [x] Proof：末步提交挂起期间 goToStep → 断言 `onComplete` 不派发；commit 完成后按当前步骤语义派发
- [x] Fix：提交生命周期内锁定导航：`goToStep`/`goPrev` 在 `lifecycle.committing` 时 early-return（或 disabled），Next 保持现有 disabled
- [x] Fix：commit 续体改为读取提交时的实际步骤（用 ref 快照或提交前冻结 step 信息），杜绝过期闭包（isLastStep/goNext 引用旧 currentStepIndex）
- [x] Fix：`wizard-renderer.tsx:92-94` 数值 `value` 先按 key 匹配（对齐 steps `matchKeyIndex`/timeline 同族先例），无匹配才 clamp 为 index
- [x] Fix：`schemas.ts:33`/`layout-renderer-definitions.ts:56` 文档措辞与实现一致（消除「when numeric and no matching key」二次漂移）
- [x] Fix：`wizard-renderer.tsx:682-693` 错误盒渲染 `stepError` 真实消息（回退通用 i18n 串仅当 stepError 为空）

Exit Criteria:

- [x] 导航锁定测试通过（先红后绿），既有 wizard 测试（事件 payload/guard 阻塞约定）零回归
- [x] 数值 value key 匹配行为与文档一致；stepError 真实消息在错误盒可见
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-layout typecheck`）

### Phase 4 - dropdown-button hover 可用性（P1-04）

Status: completed
Targets: `packages/flux-renderers-layout/src/dropdown-button-renderer.tsx`、`packages/ui/src/components/ui/dropdown-menu.tsx`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：新增 focused 测试（jsdom + 真实 DropdownMenu 组件，不 stub portal）：wrapper `onMouseLeave` 触发后若指针已进入 portal 菜单（`dropdown-menu-content`），菜单保持打开；`data-trigger="hover"` 断言保留
- [x] Fix：hover 开关迁移到不会因 portal 逃逸而误关的机制——候选：(a) 由 `DropdownMenu` 内部 open 状态 + 菜单 hover 联合判定（wrapper onMouseLeave 延时关闭 + 菜单 onMouseEnter 取消关闭）；(b) 菜单内容改为非 portal 渲染（同 wrapper 子树）。按最小改动裁决
- [x] Fix：`data-*` 语义保留（schemas.ts:229 / design.md §4 文档化选项对鼠标用户生效）
- [x] Decision：若采用延时关闭方案，确认与 `disabled`/触摸路径不冲突（不引入新竞态）

Exit Criteria:

- [x] hover 路径测试通过（先红后绿）：指针离开触发按钮进入菜单不关闭；离开菜单关闭
- [x] 既有 dropdown-button 测试（click 模式）零回归
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-layout typecheck` + `pnpm --filter @nop-chaos/ui typecheck`，若改 ui）

### Phase 5 - 相对日期表达式接线（P1-05）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/{input-date,input-datetime,date-range}-renderer.tsx`、`date/date-utils.ts`

- Item Types: `Proof | Fix`

- [x] Proof：渲染器级 focused 测试（对齐审计「接线面假绿」教训，不满足于单函数）：input-date 传 `minDate:'now'` → 断言日历禁用过去日期；`value:'today'` → 断言输入值解析为今天；input-datetime/date-range 同型各一用例。先红后绿
- [x] Fix：统一接线——`parseDate` 之前先规范化 ISO 串（新增 `parseDate` 内部分支或渲染器层把 resolveRelativeDate 结果按 valueFormat 重新格式化），使 ISO 串可被 `^…$` 锚定正则匹配
- [x] Fix：`value` 路径接入 `resolveRelativeDate`（当前 `input-date-renderer.tsx` value 直接存 storedValue，不解析相对表达式）
- [x] Proof：保留并迁移 `input-date-relative.test.tsx` 12+ 单函数用例（继续通过），新增渲染器级用例为集成保障

Exit Criteria:

- [x] 三渲染器相对日期用例通过（先红后绿），`input-date-relative.test.tsx` 既有用例零回归
- [x] `minDate:'now'`/`maxDate:'now'`/`value:'today'`/`now±Nd` 在三个渲染器均可观察生效（测试断言为准）
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form typecheck`）

## Draft Review Record

> 起草后、执行前的独立审查证据。见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_00efef550ffe9e8YB08gqugdDr`；round 2 `ses_00ef5f528ffe9HWl7q5uXS7HIp`；round 3 `ses_00eeca7efffe8K596ShPfA17uo`）
- Verdict: `pass`
- Rounds: 3
- Findings addressed: 0 Blocker / 0 Major 全程；Minors 已吸收——barcode 早退行号 :45-46 一并删除（防未使用变量）、pivot 修复机制改为「loading=true 走 release 路径」精确表述、design.md 锚点 :40,43、Deferred 不再引用错误信心等级、Source 行补齐 P2-17 barcode 子项、`definitions.ts` → `layout-renderer-definitions.ts`、overlay `!open` 早退锚点改 :226

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P0-01、P1-02..P1-05 及折叠 P2 按 phase 完成）
- [x] 各 Phase 的 Proof 项（先红后绿）均有记录（`docs/logs/2026/08-11.md` 每 phase RED 计数 ×2/×1/×3/×1/×4）；无被静默降级到 deferred 的 in-scope defect
- [x] 受影响 owner docs（barcode-input design.md 等）已同步到 live baseline
- [x] 复杂缺陷 bug note 按 `docs/bugs/00-bug-fix-note-writing-guide.md` 行内补写（编号 90 起约定）——`docs/bugs/161-barcode-input-scan-poll-dead-on-closed-mount-fix.md`
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——审计 session `ses_fced38d61ffekYQxxfhDchwcxX` verdict **approved**（9 gates 全 PASS、零 finding，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（37/37 绿）
- [x] `pnpm build`（37/37 绿）
- [x] `pnpm lint`（37/37 绿）
- [x] `pnpm test`（51/52 包绿；本 plan 四包 form/layout/pivot/scheduling 全绿并经审计 session 独立复跑确认。唯一失败 = `flux-renderers-basic/src/__tests__/surface-event-ctx.test.tsx`，为已登记 out-of-scope baseline 红：bisect 实证由 `f616f0163`（plan 459，2026-08-18）引入、晚于本 plan 2026-08-12 落地 6 天，登记于 `docs/logs/2026/08-22.md` + `docs/audits/check/00-baseline-tooling.md:37`（待独立 plan 修），与本 plan 改动因果无关。本收口不声明 full-green）

## Deferred But Adjudicated

### P1-02/P1-04 的 e2e 真机补验

- Classification: `watch-only residual`
- Why Not Blocking Closure: 审计盲区自评声明浏览器级行为（pivot 空白、dropdown hover 的最终像素/事件）可在 e2e 补验；focused 单测已钉住行为，浏览器级视觉验证不改变 supported baseline 成立
- Successor Required: `no`
- Successor Path: follow-up backlog 登记，若后续 e2e 轮次发现偏差再升级

## Non-Blocking Follow-ups

- 无（本 plan 其余发现均入 `docs/backlog/audit-followups-2026-08-11-1929.md`）

## Closure

Status Note: P0-01 与 P1-02..P1-05 五条主缺陷 + 折叠 P2（wizard key 匹配 / stepError 真实消息 / barcode design.md 与离线横幅如实化 / pivot indicators[].format 裁决删除 / clearCameraAvailabilityCache 死导出清除）全部按 phase 落地并有 focused 测试钉住（先红后绿记录于 `docs/logs/2026/08-11.md`）。收口验证：全仓 `pnpm typecheck`/`build`/`lint` 37/37 绿 + `pnpm check` exit 0（仅既有登记豁免）；`pnpm test` 51/52 包绿，本 plan 四包（form/layout/pivot/scheduling）全绿并经独立审计复跑确认，唯一失败为已登记 out-of-scope baseline 红（`surface-event-ctx.test.tsx`，由 plan 459 `f616f0163` 2026-08-18 引入，登记于 `docs/audits/check/00-baseline-tooling.md:37` 待独立 plan 修，与本 plan 因果无关）——本收口不声明 full-green。独立 closure-audit（fresh session）verdict approved，本 plan 关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，`ses_fced38d61ffekYQxxfhDchwcxX`，执行 session 未自审）
- Evidence: verdict **approved**（零 Blocker/Major/Minor finding）。G1-G9 逐门 PASS：G1 live 修复逐处核验（committing early-return `wizard-renderer.tsx:278/:315`、冻结快照 :335-337/:427-450、pivot loading release `pivot-renderer.tsx:130,183`、parseDate ISO fallback `date-utils.ts:182-194`、hover 150ms grace + 菜单取消 `dropdown-button-renderer.tsx:63-108`、`indicators[].format` 全包零命中、死导出已删）；G2 先红后绿记录核对；G3 owner docs 同步核对；G4 bug note 161 结构核对；G6 deferred 诚实（e2e residual watch-only + P2 backlog 路由）；G9 `pnpm test` 门禁裁定 = 可勾（失败项因果无关 + 已登记 baseline 红 + 四包独立复跑全绿）。审计 session 独立复跑：scheduling 920 / pivot 56 / layout 124 / form 813 全绿，flux-renderers-basic 仅既有登记红 1/500。

Follow-up:

- 无剩余 plan-owned work；e2e 真机补验为 watch-only residual（见 Deferred But Adjudicated），其余 P2 已登记 `docs/backlog/audit-followups-2026-08-11-1929.md` 待后续轮次

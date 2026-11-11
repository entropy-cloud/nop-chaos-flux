# e2e 基线失败台账 — 2026-10-26 全量运行（PH-9 权威台账）

> Owner doc: `docs/backlog/platform-hardening-roadmap.md` PH-9
> Plan: `docs/plans/762-ph9-e2e-baseline-ledger-plan.md`
> Status: baseline snapshot 2026-10-26（逐项归因 + 隔离复跑证据）
> **快照滞后指引（2026-11-05 plan 856 注记，2026-11-12 更新）**：本页快照本体仍为 2026-10-26 运行（unexpected 248）；**当前权威基线已滚动至文末「2026-11-11 基线」节（plan 836 Phase 4，逐名对账 + 转出/新转入清单）**。中间过程：2026-11-02 全量（242 failed / 1896 passed，独立子代理逐红对账：在册 237 + plan 836 在途 1 + 新红 3〔complex-pages:180 / renderer-lab:114 / table-virtual-body:43，登记不静默〕，详见 `docs/logs/2026/11-02.md`）以及 11-02/11-03 plan 836 对 18 条台账外红的分诊修复。
> 原始运行产物（gitignored）：`_tmp/ph9-e2e/results.json`（Playwright JSON）、`cluster2.txt`（129 簇全文）、`families.txt`（族归类）、`iso-b1..b8.log`（隔离复跑）

## 1. 运行元数据

| 项       | 值                                                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 运行日期 | 2026-10-26                                                                                                                                                       |
| 树 HEAD  | `309a3a567`（PH-8 plan 761）；**confound**：运行期间 plan 758–761（PH-4..PH-8，均为工具链/检查门/ai 内部生命周期迁移，不触碰 renderer/demo schema 行为）并行合入 |
| 环境     | workers=2、retries=1、`E2E_EXCLUDE_WATCH_ONLY=1`（watch-only 三项剔除）、总用例 1940、耗时 50.3m                                                                 |
| 结果     | **expected 1643 / unexpected 248 / flaky 3 / skipped 46**                                                                                                        |
| 对照     | 2026-10-18 运行：1563 passed / 262 failed（52.8m）→ 10-26 为 248 failed，**净 −14**                                                                              |

**10-18 → 10-26 差集说明（含 R2.12 假设证伪裁决）**：10-18 的"主导 = strict schema 诊断 238/263 红同根，R2.12 已治理"假设**被证伪**。R2.12（plan 734，10-24 收官）落地的是 **②severity 分流**（error→console.error / warning+info→console.warn），而其计划文本已诚实披露：**238 红语料主体是 error severity**（C1 unvalidated-component-target ×116 / C2 unknown-property ×56 / C3 invalid-reaction-deps ×50），②对 error 语料无收敛效果；**①语料清洗（component:\* target-binding metadata / AMIS prop 清理 / reaction dependsOn）当时无 owner**（P1-MA4.5-002 finding closed 时以 owner-gap 显式登记）。10-26 实测 213/248 仍为该 error 语料族——与 plan 734 的披露完全一致，属"假设早已在 plan 文本自证伪"而非新发现。期间 R2.13（plan 735）清了 dashboard-demo 子语料、R3.1–R3.10（plan 738–747）修了 flow-designer/kanban/office/CRUD-query 等交互缺陷（若干红转绿）；反向新增 = R3.6（plan 743）CRUD query 合成搜索/重置按钮（有意的产品行为，AMIS 对齐）使 4 个未迁移 spec 产生 6 条 locator 歧义红。净 −14 即此消长结果。

## 2. 汇总表（互斥类别，覆盖 248 failed + 3 flaky = 251 项）

| 类别                                  | 定义                                                                                    |    项数 |  占比 |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ------: | ----: |
| **A 产品回归**（新引入，须修复/升级） | —                                                                                       |   **0** |    0% |
| **B 既有产品缺陷 / 在册诊断语料**     | strict 诊断 error 语料族（F1–F5，验证器与 demo schema 的既存错配，全部早于 10-18 运行） | **213** | 84.9% |
| **C flaky**                           | 重试收敛 + 隔离复跑绿                                                                   |   **4** |  1.6% |
| **D 测试过期/错误断言**               | 有意产品变更后测试未迁移（F6 合成按钮 ×6 + 路由清单 ×1）                                |   **7** |  2.8% |
| **E 环境/基础设施/未定**              | 45s 超时族 ×6 + 预算内无法定根因的稳定红 ×20                                            |  **26** | 10.4% |
| **F perf 阈值未裁决面**               | 帧率/资源 gate（委派 arm2 MA7.1 / plan 628）                                            |   **1** |  0.4% |
| 合计                                  |                                                                                         | **251** |  100% |

## 3. 隔离复跑证据（批次汇总）

全部 79 个含失败项的 spec 分 8 批复跑：`E2E_EXCLUDE_WATCH_ONLY=1 npx playwright test <files...> --reporter=list --retries=0`（repo 根目录，2026-10-26，logs `_tmp/ph9-e2e/iso-b1..b8.log`）。

- **结果：248 项 unexpected 中 247 项隔离复跑仍红（stable red）；1 项隔离复跑绿**（`flow-designer-ux-visual.spec.ts > selected node gets a 2px ring box-shadow`，归 C）。
- 8 批失败计数 55/30/37/18/20/52/17/21（含无 retry 下 3 个 flaky 项按首败复现），与全量失败集逐项 diff 后仅上列 1 项转绿。
- 结论：**失败集不是并行资源竞争/跨 spec 污染的产物**——是确定性红；这也排除了"隔离复跑全绿→C"的大面积豁免路径。

## 4. 族明细（B/D/E/F 类）

### F1 `unvalidated-component-target` — 144 项 → **B**

代表错误（`ai-widgets-demo.spec.ts`，零 console.error 门 fixture 收集到的真实诊断，全文见 `_tmp/ph9-e2e/cluster2.txt`）：

```
[console.error] [flux] schema error unvalidated-component-target playground://pages/ai-widgets-demo
/body/0/beforeMessages/body/2/onSelect/action Component-targeted selector "component:setSenderDraft"
uses the correct selector family, but compile-time target typing is unavailable without explicit
target-binding metadata.
```

- **根因**：demo/lab schema 使用 `component:<handle>` 目标动作但缺 target-binding metadata（`componentId` 无 ComponentTargetContract 解析），flux-compiler strict 诊断（`packages/flux-compiler/src/schema-compiler/action-selector-validation.ts:221`）以 error severity 打 console.error，被零 console.error 门 fixture 捕获；R2.12 T2 实证该 error 语料页在 fail-fast 下页面本体损坏。
- **先在性证据**：诊断消息串自 2026-05-21（commit `5b870f9e0`）即存在；涉事 schema 均早于 10-18 运行（`component-handles-demo.tsx` 最后实质修改 2026-08-28、`scada-editor-demo.tsx` 2026-10-05，均含 `component:*` onClick）。
- **承接指针**：arm2 finding **P1-MA4.5-002**（closed，附 owner-gap 披露）；语料清洗 ① 归 R2.12/plan 734 的 Deferred（"R2.13 扩行或新行，MV/人审裁决"）。
- **隔离复跑**：144/144 stable red。

受影响测试（按 spec 分组，全名）：

<!-- F1-LIST -->

- `ai-bubble-visual.spec.ts`（1）：`bubble surface, right alignment, action bar, scroll affordance, tok-comment`
- `ai-component-handle.spec.ts`（2）：`external component:sendMessage button drives the chat`；`component:getMessages / component:clear via page.evaluate hit the registered handle`
- `ai-widgets-button-actions.spec.ts`（7）：`① prompt click writes its label into the empty sender draft (single value)`；`② clicking the same prompt again does not duplicate the draft (dedupe)`；`③ suggestion click writes its text into the empty draft`；`④ refresh regenerates the latest assistant message (streaming re-enters, count unchanged)`；`⑤ like toggle flips aria-pressed and data-active`；`⑥ suggestion pill renders a lucide svg icon, not an emoji literal (G9)`；`⑦ sources opens a Popover listing the message sources`
- `ai-widgets-demo.spec.ts`（17）：`ai-welcome renders with title, description, and icon`；`ai-prompts renders items with labels`；`ai-prompts item has description`；`ai-token-usage displays token counts and cost`；`ai-token-usage prompt and completion breakdowns`；`ai-suggestions items render in expand mode`；`ai-voice-input renders marker button`；`sending a message through ai-chat with widgets`；`assistant bubble avatar renders 32×32 circle with a lucide svg (D3)`；`welcome icon renders the Bot lucide preset instead of the literal "bot" text (D3)`；`beforeMessages area renders welcome before messages`；`afterMessages area renders suggestions`；`formula keyword renders KaTeX spans for block and inline math (G5)`；`code keyword renders lowlight token spans in the fenced block (G6)`；`citation fixture typography computes styled h2/blockquote/link (light, product-spec §7 row 1)`；`dark-mode typography computes a dark fenced-code background (product-spec §7 row 2)`；`streaming cadence: full widgets-demo stream spans seconds, not milliseconds (product-spec §7 last row)`
- `ai-widgets-fixture.spec.ts`（8）：`content grows per chunk with a visible cursor during the stream`；`weather keyword renders a forecast table`；`code keyword renders a fenced code block`；`formula keyword renders blockquote and KaTeX math`；`Chinese formula keyword dispatches to the formula preset`；`reasoning keyword renders a task-list checklist`；`citation keyword renders a numbered reference list with links`；`no keyword falls back to the rich default preset`
- `ai-widgets-showcase.spec.ts`（5）：`(a) first screen shows >= 8 visible widgets (whitelist count)`；`(b) thumbnail cards link to the full demo routes between welcome and prompts`；`(c) reasoning keyword reveals the reasoning collapse panel`；`(d) weather keyword reveals the tool-call card then the forecast table`；`(e) citations widget shows [N] sup markers bound to the static demo message`
- `component-handles.spec.ts`（6）：`component:clear on input-text clears the field value`；`component:reset on input-text restores the initial value`；`component:focus on input-text moves focus to the field`；`component:focus on button moves focus to the button DOM`；`component:open / component:toggle on declarative dialog flip surface state`；`component:open / component:close on declarative drawer flip surface state`
- `component-lab/c1a-visual-amis-parity.spec.ts`（5）：`table density tokens apply in real browser (12/14px fonts, 40px thead, 10/11px padding, 16px edge)`；`fixed-cell state overlay: fixed base stays opaque and row hover adds the state overlay`；`fixed edge shadow markers render with a real ::after box-shadow`；`row action buttons are constrained to 32px height via token`；`stripe/bordered/fixed-edge CSS rules are loaded in real browser stylesheets`
- `component-lab/c4-2-host-surfaces.spec.ts`（5）：`crud-host: inline quick edit submits the EDITED value (bug 73 pattern re-verify)`；`crud-host: queryForm → loadAction chain carries query values into the fetch (host-crud-load)`；`crud-host: includeScope "*" injects flat CRUD scope variables (host-crud-include)`；`crud-host: load failure keeps data and refresh retries to recovery (host-crud-fail)`；`crud-host: paging/sort/selection echo and cross-page selection (host-crud-paging)`
- `component-lab/c6-4-host-surfaces.spec.ts`（2）：`carousel-host: external handles drive slides + onChange payload (host-carousel-ctrl)`；`carousel-host: autoplay interval drives + scope toggle stops/resumes (host-carousel-auto)`
- `component-lab/c6-5-host-surfaces.spec.ts`（5）：`diff-host: dialog-rendered diff-view + line click payload (host-diff-dialog, bug 73 pattern)`；`diff-host: cross-file nav + out-of-range clamp (host-diff-crosfile)`；`diff-host: CX-9 reaction wiring flips the view (host-diff-reaction)`；`diff-host: component:expandAll/collapseAll drive hunk state (host-diff-expand)`；`diff-host: identical content renders the empty state (host-diff-empty)`
- `component-lab/crud-editing-and-selection.spec.ts`（4）：`supports inline quick edit and persists the updated row value`；`supports dialog quick edit shell and preserves the edited value when reopened`；`updates selection-driven list actions and clears selection on refresh`；`keeps only one selected row in radio selection mode`
- `component-lab/crud-list-mode.spec.ts`（2）：`cards mode renders the cards carrier, self-held selection, and CRUD-driven pagination`；`list mode renders the list carrier, self-held selection, and scope-owned pagination slicing`
- `component-lab/crud-query-and-ownership.spec.ts`（5）：`filters and resets rows through the query workflow`；`refreshes request-owned source data through the CRUD owner surface`；`keeps client-mode filtering local when loadDataOnce is enabled`；`re-enters the upstream source owner when client-mode fetchOnFilter is enabled`；`shows the empty row when a query removes all visible items`
- `component-lab/crud-rendering-and-style.spec.ts`（4）：`renders the basic CRUD shell with sticky fixed columns`；`renders query workflow shell with fixed left and right columns plus inline column settings`；`renders source-result footer summary from $crud binding`；`renders responsive expand detail rows with grid styling`
- `component-lab/smoke.spec.ts`（3）：`smoke: crud — renders and has at least one scenario`；`smoke: carousel — renders and has at least one scenario`；`smoke: diff-view — renders and has at least one scenario`
- `composite-editor-handles.spec.ts`（5）：`component:addItem appends a reviewer (form value length +1)`；`component:moveItem reorders reviewers (swap order via moveValue)`；`component:removeItem removes a reviewer (form value length -1)`；`component:addItem on key-value appends an entry`；`component:removeItem is skipped at minItems (no removal below floor)`
- `designer-toast-hygiene.spec.ts`（1）：`designer toast hygiene: scada-editor-demo (plan 558 G/V7)`
- `editor-demos-ux-r10.spec.ts`（2）：`sc3-productized: dev wall folded away, live binding demo intact and previewable`；`sc1-toolbar-groups: toolbox buttons sit in bounded group containers`
- `exploratory/domain-page-interactions.spec.ts`（1）：`component-handles: trigger available handle buttons`
- `exploratory/domain-page-zero-error.spec.ts`（3）：`zero-error load: component-handles`；`zero-error load: w4a-multimedia`；`zero-error load: scada-editor-demo`
- `exploratory/lab-batch-zero-error.spec.ts`（3）：`lab zero-error: crud`；`lab zero-error: carousel`；`lab zero-error: diff-view`
- `form-ai-mobile-interaction-state.spec.ts`（2）：`component-handles: clear checkbox group clears all options`；`component-handles: Reset Form restores data defaults`
- `home-entry-navigation.spec.ts`（1）：`clicking the 'scada-editor-demo' home card navigates to the target page`（门内 console 语料同 scada-editor-demo 页，见 F1 代表错误）
- `playground-entry-pages.spec.ts`（5）：`playground entry page smoke: component-handles`；`playground entry page smoke: w4a-multimedia`；`playground entry page smoke: ai-component-handle`；`playground entry page smoke: ai-widgets`；`playground entry page smoke: scada-editor-demo`
- `renderer-lab-interaction-state.spec.ts`（2）：`crud: dialog quick-edit typing enables save and the save commits`；`labenv: showToast surfaces a real toast (palette command + crud quick-save)`
- `scada-editor-context-menu.spec.ts`（4）：`symbol right-click pops the menu; duplicate adds; delete removes with undo roll-back (含右键选区同步判别)`；`layering actions reorder the working copy (Ignition toTop 语义)`；`blank right-click: selectAll selects all top-level ids; Escape closes`；`blank right-click fitCanvas applies a viewport fit`
- `scada-editor-drag-ux.spec.ts`（4）：`palette search filters, empties, clears and group collapse toggles`；`palette drop lands snapped and auto-selects the new symbol`；`arrow-key nudge over a multi-selection produces ONE undo entry (判别性)`；`drag move ends snapped to grid or an alignment candidate`
- `scada-editor-interaction-correctness.spec.ts`（7）：`#40 leafer canvas does not overlap sibling palette/inspector panels`；`#1 connection pointer-down drag does not pan the viewport (no gesture conflict)`；`demo initial scene has junction + device; programmatic connect writes custom.connections (W1)`；`connection write enters undo stack; undo/redo round-trip restores connections (W7)`；`toolbox dialogs reachable (connections/history/layers) + clipboard copy/paste round-trip`；`statusBar summarizes mode/viewport/selection; controlled Edit/Preview switch works (W4 + U4)`；`Save dispatches onSave; export button surfaces JSON into collapsible output (W2 + W3)`
- `scada-editor-panel-collapse.spec.ts`（2）：`palette header collapse button collapses the left panel, rail click restores it`；`inspector header collapse button collapses the right panel, rail click restores it`
- `scada-editor-perf.spec.ts`（3）：`② 编辑操作 per-call 响应延迟 <100ms（n=100/1000）`；`① 拖拽响应 fps ≥30fps @ 选区 ≤1k（primary 包络）`；`④ 编辑器内存 ≤320MB（1k 图元场景，CDP JS heap）`（失败签名 = F1 console 门；门清除后 perf 断言本体是否达标未证，若仍红归 F）
- `scada-editor-plan522.spec.ts`（5）：`structured binding editor: point-ref row writes bindings into the working copy and save output`；`template dialog: save selection as template → list → instantiate inserts new ids`；`station dialog: create station/screens; switching round-trips serialization documents`；`previewMock auto-injects in preview; edit restores scene and gates injection (R5 #5)`；`component:previewInject schema action injects static values in preview`
- `scada-ux-visual.spec.ts`（1）：`editor DOM feedback transitions are appearance-only at 120ms`
- `stripe-replica-interactions.spec.ts`（1）：`08 I5 drawer refund writes the session; the row pill follows the refresh`（stripe 页 schema 的 `component:refresh` 目标动作语料）
- `stripe-replica-visual.spec.ts`（2）：`02 detail drawer — summary/timeline/metadata sections from record endpoint`；`05 overlay walkthrough — chips → date range → search → export → widget → drawer, list zero regression`
- `w4a-multimedia-family.spec.ts`（9）：`audio renders the native <audio> element with src, controls, and title`；`audio empty state renders the placeholder when no src is provided`；`audio falls back when the src fails to load`；`video renders the native <video> element with muted (video-only) attribute`；`video empty state renders the placeholder when no src is provided`；`carousel renders slides, indicators, and switches the active item`；`carousel next/prev/setValue handles dispatch and move the active slide`；`qrcode renders a canvas for a value and shows the empty state when absent`；`qrcode canvas output depends on the value (different values differ)`
<!-- /F1-LIST -->

### F2 `unknown-property` — 64 项 → **B**

代表错误（`component-lab` dialog 语料，40 条/页）：

```
[console.error] [flux] schema error unknown-property playground://component-lab/edit-dialog-submits-edited-field-value
/body/0/onClick/args/body/actions/0/level Unknown property "level" for renderer type "button".
[console.error] [flux] schema error unknown-property playground://component-lab/edit-dialog-real-schema-submits-edited-value
/onClick/args/body/api Unknown property "api" for renderer type "form".
```

- **根因**：同 F1 机制，语料为 closed-model 严格属性校验（R2.12 计划文本中的 C2 族 ×56），AMIS 风格 prop（`level`/`api`/`validations`/`body`/`onSubmit`/`minSelect` 等）不在各 renderer 的 closed model 内；典型 `table/kanban/echarts /body Unknown property "body"` = demo schema 用了 renderer 不接受的容器键。
- **先在性**：同 F1（验证器 2026-05-21 起；lab schema 均早于 10-18）。
- **承接指针**：P1-MA4.5-002 + plan 734 Deferred ①（语料清洗：AMIS prop 清理或 closed-model 扩容，owner gap 已登记）。
- **隔离复跑**：64/64 stable red。

受影响测试（按 spec 分组，全名）：

<!-- F2-LIST -->

- `component-lab/_probe-crud-row.spec.ts`（1）：`CRUD dropdown edit submits edited value (probe)`
- `component-lab/c1-1-host-surfaces.spec.ts`（3）：`tabs-host: dialog inside tab panel submits the typed value and closes (bug 73 pattern)`；`tabs-host: drawer inside tab panel opens and closes without residual DOM`；`dialog: Tab cycling keeps focus trapped inside the dialog (a11y-focus-trap)`
- `component-lab/c1-2-host-surfaces.spec.ts`（1）：`loop-host: each row dialog submits ITS OWN row payload (row-scope, bug 73 pattern)`
- `component-lab/c1a-visual-amis-parity.spec.ts`（3）：`dialog size matrix maps to --overlay-size-* ladder widths (xs/sm/base/md/lg/xl/full/default)`；`dialog top anchoring 60px with +30px stacking step for nested dialogs`；`dialog overlay is 0.7 opacity, title 14px, footer buttons min-width 72px`
- `component-lab/c2-3-host-surfaces.spec.ts`（4）：`choice-host: family composite submit publishes native values (bug 73 pattern + host-bgs-submit)`；`combobox-host: falsy option values (0 / "") write back natively and echo the label`；`remote-search-host: success loads remote options, opaque failure shows localized error (P2-3)`；`controlled-echo-host: external scope updates echo into select and switch`
- `component-lab/c3-2-host-surfaces.spec.ts`（1）：`composite-host: readOnly object-field + array-field are immutable (P1-3 proof)`
- `component-lab/c4-1-host-surfaces.spec.ts`（3）：`table-host: inline quick edit writes edited value through quickSaveItemAction (bug 73 pattern)`；`table-host: lazy children failure renders retry affordance and retry loads children (P1-3)`；`table-host: selection change dispatches keys and select-all toggles (host-table-sel)`
- `component-lab/c5-2-host-surfaces.spec.ts`（1）：`dropdown-button-host: CRUD row menu submits current row value (host-dd-row, bug 73 pattern)`（同簇含 1 条 `slot-used-outside-region`，见 F4）
- `component-lab/c9-host-surfaces.spec.ts`（1）：`scheduling-host: kanban in a dialog dispatches onCardClick and onCardMove with ctx-resolved args (host-kanban-drag, bug 73 pattern)`
- `component-lab/complex-form.spec.ts`（2）：`read: preloaded object rows render their child controls and values`；`write: add a contact row and keep the entered values visible in the new item`
- `component-lab/data-renderers.spec.ts`（2）：`read: table column headers render`；`read: empty state message shows when data is empty`
- `component-lab/dialog-dropdown-row-edit.spec.ts`（1）：`CRUD dropdown row edit submits edited value (real browser)`
- `component-lab/dialog-edit-submit.spec.ts`（1）：`dialog edit (tabs) submits edited value via ${field} template (real browser)`
- `component-lab/dialog-real-schema.spec.ts`（1）：`real nop-entropy edit schema submits edited value (real browser)`
- `component-lab/echarts-lab.spec.ts`（2）：`echarts: bar scenario renders a real canvas of non-zero size`；`echarts: dataset swap keeps the chart mounted without errors`
- `component-lab/layout-content.spec.ts`（5）：`write: open informational dialog and close it`；`edit: dialog confirm closes the dialog`；`write: switch to Team tab updates the active tab and reveals the team panel only`；`write: Settings tab is disabled and cannot be activated`；`read: loop scenarios render repeated index and item bindings for every row`
- `component-lab/navigation.spec.ts`（1）：`direct navigation to each tier of routes: read, write, edit all resolve`
- `component-lab/overlay-ladder-anatomy.spec.ts`（2）：`dialog default tier + footer anatomy + drawer sm tier (light)`；`dialog default tier + footer anatomy + drawer sm tier (dark)`
- `component-lab/simple-form.spec.ts`（3）：`write: open select, choose option, and verify the selected option value updates`；`write: custom optionTemplate renders rich content and binds the option value on select`；`write: check TypeScript checkbox updates its state while the summary text remains a static prefix`
- `component-lab/smoke.spec.ts`（8）：`smoke: dialog — renders and has at least one scenario`；`smoke: tabs — renders and has at least one scenario`；`smoke: loop — renders and has at least one scenario`；`smoke: select — renders and has at least one scenario`；`smoke: checkbox-group — renders and has at least one scenario`；`smoke: array-field — renders and has at least one scenario`；`smoke: table — renders and has at least one scenario`；`smoke: kanban — renders and has at least one scenario`
- `component-lab/surface-form-input.spec.ts`（1）：`dialog surface form input keeps typed value under StrictMode`
- `component-lab/surface-rhythm-pagination.spec.ts`（2）：`pagination bars keep the --space-block-gap top rhythm (light)`；`pagination bars keep the --space-block-gap top rhythm (dark)`
- `exploratory/domain-page-zero-error.spec.ts`（1）：`zero-error load: kanban-perf-scale`（`kanban://perf-scale /headerClassName Unknown property "headerClassName" for renderer type "kanban"`）
- `exploratory/keyboard-focus-and-teardown.spec.ts`（4）：`dialog: Enter opens dialog, Escape closes, focus returns to trigger`；`tabs: keyboard navigation moves focus and Enter activates next tab without errors`；`select: keyboard selection updates scope-debug and no runtime failures`；`cross-page teardown: open dialog then navigate across heavy routes with no lingering failures`
- `exploratory/lab-batch-zero-error.spec.ts`（8）：`lab zero-error: dialog`；`lab zero-error: tabs`；`lab zero-error: loop`；`lab zero-error: select`；`lab zero-error: checkbox-group`；`lab zero-error: array-field`；`lab zero-error: table`；`lab zero-error: kanban`
- `page-designer-s3-s4.spec.ts`（1）：`S3-3 formula editor + S3-1 data binding write expression templates through updateProps`（`nop-page-designer://edit /body/0/value Unknown property "value"`）
- `renderer-lab-interaction-state.spec.ts`（1）：`dialog: size full spans the full viewport width`
<!-- /F2-LIST -->

### F3 `invalid-reaction-deps` — 3 项 → **B**

代表错误：

```
[console.error] [flux] schema error invalid-reaction-deps playground://component-lab/single-owner-pick
/body/0/body/0/pickerSchema/loadAction/dependsOn kind: "reaction" fields require a non-empty dependsOn
array of root-level scope paths.
```

- **根因**：R2.12 C3 族（×50 语料）：`kind:"reaction"` 字段 `dependsOn` 为空/缺失，strict 诊断 error 触门。涉及 lab picker 语料（`single-owner-pick` / `multiple-reviewers-pick` / `crud-mode-picker-per-row-isolation-bug-73-pattern`）与 `host-crud-query-form-loadaction-chain`。
- **承接指针**：P1-MA4.5-002 + plan 734 Deferred ①。
- **隔离复跑**：3/3 stable red。
- 受影响：`component-lab/c3-1-host-surfaces.spec.ts > picker-host: CRUD-mode selection stays isolated per row (bug 73 pattern, P1-1 proof)`；`component-lab/smoke.spec.ts > smoke: picker — renders and has at least one scenario`；`exploratory/lab-batch-zero-error.spec.ts > lab zero-error: picker`。

### F4 `slot-used-outside-region` — 1 项 → **B**

```
[console.error] [flux] schema error slot-used-outside-region
$.body[0].columns[2].buttons[0].fragment.url $slot can only be used inside a parameterized region.
```

- 受影响：`component-lab/c6-3-host-surfaces.spec.ts > status-host: dialog scope eval + levelMap projection (host-status-dialog)`（同簇另含 1 条同码 $.body[0]...text/value）。根因同上族（demo schema `$slot` 用法越界）；承接 P1-MA4.5-002 / plan 734 ①。隔离复跑 stable red。

### F5 `invalid-action-shape` — 1 项 → **B**

```
[console.error] [flux] schema error invalid-action-shape calendar://perf-scale /onEventClick/action
Action objects require a non-empty action field.
```

- 受影响：`exploratory/domain-page-zero-error.spec.ts > zero-error load: calendar-perf-scale`（onEventClick/onEventChange action 缺 `action` 字段，perf-scale demo schema 语料）。承接同上。隔离复跑 stable red。

### F6 CRUD query 搜索按钮 locator 歧义 — 6 项 → **D**

代表错误（`crud-demo.spec.ts` / `antdpro` / `complex-pages` / `url-filter-sync` 同型）：

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: '搜索' }) resolved to 2 elements:
    1) <button tabindex="0" ... data-slot="button" ...>搜索</button>
    2) <button type="button" data-slot="crud-query-search" ...>搜索</button>
```

- **根因**：R3.6（plan 743）为 CRUD query **有意**新增合成搜索/重置按钮（AMIS 对齐，finding closed）；commit `80aae4239`（2026-10-26）已迁移 4 个测试文件改用 `data-slot=crud-query-search/reset` 选择器，但本 6 项所在 spec 未迁移，按按钮名匹配即歧义。产品行为正确，测试选择器过期。
- **承接指针**：plan 743 / commit `80aae4239` 的选择器迁移模式（照搬 `data-slot` 定位）。
- **隔离复跑**：6/6 stable red（确定性歧义，非 flake）。
- 受影响：`antdpro-replica-interactions.spec.ts > 09 I3 keyword search from page 2 resets pagination to page 1`；`antdpro-replica-visual.spec.ts > 10 list — keyword no-match shows empty state; bulk delete disabled without selection`；`complex-pages-interaction-state.spec.ts > advanced-query: role and ID-range filters return real results`；`complex-pages-interaction-state.spec.ts > approval-tasks: status filter re-queries the visible row set`；`crud-demo.spec.ts > filters rows by keyword and resets back to the full list`；`url-filter-sync.spec.ts > filtering writes back to the URL with replace semantics`。

### F7 45s 超时族 — 6 项 → **E/未定**

错误仅 `Test timeout of 45000ms exceeded.`（无进一步签名）。

- **事实**：全量与隔离复跑（--retries=0）均超时，稳定复现；但无法在本预算内区分"测试流程过长/等待条件不满足"与"产品流卡死"。缺证据：单 worker 本地复跑 + trace。
- 受影响：`ai-bubble-content.spec.ts > user message edit: toggle → textarea → submit regenerates the reply`；`ai-bubble-content.spec.ts > user message edit cancel via Escape restores the bubble`；`ai-conversations.spec.ts > streaming markdown does not flicker garbled CJK halves under chunk pressure`；`linear-replica-interactions.spec.ts > 16 detail copy fires the no-op copyLink endpoint with the page id`；`linear-replica-interactions.spec.ts > 18 detail archive posts archiveIssue, navigates back with toast, row leaves the list`（linear 18 于 2026-09-26 commit `8bf2b4f79` 重写过一次语义，仍红）；`notion-replica-interactions.spec.ts > 07 I3 condition-builder filter narrows the view; empty rule locks the empty copy`。

### F8 perf 阈值 — 1 项 → **F**

- `scada-perf.spec.ts > 10 万图元拖动/平移 fps 双口径（渲染吞吐 ≥40fps + 帧钟跟随 ≥0.9，A4 重校准）`：`expect(received).toBeGreaterThanOrEqual` 帧率 gate 未达标。非代码缺陷判定归 QA.7 §C"scada perf rAF 口径"；阈值裁决委派 **arm2 MA7.1 / plan 628**。隔离复跑 stable red（本机帧率口径）。
- 注：`scada-editor-perf.spec.ts` 3 项的失败签名是 F1 console 门（计入 F1），其 perf 断言本体在门清除后需复测。

### F9 其余稳定红（无既存 finding 指针）— 20 项 → **E/未定**

预算内未能定根因（各有明确失败签名但缺单点归因证据）；全部隔离复跑 stable red，故**不**是 flake/环境污染。逐项签名摘要（全文 `_tmp/ph9-e2e/cluster2.txt`）：

- `ai-conversations.spec.ts > external ai:send button dispatches through the registered namespace` — `[data-slot="ai-bubble"][data-role="user"]` 10s 未出现（外部 send 未驱动出用户气泡）。
- `antdpro-replica-interactions.spec.ts > 01 select-all shows count + 取消选择; bulk delete removes rows db-observably` — 期望子串 `SO2026080110` 不在列表（数据依赖断言未命中）。
- `antdpro-replica-interactions.spec.ts > 14 I12 form-grouped owner-form submit posts payload then lands on result; reset empties` — toast 文案 `入库登记已提交，即将跳转` 未出现（该测试 2026-09-26 `8bf2b4f79` 已重写过一次）。
- `antdpro-replica-visual.spec.ts > 01 list — ...` — `getByTestId('antdpro-list-export')` 不存在；`> 03 form-grouped — ...` — `入库基信` 子串不命中（页面结构与测试期望漂移，缺产品变更指针）。
- `cal-replica-visual.spec.ts > 01 booking — ...` — `[data-slot="calendar-grid-cell"][data-today="true"]` 计数 0（today 标记缺失，疑似产品缺陷，需单点归因）。
- `component-lab/c2-4-host-surfaces.spec.ts > range-host: calendar selection writes the range back ...` — range 显示 `2024-06-10` vs 期望 `2024-06-18`（日期快捷选段行为漂移）。
- `component-lab/c7-host-surfaces.spec.ts > mobile-host: swipe-cell row action dispatches onAction ...` — swipe 状态 `closed` vs 期望 `open-left`。
- `component-lab/simple-form.spec.ts > write: confirm-password example ...` — 提交后残留 1 个 `field-error`（期望 0）。
- `cron-editor.spec.ts > text mode ...`；`> v2 wizard journey ...` — `cron-editor-text-echo`/wizard echo 空文本（echo 断言未命中）。
- `data-viz-interaction-state.spec.ts > dashboard: Save persists the layout` — 序列化布局不含 panels（R3.7/plan 744 曾修 dashboard Save 序列化 `{panels}` 包装，仍红 → 需对照 plan 744 修复面裁决 D/B）。
- `editor-demos-ux-r10.spec.ts > sc2-palette-thumb ...` — palette thumb 37 vs 期望 44（计数漂移，未找到对应产品变更指针）。
- `kanban-demo.spec.ts > programmatic card move via evaluate verifies undo` — 空错误消息（results.json 中 message 为空串）；`> drag card reorder between columns` — 列计数 3 vs 期望 2。
- `linear-replica-interactions.spec.ts > 15 inbox bulk read flips all unread ...` — `已归档全部通知` 未出现。
- `linear-replica-visual.spec.ts > 03 inbox — ...` — `归档所选` 子串不命中；`> 05 projects — ...` — `fillWidth/trackWidth` 为 NaN（元素不可测，非 perf）。
- `renderer-lab-interaction-state.spec.ts > input-password: strength meter tracks weak→strong programmatically` — strength meter 15s 未出现。
- `scheduling-visual-tokens.spec.ts > drag-over target column paints a primary ring that flips with mode` — `[data-drop-target="true"]` 计数 0。

### F9 增补（2026-11-06，plan 859 focused e2e 对照发现，未计入上方 20 项）

- `ai-bubble-content.spec.ts > corner shape sets data-shape`；`ai-bubble-content.spec.ts > avatar slot and timestamp footer render` —— `openCoverage` 等待 `heading /AI Coverage/` 25s 未出现。HEAD（命名 stash 对照）与 plan 859 改动两轮 `--retries=0` 均复现；两者为该 spec 的前两个用例，同文件后续用例在页面预热后可通过——疑似 component-lab 冷启动编译时延，根因未定（缺单 worker 冷/热对照 trace）。**E/未定**，与本表其余 F9 同口径。

## 5. C 类（flake）登记

| 项                                                                                                                 | 首轮失败签名（retries=1 下 results[0]，全量运行）                                                                         | 承接                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `ai-attachments.spec.ts > picking an image renders a preview item then remove clears it`                           | `[data-slot="ai-chat-root"]` 15s 未出现（首入口冷启动窗口）                                                               | QA.7 §C ai-attachments 家族（在册）                         |
| `ai-attachments.spec.ts > exceeding maxFiles rejects the surplus file (validation Failure Path)`                   | 同上签名                                                                                                                  | 同上                                                        |
| `complex-pages-interaction-state.spec.ts > standard-crud: add-dialog picker popup renders rows and commits a pick` | `locator('[data-slot="picker-dialog-content"][data-open"]')` 5s 未出现（"open picker popup must carry its crud content"） | **新 flaky，QA.7 §C 四族之外，独立新 C 条目**（PH-10 输入） |
| `flow-designer-ux-visual.spec.ts > selected node gets a 2px ring box-shadow`                                       | `toContain("2px")` 得 `rgba(28,110,242,0.706)...`；**隔离复跑绿** → 跨 spec 资源/时序干扰                                 | PH-10（免重跑证据：`iso-b7.log`）                           |

## 6. Cross-Cutting 裁决：A 类是否存在

**A 类 = 0。** 依据：

1. 主导语料（213/248，B 类）的全部根因面早于 10-18 运行（验证器诊断消息串 2026-05-21 `5b870f9e0`；涉事 demo schema 2026-08-28/10-05），且与 arm2 P1-MA4.5-002 在 10-18 语料上登记的 238/263 同根同源——非新引入。
2. 10-18 → 10-26 之间的产品侧新变更中，唯一产生新红的 R3.6 合成搜索按钮是**有意的产品行为**（审计 finding closed、AMIS 对齐），对应 6 项失败属测试未迁移（D），不构成产品回归。
3. 隔离复跑 247/248 stable red 排除了"并行合入 758–761 引入回归"的假设（758–761 均为检查门/工具链/ai 内部生命周期提交，不触碰 renderer/schema 行为）。

**roadmap"硬红极少"叙事的裁决**：叙事**成立但须加限定**——仓库的 248 项 e2e 存量红不是产品回归，而是（84.9%）一个**已登记、有明确技术方案、但自 plan 734 起即 owner-gap 的 strict 诊断语料清洗工程**（F1–F5：demo schema target-binding metadata / AMIS prop 清理 / reaction dependsOn）+ 少量过期测试定位器（D）与零散单点未定项（E/未定 26 项 ≈ 10%）。"极少"指的是**无 A 类回归**；存量红的规模（248）与"硬红极少"并存的事实必须在 §Cross-Cutting ⚠ 行以本节表述落文。

## 7. 遗留与不确定项

- F7 超时族（6 项）与 F9 未定族（20 项）合计 26 项（10.4%）缺单点根因证据；所需下一步（单 worker 复跑、`--trace`、对照 R3.7/`8bf2b4f79` 修复面）已在各条目注记。
- `kanban-demo.spec.ts > programmatic card move via evaluate verifies undo` 在 results.json 中错误消息为空串，需本地复跑取签名。
- plan 734 Deferred ① 的 owner gap（语料清洗无既存 owner）仍开放——本台账的 213 项 B 类即其量化边界，可直接作为该新行的 scope 输入。

## 5. Skip 面清单（plan 767 Phase 3 / deep-audit D7）

> 口径：静态 skip call site 逐项登记（内容锚定：spec 文件 + 套件/用例名）；runtime 46 = 2026-10-26 运行 skipped 计数对照。诊断类 spec 的 skip 由 `docs/testing/e2e-standards.md` sanctioned；本节保证 skip 面可对账、不无声腐化（新增 skip 必须落本节）。

| spec 文件                                                                                | skip 形态                | 套件/用例（内容锚定）                                                                                                                                                                                                       | 归属                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| tests/e2e/exploratory/interaction-tests.spec.ts（已删除，plan 863；路径留档不作 anchor） | describe.skip ×6         | Exploratory: form interactions / dialog-drawer lifecycle / tabs switching / dynamic renderer switching / reaction watched field / complex form fields                                                                       | 探索性诊断簇（sanctioned；未转正的手工探索脚本）——**已随 plan 863 删除**（T5 裁决：`.catch(() => {})` 吞断言、无消费方；本行留档） |
| `tests/e2e/exploratory/subagent-a-independent-review.spec.ts`                            | describe.skip ×7         | Subagent-A: Debugger API deep inspection / Cross-page navigation stress / Flow Designer interaction stress / Concurrency stress / Form field edge cases / Report Designer basic interaction / Word Editor basic interaction | 探索性诊断簇（sanctioned；子代理审查期一次性产物，留档可复跑）                                                                     |
| `tests/e2e/exploratory/debug-canvas.spec.ts`                                             | test.skip ×1             | debug canvas element                                                                                                                                                                                                        | 探索性诊断（sanctioned）                                                                                                           |
| `tests/e2e/code-editor.spec.ts`                                                          | test.skip ×1             | captures code editor page screenshot                                                                                                                                                                                        | 截图诊断（sanctioned；按需手动开启）                                                                                               |
| `tests/e2e/readme-flux-basic-screenshot.spec.ts`                                         | describe.skip ×1         | README screenshots                                                                                                                                                                                                          | 截图诊断（sanctioned；README 配图更新时手动开启）                                                                                  |
| `tests/e2e/flow-designer-edge-creation.spec.ts`                                          | test.skip ×1             | diagnostic synthetic connect event updates the live edge count                                                                                                                                                              | 诊断（synthetic 事件路径与真实指针交互不等价，留作诊断入口）                                                                       |
| `tests/e2e/flow-designer-ui.spec.ts`                                                     | test.skip ×1             | captures node and hover toolbar html                                                                                                                                                                                        | DOM 捕获诊断（sanctioned）                                                                                                         |
| `tests/e2e/debugger-meta-diagnostic.spec.ts`                                             | test.skip ×1             | diagnose admin code meta explanation on live flux-basic page                                                                                                                                                                | debugger 诊断（sanctioned；需 live 页面环境）                                                                                      |
| `tests/e2e/component-lab/crud-table-body-diag.spec.ts`                                   | describe.skip ×1         | crud table body diagnostic                                                                                                                                                                                                  | 组件实验台诊断（sanctioned）                                                                                                       |
| `tests/e2e/large-dataset-windowing.spec.ts`                                              | test.skip ×2             | virtualized list mounts a bounded window and scrolls with content / transfer windowing keeps pane options interactive above the threshold                                                                                   | **待裁决**（非诊断命名，skip 理由未在文内自证——归 PH-10/后续治理核销或转正）                                                       |
| `tests/e2e/form-enter-ime-keyboard.spec.ts`                                              | test.fixme ×1            | trusted IME Enter (keyCode 229 via CDP) does not submit the form                                                                                                                                                            | **待裁决**（fixme = 已知缺陷记录，与 `fm3-contract-probes` 单测层 IME it.skip 同根族——归 IME 契约 owner 面）                       |
| `tests/e2e/mobile-components.spec.ts`                                                    | test.skip ×1（条件门控） | conditional skip（运行时环境条件）                                                                                                                                                                                          | 条件门控（sanctioned；条件即文档）                                                                                                 |

静态合计：12 文件 / 24 call site（15 describe.skip + 8 test.skip + 1 test.fixme）；runtime 对照 46（2026-10-26 运行）。单元测试层游离 skip 另见：`packages/flux-renderers-form/src/__tests__/fm3-contract-probes.test.tsx`（IME characterization it.skip，文内自述 filed-defect record，与上行 fixme 同族）、`packages/flux-react/src/__tests__/values-path-integration.test.tsx`（test.fixme，自述 remove-when-fix）。

## 2026-11-11 基线（plan 836 Phase 4 权威基线，逐名对账）

> 本节体量超限已拆分至 `docs/testing/e2e-baseline-ledger-2026-11-11.md`（运行元数据、逐名对账结论、新转入 3 项、836 处置摘要与转出清单）。快照滞后指引见文件头。

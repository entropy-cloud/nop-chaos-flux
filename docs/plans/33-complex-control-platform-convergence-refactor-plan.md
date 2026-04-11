# 33 å¤æ‚æŽ§ä»¶å¹³å°åè®®æ”¶æ•›é‡æž„è®¡åˆ’

> Plan Status: completed
> Last Reviewed: 2026-04-04
> Source: `docs/analysis/2026-04-04-framework-stability-and-complex-control-unification-analysis.md` and `docs/plans/33-review.md` reviewed against current code anchors on 2026-04-04

> **Implementation Status: âœ… COMPLETED (2026-04-04)**
> All 6 phases are landed. Shared workbench protocol/types in `packages/flux-core/src/workbench/`, React host helpers and `WorkbenchShell` in `packages/flux-react/src/workbench/`, Flow Designer and Report Designer migrated to `WorkbenchShell`, Word Editor aligned with datasets/leave-guard, Code Editor source-ref resolvers and event wiring complete.

## å¤å®¡ç»“è®º

- åˆ†æžæ–‡æ¡£çš„ä¸»åˆ¤æ–­æˆç«‹ï¼š`SchemaRenderer` æ ¸å¿ƒå±‚ä¸éœ€è¦æŽ¨ç¿»ï¼ŒçœŸæ­£æœªæ”¶æ•›çš„æ˜¯å¤æ‚æŽ§ä»¶å¹³å°å±‚ã€‚
- è¿™ä»½åˆ†æžæ–‡æ¡£é€‚åˆä½œä¸ºè¯Šæ–­ç»“è®ºï¼Œä¸é€‚åˆä½œä¸ºæ‰§è¡Œæ¸…å•ï¼›æ‰§è¡Œå±‚éœ€è¦æ‹†æˆå…±äº«åè®®ã€Flow åŸºçº¿æç‚¼ã€Report ç»„åˆè½åœ°ã€Word å·¥ä½œå°æ”¶æ•›ã€Code Editor å£°æ˜Žé¢æ”¶å£å‡ ä¸ªç‹¬ç«‹é˜¶æ®µã€‚
- éœ€è¦åŠ ä¸€ä¸ªçŽ°å®žæ ¡å‡†ï¼š`report-designer` çš„ schema-driven toolbar / field panel / inspector å·²ç”± `docs/plans/32-report-designer-schema-driven-refactor-plan.md` è½åœ°ï¼Œå› æ­¤æœ¬è®¡åˆ’ä¸é‡å¤åš UI schema åŒ–ï¼Œè€Œæ˜¯ç»§ç»­æŽ¨è¿› spreadsheet ç»„åˆã€å‘½ä»¤é¢å¯¹é½å’Œå…±äº«åè®®æ”¶æ•›ã€‚
- ç»“åˆäºŒæ¬¡è¯„å®¡ä¸Žå½“å‰ä»£ç å¤æŸ¥ï¼Œæœ¬è®¡åˆ’è¿˜éœ€è¦ 5 ä¸ªæ‰§è¡Œå±‚æ ¡å‡†ï¼šè¡¥é½ `flow-designer` æ–‡æ¡£åŸºçº¿ã€åœ¨ Phase 0 å…ˆå†™å‡º `DomainBridge` è‰å›¾ã€æŠŠ Report Phase 3 å›ºå®šä¸ºâ€œé»˜è®¤ç›´æŒ‚ spreadsheet hostâ€è·¯çº¿ã€æ˜Žç¡® Word å…ˆèµ° non-schema shell æ”¶æ•›ã€æŠŠ Code Editor çš„ source-ref è§£æžä»Ž `types.ts` æ‹†åˆ° runtime helperã€‚

## ä¸ŽçŽ°æœ‰è®¡åˆ’çš„å…³ç³»

- `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md` å…³æ³¨çš„æ˜¯é¢†åŸŸåŒ…å¤§æ–‡ä»¶æ‹†åˆ†å’Œ orchestrator æ”¶å£ï¼›æœ¬è®¡åˆ’å…³æ³¨çš„æ˜¯è·¨å¤æ‚æŽ§ä»¶çš„å…±äº« host/workbench/session åè®®ï¼Œä¸é‡å¤åšæ–‡ä»¶ç»“æž„å®¡è®¡ã€‚
- `docs/plans/32-report-designer-schema-driven-refactor-plan.md` å·²å®Œæˆï¼Œä¸åº”åœ¨æœ¬è®¡åˆ’ä¸­é‡æ–°æ‰“å¼€ï¼›æœ¬è®¡åˆ’åªå¤„ç†å…¶åŽç»­ä»æœªå®Œæˆçš„ spreadsheet ç»„åˆå’Œ command/session å¯¹é½ã€‚
- `docs/plans/24-word-editor-development-plan.md` ä»ç„¶æ˜¯ Word Editor çš„åŠŸèƒ½è·¯çº¿å›¾ï¼›æœ¬è®¡åˆ’åªæŠ½å–å…¶ä¸­ä¸Žå…±äº«å·¥ä½œå°åè®®æ”¶æ•›ç›´æŽ¥ç›¸å…³çš„éƒ¨åˆ†ã€‚

## Problem

å½“å‰æœ€å€¼å¾—å¤„ç†çš„ä¸æ˜¯æŸä¸€ä¸ªå¤æ‚æŽ§ä»¶å†…éƒ¨çš„å°åŠŸèƒ½ç¼ºå£ï¼Œè€Œæ˜¯å¤æ‚æŽ§ä»¶ä¹‹é—´é‡å¤å®žçŽ°äº†ç›¸ä¼¼å£³å±‚å’Œå®¿ä¸»åè®®ï¼Œä½†åˆæ²¡æœ‰å½¢æˆçœŸæ­£å…±äº«çš„æŠ½è±¡ï¼Œå·²ç»å¼€å§‹å½±å“åŽç»­ç»´æŠ¤å’Œä¸€è‡´æ€§ã€‚

- `packages/flow-designer-renderers/src/designer-page.tsx:65-247` å·²ç»å®žçŽ°äº†è¾ƒæˆç†Ÿçš„ host shellã€host scopeã€`designer` namespace æ³¨å†Œå’Œ toolbar/inspector/dialogs åŒè¾¹ç•Œæ¸²æŸ“ï¼Œä½†è¿™äº›èƒ½åŠ›ä»æ˜¯ Flow Designer ç§æœ‰å®žçŽ°ã€‚
- `packages/spreadsheet-renderers/src/bridge.ts:13-85` å’Œ `packages/spreadsheet-renderers/src/page-renderer.tsx:63-128` å·²ç»æœ‰ç¨³å®šçš„ bridge/snapshot/page-shell æ¨¡å¼ï¼Œä½†æ²¡æœ‰ä¸Šå‡ä¸ºå…±äº«åè®®ã€‚
- `packages/report-designer-renderers/src/page-renderer.tsx:51-142` å½“å‰ page å£³å±‚è™½ç„¶å·²ç»æ”¯æŒ schema-driven toolbar / field panel / inspectorï¼Œä½†é»˜è®¤ body è·¯å¾„ä»æ²¡æœ‰æŒ‚ä¸Š spreadsheet host/canvasï¼Œ`body` ç¼ºå¤±æ—¶åªèƒ½å›žé€€ placeholder/fallbackï¼›è¿™ä¸Ž `docs/architecture/report-designer/design.md:22-49` æè¿°çš„åŒå±‚æž¶æž„ç›®æ ‡ä¸ä¸€è‡´ã€‚
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:3-15` å·²æš´éœ² `report-designer:undo`ã€`report-designer:redo`ã€`report-designer:save`ã€`report-designer:stopPreview`ï¼Œä½† `packages/report-designer-core/src/commands.ts:7-76` å¹¶æœªå®šä¹‰å¯¹åº”å‘½ä»¤é¢ï¼Œè¯´æ˜Ž toolbarã€shellã€core è¿˜æ²¡æœ‰å¯¹é½ã€‚
- `packages/word-editor-renderers/src/WordEditorPage.tsx:26-235` ä»æ˜¯ç‹¬ç«‹ä¸‰æ å·¥ä½œå°ï¼Œç›´æŽ¥åˆ›å»º bridge/storeã€æ‰‹å·¥ç®¡ç†ä¿å­˜æç¤ºå’Œå·¦å³é¢æ¿ï¼Œå°šæœªè¿›å…¥ç»Ÿä¸€çš„ host scopeã€namespaced actionã€session/leave-guard è·¯å¾„ã€‚
- `packages/word-editor-core/src/document-io.ts:15-70` å·²æä¾› `saveDatasets()` / `loadDatasets()`ï¼Œä½†å½“å‰ page å±‚åªæŽ¥çº¿äº† `saveDocument()` / `loadDocument()`ï¼Œä¿å­˜è¾¹ç•Œä»ä¸å®Œæ•´ã€‚
- `packages/flux-code-editor/src/types.ts:208-235` å¯¹ `VariableSourceRef`ã€`FuncSourceRef`ã€`SQLSchemaSourceRef` å’Œ SQL variable source çš„ source-ref è·¯å¾„ä»æœªå®žçŽ°çœŸå®žè§£æžï¼Œå½“å‰åªåœ¨å†…è”æ•°æ®åœºæ™¯æ­£å¸¸é€ä¼ ï¼Œé‡åˆ° source-ref æ—¶é™é»˜å›žé€€ç©ºæ•°ç»„ï¼›`packages/flux-code-editor/src/code-editor-renderer.tsx:128-150` ä¹Ÿæ²¡æœ‰æŠŠ change äº‹ä»¶å›žé€åˆ° `props.events.onChange`ã€‚
- `docs/architecture/code-editor.md:291-341`ã€`docs/architecture/report-designer/design.md:290-366` ä»ä¿ç•™äº†æ˜Žæ˜¾è¶…å‰äºŽå½“å‰å®žçŽ°çš„ç›®æ ‡æ€è¡¨è¿°ï¼Œå¯¼è‡´åŽç»­æŠ½è±¡å®¹æ˜“å»ºç«‹åœ¨é”™è¯¯åŸºçº¿ä¸Šã€‚

## Root Cause

- æ ¸å¿ƒ runtime å…ˆç¨³å®šä¸‹æ¥åŽï¼Œå¤æ‚æŽ§ä»¶æ˜¯æŒ‰å„è‡ªäº§å“è·¯å¾„ç‹¬ç«‹æ¼”è¿›çš„ï¼›å…±äº« workbench / host protocol ä»Žæœªè¢«æ­£å¼æŠ½å‡ºæ¥ï¼Œå¯¼è‡´æ­£ç¡®æ¨¡å¼å…ˆåœ¨å•ä¸ªæ¨¡å—é‡Œâ€œé•¿å‡ºæ¥â€ï¼Œè€Œä¸æ˜¯å…ˆè¢«å®šä¹‰ä¸ºå¹³å°èƒ½åŠ›ã€‚
- `flow-designer`ã€`spreadsheet`ã€`report-designer`ã€`word-editor` é¢ä¸´çš„é—®é¢˜ç›¸ä¼¼ï¼Œä½†è½åœ°æ—¶åˆ†åˆ«ä¼˜å…ˆä¿è¯â€œèƒ½è·‘â€å’Œâ€œèƒ½å±•ç¤ºâ€ï¼ŒäºŽæ˜¯ä¿å­˜æ€ã€busy æ€ã€é¢æ¿å¸ƒå±€ã€scope æ³¨å…¥ã€action namespaceã€resource panel äº¤äº’éƒ½åœ¨å„è‡ªé¡µé¢é‡Œå®žçŽ°äº†ä¸€éã€‚
- æ–‡æ¡£å±‚æ··åˆäº†â€œå½“å‰å·²è½åœ°åŸºçº¿â€å’Œâ€œç›®æ ‡æ€è®¾è®¡â€ï¼Œä½†ç¼ºå°‘ä¸€ä»½ä¸­é—´æ‰§è¡Œæ–‡æ¡£åŽ»æ˜Žç¡®å“ªäº›èƒ½åŠ›å…ˆç»Ÿä¸€åè®®ã€å“ªäº›èƒ½åŠ›ä¿ç•™é¢†åŸŸå·®å¼‚ï¼Œæœ€ç»ˆé€ æˆå®žçŽ°ä¸Žæ–‡æ¡£çš„åŒå‘æ¼‚ç§»ã€‚
- `code-editor` è¿™ç±»é«˜çº§å­—æ®µæŽ§ä»¶å’Œ `flow/report/word` è¿™ç±»é¡µé¢çº§è®¾è®¡å™¨å¤æ‚åº¦æ¥æºä¸åŒï¼Œä½†æ–‡æ¡£å’Œè®¨è®ºä¸­ç»å¸¸è¢«æ”¾è¿›åŒä¸€æŠ½è±¡å±‚çº§ï¼Œå¢žåŠ äº†è¿‡åº¦ç»Ÿä¸€çš„é£Žé™©ã€‚

## Goals

- æŠŠå¤æ‚æŽ§ä»¶çœŸæ­£éœ€è¦å…±äº«çš„èƒ½åŠ›æ”¶æ•›ä¸ºå¹³å°åè®®ï¼šhost bridgeã€host scope/action namespace æŽ¥çº¿ã€session/dirty/save/leave-guardã€resource panel äº¤äº’ã€async busy/cancel è¯­ä¹‰ã€‚
- ä¿æŒ `flow-designer` ä½œä¸ºå‚è€ƒå®žçŽ°ï¼ŒæŠŠå·²ç»éªŒè¯æœ‰æ•ˆçš„æ¨¡å¼æç‚¼ä¸ºå…±äº« helper å’Œè§„èŒƒï¼Œè€Œä¸æ˜¯é‡æ–°è®¾è®¡ä¸€å¥—æ–°å¹³å°ã€‚
- è®© `report-designer` çœŸæ­£å»ºç«‹åœ¨ `spreadsheet` ä¹‹ä¸Šï¼Œå¹¶ä¸Žå…±äº«åè®®å¯¹é½ã€‚
- è®© `word-editor` å…ˆå¹¶å…¥å…±äº«å·¥ä½œå°åè®®ï¼Œå†å†³å®šæ˜¯å¦ç»§ç»­å‘ schema-driven è¿ç§»ã€‚
- æ”¶å£ `code-editor` çš„å£°æ˜Žé¢ä¸Žå®žçŽ°é¢å·®è·ï¼Œä½†ä¿ç•™å…¶â€œé«˜çº§å­—æ®µæŽ§ä»¶â€å®šä½ã€‚

## Non-Goals

- ä¸ç»Ÿä¸€ graph / spreadsheet / word / code çš„åº•å±‚æ–‡æ¡£æ¨¡åž‹ã€‚
- ä¸ç»Ÿä¸€ `@xyflow/react`ã€spreadsheet canvasã€`@hufe921/canvas-editor`ã€CodeMirror 6 çš„åº•å±‚å¼•æ“ŽæŽ¥å£ã€‚
- ä¸åœ¨æœ¬è®¡åˆ’ä¸­æŠŠ `word-editor` ä¸€æ¬¡æ€§æ”¹å†™æˆå®Œå…¨ schema-driven çš„ designer-pageã€‚
- ä¸æŠŠ `WordEditorPage` å…ˆå¼ºè¿æˆ `RendererComponentProps` renderer ä½œä¸ºæœ¬è®¡åˆ’å‰ç½®æ¡ä»¶ã€‚
- ä¸æŠŠ `code-editor` æå‡ä¸ºæ–°çš„ designer-core æˆ–ç‹¬ç«‹ page å¹³å°ã€‚
- ä¸é‡åšå·²ç»å®Œæˆçš„ report-designer schema-driven UI å·¥ä½œã€‚
- ä¸ä¸ºäº† `report-designer` é»˜è®¤ host ç»„åˆå…ˆå¼•å…¥æ–°çš„ `spreadsheet-canvas` renderer ç±»åž‹æˆ–é»˜è®¤ `body` schema æœºåˆ¶ã€‚

## Fix Plan

**Phase 0 â€” å†»ç»“å…±äº«åè®®è¾¹ç•Œä¸Žæ–‡æ¡£åŸºçº¿**

Targets: `docs/architecture/renderer-runtime.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/code-editor.md`, new `docs/architecture/complex-control-host-protocol.md`

- æ–°å¢žä¸€ä»½è§„èŒƒæ–‡æ¡£ï¼Œæ˜Žç¡®å“ªäº›èƒ½åŠ›å±žäºŽå…±äº«å¤æ‚æŽ§ä»¶åè®®ï¼Œå“ªäº›èƒ½åŠ›ç»§ç»­ç•™åœ¨å„ domain core å†…éƒ¨ï¼›æ–‡æ¡£é‡Œå…ˆç»™å‡º `DomainBridge<Snapshot, Command, Result>` çš„æœ€å° TypeScript è‰å›¾ï¼Œä»¥åŠå®ƒä¸Ž `SpreadsheetBridge`ã€Flow host wiringã€Word non-schema shell çš„æ˜ å°„ç¤ºæ„ã€‚
- å…ˆæŠŠ package placement å†™æ¸…æ¥šï¼šçº¯ç±»åž‹å’Œæ— å‰¯ä½œç”¨ helper æ”¾è¿› `@nop-chaos/flux-core`ï¼›React ä¾§ host wiring helper æ”¾è¿› `@nop-chaos/flux-react`ï¼›è§†è§‰å±‚ `WorkbenchShell` è‹¥è¦æœåŠ¡ `WordEditorPage` è¿™ç±»éž renderer é¡µé¢ï¼ŒAPI å¿…é¡»ä¿æŒ React-levelï¼Œè€Œä¸æ˜¯é»˜è®¤ç»‘å®š `RendererComponentProps`ï¼›ä¸è¦åœ¨ç¬¬ä¸€æ­¥å°±åˆ›å»ºæ–° packageã€‚
- æ ¡æ­£æ–‡æ¡£ä¸­çš„ç›®æ ‡æ€/çŽ°çŠ¶æ€è¾¹ç•Œï¼Œç‰¹åˆ«æ˜¯ `report-designer` çš„é»˜è®¤ body ä»æœªæŒ‚ä¸Š spreadsheet hostã€`code-editor` çš„ source-ref ç©ºæ•°ç»„å›žé€€è¯­ä¹‰å’Œäº‹ä»¶æŽ¥çº¿ç¼ºå£ã€ä»¥åŠ `flow-designer` çš„ `runtime-snapshot` æ–‡æ¡£ä¸Žå½“å‰ host scope æ³¨å…¥å®žçŽ°çš„æ¼‚ç§»ã€‚

Exit criteria: åŽç»­æ‰€æœ‰å®žçŽ°å·¥ä½œéƒ½æœ‰ç»Ÿä¸€æœ¯è¯­ã€å…±äº«åè®®è‰å›¾å’Œæ‰€æœ‰æƒè¯´æ˜Žï¼Œä¸å†æ··ç”¨â€œå·²ç»å­˜åœ¨çš„å…±äº«èƒ½åŠ›â€å’Œâ€œå‡†å¤‡æŠ½å–çš„å…±äº«èƒ½åŠ›â€ã€‚

**Phase 1 â€” åœ¨ `flux-core` / `flux-react` ä¸­æŠ½å–å…±äº« host protocol ä¸Ž lifecycle helpers**

Targets: new `packages/flux-core/src/workbench/*.ts`, new `packages/flux-react/src/workbench/*.ts`, `packages/flux-core/src/index.ts`, `packages/flux-react/src/index.tsx`

- åœ¨ `@nop-chaos/flux-core` ä¸­æ–°å¢žçº¯åè®®ç±»åž‹ï¼Œä»Žæœ€å° `DomainBridge<Snapshot, Command, Result> = { getSnapshot(); subscribe(); dispatch(); }` å‡ºå‘ï¼Œå†è¡¥ `WorkbenchSessionState`ã€`BusyActionState`ã€`ResourceBrowserInteractionPolicy` ç­‰æ¨ªåˆ‡çŠ¶æ€ã€‚
- åœ¨ `@nop-chaos/flux-react` ä¸­æ–°å¢žä¸å¸¦ domain è¯­ä¹‰çš„ React helperï¼Œç”¨äºŽæŠŠçŽ°æœ‰ domain runtime/wiring é€‚é…åˆ°å…±äº« contractï¼Œä¾‹å¦‚ bridge snapshot è®¢é˜…ã€host scope åˆå¹¶ã€namespace provider æ³¨å†Œã€leave-guard/session çŠ¶æ€æ¡¥æŽ¥ã€‚
- ç¬¬ä¸€é˜¶æ®µä¸å¼ºè¿«æ‰€æœ‰ domain äº§å‡ºå®Œå…¨åŒå½¢çš„ bridge å¯¹è±¡ï¼›`SpreadsheetBridge` å¯ä»¥ç›´æŽ¥å®žçŽ°è¯¥ contractï¼Œ`flow-designer` åˆ™å…ˆç”¨ wrapper/helper è¡¨è¾¾çŽ°æœ‰ core + command adapter ç»„åˆã€‚
- ç¬¬ä¸€é˜¶æ®µä¸æŠ½è§†è§‰å±‚ `WorkbenchShell`ï¼Œåªå…ˆæŠ½å–å·²è¢« `flow-designer`ã€`spreadsheet`ã€`report-designer` è¯æ˜Žä¼šé‡å¤çš„åè®®ä¸Ž wiring helperã€‚
- å¦‚æžœå…±äº« surface ä»ç„¶ä¸ç¨³å®šï¼Œä¸åˆ›å»ºæ–° packageï¼›å…ˆåœ¨çŽ°æœ‰æ ¸å¿ƒé“¾è·¯é‡ŒæŠŠå¯å¤ç”¨æœ€å°é¢å›ºå®šä¸‹æ¥ã€‚

Exit criteria: `flow-designer` ä¸Ž `spreadsheet` è‡³å°‘èƒ½è½åˆ°åŒä¸€å¥— bridge/session/helper contract ä¸Šï¼Œè€Œä¸æ˜¯å„è‡ªç»´æŠ¤ç›¸ä¼¼ä½†äº’ä¸å…¼å®¹çš„æœ¬åœ°æŽ¥å£ï¼›Flow å¯ä»¥å…ˆé€šè¿‡ wrapper è¾¾æ ‡ï¼Œä¸è¦æ±‚ç¬¬ä¸€æ­¥å°±é‡å†™æˆå­—é¢åŒå½¢ bridgeã€‚

**Phase 2 â€” æŠŠ Flow Designer æç‚¼æˆå…±äº«åŸºçº¿çš„å‚è€ƒå®žçŽ°**

Targets: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-context.ts`, related tests/docs

- ç”¨ Phase 1 çš„å…±äº« helper æ›¿æ¢ `designer-page` ä¸­å¯æŠ½ç¦»çš„ host scopeã€namespace æ³¨å†Œã€snapshot è®¢é˜…å’Œ session æ±‡æ€»é€»è¾‘ï¼Œä½†ä¸æ”¹å˜ `DesignerCore`ã€`DesignerContext`ã€`DesignerCommandAdapter` çš„é¢†åŸŸè¾¹ç•Œã€‚
- æŠŠå½“å‰ Flow Designer çš„ host shellã€host scope æ•°æ®æš´éœ²æ¨¡å¼ã€toolbar/inspector/dialogs åŒè¾¹ç•Œæ‰§è¡Œè·¯å¾„æ²‰æ·€ä¸ºå…±äº«åŸºçº¿ï¼Œè€Œä¸æ˜¯ç»§ç»­ä½œä¸ºå•æ¨¡å—ç»éªŒä»£ç å­˜åœ¨ã€‚
- ä¿æŒçŽ°æœ‰è¡Œä¸ºä¸å˜ï¼Œè®© `flow-designer` æˆä¸ºåŽç»­ `report-designer` ä¸Ž `word-editor` çš„è¿ç§»å‚ç…§ï¼Œè€Œä¸æ˜¯å†è®¾è®¡ç¬¬äºŒä¸ªâ€œç†è®ºå®Œç¾Žç‰ˆâ€ã€‚

Exit criteria: Flow Designer æˆä¸ºâ€œå…±äº«åè®® + é¢†åŸŸæ‰©å±•â€çš„ç¬¬ä¸€ä»½çœŸå®žæ ·æ¿ï¼ŒåŽç»­æ¨¡å—è¿ç§»æ—¶ä¸éœ€è¦é‡æ–°çŒœæµ‹ host wiring ç»„ç»‡æ–¹å¼ã€‚

**Phase 3 â€” è®© Report Designer çœŸæ­£è½åœ¨ Spreadsheet Host ä¹‹ä¸Š**

Targets: `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/bridge.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/commands.ts`, `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`, related tests/docs

- å°† `report-designer-page` ä»Žâ€œshell + fallback canvasâ€æŽ¨è¿›åˆ°çœŸå®žçš„â€œspreadsheet host + report semantic layerâ€ç»„åˆï¼›è¿™ä¸€é˜¶æ®µæ˜Žç¡®é‡‡ç”¨â€œé»˜è®¤æ¸²æŸ“è·¯å¾„ç›´æŽ¥ç»„åˆçŽ°æœ‰ spreadsheet host React ç»„ä»¶â€çš„è·¯çº¿ï¼Œä¸æ–°å¢žæ–°çš„ `spreadsheet-canvas` renderer ç±»åž‹ï¼Œä¹Ÿä¸ä¾èµ–é»˜è®¤ `body` schema æ‰èƒ½çœ‹åˆ°çœŸå®ž canvasã€‚
- ä¿æŒ `ReportDesignerBridge extends SpreadsheetBridge` çš„çŽ°æœ‰ç±»åž‹å…³ç³»ä¸åŠ¨ï¼Œé‡ç‚¹æ”¹æˆè®© `page-renderer`ã€`host-data` å’Œé»˜è®¤ body è·¯å¾„çœŸæ­£å»ºç«‹åœ¨è¿™å±‚ç»„åˆä¹‹ä¸Šï¼Œè€Œä¸æ˜¯ç»§ç»­ç”¨æœ¬åœ° `hostData` + fallback placeholder ç»´æŒå¹³è¡Œ page shellã€‚
- æŠŠ `report-designer-core` ä¸€å¹¶çº³å…¥è¿™ä¸€é˜¶æ®µï¼šå½“å‰ core ä¼š clone å¹¶ç‹¬å  `document`ï¼Œå› æ­¤è‹¥è¦ä¸ŽçœŸå®ž spreadsheet host å…±äº« selection/history/runtime äº‹å®žï¼Œéœ€è¦å¢žè¡¥æ˜¾å¼çš„ sync/adapter surfaceï¼Œè€Œä¸æ˜¯å‡è®¾åªæ”¹ renderer å°±è¶³å¤Ÿã€‚
- å¯¹é½ toolbar ä¸Ž core command surfaceï¼šè¦ä¹ˆåœ¨ `report-designer-core` ä¸­è¡¥é½ `undo`ã€`redo`ã€`save`ã€`stopPreview` ç­‰å‘½ä»¤ï¼Œè¦ä¹ˆåœ¨è½åœ°å‰å…ˆä»Žé»˜è®¤ toolbar ç§»é™¤è¿™äº›åŠ¨ä½œï¼Œä¸èƒ½ç»§ç»­ä¿æŒâ€œæŒ‰é’®å­˜åœ¨ä½†å‘½ä»¤ä¸å­˜åœ¨â€çš„çŠ¶æ€ã€‚
- è®© inspectorã€field panelã€preview çŠ¶æ€éƒ½é€šè¿‡å…±äº« host/session åè®®æš´éœ²ç»™ schema ç‰‡æ®µï¼Œè€Œä¸åªæ˜¯æœ¬åœ° `hostData` å¯¹è±¡ã€‚

Exit criteria: `report-designer-page` åœ¨æœªæ˜¾å¼æä¾› `body` schema æ—¶ä¹Ÿä¼šæŒ‚è½½çœŸå®ž spreadsheet hostï¼Œtoolbar åŠ¨ä½œä¸Ž core å‘½ä»¤é¢å¯¹é½ï¼Œreport host ä¸å†ä¾èµ– fallback-only è·¯å¾„ï¼Œä¸” renderer/core ä¹‹é—´æœ‰æ˜Žç¡®çš„ spreadsheet sync boundaryã€‚

**Phase 4 â€” åœ¨å…±äº«åè®®ç¨³å®šåŽæŠ½å– `WorkbenchShell` ä¸Žäº¤äº’è§„èŒƒ**

Targets: new shared shell module under `packages/flux-react/src/workbench/` or a dedicated package only if the visual API proves stable and generic, plus architecture docs

- å½“ `flow-designer` ä¸Ž `report-designer` éƒ½å·²ç»åŸºäºŽåŒä¸€å¥— host/session helper è¿è¡ŒåŽï¼Œå†æŠ½è§†è§‰å±‚ `WorkbenchShell`ï¼Œè¦†ç›– header/toolbar/statusbarã€å·¦å³é¢æ¿æŠ˜å ã€æ‹–æ‹½è°ƒå®½ã€çª„å± fallbackã€ä¸»å·¥ä½œåŒºä¼˜å…ˆçº§ç­‰å…±åŒé—®é¢˜ã€‚
- `WorkbenchShell` å¿…é¡»ä¿æŒ React-level/presentational APIï¼Œå¯åŒæ—¶æœåŠ¡ `designer-page` è¿™ç±» Flux renderer é¡µé¢å’Œ `WordEditorPage` è¿™ç±»æ™®é€š React é¡µé¢ï¼›Flux ç‰¹æœ‰çš„ scope/action wiring ç»§ç»­ç•™åœ¨ç‹¬ç«‹ helper ä¸­ï¼Œä¸ç»‘è¿›è§†è§‰å£³ã€‚
- åŒæ­¥å®šä¹‰èµ„æºé¢æ¿äº¤äº’è§„èŒƒï¼šä¸»ç‚¹å‡»è´Ÿè´£é€‰ä¸­æˆ–æ’å…¥ï¼Œç¼–è¾‘/åˆ é™¤/æ›´å¤šä½œä¸ºæ¬¡çº§åŠ¨ä½œï¼Œdrag-and-drop ä¸æ˜¯å”¯ä¸€å…¥å£ï¼Œå¿…é¡»æä¾›é”®ç›˜æˆ– click-to-insert ç­‰ä»·è·¯å¾„ã€‚
- åŒæ­¥å®šä¹‰å¼‚æ­¥ä¸»åŠ¨ä½œè§„èŒƒï¼šbusyã€disable/stop åˆ‡æ¢ã€é˜²é‡å…¥ã€å¯å–æ¶ˆè¯­ä¹‰ã€ç»“æžœåé¦ˆã€‚
- åªæœ‰åœ¨ visual shell API å·²ç»ç¨³å®šã€åŒæ—¶è¢« Flux renderer é¡µé¢å’Œ non-schema é¡µé¢éªŒè¯å¤ç”¨ï¼Œä¸”æ˜Žæ˜¾è¶…å‡º `flux-react` çŽ°æœ‰èŒè´£æ—¶ï¼Œæ‰åˆ›å»ºç‹¬ç«‹ packageï¼›å¦åˆ™ç»§ç»­åœ¨ `flux-react` å†…éƒ¨ç»´æŒæœ€å°å…±äº«å®žçŽ°ã€‚

Exit criteria: `flow-designer` ä¸Ž `report-designer` ä¸å†å„è‡ªç»´æŠ¤ä¸€å¥—ä¸åŒçš„é¢æ¿å¸ƒå±€å’Œ busy/save äº¤äº’çº¦å®šã€‚

**Phase 5 â€” æŠŠ Word Editor å‘å…±äº« workbench/session åè®®é æ‹¢**

Targets: `packages/word-editor-renderers/src/WordEditorPage.tsx`, `packages/word-editor-core/src/document-io.ts`, related hooks/tests/docs

- å…ˆç”¨å…±äº« `WorkbenchShell`ã€session/dirty/save/leave-guard å’Œèµ„æºé¢æ¿è§„èŒƒæ›¿æ¢ `WordEditorPage` å½“å‰çš„æ‰‹å·¥ä¸‰æ é¡µå£³ï¼›è¿™ä¸€é˜¶æ®µä¸è¦æ±‚å…ˆæŠŠ `WordEditorPage` æ”¹å†™æˆ `RendererComponentProps` rendererï¼Œä¹Ÿä¸æŠŠæŽ¥å…¥ schema fragments ä½œä¸ºå‰ç½®æ¡ä»¶ã€‚
- æŽ¥çº¿ `saveDatasets()` / `loadDatasets()`ï¼ŒæŠŠæ–‡æ¡£ä¿å­˜å’Œæ•°æ®é›†ä¿å­˜èŒƒå›´æ˜¾å¼åŒ–ï¼Œé¿å…ç»§ç»­æŠŠæ•°æ®é›†çŠ¶æ€éšå«ç•™åœ¨ page å±‚ä¹‹å¤–ã€‚
- é€æ­¥æŠŠå·¥å…·æ ã€å·¦ä¾§èµ„æºé¢æ¿ã€å³ä¾§å¤§çº²/å±žæ€§åŒºçš„ä¸»åŠ¨ä½œå’Œæ¬¡çº§åŠ¨ä½œæ•´ç†åˆ°ç»Ÿä¸€è§„èŒƒé‡Œï¼Œä½†ä¿ç•™ `CanvasEditorBridge` ä¸Žå½“å‰ store ä½“ç³»ã€‚
- è‹¥ `word-editor` éœ€è¦ namespaced actionï¼Œåªå¼•å…¥æœ€å°çš„ `word-editor:*` shell å±‚å‘½ä»¤ï¼›å¦‚æžœåŽç»­è¯æ˜Žå¿…é¡»è¿å…¥ Flux renderer ä½“ç³»ï¼Œå†å¦å¼€ follow-up planï¼Œä¸åœ¨æœ¬é˜¶æ®µæ–°å¢žæ–°çš„ designer-core æˆ–å¼ºåˆ¶ renderer migrationã€‚

Exit criteria: Word Editor è‡³å°‘åœ¨é¡µé¢å£³å±‚ã€ä¿å­˜è¾¹ç•Œã€busy/leave-guardã€èµ„æºé¢æ¿äº¤äº’ä¸Šä¸Ž Flow/Report å…±äº«åŒä¸€å¥—çº¦å®šï¼ŒåŒæ—¶ä¿ç•™å½“å‰åº•å±‚ç¼–è¾‘å¼•æ“Žã€é¢†åŸŸæ¨¡åž‹å’Œæ™®é€š React page å…¥å£ã€‚

**Phase 6 â€” æ”¶å£ Code Editor çš„å®žçŽ°é¢ï¼Œé¿å…è¢«é”™è¯¯çº³å…¥ designer å¹³å°**

Targets: `packages/flux-code-editor/src/types.ts`, new `packages/flux-code-editor/src/source-resolvers.ts`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-code-editor/src/use-code-mirror.ts`, `packages/flux-code-editor/src/index.ts`, `docs/architecture/code-editor.md`, related tests

- å®žçŽ° `VariableSourceRef`ã€`FuncSourceRef`ã€`SQLSchemaSourceRef` å’Œ SQL variable source çš„çœŸå®žè§£æžè·¯å¾„ï¼›çº¯ç±»åž‹å’Œå†…è”åŒæ­¥ resolver ç»§ç»­ç•™åœ¨ `types.ts`ï¼Œscope/API è¯»å–é€»è¾‘æ”¾è¿›æ–°çš„ runtime resolver/helper æ¨¡å—ï¼Œä¸æŠŠ host lookup/fetch è¡Œä¸ºå¡žè¿›ç±»åž‹æ–‡ä»¶ã€‚è‡³å°‘è¡¥é½ scope sourceï¼ŒAPI source è§†çŽ°æœ‰ fetch boundary åˆ†å±‚è½åœ°ã€‚
- è®© `code-editor-renderer` åœ¨ change è·¯å¾„é‡Œé€šè¿‡ Flux äº‹ä»¶ç³»ç»Ÿè§¦å‘ `props.events.onChange`ï¼Œä¿æŒ focus/blur/change è¯­ä¹‰ä¸€è‡´ã€‚
- æŠŠ source-ref + change event è¿™éƒ¨åˆ†æ”¶å£è§†ä¸ºå¯åœ¨ Phase 0 å®ŒæˆåŽå¹¶è¡ŒæŽ¨è¿›çš„ contract fixï¼›fullscreenã€SQL execution busy/result é¢çš„äº¤äº’çº¦æŸå†å¯¹é½åˆ°å…±äº« async-action è§„èŒƒï¼Œä½†ä¿æŒå®ƒä½œä¸ºå­—æ®µæŽ§ä»¶çš„è½»é‡å®šä½ã€‚
- åŒæ­¥æ›´æ–° `docs/architecture/code-editor.md`ï¼ŒæŠŠæœªè½åœ°çš„æœªæ¥è®¾æƒ³ä¸Žå½“å‰å·²æ”¯æŒèƒ½åŠ›æ˜Žç¡®åˆ†å±‚ï¼Œé¿å…ç»§ç»­è¢«è¯¯è¯»ä¸ºâ€œå¹³å°çº§è®¾è®¡å™¨â€ã€‚

Exit criteria: Code Editor çš„æ–‡æ¡£å£°æ˜Žé¢å’ŒçœŸå®žå®žçŽ°é¢å¯¹é½ï¼Œsource-ref ä¸Ž change event å¯ç”¨ï¼Œä½†ç»„ä»¶ä»ä¿æŒå­—æ®µçº§ renderer å®šä½ã€‚

**Phase 7 â€” æ–‡æ¡£æ”¶å£ã€å›žå½’æµ‹è¯•å’Œé—ç•™æ¸…ç†**

Targets: touched architecture docs, package tests, `docs/logs/`, optionally follow-up plans for leftover issues

- æ¯ä¸ªé˜¶æ®µå®ŒæˆåŽéƒ½æ›´æ–°æž¶æž„æ–‡æ¡£å’Œå½“æ—¥æ—¥å¿—ï¼Œä¸æŠŠå…±äº«åè®®çš„æœ€ç»ˆå½¢çŠ¶åªç•™åœ¨å®žçŽ°ç»†èŠ‚é‡Œã€‚
- ä¸º shared host protocolã€shared session helperã€report-on-spreadsheet ç»„åˆã€word shell è¿ç§»ã€code-editor source-ref/change event å¢žåŠ å¯¹åº”æµ‹è¯•ã€‚
- è‹¥æŸä¸ªæ¨¡å—åœ¨æ‰§è¡Œä¸­æš´éœ²æ–°çš„é¢†åŸŸé—®é¢˜ï¼Œå¦å¼€æ–°è®¡åˆ’ï¼Œä¸åœ¨æœ¬è®¡åˆ’ä¸­é¡ºæ‰‹æ‰©å¤§èŒƒå›´ã€‚

Exit criteria: å¹³å°åè®®æœ‰è§„èŒƒæ–‡æ¡£ã€å‚è€ƒå®žçŽ°ã€è·¨æ¨¡å—éªŒè¯å’Œæ˜Žç¡®çš„é—ç•™è¾¹ç•Œï¼Œä¸å†ä¾èµ–å•ç¯‡åˆ†æžæ–‡æ¡£ç»´æŒå…±è¯†ã€‚

## Scope

- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flow-designer/runtime-snapshot.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/code-editor.md`
- `packages/flux-core/src/workbench/*.ts`
- `packages/flux-react/src/workbench/*.ts(x)`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/spreadsheet-renderers/src/bridge.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/commands.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/bridge.ts`
- `packages/report-designer-renderers/src/host-data.ts`
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`
- `packages/word-editor-renderers/src/WordEditorPage.tsx`
- `packages/word-editor-core/src/document-io.ts`
- `packages/flux-code-editor/src/types.ts`
- `packages/flux-code-editor/src/source-resolvers.ts`
- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `packages/flux-code-editor/src/use-code-mirror.ts`
- `packages/flux-code-editor/src/index.ts`
- ç›¸å…³ package manifestsï¼ˆè‹¥ shared shell æå–æ”¹å˜ä¾èµ–è¾¹ï¼‰
- ç›¸å…³æµ‹è¯•æ–‡ä»¶ä¸Ž `docs/logs/2026/04-04.md`

## ä¸åœ¨ Scope å†…çš„äº‹é¡¹

- ç»Ÿä¸€å„ domain core çš„æ–‡æ¡£æ¨¡åž‹å’Œåºåˆ—åŒ–æ ¼å¼ã€‚
- æ›¿æ¢åº•å±‚ç¬¬ä¸‰æ–¹ç¼–è¾‘å¼•æ“Žã€‚
- å°†æ‰€æœ‰å¤æ‚æŽ§ä»¶ä¸€æ¬¡æ€§è¿ç§»åˆ°åŒä¸€é¡µé¢ schema ç»“æž„ã€‚
- é¡ºæ‰‹å¤„ç†ä¸Žæœ¬è®¡åˆ’æ— å…³çš„ playgroundã€debuggerã€UI package é—®é¢˜ã€‚

## Effort

- é¢„è®¡ 12-18 ä¸ªå·¥ä½œæ—¥ã€‚
- å»ºè®®æ‹†æˆ 7 ä¸ªç‹¬ç«‹æ‰§è¡Œåˆ‡ç‰‡ï¼šæ–‡æ¡£åŸºçº¿ã€å…±äº«åè®®/helperã€Flow åŸºçº¿æç‚¼ã€Report é»˜è®¤ host ç»„åˆã€WorkbenchShell æŠ½å–ã€Word æ”¶æ•›ã€Code Editor æ”¶å£ã€‚
- `code-editor` çš„ source-ref / `onChange` contract fix å¯åœ¨ Phase 0 åŽä¸Ž Flow/Report è¿ç§»å¹¶è¡ŒæŽ¨è¿›ï¼›async-action äº¤äº’çº¦æŸåœ¨å…±äº«è§„èŒƒç¨³å®šåŽæ”¶å°¾ã€‚
- æ¯ä¸ªåˆ‡ç‰‡å•ç‹¬æäº¤æˆ–å•ç‹¬ PRï¼Œé¿å…å‡ºçŽ°è·¨ 4 ä¸ªä»¥ä¸ŠåŒ…çš„å¤§çˆ†ç‚¸æ”¹åŠ¨ã€‚

## Verification

ä¼˜å…ˆåšåˆ†é˜¶æ®µã€åˆ†åŒ…éªŒè¯ï¼Œæœ€åŽå†åšå…¨ä»“éªŒè¯ã€‚

```bash
pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-core test

pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-react test

pnpm --filter @nop-chaos/flow-designer-renderers typecheck
pnpm --filter @nop-chaos/flow-designer-renderers build
pnpm --filter @nop-chaos/flow-designer-renderers lint
pnpm --filter @nop-chaos/flow-designer-renderers test

pnpm --filter @nop-chaos/spreadsheet-renderers typecheck
pnpm --filter @nop-chaos/spreadsheet-renderers build
pnpm --filter @nop-chaos/spreadsheet-renderers lint
pnpm --filter @nop-chaos/spreadsheet-renderers test

pnpm --filter @nop-chaos/report-designer-core typecheck
pnpm --filter @nop-chaos/report-designer-core build
pnpm --filter @nop-chaos/report-designer-core lint
pnpm --filter @nop-chaos/report-designer-core test

pnpm --filter @nop-chaos/report-designer-renderers typecheck
pnpm --filter @nop-chaos/report-designer-renderers build
pnpm --filter @nop-chaos/report-designer-renderers lint
pnpm --filter @nop-chaos/report-designer-renderers test

pnpm --filter @nop-chaos/word-editor-core typecheck
pnpm --filter @nop-chaos/word-editor-core build
pnpm --filter @nop-chaos/word-editor-core lint
pnpm --filter @nop-chaos/word-editor-core test

pnpm --filter @nop-chaos/word-editor-renderers typecheck
pnpm --filter @nop-chaos/word-editor-renderers build
pnpm --filter @nop-chaos/word-editor-renderers lint
pnpm --filter @nop-chaos/word-editor-renderers test

pnpm --filter @nop-chaos/flux-code-editor typecheck
pnpm --filter @nop-chaos/flux-code-editor build
pnpm --filter @nop-chaos/flux-code-editor lint
pnpm --filter @nop-chaos/flux-code-editor test

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

## å˜åŠ¨æ–‡ä»¶æ¸…å•

| File | Change | Lines affected |
|------|--------|---------------|
| `docs/architecture/complex-control-host-protocol.md` | æ–°å¢žå…±äº« host/workbench/session åè®®è§„èŒƒ | ~180-260 |
| `docs/architecture/flow-designer/runtime-snapshot.md` | æ ¡æ­£ host scope æ³¨å…¥çŽ°çŠ¶ä¸Žå…±äº«åè®®æ˜ å°„ | ~40-100 |
| `docs/architecture/report-designer/design.md` | æ ¡æ­£ report/spreadsheet ç»„åˆè½åœ°çŠ¶æ€ä¸Žå…±äº«åè®®æŽ¥çº¿çº¦æŸ | ~40-80 |
| `docs/architecture/code-editor.md` | æ”¶å£å½“å‰å·²æ”¯æŒèƒ½åŠ›ã€source-ref fallback è¯­ä¹‰ä¸Ž future phases è¾¹ç•Œ | ~60-140 |
| `packages/flux-core/src/workbench/*.ts` | æ–°å¢žçº¯åè®®ç±»åž‹ä¸Žæ— å‰¯ä½œç”¨ helper | ~120-220 |
| `packages/flux-react/src/workbench/*.ts(x)` | æ–°å¢ž host wiring helperï¼Œå¹¶åœ¨ API ç¨³å®šæ—¶æŠ½ React-level `WorkbenchShell` | ~220-380 |
| `packages/flow-designer-renderers/src/designer-page.tsx` | åˆ‡æ¢åˆ°å…±äº« helperï¼Œä¿ç•™é¢†åŸŸé€»è¾‘ | ~60-140 |
| `packages/flow-designer-renderers/src/designer-context.ts` | æ”¶å£ host scope æ•°æ®æš´éœ²ä¸Žå…±äº« helper æŽ¥çº¿ | ~40-100 |
| `packages/report-designer-core/src/core.ts` | å¢žè¡¥ spreadsheet host åŒæ­¥/adapter surfaceï¼Œé¿å… renderer-only å‡è®¾ | ~60-160 |
| `packages/report-designer-renderers/src/page-renderer.tsx` | é»˜è®¤è·¯å¾„ç›´æŽ¥ç»„åˆ spreadsheet hostï¼Œè€Œä¸æ˜¯ fallback placeholder | ~140-260 |
| `packages/report-designer-core/src/commands.ts` | å¯¹é½ toolbar éœ€è¦çš„å‘½ä»¤é¢ | ~20-80 |
| `packages/report-designer-renderers/src/bridge.ts` | ä¿æŒæ—¢æœ‰ç»§æ‰¿å…³ç³»å¹¶è®©é»˜è®¤ host è·¯å¾„çœŸæ­£æ¶ˆè´¹è¯¥ç»„åˆ | ~20-60 |
| `packages/report-designer-renderers/src/host-data.ts` | è®© host data æ”¹ä»Ž composed spreadsheet/report snapshot æ´¾ç”Ÿï¼Œè€Œä¸æ˜¯æœ¬åœ°å¹³è¡Œ shape | ~40-100 |
| `packages/word-editor-renderers/src/WordEditorPage.tsx` | æŽ¥å…¥ React-level shared shell/sessionï¼Œä¿æŒæ™®é€š React é¡µé¢å…¥å£ | ~120-220 |
| `packages/word-editor-core/src/document-io.ts` | æŽ¥çº¿ datasets save/load æˆ–è¡¥è¶³ session helper æ”¯æ’‘ | ~20-60 |
| `packages/flux-code-editor/src/types.ts` | ä¿æŒ public types / inline resolverï¼Œç§»é™¤å¯¹ runtime source lookup çš„é”™è¯¯æ‰¿è½½ | ~20-60 |
| `packages/flux-code-editor/src/source-resolvers.ts` | æ–°å¢ž scope/API source-ref è§£æž helper | ~80-180 |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | æŽ¥çº¿ `onChange` äº‹ä»¶å¹¶æŽ¥å…¥ runtime source resolver | ~40-120 |
| `packages/flux-code-editor/src/use-code-mirror.ts` | è§†éœ€è¦è¡¥å¼º change/focus/blur æ¡¥æŽ¥ç»†èŠ‚ | ~10-40 |
| `packages/flux-code-editor/src/index.ts` | å¯¼å‡ºæ–°å¢ž source resolver surface | ~10-30 |

## é£Žé™©ä¸Žå›žé€€

- é£Žé™© 1ï¼šå…±äº«åè®®æŠ½è±¡è¿‡æ—©ï¼Œç»“æžœåªé€‚é… `flow-designer`ï¼Œå´æ— æ³•è‡ªç„¶è¦†ç›– `word-editor`ã€‚å›žé€€ç­–ç•¥ï¼šå…ˆæŠ½ç±»åž‹å’Œ helperï¼Œä¸å…ˆæŠ½è§†è§‰å£³ï¼›ä»»ä½• visual shell éƒ½åœ¨ç¬¬äºŒä¸ª domain è¯æ˜Žå¤ç”¨åŽå†è½åœ°ã€‚
- é£Žé™© 2ï¼š`report-designer` ç»„åˆ spreadsheet host æ—¶ç ´å snapshot identity æˆ– command æµç¨‹ã€‚å›žé€€ç­–ç•¥ï¼šä¿ç•™ page çº§æ—§å®žçŽ°ç›´è‡³æ–°çš„ bridge + body ç»„åˆé€šè¿‡åŒ…çº§æµ‹è¯•ï¼Œå†åˆ é™¤ fallback-only è·¯å¾„ã€‚
- é£Žé™© 3ï¼š`word-editor` é¡µå£³è¿ç§»ä¸è‡ªè§‰æ‰©å¤§æˆå®Œæ•´ Flux renderer migrationï¼Œåè€ŒæŠŠ Phase 5 å˜æˆæ–°å¹³å°æŽ¥å…¥å·¥ç¨‹ã€‚å›žé€€ç­–ç•¥ï¼šå…ˆæ›¿æ¢å¤–å±‚ React-level shell/sessionï¼Œä¸æŠŠ `WordEditorPage` æ”¹æˆ `RendererComponentProps` ä½œä¸ºå‰ç½®æ¡ä»¶ï¼›è‹¥ schema åŒ–ç¡®æœ‰å¿…è¦ï¼Œå†å¦å¼€è®¡åˆ’ã€‚
- é£Žé™© 4ï¼š`code-editor` ä¸ºäº†æŽ¥å…¥å…±äº«è§„èŒƒè€Œè¢«è¿‡åº¦å¹³å°åŒ–ã€‚å›žé€€ç­–ç•¥ï¼šåªè¿ç§» source-refã€change eventã€busy/result çº¦å®šï¼Œä¸å¼•å…¥æ–°çš„ page shellã€designer action æˆ– core storeã€‚
- é£Žé™© 5ï¼šworkspace çº§éªŒè¯å¯èƒ½å†æ¬¡æ’žä¸Š unrelated blockerã€‚å›žé€€ç­–ç•¥ï¼šä»¥å—å½±å“åŒ…çš„åˆ†åŒ…éªŒè¯ä¸ºä¸»ï¼Œå¹¶åœ¨æ‰§è¡Œè®°å½•ä¸­æ˜Žç¡®åŒºåˆ†å·²æœ‰é˜»å¡žå’Œæœ¬è®¡åˆ’æ–°å¢žå›žå½’ã€‚

## æˆåŠŸæ ‡å‡†

- `flow-designer`ã€`spreadsheet`ã€`report-designer` è‡³å°‘å…±äº«åŒä¸€å¥— host bridge / session / action wiring åè®®ã€‚
- `report-designer-page` åœ¨é»˜è®¤æ¸²æŸ“è·¯å¾„ä¸Šå³å¯è¿è¡ŒçœŸå®ž spreadsheet hostï¼Œè€Œä¸æ˜¯ fallback canvasã€‚
- `word-editor` ä½¿ç”¨å…±äº«çš„ workbench shell/session è§„èŒƒï¼Œå¹¶æ˜Žç¡® document ä¸Ž datasets çš„ä¿å­˜è¾¹ç•Œï¼ŒåŒæ—¶ä¿ç•™æ™®é€š React page å…¥å£ã€‚
- `code-editor` çš„ source-ref é€šè¿‡çœŸå®ž runtime resolver è·¯å¾„å¯ç”¨ï¼Œchange event ä¸Žæ–‡æ¡£å£°æ˜Žé¢å¯¹é½ï¼ŒåŒæ—¶ä»ä¿æŒå­—æ®µæŽ§ä»¶å®šä½ã€‚
- å…±äº«åè®®æœ‰æž¶æž„æ–‡æ¡£ã€å‚è€ƒå®žçŽ°å’Œæµ‹è¯•ï¼Œè€Œä¸æ˜¯ç»§ç»­åœç•™åœ¨åˆ†æžç»“è®ºæˆ–å•æ¨¡å—ç»éªŒä¸­ã€‚


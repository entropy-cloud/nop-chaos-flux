# æ¡†æž¶ç¨³å®šæ€§ä¸Žå¤æ‚æŽ§ä»¶ç»Ÿä¸€æŠ½è±¡åˆ†æž

> åˆ†æžæ—¥æœŸ: 2026-04-04
> åˆ†æžèŒƒå›´: `flux-core` / `flux-runtime` / `flux-react`ï¼Œä»¥åŠ `flow-designer`ã€`spreadsheet` / `report-designer`ã€`flux-code-editor`ã€`word-editor`
> åˆ†æžæ–¹æ³•: æž¶æž„æ–‡æ¡£ä¸Žå½“å‰æºç ã€æµ‹è¯•ã€äº¤äº’è¯„å®¡ç»“è®ºäº¤å‰æ ¸å¯¹
> è¯´æ˜Ž: æœ¬æ–‡æ˜¯åˆ†æžç»“è®ºï¼Œä¸æ›¿ä»£ `docs/architecture/` ä¸‹çš„è§„èŒƒæ€§æ–‡æ¡£

## ä¸€ã€ç»“è®ºæ‘˜è¦

å½“å‰æ¡†æž¶çš„ç»“è®ºä¸åº”è¯¥ç®€å•è¯´æˆâ€œå·²ç»è¶³å¤Ÿç¨³å®šâ€æˆ–â€œè¿˜ä¸ç¨³å®šâ€ï¼Œè€Œåº”è¯¥æ‹†æˆä¸¤å±‚çœ‹ï¼š

1. `SchemaRenderer` æ ¸å¿ƒå±‚å·²ç»ç›¸å½“åˆç†ã€‚
2. å¤æ‚æŽ§ä»¶å¹³å°å±‚è¿˜æ²¡æœ‰å®Œå…¨æ”¶æ•›ã€‚

æ›´å…·ä½“åœ°è¯´ï¼š

- `flux-core` / `flux-runtime` / `flux-react` è¿™ä¸€å±‚å·²ç»å…·å¤‡æ¯”è¾ƒæ¸…æ™°ä¸”å¯æŒç»­æ¼”è¿›çš„æž¶æž„éª¨æž¶ï¼Œç‰¹åˆ«æ˜¯å€¼æ ‘ç¼–è¯‘ã€æ˜¾å¼æ¸²æŸ“å™¨å¥‘çº¦ã€`ScopeRef` / `ActionScope` / `ComponentHandleRegistry` ä¸‰åˆ†ç¦»ã€ä»¥åŠ compile-once / execute-many çš„æ–¹å‘ï¼Œéƒ½æ˜¯å¯¹çš„ã€‚å‚è€ƒ `docs/architecture/flux-core.md`ã€`docs/architecture/renderer-runtime.md`ã€`docs/architecture/flux-runtime-module-boundaries.md`ã€‚
- ä½†å¦‚æžœç›®æ ‡ä¸æ˜¯â€œåšä¸€ä¸ª schema rendererâ€ï¼Œè€Œæ˜¯â€œåšä¸€ä¸ªèƒ½é•¿æœŸæ‰¿è½½ Flow Designerã€Report Designerã€Word Editorã€Code Editor ç­‰å¤æ‚æŽ§ä»¶çš„å¹³å°â€ï¼Œç›®å‰è¿˜ä¸èƒ½è¯´å·²ç»è¶³å¤Ÿç¨³å®šã€‚æœ€å¤§é—®é¢˜ä¸åœ¨æ ¸å¿ƒ runtimeï¼Œè€Œåœ¨å¤æ‚æŽ§ä»¶å±‚çš„æ¨¡å¼è¿˜æ²¡æœ‰ç»Ÿä¸€æ”¶æ•›ã€‚
- å››ç±»å¤æ‚æŽ§ä»¶å½“å‰æˆç†Ÿåº¦å·®å¼‚å¾ˆå¤§ï¼š`flow-designer` æœ€æŽ¥è¿‘ç»Ÿä¸€æž¶æž„ç›®æ ‡ï¼Œ`spreadsheet-core` å·²ç»å¾ˆæ‰Žå®žï¼Œ`report-designer` çš„è®¾è®¡æ–¹å‘å¯¹ä½†é›†æˆæœªå®Œæˆï¼Œ`word-editor` è¿˜æ˜¯ç‹¬ç«‹å·¥ä½œå°ï¼Œ`code-editor` åˆ™æœ¬è´¨ä¸Šä¸åº”è¯¥è¢«å¼ºè¡Œæ‹”é«˜æˆâ€œè®¾è®¡å™¨å¹³å°â€ã€‚

å› æ­¤ï¼Œæˆ‘çš„æ€»ä½“æ„è§æ˜¯ï¼š

- æ ¸å¿ƒæ¡†æž¶å¯ä»¥ç»§ç»­æ²¿å½“å‰æ–¹å‘æ¼”è¿›ï¼Œä¸å»ºè®®æŽ¨ç¿»ã€‚
- å¤æ‚æŽ§ä»¶éœ€è¦ç»Ÿä¸€ï¼Œä½†ç»Ÿä¸€ç‚¹åº”è¯¥è½åœ¨â€œå£³å±‚ä¸Žåè®®â€ä¸Šï¼Œè€Œä¸æ˜¯è½åœ¨â€œåº•å±‚æ–‡æ¡£æ¨¡åž‹å’Œå¼•æ“Žâ€ä¸Šã€‚

## äºŒã€æ ¸å¿ƒæ¡†æž¶æ˜¯å¦å·²ç»è¶³å¤Ÿåˆç†

### 2.1 å·²ç»æ¯”è¾ƒåˆç†çš„éƒ¨åˆ†

å½“å‰æ ¸å¿ƒå±‚æœ€åˆç†çš„åœ°æ–¹æœ‰å››ä¸ªã€‚

ç¬¬ä¸€ï¼Œç¼–è¯‘å±‚å’Œè¿è¡Œæ—¶è¾¹ç•Œæ¸…æ¥šã€‚

- `flux-core` æ˜Žç¡®æ‰¿æ‹…æ ¸å¿ƒå¥‘çº¦å’Œæ— å‰¯ä½œç”¨å·¥å…·ï¼Œ`flux-runtime` æ‰¿æ‹… schema ç¼–è¯‘ã€actionã€scopeã€form/page runtimeï¼Œ`flux-react` æ‰¿æ‹… React æŽ¥å…¥å’Œ hooksï¼Œè¿™ä¸ªåˆ†å±‚æ˜¯å¥åº·çš„ã€‚å‚è€ƒ `docs/architecture/flux-core.md`ã€`docs/architecture/flux-runtime-module-boundaries.md`ã€`docs/architecture/renderer-runtime.md`ã€‚
- è¿™æ„å‘³ç€å¤æ‚æŽ§ä»¶ä¸éœ€è¦é‡æ–°å‘æ˜Žè¡¨å•å¼•æ“Žã€è¡¨è¾¾å¼å¼•æ“Žã€åŠ¨ä½œåˆ†å‘ã€dialog hostï¼Œè¿™ä¸€ç‚¹åœ¨ `flow-designer` å’Œ `report-designer` è®¾è®¡æ–‡æ¡£é‡Œå·²ç»åå¤å¼ºè°ƒã€‚å‚è€ƒ `docs/architecture/flow-designer/design.md`ã€`docs/architecture/report-designer/design.md`ã€‚

ç¬¬äºŒï¼Œæ¸²æŸ“å™¨å¥‘çº¦æ˜¯æ˜Žç¡®çš„ã€‚

- `RendererComponentProps` æŠŠ `schema`ã€`props`ã€`meta`ã€`regions`ã€`events`ã€`helpers` åˆ†å¼€ï¼Œé¿å…äº†ä¼ ç»Ÿä½Žä»£ç æ¡†æž¶é‡Œâ€œæ‰€æœ‰è¯­ä¹‰éƒ½å¡žè¿›ä¸€ä¸ª props å¯¹è±¡â€çš„è†¨èƒ€é—®é¢˜ã€‚å‚è€ƒ `docs/architecture/renderer-runtime.md`ã€‚
- `RenderRegionHandle`ã€`helpers.render(...)`ã€`useScopeSelector()`ã€`useActionDispatcher()` ç­‰è¾¹ç•Œå·²ç»è¶³å¤Ÿç¨³å®šï¼Œé€‚åˆä½œä¸ºå¤æ‚æŽ§ä»¶çš„ä¸Šå±‚åŸºç¡€ã€‚

ç¬¬ä¸‰ï¼Œè¿è¡Œæ—¶èŒè´£æ‹†åˆ†æ˜¯å¯¹çš„ã€‚

- æ•°æ®è¯»å–ç”¨ `ScopeRef`ï¼Œå‘½åç©ºé—´åŠ¨ä½œç”¨ `ActionScope`ï¼Œç»„ä»¶å®žä¾‹èƒ½åŠ›è°ƒç”¨ç”¨ `ComponentHandleRegistry`ï¼Œè¿™æ˜¯å½“å‰ä»“åº“é‡Œæœ€æœ‰ä»·å€¼çš„è®¾è®¡ä¹‹ä¸€ã€‚å‚è€ƒ `docs/architecture/flux-core.md`ã€`docs/architecture/renderer-runtime.md`ã€‚
- è¿™ä¸€ç‚¹ç›´æŽ¥æ”¯æ’‘äº† `designer:*`ã€`report-designer:*`ã€`spreadsheet:*` è¿™äº› namespaced action çš„æŽ¥å…¥æ–¹å¼ã€‚

ç¬¬å››ï¼Œå¤æ‚ç»„ä»¶è®¾è®¡åŽŸåˆ™æœ¬èº«ä¹Ÿå·²ç»æ¯”è¾ƒæˆç†Ÿã€‚

- `docs/references/complex-component-design-process.md` å·²ç»æ˜Žç¡®æå‡ºâ€œå…ˆ JSON Schemaï¼ŒåŽå®žçŽ°â€â€œå¤ç”¨çŽ°æœ‰ runtimeâ€â€œåªåœ¨å¿…è¦å¤„å¼•å…¥ä¸“ç”¨å¼•æ“Žâ€â€œConfig ä¸Ž Document åˆ†ç¦»â€ã€‚è¿™äº›åŽŸåˆ™æœ¬èº«æ˜¯å¯¹çš„ï¼Œä¸”å’Œå½“å‰æ ¸å¿ƒæž¶æž„ä¸€è‡´ã€‚

### 2.2 è¿˜ä¸èƒ½è¯´â€œè¶³å¤Ÿç¨³å®šâ€çš„éƒ¨åˆ†

è™½ç„¶éª¨æž¶åˆç†ï¼Œä½†ç›®å‰è¿˜å­˜åœ¨ä¸‰ä¸ªä¼šå½±å“å¹³å°ç¨³å®šæ€§çš„ç»“æž„æ€§é—®é¢˜ã€‚

ç¬¬ä¸€ï¼Œå¤æ‚æŽ§ä»¶å±‚è¿˜æ²¡æœ‰ç»Ÿä¸€çš„å…±äº«å£³å±‚åè®®ã€‚

- çŽ°åœ¨ `flow-designer`ã€`spreadsheet`ã€`report-designer`ã€`word-editor` éƒ½å„è‡ªå®žçŽ°äº†è‡ªå·±çš„é¡µé¢å£³å±‚ã€çŠ¶æ€æš´éœ²æ–¹å¼ã€ä¿å­˜é€»è¾‘ã€busy çŠ¶æ€å’Œé¢æ¿å¸ƒå±€ï¼Œæ²¡æœ‰æ”¶æ•›åˆ°ä¸€ä¸ªå…±äº«çš„ host-shell æ¨¡å¼ã€‚
- è¿™ä¼šå¯¼è‡´åŒç±»é—®é¢˜åå¤å‡ºçŽ°ï¼Œä¾‹å¦‚å·¦å³é¢æ¿å›ºå®šå®½åº¦ã€ä¿å­˜æ€ä¸ç»Ÿä¸€ã€æ‹–æ‹½ç¼ºå°‘é”®ç›˜ç­‰ä»·è·¯å¾„ã€å¼‚æ­¥åŠ¨ä½œç¼ºå°‘ busy/cancel è¯­ä¹‰ã€‚å‚è€ƒ `docs/analysis/2026-04-03-word-sql-code-report-designer-ui-interaction-review.md`ã€‚

ç¬¬äºŒï¼Œæ–‡æ¡£ä¸Žå®žçŽ°å­˜åœ¨æ˜Žæ˜¾æ¼‚ç§»ã€‚

- `flow-designer` å½“å‰å…¬å¼€åŸºçº¿å·²ç»æ”¶æ•›ä¸ºåªæ”¯æŒ `@xyflow/react`ï¼›å¦‚æžœä»£ç é‡Œä»ä¿ç•™ `canvas-bridge` å‘½åæˆ–å•ä¸€ `xyflow` kindï¼Œåº”è§†ä¸ºå®žçŽ°è¾¹ç•Œï¼Œè€Œä¸æ˜¯å¤šç”»å¸ƒå®žçŽ°æ‰¿è¯ºã€‚
- `code-editor` æ–‡æ¡£å£°æ˜Žäº†ä¸€äº›æ›´å®Œæ•´çš„ schema å’Œèƒ½åŠ›ï¼Œä½†å½“å‰å®žçŽ°é‡Œæœ‰äº›å­—æ®µå¹¶æœªçœŸæ­£æŽ¥çº¿ï¼Œä¾‹å¦‚ `resolveVariables()` / `resolveFunctions()` / `resolveTables()` é‡åˆ° source ref ç›´æŽ¥è¿”å›žç©ºæ•°ç»„ï¼Œ`onChange` äº‹ä»¶å­—æ®µä¹Ÿæ²¡æœ‰é€šè¿‡ Flux äº‹ä»¶ç³»ç»Ÿå›žè°ƒã€‚å‚è€ƒ `packages/flux-code-editor/src/types.ts`ã€`packages/flux-code-editor/src/code-editor-renderer.tsx`ã€`docs/architecture/code-editor.md`ã€‚
- `report-designer` çš„è®¾è®¡æ–‡æ¡£æè¿°çš„æ˜¯â€œspreadsheet + report semanticsâ€çš„å®Œæ•´ç»„åˆï¼Œä½†å½“å‰ `packages/report-designer-renderers/src/page-renderer.tsx` è¿˜åªæ˜¯ report designer shellï¼Œæœ¬èº«å¹¶æ²¡æœ‰çœŸæ­£åˆ›å»ºå¹¶ç»„åˆ spreadsheet bridge/canvasã€‚

ç¬¬ä¸‰ï¼Œå¤æ‚æŽ§ä»¶çš„æˆç†Ÿåº¦ä¸ä¸€è‡´ï¼Œå¯¼è‡´â€œå¹³å°å·²ç¨³å®šâ€çš„é”™è§‰ã€‚

- `flow-designer` å·²ç»æ˜¯ä¸€ä¸ªæ¯”è¾ƒå®Œæ•´çš„æ¨¡å¼æ ·æ¿ã€‚
- `report-designer` è¿˜æ˜¯â€œæ–¹å‘æ­£ç¡®ä½†é›†æˆæœªå®Œæˆâ€ã€‚
- `word-editor` ä»ç„¶æ˜¯ä¸€ä¸ªè‡ªæˆä½“ç³»çš„ React å·¥ä½œå°ã€‚
- `code-editor` åˆ™æ˜¯ä¸€ä¸ªæˆç†Ÿåº¦ä¸é”™çš„å­—æ®µçº§æŽ§ä»¶ï¼Œè€Œä¸æ˜¯å¹³å°çº§è®¾è®¡å™¨ã€‚

è¿™è¯´æ˜Žå½“å‰æ¡†æž¶ä¸æ˜¯â€œä¸åˆç†â€ï¼Œè€Œæ˜¯â€œå†…æ ¸å’Œå¤æ‚æŽ§ä»¶å±‚æˆç†Ÿåº¦ä¸å¯¹é½â€ã€‚

## ä¸‰ã€æŒ‰å¤æ‚æŽ§ä»¶é€é¡¹è¯„ä¼°

### 3.1 Flow Designer

`flow-designer` æ˜¯å½“å‰æœ€æŽ¥è¿‘â€œç»Ÿä¸€å¤æ‚æŽ§ä»¶æž¶æž„æ¨¡æ¿â€çš„å®žçŽ°ã€‚

å·²ç»è½åœ°çš„å¼ºé¡¹ï¼š

- æœ‰çœŸå®žçš„ domain coreï¼Œè€Œä¸æ˜¯çº¯ UI demoã€‚`packages/flow-designer-core/src/core.ts` å·²ç»è¦†ç›– graph documentã€selectionã€clipboardã€undo/redoã€dirty trackingã€viewportã€transaction ç­‰æ ¸å¿ƒèƒ½åŠ›ã€‚
- æœ‰æ˜Žç¡®çš„ schema host shellã€‚`packages/flow-designer-renderers/src/designer-page.tsx` ä¼šåˆ›å»º coreã€è®¢é˜… snapshotã€æ³¨å†Œ `designer` namespaceã€æž„é€  host scopeï¼Œå¹¶æŠŠ toolbar / inspector / dialogs region ç»‘å®šåˆ°åŒä¸€ä¸ª action-scope è¾¹ç•Œã€‚
- æœ‰æ˜Žç¡®çš„ host scope æ³¨å…¥ã€‚`packages/flow-designer-renderers/src/designer-context.ts` é‡Œçš„ `buildDesignerScopeData()` / `useDesignerHostScope()` å·²ç»æŠŠ `doc`ã€`selection`ã€`activeNode`ã€`activeEdge`ã€`runtime` ç­‰èƒ½åŠ›æš´éœ²ç»™ schema ç‰‡æ®µã€‚
- æœ‰å®žé™…çš„ canvas bridge å’Œå‘½ä»¤é€‚é…è¾¹ç•Œï¼Œè€Œä¸æ˜¯è®© canvas ç›´æŽ¥å†™ storeã€‚å‚è€ƒ `packages/flow-designer-renderers/src/designer-command-adapter.ts`ã€`packages/flow-designer-renderers/src/canvas-bridge.tsx`ã€‚

ä¸»è¦é—®é¢˜ï¼š

- æ–‡æ¡£å’Œä»£ç ä»éœ€æŒç»­å¯¹é½ï¼Œå°¤å…¶æ˜¯ runtime snapshot è½åœ°çŠ¶æ€ã€port/role çº§çº¦æŸèƒ½åŠ›ï¼Œä»¥åŠå°‘é‡ä»ä¿ç•™æ—§å‘½åçš„å®žçŽ°è¾¹ç•Œã€‚
- å½“å‰æœ€å¯å¤ç”¨çš„ host-shell / action-scope / bridge æ¨¡å¼è¿˜æ²¡æœ‰è¢«æŠ½æˆå…±äº«æŠ½è±¡ï¼Œä»ç„¶æ˜¯ flow-designer è‡ªå·±å†…éƒ¨çš„ä¸€å¥—å®žçŽ°ã€‚

ç»“è®ºï¼š

- `flow-designer` ä¸æ˜¯é—®é¢˜æœ€å¤§çš„æ¨¡å—ï¼Œåè€Œæ˜¯æœ€å€¼å¾—ä½œä¸ºç»Ÿä¸€æŠ½è±¡èµ·ç‚¹çš„æ¨¡å—ã€‚
- å¦‚æžœåŽç»­è¦æŠ½â€œå¤æ‚æŽ§ä»¶å…¬å…±å£³å±‚â€ï¼Œæœ€åº”è¯¥å…ˆä»Žè¿™é‡Œæç‚¼ã€‚

### 3.2 Spreadsheet / Report Designer

è¿™é‡Œå¿…é¡»æ‹†æˆä¸¤å±‚çœ‹ã€‚

å…ˆçœ‹ `spreadsheet`ï¼š

- `packages/spreadsheet-core/src/core.ts` å·²ç»æ˜¯ä¸€ä¸ªç›¸å½“æ‰Žå®žçš„æ–‡æ¡£ç¼–è¾‘ runtimeï¼Œè¦†ç›– active sheetã€selectionã€clipboardã€find/replaceã€sheet æ“ä½œã€undo/redoã€dirtyã€transaction ç­‰ã€‚
- `packages/spreadsheet-renderers/src/page-renderer.tsx` å’Œ `packages/spreadsheet-renderers/src/bridge.ts` ä¹Ÿå·²ç»å…·å¤‡äº† namespaced action å’Œ host snapshot çš„åŸºæœ¬æ¨¡å¼ã€‚

å†çœ‹ `report-designer`ï¼š

- `packages/report-designer-core/src/core.ts` çš„æ–¹å‘æ˜¯å¯¹çš„ã€‚å®ƒæ²¡æœ‰æŠŠæŠ¥è¡¨è¯­ä¹‰ç›´æŽ¥å¡žè¿› spreadsheet cell ç»“æž„ï¼Œè€Œæ˜¯å•ç‹¬ç»´æŠ¤è¯­ä¹‰å±‚ã€field sourceã€inspector providerã€preview/codec adapterï¼Œè¿™ä¸ªæŠ½è±¡æ–¹å‘æ˜¯åˆç†çš„ã€‚
- `packages/report-designer-renderers/src/bridge.ts` ç”šè‡³å·²ç»å®šä¹‰äº† `ReportDesignerHostSnapshot extends SpreadsheetHostSnapshot`ï¼Œè¿™è¯´æ˜Žè®¾è®¡ä¸Šå·²ç»åœ¨æœâ€œspreadsheet ä¹‹ä¸Šçš„è¯­ä¹‰å±‚â€æ¼”è¿›ã€‚

ä½†å½“å‰çœŸæ­£çš„é—®é¢˜ä¹Ÿå¾ˆæ˜Žæ˜¾ï¼š

- `packages/report-designer-renderers/src/page-renderer.tsx` ç›®å‰å¹¶æ²¡æœ‰å®žé™…ç»„åˆ spreadsheet page/core/bridge/canvasï¼Œå®ƒæ›´å¤šæ˜¯ä¸€ä¸ª schema shellï¼Œbody ä¸å­˜åœ¨æ—¶åªèƒ½å›žé€€åˆ° placeholder/fallbackã€‚
- é»˜è®¤ toolbar å·²ç»å¼€å§‹æš´éœ² `report-designer:undo`ã€`report-designer:redo`ã€`report-designer:save`ã€`report-designer:stopPreview` ç­‰åŠ¨ä½œï¼Œä½† `packages/report-designer-core/src/commands.ts` å½“å‰æ”¯æŒçš„å‘½ä»¤é›†å¹¶ä¸åŒ…å«è¿™äº›åŠ¨ä½œã€‚è¿™è¯´æ˜Ž report designer å£³å±‚ã€toolbar å’Œ core å‘½ä»¤é¢è¿˜æ²¡æœ‰çœŸæ­£å¯¹é½ã€‚

ç»“è®ºï¼š

- `report-designer` çš„æ–¹å‘æ˜¯å¯¹çš„ï¼Œä½†å®ƒè¿˜ä¸èƒ½ç®—â€œç¨³å®šçš„å®Œæ•´äº§å“æž¶æž„â€ã€‚
- å®ƒå½“å‰æ›´åƒâ€œæ­£ç¡®çš„äºŒå±‚æŠ½è±¡è®¾è®¡ + å°šæœªå®Œæˆçš„ç»„åˆå®žçŽ°â€ã€‚

### 3.3 Code Editor

`code-editor` çš„è¯„ä»·è¦å’Œå…¶ä»–ä¸‰ä¸ªå¤æ‚æŽ§ä»¶åˆ†å¼€ã€‚

å®ƒçš„å¼ºé¡¹ï¼š

- å®ƒæœ¬èº«å·²ç»å¾ˆå¥½åœ°å¤ç”¨äº†çŽ°æœ‰ Flux renderer/form/scope/action èƒ½åŠ›ã€‚`packages/flux-code-editor/src/code-editor-renderer.tsx` ç›´æŽ¥ä½¿ç”¨ `useCurrentForm()`ã€`useRenderScope()` å’Œ `props.helpers.dispatch(...)`ï¼Œè¿™è¯´æ˜Žå®ƒå¤©ç„¶å°±æ˜¯æ™®é€š renderer ä½“ç³»é‡Œçš„ä¸€ä¸ªé«˜çº§å­—æ®µï¼Œè€Œä¸æ˜¯å¦èµ·ç‚‰ç¶çš„å·¥ä½œå°ã€‚
- å®ƒçš„â€œå¤æ‚åº¦â€ä¸»è¦æ¥è‡ª CodeMirror 6 æ‰©å±•ï¼Œè€Œä¸æ˜¯æ¥è‡ªé¡µé¢å£³å±‚ã€æ–‡æ¡£æ¨¡åž‹ã€canvas äº¤äº’æˆ– designer actionã€‚å‚è€ƒ `packages/flux-code-editor/src/use-code-mirror.ts`ã€`packages/flux-code-editor/src/extensions/`ã€‚

å®ƒçš„ä¸»è¦é—®é¢˜ä¸æ˜¯æŠ½è±¡å±‚æ¬¡ä¸å¯¹ï¼Œè€Œæ˜¯â€œå£°æ˜Žé¢å¤§äºŽå®žçŽ°é¢â€ï¼š

- `packages/flux-code-editor/src/types.ts` é‡Œå®šä¹‰äº†è¾ƒå¤š schema èƒ½åŠ›ï¼Œä½† source-ref ç±»æ•°æ®å¹¶æœªçœŸæ­£è§£æžï¼Œ`onChange` äº‹ä»¶å­—æ®µä¹Ÿæ²¡æœ‰èµ° Flux event handler å›žè°ƒã€‚
- `docs/architecture/code-editor.md` çš„è®¾è®¡æ·±åº¦æ˜Žæ˜¾è¶…å‰äºŽå½“å‰å®žçŽ°ï¼Œå®¹æ˜“ç»™äººé€ æˆâ€œå·²ç» fully implementedâ€çš„é”™è§‰ã€‚

ç»“è®ºï¼š

- `code-editor` ä¸åº”è¯¥è¢«å¼ºè¡Œå¹¶å…¥å’Œ flow/report/word åŒçº§çš„â€œç»Ÿä¸€è®¾è®¡å™¨æŠ½è±¡â€ã€‚
- å®ƒæ›´é€‚åˆç»§ç»­ä½œä¸ºâ€œé«˜çº§å­—æ®µæŽ§ä»¶â€æ¼”è¿›ï¼Œåªå…±äº«å°‘é‡å·¥ä½œå°èƒ½åŠ›ï¼Œä¾‹å¦‚ fullscreen shellã€busy çŠ¶æ€è§„èŒƒã€å˜é‡æµè§ˆå™¨äº¤äº’è§„èŒƒç­‰ã€‚

### 3.4 Word Editor

`word-editor` ç›®å‰æ˜¯ä¸€ä¸ªå¯ç”¨çš„ç‹¬ç«‹å·¥ä½œå°ï¼Œä½†ä¸æ˜¯ç»Ÿä¸€æž¶æž„é‡Œçš„ä¸€å‘˜ã€‚

ä¼˜ç‚¹ï¼š

- `packages/word-editor-core/` å’Œ `packages/word-editor-renderers/` çš„æ‹†åˆ†æœ¬èº«æ˜¯åˆç†çš„ï¼Œè¯´æ˜Žå·²ç»æœ‰â€œcore ä¸Ž React æ¸²æŸ“å±‚åˆ†ç¦»â€çš„æ„è¯†ã€‚
- `CanvasEditorBridge` æŠŠåº•å±‚ `canvas-editor` åº“éš”ç¦»åœ¨ bridge åŽé¢ï¼Œè¿™ä¸ªæ–¹å‘æ˜¯å¯¹çš„ã€‚å‚è€ƒ `packages/word-editor-core/src/canvas-editor-bridge.ts`ã€‚
- E2E è¦†ç›–ç›¸å¯¹å®Œæ•´ï¼Œè¯´æ˜Žä½œä¸º playground feature å·²ç»å¼€å§‹è¢«æŒç»­æ‰“ç£¨ã€‚å‚è€ƒ `tests/e2e/word-editor*.spec.ts`ï¼Œä»¥åŠç›¸å…³ bug æ–‡æ¡£ `docs/bugs/24-26-*.md`ã€‚

ä½†å®ƒå½“å‰ä¸Žä¸»æ¡†æž¶çš„å…³ç³»åŸºæœ¬æ˜¯å¹¶è¡Œï¼Œè€Œä¸æ˜¯é›†æˆï¼š

- `packages/word-editor-renderers/src/WordEditorPage.tsx` ç›´æŽ¥è‡ªå·±åˆ›å»º bridgeã€editor storeã€dataset storeï¼Œå¹¶æ‰‹å·¥ç¼–æŽ’ä¸‰æ å¸ƒå±€å’Œä¿å­˜è¡Œä¸ºï¼Œæ²¡æœ‰è¿›å…¥ `SchemaRenderer` + namespaced action + host scope çš„ç»Ÿä¸€è·¯å¾„ã€‚
- æŒä¹…åŒ–ä¹Ÿè¿˜åœç•™åœ¨ `localStorage`ï¼Œä¸” `packages/word-editor-core/src/document-io.ts` å·²ç»æä¾›äº† `saveDatasets()` / `loadDatasets()`ï¼Œä½† page å±‚å¹¶æœªçœŸæ­£æŽ¥çº¿ã€‚

å†ç»“åˆ `docs/analysis/2026-04-03-word-sql-code-report-designer-ui-interaction-review.md` å¯ä»¥çœ‹åˆ°ï¼ŒWord Editor å½“å‰é‡åˆ°çš„é—®é¢˜å¤§å¤šä¹Ÿä¸æ˜¯æ–‡æ¡£æ¨¡åž‹é—®é¢˜ï¼Œè€Œæ˜¯å…¸åž‹çš„å·¥ä½œå°å£³å±‚é—®é¢˜ï¼š

- å·¦å³é¢æ¿å›ºå®šå®½åº¦
- ä¸»ç‚¹å‡»ä¸Žæ¬¡çº§åŠ¨ä½œæ··æ‚
- ä¿å­˜èŒƒå›´ä¸ç»Ÿä¸€
- æ•°æ®å®‰å…¨è¾¹ç•Œä¸æ¸…æ¥š

ç»“è®ºï¼š

- `word-editor` çŽ°åœ¨æ›´åƒâ€œåŠŸèƒ½å¯ç”¨çš„ç‹¬ç«‹å·¥ä½œå°åŽŸåž‹â€ï¼Œè¿˜ä¸é€‚åˆè¢«è§†ä¸ºç»Ÿä¸€æ¡†æž¶ä¸‹çš„ç¨³å®šå¤æ‚æŽ§ä»¶å®žçŽ°ã€‚
- å®ƒæœ€éœ€è¦å…±äº«çš„ä¸æ˜¯ graph/spreadsheet/document æŠ½è±¡ï¼Œè€Œæ˜¯ workbench shellã€session/save/dirtyã€resource panel äº¤äº’è§„èŒƒã€bridge åè®®ã€‚

## å››ã€æ˜¯å¦éœ€è¦ç»Ÿä¸€æŠ½è±¡

éœ€è¦ï¼Œä½†ä¸åº”è¯¥åšâ€œå¤§ä¸€ç»ŸæŠ½è±¡â€ã€‚

### 4.1 åº”è¯¥ç»Ÿä¸€çš„éƒ¨åˆ†

æˆ‘è®¤ä¸ºéœ€è¦ç»Ÿä¸€çš„æ˜¯ä¸‹é¢è¿™äº›æ¨ªåˆ‡å±‚èƒ½åŠ›ã€‚

#### 1. Workbench Shell

æ‰€æœ‰å¤æ‚æŽ§ä»¶éƒ½åœ¨é‡å¤é‡åˆ°ç›¸åŒé—®é¢˜ï¼š

- å·¦å³é¢æ¿æŠ˜å /å±•å¼€
- æ‹–æ‹½è°ƒå®½ä¸Ž reset
- çª„å±ä¸‹çš„ fallback
- ä¸»å·¥ä½œåŒºä¼˜å…ˆçº§
- å›ºå®š header / toolbar / statusbar ä¸Žæ»šåŠ¨åŒºéš”ç¦»

è¿™äº›èƒ½åŠ›åº”è¯¥æŠ½æˆå…±äº«çš„ `WorkbenchShell` æˆ–ç­‰ä»·æŠ½è±¡ï¼Œè€Œä¸æ˜¯è®© `flow-designer`ã€`report-designer`ã€`word-editor` å„è‡ªé‡å¤å®žçŽ°ã€‚å‚è€ƒ `packages/flow-designer-renderers/src/designer-page.tsx`ã€`packages/word-editor-renderers/src/WordEditorPage.tsx`ã€`docs/analysis/2026-04-03-word-sql-code-report-designer-ui-interaction-review.md`ã€‚

#### 2. Host Bridge åè®®

å¤æ‚æŽ§ä»¶æœ€å€¼å¾—ç»Ÿä¸€çš„åè®®æ˜¯ï¼š

```ts
interface DomainBridge<Snapshot, Command, Result> {
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: Command): Promise<Result> | Result;
}
```

å½“å‰ä»“åº“å·²ç»åˆ†åˆ«æœ‰ç›¸ä¼¼å®žè·µï¼š

- `spreadsheet-renderers/src/bridge.ts`
- `report-designer-renderers/src/bridge.ts`
- `flow-designer-renderers` é‡Œè™½ç„¶æ²¡æœ‰ç‹¬ç«‹åŒåæŽ¥å£ï¼Œä½† `designer-page` + `designer-command-adapter` + `designer-context` å®žé™…ä¸Šå·²ç»å½¢æˆäº†åŒç±»æ¨¡å¼

å¦‚æžœæŠŠè¿™ä¸ªæ¨¡å¼æ­£å¼åŒ–ï¼Œå¤æ‚æŽ§ä»¶çš„ host-shellã€statusbarã€save/dirtyã€debugger æŽ¥å…¥éƒ½ä¼šæ›´å®¹æ˜“ç»Ÿä¸€ã€‚

#### 3. Host Scope / Action Namespace æŽ¥çº¿æ¨¡å¼

`flow-designer` å·²ç»è¯æ˜Žäº†ä¸€æ¡æ¯”è¾ƒæˆç†Ÿçš„è·¯å¾„ï¼š

1. é¡µé¢çº§ renderer åˆ›å»º domain core
2. è®¢é˜… snapshot
3. æ³¨å†Œ namespaced action provider
4. æž„é€  host scope
5. æŠŠ toolbar / inspector / dialogs region ç»‘å®šåˆ°åŒä¸€ host scope ä¸Ž action-scope

è¿™ä¸ªæ¨¡å¼åº”è¯¥æ²‰æ·€ä¸ºå…±äº«åšæ³•ï¼Œè‡³å°‘ä½œä¸ºæ–‡æ¡£çº§è§„èŒƒï¼Œæœ€å¥½è¿›ä¸€æ­¥å˜æˆå¯å¤ç”¨ helperã€‚

#### 4. Session / Dirty / Save / Leave Guard åè®®

è¿™æ˜¯ç›®å‰æœ€ç¼ºã€ä¹Ÿæœ€å€¼å¾—ç»Ÿä¸€çš„ä¸€å±‚ã€‚

å¤æ‚æŽ§ä»¶éƒ½éœ€è¦ï¼š

- dirty çŠ¶æ€
- save / autosave
- last saved time
- leave guard
- å¤šä¸ªä¿®æ”¹åŸŸçš„å¯è§è¾¹ç•Œï¼Œä¾‹å¦‚ `document` / `metadata` / `datasets` / `preview config`

çŽ°åœ¨è¿™äº›é—®é¢˜åœ¨ `report-designer`ã€`word-editor`ã€ç”šè‡³ `code-editor` çš„ SQL execute / preview åœºæ™¯ä¸­éƒ½åœ¨é‡å¤å‡ºçŽ°ã€‚å‚è€ƒ `docs/analysis/2026-04-03-word-sql-code-report-designer-ui-interaction-review.md`ã€‚

#### 5. èµ„æºé¢æ¿äº¤äº’è§„èŒƒ

å­—æ®µé¢æ¿ã€å˜é‡é¢æ¿ã€èŠ‚ç‚¹ paletteã€dataset åˆ—è¡¨ï¼Œå…¶å®žå±žäºŽåŒä¸€ç±»â€œèµ„æºæµè§ˆå™¨â€é—®é¢˜ã€‚

åº”è¯¥ç»Ÿä¸€çš„ä¸æ˜¯æ•°æ®ç»“æž„ï¼Œè€Œæ˜¯äº¤äº’çº¦æŸï¼š

- ä¸»ç‚¹å‡»åšé€‰ä¸­æˆ–æ’å…¥
- ç¼–è¾‘/åˆ é™¤/æ›´å¤šèœå•ä½œä¸ºæ¬¡çº§åŠ¨ä½œ
- drag-and-drop ä¸èƒ½æ˜¯å”¯ä¸€ä¸»è·¯å¾„
- å¿…é¡»è¡¥é”®ç›˜ä¸Ž click-to-insert ç­‰ä»·å…¥å£

#### 6. å¼‚æ­¥ä¸»åŠ¨ä½œçš„ busy / cancel è¯­ä¹‰

SQL æ‰§è¡Œã€designer previewã€import/export è¿™ç±»å¼‚æ­¥ä¸»åŠ¨ä½œéƒ½éœ€è¦ç»Ÿä¸€çº¦æŸï¼š

- æ‰§è¡Œä¸­æŒ‰é’® disable æˆ–åˆ‡ä¸º stop
- æ˜Žç¡®ç»“æžœåé¦ˆ
- é˜²é‡å…¥
- å¯å–æ¶ˆæ—¶æ˜Žç¡®æä¾› cancel è¯­ä¹‰

è¿™ç±»èƒ½åŠ›ä¸å±žäºŽæŸä¸ªå…·ä½“ domainï¼Œé€‚åˆä½œä¸º shared workbench è§„èŒƒã€‚

### 4.2 ä¸åº”è¯¥ç»Ÿä¸€çš„éƒ¨åˆ†

ä¸‹é¢è¿™äº›éƒ¨åˆ†ä¸å»ºè®®ç»Ÿä¸€ï¼Œå¦åˆ™ä¼šå¼•å…¥è¿‡åº¦æŠ½è±¡ã€‚

#### 1. ä¸ç»Ÿä¸€åº•å±‚ document model

- graph document
- spreadsheet workbook
- word template document
- code editor text buffer

è¿™äº›å¯¹è±¡çš„ç»“æž„ã€åŽ†å²è¯­ä¹‰ã€æ€§èƒ½ç“¶é¢ˆå®Œå…¨ä¸åŒï¼Œä¸å€¼å¾—å¼ºè¡ŒæŠ½è±¡æˆåŒä¸€å¥—æ–‡æ¡£æ¨¡åž‹ã€‚

#### 2. ä¸ç»Ÿä¸€åº•å±‚å¼•æ“Ž

- `@xyflow/react`
- spreadsheet grid/canvas
- `@hufe921/canvas-editor`
- CodeMirror 6

è¿™äº›å¼•æ“Žåªæ˜¯ domain adapterï¼Œä¸åº”è¯¥è¢«åŒ…è£…æˆåŒä¸€ä¸ªâ€œä¸‡èƒ½ editor engineâ€ã€‚

#### 3. ä¸æŠŠ `code-editor` å¼ºè¡Œå‡æ ¼ä¸º designer-page

`code-editor` å½“å‰çš„ä»·å€¼æ°æ°åœ¨äºŽå®ƒå·²ç»å¾ˆå¥½åœ°å¤ç”¨é€šç”¨ renderer runtimeï¼Œè€Œä¸æ˜¯å¦èµ·ä¸€å¥—å·¥ä½œå°å¹³å°ã€‚å¼ºè¡Œç»Ÿä¸€åªä¼šå¢žåŠ  ceremonyã€‚

## äº”ã€æˆ‘å¯¹åŽç»­æ¼”è¿›çš„æ„è§

### 5.1 ä¼˜å…ˆçº§æœ€é«˜çš„ä¸æ˜¯â€œç»§ç»­åŠ åŠŸèƒ½â€ï¼Œè€Œæ˜¯â€œæ”¶æ•›å¤æ‚æŽ§ä»¶å¹³å°åè®®â€

å¦‚æžœç»§ç»­æŒ‰çŽ°åœ¨çš„æ–¹å¼åˆ†åˆ«æŽ¨è¿› flow/report/wordï¼Œå¾ˆå®¹æ˜“å‡ºçŽ°ï¼š

- æ¯ä¸ªæ¨¡å—éƒ½èƒ½è·‘
- æ¯ä¸ªæ¨¡å—ä¹Ÿéƒ½æœ‰å„è‡ªçš„å£³å±‚
- ä½†é•¿æœŸç»´æŠ¤æˆæœ¬è¶Šæ¥è¶Šé«˜

æ‰€ä»¥æŽ¥ä¸‹æ¥æ›´é«˜æ æ†çš„å·¥ä½œä¸æ˜¯åŠ æ›´å¤š designer featureï¼Œè€Œæ˜¯æ”¶æ•›å…±äº«åè®®ã€‚

### 5.2 æŽ¨èçš„æ”¶æ•›é¡ºåº

#### ç¬¬ä¸€æ­¥ï¼šæŠŠ Flow Designer çŽ°æœ‰æ¨¡å¼æŠ½è±¡æˆå…±äº«åŸºçº¿

ä¼˜å…ˆæç‚¼ä¸‹é¢ä¸‰æ ·ä¸œè¥¿ï¼š

- host shell æŽ¥çº¿æ¨¡å¼
- host scope æ•°æ®æš´éœ²æ¨¡å¼
- namespaced action provider æ³¨å†Œæ¨¡å¼

`flow-designer` ç›®å‰æ˜¯è¿™æ–¹é¢æœ€æˆç†Ÿçš„å®žçŽ°æ ·æ¿ã€‚

#### ç¬¬äºŒæ­¥ï¼šå…ˆä¿®å¤æ–‡æ¡£ä¸Žå®žçŽ°æ¼‚ç§»

æˆ‘è®¤ä¸ºè¿™ä¸æ˜¯â€œæ–‡æ¡£é—®é¢˜â€ï¼Œè€Œæ˜¯ç¨³å®šæ€§é—®é¢˜ã€‚

å»ºè®®ä¼˜å…ˆæ ¡æ­£ï¼š

- `flow-designer` adapter / runtime snapshot æ–‡æ¡£ä¸ŽçœŸå®žä»£ç 
- `code-editor` schema å£°æ˜Žé¢ä¸ŽçœŸå®žå®žçŽ°é¢
- `report-designer` æ–‡æ¡£é‡Œçš„ç›®æ ‡æ€ä¸Žå½“å‰è½åœ°æ€è¾¹ç•Œ

å¦åˆ™åŽç»­æŠ½å…±äº«æŠ½è±¡æ—¶ä¼šå»ºç«‹åœ¨é”™è¯¯åŸºçº¿ä¸Šã€‚

#### ç¬¬ä¸‰æ­¥ï¼šè®© Report Designer çœŸæ­£å»ºç«‹åœ¨ Spreadsheet ä¹‹ä¸Š

å½“å‰ `report-designer` çš„è®¾è®¡æ˜¯å¯¹çš„ï¼Œä½† page å±‚ç»„åˆè¿˜æ²¡æœ‰å®Œæˆã€‚

åœ¨çœŸæ­£æŠ½å…±äº«å¤æ‚æŽ§ä»¶å±‚ä¹‹å‰ï¼Œæœ€å¥½å…ˆæŠŠ `report-designer-page` åšæˆçœŸå®žçš„â€œspreadsheet host + report semantic layerâ€ç»„åˆï¼Œè€Œä¸æ˜¯ç»§ç»­åœç•™åœ¨ shell + fallbackã€‚

#### ç¬¬å››æ­¥ï¼šæŠŠ Word Editor å‘å…±äº« workbench åè®®é æ‹¢ï¼Œä½†ä¸è¦ä¸€æ¬¡æ€§ç¡¬è¿åˆ° schema-driven

å¯¹ `word-editor` æ›´çŽ°å®žçš„åšæ³•æ˜¯ä¸¤æ­¥èµ°ï¼š

1. å…ˆæŽ¥å…¥å…±äº« `WorkbenchShell`ã€dirty/save/leave-guardã€resource panel è§„èŒƒ
2. å†é€æ­¥è€ƒè™‘ toolbar / inspector / dialogs æ˜¯å¦éœ€è¦è½¬ä¸º schema fragments

è¿™æ ·é£Žé™©æ›´ä½Žã€‚

#### ç¬¬äº”æ­¥ï¼šä¿æŒ Code Editor çš„è½»é‡å®šä½

`code-editor` æ›´é€‚åˆç»§ç»­åšâ€œå­—æ®µæŽ§ä»¶ + å¯é€‰å¢žå¼ºå·¥ä½œå°â€çš„è·¯çº¿ã€‚

å®ƒéœ€è¦è¡¥é½çš„æ˜¯ï¼š

- source-ref çœŸæ­£è§£æž
- schema/event æŽ¥çº¿å®Œæ•´æ€§
- fullscreen / busy / variable-browser äº¤äº’è§„èŒƒ

è€Œä¸æ˜¯å¼•å…¥æ–°çš„ designer-coreã€‚

## å…­ã€æœ€ç»ˆåˆ¤æ–­

å¦‚æžœé—®é¢˜æ˜¯ï¼šè¿™ä¸ªæ¡†æž¶â€œç›®å‰è®¾è®¡æ˜¯å¦åˆç†â€ï¼Ÿ

æˆ‘çš„åˆ¤æ–­æ˜¯ï¼šåˆç†ï¼Œè€Œä¸”æ ¸å¿ƒæ–¹å‘æ˜¯å¯¹çš„ã€‚

å¦‚æžœé—®é¢˜æ˜¯ï¼šè¿™ä¸ªæ¡†æž¶â€œæ˜¯å¦å·²ç»è¶³å¤Ÿç¨³å®šï¼Œå¯ä»¥è®¤ä¸ºå¤æ‚æŽ§ä»¶å¹³å°å±‚ä¹ŸåŸºæœ¬å®šåž‹â€ï¼Ÿ

æˆ‘çš„åˆ¤æ–­æ˜¯ï¼šè¿˜ä¸å¤Ÿã€‚

æ›´å‡†ç¡®çš„è¯´æ³•åº”è¯¥æ˜¯ï¼š

- é€šç”¨ schema runtime åŸºçº¿å·²ç»åŸºæœ¬æˆç«‹ã€‚
- å¤æ‚æŽ§ä»¶å¹³å°åŸºçº¿è¿˜éœ€è¦ä¸€æ¬¡æŠ½è±¡æ”¶æ•›ã€‚

æœ€å€¼å¾—åšçš„ç»Ÿä¸€æŠ½è±¡ï¼Œä¸æ˜¯ç»Ÿä¸€ graph/spreadsheet/word/code çš„å†…éƒ¨æ¨¡åž‹ï¼Œè€Œæ˜¯ç»Ÿä¸€ï¼š

- workbench shell
- host bridge
- host scope + namespaced action æŽ¥çº¿
- dirty/save/leave-guard/session åè®®
- èµ„æºé¢æ¿ä¸Žå¼‚æ­¥åŠ¨ä½œçš„äº¤äº’è§„èŒƒ

è¿™å¥—ç»Ÿä¸€ä¸€æ—¦è¡¥ä¸Šï¼Œ`flow-designer`ã€`report-designer`ã€`word-editor` ä¼šæ˜Žæ˜¾æ›´å®¹æ˜“ç»´æŠ¤ï¼›`code-editor` ä¹Ÿèƒ½å—ç›Šï¼Œä½†ä¸éœ€è¦è¢«å¼ºè¡Œå¹¶å…¥åŒä¸€ç§ designer å¹³å°ã€‚

## å‚è€ƒ

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/code-editor.md`
- `docs/references/complex-component-design-process.md`
- `docs/analysis/2026-04-03-word-sql-code-report-designer-ui-interaction-review.md`
- `packages/flow-designer-core/src/core.ts`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/spreadsheet-core/src/core.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/bridge.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/commands.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/bridge.ts`
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`
- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `packages/flux-code-editor/src/types.ts`
- `packages/word-editor-renderers/src/WordEditorPage.tsx`
- `packages/word-editor-core/src/document-io.ts`

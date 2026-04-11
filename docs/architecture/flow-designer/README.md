# Flow Designer

`Flow Designer` ä¸æ˜¯ä¸€å¥—ç‹¬ç«‹äºŽçŽ°æœ‰ AMIS/SchemaRenderer ä½“ç³»ä¹‹å¤–çš„æ–°æ¸²æŸ“å¼•æ“Žï¼Œè€Œæ˜¯æž„å»ºåœ¨ `SchemaRenderer` ä¹‹ä¸Šçš„å›¾è®¾è®¡å™¨é¢†åŸŸæ‰©å±•ã€‚

## å®šä½

- ä¿ç•™çŽ°æœ‰ `apps/main/src/pages/flow-editor` ç¤ºä¾‹ï¼Œä¸ç›´æŽ¥æ”¹é€ æ—§ç¤ºä¾‹
- åœ¨ `packages` ä¸‹æ–°å¢žé€šç”¨æ¨¡å—ï¼Œç›®æ ‡æ˜¯æŠŠ flow editor èƒ½åŠ›æŠ½è±¡æˆå¯é…ç½®çš„è®¾è®¡å™¨åŸºç¡€è®¾æ–½
- è®¾è®¡å™¨å¤–å›´ UI å°½é‡å¤ç”¨çŽ°æœ‰ `SchemaRenderer`ã€`formulaCompiler`ã€`action`ã€`form/page runtime`
- åªæœ‰å›¾ç”»å¸ƒã€ç«¯å£è¿žæŽ¥ã€è§„åˆ™åŒ¹é…ã€å›¾ç¼–è¾‘åŽ†å²ç­‰èƒ½åŠ›ç”±ä¸“ç”¨ graph runtime è´Ÿè´£

## æ–°æž¶æž„ç»“è®º

- `Flow Designer` ä½œä¸º `SchemaRenderer` é¢†åŸŸæ‰©å±•å±‚å®žçŽ°
- åŒ…ç»“æž„é‡‡ç”¨ `@nop-chaos/flow-designer-core` + `@nop-chaos/flow-designer-renderers`
- æ ¹ schema é‡‡ç”¨ `designer-page`
- èŠ‚ç‚¹ç±»åž‹é‡‡ç”¨ designer ä¸“ç”¨ configï¼Œä¸ç›´æŽ¥é€€åŒ–æˆæ™®é€š renderer schema
- inspectorã€create dialogã€toolbarã€floating actions é‡‡ç”¨ schema ç‰‡æ®µé©±åŠ¨
- åŠ¨ä½œç»Ÿä¸€èµ° action schemaï¼Œå¹¶æ‰©å±• `designer:*` action
- æ–‡æ¡£åªæŒä¹…åŒ– graph æ•°æ®ï¼Œä¸æŒä¹…åŒ– hoverã€selection drawer ç­‰ UI ä¸´æ—¶çŠ¶æ€

## å½“å‰ MVP çŠ¶æ€

- `packages/flow-designer-core/` å·²æä¾›æœ€å°å¯è¿è¡Œçš„ graph runtimeï¼š`GraphDocument`ã€`GraphNode`ã€`GraphEdge`ã€`DesignerConfig`ã€single-selectionã€undo/redoã€dirty trackingã€save/restoreã€å¯¼å‡º JSONã€‚
- `packages/flow-designer-renderers/` å·²æä¾› `designer-page`ã€`designer-field`ã€åŸºç¡€å ä½ renderer æ³¨å†Œï¼Œå¹¶é€šè¿‡ `designer-page` è‡ªèº«çš„ `ActionScope` è¾¹ç•ŒæŽ¥å…¥ `designer:*` åŠ¨ä½œã€‚
- `apps/playground/src/App.tsx` å·²æä¾›ä¸€ä¸ªå¯è¿è¡Œçš„ playground é›†æˆå…¥å£ï¼Œå½“å‰ä»“åº“é‡Œä¿ç•™çš„ç›´è¿ž React ç¤ºä¾‹ä»åœ¨ `apps/playground/src/FlowDesignerExample.tsx`ï¼Œè€Œ schema/runtime é›†æˆè·¯å¾„ä»¥ `designer-page` renderer ä¸ºä¸»ã€‚
- å½“å‰ç”»å¸ƒåªæ”¯æŒ live `@xyflow/react`ï¼ˆReact Flowï¼‰ï¼Œå¹¶å¤ç”¨åŒä¸€å¥— host-owned command bridgeï¼Œè€Œä¸æ˜¯åœ¨å¤šç§ç”»å¸ƒå®žçŽ°ä¹‹é—´åˆ‡æ¢ã€‚

## æ–‡æ¡£

- `docs/architecture/flow-designer/design.md` - æ€»ä½“æž¶æž„ã€è¿è¡Œæ—¶è¾¹ç•Œã€æ€§èƒ½ç­–ç•¥
- `docs/architecture/flow-designer/config-schema.md` - `designer-page`ã€`nodeTypes`ã€`ports`ã€`edgeTypes`ã€æ–‡æ¡£æ¨¡åž‹
- `docs/architecture/flow-designer/api.md` - åŒ… APIã€å®¿ä¸» scopeã€designer actionsã€æ‰©å±•ç‚¹
- `docs/architecture/flow-designer/runtime-snapshot.md` - å½“å‰ `DesignerSnapshot`ã€`DesignerContextValue`ã€host scope è½åœ°çŽ°çŠ¶ï¼Œä»¥åŠâ€œå·²æŽ¥çº¿å­—æ®µâ€ä¸Žâ€œè®¾è®¡ç›®æ ‡å­—æ®µâ€çš„åŒºåˆ«
- `docs/architecture/flow-designer/collaboration.md` - `designer-page`ã€ActionScopeã€command adapterã€canvas hostã€inspector ä¹‹é—´çš„åä½œé“¾è·¯ä¸Žè°ƒç”¨é“¾å›¾
- `docs/architecture/flow-designer/canvas-adapters.md` - å½“å‰å”¯ä¸€çš„ React Flow ç”»å¸ƒè¾¹ç•Œã€å¤±è´¥è¯­ä¹‰ã€å›žè°ƒç¿»è¯‘è¾¹ç•Œ
- `docs/analysis/2026-03-21-flow-designer-documentation-review.md` - å¯¹æ—©æœŸæ”¹è¿›æ„è§çš„å¤æ ¸ç»“è®ºä¸Žå·²é‡‡çº³çº¦æŸ

## è®¾è®¡åŽŸåˆ™

- é…ç½®å°½é‡ç®€åŒ–ï¼Œä½†åŸºç¡€æ¨¡å—å°½é‡é€šç”¨
- çœŸæ­£éœ€è¦å›¾ç¼–è¾‘ç‰¹åŒ–çš„èƒ½åŠ›æ‰è¿›å…¥ `core`
- èƒ½ç”¨ schema renderer å¤ç”¨çš„ï¼Œä¸åœ¨ flow designer é‡Œé‡é€ 
- é¢å‘é«˜æ€§èƒ½ï¼šç¼–è¯‘ã€ç¼“å­˜ã€å±€éƒ¨è®¢é˜…ã€å¢žé‡æ›´æ–°ä¼˜å…ˆ
- é…ç½®å’Œæ–‡æ¡£ç»“æž„å¿…é¡»ç¨³å®šï¼Œä¾¿äºŽåŽç«¯å­˜å‚¨ä¸Žç‰ˆæœ¬è¿ç§»

## ä¸ŽçŽ°æœ‰ç¤ºä¾‹çš„å…³ç³»

- çŽ°æœ‰ flow editor ç¤ºä¾‹ç»§ç»­ä½œä¸ºç‹¬ç«‹ç¤ºä¾‹ä¿ç•™
- æ–°æ¨¡å—ç›®æ ‡æ˜¯æ²‰æ·€ä¸€å¥—å¯å¤ç”¨çš„è®¾è®¡å™¨å¹³å°èƒ½åŠ›
- åŽç»­å¯ä»¥ç”¨æ–°æ¨¡å—é‡æ–°å®žçŽ°ä¸€ä¸ªæ–°çš„ designer ç¤ºä¾‹ï¼Œä½†ä¸æ›¿æ¢æ—§é¡µ


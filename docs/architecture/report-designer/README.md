# Report Designer

`Report Designer` ä¸æ˜¯ä¸€å¥—åªæœåŠ¡äºŽ `nop-report` çš„ä¸“ç”¨ç¼–è¾‘å™¨ï¼Œè€Œæ˜¯æž„å»ºåœ¨ `SchemaRenderer` ä¹‹ä¸Šçš„é€šç”¨æŠ¥è¡¨è®¾è®¡å™¨é¢†åŸŸæ‰©å±•ã€‚

å®ƒç”±ä¸¤å±‚èƒ½åŠ›ç»„æˆ:

- å¯å•ç‹¬ä½¿ç”¨çš„ `Spreadsheet Editor`ï¼Œè´Ÿè´£ Excel å¼å¤š sheet å±•çŽ°ä¸Žç¼–è¾‘
- å åŠ åœ¨ spreadsheet ä¹‹ä¸Šçš„ `Report Designer`ï¼Œè´Ÿè´£ä¸šåŠ¡å­—æ®µæ‹–æ‹½ã€æŠ¥è¡¨è¯­ä¹‰é…ç½®ã€å±žæ€§é¢æ¿ç¼–æŽ’å’Œé¢„è§ˆé›†æˆ

## å®šä½

- åœ¨ `packages` ä¸‹æ–°å¢žé€šç”¨æ¨¡å—ï¼Œç›®æ ‡æ˜¯æ²‰æ·€ä¸€å¥—å¯å¤ç”¨çš„ spreadsheet/report designer å¹³å°èƒ½åŠ›
- `Spreadsheet Editor` å¿…é¡»å¯ä»¥è„±ç¦»æŠ¥è¡¨è¯­ä¹‰å•ç‹¬ä½¿ç”¨ï¼Œä¸ä¾èµ–ä¸šåŠ¡å­—æ®µé¢æ¿å’ŒæŠ¥è¡¨å…ƒæ•°æ®æ¨¡åž‹
- `Report Designer` å¿…é¡»æ˜¯é€šç”¨çš„ï¼Œä¸é¢„ç½® `nop-report` çš„å­—æ®µè¯­ä¹‰ï¼Œåªé€šè¿‡é…ç½®å’Œé€‚é…å™¨æ”¯æŒ `nop-report` ä¸€ç±»å…·ä½“æ¨¡åž‹
- å·¦ä¾§å­—æ®µé¢æ¿ã€å³ä¾§å±žæ€§ç¼–è¾‘ã€è¡¨è¾¾å¼ç¼–è¾‘æŽ§ä»¶éƒ½ç”±å¤–éƒ¨é…ç½®å’Œé€‚é…ï¼Œä¸å†™æ­»ä¸ºæŸä¸€ä¸ªåŽç«¯æ¨¡åž‹
- è¡¨è¾¾å¼ç¼–è¾‘æŽ§ä»¶æ˜¯ç‹¬ç«‹é—®é¢˜ï¼Œ`Report Designer` åªå®šä¹‰æŠ½è±¡é€‚é…æŽ¥å£ï¼Œä¸åœ¨å½“å‰æ–‡æ¡£ä¸­å›ºåŒ–è¡¨è¾¾å¼è¯­è¨€åè®®

## æ–°æž¶æž„ç»“è®º

- `Spreadsheet Editor` ä½œä¸º `SchemaRenderer` é¢†åŸŸæ‰©å±•å±‚å®žçŽ°ï¼Œå¹¶æ”¯æŒè„±ç¦» `Report Designer` å•ç‹¬è¿è¡Œ
- åŒ…ç»“æž„å»ºè®®é‡‡ç”¨ `@nop-chaos/spreadsheet-core` + `@nop-chaos/spreadsheet-renderers` + `@nop-chaos/report-designer-core` + `@nop-chaos/report-designer-renderers`
- standalone spreadsheet æ ¹ schema å»ºè®®ä½¿ç”¨ `spreadsheet-page`
- æŠ¥è¡¨è®¾è®¡å™¨æ ¹ schema å»ºè®®ä½¿ç”¨ `report-designer-page`
- å­—æ®µåˆ—è¡¨ã€å±žæ€§é¢æ¿ã€å·¥å…·æ ã€æµ®åŠ¨åŠ¨ä½œã€å¯¹è¯æ¡†ä¼˜å…ˆé‡‡ç”¨ schema ç‰‡æ®µé©±åŠ¨
- æŠ¥è¡¨è¯­ä¹‰æ•°æ®é€šè¿‡é€šç”¨ metadata å±‚æ‰¿è½½ï¼Œä¸æŠŠå…·ä½“ä¸šåŠ¡å­—æ®µå¼ºè€¦åˆè¿› spreadsheet core
- è¡¨è¾¾å¼ç¼–è¾‘èƒ½åŠ›é€šè¿‡ `ExpressionEditorAdapter` æŽ¥å£æŽ¥å…¥ï¼ŒåŽç»­å¯æ›¿æ¢ä¸ºç‹¬ç«‹æŽ§ä»¶åŒ…

## æ–‡æ¡£

- `docs/architecture/report-designer/design.md` - æ€»ä½“æž¶æž„ã€è¿è¡Œæ—¶è¾¹ç•Œã€æ¨¡å—æ‹†åˆ†ã€æ€§èƒ½ç­–ç•¥
- `docs/architecture/report-designer/config-schema.md` - `spreadsheet-page`ã€`report-designer-page`ã€æ–‡æ¡£æ¨¡åž‹ã€å­—æ®µé¢æ¿ã€å±žæ€§é¢æ¿ã€è¡¨è¾¾å¼é€‚é…æŽ¥å£
- `docs/architecture/report-designer/api.md` - åŒ… APIã€å®¿ä¸» scopeã€spreadsheet/report actionsã€æ‰©å±•ç‚¹
- `docs/architecture/report-designer/contracts.md` - æ›´æŽ¥è¿‘æœªæ¥ TypeScript å®žçŽ°çš„æŽ¥å£è‰æ¡ˆä¸Ž adapter åˆåŒ
- `docs/architecture/report-designer/inspector-design.md` - å³ä¾§å±žæ€§é¢æ¿çš„ shell/provider/panel descriptor è®¾è®¡
- `docs/architecture/report-designer/nop-report-profile.md` - é€šç”¨è®¾è®¡å™¨å¦‚ä½•é€šè¿‡ profile + adapter æ”¯æŒ `nop-report`
- `docs/architecture/report-designer/codec-design.md` - `SpreadsheetDocument` / `ReportSemanticDocument` ä¸Žå¤–éƒ¨æ¨¡æ¿æ¨¡åž‹çš„ round-trip codec è®¾è®¡
- `docs/architecture/report-designer/spreadsheet-canvas-css.md` - Spreadsheet canvas çš„æ··åˆ CSS ç­–ç•¥è®¾è®¡ï¼ˆé¢„å®šä¹‰ class + inline style + data-* å±žæ€§ï¼‰
- `docs/analysis/2026-03-21-excel-report-designer-research.md` - å¤–éƒ¨é¡¹ç›®ä¸Žç›®æ ‡æ¨¡åž‹è°ƒç ”ç»“è®º

## è®¾è®¡åŽŸåˆ™

- spreadsheet core ä¼˜å…ˆé€šç”¨åŒ–ï¼ŒæŠ¥è¡¨è¯­ä¹‰ä½œä¸ºä¸Šå±‚æ‰©å±•å åŠ 
- èƒ½å¤ç”¨çŽ°æœ‰ `SchemaRenderer`ã€`formulaCompiler`ã€`action`ã€`form/page runtime` çš„ï¼Œä¸åœ¨ designer ä¸­é‡é€ 
- å·¦ä¾§å­—æ®µé¢æ¿å’Œå³ä¾§å±žæ€§é¢æ¿å¿…é¡»é…ç½®é©±åŠ¨ï¼Œä¸èƒ½ç¡¬ç¼–ç ä¸ºç‰¹å®šæŠ¥è¡¨æ¨¡åž‹
- è¡¨è¾¾å¼ç¼–è¾‘å™¨åªå®šä¹‰é€‚é…è¾¹ç•Œï¼Œä¸æå‰æŠŠ designer ç»‘å®šåˆ°æŸä¸€ç§è¡¨è¾¾å¼è¯­æ³•
- é¢å‘é«˜æ€§èƒ½: æ–‡æ¡£å½’ä¸€åŒ–ã€å±€éƒ¨è®¢é˜…ã€å¸ƒå±€ç¼“å­˜ã€å‘½ä»¤å¼æ›´æ–°ä¼˜å…ˆ
- é…ç½®å’Œæ–‡æ¡£ç»“æž„å¿…é¡»ç¨³å®šï¼Œä¾¿äºŽåŽç«¯å­˜å‚¨ä¸Žç‰ˆæœ¬è¿ç§»

## ä¸Ž nop-report çš„å…³ç³»

- `nop-report` æ˜¯é¦–ä¸ªé‡è¦é€‚é…ç›®æ ‡ï¼Œä½†ä¸æ˜¯ `Report Designer` çš„å†…å»ºé¢†åŸŸæ¨¡åž‹
- `nop-report` é€‚é…åº”é€šè¿‡å­—æ®µæºé…ç½®ã€å±žæ€§é¢æ¿ schemaã€metadata è¯»å†™é€‚é…å™¨ã€å¯¼å…¥å¯¼å‡ºé€‚é…å™¨æ¥å®Œæˆ
- è¿™æ„å‘³ç€é€šç”¨è®¾è®¡å™¨æ–‡æ¡£åªå®šä¹‰èƒ½åŠ›è¾¹ç•Œï¼Œä¸ç›´æŽ¥æŠŠ `ExcelWorkbook` æˆ– `XptCellModel` å†™æˆ core å¥‘çº¦

## ä¸Žè¡¨è¾¾å¼ç¼–è¾‘å™¨çš„å…³ç³»

- è¡¨è¾¾å¼ç¼–è¾‘æŽ§ä»¶çš„è®¾è®¡ä¸Žå®žçŽ°æ˜¯ç‹¬ç«‹é—®é¢˜
- å½“å‰æ–‡æ¡£åªå®šä¹‰ `ExpressionEditorAdapter` ä¸€ç±»æŠ½è±¡æŽ¥å£
- åŽç»­éœ€è¦å•ç‹¬è°ƒç ”è¡¨è¾¾å¼è¯­è¨€ã€è¡¥å…¨ã€æ ¡éªŒã€æ ¼å¼åŒ–ã€å¼•ç”¨é€‰æ‹©ä¸Žè¿è¡Œæ—¶ä¸Šä¸‹æ–‡


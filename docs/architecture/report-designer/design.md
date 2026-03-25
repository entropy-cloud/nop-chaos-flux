# Report Designer æž¶æž„è®¾è®¡

## 1. ç›®æ ‡ä¸Žè¾¹ç•Œ

### 1.1 æ ¸å¿ƒç›®æ ‡

- å°† Excel å¼å¤š sheet ç¼–è¾‘èƒ½åŠ›æç‚¼ä¸ºå¯å•ç‹¬å¤ç”¨çš„ `Spreadsheet Editor`
- åœ¨ `Spreadsheet Editor` ä¹‹ä¸Šå åŠ å¯é…ç½®çš„ `Report Designer`
- å¤–éƒ¨é€šè¿‡ JSON é…ç½®å®šä¹‰å­—æ®µé¢æ¿ã€å·¥å…·æ ã€å±žæ€§é¢æ¿ã€æŠ¥è¡¨å…ƒæ•°æ®ç¼–è¾‘æ–¹å¼å’Œé¢„è§ˆé›†æˆ
- å¤ç”¨çŽ°æœ‰ `SchemaRenderer` ä½“ç³»ï¼Œè€Œä¸æ˜¯å¹³è¡Œå†é€ ä¸€å¥—é¡µé¢æ¸²æŸ“è¿è¡Œæ—¶
- ä¿æŒ `Report Designer` é€šç”¨ï¼Œå…è®¸é€šè¿‡é€‚é…å™¨æ”¯æŒ `nop-report` ç­‰å…·ä½“åŽç«¯æ¨¡åž‹

### 1.2 éžç›®æ ‡

- ä¸è¿½æ±‚å®Œæ•´ Excel å…¼å®¹
- ä¸å†…å»ºå…¬å¼æ‰§è¡Œå¼•æ“Ž
- ä¸æŠŠè¡¨è¾¾å¼ç¼–è¾‘è¯­è¨€åœ¨å½“å‰é˜¶æ®µå†™æ­»
- ä¸å°†å­—æ®µé¢æ¿ã€å±žæ€§é¢æ¿ã€é¢„è§ˆåè®®å†™æ­»ä¸º `nop-report`

## 2. æ€»ä½“æž¶æž„

`Report Designer` åº”å®žçŽ°ä¸º `SchemaRenderer` ä¸Šçš„ä¸€å±‚é¢†åŸŸæ‰©å±•ï¼Œå¹¶ä¸”å…¶åº•å±‚ `Spreadsheet Editor` å¯ä»¥å•ç‹¬ä½œä¸ºä¸€ä¸ªé€šç”¨æŽ§ä»¶ä½¿ç”¨ã€‚

```text
+---------------- SchemaRenderer Host ----------------+
|                                                     |
|  spreadsheet-page / report-designer-page            |
|    |                                                |
|    +- toolbar region -> standard schema render      |
|    +- field panel    -> designer field renderer     |
|    +- canvas region  -> spreadsheet renderer        |
|    +- inspector      -> standard schema render      |
|    +- dialogs        -> standard schema render      |
|                                                     |
|  formulaCompiler / action dispatch / page runtime   |
|  form runtime / dialog host / plugin pipeline       |
+--------------------------+--------------------------+
                           |
                           v
+---------------- Spreadsheet Core -------------------+
| workbook | sheets | cells | styles | merges         |
| selection | editing | layout | history | commands    |
+--------------------------+--------------------------+
                           |
                           v
+--------------- Report Designer Core ----------------+
| field sources | semantic metadata | drag-drop       |
| inspector matching | preview bridge | adapters       |
+-----------------------------------------------------+
```

## 3. æ¨¡å—æ‹†åˆ†

### 3.1 `@nop-chaos/spreadsheet-core`

èŒè´£: çº¯è¡¨æ ¼è¿è¡Œæ—¶ï¼Œä¸ä¾èµ– Reactï¼Œä¸ä¾èµ– `SchemaRenderer`ï¼Œå¯ä»¥å•ç‹¬å¤ç”¨ã€‚

å»ºè®®åŒ…å«:

- workbook / sheet / row / column / cell æ–‡æ¡£æ¨¡åž‹
- ç¨€ç–å•å…ƒæ ¼å­˜å‚¨
- æ ·å¼å¼•ç”¨æ± 
- merge æ¨¡åž‹
- row/column resize ä¸Ž hidden çŠ¶æ€
- active sheetã€selectionã€editing çŠ¶æ€
- layout skeleton ä¸Ž visible range è®¡ç®—
- undo/redo åŽ†å²
- spreadsheet commands æ‰§è¡Œå™¨
- æ–‡æ¡£åºåˆ—åŒ–ã€ååºåˆ—åŒ–ã€è¿ç§»

### 3.2 `@nop-chaos/spreadsheet-renderers`

èŒè´£: ä¸ŽçŽ°æœ‰ `SchemaRenderer` é›†æˆã€‚

å»ºè®®åŒ…å«:

- `spreadsheet-page`ã€`spreadsheet-canvas`ã€`spreadsheet-toolbar-shell` ç­‰ `RendererDefinition`
- `createSpreadsheetRegistry()` æˆ– `registerSpreadsheetRenderers()`
- spreadsheet runtime åˆ° schema runtime çš„æ¡¥æŽ¥å±‚
- å®¿ä¸» scope æ³¨å…¥
- `spreadsheet:*` action æ³¨å†Œ
- DOM overlay editor å’Œ canvas renderer é€‚é…

### 3.3 `@nop-chaos/report-designer-core`

èŒè´£: åœ¨ spreadsheet ä¹‹ä¸Šå¢žåŠ æŠ¥è¡¨è®¾è®¡è¯­ä¹‰ï¼Œä½†ä¸ç»‘å®šå…·ä½“ä¸šåŠ¡æ¨¡åž‹ã€‚

å»ºè®®åŒ…å«:

- report template document ç±»åž‹å®šä¹‰
- å­—æ®µæºä¸Žå­—æ®µæ‹–æ‹½æ¨¡åž‹
- workbook/sheet/cell/range metadata å±‚
- inspector åŒ¹é…ä¸Ž panel provider é€‰æ‹©é€»è¾‘
- preview æŽ¥å£æŠ½è±¡
- å¤–éƒ¨é€‚é…å™¨æ³¨å†Œ
- `report-designer:*` action çš„åº•å±‚æ‰§è¡Œå™¨

### 3.4 `@nop-chaos/report-designer-renderers`

èŒè´£: ä¸Ž `SchemaRenderer` é›†æˆé€šç”¨æŠ¥è¡¨è®¾è®¡å™¨å¤–å£³ã€‚

å»ºè®®åŒ…å«:

- `report-designer-page`ã€`report-field-panel`ã€`report-inspector-shell` ç­‰ renderer
- `createReportDesignerRegistry()` æˆ– `registerReportDesignerRenderers()`
- å·¦ä¾§å­—æ®µé¢æ¿æ‹–æ‹½åˆ° spreadsheet çš„æ¡¥æŽ¥å±‚
- inspector schema è¿è¡Œæ—¶å®¿ä¸»æ³¨å…¥
- `report-designer:*` actions æ³¨å†Œ

### 3.5 è¡¨è¾¾å¼ç¼–è¾‘å™¨é€‚é…è¾¹ç•Œ

è¡¨è¾¾å¼ç¼–è¾‘å™¨ä¸æ˜¯æœ¬æœŸå®žçŽ°å†…å®¹ï¼Œä½† `Report Designer` å¿…é¡»ä»Žä¸€å¼€å§‹å°±é¢„ç•™æŽ¥å…¥ä½ã€‚

å»ºè®®çº¦æŸ:

- designer ä¸å†…å»ºè¡¨è¾¾å¼è¾“å…¥æ¡†å®žçŽ°
- å±žæ€§é¢æ¿é€šè¿‡ adapter æ¸²æŸ“è¡¨è¾¾å¼å­—æ®µ
- adapter åªæš´éœ²ç¼–è¾‘å’Œå€¼å›žä¼ èƒ½åŠ›ï¼Œä¸è¦æ±‚å½“å‰æ–‡æ¡£å®šä¹‰å…·ä½“è¯­è¨€åè®®

## 4. ä¸ºä»€ä¹ˆè¦åˆ†æˆ Spreadsheet å’Œ Report Designer ä¸¤å±‚

å‚è€ƒ `packages/flux-react/src/index.tsx:479`ï¼Œå½“å‰ä½“ç³»å·²ç»å…·å¤‡:

- registry é©±åŠ¨ renderer å‘çŽ°
- schema compile å’ŒåŠ¨æ€å€¼ç¼–è¯‘ç¼“å­˜
- page/form runtime
- scope ä¸Šä¸‹æ–‡
- dialog host
- action dispatch
- plugin ç”Ÿå‘½å‘¨æœŸ

å› æ­¤è¿™é‡ŒçœŸæ­£éœ€è¦æ–°å¢žçš„æ˜¯é¢†åŸŸè¿è¡Œæ—¶ï¼Œè€Œä¸æ˜¯æ–°çš„é€šç”¨é¡µé¢å¼•æ“Žã€‚

åŒæ—¶ï¼Œç”¨æˆ·æ˜Žç¡®è¦æ±‚ Excel å±•çŽ°å’Œç¼–è¾‘èƒ½åŠ›å¯ä»¥å•ç‹¬ä½¿ç”¨ï¼Œæ‰€ä»¥ä¸èƒ½æŠŠ spreadsheet core æ·±åŸ‹åˆ° report designer å†…éƒ¨ã€‚

## 5. ä¸¤ç§æ ¹èŠ‚ç‚¹ç»„ç»‡æ¨¡åž‹

### 5.1 `spreadsheet-page`

ç”¨äºŽå•ç‹¬ä½¿ç”¨çš„ workbook ç¼–è¾‘å™¨ã€‚

æŽ¨èç»“æž„:

```ts
interface SpreadsheetPageSchema {
  type: 'spreadsheet-page'
  id?: string
  title?: string
  document: SpreadsheetDocumentInput
  config?: SpreadsheetConfig
  toolbar?: SchemaInput
  statusbar?: SchemaInput
}
```

### 5.2 `report-designer-page`

ç”¨äºŽæŠ¥è¡¨è®¾è®¡å™¨ã€‚

æŽ¨èç»“æž„:

```ts
interface ReportDesignerPageSchema {
  type: 'report-designer-page'
  id?: string
  title?: string
  document: ReportTemplateDocumentInput
  spreadsheet?: SpreadsheetConfig
  designer: ReportDesignerConfig
  toolbar?: SchemaInput
  fieldPanel?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
}
```

è¯´æ˜Ž:

- `spreadsheet-page` åªå…³å¿ƒ workbook ç¼–è¾‘
- `report-designer-page` åœ¨ workbook ä¹‹ä¸Šå åŠ å­—æ®µæ‹–æ‹½ã€metadataã€previewã€inspector é€‚é…

## 6. æ•°æ®æ¨¡åž‹åˆ†å±‚

### 6.1 æŒä¹…åŒ–æ–‡æ¡£

`SpreadsheetDocument` åªä¿å­˜ç¨³å®šçš„è¡¨æ ¼æ–‡æ¡£:

- workbook å…ƒä¿¡æ¯
- sheets
- rows/columns/cells
- styles
- merges
- å¯é€‰ viewport

ä¸ä¿å­˜:

- hover
- å½“å‰ç¼–è¾‘æ€ DOM ä¿¡æ¯
- drag preview
- æ‰“å¼€çš„å±žæ€§é¡µç­¾
- ä¸´æ—¶é”™è¯¯é«˜äº®

### 6.2 Report Designer è¯­ä¹‰å±‚

`Report Designer` ä¸åº”ç›´æŽ¥æŠŠä¸šåŠ¡è¯­ä¹‰å¡žè¿› spreadsheet core çš„ cell ç»“æž„ã€‚å»ºè®®å•ç‹¬ç»´æŠ¤ metadata å¹³é¢:

- workbook metadata
- sheet metadata
- cell metadata
- range metadata
- field binding metadata

metadata é»˜è®¤é‡‡ç”¨é€šç”¨ namespaced object ç»“æž„ï¼Œå…·ä½“è¯­ä¹‰ç”±å¤–éƒ¨é€‚é…å™¨è§£é‡Šã€‚

### 6.3 è¿è¡Œæ—¶çŠ¶æ€

è¿è¡Œæ—¶çŠ¶æ€ç”±ä¸‰å±‚ç»„æˆ:

- spreadsheet runtime state: activeSheetã€selectionã€editingã€historyã€layout
- report designer runtime state: field dragã€active metadata targetã€preview sessionã€adapter state
- schema runtime state: form/page/dialog/action ç›¸å…³çŠ¶æ€

ä¸‰è€…å¿…é¡»åˆ†å±‚ï¼Œé¿å…æŠŠ form runtime å†å¤åˆ¶è¿› designer storeã€‚

## 7. å·¦ä¾§å­—æ®µé¢æ¿æ¨¡åž‹

å­—æ®µé¢æ¿æ˜¯ `Report Designer` çš„å¯é€‰èƒ½åŠ›ï¼Œä¸å±žäºŽ standalone spreadsheet çš„å†…å»ºéƒ¨åˆ†ã€‚

å»ºè®®çº¦æŸ:

- å­—æ®µæ¥æºç”±å¤–éƒ¨é…ç½®æˆ– provider æä¾›
- å­—æ®µå¯æ‹–æ‹½åˆ°å•å…ƒæ ¼æˆ–åŒºåŸŸ
- drop æ—¶åªäº§ç”Ÿæ ‡å‡†åŒ– designer commandï¼Œä¸ç›´æŽ¥ä¿®æ”¹ document
- å­—æ®µé¢æ¿å¯æŒ‰ç»„ã€åˆ†ç±»ã€æœç´¢ã€åªè¯»æç¤ºç­‰æ–¹å¼é…ç½®

æœ€å°äº¤äº’è·¯å¾„:

1. ç”¨æˆ·ä»Žå­—æ®µé¢æ¿æ‹–æ‹½å­—æ®µ
2. canvas å‘½ä¸­å•å…ƒæ ¼æˆ–åŒºåŸŸ
3. bridge å°† drop å½’ä¸€åŒ–ä¸º `report-designer:dropFieldToTarget`
4. core è°ƒç”¨å½“å‰é€‚é…å™¨ç”Ÿæˆ metadata patch
5. inspector ä¸Ž canvas åŒæ­¥åˆ·æ–°

## 8. å±žæ€§ç¼–è¾‘ä¸Ž inspector æ¨¡åž‹

### 8.1 å±žæ€§ç¼–è¾‘å¿…é¡»å¤–éƒ¨å¯å®šåˆ¶

ç‚¹å‡»å•å…ƒæ ¼åŽï¼Œå³ä¾§å±žæ€§æ¡†çš„å¯ç¼–è¾‘å†…å®¹å¿…é¡»ç”±å¤–éƒ¨å†³å®šï¼Œè€Œä¸æ˜¯æ¡†æž¶å†…å»ºä¸€å¥—å›ºå®šå­—æ®µã€‚

å› æ­¤å»ºè®®:

- inspector æœ¬èº«åªæ˜¯å£³å±‚
- å®žé™… panel body ç”±å¤–éƒ¨ schema æˆ– provider å†³å®š
- selection target æ”¹å˜æ—¶ï¼Œé€šè¿‡åŒ¹é…å™¨é€‰æ‹©åˆé€‚çš„ panel é›†åˆ

å¯åŒ¹é…ç›®æ ‡è‡³å°‘åŒ…æ‹¬:

- workbook
- sheet
- row
- column
- cell
- range

### 8.2 inspector ä»ç„¶å¤ç”¨çŽ°æœ‰ schema/form runtime

å±žæ€§é¢æ¿ç›´æŽ¥ä½¿ç”¨ schema ç‰‡æ®µé©±åŠ¨ï¼Œè€Œä¸æ˜¯å•ç‹¬ç»´æŠ¤å­—æ®µå¼•æ“Žã€‚

æŽ¨èæ–¹å¼:

- inspector schema ä½¿ç”¨å›ºå®šå®¿ä¸» scope è¯»å– `activeCell`ã€`activeRange`ã€`sheet`ã€`meta`
- ä¿å­˜æŒ‰é’®è§¦å‘ `report-designer:updateMeta` æˆ– `spreadsheet:*` actions
- æ ¡éªŒå¤ç”¨çŽ°æœ‰ form runtime

### 8.3 è¡¨è¾¾å¼å­—æ®µé€šè¿‡é€‚é…å™¨æ³¨å…¥

è‹¥æŸå±žæ€§é¡¹æ˜¯è¡¨è¾¾å¼ç±»åž‹ï¼Œåˆ™ inspector ä¸ç›´æŽ¥æ¸²æŸ“æ™®é€šè¾“å…¥æ¡†ï¼Œè€Œæ˜¯é€šè¿‡ `ExpressionEditorAdapter` æ¸²æŸ“ã€‚

å½“å‰é˜¶æ®µåªå®šä¹‰:

- å¦‚ä½•å£°æ˜Žä¸€ä¸ªå­—æ®µéœ€è¦è¡¨è¾¾å¼ç¼–è¾‘å™¨
- å¦‚ä½•æŠŠå€¼ã€åªè¯»æ€ã€ä¸Šä¸‹æ–‡å’Œå˜æ›´å›žè°ƒäº¤ç»™é€‚é…å™¨

ä¸å®šä¹‰:

- å…·ä½“è¡¨è¾¾å¼è¯­æ³•
- è‡ªåŠ¨è¡¥å…¨åè®®
- æ ¡éªŒè¯Šæ–­ç»“æž„çš„æœ€ç»ˆæ ¼å¼

## 9. spreadsheet runtime ä¸Ž schema runtime çš„æ¡¥æŽ¥

æ¡¥æŽ¥å±‚è´Ÿè´£æŠŠ spreadsheet/report designer runtime æš´éœ²ç»™ `spreadsheet-page` æˆ– `report-designer-page` ä¸‹çš„ schema ç‰‡æ®µã€‚

å»ºè®®æ¡¥æŽ¥åŽŸåˆ™:

- schema ç‰‡æ®µé€šè¿‡å›ºå®šå®¿ä¸» scope è¯»å–åªè¯»å¿«ç…§
- å†™æ“ä½œå¿…é¡»é€šè¿‡ `spreadsheet:*` æˆ– `report-designer:*` actions æäº¤
- schema å±‚ä¸å¾—ç›´æŽ¥æ‹¿åˆ°åº•å±‚ store å¹¶åŽŸåœ°ä¿®æ”¹ document
- bridge å¯¹å¤–æš´éœ²ç¨³å®šå¿«ç…§å’Œæœ‰é™å‘½ä»¤é¢ï¼Œè€Œä¸æ˜¯æ•´ä¸ª store ç§æœ‰å®žçŽ°

## 10. åŠ¨ä½œä½“ç³»

æ‰€æœ‰å¤–å›´äº¤äº’ç»Ÿä¸€æŽ¥å…¥çŽ°æœ‰ action schemaï¼Œå¹¶æ‰©å±• spreadsheet/report designer actionsã€‚

å»ºè®®çš„ spreadsheet å†…å»º actions:

- `spreadsheet:setActiveSheet`
- `spreadsheet:setSelection`
- `spreadsheet:setCellValue`
- `spreadsheet:setCellStyle`
- `spreadsheet:resizeRow`
- `spreadsheet:resizeColumn`
- `spreadsheet:mergeRange`
- `spreadsheet:unmergeRange`
- `spreadsheet:hideRow`
- `spreadsheet:hideColumn`
- `spreadsheet:addSheet`
- `spreadsheet:removeSheet`
- `spreadsheet:undo`
- `spreadsheet:redo`

å»ºè®®çš„ report designer å†…å»º actions:

- `report-designer:dropFieldToTarget`
- `report-designer:updateMeta`
- `report-designer:openInspector`
- `report-designer:closeInspector`
- `report-designer:preview`
- `report-designer:importTemplate`
- `report-designer:exportTemplate`

å¥½å¤„:

- toolbar æŒ‰é’®å¯ç›´æŽ¥è§¦å‘
- inspector è¡¨å•å¯ç›´æŽ¥æäº¤åˆ° designer action
- å­—æ®µæ‹–æ‹½ä¸Žå¿«æ·é”®å¯å¤ç”¨åŒä¸€åŠ¨ä½œåˆ†å‘é“¾

## 11. å›ºå®šå®¿ä¸» Scope

ä¸ºäº†è®© schema ç‰‡æ®µç¨³å®šå·¥ä½œï¼Œ`spreadsheet-page` å’Œ `report-designer-page` å¿…é¡»æ³¨å…¥å›ºå®šå®¿ä¸» scopeã€‚

### `spreadsheet-page` å»ºè®®æš´éœ²

- `workbook`
- `activeSheet`
- `selection`
- `activeCell`
- `activeRange`
- `runtime`

### `report-designer-page` é¢å¤–æš´éœ²

- `designer`
- `fieldDrag`
- `fieldSources`
- `meta`
- `preview`

è¿™æ · inspector å’Œ toolbar schema å¯ä»¥ç¨³å®šå†™æˆ:

```json
{
  "type": "tpl",
  "tpl": "å½“å‰å•å…ƒæ ¼: ${activeCell.address}"
}
```

## 12. æ€§èƒ½ç­–ç•¥

### 12.1 æ–‡æ¡£å½’ä¸€åŒ–

- workbookã€sheetã€rowsã€columnsã€cells é¢„å¤„ç†ä¸ºç´¢å¼•ç»“æž„
- mergesã€style referencesã€visible ranges é¢„ç¼–è¯‘ä¸ºå¿«é€ŸæŸ¥è¯¢ç»“æž„
- inspector åŒ¹é…è§„åˆ™åœ¨åˆå§‹åŒ–é˜¶æ®µç¼–è¯‘

### 12.2 å±€éƒ¨è®¢é˜…

- canvas åªè®¢é˜… sheet/grid/layout çŠ¶æ€
- inspector ä¸»è¦è®¢é˜… selection ä¸Ž active metadata
- field panel ä¸»è¦è®¢é˜… field source ä¸Žæ‹–æ‹½æ€
- ä¸è®©æ•´ä¸ª designer å› å•ä¸ª cell æ”¹åŠ¨å…¨å±€é‡æ¸²æŸ“

### 12.3 å¸ƒå±€ç¼“å­˜

- row/column offsets ç‹¬ç«‹ç¼“å­˜
- merge å‡ ä½•ç¼“å­˜ç‹¬ç«‹ç»´æŠ¤
- visible range ä¸Ž hit-test ç´¢å¼•ç‹¬ç«‹ç»´æŠ¤
- DOM overlay editor åªåœ¨ active edit cell ä¸Šå­˜åœ¨

## 13. ä¸Ž nop-report çš„å…³ç³»

`nop-report` é€‚é…åº”ä½œä¸ºä¸€ä¸ªå¤–éƒ¨ profileï¼Œè€Œä¸æ˜¯å†…å»ºè®¾è®¡å™¨å¥‘çº¦ã€‚

å…¸åž‹é€‚é…å†…å®¹åŒ…æ‹¬:

- å·¦ä¾§å­—æ®µæºå¦‚ä½•æ˜ å°„åˆ°æ•°æ®é›†/å­—æ®µæ ‘
- å•å…ƒæ ¼ metadata å¦‚ä½•æ˜ å°„åˆ° `field`ã€`ds`ã€`expandType` ä¸€ç±»è¯­ä¹‰
- inspector å¦‚ä½•ç»„ç»‡ workbook/sheet/cell çº§å±žæ€§é¡µ
- å¯¼å…¥å¯¼å‡ºå¦‚ä½•æ˜ å°„åˆ° `workbook.xdef`ã€`excel-table.xdef` æˆ– `ExcelWorkbook + Xpt*Model`

è¿™ä¿è¯ `Report Designer` ä»ç„¶å¯ä»¥æœåŠ¡äºŽå…¶ä»–æŠ¥è¡¨æ¨¡æ¿æ¨¡åž‹ã€‚


# Flow Designer æž¶æž„è®¾è®¡

## 1. ç›®æ ‡ä¸Žè¾¹ç•Œ

### 1.1 æ ¸å¿ƒç›®æ ‡

- å°†çŽ°æœ‰ flow editor æç‚¼ä¸ºé€šç”¨å¯é…ç½®è®¾è®¡å™¨èƒ½åŠ›
- å¤–éƒ¨é€šè¿‡ JSON é…ç½®å®šä¹‰ paletteã€èŠ‚ç‚¹ã€ç«¯å£ã€è¿žçº¿ã€å·¥å…·æ ã€å±žæ€§ç¼–è¾‘æ–¹å¼
- å¤ç”¨çŽ°æœ‰ `SchemaRenderer` ä½“ç³»ï¼Œè€Œä¸æ˜¯å¹³è¡Œå†é€ ä¸€å¥—é¡µé¢æ¸²æŸ“è¿è¡Œæ—¶
- åœ¨è¿è¡Œæ—¶ä¿æŒé«˜æ€§èƒ½ï¼Œé¿å…æ¯æ¬¡æ¸²æŸ“éƒ½é‡æ–°è§£é‡Šæ•´ä»½é…ç½®

### 1.2 éžç›®æ ‡

- ä¸ç”Ÿæˆå¤–éƒ¨æºç 
- ä¸æ›¿æ¢çŽ°æœ‰ `apps/main/src/pages/flow-editor` ç¤ºä¾‹
- ä¸æŠŠæ‰€æœ‰ UI éƒ½åšæˆ graph core çš„å†…å»ºé€»è¾‘

## 2. æ€»ä½“æž¶æž„

Flow Designer åº”å®žçŽ°ä¸º `SchemaRenderer` ä¸Šçš„ä¸€å±‚é¢†åŸŸæ‰©å±•ã€‚

```text
+---------------- SchemaRenderer Host ----------------+
|                                                     |
|  designer-page RendererDefinition                   |
|    |                                                |
|    +- toolbar region -> standard schema render      |
|    +- palette region -> designer palette renderer   |
|    +- canvas region  -> graph canvas renderer       |
|    +- inspector     -> standard schema render       |
|                                                     |
|  formulaCompiler / action dispatch / page runtime   |
|  form runtime / dialog host / plugin pipeline       |
+--------------------------+--------------------------+
                           |
                           v
+---------------- Flow Designer Core -----------------+
| graph document | node types | ports | role matcher  |
| permissions    | history    | selection | layout    |
| serialization  | validation | graph actions         |
+-----------------------------------------------------+
```

### 2.1 å½“å‰å·²è½åœ°çš„ MVP

ç›®å‰ä»“åº“é‡Œå·²ç»æœ‰ç¬¬ä¸€ç‰ˆå¯è¿è¡Œå®žçŽ°ï¼Œä½†ä»æ˜¯åˆ»æ„æ”¶æ•›åŽçš„ MVPï¼š

- `@nop-chaos/flow-designer-core` å·²è½åœ°çº¯å†…å­˜ graph runtimeï¼Œè¦†ç›–èŠ‚ç‚¹/è¾¹å¢žåˆ æ”¹æŸ¥ã€å•é€‰ã€undo/redoã€dirty trackingã€save/restoreã€å¯¼å‡ºã€‚
- `@nop-chaos/flow-designer-renderers` å·²è½åœ° `designer-page` å®¿ä¸»ä¸Ž schema/runtime bridgeï¼Œå¹¶é€šè¿‡æœ¬åœ° `ActionScope` æ³¨å†Œ `designer:*` åŠ¨ä½œã€‚
- playground å·²æœ‰å®žé™…ç¤ºä¾‹ï¼Œè¯æ˜Ž schema-driven toolbarã€schema-driven inspectorã€å›ºå®š host scopeã€ä¿å­˜/å¯¼å‡ºå›žè°ƒå¯ä»¥ååŒå·¥ä½œã€‚
- `@xyflow/react` çŽ°åœ¨å·²ç»ä½œä¸º live canvas adapter æŽ¥å…¥ï¼Œä¸”æˆä¸ºé»˜è®¤ç”»å¸ƒï¼›ä¸Žæ­¤åŒæ—¶ï¼Œcard adapter ä¸Ž `xyflow-preview` adapter ä»ä¿ç•™ï¼Œç”¨äºŽ fallbackã€å¥‘çº¦éªŒè¯å’Œæ›´èšç„¦çš„å›žå½’æµ‹è¯•ã€‚

## 3. æ¨¡å—æ‹†åˆ†

### 3.1 `@nop-chaos/flow-designer-core`

èŒè´£ï¼šçº¯å›¾è¿è¡Œæ—¶ï¼Œä¸ä¾èµ– Reactï¼Œä¸ä¾èµ– `SchemaRenderer`ã€‚

å»ºè®®åŒ…å«ï¼š

- graph document ç±»åž‹å®šä¹‰
- node type / edge type / port type é…ç½®æ¨¡åž‹
- role åŒ¹é…å’Œè¿žæŽ¥æ ¡éªŒ
- èŠ‚ç‚¹/è¾¹å¢žåˆ æ”¹æŸ¥
- undo/redo åŽ†å²
- é€‰æ‹©æ€å’Œæ‰¹é‡æ“ä½œæ¨¡åž‹
- å¸ƒå±€æŽ¥å£
- æƒé™åˆ¤æ–­
- æ–‡æ¡£åºåˆ—åŒ–ã€ååºåˆ—åŒ–ã€è¿ç§»
- designer action çš„åº•å±‚æ‰§è¡Œå™¨

å½“å‰ MVP å·²å®žçŽ°çš„é‡ç‚¹èƒ½åŠ›ï¼š

- `GraphDocument` / `GraphNode` / `GraphEdge` / `DesignerConfig`
- `createDesignerCore()`
- `addNode` / `updateNode` / `moveNode` / `duplicateNode` / `deleteNode`
- `copySelection` / `pasteClipboard`
- `addEdge` / `updateEdge` / `deleteEdge`
- `selectNode` / `selectEdge` / `clearSelection`
- `undo` / `redo` / `toggleGrid` / `save` / `restore` / `exportDocument()`
- å•ä¸€ `start` èŠ‚ç‚¹çº¦æŸ

### 3.2 `@nop-chaos/flow-designer-renderers`

èŒè´£ï¼šä¸ŽçŽ°æœ‰ `SchemaRenderer` é›†æˆã€‚

å»ºè®®åŒ…å«ï¼š

- `designer-page`ã€`designer-canvas`ã€`designer-palette` ç­‰ `RendererDefinition`
- `createFlowDesignerRegistry()` æˆ– `registerFlowDesignerRenderers()`
- graph runtime åˆ° schema runtime çš„æ¡¥æŽ¥å±‚
- å®¿ä¸» scope æ³¨å…¥
- `designer:*` action æ³¨å†Œ
- ä¸Ž `@xyflow/react` çš„é€‚é…

å½“å‰ MVP å·²å®žçŽ°çš„é‡ç‚¹èƒ½åŠ›ï¼š

- `designer-page` renderer
- `designer-field` inspector æŽ§ä»¶
- `designer-canvas` / `designer-palette` / `designer-node-card` / `designer-edge-row` å ä½ renderer å®šä¹‰
- `registerFlowDesignerRenderers(registry)` / `createFlowDesignerRegistry()`
- `designer-page` åœ¨è‡ªèº« action-scope è¾¹ç•Œå†…æ³¨å†Œ `designer` namespace providerï¼Œå¹¶è®© toolbar/inspector ç‰‡æ®µæ²¿è¯¥è¾¹ç•Œæ‰§è¡Œ
- å½“å‰ `designer-page` ä¸åªæ˜¯åœ¨ React æ ‘ä¸ŠæŠŠ toolbar/inspector æ”¾åœ¨åŒä¸€ action-scope è¾¹ç•Œé‡Œï¼Œè¿˜ä¼šåœ¨ region render è°ƒç”¨æ—¶æ˜¾å¼é€ä¼  host `scope` ä¸Ž `actionScope`ï¼Œé™ä½ŽåŽç»­ render-path è°ƒæ•´æ—¶ä¸¢å¤± designer namespace ç»‘å®šçš„é£Žé™©
- `designer-page.shortcuts`ï¼Œç”¨äºŽåœ¨å®¿ä¸»å±‚æŠŠé”®ç›˜äº‹ä»¶æ˜ å°„åˆ°å·²æœ‰ `designer:*` / shared action é“¾
- `card` / `xyflow-preview` / `xyflow` ä¸‰ç§ canvas adapterï¼Œç»Ÿä¸€ç»ç”± `DesignerCanvasContent` host æ˜ å°„åˆ° command adapter dispatch

### 3.3 `@xyflow/react` é€‚é…è¾¹ç•Œ

`@xyflow/react` åªä½œä¸º canvas äº¤äº’ä¸Žå¯è§†åŒ–é€‚é…å±‚ï¼Œä¸ä½œä¸º graph æ•°æ®çš„ç¬¬äºŒ source of truthã€‚

å»ºè®®çº¦æŸï¼š

- graph runtime æŒæœ‰ï¼š`document`ã€`viewport`ã€`selection`ã€`activeTarget`ã€historyã€dirtyã€clipboardã€è¿žæŽ¥æ ¡éªŒç›¸å…³çŠ¶æ€
- `@xyflow/react` å¯æŒæœ‰ï¼špointer captureã€dragging ä¸­é—´æ€ã€è¿žçº¿é¢„è§ˆã€èŠ‚ç‚¹å°ºå¯¸æµ‹é‡ã€æ¡†é€‰æ‰‹åŠ¿ä¸­çš„çº¯ UI ä¸´æ—¶æ€
- `onNodesChange`ã€`onEdgesChange`ã€`onConnect`ã€selection change ç­‰å›žè°ƒå…ˆå½’ä¸€åŒ–ä¸º designer bridge commandï¼Œå†è¿›å…¥ `designer:*` action æˆ– core action executor
- canvas adapter ä¸ç›´æŽ¥å†™ graph store çš„ç»“æž„åŒ– document çŠ¶æ€ï¼Œé¿å…åŒå†™å’Œå›žè°ƒçŽ¯
- runtime å¿«ç…§å›žæŽ¨åˆ° canvas æ—¶å¿…é¡»å…è®¸ no-op åˆå¹¶ï¼Œé¿å…å—æŽ§æ›´æ–°é€ æˆäº‹ä»¶å›žçŽ¯

## 4. ä¸ºä»€ä¹ˆä¸åšç‹¬ç«‹å¼•æ“Ž

å‚è€ƒ `packages/flux-react/src/index.tsx:479`ï¼Œå½“å‰ä½“ç³»å·²ç»å…·å¤‡ï¼š

- registry é©±åŠ¨ renderer å‘çŽ°
- schema compile å’ŒåŠ¨æ€å€¼ç¼–è¯‘ç¼“å­˜
- page/form runtime
- scope ä¸Šä¸‹æ–‡
- dialog host
- action dispatch
- plugin ç”Ÿå‘½å‘¨æœŸ

å› æ­¤ Flow Designer ä¸åº”å†é‡å¤å‘æ˜Žï¼š

- ç‹¬ç«‹è¡¨è¾¾å¼åè®®
- ç‹¬ç«‹å±žæ€§é¢æ¿è¡¨å•åè®®
- ç‹¬ç«‹å¼¹çª—ä½“ç³»
- ç‹¬ç«‹æŒ‰é’®åŠ¨ä½œç³»ç»Ÿ
- ç‹¬ç«‹é¡µé¢çº§è¿è¡Œæ—¶

## 5. `designer-page` ç»„ç»‡æ¨¡åž‹

Flow Designer çš„å®¿ä¸» schema é‡‡ç”¨ä¸€ä¸ªæ ¹èŠ‚ç‚¹ç±»åž‹ï¼š`designer-page`ã€‚

æŽ¨èç»“æž„ï¼š

```ts
interface DesignerPageSchema {
  type: 'designer-page'
  id?: string
  title?: string
  document: GraphDocumentInput
  config: DesignerConfig
  toolbar?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
}
```

è¯´æ˜Žï¼š

- `document` æ˜¯å½“å‰å›¾æ–‡æ¡£åˆå§‹å€¼
- `config` æ˜¯ designer ä¸“ç”¨é…ç½®ï¼Œå®šä¹‰ nodeTypesã€portsã€edgeTypes ç­‰é¢†åŸŸè§„åˆ™
- `toolbar`ã€`inspector`ã€`dialogs` æ˜¯å½“å‰å·²å®žé™…æŒ‚è½½çš„ schema ç‰‡æ®µï¼Œç”± `SchemaRenderer` æ¸²æŸ“
- `dialogs` region æœ¬èº«çŽ°åœ¨å·²ç»ä¼šè¢« `DesignerPageRenderer` æŒ‚è½½ï¼›ä½†é€šè¿‡å…±äº« `dialog` action æ‰“å¼€çš„å¼¹çª—ä»ç„¶æ˜¯å¦ä¸€æ¡ dialog runtime è·¯å¾„ï¼Œä¸¤è€…ä¸åº”æ··ä¸ºä¸€è°ˆ

## 6. æ•°æ®æ¨¡åž‹åˆ†å±‚

### 6.1 æŒä¹…åŒ–æ–‡æ¡£

åªä¿å­˜ç¨³å®šçš„ graph æ–‡æ¡£ï¼š

- æ–‡æ¡£å…ƒä¿¡æ¯
- nodes
- edges
- èŠ‚ç‚¹/è¾¹ä¸šåŠ¡æ•°æ®
- å¯é€‰ viewport

ä¸ä¿å­˜ï¼š

- hover
- selection drawer open
- ä¸´æ—¶æ ¡éªŒé”™è¯¯å±•ç¤ºçŠ¶æ€
- æµ®åŠ¨å·¥å…·æ æ˜¾ç¤ºçŠ¶æ€

### 6.2 è¿è¡Œæ—¶çŠ¶æ€

è¿è¡Œæ—¶çŠ¶æ€ç”±ä¸¤å±‚ç»„æˆï¼š

- graph runtime stateï¼šselectionã€historyã€clipboardã€hoverã€active target
- schema runtime stateï¼šform/page/dialog/action ç›¸å…³çŠ¶æ€

äºŒè€…å¿…é¡»åˆ†å±‚ï¼Œé¿å…æŠŠ form runtime å†å¤åˆ¶è¿› Zustandã€‚

### 6.3 graph runtime ä¸Ž schema runtime çš„æ¡¥æŽ¥

æ¡¥æŽ¥å±‚è´Ÿè´£æŠŠ graph runtime æš´éœ²ç»™ `designer-page` ä¸‹çš„ renderer shell ä¸Ž schema ç‰‡æ®µï¼Œä½†å¿…é¡»ä¿æŒå•å‘èŒè´£æ¸…æ™°ã€‚

è¿™é‡Œè¦åŒºåˆ†ä¸¤å±‚å«ä¹‰ï¼š

- ç›®æ ‡æž¶æž„ï¼šschema ç‰‡æ®µå¯ä»¥é€šè¿‡å›ºå®šå®¿ä¸» scope è¯»å– designer åªè¯»å¿«ç…§
- å½“å‰å®žçŽ°ï¼šç¨³å®šå¿«ç…§å·²ç»å­˜åœ¨ï¼Œä½†ä¸»è¦é€šè¿‡ `DesignerContext` æš´éœ²ç»™ Flow Designer è‡ªå·±çš„ React å­ç»„ä»¶ï¼›schema è¡¨è¾¾å¼ scope è¿˜æ²¡æœ‰å®Œæ•´æ‹¿åˆ°åŒä¸€ç»„å­—æ®µ

å½“å‰ä»£ç çœŸç›¸è¯·ä¼˜å…ˆçœ‹ `docs/architecture/flow-designer/runtime-snapshot.md`ã€‚

ç›®æ ‡æ€æ¡¥æŽ¥çº¦æŸå¦‚ä¸‹ï¼š

- schema ç‰‡æ®µé€šè¿‡å›ºå®šå®¿ä¸» scope è¯»å– graph runtime çš„åªè¯»å¿«ç…§
- schema ç‰‡æ®µé€šè¿‡ `designer:*` actions æˆ– bridge dispatch API æäº¤å†™æ“ä½œ
- toolbar / inspector ç‰‡æ®µå½“å‰å·²ç»æ˜¾å¼æ”¶åˆ°è¯¥å®¿ä¸» scope ä¸Ž action-scopeï¼›dialog åˆ™é€šè¿‡å…±äº« dialog runtime ç»§æ‰¿æ‰“å¼€å®ƒæ—¶çš„ action-scopeï¼Œå› æ­¤ä¸ä¼šå½¢æˆç¬¬äºŒæ¡ graph action è·¯å¾„
- schema å±‚ä¸å¾—ç›´æŽ¥æ‹¿åˆ°åº•å±‚ graph store å¹¶åŽŸåœ°ä¿®æ”¹ document
- bridge å¯¹å¤–æš´éœ²çš„æ˜¯ç¨³å®šå¿«ç…§ä¸Žæœ‰é™å‘½ä»¤é¢ï¼Œè€Œä¸æ˜¯æ•´å¥— store ç§æœ‰å®žçŽ°

æŽ¨è bridge æœ€å°èƒ½åŠ›ï¼š

- `getSnapshot()` - è¯»å–å½“å‰ `doc`ã€`selection`ã€`activeNode`ã€`activeEdge`ã€runtime summary
- `dispatch(command)` - æäº¤å½’ä¸€åŒ–åŽçš„ designer å‘½ä»¤
- `subscribe(listener)` - ä¾› renderer shell åšå±€éƒ¨è®¢é˜…
- `emit(event)` - å‘å®¿ä¸»å’Œæ’ä»¶å‘å¸ƒ designer äº‹ä»¶

## 7. èŠ‚ç‚¹ç±»åž‹æ¨¡åž‹

èŠ‚ç‚¹ç±»åž‹é‡‡ç”¨ designer ä¸“ç”¨ configï¼Œä¸ç›´æŽ¥é€€åŒ–æˆæ™®é€š renderer schemaã€‚ä½†èŠ‚ç‚¹ç±»åž‹å†…éƒ¨å…è®¸åµŒå…¥ schema ç‰‡æ®µï¼š
- `inspector.body` - å±žæ€§é¢æ¿
- `createDialog.body` - åˆ›å»ºèŠ‚ç‚¹å¼¹çª—
- `quickActions` - å¿«é€Ÿæ“ä½œæŒ‰é’®
- `emptyState` - ç©ºèŠ‚ç‚¹ç©ºçŠ¶æ€æç¤º

ä½† èŠ‚ç‚¹ç»„ä»¶é€šè¿‡ `body: SchemaInput` æ¸²æŸ“ï¼Œä½¿ç”¨ AMIS Schema ç»„åˆçŽ°æœ‰ renderer
            - å†…ç½®èŠ‚ç‚¹å›¾æ ‡é€šè¿‡ `icon` å­—æ®µï¼ˆkebab-case æ ¼å¼ï¼‰
            - `label`ã€ `description` ç§Šå¤–è§‚æ ·å¼
            - è¾¹æ ‡ç­¾å’Œè¯´æ˜ŽèŠ‚ç‚¹ç±»åž‹
- **èŠ‚ç‚¹ç»„ä»¶æ”¯æŒè‡ªå®šä¹‰ renderer**
  é€šè¿‡åœ¨ `nodeTypes[].body` ä¸­ä½¿ç”¨è‡ªå®šä¹‰ç»„ä»¶ç±»åž‹ï¼ˆå¦‚ `my-custom-node`ï¼‰ï¼Œæ³¨å†ŒåŽé€šè¿‡ AMIS æ¸²æŸ“å™¨å¼•ç”¨ã€‚
            - æˆ–åœ¨ `nodeTypes` ä¸­é…ç½®ä¸€ä¸ªä½¿ç”¨å†…ç½®ç»„ä»¶
            - é€šè¿‡ `nodeTypes[].appearance` é…ç½®åŸºç¡€æ ·å¼ï¼ˆé¢œè‰²ã€è¾¹æ¡†ç­‰ï¼‰
- èŠ‚ç‚¹å†…éƒ¨å…è®¸åµŒå…¥ schema ç‰‡æ®µï¼š
  - `inspector.body` - å±žæ€§é¢æ¿
  - `createDialog.body` - åˆ›å»ºèŠ‚ç‚¹å¼¹çª—
  - `quickActions` - å¿«é€Ÿæ“ä½œæŒ‰é’®
- `emptyState` - ç©ºèŠ‚ç‚¹ç©ºçŠ¶æ€æç¤º

## 8. ç«¯å£ä¼˜å…ˆçš„è¿žæŽ¥æ¨¡åž‹

åªåš node çº§ role ä¸è¶³ä»¥æ”¯æ’‘å¤æ‚è®¾è®¡å™¨ï¼Œå› æ­¤ä¸€å¼€å§‹å°±æ”¯æŒ port çº§å»ºæ¨¡ã€‚

è¿žæŽ¥æ ¡éªŒé¡ºåºï¼š

1. æ ¡éªŒ source port / target port æ˜¯å¦å­˜åœ¨
2. æ ¡éªŒç«¯å£æ–¹å‘æ˜¯å¦æ­£ç¡®
3. æ ¡éªŒ port roles æ˜¯å¦åŒ¹é…
4. è‹¥ port æœªå®šä¹‰ roleï¼Œåˆ™å›žé€€åˆ° node role
5. æ ¡éªŒ maxConnectionsã€self loopã€multi edgeã€é»‘åå•è§„åˆ™
6. æ ¡éªŒ edgeType çº¦æŸ

è¿™æ ·å¯ä»¥æ”¯æŒï¼š

- ä¸€èŠ‚ç‚¹å¤šå…¥å¤šå‡º
- æ¡ä»¶åˆ†æ”¯
- å¹¶è¡ŒèŠ‚ç‚¹
- ç«¯å£çº§æœ€å¤§è¿žæŽ¥æ•°
- æ˜Žç¡®çš„ handle å®šä¹‰

## 9. å±žæ€§ç¼–è¾‘ä¸Žåˆ›å»ºæµç¨‹

### 9.1 å±žæ€§ç¼–è¾‘

å±žæ€§é¢æ¿ç›´æŽ¥ä½¿ç”¨ schema ç‰‡æ®µé©±åŠ¨ï¼Œè€Œä¸æ˜¯å•ç‹¬ç»´æŠ¤å­—æ®µå¼•æ“Žã€‚

ç›®æ ‡æ€æŽ¨èæ–¹å¼ï¼š

- inspector schema ä½¿ç”¨å›ºå®šå®¿ä¸» scope è¯»å– `activeNode` / `activeEdge`
- ä¿å­˜æŒ‰é’®è§¦å‘ `designer:updateNodeData` / `designer:updateEdgeData`
- æ ¡éªŒå¤ç”¨çŽ°æœ‰ form runtime

çŽ°çŠ¶è¡¥å……ï¼š

- é»˜è®¤ inspector ä¸Ž `designer-field` å½“å‰ç›´æŽ¥æ¶ˆè´¹ `DesignerContext.snapshot`
- schema inspector çš„å†™è·¯å¾„å·²ç»å¯ä»¥ç¨³å®šå¤ç”¨ `designer:*` action
- schema inspector çš„è¯»è·¯å¾„è¿˜ä¸åº”åœ¨çŽ°çŠ¶æ–‡æ¡£é‡Œå†™æˆâ€œ`${activeNode.*}` å·²é»˜è®¤å¯ç”¨â€ï¼›å½“å‰è½åœ°çŠ¶æ€è§ `docs/architecture/flow-designer/runtime-snapshot.md`

### 9.2 ä¸¤é˜¶æ®µåˆ›å»º

èŠ‚ç‚¹åˆ›å»ºæ”¯æŒä¸¤ç§è·¯å¾„ï¼š

- ç›´æŽ¥æ‹–æ‹½è½å›¾ï¼Œä½¿ç”¨é»˜è®¤å€¼åˆ›å»º
- è‹¥èŠ‚ç‚¹ç±»åž‹é…ç½®äº† `createDialog.body`ï¼Œåˆ™åœ¨åˆ›å»ºå‰æˆ–åˆ›å»ºåŽç«‹å³å¼¹å‡ºåˆ›å»ºè¡¨å•

è¿™æ ·æ—¢ä¿è¯ç®€å•èŠ‚ç‚¹çš„æ•ˆçŽ‡ï¼Œä¹Ÿè¦†ç›–å¤æ‚èŠ‚ç‚¹åˆå§‹åŒ–åœºæ™¯ã€‚

## 10. åŠ¨ä½œä½“ç³»

æ‰€æœ‰å¤–å›´äº¤äº’ç»Ÿä¸€æŽ¥å…¥çŽ°æœ‰ action schemaï¼Œå¹¶æ‰©å±• designer actionã€‚

å»ºè®®çš„å†…å»º actionï¼š

- `designer:addNode`
- `designer:deleteSelection`
- `designer:duplicateSelection`
- `designer:connect`
- `designer:disconnect`
- `designer:openInspector`
- `designer:closeInspector`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:autoLayout`
- `designer:fitView`
- `designer:undo`
- `designer:redo`
- `designer:exportDocument`
- `designer:setSelection`
- `designer:moveNodes`
- `designer:updateMultipleNodes`
- `designer:addEdge`
- `designer:beginTransaction`
- `designer:commitTransaction`
- `designer:rollbackTransaction`

å½“å‰ MVP å®žé™…å·²æŽ¥çº¿çš„åŠ¨ä½œå­é›†æ˜¯ï¼š

- `designer:addNode`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:copySelection`
- `designer:pasteClipboard`
- `designer:duplicateSelection`
- `designer:deleteSelection`
- `designer:undo`
- `designer:redo`
- `designer:toggleGrid`
- `designer:save`
- `designer:restore`
- `designer:export`

å¥½å¤„ï¼š

- toolbar æŒ‰é’®å¯ç›´æŽ¥è§¦å‘
- inspector è¡¨å•å¯ç›´æŽ¥æäº¤åˆ° designer action
- å¿«æ·é”®å’Œæµ®åŠ¨å·¥å…·æ å¯å¤ç”¨åŒä¸€åŠ¨ä½œåˆ†å‘é“¾

å½“å‰ playground é‡Œçš„åˆ é™¤ç¡®è®¤å·²ç»ç”¨å…±äº« `dialog` / `closeDialog` action å’Œ schema ç»„åˆå®žçŽ°ï¼Œè¯´æ˜Ž destructive UX ä¸éœ€è¦é¢å¤–ç¡¬ç¼–ç è¿› core æˆ– renderer runtimeã€‚

å½“å‰ playground é‡Œçš„é”®ç›˜å¿«æ·é”®ä¹Ÿä¿æŒåœ¨å®¿ä¸» schema å±‚å®šä¹‰ï¼Œé€šè¿‡ `designer-page.shortcuts` æŠŠ `Ctrl/Cmd+Z`ã€`Ctrl/Cmd+Y`ã€`Ctrl/Cmd+C`ã€`Ctrl/Cmd+V` å’Œ `Delete` æ˜ å°„åˆ°çŽ°æœ‰ actionï¼›renderer åªè´Ÿè´£ç›‘å¬å¹¶åˆ†å‘ï¼Œcore ä¸ç›´æŽ¥æ„ŸçŸ¥å…·ä½“æŒ‰é”®ç­–ç•¥ã€‚

å½“å‰å¡ç‰‡å¼ canvas è¿˜é¢å¤–å®žçŽ°äº† hover-driven quick-action shellï¼šèŠ‚ç‚¹å’Œè¾¹çš„ Edit / Duplicate / Delete åªæ˜¯åœ¨ renderer å±‚æŒ‰ hover æˆ– active çŠ¶æ€æ˜¾éšï¼ŒçœŸæ­£çš„åˆ é™¤ã€å¤åˆ¶ã€é€‰ä¸­ä»ç„¶èµ°æ—¢æœ‰ command/action è¾¹ç•Œã€‚

å½“å‰ `designer-page` è¿˜å†…å»ºäº†çª„å± inspector fallbackï¼šå½“è§†å£æ”¶çª„åˆ°ç§»åŠ¨å¸ƒå±€æ—¶ï¼Œå³ä¾§ inspector ä¸å†å¼ºä¾èµ–ä¸‰æ å¸ƒå±€ï¼Œè€Œæ˜¯æŠ˜å ä¸ºä½äºŽ canvas ä¸‹æ–¹çš„å¯å±•å¼€é¢æ¿ï¼›é€‰æ‹©èŠ‚ç‚¹æˆ–è¾¹æ—¶ä¼šè‡ªåŠ¨å±•å¼€ï¼Œä½† inspector schemaã€nodeTypes/edgeTypes çš„ `inspector.body` å¥‘çº¦ä¿æŒä¸å˜ã€‚

å½“å‰ playground è¿˜è¡¥ä¸Šäº†è½»é‡ viewport controls parityï¼šrenderer shell æš´éœ² Zoom in / Zoom out / Fit view æŽ§ä»¶ä¸Žå¿«æ·é”®ï¼Œåº•å±‚ä»ç„¶é€šè¿‡ core command ä¿®æ”¹ `GraphDocument.viewport`ï¼Œç”¨æ¥è¯æ˜Žç¼©æ”¾å’Œè§†å£æ‘˜è¦ä¹Ÿå¯ä»¥æ²¿ç”¨åŒä¸€æ¡ command/history/action è¾¹ç•Œï¼Œè€Œä¸æ˜¯åšæˆç‹¬ç«‹é¡µé¢å±€éƒ¨çŠ¶æ€ã€‚

å½“å‰ card/list canvas ä¹ŸåŠ å…¥äº† minimap-style overview shellï¼šå®ƒä»ç„¶ä¸æ˜¯æœ€ç»ˆ `@xyflow/react` minimap é€‚é…å™¨ï¼Œè€Œæ˜¯ renderer å±‚åŸºäºŽèŠ‚ç‚¹åæ ‡ç”Ÿæˆçš„è½»é‡æ¦‚è§ˆå›¾ï¼Œç”¨äºŽéªŒè¯ overview UIã€èŠ‚ç‚¹ç©ºé—´åˆ†å¸ƒæ‘˜è¦ä»¥åŠâ€œä»Žæ¦‚è§ˆé€‰æ‹©èŠ‚ç‚¹â€è¿™ç±»äº¤äº’åŒæ ·å¯ä»¥å¤ç”¨æ—¢æœ‰ selection/inspector è¾¹ç•Œã€‚

å½“å‰ edge list ä¸Ž export shell ä¹Ÿå¼€å§‹æ›´æŽ¥è¿‘ legacy parityï¼šedge row ä¸å†åªæ˜¾ç¤º label å’Œ source/targetï¼Œè€Œæ˜¯é¢å¤–æš´éœ² condition æ‘˜è¦ä¸Ž line-style badgeï¼›playground çš„ latest export é¢æ¿åˆ™ä¼šä»Žå¯¼å‡ºçš„ JSON ä¸­è§£æžèŠ‚ç‚¹æ•°ã€è¾¹æ•°ã€line styles å’Œ viewport zoomï¼Œå¸®åŠ©éªŒè¯ inspector æ”¹åŠ¨æ˜¯å¦å¦‚é¢„æœŸåæ˜ åˆ°å¯¼å‡ºç»“æž„ã€‚

å½“å‰ card/list canvas è¿˜è¡¥ä¸Šäº†ä¸€ä¸ªè½»é‡ connection mode shellï¼šç”¨æˆ·å¯ä»¥å…ˆä»ŽèŠ‚ç‚¹ quick action æˆ– footer è¿›å…¥â€œStart connectionâ€ï¼Œå†ç‚¹å‡»ç¬¬äºŒä¸ªèŠ‚ç‚¹å®Œæˆ `addEdge`ï¼Œä»Žè€Œåœ¨çœŸæ­£æŽ¥å…¥ `@xyflow/react` handles å‰ï¼Œå…ˆéªŒè¯â€œè¿žæŽ¥ affordance åªæ˜¯ renderer äº‹ä»¶æ¡¥æŽ¥ï¼ŒçœŸæ­£çš„è¿žçº¿ mutation ä»èµ° core command/history è¾¹ç•Œâ€ã€‚

å½“å‰ playground toolbar ä¹Ÿç»§ç»­æœ document-level flow actions è¡¥é½ï¼šåƒ `Clear Selection` è¿™ç±»åŠ¨ä½œä»ç„¶ä¿æŒ schema-drivenï¼Œç”± host toolbar ç›´æŽ¥ dispatch `designer:*` actionï¼Œè€Œä¸æ˜¯æŠŠè¿™ç±»é¡µé¢å‘½ä»¤ç¡¬ç¼–ç è¿›å…±äº« runtime UIã€‚

å½“å‰ card/list canvas ä¹Ÿå¼€å§‹æ˜¾å¼æ¨¡æ‹Ÿ pane-click è¯­ä¹‰ï¼šç‚¹å‡»ç©ºç™½ canvas surface ä¼šé€€å‡º connection mode å¹¶æ¸…ç©º selectionï¼Œç”¨æ¥å…ˆéªŒè¯æœªæ¥ `@xyflow/react` pane click åˆ° `clearSelection` çš„æ¡¥æŽ¥å¥‘çº¦ã€‚

å½“å‰ renderer å†…éƒ¨ä¹Ÿå¼€å§‹æŠŠ card/list MVP è§†å›¾æç‚¼æˆå•ç‹¬ canvas adapter ç»„ä»¶ï¼Œå…ˆæŠŠçŽ°æœ‰ shell äº¤äº’ä»Ž page shell ä¸­æ‹†å‡ºåŽ»ï¼Œä¸ºåŽç»­æ›¿æ¢æˆçœŸæ­£çš„ `@xyflow/react` adapter åšè¾¹ç•Œæ”¶æ•›ã€‚

å½“å‰ `designer-page` ä¹Ÿå¼€å§‹æ˜¾å¼æŽ¥å— `canvasAdapter` é€‰æ‹©ï¼Œrenderer å†…éƒ¨å·²ç»å¯ä»¥åœ¨åŒä¸€å¥— host scope / core command å¥‘çº¦ä¸Šåˆ‡æ¢ card adapter ä¸Ž xyflow-preview adapterï¼Œç”¨æ¥å…ˆå›ºå®š callback/selection/connect è¯­ä¹‰ï¼Œå†è½çœŸæ­£çš„ `@xyflow/react` ä¾èµ–ã€‚

### 10.1 äº‹åŠ¡ä¸ŽåŽ†å²è¾¹ç•Œ

Flow Designer éœ€è¦ç»Ÿä¸€çš„äº‹åŠ¡è¾¹ç•Œï¼Œå³ä½¿åŽ†å²åº•å±‚å®žçŽ°æœ€ç»ˆåŒæ—¶æ”¯æŒ patch å’Œ snapshot ä¸¤ç§å­˜å‚¨æ–¹å¼ã€‚

å¿…é¡»æ»¡è¶³ï¼š

- æ‹–æ‹½ä¸€ä¸ªæˆ–å¤šä¸ªèŠ‚ç‚¹åªäº§ç”Ÿä¸€æ¡é€»è¾‘åŽ†å²è®°å½•
- è‡ªåŠ¨å¸ƒå±€ã€æ‰¹é‡åˆ é™¤ã€æ‰¹é‡æ›´æ–°ç­‰å¤åˆæ“ä½œå¯åŒ…è£¹åœ¨åŒä¸€ transaction ä¸­
- action handler ä¸å¾—å„è‡ªå†™å‡ºç‹¬ç«‹åŽ†å²æ ¼å¼ï¼›å¿…é¡»è¿›å…¥ç»Ÿä¸€ operation/history pipeline
- patch ä¸Ž snapshot çš„å–èˆå¯ä»¥æŒ‰ operation ç±»åˆ«å†³å®šï¼Œä½† undo/redo è¯­ä¹‰å¿…é¡»ç¨³å®š

## 11. å›ºå®šå®¿ä¸» Scope

æœ¬èŠ‚æè¿°çš„æ˜¯ç›®æ ‡æž¶æž„ï¼Œä¸ç­‰åŒäºŽå½“å‰ä»£ç å·²ç»å®Œæ•´è½åœ°çš„ host scope æ³¨å…¥çŠ¶æ€ã€‚

å½“å‰çœŸå®ž snapshot å¥‘çº¦ã€`DesignerContext` æš´éœ²é¢ï¼Œä»¥åŠå“ªäº›å­—æ®µå°šæœªè¿›å…¥ schema è¡¨è¾¾å¼ scopeï¼Œè¯·å…ˆçœ‹ `docs/architecture/flow-designer/runtime-snapshot.md`ã€‚

ç›®æ ‡ä¸Šï¼Œä¸ºäº†è®© schema ç‰‡æ®µç¨³å®šå·¥ä½œï¼Œ`designer-page` åº”æ³¨å…¥å›ºå®šå®¿ä¸» scopeã€‚

æŽ¨èæš´éœ²ï¼š

- `doc`ï¼šå½“å‰ graph æ–‡æ¡£
- `selection`ï¼šå½“å‰é€‰ä¸­æ‘˜è¦
- `activeNode`ï¼šå½“å‰æ¿€æ´»èŠ‚ç‚¹
- `activeEdge`ï¼šå½“å‰æ¿€æ´»è¾¹
- `runtime`ï¼šåªè¯»è¿è¡Œæ—¶èƒ½åŠ›æ‘˜è¦
- `actions`ï¼šä¾› schema å±‚å¼•ç”¨çš„è¾…åŠ©èƒ½åŠ›

å¦‚æžœåŽç»­è¿™å¥— host scope çœŸæ­£è½åœ°ï¼Œinspector å’Œ toolbar schema å¯ä»¥ç¨³å®šå†™æˆï¼š

```json
{
  "type": "tpl",
  "tpl": "å½“å‰èŠ‚ç‚¹ï¼š${activeNode.data.label}"
}
```

## 12. æ€§èƒ½ç­–ç•¥

### 12.1 ç¼–è¯‘ä¼˜å…ˆ

- designer é…ç½®åˆå§‹åŒ–æ—¶è§£æžä¸º normalized config
- nodeTypesã€portsã€edgeTypes é¢„ç¼–è¯‘ä¸ºç´¢å¼•ç»“æž„
- schema ç‰‡æ®µäº¤ç”±çŽ°æœ‰ schema compiler ç¼–è¯‘
- graph action handler é¢„æ³¨å†Œ

### 12.2 å±€éƒ¨è®¢é˜…

- canvas åªè®¢é˜…å›¾çŠ¶æ€
- inspector ä¸»è¦è®¢é˜… `activeNode` / `activeEdge`
- palette ä¸»è¦è®¢é˜… nodeTypes å’Œå¯åˆ›å»ºæ€§æ‘˜è¦
- ä¸è®©æ•´ä¸ª designer å› å•èŠ‚ç‚¹å±žæ€§å˜åŠ¨å…¨å±€é‡æ¸²æŸ“

### 12.3 ç¼“å­˜ç­–ç•¥

- node type lookup ä½¿ç”¨ Map
- port matcher é¢„ç¼–è¯‘ä¸ºå¿«é€Ÿåˆ¤å®šç»“æž„
- action handler æ³¨å†Œè¡¨å¸¸é©»ç¼“å­˜
- schema fragment ä½¿ç”¨ç¼–è¯‘ç»“æžœå¤ç”¨
- edges å»ºè®®ç»´æŠ¤æŒ‰ `source` / `target` / `port` çš„é‚»æŽ¥ç´¢å¼•ï¼Œé¿å…é«˜é¢‘è¿žæŽ¥æ ¡éªŒé€€åŒ–ä¸ºå…¨è¡¨æ‰«æ

### 12.4 å¢žé‡æ›´æ–°

- æ›´æ–°å•èŠ‚ç‚¹æ•°æ®åªæ›¿æ¢è¯¥èŠ‚ç‚¹å¼•ç”¨
- åŽ†å²è®°å½•æŒ‰æ“ä½œå¿«ç…§æˆ– patch ç®¡ç†
- é¿å…æ¯æ¬¡ `JSON.stringify` å…¨æ–‡æ¡£æ¯”è¾ƒè„çŠ¶æ€
- store selector åº”ä¼˜å…ˆä¾èµ–ç»“æž„å…±äº«å’Œæµ…æ¯”è¾ƒï¼Œé¿å… inspectorã€paletteã€canvas äº’ç›¸æ”¾å¤§é‡æ¸²æŸ“

### 12.5 å¤§å›¾åœºæ™¯

éœ€è¦æŠŠ 1000+ èŠ‚ç‚¹å’Œå¤æ‚è¿žçº¿è§†ä¸ºæ˜Žç¡®åŽ‹åŠ›åœºæ™¯ï¼Œè€Œä¸æ˜¯å®žçŽ°åŽçš„è¡¥å……ä¼˜åŒ–ã€‚

å»ºè®®çº¦æŸï¼š

- inspector åªè®¢é˜… active targetï¼Œä¸è®¢é˜…æ•´ä»½ document
- paletteã€minimapã€selection overlay å„è‡ªä½¿ç”¨ç‹¬ç«‹ selector
- è‡ªåŠ¨å¸ƒå±€ã€æ‰¹é‡æ ¡éªŒã€å¯¼å‡ºå¯é‡‡ç”¨åˆ†æ‰¹æˆ–å»¶è¿Ÿæ‰§è¡Œ
- å¯¹å¤§å›¾ä¸é»˜è®¤æ‰¿è¯ºæ‰€æœ‰ UI é¢æ¿éƒ½éšæ¯æ¬¡èŠ‚ç‚¹ç§»åŠ¨å®žæ—¶å…¨é‡æ›´æ–°

## 13. æ‰©å±•æœºåˆ¶

æ‰©å±•ä¼˜å…ˆçº§ï¼š

1. designer config
2. schema fragments
3. renderer registry
4. plugins

æ”¯æŒçš„æ‰©å±•ç‚¹ï¼š

- è‡ªå®šä¹‰ node renderer
- è‡ªå®šä¹‰ edge renderer
- è‡ªå®šä¹‰ designer action
- è‡ªå®šä¹‰ layout engine
- è‡ªå®šä¹‰ document validator
- è‡ªå®šä¹‰é¢„è®¾

### 13.1 äº‹ä»¶ä¸Žç”Ÿå‘½å‘¨æœŸ

é™¤å‘½ä»¤å¼ action ä¹‹å¤–ï¼Œè¿˜éœ€è¦æ˜Žç¡®çš„äº‹ä»¶ä¸Žç”Ÿå‘½å‘¨æœŸæ‰©å±•ç‚¹ã€‚

å»ºè®®è‡³å°‘è¦†ç›–ï¼š

- `selectionChanged`
- `nodeAdded`
- `nodeMoved`
- `edgeConnected`
- `documentChanged`
- `validationFailed`
- `historyCommitted`

ç”Ÿå‘½å‘¨æœŸ hook æŽ¨èåŒºåˆ†ä¸¤ç±»ï¼š

- before hooksï¼šå…è®¸æ‹’ç»æˆ–æ”¹å†™ create/connect/delete ç­‰è¾“å…¥
- after hooksï¼šåªåšè§‚å¯Ÿã€å®¡è®¡ã€åŒæ­¥ã€å‰¯ä½œç”¨æ´¾å‘

ä¸è¦æŠŠè¿™ä¸¤ç±»èƒ½åŠ›æ··åœ¨æ™®é€š store subscribe é‡Œã€‚

## 14. é”™è¯¯å¤„ç†ä¸Žæµ‹è¯•åˆ†å±‚

éœ€è¦æŠŠé”™è¯¯ä¸Žæµ‹è¯•è¾¹ç•Œå†™æˆå®žçŽ°çº¦æŸï¼Œè€Œä¸åªæ˜¯å®žçŽ°ç»†èŠ‚ã€‚

é”™è¯¯è‡³å°‘åˆ†ä¸ºï¼š

- config normalize / validate é”™è¯¯
- migration é”™è¯¯
- permission / rule expression é”™è¯¯
- graph action æ‰§è¡Œé”™è¯¯
- canvas adapter / renderer é›†æˆé”™è¯¯

æµ‹è¯•å»ºè®®åˆ†å±‚ï¼š

- `core`ï¼šçº¯æ–‡æ¡£å˜æ¢ã€è¿žæŽ¥æ ¡éªŒã€historyã€migrationã€permission evaluationã€transaction åˆå¹¶
- `renderers`ï¼šå®¿ä¸» scope æ³¨å…¥ã€`designer:*` action æŽ¥çº¿ã€schema inspector/createDialog é›†æˆã€canvas adapter äº’æ“ä½œ

## 15. ä¸Žæ—§ç¤ºä¾‹çš„å…³ç³»

- æ—§ç¤ºä¾‹ç»§ç»­ä¿ç•™ï¼Œä½œä¸ºå•é¡µæ¼”ç¤ºå’Œäº¤äº’å‚è€ƒ
- æ–°æ¨¡å—ä¸ç›´æŽ¥ä¾µå…¥æ—§ç¤ºä¾‹ç»“æž„
- çŽ°åœ¨å·²ç»æœ‰ä¸€ä¸ªåŸºäºŽ `designer-page` çš„ playground parity exampleï¼Œä½†å®ƒä»ç„¶æ˜¯ç¬¬ä¸€é˜¶æ®µ MVPï¼Œä¸ä»£è¡¨å·²ç»å®Œæˆå…¨éƒ¨ legacy parity

## 16. æŽ¨èè½åœ°é¡ºåº

1. å®šä¹‰ `core` æ–‡æ¡£æ¨¡åž‹ä¸Žé…ç½®æ¨¡åž‹
2. å®žçŽ° role/port matcher å’Œ graph action åŸºç¡€èƒ½åŠ›
3. å®žçŽ° `designer-page`ã€`designer-canvas`ã€`designer-palette`
4. æŽ¥å…¥ fixed scope å’Œ `designer:*` action
5. ç”¨ schema ç‰‡æ®µè·‘é€š inspector / create dialog
6. æœ€åŽè¡¥é½ presetã€layoutã€å¯¼å‡ºã€éªŒè¯


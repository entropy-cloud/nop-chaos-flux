# Flow Designer API

## 1. åŒ…è¾¹ç•Œ

### `@nop-chaos/flow-designer-core`

è´Ÿè´£çº¯å›¾ç¼–è¾‘è¿è¡Œæ—¶ã€‚

å½“å‰ MVP å·²å¯¼å‡ºï¼š

- `GraphDocument`
- `GraphNode`
- `GraphEdge`
- `DesignerConfig`
- `NodeTypeConfig`
- `EdgeTypeConfig`
- `PaletteGroupConfig`
- `DesignerSnapshot`
- `DesignerCommand`
- `createDesignerCore()`

ä»å±žäºŽåŽç»­æ‰©å±•çš„å†…å®¹ï¼š

- `PortConfig`
- `validateDesignerConfig()`
- `migrateDesignerDocument()`
- `createDesignerMigrationRegistry()`
- `DesignerMigrationError`

### `@nop-chaos/flow-designer-renderers`

è´Ÿè´£å’Œ `SchemaRenderer` é›†æˆã€‚

å½“å‰ MVP å·²å¯¼å‡ºï¼š

- `flowDesignerRendererDefinitions`
- `registerFlowDesignerRenderers(registry)`
- `createFlowDesignerRegistry()`
- `createDesignerActionProvider(core)`

å½“å‰å®žçŽ°è¯´æ˜Žï¼š

- `designer:*` åŠ¨ä½œä¸æ˜¯é€šè¿‡ root `actionHandlers` æ³¨å…¥ï¼Œä¹Ÿä¸æ˜¯é€šè¿‡ä¿®æ”¹ built-in action switch å®žçŽ°ï¼Œè€Œæ˜¯ç”± `designer-page` åœ¨è‡ªèº« `ActionScope` è¾¹ç•Œå†…æ³¨å†Œ `designer` namespace providerã€‚
- `designer-page` è´Ÿè´£åˆ›å»º `DesignerCore`ï¼Œå¹¶å‘å†…éƒ¨ React renderer å­æ ‘æš´éœ² `DesignerContext`ï¼›å…³äºŽå½“å‰ snapshot å¥‘çº¦ä¸Ž host scope è½åœ°çŠ¶æ€ï¼Œè§ `docs/architecture/flow-designer/runtime-snapshot.md`ã€‚
- `designer-page` å½“å‰è¿˜ä¼šæŠŠ designer host `scope` ä¸Žå½“å‰ `actionScope` æ˜¾å¼ä¼ ç»™ `toolbar` / `inspector` / `dialogs` region renderï¼Œå› æ­¤è¿™äº› schema ç‰‡æ®µä¸æ˜¯ä»…é â€œä½äºŽåŒä¸€ React å­æ ‘â€æ‰å¯ç”¨ï¼Œè€Œæ˜¯æ˜Žç¡®ç»‘å®šåˆ°åŒä¸€ä»½ designer snapshot è§†å›¾ä¸Ž namespace è¾¹ç•Œã€‚
- ä¿å­˜å’Œå¯¼å‡ºé€šè¿‡ `env.functions.saveFlowDocument` ä¸Ž `env.functions.publishFlowExport` å›žä¼ ç»™ playground å®¿ä¸»ã€‚
- å½“å‰ clipboard ä¹Ÿæ˜¯ core è‡ªèº«èƒ½åŠ›ï¼Œå…ˆæ”¯æŒå•èŠ‚ç‚¹ copy/pasteï¼Œå¹¶é€šè¿‡ `designer:copySelection` / `designer:pasteClipboard` å¯¹å¤–æš´éœ²ã€‚
- å½“å‰åˆ é™¤ç¡®è®¤ä¸é€šè¿‡ä¸“ç”¨ designer action å®žçŽ°ï¼Œè€Œæ˜¯ç”± `designer-page` å¤–å›´ schema ä½¿ç”¨å…±äº« `dialog` action åŒ…è£… `designer:deleteSelection`ã€‚
- å½“å‰é”®ç›˜å¿«æ·é”®ä¹Ÿä¸é€šè¿‡ core å†…å»ºæŒ‰é”®è¡¨å®žçŽ°ï¼Œè€Œæ˜¯ç”± `designer-page.shortcuts` åœ¨å®¿ä¸»å±‚å£°æ˜Žï¼Œå†å¤ç”¨åŒä¸€æ¡ action dispatch é“¾ã€‚
- å½“å‰çª„å±å“åº”å¼è¡Œä¸ºä¹Ÿç•™åœ¨ `designer-page` shellï¼šrenderer è´Ÿè´£æ ¹æ® media query æŠŠ inspector åˆ‡æ¢æˆ canvas ä¸‹æ–¹çš„å¯å±•å¼€é¢æ¿ï¼Œä½† inspector schema å’Œ nodeTypes/edgeTypes çš„å­—æ®µç‰‡æ®µä¸éœ€è¦æ”¹å†™æˆç§»åŠ¨ç«¯ä¸“ç”¨åè®®ã€‚
- å½“å‰ minimap ä»æ˜¯ renderer shell å±‚çš„è½»é‡ overview å®žçŽ°ï¼šå®ƒåŸºäºŽå½“å‰ `doc.nodes` åæ ‡ç”Ÿæˆ overview æŒ‰é’®å¹¶å¤ç”¨ `selectNode`ï¼Œå°šæœªåˆ‡åˆ° live `xyflow` è‡ªå¸¦ minimapï¼Œä½†è¿™ä¸å½±å“ä¸»ç”»å¸ƒå·²ç»é»˜è®¤èµ°çœŸå®ž `xyflow` adapterã€‚
- å½“å‰ playground export é¢æ¿ä¼šç›´æŽ¥æ¶ˆè´¹ `designer:export` é€šè¿‡ `env.functions.publishFlowExport` å›žä¼ çš„ JSON å­—ç¬¦ä¸²ï¼Œå¹¶åœ¨å®¿ä¸»å±‚æ´¾ç”Ÿ export summaryï¼›è¿™è¯´æ˜Žå¯¼å‡ºåŽçš„ç»“æž„æ£€æŸ¥ä»ç„¶åº”ç”± host/example è´Ÿè´£ï¼Œè€Œä¸æ˜¯æŠŠå±•ç¤ºé€»è¾‘å¡žå›ž core æˆ– renderer action æœ¬èº«ã€‚
- å½“å‰ `card` ä¸Ž `xyflow-preview` adapter ä¹Ÿæä¾›äº† renderer-local çš„ connect/reconnect shellï¼šè¿›å…¥è¿žæŽ¥æ¨¡å¼åŽï¼Œç¬¬äºŒæ¬¡ç‚¹å‡»èŠ‚ç‚¹ä¼šè½¬æˆ `addEdge` commandï¼›reconnect ä¹Ÿæ˜¯å…ˆè®°å½•å¾… reconnect çš„ edgeï¼Œå†æŠŠç›®æ ‡èŠ‚ç‚¹ç‚¹å‡»å½’ä¸€åŒ–æˆ `reconnectEdge` commandã€‚live `xyflow` åˆ™é€šè¿‡çœŸå®ž `@xyflow/react` å›žè°ƒç¿»è¯‘åˆ°åŒä¸€æ¡å‘½ä»¤é“¾ï¼Œä¸‰è€…éƒ½ä¸æ”¹å˜ core ä½œä¸ºå”¯ä¸€ graph mutation source of truth çš„è¾¹ç•Œã€‚
- å½“å‰ host toolbar è¿˜å¯ä»¥ç»§ç»­å£°æ˜Ž document-level flow actionsï¼Œä¾‹å¦‚ `designer:clearSelection`ï¼›è¿™ç±»åŠ¨ä½œä¾æ—§é€šè¿‡ `designer-page` æ‰€åœ¨çš„æœ¬åœ° `ActionScope` è§£æžï¼Œè€Œä¸æ˜¯è¦æ±‚ renderer è‡ªå¸¦ä¸€å¥—é¡µé¢å‘½ä»¤æŒ‰é’®åè®®ã€‚
- å½“å‰ pane-click è¯­ä¹‰å·²ç»åœ¨å…¨éƒ¨ canvas adapter ä¸Šç»Ÿä¸€ï¼šç©ºç™½ surface click ä¼šå½’ä¸€åŒ–ä¸ºé€€å‡º connect/reconnect intent å¹¶æ¸…ç† selectionï¼›`card` / `xyflow-preview` ç”¨æ˜¾å¼ shell å¤çŽ°è¯¥è¯­ä¹‰ï¼Œlive `xyflow` åˆ™ç›´æŽ¥æ˜ å°„çœŸå®ž pane äº‹ä»¶ã€‚
- å½“å‰ renderer å†…éƒ¨å·²ç»æŠŠ canvas æŠ½åˆ°å•ç‹¬ adapter ç»„ä»¶æ–‡ä»¶ï¼Œ`designer-page` å’Œ host scope ä¸éœ€è¦æ„ŸçŸ¥åº•å±‚å®žçŽ°ï¼›çŽ°åœ¨ä¸æ˜¯â€œåŽç»­å†æ›¿æ¢æˆçœŸå®ž xyflowâ€ï¼Œè€Œæ˜¯å·²ç»åœ¨åŒä¸€ props å¥‘çº¦ä¸‹åŒæ—¶æ‰¿è½½ `card`ã€`xyflow-preview` å’Œ live `xyflow`ã€‚
- å½“å‰ `designer-page` è¿˜æ”¯æŒ `canvasAdapter` propï¼Œç”¨äºŽåœ¨ renderer å†…éƒ¨åˆ‡æ¢ `card`ã€`xyflow-preview` ä¸Ž `xyflow` adapterï¼›preview ç”¨æ¥æå‰é”å®š `onPaneClick`ã€selection bridgeã€connect bridge ç­‰è¡Œä¸ºå¥‘çº¦ï¼Œè€Œ live `xyflow` åˆ™å¤ç”¨åŒä¸€å¥— callback surface æŽ¥å…¥çœŸå®ž `@xyflow/react`ã€‚
- å½“å‰é»˜è®¤ç”»å¸ƒå·²ç»åˆ‡åˆ° live `xyflow`ï¼šå¦‚æžœ `designer-page` æœªæ˜¾å¼ä¼  `canvasAdapter`ï¼Œrenderer ä¼šé»˜è®¤èµ° `xyflow`ï¼Œè€Œ `card` ä»…ä½œä¸ºæ˜¾å¼ fallback / parity harness ä¿ç•™ã€‚
- å½“å‰ target ä¾§æŠŠ card canvas äº¤äº’æŠ½æˆ `DesignerCardCanvasBridge`ï¼Œå¹¶ä¸Ž `DesignerXyflowPreviewBridge`ã€`DesignerXyflowCanvasBridge` ä¸€èµ·å¤ç”¨åŒä¸€å¥— snapshot + bridge callbacksï¼›è¿™æ ·ä¸åŒç”»å¸ƒå®žçŽ°åªè´Ÿè´£ UI æ‰‹åŠ¿ç¿»è¯‘ï¼Œä¸éœ€è¦å„è‡ªé‡å»º command è¾¹ç•Œã€‚
- å½“å‰ target ä¾§åŒæ—¶ä¿ç•™ `DesignerXyflowPreviewBridge` å’Œ live `DesignerXyflowCanvasBridge`ï¼špreview ä»ç”¨äºŽå¥‘çº¦ rehearsal å’Œæ›´èšç„¦çš„å›žå½’æµ‹è¯•ï¼Œlive `xyflow` åˆ™ä½œä¸ºé»˜è®¤ç”»å¸ƒæ‰¿æ‹…çœŸå®žäº¤äº’ã€‚
- å½“å‰ bridge callback surface å·²å›ºå®šè¦†ç›–ç§»åŠ¨èŠ‚ç‚¹ã€viewport è°ƒæ•´ã€connection å’Œ reconnectï¼šä¸åŒ canvas adapter éƒ½é€šè¿‡æ˜¾å¼ `onMoveNode`ã€`onViewportChange`ã€`onStartConnection`ã€`onCancelConnection`ã€`onCompleteConnection`ã€`onStartReconnect`ã€`onCancelReconnect`ã€`onCompleteReconnect` å›žè°ƒæŠŠäº¤äº’å½’ä¸€åŒ–æˆ command dispatchï¼Œè€Œä¸æ˜¯åœ¨ bridge å†…è‡ªè¡Œç»´æŠ¤ç¬¬äºŒä»½ graph mutation çŠ¶æ€ã€‚
- å½“å‰ bridge host å¯¹ connect/reconnect completion å¤±è´¥ä¹Ÿå·²å›ºå®šè¯­ä¹‰ï¼šå¦‚æžœ `addEdge` / `reconnectEdge` è¢« duplicate-edgeã€self-loop æˆ– missing-node ç­‰å…±äº«çº¦æŸæ‹’ç»ï¼Œhost ä»ä¿æŒ pending connection source æˆ– reconnecting edge çš„æœ¬åœ° intent çŠ¶æ€ï¼Œè®©ç”¨æˆ·å¯ä»¥ç›´æŽ¥æ”¹é€‰ç›®æ ‡æˆ–å–æ¶ˆï¼Œè€Œä¸æ˜¯å¤±è´¥åŽç«‹å³ä¸¢å¤±å½“å‰æ“ä½œä¸Šä¸‹æ–‡ã€‚

## 2. `designer-page` Schema

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
- `config` åŒ…å« `toolbar?: ToolbarConfig` å’Œ `shortcuts?: ShortcutsConfig`ï¼Œè¯¦è§ `config-schema.md`
- `toolbar` / `inspector` / `dialogs` æ˜¯å¯é€‰çš„ schema ç‰‡æ®µè¦†ç›–ï¼Œå¦‚æžœ `config.toolbar` å·²å®šä¹‰ï¼Œè¿™é‡Œé€šå¸¸ä¸éœ€è¦å†é…ç½®

`designer-page` æ˜¯å®¿ä¸»å…¥å£ï¼Œä¸æ˜¯æ™®é€šå®¹å™¨çš„ç®€å•åˆ«åã€‚å®ƒè´Ÿè´£ï¼š

- åˆå§‹åŒ– graph runtime
- å°† graph runtime æ³¨å…¥å›ºå®šå®¿ä¸» scope
- æ¸²æŸ“ paletteã€canvasã€inspector åŒºåŸŸ
- åœ¨æœ¬åœ° `ActionScope` å†…æ³¨å†Œ `designer:*` actions

å½“å‰ region wiring çº¦æŸï¼š

- `toolbar`ã€`inspector`ã€`dialogs` éƒ½æ˜¯æ™®é€š schema ç‰‡æ®µï¼Œrenderer ä¼šæ˜¾å¼ç»™å®ƒä»¬é€ä¼  host `scope` ä¸Ž `actionScope`
- é€šè¿‡å…±äº« `dialog` action æ‰“å¼€çš„å¼¹çª—ä»èµ°å…±äº« dialog runtimeï¼›å®ƒä»¬ä¸Žå¸¸é©» `dialogs` region ä¸æ˜¯åŒä¸€æ¡æ¸²æŸ“è·¯å¾„ï¼Œä½†ä¼šç»§æ‰¿è§¦å‘å®ƒçš„ action scopeï¼Œå› æ­¤ dialog å†…ä¹Ÿå¯ä»¥ç»§ç»­ dispatch `designer:*`

### `designer-page` bridge contract

`designer-page` è¿˜è´Ÿè´£å»ºç«‹ graph runtime ä¸Ž schema runtime çš„ bridgeã€‚

æŽ¨èæœ€å°æŽ¥å£ï¼š

```ts
interface DesignerBridge {
  getSnapshot(): DesignerHostSnapshot
  subscribe(listener: () => void): () => void
  dispatch(command: DesignerCommand): DesignerCommandResult
  emit(event: DesignerEvent): void
}
```

çº¦æŸï¼š

- schema ç‰‡æ®µåªè¯» bridge snapshotï¼Œä¸ç›´æŽ¥æ”¹ graph store
- graph å†™æ“ä½œå¿…é¡»é€šè¿‡ `dispatch(command)` æˆ–æ˜ å°„åŽçš„ `designer:*` action
- `@xyflow/react` å›žè°ƒå…ˆè½¬æ¢ä¸º `DesignerCommand`ï¼Œå†è¿›å…¥ core æ‰§è¡Œé“¾
- canvas bridge ç»„ä»¶åªæ¶ˆè´¹ `snapshot` å’Œæ˜¾å¼ bridge callbacksï¼Œä¾‹å¦‚ `onPaneClick`ã€`onNodeSelect`ã€`onEdgeSelect`ã€`onDuplicateNode`ã€`onDeleteNode`ã€`onDeleteEdge`ã€`onMoveNode`ã€`onViewportChange`ã€`onStartConnection`ã€`onCancelConnection`ã€`onCompleteConnection`ã€`onStartReconnect`ã€`onCancelReconnect`ã€`onCompleteReconnect`ï¼›bridge host å¯ä»¥æŒæœ‰ä¸´æ—¶ UI intentï¼ˆå¦‚ pending connection source æˆ– reconnecting edge idï¼‰ï¼Œä½†ä¸å¾—æŠŠ graph mutation æœ¬èº«åˆ†å‰åˆ° command adapter ä¹‹å¤–

å½“å‰ bridge çš„ä¸»è¦æ¶ˆè´¹è€…æ˜¯ `designer-page` è‡ªèº«ã€`designer-field` inspector æŽ§ä»¶ï¼Œä»¥åŠ playground çš„ toolbar/inspector schemaã€‚

## 3. å›ºå®šå®¿ä¸» Scope

å›ºå®šå®¿ä¸» scope ä»ç„¶æ˜¯ Flow Designer çš„ç›®æ ‡æž¶æž„ï¼Œä½†å½“å‰ä»£ç é‡Œâ€œçœŸå®žå·²è½åœ°çš„ snapshot å¥‘çº¦â€å’Œâ€œå°šæœªå®Œæ•´æŽ¥çº¿åˆ° schema è¡¨è¾¾å¼ scope çš„å­—æ®µâ€éœ€è¦åˆ†å¼€çœ‹ã€‚

å½“å‰å»ºè®®ç›´æŽ¥æŸ¥é˜…:

- `docs/architecture/flow-designer/runtime-snapshot.md` - å½“å‰ `DesignerSnapshot`ã€`DesignerContextValue`ã€å·²æŽ¥çº¿å­—æ®µã€æœªæŽ¥çº¿å­—æ®µ
- `docs/architecture/flow-designer/collaboration.md` - `designer-page`ã€ActionScopeã€command adapterã€canvas hostã€inspector çš„åä½œé“¾è·¯

æœ¬èŠ‚åªä¿ç•™ API çº§ç»“è®º:

- Flow Designer å·²ç»å­˜åœ¨ç¨³å®šçš„ `DesignerSnapshot` å¥‘çº¦
- å½“å‰ snapshot ä¸»è¦é€šè¿‡ `DesignerContext` æš´éœ²ç»™ Flow Designer è‡ªå·±çš„ React å­ç»„ä»¶
- schema å±‚å½“å‰æœ€ç¨³å®šçš„èƒ½åŠ›æ˜¯ `designer:*` namespaced actions
- toolbar / inspector / dialog ä¸­è§¦å‘çš„ schema action å½“å‰éƒ½æ²¿ç”¨åŒä¸€æ¡ `designer-page` -> local `ActionScope` -> `designer` namespace provider è·¯å¾„
- `dialogs` region ç‰‡æ®µæœ¬èº«çŽ°åœ¨ä¹Ÿå·²ç»æ˜¯ live mountï¼Œè€Œä¸æ˜¯ä»…å­˜åœ¨äºŽ schema shape ä¸­çš„ä¿ç•™å­—æ®µ
- `${doc.*}`ã€`${selection.*}`ã€`${activeNode.*}`ã€`${activeEdge.*}`ã€`${runtime.*}` è¿™ç±» designer host scope å˜é‡ä¸åº”åœ¨çŽ°çŠ¶è¯´æ˜Žä¸­å†™æˆâ€œå·²å…¨éƒ¨è½åœ°â€

## 4. Designer Actions

Flow Designer æ‰©å±•çŽ°æœ‰ action schemaï¼Œæ–°å¢žä¸€ç»„ graph actionã€‚

### `designer:addNode`

```ts
{
  action: 'designer:addNode',
  nodeType: 'task',
  position?: { x: number, y: number },
  data?: Record<string, unknown>,
  openInspector?: boolean
}
```

### `designer:updateNodeData`

```ts
{
  action: 'designer:updateNodeData',
  nodeId: string,
  patch: Record<string, unknown>
}
```

### `designer:updateEdgeData`

```ts
{
  action: 'designer:updateEdgeData',
  edgeId: string,
  patch: Record<string, unknown>
}
```

### `designer:updateMultipleNodes`

```ts
{
  action: 'designer:updateMultipleNodes',
  patches: Array<{
    nodeId: string,
    patch: Record<string, unknown>
  }>
}
```

### `designer:moveNodes`

```ts
{
  action: 'designer:moveNodes',
  moves: Array<{
    nodeId: string,
    position: { x: number, y: number }
  }>,
  transaction?: string
}
```

### `designer:setSelection`

```ts
{
  action: 'designer:setSelection',
  nodeIds?: string[],
  edgeIds?: string[]
}
```

### `designer:addEdge`

```ts
{
  action: 'designer:addEdge',
  source: string,
  target: string,
  sourcePort?: string,
  targetPort?: string,
  edgeType?: string,
  data?: Record<string, unknown>
}
```

### `designer:deleteSelection`

```ts
{
  action: 'designer:deleteSelection'
}
```

### `designer:openInspector`

```ts
{
  action: 'designer:openInspector',
  target?: {
    type: 'node' | 'edge',
    id: string
  }
}
```

### `designer:autoLayout`

```ts
{
  action: 'designer:autoLayout',
  algorithm?: 'dagre' | 'elk' | 'preset'
}
```

### `designer:beginTransaction`

```ts
{
  action: 'designer:beginTransaction',
  label?: string,
  transactionId?: string
}
```

### `designer:commitTransaction`

```ts
{
  action: 'designer:commitTransaction',
  transactionId?: string
}
```

### `designer:rollbackTransaction`

```ts
{
  action: 'designer:rollbackTransaction',
  transactionId?: string
}
```

### å…¶ä»–å»ºè®®å†…å»ºåŠ¨ä½œ

- `designer:duplicateSelection`
- `designer:undo`
- `designer:redo`
- `designer:fitView`
- `designer:disconnect`
- `designer:exportDocument`

å½“å‰ MVP å·²ç»å®žé™…è½åœ°å¹¶éªŒè¯çš„åŠ¨ä½œåŒ…æ‹¬ï¼š

- `designer:addNode`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:copySelection`
- `designer:pasteClipboard`
- `designer:duplicateSelection`
- `designer:deleteSelection`
- `designer:undo`
- `designer:redo`
- `designer:zoomIn`
- `designer:zoomOut`
- `designer:fitView`
- `designer:toggleGrid`
- `designer:save`
- `designer:restore`
- `designer:export`

ä»åœ¨è®¾è®¡é‡Œä½†å°šæœªè½åœ°ä¸ºå½“å‰ playground è¡Œä¸ºçš„åŠ¨ä½œåŒ…æ‹¬ï¼š

- `designer:updateMultipleNodes`
- `designer:moveNodes`
- `designer:setSelection`
- `designer:openInspector`
- `designer:autoLayout`
- `designer:beginTransaction`
- `designer:commitTransaction`
- å¤šèŠ‚ç‚¹æˆ–å¸¦è¾¹çš„ clipboard å¤åˆ¶
- `designer:rollbackTransaction`

è¯´æ˜Žï¼š

- ç¨‹åºåŒ– selectionã€æ‰¹é‡æ›´æ–°ã€èŠ‚ç‚¹ç§»åŠ¨ã€è¿žæŽ¥åˆ›å»ºéƒ½åº”èµ°ç»Ÿä¸€ action/history pipeline
- transaction è¾¹ç•Œæ˜¯å¿…é¡»çº¦æŸï¼›history çš„åº•å±‚å­˜å‚¨å¯ä»¥æŒ‰ operation ç±»åˆ«é€‰æ‹© patch æˆ– snapshot

## 5. Renderers

å»ºè®®çš„ renderer ç±»åž‹ï¼š

- `designer-page`
- `designer-canvas`
- `designer-palette`
- `designer-inspector-shell`

å…¶ä¸­ï¼š

- `designer-canvas` è´Ÿè´£ `@xyflow/react` é›†æˆ
- `designer-palette` è´Ÿè´£æ‹–æ‹½ä¸Žå¿«é€Ÿåˆ›å»º
- inspector å†…éƒ¨è¡¨å•ä»ä¼˜å…ˆä½¿ç”¨å·²æœ‰ form renderer

`designer-canvas` éœ€è¦éµå®ˆä»¥ä¸‹è¾¹ç•Œï¼š

- åªæŠŠ gesture/canvas äº‹ä»¶ç¿»è¯‘ä¸º designer commands
- ä¸ç›´æŽ¥æŒä¹…åŒ– graph document
- å¯¹ runtime å›žæŽ¨çš„å—æŽ§å€¼åš no-op åˆå¹¶ï¼Œé¿å…æ›´æ–°å›žçŽ¯

## 6. æ‰©å±•ç‚¹

### è‡ªå®šä¹‰èŠ‚ç‚¹æ¸²æŸ“

é€šè¿‡ registry æ³¨å†Œ node renderer æˆ–æŒ‡å®š renderer variantã€‚

### è‡ªå®šä¹‰ designer action

å¯ä»¥æ‰©å±•æ–°çš„ `designer:*` actionã€‚

### è‡ªå®šä¹‰å¸ƒå±€å¼•æ“Ž

é€šè¿‡ core æš´éœ²çš„ layout æŽ¥å£æ³¨å…¥ã€‚

### è‡ªå®šä¹‰æ–‡æ¡£æ ¡éªŒ

åœ¨ä¿å­˜å‰æ‰§è¡Œ graph validatorã€‚

### ç”Ÿå‘½å‘¨æœŸ hook ä¸Žäº‹ä»¶

å»ºè®®é¢å¤–æš´éœ²ï¼š

```ts
interface DesignerLifecycleHooks {
  beforeCreateNode?(input: CreateNodeInput): CreateNodeInput | false
  beforeConnect?(input: ConnectInput): ConnectInput | false
  beforeDelete?(target: DeleteTarget): DeleteTarget | false
  afterCommand?(event: DesignerEvent): void
}
```

ä»¥åŠæœ€å°äº‹ä»¶é›†ï¼š

- `selectionChanged`
- `nodeAdded`
- `nodeMoved`
- `edgeConnected`
- `documentChanged`
- `validationFailed`
- `historyCommitted`

## 7. æ€§èƒ½çº¦æŸ

å®žçŽ°æ—¶å»ºè®®ä¿è¯ï¼š

- é…ç½®åˆå§‹åŒ–åŽå½¢æˆ Map ç´¢å¼•
- ç«¯å£ä¸Žè¾¹åŒ¹é…ä¸åš O(n^2) å­—ç¬¦ä¸²æ‰«æ
- inspector åªè®¢é˜… active target
- schema ç‰‡æ®µä½¿ç”¨ç¼–è¯‘ç¼“å­˜
- graph ä¿®æ”¹å°½é‡å¢žé‡æ›´æ–°
- edge adjacency å»ºè®®é¢„å»ºç´¢å¼•
- selector æ›´æ–°ä¾èµ–ç»“æž„å…±äº«å’Œæµ…æ¯”è¾ƒ
- å¯¹å¤§å›¾ä¸­çš„è‡ªåŠ¨å¸ƒå±€ã€æ‰¹é‡æ ¡éªŒã€å¯¼å‡ºå…è®¸åˆ†æ‰¹æ‰§è¡Œ

## 8. é”™è¯¯æ¨¡åž‹ä¸Žæµ‹è¯•è¾¹ç•Œ

å»ºè®®æŠŠé”™è¯¯è‡³å°‘åˆ†ä¸ºï¼š

- config validation error
- migration error
- expression evaluation error
- graph command error
- renderer integration error

æµ‹è¯•è¾¹ç•Œå»ºè®®ï¼š

- `core` è´Ÿè´£çº¯çŠ¶æ€ä¸Žè§„åˆ™æµ‹è¯•
- `renderers` è´Ÿè´£ bridgeã€scope æ³¨å…¥ã€action æŽ¥çº¿ã€canvas adapter é›†æˆæµ‹è¯•

## 9. å…¸åž‹ä½¿ç”¨æ–¹å¼

```ts
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react'
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers'

const registry = createDefaultRegistry()
registerFlowDesignerRenderers(registry)

const SchemaRenderer = createSchemaRenderer()

export function WorkflowDesignerPage() {
  return (
    <SchemaRenderer
      schema={designerSchema}
      registry={registry}
      env={env}
      formulaCompiler={formulaCompiler}
      data={{}}
    />
  )
}
```

## 10. åŽç»­å®žçŽ°å»ºè®®

- å…ˆç¨³å®š `core` æ–‡æ¡£ä¸Žè§„åˆ™æŽ¥å£ï¼Œå†æŽ¥ renderer
- å…ˆè·‘é€š `designer-page + canvas + addNode + inspector`
- å†è¡¥ `ports + connection validation + createDialog`
- æœ€åŽè¡¥ auto layoutã€å¯¼å‡ºã€presetã€å¤æ‚æ ¡éªŒ


# Flow Designer åä½œç»†èŠ‚

## Purpose

æœ¬æ–‡èšç„¦å½“å‰ `flow-designer2` é‡Œå„å±‚å¦‚ä½•åä½œï¼Œè€Œä¸æ˜¯é‡å¤å®šä¹‰é…ç½®æ¨¡åž‹æˆ–ç”»å¸ƒ APIã€‚

é€‚ç”¨åœºæ™¯:

- æƒ³å¿«é€Ÿçœ‹æ‡‚ `designer-page` ä»ŽæŒ‚è½½åˆ°å¯äº¤äº’çš„å®Œæ•´é“¾è·¯
- æƒ³å®šä½ toolbar / inspector / canvas ä¸ºä»€ä¹ˆéƒ½èƒ½å¤ç”¨åŒä¸€å¥— runtime
- æƒ³ç¡®è®¤ graph mutationã€SchemaRenderer runtimeã€canvas adapter ä¹‹é—´çš„èŒè´£è¾¹ç•Œ

## Current Code Anchors

å…ˆä»Žè¿™äº›æ–‡ä»¶å¯¹ç…§é˜…è¯»:

- `packages/flux-react/src/index.tsx`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-core/src/core.ts`
- `apps/playground/src/App.tsx`

## ä¸€å¥è¯æ¨¡åž‹

Flow Designer ä¸æ˜¯ç‹¬ç«‹é¡µé¢å¼•æ“Žï¼Œè€Œæ˜¯æŠŠå›¾ç¼–è¾‘èƒ½åŠ›æ‹†æˆä¸¤å±‚åŽæŒ‚åˆ°çŽ°æœ‰ `SchemaRenderer` ä½“ç³»ä¸Š:

1. `@nop-chaos/flow-designer-core` æŒæœ‰ graph document å’Œ graph command
2. `@nop-chaos/flow-designer-renderers` æŠŠ graph èƒ½åŠ›æŽ¥åˆ° SchemaRenderer çš„ regionã€scopeã€actionã€dialogã€formã€canvas adapter ä¸Š

å¯ä»¥æŠŠå½“å‰å®žçŽ°ç†è§£æˆ:

```text
schema-driven host shell
  -> designer-page renderer
  -> DesignerCore + command adapter
  -> snapshot exposed to schema fragments
  -> graph mutations routed back through designer:* or command dispatch
```

## åä½œåˆ†å±‚

### 1. é€šç”¨ schema/runtime å±‚

è¿™å±‚æ¥è‡ª `amis-schema`ã€`amis-runtime`ã€`amis-react`ã€‚

å®ƒè´Ÿè´£:

- schema ç¼–è¯‘
- scope é“¾å’Œå±€éƒ¨ scope åˆ›å»º
- page/form runtime
- built-in action + namespaced action åˆ†å‘
- React context å’Œ region æ¸²æŸ“

Flow Designer å¤ç”¨è¿™å±‚ï¼Œè€Œä¸æ˜¯é‡æ–°åšä¸€å¥—é¡µé¢çŠ¶æ€æœºã€‚

### 2. Flow Designer domain core

è¿™å±‚æ¥è‡ª `@nop-chaos/flow-designer-core`ã€‚

å®ƒè´Ÿè´£:

- `GraphDocument` / `GraphNode` / `GraphEdge`
- selection
- undo / redo
- save / restore / export
- viewport / grid
- node / edge CRUD å’Œ reconnect

è¿™é‡Œæ‰æ˜¯ graph state çš„å”¯ä¸€ source of truthã€‚

### 3. Flow Designer renderer bridge

è¿™å±‚æ¥è‡ª `@nop-chaos/flow-designer-renderers`ã€‚

å®ƒè´Ÿè´£:

- å®šä¹‰ `designer-page` è¿™ç±» renderer
- åˆ›å»º `DesignerCore`
- æŠŠ snapshot æš´éœ²ç»™ toolbar / inspector / canvas
- æ³¨å†Œ `designer` namespace provider
- æŠŠ UI æ‰‹åŠ¿ç¿»è¯‘æˆ command

### 4. Canvas adapter å±‚

è¿™å±‚ç”± `card` / `xyflow-preview` / `xyflow` ä¸‰ç§ adapter ç»„æˆã€‚

å®ƒåªè´Ÿè´£:

- å±•ç¤ºå½“å‰ snapshot
- æŠŠ click / drag / connect / reconnect ç­‰ UI æ‰‹åŠ¿ç¿»è¯‘æˆæ˜¾å¼ callback

å®ƒä¸ç›´æŽ¥ä¿®æ”¹ graph documentã€‚

## èŒè´£è¾¹ç•Œ

| å±‚ | æŒæœ‰çŠ¶æ€ | å¯å†™ graph | å…³å¿ƒ schema | å…¸åž‹å…¥å£ |
| --- | --- | --- | --- | --- |
| `flux-runtime` / `flux-react` | page, form, scope, dialog, action scope | å¦ | æ˜¯ | `createRendererRuntime()`, `RenderNodes` |
| `flow-designer-core` | document, selection, history, viewport, grid | æ˜¯ | å¦ | `createDesignerCore()` |
| `flow-designer-renderers` | bridge host local intent | é—´æŽ¥ | æ˜¯ | `DesignerPageRenderer` |
| canvas adapters | UI library local transient state | å¦ | å¦ | `renderDesignerCanvasBridge()` |

å½“å‰æœ‰ä¸€ä¸ªå¾ˆé‡è¦çš„è§„åˆ™:

- graph mutation åªèƒ½è½åˆ° `DesignerCore`
- schema fragment åªèƒ½è¯» snapshot å’Œå‘å‘½ä»¤
- canvas adapter åªèƒ½ç¿»è¯‘ UI æ‰‹åŠ¿

## æŒ‚è½½åä½œé“¾è·¯

`designer-page` çœŸæ­£ä¾èµ–çš„æ˜¯é€šç”¨ `NodeRenderer` å…ˆç»™å®ƒæ­å¥½ runtime è¾¹ç•Œï¼Œå†åœ¨å®ƒè‡ªå·±çš„ç»„ä»¶é‡Œåˆ›å»º graph runtimeã€‚

### è°ƒç”¨é“¾å›¾: `designer-page` é¦–æ¬¡æŒ‚è½½

```text
host schema
  -> SchemaRenderer
  -> RenderNodes
  -> NodeRenderer(designer-page compiled node)
  -> NodeRenderer sees actionScopePolicy: 'new'
  -> runtime.createActionScope(...)
  -> DesignerPageRenderer
  -> createDesignerCore(document, config)
  -> useDesignerSnapshot(core.subscribe)
  -> actionScope.registerNamespace('designer', provider)
  -> render toolbar region / palette / canvas / inspector region
```

```mermaid
flowchart TD
  A[SchemaRenderer] --> B[RenderNodes]
  B --> C[NodeRenderer for designer-page]
  C --> D[new ActionScope boundary]
  D --> E[DesignerPageRenderer]
  E --> F[createDesignerCore(document, config)]
  E --> G[createDesignerActionProvider(core)]
  G --> H[register namespace designer]
  E --> I[subscribe to core snapshot]
  E --> J[render toolbar / canvas / inspector]
```

è¿™é‡Œæœ‰ä¸¤ä¸ªå…³é”®ç‚¹:

- `designer-page` çš„ renderer definition æŠŠ `actionScopePolicy` è®¾æˆäº† `'new'`ï¼Œæ‰€ä»¥å®ƒä¼šæ‹¿åˆ°è‡ªå·±çš„ action namespace è¾¹ç•Œ
- toolbar å’Œ inspector æ˜¯ `designer-page` çš„ regionsï¼Œå› æ­¤å®ƒä»¬å¤©ç„¶è¿è¡Œåœ¨è¿™ä¸ªæ–°çš„ `designer` action scope é‡Œé¢
- å½“å‰ `DesignerPageRenderer` åœ¨ region render è°ƒç”¨é‡Œä¹Ÿæ˜¾å¼é€ä¼ äº† `actionScope` å’Œ designer host `scope`ï¼Œè¿™æ ·å³ä½¿åŽç»­ region è°ƒç”¨ä½ç½®è°ƒæ•´ï¼Œtoolbar / inspector ç‰‡æ®µä»ç„¶ä¼šæ˜Žç¡®ç»‘å®šåˆ°åŒä¸€ä¸ª designer namespace è¾¹ç•Œä¸Ž snapshot è§†å›¾
- `dialogs` çŽ°åœ¨ä¹Ÿä¼šé€šè¿‡åŒæ ·çš„ region render è°ƒç”¨è¢«æŒ‚åˆ° `designer-page` shell ä¸Šï¼Œå¹¶æ˜¾å¼æ”¶åˆ°åŒä¸€ä»½ designer host `scope` ä¸Ž `actionScope`
- ä½†é€šè¿‡å…±äº« `dialog` action runtime æ‰“å¼€çš„å¼¹çª—ä»ç„¶æ˜¯å¦ä¸€æ¡è·¯å¾„ï¼›å®ƒä»¬ä¸æ˜¯è¿™ä¸ªå¸¸é©» `dialogs` region çš„æ›¿èº«ï¼Œè€Œæ˜¯å…±äº« dialog host ä¸Šçš„å¼¹çª—å®žä¾‹
- è¿™äº›è¡Œä¸ºçŽ°åœ¨éƒ½ç”± renderer å›žå½’æµ‹è¯•é”å®šï¼š`toolbar` / `inspector` / `dialogs` ä¸‰ä¸ªå¸¸é©» region éƒ½å¯ä»¥è¯»å–æ³¨å…¥åŽçš„ designer host scopeï¼›å…¶ä¸­ `toolbar`ã€`dialogs` ä¸Ž `inspector` ä¹Ÿéƒ½å·²è¦†ç›–ç›´æŽ¥ dispatch `designer:*` çš„å†™è·¯å¾„ï¼Œè€Œ dialog action æ‰“å¼€çš„å†…å®¹åŒæ ·ä¼šç»§æ‰¿åŒä¸€ä¸ª designer action scope

## æ–‡ä»¶çº§åä½œå›¾

å¦‚æžœè¦ä»Žæºç æ–‡ä»¶è§’åº¦è¿½è°ƒç”¨é“¾ï¼Œå¯ä»¥æŒ‰ä¸‹é¢è¿™æ¡ä¸»è·¯å¾„çœ‹ã€‚

### æ–‡ä»¶çº§è°ƒç”¨é“¾å›¾: ä»Žå®¿ä¸»æŒ‚è½½åˆ° graph mutation

```text
apps/playground/src/App.tsx
  -> registerFlowDesignerRenderers(registry)
  -> SchemaRenderer(schema)

packages/flux-react/src/index.tsx
  -> createRendererRuntime(...)
  -> RenderNodes
  -> NodeRenderer(designer-page)

packages/flow-designer-renderers/src/index.tsx
  -> DesignerPageRenderer
  -> createDesignerCore(document, config)
  -> createDesignerActionProvider(core)
  -> DesignerCanvasContent

packages/flow-designer-renderers/src/canvas-bridge.tsx
  -> card / xyflow-preview / xyflow callbacks

packages/flow-designer-renderers/src/designer-command-adapter.ts
  -> normalize command result / validation failure / unchanged semantics

packages/flow-designer-core/src/core.ts
  -> mutate document / selection / history / viewport
  -> emit events

packages/flow-designer-renderers/src/index.tsx
  -> useDesignerSnapshot(core.subscribe)
  -> rerender toolbar / canvas / inspector from latest snapshot
```

```mermaid
flowchart TD
  A[apps/playground/src/App.tsx] --> B[packages/flux-react/src/index.tsx]
  B --> C[packages/flow-designer-renderers/src/index.tsx]
  C --> D[packages/flow-designer-renderers/src/canvas-bridge.tsx]
  C --> E[packages/flow-designer-renderers/src/designer-command-adapter.ts]
  E --> F[packages/flow-designer-core/src/core.ts]
  F --> C
```

é˜…è¯»é¡ºåºå»ºè®®:

1. å…ˆçœ‹ `apps/playground/src/App.tsx` æ€Žä¹ˆæ³¨å†Œ renderers
2. å†çœ‹ `packages/flux-react/src/index.tsx` æ€Žä¹ˆç»™ `designer-page` å»ºç«‹ runtime / action scope è¾¹ç•Œ
3. å†çœ‹ `packages/flow-designer-renderers/src/index.tsx` æ€Žä¹ˆåˆ›å»º coreã€æ³¨å†Œ `designer` namespaceã€æ¸²æŸ“ canvas host
4. æœ€åŽçœ‹ `packages/flow-designer-renderers/src/designer-command-adapter.ts` å’Œ `packages/flow-designer-core/src/core.ts` çš„å‘½ä»¤è½åœ°

## ä¸ºä»€ä¹ˆ toolbar / inspector å¯ä»¥ç›´æŽ¥ç”¨ `designer:*`

æ ¹æœ¬åŽŸå› ä¸æ˜¯å®ƒä»¬â€œçŸ¥é“ core åœ¨å“ªâ€ï¼Œè€Œæ˜¯å®ƒä»¬è¿è¡Œåœ¨ `designer-page` åˆ›å»ºçš„æ–° action scope é‡Œã€‚

åä½œè¿‡ç¨‹å¦‚ä¸‹:

1. `NodeRenderer` ä¸º `designer-page` å»ºç«‹æ–°çš„ `ActionScope`
2. `DesignerPageRenderer` åœ¨è¿™ä¸ª scope ä¸Šæ³¨å†Œ `designer` namespace provider
3. `toolbar` å’Œ `inspector` region é€šè¿‡ `RenderNodes` åœ¨åŒä¸€ä¸ª scope ä¸‹æ¸²æŸ“ï¼›å½“å‰ renderer è¿˜æ˜¾å¼æŠŠ `actionScope` ä¼ ç»™ region renderï¼Œé¿å…è¿™æ¡ä¾èµ–é“¾åªé  React context çš„éšå¼ç»§æ‰¿
4. è¿™äº› schema é‡Œçš„ `onClick: { action: 'designer:undo' }` æœ€ç»ˆéƒ½èƒ½è¢« namespaced action dispatcher è§£æžåˆ°

è¿™ä¹Ÿæ˜¯ä¸ºä»€ä¹ˆ Flow Designer ä¸éœ€è¦æŠŠä¸€å † domain action ç¡¬ç¼–ç è¿› built-in action switchã€‚

å½“å‰ region èƒ½åŠ›çŸ©é˜µå¯ç›´æŽ¥å‚è€ƒ `docs/architecture/flow-designer/runtime-snapshot.md` çš„ â€œRegion capability matrixâ€ï¼Œé‚£é‡ŒæŠŠ `toolbar` / `inspector` / `dialogs` / shared dialog popup çš„ mountã€è¯» scopeã€å†™ actionã€å›žå½’è¦†ç›–çŠ¶æ€æ±‡æ€»åœ¨ä¸€èµ·äº†ã€‚

## Action åä½œé“¾è·¯

### è°ƒç”¨é“¾å›¾: schema toolbar æŒ‰é’®è§¦å‘ `designer:undo`

```text
toolbar button schema
  -> compiled event action
  -> renderer event handler
  -> helpers.dispatch(action)
  -> runtime.dispatch(action, ctx)
  -> action dispatcher sees namespaced action
  -> actionScope.resolve('designer:undo')
  -> designer provider.invoke('undo')
  -> commandAdapter.execute({ type: 'undo' })
  -> core.undo()
  -> core emits historyChanged/documentChanged
  -> useDesignerSnapshot receives update
  -> designer-page rerenders
```

```mermaid
sequenceDiagram
  participant S as Toolbar Schema
  participant R as Runtime Dispatch
  participant AS as ActionScope
  participant P as Designer Provider
  participant CA as Command Adapter
  participant C as DesignerCore
  participant V as DesignerPage View

  S->>R: dispatch designer:undo
  R->>AS: resolve(designer:undo)
  AS-->>R: provider + method
  R->>P: invoke(undo)
  P->>CA: execute({ type: 'undo' })
  CA->>C: undo()
  C-->>V: emit snapshot-changing events
  V-->>S: rerender with new snapshot
```

åä½œé‡ç‚¹:

- schema å±‚å‘çš„æ˜¯ actionï¼Œä¸æ˜¯ç›´æŽ¥è°ƒ `core.undo()`
- provider å±‚è´Ÿè´£æŠŠ `designer:*` è§„èŒƒåŒ–ä¸º command
- command adapter è´Ÿè´£è¿”å›žç»Ÿä¸€ç»“æžœç»“æž„ï¼Œå¦‚ `ok`ã€`error`ã€`reason`ã€`snapshot`

## Canvas åä½œé“¾è·¯

Canvas æ˜¯å½“å‰åä½œé‡Œæœ€å®¹æ˜“è¯¯è§£çš„ä¸€å±‚ã€‚

å½“å‰å®žçŽ°ä¸æ˜¯:

```text
xyflow state == graph state
```

è€Œæ˜¯:

```text
graph state lives in core
xyflow only reflects snapshot and emits gestures
```

### è°ƒç”¨é“¾å›¾: ç”»å¸ƒè¿žçº¿

```text
canvas adapter gesture
  -> bridge callback
  -> DesignerCanvasContent host
  -> dispatch addEdge / reconnectEdge command
  -> command adapter validates and executes
  -> core mutates document and emits events
  -> snapshot subscription updates
  -> adapter rerenders from latest snapshot
```

```mermaid
flowchart LR
  A[Canvas Gesture] --> B[Canvas Bridge Callback]
  B --> C[DesignerCanvasContent]
  C --> D[DesignerCommandAdapter]
  D --> E[DesignerCore]
  E --> F[Snapshot Update]
  F --> G[Canvas Adapter Rerender]
```

### è°ƒç”¨é“¾å›¾: live `xyflow` çš„ `onConnect`

```text
ReactFlow onConnect(connection)
  -> DesignerXyflowCanvasBridge
  -> onStartConnection(sourceId)
  -> onCompleteConnection(targetId)
  -> DesignerCanvasContent dispatch({ type: 'addEdge' })
  -> DesignerCommandAdapter.execute(...)
  -> DesignerCore.addEdge(...)
  -> emit documentChanged
  -> useDesignerSnapshot setState
  -> createXyflowEdges(snapshot) rerender
```

è¿™é‡Œæœ€é‡è¦çš„åä½œçº¦æŸæ˜¯:

- host å¯ä»¥ä¿ç•™ä¸´æ—¶ UI intentï¼Œä¾‹å¦‚ `pendingConnectionSourceId`ã€`reconnectingEdgeId`
- ä½† host ä¸æ‹¥æœ‰ç¬¬äºŒä»½ document
- adapter è‡ªå·±ä¹Ÿä¸å…è®¸ç»•è¿‡ command adapter åŽ»å†™ graph state

### å¤±è´¥åŽçš„åä½œè¯­ä¹‰

å½“ `addEdge` æˆ– `reconnectEdge` å› ä¸º `duplicate-edge`ã€`self-loop`ã€`missing-node` ç­‰å¤±è´¥æ—¶:

- command adapter è¿”å›žå¸¦ `reason` çš„å¤±è´¥ç»“æžœ
- `DesignerCanvasContent` ä¸ç«‹å³æ¸…ç©º pending intent
- `env.notify('warning', ...)` è´Ÿè´£å‘å®¿ä¸»æŠ¥å‘Šè¯­ä¹‰å¤±è´¥
- ç”¨æˆ·å¯ä»¥ç›´æŽ¥æ¢ä¸€ä¸ª target é‡è¯•æˆ–æ‰‹åŠ¨å–æ¶ˆ

è¿™æ¡è§„åˆ™ä¿è¯ç”»å¸ƒäº¤äº’ä¸ä¼šåœ¨å¤±è´¥åŽä¸¢å¤±ä¸Šä¸‹æ–‡ã€‚

## Inspector åä½œé“¾è·¯

å½“å‰ inspector æœ‰ä¸¤ç§æ¨¡å¼ï¼Œåä½œè¾¹ç•Œç•¥æœ‰ä¸åŒã€‚

### æ¨¡å¼ A: é»˜è®¤ inspector UI

é»˜è®¤ inspector æ˜¯ `flow-designer-renderers` é‡Œå†™æ­»çš„ React ç»„ä»¶ï¼Œä½†å®ƒä»ç„¶ä¸ç›´æŽ¥æ“ä½œ documentï¼Œè€Œæ˜¯èµ° command dispatchã€‚

è°ƒç”¨é“¾:

```text
input onChange
  -> dispatch({ type: 'updateNodeData' })
  -> command adapter
  -> core.updateNode(...)
  -> documentChanged
  -> snapshot rerender
```

### æ¨¡å¼ B: schema-driven inspector

schema-driven inspector æ›´èƒ½ä½“çŽ°â€œå¤ç”¨æ ¸å¿ƒé€»è¾‘â€çš„æ„ä¹‰ã€‚

è°ƒç”¨é“¾:

```text
designer-page inspector region
  -> RenderNodes(schema fragment)
  -> normal form / button / tpl renderers
  -> fragment reads activeNode / activeEdge from host scope snapshot
  -> fragment writes through designer:* actions
  -> provider -> command adapter -> core
```

ä¹Ÿå°±æ˜¯è¯´ï¼ŒFlow Designer æ²¡æœ‰å†é€ ä¸€ä¸ªâ€œå±žæ€§é¢æ¿å­—æ®µå¼•æ“Žâ€ï¼Œè€Œæ˜¯å¤ç”¨äº†çŽ°æœ‰ schema renderersã€‚

## Host Scope åä½œ

Flow Designer çš„ schema fragment ä¹‹æ‰€ä»¥èƒ½å·¥ä½œï¼Œæ˜¯å› ä¸º `designer-page` æŠŠ graph snapshot æ˜ å°„æˆäº†ç¨³å®šå®¿ä¸»ä¸Šä¸‹æ–‡ã€‚

å®žé™…ä½¿ç”¨ä¸Šå¯ä»¥æŠŠå®ƒç†è§£æˆä¸€ç»„åªè¯»è§†å›¾:

- `doc`
- `selection`
- `activeNode`
- `activeEdge`
- `runtime`

è¿™äº›å€¼é©±åŠ¨:

- toolbar çš„ enable/disable
- inspector çš„å½“å‰å¯¹è±¡
- tpl ç‰‡æ®µé‡Œçš„æç¤ºæ–‡æ¡ˆ
- dialog é‡Œçš„åˆ é™¤ç¡®è®¤å†…å®¹

ä½†å†™æ“ä½œä»ç„¶å¿…é¡»èµ° action / command è¾¹ç•Œã€‚

## Dialog åä½œé“¾è·¯

Flow Designer åˆ é™¤ç¡®è®¤ç­‰ destructive UX ä¸åœ¨ core é‡Œç¡¬ç¼–ç ï¼Œè€Œæ˜¯å¤ç”¨ page/dialog runtimeã€‚

### è°ƒç”¨é“¾å›¾: åˆ é™¤ç¡®è®¤å¯¹è¯æ¡†

```text
toolbar or quick action
  -> built-in dialog action
  -> page runtime opens dialog
  -> dialog body rendered by RenderNodes
  -> confirm button dispatches designer:deleteNode or designer:deleteEdge
  -> provider -> command adapter -> core mutation
  -> built-in closeDialog closes dialog
```

è¿™è¯´æ˜Ž:

- core åªè´Ÿè´£ graph command
- destructive UX æµç¨‹ç•™ç»™é€šç”¨ dialog/action runtime
- renderer ä¸éœ€è¦å†å®žçŽ°ä¸€å¥— designer-only modal manager

## ä»Ž playground åˆ°è¿è¡Œæ—¶çš„æŽ¥çº¿å…³ç³»

playground çš„èŒè´£æ˜¯ç»„è£…ï¼Œè€Œä¸æ˜¯æ”¹å†™ Flow Designer å†…éƒ¨åè®®ã€‚

è°ƒç”¨å…³ç³»æ˜¯:

```text
playground registry setup
  -> registerBasicRenderers(registry)
  -> registerFormRenderers(registry)
  -> registerDataRenderers(registry)
  -> registerFlowDesignerRenderers(registry)
  -> SchemaRenderer(schema: designer-page + normal schema fragments)
```

è¿™é‡Œè¯´æ˜Ž Flow Designer åªæ˜¯ registry é‡Œçš„å¦ä¸€ç»„ renderer definitionsï¼Œä¸æ˜¯ç‰¹æƒé¡µé¢ã€‚

## å¸¸è§è¯¯åŒº

### è¯¯åŒº 1: canvas adapter æ˜¯ graph store

ä¸æ˜¯ã€‚adapter åªèƒ½åå°„ snapshot å’Œä¸ŠæŠ¥æ‰‹åŠ¿ã€‚

### è¯¯åŒº 2: `designer:*` æ˜¯ built-in action

ä¸æ˜¯ã€‚å®ƒä¾èµ– `ActionScope` ä¸Šæ³¨å†Œçš„ namespace providerã€‚

### è¯¯åŒº 3: inspector éœ€è¦å•ç‹¬çš„å­—æ®µåè®®

ä¸æ˜¯ã€‚ä¼˜å…ˆå¤ç”¨çŽ°æœ‰ schema form renderers å’Œ action runtimeã€‚

### è¯¯åŒº 4: `DesignerCore` çŸ¥é“ SchemaRenderer

ä¸æ˜¯ã€‚`DesignerCore` åªå…³å¿ƒ graph document å’Œ command è¯­ä¹‰ã€‚

## ç»´æŠ¤æ—¶ä¼˜å…ˆæ£€æŸ¥ä»€ä¹ˆ

å¦‚æžœåŽç»­æ”¹åŠ¨æ¶‰åŠä»¥ä¸‹ä»»ä¸€éƒ¨åˆ†ï¼Œä¼˜å…ˆä»Žå¯¹åº”é“¾è·¯å›žçœ‹:

- æ”¹ `designer-page` regionã€scopeã€action æ³¨å†Œ -> çœ‹æŒ‚è½½é“¾è·¯å’Œ action é“¾è·¯
- æ”¹ canvas adapter å›žè°ƒ -> çœ‹ canvas é“¾è·¯å’Œå¤±è´¥è¯­ä¹‰
- æ”¹ command adapter è¿”å›žå€¼ -> çœ‹ schema actionã€canvas hostã€notify åä½œç‚¹
- æ”¹ core selection/history/viewport -> çœ‹ snapshot è®¢é˜…å’Œ inspector / canvas é‡æ¸²æŸ“è·¯å¾„

## Related Documents

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`


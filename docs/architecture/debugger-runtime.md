# Debugger Runtime Design

## Purpose

æœ¬æ–‡å®šä¹‰ `@nop-chaos/nop-debugger` çš„å½“å‰æž¶æž„åŸºçº¿ï¼Œä»¥åŠå®ƒåœ¨ä¸¤ä¸ªåœºæ™¯ä¸­çš„èŒè´£è¾¹ç•Œï¼š

- ä½œä¸ºå¼€å‘é˜¶æ®µçš„äººæœºè°ƒè¯•å·¥å…·ï¼Œå¸®åŠ©å¼€å‘è€…å®šä½ renderã€actionã€apiã€scope ä¸ŽèŠ‚ç‚¹ inspect é—®é¢˜ã€‚
- ä½œä¸º AI ä¸Žè‡ªåŠ¨åŒ–æµ‹è¯•å¯æ¶ˆè´¹çš„æ¡†æž¶è¯Šæ–­åŸºç¡€è®¾æ–½ï¼Œæä¾›ç¨³å®šã€ç»“æž„åŒ–ã€éž UI ä¾èµ–çš„è¯Šæ–­æŽ¥å£ã€‚

æœ¬æ–‡æ˜¯å½“å‰æœ‰æ•ˆè®¾è®¡åŸºçº¿ã€‚åŽ†å²å–èˆã€å‰æœŸæ–¹æ¡ˆå’Œå®žçŽ°è®¡åˆ’ä»ä¿ç•™åœ¨ï¼š

- `docs/analysis/2026-03-21-framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`

## Current Code Anchors

- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/use-inspect-mode.ts`
- `apps/playground/src/App.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`
- `apps/playground/src/pages/DebuggerLabPage.tsx`
- `tests/e2e/debugger.spec.ts`

## 1. Design Position

`nop-debugger` ä¸æ˜¯ playground ä¸“å±žæ—¥å¿—é¢æ¿ï¼Œä¹Ÿä¸æ˜¯ä»…ä¾›äººç±»æŸ¥çœ‹çš„ UI ç»„ä»¶ã€‚

å®ƒçš„æ­£å¼å®šä½æ˜¯ï¼š

- ä¸€ä¸ªæ¡†æž¶çº§è°ƒè¯• package
- ä¸€ä¸ªç»Ÿä¸€äº‹ä»¶é‡‡é›†ä¸Žå½’ä¸€åŒ–å±‚
- ä¸€ä¸ªå®¿ä¸»å¯æŒ‚è½½çš„æµ®åŠ¨è°ƒè¯•é¢æ¿
- ä¸€ä¸ª AI / E2E / browser automation å¯ç›´æŽ¥è¯»å–çš„ç»“æž„åŒ–è¯Šæ–­ API

è¿™ä¸Žå‚è€ƒ `amis` è°ƒè¯•å™¨ç›¸æ¯”ï¼Œæœ€å¤§çš„æ–¹å‘æ€§å·®å¼‚æ˜¯ï¼š

- `amis` æ›´åå‘â€œè¿è¡Œæ—¶å¯è§†è°ƒè¯•å·¥å…·â€
- `nop-debugger` æ˜Žç¡®åŒæ—¶æ‰¿æ‹…â€œè‡ªåŠ¨åŒ–è¯Šæ–­æŽ¥å£â€èŒè´£

## 2. Comparison With AMIS

å‚è€ƒå®žçŽ°ï¼š

- `C:/can/nop/templates/amis/packages/amis-core/src/utils/debug.tsx`
- `C:/can/nop/templates/amis/packages/amis-core/src/SchemaRenderer.tsx`
- `C:/can/nop/templates/amis/docs/zh-CN/extend/debug.md`

### 2.1 AMIS ä¿ç•™ä»·å€¼

`amis` è°ƒè¯•å™¨æœ‰ä¸‰ç‚¹ä»ç„¶å€¼å¾—ä¿ç•™ä¸ºå‚è€ƒï¼š

- è°ƒè¯•èƒ½åŠ›ç”±æ˜¾å¼å¼€å…³å¯ç”¨ï¼Œä¸æ±¡æŸ“é»˜è®¤è¿è¡Œæ—¶
- åŒæ—¶æä¾› log å’Œ inspect ä¸¤ç§è§†è§’
- DOM å…ƒç´ ä¸Žç»„ä»¶å®žä¾‹ä¹‹é—´æœ‰å¯åæŸ¥çš„æ˜ å°„å…³ç³»

### 2.2 Flux å·²ç»è¶…å‡ºçš„éƒ¨åˆ†

å½“å‰ `nop-debugger` åœ¨å‡ ä¸ªå…³é”®æ–¹å‘ä¸Šå·²ç»æ˜Žæ˜¾è¶…è¿‡ `amis` åŽŸå§‹è®¾è®¡ï¼š

- `amis` ä¸»è¦æš´éœ² UI å’Œ console logï¼›`nop-debugger` è¿˜æš´éœ² `window.__NOP_DEBUGGER_API__` ä¸Ž `window.__NOP_DEBUGGER_HUB__`
- `amis` çš„æŸ¥è¯¢èƒ½åŠ›ä¸»è¦ä¾èµ–äººå·¥æŸ¥çœ‹é¢æ¿ï¼›`nop-debugger` æä¾› `queryEvents()`ã€`waitForEvent()`ã€`getInteractionTrace()`ã€`exportSession()`ã€`createDiagnosticReport()`
- `amis` ä»¥æ¾æ•£æ—¥å¿—ä¸ºä¸»ï¼›`nop-debugger` å·²å½¢æˆç»Ÿä¸€äº‹ä»¶æ¨¡åž‹ `compile/render/action/api/notify/error/state:snapshot`
- `amis` inspect ä¸»è¦è¯»å–ç»„ä»¶ `props.data` åŽŸåž‹é“¾ï¼›`nop-debugger` å½“å‰å®žçŽ°å·²æ”¯æŒé€šè¿‡ `data-cid` å›žæŸ¥ handle å’Œ form/scope æ•°æ®ã€‚clean-slate è®¾è®¡ä¸æ˜¯ç§»é™¤ `data-cid`ï¼Œè€Œæ˜¯è¦æ±‚é€šè¿‡ `data-cid` å…ˆå›žåˆ° live nodeï¼Œå†æå‡åˆ° canonical `NodeLocator`ï¼Œè§ `docs/architecture/template-instantiation-and-node-identity.md`
- `amis` æ–‡æ¡£åªè¦†ç›–â€œå¼€å¯è°ƒè¯•å™¨ + æŸ¥çœ‹æ—¥å¿—/æ•°æ®é“¾â€ï¼›`nop-debugger` å·²å…·å¤‡é¢å‘é›†æˆæµ‹è¯•çš„ API è®¾è®¡å’Œ Playwright åŸºç¡€å›žå½’

### 2.3 AMIS ä»ç„¶æé†’æˆ‘ä»¬çš„é£Žé™©

`amis` çš„ç»éªŒä»ç„¶æé†’å‡ ä¸ªçŽ°å®žé—®é¢˜ï¼š

- inspect æ˜¯é«˜é¢‘åœºæ™¯ï¼Œå¿…é¡»ä¿è¯ä»Žé¡µé¢å…ƒç´ å¿«é€Ÿå›žåˆ°èŠ‚ç‚¹å’Œæ•°æ®åŸŸ
- è°ƒè¯•å™¨è‹¥åªåšäº‹ä»¶å †å ï¼Œå¾ˆå¿«ä¼šæ·¹æ²¡æœ‰æ•ˆçº¿ç´¢
- è°ƒè¯•å™¨è‹¥åªå¯¹äººå‹å¥½ã€ä¸å¯¹è‡ªåŠ¨åŒ–å‹å¥½ï¼ŒAI åœ¨é›†æˆæµ‹è¯•é‡Œä»ç„¶åªèƒ½ä¾èµ–è„†å¼±çš„ DOM æ–‡æœ¬è§£æž

## 3. Current Capability Baseline

æˆªè‡³å½“å‰ä»£ç åŸºçº¿ï¼Œ`nop-debugger` å·²ç»å…·å¤‡ä»¥ä¸‹æ­£å¼èƒ½åŠ›ã€‚

### 3.1 Host Integration

å®¿ä¸»é€šè¿‡ `createNopDebugger()` èŽ·å¾— controllerï¼Œå¹¶åœ¨ renderer root è¾¹ç•ŒæŽ¥å…¥ï¼š

- `decorateEnv(env)`
- `plugin`
- `onActionError`
- `setComponentRegistry()`
- `setActionScope()`

å½“å‰ playground çš„çœŸå®žæŽ¥å…¥è·¯å¾„åœ¨ï¼š

- `apps/playground/src/App.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`

è¿™è¯´æ˜Ž debugger å·²ç»ç«™åœ¨æ¡†æž¶å®¿ä¸»è¾¹ç•Œï¼Œè€Œä¸æ˜¯ç¡¬ç¼–ç åœ¨å…·ä½“ renderer å†…éƒ¨ã€‚

### 3.2 Unified Event Model

å½“å‰ç»Ÿä¸€äº‹ä»¶ç§ç±»ä¸ºï¼š

- `compile:start`
- `compile:end`
- `render:start`
- `render:end`
- `action:start`
- `action:end`
- `api:start`
- `api:end`
- `api:abort`
- `notify`
- `error`
- `state:snapshot`

äº‹ä»¶ç»Ÿä¸€åŒ…å«ï¼š

- `kind`
- `group`
- `level`
- `timestamp`
- `summary`
- ä»¥åŠå¯é€‰çš„ `nodeId/path/rendererType/actionType/requestKey/requestInstanceId/interactionId/parentEventId/durationMs/network/exportedData`

æœ¯è¯­æœ€å°é›†ï¼š

- `requestKey`: è¯­ä¹‰åŒç±»è¯·æ±‚çš„åˆ†ç»„é”®
- `requestInstanceId`: æŸä¸€æ¬¡å…·ä½“è¯·æ±‚å®žä¾‹çš„ç¨³å®šæ ‡è¯†
- `interactionId`: ä¸€æ¬¡åŠ¨ä½œé“¾æˆ–ç”¨æˆ·äº¤äº’çš„å…³è”æ ‡è¯†
- `trace anchor event`: ç”¨äºŽæŽ¨æ–­ interaction trace çš„é”šç‚¹äº‹ä»¶
- `scopeChain`: inspect è¿”å›žçš„é€å±‚ scope å¿«ç…§æ•°ç»„
- `node inspect payload`: `inspectByCid()` / `inspectByElement()` è¿”å›žçš„èšåˆèŠ‚ç‚¹ä¸Šä¸‹æ–‡ï¼›å…¶ä¸­ `cid` æ˜¯ live runtime node idï¼Œ`locator` æ˜¯ canonical structural/runtime identity

è¿™å·²ç»æ»¡è¶³ AI è¿›è¡Œç»“æž„åŒ–æ£€ç´¢çš„æœ€åŸºæœ¬è¦æ±‚ã€‚

### 3.2.1 Identity Contract

Target architecture rule:

- `locator` is the canonical node identity for debugger events, traces, inspect payloads, and anomaly grouping
- `nodeId` and `path` may remain as convenience summaries for humans; `nodeId` here means the author-facing schema/node summary field, not `templateNodeId`
- `cid` is the compact live-node identity used by DOM and debugger round-trips
- repeated nodes may and should expose live `data-cid` while mounted; `locator` remains the deeper remount-stable structural identity
- any serialized/debug-session use of `cid` outside the immediate mounted runtime should pair it with `runtimeId` or prefer `locator`

Target event shape:

```ts
interface DebuggerEvent {
  kind: string;
  summary: string;
  locator?: NodeLocator;
  nodeId?: string;
  path?: string;
  rendererType?: string;
  interactionId?: string;
  requestKey?: string;
}
```

### 3.3 Automation API

å½“å‰è‡ªåŠ¨åŒ–æŽ¥å£å·²ç»ä¸æ˜¯è‰æ¡ˆï¼Œè€Œæ˜¯å·²è½åœ°èƒ½åŠ›ã€‚æ ¸å¿ƒæ–¹æ³•åŒ…æ‹¬ï¼š

- `getSnapshot()`
- `getOverview()`
- `queryEvents()`
- `getLatestEvent()`
- `getLatestError()`
- `getPinnedErrors()`
- `getNodeDiagnostics()`
- `getInteractionTrace()`
- `createDiagnosticReport()`
- `exportSession()`
- `waitForEvent()`
- `inspectNode()`
- `inspectByElement()`
- `getLatestFailedRequest()`
- `getLatestFailedAction()`
- `getRecentFailures()`
- `getNodeAnomalies()`
- `evaluateNodeExpression()`

#### 3.3.1 Automation Contract

ä»¥ä¸‹æŽ¥å£å±žäºŽå½“å‰ç¨³å®šè‡ªåŠ¨åŒ–å¥‘çº¦ï¼ŒAI/E2E åº”ä¼˜å…ˆç›´æŽ¥è°ƒç”¨ï¼Œè€Œä¸æ˜¯ä¾èµ– panel DOMï¼š

- `getSnapshot()` / `getOverview()` / `queryEvents()` / `getLatestEvent()`
- `waitForEvent()`
- `getInteractionTrace()`
- `inspectNode()` / `inspectByElement()`
- `exportSession()` / `createDiagnosticReport()`
- `getLatestFailedRequest()` / `getLatestFailedAction()` / `getRecentFailures()` / `getNodeAnomalies()`

`evaluateNodeExpression()` ä¹Ÿæ˜¯æ­£å¼èƒ½åŠ›ï¼Œä½†å®ƒåªèµ°çŽ°æœ‰è¡¨è¾¾å¼å¼•æ“Žï¼Œä¸æ‰§è¡Œä»»æ„ JSã€‚

å…¨å±€æš´éœ²ä¸ºï¼š

- `window.__NOP_DEBUGGER_API__`
- `window.__NOP_DEBUGGER_HUB__`

æ³¨æ„ï¼šå½“å‰ä»“åº“çš„çœŸå®žå…¨å±€åç§°æ˜¯ `__NOP_DEBUGGER_API__`ï¼Œä¸æ˜¯æ—§è‰æ¡ˆä¸­çš„ `__NOP_FLUX_DEBUGGER_API__`ã€‚

### 3.4 Developer-Facing UI

å½“å‰é¢æ¿å·²ç»å…·å¤‡ä»¥ä¸‹ç¨³å®šå½¢æ€ï¼š

- launcher
- floating panel
- minimize bar
- Overview / Timeline / Network / Node å››ä¸ª tab
- æœç´¢ã€ç­›é€‰ã€æš‚åœã€æ¸…ç©º
- é”™è¯¯èšåˆ
- network è¯·æ±‚å½’å¹¶
- inspect mode ä¸Ž overlay
- Node Tab ä¸­çš„ formState / scopeData æŸ¥çœ‹

å¯¹äºŽå¼€å‘è”è°ƒï¼Œè¿™å·²ç»æ˜Žæ˜¾è¶…è¿‡â€œç®€å•æ—¥å¿—é¢æ¿â€ã€‚

### 3.5 Verification Baseline

å½“å‰ä»“åº“å·²ç»æœ‰çœŸå®žå›žå½’éªŒè¯ï¼Œè€Œä¸åªæ˜¯æ–‡æ¡£å®£ç§°ï¼š

- å•å…ƒæµ‹è¯•è¦†ç›– controller / automation / diagnostics / inspect / panel
- `tests/e2e/debugger.spec.ts` å·²éªŒè¯ launcherã€panelã€automation APIã€æœ€å°åŒ–æŒä¹…åŒ–ç­‰åŸºæœ¬è¡Œä¸º
- `DebuggerLabPage` æä¾›æ‰‹å·¥å’Œè‡ªåŠ¨åŒ–å…±åŒä½¿ç”¨çš„ API å®žéªŒé¢

## 4. Has It Reached The AI Integration-Test Goal?

ç»“è®ºåˆ†ä¸¤å±‚ã€‚

### 4.1 Short Answer

- å¯¹â€œè®© AI åœ¨é›†æˆæµ‹è¯•ä¸­å¼€å§‹ä½¿ç”¨ debugger è¿›è¡Œè¾…åŠ©è¯Šæ–­â€è¿™ä¸ªç›®æ ‡ï¼Œç­”æ¡ˆæ˜¯ï¼š**åŸºæœ¬è¾¾æˆ**ã€‚
- å¯¹â€œå·²ç»è¶³å¤Ÿæ”¯æ’‘å¤æ‚æ¡†æž¶é—®é¢˜çš„é«˜å¯é è‡ªåŠ¨å½’å› â€è¿™ä¸ªæ›´é«˜ç›®æ ‡ï¼Œç­”æ¡ˆæ˜¯ï¼š**è¿˜æ²¡æœ‰å®Œå…¨è¾¾æˆ**ã€‚

### 4.2 Why It Is Already Usable

å½“å‰èƒ½åŠ›å·²ç»è¶³å¤Ÿæ”¯æŒ AI åœ¨æµè§ˆå™¨è‡ªåŠ¨åŒ–æˆ–é›†æˆæµ‹è¯•ä¸­åšä»¥ä¸‹äº‹æƒ…ï¼š

- ä¸ä¾èµ– panel DOMï¼Œç›´æŽ¥é€šè¿‡å…¨å±€ API è¯»å–ç»“æž„åŒ–çŠ¶æ€
- ç­‰å¾…å¼‚æ­¥äº‹ä»¶å®Œæˆï¼Œè€Œä¸æ˜¯ç›²ç­‰ timeout
- æå–æœ€è¿‘é”™è¯¯ã€æœ€è¿‘è¯·æ±‚ã€æœ€è¿‘ action
- å¯¼å‡ºè„±æ• session æ•°æ®ç”¨äºŽå¤±è´¥è¯Šæ–­
- é€šè¿‡ `data-cid` ä¸Ž inspect API ä»Žé¡µé¢å…ƒç´ å›žæŸ¥ç»„ä»¶çŠ¶æ€ï¼Œå¹¶ç»§ç»­ä¸‹é’»åˆ°å¯¹åº” `locator` / scopeChain
- Node é¢æ¿çš„ç»„ä»¶æ ‘å¯ä»¥ä»Ž runtime/registry mounted snapshot æžšä¸¾å½“å‰ live handlesï¼Œè€Œä¸æ˜¯å…¨é‡æ‰«æé¡µé¢ä¸Šçš„ `[data-cid]`
- åœ¨å¤šäº‹ä»¶æµä¸­æŒ‰ `kind/group/nodeId/path/requestKey` åšç­›é€‰

è¿™æ„å‘³ç€ `nop-debugger` å·²ç»ä¸åªæ˜¯â€œç»™äººçœ‹â€çš„å·¥å…·ï¼Œè€Œæ˜¯å¯è¢«æµ‹è¯•å’Œ AI ç¨‹åºæ¶ˆè´¹çš„è¯Šæ–­å±‚ã€‚

Target DOM inspect rule:

- mounted inspectable nodes expose `data-cid`
- `inspectByElement()` climbs to the nearest inspectable owner marker instead of requiring the clicked descendant itself to carry `data-cid`
- `inspectByCid()` returns the live node inspect payload and includes its `locator`; registry/runtime inspect data is the primary mounted-state source, while DOM presence is supplemental metadata for tag/class correlation
- virtualized or disposed nodes return explicit not-mounted diagnostics instead of guessing from stale DOM

Target locator inspect rule:

- `inspectNode(locator)` resolves through registry/runtime structural lookup first, not through DOM search
- structurally valid but currently unmounted targets return explicit non-mounted diagnostics while preserving the requested `locator`

Target lookup result rule:

- debugger-facing lookup should distinguish `notMaterialized` from `notFound`
- `notMaterialized` means the structural target is valid but there is no current live mounted/materialized node to inspect
- `notFound` means the requested target identity is invalid in the current runtime/template context

Target inspect contract:

```ts
type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized'; locator?: NodeLocator }
  | { kind: 'notFound' };
```

### 4.3 Why It Is Not Fully There Yet

ä½†å¦‚æžœç›®æ ‡æ˜¯â€œå¤æ‚æ¡†æž¶é—®é¢˜å‡ºçŽ°æ—¶ï¼ŒAI å¤§æ¦‚çŽ‡èƒ½ç¨³å®šæ‹¿åˆ°è¶³å¤Ÿä¸Šä¸‹æ–‡å¹¶åšé¦–è½®å½’å› â€ï¼Œå½“å‰è¿˜å­˜åœ¨å‡ ç±»å…³é”®ç¼ºå£ã€‚

## 5. Current Gaps

### 5.1 Request Correlation Is Still Too Weak

å½“å‰ `requestKey` ç”± `method + url + nodeId + path` ç»„æˆã€‚

è¿™æœ‰ä¸¤ä¸ªç›´æŽ¥é—®é¢˜ï¼š

- ç›¸åŒèŠ‚ç‚¹å¯¹åŒä¸€ URL çš„å¹¶å‘è¯·æ±‚ä¼šå…±äº«åŒä¸€ä¸ª `requestKey`
- ä¸åŒå‚æ•°ä½†åŒ URL çš„è¯·æ±‚ä¼šè¢«é”™è¯¯åˆå¹¶ä¸ºåŒä¸€é“¾è·¯

è¿™ä¼šå‰Šå¼±ï¼š

- `waitForEvent()` çš„ç¡®å®šæ€§
- Network è§†å›¾çš„é“¾è·¯å‡†ç¡®æ€§
- AI åœ¨ä¸€æ¬¡å¤±è´¥äº¤äº’åŽå¯¹â€œåˆ°åº•æ˜¯å“ªæ¬¡è¯·æ±‚å¤±è´¥â€çš„å½’å› èƒ½åŠ›

ç»“è®ºï¼šå½“å‰ API åŽ»é‡è¶³å¤Ÿåº”å¯¹åŸºç¡€å¼€å‘è°ƒè¯•ï¼Œä½†è¿˜ä¸å¤Ÿä½œä¸ºå¤æ‚å¹¶å‘åœºæ™¯ä¸‹çš„å¼ºå…³è”æ ‡è¯†ã€‚

### 5.2 Node Diagnostics ç¼ºå°‘ Stable Scope Chain Model

å½“å‰ `inspectByCid()` å¯ä»¥è¿”å›ž `formState` å’Œ `scopeData`ï¼Œä½†ä»ç„¶åå‘â€œå•å±‚å¿«ç…§â€ã€‚

è¿˜ç¼ºå°‘ç¨³å®šçš„ï¼š

- scope chain åˆ†å±‚æ¨¡åž‹
- æ¯å±‚ scope çš„æ¥æºæ ‡è¯†
- èŠ‚ç‚¹ props æ‘˜è¦
- èŠ‚ç‚¹ç¼–è¯‘åŽå…³é”®è¾“å…¥æ‘˜è¦

è¿™æ„å‘³ç€å¼€å‘è€…èƒ½çœ‹åˆ°ä¸€äº›å½“å‰å€¼ï¼Œä½† AI å’Œå¼€å‘è€…éƒ½è¿˜ä¸å®¹æ˜“åˆ¤æ–­â€œè¿™ä¸ªå€¼æ¥è‡ªå“ªé‡Œã€è¢«å“ªä¸€å±‚è¦†ç›–ã€ä¸ºä»€ä¹ˆæ­¤èŠ‚ç‚¹æ‹¿åˆ°çš„æ˜¯è¿™ä»½æ•°æ®â€ã€‚

### 5.3 Interaction Trace Still Depends On Heuristics

`getInteractionTrace()` å·²ç»å¯ç”¨ï¼Œä½†å½“å‰â€œrelated traceâ€ä»ç„¶ä¸»è¦ä¾èµ–ï¼š

- `requestKey`
- `actionType`
- `nodeId`
- `path`

è¿™å±žäºŽåˆç†çš„ MVP æ–¹æ¡ˆï¼Œä½†è¿˜ä¸æ˜¯ä¸¥æ ¼çš„äº¤äº’å› æžœé“¾æ¨¡åž‹ã€‚

ç¼ºå°‘çš„æ˜¯çœŸæ­£ç¨³å®šçš„ï¼š

- interaction id
- parent event id
- action -> api -> notify/error çš„æ˜Žç¡®å› æžœè¾¹

å› æ­¤å½“å‰ trace æ›´é€‚åˆâ€œè¾…åŠ©ç†è§£â€ï¼Œè¿˜ä¸é€‚åˆâ€œå¼ºå› æžœå›žæ”¾â€ã€‚

### 5.4 Expression Evaluator Is Not Actually Available

Node Tab é‡Œè™½ç„¶ä¿ç•™äº† Expression Evaluator åŒºåŸŸï¼Œä½†å½“å‰ `handleEvalExpression()` åªè¿”å›žå›ºå®šæ–‡æ¡ˆï¼š

- `Expression evaluation is disabled. Inspect scope data directly instead.`

è¿™è¯´æ˜Žè¯¥èƒ½åŠ›åœ¨ UI ä¸Šå­˜åœ¨å…¥å£ï¼Œä½†å¹¶æœªå½¢æˆçœŸæ­£å¯ç”¨çš„è¯Šæ–­åŠŸèƒ½ã€‚

å¯¹äºŽå¼€å‘è€…è¿™åªæ˜¯ä½“éªŒç¼ºå£ï¼›å¯¹äºŽ AI åˆ™æ„å‘³ç€å®ƒæ— æ³•åœ¨é€‰ä¸­èŠ‚ç‚¹ä¸Šä¸‹æ–‡ä¸­ç›´æŽ¥è¯•éªŒè¡¨è¾¾å¼ç»“æžœã€‚

### 5.5 E2E Coverage Is Present But Still Shallow

å½“å‰ Playwright åªéªŒè¯äº†ï¼š

- é¢æ¿å¯æ‰“å¼€
- automation API å¯è®¿é—®
- åŸºç¡€æŒä¹…åŒ–å¯å·¥ä½œ
- å®žéªŒé¡µæŒ‰é’®èƒ½æ³¨å…¥äº‹ä»¶

ä½†è¿˜æ²¡æœ‰è¦†ç›–æ›´å…³é”®çš„ AI è¯Šæ–­é“¾è·¯ï¼š

- `waitForEvent()` åœ¨çœŸå®žè¯·æ±‚ç”Ÿå‘½å‘¨æœŸä¸Šçš„å¯é æ€§
- `queryEvents()` / `getInteractionTrace()` åœ¨çœŸå®žå¤æ‚é¡µé¢ä¸Šçš„æ­£ç¡®æ€§
- `inspectByElement()` å¯¹çœŸå®žè¡¨å•èŠ‚ç‚¹è¿”å›žçš„ç»“æž„å®Œæ•´æ€§
- `exportSession()` è„±æ•è¾“å‡ºçš„å¥‘çº¦ç¨³å®šæ€§

ç»“è®ºï¼šåŠŸèƒ½å·²è½åœ°ï¼Œä½†â€œä½œä¸ºæµ‹è¯•åŸºç¡€è®¾æ–½â€çš„å¥‘çº¦å›žå½’è¿˜ä¸å¤Ÿå¼ºã€‚

### 5.6 Docs And Playground Still Have Terminology Drift

å½“å‰ä»£ç çœŸå®žä½¿ç”¨çš„æ˜¯ï¼š

- `window.__NOP_DEBUGGER_API__`
- `window.__NOP_DEBUGGER_HUB__`

ä½†éƒ¨åˆ†æ—§æ–‡æ¡£å’Œ playground é¡µé¢æ–‡æœ¬ä»æ®‹ç•™ `__NOP_FLUX_DEBUGGER_API__` è¯´æ³•ã€‚

è¿™ç±»å‘½åæ¼‚ç§»ä¼šç›´æŽ¥è¯¯å¯¼ AIã€å¼€å‘è€…å’Œæµ‹è¯•è„šæœ¬ï¼Œæ˜¯éœ€è¦æŒç»­æ¸…ç†çš„è®¾è®¡å€ºåŠ¡ã€‚

## 6. Design Judgment

ä»Žæž¶æž„è§†è§’çœ‹ï¼Œå½“å‰ `nop-debugger` å·²ç»åˆ°è¾¾ä¸€ä¸ªé‡è¦æ‹ç‚¹ï¼š

- å®ƒå·²ç»å®Œæˆäº†ä»Žâ€œplayground å†…éƒ¨å·¥å…·â€åˆ°â€œæ¡†æž¶çº§è°ƒè¯•åŸºç¡€è®¾æ–½â€çš„è·ƒè¿ã€‚

ä½†ä»Žäº§å“ä¸Žæµ‹è¯•åŸºç¡€è®¾æ–½è§†è§’çœ‹ï¼Œå®ƒè¿˜æ²¡æœ‰å®Œå…¨è¾¾åˆ°æœ€ç»ˆç›®æ ‡ï¼š

- å®ƒå·²ç»è¶³å¤Ÿæ”¯æ’‘å¼€å‘è”è°ƒã€‚
- å®ƒå·²ç»è¶³å¤Ÿè®© AI åœ¨é›†æˆæµ‹è¯•ä¸­å¼€å§‹ä½¿ç”¨ã€‚
- å®ƒè¿˜ä¸å¤Ÿæ”¯æ’‘å¤æ‚å¼‚æ­¥é“¾è·¯ã€å¹¶å‘è¯·æ±‚ã€æ·±å±‚ scope è¦†ç›–é—®é¢˜çš„é«˜å¯é è‡ªåŠ¨è¯Šæ–­ã€‚

å› æ­¤å½“å‰æœ€å‡†ç¡®çš„ç»“è®ºä¸æ˜¯â€œå·²ç»è¾¾æˆâ€æˆ–â€œå®Œå…¨æœªè¾¾æˆâ€ï¼Œè€Œæ˜¯ï¼š

- **ç¬¬ä¸€é˜¶æ®µç›®æ ‡å·²è¾¾æˆ**ï¼šAI å’Œå¼€å‘è€…éƒ½å·²ç»æœ‰å¯ç”¨è°ƒè¯•å™¨ã€‚
- **ç¬¬äºŒé˜¶æ®µç›®æ ‡æœªå®Œå…¨è¾¾æˆ**ï¼šå¤æ‚é—®é¢˜è¯Šæ–­æ‰€éœ€çš„å¼ºå…³è”ã€å¼ºä¸Šä¸‹æ–‡å’Œå¼ºå›žå½’å¥‘çº¦è¿˜éœ€è¦è¡¥å¼ºã€‚

## 7. Required Next-Step Capabilities

å¦‚æžœç›®æ ‡æ˜¯æŠŠ debugger å‡çº§ä¸ºçœŸæ­£çš„ AI è¯Šæ–­åŸºç¡€è®¾æ–½ï¼ŒåŽç»­èƒ½åŠ›åº”æŒ‰ä»¥ä¸‹ä¼˜å…ˆçº§æŽ¨è¿›ã€‚

### 7.1 P0: Stable Causality And Correlation

ä¼˜å…ˆè¡¥å¼ºï¼š

- request instance idï¼Œè€Œä¸æ˜¯åªé  `requestKey`
- action / api / error / notify çš„å…³è” id
- äº¤äº’é“¾è·¯ä¸­çš„ parent-child å› æžœå­—æ®µ

è¿™æ˜¯ AI ç¨³å®šå½’å› æœ€é‡è¦çš„åŸºç¡€ã€‚

### 7.2 P0: Stronger Inspect Payload

ä¼˜å…ˆè¡¥å¼ºï¼š

- scope chain åˆ†å±‚
- scope æ¥æºåç§°
- èŠ‚ç‚¹ props/meta æ‘˜è¦
- èŠ‚ç‚¹æœ€è¿‘ render/action/api/error èšåˆæ‘˜è¦ç›´æŽ¥å¹¶å…¥ inspect ç»“æžœ

è¿™æ · AI å’Œå¼€å‘è€…éƒ½ä¸ç”¨æ‰‹å·¥åœ¨å¤šä¸ª API ä¹‹é—´æ‹¼ä¸Šä¸‹æ–‡ã€‚

### 7.3 P1: Contract-Level E2E Coverage

éœ€è¦æ–°å¢žé›†æˆæµ‹è¯•è¦†ç›–ï¼š

- çœŸå®žè¡¨å•æäº¤åŽçš„ `waitForEvent({ kind: 'api:end' })`
- `getInteractionTrace({ inferFromLatest: true })` çš„ç¨³å®šè¾“å‡º
- `inspectByElement()` å¯¹é¡µé¢ç»„ä»¶çš„çœŸå®ž inspect
- `exportSession()` è„±æ•å¥‘çº¦

ç›®æ ‡ä¸æ˜¯æµ‹è¯• UI åƒä¸åƒï¼Œè€Œæ˜¯æµ‹è¯• automation contract æ˜¯å¦ç¨³å®šã€‚

### 7.4 P1: Better Failure Summaries For AI

å»ºè®®æŠŠä»¥ä¸‹èšåˆèƒ½åŠ›æå‡ä¸ºä¸€ç­‰æŽ¥å£ï¼š

- latest failed request summary
- latest failed action summary
- recent node anomalies
- probable root cause hints

è¿™ç±»èƒ½åŠ›ä¸è¦æ±‚æ›¿ä»£ AI æŽ¨ç†ï¼Œä½†è¦å‡å°‘ AI æ¯æ¬¡ä»Žé›¶èšåˆæ•°æ®çš„æˆæœ¬ã€‚

### 7.5 P2: Optional Safe Expression Evaluation

å¦‚æžœè¦è¡¥é½ Node Tab çš„è¡¨è¾¾å¼è¯Šæ–­èƒ½åŠ›ï¼Œåº”é€šè¿‡å·²æœ‰è¡¨è¾¾å¼å¼•æ“Žåœ¨å—æŽ§ä¸Šä¸‹æ–‡ä¸­æ‰§è¡Œï¼Œè€Œä¸æ˜¯å¼€æ”¾ä»»æ„ JSã€‚

è¿™é¡¹èƒ½åŠ›å¯¹å¼€å‘è€…å’Œ AI éƒ½æœ‰ä»·å€¼ï¼Œä½†ä¼˜å…ˆçº§ä½ŽäºŽé“¾è·¯å…³è”å’Œ inspect å®Œæ•´æ€§ã€‚

## 8. Rules For AI-Facing Use

é¢å‘ AIã€E2E ä¸Žè‡ªåŠ¨åŒ–æ—¶ï¼Œä¸»æŽ¥å£åº”è¯¥å§‹ç»ˆæ˜¯ï¼š

- `window.__NOP_DEBUGGER_API__`
- `window.__NOP_DEBUGGER_HUB__`
- controller automation methods
- `exportSession()`
- `createDiagnosticReport()`

ä¸åº”æŠŠä»¥ä¸‹å†…å®¹å½“æˆç¨³å®šæŽ¥å£ï¼š

- panel DOM ç»“æž„
- tab æŒ‰é’®æ–‡æ¡ˆ
- launcher æ–‡æœ¬
- è§†è§‰æ ·å¼ class
- äººç±»å¯è¯»å­—ç¬¦ä¸²æ—¥å¿—

è°ƒè¯•é¢æ¿æ˜¯å¼€å‘ä½“éªŒå±‚ï¼Œä¸æ˜¯è‡ªåŠ¨åŒ–å¥‘çº¦å±‚ã€‚

## 9. Relationship To Playground

playground ç»§ç»­æ‰¿æ‹…ä¸¤ç§èŒè´£ï¼š

- ä½œä¸º `nop-debugger` çš„ç¬¬ä¸€é›†æˆé¢
- ä½œä¸º `DebuggerLabPage` çš„è°ƒè¯• API æ¼”ç¤ºé¢

ä½† playground ä¸æ˜¯ debugger çš„ source of truthã€‚

è°ƒè¯•å™¨çš„æ­£å¼å¥‘çº¦åº”ä»¥ï¼š

- `docs/architecture/debugger-runtime.md`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/automation.ts`

ä¸ºå‡†ã€‚

## Related Documents

- `docs/architecture/playground-experience.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/analysis/2026-03-21-framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`


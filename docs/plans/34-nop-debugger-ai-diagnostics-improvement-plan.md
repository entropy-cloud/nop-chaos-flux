# 34 NOP Debugger AI è¯Šæ–­èƒ½åŠ›å¢žå¼ºè®¡åˆ’

> Plan Status: completed
> Last Reviewed: 2026-04-08
> Source: `docs/architecture/debugger-runtime.md` reviewed against current code anchors on 2026-04-08

> Status Note: æœ¬è®¡åˆ’å¯¹åº”çš„æ ¸å¿ƒå®žçŽ°ä¸Žå¥‘çº¦çº§å›žå½’å·²ç»è¿›å…¥ä»£ç ã€æµ‹è¯•å’Œæ–‡æ¡£ä¸»çº¿ï¼šè¯·æ±‚å®žä¾‹å…³è”ã€inspect payload å¢žå¼ºã€é«˜å±‚å¤±è´¥æ‘˜è¦ã€å—æŽ§è¡¨è¾¾å¼è¯Šæ–­ã€automation API ä¸Žå…³é”® E2E è¦†ç›–å‡å·²è½åœ°ã€‚å½“å‰å‰©ä½™äº‹é¡¹ä»…å±žäºŽå¸¸è§„åŽç»­æ¼”è¿›ï¼Œä¸å†æž„æˆæœ¬è®¡åˆ’æœªå®Œæˆé¡¹ã€‚

## å¤å®¡ç»“è®º

- å½“å‰ `@nop-chaos/nop-debugger` å·²ç»å®Œæˆç¬¬ä¸€é˜¶æ®µç›®æ ‡ï¼šå®ƒä¸å†åªæ˜¯ playground å†…éƒ¨æ—¥å¿—é¢æ¿ï¼Œè€Œæ˜¯æ¡†æž¶çº§è°ƒè¯•åŸºç¡€è®¾æ–½ï¼Œå¼€å‘è€…å’Œ AI éƒ½å·²ç»å¯ä»¥å®žé™…ä½¿ç”¨å®ƒã€‚
- ä½†å®ƒè¿˜æ²¡æœ‰è¾¾åˆ°ç¬¬äºŒé˜¶æ®µç›®æ ‡ï¼šå¤æ‚æ¡†æž¶é—®é¢˜ä¸‹çš„é«˜å¯é è‡ªåŠ¨è¯Šæ–­ã€‚ä¸»è¦ç¼ºå£é›†ä¸­åœ¨è¯·æ±‚/äº¤äº’å› æžœå…³è”ã€inspect ä¸Šä¸‹æ–‡å®Œæ•´æ€§ã€è‡ªåŠ¨åŒ–å¥‘çº¦çº§å›žå½’è¦†ç›–ï¼Œä»¥åŠ AI å¯ç›´æŽ¥æ¶ˆè´¹çš„é«˜å±‚å¤±è´¥æ‘˜è¦ã€‚
- è¿™ä»½è®¡åˆ’ä¸æ˜¯é‡å¤ `docs/plans/20-nop-debugger-implementation-plan.md` æˆ– `docs/plans/22-debugger-node-inspector-enhancement-plan.md` çš„å·²å®Œæˆèƒ½åŠ›ï¼Œè€Œæ˜¯æ‰¿æŽ¥å®ƒä»¬ä¹‹åŽçš„ä¸‹ä¸€é˜¶æ®µå¼ºåŒ–è®¡åˆ’ã€‚

## ä¸ŽçŽ°æœ‰è®¡åˆ’çš„å…³ç³»

- `docs/plans/20-nop-debugger-implementation-plan.md` å·²å®Œæˆ debugger çš„åŸºç¡€ package åŒ–ã€automation APIã€Timeline/Network/Node é¢æ¿å’ŒåŸºç¡€æŒä¹…åŒ–èƒ½åŠ›ï¼›æœ¬è®¡åˆ’ä¸é‡åšè¿™äº›åŸºç¡€èƒ½åŠ›ã€‚
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md` å·²å®Œæˆ `data-cid`ã€inspect modeã€Node Tab åŸºç¡€ inspectï¼›æœ¬è®¡åˆ’åœ¨æ­¤åŸºç¡€ä¸Šè¡¥é½æ›´å¼ºçš„ scope/props/trace è¯Šæ–­ä¸Šä¸‹æ–‡ã€‚
- `docs/plans/29-domain-runtime-and-debugger-refactor-plan.md` å…³æ³¨çš„æ˜¯æ–‡ä»¶æ‹†åˆ†å’Œç»“æž„æ”¶å£ï¼›æœ¬è®¡åˆ’å…³æ³¨çš„æ˜¯ debugger çš„è¯Šæ–­èƒ½åŠ›å’Œæµ‹è¯•åŸºç¡€è®¾æ–½å¼ºåŒ–ï¼Œä¸é‡å¤åšç»“æž„æ€§é‡æž„ã€‚

## Problem

å½“å‰ `nop-debugger` å·²ç»å¯ç”¨ï¼Œä½†è¿˜å­˜åœ¨ 6 ç±»å…³é”®èƒ½åŠ›ç¼ºå£ï¼Œç›´æŽ¥é™åˆ¶å®ƒåœ¨ AI é›†æˆæµ‹è¯•å’Œå¤æ‚å¼€å‘è¯Šæ–­åœºæ™¯ä¸­çš„ä»·å€¼ã€‚

- `packages/nop-debugger/src/controller-helpers.ts:105-107` å½“å‰ `requestKey` ä»…ç”± `method + url + nodeId + path` ç»„æˆï¼Œæ— æ³•åŒºåˆ†åŒä¸€èŠ‚ç‚¹å¯¹åŒä¸€ URL çš„å¹¶å‘è¯·æ±‚ï¼Œä¹Ÿæ— æ³•åŒºåˆ†ç›¸åŒ URL ä¸åŒ payload çš„å¹¶å‘å®žä¾‹ã€‚
- `packages/nop-debugger/src/adapters.ts:146-166` å’Œ `:181-239` ç›®å‰çš„ API äº‹ä»¶å½’å¹¶ä»ç„¶ä¸»è¦ä¾èµ–è¯¥å¼± `requestKey`ï¼Œå› æ­¤ `waitForEvent()`ã€Network å½’å¹¶å’Œ interaction trace åœ¨é«˜å¹¶å‘åœºæ™¯ä¸‹ä¸å¤Ÿç¨³å®šã€‚
- `packages/nop-debugger/src/controller.ts:35-85` å½“å‰ `inspectByCid()` è¿”å›ž `formState`ã€`scopeData`ã€`tagName`ã€`className`ï¼Œä½†æ²¡æœ‰ç¨³å®šçš„ `scopeChain`ã€props/meta æ‘˜è¦ã€registry/debug snapshot è¡¥å……ä¿¡æ¯ï¼Œå› æ­¤â€œå€¼æ¥è‡ªå“ªé‡Œâ€ä»ç„¶éš¾ä»¥å®šä½ã€‚
- `packages/nop-debugger/src/panel.tsx:128-131` å’Œ `packages/nop-debugger/src/panel/node-tab.tsx:226-239` ä¸­çš„ Expression Evaluator ä»æ˜¯ç¦ç”¨å ä½ï¼Œè€Œä¸æ˜¯å¯ç”¨è¯Šæ–­èƒ½åŠ›ã€‚
- `packages/nop-debugger/src/diagnostics.ts:273-320` å½“å‰ `getInteractionTrace()` ä¸»è¦é  `requestKey/actionType/nodeId/path` åšå¯å‘å¼å…³è”ï¼Œè¿˜æ²¡æœ‰æ˜¾å¼ interaction idã€parent event id æˆ– request instance idã€‚
- `tests/e2e/debugger.spec.ts` å·²è¦†ç›–åŸºç¡€ UI å’Œ automation API å¯è®¿é—®æ€§ï¼Œä½†å°šæœªæŠŠ `waitForEvent()`ã€`inspectByElement()`ã€`getInteractionTrace()`ã€`exportSession()` ç­‰çœŸæ­£å½“ä½œè‡ªåŠ¨åŒ–è¯Šæ–­å¥‘çº¦æ¥å›žå½’æµ‹è¯•ã€‚

## Root Cause

- ç¬¬ä¸€é˜¶æ®µå®žçŽ°ä¼˜å…ˆå®Œæˆâ€œå¯æŽ¥å…¥ã€å¯å±•ç¤ºã€å¯æŸ¥è¯¢â€çš„ debugger åŸºçº¿ï¼Œå…ˆè®©äº‹ä»¶æµã€é¢æ¿å’Œ automation API è·‘èµ·æ¥ï¼Œå°šæœªå¯¹å¤æ‚å¹¶å‘ã€ä¸¥æ ¼å› æžœé“¾å’Œå¥‘çº¦çº§æµ‹è¯•åšç¬¬äºŒè½®è®¾è®¡æ”¶å£ã€‚
- çŽ°æœ‰ monitor å¥‘çº¦ `packages/flux-core/src/types/renderer-api.ts:41-48` å’Œ action/api ä¸ŠæŠ¥é“¾è·¯ `packages/flux-runtime/src/action-runtime.ts` / `request-runtime.ts` ä¸»è¦æ˜¯â€œå…³é”®èŠ‚ç‚¹ä¸ŠæŠ¥â€ï¼Œä¸æ˜¯ä¸ºä¸¥æ ¼ tracing ç³»ç»Ÿè®¾è®¡çš„ï¼Œå› æ­¤å½“å‰ trace åªèƒ½åšåˆ°å¯å‘å¼å…³è”ã€‚
- `ComponentHandle` / `ComponentHandleRegistry` å½“å‰åªæš´éœ²äº†æœ€å°è¿è¡Œæ—¶èƒ½åŠ›å’Œ `getDebugSnapshot()`ï¼Œä½†å¹¶æ²¡æœ‰åŽŸç”Ÿæ‰¿è½½ debugger æ‰€éœ€çš„ richer inspect dataï¼Œå› æ­¤ inspect å¢žå¼ºå¿…é¡»ä»¥â€œå¥‘çº¦æœ€å°è¡¥å¼º + controller èšåˆâ€ä¸ºåŽŸåˆ™æŽ¨è¿›ã€‚
- å…ˆå‰ E2E ç›®æ ‡æ›´å¤šæ˜¯ç¡®è®¤ UI å­˜åœ¨å’Œé¢æ¿å¯æ“ä½œï¼Œè€Œä¸æ˜¯æŠŠ debugger å½“ä½œâ€œæµ‹è¯•å¤±è´¥åŽçš„ç¬¬ä¸€è¯Šæ–­æ•°æ®æºâ€æ¥è®¾è®¡ã€‚

## Goals

- è®© `nop-debugger` åœ¨å¤æ‚å¼‚æ­¥å’Œå¹¶å‘åœºæ™¯ä¸‹æä¾›ç¨³å®šçš„ request/action/interaction å…³è”èƒ½åŠ›ã€‚
- è®© `inspectByCid()` å’Œ Node Tab æä¾›è¶³å¤Ÿå¼ºçš„ scopeã€propsã€metaã€handle ä¸Šä¸‹æ–‡ï¼Œæ”¯æŒ AI å’Œå¼€å‘è€…ç›´æŽ¥åšé¦–è½®è¯Šæ–­ã€‚
- æŠŠ `waitForEvent()`ã€`getInteractionTrace()`ã€`exportSession()`ã€`inspectByElement()` æå‡ä¸ºç»è¿‡ E2E å›žå½’ä¿æŠ¤çš„æ­£å¼è‡ªåŠ¨åŒ–å¥‘çº¦ã€‚
- æä¾›æ›´é«˜å±‚ã€å¯¹ AI æ›´å‹å¥½çš„å¤±è´¥æ‘˜è¦æŽ¥å£ï¼Œé™ä½Žæ¯æ¬¡æµ‹è¯•å¤±è´¥åŽé‡æ–°æ‰‹å·¥èšåˆäº‹ä»¶çš„æˆæœ¬ã€‚
- åœ¨ä¿æŒå®‰å…¨è¾¹ç•Œçš„å‰æä¸‹ï¼Œä¸º Node çº§è¡¨è¾¾å¼è¯Šæ–­é¢„ç•™æˆ–è½åœ°å—æŽ§çš„ evaluator èƒ½åŠ›ã€‚

## Non-Goals

- ä¸æŠŠ `nop-debugger` å‡çº§ä¸ºå®Œæ•´åˆ†å¸ƒå¼ tracing å¹³å°ã€‚
- ä¸å¼•å…¥è¿œç¨‹æ—¥å¿—ä¸ŠæŠ¥ã€åŽç«¯ä¼šè¯å­˜å‚¨æˆ–çº¿ä¸Šç”Ÿäº§ç›‘æŽ§å¹³å°èƒ½åŠ›ã€‚
- ä¸å¼€æ”¾ä»»æ„ JS æ‰§è¡Œå™¨ç»™ debugger UI æˆ– automation APIã€‚
- ä¸é‡åšå½“å‰ panel è§†è§‰å½¢æ€æˆ– playground ä¿¡æ¯æž¶æž„ï¼Œé™¤éžæ”¹åŠ¨ç›´æŽ¥æœåŠ¡äºŽæœ¬è®¡åˆ’ä¸­çš„è¯Šæ–­èƒ½åŠ›ã€‚
- ä¸ä¸ºäº† debugger éœ€æ±‚æ‰“ç ´çŽ°æœ‰ `flux-core -> flux-runtime -> flux-react -> nop-debugger` çš„ä¾èµ–è¾¹ç•Œã€‚

## Fix Plan

**Phase 0 â€” æ–‡æ¡£å†»ç»“ä¸Žå¥‘çº¦æ ¡å‡†**

Targets: `docs/architecture/debugger-runtime.md`, `README.md`, `apps/playground/src/pages/FluxBasicPage.tsx`, `apps/playground/src/pages/DebuggerLabPage.tsx`

- æ¸…ç†ä»ç„¶æ®‹ç•™çš„æ—§æœ¯è¯­ï¼Œç»Ÿä¸€ä»¥ `window.__NOP_DEBUGGER_API__` / `window.__NOP_DEBUGGER_HUB__` ä¸ºå”¯ä¸€å…¨å±€ API åç§°ï¼Œä¸å†å‡ºçŽ° `__NOP_FLUX_DEBUGGER_API__`ã€‚
- åœ¨ `docs/architecture/debugger-runtime.md` ä¸­è¡¥å……ä¸€ä¸ªâ€œautomation contractâ€å°èŠ‚ï¼Œæ˜Žç¡®å“ªäº›æ–¹æ³•å±žäºŽç¨³å®šæŽ¥å£ï¼Œå“ªäº›åªæ˜¯å½“å‰ UI ä¾¿æ·èƒ½åŠ›ã€‚
- æ ¡æ­£ playground é¡µé¢é‡Œçš„ AI è„šæœ¬ç¤ºä¾‹å’Œè¯´æ˜Žæ–‡å­—ï¼Œç¡®ä¿ç¤ºä¾‹ä»£ç ä¸ŽçœŸå®žå…¨å±€ API ä¸€è‡´ã€‚
- ä¸ºåŽç»­ Phase 1-4 è¡¥ä¸€ä¸ªæœ€å°æœ¯è¯­è¡¨ï¼š`requestKey`ã€`requestInstanceId`ã€`interactionId`ã€`trace anchor event`ã€`scopeChain`ã€`node inspect payload`ã€‚

Exit criteria: æ–‡æ¡£ã€READMEã€playground ç¤ºä¾‹å’Œå½“å‰å®žçŽ°ä½¿ç”¨åŒä¸€å¥— debugger æœ¯è¯­å’Œå…¨å±€å‘½åï¼Œä¸å†è¯¯å¯¼ AIã€ç”¨æˆ·æˆ–æµ‹è¯•è„šæœ¬ã€‚

**Phase 1 â€” ç¨³å®šè¯·æ±‚å®žä¾‹æ ‡è¯†ä¸Žäº‹ä»¶å› æžœå­—æ®µ**

Targets: `packages/flux-core/src/types/renderer-api.ts`, `packages/flux-core/src/types/actions.ts`, `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/controller-helpers.ts`, `packages/nop-debugger/src/adapters.ts`, `packages/nop-debugger/src/diagnostics.ts`, tests under `packages/nop-debugger/src/*.test.ts`

- åœ¨ debugger å†…éƒ¨äº‹ä»¶æ¨¡åž‹ä¸­åŒºåˆ†ä¸¤å±‚æ¦‚å¿µï¼š
  - `requestKey`ï¼šç”¨äºŽâ€œè¯­ä¹‰ç›¸åŒè¯·æ±‚â€çš„å½’ç±»
  - `requestInstanceId`ï¼šç”¨äºŽåŒºåˆ†å…·ä½“æŸä¸€æ¬¡è¯·æ±‚å®žä¾‹
- æ–°å¢žäº‹ä»¶å…³è”å­—æ®µï¼Œè‡³å°‘åŒ…æ‹¬ï¼š
  - `requestInstanceId?`
  - `interactionId?`
  - `parentEventId?` æˆ–ç­‰ä»·çš„ `parentSpanId?`
- å¯¹ `api:start` / `api:end` / `api:abort` äº‹ä»¶æ”¹ä¸ºæŒ‰å®žä¾‹å…³è”ï¼Œä¸å†åªé è¯­ä¹‰ key å½’å¹¶ã€‚
- ä¿æŒçŽ°æœ‰ monitor å¥‘çº¦å°½é‡æœ€å°å˜åŠ¨ï¼šå¦‚æžœ `flux-core` ä¸Šæ¸¸ monitor payload æš‚ä¸å¢žåŠ æ–°å­—æ®µï¼Œåˆ™ç”± `nop-debugger` åœ¨ `decorateEnv()` / `fetcher` wrapper / `beforeAction` è¾¹ç•Œè‡ªè¡Œç”Ÿæˆå¹¶ä¼ æ’­æœ€å°å…³è”ä¸Šä¸‹æ–‡ã€‚
- `getInteractionTrace()` åœ¨ä¿æŒçŽ°æœ‰å¯å‘å¼å…¼å®¹çš„å‰æä¸‹ï¼Œä¼˜å…ˆæ¶ˆè´¹æ–°çš„ instance/interaction å…³è”å­—æ®µï¼›åªæœ‰æ²¡æœ‰æ–°å­—æ®µæ—¶æ‰å›žé€€åˆ°æ—§çš„ `requestKey/nodeId/path/actionType` è§„åˆ™ã€‚
- æ›´æ–° Network Tab çš„å½’å¹¶é€»è¾‘ï¼Œè®©å…¶æŒ‰ request instance èšåˆï¼Œå†æä¾›å¯é€‰çš„â€œæŒ‰ requestKey åˆ†ç»„â€è§†å›¾ï¼Œè€Œä¸æ˜¯åè¿‡æ¥ã€‚

Exit criteria: å¹¶å‘è¯·æ±‚ã€åŒ URL ä¸åŒ payloadã€åŒèŠ‚ç‚¹é‡å¤æäº¤ç­‰åœºæ™¯ä¸‹ï¼Œ`waitForEvent()`ã€Network å½’å¹¶å’Œ interaction trace éƒ½èƒ½ç¨³å®šæŒ‡å‘æŸä¸€æ¬¡å…·ä½“è¯·æ±‚å®žä¾‹ï¼Œè€Œä¸æ˜¯æ¨¡ç³ŠåŒ¹é…åˆ°â€œæŸä¸€ç±»è¯·æ±‚â€ã€‚

**Phase 2 â€” å¢žå¼º inspect payload ä¸Ž Node diagnostics**

Targets: `packages/flux-core/src/types/renderer-component.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/panel/node-tab.tsx`, related tests

- æ‰©å±• `NopComponentInspectResult`ï¼Œè‡³å°‘è¡¥é½ï¼š
  - `scopeChain?: Array<{ id?: string; label: string; data: Record<string, unknown> }>`
  - `metaSummary?: Record<string, unknown>`
  - `propsSummary?: Record<string, unknown>`
  - `availableMethods?: readonly string[]`
  - `registryEntry?` æˆ–ç­‰ä»·å¥æŸ„æ‘˜è¦
- è°ƒç ”å½“å‰ `ScopeRef` / `FormRuntime` / `RendererComponentProps` å¯ç¨³å®šæ‹¿åˆ°å“ªäº›è°ƒè¯•æ•°æ®ï¼Œä¼˜å…ˆä½¿ç”¨çŽ°æœ‰å…¬å¼€èƒ½åŠ›ï¼›å¦‚éœ€æ–°å¢ž debug-only å¥‘çº¦ï¼Œä¿æŒæœ€å°ã€åªè¯»ã€æ— å‰¯ä½œç”¨ã€‚
- å¦‚æžœ `ComponentHandle` éœ€è¦è¡¥å……è°ƒè¯•æŽ¥å£ï¼Œä¼˜å…ˆå¢žåŠ ç±»ä¼¼ `getDebugData?(): Record<string, unknown>` æˆ–ç­‰ä»·çš„ capabilities å­èƒ½åŠ›ï¼Œè€Œä¸æ˜¯æŠŠ runtime ç§æœ‰çŠ¶æ€ç›´æŽ¥æš´éœ²ç»™ debuggerã€‚
- åœ¨ Node Tab ä¸­åˆ†å¼€å±•ç¤ºï¼š
  - Handle / DOM æ¦‚è§ˆ
  - Props / Meta æ‘˜è¦
  - Form State
  - Scope Chain
  - Recent node events
- è®© `getNodeDiagnostics()` ä¸Ž `inspectByCid()` ä¹‹é—´å»ºç«‹æ›´æ¸…æ™°çš„äº’è¡¥å…³ç³»ï¼šinspect é¢å‘â€œå½“å‰èŠ‚ç‚¹çŠ¶æ€â€ï¼Œdiagnostics é¢å‘â€œå½“å‰èŠ‚ç‚¹æœ€è¿‘è¡Œä¸ºâ€ã€‚å¿…è¦æ—¶æ–°å¢ž `getNodeInspectSnapshot()` èšåˆæŽ¥å£ï¼Œé¿å… UI å’Œ AI åå¤æ‰‹å·¥æ‹¼è£…ä¸¤ä¸ªæŽ¥å£çš„ç»“æžœã€‚

Exit criteria: é€‰ä¸­é¡µé¢èŠ‚ç‚¹åŽï¼Œå¼€å‘è€…å’Œ AI éƒ½èƒ½ç›´æŽ¥çœ‹è§â€œå½“å‰èŠ‚ç‚¹æ˜¯ä»€ä¹ˆã€æ¥è‡ªå“ªä¸ª handleã€æ‹¿åˆ°äº†ä»€ä¹ˆ props/metaã€å¤„åœ¨å“ªæ¡ scope chain ä¸Šã€æœ€è¿‘å‘ç”Ÿè¿‡ä»€ä¹ˆäº‹ä»¶â€ï¼Œè€Œä¸æ˜¯åªçœ‹åˆ°ä¸€å±‚ `scopeData` å¿«ç…§ã€‚

**Phase 3 â€” AI å‹å¥½çš„é«˜å±‚å¤±è´¥æ‘˜è¦ä¸Žå¼‚å¸¸æŽ¥å£**

Targets: `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/diagnostics.ts`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/automation.ts`, tests

- åœ¨çŽ°æœ‰ `createDiagnosticReport()` ä¹‹å¤–ï¼Œæ–°å¢žæ›´èšç„¦çš„é«˜å±‚æ‘˜è¦æŽ¥å£ï¼Œä¾‹å¦‚ï¼š
  - `getLatestFailedRequest()`
  - `getLatestFailedAction()`
  - `getNodeAnomalies({ nodeId | path })`
  - `getRecentFailures({ sinceTimestamp, limit })`
- é«˜å±‚æ‘˜è¦å¯¹è±¡å¿…é¡»ç»“æž„åŒ–ï¼Œä¸èƒ½åªæ˜¯æ‹¼å­—ç¬¦ä¸²ï¼›éœ€è¦ç›´æŽ¥åŒ…å«å…³é”®äº‹ä»¶å¼•ç”¨ã€request instanceã€node ä¿¡æ¯å’Œå·²èšåˆçš„ probable cause hintsã€‚
- â€œprobable cause hintsâ€ åªåšç®€å•ã€ç¡®å®šæ€§çš„è§„åˆ™æç¤ºï¼Œä¾‹å¦‚ï¼š
  - request aborted
  - repeated render bursts
  - action ended with error after api failure
  - form has validation errors before submit
- ä¿æŒè¿™äº› hint æ˜¯è¾…åŠ©å­—æ®µï¼Œä¸æŠŠ debugger å˜æˆé»‘ç®±è¯Šæ–­ç³»ç»Ÿã€‚
- `createDiagnosticReport()` å¯é€‰æ‹©æ€§å¼•ç”¨è¿™äº›é«˜å±‚æ‘˜è¦ï¼Œä½†ä¸å¼ºåˆ¶æ”¹å˜çŽ°æœ‰è¾“å‡ºç»“æž„ï¼Œä¼˜å…ˆåšå‘åŽå…¼å®¹å¢žå¼ºã€‚

Exit criteria: å½“è‡ªåŠ¨åŒ–æµ‹è¯•å¤±è´¥æ—¶ï¼ŒAI ä¸éœ€è¦æ¯æ¬¡ä»Žé›¶éåŽ†æ‰€æœ‰ events å°±èƒ½æ‹¿åˆ°â€œæœ€è¿‘å¤±è´¥çš„è¯·æ±‚/åŠ¨ä½œ/èŠ‚ç‚¹å¼‚å¸¸â€è¿™ç§é¦–è½®è¯Šæ–­ææ–™ã€‚

**Phase 4 â€” Node çº§è¡¨è¾¾å¼è¯Šæ–­èƒ½åŠ›ï¼ˆå—æŽ§ï¼‰**

Targets: `packages/nop-debugger/src/panel.tsx`, `packages/nop-debugger/src/panel/node-tab.tsx`, `packages/nop-debugger/src/controller.ts`, potentially `packages/flux-formula` integration points, tests/docs

- æŠŠå½“å‰ç¦ç”¨å ä½çš„ Expression Evaluator æ”¹æˆçœŸæ­£å¯ç”¨çš„â€œå…¬å¼/è¡¨è¾¾å¼è°ƒè¯•å™¨â€ï¼Œä½†åªå…è®¸èµ°çŽ°æœ‰è¡¨è¾¾å¼å¼•æ“Žï¼Œä¸å…è®¸æ‰§è¡Œä»»æ„ JSã€‚
- è®¾è®¡ä¸€ä¸ªå—æŽ§æŽ¥å£ï¼Œä¾‹å¦‚ï¼š
  - `evaluateNodeExpression({ cid, expression })`
  - æˆ– `evaluateScopeExpression({ scopeChain, expression })`
- ä¸Šä¸‹æ–‡é»˜è®¤ä»¥å½“å‰èŠ‚ç‚¹æœ€å†…å±‚ scope ä¸ºæ ¹ï¼Œå¹¶åœ¨è¿”å›žç»“æžœæ—¶åŒæ—¶å¸¦ä¸Šï¼š
  - ç»“æžœå€¼
  - è§£æžé”™è¯¯ï¼ˆå¦‚æœ‰ï¼‰
  - ç”¨åˆ°çš„ä¸»è¦å˜é‡é”®ï¼ˆå¦‚æžœè¡¨è¾¾å¼å¼•æ“Žå¯æä¾›ï¼‰
- UI å±‚åªä½œä¸ºå…¥å£ï¼ŒçœŸæ­£èƒ½åŠ›åº”åŒæ—¶é€šè¿‡ automation API æš´éœ²ï¼Œè¿™æ · AI åœ¨é›†æˆæµ‹è¯•ä¸­ä¹Ÿèƒ½ä½¿ç”¨ã€‚
- å¦‚å®žçŽ°æˆæœ¬æˆ–å®‰å…¨è¾¹ç•Œæš‚æ—¶ä¸æ»¡è¶³ï¼Œæœ¬é˜¶æ®µå…è®¸é™çº§ä¸ºâ€œè®¡åˆ’å†… deferred itemâ€ï¼Œä½†å¿…é¡»æ˜Žç¡®åŽŸå› å’Œæ›¿ä»£æŽ¥å£ï¼Œè€Œä¸æ˜¯ç»§ç»­ä¿ç•™è¯¯å¯¼æ€§çš„å‡å…¥å£ã€‚

Exit criteria: Node Tab ä¸­çš„è¡¨è¾¾å¼è°ƒè¯•è¦ä¹ˆæˆä¸ºæ­£å¼å¯ç”¨åŠŸèƒ½ï¼Œè¦ä¹ˆè¢«æ˜Žç¡®ç§»é™¤/é™çº§ï¼Œä¸å†å­˜åœ¨çœ‹ä¼¼å¯ç”¨ä½†å®žé™…è¢«ç¡¬ç¼–ç ç¦ç”¨çš„å…¥å£ã€‚

**Phase 5 â€” å¥‘çº¦çº§ E2E å›žå½’ä¸Žå®žéªŒé¢å‡çº§**

Targets: `tests/e2e/debugger.spec.ts`, new focused e2e specs if needed, `apps/playground/src/pages/FluxBasicPage.tsx`, `apps/playground/src/pages/DebuggerLabPage.tsx`

- æŠŠ debugger å½“ä½œè‡ªåŠ¨åŒ–å¥‘çº¦æ¥å†™ E2Eï¼Œè€Œä¸æ˜¯åªæµ‹è¯• UI å¯è§æ€§ã€‚æ–°å¢žè‡³å°‘ä»¥ä¸‹çœŸå®žåœºæ™¯ï¼š
  - åœ¨ `FluxBasicPage` æäº¤çœŸå®žè¡¨å•åŽï¼Œä½¿ç”¨ `waitForEvent({ kind: 'api:end' })` ç­‰å¾…å¹¶æ ¡éªŒå“åº”äº‹ä»¶
  - æ ¡éªŒ `getInteractionTrace({ inferFromLatest: true })` èƒ½è¿”å›žè¯¥æ¬¡æäº¤é“¾è·¯
  - å¯¹çœŸå®žé¡µé¢ä¸­çš„è¡¨å•æˆ–å­—æ®µèŠ‚ç‚¹æ‰§è¡Œ `inspectByElement()` / `inspectByCid()` å¹¶æ–­è¨€ç»“æžœç»“æž„
  - æ ¡éªŒ `exportSession()` å¯¹æ•æ„Ÿå­—æ®µè„±æ•
  - æ ¡éªŒ request instance çº§å½’å¹¶åœ¨å¹¶å‘è¯·æ±‚åœºæ™¯ä¸‹æ­£ç¡®å·¥ä½œ
- åœ¨ `DebuggerLabPage` ä¸­å¢žåŠ ä¸“é—¨ç”¨äºŽè‡ªåŠ¨åŒ–éªŒè¯çš„åœºæ™¯æŒ‰é’®æˆ–å±•ç¤ºåŒºåŸŸï¼Œä¾‹å¦‚ï¼š
  - å¹¶å‘ API åœºæ™¯
  - request abort åœºæ™¯
  - action -> api -> error å¤åˆé“¾è·¯åœºæ™¯
  - inspect seed èŠ‚ç‚¹
- å¯¹ automation API çš„å›žå½’ä¼˜å…ˆä½¿ç”¨ `page.evaluate()` ç›´æŽ¥è¯»å…¨å±€ APIï¼Œè€Œä¸æ˜¯é€šè¿‡ panel DOM æ–‡æœ¬æ–­è¨€ã€‚

Exit criteria: `waitForEvent()`ã€`getInteractionTrace()`ã€`inspectByElement()`ã€`exportSession()` å’Œ request instance å½’å¹¶è¯­ä¹‰éƒ½è¢« Playwright ç›´æŽ¥ä¿æŠ¤ï¼Œdebugger çœŸæ­£æˆä¸ºé›†æˆæµ‹è¯•è¯Šæ–­åŸºç¡€è®¾æ–½çš„ä¸€éƒ¨åˆ†ã€‚

**Phase 6 â€” æ–‡æ¡£æ”¶å£ä¸Žå…¼å®¹æ€§å®¡æŸ¥**

Targets: `docs/architecture/debugger-runtime.md`, `README.md`, `docs/logs/`, touched package docs/tests

- åœ¨æ‰€æœ‰èƒ½åŠ›è½åœ°åŽï¼Œæ›´æ–° `docs/architecture/debugger-runtime.md`ï¼Œæ˜Žç¡®ç¬¬äºŒé˜¶æ®µç›®æ ‡å“ªäº›å·²ç»è½åœ°ï¼Œå“ªäº›è¢« deferredã€‚
- æ›´æ–° README ä¸­ debugger å’Œ AI è°ƒè¯•ç¤ºä¾‹ï¼Œç¡®ä¿ç¤ºä¾‹æ–¹æ³•å’Œå…¨å±€å¯¹è±¡åç§°å‡†ç¡®ã€‚
- æ¯ä¸ªé˜¶æ®µå®ŒæˆåŽè¡¥ daily logï¼Œè®°å½•å…³é”®å–èˆå’Œæœªåšäº‹é¡¹ã€‚
- å¦‚æžœæŸä¸ªèƒ½åŠ›éœ€è¦ä¿®æ”¹ `flux-core` å¥‘çº¦ï¼Œè¡¥ä¸€æ®µâ€œä¸ºä»€ä¹ˆå€¼å¾—è¿› coreï¼Œè€Œä¸æ˜¯åœç•™åœ¨ debugger æœ¬åœ°èšåˆâ€çš„è¯´æ˜Žï¼Œé¿å…åŽç»­å†æ¬¡æ¼‚ç§»ã€‚

Exit criteria: æ–‡æ¡£ã€ä»£ç ã€è‡ªåŠ¨åŒ–ç¤ºä¾‹å’Œæµ‹è¯•å¥‘çº¦å¯¹åŒä¸€å¥— debugger èƒ½åŠ›æè¿°ä¸€è‡´ï¼Œä¸å†ä¾èµ–æ—§åˆ†æžæ–‡æ¡£æˆ– plan æ–‡ä»¶çŒœæµ‹å½“å‰çŠ¶æ€ã€‚

## Scope

- `docs/architecture/debugger-runtime.md`
- `README.md`
- `docs/logs/2026/04-04.md`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-core/src/types/renderer-api.ts`
- `packages/flux-core/src/types/renderer-component.ts`
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller-helpers.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/node-tab.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`
- `apps/playground/src/pages/DebuggerLabPage.tsx`
- `tests/e2e/debugger.spec.ts`
- ç›¸å…³å•å…ƒæµ‹è¯•æ–‡ä»¶

## ä¸åœ¨ Scope å†…çš„äº‹é¡¹

- debugger è¿œç¨‹ä¸Šä¼ ã€æœåŠ¡ç«¯å­˜å‚¨æˆ–çº¿ä¸Šä¼šè¯å›žæ”¾
- ç‹¬ç«‹ç›‘æŽ§åŽç«¯ã€å‘Šè­¦ç³»ç»Ÿæˆ– tracing å¹³å°æŽ¥å…¥
- æŠŠ playground é‡æž„æˆæ–°çš„äº§å“çº§ DevTools åº”ç”¨
- å¤§è§„æ¨¡é‡å†™ panel è§†è§‰ç³»ç»Ÿæˆ–åˆ‡æ¢ UI æ¡†æž¶
- éž debugger ç›®æ ‡é©±åŠ¨çš„ `flux-runtime` / `flux-react` ç»“æž„é‡æž„

## Effort

- é¢„è®¡ 7-10 ä¸ªå·¥ä½œæ—¥ã€‚
- å»ºè®®æ‹†æˆ 6 ä¸ªç‹¬ç«‹æ‰§è¡Œåˆ‡ç‰‡ï¼šæœ¯è¯­æ ¡å‡†ã€è¯·æ±‚å®žä¾‹ä¸Žå› æžœå­—æ®µã€inspect å¢žå¼ºã€é«˜å±‚å¤±è´¥æ‘˜è¦ã€è¡¨è¾¾å¼è¯Šæ–­ã€å¥‘çº¦çº§ E2Eã€‚
- `Phase 1` ä¸Ž `Phase 2` å¯ä»¥å¹¶è¡Œè®¾è®¡ï¼Œä½†å®žçŽ°ä¸Šå»ºè®®å…ˆå®Œæˆ `Phase 1`ï¼Œå› ä¸º inspect ä¸Ž trace éƒ½ä¼šä¾èµ–æ–°çš„å…³è”æ¨¡åž‹ã€‚
- `Phase 3` ä¸Ž `Phase 5` å¯ä»¥éƒ¨åˆ†å¹¶è¡Œï¼šæ‘˜è¦æŽ¥å£è½åœ°åŽå³å¯å¼€å§‹è¡¥ E2Eã€‚

## Verification

æ¯ä¸ªé˜¶æ®µè‡³å°‘æ‰§è¡Œ `@nop-chaos/nop-debugger` åŒ…çº§éªŒè¯ï¼›è‹¥è§¦åŠ core/runtime/reactï¼Œå†è¿½åŠ å¯¹åº”åˆ†åŒ…éªŒè¯ã€‚æœ€ç»ˆåšå…¨ä»“éªŒè¯ã€‚

```bash
pnpm --filter @nop-chaos/nop-debugger typecheck
pnpm --filter @nop-chaos/nop-debugger build
pnpm --filter @nop-chaos/nop-debugger lint
pnpm --filter @nop-chaos/nop-debugger test

pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-core test

pnpm --filter @nop-chaos/flux-runtime typecheck
pnpm --filter @nop-chaos/flux-runtime build
pnpm --filter @nop-chaos/flux-runtime lint
pnpm --filter @nop-chaos/flux-runtime test

pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-react test

pnpm test:e2e

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

## Acceptance Criteria

- å¹¶å‘è¯·æ±‚åœºæ™¯ä¸‹ï¼Œdebugger äº‹ä»¶å¯ç¨³å®šåŒºåˆ†â€œè¯­ä¹‰ç›¸åŒè¯·æ±‚â€å’Œâ€œæŸä¸€æ¬¡è¯·æ±‚å®žä¾‹â€ã€‚
- `getInteractionTrace()` ä¼˜å…ˆä¾èµ–æ˜¾å¼å…³è”å­—æ®µï¼Œè€Œä¸æ˜¯åªé æ—§å¯å‘å¼åŒ¹é…ã€‚
- `inspectByCid()` / `inspectByElement()` è¿”å›žçš„ç»“æž„è¶³å¤Ÿå±•ç¤º scope chainã€props/meta æ‘˜è¦å’Œ handle æ‘˜è¦ã€‚
- Node Tab çš„è¡¨è¾¾å¼å…¥å£è¦ä¹ˆå¯ç”¨ã€å¯æµ‹è¯•ã€å¯é€šè¿‡ automation API è°ƒç”¨ï¼Œè¦ä¹ˆè¢«æ˜Žç¡®åˆ é™¤å¹¶åœ¨æ–‡æ¡£ä¸­è¯´æ˜Žã€‚
- `waitForEvent()`ã€`getInteractionTrace()`ã€`inspectByElement()`ã€`exportSession()` éƒ½æœ‰ E2E å›žå½’è¦†ç›–ã€‚
- æ–‡æ¡£ã€READMEã€playground ç¤ºä¾‹å’Œä»£ç ä½¿ç”¨åŒä¸€å¥— debugger å…¨å±€å¯¹è±¡åç§°ä¸Žæœ¯è¯­ã€‚

## é£Žé™©ä¸Žå›žé€€

- é£Žé™© 1ï¼šå¦‚æžœè¿‡æ—©æŠŠ tracing å­—æ®µä¸ŠæŽ¨åˆ° `flux-core` monitor å¥‘çº¦ï¼Œå¯èƒ½å¯¼è‡´è·¨åŒ…æ”¹åŠ¨è¿‡å¤§ã€‚è§„é¿æ–¹å¼ï¼šä¼˜å…ˆåœ¨ `nop-debugger` æœ¬åœ° wrapper ä¸­ç”Ÿæˆå…³è”å­—æ®µï¼Œåªæœ‰è¯æ˜Žå¤šä¸ªè°ƒç”¨ç‚¹éƒ½éœ€è¦æ—¶æ‰ä¸ŠæŽ¨å¥‘çº¦ã€‚
- é£Žé™© 2ï¼šinspect å¢žå¼ºè‹¥ç›´æŽ¥æš´éœ² runtime ç§æœ‰çŠ¶æ€ï¼Œå®¹æ˜“ç ´ååŒ…è¾¹ç•Œã€‚è§„é¿æ–¹å¼ï¼šä¼˜å…ˆèµ°åªè¯» debug snapshot æˆ–æœ€å°åŒ– debug capabilityï¼Œè€Œä¸æ˜¯é€ä¼ å†…éƒ¨å¯¹è±¡ã€‚
- é£Žé™© 3ï¼šè¡¨è¾¾å¼ evaluator è‹¥è¾¹ç•Œä¸æ¸…ï¼Œå®¹æ˜“é€€åŒ–æˆä»»æ„ä»£ç æ‰§è¡Œã€‚è§„é¿æ–¹å¼ï¼šåªå…è®¸æ—¢æœ‰å…¬å¼/è¡¨è¾¾å¼å¼•æ“Žï¼Œä¸å…è®¸ JS `eval` / `new Function`ã€‚
- é£Žé™© 4ï¼šE2E è‹¥ç»§ç»­ä¾èµ– panel DOMï¼Œä¼šè®©å¥‘çº¦æµ‹è¯•è„†å¼±ã€‚è§„é¿æ–¹å¼ï¼šæ‰€æœ‰å…³é”®è‡ªåŠ¨åŒ–æ–­è¨€éƒ½é€šè¿‡ `window.__NOP_DEBUGGER_API__` è¿›è¡Œã€‚
- é£Žé™© 5ï¼šworkspace çº§éªŒè¯å¯èƒ½å†æ¬¡å‘½ä¸­ unrelated é—®é¢˜ã€‚è‹¥å‡ºçŽ°è¿™ç§æƒ…å†µï¼ŒæŒ‰ repo è§„èŒƒè®°å½• blockerï¼Œä¸æŠŠ unrelated failure è¯¯è®°ä¸ºæœ¬è®¡åˆ’å›žå½’ã€‚

## Related Documents

- `docs/architecture/debugger-runtime.md`
- `docs/analysis/2026-03-21-framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`

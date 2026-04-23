# NOP Debugger å®Œæ•´å®žçŽ°è®¡åˆ’

> Plan Status: completed
> Last Reviewed: 2026-04-04


> **Implementation Status: âœ… COMPLETED (2026-04-04)**
> **Done (Phases 1â€“3):** JsonViewer with collapsible tree, render throttling, search/filter, localStorage persistence, error badge with count, error aggregation (pinned/latest/earliest buffers), API chain merging, `data-cid` injection on all rendered nodes, `inspectByCid()` global API, Node Tab with scope/form data display, and global `__NOP_DEBUGGER_API__` for automation.
> **Phase 4 completion:** Timeline search supports `path:` queries, `/regex/flags` matching, plain-text highlight, and local history persistence; the event model includes `state:snapshot` entries for attach-time `ActionScope.getDebugSnapshot()` payloads; and large timeline lists now use a lightweight virtualized rendering path when no row is expanded.
>
> This status was re-verified against the codebase on 2026-04-04.
>
> **Independent closure audit (2026-04-23):** task `ses_247c577ecffeLFiBQKekdIbGEH` rechecked the live debugger surface and confirmed the plan can remain `completed`. Current code exposes `window.__NOP_DEBUGGER_API__`, records `state:snapshot` events, supports timeline search/virtualization, and ships the Node inspector UI; the old unchecked verification bullets below are historical checklist drift rather than missing feature work.

> åˆ¶å®šæ—¥æœŸ: 2026-03-29
> åŸºäºŽ: `docs/analysis/2026-03-21-framework-debugger-design.md` è®¾è®¡è‰æ¡ˆ
> çŠ¶æ€: å·²å®Œæˆ

---

## 0. çŽ°çŠ¶ç›˜ç‚¹

### å·²å®žçŽ° âœ…

| æ¨¡å— | æ–‡ä»¶ | çŠ¶æ€ |
|------|------|------|
| **ç±»åž‹å®šä¹‰** | `types.ts` | âœ… å®Œæ•´ï¼ˆå«å…¨éƒ¨äº‹ä»¶ã€æŸ¥è¯¢ã€è¯Šæ–­ã€å¯¼å‡ºã€è„±æ•ç±»åž‹ï¼‰ |
| **Store** | `store.ts` | âœ… å®Œæ•´ï¼ˆappend/clear/pause/resume/filters/pinnedErrorsï¼‰ |
| **Controller** | `controller.ts` | âœ… å®Œæ•´ï¼ˆcreateNopDebuggerã€å…¨éƒ¨ controller APIï¼‰ |
| **äº‹ä»¶é€‚é…å™¨** | `adapters.ts` | âœ… å®Œæ•´ï¼ˆmonitorã€pluginã€fetcherã€notifyã€onActionErrorï¼‰ |
| **è¯Šæ–­å¼•æ“Ž** | `diagnostics.ts` | âœ… å®Œæ•´ï¼ˆquery/overview/nodeDiagnostics/interactionTrace/sessionExport/diagnosticReportï¼‰ |
| **Automation API** | `automation.ts` | âœ… å®Œæ•´ï¼ˆwindow hubã€å•/å¤šå®žä¾‹æ³¨å†Œï¼‰ |
| **è„±æ•** | `redaction.ts` | âœ… å®Œæ•´ï¼ˆé»˜è®¤å…³é”®å­—ã€é€’å½’è„±æ•ã€è‡ªå®šä¹‰å›žè°ƒï¼‰ |
| **Controller Helpers** | `controller-helpers.ts` | âœ… å®Œæ•´ï¼ˆwindowConfig/sessionId/errorFormat/apiFormat/networkSummaryï¼‰ |
| **å…¨å±€å¼€å…³** | `controller-helpers.ts` â†’ `readWindowConfig` | âœ… å®Œæ•´ |
| **å•å…ƒæµ‹è¯•** | 8 ä¸ª `.test.ts/.test.tsx` æ–‡ä»¶ | âœ… æ ¸å¿ƒé€»è¾‘å·²è¦†ç›– |
| **Playground æŽ¥å…¥** | `apps/playground/src/App.tsx` | âœ… å·²æŽ¥å…¥ |
| **UI é¢æ¿ - Overview Tab** | `panel.tsx` | âœ… åŸºç¡€ç‰ˆå·²å®žçŽ°ï¼ˆ6 ä¸ªæŒ‡æ ‡å¡ç‰‡ï¼‰ |
| **UI é¢æ¿ - Timeline Tab** | `panel.tsx` | âœ… åŸºç¡€ç‰ˆå·²å®žçŽ°ï¼ˆç­›é€‰ + äº‹ä»¶åˆ—è¡¨ï¼‰ |
| **UI é¢æ¿ - Network Tab** | `panel.tsx` | âœ… åŸºç¡€ç‰ˆå·²å®žçŽ°ï¼ˆç½‘ç»œäº‹ä»¶åˆ—è¡¨ï¼‰ |
| **æ¼‚æµ®é¢æ¿æ‹–æ‹½** | `panel.tsx` â†’ `useDraggablePosition` | âœ… å·²å®žçŽ° |
| **Launcher** | `panel.tsx` | âœ… åŸºç¡€ç‰ˆå·²å®žçŽ°ï¼ˆæŒ‰é’® + é”™è¯¯è®¡æ•° + æ‹–æ‹½ï¼‰ |
| **CSS ä¸»é¢˜** | `panel.tsx` â†’ `DEBUGGER_STYLES` | âœ… å·²å®žçŽ°ï¼ˆæš—è‰²çŽ»ç’ƒæ€ + badge é…è‰²ï¼‰ |

### æœªå®žçŽ°æˆ–å¾…å¢žå¼º âŒ

| åŠŸèƒ½ | è®¾è®¡æ–‡æ¡£ä½ç½® | ä¼˜å…ˆçº§ | è¯´æ˜Ž |
|------|-------------|--------|------|
| **äº‹ä»¶è¯¦æƒ…å±•å¼€/JSON æŸ¥çœ‹å™¨** | Â§10.3 åº•éƒ¨è¯¦æƒ…åŒº | P0 | å½“å‰ detail ä»…ä»¥ `<code>` å±•ç¤ºï¼Œæ—  JSON ç»“æž„åŒ–æŸ¥çœ‹ |
| **Timeline æ–‡æœ¬æœç´¢** | Â§12.2 ç¬¬ä¸€é˜¶æ®µå¢žå¼º | P1 | å½“å‰æ— æœç´¢æ¡† |
| **é¢æ¿ä½ç½®æŒä¹…åŒ–** | Â§12.2 ç¬¬ä¸€é˜¶æ®µå¢žå¼º | P1 | åˆ·æ–°åŽä½ç½®ä¸¢å¤± |
| **æœ€è¿‘é”™è¯¯è§’æ ‡** | Â§12.2 ç¬¬ä¸€é˜¶æ®µå¢žå¼º | P1 | Launcher ä»…æ˜¾ç¤ºæ–‡å­—ï¼Œæ— è§’æ ‡é«˜äº® |
| **Node Tab** | Â§10.4 Node | P2 | å®Œå…¨æœªå®žçŽ° |
| **é”™è¯¯èšåˆè§†å›¾** | Â§12.2 ç¬¬ä¸€é˜¶æ®µå¢žå¼º | P1 | æ— ç‹¬ç«‹é”™è¯¯åˆ†ç»„/èšåˆ |
| **API åŽ»é‡ä¸Žé“¾è·¯å½’å¹¶ UI** | Â§12.2 ç¬¬ä¸€é˜¶æ®µå¢žå¼º | P1 | åŽç«¯åŽ»é‡é€»è¾‘å·²æœ‰ï¼ˆrequestState Mapï¼‰ï¼ŒUI æ— å½’å¹¶å±•ç¤º |
| **data-cid / inspectByCid** | Â§12.5 æ–°å¢žè®¾è®¡ | P1 | è®¾è®¡å·²ç¡®å®šï¼Œä»£ç å®Œå…¨æœªå®žçŽ° |
| **state:snapshot äº‹ä»¶** | Â§9.2 ç»Ÿä¸€äº‹ä»¶æ¨¡åž‹ | P3 | ç±»åž‹å®šä¹‰ä¸­ç¼ºå¤±ï¼Œæœªåœ¨äº‹ä»¶ç§ç±»ä¸­ |
| **äº‹ä»¶åˆ—è¡¨è™šæ‹ŸåŒ–** | Â§13.2 UI æ€§èƒ½ç­–ç•¥ | P3 | å¤§é‡äº‹ä»¶æ—¶å¯èƒ½å¡é¡¿ |
| **render é«˜é¢‘äº‹ä»¶åˆå¹¶/èŠ‚æµ** | Â§13.2 UI æ€§èƒ½ç­–ç•¥ | P2 | é«˜é¢‘ render äº‹ä»¶å¯èƒ½æ·¹æ²¡å…¶ä»–äº‹ä»¶ |
| **Node Tab - DOM inspect** | Â§12.3 / Â§12.4 | P3 | ä¸åœ¨ç¬¬ä¸€ç‰ˆèŒƒå›´ï¼Œä½† data-cid å·²åšè½»é‡ç‰ˆ |

---

## 1. å®žæ–½é˜¶æ®µæ€»è§ˆ

```
Phase 1 (P0) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  1.1 äº‹ä»¶è¯¦æƒ…å±•å¼€ä¸Ž JSON æŸ¥çœ‹å™¨
  1.2 render äº‹ä»¶èŠ‚æµ
  1.3 Timeline æ–‡æœ¬æœç´¢

Phase 2 (P1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  2.1 é¢æ¿ä½ç½®æŒä¹…åŒ–ï¼ˆlocalStorageï¼‰
  2.2 æœ€è¿‘é”™è¯¯è§’æ ‡é«˜äº®
  2.3 é”™è¯¯èšåˆè§†å›¾
  2.4 API é“¾è·¯å½’å¹¶ UI å±•ç¤º
  2.5 data-cid DOM æ³¨å…¥ä¸Ž inspectByCid

Phase 3 (P2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  3.1 Node Tab å®žçŽ°
  3.2 Network Tab å¢žå¼ºï¼ˆè¯·æ±‚è¯¦æƒ…å±•å¼€ï¼‰

Phase 4 (P3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  4.1 äº‹ä»¶åˆ—è¡¨è™šæ‹ŸåŒ–
  4.2 state:snapshot äº‹ä»¶ç±»åž‹
  4.3 æœç´¢å¢žå¼ºï¼ˆæ­£åˆ™ã€é«˜äº®ï¼‰
```

---

## 2. Phase 1 â€” P0 æ ¸å¿ƒä½“éªŒè¡¥å…¨

### 2.1 äº‹ä»¶è¯¦æƒ…å±•å¼€ä¸Ž JSON æŸ¥çœ‹å™¨

**ç›®æ ‡**: å°†å½“å‰ `<code>` çº¯æ–‡æœ¬å±•ç¤ºå‡çº§ä¸ºç»“æž„åŒ– JSON æŸ¥çœ‹å™¨ã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | æ–°å¢ž `JsonViewer` å†…è”ç»„ä»¶ï¼›ä¸º Timeline / Network äº‹ä»¶æ¡ç›®å¢žåŠ "å±•å¼€è¯¦æƒ…"äº¤äº’ |

**å®žçŽ°ç»†èŠ‚**:

1. **JsonViewer ç»„ä»¶**:
   - æŽ¥æ”¶ `data: unknown` å’Œ `maxDepth?: number`ï¼ˆé»˜è®¤ 3ï¼‰
   - é€’å½’æ¸²æŸ“ JSON æ ‘ï¼Œæ¯å±‚å¯æŠ˜å 
   - å­—ç¬¦ä¸²å€¼ç”¨å¼•å·åŒ…è£¹ï¼Œæ•°å­—/å¸ƒå°”ç”¨ä¸åŒé¢œè‰²
   - null/undefined æ˜¾ç¤ºä¸º italic ç°è‰²
   - è¶…è¿‡ `maxDepth` æ—¶æ˜¾ç¤º `...` å ä½
   - å¤§æ•°ç»„ï¼ˆ>50 é¡¹ï¼‰åªå±•ç¤ºå‰ 10 é¡¹ + æŠ˜å æç¤º

2. **äº‹ä»¶æ¡ç›®äº¤äº’**:
   - æ¯ä¸ªäº‹ä»¶æ¡ç›®å¢žåŠ ç‚¹å‡»å±•å¼€/æ”¶èµ·é€»è¾‘ï¼ˆ`useState` æŽ§åˆ¶ï¼‰
   - å±•å¼€åŽæ˜¾ç¤ºï¼š
     - `detail` å­—æ®µï¼ˆå¦‚æœ‰ï¼‰
     - `exportedData` å­—æ®µ â†’ é€šè¿‡ `JsonViewer` å±•ç¤º
     - `network` å­—æ®µ â†’ é€šè¿‡ `JsonViewer` å±•ç¤ºï¼ˆNetwork Tab ä¸“ç”¨ï¼‰
   - å±•å¼€åŒºåŸŸä½¿ç”¨ `.nop-debugger__entry-expanded` å®¹å™¨

3. **CSS æ–°å¢ž**:
   ```css
   .nop-debugger__entry-expanded {
     display: grid;
     gap: 8px;
     padding: 10px 12px;
     border-radius: 12px;
     background: var(--nop-debugger-detail-bg);
     max-height: 320px;
     overflow: auto;
   }
   .nop-debugger__json-key { color: #9bd9ff; }
   .nop-debugger__json-string { color: #9df3ca; }
   .nop-debugger__json-number { color: #ffd18a; }
   .nop-debugger__json-boolean { color: #dcc0ff; }
   .nop-debugger__json-null { color: var(--nop-debugger-muted-text); font-style: italic; }
   ```

4. **æ•°æ®æ¥æºæ˜ å°„**:
   - äº‹ä»¶æ¡ç›®å¢žåŠ  `onClick` handler â†’ `setExpandedId(prev => prev === event.id ? null : event.id)`
   - å½“ `expandedId === event.id` æ—¶æ¸²æŸ“è¯¦æƒ…åŒºåŸŸ

**éªŒè¯æ ‡å‡†**:
- [ ] ç‚¹å‡»äº‹ä»¶æ¡ç›®å¯å±•å¼€è¯¦æƒ…
- [ ] JSON å±•å¼€åŽå¯æŠ˜å å­èŠ‚ç‚¹
- [ ] Network äº‹ä»¶å¯æŸ¥çœ‹ request/response ç»“æž„åŒ–æ•°æ®
- [ ] å¤§å¯¹è±¡ä¸ä¼šå¯¼è‡´é¢æ¿å¡é¡¿ï¼ˆæƒ°æ€§æ¸²æŸ“ï¼‰

---

### 2.2 render äº‹ä»¶èŠ‚æµ

**ç›®æ ‡**: é˜²æ­¢é«˜é¢‘ render äº‹ä»¶æ·¹æ²¡ Timelineã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/store.ts` | æ–°å¢žèŠ‚æµé€»è¾‘ |
| `packages/nop-debugger/src/adapters.ts` | å¯é€‰ï¼šrender äº‹ä»¶æ ‡è®° source ä»¥æ”¯æŒèŠ‚æµ |

**å®žçŽ°ç»†èŠ‚**:

1. **Store å±‚èŠ‚æµ**:
   - åœ¨ `append()` æ–¹æ³•å†…å¢žåŠ  render äº‹ä»¶èŠ‚æµåˆ¤æ–­
   - è§„åˆ™ï¼šåŒä¸€ä¸ª `nodeId` çš„ `render:start` / `render:end` äº‹ä»¶ï¼Œå¦‚æžœè·ç¦»ä¸Šæ¬¡åŒç±»äº‹ä»¶ä¸è¶³ 100msï¼Œåˆ™è·³è¿‡
   - ä¿ç•™æœ€åŽä¸€æ¬¡ render äº‹ä»¶çš„å¼•ç”¨ï¼Œç¡®ä¿ä¸ä¸¢å¤±æœ€ç»ˆçŠ¶æ€
   - æ–°å¢žå†…éƒ¨çŠ¶æ€ `lastRenderByNode: Map<string, number>` è®°å½•æ¯ä¸ª nodeId æœ€åŽ render äº‹ä»¶æ—¶é—´æˆ³

2. **å®žçŽ°æ–¹æ¡ˆ**:
   ```ts
   // store.ts å†…éƒ¨
   const lastRenderByNode = new Map<string, number>();
   const RENDER_THROTTLE_MS = 100;

   // åœ¨ append å†…éƒ¨
   if (event.group === 'render' && event.nodeId) {
     const lastTime = lastRenderByNode.get(event.nodeId) ?? 0;
     const now = Date.now();
     if (now - lastTime < RENDER_THROTTLE_MS) {
       return; // è·³è¿‡æœ¬æ¬¡
     }
     lastRenderByNode.set(event.nodeId, now);
   }
   ```

3. **ä¿ç•™æ‰€æœ‰ render:end äº‹ä»¶**: å› ä¸º render:end æºå¸¦ durationMsï¼Œè¯Šæ–­ä»·å€¼é«˜ã€‚åªèŠ‚æµ render:startã€‚

**éªŒè¯æ ‡å‡†**:
- [ ] é«˜é¢‘ render ä¸å†æ·¹æ²¡ Timeline
- [ ] ä»ç„¶ä¿ç•™æ¯æ¬¡å®Œæ•´ render çš„ end äº‹ä»¶ï¼ˆå« durationMsï¼‰
- [ ] èŠ‚æµä¸å½±å“å…¶ä»–äº‹ä»¶ç±»åž‹

---

### 2.3 Timeline æ–‡æœ¬æœç´¢

**ç›®æ ‡**: åœ¨ Timeline Tab ä¸­å¢žåŠ æ–‡æœ¬æœç´¢æ¡†ï¼Œæ”¯æŒæŒ‰å…³é”®å­—è¿‡æ»¤äº‹ä»¶ã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | æ–°å¢žæœç´¢è¾“å…¥æ¡† + è¿‡æ»¤é€»è¾‘ |

**å®žçŽ°ç»†èŠ‚**:

1. **æœç´¢è¾“å…¥æ¡†**:
   - ä½äºŽ filter chips ä¸Šæ–¹æˆ–å·¦ä¾§
   - ä½¿ç”¨ `<input type="search">` å…ƒç´ 
   - placeholder: "Search events..."
   - æ ·å¼ä¸ŽçŽ°æœ‰ chip é£Žæ ¼ç»Ÿä¸€

2. **è¿‡æ»¤é€»è¾‘**:
   - æ–°å¢ž `searchText` state
   - åœ¨ `filteredEvents` åŸºç¡€ä¸Šå†åšæ–‡æœ¬è¿‡æ»¤
   - åŒ¹é…å­—æ®µï¼š`summary`ã€`detail`ã€`source`ã€`nodeId`ã€`path`ã€`requestKey`
   - å¤§å°å†™ä¸æ•æ„Ÿ
   - å¤ç”¨ `diagnostics.ts` ä¸­çš„ `includesText` é€»è¾‘

3. **CSS æ–°å¢ž**:
   ```css
   .nop-debugger__search {
     width: 100%;
     padding: 8px 12px;
     border-radius: 999px;
     border: 1px solid var(--nop-debugger-chip-border);
     background: var(--nop-debugger-chip-bg);
     color: var(--nop-debugger-text);
     font-size: 12px;
     outline: none;
   }
   .nop-debugger__search:focus {
     border-color: var(--nop-debugger-chip-active-border);
   }
   .nop-debugger__search::placeholder {
     color: var(--nop-debugger-muted-text);
   }
   ```

**éªŒè¯æ ‡å‡†**:
- [ ] è¾“å…¥æ–‡æœ¬å¯å®žæ—¶è¿‡æ»¤ Timeline äº‹ä»¶
- [ ] æœç´¢ä¸Ž filter chips ç»„åˆä½¿ç”¨
- [ ] æ¸…ç©ºæœç´¢æ¢å¤å®Œæ•´åˆ—è¡¨
- [ ] æœç´¢ä¸å½±å“å…¶ä»– Tab

---

## 3. Phase 2 â€” P1 åŠŸèƒ½å¢žå¼º

### 3.1 é¢æ¿ä½ç½®æŒä¹…åŒ–

**ç›®æ ‡**: é¢æ¿å’Œ launcher ä½ç½®åœ¨åˆ·æ–°åŽä¿æŒã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/controller-helpers.ts` | æ–°å¢ž localStorage è¯»å†™å‡½æ•° |
| `packages/nop-debugger/src/store.ts` | position å˜æ›´æ—¶æŒä¹…åŒ– |
| `packages/nop-debugger/src/panel.tsx` | è¯»å–æŒä¹…åŒ–ä½ç½®ä½œä¸ºåˆå§‹å€¼ |

**å®žçŽ°ç»†èŠ‚**:

1. **æŒä¹…åŒ– Key**: `nop-debugger:${id}:position`ï¼ˆä½¿ç”¨ controller id åŒºåˆ†å¤šå®žä¾‹ï¼‰

2. **è¯»å†™å‡½æ•°**:
   ```ts
   export function loadPersistedPosition(id: string): { x: number; y: number } | undefined {
     try {
       const raw = localStorage.getItem(`nop-debugger:${id}:position`);
       return raw ? JSON.parse(raw) : undefined;
     } catch { return undefined; }
   }

   export function persistPosition(id: string, position: { x: number; y: number }) {
     try {
       localStorage.setItem(`nop-debugger:${id}:position`, JSON.stringify(position));
     } catch { /* quota exceeded, ignore */ }
   }
   ```

3. **å†™å…¥æ—¶æœº**: `setPosition()` è¢«è°ƒç”¨æ—¶ï¼Œdebounce 300ms åŽå†™å…¥ localStorage

4. **è¯»å–æ—¶æœº**: `readWindowConfig()` ä¸­ä¼˜å…ˆä½¿ç”¨æŒä¹…åŒ–ä½ç½®ï¼Œå…¶æ¬¡ä½¿ç”¨ window configï¼Œæœ€åŽ fallback åˆ°é»˜è®¤å€¼

5. **åŒæ—¶æŒä¹…åŒ–**: `panelOpen` çŠ¶æ€ä¹Ÿä¸€å¹¶æŒä¹…åŒ–ï¼Œkey ä¸º `nop-debugger:${id}:panelOpen`

**éªŒè¯æ ‡å‡†**:
- [ ] åˆ·æ–°é¡µé¢åŽé¢æ¿/launcher ä½ç½®ä¿æŒ
- [ ] å¤šå®žä¾‹åœºæ™¯ä½ç½®äº’ä¸å¹²æ‰°
- [ ] localStorage ä¸å¯ç”¨æ—¶é™çº§åˆ°å†…å­˜ï¼ˆæ— æŠ¥é”™ï¼‰

---

### 3.2 æœ€è¿‘é”™è¯¯è§’æ ‡é«˜äº®

**ç›®æ ‡**: Launcher ä¸Šæ˜¾ç¤ºé†’ç›®çš„é”™è¯¯è§’æ ‡ã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | Launcher å¢žåŠ é”™è¯¯è§’æ ‡ UI |

**å®žçŽ°ç»†èŠ‚**:

1. **è§’æ ‡è®¾è®¡**:
   - å½“ `errorCount > 0` æ—¶ï¼Œåœ¨ launcher å³ä¸Šè§’æ˜¾ç¤ºçº¢è‰²åœ†ç‚¹ + æ•°å­—
   - ä½¿ç”¨ `position: absolute` å®šä½
   - æ•°å­—ä¸Šé™ 99ï¼Œè¶…è¿‡æ˜¾ç¤º `99+`
   - æ‰“å¼€é¢æ¿åŽè§’æ ‡ä¸æ¸…é™¤ï¼ˆå› ä¸ºé”™è¯¯ä»å­˜åœ¨ï¼‰ï¼Œä½†æ ·å¼ä»Ž"é†’ç›®"å˜ä¸º"å·²è¯»"

2. **CSS æ–°å¢ž**:
   ```css
   .nop-debugger-launcher__badge {
     position: absolute;
     top: -4px;
     right: -4px;
     min-width: 16px;
     height: 16px;
     padding: 0 4px;
     border-radius: 999px;
     background: #ff6b6b;
     color: white;
     font-size: 10px;
     font-weight: 700;
     display: flex;
     align-items: center;
     justify-content: center;
     animation: nop-debugger-pulse 2s ease-in-out infinite;
   }
   @keyframes nop-debugger-pulse {
     0%, 100% { transform: scale(1); }
     50% { transform: scale(1.1); }
   }
   ```

3. **launcher å®¹å™¨éœ€è¦ `position: relative`**ï¼ˆå·²æœ‰ fixedï¼Œæ”¹ä¸º `position: fixed` + å†…éƒ¨ wrapper ç”¨ relativeï¼‰

**éªŒè¯æ ‡å‡†**:
- [ ] æœ‰é”™è¯¯æ—¶ launcher æ˜¾ç¤ºçº¢è‰²è§’æ ‡
- [ ] æ— é”™è¯¯æ—¶è§’æ ‡æ¶ˆå¤±
- [ ] è§’æ ‡æ•°å­—å‡†ç¡®åæ˜  `errorCount`
- [ ] è§’æ ‡åŠ¨ç”»ä¸å¹²æ‰°ç‚¹å‡»/æ‹–æ‹½

---

### 3.3 é”™è¯¯èšåˆè§†å›¾

**ç›®æ ‡**: åœ¨ Timeline Tab ä¸­å¢žåŠ "åªçœ‹é”™è¯¯"å¿«é€Ÿåˆ‡æ¢ï¼Œä»¥åŠé”™è¯¯åˆ†ç»„å±•ç¤ºã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | æ–°å¢žé”™è¯¯å¿«é€Ÿè¿‡æ»¤æŒ‰é’® + é”™è¯¯åˆ†ç»„å±•ç¤º |

**å®žçŽ°ç»†èŠ‚**:

1. **å¿«é€Ÿè¿‡æ»¤**: åœ¨ filter chips ä¹‹å‰å¢žåŠ ä¸€ä¸ª "Errors Only" toggle æŒ‰é’®
   - æ¿€æ´»æ—¶è‡ªåŠ¨è®¾ç½® filters ä¸º `['error']`
   - å†æ¬¡ç‚¹å‡»æ¢å¤ä¹‹å‰çš„ filters

2. **é”™è¯¯åˆ†ç»„**: åœ¨ Errors Only æ¨¡å¼ä¸‹ï¼Œå°†ç›¸åŒ `source` + ç›¸ä¼¼ `detail` çš„é”™è¯¯èšåˆæ˜¾ç¤º
   - æ¯ä¸ª"é”™è¯¯ç»„"æ˜¾ç¤ºï¼š
     - é”™è¯¯ç±»åž‹ï¼ˆsourceï¼‰
     - å‡ºçŽ°æ¬¡æ•°
     - æœ€è¿‘ä¸€æ¬¡æ—¶é—´
     - å±•å¼€ï¼šåˆ—å‡ºæ‰€æœ‰è¯¥ç»„é”™è¯¯
   - åˆ†ç»„é€»è¾‘ï¼šæŒ‰ `source` åˆ†ç»„ï¼ŒåŒç»„å†…æŒ‰ `summary` ç›¸ä¼¼åº¦åˆå¹¶

3. **å®žçŽ°æ–¹å¼**: çº¯å‰ç«¯è®¡ç®—ï¼Œä½¿ç”¨ `useMemo` ç¼“å­˜åˆ†ç»„ç»“æžœ

**éªŒè¯æ ‡å‡†**:
- [ ] "Errors Only" æŒ‰é’®å¯å¿«é€Ÿåˆ‡æ¢åˆ°é”™è¯¯è§†å›¾
- [ ] é”™è¯¯æŒ‰æ¥æºåˆ†ç»„å±•ç¤º
- [ ] å¯å±•å¼€æŸ¥çœ‹æ¯ä¸ªé”™è¯¯ç»„çš„å…·ä½“æ¡ç›®

---

### 3.4 API é“¾è·¯å½’å¹¶ UI å±•ç¤º

**ç›®æ ‡**: å°†åŒä¸€è¯·æ±‚çš„ `api:start` / `api:end` / `api:abort` å½’å¹¶å±•ç¤ºã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | Network Tab æ”¹ä¸ºè¯·æ±‚å½’å¹¶è§†å›¾ |

**å®žçŽ°ç»†èŠ‚**:

1. **å½’å¹¶é€»è¾‘**:
   - æŒ‰ `requestKey` å°†åŒä¸€è¯·æ±‚çš„ start/end/abort äº‹ä»¶åˆå¹¶ä¸ºä¸€ä¸ªæ¡ç›®
   - ä½¿ç”¨ `useMemo` é¢„è®¡ç®—ï¼š
     ```ts
     type MergedRequest = {
       requestKey: string;
       startEvent?: NopDebugEvent;
       endEvent?: NopDebugEvent;
       status: 'pending' | 'completed' | 'failed' | 'aborted';
       durationMs?: number;
     };
     ```
   - çŠ¶æ€åˆ¤æ–­ï¼šæœ‰ end + ok â†’ completedï¼Œæœ‰ end + !ok â†’ failedï¼Œæœ‰ abort â†’ abortedï¼Œåªæœ‰ start â†’ pending

2. **å±•ç¤ºè®¾è®¡**:
   - æ¯ä¸ª merged request æ˜¾ç¤ºï¼š
     - æ–¹æ³• + URLï¼ˆsummaryï¼‰
     - çŠ¶æ€ badgeï¼ˆpending=é»„ã€completed=ç»¿ã€failed=çº¢ã€aborted=ç°ï¼‰
     - è€—æ—¶ï¼ˆå¦‚æœ‰ï¼‰
     - å±•å¼€ï¼šæŸ¥çœ‹ request params / response summary
   - pending è¯·æ±‚æŽ’åœ¨æœ€å‰é¢

**éªŒè¯æ ‡å‡†**:
- [ ] åŒä¸€è¯·æ±‚åœ¨ Network Tab åªæ˜¾ç¤ºä¸€ä¸ªæ¡ç›®
- [ ] è¯·æ±‚çŠ¶æ€å®žæ—¶æ›´æ–°ï¼ˆpending â†’ completed/failedï¼‰
- [ ] å±•å¼€å¯æŸ¥çœ‹è¯·æ±‚å‚æ•°å’Œå“åº”æ‘˜è¦

---

### 3.5 data-cid DOM æ³¨å…¥ä¸Ž inspectByCid

**ç›®æ ‡**: å®žçŽ°è®¾è®¡æ–‡æ¡£ Â§12.5 ä¸­å®šä¹‰çš„ DOM â†’ ç»„ä»¶ â†’ Store åæŸ¥é“¾è·¯ã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/types.ts` | æ–°å¢ž `NopComponentInspectResult`ã€`NopDebuggerAutomationApi` å¢žåŠ  inspectByCid/inspectByElement |
| `packages/nop-debugger/src/controller.ts` | æ–°å¢ž `setComponentRegistry()` æ–¹æ³•ã€å®žçŽ° inspectByCid |
| `packages/flux-react/src/node-renderer.tsx` | æ¸²æŸ“æ—¶æ³¨å…¥ `data-cid` åˆ° DOM |
| `packages/flux-react/src/field-frame.tsx` | wrap èŠ‚ç‚¹çš„ data-cid æ³¨å…¥åˆ° FieldFrame æ ¹å…ƒç´  |
| `packages/flux-core/src/types.ts` | `ComponentHandle` å¢žåŠ  `_cid` å­—æ®µ |

**å®žçŽ°ç»†èŠ‚**:

#### 3.5.1 ç±»åž‹å®šä¹‰æ‰©å±•

åœ¨ `types.ts` ä¸­æ–°å¢žï¼š

```ts
export interface NopComponentInspectResult {
  cid: number;
  handleId?: string;
  handleName?: string;
  handleType?: string;
  mounted: boolean;
  formState?: {
    values: Record<string, any>;
    errors: Record<string, any>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
  };
  scopeData?: Record<string, any>;
}
```

åœ¨ `NopDebuggerAutomationApi` å’Œ `NopDebuggerController` æŽ¥å£ä¸­æ–°å¢žï¼š
```ts
inspectByCid(cid: number): NopComponentInspectResult | undefined;
inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
```

#### 3.5.2 Controller æ‰©å±•

```ts
// controller.ts
let componentRegistry: ComponentHandleRegistry | undefined;

// æ–°å¢žæ–¹æ³•
setComponentRegistry(registry: ComponentHandleRegistry) {
  componentRegistry = registry;
}

inspectByCid(cid: number): NopComponentInspectResult | undefined {
  if (!componentRegistry) return undefined;
  // éåŽ† registry ä¸­çš„ handlesï¼Œæ‰¾åˆ° _cid åŒ¹é…çš„
  // å¦‚æžœæ˜¯ form ç±»åž‹ handleï¼Œè¯»å– form store state
  // è¯»å– scope chain æ•°æ®
}
```

#### 3.5.3 DOM æ³¨å…¥

åœ¨ `NodeRenderer` ä¸­ï¼š
- å½“èŠ‚ç‚¹æœ‰å·²æ³¨å†Œçš„ ComponentHandle æ—¶ï¼ŒèŽ·å–å…¶ `_cid`
- å°† `_cid` ä½œä¸º `data-cid` å±žæ€§æ³¨å…¥åˆ°æ¸²æŸ“çš„æ ¹å…ƒç´ 

åœ¨ `FieldFrame` ä¸­ï¼š
- æŽ¥æ”¶ `cid` prop
- å°†å…¶ä½œä¸º `data-cid` å†™å…¥æ ¹ DOM å…ƒç´ 

#### 3.5.4 Playground æŽ¥å…¥

åœ¨ `App.tsx` ä¸­ï¼Œåˆ›å»º debugger controller åŽï¼Œå°† SchemaRenderer çš„ ComponentRegistry ä¼ é€’ç»™ controllerï¼š
```ts
// éœ€è¦ä»Ž SchemaRenderer èŽ·å– registry ref
debuggerController.setComponentRegistry(registryRef.current);
```

**éªŒè¯æ ‡å‡†**:
- [ ] `document.querySelector('[data-cid="123"]')` å¯æ‰¾åˆ°å¯¹åº” DOM å…ƒç´ 
- [ ] `window.__NOP_DEBUGGER_API__.inspectByCid(123)` è¿”å›žç»„ä»¶çŠ¶æ€
- [ ] form ç±»åž‹ç»„ä»¶å¯æŸ¥çœ‹ form store stateï¼ˆvalues/errors/touched ç­‰ï¼‰
- [ ] scope æ•°æ®å¯æŸ¥çœ‹ï¼ˆå½“å‰ scope + parent scope åˆå¹¶å¿«ç…§ï¼‰

---

## 4. Phase 3 â€” P2 åŠŸèƒ½

### 4.1 Node Tab å®žçŽ°

**ç›®æ ‡**: å®žçŽ°è®¾è®¡æ–‡æ¡£ Â§10.4 ä¸­å®šä¹‰çš„ Node Tabã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | æ–°å¢ž Node Tab å†…å®¹åŒº |
| `packages/nop-debugger/src/types.ts` | `NopDebuggerTab` å¢žåŠ  `'node'` |

**å®žçŽ°ç»†èŠ‚**:

1. **Tab å®šä¹‰æ›´æ–°**: `NopDebuggerTab = 'overview' | 'timeline' | 'node' | 'network'`

2. **Node Tab å†…å®¹**:
   - é¡¶éƒ¨ï¼šèŠ‚ç‚¹é€‰æ‹©å™¨ï¼ˆè¾“å…¥ nodeId æˆ–é€šè¿‡ inspectByCid é€‰æ‹©ï¼‰
   - ä¸­éƒ¨ï¼šèŠ‚ç‚¹ä¿¡æ¯é¢æ¿
     - `nodeId`ã€`path`ã€`rendererType`
     - æœ€è¿‘ render æ¬¡æ•°å’Œè€—æ—¶ï¼ˆä»Ž `getNodeDiagnostics` èŽ·å–ï¼‰
     - æœ€è¿‘ action è§¦å‘è®°å½•
   - åº•éƒ¨ï¼šè¯¥èŠ‚ç‚¹çš„äº‹ä»¶æ—¶é—´çº¿ï¼ˆè¿‡æ»¤åŽï¼‰

3. **èŠ‚ç‚¹é€‰æ‹©æ–¹å¼**:
   - è¾“å…¥æ¡†ç›´æŽ¥è¾“å…¥ nodeId
   - æˆ–è€…é€šè¿‡ inspectByCid ä»Ž DOM é€‰æ‹©ï¼ˆåŽç»­å¯åšç‚¹å‡»é€‰æ‹©å™¨ï¼‰

4. **æ•°æ®æ¥æº**: å¤ç”¨å·²æœ‰çš„ `controller.getNodeDiagnostics()` API

**éªŒè¯æ ‡å‡†**:
- [ ] Node Tab å¯è¾“å…¥ nodeId æŸ¥çœ‹èŠ‚ç‚¹ä¿¡æ¯
- [ ] æ˜¾ç¤ºèŠ‚ç‚¹çš„ render ç»Ÿè®¡ã€action è®°å½•ã€é”™è¯¯
- [ ] äº‹ä»¶åˆ—è¡¨åªæ˜¾ç¤ºè¯¥èŠ‚ç‚¹ç›¸å…³äº‹ä»¶

---

### 4.2 Network Tab å¢žå¼º

**ç›®æ ‡**: å¢žå¼º Network Tab çš„è¯·æ±‚è¯¦æƒ…å±•ç¤ºã€‚

**å˜æ›´èŒƒå›´**:

| æ–‡ä»¶ | å˜æ›´å†…å®¹ |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | Network Tab å¢žåŠ è¯¦æƒ…å±•å¼€ |

**å®žçŽ°ç»†èŠ‚**:

1. **è¯·æ±‚è¯¦æƒ…å±•å¼€**:
   - æ¯ä¸ª merged request æ¡ç›®å¯å±•å¼€
   - å±•å¼€åŽæ˜¾ç¤ºï¼š
     - è¯·æ±‚å‚æ•°ï¼ˆJSON Viewerï¼‰
     - å“åº”æ•°æ®ï¼ˆJSON Viewerï¼‰
     - è¯·æ±‚/å“åº” header æ‘˜è¦
     - action è§¦å‘é“¾è·¯ï¼ˆå…³è”çš„ action:start/end äº‹ä»¶ï¼‰

2. **å…³è” action å±•ç¤º**:
   - é€šè¿‡ `requestKey` å’Œ `nodeId` æŸ¥æ‰¾å…³è”çš„ action äº‹ä»¶
   - æ˜¾ç¤º action è§¦å‘é¡ºåº

**éªŒè¯æ ‡å‡†**:
- [ ] ç‚¹å‡»è¯·æ±‚æ¡ç›®å±•å¼€è¯¦æƒ…
- [ ] å¯æŸ¥çœ‹è¯·æ±‚å‚æ•°å’Œå“åº”æ•°æ®
- [ ] å¯æŸ¥çœ‹å…³è”çš„ action é“¾è·¯

---

## 5. Phase 4 â€” P3 é•¿æœŸä¼˜åŒ–

### 5.1 äº‹ä»¶åˆ—è¡¨è™šæ‹ŸåŒ–

**ç›®æ ‡**: å¤§é‡äº‹ä»¶æ—¶ä¿æŒ UI æµç•…ã€‚

**æ–¹æ¡ˆ**: å¼•å…¥è½»é‡è™šæ‹ŸåŒ–æ–¹æ¡ˆï¼ˆè‡ªå®šä¹‰å®žçŽ°æˆ–å¼•å…¥ `@tanstack/react-virtual`ï¼‰ã€‚

**å®žçŽ°è¦ç‚¹**:
- åªæ¸²æŸ“å¯è§†åŒºåŸŸå†…çš„äº‹ä»¶æ¡ç›®
- ä¿æŒæ»šåŠ¨ä½ç½®
- æœç´¢/ç­›é€‰åŽä»ç„¶è™šæ‹ŸåŒ–
- é¢„ç•™ 50px å›ºå®šè¡Œé«˜æˆ–åŠ¨æ€æµ‹é‡

### 5.2 state:snapshot äº‹ä»¶ç±»åž‹

**ç›®æ ‡**: è®°å½•ä½œç”¨åŸŸæ•°æ®å¿«ç…§äº‹ä»¶ã€‚

**å®žçŽ°è¦ç‚¹**:
- `NopDebugEventKind` æ–°å¢ž `'state:snapshot'`
- åœ¨å…³é”®æ—¶æœºï¼ˆform submitã€page loadã€scope changeï¼‰è§¦å‘
- å¿«ç…§æ•°æ®å­˜å‚¨åœ¨ `exportedData`ï¼Œé€šè¿‡ JSON Viewer æŸ¥çœ‹

### 5.3 æœç´¢å¢žå¼º

**ç›®æ ‡**: æ”¯æŒæ­£åˆ™æœç´¢ã€é«˜äº®åŒ¹é…ã€‚

**å®žçŽ°è¦ç‚¹**:
- æœç´¢æ¡†æ”¯æŒæ­£åˆ™è¯­æ³•
- åŒ¹é…æ–‡æœ¬é«˜äº®æ˜¾ç¤º
- æœç´¢åŽ†å²è®°å½•ï¼ˆlocalStorageï¼‰

---

## 6. æ–‡ä»¶å˜æ›´æ¸…å•

### Phase 1

| æ–‡ä»¶ | æ“ä½œ | é¢„ä¼°è¡Œæ•° |
|------|------|----------|
| `packages/nop-debugger/src/panel.tsx` | ä¿®æ”¹ | +120 è¡Œï¼ˆJSON Viewer + è¯¦æƒ…å±•å¼€ + æœç´¢æ¡†ï¼‰ |
| `packages/nop-debugger/src/store.ts` | ä¿®æ”¹ | +20 è¡Œï¼ˆrender èŠ‚æµï¼‰ |

### Phase 2

| æ–‡ä»¶ | æ“ä½œ | é¢„ä¼°è¡Œæ•° |
|------|------|----------|
| `packages/nop-debugger/src/controller-helpers.ts` | ä¿®æ”¹ | +30 è¡Œï¼ˆlocalStorage æŒä¹…åŒ–ï¼‰ |
| `packages/nop-debugger/src/store.ts` | ä¿®æ”¹ | +15 è¡Œï¼ˆæŒä¹…åŒ–å†™å…¥ï¼‰ |
| `packages/nop-debugger/src/panel.tsx` | ä¿®æ”¹ | +100 è¡Œï¼ˆè§’æ ‡ + é”™è¯¯èšåˆ + API å½’å¹¶ UIï¼‰ |
| `packages/nop-debugger/src/types.ts` | ä¿®æ”¹ | +20 è¡Œï¼ˆNopComponentInspectResultï¼‰ |
| `packages/nop-debugger/src/controller.ts` | ä¿®æ”¹ | +40 è¡Œï¼ˆsetComponentRegistry + inspectByCidï¼‰ |
| `packages/flux-react/src/node-renderer.tsx` | ä¿®æ”¹ | +10 è¡Œï¼ˆdata-cid æ³¨å…¥ï¼‰ |
| `packages/flux-react/src/field-frame.tsx` | ä¿®æ”¹ | +5 è¡Œï¼ˆcid prop + data-cidï¼‰ |
| `packages/flux-core/src/types.ts` | ä¿®æ”¹ | +2 è¡Œï¼ˆComponentHandle._cidï¼‰ |
| `apps/playground/src/App.tsx` | ä¿®æ”¹ | +3 è¡Œï¼ˆregistry ä¼ é€’ï¼‰ |

### Phase 3

| æ–‡ä»¶ | æ“ä½œ | é¢„ä¼°è¡Œæ•° |
|------|------|----------|
| `packages/nop-debugger/src/types.ts` | ä¿®æ”¹ | +1 è¡Œï¼ˆTab ç±»åž‹ï¼‰ |
| `packages/nop-debugger/src/panel.tsx` | ä¿®æ”¹ | +120 è¡Œï¼ˆNode Tab + Network å¢žå¼ºï¼‰ |

---

## 7. æµ‹è¯•ç­–ç•¥

### æ¯ä¸ª Phase å®ŒæˆåŽå¿…é¡»é€šè¿‡ï¼š

```bash
pnpm --filter @nop-chaos/nop-debugger typecheck
pnpm --filter @nop-chaos/nop-debugger build
pnpm --filter @nop-chaos/nop-debugger test
pnpm --filter @nop-chaos/nop-debugger lint
```

### å…¨ workspace éªŒè¯ï¼š

```bash
pnpm typecheck
pnpm build
pnpm test
```

### æ–°å¢žæµ‹è¯•è¦†ç›–è¦æ±‚ï¼š

| Phase | æ–°å¢žæµ‹è¯• |
|-------|----------|
| Phase 1 | `panel.test.tsx`: JSON Viewer æ¸²æŸ“æµ‹è¯•ã€æœç´¢è¿‡æ»¤æµ‹è¯•ï¼›`store.test.ts`: render èŠ‚æµæµ‹è¯• |
| Phase 2 | `controller-helpers.test.ts`: localStorage æŒä¹…åŒ–æµ‹è¯•ï¼›`controller.test.ts`: inspectByCid æµ‹è¯•ï¼›`panel.test.tsx`: è§’æ ‡/é”™è¯¯èšåˆæµ‹è¯• |
| Phase 3 | `panel.test.tsx`: Node Tab æ¸²æŸ“æµ‹è¯• |

---

## 8. é£Žé™©ä¸Žæ³¨æ„äº‹é¡¹

### 8.1 ä¾èµ–è¾¹ç•Œ

- `nop-debugger` åªä¾èµ– `@nop-chaos/flux-core` å’Œ `react`/`react-dom`
- **ä¸ç›´æŽ¥ä¾èµ–** `flux-runtime`ã€`flux-react`ã€`flux-renderers-*`
- `data-cid` æ³¨å…¥ä»£ç åœ¨ `flux-react` ä¸­ï¼ˆè¿™æ˜¯åˆç†çš„ï¼Œå› ä¸ºæ˜¯æ¸²æŸ“å±‚è¡Œä¸ºï¼‰
- `inspectByCid` çš„ `ComponentHandleRegistry` ç±»åž‹æ¥è‡ª `flux-core`ï¼ˆå¥‘çº¦å±‚ï¼‰ï¼Œè¿è¡Œæ—¶å®žä¾‹é€šè¿‡ controller æ³¨å…¥

### 8.2 æ€§èƒ½

- JSON Viewer ä¸åº”åœ¨åˆå§‹æ¸²æŸ“æ—¶é€’å½’å±•å¼€å¤§å¯¹è±¡
- render èŠ‚æµé˜ˆå€¼ï¼ˆ100msï¼‰éœ€è¦æ ¹æ®å®žé™…åœºæ™¯è°ƒæ•´
- äº‹ä»¶å­˜å‚¨ä¸Šé™é»˜è®¤ 400 æ¡ï¼Œå¯æ ¹æ®å†…å­˜åŽ‹åŠ›è°ƒæ•´
- é¢æ¿æ‹–æ‹½ä¸åº”è§¦å‘å¤šä½™ re-render

### 8.3 å®‰å…¨

- `inspectByCid` æš´éœ²çš„ form store state å¯èƒ½åŒ…å«æ•æ„Ÿæ•°æ®
- åº”è€ƒè™‘åœ¨éžå¼€å‘çŽ¯å¢ƒç¦ç”¨ inspectByCid
- `exportSession` å·²æœ‰è„±æ•æœºåˆ¶ï¼Œ`inspectByCid` ä¹Ÿåº”å°Šé‡ç›¸åŒé…ç½®

### 8.4 Playground å…¼å®¹

- æ‰€æœ‰å˜æ›´å¿…é¡»ä¿æŒ playground `App.tsx` çš„æŽ¥å…¥æ–¹å¼ä¸å˜
- æ–°å¢žåŠŸèƒ½åº”å‘åŽå…¼å®¹ï¼ˆæ–°çš„ Tabã€æ–°çš„ API ä¸å½±å“çŽ°æœ‰ç”¨æ³•ï¼‰

---

## 9. å®žæ–½é¡ºåºä¸Žä¾èµ–å…³ç³»

```
Phase 1.1 (JSON Viewer) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
Phase 1.2 (render èŠ‚æµ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤  å¯å¹¶è¡Œ
Phase 1.3 (Timeline æœç´¢) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                              â”‚
Phase 2.1 (ä½ç½®æŒä¹…åŒ–) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
Phase 2.2 (é”™è¯¯è§’æ ‡) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
Phase 2.3 (é”™è¯¯èšåˆ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤  å¯å¹¶è¡Œï¼ˆä¾èµ– Phase 1.1 çš„ UI æ¨¡å¼ï¼‰
Phase 2.4 (API å½’å¹¶ UI) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
Phase 2.5 (data-cid / inspectByCid) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  ç‹¬ç«‹äºŽå…¶ä»– Phase 2
                                              â”‚
Phase 3.1 (Node Tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ä¾èµ– Phase 2.5
Phase 3.2 (Network å¢žå¼º) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ä¾èµ– Phase 2.4
                                              â”‚
Phase 4.1 (è™šæ‹ŸåŒ–) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ä¾èµ– Phase 1
Phase 4.2 (state:snapshot) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ç‹¬ç«‹
Phase 4.3 (æœç´¢å¢žå¼º) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ä¾èµ– Phase 1.3
```

---

## 10. å…³é”®ä»£ç é”šç‚¹

| é”šç‚¹ | è·¯å¾„ | è¯´æ˜Ž |
|------|------|------|
| è®¾è®¡è‰æ¡ˆ | `docs/analysis/2026-03-21-framework-debugger-design.md` | å…¨éƒ¨è®¾è®¡ç›®æ ‡ |
| Playground ä½“éªŒ | `docs/architecture/playground-experience.md` | UI äº¤äº’æ¨¡åž‹ |
| ç±»åž‹å®šä¹‰ | `packages/nop-debugger/src/types.ts` | æ‰€æœ‰æŽ¥å£å¥‘çº¦ |
| Store | `packages/nop-debugger/src/store.ts` | äº‹ä»¶å­˜å‚¨ |
| Controller | `packages/nop-debugger/src/controller.ts` | æŽ§åˆ¶å™¨ |
| äº‹ä»¶é€‚é… | `packages/nop-debugger/src/adapters.ts` | monitor/plugin/fetcher åŒ…è£… |
| è¯Šæ–­å¼•æ“Ž | `packages/nop-debugger/src/diagnostics.ts` | æŸ¥è¯¢/èšåˆ/æŠ¥å‘Š |
| Automation API | `packages/nop-debugger/src/automation.ts` | window hub |
| UI é¢æ¿ | `packages/nop-debugger/src/panel.tsx` | å…¨éƒ¨ UI |
| è„±æ• | `packages/nop-debugger/src/redaction.ts` | æ•°æ®è„±æ• |
| ComponentHandle | `packages/flux-core/src/types.ts` | ç»„ä»¶å¥æŸ„æŽ¥å£ |
| NodeRenderer | `packages/flux-react/src/node-renderer.tsx` | data-cid æ³¨å…¥ç‚¹ |
| FieldFrame | `packages/flux-react/src/field-frame.tsx` | wrap èŠ‚ç‚¹ data-cid |
| Playground æŽ¥å…¥ | `apps/playground/src/App.tsx` | å®¿ä¸»é›†æˆ |




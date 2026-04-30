# Plan 22: Node Tab å¢žå¼º â€” å…ƒç´ æ£€æŸ¥ä¸Ž Store/Scope æ•°æ®å±•ç¤º

> Plan Status: completed
> Last Reviewed: 2026-04-02

> **Implementation Status: âœ… COMPLETED**
> All 5 phases implemented: `buildInspectResult()` now fills `formState`/`scopeData` from `handle.capabilities.store` and `tagName`/`className` from the DOM element. Node Tab shows a full Component Inspector panel with handle info, Form State tabs (Values/Errors/Meta), Scope Data viewer, and Expression Evaluator. Inspect mode shows hint text and supports Esc to cancel. New CSS styles for `ndbg-inspect-*` classes. 3 new tests in `controller-inspect.test.ts` verify formState filling and DOM info extraction.
>
> This status was verified against the codebase on 2026-03-31.
>
> **Independent closure audit (2026-04-23):** task `ses_247c577ecffeLFiBQKekdIbGEH` rechecked `controller-component-inspector.ts`, `panel/node-tab.tsx`, and `controller-inspect.test.ts` and confirmed the plan can remain `completed`; the old unchecked verification list is historical doc drift rather than missing behavior.

> åˆ¶å®šæ—¥æœŸ: 2026-03-30
> åŸºäºŽ: `docs/analysis/2026-03-21-framework-debugger-design.md` Â§10.4 Node / Â§12.5 DOM cid åæŸ¥æœºåˆ¶
> å‚è€ƒ: `~/sources/amis/packages/amis-core/src/utils/debug.tsx`
> çŠ¶æ€: å·²å®Œæˆ

---

## 1. çŽ°çŠ¶

### 1.1 å·²æœ‰çš„åŸºç¡€è®¾æ–½

| èƒ½åŠ›                                 | çŠ¶æ€ | æ–‡ä»¶ä½ç½®                                                                   |
| -------------------------------------- | ----- | ----------------------------------------------------------------------------- |
| `data-cid` DOM æ³¨å…¥                  | âœ…   | `flux-react/src/node-renderer.tsx` L312-318, `flux-react/src/field-frame.tsx` |
| `ComponentHandleRegistry.handlesByCid` | âœ…   | `flux-runtime/src/component-handle-registry.ts`                               |
| `inspectByCid(cid)` API                | âœ…   | `nop-debugger/src/controller.ts` L106-112                                     |
| `inspectByElement(el)` API             | âœ…   | `nop-debugger/src/controller.ts` L114-121                                     |
| `NopComponentInspectResult` ç±»åž‹     | âœ…   | `nop-debugger/src/types.ts` L216-231                                          |
| `setComponentRegistry()` æ³¨å…¥        | âœ…   | `nop-debugger/src/controller.ts` L298                                         |
| Inspect æ¨¡å¼å¼€å…³                    | âœ…   | `panel.tsx` â€” `inspectMode` state                                           |
| Hover overlay åˆ›å»º                   | âœ…   | `panel.tsx` â€” `hoverOverlayRef`, CSS `.nop-debugger-overlay--hover`         |
| Active overlay åˆ›å»º                  | âœ…   | `panel.tsx` â€” `activeOverlayRef`, CSS `.nop-debugger-overlay--active`       |
| mousemove å…¨å±€ç›‘å¬                  | âœ…   | `panel.tsx` L1119-1121 â€” æ‰¾æœ€è¿‘ `[data-cid]`                             |
| click å…¨å±€ç›‘å¬                      | âœ…   | `panel.tsx` L1124-1134 â€” é€‰ä¸­å…ƒç´ , å…³é—­ inspect æ¨¡å¼                 |
| Scan æŒ‰é’®æ‰«æç»„ä»¶æ ‘               | âœ…   | `panel.tsx` L1144-1164                                                        |
| ç»„ä»¶æ ‘åˆ—è¡¨                        | âœ…   | `panel.tsx` L1539-1558 â€” æ ‘å½¢å±•ç¤º `[data-cid]` å…ƒç´                    |
| Inspect æ¨¡å¼æŒ‰é’®                    | âš ï¸ | å¤´éƒ¨æœ‰ inspect å›¾æ ‡æŒ‰é’®ä½†åŠŸèƒ½ä¸å®Œæ•´                               |

### 1.2 ç¼ºå¤±çš„å…³é”®åŠŸèƒ½

1. **é€‰ä¸­å…ƒç´ åŽæ²¡æœ‰å±•ç¤º store æ•°æ®** â€” `selectedElement` åªæ˜¾ç¤º `data-cid` å’Œ `tagName`ï¼Œä»Žæœªè°ƒç”¨ `inspectByCid()` èŽ·å– formState/scopeData
2. **æ²¡æœ‰ scope chain å¯è§†åŒ–** â€” AMIS ç”¨ Data Level-0/Level-1/... å±•ç¤ºæ•°æ®åŸŸé“¾ï¼Œæˆ‘ä»¬å®Œå…¨æ²¡æœ‰
3. **æ²¡æœ‰è¡¨è¾¾å¼æ±‚å€¼è¾“å…¥æ¡†** â€” AMIS åº•éƒ¨æœ‰è¾“å…¥æ¡†å¯å¯¹é€‰ä¸­ç»„ä»¶çš„ data ä¸Šä¸‹æ–‡æ‰§è¡Œè¡¨è¾¾å¼
4. **Node tab ç¼ºå°‘ Inspect å…¥å£æç¤º** â€” è¿›å…¥ inspect æ¨¡å¼åŽé¡µé¢æ²¡æœ‰"Select an element"çš„æç¤ºæ–‡æ¡ˆ
5. **inspectByCid è¿”å›žæ•°æ®ä¸å®Œæ•´** â€” `buildInspectResult()` æ²¡æœ‰å¡«å…… `formState` å’Œ `scopeData`ï¼ˆç±»åž‹å®šä¹‰æœ‰ï¼Œä½†æž„å»ºé€»è¾‘æ²¡æœ‰å®žçŽ°ï¼‰

### 1.3 AMIS å¯¹æ¯”å‚è€ƒ

AMIS debugger (`debug.tsx`) çš„æ ¸å¿ƒæµç¨‹:

```
1. enableDebug() â†’ æŒ‚è½½é¢æ¿ + æ³¨å†Œå…¨å±€ mousemove/click
2. handleMouseMove() â†’ æ‰¾ [data-debug-id] â†’ store.hoverId = id â†’ autorun æ›´æ–°è“è‰² overlay
3. handleMouseclick() â†’ æ‰¾ [data-debug-id] â†’ store.activeId = id â†’ autorun æ›´æ–°ç»¿è‰² overlay
4. AMISDebug ç»„ä»¶ â†’ è¯»å– ComponentInfo[activeId]
   â†’ component.props.data â†’ é€šè¿‡åŽŸåž‹é“¾å‘ä¸ŠéåŽ†ï¼Œæž„å»º scope chain
   â†’ å±•ç¤º Data Level-0 (è‡ªèº«æ•°æ®), Level-1 (çˆ¶çº§æ•°æ®), ...
5. åº•éƒ¨è¾“å…¥æ¡† â†’ å¯¹é€‰ä¸­ç»„ä»¶çš„ data ä¸Šä¸‹æ–‡æ‰§è¡Œè¡¨è¾¾å¼
```

AMIS çš„æ•°æ®åŸŸé“¾èŽ·å–æ–¹å¼:

```typescript
let start = activeComponentInspect?.component?.props?.data || {};
const stacks = [start];
while (Object.getPrototypeOf(start) !== Object.prototype) {
  const superData = Object.getPrototypeOf(start);
  stacks.push(superData);
  start = superData;
}
```

---

## 2. ç›®æ ‡

å¢žå¼º Node tabï¼Œä½¿å…¶æˆä¸ºå®Œæ•´çš„ç»„ä»¶æ£€æŸ¥å™¨:

1. ç‚¹å‡»é¡µé¢å…ƒç´  â†’ æ˜¾ç¤ºè¯¥ç»„ä»¶çš„å®Œæ•´ store æ•°æ®
2. å¯è§†åŒ– scope chainï¼ˆå½“å‰ scope + æ‰€æœ‰çˆ¶ scope çš„æ•°æ®ï¼‰
3. å±•ç¤º form store çŠ¶æ€ï¼ˆvaluesã€errorsã€touchedã€dirtyï¼‰
4. æ”¯æŒå¯¹é€‰ä¸­ç»„ä»¶æ•°æ®ä¸Šä¸‹æ–‡çš„è¡¨è¾¾å¼æ±‚å€¼

---

## 3. å®žçŽ°è®¡åˆ’

### Phase 1: è¡¥å…¨ inspectByCid æ•°æ®å¡«å…… (controller å±‚)

**æ–‡ä»¶**: `packages/nop-debugger/src/controller.ts`

**é—®é¢˜**: `buildInspectResult()` åªå¡«å……äº† `cid/handleId/handleName/handleType/mounted`ï¼Œæ²¡æœ‰å¡«å…… `formState` å’Œ `scopeData`ã€‚

**éœ€è¦ä¿®æ”¹**: `buildInspectResult()` å‡½æ•°

```
buildInspectResult(cid, handle, mounted) â†’ NopComponentInspectResult {
  // çŽ°æœ‰å­—æ®µ...

  // æ–°å¢ž: ä»Ž handle.capabilities.store è¯»å– formState
  if (handle?.capabilities?.store) {
    const store = handle.capabilities.store;
    result.formState = {
      values: store.values ?? {},
      errors: store.errors ?? {},
      touched: store.touched ?? {},
      dirty: store.dirty ?? {},
      visited: store.visited ?? {},
      submitting: store.submitting ?? false,
    };
  }

  // æ–°å¢ž: ä»Ž handle èŽ·å– scope æ•°æ®
  // ComponentHandle éœ€è¦æš´éœ² scope å¼•ç”¨
  if (handle?.scope) {
    result.scopeData = handle.scope.readOwn?.() ?? {};
  }
}
```

**ä¾èµ–**: éœ€è¦ç¡®è®¤ `InternalComponentHandle` çš„å®žé™…æŽ¥å£:

- `capabilities.store` æ˜¯å¦æœ‰ `values/errors/touched/dirty/visited/submitting`
- `scope` æ˜¯å¦å¯é€šè¿‡ handle è®¿é—®
- å¦‚æžœ handle ä¸ç›´æŽ¥æš´éœ² scopeï¼Œéœ€è¦é€šè¿‡ `ComponentHandleRegistry` çš„ parent chain å‘ä¸ŠéåŽ†

**éªŒè¯**: éœ€è¦é˜…è¯» `packages/flux-runtime/src/component-handle-registry.ts` å’Œ `packages/flux-runtime/src/form-component-handle.ts` ç¡®è®¤æŽ¥å£ã€‚

### Phase 2: å¢žå¼º NopComponentInspectResult ç±»åž‹ (ç±»åž‹å±‚)

**æ–‡ä»¶**: `packages/nop-debugger/src/types.ts`

**ä¿®æ”¹**: æ‰©å±• `NopComponentInspectResult` å¢žåŠ  scope chain ä¿¡æ¯:

```typescript
export interface NopScopeLevel {
  name: string; // æ¥æºæ ‡è¯†ï¼Œå¦‚ "page"ã€"form:user-form"
  data: Record<string, unknown>;
}

export interface NopComponentInspectResult {
  cid: number;
  handleId?: string;
  handleName?: string;
  handleType?: string;
  mounted: boolean;
  formState?: {
    values: Record<string, unknown>;
    errors: Record<string, unknown>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
  };
  scopeData?: Record<string, unknown>;
  // æ–°å¢ž: scope é“¾
  scopeChain?: NopScopeLevel[];
  // æ–°å¢ž: DOM å…ƒç´ ä¿¡æ¯
  tagName?: string;
  className?: string;
  // æ–°å¢ž: props æ‘˜è¦
  propsSummary?: Record<string, unknown>;
}
```

### Phase 3: Node Tab UI â€” ç»„ä»¶è¯¦æƒ…é¢æ¿ (panel å±‚)

**æ–‡ä»¶**: `packages/nop-debugger/src/panel.tsx`

**ä¿®æ”¹**: å½“ `selectedElement` æœ‰å€¼æ—¶ï¼Œè°ƒç”¨ `inspectByElement()` èŽ·å–å®Œæ•´æ•°æ®å¹¶å±•ç¤ºã€‚

#### 3.1 é€‰ä¸­å…ƒç´ åŽå±•ç¤ºç»„ä»¶è¯¦æƒ…

æ›¿æ¢çŽ°æœ‰çš„ç®€å• cid/tagName å±•ç¤ºï¼Œæ”¹ä¸ºç»“æž„åŒ–é¢æ¿:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Component Inspector                     â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ #42 input-text                       â”‚ â”‚
â”‚ â”‚ Name: username                        â”‚ â”‚
â”‚ â”‚ Type: form                            â”‚ â”‚
â”‚ â”‚ Tag: <div>                            â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                         â”‚
â”‚ â”Œâ”€ Form State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ Values  â”‚ Errors â”‚ Touched â”‚ Dirty  â”‚ â”‚
â”‚ â”‚ { username: "Alice", ... }            â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                         â”‚
â”‚ â”Œâ”€ Scope Chain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ â–¸ Level 0: form (current)            â”‚ â”‚
â”‚ â”‚   { username: "Alice", role: "admin"}â”‚ â”‚
â”‚ â”‚ â–¸ Level 1: page                      â”‚ â”‚
â”‚ â”‚   { users: [...], searchQuery: "" }  â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                         â”‚
â”‚ â”Œâ”€ Events for this node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ render:end  2ms  10:30:01            â”‚ â”‚
â”‚ â”‚ action:submit  10:30:02              â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                         â”‚
â”‚ > Evaluate expression...               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### 3.2 Inspect æ¨¡å¼æç¤ºæ–‡æ¡ˆ

å½“ `inspectMode` ä¸º true æ—¶ï¼Œåœ¨ Node tab é¡¶éƒ¨æ˜¾ç¤ºæç¤º:

```
ðŸ” Click an element on the page to inspect it. (Press Esc to cancel)
```

#### 3.3 Form State å±•ç¤º

ä½¿ç”¨ `JsonViewer` ç»„ä»¶å±•ç¤º formState çš„å„å­—æ®µã€‚åˆ†ä¸º tab å¼å­é¢æ¿:

- **Values**: `formState.values`
- **Errors**: `formState.errors`ï¼ˆå¦‚æœ‰é”™è¯¯ï¼Œæ ‡çº¢ï¼‰
- **Meta**: `touched`/`dirty`/`visited`/`submitting` åˆå¹¶å±•ç¤º

#### 3.4 Scope Chain å±•ç¤º

ç±»ä¼¼ AMIS çš„ Data Level å±•ç¤º:

- æ¯ä¸ª scope level æ˜¯ä¸€ä¸ªå¯æŠ˜å çš„ JSON åŒºå—
- Level 0 é»˜è®¤å±•å¼€ï¼Œå…¶ä½™é»˜è®¤æŠ˜å 
- æ¯ä¸ª level æ˜¾ç¤ºæ¥æºåç§°ï¼ˆscope name/pathï¼‰

#### 3.5 è¡¨è¾¾å¼æ±‚å€¼è¾“å…¥æ¡†

åœ¨ Node tab åº•éƒ¨æ·»åŠ è¾“å…¥æ¡†:

- placeholder: `Evaluate expression on selected component data...`
- Enter é”®è§¦å‘æ±‚å€¼
- ç»“æžœä»¥ Log å½¢å¼è¿½åŠ åˆ° Timeline tab
- ä½¿ç”¨ `scopeChain[0].data` ä½œä¸ºæ±‚å€¼ä¸Šä¸‹æ–‡

### Phase 4: Inspect æ¨¡å¼ UX ä¼˜åŒ–

**æ–‡ä»¶**: `packages/nop-debugger/src/panel.tsx`

#### 4.1 Esc é”®é€€å‡º inspect æ¨¡å¼

```typescript
useEffect(() => {
  if (!inspectMode) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInspectMode(false);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [inspectMode]);
```

#### 4.2 Inspect æ¨¡å¼æ¿€æ´»æŒ‰é’®ä¼˜åŒ–

Node tab header åŒºåŸŸçš„ inspect æŒ‰é’®éœ€è¦æ›´é†’ç›®:

- æ¿€æ´»æ—¶é«˜äº®ï¼ˆçŽ°æœ‰ `is-active` CSSï¼‰
- å¢žåŠ  tooltip æ–‡æ¡ˆ

#### 4.3 é€‰ä¸­å…ƒç´ åŽè‡ªåŠ¨å±•ç¤ºè¯¦æƒ…

åœ¨ click handler ä¸­ï¼ˆL1124-1134ï¼‰ï¼Œé€‰ä¸­å…ƒç´ åŽè‡ªåŠ¨è°ƒç”¨ `inspectByElement`:

```typescript
const handleClick = (e: MouseEvent) => {
  // ...existing logic...
  setSelectedElement(target as HTMLElement);
  setInspectMode(false);
  props.controller.setActiveTab('node');
  setNodeIdInput(cid);

  // æ–°å¢ž: è‡ªåŠ¨èŽ·å– inspect æ•°æ®
  const inspectResult = props.controller.inspectByElement(target as HTMLElement);
  setInspectData(inspectResult ?? null);
};
```

### Phase 5: CSS æ ·å¼

**æ–‡ä»¶**: `packages/nop-debugger/src/panel.tsx` (DEBUGGER_STYLES)

æ–°å¢žæ ·å¼:

```css
/* ç»„ä»¶è¯¦æƒ…é¢æ¿ */
.ndbg-inspect-panel { ... }
.ndbg-inspect-header { ... }
.ndbg-inspect-section { ... }
.ndbg-inspect-section-title { ... }

/* Scope chain */
.ndbg-scope-level { ... }
.ndbg-scope-level-header { ... }

/* è¡¨è¾¾å¼è¾“å…¥æ¡† */
.ndbg-eval-input { ... }
.ndbg-eval-result { ... }

/* Inspect æ¨¡å¼æç¤º */
.ndbg-inspect-hint { ... }
```

---

## 4. æ–‡ä»¶å½±å“èŒƒå›´

| æ–‡ä»¶                                     | æ”¹åŠ¨ç±»åž‹                           | Phase   |
| ------------------------------------------ | -------------------------------------- | ------- |
| `packages/nop-debugger/src/types.ts`       | æ‰©å±• `NopComponentInspectResult`     | 2       |
| `packages/nop-debugger/src/controller.ts`  | `buildInspectResult` è¡¥å…¨æ•°æ®å¡«å…… | 1       |
| `packages/nop-debugger/src/panel.tsx`      | Node tab UI å¢žå¼º + Inspect UX + CSS  | 3, 4, 5 |
| `packages/nop-debugger/src/panel.test.tsx` | æ›´æ–°æµ‹è¯•                           | 3       |

**ä¸éœ€è¦ä¿®æ”¹çš„æ–‡ä»¶**: store.ts, automation.ts, adapters.ts, diagnostics.ts â€” è¿™äº›å·²å®Œå¤‡ã€‚

---

## 5. å®žæ–½é¡ºåº

```
Phase 1 (controller) â†’ Phase 2 (types) â†’ Phase 3 (panel UI) â†’ Phase 4 (UX) â†’ Phase 5 (CSS)
    â”‚                        â”‚
    â””â”€â”€ å¯å¹¶è¡Œ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### å‰ç½®è°ƒç ” (åœ¨ Phase 1 ä¹‹å‰)

1. è¯»å– `packages/flux-runtime/src/component-handle-registry.ts` â€” ç¡®è®¤ handle æš´éœ²äº†å“ªäº›å±žæ€§
2. è¯»å– `packages/flux-runtime/src/form-component-handle.ts` â€” ç¡®è®¤ store æŽ¥å£
3. è¯»å– `packages/flux-react/src/contexts.tsx` â€” ç¡®è®¤ scope å¦‚ä½•ä¼ é€’ç»™ç»„ä»¶
4. è¯»å– `packages/flux-runtime/src/scope.ts` â€” ç¡®è®¤ scope.readOwn() æˆ–ç±»ä¼¼ API

### éªŒè¯æ¸…å•

- [ ] `inspectByCid(42)` è¿”å›žå®Œæ•´çš„ formStateï¼ˆå¯¹ form ç±»åž‹ç»„ä»¶ï¼‰
- [ ] `inspectByCid(42)` è¿”å›ž scopeChain æ•°ç»„
- [ ] ç‚¹å‡»é¡µé¢å…ƒç´  â†’ Node tab å±•ç¤ºç»„ä»¶è¯¦æƒ…é¢æ¿
- [ ] Scope chain å¯æŠ˜å å±•ç¤ºå„å±‚æ•°æ®
- [ ] è¡¨è¾¾å¼è¾“å…¥æ¡†å¯å¯¹é€‰ä¸­ç»„ä»¶æ•°æ®æ±‚å€¼
- [ ] Esc é”®é€€å‡º inspect æ¨¡å¼
- [ ] Inspect æ¨¡å¼ä¸‹é¡µé¢æœ‰æç¤ºæ–‡æ¡ˆ
- [ ] é€‰ä¸­å…ƒç´ é«˜äº® overlay æ­£å¸¸å·¥ä½œ
- [ ] çŽ°æœ‰æµ‹è¯•å…¨éƒ¨é€šè¿‡

---

## 6. ä¸åœ¨æœ¬æ¬¡èŒƒå›´

- å®Œæ•´ DOM inspect é€‰æ‹©å™¨ï¼ˆç±»ä¼¼ Chrome DevTools çš„æ ‘å½¢ DOM å±•ç¤ºï¼‰
- é€šè¿‡è¡¨è¾¾å¼æ‰§è¡Œå™¨è¿è¡Œä»»æ„ JS çš„å®‰å…¨æ²™ç®±
- æ·±åº¦è®¢é˜… form/page store ç§æœ‰çŠ¶æ€çš„å®žæ—¶å˜æ›´
- è¿œç¨‹ä¸Šä¼ æ—¥å¿—
- Action replay

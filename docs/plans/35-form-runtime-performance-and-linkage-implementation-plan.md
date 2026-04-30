# 35 Form Runtime æ€§èƒ½ä¸Žè”åŠ¨èƒ½åŠ›å®žæ–½è®¡åˆ’

> Plan Status: completed
> Last Reviewed: 2026-04-08; audited against codebase on 2026-04-08
> Source: `docs/analysis/2026-04-04-formily-vs-flux-final-report.md` reviewed against current code anchors on 2026-04-08

> Status Note: æœ¬è®¡åˆ’çš„æ‰§è¡Œåˆ‡ç‰‡å·²å®Œæˆæ”¶å£ã€‚å‰åŠæ®µå·²è½åœ°çš„å»¶è¿Ÿ `validating/submitting`ã€è·¯å¾„ç¼“å­˜ã€è½»é‡å­—æ®µæŸ¥è¯¢æŽ¥å£ã€validation å†™å›žæ”¶æ•›ã€æ˜¾å¼ `setValues(...)` å’Œæ•°ç»„çƒ­è·¯å¾„ä¼˜åŒ–ä¿æŒæœ‰æ•ˆï¼›æœ¬æ¬¡è¡¥é½äº†å—é™å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹ä¸Žå­—æ®µ presentation æ´¾ç”Ÿå¿«ç…§ï¼Œå…·ä½“è¡¨çŽ°ä¸º `xui:linkage` çš„ç¼–è¯‘/è¿è¡Œæ—¶æŽ¥çº¿ã€å­—æ®µ `effectiveDisabled/effectiveRequired` å¿«ç…§ä»¥åŠè¡¨å• renderer å¯¹è¿™äº›æ´¾ç”Ÿæ€çš„ç»Ÿä¸€æ¶ˆè´¹ã€‚åŽŸè®¡åˆ’ä¸­çš„æ›´é•¿æœŸ selector/validation-model follow-up ä¸å†ä½œä¸ºæœ¬è®¡åˆ’æ¬ è´¦ï¼ŒåŽç»­è‹¥ç»§ç»­æŽ¨è¿›åº”æŒ‰ç‹¬ç«‹ ROI é©±åŠ¨å·¥ä½œå¤„ç†ã€‚
> Outdated Note: ä¸Žä¾èµ–è¿½è¸ª/selector ç»†åŒ–ç›´æŽ¥ç›¸å…³çš„åŽç»­æ–¹å‘ï¼ŒçŽ°åº”ä»¥ `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` çš„ root-level dependency model ä¸ºå‡†ï¼›æœ¬è®¡åˆ’ä¸­ä»ä¿ç•™çš„â€œç¼–è¯‘æœŸä¾èµ–æå–â€æ—§è¡¨è¿°åªä½œä¸ºåŽ†å²ä¸Šä¸‹æ–‡ï¼Œä¸å†ä½œä¸ºå½“å‰æ‰§è¡ŒåŸºçº¿ã€‚

## å¤å®¡ç»“è®º

- `docs/analysis/2026-04-04-formily-vs-flux-final-report.md` å·²ç»æ”¶æ•›æˆ Formily å¯¹ Flux çš„å”¯ä¸€å¯¹æ¯”å…¥å£ï¼Œå¹¶ä¸”å·²ç»æŠŠå®žçŽ°è¾¹ç•Œæ”¶çª„åˆ°â€œè¡¨å•å­åŸŸå†…çš„è–„èƒ½åŠ›â€ï¼Œä¸å†ä¸»å¼ å¼•å…¥ Proxy å“åº”å¼ã€é‡é‡çº§å­—æ®µç±»ä½“ç³»ã€é€šç”¨ effect runtime æˆ–å…¨å±€äº‹åŠ¡ç³»ç»Ÿã€‚
- å¯¹å½“å‰ä»“åº“æœ€å€¼å¾—æ‰§è¡Œçš„æ”¹è¿›é¡¹ï¼Œå·²ç»å¯ä»¥æ˜Žç¡®æ‹†æˆ 8 æ¡ï¼šå»¶è¿Ÿ `validating/submitting` çŠ¶æ€æ ‡å¿—ã€è·¯å¾„ç¼“å­˜ä¸Žé¢„è§£æžã€è½»é‡å­—æ®µå›¾ / æŸ¥è¯¢æŽ¥å£ã€Validation å†™å›žåˆå¹¶æäº¤ã€Action é“¾è¡¨å•å†™å…¥æ”¶æ•›ã€æ•°ç»„çƒ­è·¯å¾„ä¼˜åŒ–ã€å—é™å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹ã€å­—æ®µ presentation æ´¾ç”Ÿå¿«ç…§ã€‚
- è¿™ä»½è®¡åˆ’çš„ç›®æ ‡ä¸æ˜¯ä¸€æ¬¡æ€§å®Œæˆæ‰€æœ‰é•¿æœŸæ¼”è¿›ï¼Œè€Œæ˜¯æŠŠä¸Šè¿°å»ºè®®è½¬æˆåˆ†é˜¶æ®µã€å¯éªŒè¯ã€ä¸Žå½“å‰æž¶æž„ guardrail ä¸€è‡´çš„æ‰§è¡Œè·¯çº¿ã€‚

## ä¸ŽçŽ°æœ‰è®¡åˆ’çš„å…³ç³»

- `docs/plans/03-form-validation-completion-plan.md` å’Œ `docs/plans/04-form-validation-improvement-execution-plan.md` èšç„¦çš„æ˜¯ validation correctness å’Œèƒ½åŠ›è¡¥å…¨ï¼›æœ¬è®¡åˆ’ä¸é‡å¼€åŸºç¡€éªŒè¯æž¶æž„ï¼Œè€Œæ˜¯åœ¨çŽ°æœ‰ validation åŸºçº¿ä¸Šåšè¿è¡Œæ—¶æ€§èƒ½å’Œç»“æž„èƒ½åŠ›å¢žå¼ºã€‚
- `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md` æ˜¯é•¿æœŸ validation è·¯çº¿å›¾ï¼Œå…¶ä¸­å¤§é‡å†…å®¹å·² deferredï¼›æœ¬è®¡åˆ’åªæŠ½å–å…¶ä¸­å½“å‰æœ€å€¼å¾—æ‰§è¡Œã€ä¸”ä¸Ž Formily å¯¹æ¯”ç»“è®ºä¸€è‡´çš„å±€éƒ¨åˆ‡ç‰‡ï¼Œä¸é‡å¯å¤§è§„æ¨¡ validation é‡æž„ã€‚
- `docs/plans/21-node-renderer-selective-subscription-plan.md` å·²å®Œæˆ `NodeRenderer` çš„ selector åŒ–ï¼›æœ¬è®¡åˆ’ä¸ä¼šæŠŠç³»ç»Ÿé€€å›ž Proxy è‡ªåŠ¨è¿½è¸ªï¼Œè€Œæ˜¯æŠŠâ€œæ›´ç»† selector / æ›´å°‘æ´¾ç”Ÿä¼ æ’­â€ä½œä¸ºåŽç»­æ›´çª„çš„é•¿æœŸæ–¹å‘ã€‚

## Problem

å½“å‰ Flux çš„ compile-first ä¸»æž¶æž„æ˜¯æ­£ç¡®çš„ï¼Œä½†åœ¨å¤æ‚è¡¨å•åœºæ™¯é‡Œè¿˜å­˜åœ¨ 8 ç±»å…·ä½“ç¼ºå£ï¼Œå½±å“äº¤äº’ä½“éªŒã€å¯ç»´æŠ¤æ€§å’Œçƒ­è·¯å¾„æˆæœ¬ã€‚

- `packages/flux-runtime/src/form-runtime-validation.ts` ä¸Ž `packages/flux-runtime/src/form-store.ts` ä¸­ï¼Œvalidation å†™å›žä»åç¢Žç‰‡åŒ–ï¼›ä¸€æ¬¡å­—æ®µæ ¡éªŒæˆ– dependent revalidation ä¼šäº§ç”Ÿå¤šæ¬¡ store æäº¤ã€‚
- `packages/flux-runtime/src/action-runtime.ts` ä¸­ï¼Œaction ä¸Ž `then` é“¾ä¼šé¡ºåºè§¦å‘å¤šä¸ª `setValue` / æ´¾ç”Ÿæ ¡éªŒè·¯å¾„ï¼›æ¯æ¬¡ `setValue` åˆå„è‡ªè§¦å‘ `form-runtime.ts` å†…éƒ¨çš„é‡æ ¡éªŒé€»è¾‘ï¼Œå•æ¬¡äº¤äº’å®¹æ˜“è¢«æ‹†æˆå¤šè½®ä¼ æ’­ã€‚
- `packages/flux-core/src/utils/path.ts`ã€`packages/flux-runtime/src/scope.ts`ã€`packages/flux-runtime/src/form-store.ts` å½“å‰ä»å¤§é‡å³æ—¶ `parsePath()`ï¼Œæ²¡æœ‰å…±äº«ç¼“å­˜ä¸Žç¼–è¯‘æœŸé¢„è§£æžè·¯å¾„ç‰‡æ®µã€‚
- `packages/flux-runtime/src/form-runtime-array.ts` å·²æœ‰æ•°ç»„å­—æ®µçŠ¶æ€é‡æ˜ å°„ï¼Œä½†æ•°ç»„å€¼æ›´æ–°ã€åˆå§‹çŠ¶æ€æ˜ å°„ã€validation run æ˜ å°„ã€å±€éƒ¨å¼•ç”¨ç¨³å®šæ€§è¿˜æ²¡æœ‰å½¢æˆæ›´æ˜Žç¡®çš„ mutation planã€‚
- `packages/flux-runtime/src/form-runtime.ts` ä¸Ž `packages/flux-runtime/src/form-runtime-validation.ts` ä¸­ï¼Œ`submitting` / `validating` ä»åå³æ—¶ç½®çœŸï¼ŒçŸ­è¯·æ±‚å’ŒçŸ­æ ¡éªŒä¼šå‡ºçŽ° UI é—ªçƒã€‚
- `packages/flux-renderers-form/src/field-utils.tsx` å½“å‰å·²ç»æœ‰ `useFieldPresentation()`ï¼Œä½†å­—æ®µå±•ç¤ºæ€ä»åˆ†æ•£åœ¨ hooks å’Œ helper ä¸­ï¼Œç¼ºå°‘æ›´ç¨³å®šã€å¯å¤ç”¨çš„å±€éƒ¨æ´¾ç”Ÿå¿«ç…§è¾¹ç•Œã€‚
- å½“å‰ `FormRuntime` æ²¡æœ‰è½»é‡åªè¯»å­—æ®µå›¾ / æŸ¥è¯¢ facadeï¼›éªŒè¯ã€è¿è¡Œæ—¶æ³¨å†Œã€å¤æ‚å­—æ®µåä½œã€è”åŠ¨å’Œè°ƒè¯•éƒ½è¿˜åœ¨æ¶ˆè´¹åˆ†æ•£ç»“æž„ã€‚
- å½“å‰è”åŠ¨ä¸»è¦æ•£è½åœ¨è¡¨è¾¾å¼é‡Œï¼Œè¿˜æ²¡æœ‰ä¸€å¥—å—é™ã€å¯ç¼–è¯‘ã€å¯åˆ†æžã€æ˜Žç¡®æŽ’é™¤ Formily `x-reactions` éšå¼å¤æ‚åº¦çš„å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹ã€‚

## Root Cause

- Flux çš„æ ¸å¿ƒä¼˜åŒ–å·²ä¼˜å…ˆæŠ•å…¥åˆ°ç¼–è¯‘ä¸»å¹²ã€é™æ€å¿«è·¯å¾„ã€è¡¨è¾¾å¼å¼•ç”¨å¤ç”¨ã€selector è®¢é˜…å’Œ action pipelineï¼›è¡¨å•è¿è¡Œæ—¶ç»“æž„èƒ½åŠ›ä»åâ€œèƒ½ç”¨ä¸”æ­£ç¡®â€ï¼Œè¿˜æœªå……åˆ†é’ˆå¯¹è¶…å¤§è¡¨å•å’Œå¤æ‚è”åŠ¨è¿›è¡Œç¬¬äºŒè½®æ”¶å£ã€‚
- å½“å‰è¡¨å•çŠ¶æ€ã€æ ¡éªŒçŠ¶æ€ã€runtime registrationã€validation model å’Œå­—æ®µå±•ç¤ºæ€å„è‡ªéƒ½åˆç†ï¼Œä½†å®ƒä»¬ä¹‹é—´ä»ç¼ºå°‘å‡ ä¸ªè¶³å¤Ÿè–„ã€è¶³å¤Ÿç¨³å®šçš„ä¸­é—´å±‚ï¼šå­—æ®µæŸ¥è¯¢ facadeã€å±€éƒ¨æ´¾ç”Ÿå¿«ç…§ã€æ˜¾å¼å†™å…¥æ”¶æ•›åŽŸè¯­ã€‚
- Formily æä¾›äº†è¡¨å•è¿è¡Œæ—¶ç»éªŒï¼Œä½†å®ƒçš„å¾ˆå¤šèƒ½åŠ›ä¾èµ– Proxy å“åº”å¼ã€Field å¯¹è±¡å›¾å’Œ `x-reactions` è¿è¡Œæ—¶è¯­å¢ƒï¼›Flux ä¸èƒ½ç…§æ¬ï¼Œåªèƒ½åšæž¶æž„å…¼å®¹çš„æ”¹å†™ç‰ˆï¼Œè¿™ä¹Ÿä½¿å¾—ç›´æŽ¥æ‰§è¡Œéœ€è¦æ›´ç»†çš„è®¡åˆ’çº¦æŸã€‚

## Goals

- åœ¨ä¸ç ´å Flux `compile once + explicit selector subscription + identity reuse` ä¸»å¹²çš„å‰æä¸‹ï¼Œé™ä½Žå¤æ‚è¡¨å•çš„ä¼ æ’­æˆæœ¬å’Œç»´æŠ¤æˆæœ¬ã€‚
- ä¸ºè¡¨å•å­åŸŸè¡¥ä¸Šå¿…è¦ä½†å…‹åˆ¶çš„ç»“æž„èƒ½åŠ›ï¼šå­—æ®µæŸ¥è¯¢ facadeã€å±€éƒ¨å±•ç¤ºæ€æ´¾ç”Ÿã€å±€éƒ¨å†™å…¥æ”¶æ•›ã€æ•°ç»„ mutation planã€‚
- æŠŠè”åŠ¨èƒ½åŠ›ä»Žåˆ†æ•£è¡¨è¾¾å¼ï¼ŒæŽ¨è¿›åˆ°â€œå—é™ã€å¯åˆ†æžã€å¯ç¼–è¯‘â€çš„å£°æ˜Žå¼æ¨¡åž‹ï¼ŒåŒæ—¶æ˜Žç¡®æŽ’é™¤ Formily `x-reactions` ä¸­é«˜å¤æ‚åº¦çš„éšå¼è¿è¡Œæ—¶èƒ½åŠ›ã€‚
- ä¿æŒå®žçŽ°è¾¹ç•Œæ¸…æ™°ï¼šä¸å¼•å…¥å¹³å°çº§ç»Ÿä¸€å­—æ®µå¯¹è±¡æ¨¡åž‹ï¼Œä¸å¼•å…¥å…¨å±€äº‹åŠ¡ç³»ç»Ÿï¼Œä¸å¼•å…¥ç¬¬äºŒå¥—é€šç”¨ effect runtimeï¼Œä¸å¼•å…¥å®Œå¤‡ä¾èµ–åˆ†æžå¼•æ“Žã€‚

## Non-Goals

- ä¸æŠŠ Flux æ”¹é€ æˆ Formily å¼ Proxy å“åº”å¼ç³»ç»Ÿã€‚
- ä¸å¼•å…¥ `Field` / `ArrayField` / `VoidField` é‡é‡çº§ç±»å®žä¾‹æ ‘ã€‚
- ä¸å»ºè®¾å¹³å°çº§ç»Ÿä¸€å­—æ®µå¯¹è±¡æ¨¡åž‹ï¼Œè¦æ±‚é¡µé¢ã€è®¾è®¡å™¨ã€æŠ¥è¡¨ç­‰éžè¡¨å•å­åŸŸéƒ½è¿ç§»åˆ°åŒä¸€æŠ½è±¡ã€‚
- ä¸æŠŠ Validation å†™å›žåˆå¹¶æäº¤æˆ– Action é“¾è¡¨å•å†™å…¥æ”¶æ•›åšæˆå…¨å±€äº‹åŠ¡ç³»ç»Ÿã€‚
- ä¸å¼•å…¥é€šç”¨ effect runtimeã€éšå¼ scope variable æ³¨å…¥æˆ–ä»»æ„ reaction è„šæœ¬ã€‚
- ä¸ä»¥å®Œå¤‡ä¾èµ–å›¾æˆ–å®Œæ•´é™æ€åˆ†æžä½œä¸ºå‰ç½®ç›®æ ‡ã€‚

## Scope

- `docs/analysis/2026-04-04-formily-vs-flux-final-report.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/renderer-runtime.md`
- `docs/logs/2026/04-04.md`
- `packages/flux-core/src/utils/path.ts`
- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/form-store.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-array.ts`
- `packages/flux-runtime/src/form-runtime-registration.ts`
- `packages/flux-runtime/src/form-runtime-state.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- `packages/flux-runtime/src/form-runtime-types.ts`
- `packages/flux-runtime/src/validation-runtime.ts`
- `packages/flux-runtime/src/validation/` (errors, index, message, registry, rules, validators)
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/form-state.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- ç›¸å…³åˆ†åŒ…æµ‹è¯•æ–‡ä»¶

## ä¸åœ¨ Scope å†…çš„äº‹é¡¹

- å¹³å°çº§è¡¨å•å¯¹è±¡å›¾é‡å†™
- å…¨å±€äº‹åŠ¡ç³»ç»Ÿæˆ–ç»Ÿä¸€ runtime commit coordinator
- Proxy è‡ªåŠ¨ä¾èµ–æ”¶é›†
- Formily å¼ `x-reactions` è¿è¡Œæ—¶å¤åˆ¶
- é¡µé¢ã€è®¾è®¡å™¨ã€æŠ¥è¡¨ç­‰éžè¡¨å•å­åŸŸçš„ç»Ÿä¸€é‡æž„
- å¤§è§„æ¨¡ `NodeRenderer` / React context ç»“æž„é‡å†™

## Execution Plan

**Phase 0 â€” æ–‡æ¡£å†»ç»“ã€profile åŸºçº¿ä¸Žæ‰§è¡Œçº¦æŸæ ¡å‡†**

Targets: `docs/analysis/2026-04-04-formily-vs-flux-final-report.md`, `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/action-runtime.ts`, local profiling notes/tests

- è¡¥ä¸€è½®è®¡åˆ’ç›¸å…³çš„æ–‡æ¡£è¾¹ç•Œè¯´æ˜Žï¼Œç¡®ä¿åŽç»­å®žæ–½ç»Ÿä¸€ä½¿ç”¨æœ¬è®¡åˆ’ä¸­çš„æœ¯è¯­ï¼š
  - `Validation å†™å›žåˆå¹¶æäº¤`
  - `Action é“¾è¡¨å•å†™å…¥æ”¶æ•›`
  - `è½»é‡å­—æ®µå›¾ / æŸ¥è¯¢æŽ¥å£`
  - `å­—æ®µ presentation æ´¾ç”Ÿå¿«ç…§`
- ä¸º validation å†™å›žä¸Ž action é“¾å†™å…¥ä¸¤ä¸ªçƒ­ç‚¹åšæœ€å° profile åŸºçº¿ã€‚
- è®°å½•è‡³å°‘ä»¥ä¸‹æŒ‡æ ‡ï¼š
  - å•æ¬¡äº¤äº’å†… `FormStore` `setState()` æ¬¡æ•°
  - validation è¿‡ç¨‹ä¸­ `revalidateDependents()` è§¦å‘æ¬¡æ•°
  - ç›¸å…³ selector / subscriber è§¦å‘æ¬¡æ•°
  - å¸¸è§åœºæ™¯ä¸‹ renderer é‡æ¸²æŸ“æ•°é‡
- äº§å‡ºä¸€ä¸ªæ˜Žç¡®ç»“è®ºï¼šç“¶é¢ˆä¸»è¦æ¥è‡ª store æäº¤æ¬¡æ•°ã€æ´¾ç”Ÿä¼ æ’­æ¬¡æ•°ï¼Œè¿˜æ˜¯ä¸¤è€…éƒ½æœ‰ã€‚
- ä¸åœ¨æ­¤é˜¶æ®µå¼•å…¥ä»»ä½•æ–°æŠ½è±¡ï¼›åªå»ºç«‹æµ‹é‡åŸºçº¿å’Œåè¯ä¸€è‡´æ€§ã€‚

Exit criteria: æœ‰ä¸€ä»½ç®€çŸ­ä½†å¯å¤ç”¨çš„ profile è®°å½•ï¼Œè¶³ä»¥æŒ‡å¯¼åŽç»­æ˜¯ä¼˜å…ˆåšæäº¤åˆå¹¶ã€æ´¾ç”Ÿè§¦å‘åŽ»é‡ï¼Œè¿˜æ˜¯ä¸¤è€…éƒ½åšã€‚

**Phase 1 â€” å»¶è¿Ÿ `validating/submitting` çŠ¶æ€æ ‡å¿—**

Targets: `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-core/src/types/runtime.ts` if needed, relevant tests under `packages/flux-runtime/src/*.test.ts`

- ç»™ `validating[path]` å’Œ `submitting` å¢žåŠ å»¶è¿Ÿç½®çœŸé˜ˆå€¼ã€‚
- ä¿æŒæœ€ç»ˆå›žè½åˆ° `false` çš„è¡Œä¸ºç«‹å³ä¸”ç¡®å®šã€‚
- ç¡®ä¿ä¸ŽçŽ°æœ‰ debounceã€cancelã€stale-run cancellation ååŒï¼Œä¸å¼•å…¥â€œçŠ¶æ€æ°¸è¿œä¸å›žè½â€æˆ–â€œå»¶è¿Ÿé”™ä½â€é—®é¢˜ã€‚
- æ–°å¢žæµ‹è¯•è¦†ç›–ï¼š
  - çŸ­ async validation ä¸æ˜¾ç¤º validating
  - é•¿ async validation ä¼šæ˜¾ç¤º validating
  - çŸ­ submit ä¸æ˜¾ç¤ºæäº¤ loading
  - é•¿ submit ä¼šæ˜¾ç¤º submitting ä¸”å®ŒæˆåŽåŠæ—¶å›žè½

Exit criteria: çŸ­è¯·æ±‚/çŸ­æ ¡éªŒä¸å†äº§ç”Ÿ UI é—ªçƒï¼ŒåŽŸæœ‰ async è¯­ä¹‰å’Œå–æ¶ˆè¯­ä¹‰ä¿æŒä¸€è‡´ã€‚

**Phase 2 â€” è·¯å¾„ç¼“å­˜ä¸Žé¢„è§£æž**

Targets: `packages/flux-core/src/utils/path.ts`, `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/schema-compiler.ts`, related tests

- ç»™ `parsePath()` å¼•å…¥å…±äº«ç¼“å­˜ã€‚
- å®¡æŸ¥ `getIn()`ã€`setIn()`ã€`resolveScopePath()`ã€`hasScopePath()` çš„è°ƒç”¨æ–¹å¼ï¼Œè¡¥ä¸€ä¸ªæŽ¥å—é¢„è§£æž `segments` çš„çª„ API æˆ–å†…éƒ¨å…±äº«è¾…åŠ©å‡½æ•°ã€‚
- å¯¹ç¼–è¯‘æœŸå·²çŸ¥è·¯å¾„é¢„è§£æžä¸º `segments`ï¼Œä¼˜å…ˆæŒ‚åœ¨é€‚åˆçš„ç¼–è¯‘äº§ç‰©æˆ–çƒ­è·¯å¾„è¾…åŠ©ç»“æž„ä¸Šï¼Œè€Œä¸æ˜¯åˆ›é€ æ–°çš„å¤§ä¸€ç»Ÿå¯¹è±¡æ¨¡åž‹ã€‚
- ä¿æŒçŽ°æœ‰ path è¯­ä¹‰å…¼å®¹ï¼ŒåŒ…æ‹¬ bracket index è§„èŒƒåŒ–ã€‚
- é’ˆå¯¹çƒ­è·¯å¾„å¢žåŠ æµ‹è¯•æˆ– micro assertionsï¼š
  - path è§£æžç»“æžœæ­£ç¡®
  - ç¼“å­˜ä¸æ”¹å˜è¯­ä¹‰
  - å…¸åž‹é‡å¤è·¯å¾„è®¿é—®åœ¨é€»è¾‘ä¸Šç¡®å®žå¤ç”¨è§£æžç»“æžœ

Exit criteria: çƒ­è·¯å¾„ä¸å†å¯¹ç›¸åŒ path é‡å¤æ‰§è¡Œå®Œå…¨ç›¸åŒçš„å­—ç¬¦ä¸²è§£æžå·¥ä½œï¼Œä¸” path è¯­ä¹‰é›¶å›žå½’ã€‚

**Phase 3 â€” è½»é‡å­—æ®µå›¾ / æŸ¥è¯¢æŽ¥å£**

Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-registration.ts`, `packages/flux-runtime/src/schema-compiler.ts`, possibly `packages/flux-runtime/src/validation/*`, related tests/docs

- åœ¨ `FormRuntime` èŒƒå›´å†…æ–°å¢žåªè¯»æŸ¥è¯¢ facadeã€‚
- ç¬¬ä¸€ç‰ˆåªè¦†ç›–å·²ç¡®è®¤çš„åœºæ™¯ï¼š
  - `getField(path)`
  - `getDependents(path)`
  - `findByPrefix(path)`
  - å¿…è¦æ—¶ `getChildren(path)`
- æ•°æ®æ¥æºå¯ä»¥ç»„åˆç¼–è¯‘äº§ç‰©ã€validation modelã€runtime registrationï¼Œä½†ä¸è¦ç”Ÿæˆå¹³å°çº§ç»Ÿä¸€æ€»å›¾ã€‚
- æ–°æŽ¥å£åº”æ˜Žç¡®åªæœåŠ¡è¡¨å•å­åŸŸï¼Œé¿å…å…¶ä»–å­åŸŸè¢«è¿«è¿ç§»åˆ°åŒä¸€æ¨¡åž‹ã€‚
- ç¡®ä¿å¤æ‚å­—æ®µã€dependent revalidationã€è°ƒè¯•è¾…åŠ©å’ŒåŽç»­è”åŠ¨æ¨¡åž‹éƒ½èƒ½æ¶ˆè´¹è¿™ä¸€è–„ facadeã€‚

Exit criteria: è¡¨å•å­åŸŸèŽ·å¾—ç»Ÿä¸€çš„åªè¯»å­—æ®µæŸ¥è¯¢å…¥å£ï¼Œä¸”å®žçŽ°ä»ç„¶ä¿æŒè½»é‡ facadeï¼Œè€Œä¸æ˜¯æ–°çš„ä¸­å¿ƒå¯¹è±¡æ¨¡åž‹ã€‚

**Phase 4 â€” Validation å†™å›žåˆå¹¶æäº¤**

Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, related tests

- åŸºäºŽ Phase 0 çš„ profile ç»“æžœå†³å®šä¼˜å…ˆç­–ç•¥ã€‚
- å¦‚æžœç“¶é¢ˆä¸»è¦åœ¨ store æäº¤æ¬¡æ•°ï¼š
  - ä¸º `FormStore` å¢žåŠ æ˜¾å¼ patch/commit æˆ–ç­‰ä»·å±€éƒ¨åˆå¹¶å†™å›žèƒ½åŠ›ã€‚
  - æŠŠ validation æµç¨‹é‡Œçš„ `errors/validating/touched` ç­‰æ›´æ–°æ”¶æ•›åˆ°æ›´å°‘æ¬¡æ•°çš„æäº¤ã€‚
- å¦‚æžœç“¶é¢ˆæ›´å¤šåœ¨æ´¾ç”Ÿä¼ æ’­æ¬¡æ•°ï¼š
  - ä¼˜å…ˆå‡å°‘ `revalidateDependents()` æˆ–ç›¸å…³æ´¾ç”Ÿé€»è¾‘çš„é‡å¤è§¦å‘ï¼Œå†å†³å®šæ˜¯å¦ä»éœ€è¦ patch/commitã€‚
- ä¿æŒä»¥ä¸‹è¾¹ç•Œï¼š
  - ä¸æ”¹å˜æ ¡éªŒé¡ºåº
  - ä¸æ”¹å˜é”™è¯¯èšåˆè¯­ä¹‰
  - ä¸å½±å“ stale-run cancellation
  - ä¸å¼•å…¥å…¨å±€äº‹åŠ¡æ¨¡åž‹

Exit criteria: validation è·¯å¾„ä¸­çš„å¤šæ¬¡ç¢Žç‰‡åŒ–å†™å›žæ˜Žæ˜¾å‡å°‘ï¼Œæˆ–ç­‰ä»·åœ°æ´¾ç”Ÿä¼ æ’­æ¬¡æ•°æ˜Žæ˜¾ä¸‹é™ï¼Œä¸”è¡Œä¸ºè¯­ä¹‰å®Œå…¨å…¼å®¹ã€‚

**Phase 5 â€” Action é“¾è¡¨å•å†™å…¥æ”¶æ•›**

Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime.ts`, related tests

- å•ç‹¬è®¾è®¡ action chain èŒƒå›´å†…çš„è¡¨å•å†™å…¥æ”¶æ•›è¾¹ç•Œã€‚
- ä¼˜å…ˆè€ƒè™‘ä¸¤ç±»å®žçŽ°ï¼š
  - æ˜¾å¼ APIï¼Œä¾‹å¦‚ `form.batchMutations(fn)`
  - å—æŽ§ built-in actionï¼Œä¾‹å¦‚ `setValues` / `patchFormState`
- ä¸å¯¹æ•´ä¸ª `dispatch()` éšå¼åŒ…è£¹é»‘ç›’äº‹åŠ¡ã€‚
- ä¿æŒ `prevResult`ã€`continueOnError`ã€debounceã€å–æ¶ˆã€ç›‘æŽ§æ—¶åºå¯è§‚æµ‹ã€‚
- å¦‚æžœ Phase 0/4 è¯æ˜Žä¸»è¦ç“¶é¢ˆå¹¶ä¸åœ¨æäº¤æ¬¡æ•°ï¼Œè€Œåœ¨é‡å¤ dependent revalidationï¼Œåˆ™ä¼˜å…ˆåšâ€œaction chain å†…æ´¾ç”ŸåŽ»é‡â€ï¼Œè€Œä¸æ˜¯æ‰©å¤§å†™å…¥è¾¹ç•ŒæŠ½è±¡ã€‚

Exit criteria: é“¾å¼è¡¨å•å†™å…¥ä¸ä¼šæŠŠå•æ¬¡äº¤äº’æ‹†æˆè¿‡å¤šä¼ æ’­å›žåˆï¼ŒåŒæ—¶ action è¯­ä¹‰ä¸Žç›‘æŽ§è¾¹ç•Œä»ç„¶æ¸…æ™°å¯è§ã€‚

**Phase 6 â€” æ•°ç»„çƒ­è·¯å¾„ä¼˜åŒ–**

Targets: `packages/flux-runtime/src/form-runtime-array.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-path-state.ts`, `packages/flux-core/src/utils/path.ts` if needed, related renderer tests

- å½“å‰ `remapArrayFieldState` + `replaceManagedArrayValue` å·²å®Œæ•´å¤„ç†ä»¥ä¸‹å››ç±»é‡æ˜ å°„ï¼Œä½†æ¯æ¬¡æ•°ç»„æ“ä½œåˆè®¡å‘å‡º **8â€“9 æ¬¡é¡ºåº `setState` è°ƒç”¨**ï¼ˆ`remapArrayFieldState` 5 æ¬¡ï¼šerrors/touched/dirty/visited/validatingï¼›`replaceManagedArrayValue` 3â€“4 æ¬¡ï¼švalidating/dirty/value + clearErrorsï¼‰ï¼Œæ— ä»»ä½•æ‰¹é‡æäº¤ï¼š
  - æ•°ç»„å€¼æ›¿æ¢ï¼ˆ`replaceManagedArrayValue`ï¼‰
  - errors/touched/dirty/visited/validating é‡æ˜ å°„ï¼ˆ`remapArrayFieldState`ï¼‰
  - validationRuns é‡æ˜ å°„ï¼ˆ`remapValidationRunState`ï¼‰
  - initialFieldState é‡æ˜ å°„ï¼ˆ`remapInitialFieldState`ï¼‰
- æœ¬é˜¶æ®µçš„å·¥ä½œæ˜¯ä¼˜åŒ–ä¸Šè¿°çŽ°æœ‰å®žçŽ°ï¼Œè€Œä¸æ˜¯é‡æ–°å¼•å…¥è¿™äº›å‡½æ•°ã€‚
- è‹¥ Phase 4 å·²è½åœ°é€šç”¨ patch/commit åŽŸè¯­ï¼ˆå¦‚ `form.batchMutations(fn)`ï¼‰ï¼Œç›´æŽ¥å°† `remapArrayFieldState` + `replaceManagedArrayValue` ä¸­çš„é¡ºåºå†™å…¥æ”¶æ•›åˆ°è¯¥åŽŸè¯­å†…ï¼Œå°† 8â€“9 æ¬¡ç¼©å‡ä¸º 1â€“2 æ¬¡ `setState`ã€‚
- è‹¥ Phase 4 ä»…æ”¶æ•›äº† validation å†™å›žè·¯å¾„è€Œæœªæä¾›é€šç”¨åŽŸè¯­ï¼Œåˆ™åœ¨æœ¬é˜¶æ®µå•ç‹¬ä¸ºæ•°ç»„æ“ä½œè·¯å¾„æä¾›å±€éƒ¨æ‰¹é‡èƒ½åŠ›ã€‚
- å¯¹æœªå—å½±å“ç´¢å¼•å°½é‡ä¿ç•™å¼•ç”¨ç¨³å®šæ€§ã€‚
- å®¡æŸ¥ renderer è®¢é˜…è¾¹ç•Œï¼Œå‡å°‘æ•°ç»„å±€éƒ¨å˜åŠ¨å¼•å‘çš„æ•´ç‰‡é‡æ¸²æŸ“ã€‚
- æµ‹è¯•åœºæ™¯è‡³å°‘è¦†ç›–ï¼š
  - append / prepend / insert / remove / move / swap / replace
  - shallow array ä¸Ž nested array pathsï¼ˆå¦‚ `list[0].tags[1].name` åŒå±‚ç´¢å¼•ï¼‰
  - aggregate error / runtime registration child path ä¿æŒæ­£ç¡®

Exit criteria: æ•°ç»„æ“ä½œåŽçš„çŠ¶æ€è¿ç§»ä»æ­£ç¡®ï¼Œä¸”å±€éƒ¨æ›´æ–°æ³¢åŠé¢æ˜Žæ˜¾å°äºŽå½“å‰å®žçŽ°ã€‚

**Phase 7 â€” å—é™å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹**

Targets: `packages/flux-core/src/types/*`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/node-runtime.ts` if needed, `packages/flux-renderers-form/src/*`, docs/tests

- è®¾è®¡ä¸€å¥—æœ€å°å¯ç”¨çš„å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹ï¼Œåªè¦†ç›–é«˜é¢‘è¡¨å•å­—æ®µè”åŠ¨åœºæ™¯ã€‚
- ç¬¬ä¸€ç‰ˆåªå…è®¸ï¼š
  - æ˜¾å¼ `dependencies`
  - æ˜¾å¼ `when`
  - æ˜¾å¼ `fulfill/otherwise`
  - å›ºå®šå¯å†™ç›®æ ‡é›†åˆ
- ç¬¬ä¸€ç‰ˆæ˜Žç¡®æŽ’é™¤ï¼š
  - `$observable`
  - `$effect`
  - `$memo`
  - ä»»æ„è„šæœ¬å‰¯ä½œç”¨
- å°½é‡é¿å…æŠŠ `$form`ã€`$self` è¿™ç±»åŽŸå§‹å¯¹è±¡ç›´æŽ¥æš´éœ²ç»™ schemaã€‚
- ç¼–è¯‘äº§ç‰©åº”è½åˆ°çŽ°æœ‰ runtime/action/validation èƒ½åŠ›ä¹‹ä¸Šï¼Œè€Œä¸æ˜¯å»ºè®¾æ–°çš„é€šç”¨ effect engineã€‚
- é¦–è½®è½åœ°å»ºè®®åªè¦†ç›–ï¼š
  - `visible`
  - `disabled`
  - `required`
  - `options`
  - å—æŽ§çš„ `value` æˆ–ç­‰ä»·ç®€å•èµ‹å€¼åœºæ™¯

Exit criteria: å¸¸è§å­—æ®µè”åŠ¨å¯ä»¥è„±ç¦»åˆ†æ•£è¡¨è¾¾å¼ï¼Œä»¥å—é™ã€å¯åˆ†æžã€å¯æµ‹è¯•çš„æ–¹å¼è¡¨è¾¾ï¼Œå¹¶ä¸”ä¸å¤åˆ¶ Formily `x-reactions` çš„éšå¼å¤æ‚åº¦ã€‚

**Phase 8 â€” å­—æ®µ presentation æ´¾ç”Ÿå¿«ç…§**

Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-react/src/form-state.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/*`, related tests

- æŠŠå½“å‰åˆ†æ•£çš„å­—æ®µå±•ç¤ºæ€åˆ¤æ–­æ”¶å£æˆå±€éƒ¨åªè¯» helper æˆ–ç¨³å®šæ´¾ç”Ÿå¿«ç…§ã€‚
- ç¬¬ä¸€ç‰ˆæœ€å°é›†åˆï¼š
  - `effectiveDisabled`
  - `effectiveRequired`
  - `error visibility`
  - `interactive/readOnly presentation`
- ä¼˜å…ˆæ”¾åœ¨ `FormRuntime` / `flux-react` å­—æ®µ hooks çš„äº¤ç•Œå¤„ï¼Œè®© `FieldFrame` å’Œå­—æ®µ renderer hooks ç›´æŽ¥æ¶ˆè´¹ã€‚
- ä¸å»ºè®¾æ–°çš„å…¨å±€æ´¾ç”ŸçŠ¶æ€ç³»ç»Ÿæˆ–ç‹¬ç«‹ç¼“å­˜å­ç³»ç»Ÿã€‚
- æ˜Žç¡®å¤±æ•ˆè¾¹ç•Œï¼Œä»…å¯¹å½±å“å±•ç¤ºæ€çš„è¾“å…¥å˜åŒ–å¤±æ•ˆã€‚

Exit criteria: `FieldFrame` å’Œå­—æ®µ renderer ä¸å†åå¤æ‹¼è£…ç›¸åŒå±•ç¤ºé€»è¾‘ï¼Œå­—æ®µå±•ç¤ºæ€æ¥æºæ›´ç¨³å®šã€æ›´å¯æµ‹è¯•ã€‚

**Phase 9 â€” é•¿æœŸé¡¹ï¼šæ›´ç»† selector ä¸Ž validation model ç»“æž„æ”¶å£**

> è¿‡æ—¶æ ‡è®°ï¼ˆ2026-04-07ï¼‰ï¼šæœ¬é˜¶æ®µä¸­â€œç¼–è¯‘æœŸä¾èµ–æå–â€ç›¸å…³è¡¨è¿°å·²è¢« `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` å’Œ `docs/architecture/dependency-tracking.md` å–ä»£ã€‚åŽç»­è‹¥ç»§ç»­æŽ¨è¿› selector ç»†åŒ–ï¼Œåº”å»ºç«‹åœ¨ explicit-root-first + runtime fallback çš„ root-level dependency model ä¸Šï¼Œè€Œä¸æ˜¯å›žåˆ°é™æ€ä¾èµ–æå–ä¸»çº¿ã€‚

Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/validation/*`, related docs/tests

- åŸºäºŽå‰é¢é˜¶æ®µçš„æ•°æ®å†åˆ¤æ–­æ˜¯å¦æŽ¨è¿›ï¼š
  - [è¿‡æ—¶] `ç¼–è¯‘æœŸä¾èµ–æå–ä¸Žæ›´ç»† selector`
  - `validation model` åŽ»é‡/æ”¶å£
- [è¿‡æ—¶] ç¬¬ä¸€é˜¶æ®µåªè¦†ç›–å°‘é‡å¯é™æ€æå–çš„è¡¨è¾¾å¼å½¢æ€å’Œå·²çŸ¥çƒ­è·¯å¾„ï¼Œä¸ä»¥å®Œå¤‡ä¾èµ–åˆ†æžä¸ºç›®æ ‡ã€‚
- selector ç›¸å…³åŽç»­è‹¥ç»§ç»­æŽ¨è¿›ï¼Œåº”æ”¹è¯»ä¸ºâ€œåŸºäºŽ Plan 39 root-level dependency model çš„æ›´ç»†å¤±æ•ˆæŽ§åˆ¶â€ï¼Œè€Œä¸æ˜¯é‡æ–°å¼•å…¥é™æ€ä¾èµ–æå–è·¯çº¿ã€‚
- å¦‚æžœ `NodeRenderer` provider å±‚çº§ä»è¢« profile è¯æ˜Žä¸ºç“¶é¢ˆï¼Œå†å•ç‹¬å¼€å…·ä½“è®¡åˆ’ï¼Œä¸åœ¨æ­¤è®¡åˆ’é‡Œé¢„å…ˆæ‰¿è¯ºç»“æž„é‡å†™ã€‚

Exit criteria: åªæœ‰åœ¨æœ‰å……åˆ† profile è¯æ®çš„æƒ…å†µä¸‹ï¼Œæ‰ç»§ç»­æŽ¨è¿›æ›´ç»† selector æˆ– validation model æ”¶å£ï¼›å¦åˆ™ä¿æŒå½“å‰æž¶æž„ç®€å•æ€§ã€‚

## Implementation Order

å»ºè®®çš„æ‰§è¡Œé¡ºåºå¦‚ä¸‹ï¼š

1. Phase 0 â€” profile åŸºçº¿ä¸Žæ–‡æ¡£æ ¡å‡†
2. Phase 1 â€” å»¶è¿Ÿ `validating/submitting`
3. Phase 2 â€” è·¯å¾„ç¼“å­˜ä¸Žé¢„è§£æž
4. Phase 3 â€” è½»é‡å­—æ®µå›¾ / æŸ¥è¯¢æŽ¥å£
5. Phase 4 â€” Validation å†™å›žåˆå¹¶æäº¤
6. Phase 5 â€” Action é“¾è¡¨å•å†™å…¥æ”¶æ•›
7. Phase 6 â€” æ•°ç»„çƒ­è·¯å¾„ä¼˜åŒ–
8. Phase 7 â€” å—é™å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹
9. Phase 8 â€” å­—æ®µ presentation æ´¾ç”Ÿå¿«ç…§
10. Phase 9 â€” é•¿æœŸé¡¹æŒ‰ profile å†å†³å®š

è¯´æ˜Žï¼š

- å¦‚æžœåªä»Žæ”¶ç›Š/ä½“æ„Ÿçœ‹ï¼Œæ•°ç»„çƒ­è·¯å¾„ä¼˜åŒ–ä¸Žå»¶è¿ŸçŠ¶æ€æ ‡å¿—éƒ½å¾ˆäº®çœ¼ã€‚
- ä½†ä»Žæž¶æž„ä¾èµ–é¡ºåºçœ‹ï¼Œå­—æ®µå›¾ / æŸ¥è¯¢ facadeã€è·¯å¾„åŸºç¡€è®¾æ–½å’Œ profile ç»“è®ºåº”å…ˆäºŽæ›´å¤§èŒƒå›´çš„ä¼˜åŒ–è¿›å…¥å®žæ–½ã€‚
- Phase 4 ä¸Ž Phase 6 å…±äº«"å‡å°‘é¡ºåº `setState` æ¬¡æ•°"è¿™ä¸€åº•å±‚æœºåˆ¶ï¼šè‹¥ Phase 4 å·²è½åœ°é€šç”¨ patch/commit åŽŸè¯­ï¼ŒPhase 6 å¯ç›´æŽ¥å¤ç”¨ï¼Œä¸éœ€è¦é‡å¤å»ºè®¾æ‰¹é‡å†™å…¥èƒ½åŠ›ï¼›è‹¥ Phase 4 ä»…æ”¶æ•›äº† validation å†™å›žè·¯å¾„ï¼ŒPhase 6 éœ€å•ç‹¬ä¸ºæ•°ç»„æ“ä½œè·¯å¾„è¡¥å……å±€éƒ¨æ‰¹é‡èƒ½åŠ›ã€‚

## Risks

- æŠŠå­—æ®µå›¾è¯¯åšæˆå¹³å°çº§ç»Ÿä¸€å¯¹è±¡æ¨¡åž‹ï¼Œå¯¼è‡´ Flux é‡å¿ƒè¢«é‡æ–°æ‹–å›žè¡¨å•å¯¹è±¡å›¾ã€‚
- æŠŠ validation å†™å›žæˆ– action å†™å…¥æ”¶æ•›è¯¯åšæˆå…¨å±€äº‹åŠ¡ç³»ç»Ÿï¼Œç ´åæ—¶åºå¯è§‚æµ‹æ€§ã€‚
- æŠŠå—é™å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹æ‰©å¼ æˆç¬¬äºŒå¥—é€šç”¨ DSL / effect runtimeã€‚
- åœ¨ç¼ºå°‘ profile çš„æƒ…å†µä¸‹è¿‡æ—©æŽ¨è¿›æ´¾ç”Ÿç¼“å­˜æˆ–ä¾èµ–æå–ï¼Œå¯¼è‡´å¤æ‚åº¦å…ˆäºŽæ”¶ç›Šè½åœ°ã€‚
- æ•°ç»„ä¼˜åŒ–åªå…³æ³¨ values è€Œå¿½ç•¥ field state / validation state / runtime registration è·¯å¾„ä¸€è‡´æ€§ã€‚

## Effort

- å»ºè®®æŒ‰ 2 è½®æ‰§è¡Œï¼š
  - ç¬¬ä¸€è½®ï¼šPhase 0-3ï¼Œå…ˆåšä½Žé£Žé™©åŸºç¡€è®¾æ–½å’Œæµ‹é‡åŸºçº¿
  - ç¬¬äºŒè½®ï¼šPhase 4-8ï¼ŒæŒ‰ profile ç»“æžœæŽ¨è¿›å†™å›žæ”¶æ•›ã€æ•°ç»„ä¼˜åŒ–å’Œè”åŠ¨æ¨¡åž‹
- é¢„è®¡æœ€å°å¯äº¤ä»˜åˆ‡ç‰‡ä¸º 4-6 ä¸ªå·¥ä½œæ—¥ï¼šPhase 0-2
- å®Œæ•´æ‰§è¡Œåˆ° Phase 8 çš„ä¿å®ˆä¼°è®¡ä¸º 12-18 ä¸ªå·¥ä½œæ—¥ï¼Œå–å†³äºŽæ•°ç»„çƒ­è·¯å¾„ä¸Žè”åŠ¨æ¨¡åž‹å¤æ‚åº¦

## Verification

æ¯ä¸ªé˜¶æ®µè‡³å°‘æ‰§è¡Œå—å½±å“åˆ†åŒ…éªŒè¯ï¼›æœ€ç»ˆåšå…¨ä»“éªŒè¯ã€‚

```bash
pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-runtime typecheck
pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-renderers-form typecheck

pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-runtime build
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-renderers-form build

pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-runtime lint
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-renderers-form lint

pnpm --filter @nop-chaos/flux-core test
pnpm --filter @nop-chaos/flux-runtime test
pnpm --filter @nop-chaos/flux-react test
pnpm --filter @nop-chaos/flux-renderers-form test

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

é¢å¤–éªŒè¯è¦æ±‚ï¼š

- å¯¹ Phase 0 çš„ profile ç»“è®ºä¿ç•™å¯å¤ç”¨è®°å½•ï¼Œé¿å…åŽç»­â€œå‡­æ„Ÿè§‰ä¼˜åŒ–â€ã€‚
- å¯¹ Phase 4-6 è¡¥è¶³å›žå½’æµ‹è¯•ï¼Œè¦†ç›– validation å†™å›žæ¬¡æ•°ã€action chain æ´¾ç”Ÿä¼ æ’­ã€æ•°ç»„æ“ä½œçŠ¶æ€ä¸€è‡´æ€§ã€‚
- å¯¹ Phase 7-8 è¡¥è¶³æ–‡æ¡£å’Œæµ‹è¯•ï¼Œç¡®ä¿å—é™è”åŠ¨æ¨¡åž‹ä¸Žå±•ç¤ºæ€æ´¾ç”Ÿè¾¹ç•Œä¸ä¼šè¢«å®žçŽ°å±‚å·å·æ”¾å¤§ã€‚

## Documentation Follow-Up

- è‹¥ Phase 3 è½åœ°ï¼Œæ›´æ–° `docs/architecture/form-validation.md` æˆ–æ–°å»ºå¯¹åº” architecture sectionï¼Œæ˜Žç¡®å­—æ®µæŸ¥è¯¢ facade çš„è¾¹ç•Œã€‚
- è‹¥ Phase 4-5 è½åœ°ï¼Œæ›´æ–° `docs/architecture/form-validation.md` ä¸Ž `docs/architecture/flux-runtime-module-boundaries.md`ï¼Œè®°å½•å†™å›žæ”¶æ•›ä¸Ž action chain æ”¶æ•›çš„æ¨¡å—å½’å±žã€‚
- è‹¥ Phase 7 è½åœ°ï¼Œæ›´æ–° `docs/architecture/form-validation.md`ã€`docs/architecture/renderer-runtime.md` å’Œç›¸å…³ schema çº¦å®šæ–‡æ¡£ï¼Œæ˜Žç¡®å£°æ˜Žå¼è”åŠ¨æ¨¡åž‹è¾¹ç•Œä¸Žç¦æ­¢èƒ½åŠ›ã€‚
- è‹¥ Phase 8 è½åœ°ï¼Œæ›´æ–° `docs/architecture/field-metadata-slot-modeling.md` æˆ–ç›¸å…³å­—æ®µå±•ç¤ºæ–‡æ¡£ï¼Œè®°å½• presentation æ´¾ç”Ÿå¿«ç…§çš„ä½ç½®ä¸Žæ¶ˆè´¹æ–¹å¼ã€‚

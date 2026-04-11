# Form Validation Owner Redesign Draft

> Status: draft

> Last Reviewed: 2026-04-11

> This document is an exploratory design draft. It is not the active architecture contract. The current normative baseline remains `docs/architecture/form-validation.md`.

## Purpose

æœ¬æ–‡æ¡£è®°å½•å¯¹ Flux form validation çš„ä¸‹ä¸€è½®é‡æž„è‰æ¡ˆã€‚

è¿™ä»½è‰æ¡ˆçš„ç›®æ ‡ä¸æ˜¯ç«‹åˆ»æ›¿æ¢çŽ°æœ‰å®žçŽ°ï¼Œè€Œæ˜¯å…ˆå›žç­”ä»¥ä¸‹é—®é¢˜ï¼š

- validation åº”è¯¥æŒ‰ä»€ä¹ˆè¾¹ç•Œåˆ†å±‚
- `table` / `object-field` / `array-field` / `detail-field` / `detail-view` / `dialog` çš„åµŒå¥—éªŒè¯åº”å¦‚ä½•å½’å±ž
- `required`ã€`minLength`ã€`pattern` ç­‰è§„åˆ™å‚æ•°æ˜¯å¦åº”æ”¯æŒè¡¨è¾¾å¼
- é¢„ç¼–è¯‘æ¨¡åž‹å¦‚ä½•å’Œè¿è¡Œæ—¶å±€éƒ¨éªŒè¯ååŒ
- draft editor æ˜¯å¦éœ€è¦ç‹¬ç«‹ owner
- å¤æ‚æŽ§ä»¶çš„åŠ¨æ€éªŒè¯åº”è¯¥å¦‚ä½•æŒ‚æŽ¥åˆ°ä¸»æ¨¡åž‹

## Scope

æœ¬æ–‡åªè®¨è®ºï¼š

- value validation model
- owner boundary
- draft validation
- partial validation
- dynamic rule extension
- error model

æœ¬æ–‡ä¸ç›´æŽ¥å®šä¹‰ï¼š

- æœ€ç»ˆä»£ç æ‹†åˆ†æ–¹æ¡ˆ
- æœ€ç»ˆ public API åç§°
- renderer çº§å…·ä½“ UI è¡¨çŽ°
- æœ€ç»ˆ migration plan

## Background

å½“å‰ä»“åº“å·²ç»æœ‰ä¸€å¥—å¯å·¥ä½œçš„éªŒè¯ç³»ç»Ÿï¼Œä¼˜åŠ¿åŒ…æ‹¬ï¼š

- ç¼–è¯‘æœŸæå– validation graph
- `validateField(path)` / `validateSubtree(path)` / `validateForm()` ä¸‰å±‚ API
- hidden field policy
- async validation debounce + stale run suppression
- array path state remapping

ä½†å½“å‰è®¾è®¡ä¹Ÿå­˜åœ¨æ˜Žæ˜¾é—®é¢˜ï¼š

- validation core model å’Œ form UX state è€¦åˆè¿‡æ·±
- owner boundary è¿˜æ²¡æœ‰æŠ½è±¡æ¸…æ¥šï¼Œå½“å‰å®žè´¨ä¸Šä»æ˜¯ form-only
- dialog/detail draft editing è¿˜æ²¡æœ‰ first-class è®¾è®¡è½åœ°
- aggregate rule freshness ä»éƒ¨åˆ†ä¾èµ– renderer æ‰‹å·¥è§¦å‘ subtree validation
- è§„åˆ™å€¼ä»ä»¥é™æ€å­—é¢é‡ä¸ºä¸»ï¼Œå¯¹è¡¨è¾¾å¼åŒ– low-code schema æ”¯æŒä¸è¶³

## Design Goals

1. ä¿ç•™ Flux çš„é¢„ç¼–è¯‘ä¼˜åŠ¿ï¼Œè€Œä¸æ˜¯é€€å›ž mount-driven registration æ¨¡åž‹ã€‚
2. ä¿ç•™ owner-scoped validationï¼Œä¸é€€å›ž pure field-scoped validationã€‚
3. è®©è§„åˆ™æœ¬èº«æ”¯æŒè¡¨è¾¾å¼åŒ–ï¼Œä¸æŠŠ `required` ç­‰é™åˆ¶æˆé™æ€ booleanã€‚
4. è®©å±€éƒ¨éªŒè¯æˆä¸º owner ä¸Šçš„ä¸€ç­‰èƒ½åŠ›ï¼Œè€Œä¸æ˜¯ renderer workaroundã€‚
5. è®© draft editor æˆä¸ºæ™®é€š owner å˜ä½“ï¼Œè€Œä¸æ˜¯ä¸´æ—¶è¡¥ä¸ã€‚
6. è®©å¤æ‚æŽ§ä»¶å°½é‡æ³¨å†Œ dynamic rulesï¼Œè€Œä¸æ˜¯ä¼˜å…ˆæ³¨å†Œé»‘ç›’ `validate()`ã€‚
7. è®©é”™è¯¯æ¨¡åž‹å¯¹ aggregate/composite åœºæ™¯ä»æœ‰è¶³å¤Ÿè¡¨è¾¾åŠ›ã€‚

## Non-Goals

1. ä¸æŠŠ Flux å˜æˆ Yup é£Žæ ¼ fluent builder libraryã€‚
2. ä¸æŠŠ React mount/unmount å½“ä½œå­—æ®µå‘çŽ°ä¸»æœºåˆ¶ã€‚
3. ä¸å¼ºæ±‚æ‰€æœ‰å¤æ‚æŽ§ä»¶ç¬¬ä¸€ç‰ˆéƒ½å®Œå…¨é™æ€åŒ–ã€‚
4. ä¸åœ¨æœ¬è‰æ¡ˆé‡ŒåºŸé™¤çŽ°æœ‰ `FormRuntime`ã€‚
5. ç¬¬ä¸€é˜¶æ®µä¸æŠŠ arbitrary projection edit å»ºæˆ first-class validation ownerã€‚

## Core Claim

Validation å¿…é¡»åŒæ—¶æŒ‰ä¸¤æ¡è½´å»ºæ¨¡ï¼š

- **value axis**ï¼šå€¼æ ‘ä¸Šçš„çº¦æŸã€è·¯å¾„ã€ä¾èµ–ã€èšåˆè§„åˆ™
- **owner axis**ï¼šå½“å‰ç”±è°æ‹¥æœ‰ value / errors / validating / commit boundary

åªçœ‹ value axis ä¸å¤Ÿï¼Œå› ä¸º draft/detail/dialog ä¼šå¼•å…¥ owner boundaryã€‚
åªçœ‹ owner axis ä¹Ÿä¸å¤Ÿï¼Œå› ä¸º object/array/aggregate rule æœ¬è´¨ä¸Šä»æ˜¯å€¼ç»“æž„çº¦æŸã€‚

æŽ¨èç»“è®ºï¼š

- Value Validation Layer è´Ÿè´£â€œä»€ä¹ˆå€¼åˆæ³•â€
- ValidationOwner è´Ÿè´£â€œå½“å‰è°æ‹¥æœ‰è¿™ç»„å€¼å’Œé”™è¯¯â€
- FormRuntime è´Ÿè´£â€œä»€ä¹ˆæ—¶å€™è§¦å‘ã€ä»€ä¹ˆæ—¶å€™æ˜¾ç¤ºã€ä»€ä¹ˆæ—¶å€™æäº¤â€

## Layering

æŽ¨èæŠŠ validation ç³»ç»Ÿæ”¶æ•›æˆä¸‰å±‚ã€‚

### 1. Value Validation Layer

åªè´Ÿè´£ï¼š

- compiled path graph
- rule templates
- dependency extraction
- effective rule materialization
- validator execution

å®ƒä¸è´Ÿè´£ï¼š

- touched / dirty / visited
- showErrorOn
- blur/change/submit trigger policy
- hidden-field UI policy

### 2. ValidationOwner

åªè´Ÿè´£ï¼š

- å½“å‰ owner çš„ values root
- å½“å‰ owner çš„ error map
- compiled model å¼•ç”¨
- dynamic rule overlay
- `validateAt` / `validateSubtree` / `validateAll`
- owner-local error lifecycle

å®ƒä¸è´Ÿè´£ï¼š

- UI ä½•æ—¶æ˜¾ç¤ºé”™è¯¯
- submit button lifecycle
- surface open/close state

è¯´æ˜Žï¼š

- hidden/active participation policy çš„æ¥æºä»å¯ç”± `FormRuntime` ç­‰ UX layer å†³å®š
- ä½† phase 1 ä¸­ï¼Œowner è´Ÿè´£æ‰§è¡Œ participation reconciliationï¼Œå¹¶æ‰¿æ‹…ç”± `clearValueWhenHidden` ç­‰ç­–ç•¥å¼•èµ·çš„å€¼ä¾§å‰¯ä½œç”¨

### 3. FormRuntime UX Layer

åªè´Ÿè´£ï¼š

- `validateOn`
- `showErrorOn`
- `touched` / `dirty` / `visited`
- hidden-field participation policy
- submit gate
- `$form` status summary

## Comparison With `form-validation-expression-rules-design.md`

`docs/analysis/2026-04-11-form-validation-expression-rules-design.md` æå‡ºäº†å‡ æ¡å¾ˆæœ‰ä»·å€¼çš„ä¿®æ­£æ„è§ï¼Œä¹Ÿæœ‰ä¸€äº›ä¸åº”å®Œå…¨é‡‡çº³çš„åœ°æ–¹ã€‚

### Worth Adopting

å€¼å¾—å¸æ”¶çš„ç‚¹ï¼š

1. `field tree` / `field registry` / `validation state` éœ€è¦æ˜Žç¡®åŒºåˆ†
2. è§„åˆ™å‚æ•°è¡¨è¾¾å¼åŒ–æ˜¯åˆšéœ€ï¼Œä¸åº”ç»§ç»­å±€é™åœ¨é™æ€å­—é¢é‡
3. `isFieldEffectivelyRequired` ä¸èƒ½ç»§ç»­å’Œ validator èµ°ä¸¤å¥—é€»è¾‘
4. æ¸²æŸ“æŽ§ä»¶ä¸åªæ˜¯ runtime componentï¼Œä¹Ÿåº”å…è®¸å£°æ˜Žç¼–è¯‘æœŸ validation registration è§„åˆ™

### Not Fully Adopted

ä¸å®Œå…¨é‡‡çº³çš„ç‚¹ï¼š

1. ä¸æŠŠâ€œå½“å‰æŒ‚è½½å­—æ®µé›†åˆ = validation å”¯ä¸€çœŸç›¸â€ä½œä¸ºæœ€ç»ˆæ¨¡åž‹
2. ä¸æŠŠ React mount/unmount å½“æˆæ›¿ä»£ active instance materialization çš„å”¯ä¸€æœºåˆ¶
3. ä¸æŠŠ `ValidationOwner` æ–¹å‘æ•´ä½“å¦å®šæŽ‰

åŽŸå› ï¼š

- Flux ä¸æ˜¯åªåœ¨ React mount ç”Ÿå‘½å‘¨æœŸé‡Œè¿è¡Œ
- å®ƒæœ‰é¢„ç¼–è¯‘ã€owner boundaryã€draft ownerã€aggregate graph è¿™äº›è¦æ±‚
- mount-driven registry å¾ˆé€‚åˆåæ˜ â€œå½“å‰æ´»è·ƒå®žä¾‹â€å’Œâ€œå½“å‰ field stateâ€ï¼Œä½†ä¸åº”åè¿‡æ¥æˆä¸º validation graph çš„å”¯ä¸€æ¥æº

### Current Draft Position

å½“å‰è‰æ¡ˆå¸æ”¶è¯¥æ–‡æ¡£åŽçš„ç»“è®ºæ˜¯ï¼š

- **compiled field tree / validation graph æ˜¯ä¸»æ¨¡åž‹**
- **runtime registry æ˜¯å½“å‰æ´»è·ƒå®žä¾‹å’Œ field state çš„è¡¥å……æ¨¡åž‹**
- äºŒè€…ä¸æ˜¯äºŒé€‰ä¸€ï¼Œè€Œæ˜¯åä½œå…³ç³»

## Field Tree Model

form å†…åŽŸåˆ™ä¸Šåº”è¯¥å­˜åœ¨ä¸€ä»½æ˜Žç¡®çš„ `field tree` æ¨¡åž‹ã€‚

è¿™æ˜¯æœ¬è‰æ¡ˆå½“å‰ç¡®è®¤é‡‡çº³çš„æ–¹å‘ã€‚

### Why A Field Tree Must Exist

å¦‚æžœæ²¡æœ‰ field treeï¼Œå°±å¾ˆéš¾ç¨³å®šè¡¨è¾¾ï¼š

- object/array/aggregate çˆ¶å­å…³ç³»
- subtree validation
- aggregate ancestor ä¼ æ’­
- variant / if / repeated template çš„ç»“æž„è¾¹ç•Œ
- renderer-specific compile-time registration

å› æ­¤ Flux ä¸åº”åªç»´æŠ¤â€œå¹³é¢ path -> rulesâ€æ˜ å°„å¿ƒæ™ºã€‚

æ›´å‡†ç¡®åœ°è¯´ï¼š

- å¯¹å¤–æŸ¥è¯¢ä»ç„¶å¯ä»¥æ˜¯ flat absolute path
- ä½†ç¼–è¯‘äº§ç‰©å†…éƒ¨åº”è¯¥æœ‰ä¸€ä»½ field/tree/node ç»“æž„æ¨¡åž‹

### Recommended Split

æŽ¨èåŒºåˆ†ä¸‰ç±»æ¨¡åž‹ï¼š

```ts
interface CompiledFieldTreeNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'form';
  children: string[];
  parent?: string;
  ruleTemplates: CompiledRuleTemplate[];
}

interface FieldRegistrationState {
  path: string;
  mounted: boolean;
  visible: boolean;
  disabled: boolean;
}

interface FieldValidationState {
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

è¯­ä¹‰ï¼š

- `CompiledFieldTreeNode`: ç¼–è¯‘æœŸç»“æž„ä¸Žè§„åˆ™å®šä¹‰
- `FieldRegistrationState`: è¿è¡Œæ—¶å½“å‰å®žä¾‹/æŒ‚è½½/æ˜¾ç¤ºçŠ¶æ€
- `FieldValidationState`: å½“å‰éªŒè¯ç»“æžœçŠ¶æ€

### Tree Versus Flat Path

è¿™ä¸æ˜¯å›žåˆ°åµŒå¥—å¯¹è±¡ runtime graphã€‚

æŽ¨èåšæ³•ä»ç„¶æ˜¯ï¼š

- storage/query key ä½¿ç”¨ flat absolute path
- tree å…³ç³»é€šè¿‡ `parent` / `children` ä¿ç•™

ä¹Ÿå°±æ˜¯è¯´ï¼š

- å†…éƒ¨ä»å¯ç”¨ flat map é«˜æ•ˆæŸ¥è¯¢
- ä½†è¯­ä¹‰ä¸Šå®ƒæ˜¯ä¸€æ£µ field treeï¼Œè€Œä¸æ˜¯æ— ç»“æž„ path åˆ—è¡¨

## Runtime Registry Position

runtime registry ä»ç„¶éœ€è¦ï¼Œä½†å®ƒçš„è§’è‰²åº”æ˜Žç¡®æ”¶çª„ã€‚

æŽ¨èå®ƒåªè´Ÿè´£ï¼š

- å½“å‰å“ªäº› field instance å·² materialize/mount
- å½“å‰ visible/hidden/disabled çŠ¶æ€
- å¤æ‚æŽ§ä»¶è¿è¡Œæ—¶è¡¥å…… child paths æˆ– dynamic rules

ä¸å»ºè®®è®© registry ç›´æŽ¥æ‰¿æ‹…ï¼š

- validation graph çš„ä¸»å®šä¹‰
- aggregate ç»“æž„æ¥æº
- ç¼–è¯‘æœŸ rule definition çš„å”¯ä¸€æ¥æº

### Recommended Mental Model

ä¸æ˜¯ï¼š

- compiled graph or runtime registry

è€Œæ˜¯ï¼š

- compiled field tree defines **what may exist**
- runtime registry tells **what is currently instantiated/participating**
- validation state stores **what currently failed/is validating**

## Compiler-Integrated Registration Hooks

è¿™ä¹Ÿæ˜¯ä¸€ä¸ªå¾ˆé‡è¦çš„ç‚¹ï¼šFlux å¹³å°æ˜¯ä¸€ä½“åŒ–è®¾è®¡çš„ï¼Œrenderer/component definition ä¸åº”åªæœ‰ runtime component è¡Œä¸ºï¼Œä¹Ÿåº”å…è®¸å£°æ˜Žç¼–è¯‘æœŸæ³¨å†Œè§„åˆ™ã€‚

è¿™æ¡æˆ‘è®¤ä¸ºæ˜¯åº”è¯¥æ˜Žç¡®é‡‡çº³çš„ã€‚

### Why Compile-Time Hooks Matter

å¦‚æžœåªæœ‰ runtime registrationï¼š

- aggregate shape å¾ˆéš¾æå‰çŸ¥é“
- subtree validation æ‹“æ‰‘è¿‡äºŽä¾èµ– mount æ—¶æœº
- field tree åªèƒ½é  React åæŽ¨
- è¡¨è¾¾å¼ä¾èµ–å’Œ childâ†’parent ä¼ æ’­å¾ˆéš¾å®Œæ•´å»ºç«‹

è€Œ Flux å·²ç»æœ‰ compiler å’Œ renderer definition ä½“ç³»ï¼Œå› æ­¤æ›´è‡ªç„¶çš„æ–¹å‘æ˜¯ï¼š

- renderer å£°æ˜Ž compile-time collector hook
- compiler åœ¨é‡åˆ°æŸä¸ª `type` æ—¶è°ƒç”¨å®ƒ
- collector hook å‘ field tree / validation graph æ³¨å†Œç»“æž„å’Œè§„åˆ™

### Recommended Shape

æŽ¨è renderer definition å¢žåŠ æ›´æ˜Žç¡®çš„ç¼–è¯‘æœŸ collector èƒ½åŠ›ã€‚

```ts
interface ValidationCompileContribution<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'none';

  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}
```

å…³é”®ç‚¹ï¼š

- ä¸æ˜¯åªæ³¨å†Œ leaf field path
- è¿˜å¯ä»¥æ³¨å†Œ object/array/variant-root è¿™ç±»ç»“æž„èŠ‚ç‚¹
- repeated templateã€branch rootã€aggregate ancestor éƒ½èƒ½åœ¨ç¼–è¯‘æœŸæ˜¾å¼è¿›å…¥ field tree

### Runtime Hook Still Exists

ç¼–è¯‘æœŸ hook å¹¶ä¸å–ä»£ runtime hookã€‚

æŽ¨èåˆ†å·¥ï¼š

- ç¼–è¯‘æœŸ hookï¼šå®šä¹‰ç»“æž„ã€æ¨¡æ¿è§„åˆ™ã€ä¾èµ–ã€aggregate topology
- è¿è¡Œæ—¶ hookï¼šè¡¥å……åŠ¨æ€ child pathsã€visible/mounted stateã€dynamic overlaysã€escape hatch validate

è¿™æ­£æ˜¯ Flux ç›¸æ¯” AMIS æ›´å¼ºçš„åœ°æ–¹ã€‚

## Field Tree Node Shape

åœ¨ç¡®è®¤ form å†…éœ€è¦ field tree ä¹‹åŽï¼Œä¸‹ä¸€æ­¥å°±æ˜¯æŠŠ node shape æ˜Žç¡®ä¸‹æ¥ã€‚

ç¬¬ä¸€é˜¶æ®µä¸è¿½æ±‚ä¸€æ¬¡æŠŠæ‰€æœ‰ renderer family éƒ½å»ºå…¨ï¼Œä½† node shape è‡³å°‘è¦èƒ½æ‰¿è½½ï¼š

- field/object/array/form æ ¹
- variant root ä¸Ž branch
- subtree validation
- aggregate ancestor æŸ¥æ‰¾
- repeated template registration

### Recommended Shape

```ts
type FieldTreeNodeKind =
  | 'form'
  | 'field'
  | 'object'
  | 'array'
  | 'variant-root'
  | 'variant-branch'
  | 'repeated-template';

interface CompiledFieldTreeNode {
  id: string;
  path: string;
  kind: FieldTreeNodeKind;
  parent?: string;
  children: string[];

  ownerPath: string;
  templatePath?: string;
  repeatedTemplateId?: string;

  ruleTemplates: CompiledRuleTemplate[];
  dependencyPaths: string[];
  aggregateDependencies?: string[];

  metadata?: {
    sourceType?: string;
    branchKey?: string;
    valueKind?: 'scalar' | 'object' | 'array' | 'variant';
  };
}
```

### Field Meanings

- `id`: ç¼–è¯‘æœŸç¨³å®šèŠ‚ç‚¹ idï¼Œä¸ç­‰åŒäºŽè¿è¡Œæ—¶å®žä¾‹ path
- `path`: canonical absolute pathï¼›template node ä¹Ÿä½¿ç”¨æ¨¡æ¿çº§ canonical path
- `kind`: ç»“æž„è¯­ä¹‰
- `parent` / `children`: field tree æ‹“æ‰‘
- `ownerPath`: å½“å‰èŠ‚ç‚¹æ‰€å±ž owner æ ¹è·¯å¾„
- `templatePath?`: å¯¹ repeated/branch/template èŠ‚ç‚¹ä¿ç•™æ¨¡æ¿çº§æ¥æºè·¯å¾„
- `repeatedTemplateId?`: repeated item æ¨¡æ¿æ ‡è¯†ï¼Œç”¨äºŽ loop/array ç­‰å±•å¼€è¾¹ç•Œ
- `ruleTemplates`: æœ¬èŠ‚ç‚¹è‡ªæœ‰è§„åˆ™æ¨¡æ¿
- `dependencyPaths`: è§„åˆ™è¡¨è¾¾å¼å’Œæ˜¾å¼ relational ä¾èµ–
- `aggregateDependencies?`: child -> aggregate parent è¿™ç±»ç¼–è¯‘å™¨è‡ªåŠ¨å…³ç³»

### Why `id` And `path` Are Both Needed

`path` è§£å†³éªŒè¯æŸ¥è¯¢å’ŒçŠ¶æ€å½’å±žã€‚
`id` è§£å†³æ¨¡æ¿çº§ç»“æž„èº«ä»½ã€‚

ä¾‹å¦‚ï¼š

- ä¸€ä¸ª array item template å¯èƒ½æœ€ç»ˆå®žä¾‹åŒ–ä¸ºå¾ˆå¤š indexed path
- è¿™äº›å®žä¾‹å…±äº«åŒä¸€ä¸ª template identityï¼Œä½†ä¸å…±äº«æœ€ç»ˆ absolute path

å› æ­¤ç¼–è¯‘å™¨ä¸èƒ½åªé  `path` ä¸€æŠŠæ¢­ã€‚

### Why `ownerPath` Is On Nodes

è™½ç„¶å½“å‰ phase 1 åªæœ‰ `form` å’Œ `draft` ownerï¼Œä½† node ä¸Šä¿ç•™ `ownerPath` ä»ç„¶æœ‰ä»·å€¼ï¼š

- ç¼–è¯‘å™¨å¯æå‰æ ‡å‡ºè¯¥èŠ‚ç‚¹å½’å±žå“ªä¸ª owner root
- nested form / draft subtree extraction æ—¶æ›´å®¹æ˜“è£å‰ª
- æœªæ¥è‹¥å¼•å…¥æ›´å¤š owner familyï¼Œä¸ç”¨å›žå¤´æ•´ä½“æ”¹ node shape

## From `renderer.validation` To Compile-Time Collectors

å½“å‰å·²æœ‰çš„ `renderer.validation` æ˜¯ä¸€ä¸ªæ­£ç¡®èµ·ç‚¹ï¼Œä½†å®ƒè¿˜åâ€œfield participationâ€è€Œä¸å¤Ÿâ€œfield tree registrationâ€ã€‚

### Current Direction

å½“å‰ shape å¤§è‡´æ˜¯ï¼š

- `kind`
- `getFieldPath(...)`
- `collectRules(...)`

å®ƒå·²ç»è¯´æ˜Žäº† renderer definition å¯ä»¥å‚ä¸Ž validation compileã€‚

### Limitation Of Current Shape

å½“å‰ shape çš„å±€é™æ˜¯ï¼š

- æ›´å leaf field
- å¯¹ object/array/variant-root/repeated-template çš„ç»“æž„æ³¨å†Œèƒ½åŠ›ä¸è¶³
- å¯¹ child node æè¿°å’Œ branch/repeated template è¾¹ç•Œè¡¨è¾¾ä¸è¶³

### Recommended Evolution

æŽ¨èé‡‡ç”¨å…¼å®¹å¼æ¼”è¿›ï¼Œè€Œä¸æ˜¯ä¸€æ¬¡æŽ¨ç¿»ï¼š

```ts
interface ValidationCompileContribution<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'variant-branch' | 'repeated-template' | 'none';

  getNodePath?(schema: S, ctx: ValidationCompileContext<S>): string | undefined;
  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}
```

### Backward-Compatible Migration

æŽ¨èè¿ç§»é¡ºåºï¼š

1. ä¿ç•™çŽ°æœ‰ `getFieldPath(...)`
2. å†…éƒ¨æŠŠå®ƒé€‚é…æˆ `getNodePath(...)`
3. ä¿ç•™çŽ°æœ‰ `collectRules(...)`
4. å¯¹ object/array/variant/loop æ–°å¢ž `collectNode(...)` / `collectChildren(...)`
5. ç¼–è¯‘å™¨ä¼˜å…ˆèµ°æ–° collectorï¼›æ—§ shape ä½œä¸º leaf-only fallback

è¿™æ ·å¯ä»¥é¿å…ä¸€æ¬¡æ€§æ”¹çˆ†æ‰€æœ‰ renderer definitionã€‚

## Collector Responsibilities By Control Type

ä¸‹é¢æ˜Žç¡® `object-field` / `array-field` / `variant-field` / `loop` åœ¨ç¼–è¯‘æœŸåº”è¯¥æ³¨å†Œä»€ä¹ˆã€‚

### `object-field`

`object-field` ç¼–è¯‘æœŸè‡³å°‘åº”æ³¨å†Œï¼š

1. ä¸€ä¸ª `object` node
2. è¯¥ object root è‡ªæœ‰ aggregate rules
3. body ä¸­ç›¸å¯¹å­å­—æ®µçš„ child descriptors

æŽ¨èï¼š

- root path ä¾‹å¦‚ `profile`
- child relative names åœ¨ collector ä¸­ rebased æˆï¼š
- `profile.firstName`
- `profile.lastName`

collector è¯­ä¹‰ï¼š

- `collectNode(...)` äº§å‡º `kind: 'object'`
- `collectChildren(...)` æŒ‡æ˜Ž body ä¸‹æ˜¯ object-root-relative children
- `collectRules(...)` æ”¶é›† object root rules å’Œ field-level rules

### `array-field`

`array-field` ç¼–è¯‘æœŸè‡³å°‘åº”æ³¨å†Œï¼š

1. ä¸€ä¸ª `array` root node
2. ä¸€ä¸ª `repeated-template` node è¡¨ç¤º item template è¾¹ç•Œ
3. array root aggregate rules
4. item subtree template child descriptors

æŽ¨èï¼š

- array root path: `contacts`
- repeated template node path: `contacts[*]` æˆ–å†…éƒ¨æ¨¡æ¿è¡¨ç¤º
- item children collector ç»§ç»­ç”¨ç›¸å¯¹å­—æ®µï¼Œä¾‹å¦‚ `label`, `email`

å…³é”®ç‚¹ï¼š

- ç¼–è¯‘å™¨ä¸å±•å¼€å…·ä½“ index path
- ä½†å¿…é¡»ä¿ç•™ item template ç»“æž„ï¼Œä¾› runtime materialization æˆ `contacts.0.email` ç­‰å®žä¾‹ path

### `variant-field`

`variant-field` ç¼–è¯‘æœŸè‡³å°‘åº”æ³¨å†Œï¼š

1. ä¸€ä¸ª `variant-root` node
2. æ¯ä¸ª variant ä¸€ä¸ª `variant-branch` node
3. branch è‡ªæœ‰è§„åˆ™æ¨¡æ¿
4. branch body children
5. branch activation dependency

æŽ¨èï¼š

- root path ä¾‹å¦‚ `profile.contact`
- branch path å¯ç”¨ç¼–è¯‘æœŸå†…éƒ¨å½¢å¼ï¼Œä¾‹å¦‚ `profile.contact#email` / `profile.contact#webhook`
- è¿è¡Œæ—¶ active instance graph å†å†³å®šå“ªä¸€æ”¯ materialize ä¸ºå½“å‰å‚ä¸ŽèŠ‚ç‚¹

å…³é”®ç‚¹ï¼š

- variant branch æ˜¯äº’æ–¥ç»“æž„èŠ‚ç‚¹ï¼Œä¸æ˜¯æ™®é€š sibling field
- submit validation åªéåŽ† active branch

### `loop`

`loop` ç¼–è¯‘æœŸä¸åº”æ³¨å†Œæ™®é€š field nodeï¼Œé™¤éžå®ƒæœ¬èº«åŒæ—¶æ˜¯ value-bearing editorã€‚

å¯¹çº¯ structural `loop`ï¼ŒæŽ¨èï¼š

1. æ³¨å†Œä¸€ä¸ª `repeated-template` node
2. å£°æ˜Ž body child template descriptors
3. ä¸æ³¨å†Œ value root rule node

å¦‚æžœ loop body å†…æœ‰ bound fieldï¼Œä¾‹å¦‚ `${users}` æ¯é¡¹é‡Œæœ‰ `input-text name='email'`ï¼Œåˆ™ï¼š

- è¿™äº› field node ä»ç”±å…¶å­ renderer collector æ³¨å†Œ
- `loop` åªæä¾› repeated-template è¾¹ç•Œå’Œå®žä¾‹åŒ–çº¿ç´¢

### Why `loop` And `array-field` Must Stay Separate

ä¸¤è€…éƒ½æ¶‰åŠ repeated templateï¼Œä½†è¯­ä¹‰ä¸åŒï¼š

- `loop`: ç»“æž„å±•å¼€
- `array-field`: å€¼ç¼–è¾‘ + array aggregate validation

å› æ­¤ï¼š

- ä¸¤è€…å¯ä»¥å…±äº« repeated-template collector substrate
- ä½†ä¸èƒ½å…±äº«åŒä¸€ä¸ªé«˜å±‚ node kind è¯­ä¹‰

## Suggested Compiler Flow

æŽ¨èç¼–è¯‘å™¨å¤„ç†æŸä¸ª schema node æ—¶é‡‡ç”¨ä»¥ä¸‹é¡ºåºï¼š

1. æŸ¥ renderer definition
2. å¦‚æžœå­˜åœ¨ validation compile contributionï¼š
- è°ƒç”¨ `collectNode(...)`
- å°† node æ”¾å…¥ field tree
3. è°ƒç”¨ `collectRules(...)`
4. è°ƒç”¨ `collectDependencies(...)`
5. è°ƒç”¨ `collectChildren(...)`
6. å¯¹ children é€’å½’æ‰§è¡ŒåŒæ ·æµç¨‹
7. ç¼–è¯‘å™¨åœ¨å›žæº¯é˜¶æ®µè‡ªåŠ¨è¡¥ aggregate child->parent ä¾èµ–

### Compiler-Owned Versus Renderer-Owned Work

renderer collector è´Ÿè´£ï¼š

- æè¿°è¿™ä¸ª type çš„ validation è¯­ä¹‰
- æè¿°å­ç»“æž„è¾¹ç•Œ

compiler è´Ÿè´£ï¼š

- ç»Ÿä¸€ path rebasing
- ç»Ÿä¸€ field tree ç»„è£…
- ç»Ÿä¸€ dependency graph åˆå¹¶
- ç»Ÿä¸€ validation order è®¡ç®—

è¿™æ ·å¯ä»¥é¿å…æ¯ä¸ª renderer è‡ªå·±å·å·æ‹¼ä¸€ä»½ç§æœ‰ validation graphã€‚

## Owner Model

### ValidationOwner

æŽ¨èæŠ½è±¡ï¼š

```ts
interface ValidationOwner {
  readonly kind: 'form' | 'draft';
  readonly rootPath: string;
  readonly model: CompiledValidationModel;

  getRootValue(): unknown;
  getValue(path: string): unknown;

  validateAt(path: string): Promise<ValidationResult>;
  validateSubtree(path: string): Promise<FormValidationResult>;
  validateAll(): Promise<FormValidationResult>;
  applyChangesAndRevalidate(input: ApplyOwnerChangesInput): Promise<FormValidationResult>;

  getErrors(path?: string, options?: { includeSubtree?: boolean }): ValidationError[];
  setErrors(path: string, errors: ValidationError[]): void;
  clearErrors(path?: string): void;

  getDependents(path: string): string[];
  getSubtreePaths(path: string): string[];

  addDynamicRules(path: string, rules: DynamicValidationRule[]): () => void;

  materializeRules(path: string): EffectiveRuleMaterialization;
}
```

```ts
interface ApplyOwnerChangesInput {
  writes: Record<string, unknown>;
  changedPaths: string[];
  reason: 'change' | 'commit' | 'system';
}
```

å…³é”®ç‚¹ï¼š

- `ValidationOwner` æ˜¯éªŒè¯è¯­ä¹‰è¾¹ç•Œ
- `form` owner å’Œ `draft` owner å…±äº«è¿™å¥—æŽ¥å£
- surface ä¸æ˜¯ ownerï¼›surface åªæ˜¯ host/entry

### Owner API Path Semantics

ç¬¬ä¸€é˜¶æ®µå¿…é¡»æŠŠ path è¯­ä¹‰å†™æ­»ã€‚

æŽ¨èè§„åˆ™ï¼š

- å¯¹å¤– canonical path ä¸€å¾‹ä½¿ç”¨ `absolutePath`
- subtree draft owner å¯é¢å¤–æä¾›å†…éƒ¨ local-path helperï¼Œä½† public owner API é»˜è®¤æŽ¥æ”¶/è¿”å›ž absolute path
- `ValidationError.ownerPath` ä¸€å¾‹ä¸º absolute path
- `ValidationError.path` åœ¨ phase 1 ä¹Ÿç»Ÿä¸€ä½¿ç”¨ absolute pathï¼Œé¿å… public query è¯­ä¹‰åˆ†è£‚

è¿™æ„å‘³ç€ï¼š

- local-path ä¸»è¦æ˜¯å®žçŽ°å†…éƒ¨ authoring/helper æ¦‚å¿µ
- owner graph / dependents / overlays / hidden state / cache invalidation / public query å…¨éƒ¨ç»Ÿä¸€åœ¨ absolute path ç©ºé—´

### Owner Kinds

ç¬¬ä¸€ç‰ˆå»ºè®®åªæ”¯æŒä¸¤ç§ ownerï¼š

- `form`
- `draft`

ä¸å•ç‹¬å‘æ˜Ž `dialog-owner` / `detail-owner` / `table-owner`ã€‚

è¿™äº›éƒ½æ˜¯ UI/surface/container æ¦‚å¿µï¼Œä¸åº”è¯¥ç›´æŽ¥æˆä¸º validation owner familyã€‚

## Path Spaces And Rebasing

draft owner åªæœ‰åœ¨è·¯å¾„ç©ºé—´å®šä¹‰æ¸…æ¥šæ—¶æ‰æˆç«‹ã€‚

æŽ¨èåŒæ—¶åŒºåˆ†ä¸¤ç§è·¯å¾„ï¼š

- `absolutePath`: parent/global owner è§†è§’ä¸‹çš„å®Œæ•´è·¯å¾„ï¼Œä¾‹å¦‚ `items.3.name`
- `localPath`: current owner root ä¸‹çš„ç›¸å¯¹è·¯å¾„ï¼Œä¾‹å¦‚ `name` æˆ– `3.name`

### Phase 1 Constraint

ç¬¬ä¸€é˜¶æ®µåªæŠŠ **subtree-based owner** åšæˆ first-class validation ownerã€‚

ä¹Ÿå°±æ˜¯è¯´ï¼š

- owner å¿…é¡»å¯¹åº”ä¸€ä¸ªè¿žç»­ rooted subtree
- owner çš„ canonical graph/address space å¿…é¡»å¯ç¨³å®šæ˜ å°„åˆ° absolute path
- arbitrary projection edit ä¸è¿›å…¥ phase 1 owner model

### Owner Path Contract

```ts
interface OwnerPathMapper {
  rootAbsolutePath: string;

  toLocalPath(absolutePath: string): string;
  toAbsolutePath(localPath: string): string;

  containsAbsolutePath(absolutePath: string): boolean;
}
```

### Rules

1. parent form owner å¯¹å¤–ä¸»è¦ä½¿ç”¨ `absolutePath`
2. child draft owner å†…éƒ¨éªŒè¯ä¸»è¦ä½¿ç”¨ `localPath`
3. child draft owner è¾“å‡ºé”™è¯¯æ—¶ï¼Œå¿…é¡»åŒæ—¶çŸ¥é“æœ¬åœ° key å’Œç»å¯¹å½’å±žè·¯å¾„
4. dependency extraction åœ¨ç¼–è¯‘é˜¶æ®µå¯å…ˆäº§å‡ºç›¸å¯¹ owner-root çš„ä¾èµ–ï¼Œå†ç”± owner mapper rebasing åˆ°å½“å‰è·¯å¾„ç©ºé—´

### Error Path Rule

æŽ¨èé”™è¯¯åŒæ—¶ä¿ç•™ï¼š

- `path`: å½“å‰ owner æŸ¥è¯¢ keyï¼›phase 1 ä¸­ä¸Ž absolute path å¯¹é½
- `ownerPath`: å½“å‰é”™è¯¯åœ¨ parent/global è·¯å¾„ç©ºé—´ä¸­çš„ç¨³å®šå½’å±žè·¯å¾„

è¿™æ ·å¯ä»¥å…¼é¡¾ï¼š

- owner-local æŸ¥è¯¢
- parent-side aggregate/composite é”™è¯¯å½’å±ž
- array remove/reorder çš„ indexed path remapping

Phase 1 ä¸­æŽ¨èçº¦æŸï¼š

- `path === ownerPath` for ordinary field errors
- aggregate/composite errors may use `path !== ownerPath` only when display/query semantics require it

### Examples

Parent owner:

- `rootPath = ''`
- `absolutePath('profile.firstName') = 'profile.firstName'`
- `localPath('profile.firstName') = 'profile.firstName'`

Draft owner for `profile`:

- `rootPath = 'profile'`
- local `firstName` -> absolute `profile.firstName`
- local aggregate root `` -> absolute `profile`

Draft owner for `items.3`:

- `rootPath = 'items.3'`
- local `name` -> absolute `items.3.name`
- local aggregate root `` -> absolute `items.3`

### Projection Editing Boundary

`detail-view` çš„ projection / patch editing éœ€æ±‚æ˜¯çœŸå®žå­˜åœ¨çš„ï¼Œä½†ç¬¬ä¸€é˜¶æ®µä¸æŠŠå®ƒå»ºæˆ first-class validation ownerã€‚

ç¬¬ä¸€é˜¶æ®µå»ºè®®ï¼š

- subtree edit: ä½¿ç”¨ subtree draft owner
- projection/patch edit: ä»ä½œä¸º value-adaptation / commit wrapper å¤„ç†
- projection draft çš„æœ¬åœ°æ ¡éªŒæš‚ä¸çº³å…¥ç»Ÿä¸€ owner graph æ¨¡åž‹

åŽç»­å¦‚æžœè¦æŠŠ projection draft çº³å…¥ owner familyï¼Œéœ€è¦å•ç‹¬è®¾è®¡ projection address spaceï¼Œè€Œä¸æ˜¯ç¡¬å¡žè¿› subtree owner æ¨¡åž‹ã€‚

## Participation Rules

### Same Owner

ä»¥ä¸‹åœºæ™¯é»˜è®¤å±žäºŽåŒä¸€ä¸ª ownerï¼š

- inline `object-field` ç›´æŽ¥ç»‘å®šçˆ¶ form å€¼
- inline `array-field` ç›´æŽ¥ç»‘å®šçˆ¶ form å€¼
- editable table cell ç›´æŽ¥ç»‘å®šçˆ¶ form å€¼
- object/array subtree inline ç¼–è¾‘

è¿™äº›åœºæ™¯ä¸­ï¼š

- child path å±žäºŽ parent owner graph
- å±€éƒ¨è§¦å‘åº”è°ƒç”¨ parent owner çš„ `validateAt` æˆ– `validateSubtree`

### Child Draft Owner

ä»¥ä¸‹åœºæ™¯æŽ¨èåˆ›å»º draft ownerï¼š

- `detail-field` æ‰“å¼€ surface åŽå…ˆç¼–è¾‘å±€éƒ¨ draftï¼Œç¡®è®¤æ—¶æ‰æäº¤
- `detail-view` æ‰“å¼€ row/object detail editorï¼Œç¡®è®¤æ—¶æ‰å†™å›ž
- button æ‰“å¼€ dialogï¼Œdialog body ç¼–è¾‘ä¸´æ—¶å¯¹è±¡ï¼Œconfirm åŽæ‰å›žå†™å¤–å±‚

è¿™äº›åœºæ™¯ä¸­ï¼š

- draft å†…çš„éªŒè¯ä¸åº”æ±¡æŸ“ parent owner çš„é”™è¯¯çŠ¶æ€
- draft confirm æ—¶å…ˆ `validateAll()`
- commit æˆåŠŸåŽ parent owner å† revalidate å—å½±å“ path/subtree

### Nested Form Owner

å¦‚æžœ dialog/body ä¸­æ˜¾å¼æ”¾äº† `form` rendererï¼Œåˆ™å®ƒæ˜¯ç‹¬ç«‹ `form` ownerã€‚

è¿™æ—¶ï¼š

- outer form ä¸æ”¶é›† inner form å­—æ®µ
- inner form submit ä¸ä¾èµ– outer form validation
- outer form submit ä¹Ÿä¸åº”è¢« inner form draft/field é˜»å¡ž

## Compiled Model

å½“å‰è®¾è®¡é‡Œ `CompiledValidationNode` æ··å…¥äº†è¾ƒå¤š UI è¯­ä¹‰ã€‚

è‰æ¡ˆå»ºè®®æŠŠ value validation core model æ”¶æ•›æˆæ›´çª„çš„ç»“æž„ã€‚

```ts
interface CompiledValidationModel {
  rootPath: string;
  nodes: Record<string, CompiledValidationPath>;
  validationOrder: string[];
  dependents: Record<string, string[]>;
}

interface CompiledValidationPath {
  path: string;
  kind: 'field' | 'object' | 'array' | 'form';
  rules: CompiledRuleTemplate[];
  children: string[];
  parent?: string;
}
```

### Moved Out Of Core Model

ä»¥ä¸‹å­—æ®µä¸å»ºè®®ç•™åœ¨ value validation core modelï¼š

- `behavior`
- `showErrorOn`
- `controlType`
- `label`

è¿™äº›å±žäºŽ UI/authoring/UX å±‚ï¼Œè€Œä¸æ˜¯ rule execution coreã€‚

### Kept In Core Model

ä»¥ä¸‹å­—æ®µä»å»ºè®®ä¿ç•™ï¼š

- `kind`
- `children`
- `parent`
- `validationOrder`
- `dependents`

åŽŸå› ï¼š

- subtree validation éœ€è¦èŠ‚ç‚¹æ‹“æ‰‘
- aggregate rule freshness éœ€è¦ dependency graph
- owner graph ä»è¦çŸ¥é“ object/array root

### Relative Authoring Versus Compiled Paths

`object-field` / `array-field` ä½œè€…å¯ç»§ç»­å†™ç›¸å¯¹å­—æ®µåï¼Œä½†ç¼–è¯‘äº§ç‰©å¿…é¡»è½åˆ°æ˜Žç¡®çš„ owner path spaceã€‚

æŽ¨èï¼š

- compile step å…ˆåœ¨ renderer-local authoring scope ä¸‹æ”¶é›†ç›¸å¯¹è·¯å¾„
- owner binding step å†æŠŠè¿™äº›è·¯å¾„ rebase åˆ° absolute path æˆ– owner-local path

ä¸è¦è®© validator åœ¨è¿è¡Œæ—¶çŒœæµ‹ç›¸å¯¹è·¯å¾„å«ä¹‰ã€‚

### Canonical Path Space

ç¬¬ä¸€é˜¶æ®µæŽ¨èï¼š

- compiled model nodes: canonical absolute path
- dependents: canonical absolute path
- dynamic overlay registration: canonical absolute path
- hidden-path state: canonical absolute path
- cache invalidation: canonical absolute path

subtree draft owner å†…éƒ¨å¯æš´éœ² local path helperï¼Œä½†åº•å±‚ canonical bookkeeping ä»ç»Ÿä¸€å›ž absolute pathã€‚

## Template Graph Versus Active Instance Graph

`if`ã€`loop`ã€`variant-field`ã€`array-field` éƒ½ä¼šå¸¦æ¥åŠ¨æ€æ€§ã€‚

è¿™ä¸æ„å‘³ç€ validation æ— æ³•é¢„ç¼–è¯‘ï¼Œè€Œæ˜¯æ„å‘³ç€ä¸èƒ½æŠŠâ€œç¼–è¯‘ç»“æžœâ€è¯¯è§£æˆâ€œæœ€ç»ˆæ´»è·ƒå­—æ®µé›†åˆâ€ã€‚

æŽ¨èæ˜Žç¡®åŒºåˆ†ä¸¤å±‚ï¼š

### 1. Compiled Validation Template Graph

ç¼–è¯‘æœŸæ”¶é›†çš„æ˜¯æ¨¡æ¿çº§ä¿¡æ¯ï¼š

- å“ªäº›èŠ‚ç‚¹å¯èƒ½å‚ä¸Ž validation
- æ¯ä¸ªèŠ‚ç‚¹çš„ rule template
- object/array/aggregate æ‹“æ‰‘
- `if` / `variant` / rule-expression çš„ä¾èµ–
- repeated item template çš„ç›¸å¯¹ç»“æž„

å®ƒå›žç­”çš„æ˜¯ï¼š

- å“ªäº› validation **å¯èƒ½å­˜åœ¨**
- å®ƒä»¬çš„æ‰§è¡Œæ¨¡æ¿æ˜¯ä»€ä¹ˆ

### 2. Active Validation Instance Graph

è¿è¡Œæ—¶ owner åŸºäºŽå½“å‰å€¼å’Œå½“å‰ UI/owner çŠ¶æ€ï¼Œå®žä¾‹åŒ–å½“å‰æ´»è·ƒèŠ‚ç‚¹ï¼š

- å½“å‰ `if` å“ªä¸€æ”¯æ¿€æ´»
- å½“å‰ `variant-field` å“ªä¸ª branch æ¿€æ´»
- å½“å‰ `array-field` / `loop` æœ‰å¤šå°‘ä¸ª item instance
- å½“å‰ dialog/detail draft æ˜¯å¦å·²åˆ›å»º child owner

å®ƒå›žç­”çš„æ˜¯ï¼š

- å½“å‰æ—¶åˆ»å“ªäº› validation **çœŸæ­£å‚ä¸Ž**

### Why Flux Needs Both

Yup æ›´åâ€œå€¼æ ‘ + validateAt(path)â€æ€è·¯ã€‚
AMIS æ›´åâ€œmount äº†ä»€ä¹ˆå°±æ³¨å†Œä»€ä¹ˆâ€æ€è·¯ã€‚

Flux æ›´é€‚åˆï¼š

- ç¼–è¯‘æœŸäº§å‡º template graph
- è¿è¡Œæ—¶ materialize active instance graph
- å¤æ‚æŽ§ä»¶å†ç”¨ registration overlay è¡¥å……

è¿™æ¯”çº¯åŠ¨æ€æŒ‚è½½æ³¨å†Œæ›´é€‚åˆ Flux çš„é¢„ç¼–è¯‘æ–¹å‘ï¼Œä¹Ÿæ¯”çº¯é™æ€ graph æ›´èƒ½å¤„ç† `if` / `loop` / `variant` çš„åŠ¨æ€æ€§ã€‚

## Dynamic Participation Nodes

### `if`

`if` çš„å…³é”®ä¸æ˜¯â€œæ˜¯å¦èƒ½æ”¶é›† ruleâ€ï¼Œè€Œæ˜¯â€œå“ªä¸€æ”¯å½“å‰æ¿€æ´»â€ã€‚

æŽ¨èï¼š

- ç¼–è¯‘æœŸæ”¶é›†æ‰€æœ‰ branch çš„ template rules
- è®°å½• branch guard expression dependency
- è¿è¡Œæ—¶åªæŠŠå½“å‰æ¿€æ´» branch materialize åˆ° active instance graph
- éžæ¿€æ´» branch ä¸å‚ä¸Žå½“å‰ validation

### `variant-field`

`variant-field` çš„å…³é”®ä¸æ˜¯ object subtreeï¼Œè€Œæ˜¯ **mutually exclusive branch activation**ã€‚

æŽ¨èï¼š

- ç¼–è¯‘æœŸæ”¶é›†æ‰€æœ‰ variant branch çš„ template rules
- è¿è¡Œæ—¶æ ¹æ® detect/match åªæ¿€æ´»å½“å‰ variant branch
- éžæ¿€æ´» variant branch ä¸å‚ä¸Žå½“å‰ validation

### `loop`

`loop` æœ¬èº«æ˜¯ç»“æž„å±•å¼€èŠ‚ç‚¹ï¼Œä¸å¤©ç„¶æ˜¯ validation ownerã€‚

æŽ¨èï¼š

- ç¼–è¯‘æœŸæ”¶é›† repeated item template çš„ validation subtree
- è¿è¡Œæ—¶æŒ‰å½“å‰ items å®žä¾‹åŒ–æˆå…·ä½“ active instance paths
- éªŒè¯è¯­ä¹‰æ¥è‡ªè¢«å±•å¼€å‡ºæ¥çš„ field/object/array èŠ‚ç‚¹ï¼Œè€Œä¸æ˜¯æ¥è‡ª `loop` å£³æœ¬èº«

### `array-field`

`array-field` å’Œæ™®é€š `loop` ä¸åŒã€‚

å®ƒæ—¢æœ‰ï¼š

- repeated item subtree
- åˆæœ‰ array-root aggregate validation è¯­ä¹‰

å› æ­¤å®ƒä¸èƒ½åªå½“ç»“æž„å±•å¼€çœ‹å¾…ï¼Œä»ç„¶æ˜¯ value validation graph ä¸­çš„ä¸€ç­‰ array nodeã€‚

## Rule Templates With Expressions

è¿™æ˜¯æœ¬è‰æ¡ˆæœ€é‡è¦çš„æ–°å¢žç‚¹ã€‚

Flux æ˜¯é¢„ç¼–è¯‘ç³»ç»Ÿï¼Œå› æ­¤éªŒè¯è§„åˆ™ä¸åº”å±€é™äºŽé™æ€å­—é¢é‡ã€‚

æŽ¨èè§„åˆ™ï¼š

- `required` å¯å¯¹åº”è¡¨è¾¾å¼
- `minLength` / `maxLength` / `minItems` / `pattern` / `message` ç­‰éƒ½å¯å¯¹åº”è¡¨è¾¾å¼
- ç¼–è¯‘é˜¶æ®µæŠŠè¡¨è¾¾å¼ç¼–è¯‘æˆ `CompiledRuntimeValue`
- è¿è¡Œæ—¶è§¦å‘éªŒè¯æ—¶å† materialize æˆæœ¬æ¬¡æ‰§è¡Œçš„ effective static rule

### Recommended Shape

```ts
interface CompiledRuleTemplate {
  id: string;
  kind: ValidationRuleKind;
  when?: CompiledRuntimeValue<boolean>;
  args: Record<string, CompiledRuntimeValue<unknown> | unknown>;
  message?: CompiledRuntimeValue<string> | string;
  dependencyPaths: string[];
}
```

### Materialization Flow

```ts
interface EffectiveValidationRule {
  id: string;
  kind: ValidationRuleKind;
  args: Record<string, unknown>;
  message?: string;
}
```

```ts
interface EffectiveRuleMaterialization {
  path: string;
  rules: EffectiveValidationRule[];
  effectiveRequired: boolean;
}
```

æ‰§è¡Œæµç¨‹ï¼š

1. è¯»å–å½“å‰ owner scope/root value
2. evaluate `when`
3. è‹¥ `when === false`ï¼Œè·³è¿‡è¯¥ rule
4. evaluate `args`
5. evaluate `message`
6. ç”Ÿæˆæœ¬æ¬¡ trigger ä¸‹çš„ `EffectiveValidationRule`
7. äº¤ç»™ validator æ‰§è¡Œ

### Examples

```json
{
  "type": "input-text",
  "name": "username",
  "required": "${mode === 'create'}",
  "minLength": "${passwordPolicy.usernameMinLength}",
  "pattern": "${tenantRules.usernameRegex}",
  "validationErrors": {
    "required": "${label}ä¸èƒ½ä¸ºç©º",
    "minLength": "${label}é•¿åº¦ä¸è¶³"
  }
}
```

è¿™ä¸è¡¨ç¤ºè¿è¡Œæ—¶åŽ»é‡æ–°è§£æž schemaï¼Œè€Œæ˜¯ï¼š

- schema compile once
- expressions compile once
- validation trigger time only evaluates compiled expressions

### Compile-Time Optimizations

å¦‚æžœ `CompiledRuntimeValue.kind === 'static'`ï¼Œåˆ™ï¼š

- `when: false` å¯ç›´æŽ¥åœ¨ç¼–è¯‘æœŸå‰”é™¤ dead rule
- `when: true` å¯çœåŽ»è¿è¡Œæ—¶åˆ†æ”¯
- static `args` å’Œ static `message` å¯ç›´æŽ¥å†…è”

è¿™æ­£æ˜¯ Flux ç›¸æ¯” Yup builder æ¨¡åž‹çš„ä¼˜åŠ¿ä¹‹ä¸€ã€‚

## Effective Rule Materialization Service

è¡¨è¾¾å¼åŒ–è§„åˆ™ä¸èƒ½åªè®© validator çœ‹è§ï¼ŒUI ä¹Ÿè¦èƒ½è¯»å–åŒä¸€ä»½â€œæœ¬æ¬¡æœ‰æ•ˆè§„åˆ™â€ã€‚

æŽ¨è owner æš´éœ²ç»Ÿä¸€ materialization serviceï¼š

- validator execution è¯»å–å®ƒ
- `effectiveRequired` è¯»å–å®ƒ
- field chrome / future diagnostics è¯»å–å®ƒ

### Why This Exists

å¦‚æžœæ²¡æœ‰ç»Ÿä¸€ materialization serviceï¼Œå°±ä¼šå‡ºçŽ°ï¼š

- validator è®¤ä¸º field required
- `FieldFrame` æ˜Ÿå·ä¸äº®
- message æ˜¯åŠ¨æ€è¡¨è¾¾å¼ï¼Œä½† UI å’Œ validator çœ‹åˆ°çš„ä¸æ˜¯åŒä¸€ä¸ªç»“æžœ

### Cache Rule

æŽ¨èç¼“å­˜ç²’åº¦ï¼š

- owner-local
- by `path`
- invalidated by dependent path writes

### Normative Invalidation Triggers

ä»¥ä¸‹äº‹ä»¶å¿…é¡»ä½¿ owner-local materialization cache å¤±æ•ˆï¼š

- dependent value writes
- dynamic overlay add/remove/update
- array index remap / reorder / remove / insert
- owner path mapper remapping
- hidden-state changes if effective metadata depends on hidden participation policy

ç¼“å­˜ä¸è¦æ±‚è·¨ owner å…±äº«ã€‚

draft owner ä¸Ž parent owner å„è‡ªç»´æŠ¤ç‹¬ç«‹ materialization cacheã€‚

## Dependency Extraction

ä¸€æ—¦è§„åˆ™å‚æ•°å¯è¡¨è¾¾å¼åŒ–ï¼Œdependency extraction å°±ä¸èƒ½åªçœ‹æ˜¾å¼ relational ruleã€‚

æŽ¨èè§„åˆ™ï¼š

- `requiredWhen` / `equalsField` è¿™ç±»æ˜¾å¼ä¾èµ–ä»ä¿ç•™
- å¯¹ `when`ã€`args`ã€`message` ä¸­çš„è¡¨è¾¾å¼ä¹Ÿæå–ä¾èµ–è·¯å¾„
- aggregate node éœ€è¦æ˜¾å¼ child-to-parent freshness å…³ç³»

ä¾èµ–å›¾åº”è‡³å°‘è¦†ç›–ï¼š

- peer field -> peer field
- child path -> aggregate parent path
- expression dependency -> owning field/aggregate node
- dynamic overlay dependency -> owning field/aggregate node

### Why This Matters

å¦åˆ™ä¼šå‡ºçŽ°ï¼š

- ç¼–è¾‘ `items.0.name` åŽï¼Œ`items` çš„ `uniqueBy` ä¸è‡ªåŠ¨åˆ·æ–°
- ç¼–è¾‘ `startDate` åŽï¼Œ`endDate` çš„è¡¨è¾¾å¼åŒ– `min` çº¦æŸä¸è‡ªåŠ¨åˆ·æ–°
- ç¼–è¾‘ `role` åŽï¼Œ`required: '${role === "admin"}'` çš„ field ä¸è‡ªåŠ¨åˆ·æ–° required çŠ¶æ€

## Aggregate Rules

Aggregate rule ç»§ç»­æ˜¯ä¸€ç­‰èƒ½åŠ›ã€‚

æŽ¨èæ”¯æŒï¼š

- array root rules: `minItems`, `maxItems`, `uniqueBy`
- object root rules: `allOrNone`, `atLeastOneOf`
- row/root composite rules

ä¸å»ºè®®é€€å›žçº¯ leaf-field validationã€‚

### Generic Freshness Rule

æŽ¨èåœ¨ compiled graph ä¸­è¡¨è¾¾ï¼š

- child path change -> parent aggregate node becomes stale
- dependent aggregate node should be revalidated when trigger policy requires

è¿™èƒ½å‡å°‘ renderer æ‰‹å·¥ `validateSubtree(path)` çš„æ•°é‡ã€‚

## Component-Specific Validation Execution

è¿™ä¸€èŠ‚å®šä¹‰ `object-field` / `array-field` / `variant-field` / `loop` çš„æ‰§è¡Œè¯­ä¹‰ã€‚

### `object-field`

`object-field` æ˜¯ object subtree editorã€‚

æŽ¨èæ‰§è¡Œæ¨¡åž‹ï¼š

- ç¼–è¯‘æœŸæ”¶é›† object root rulesï¼Œä¾‹å¦‚ `profile`
- ç¼–è¯‘æœŸæ”¶é›† child field rulesï¼Œä¾‹å¦‚ `profile.firstName`
- å±€éƒ¨ç¼–è¾‘ leaf æ—¶ï¼Œowner æ‰§è¡Œ `validateAt('profile.firstName')`
- owner è‡ªåŠ¨æ‰©å±• impacted closureï¼ŒåŒ…æ‹¬ï¼š
- å½“å‰ leaf path
- ä¾èµ–è¯¥ leaf çš„ peer field
- object root aggregate node `profile`

å±€éƒ¨ç¡®è®¤æˆ–å¯¹è±¡çº§ä¿å­˜æ—¶ï¼š

- `validateSubtree('profile')`

æ•´ä½“æäº¤æ—¶ï¼š

- `validateAll('submit')`

### `array-field`

`array-field` æ˜¯ array root + repeated item subtree çš„ç»„åˆã€‚

æŽ¨èæ‰§è¡Œæ¨¡åž‹ï¼š

- array root path ä¾‹å¦‚ `contacts`
- item subtree path ä¾‹å¦‚ `contacts.0.email`
- array root aggregate ä¾‹å¦‚ `minItems`, `uniqueBy`
- item object aggregate ä¾‹å¦‚ `contacts.0` ä¸Šçš„ row rule

leaf edit æ—¶ï¼š

- `validateAt('contacts.0.email')`
- owner è‡ªåŠ¨æ‰©å±• closure åˆ°ï¼š
- leaf è‡ªèº«
- row/object aggregate `contacts.0`
- array aggregate `contacts`
- expression/dynamic dependents

æ•°ç»„ add/remove/move/swap æ—¶ï¼š

- ä¸åªæ˜¯å†™å€¼
- è¿˜å¿…é¡» remapï¼š
- error state
- touched/dirty/visited/validating
- dynamic overlay paths
- dependent/materialization cache key

ç„¶åŽå†ï¼š

- `applyChangesAndRevalidate({ writes, changedPaths: ['contacts'], reason: 'system' })`

### `variant-field`

`variant-field` ä¸æ˜¯æ™®é€š subtreeï¼Œå®ƒæ˜¯å¤šåˆ†æ”¯å€¼ç¼–è¾‘å™¨ã€‚

æŽ¨èæ‰§è¡Œæ¨¡åž‹ï¼š

- ç¼–è¯‘æœŸæ”¶é›†æ‰€æœ‰ variant branch template rules
- è¿è¡Œæ—¶æ ¹æ® active variant åª materialize ä¸€æ¡ branch
- éžæ¿€æ´» branch ä¸å‚ä¸Ž active instance graph

å½“å‰ active branch å†… leaf edit æ—¶ï¼š

- `validateAt(activeBranchLeafPath)`
- owner åªæ‰©å±•å½“å‰ active branch closure

variant switch æ—¶ï¼Œå¿…é¡»æ‰§è¡Œï¼š

1. å¤±æ´»æ—§ branch
2. æ¸…ç†æ—§ branch é”™è¯¯å’Œ validating state
3. æŒ‰ç­–ç•¥å†³å®šæ˜¯å¦ä¿ç•™æ—§ branch å€¼
4. æ¿€æ´»æ–° branch
5. `validateSubtree(variantRoot)` æˆ–è‡³å°‘éªŒè¯æ–° branch çš„ required/aggregate

æŽ¨èé»˜è®¤ç­–ç•¥ï¼š

- inactive branch é»˜è®¤ä¸å‚ä¸Ž validation
- inactive branch é»˜è®¤å¯ä¿ç•™å€¼ï¼Œä½†ä¸å‚ä¸Ž submit gate
- submit æ—¶åªéªŒè¯ active branch

### `loop`

`loop` æ˜¯ structural repeated rendererï¼Œä¸ç›´æŽ¥å‘æ˜Žæ–°çš„ value validation è¯­ä¹‰ã€‚

æŽ¨èæ‰§è¡Œæ¨¡åž‹ï¼š

- `loop` ç¼–è¯‘ repeated item template
- runtime ç”¨å½“å‰ item å®žä¾‹ materialize child validation paths
- `loop` æœ¬èº«ä¸è‡ªåŠ¨æˆä¸º aggregate validation root
- aggregate validation å¦‚æžœéœ€è¦ï¼Œåº”è¯¥ç”±å¤–å±‚ value nodeï¼Œä¾‹å¦‚ `array-field` æˆ– table/form owner æ¥æ‰¿æ‹…

è¿™æ„å‘³ç€ï¼š

- pure structural `loop` ä¸»è¦è´Ÿè´£å®žä¾‹åŒ– active instance graph
- value-bound repeated editing ä»åº”è½åˆ° `array-field` æˆ– table row editing owner æ¨¡åž‹

## Local Validation Trigger Rules

å±€éƒ¨éªŒè¯ä¸èƒ½ç®€å•ç†è§£æˆâ€œåªéªŒè¯å½“å‰ leafâ€ã€‚

æŽ¨èç»Ÿä¸€è§„åˆ™ï¼š

- renderer å‘èµ·çš„æ˜¯ path-local trigger
- owner æ‰§è¡Œçš„æ˜¯ closure-aware validation

ä¾‹å¦‚ï¼š

```ts
validateAt('contacts.0.email', 'change')
```

owner åº”è‡ªåŠ¨æ‰©å±•åˆ°ï¼š

- direct path
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- active branch / active subtree participation changes

å› æ­¤ renderer ä¸åº”é•¿æœŸä¾èµ–æ‰‹å·¥å†³å®šâ€œè¿™é‡Œè¿˜è¦ä¸è¦é¡ºä¾¿è°ƒ `validateSubtree(...)`â€ã€‚

## Submit Validation Rule

æäº¤æ—¶çš„æ•´ä½“éªŒè¯ä¹Ÿä¸æ˜¯â€œæŠŠæ‰€æœ‰ç¼–è¯‘è¿‡çš„èŠ‚ç‚¹éƒ½è·‘ä¸€éâ€ã€‚

æŽ¨èï¼š

- `validateAll('submit')` éåŽ†å½“å‰ owner çš„ **active validation instance graph**
- åªåŒ…å«å½“å‰æ¿€æ´»çš„ï¼š
- `if` branch
- `variant` branch
- array/loop/materialized item instances
- hidden policy å…è®¸å‚ä¸Žçš„è·¯å¾„
- å½“å‰ owner æ‹¥æœ‰çš„ subtree
- ä¸åŒ…å«åˆ«çš„ ownerï¼Œä¾‹å¦‚ nested form æˆ– child draft owner

## Async Validation Semantics

å¼‚æ­¥éªŒè¯åº”ç»§ç»­æ˜¯ç»Ÿä¸€ rule pipeline çš„ä¸€éƒ¨åˆ†ï¼Œè€Œä¸æ˜¯é¢å¤–å¹³è¡Œä½“ç³»ã€‚

æŽ¨èæ¯ä¸ª async validation run è‡³å°‘æ‹¥æœ‰ï¼š

- `path`
- `ruleId`
- `reason` (`change` / `blur` / `submit`)
- `runId`
- `abort` / cancellation handle

### General Rules

1. `change` / `blur` å¯ä½¿ç”¨ debounce
2. æ–° run è¦†ç›–æ—§ run
3. è¿‡æœŸ run ç»“æžœä¸å¾—å†™å›ž owner
4. `submit` ä¸åº”ç»§ç»­ç­‰å¾… change-debounceï¼›åº”ç«‹å³è¿è¡Œå¹¶ç­‰å¾…å½“å‰æ´»è·ƒ async rules
5. path å¤±æ´»æ—¶ï¼Œå¯¹åº” async run å¿…é¡»å¤±æ•ˆ

### Path Deactivation Cases

ä»¥ä¸‹æƒ…å†µä¼šä½¿ async run å¤±æ•ˆï¼š

- `if` branch å¤±æ´»
- `variant` branch åˆ‡æ¢
- array row åˆ é™¤
- draft owner cancel/dispose
- field path å›  owner change ä¸å†å±žäºŽå½“å‰ active instance graph

### Component Notes

`object-field`:

- child leaf async rule æŒ‰ leaf path è·‘
- å¯¹è±¡çº§å¼‚æ­¥æ ¡éªŒæ›´é€‚åˆ `validateSubtree(objectRoot)`

`array-field`:

- item leaf async rule æŒ‰å®žä¾‹ path è·‘ï¼Œä¾‹å¦‚ `contacts.2.email`
- row remove/reorder åŽæ—§ run å¿…é¡» remap æˆ–å¤±æ•ˆ

`variant-field`:

- åªè¿è¡Œ active branch çš„ async rule
- branch åˆ‡æ¢æ—¶ï¼Œæ—§ branch å…¨éƒ¨ async run å¤±æ•ˆ

`loop`:

- åªä¸ºå½“å‰ materialized path è¿è¡Œ async validation
- item instance æ¶ˆå¤±åŽï¼Œå¯¹åº” run å¤±æ•ˆ

## ValidationOwner Execution Model

è¿™ä¸€èŠ‚æŠŠå‰é¢çš„è®¾è®¡æ”¶æ•›æˆæ›´æŽ¥è¿‘å®žçŽ°çš„æ‰§è¡Œæ­¥éª¤ã€‚

ç›®æ ‡ä¸æ˜¯è§„å®šæœ€ç»ˆä»£ç æ–‡ä»¶ç»“æž„ï¼Œè€Œæ˜¯æ˜Žç¡® owner åœ¨è¿è¡ŒæœŸåˆ°åº•æŒ‰ä»€ä¹ˆé¡ºåºåšäº‹ã€‚

### Core Inputs

æŽ¨è owner å†…éƒ¨å§‹ç»ˆå›´ç»•ä»¥ä¸‹è¾“å…¥å·¥ä½œï¼š

```ts
type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system';

interface ValidationExecutionContext {
  reason: ValidationReason;
  changedPaths: string[];
  activePaths: Set<string>;
  hiddenPaths: Set<string>;
}
```

å…¶ä¸­ï¼š

- `changedPaths` æ˜¯æœ¬è½®è§¦å‘çš„ç›´æŽ¥è¾“å…¥
- `activePaths` ç”± active instance graph materialization å¾—åˆ°
- `hiddenPaths` ç”± owner/runtime å½“å‰å‚ä¸Žç­–ç•¥å¾—åˆ°

### Step 0: Recompute Active Instance Participation

ä»»ä½• validation å…¥å£åœ¨çœŸæ­£æ‰§è¡Œ rule ä¹‹å‰ï¼Œéƒ½åº”å…ˆç¡®è®¤ active instance graph æ˜¯æœ€æ–°çš„ã€‚

æŽ¨èé¡ºåºï¼š

1. è¯»å–å½“å‰ owner value
2. é‡æ–°åˆ¤æ–­ï¼š
- `if` branch activation
- `variant-field` active branch
- repeated item instance materialization
- draft owner subtree existence
3. å¾—åˆ°æ–°çš„ `activePaths`
4. æ¸…ç†å·²å¤±æ´» path çš„ï¼š
- error state
- validating state
- async runs
- cached effective rule materialization

### Step 1: Compute Impacted Closure

owner ä¸èƒ½åªéªŒè¯ direct pathã€‚

æŽ¨èç»Ÿä¸€ closure è®¡ç®—ï¼š

```ts
function computeImpactedClosure(input: {
  changedPaths: string[];
  activePaths: Set<string>;
  dependents: Record<string, string[]>;
  aggregateAncestors: (path: string) => string[];
  overlayDependents: (path: string) => string[];
}): Set<string>
```

closure è‡³å°‘åŒ…å«ï¼š

- direct changed paths
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- active-branch-switch å½±å“åˆ°çš„æ–°æ—§ branch root

### Step 2: Reconcile Hidden Participation

hidden/path participation ä¸èƒ½åœ¨ rule æ‰§è¡ŒåŽå†è¡¥ã€‚

æŽ¨èé¡ºåºï¼š

1. åŸºäºŽæœ€æ–° values é‡æ–°åˆ¤æ–­éšè—çŠ¶æ€
2. å¯¹ newly hidden pathï¼š
- å¦‚ policy è¦æ±‚ï¼Œç«‹å³ clear value
- clear stale errors
- cancel async runs
3. å°† hidden transition äº§ç”Ÿçš„ path è¿½åŠ è¿› `changedPaths`
4. é‡æ–°è®¡ç®— impacted closure

è¿™æ · `clearValueWhenHidden` æ‰èƒ½å½±å“åŽç»­ rule materialization å’Œ dependent validationã€‚

### Step 3: Materialize Effective Rules

å¯¹ impacted closure ä¸­çš„æ¯ä¸ª active pathï¼š

1. è¯»å– compiled rule templates
2. åˆå¹¶ dynamic overlays
3. evaluate `when`
4. evaluate rule args/message
5. äº§å‡ºæœ¬è½® effective rules
6. æ›´æ–° owner-local materialization cache

æŽ¨èä¼ªä»£ç ï¼š

```ts
function materializeRulesForPath(path: string, ctx: ValidationExecutionContext): EffectiveValidationRule[] {
  const templates = getCompiledTemplates(path);
  const overlays = getDynamicOverlays(path);
  const combined = mergeTemplatesAndOverlays(templates, overlays);

  return combined.flatMap((template) => {
    if (!evaluateWhen(template.when, ctx)) {
      return [];
    }

    return [{
      id: template.id,
      kind: template.kind,
      args: evaluateArgs(template.args, ctx),
      message: evaluateMessage(template.message, ctx)
    } satisfies EffectiveValidationRule];
  });
}
```

### Step 4: Execute Sync Rules First

åŒæ­¥ rule åº”å…ˆè¿è¡Œå¹¶ç«‹å³å¾—åˆ°ç¨³å®šé”™è¯¯ç»“æžœã€‚

æŽ¨èï¼š

- sync rule ç›´æŽ¥äº§å‡º `ValidationError[]`
- path-level error bucket å…ˆæ›´æ–°ä¸º sync ç»“æžœ
- async rule å†ä½œä¸ºåŽç»­é˜¶æ®µå åŠ 

è¿™æ · UI ä¸éœ€è¦ç­‰ async æ‰çœ‹åˆ°æ˜Žæ˜¾åŒæ­¥é”™è¯¯ã€‚

### Step 5: Execute Async Rules With Run Ownership

å¼‚æ­¥ rule å¿…é¡»æ˜¾å¼ç»‘å®šè¿è¡Œæ‰€æœ‰æƒã€‚

æŽ¨èå†…éƒ¨è®°å½•ï¼š

```ts
interface AsyncValidationRun {
  path: string;
  ruleId: string;
  reason: ValidationReason;
  runId: string;
  ownerEpoch: string;
  abort(): void;
}
```

å¯åŠ¨ async rule æ—¶ï¼š

1. ç”Ÿæˆæ–°çš„ `runId`
2. å–æ¶ˆåŒ `path + ruleId` çš„æ—§ run
3. æ³¨å†Œ validating state
4. ç­‰å¾…ç»“æžœ
5. è¿”å›žæ—¶æ£€æŸ¥ï¼š
- run æ˜¯å¦ä»æ˜¯ latest
- path æ˜¯å¦ä» active
- owner epoch æ˜¯å¦ä»æœ‰æ•ˆ
6. åªæœ‰æ»¡è¶³æ¡ä»¶æ‰å†™å›žé”™è¯¯å’Œ validating=false

### Phase 1 Structural Edit Rule

ç¬¬ä¸€é˜¶æ®µä¸å°è¯•æŠŠ in-flight async run è·¨ç»“æž„å˜åŒ–åš remapã€‚

æŽ¨èç¡¬è§„åˆ™ï¼š

- array remove/reorder
- variant switch
- path subtree deactivation
- owner dispose

ä»¥ä¸Šæƒ…å†µä¸€å¾‹ **invalidate affected subtree async runs**ã€‚

ä¹Ÿå°±æ˜¯è¯´ï¼š

- phase 1 å¯¹ async run é‡‡ç”¨ subtree invalidateï¼Œä¸åš remap
- remap åªç”¨äºŽé™æ€çŠ¶æ€æ˜ å°„ï¼Œä¾‹å¦‚é”™è¯¯/touched/dirty ç­‰ index-addressed state

### Step 6: Publish Result

æŽ¨è owner å°†æœ¬è½®ç»“æžœåˆ†å¼€å‘å¸ƒï¼š

- sync errors immediately
- async pending state immediately
- async final errors when run settles

æœ€ç»ˆè¿”å›žç»“æžœæ—¶ï¼š

- `validateAt` è¿”å›žå½“å‰å·²çŸ¥ç»“æžœï¼Œè‹¥æœ‰ async pendingï¼Œåˆ™åŒæ—¶æ ‡æ³¨ validating
- `validateAll('submit')` å¿…é¡»ç­‰å¾… submit-required async rules settle

## Owner API Algorithms

### Step 0: Fixed-Point Preflight

`activePaths` ä¸Ž hidden participation ä¸èƒ½åªå„ç®—ä¸€æ¬¡ã€‚

`clearValueWhenHidden`ã€variant switchã€`if` guard å˜åŒ–éƒ½å¯èƒ½è®© participation åœ¨ä¸€æ¬¡è¿è¡Œä¸­å†æ¬¡å˜åŒ–ã€‚

å› æ­¤æŽ¨èå…ˆåš fixed-point preflightï¼Œå†è¿›å…¥çœŸæ­£çš„ rule executionã€‚

æŽ¨èä¼ªä»£ç ï¼š

```ts
function prepareExecution(seedChangedPaths: string[], reason: ValidationReason): PreparedExecution {
  const changed = new Set(seedChangedPaths);

  while (true) {
    const active = materializeActiveInstanceGraph();
    const participation = reconcileParticipation({
      activePaths: active,
      changedPaths: [...changed],
      reason
    });

    const extraChanged = participation.extraChangedPaths.filter((path) => !changed.has(path));

    cleanupDeactivatedPaths(participation.deactivatedPaths);

    if (extraChanged.length === 0 && participation.stable) {
      return {
        changedPaths: [...changed],
        activePaths: participation.activePaths,
        hiddenPaths: participation.hiddenPaths
      };
    }

    for (const path of extraChanged) {
      changed.add(path);
    }
  }
}
```

æ³¨æ„ï¼š

- parent owner çš„ active graph åªåŒ…å« parent owner è‡ªå·±çš„ paths
- child draft owner çš„å†…éƒ¨ paths ä¸ä¼šè¿›å…¥ parent owner active path set
- draft existence åªå¯èƒ½å½±å“ parent owner çš„ summary/root contract pathï¼Œè€Œä¸æ˜¯ child owner internals

### Step 1: Compute Impacted Closure

owner ä¸èƒ½åªéªŒè¯ direct pathã€‚

æŽ¨èç»Ÿä¸€ closure è®¡ç®—ï¼š

```ts
function computeImpactedClosure(input: {
  changedPaths: string[];
  activePaths: Set<string>;
  dependents: Record<string, string[]>;
  aggregateAncestors: (path: string) => string[];
  overlayDependents: (path: string) => string[];
}): Set<string>
```

closure è‡³å°‘åŒ…å«ï¼š

- direct changed paths
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- active-branch-switch å½±å“åˆ°çš„æ–°æ—§ branch root

### Step 1b: Expand Validation Targets

closure roots ä¸ç­‰äºŽæœ€ç»ˆ validation target setã€‚

æŽ¨èå†åŠ ä¸€å±‚ target expansionï¼š

```ts
function expandValidationTargets(input: {
  closureRoots: Set<string>;
  reason: ValidationReason;
  activePaths: Set<string>;
}): Set<string>
```

è§„åˆ™ï¼š

- `submit` / `commit`: newly activated root éœ€è¦ä¸‹é’»åˆ°æ‰€æœ‰ active descendants
- `change` / `blur`: å¯åªéªŒè¯ root å’Œå¿…è¦ descendantsï¼Œé™¤éž trigger policy è¦æ±‚ eager descendant validation
- variant/if activation å¿…é¡»è‡³å°‘å®šä¹‰ activated root çš„ descendant expansion policy

### Step 2: Hidden Participation Is Part Of Preflight

hidden/path participation ä¸å†ä½œä¸ºç‹¬ç«‹åŽç½®æ­¥éª¤å‡ºçŽ°ã€‚

phase 1 ä¸­å®ƒå±žäºŽ `prepareExecution(...)` çš„ä¸€éƒ¨åˆ†ï¼Œç”± participation reconciliation ç»Ÿä¸€å¤„ç†ã€‚

è§„åˆ™ï¼š

- newly hidden root must clear the full active descendant set under that root
- cleared state includes errors, validating state, async runs, and materialization cache
- if hide policy clears values, those value writes produce extra changed paths and trigger another preflight turn

### `validateAt(path, reason)`

æŽ¨èä¼ªä»£ç ï¼š

```ts
async function validateAt(path: string, reason: ValidationReason): Promise<ValidationResult> {
  const prepared = prepareExecution([path], reason);
  const closure = computeImpactedClosure({ changedPaths: prepared.changedPaths, ...runtimeState });
  const targetPaths = expandValidationTargets({
    closureRoots: closure,
    reason,
    activePaths: prepared.activePaths
  });

  for (const targetPath of targetPaths) {
    const effectiveRules = materializeRulesForPath(targetPath, buildExecutionContext(reason, prepared.changedPaths));
    const syncErrors = runSyncRules(targetPath, effectiveRules);
    publishSyncErrors(targetPath, syncErrors);
    startAsyncRules(targetPath, effectiveRules, reason);
  }

  return summarizeValidationResult(path, targetPaths);
}
```

è¯­ä¹‰ï¼š

- renderer è§¦å‘çš„æ˜¯ä¸€ä¸ª leaf/root path
- owner å®žé™…éªŒè¯çš„æ˜¯ impacted closure
- `validateAt` è¿”å›žæ—¶å…è®¸ async ä»åœ¨ pending

### `validateSubtree(path, reason)`

æŽ¨èä¼ªä»£ç ï¼š

```ts
async function validateSubtree(path: string, reason: ValidationReason): Promise<FormValidationResult> {
  const prepared = prepareExecution([path], reason);
  const subtreePaths = getActiveSubtreePaths(path, prepared.activePaths);
  const impacted = expandSubtreeWithDependents(subtreePaths);
  const ordered = orderForValidation(impacted);

  for (const targetPath of ordered) {
    launchConcretePathValidation(targetPath, reason);
  }

  if (reason === 'commit' || reason === 'submit') {
    await awaitRequiredAsyncRuns(ordered, reason);
  }

  return summarizeFormValidationResult(ordered);
}
```

é€‚åˆï¼š

- object-field section save
- array row save
- variant branch activation validation
- draft subtree confirm before commit

### `validateAll('submit')`

æŽ¨èä¼ªä»£ç ï¼š

```ts
async function validateAll(reason: 'submit'): Promise<FormValidationResult> {
  supersedePendingDebouncedRuns('submit');

  const prepared = prepareExecution(getRootSeedPaths(), reason);
  const allPaths = getAllActiveParticipatingPaths(prepared.activePaths);
  const ordered = orderForValidation(allPaths);

  for (const path of ordered) {
    launchConcretePathValidation(path, reason);
  }

  await awaitSubmitRequiredAsyncRuns();

  return summarizeFormValidationResult(ordered);
}
```

å…³é”®ç‚¹ï¼š

- åªéåŽ† active instance graph
- å¿…é¡»ç­‰å¾… submit-required async rules
- ä¸åº”éªŒè¯ inactive branch / disposed draft owner / foreign owner path

### `applyChangesAndRevalidate({ writes, changedPaths })`

æŽ¨èä¼ªä»£ç ï¼š

```ts
async function applyChangesAndRevalidate(input: ApplyOwnerChangesInput): Promise<FormValidationResult> {
  applyWritesAtomically(input.writes);

  const prepared = prepareExecution(input.changedPaths, input.reason);
  const closure = computeImpactedClosure({ changedPaths: prepared.changedPaths, ...runtimeState });
  const targets = expandValidationTargets({
    closureRoots: closure,
    reason: input.reason,
    activePaths: prepared.activePaths
  });
  const ordered = orderForValidation(targets);

  for (const path of ordered) {
    launchConcretePathValidation(path, input.reason);
  }

  if (input.reason === 'commit') {
    await awaitRequiredAsyncRuns(ordered, 'commit');
  }

  return summarizeFormValidationResult(ordered);
}
```

é€‚åˆï¼š

- draft confirm writeback åŽ parent owner é‡éªŒ
- array mutation åŽ owner closure é‡éªŒ
- variant switch åŽ owner closure é‡éªŒ

è¿™é‡Œçš„å…³é”®ä¸æ˜¯ helper åç§°ï¼Œè€Œæ˜¯ï¼š

- write + preflight + closure + validation å¿…é¡»ç”± owner ä¸€æ¬¡æ€§å®Œæˆ

## Validation Ordering Notes

æŽ¨èæŽ’åºè§„åˆ™ï¼š

1. leaf paths before aggregate ancestors when aggregate depends on finalized child values
2. æˆ–è€…å…ˆ leaf syncï¼Œå† aggregateï¼Œå† leaf async settle
3. submit æ—¶ä½¿ç”¨ç¨³å®š deterministic order

ç¬¬ä¸€é˜¶æ®µæœ€é‡è¦çš„ä¸æ˜¯è¿½æ±‚æœ€ä¼˜ orderï¼Œè€Œæ˜¯ï¼š

- åŒä¸€ owner å†… deterministic
- aggregate rule ä¸è¯»åˆ°è¿‡æœŸ child state
- async run ownership ä¸é”™ä¹±

## Phase 1 Explicit Limits

ä¸ºä¿è¯ç¬¬ä¸€é˜¶æ®µå¯å®žçŽ°ï¼Œè‰æ¡ˆæ˜Žç¡®é‡‡ç”¨ä»¥ä¸‹ä¿å®ˆè§„åˆ™ï¼š

1. active/hidden participation é€šè¿‡ fixed-point preflight è¾¾åˆ°ç¨³å®šåŽæ‰å¼€å§‹ validation
2. owner API å…è®¸å›  hidden policy è§¦å‘ value-side effects
3. post-write correctness é€šè¿‡ `applyChangesAndRevalidate(...)` æä¾›ï¼Œè€Œä¸æ˜¯é å¤–éƒ¨æ‰‹å·¥æ‹¼è£…
4. in-flight async run åœ¨ç»“æž„å˜åŒ–ä¸‹é‡‡å– subtree invalidateï¼Œä¸åš remap
5. child draft owner å†…éƒ¨ path æ°¸ä¸è¿›å…¥ parent owner active path set
6. submit ä¼š supersede pending debounced change/blur runsï¼Œå¹¶å¯åŠ¨ submit-owned fresh runs

## Implementation Guidance

å®žçŽ°æ—¶ä¸å»ºè®®è®©æ¯ä¸ª renderer è‡ªå·±æ‹¼è¿™äº›æ­¥éª¤ã€‚

æŽ¨èï¼š

- renderer åªå‘å‡º owner API è°ƒç”¨
- owner é›†ä¸­è´Ÿè´£ï¼š
- active instance refresh
- hidden reconciliation
- impacted closure
- rule materialization
- sync/async execution
- error publication

è¿™æ · `object-field` / `array-field` / `variant-field` / `detail-field` / `loop` åªæ˜¯åœ¨å‚ä¸Žé›†å’Œ root é€‰æ‹©ä¸Šä¸åŒï¼Œä¸ä¼šè£‚è§£æˆäº”å¥—ç‹¬ç«‹ validation runtimeã€‚

## Dynamic Rules And Runtime Registration

å½“å‰å®žçŽ°é‡Œ runtime registration æä¾›é»‘ç›’ `validate()`ã€‚

è‰æ¡ˆå»ºè®®ï¼šä¼˜å…ˆæ³¨å†Œ dynamic rulesï¼Œè€Œä¸æ˜¯ä¼˜å…ˆæ³¨å†Œé»‘ç›’ validatorã€‚

### Recommended Shape

```ts
interface DynamicValidationRule {
  id: string;
  kind: ValidationRuleKind | 'custom';
  when?: CompiledRuntimeValue<boolean>;
  args?: Record<string, unknown>;
  message?: string | CompiledRuntimeValue<string>;
  dependencyPaths?: string[];
  ownedChildPaths?: string[];
  validate?: (input: ValidationExecutionInput) => Promise<ValidationError | ValidationError[] | undefined> | ValidationError | ValidationError[] | undefined;
}
```

ç¬¬ä¸€é˜¶æ®µä¸­ï¼Œæ‰€æœ‰ overlay path å’Œ `dependencyPaths` éƒ½å¿…é¡»ä½¿ç”¨ **canonical absolute path** å£°æ˜Žã€‚

```ts
interface RuntimeFieldRegistration {
  path: string;
  childPaths?: string[];
  syncValue?(): unknown;
  addRules?(owner: ValidationOwner): () => void;
  validateChild?(path: string): Promise<ValidationError[]> | ValidationError[];
  validate?(): Promise<ValidationError[]> | ValidationError[];
  onRemove?(): void;
}
```

### Policy

ä¼˜å…ˆçº§å»ºè®®ï¼š

1. compiled static/dynamic rule templates
2. runtime-added dynamic rules
3. æœ€åŽæ‰æ˜¯æžå°‘é‡ escape hatch `validate(...)`

ä¹Ÿå°±æ˜¯è¯´ï¼š

- ä¸ç«‹åˆ»å¼ºåˆ é»‘ç›’æ ¡éªŒèƒ½åŠ›
- ä½†è®¾è®¡é‡å¿ƒåº”è¯¥ä»Žâ€œæ³¨å†Œ validate å›žè°ƒâ€åˆ‡å‘â€œæ³¨å†Œ rule overlayâ€

### Why Child Paths Still Matter

`array-editor` / `key-value` è¿™ç±»æŽ§ä»¶ä¸ä»…æœ‰ owner root pathï¼Œè¿˜ä¼šæš´éœ²å…·ä½“ child pathsã€‚

å› æ­¤ dynamic overlay éœ€è¦åŒæ—¶è¡¨è¾¾ï¼š

- è§„åˆ™ä¾èµ–å“ªäº›è·¯å¾„
- è‡ªå·±æ‹¥æœ‰/ç”Ÿæˆå“ªäº› child paths
- subtree validation æ—¶åº”è¯¥æŠŠå“ªäº› child paths çº³å…¥ traversal

è¿™ä¹Ÿæ˜¯ä¸ºä»€ä¹ˆç¬¬ä¸€ç‰ˆä¸åº”è¿‡æ—©åˆ é™¤ `childPaths` / `validateChild(...)`ã€‚

### Array Remap Rule

å¦‚æžœ dynamic overlay ç»‘å®šåˆ°äº† indexed absolute pathï¼Œä¾‹å¦‚ `items.3.name`ï¼Œåˆ™æ•°ç»„ insert/remove/reorder åŽå¿…é¡»æŒ‰ä¸Žé”™è¯¯çŠ¶æ€ç›¸åŒçš„ remap è§„åˆ™åŒæ­¥æ›´æ–°ï¼š

- overlay registration path
- overlay dependency paths
- overlay owned child paths

## Error Model

ä¸å»ºè®®æŠŠé”™è¯¯ç›´æŽ¥ç¼©å‡æˆåªæœ‰ `{ path, message, rule }`ã€‚

é‚£ä¼šå‰Šå¼± aggregate/composite åœºæ™¯çš„è¡¨è¾¾åŠ›ã€‚

ä½†ä¹Ÿä¸å»ºè®®ç»§ç»­è®© `ownerPath` / `sourceKind` è¯­ä¹‰è¿‡äºŽéšæ™¦ã€‚

### Draft Proposal

```ts
interface ValidationError {
  path: string;
  ownerPath: string;
  message: string;
  rule: ValidationRuleKind | 'custom';
  displayPath?: string;
  source: 'field' | 'object' | 'array' | 'form' | 'custom';
  relatedPaths?: string[];
}
```

å»ºè®®è§£é‡Šï¼š

- `path`: å½“å‰ owner ä¸‹çš„æŸ¥è¯¢ key
- `ownerPath`: ç¨³å®šå½’å±žè·¯å¾„ï¼Œç”¨äºŽ aggregate/composite æŸ¥è¯¢ä¸Ž remapping
- `displayPath?`: å½“ composite/aggregate æƒ³åœ¨åˆ«å¤„å±•ç¤ºæ—¶çš„å¯é€‰æŠ•å½±è·¯å¾„
- `source`: é”™è¯¯æ¥æºç±»åž‹ï¼Œæ›¿ä»£æ›´å«ç³Šçš„ `sourceKind`
- `relatedPaths?`: ç”¨äºŽ cross-field / aggregate diagnostics

### Compatibility Note

å½“å‰å®žçŽ°å·²æœ‰ `ownerPath` å’Œ `sourceKind` ä½¿ç”¨é¢ã€‚

å› æ­¤è‰æ¡ˆç»“è®ºæ”¹ä¸ºï¼š

- ä¿ç•™ `ownerPath`
- `sourceKind` å¯è§†æƒ…å†µé‡å‘½åä¸º `source`
- `displayPath` åªæ˜¯è¡¥å……ï¼Œä¸æ˜¯æ›¿ä»£ `ownerPath`

### Query Rule

UI æŸ¥è¯¢é¢åº”å°½é‡æ”¶æ•›ï¼Œè€Œä¸æ˜¯æ•£æˆè¿‡å¤š hookã€‚

æŽ¨èæœ€ç»ˆç›®æ ‡ï¼š

```ts
useFormErrors(path?: string, options?: { includeSubtree?: boolean }): ValidationError[]
```

ä»¥åŠæ›´è–„çš„çŠ¶æ€ hookã€‚

## Hidden And Inactive Policy

hidden/inactive ä»å±žäºŽ UX Layerï¼Œä¸å±žäºŽ pure value validation coreã€‚

æŽ¨èè¾¹ç•Œï¼š

- rule execution engine ä¸çŸ¥é“ hidden
- ValidationOwner éœ€è¦æŒæœ‰ hidden-path participation state çš„æŸ¥è¯¢èƒ½åŠ›
- `FormRuntime` è´Ÿè´£ hidden policy å’Œ trigger policy çš„ UX å…¥å£

### Important Distinction

- hidden field in current owner: åŒ ownerï¼Œæ˜¯å¦å‚ä¸Žç”± policy å†³å®š
- uncommitted draft field in child draft owner: ä¸æ˜¯ parent owner çš„ pathï¼Œä¸å‚ä¸Ž parent validation

### Recommended Split

- rule execution engine: unaware of hidden
- ValidationOwner: stores hidden-path state and provides `isPathHidden(path)`-style query
- FormRuntime: decides when to mark paths hidden/visible and whether hide should clear value

è¿™æ ·å¯ä»¥ä¿ç•™ï¼š

- owner-side correctness
- immediate clear-on-hide side effects
- trigger-layer UX policy separation

## Draft Owner

æŽ¨èæŠŠ draft owner è§†ä¸ºæ™®é€š `ValidationOwner` çš„ä¸€ç§å®žä¾‹ï¼Œè€Œä¸æ˜¯å‘æ˜Žæ–°çš„ç¥žç§˜ runtime familyã€‚

### Phase 1 Draft Owner Scope

ç¬¬ä¸€é˜¶æ®µåªå®šä¹‰ï¼š

- `Subtree Draft Owner`

ä¸å®šä¹‰ï¼š

- `Projection Draft Owner`

projection edit ç»§ç»­é€šè¿‡ value-adaptation owner + commit result å·¥ä½œï¼Œä½†ä¸åŠ å…¥ phase 1 validation owner ç»Ÿä¸€æ¨¡åž‹ã€‚

### Recommended Creation Rule

```ts
interface DraftOwnerOptions {
  parentOwner: ValidationOwner;
  rootPath: string;
  mode: 'subtree';
  draftValue: unknown;
}
```

åˆ›å»º draft owner æ—¶ï¼š

1. ä»Ž parent owner ä¸­æå– `rootPath` å­å›¾å¹¶å»ºç«‹ path rebasing
2. å»ºç«‹ç‹¬ç«‹ error map
3. ä»¥ draft value ä½œä¸º root value
4. ä½¿ç”¨åŒä¸€å¥— rule template materialization/execution å¼•æ“Ž

### Commit Rule

1. `draftOwner.validateAll()`
2. è‹¥ invalidï¼Œåœæ­¢æäº¤
3. è¿è¡Œ `transformOutAction` æˆ– owner-specific commit
4. ç”Ÿæˆ `affectedPaths` æˆ– `affectedRoots`
5. å†™å›ž parent owner
6. `parentOwner.revalidateAffected(...)`

### Owner-Computed Closure

post-write revalidation ä¸åº”è¦æ±‚ caller è‡ªå·±ç®—å…¨é‡é‡éªŒé›†åˆã€‚

æŽ¨è owner å†…éƒ¨è‡ªåŠ¨æ‰©å±•ä¸ºï¼š

- changed direct paths
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- hidden-path transitions
- clear-on-hide side effects resulting from changed values

æŽ¨èé¡ºåºï¼š

1. apply committed value writes
2. reconcile hidden transitions / clear-on-hide
3. compute impacted closure
4. run validation on impacted set

### Atomicity Requirement

å¯¹äºŽ change/commit åŽé‡éªŒï¼ŒæŽ¨èç”± owner æä¾›åŽŸå­è¯­ä¹‰ï¼š

- ä¸è¦æ±‚ caller æ‰‹å·¥æ‹†æˆ â€œå†™å€¼ -> è‡ªå·±æ¸… hidden -> è‡ªå·±ç®— dependents -> è‡ªå·±é‡éªŒâ€
- caller æä¾› `writes + changedPaths + reason`
- owner è´Ÿè´£å®Œæˆå†™å€¼ã€hidden reconciliationã€closure expansionã€async invalidationã€revalidation çš„å®Œæ•´é¡ºåº

### Why Draft Owner Exists

å®ƒè§£å†³çš„æ ¸å¿ƒé—®é¢˜æ˜¯ï¼š

- dialog/detail å†…éƒ¨æœªç¡®è®¤ç¼–è¾‘ï¼Œä¸åº”æ±¡æŸ“ parent form error state
- draft cancel åº”ä¸¢å¼ƒå±€éƒ¨é”™è¯¯å’Œ validating çŠ¶æ€
- draft confirm åŽæ‰è®© parent owner æŽ¥æ‰‹æœ€ç»ˆå€¼çš„åˆæ³•æ€§

## FormRuntime UX Layer

`FormRuntime` ç»§ç»­å­˜åœ¨ï¼Œä½†èŒè´£æ”¶æ•›ä¸º UX orchestrationã€‚

æŽ¨èï¼š

```ts
interface FormRuntime {
  owner: ValidationOwner;

  validateField(path: string): Promise<ValidationResult>;
  validateSubtree(path: string): Promise<FormValidationResult>;
  validateForm(): Promise<FormValidationResult>;

  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;
  isValidating(path: string): boolean;

  touchField(path: string): void;
  visitField(path: string): void;
  clearErrors(path?: string): void;
}
```

è¿™é‡Œ `validateField/subtree/form` ä»ä¿ç•™ï¼Œä½†åº•å±‚åªæ˜¯ delegate åˆ° ownerï¼ŒåŒæ—¶å åŠ  UX policyï¼š

- hidden policy
- touch/visit update
- showErrorOn
- submit gate

## Surface Ownership Matrix

surface ä¸æ˜¯ validation ownerï¼Œä½† surface content éœ€è¦å£°æ˜Ž owner modeã€‚

æŽ¨èçŸ©é˜µï¼š

| Surface content mode | Validation owner | Notes |
| --- | --- | --- |
| direct-binding content | inherit parent owner | requires parent owner context propagation |
| draft editor content | child draft owner | local errors/validating isolated until confirm |
| nested `form` content | inner form owner | fully independent owner |
| read-only content | none | no validation owner needed |

### Provider Requirement

å¦‚æžœ surface é€‰æ‹© `inherit parent owner`ï¼Œåˆ™ runtime/provider å¿…é¡»æ˜¾å¼ä¼ æ’­å½“å‰ owner contextã€‚

å½“å‰ä»£ç åªä¼ æ’­äº†ï¼š

- scope
- action scope
- component registry

æœªæ¥è‹¥æ”¯æŒ direct-binding dialog inherit modeï¼Œè¿˜å¿…é¡»ä¼ æ’­ï¼š

- current form/owner context

å¦åˆ™â€œdialog ç»§æ‰¿ parent ownerâ€åªæ˜¯æ–‡æ¡£å£°æ˜Žï¼Œä¸èƒ½çœŸæ­£æˆç«‹ã€‚

### Capture Rule

surface åœ¨ `inherit parent owner` æ¨¡å¼ä¸‹ï¼Œä¸åº”åœ¨ root host é‡æ–°â€œå°±åœ°å¯»æ‰¾â€ ambient ownerã€‚

æŽ¨èè§„åˆ™ï¼š

1. open surface æ—¶æ•èŽ· `ValidationOwner` handle
2. åŒæ—¶æ•èŽ·å½“å‰ scope handle ä¸Ž path mapper ç»‘å®š
3. surface body åœ¨æ•´ä¸ª open lifecycle ä¸­éƒ½ä½¿ç”¨è¯¥ captured handle
4. è‹¥ surface body å†…å†åˆ›å»º nested form/draft ownerï¼Œåˆ™ nested owner åœ¨å…¶ subtree å†…é®è”½ captured owner

è¿™èƒ½é¿å… table row reorder / scope reconciliation åŽ inherited surface æ¼‚ç§»åˆ°é”™è¯¯ ownerã€‚

### Phase 1 Limitation: Indexed Row Reorder During Open Surface

å¦‚æžœ inherited surface ç»‘å®šçš„æ˜¯ index-addressed pathï¼Œä¾‹å¦‚ `items.3.*`ï¼Œè€Œ surface æ‰“å¼€æœŸé—´æ•°ç»„å‘ç”Ÿ reorder/removeï¼Œåˆ™æ˜¯å¦æŒç»­ç»‘å®šåˆ°â€œåŒä¸€é€»è¾‘è¡Œâ€éœ€è¦ stable row identity è®¾è®¡æ”¯æŒã€‚

æœ¬è‰æ¡ˆç¬¬ä¸€é˜¶æ®µæš‚ä¸è§£å†³è¿™ä¸ªé—®é¢˜ã€‚

Phase 1 æŽ¨èçº¦æŸï¼š

- inherited surface direct-binding æ¨¡å¼ä¼˜å…ˆç”¨äºŽéž-reorder åœºæ™¯
- å¯¹æ•°ç»„è¡Œ detail editorï¼Œæ›´æŽ¨è draft mode
- è‹¥æœªæ¥è¦æ”¯æŒ open surface across row reorderï¼Œéœ€è¦å’Œ `table-row-identity-and-scope-performance.md` ååŒè®¾è®¡ç¨³å®šè¡Œèº«ä»½é”šç‚¹

## Scenarios

### Scenario 1: Inline Object Field In Parent Form

Schema:

- `profile.firstName`
- `profile.lastName`

Expected behavior:

- parent form owner æŒæœ‰ `profile` subtree graph
- blur `profile.firstName` -> `validateAt('profile.firstName')`
- save section -> `validateSubtree('profile')`
- parent submit -> `validateAll()`

### Scenario 2: Inline Array Field With Aggregate Rule

Schema:

- `items[*].name`
- array root `items` has `uniqueBy('name')`

Expected behavior:

- edit `items.0.name`
- owner graph marks `items` aggregate dependent stale
- trigger policy requiresæ—¶ revalidate `items`
- array root error stays on `items`

### Scenario 3: Button Opens Dialog Editing Parent-Bound Value Directly

Expected behavior:

- dialog surface itself is not owner
- if schema explicitly says direct-binding mode, dialog body inherits parent owner
- form context must stay available to dialog content
- edits still update parent owner state and validation

This is an important regression guard because current code is weak here.

### Scenario 4: Detail Field Edits Draft Then Confirm

Expected behavior:

- open -> create child draft owner
- all local validation stays in draft owner
- cancel -> discard draft owner state
- confirm -> `draftOwner.validateAll()`
- commit -> write back to parent owner
- parent owner revalidates affected paths/roots

### Scenario 5: Dialog Contains Inner Form

Expected behavior:

- inner `form` creates independent form owner
- outer form does not collect inner fields
- inner submit only validates inner owner

### Scenario 5b: Projection Detail View

Phase 1 recommendation:

- projection detail view ä¸ä½œä¸º first-class validation owner
- å®ƒç»§ç»­é€šè¿‡ `transformInAction` / `validateValueAction` / `transformOutAction` å·¥ä½œ
- è‹¥æœªæ¥è¦çº³å…¥ç»Ÿä¸€ owner æ¨¡åž‹ï¼Œéœ€è¦å•ç‹¬è®¾è®¡ projection address space

### Scenario 6: Expression-Driven Required

Rule:

```json
{ "required": "${role === 'admin'}" }
```

Expected behavior:

- compile once to `CompiledRuntimeValue<boolean>`
- role change updates dependent graph freshness
- validation materializes effective required rule at trigger time
- required indicator UI can read the same effective rule result without duplicating schema logic

### Scenario 7: Tenant Policy Driven Pattern

Rule:

```json
{ "pattern": "${tenantPolicies.userNameRegex}" }
```

Expected behavior:

- owner validation materializes pattern from current scope
- dependency graph includes `tenantPolicies.userNameRegex`
- tenant policy change can revalidate affected fields

### Scenario 8: Dynamic Composite Control

Expected behavior:

- complex renderer registers dynamic rules on path(s)
- owner executes them in the same validation pipeline as compiled rules
- onlyæ— æ³•è§„åˆ™åŒ–çš„æƒ…å†µæ‰ç”¨ escape hatch custom validate callback

## Complex Worked Example

ä¸‹é¢ç»™å‡ºä¸€ä¸ªè¦†ç›–å¤šç§å¤æ‚æƒ…å†µçš„ç¤ºä¾‹ã€‚

å®ƒåŒ…å«ï¼š

- `if`
- `variant-field`
- `detail-field`
- `object-field`
- `array-field`
- `loop`
- async validation

### Example Schema Sketch

```json
{
  "type": "form",
  "name": "userForm",
  "body": [
    {
      "type": "input-select",
      "name": "mode",
      "options": ["basic", "advanced"]
    },
    {
      "type": "input-select",
      "name": "contactMode",
      "options": ["email", "webhook"]
    },
    {
      "type": "if",
      "condition": "${mode === 'advanced'}",
      "then": {
        "type": "object-field",
        "name": "profile",
        "body": [
          {
            "type": "input-text",
            "name": "userName",
            "required": true,
            "validate": {
              "api": "/api/users/check-name"
            }
          },
          {
            "type": "variant-field",
            "name": "contact",
            "variants": [
              {
                "key": "email",
                "match": { "kind": "expression", "when": "${contactMode === 'email'}" },
                "content": {
                  "type": "input-text",
                  "name": "value",
                  "required": true,
                  "pattern": "${tenantPolicies.emailRegex}"
                }
              },
              {
                "key": "webhook",
                "match": { "kind": "expression", "when": "${contactMode === 'webhook'}" },
                "content": {
                  "type": "object-field",
                  "name": "value",
                  "body": [
                    {
                      "type": "input-text",
                      "name": "url",
                      "required": true
                    },
                    {
                      "type": "array-field",
                      "name": "headers",
                      "itemKind": "object",
                      "item": [
                        { "type": "input-text", "name": "key", "required": true },
                        { "type": "input-text", "name": "value", "required": true }
                      ]
                    }
                  ]
                }
              }
            ]
          },
          {
            "type": "detail-field",
            "name": "address",
            "content": {
              "type": "object-field",
              "name": "value",
              "body": [
                { "type": "input-text", "name": "street", "required": true },
                { "type": "input-text", "name": "city", "required": true },
                { "type": "input-text", "name": "zip", "required": "${country === 'US'}" }
              ]
            }
          },
          {
            "type": "array-field",
            "name": "contacts",
            "itemKind": "object",
            "item": [
              { "type": "input-text", "name": "label", "required": true },
              { "type": "input-text", "name": "email", "required": true, "validate": { "api": "/api/contacts/check-email" } }
            ]
          },
          {
            "type": "loop",
            "items": "${contacts}",
            "body": {
              "type": "text",
              "text": "${item.label}: ${item.email}"
            }
          }
        ]
      }
    }
  ]
}
```

### What Gets Compiled

ç¼–è¯‘æœŸä¸ä¼šç›´æŽ¥å¾—åˆ°â€œæœ€ç»ˆæ´»è·ƒå­—æ®µåˆ—è¡¨â€ï¼Œè€Œæ˜¯å¾—åˆ° template graphï¼š

- `mode`
- `contactMode`
- guarded subtree `profile.*` under `if(mode === 'advanced')`
- `profile.userName`
- `profile.contact` variant root
- `profile.contact.value` email branch template
- `profile.contact.value.url` webhook branch template
- `profile.contact.value.headers` array root template
- `profile.address` detail-field root template
- `profile.contacts` array root template
- `profile.contacts[*].label`
- `profile.contacts[*].email`

ä»¥åŠå®ƒä»¬çš„ï¼š

- rule templates
- expression dependencies
- aggregate ancestors
- async rule descriptors

### What Gets Materialized At Runtime Initially

å‡è®¾åˆå§‹å€¼ï¼š

- `mode = 'advanced'`
- `contactMode = 'email'`
- `profile.contacts = [{ label: '', email: '' }]`

åˆ™ active instance graph åˆå§‹åŒ…å«ï¼š

- `mode`
- `contactMode`
- `profile.userName`
- `profile.contact` root
- `profile.contact.value` email branch active node
- webhook branch inactive
- `profile.address` summary field root onlyï¼›detail draft owner å°šæœªåˆ›å»º
- `profile.contacts`
- `profile.contacts.0.label`
- `profile.contacts.0.email`
- `loop` å±•å¼€çš„ display instances

æ³¨æ„ï¼š

- `detail-field` çš„ dialog/draft å†…å®¹æœªæ‰“å¼€æ—¶ï¼Œä¸ä¼šåˆ›å»º child draft owner
- `loop` å±•å¼€äº†å±•ç¤ºå®žä¾‹ï¼Œä½†å®ƒè‡ªå·±ä¸é¢å¤–å‘æ˜Žæ–°çš„ validation root

### Edit Flow 1: Editing `profile.userName`

ç”¨æˆ·åœ¨ `profile.userName` è¾“å…¥æ¡†é‡Œè¾“å…¥ `alice`ã€‚

æ‰§è¡Œé¡ºåºæŽ¨èä¸ºï¼š

1. `setValue('profile.userName', 'alice')`
2. mark dirty/touched as needed
3. `validateAt('profile.userName', 'change')`
4. owner materialize effective rules for `profile.userName`
5. sync ruleså…ˆè·‘
6. async uniqueness rule å¯åŠ¨ debounce run
7. run completes -> if still latest and path still active, write back result

æ­¤æ—¶ä¸ä¼šæ•´è¡¨å•é‡éªŒï¼Œä½† owner ä¼šè‡ªåŠ¨æ‰©å±• closure åˆ°ï¼š

- `profile.userName`
- ä¾èµ– `profile.userName` çš„è¡¨è¾¾å¼è§„åˆ™
- `profile` object aggregate ruleï¼ˆå¦‚æžœå­˜åœ¨ï¼‰

### Edit Flow 2: Switching `contactMode` From `email` To `webhook`

è¿™ä¸€æ­¥æ˜¯ `variant-field` çš„æ ¸å¿ƒã€‚

æ‰§è¡Œé¡ºåºæŽ¨èä¸ºï¼š

1. `setValue('contactMode', 'webhook')`
2. owner å‘çŽ° `profile.contact` active branch å‘ç”Ÿåˆ‡æ¢
3. email branch å¤±æ´»
4. æ¸…ç† email branch çš„é”™è¯¯ã€validating runã€showError candidates
5. webhook branch æ¿€æ´»
6. å¦‚æžœ schema å®šä¹‰äº† webhook variant `initialValue`ï¼Œå»ºç«‹æ–° working value
7. `validateSubtree('profile.contact')`

éªŒè¯å‚ä¸Žé›†æ­¤æ—¶å‘ç”Ÿå˜åŒ–ï¼š

- `profile.contact.value` email leaf ä¸å†å‚ä¸Ž
- `profile.contact.value.url` å¼€å§‹å‚ä¸Ž
- `profile.contact.value.headers` array subtree å¼€å§‹å‚ä¸Ž

æ—§ email branch çš„ async run å¦‚æžœå°šæœªè¿”å›žï¼Œä¹Ÿå¿…é¡»å¤±æ•ˆã€‚

### Edit Flow 3: Adding A Header Row In Webhook Variant

ç”¨æˆ·åœ¨ `profile.contact.value.headers` ä¸­æ–°å¢žä¸€è¡Œã€‚

æ‰§è¡Œé¡ºåºæŽ¨èä¸ºï¼š

1. array owner append row
2. runtime å®žä¾‹åŒ–æ–°è·¯å¾„ï¼š
- `profile.contact.value.headers.0.key`
- `profile.contact.value.headers.0.value`
3. remap array-related state if needed
4. `revalidateAffected({ changedPaths: ['profile.contact.value.headers'] })`

owner è‡ªåŠ¨æ‰©å±• closure åˆ°ï¼š

- array root `profile.contact.value.headers`
- row root `profile.contact.value.headers.0`
- leaf paths under that row if trigger policy requires

### Edit Flow 4: Opening And Confirming `detail-field` Address Editor

ç”¨æˆ·ç‚¹å‡» `address` çš„ detail editorã€‚

æ‰“å¼€æ—¶ï¼š

1. surface opens
2. create child draft owner rooted at `profile.address`
3. child owner loads draft value
4. draft subtree graph materializes under that owner

åœ¨ dialog å†…ç¼–è¾‘ `zip` æ—¶ï¼š

1. update draft value
2. `draftOwner.validateAt('profile.address.zip', 'change')`
3. owner materializes `required: '${country === "US"}'`
4. if required, validate accordingly

ç¡®è®¤æ—¶ï¼š

1. `draftOwner.validateAll('submit')`
2. è‹¥ invalidï¼Œdialog stays openï¼Œé”™è¯¯åªç•™åœ¨ draft owner
3. è‹¥ validï¼Œæ‰§è¡Œ commit/writeback
4. parent owner `revalidateAffected({ changedPaths: ['profile.address'] })`

è¿™é‡Œæœ€é‡è¦çš„æ˜¯ï¼š

- draft å†…é”™è¯¯ä¸æ±¡æŸ“ parent owner
- confirm å‰ outer form submit ä¸åº”çœ‹åˆ° draft å†…æœªç¡®è®¤é”™è¯¯

### Edit Flow 5: Editing `profile.contacts.0.email`

ç”¨æˆ·ç¼–è¾‘å¯¹è±¡æ•°ç»„ä¸­çš„ emailã€‚

æ‰§è¡Œé¡ºåºæŽ¨èä¸ºï¼š

1. `setValue('profile.contacts.0.email', next)`
2. `validateAt('profile.contacts.0.email', 'blur')`
3. owner æ‰©å±• closure åˆ°ï¼š
- leaf `profile.contacts.0.email`
- row root `profile.contacts.0`
- array root `profile.contacts`
- expression / overlay dependents
4. async email-check rule å¯åŠ¨

å¦‚æžœç”¨æˆ·éšåŽåˆ é™¤ç¬¬ 0 è¡Œï¼š

1. array remove remaps indexed state
2. `profile.contacts.0.*` ç›¸å…³ async run å¤±æ•ˆæˆ– remap
3. array root `profile.contacts` é‡éªŒ

### Submit Flow

ç”¨æˆ·ç‚¹å‡»æ•´ä¸ª form æäº¤ã€‚

`validateAll('submit')` éåŽ†çš„æ˜¯å½“å‰ active instance graphï¼Œè€Œä¸æ˜¯æ‰€æœ‰æ¨¡æ¿èŠ‚ç‚¹ã€‚

åœ¨ä¸Šé¢çš„æ—¶åˆ»ï¼Œå¦‚æžœï¼š

- `mode = 'advanced'`
- `contactMode = 'webhook'`
- address detail dialog å·²å…³é—­ä¸”å·²æäº¤

é‚£ä¹ˆ submit æ—¶å‚ä¸Žçš„èŠ‚ç‚¹åŒ…æ‹¬ï¼š

- `mode`
- `contactMode`
- `profile.userName`
- `profile.contact.value.url`
- `profile.contact.value.headers` åŠå…¶æ´»è·ƒ rows
- `profile.contacts` åŠå…¶æ´»è·ƒ rows

ä¸åŒ…æ‹¬ï¼š

- `if` çš„ inactive branch
- `variant-field` çš„ inactive email branch
- å·²å…³é—­ä¸”æœªåˆ›å»ºä¸­çš„ detail draft owner å†…éƒ¨èŠ‚ç‚¹
- å…¶ä»– owner çš„ nested form fields

### Why This Example Matters

è¿™ä¸ªä¾‹å­è¯´æ˜Žï¼š

- é¢„ç¼–è¯‘ä»ç„¶æœ‰ä»·å€¼ï¼Œå› ä¸º rule templateã€branch templateã€array template éƒ½èƒ½æå‰æ”¶é›†
- åŠ¨æ€æ€§ç¡®å®žå­˜åœ¨ï¼Œä½†ä¸»è¦ä½“çŽ°åœ¨ active instance graph çš„å®žä¾‹åŒ–/å¤±æ´»ï¼Œè€Œä¸æ˜¯é€¼è¿«æž¶æž„é€€å›ž mount-only registration
- å±€éƒ¨éªŒè¯å§‹ç»ˆæ˜¯ owner-aware closure validation
- æ•´ä½“éªŒè¯å§‹ç»ˆæ˜¯ active instance graph validation
- async validation åªæ˜¯åŒä¸€ pipeline ä¸­å¸¦ lifecycle/cancellation è¯­ä¹‰çš„ rule ç±»åž‹

## Decision Summary

å½“å‰è‰æ¡ˆæŽ¨èï¼š

1. ç»§ç»­åšæŒ owner-scoped validationã€‚
2. æŠŠ validation core å’Œ form UX layer åˆ†å¼€ã€‚
3. å¼•å…¥ `ValidationOwner` ä½œä¸º form/draft çš„å…±åŒæŠ½è±¡ã€‚
4. æ”¯æŒè¡¨è¾¾å¼åŒ– rule templateï¼Œå¹¶åˆ©ç”¨é¢„ç¼–è¯‘åš materializationã€‚
5. ç¬¬ä¸€é˜¶æ®µåªè®© subtree draft owner æˆä¸ºæ™®é€š child ownerã€‚
6. projection draft æš‚ä¸çº³å…¥ first-class owner æ¨¡åž‹ã€‚
7. è®© dynamic rules æˆä¸ºå¤æ‚æŽ§ä»¶æ‰©å±•çš„é¦–é€‰æœºåˆ¶ã€‚
8. ä¿ç•™æ¯”æœ€å°ä¸‰å…ƒç»„æ›´å¼ºçš„é”™è¯¯è¡¨è¾¾èƒ½åŠ›ï¼Œä½†æ”¶æ•›è¯­ä¹‰å’ŒæŸ¥è¯¢é¢ã€‚

## Risks And Open Questions

1. array item å†…çš„ç›¸å¯¹è·¯å¾„è¡¨è¾¾å¼å¦‚ä½•æ˜ å°„åˆ° concrete absolute dependency path
2. draft owner å­å›¾æå–æ˜¯å¤åˆ¶ compiled subtree è¿˜æ˜¯ parent model è§†å›¾æ˜ å°„
3. dynamic rule overlay çš„ä¼˜å…ˆçº§ã€è¦†ç›–å…³ç³»ä¸ŽåŽ»é‡ç­–ç•¥
4. `sourceKind` æ˜¯å¦ç›´æŽ¥é‡å‘½åä¸º `source` è¿˜æ˜¯ä¿æŒå…¼å®¹å­—æ®µ
5. projection draft çš„ç»Ÿä¸€ owner æ¨¡åž‹æ˜¯å¦å€¼å¾—è¿›å…¥ phase 2ï¼Œè¿˜æ˜¯ç»§ç»­åœç•™åœ¨ value-adaptation wrapper
6. open surface æœŸé—´æ•°ç»„è¡Œ reorder çš„ direct-binding æ”¯æŒæ˜¯å¦è¦è¿›å…¥åŽç»­é˜¶æ®µ

è¿™äº›é—®é¢˜åœ¨æœ¬è‰æ¡ˆä¸­å°šæœªæœ€ç»ˆå®šæ¡ˆï¼Œéœ€è¦ç»§ç»­åœºæ™¯åŒ–å®¡è®¡ã€‚

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/architecture/object-field.md`
- `docs/architecture/array-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/surface-owner.md`
- `docs/analysis/2026-03-19-form-validation-comparison.md`


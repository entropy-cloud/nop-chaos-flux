# Flux Form Validation è®¾è®¡æ–¹æ¡ˆ

> ç±»åž‹: è®¾è®¡åˆ†æžæ–‡æ¡£
> çŠ¶æ€: å¯æ‰§è¡Œæ–¹æ¡ˆ
> æ—¥æœŸ: 2026-04-11
> å–ä»£: `form-validation-expression-rules-design.md`ï¼ˆæ—§ç‰ˆï¼Œå·²åºŸå¼ƒï¼‰
> å…³è”: `docs/architecture/form-validation.md`, `docs/analysis/2026-04-11-form-validation-owner-redesign-draft.md`

---

## 1. é—®é¢˜çš„çœŸå®žæ ¹æº

åœ¨è®¨è®ºå¦‚ä½•è®¾è®¡ä¹‹å‰ï¼Œå¿…é¡»å…ˆæ¾„æ¸…ä¸¤ä¸ªç»å¸¸è¢«æ··æ·†çš„é—®é¢˜ï¼š

### 1.1 Field çŠ¶æ€æ¨¡åž‹ä¸Ž Validation æ¨¡åž‹æ˜¯ä¸¤ä»¶äº‹

è¿™æ˜¯ç›®å‰æ‰€æœ‰æ–‡æ¡£ï¼ˆåŒ…æ‹¬æ—§ç‰ˆåˆ†æžå’Œ owner-redesign-draftï¼‰éƒ½æ²¡æœ‰æ˜Žç¡®åŒºåˆ†çš„é—®é¢˜ã€‚

**FormFieldRegistryï¼ˆå­—æ®µçŠ¶æ€ï¼‰** å›žç­”ï¼šè¿™ä¸ªå­—æ®µå½“å‰æ˜¯å¦å­˜åœ¨ï¼Ÿæ˜¯å¦å¯è§ï¼Ÿæ˜¯å¦è¢«ç”¨æˆ·è§¦ç¢°è¿‡ï¼Ÿ

```ts
interface FieldRegistration {
  path: string;
  visible: boolean; // æ¥è‡ª schema visible/hidden è¡¨è¾¾å¼çš„æ±‚å€¼ç»“æžœ
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}
```

**ValidationModelï¼ˆè§„åˆ™å®šä¹‰ï¼‰** å›žç­”ï¼šå¯¹äºŽè¿™ä¸ªè·¯å¾„ï¼Œæœ‰å“ªäº›è§„åˆ™éœ€è¦æ‰§è¡Œï¼Ÿ

```ts
interface CompiledFieldValidation {
  path: string;
  ruleTemplates: CompiledRuleTemplate[]; // ç¼–è¯‘æœŸäº§ç‰©
  behavior: ValidationBehavior;
  hiddenFieldPolicy: HiddenFieldPolicy;
}
```

**ValidationStateï¼ˆéªŒè¯ç»“æžœï¼‰** å›žç­”ï¼šè¿™ä¸ªè·¯å¾„å½“å‰çš„éªŒè¯çŠ¶æ€æ˜¯ä»€ä¹ˆï¼Ÿ

```ts
interface FieldValidationState {
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

ä¸‰è€…ç‹¬ç«‹ç»´æŠ¤ï¼Œåœ¨ FormRuntime ä¸­åä½œã€‚**AMIS çš„ `FormItemStore` å°†è¿™ä¸‰è€…æ··åœ¨ä¸€èµ·**ï¼Œå¯¼è‡´å­—æ®µçš„ mount/unmount ç”Ÿå‘½å‘¨æœŸä¸ŽéªŒè¯é€»è¾‘æ­»æ­»è€¦åˆï¼Œè¿™æ­£æ˜¯ AMIS æ–¹æ¡ˆçš„æ ¹æœ¬å±€é™ã€‚

### 1.2 "å“ªäº›å­—æ®µå½“å‰å‚ä¸ŽéªŒè¯"çš„ä¸¤ä¸ªæ¥æº

`owner-redesign-draft.md` æå‡ºäº† Active Validation Instance Graph çš„æ¦‚å¿µï¼Œå¹¶è®¾è®¡äº† `refreshActiveInstanceGraph()` è¿™ä¸ªå…¥å£ï¼Œè®© owner è‡ªè¡Œè®¡ç®—å½“å‰æ¿€æ´»çš„å­—æ®µé›†åˆã€‚è¿™åœ¨ phase 1 å¼•å…¥ä¼šå¸¦æ¥ä¸å¿…è¦çš„å¤æ‚åº¦ï¼šéœ€è¦åœ¨ owner å†…éƒ¨è¿½è¸ª if-branch çŠ¶æ€ã€variant æ¿€æ´»çŠ¶æ€ã€array item æ•°é‡ã€‚

**å¯¹äºŽ leaf field rendererï¼ˆinput-textã€select ç­‰ï¼‰ï¼Œå½“å‰å®žä¾‹çš„å‚ä¸ŽçŠ¶æ€æ¥è‡ª FormFieldRegistryã€‚**

æ¯ä¸ª field renderer åœ¨ mount æ—¶å‘ registry æ³¨å†Œè‡ªå·±ï¼Œunmount æ—¶æ³¨é”€ã€‚è¿™æ„å‘³ç€ï¼š

- `if` åˆ†æ”¯åˆ‡æ¢ â†’ React å¸è½½å¤±æ´»åˆ†æ”¯çš„ renderer â†’ è‡ªåŠ¨ä»Ž registry æ¶ˆå¤±
- array item æ–°å¢ž â†’ React æŒ‚è½½æ–° item çš„ renderer â†’ è‡ªåŠ¨è¿›å…¥ registry
- array item åˆ é™¤ â†’ React å¸è½½è¯¥ item çš„ renderer â†’ è‡ªåŠ¨ä»Ž registry æ¶ˆå¤±
- `variant-field` åˆ‡æ¢ â†’ æ—§ branch å¸è½½ï¼Œæ–° branch æŒ‚è½½ â†’ registry è‡ªåŠ¨æ›´æ–°

React reconciler å·²ç»åœ¨ç»´æŠ¤"å½“å‰æŒ‚è½½äº†ä»€ä¹ˆ"è¿™ä¸ªä¿¡æ¯ï¼Œå¯¹ leaf field ä¸éœ€è¦ owner å†ç‹¬ç«‹è®¡ç®—ä¸€æ¬¡ã€‚

**ä½† registry ä¸æ˜¯ validation å‚ä¸Žä¿¡æ¯çš„å”¯ä¸€æ¥æºã€‚** ä»¥ä¸‹èŠ‚ç‚¹æ²¡æœ‰å¯¹åº” rendererï¼Œä¸ä¼šå‡ºçŽ°åœ¨ registry ä¸­ï¼Œä½†ä»ç„¶éœ€è¦å‚ä¸Ž validationï¼š

- `object`/`array` aggregate nodeï¼ˆå¦‚ `contacts` çš„ `uniqueBy` è§„åˆ™ï¼‰
- `variant-root` / `branch` ç­‰ç»“æž„èŠ‚ç‚¹
- repeated item template çš„æ¨¡æ¿çº§è¾¹ç•Œ

å› æ­¤æ›´å‡†ç¡®çš„è¡¨è¿°æ˜¯ï¼š

- **compiled field tree** å®šä¹‰"å“ªäº› validation ç»“æž„å¯èƒ½å­˜åœ¨"
- **FormFieldRegistry** æŠ¥å‘Š"å½“å‰å“ªäº› leaf field instance å·² mount/participate"
- ä¸¤è€…åä½œï¼Œä¸æ˜¯æ›¿ä»£å…³ç³»ï¼š`validateForm()` ä»¥ compiled traversal order ä¸ºä¸»åºï¼Œå†ä¸Ž registry äº¤å‰è¿‡æ»¤ leaf å‚ä¸ŽçŠ¶æ€

è¿™æ˜¯å¯¹ AMIS åŠ¨æ€æ³¨å†Œæ¨¡å¼çš„æ­£ç¡®å€Ÿé‰´ï¼šå€Ÿé‰´å®ƒè®© React mount/unmount é©±åŠ¨ leaf field å‚ä¸ŽçŠ¶æ€è¿™ä¸ªæ­£ç¡®ç›´è§‰ï¼Œä½†**æŠŠå­—æ®µçŠ¶æ€æ³¨å†Œå’ŒéªŒè¯è§„åˆ™ä¸¥æ ¼åˆ†å¼€**ï¼Œä¸é‡è¹ˆ FormItemStore å¤§æ‚çƒ©çš„è¦†è¾™ï¼Œä¹Ÿä¸æŠŠ registry å‡çº§ä¸º aggregate/variant/template ç»“æž„çš„å”¯ä¸€æ¥æºã€‚

---

## 2. å½“å‰å®žçŽ°çš„å®žé™…ç¼ºå£

é€šè¿‡å¯¹ä»£ç çš„ç›´æŽ¥å®¡æŸ¥ï¼ˆä¸æ˜¯è®¾è®¡æ–‡æ¡£è‡ªè¿°ï¼‰ï¼Œå½“å‰å®žçŽ°çš„çœŸå®žé—®é¢˜æ˜¯ï¼š

### ç¼ºå£ Aï¼šè§„åˆ™å‚æ•°æ˜¯é™æ€å­—é¢é‡

`rules.ts:collectSchemaValidationRules()` åªå¤„ç†å­—é¢é‡ï¼š

```ts
if (typeof ruleSource.minLength === 'number') {
  rules.push({ kind: 'minLength', value: ruleSource.minLength });
}
```

æ— æ³•å¤„ç† `"minLength": "${policy.minLen}"` è¿™ç±»ä½Žä»£ç å¸¸è§å†™æ³•ã€‚

`required` åŒæ ·åªæ”¯æŒé™æ€ booleanï¼Œæ— æ³•è¡¨è¾¾ `"required": "${role === 'admin'}"` ã€‚

### ç¼ºå£ Bï¼š`isFieldEffectivelyRequired()` ä¸ŽéªŒè¯å™¨é€»è¾‘é‡å¤ä¸”ä¸åŒæ­¥

`form-state.ts:isFieldEffectivelyRequired()` ç‹¬ç«‹å®žçŽ°äº†å¯¹ `required`/`requiredWhen`/`requiredUnless` çš„åˆ¤æ–­ï¼Œä½¿ç”¨ `getIn(values, rule.path)` ç›´æŽ¥è¯»å€¼ã€‚

è¿™ä¸Ž validator æ‰§è¡Œæ—¶é€šè¿‡ `scope.get(rule.path)` è¯»å€¼æ˜¯ä¸¤å¥—é€»è¾‘ã€‚å½“è§„åˆ™å˜æˆè¡¨è¾¾å¼åŒ–ä¹‹åŽï¼Œè¿™ä¸¤å¤„ä¼šæ›´åŠ éš¾ä»¥åŒæ­¥ã€‚

### ç¼ºå£ Cï¼š`notifyFieldHidden` å·²å®žçŽ°ä½†ä¾èµ–æ‰‹å·¥è°ƒç”¨

`form-runtime.ts:notifyFieldHidden()` å®žçŽ°æ˜¯å®Œæ•´çš„ï¼Œä½†éœ€è¦ renderer ä¸»åŠ¨è°ƒç”¨ã€‚å®žé™…ä¸Šï¼Œ**hidden çŠ¶æ€çš„æ¥æºå·²ç»æ˜¯ scope è¡¨è¾¾å¼æ±‚å€¼ç»“æžœ**ï¼ˆ`visible`/`hidden` å­—æ®µï¼‰ï¼Œåªæ˜¯æ²¡æœ‰æŠŠè¿™ä¸ªä¿¡æ¯ç»Ÿä¸€è·¯ç”±åˆ° registryã€‚

### ç¼ºå£ Dï¼š`validateForm()` éåŽ†çš„æ˜¯ compiled graph å…¨é›†

`form-runtime.ts:validateForm()` è°ƒç”¨ `getCompiledValidationTraversalOrder()` éåŽ†ç¼–è¯‘æœŸæ‰€æœ‰èŠ‚ç‚¹ã€‚è¿™æ„å‘³ç€ï¼š

- `if` åˆ†æ”¯ä¸­çš„å­—æ®µæ— è®ºå½“å‰æ˜¯å¦æ¿€æ´»éƒ½ä¼šè¢«éªŒè¯ï¼ˆä¾èµ– `notifyFieldHidden` æ¥è·³è¿‡ï¼Œè€Œä¸æ˜¯ä»Žæ¥æºä¸ŠæŽ’é™¤ï¼‰
- array item çš„è·¯å¾„åœ¨ compiled graph ä¸­ä¸å­˜åœ¨ï¼ˆå› ä¸ºæ˜¯æ¨¡æ¿ï¼Œä¸æ˜¯å…·ä½“ indexed pathï¼‰ï¼Œåªèƒ½èµ° `runtimeFieldRegistrations`

ä¹Ÿå°±æ˜¯è¯´ï¼šå½“å‰ `validateForm()` å®žé™…ä¸Šå·²ç»åœ¨ä¾èµ– registryï¼ˆ`runtimeFieldRegistrations`ï¼‰æ¥å¤„ç†åŠ¨æ€å­—æ®µï¼Œåªæ˜¯è¿™ä¸ªä¾èµ–ä¸é€æ˜Žã€ä¸ç»Ÿä¸€ã€‚

---

## 3. æŽ¨èçš„åˆ†å±‚æž¶æž„

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Layer 0: Rule Engineï¼ˆçº¯å‡½æ•°å±‚ï¼‰                             â”‚
â”‚  è¾“å…¥: value + EffectiveRule[]                                â”‚
â”‚  è¾“å‡º: ValidationError[]                                      â”‚
â”‚  å®Œå…¨æ— çŠ¶æ€ï¼Œé›¶å‰¯ä½œç”¨ï¼Œç‹¬ç«‹å¯æµ‹è¯•                              â”‚
â”‚  çŽ°æœ‰ä»£ç : validators.ts ä¸­çš„ builtInValidators              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â†‘ è°ƒç”¨
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Layer 1: ValidationEngineï¼ˆè§„åˆ™ç‰©åŒ–ä¸Žæ‰§è¡Œï¼‰                  â”‚
â”‚  è¾“å…¥: CompiledRuleTemplate + ScopeRef                        â”‚
â”‚  èŒè´£: materialize template â†’ EffectiveRule â†’ è°ƒç”¨ Layer 0   â”‚
â”‚  æŒæœ‰: errors map, validating map, async run registry        â”‚
â”‚  ä¸æŒæœ‰: å­—æ®µçŠ¶æ€ï¼ˆtouched/dirty ç­‰ï¼‰ï¼Œä¸æŒæœ‰å€¼              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â†‘ æŸ¥è¯¢"å“ªäº›å­—æ®µå­˜åœ¨"
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Layer 2: FormFieldRegistryï¼ˆå­—æ®µçŠ¶æ€æ³¨å†Œè¡¨ï¼‰                 â”‚
â”‚  ç”± React renderer mount/unmount é©±åŠ¨                         â”‚
â”‚  æŒæœ‰: path â†’ { visible, disabled, touched, dirty, visited } â”‚
â”‚  "æ´»è·ƒå­—æ®µé›†åˆ" = å½“å‰å·²æ³¨å†Œçš„ paths                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â†‘ ç¼–æŽ’
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Layer 3: FormRuntimeï¼ˆUX ç¼–æŽ’å±‚ï¼‰                            â”‚
â”‚  æŒæœ‰: ValidationEngine + FormFieldRegistry + store          â”‚
â”‚  èŒè´£: trigger policy, showErrorOn, submit gate              â”‚
â”‚  API: validateField / validateSubtree / validateForm         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### å½“å‰å®žçŽ°çš„æ˜ å°„

| å½“å‰ä»£ç                                          | æ–°åˆ†å±‚å½’å±ž           | éœ€è¦å˜åŒ–                |
| -------------------------------------------------- | ------------------------- | ------------------------- |
| `validators.ts builtInValidators`                  | Layer 0                   | æ—                        |
| `form-runtime-validation.ts validateCompiledField` | Layer 1                   | å¢žåŠ  materialize æ­¥éª¤ |
| `form-runtime.ts hiddenFields: Set<string>`        | Layer 2 çš„ä¸€éƒ¨åˆ†      | æ‰©å±•ä¸ºå®Œæ•´ registry  |
| `form-runtime.ts runtimeFieldRegistrations`        | Layer 2 + Layer 1 overlap | åˆ†èŒè´£                  |
| `form-runtime.ts FormRuntime`                      | Layer 3                   | æ— å¤§ç»“æž„å˜åŒ–         |

---

## 4. è¡¨è¾¾å¼åŒ–è§„åˆ™æ¨¡æ¿ï¼ˆæ ¸å¿ƒæ–°å¢žï¼‰

### 4.1 `CompiledRuleTemplate` ç±»åž‹

çŽ°æœ‰ `CompiledValidationRule` å°†è¢«æ‰©å±•ï¼ˆå‘ä¸‹å…¼å®¹ï¼Œä¸æ›¿æ¢ï¼‰ï¼š

```ts
// çŽ°æœ‰ç±»åž‹ä¿æŒä¸å˜ï¼Œä½œä¸ºé™æ€è§„åˆ™çš„å¿«é€Ÿè·¯å¾„
interface CompiledValidationRule {
  id: string;
  rule: ValidationRule; // é™æ€å­—é¢é‡
  dependencyPaths: string[];
  precompiled?: { regex?: RegExp };
}

// æ–°å¢žï¼šæ”¯æŒè¡¨è¾¾å¼åŒ–å‚æ•°çš„è§„åˆ™æ¨¡æ¿
interface CompiledRuleTemplate {
  id: string;
  kind: ValidationRuleKind;

  // è§„åˆ™å¼€å…³ï¼šundefined = å§‹ç»ˆæ¿€æ´»ï¼›static true = å§‹ç»ˆæ¿€æ´»ï¼ˆä¼˜åŒ–è·¯å¾„ï¼‰
  // static false = ç¼–è¯‘æœŸå‰ªæžï¼ˆä¸äº§å‡ºæ­¤ templateï¼‰
  when?: CompiledRuntimeValue<boolean>;

  // è§„åˆ™å‚æ•°ï¼šæ¯ä¸ªå‚æ•°å¯ä»¥æ˜¯é™æ€å€¼æˆ–å·²ç¼–è¯‘çš„è¡¨è¾¾å¼
  args: RuleTemplateArgs;

  // é”™è¯¯æ¶ˆæ¯ï¼šå¯ä»¥æ˜¯é™æ€å­—ç¬¦ä¸²æˆ–è¡¨è¾¾å¼
  message?: CompiledRuntimeValue<string> | string;

  // æ‰€æœ‰ä¾èµ–è·¯å¾„ï¼ˆé™æ€ relational deps + è¡¨è¾¾å¼ä¸­æå–çš„ depsï¼‰
  dependencyPaths: string[];

  precompiled?: { regex?: RegExp };
}

// å„è§„åˆ™çš„å‚æ•°ç±»åž‹
type RuleTemplateArgs =
  | { kind: 'required' }
  | { kind: 'minLength'; value: CompiledRuntimeValue<number> | number }
  | { kind: 'maxLength'; value: CompiledRuntimeValue<number> | number }
  | { kind: 'minItems'; value: CompiledRuntimeValue<number> | number }
  | { kind: 'maxItems'; value: CompiledRuntimeValue<number> | number }
  | { kind: 'pattern'; value: CompiledRuntimeValue<string> | string }
  | { kind: 'email' }
  | { kind: 'equalsField'; path: string }
  | { kind: 'notEqualsField'; path: string }
  | { kind: 'requiredWhen'; path: string; equals: CompiledRuntimeValue<unknown> | unknown }
  | { kind: 'requiredUnless'; path: string; equals: CompiledRuntimeValue<unknown> | unknown };
// ... å…¶ä½™ aggregate rules åŒç†
```

### 4.2 ç‰©åŒ–ï¼ˆMaterializationï¼‰

éªŒè¯æ‰§è¡Œå‰å°† template è½¬æ¢ä¸ºæœ¬æ¬¡æ‰§è¡Œçš„ effective ruleï¼š

```ts
interface EffectiveValidationRule {
  id: string;
  kind: ValidationRuleKind;
  args: Record<string, unknown>; // å·²å¯¹æ‰€æœ‰è¡¨è¾¾å¼æ±‚å€¼
  message?: string; // å·²å¯¹æ¶ˆæ¯è¡¨è¾¾å¼æ±‚å€¼
}

function materializeRuleTemplate(
  template: CompiledRuleTemplate,
  scope: ScopeRef,
  env: RendererEnv,
): EffectiveValidationRule | null {
  // 1. æ±‚å€¼ whenï¼ˆå¦‚æžœæ˜¯è¡¨è¾¾å¼ï¼‰
  if (template.when != null) {
    const active = isCompiledRuntimeValue(template.when)
      ? evaluateCompiledValue(template.when, scope, env)
      : template.when;
    if (!active) return null; // è§„åˆ™å½“å‰æœªæ¿€æ´»ï¼Œè·³è¿‡
  }

  // 2. æ±‚å€¼ args ä¸­çš„è¡¨è¾¾å¼å‚æ•°
  const args: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(template.args)) {
    args[key] = isCompiledRuntimeValue(val) ? evaluateCompiledValue(val, scope, env) : val;
  }

  // 3. æ±‚å€¼ message
  const message =
    template.message == null
      ? undefined
      : isCompiledRuntimeValue(template.message)
        ? String(evaluateCompiledValue(template.message, scope, env))
        : template.message;

  return { id: template.id, kind: template.kind, args, message };
}
```

### 4.3 ç¼–è¯‘æœŸå¤„ç†ï¼ˆ`collectSchemaValidationRules` çš„å˜æ›´ï¼‰

```ts
// çŽ°åœ¨ï¼ˆé™æ€ï¼‰
if (typeof ruleSource.minLength === 'number') {
  rules.push({ kind: 'minLength', value: ruleSource.minLength });
}

// æ”¹ä¸ºï¼ˆæ”¯æŒè¡¨è¾¾å¼ï¼‰
if (ruleSource.minLength != null) {
  const compiled = compiler.compileValue(ruleSource.minLength);
  // é™æ€ false â†’ ç¼–è¯‘æœŸå‰ªæž
  if (compiled.kind === 'static' && compiled.value === false) return;
  // é™æ€ true/number â†’ å†…è”ï¼Œæ— è¿è¡Œæ—¶ evaluate å¼€é”€
  if (compiled.kind === 'static') {
    templates.push({ kind: 'minLength', args: { value: compiled.value },
                     when: undefined, dependencyPaths: [], ... });
  } else {
    templates.push({ kind: 'minLength', args: { value: compiled },
                     when: undefined, dependencyPaths: extractDeps(compiled), ... });
  }
}

// required ç‰¹æ®Šï¼šå€¼å¯ä»¥æ˜¯ boolean æˆ–æ¡ä»¶è¡¨è¾¾å¼
if (ruleSource.required != null) {
  const compiled = compiler.compileValue(ruleSource.required);
  if (compiled.kind === 'static') {
    if (!compiled.value) return;                        // false â†’ å‰ªæž
    templates.push({ kind: 'required', when: undefined, ... }); // true â†’ æ— æ¡ä»¶
  } else {
    // "${role === 'admin'}" â†’ when å­—æ®µæŒæœ‰è¯¥è¡¨è¾¾å¼
    templates.push({ kind: 'required', when: compiled,
                     dependencyPaths: extractDeps(compiled), ... });
  }
}
```

**å…³é”®ä¼˜åŒ–**ï¼šçº¯é™æ€è§„åˆ™ï¼ˆå½“å‰æ‰€æœ‰è§„åˆ™ï¼‰å®Œå…¨èµ°å¿«é€Ÿè·¯å¾„ï¼Œ`dependencyPaths: []`ï¼Œ`when: undefined`ï¼Œæ‰§è¡Œæ—¶æ— è¡¨è¾¾å¼æ±‚å€¼å¼€é”€ï¼Œä¸ŽçŽ°åœ¨ç­‰ä»·ã€‚åªæœ‰çœŸæ­£å«è¡¨è¾¾å¼çš„è§„åˆ™æ‰èµ° materialize è·¯å¾„ã€‚

### 4.4 ä¾èµ–å›¾æ‰©å±•

ä¾èµ–å›¾éœ€è¦åˆå¹¶ä¸‰ç±»æ¥æºï¼š

```
å…¨é‡ dependencyPaths =
  (1) æ˜¾å¼ relational è·¯å¾„ï¼ˆequalsField / requiredWhen ç­‰ï¼ŒçŽ°æœ‰é€»è¾‘ï¼‰
+ (2) è§„åˆ™ when/args/message ä¸­è¡¨è¾¾å¼æå–çš„å˜é‡åï¼ˆæ–°å¢žï¼‰
+ (3) èšåˆèŠ‚ç‚¹çš„ childâ†’parent è‡ªåŠ¨å…³ç³»ï¼ˆæ–°å¢žï¼Œç¼–è¯‘å™¨å»ºç«‹ï¼‰
```

ç¬¬ä¸‰ç±»çš„ä¾‹å­ï¼š`contacts.0.email` å˜åŒ– â†’ `contacts` çš„ `uniqueBy` è§„åˆ™éœ€è¦é‡éªŒ â†’ ä¾èµ–å›¾ä¸­ `contacts.0.email` â†’ `contacts`ã€‚è¿™ä¸ªå…³ç³»ç”±ç¼–è¯‘å™¨åœ¨åˆ†æž array/object node æ—¶è‡ªåŠ¨å»ºç«‹ï¼Œä¸éœ€è¦ schema ä½œè€…å£°æ˜Žã€‚

---

## 5. FormFieldRegistryï¼šç»Ÿä¸€å­—æ®µçŠ¶æ€ç®¡ç†

### 5.1 æŽ¥å£å®šä¹‰

```ts
interface FieldRegistration {
  path: string;
  visible: boolean; // å½“å‰ visible è¡¨è¾¾å¼æ±‚å€¼ç»“æžœ
  disabled: boolean;
  // UX çŠ¶æ€ç”± FormRuntime ç®¡ç†ï¼Œä¸åœ¨æ­¤å¤„
}

interface FormFieldRegistry {
  // å­—æ®µ mount æ—¶è°ƒç”¨
  register(path: string, info: FieldRegistration): () => void; // è¿”å›ž unregister

  // æŸ¥è¯¢å½“å‰å·²æ³¨å†Œï¼ˆå³å½“å‰æŒ‚è½½ï¼‰çš„å­—æ®µè·¯å¾„
  getRegisteredPaths(): string[];

  // æŸ¥è¯¢æŸè·¯å¾„æ˜¯å¦å½“å‰å·²æ³¨å†Œ
  isRegistered(path: string): boolean;

  // æŸ¥è¯¢æŸè·¯å¾„æ˜¯å¦ visibleï¼ˆæ³¨å†Œäº† && visible === trueï¼‰
  isVisible(path: string): boolean;
}
```

### 5.2 ä¸ŽçŽ°æœ‰ä»£ç çš„å…³ç³»

å½“å‰ `form-runtime.ts` æœ‰ä¸¤ä¸ªç›¸å…³ç»“æž„ï¼š

- `hiddenFields: Set<string>` â€” è®°å½•å½“å‰ hidden çš„è·¯å¾„ï¼Œç”± `notifyFieldHidden()` ç»´æŠ¤
- `runtimeFieldRegistrations: Map<string, RuntimeFieldRegistration>` â€” è®°å½•å¤æ‚æŽ§ä»¶çš„éªŒè¯å›žè°ƒ

`FormFieldRegistry` ç»Ÿä¸€è¿™ä¸¤ä¸ªèŒè´£ä¸­çš„"å­—æ®µå­˜åœ¨æ€§"éƒ¨åˆ†ï¼š

```
FormFieldRegistry æ–°èŒè´£:
  register(path, { visible })  â†  åŽŸ notifyFieldHidden åå‘ç­‰ä»·
  isVisible(path)              â†  åŽŸ !hiddenFields.has(path) ç­‰ä»·

runtimeFieldRegistrations ä¿ç•™èŒè´£ï¼ˆå¤æ‚æŽ§ä»¶éªŒè¯å›žè°ƒï¼‰:
  validate?: () => ValidationError[]
  validateChild?: (path) => ValidationError[]
  childPaths?: string[]
```

### 5.3 Renderer ä½¿ç”¨æ¨¡å¼

```tsx
// æ¯ä¸ª field renderer åœ¨ useEffect ä¸­æ³¨å†Œ
function InputTextRenderer(props: RendererComponentProps<InputTextSchema>) {
  const form = useCurrentForm();
  const resolvedVisible = props.meta.visible;

  useEffect(() => {
    if (!form || !props.props.name) return;
    const unregister = form.registry.register(props.props.name, {
      path: props.props.name,
      visible: resolvedVisible !== false,
      disabled: props.meta.disabled === true,
    });
    return unregister;
  }, [props.props.name, resolvedVisible, props.meta.disabled]);

  // ...
}
```

**è¿™ä¸Žå½“å‰ `notifyFieldHidden` çš„è°ƒç”¨æ¨¡å¼åŸºæœ¬ç­‰ä»·**ï¼Œåªæ˜¯æŠŠ"é€šçŸ¥ hidden"æ”¹æˆäº†"æ³¨å†Œ visible çŠ¶æ€"ï¼Œè¯­ä¹‰æ›´æ¸…æ™°ï¼Œä¸”ä¸éœ€è¦ä¸¤ä¸ªåˆ†å¼€çš„è°ƒç”¨ï¼ˆmount æ³¨å†Œ + unmount æ¸…é™¤ï¼‰ã€‚

### 5.4 `validateForm()` çš„ç®€åŒ–

æœ‰äº† registryï¼Œ`validateForm()` å˜æˆï¼š

```ts
async validateForm() {
  // 1. éåŽ†é¡ºåºï¼šcompiled graph çš„æ‹“æ‰‘é¡ºåº âˆ© å½“å‰å·²æ³¨å†Œï¼ˆå¯è§ï¼‰å­—æ®µ
  const compiledOrder = getCompiledValidationTraversalOrder(validation);
  const registered = new Set(registry.getRegisteredPaths());

  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, ValidationError[]> = {};

  for (const path of compiledOrder) {
    if (!registered.has(path)) continue;   // æœªæŒ‚è½½çš„å­—æ®µè·³è¿‡ï¼ˆif-branch ç­‰ï¼‰
    const result = await thisForm.validateField(path);
    if (!result.ok) { /* collect */ }
  }

  // 2. registry ä¸­æœ‰ä½† compiled graph ä¸­æ²¡æœ‰çš„è·¯å¾„ï¼ˆå¤æ‚æŽ§ä»¶åŠ¨æ€æ³¨å†Œï¼‰
  for (const path of registered) {
    if (compiledModel.nodes[path]) continue;   // å·²åœ¨ä¸Šé¢å¤„ç†
    const registration = runtimeFieldRegistrations.get(path);
    if (!registration?.validate) continue;
    // ... æ‰§è¡Œ registration.validate()
  }

  return { ok, errors, fieldErrors };
}
```

**å¯¹æ¯”çŽ°æœ‰å®žçŽ°**ï¼šçŽ°æœ‰ `validateForm()` åˆ†ä¸¤æ®µéåŽ†ï¼ˆcompiled order + registrationsï¼‰ï¼Œä¸”éœ€è¦å¤æ‚çš„é”™è¯¯åˆå¹¶é€»è¾‘ï¼ˆ`preservedErrors` + `mergedErrors`ï¼‰æ¥é¿å… `setErrors` è¦†ç›– registration validate çš„å‰¯ä½œç”¨ã€‚æ–°æ–¹æ¡ˆå› ä¸ºéåŽ†åŸºäºŽ registryï¼ˆå·²çŸ¥å“ªäº›å­—æ®µå½“å‰å­˜åœ¨ï¼‰ï¼Œè¿™ä¸ªåˆå¹¶å¤æ‚åº¦æ¶ˆå¤±äº†ã€‚

---

## 6. `isFieldEffectivelyRequired` çš„å•ä¸€æ¥æº

å½“å‰ `form-state.ts` çš„ `isFieldEffectivelyRequired()` ç‹¬ç«‹å®žçŽ°äº† required åˆ¤æ–­ï¼Œç›´æŽ¥è¯» compiled rule çš„é™æ€å€¼ã€‚è¿™åœ¨è§„åˆ™è¡¨è¾¾å¼åŒ–ä¹‹åŽä¼šä¸Ž validator é€»è¾‘ä¸åŒæ­¥ã€‚

**è§£å†³æ–¹æ¡ˆ**ï¼šValidationEngine æš´éœ² `materializeField()` æŽ¥å£ï¼Œ`isFieldEffectivelyRequired` æ”¹ä¸ºä»Ž materialize ç»“æžœè¯»å–ã€‚

```ts
// ValidationEngine æ–°å¢žæŽ¥å£
interface ValidationEngine {
  materializeField(
    path: string,
    scope: ScopeRef,
    env: RendererEnv,
  ): {
    activeRules: EffectiveValidationRule[];
    effectiveRequired: boolean;
  };
}

// form-state.ts isFieldEffectivelyRequired æ”¹ä¸ºï¼š
function isFieldEffectivelyRequired(
  engine: ValidationEngine,
  path: string,
  scope: ScopeRef,
  env: RendererEnv,
): boolean {
  return engine.materializeField(path, scope, env).effectiveRequired;
}
```

è¿™æ · field chrome çš„æ˜Ÿå·ã€validator çš„ required æ£€æŸ¥ã€`showError` é€»è¾‘éƒ½è¯»åŒä¸€ä»½æ•°æ®ï¼Œä¸ä¼šå‡ºçŽ°"validator è®¤ä¸ºå¿…å¡«ä½†æ˜Ÿå·ä¸äº®"çš„é—®é¢˜ã€‚

---

## 7. Draft Ownerï¼ˆè¯šå®žè¯„ä¼°ï¼‰

`owner-redesign-draft.md` çš„ Draft Owner è®¾è®¡åœ¨æ¦‚å¿µä¸Šæ˜¯æ­£ç¡®çš„ï¼Œä½†åœ¨ä¼˜å…ˆçº§ä¸Šåº”è¯¥æ”¾ä½Žã€‚

**ä¸ºä»€ä¹ˆæ”¾ä½Žä¼˜å…ˆçº§**ï¼š

- Draft Owner è§£å†³çš„æ˜¯ "dialog å†…ç¼–è¾‘ä¸æ±¡æŸ“å¤–å±‚é”™è¯¯" è¿™ä¸ªé—®é¢˜
- è¿™ä¸ªé—®é¢˜å¯ä»¥ç”¨æ›´ç®€å•çš„æ–¹å¼æš‚æ—¶è§£å†³ï¼šdialog å†…çš„ `form` renderer å¤©ç„¶åˆ›å»ºç‹¬ç«‹ FormRuntimeï¼ˆçŽ°æœ‰è¡Œä¸ºï¼‰ï¼Œcommit åŽé€šçŸ¥å¤–å±‚ revalidate å—å½±å“è·¯å¾„
- çœŸæ­£éœ€è¦ "subtree draft owner è€ŒéžåµŒå¥— form" çš„åœºæ™¯æ˜¯ `detail-field`ï¼ˆå¯¹è±¡å­—æ®µçš„ inline ç¼–è¾‘å¼¹çª—ï¼‰ï¼Œè¿™æ˜¯ä¸€ä¸ªå…·ä½“ä½†æ¬¡è¦çš„ç‰¹æ€§

**phase 1 çš„å®žçŽ°ç­–ç•¥ï¼šç›´æŽ¥å¤ç”¨ FormRuntimeï¼Œä¸æ–°å¢žç‹¬ç«‹ public owner API**ï¼š

```ts
// phase 1ï¼šdraft owner å°±æ˜¯ä¸€ä¸ª FormRuntimeï¼ŒrootPath æŒ‡å‘è¢«ç¼–è¾‘çš„å­æ ‘
// ä¸éœ€è¦åœ¨ phase 1 é‡ŒæŠ½å‡ºç‹¬ç«‹çš„ ValidationOwner æŽ¥å£
function createDraftOwner(parentForm: FormRuntime, rootPath: string): DraftOwner {
  const draftValue = getIn(parentForm.scope.value, rootPath);
  const draftRuntime = createManagedFormRuntime({
    initialValues: draftValue,
    validation: extractSubtreeValidation(parentForm.validation, rootPath),
    // ...
  });

  return {
    runtime: draftRuntime,
    commit() {
      const result = await draftRuntime.validateForm();
      if (!result.ok) return result;
      const committed = draftRuntime.scope.value;
      parentForm.setValue(rootPath, committed);
      // é€šçŸ¥ parent é‡éªŒ rootPath ç›¸å…³çš„æ‰€æœ‰ dependents
      await parentForm.revalidateSubtree(rootPath);
      return result;
    },
    cancel() {
      // ç›´æŽ¥ä¸¢å¼ƒ draftRuntimeï¼Œä¸å†™å›ž parent
    },
  };
}
```

è¿™ä¸ªå®žçŽ°èƒ½ç”¨çŽ°æœ‰ FormRuntime ç›´æŽ¥å®Œæˆï¼Œä¸å¼•å…¥æ–°æŠ½è±¡å±‚ã€‚

**é•¿æœŸæ–¹å‘ä¿ç•™**ï¼š`detail-field` / `detail-view` / dialog draft editing çš„è¯­ä¹‰ï¼Œæœ¬è´¨ä¸Šæ˜¯ owner boundary é—®é¢˜ã€‚phase 1 çš„"å¤ç”¨ FormRuntime"æ˜¯å®žçŽ°ç­–ç•¥ï¼Œä¸å¦å®š owner æŠ½è±¡æœ¬èº«çš„æ¼”è¿›æ–¹å‘ã€‚phase 3 å¼•å…¥ç‹¬ç«‹ draft owner æ—¶ï¼Œå¯ä»¥åœ¨æ­¤åŸºç¡€ä¸Šæå–å…¬å…±æŽ¥å£ï¼Œè€Œä¸æ˜¯æŽ¨ç¿»çŽ°æœ‰å®žçŽ°ã€‚

---

## 8. AMIS åŠ¨æ€æ³¨å†Œçš„æ­£ç¡®å€Ÿé‰´è¾¹ç•Œ

AMIS çš„åŠ¨æ€æ³¨å†Œæœ‰ä¸€ä¸ªæœ¬è´¨ä¼˜åŠ¿ï¼š**"å½“å‰å“ªäº›å­—æ®µå‚ä¸ŽéªŒè¯"ç”± React mount è‡ªåŠ¨ç»´æŠ¤ï¼Œä¸éœ€è¦é¢å¤–é€»è¾‘**ã€‚

è¿™ä¸ªä¼˜åŠ¿æ˜¯çœŸå®žçš„ï¼Œåº”è¯¥å€Ÿé‰´ã€‚ä½† AMIS èµ°è¿‡äº†å¤´ï¼šå®ƒè®©å­—æ®µ mount æˆä¸º **å”¯ä¸€** çš„è§„åˆ™å‘çŽ°æœºåˆ¶ï¼Œå¯¼è‡´ï¼š

1. æ— æ³•è¡¨è¾¾å¼åŒ–è§„åˆ™å‚æ•°ï¼ˆè§„åˆ™åœ¨ mount æ—¶å·²å›ºåŒ–ï¼‰
2. æ— æ³•åœ¨ React å¤–éƒ¨æµ‹è¯•éªŒè¯é€»è¾‘
3. è·¨å­—æ®µä¾èµ–å˜åŒ–æ—¶æ²¡æœ‰è‡ªåŠ¨é‡éªŒæœºåˆ¶ï¼ˆéœ€è¦æ¯ä¸ªæŽ§ä»¶æ‰‹å·¥å¤„ç†ï¼‰

**æ­£ç¡®çš„å€Ÿé‰´æ–¹å¼**æ˜¯æœ¬æ–‡ Section 5 çš„ FormFieldRegistry æ–¹æ¡ˆï¼š

|                         | AMIS                             | æœ¬æ–¹æ¡ˆ                       | è¯´æ˜Ž      |
| ----------------------- | -------------------------------- | ------------------------------- | ----------- |
| æ´»è·ƒå­—æ®µé›†åˆç»´æŠ¤ | FormItemStore mount/unmount      | FormFieldRegistry mount/unmount | å€Ÿé‰´      |
| è§„åˆ™å®šä¹‰            | mount æ—¶ä¼ å…¥ config           | ç¼–è¯‘æœŸ CompiledRuleTemplate  | ä¸å€Ÿé‰´    |
| è§„åˆ™æ‰§è¡Œ            | doValidate(values, value, rules) | materialize â†’ Layer 0         | çº¯åŒ–      |
| è¡¨è¾¾å¼åŒ–è§„åˆ™       | ä¸æ”¯æŒ                          | CompiledRuntimeValue            | æ–°å¢ž      |
| è·¨å­—æ®µä¾èµ–          | æ— è‡ªåŠ¨æœºåˆ¶                  | dependents å›¾è‡ªåŠ¨é‡éªŒ       | ä¿ç•™ä¼˜åŠ¿ |

---

## 9. å®žæ–½è·¯å¾„ï¼ˆåˆ†é˜¶æ®µï¼‰

### Phase 1: è¡¨è¾¾å¼åŒ–è§„åˆ™ï¼ˆç‹¬ç«‹å¯äº¤ä»˜ï¼Œä¸ç ´åçŽ°æœ‰ä»£ç ï¼‰

**ç›®æ ‡**ï¼šè®© `required`ã€`minLength`ã€`maxLength`ã€`pattern`ã€`message` æ”¯æŒè¡¨è¾¾å¼å­—ç¬¦ä¸²ã€‚

**å˜æ›´èŒƒå›´**ï¼š

1. `flux-core/src/types/validation.ts`ï¼šæ–°å¢ž `CompiledRuleTemplate` ç±»åž‹ï¼Œ`CompiledValidationRule` ä¿æŒä¸å˜
2. `flux-runtime/src/validation/rules.ts`ï¼š`collectSchemaValidationRules()` æ–°å¢žé‡è½½ï¼ŒæŽ¥å— `ExpressionCompiler`ï¼Œå¯¹éžçº¯å­—é¢é‡è°ƒç”¨ `compiler.compileValue()`
3. `flux-runtime/src/form-runtime-validation.ts`ï¼š`validateCompiledField()` åœ¨æ‰§è¡Œå‰å…ˆè°ƒç”¨ `materializeRuleTemplate()`
4. `flux-core/src/validation-model.ts`ï¼š`buildCompiledValidationDependentMap()` åˆå¹¶ `expressionDependencyPaths`
5. `flux-react/src/form-state.ts`ï¼š`isFieldEffectivelyRequired()` æ”¹ä¸ºè°ƒç”¨ç»Ÿä¸€ materialize ç»“æžœ

**å‘ä¸‹å…¼å®¹**ï¼šæ‰€æœ‰çŽ°æœ‰é™æ€è§„åˆ™èµ°å¿«é€Ÿè·¯å¾„ï¼ˆ`when: undefined`ï¼Œé™æ€ argsï¼‰ï¼Œä¸è°ƒç”¨ `evaluateCompiledValue()`ï¼Œä¸ŽçŽ°æœ‰è¡Œä¸ºå®Œå…¨ç­‰ä»·ã€‚

**éªŒæ”¶**ï¼š

- `required: "${role === 'admin'}"` â€” role å˜åŒ–æ—¶ required çŠ¶æ€éšä¹‹æ›´æ–°å¹¶è§¦å‘é‡éªŒ
- `minLength: "${policy.min}"` â€” policy å˜åŒ–æ—¶è§„åˆ™é˜ˆå€¼è‡ªåŠ¨æ›´æ–°
- æ‰€æœ‰çŽ°æœ‰é™æ€è§„åˆ™æµ‹è¯•é€šè¿‡

### Phase 2: FormFieldRegistryï¼ˆç»Ÿä¸€æ´»è·ƒå­—æ®µç®¡ç†ï¼‰

**ç›®æ ‡**ï¼š`validateForm()` éåŽ†åŸºäºŽ registryï¼Œæ¶ˆé™¤ compiled order ä¸Ž dynamic registration çš„åŒé‡éåŽ†é€»è¾‘ã€‚

**å˜æ›´èŒƒå›´**ï¼š

1. `flux-runtime/src/form-runtime.ts`ï¼šå°† `hiddenFields: Set<string>` æ‰©å±•ä¸º `FormFieldRegistry`
2. `notifyFieldHidden()` æ”¹ä¸º `registry.register(path, { visible })`ï¼ˆè¡Œä¸ºç­‰ä»·ï¼‰
3. `validateForm()` æ”¹ä¸º Section 5.4 çš„ç®€åŒ–ç‰ˆæœ¬
4. å„ field renderer çš„ `useEffect` ä»Ž `notifyFieldHidden` åˆ‡æ¢åˆ° `registry.register`

**è¿™ä¸ªé˜¶æ®µè§£å†³çš„æ ¸å¿ƒé—®é¢˜**ï¼š`if`/`variant` ä¸­çš„å­—æ®µåœ¨å½“å‰ç‰ˆæœ¬å¯èƒ½è¢«éªŒè¯ï¼ˆå³ä½¿ hiddenï¼‰ï¼Œéœ€è¦æ‰‹å·¥ `notifyFieldHidden` æ¥è·³è¿‡ã€‚Phase 2 åŽï¼ŒæœªæŒ‚è½½çš„å­—æ®µå¤©ç„¶ä¸åœ¨ registry ä¸­ï¼Œ`validateForm()` ä¸ä¼šéåŽ†å®ƒä»¬ã€‚

### Phase 3: Draft Ownerï¼ˆæŒ‰éœ€å®žçŽ°ï¼‰

ä½¿ç”¨ Section 7 æè¿°çš„æ–¹æ¡ˆï¼šç›´æŽ¥å¤ç”¨ `createManagedFormRuntime()`ï¼Œphase 1 ä¸æ–°å¢žç‹¬ç«‹ `ValidationOwner` public APIã€‚å¦‚æžœåŽç»­å‡ºçŽ°å¤šç§ owner ç±»åž‹ï¼Œå†åœ¨æ­¤åŸºç¡€ä¸Šæå–å…¬å…±æŽ¥å£ã€‚

---

## 10. ä¸åšä»€ä¹ˆï¼ˆåŒæ ·é‡è¦ï¼‰

**phase 1 ä¸å¼•å…¥ç‹¬ç«‹ `ValidationOwner` public API**ï¼š`FormRuntime` åœ¨ phase 1 ä¸­æ‰¿æ‹… owner çš„è§’è‰²å·²ç»è¶³å¤Ÿã€‚å¼•å…¥æ–°çš„ `ValidationOwner` æŽ¥å£å¹¶è®© `FormRuntime` å®žçŽ°å®ƒï¼Œåœ¨ç¬¬ä¸€ç‰ˆé‡Œåªæ˜¯å¢žåŠ é—´æŽ¥å±‚ï¼Œæ²¡æœ‰å®žè´¨æ”¶ç›Šã€‚ä½†è®¾è®¡ä¸Šä¿ç•™ owner æŠ½è±¡çš„æ¼”è¿›æ–¹å‘â€”â€”å¦‚æžœæœªæ¥å‡ºçŽ°å¤šç§ owner ç±»åž‹ï¼ˆå¦‚ç‹¬ç«‹ draft ownerã€nested form ownerï¼‰ï¼Œé‚£æ—¶å†æå–å…¬å…±æŽ¥å£ï¼Œè€Œä¸æ˜¯çŽ°åœ¨é¢„é˜²æ€§åœ°å»ºå‡ºæ¥ã€‚

**phase 1 ä¸å•ç‹¬å®žçŽ°å®Œæ•´ Active Instance Graph**ï¼š`if`/`loop`/`array-field` çš„ leaf field å‚ä¸ŽçŠ¶æ€ç”± React mount é©±åŠ¨çš„ registry éšå¼ç»´æŠ¤ï¼›aggregate/variant-root ç­‰ç»“æž„èŠ‚ç‚¹çš„å‚ä¸ŽçŠ¶æ€æ¥è‡ª compiled field treeã€‚phase 1 ä»¥ä¸¤è€…åä½œä»£æ›¿ç‹¬ç«‹ active instance graph è®¡ç®—ï¼Œphase 3 å¼•å…¥å®Œæ•´ owner ç¼–æŽ’æ—¶å†æŒ‰éœ€è¯„ä¼°ã€‚

**ä¸å¼•å…¥ `OwnerPathMapper`ï¼ˆlocal/absolute åŒè·¯å¾„ï¼‰**ï¼šdraft owner å†…éƒ¨å¯ä»¥ç”¨ `rootPath` åšè·¯å¾„å‰ç¼€è®¡ç®—ï¼Œä¸éœ€è¦æ˜¾å¼ mapper å¯¹è±¡ã€‚

**ä¸æŠŠ loop å’Œ array-field çš„ template å±•å¼€åšæˆç¼–è¯‘æœŸå›¾**ï¼šarray item çš„ indexed è·¯å¾„ï¼ˆ`items.0.name`ï¼‰æ˜¯è¿è¡Œæ—¶æ‰çŸ¥é“çš„ï¼Œè®© renderer mount æ—¶å‘ registry æ³¨å†Œå³å¯ã€‚ç¼–è¯‘æœŸåªä¿å­˜ item template çš„ç»“æž„æè¿°ï¼Œä¸å±•å¼€å…·ä½“ indexed pathsã€‚

**ä¸åˆ é™¤ `runtimeFieldRegistrations` çš„ validate å›žè°ƒ**ï¼šå¤æ‚æŽ§ä»¶ï¼ˆå¦‚å¯Œæ–‡æœ¬ã€æ–‡ä»¶ä¸Šä¼ ã€è‡ªå®šä¹‰ UIï¼‰æ— æ³•ç”¨ rule template è¡¨è¾¾çš„éªŒè¯é€»è¾‘ï¼Œä»éœ€é»‘ç›’ validate å›žè°ƒã€‚è¿™æ˜¯å¿…è¦çš„ escape hatchï¼Œä¸æ˜¯è®¾è®¡ç¼ºé™·ã€‚

---

## 12. Field Tree æ¨¡åž‹

è¿™æ˜¯åœ¨ä¸Šä¸€è½®è®¨è®ºä¸­æ˜Žç¡®éœ€è¦è¡¥å……çš„å†…å®¹ã€‚**å½“å‰è®¾è®¡æ–‡æ¡£ï¼ˆåŒ…æ‹¬ owner-redesign-draftï¼‰å’Œä»£ç åº“é‡Œéƒ½æ²¡æœ‰ä¸€ä»½æ¸…æ™°çš„ field tree æ¨¡åž‹å®šä¹‰ã€‚**

### 12.1 ä¸ºä»€ä¹ˆéœ€è¦ Field Tree

å¦‚æžœåªæœ‰ "flat path â†’ rules" æ˜ å°„ï¼Œå°±å¾ˆéš¾ç¨³å®šè¡¨è¾¾ï¼š

- `object-field` / `array-field` çš„çˆ¶å­ç»“æž„è¾¹ç•Œ
- subtree validation éåŽ†æ—¶çš„æ‹“æ‰‘é¡ºåº
- aggregate ancestor è‡ªåŠ¨ä¼ æ’­ï¼ˆ`contacts.0.email` å˜åŒ– â†’ `contacts` aggregate éœ€é‡éªŒï¼‰
- `if`/`variant-field` çš„åˆ†æ”¯ç»“æž„å½’å±ž
- `loop`/`array-field` çš„ repeated item template è¾¹ç•Œ
- ç¼–è¯‘æœŸç»„ä»¶æ³¨å†Œé’©å­çš„æŒ‚æŽ¥ç‚¹ï¼ˆç¬¬ 13 èŠ‚ï¼‰

å› æ­¤ï¼Œ**å¯¹å¤–æŸ¥è¯¢ä»ç„¶å¯ä»¥æ˜¯ flat absolute pathï¼Œä½†ç¼–è¯‘äº§ç‰©å†…éƒ¨å¿…é¡»æœ‰ä¸€ä»½ field tree ç»“æž„**ã€‚

### 12.2 ä¸‰å±‚æ¨¡åž‹çš„æ˜Žç¡®åˆ†å·¥

è¿™æ˜¯æœ¬æ–‡ Section 1.1 ç»“è®ºçš„ç»“æž„åŒ–å±•å¼€ï¼š

```ts
// Layer Aï¼šç¼–è¯‘æœŸç»“æž„æ¨¡åž‹ï¼ˆæ¥è‡ª schema ç¼–è¯‘ï¼Œimmutable è¿è¡Œæ—¶ï¼‰
interface CompiledFieldTreeNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'form';
  parent?: string;
  children: string[]; // ç›´æŽ¥å­èŠ‚ç‚¹ paths
  ruleTemplates: CompiledRuleTemplate[]; // æœ¬èŠ‚ç‚¹çš„è§„åˆ™æ¨¡æ¿
}

// Layer Bï¼šè¿è¡Œæ—¶å®žä¾‹çŠ¶æ€ï¼ˆç”± React mount/unmount é©±åŠ¨ï¼‰
interface FieldRegistrationState {
  path: string;
  mounted: boolean; // æ˜¯å¦å½“å‰å·²æŒ‚è½½
  visible: boolean; // å½“å‰ visible è¡¨è¾¾å¼æ±‚å€¼ç»“æžœ
  disabled: boolean;
}

// Layer Cï¼šéªŒè¯ç»“æžœçŠ¶æ€ï¼ˆç”± ValidationEngine ç»´æŠ¤ï¼‰
interface FieldValidationState {
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

ä¸‰å±‚éƒ½ç”¨ flat absolute path ä½œä¸º keyï¼Œä½†è¯­ä¹‰ä¸Š Layer A å½¢æˆä¸€æ£µæ ‘ã€‚

### 12.3 Field Tree ä¸Ž Flat Path çš„å…³ç³»

è¿™ä¸æ˜¯å›žåˆ°åµŒå¥— runtime graphã€‚æŽ¨èå®žçŽ°ï¼š

- `nodes: Record<string, CompiledFieldTreeNode>` â€” flat mapï¼ŒO(1) æŸ¥è¯¢
- `parent` / `children` å­—æ®µä¿ç•™æ ‘å…³ç³»ï¼ŒæŒ‰éœ€éåŽ†
- `validationOrder: string[]` â€” å·²æ‹“æ‰‘æŽ’åºçš„éåŽ†é¡ºåºï¼Œleaf-before-ancestor

```ts
// ç¼–è¯‘äº§ç‰©ç»“æž„
interface CompiledValidationModel {
  rootPath: string;
  nodes: Record<string, CompiledFieldTreeNode>;
  validationOrder: string[]; // leaf first, aggregate last
  dependents: Record<string, string[]>; // path â†’ å“ªäº›è·¯å¾„ä¾èµ–å®ƒ
}
```

ä¸Ž `owner-redesign-draft.md` ä¸­çš„ `CompiledValidationPath` ç›¸æ¯”ï¼Œå…³é”®å·®å¼‚æ˜¯å¢žåŠ äº† `kind` æžšä¸¾ä¸­çš„ `variant-root` / `branch`ï¼Œä»¥åŠæŠŠ `ruleTemplates`ï¼ˆè¡¨è¾¾å¼åŒ–ç‰ˆæœ¬ï¼‰ç›´æŽ¥å†…è”åœ¨èŠ‚ç‚¹ä¸­ã€‚

### 12.4 å½“å‰å®žçŽ°çš„æ˜ å°„

| å½“å‰ä»£ç                                         | æ–°æ¨¡åž‹å½’å±ž                     | éœ€è¦å˜åŒ–                                                                  |
| ------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `CompiledValidationNode` in `validation-model.ts` | `CompiledFieldTreeNode`             | å¢žåŠ  `kind`ï¼ˆvariant-root/branchï¼‰ï¼Œ`ruleTemplates` æ›¿ä»£çŽ°æœ‰ rules |
| `hiddenFields: Set<string>`                       | `FieldRegistrationState.visible`    | æ‰©å±•ä¸ºå®Œæ•´ registryï¼ˆPhase 2ï¼‰                                       |
| `runtimeFieldRegistrations`                       | ä¸Ž `FieldRegistrationState` å…±å­˜ | ä¿ç•™ validate å›žè°ƒï¼Œåˆ†ç¦»å­˜åœ¨æ€§èŒè´£                                |
| `ValidationError[]` per path                      | `FieldValidationState`              | çŽ°æœ‰ç»“æž„åŸºæœ¬å¯¹åº”ï¼Œæ— å¤§å˜åŒ–                                      |

### 12.5 Variant-Root ä¸Ž Branch èŠ‚ç‚¹çš„ç‰¹æ®Šè¯­ä¹‰

`variant-root` å’Œ `branch` èŠ‚ç‚¹ä¸ç›´æŽ¥æŒæœ‰ field valueï¼Œä½†åœ¨ field tree ä¸­å¿…é¡»å­˜åœ¨ï¼ŒåŽŸå› ï¼š

- subtree validation éåŽ†æ—¶éœ€è¦çŸ¥é“"å“ªäº› children å±žäºŽå½“å‰ active branch"
- åˆ†æ”¯åˆ‡æ¢æ—¶éœ€è¦çŸ¥é“"å“ªä¸ª branch-root ä¸‹çš„å­æ ‘éœ€è¦æ¸…é™¤ errors/validating"
- ç¼–è¯‘æœŸä¾èµ–å›¾ä¸­ `if`/`variant` guard expression çš„ä¾èµ–éœ€è¦ç»‘å®šåˆ° branch-root èŠ‚ç‚¹

```ts
// variant-root ç¤ºä¾‹
{
  path: 'contactMethod',
  kind: 'variant-root',
  parent: undefined,
  children: ['contactMethod::email', 'contactMethod::phone'],
  ruleTemplates: []   // variant-root æœ¬èº«é€šå¸¸æ— ç›´æŽ¥è§„åˆ™
}

// branch ç¤ºä¾‹
{
  path: 'contactMethod::email',
  kind: 'branch',
  parent: 'contactMethod',
  children: ['contactMethod.email', 'contactMethod.emailConfirm'],
  ruleTemplates: []
}
```

Branch path ä½¿ç”¨ `::` åˆ†éš”ç¬¦ï¼ˆéž value pathï¼‰ï¼Œå› ä¸º branch ä¸å¯¹åº” value tree ä¸­çš„ä¸€ä¸ª keyï¼Œåªæ˜¯ç»“æž„åˆ†ç»„ã€‚è¿™ä¸ªè¡¨ç¤ºæ³•ä»…å­˜åœ¨äºŽç¼–è¯‘äº§ç‰©çš„ field tree ä¸­ï¼Œä¸æš´éœ²åˆ° ValidationError æˆ– owner APIã€‚

---

## 13. Compiler-Integrated Registration Hooks

è¿™æ˜¯ç”¨æˆ·æ˜Žç¡®æå‡ºä½†æ‰€æœ‰æ–‡æ¡£éƒ½æœªè½åœ°çš„ç¬¬äºŒä¸ªå…³é”®ç‚¹ã€‚

### 13.1 ä¸ºä»€ä¹ˆéœ€è¦ç¼–è¯‘æœŸé’©å­

å¦‚æžœåªæœ‰è¿è¡Œæ—¶ registrationï¼ˆmount æ—¶æ³¨å†Œï¼‰ï¼Œå°±å­˜åœ¨ä»¥ä¸‹é—®é¢˜ï¼š

- aggregate shapeï¼ˆ`uniqueBy` çš„ key è·¯å¾„ã€`allOrNone` çš„ field åˆ—è¡¨ï¼‰åœ¨ mount å‰æ— æ³•å»ºç«‹
- subtree validation æ‹“æ‰‘é¡ºåºä¾èµ– mount æ—¶æœºï¼Œæ— æ³•ç¨³å®šé¢„æµ‹
- `if`/`variant` çš„ guard expression ä¾èµ–æ— æ³•æå‰è¿›å…¥ä¾èµ–å›¾
- `loop`/`array-field` çš„ item template ç»“æž„åªæœ‰ mount åŽæ‰èƒ½åæŽ¨

Flux å·²ç»æœ‰ compiler å’Œ renderer definition ä½“ç³»ï¼Œå› æ­¤æ›´è‡ªç„¶çš„æ–¹å‘æ˜¯ï¼š**è®© renderer å£°æ˜Žç¼–è¯‘æœŸ collector hookï¼Œcompiler åœ¨é‡åˆ°æŸä¸ª `type` æ—¶è°ƒç”¨å®ƒï¼Œå‘ field tree / validation graph æ³¨å†Œç»“æž„å’Œè§„åˆ™**ã€‚

### 13.2 æŽ¨èæŽ¥å£å½¢çŠ¶

```ts
// æ¯ä¸ª renderer definition å¯ä»¥é€‰æ‹©æ€§åœ°å£°æ˜Žè¿™ä¸ª contribution
interface ValidationCompileContribution<S extends BaseSchema = BaseSchema> {
  // è¿™ä¸ªç»„ä»¶åœ¨ field tree ä¸­çš„èŠ‚ç‚¹ç±»åž‹
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'none';

  // æ”¶é›†æœ¬èŠ‚ç‚¹çš„ tree node ä¿¡æ¯ï¼ˆè·¯å¾„ã€ç»“æž„è§’è‰²ï¼‰
  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;

  // æ”¶é›†æœ¬èŠ‚ç‚¹çš„å­èŠ‚ç‚¹æè¿°
  // ç”¨äºŽ object-field æ˜¾å¼å£°æ˜Žå­å­—æ®µã€array-field å£°æ˜Ž item template
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];

  // æ”¶é›†æœ¬èŠ‚ç‚¹çš„ rule templatesï¼ˆæ”¯æŒè¡¨è¾¾å¼ï¼‰
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];

  // æ”¶é›†æœ¬èŠ‚ç‚¹å¼•å…¥çš„é¢å¤–ä¾èµ–è·¯å¾„
  // ä¾‹å¦‚ï¼švariant guard expression ä¾èµ–ï¼Œaggregate key-by è·¯å¾„
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}

// ç¼–è¯‘ä¸Šä¸‹æ–‡ï¼Œæä¾› compiler èƒ½åŠ›
interface ValidationCompileContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  path: string; // å½“å‰èŠ‚ç‚¹çš„ç»å¯¹è·¯å¾„
  parentPath?: string;
  compiler: ExpressionCompiler;
  compileValue<T>(raw: unknown): CompiledRuntimeValue<T>;
  extractDependencies(compiled: CompiledRuntimeValue<unknown>): string[];
}
```

### 13.3 Compiler è°ƒç”¨æ—¶åº

```
schema compiler éåŽ† schema tree
  â†“
é‡åˆ° type: "input-text"
  â†“
æŸ¥æ‰¾ rendererRegistry.getValidationContribution('input-text')
  â†“
è°ƒç”¨ contribution.collectNode(schema, ctx)   â†’ ç”Ÿæˆ CompiledFieldTreeNode
è°ƒç”¨ contribution.collectRules(schema, ctx)  â†’ ç”Ÿæˆ CompiledRuleTemplate[]
è°ƒç”¨ contribution.collectDependencies(...)   â†’ è¡¥å…… dependents
  â†“
æŒ‚å…¥ CompiledValidationModel.nodes
```

å¯¹äºŽ `array-field`ï¼š

```
é‡åˆ° type: "array-field"
  â†“
contribution.collectNode(schema, ctx)
  â†’ kind: 'array'
  â†’ path: 'contacts'
  â†’ children æš‚ç•™ç©ºï¼Œç”± collectChildren å¡«

contribution.collectChildren(schema, ctx)
  â†’ è¿”å›ž item template descriptorï¼ˆç›¸å¯¹è·¯å¾„ï¼Œä¸å±•å¼€å…·ä½“ indexed pathï¼‰
  â†’ ä¾‹å¦‚ï¼š{ templatePath: 'contacts[]', children: ['contacts[].email', ...] }

contribution.collectRules(schema, ctx)
  â†’ æ”¶é›† minItems / maxItems / uniqueByï¼ˆæ”¯æŒè¡¨è¾¾å¼ï¼‰
```

### 13.4 è¿è¡Œæ—¶ Hook ä»ç„¶ä¿ç•™

ç¼–è¯‘æœŸ hook å¹¶ä¸å–ä»£è¿è¡Œæ—¶ registrationï¼š

| èŒè´£                                  | ç¼–è¯‘æœŸ hook                      | è¿è¡Œæ—¶ hook             |
| -------------------------------------- | ----------------------------------- | ------------------------- |
| ç»“æž„å®šä¹‰ï¼ˆparent/children/kindï¼‰ | âœ“                                 | ä¸é€‚åˆï¼ˆæœª mountï¼‰    |
| é™æ€è§„åˆ™æ¨¡æ¿                        | âœ“                                 | ä¸é€‚åˆï¼ˆæœªçŸ¥è·¯å¾„ï¼‰ |
| ä¾èµ–å›¾ï¼ˆguard/aggregateï¼‰          | âœ“                                 | è¡¥å……ï¼ˆåŠ¨æ€è¦†ç›–ï¼‰   |
| indexed item å®žä¾‹åŒ–                 | ä¸é€‚åˆï¼ˆè¿è¡Œæ—¶æ‰çŸ¥é“æ•°é‡ï¼‰   | âœ“                       |
| visible/disabled çŠ¶æ€                 | ä¸é€‚åˆï¼ˆè¡¨è¾¾å¼è¿è¡Œæ—¶æ±‚å€¼ï¼‰ | âœ“                       |
| é»‘ç›’ validate å›žè°ƒ                 | ä¸é€‚åˆ                             | âœ“ï¼ˆescape hatchï¼‰     |
| dynamic rule overlay                   | ä¸é€‚åˆ                             | âœ“                       |

**ä¸¤è€…åä½œ**ï¼šç¼–è¯‘æœŸ hook å»ºç«‹é™æ€ field tree å’Œ rule templatesï¼›è¿è¡Œæ—¶ hook ç”¨ `FormFieldRegistry.register()` è¡¥å……å½“å‰ mounted çŠ¶æ€å’Œ indexed child pathsã€‚

### 13.5 ä¸Ž Section 5ï¼ˆFormFieldRegistryï¼‰çš„å…³ç³»

ç¼–è¯‘æœŸ hook è´Ÿè´£"å“ªäº›è·¯å¾„**å¯èƒ½**å­˜åœ¨"ï¼ˆCompiledFieldTreeNodeï¼‰ï¼Œè¿è¡Œæ—¶ registry è´Ÿè´£"å“ªäº›è·¯å¾„**å½“å‰**å­˜åœ¨"ï¼ˆFieldRegistrationStateï¼‰ã€‚ä¸¤è€…å½¢æˆäº’è¡¥ï¼š

- validateForm éåŽ†ï¼š`compiledOrder âˆ© registry.getRegisteredPaths()`ï¼ˆSection 5.4ï¼‰
- ç¼–è¯‘æœŸé’©å­æœªæ³¨å†Œçš„ pathï¼ˆå¦‚é»‘ç›’æŽ§ä»¶ï¼‰ï¼šåªé€šè¿‡ runtime registry å‚ä¸ŽéªŒè¯
- registry ä¸­å‡ºçŽ°ä½†ç¼–è¯‘æœŸæœªçŸ¥çš„ pathï¼ˆæžç«¯åŠ¨æ€æŽ§ä»¶ï¼‰ï¼šèµ° `runtimeFieldRegistrations.validate()` escape hatch

---

## 15. `validateField` çš„ Closure æ‰©å±•è¯­ä¹‰

> è¡¥å……è‡ª `owner-redesign-draft.md` Â§Local Validation Trigger Rulesï¼ŒERD Â§5.4 ä»…å®šä¹‰äº†å…¨é‡éåŽ†ï¼Œæ­¤å¤„è¡¥å……å±€éƒ¨è§¦å‘çš„æ‰©å±•è§„åˆ™ã€‚

### 15.1 é—®é¢˜

`validateField(path)` ä¸èƒ½åªéªŒè¯ `path` æœ¬èº«ã€‚ä»¥ä¸‹åœºæ™¯è¦æ±‚è‡ªåŠ¨æ‰©å±•éªŒè¯èŒƒå›´ï¼š

- `contacts.0.email` å˜åŒ– â†’ `contacts` çš„ `uniqueBy` aggregate rule ä¾èµ–è¯¥å€¼ï¼Œå¿…é¡»åŒæ­¥é‡éªŒ
- `startDate` å˜åŒ– â†’ `endDate` æœ‰è¡¨è¾¾å¼åŒ–è§„åˆ™ `min: "${startDate}"`ï¼Œ`endDate` çš„ required/min çŠ¶æ€å·²å¤±æ•ˆ
- `role` å˜åŒ– â†’ `permissions` æœ‰ `required: "${role === 'admin'}"` â†’ å¿…é¡»åŒæ­¥é‡éªŒ

å¦‚æžœåªéªŒè¯ç›´æŽ¥è§¦å‘çš„ pathï¼Œä¸Šè¿°åœºæ™¯ä¼šäº§ç”Ÿé”™è¯¯æ˜¾ç¤ºæ»žåŽæˆ–ä¸è§¦å‘çš„é—®é¢˜ã€‚

### 15.2 Closure è®¡ç®—è§„åˆ™

`FormRuntime.validateField(path, reason)` åœ¨æ‰§è¡Œå‰å¿…é¡»å…ˆè®¡ç®— **impacted closure**ï¼š

```ts
function computeImpactedClosure(
  changedPaths: string[],
  dependents: Record<string, string[]>, // æ¥è‡ª CompiledValidationModel
  aggregateAncestors: (path: string) => string[], // å‘ä¸Šæ‰¾ object/array aggregate node
  overlayDependents: (path: string) => string[], // æ¥è‡ª runtimeFieldRegistrations
): Set<string>;
```

closure åŒ…å«ï¼š

1. **direct paths**ï¼š`changedPaths` æœ¬èº«
2. **aggregate ancestors**ï¼šæ²¿ field tree å‘ä¸Šï¼Œç›´åˆ°é‡åˆ° `form` root æˆ– owner boundary ä¸ºæ­¢çš„æ‰€æœ‰ `object` / `array` ç±»åž‹ ancestor node
3. **expression dependents**ï¼š`dependents[path]` ä¸­æ‰€æœ‰å› è¡¨è¾¾å¼ä¾èµ–æ­¤ path çš„å­—æ®µï¼ˆé€’å½’å±•å¼€ä¸€å±‚ï¼Œä¸æ— é™é€’å½’ï¼‰
4. **dynamic overlay dependents**ï¼šé€šè¿‡ `runtimeFieldRegistrations` å£°æ˜Žäº†ä¾èµ–æ­¤ path çš„å¤æ‚æŽ§ä»¶

è®¡ç®—å®ŒæˆåŽï¼Œclosure å†…æ‰€æœ‰ **å½“å‰å·²æ³¨å†Œï¼ˆ`registry.isRegistered(path) === true`ï¼‰** çš„ path æ‰è¿›å…¥å®žé™…éªŒè¯ã€‚æœªæŒ‚è½½çš„ path ä¸å‚ä¸Žï¼Œå³ä½¿åœ¨ closure ä¸­ã€‚

### 15.3 `validateField` ä¼ªä»£ç 

```ts
async function validateField(
  path: string,
  reason: ValidationReason = 'change',
): Promise<ValidationResult> {
  const closure = computeImpactedClosure(
    [path],
    compiledModel.dependents,
    (p) => getAggregateAncestors(p, compiledModel),
    (p) => getOverlayDependents(p, runtimeFieldRegistrations),
  );

  const activeClosure = [...closure].filter((p) => registry.isRegistered(p));
  const ordered = orderByValidationPriority(activeClosure, compiledModel.validationOrder);

  for (const targetPath of ordered) {
    const effectiveRules = materializeRulesForPath(targetPath, scope, env);
    const syncErrors = runSyncRules(targetPath, effectiveRules);
    publishSyncErrors(targetPath, syncErrors);
    startAsyncRules(targetPath, effectiveRules, reason);
  }

  return summarizeResult(path);
}
```

å…³é”®ç‚¹ï¼š

- `validateField` å¯¹å¤–ä»ä»¥ `path` ä¸ºå‚æ•°ï¼Œè¿”å›žè¯¥ path çš„ç»“æžœ
- ä½†å†…éƒ¨æ‰©å±•åˆ° closureï¼Œä¿è¯ aggregate å’Œ expression dependent ä¸æ»žåŽ
- `reason` å½±å“ async debounce ç­–ç•¥ï¼ˆ`change` å¯ debounceï¼Œ`submit` ä¸å¯ï¼‰

### 15.4 `validateSubtree` ä¸Ž closure çš„å…³ç³»

`validateSubtree(path)` å·²ç»æ˜¯"éåŽ† path ä¸‹æ‰€æœ‰ active descendants"ï¼Œä¸éœ€è¦é¢å¤– closure æ‰©å±•ï¼Œä½†ä»éœ€è¦æŠŠ subtree å¤–çš„ aggregate ancestor å’Œ expression dependent çº³å…¥ã€‚

æŽ¨èï¼š`validateSubtree(path)` åœ¨éåŽ†å®Œ subtree åŽï¼Œå¯¹ `path` æœ¬èº«å†æ‰§è¡Œä¸€æ¬¡ closure æ‰©å±•ï¼ŒæŠŠ subtree å¤–çš„ä¾èµ–æ–¹ä¹Ÿçº³å…¥æœ¬è½®éªŒè¯ã€‚

---

## 16. Async Validation Run Ownership æ¨¡åž‹

> è¡¥å……è‡ª `owner-redesign-draft.md` Â§Async Validation Semanticsï¼ŒERD Â§9 Phase 1 ä»…æåˆ° debounceï¼Œæ­¤å¤„è¡¥å…… stale run å¤±æ•ˆå’Œ run ownership çš„å®Œæ•´è§„åˆ™ã€‚

### 16.1 é—®é¢˜

å¼‚æ­¥éªŒè¯ï¼ˆå¦‚è¿œç¨‹å”¯ä¸€æ€§æ ¡éªŒï¼‰å­˜åœ¨ä»¥ä¸‹ç«žæ€é—®é¢˜ï¼š

- ç”¨æˆ·å¿«é€Ÿè¾“å…¥è§¦å‘å¤šæ¬¡ async runï¼Œæ—§ run çš„ç»“æžœä¸åº”è¦†ç›–æ–° run
- å­—æ®µè¢«éšè—æˆ– variant åˆ‡æ¢åŽï¼Œin-flight run çš„ç»“æžœä¸åº”å†™å›ž
- `submit` è§¦å‘æ—¶ï¼Œæ­£åœ¨ debounce ç­‰å¾…çš„ change run åº”ç«‹å³å–æ¶ˆå¹¶é‡æ–°ä»¥ `submit` reason è¿è¡Œ

### 16.2 Run è®°å½•ç»“æž„

`ValidationEngine` å†…éƒ¨ä¸ºæ¯ä¸ª in-flight async run ç»´æŠ¤ï¼š

```ts
interface AsyncValidationRun {
  path: string;
  ruleId: string;
  reason: ValidationReason;
  runId: string; // æ¯æ¬¡å¯åŠ¨ç”Ÿæˆæ–° UUID
  ownerEpoch: number; // owner ç»“æž„å˜åŒ–æ—¶é€’å¢žï¼Œç”¨äºŽæ‰¹é‡å¤±æ•ˆ
  abort(): void; // å–æ¶ˆ in-flight è¯·æ±‚
}
```

### 16.3 Run å¯åŠ¨è§„åˆ™

å¯åŠ¨æ–° async run æ—¶ï¼š

1. ç”Ÿæˆæ–° `runId`
2. æŸ¥æ‰¾åŒ `path + ruleId` çš„çŽ°æœ‰ runï¼Œè‹¥å­˜åœ¨åˆ™è°ƒç”¨ `abort()` å¹¶ä»Žè®°å½•ä¸­ç§»é™¤
3. æ³¨å†Œæ–° runï¼Œè®¾ç½®è¯¥ path çš„ `validating: true`
4. ç­‰å¾…å¼‚æ­¥ç»“æžœ

ç»“æžœè¿”å›žæ—¶ï¼Œå†™å›žå‰å¿…é¡»éªŒè¯ï¼š

```ts
if (
  currentRun.runId !== latestRunIdFor(path, ruleId) ||
  !registry.isRegistered(path) ||
  currentRun.ownerEpoch !== owner.currentEpoch
) {
  return; // stale runï¼Œä¸¢å¼ƒç»“æžœ
}
```

åªæœ‰ä¸‰ä¸ªæ¡ä»¶å…¨éƒ¨æ»¡è¶³ï¼Œæ‰å°†é”™è¯¯å†™å›žå¹¶è®¾ç½® `validating: false`ã€‚

### 16.4 Submit å¯¹ Debounce çš„è¦†ç›–

`validateForm()` åœ¨ `reason === 'submit'` æ—¶ï¼š

1. å–æ¶ˆæ‰€æœ‰ä»åœ¨ debounce ç­‰å¾…çš„ change/blur run
2. å¯¹æ‰€æœ‰ active path é‡æ–°ä»¥ `reason: 'submit'` å¯åŠ¨ async runï¼ˆä¸ debounceï¼‰
3. `await` æ‰€æœ‰ submit-required async run å®ŒæˆåŽæ‰è¿”å›žç»“æžœ

è¿™ä¿è¯ submit æ—¶çœ‹åˆ°çš„æ˜¯æœ€æ–°è¾“å…¥è§¦å‘çš„éªŒè¯ç»“æžœï¼Œè€Œä¸æ˜¯è¢« debounce å»¶è¿Ÿçš„æ—§ç»“æžœã€‚

### 16.5 Path å¤±æ´»æ—¶çš„ Run å¤±æ•ˆ

ä»¥ä¸‹æƒ…å†µå¿…é¡»ç«‹å³å¤±æ•ˆï¼ˆabort + ä¸¢å¼ƒç»“æžœï¼‰ç›¸å…³ path çš„æ‰€æœ‰ in-flight async runï¼š

| äº‹ä»¶                                              | å—å½±å“èŒƒå›´                               |
| --------------------------------------------------- | ------------------------------------------- |
| `registry.unregister(path)`                         | è¯¥ path çš„æ‰€æœ‰ run                      |
| `if` åˆ†æ”¯åˆ‡æ¢ï¼ˆå¤±æ´»åˆ†æ”¯ renderer unmountï¼‰ | å¤±æ´»åˆ†æ”¯ä¸‹æ‰€æœ‰ path çš„ run          |
| `variant-field` åˆ‡æ¢                               | æ—§ branch ä¸‹æ‰€æœ‰ path çš„ run           |
| array row åˆ é™¤                                    | è¯¥ row indexed path ä¸‹æ‰€æœ‰ path çš„ run |
| draft owner cancel/dispose                          | draft owner å†…æ‰€æœ‰ path çš„ run          |

å®žçŽ°ä¸Šï¼Œ`owner.currentEpoch` åœ¨å‘ç”Ÿ array remove / variant switch / owner dispose ç­‰ç»“æž„å˜åŒ–æ—¶é€’å¢žï¼Œæ‰€æœ‰ pre-epoch run åœ¨ç»“æžœè¿”å›žæ—¶å›  epoch ä¸åŒ¹é…è€Œè¢«ä¸¢å¼ƒï¼Œæ— éœ€é€ä¸€ abortã€‚

Phase 1 ä¸åš run çš„ path remapï¼ˆå¦‚ array reorder åŽæŠŠ `items.1` çš„ run é‡æ˜ å°„åˆ° `items.0`ï¼‰ï¼Œç›´æŽ¥ abort å¹¶åœ¨æ–° path ä¸Šé‡æ–°è§¦å‘éªŒè¯ã€‚

---

## 17. ç»“æž„å˜åŒ–çš„å‰¯ä½œç”¨æ¸…ç†è¯­ä¹‰

> è¡¥å……è‡ª `owner-redesign-draft.md` Â§variant-field æ‰§è¡Œæ¨¡åž‹ å’Œ Â§array-field æ‰§è¡Œæ¨¡åž‹ï¼ŒERD å¯¹è¿™ç±»åœºæ™¯çš„çŠ¶æ€æ¸…ç†æè¿°ä¸è¶³ã€‚

### 17.1 é—®é¢˜

å½“å­—æ®µç»“æž„å‘ç”Ÿå˜åŒ–æ—¶ï¼ˆvariant åˆ‡æ¢ã€array row å¢žåˆ ã€`if` åˆ†æ”¯åˆ‡æ¢ï¼‰ï¼Œå¿…é¡»åŒæ­¥æ¸…ç†ç›¸å…³çŠ¶æ€ï¼Œå¦åˆ™ä¼šå‡ºçŽ°ï¼š

- æ—§ variant branch çš„é”™è¯¯ä¿¡æ¯æ®‹ç•™åœ¨æ–° branch çš„æ˜¾ç¤ºä½ç½®
- array row åˆ é™¤åŽ indexed path çš„ `validating: true` æ®‹ç•™
- `if` åˆ†æ”¯åˆ‡æ¢åŽæ—§åˆ†æ”¯å­—æ®µçš„é”™è¯¯å½±å“ submit gate

### 17.2 Variant Switch æ¸…ç†åºåˆ—

å½“ `variant-field` çš„æ¿€æ´» branch åˆ‡æ¢æ—¶ï¼Œ`FormRuntime` å¿…é¡»æŒ‰ä»¥ä¸‹é¡ºåºæ‰§è¡Œï¼š

1. **å¤±æ´»æ—§ branch**ï¼šä»Ž active path set ä¸­ç§»é™¤æ—§ branch ä¸‹æ‰€æœ‰ pathï¼ˆé€šè¿‡ renderer unmount é©±åŠ¨ registry unregister å®Œæˆï¼‰
2. **æ¸…ç†æ—§ branch çŠ¶æ€**ï¼š
   - æ¸…é™¤æ—§ branch æ‰€æœ‰ path çš„ `errors`
   - æ¸…é™¤æ—§ branch æ‰€æœ‰ path çš„ `validating` çŠ¶æ€
   - abort æ—§ branch æ‰€æœ‰ in-flight async runï¼ˆÂ§16.5ï¼‰
   - æ¸…é™¤æ—§ branch æ‰€æœ‰ path çš„ materialization cache
3. **æ¿€æ´»æ–° branch**ï¼šæ–° branch renderer mount â†’ registry registerï¼ˆè‡ªåŠ¨å®Œæˆï¼‰
4. **è§¦å‘æ–° branch åˆå§‹éªŒè¯**ï¼š`validateSubtree(variantRoot, 'change')` æˆ–è‡³å°‘éªŒè¯æ–° branch çš„ required/aggregate

é»˜è®¤ç­–ç•¥ï¼š

- æ—§ branch çš„ **å€¼** å¯ä»¥ä¿ç•™ï¼ˆä¸å¼ºåˆ¶ clearï¼‰ï¼Œä½†æ—§ branch å­—æ®µä¸å‚ä¸Ž submit gate
- submit æ—¶åªéªŒè¯å½“å‰ active branch

### 17.3 Array Row åˆ é™¤/æ’å…¥/é‡æŽ’çš„çŠ¶æ€ Remap

Array row åˆ é™¤åŽï¼Œindexed path å‘ç”Ÿåç§»ï¼ˆå¦‚åˆ é™¤ `items.0` åŽï¼Œ`items.1` å˜ä¸º `items.0`ï¼‰ã€‚æ­¤æ—¶å¿…é¡»å¯¹ä»¥ä¸‹çŠ¶æ€æ‰§è¡Œ index remapï¼š

| çŠ¶æ€                           | Remap æ–¹å¼                                |
| ------------------------------- | ------------------------------------------ |
| `errors` per path               | æŒ‰æ–° index é‡æ–°æ˜ å°„ key               |
| `validating` per path           | æŒ‰æ–° index é‡æ–°æ˜ å°„ key               |
| `touched` / `dirty` / `visited` | æŒ‰æ–° index é‡æ–°æ˜ å°„ key               |
| `materialization cache`         | å¤±æ•ˆå—å½±å“ index åŠä»¥åŽçš„æ‰€æœ‰ cache |
| in-flight async run             | **ä¸ remap**ï¼Œç›´æŽ¥ abortï¼ˆÂ§16.5ï¼‰    |

Phase 1 çš„ remap ç­–ç•¥ï¼š

- delete row `i`ï¼šå°† `i+1..n-1` çš„çŠ¶æ€å…¨éƒ¨å‘å‰ç§»ä¸€ä½ï¼Œ`n-1` çš„çŠ¶æ€æ¸…ç©º
- insert row at `i`ï¼šå°† `i..n-1` çš„çŠ¶æ€å…¨éƒ¨å‘åŽç§»ä¸€ä½ï¼Œ`i` åˆå§‹åŒ–ä¸ºç©ºçŠ¶æ€
- reorderï¼ˆswap i/jï¼‰ï¼šäº¤æ¢å¯¹åº” index çš„æ‰€æœ‰çŠ¶æ€ key

Remap å®ŒæˆåŽï¼Œæ‰§è¡Œï¼š

```ts
applyChangesAndRevalidate({
  writes: { [arrayPath]: newArrayValue },
  changedPaths: [arrayPath],
  reason: 'system',
});
```

è§¦å‘ array aggregate ruleï¼ˆ`minItems` / `maxItems` / `uniqueBy`ï¼‰é‡éªŒã€‚

### 17.4 `if` åˆ†æ”¯åˆ‡æ¢

`if` åˆ†æ”¯åˆ‡æ¢ç”± React reconciler è‡ªåŠ¨å¤„ç†ï¼šå¤±æ´»åˆ†æ”¯çš„ renderer unmount â†’ `registry.unregister` â†’ ä»Žæ´»è·ƒå­—æ®µé›†åˆæ¶ˆå¤±ã€‚

`FormRuntime` éœ€è¦ç›‘å¬ registry çš„ unregister äº‹ä»¶ï¼Œåœ¨ path unregister æ—¶ï¼š

1. æ¸…é™¤è¯¥ path çš„ `errors` / `validating`
2. abort è¯¥ path çš„ in-flight async run
3. æ¸…é™¤è¯¥ path çš„ materialization cache
4. è‹¥è¯¥ path æœ‰ aggregate ancestorï¼Œå°† ancestor åŠ å…¥ä¸‹æ¬¡ closure æ‰©å±•ï¼ˆè§¦å‘ aggregate é‡éªŒï¼‰

æ³¨æ„ï¼š`if` åˆ†æ”¯çš„å€¼ clear ç­–ç•¥ï¼ˆ`clearValueWhenHidden`ï¼‰å±žäºŽ FormRuntime UX å±‚å†³ç­–ï¼Œä¸åœ¨æœ¬èŠ‚è®¨è®ºèŒƒå›´ã€‚

---

## 14. æ–‡æ¡£å…³è”

| æ–‡æ¡£                                                             | å…³ç³»                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/architecture/form-validation.md`                             | å½“å‰è§„èŒƒåŸºçº¿ï¼›Phase 1-2 å®ŒæˆåŽéœ€æ›´æ–°                                                                                                                                                                                                                     |
| `docs/analysis/2026-04-11-form-validation-owner-redesign-draft.md` | æ¦‚å¿µå‚è€ƒï¼›Field Tree Modelï¼ˆÂ§12ï¼‰å’Œ Compiler Hooksï¼ˆÂ§13ï¼‰æ–¹å‘æœ¬æ–‡é‡‡çº³ï¼›closure æ‰©å±•ï¼ˆÂ§15ï¼‰ã€async run ownershipï¼ˆÂ§16ï¼‰ã€ç»“æž„å˜åŒ–æ¸…ç†ï¼ˆÂ§17ï¼‰ä»Žè¯¥æ–‡æ¡£å¸æ”¶ï¼›ValidationOwner æŠ½è±¡å’Œ active instance graph æ–¹å‘æœ¬æ–‡ä¸é‡‡çº³ |
| `docs/analysis/2026-03-19-form-validation-comparison.md`           | Yup/AMIS å¯¹æ¯”æ‘˜è¦ï¼›æœ¬æ–‡çš„å€Ÿé‰´åˆ¤æ–­ä¸Žä¹‹ä¸€è‡´                                                                                                                                                                                                           |
| `packages/flux-formula/src/index.ts`                               | `ExpressionCompiler` â€” Phase 1 çš„ `compileValue()` æ¥æºï¼›Section 13 `ValidationCompileContext` ä¸­å¼•ç”¨                                                                                                                                                       |
| `packages/flux-core/src/types/validation.ts`                       | `CompiledValidationRule` â€” Section 4 ä¸­æ‰©å±•ä¸º `CompiledRuleTemplate`                                                                                                                                                                                         |
| `packages/flux-core/src/validation-model.ts`                       | `CompiledValidationNode` â€” Section 12 ä¸­æ‰©å±•ä¸º `CompiledFieldTreeNode`                                                                                                                                                                                       |
| `packages/flux-runtime/src/validation/rules.ts`                    | Phase 1 ä¸»è¦æ”¹åŠ¨ç‚¹ï¼›Section 4.3                                                                                                                                                                                                                               |
| `packages/flux-runtime/src/form-runtime.ts`                        | Phase 2 ä¸»è¦æ”¹åŠ¨ç‚¹ï¼›Section 5ï¼›Section 15â€“17 çš„ closure/async/remap é€»è¾‘å½’å±žæ­¤æ–‡ä»¶                                                                                                                                                                 |
| `packages/flux-react/src/form-state.ts`                            | Phase 1 çš„ `isFieldEffectivelyRequired` æ”¹åŠ¨ï¼›Section 6                                                                                                                                                                                                        |

# nop-chaos-amis å®žçŽ°ç¬”è®°

æœ¬æ–‡æ¡£è®°å½•åŽŸåž‹é¡¹ç›® `nop-chaos-amis` ä¸­å€¼å¾—å‚è€ƒçš„è®¾è®¡æ¨¡å¼å’Œå®žçŽ°æ€è·¯ï¼Œä¾› nop-amis å¼€å‘å‚è€ƒã€‚

è¿™æ˜¯åŽ†å²å®žçŽ°å‚è€ƒï¼Œä¸æ˜¯å½“å‰ä»“åº“å®žçŽ°ç»†èŠ‚çš„æœ€ç»ˆå‡†ç»³ã€‚å½“å‰è¡Œä¸ºä»¥ `docs/architecture/` å’Œæ´»åŠ¨æºç ä¸ºå‡†ã€‚

## 1. FormStore çš„ submit Handler æ¨¡å¼

### åŽŸåž‹å®žçŽ°

```ts
// src/stores/formStore.ts
async submit(handler: (values: TValues) => Promise<unknown> | unknown) {
  const currentValues = get().values;

  // è‹¥æä¾›äº†åŒæ­¥æ ¡éªŒå‡½æ•°ï¼Œå…ˆæ‰§è¡Œæ ¡éªŒ
  if (validate) {
    const errors = validate(currentValues);
    if (Object.keys(errors).length > 0) {
      set({ errors });
      return Promise.reject(errors);
    }
  }

  set({ submitting: true });
  try {
    const result = await handler(currentValues);
    set({ submitting: false });
    return result;
  } catch (error) {
    set({ submitting: false });
    throw error;
  }
}
```

### è®¾è®¡ä¼˜ç‚¹

- `submit` æŽ¥æ”¶ä¸€ä¸ª `handler` å‡½æ•°ï¼Œç”±è°ƒç”¨æ–¹å†³å®šå…·ä½“çš„æäº¤é€»è¾‘
- è¡¨å•çŠ¶æ€ç®¡ç†ï¼ˆ`submitting`ã€`errors`ï¼‰ä¸Žä¸šåŠ¡é€»è¾‘è§£è€¦
- æ ¡éªŒå¤±è´¥æ—¶ç›´æŽ¥ `reject`ï¼Œè°ƒç”¨æ–¹å¯é€šè¿‡ try/catch æ•èŽ·

### åº”ç”¨å»ºè®®

nop-amis çš„ `FormRuntime.submit(api)` å¯ä»¥è€ƒè™‘æ”¯æŒç±»ä¼¼çš„ handler æ¨¡å¼ï¼Œè®©è°ƒç”¨æ–¹å¯ä»¥è‡ªå®šä¹‰æäº¤è¡Œä¸ºï¼š

```ts
// å½“å‰è®¾è®¡
form.submit(api);

// å¯æ‰©å±•ä¸º
form.submit(api); // æˆ–
form.submit(async (values) => customHandler(values));
```

---

## 2. ç¼–è¯‘æ—¶æå–éªŒè¯è§„åˆ™

### åŽŸåž‹å®žçŽ°

```ts
// src/runtime/runtime.ts
interface FieldRuleConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  email?: boolean;
  async?: ApiObject;
}

function extractRules(formNode: NormalizedNode): Map<string, FieldRuleConfig> {
  const rules = new Map<string, FieldRuleConfig>();

  const walk = (node: NormalizedNode): void => {
    const props = node.props as GenericRecord;
    const name = typeof props.name === "string" ? props.name : undefined;
    const validate = props.validate;

    if (name && isPlainObject(validate)) {
      rules.set(name, validate as FieldRuleConfig);
    }

    for (const child of node.children) {
      walk(child);
    }
  };

  walk(formNode);
  return rules;
}
```

### è®¾è®¡ä¼˜ç‚¹

- åœ¨ schema ç¼–è¯‘é˜¶æ®µéåŽ† form èŠ‚ç‚¹ï¼Œæ”¶é›†æ‰€æœ‰å­—æ®µçš„éªŒè¯è§„åˆ™
- è¿è¡Œæ—¶ç›´æŽ¥ä½¿ç”¨ `Map` æŸ¥æ‰¾ï¼Œæ— éœ€é‡å¤è§£æž schema
- æ”¯æŒåŒæ­¥è§„åˆ™ï¼ˆrequiredã€pattern ç­‰ï¼‰å’Œå¼‚æ­¥è§„åˆ™ï¼ˆasync APIï¼‰

### åº”ç”¨å»ºè®®

nop-amis å¯ä»¥åœ¨ `CompiledSchemaNode` ä¸­å¢žåŠ éªŒè¯è§„åˆ™å…ƒæ•°æ®ï¼š

```ts
interface CompiledFormNode extends CompiledSchemaNode {
  validationRules?: Map<string, SchemaFieldRule>;
}
```

åœ¨ `SchemaCompiler` é˜¶æ®µæå–è§„åˆ™ï¼Œ`FormRuntime` ç›´æŽ¥ä½¿ç”¨ã€‚

---

## 3. å†…è” Dialog æå–æœºåˆ¶

### åŽŸåž‹å®žçŽ°

```ts
// src/runtime/compileSchema.ts
function normalizeActionObject(rawAction, params, event, fieldPath) {
  const { nodeId, path, actions, dialogs, walkNode } = params;
  const actionType = rawAction.action;

  if (actionType === "dialog") {
    const dialogField = rawAction.dialog;
    if (dialogField && typeof dialogField === "object" && !Array.isArray(dialogField)) {
      const dialogPath = `${path}.${fieldPath}.dialog`;
      const dialogId = makeDialogIdFromPath(dialogPath);
      const dialogNode = typeof rawDialog.type === "string"
        ? rawDialog
        : { ...rawDialog, type: "dialog" };
      
      dialogs[dialogId] = walkNode(dialogNode, dialogPath);
      delete config.dialog;
      config.dialogId = dialogId;
    }
  }

  // ... å…¶ä»–å¤„ç†
}
```

### è®¾è®¡ä¼˜ç‚¹

- å°† action ä¸­å†…è”å®šä¹‰çš„ dialog æå–åˆ°ç»Ÿä¸€çš„ `dialogs` é›†åˆ
- ç”¨ `dialogId` æ›¿ä»£å†…è”å®šä¹‰ï¼Œä¾¿äºŽç»Ÿä¸€ç®¡ç†å’Œå¤ç”¨
- æ”¯æŒå»¶è¿ŸåŠ è½½å’ŒæŒ‰éœ€æ¸²æŸ“

### åº”ç”¨å»ºè®®

nop-amis çš„ `CompiledSchemaNode` å¯ä»¥å¢žåŠ  `dialogs` å­—æ®µï¼š

```ts
interface CompiledPageNode extends CompiledSchemaNode {
  dialogs: Record<string, CompiledSchemaNode>;
}
```

`RendererRuntime` é€šè¿‡ `dialogId` æŸ¥æ‰¾å¹¶æ¸²æŸ“å¯¹è¯æ¡†ã€‚

---

## 4. ç®€æ´çš„è·¯å¾„ä¿®æ”¹å·¥å…·

### åŽŸåž‹å®žçŽ°

```ts
// src/stores/pageStore.ts
function setByPath(target: any, path: string, value: any): void {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return;

  let cur = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (cur[key] == null || typeof cur[key] !== "object") {
      cur[key] = {};
    }
    cur = cur[key];
  }
  cur[segments[segments.length - 1]] = value;
}
```

### ä¸Ž nop-amis setIn çš„å¯¹æ¯”

| ç‰¹æ€§ | setByPath (åŽŸåž‹) | setIn (nop-amis) |
|------|-----------------|------------------|
| è¿”å›žå€¼ | æ— ï¼ˆåŽŸåœ°ä¿®æ”¹ï¼‰ | è¿”å›žæ–°å¯¹è±¡ |
| ä¸å¯å˜æ€§ | å¯å˜ | ä¸å¯å˜ |
| æ€§èƒ½ | æ›´é«˜ï¼ˆæ— æ‹·è´ï¼‰ | è¾ƒä½Žï¼ˆéœ€è¦æ‹·è´ï¼‰ |
| é€‚ç”¨åœºæ™¯ | Store å†…éƒ¨ä½¿ç”¨ | éœ€è¦ä¸å¯å˜æ›´æ–°çš„åœºæ™¯ |

### åº”ç”¨å»ºè®®

- å¯¹äºŽ Zustand store å†…éƒ¨çš„ `updateData` æ“ä½œï¼Œå¯ä»¥è€ƒè™‘ä½¿ç”¨åŽŸåœ°ä¿®æ”¹ç‰ˆæœ¬
- å¯¹å¤–æš´éœ²çš„ API ä¿æŒä¸å¯å˜è¯­ä¹‰

---

## 5. Action é“¾çš„ prevResult æ³¨å…¥

### åŽŸåž‹å®žçŽ°

```ts
// src/runtime/runtime.ts
async function runThen(
  runtime: RuntimeContext,
  parentAction: ActionDef,
  context: Scope,
  prevResult: unknown
): Promise<void> {
  const thenConfig = parentAction.config.then;
  if (!thenConfig) return;

  const list = Array.isArray(thenConfig) ? thenConfig : [thenConfig];

  let nextPrev = prevResult;
  for (const item of list) {
    if (!isPlainObject(item)) continue;

    // å°†ä¸Šä¸€ä¸ª action çš„ç»“æžœæ³¨å…¥åˆ°å­ä½œç”¨åŸŸ
    const childScope = createChildScope(context, {
      prevResult: nextPrev,
    });
    nextPrev = await executeActionConfig(runtime, item, parentAction.nodeId, parentAction.event, childScope);
  }
}
```

### è®¾è®¡ä¼˜ç‚¹

- `prevResult` è‡ªåŠ¨æ³¨å…¥åˆ°å­ action çš„ä½œç”¨åŸŸä¸­
- é“¾å¼è°ƒç”¨çš„ç»“æžœå¯ä»¥è¢«åŽç»­ action è®¿é—®
- æ”¯æŒå•ä¸ª action æˆ–æ•°ç»„å½¢å¼çš„ then é“¾

### åº”ç”¨å»ºè®®

nop-amis çš„ `dispatch` å·²ç»æ”¯æŒ `prevResult`ï¼Œå¯ä»¥åœ¨ `ActionContext` ä¸­ä¿æŒï¼š

```ts
interface ActionContext {
  // ...
  prevResult?: ActionResult;
}
```

åœ¨è¡¨è¾¾å¼æ±‚å€¼æ—¶ï¼Œ`prevResult` ä½œä¸ºä½œç”¨åŸŸå˜é‡å¯ç”¨ã€‚

---

## 6. å¼‚æ­¥æ ¡éªŒçš„è¯·æ±‚å–æ¶ˆ

### åŽŸåž‹å®žçŽ°

```ts
// src/runtime/runtime.ts
async function runAsyncValidator(
  apiConfig: ApiObject,
  scope: Scope,
  runtime: RuntimeContext,
  cacheKey: string
): Promise<string | null> {
  // å–æ¶ˆä¹‹å‰çš„ç›¸åŒè¯·æ±‚
  const previous = runtime.abortControllers.get(cacheKey);
  if (previous) {
    previous.abort();
  }

  const controller = new AbortController();
  runtime.abortControllers.set(cacheKey, controller);

  try {
    const result = await request(apiConfig, {
      scope,
      env: runtime.pageStore.getState().env,
      signal: controller.signal,
    });
    // ...
  } finally {
    // åªæ¸…é™¤è‡ªå·±åˆ›å»ºçš„ controller
    if (runtime.abortControllers.get(cacheKey) === controller) {
      runtime.abortControllers.delete(cacheKey);
    }
  }
}
```

### è®¾è®¡ä¼˜ç‚¹

- åŸºäºŽ `cacheKey` çš„è¯·æ±‚å–æ¶ˆæœºåˆ¶
- é€‚åˆå­—æ®µçº§å¼‚æ­¥æ ¡éªŒçš„é˜²æŠ–åœºæ™¯
- åªæ¸…é™¤è‡ªå·±åˆ›å»ºçš„ controllerï¼Œé¿å…è¯¯åˆ 

### åº”ç”¨å»ºè®®

nop-amis çš„ `activeRequests` Map å·²ç»å®žçŽ°äº†ç±»ä¼¼æœºåˆ¶ï¼š

```ts
// packages/flux-runtime/src/index.ts
const activeRequests = new Map<string, AbortController>();

async function executeApiRequest(actionType, api, scope, form) {
  const requestKey = createRequestKey(actionType, api, scope, form);
  const previous = activeRequests.get(requestKey);
  if (previous) previous.abort();
  // ...
}
```

å¯ä»¥å¢žåŠ å­—æ®µçº§æ ¡éªŒçš„ä¸“ç”¨ `cacheKey` ç”Ÿæˆé€»è¾‘ã€‚

---

## æ€»ç»“ï¼šå¯ç›´æŽ¥é‡‡ç”¨ vs éœ€è¦é€‚é…

| æ¨¡å¼ | å¯ç›´æŽ¥é‡‡ç”¨ | éœ€è¦é€‚é… |
|------|-----------|---------|
| FormStore submit handler | âœ“ | - |
| ç¼–è¯‘æ—¶æå–éªŒè¯è§„åˆ™ | âœ“ | éœ€è¦é€‚é… CompiledSchemaNode ç»“æž„ |
| å†…è” Dialog æå– | âœ“ | å·²æœ‰ç±»ä¼¼å®žçŽ° |
| setByPath åŽŸåœ°ä¿®æ”¹ | - | ä»…é€‚ç”¨äºŽ store å†…éƒ¨ |
| prevResult æ³¨å…¥ | âœ“ | å·²æœ‰å®žçŽ° |
| å¼‚æ­¥æ ¡éªŒè¯·æ±‚å–æ¶ˆ | âœ“ | å·²æœ‰ç±»ä¼¼å®žçŽ° |

## æ¥æº

- åŽŸåž‹é¡¹ç›®è·¯å¾„ï¼š`c:/can/nop/nop-chaos-amis/`
- ä¸»è¦å‚è€ƒæ–‡ä»¶ï¼š
  - `src/stores/formStore.ts`
  - `src/stores/pageStore.ts`
  - `src/runtime/runtime.ts`
  - `src/runtime/compileSchema.ts`


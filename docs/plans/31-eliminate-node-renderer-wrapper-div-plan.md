# æ¶ˆé™¤ NodeRenderer ä¸­é—´ wrapper divï¼šdata-cid ä¸‹æ²‰åˆ° renderer ç»„ä»¶

> Plan Status: completed
> Last Reviewed: 2026-04-04
> Source: NodeRenderer å¯¹ `wrap=false` ä¸”æœ‰ `_cid` çš„èŠ‚ç‚¹æ’å…¥ `<div data-cid={cid}>`ï¼Œå¯¼è‡´æ— æ„ä¹‰ DOM ä¸­é—´å±‚ã€‚åº”å°† `cid` ä¼ å…¥ `ResolvedNodeMeta`ï¼Œè®©å„ renderer ç»„ä»¶åœ¨æ ¹å…ƒç´ ä¸Šç›´æŽ¥è¾“å‡º `data-cid`ï¼Œä¸Ž `data-testid`ã€`className` æ¨¡å¼ä¸€è‡´ã€‚

---

## Implementation Status

Completed on 2026-04-04.

Implemented in the current workspace:

- `ResolvedNodeMeta.cid` is available to renderer components
- `resolveNodeMeta()` resolves `_cid` into meta
- `NodeRenderer` no longer inserts the extra wrapper div for non-wrap nodes
- renderer roots emit `data-cid={props.meta.cid}` directly where they render DOM
- regression coverage exists in `packages/flux-react/src/index.test.tsx`

Closure audit evidence (2026-04-23): independent task `ses_247c577ecffeLFiBQKekdIbGEH` rechecked the live code and confirmed this plan can remain `completed`. `packages/flux-react/src/node-renderer.tsx` now delegates framing through `NodeFrameWrapper` without the old wrapper div branch, renderer roots emit `data-cid`, and focused runtime tests still lock the no-extra-wrapper behavior.

## 1. é—®é¢˜åˆ†æž

### 1.1 å½“å‰å®žçŽ°

```
NodeRenderer (node-renderer.tsx:237-268)
  â”œâ”€â”€ wrap=true (è¡¨å•å­—æ®µ) â†’ FieldFrame æ ¹å…ƒç´ ç›´æŽ¥å¸¦ data-cid âœ…
  â””â”€â”€ wrap=false (æ™®é€šç»„ä»¶) â†’ å¥— <div data-cid={cid}> åŒ…è£¹ âŒ
```

å…³é”®ä»£ç  (`node-renderer.tsx:262-267`):

```tsx
} else if (resolvedCid != null) {
  content = (
    <div data-cid={resolvedCid}>     // â† å¤šä½™çš„ DOM ä¸­é—´å±‚
      {element}
    </div>
  );
}
```

### 1.2 æ ¹å› ï¼šå¥‘çº¦ç¼ºå£

`ResolvedNodeMeta`ï¼ˆ`flux-core/src/types/renderer-compiler.ts:37-48`ï¼‰ä¸åŒ…å« `cid` å­—æ®µï¼š

```typescript
export interface ResolvedNodeMeta {
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible: boolean;
  hidden: boolean;
  disabled: boolean;
  testid?: string;
  changed: boolean;
  // âŒ æ²¡æœ‰ cid
}
```

NodeRenderer åœ¨ç¬¬ 200-201 è¡Œè‡ªå·±ä»Ž schema æŽ `_cid`ï¼Œä½†æ— æ³•é€šè¿‡ `props.meta` ä¼ é€’ç»™ renderer ç»„ä»¶ï¼Œåªèƒ½åœ¨å¤–é¢å¥— divã€‚

### 1.3 è®¾è®¡æ–‡æ¡£çš„æœ¬æ„

`docs/analysis/2026-03-21-framework-debugger-design.md:530-531`ï¼š

> å¯¹äºŽéž wrap èŠ‚ç‚¹ï¼Œç”±å…·ä½“ renderer ç»„ä»¶é€šè¿‡ **props.meta.cid** èŽ·å–å¹¶è‡ªè¡Œåº”ç”¨

è®¾è®¡æœ¬æ„æ˜¯è®© renderer ç›´æŽ¥è¾“å‡º `data-cid`ï¼Œåªæ˜¯ `ResolvedNodeMeta` æ²¡åŠ å­—æ®µï¼Œwrapper div æ˜¯å¦¥åå®žçŽ°ã€‚

### 1.4 wrapper div çš„é—®é¢˜

1. **ç ´å CSS é€‰æ‹©å™¨** â€” å¤–éƒ¨å†™ `> .nop-button` çš„æ ·å¼å› ä¸­é—´ div å¤±æ•ˆ
2. **å½±å“ flex/grid å¸ƒå±€** â€” ä¸­é—´å¤šä¸€å±‚ div å¯èƒ½æ”¹å˜ gapã€align è®¡ç®—
3. **æ±¡æŸ“ DOM ç»“æž„** â€” è°ƒè¯•æ—¶çœ‹åˆ°æ— æ„ä¹‰ div åµŒå¥—
4. **ä¸ä¸€è‡´** â€” `wrap=true` è·¯å¾„çš„ FieldFrame ç›´æŽ¥åœ¨æ ¹å…ƒç´ è¾“å‡º `data-cid`ï¼Œ`wrap=false` è·¯å¾„å´å¥— div

### 1.5 å¯è¡Œæ€§ç¡®è®¤

ç»å…¨é¢å®¡æŸ¥ï¼Œ**æ‰€æœ‰ renderer ç»„ä»¶éƒ½æ˜¯å•æ ¹å…ƒç´ **ï¼Œä¸å­˜åœ¨ React.Fragment æˆ–å¤šæ ¹æƒ…å†µã€‚æ¯ä¸ª renderer å·²åœ¨æ ¹å…ƒç´ ä¸Šè¾“å‡º `data-testid={props.meta.testid}`ï¼ŒåŠ  `data-cid={props.meta.cid}` æ˜¯å®Œå…¨ç›¸åŒçš„æ¨¡å¼ã€‚

---

## 2. å½±å“èŒƒå›´

### 2.1 éœ€è¦ä¿®æ”¹çš„åŒ…å’Œæ–‡ä»¶

#### Phase 1ï¼šå¥‘çº¦å±‚ï¼ˆflux-core + flux-runtimeï¼‰

| æ–‡ä»¶                                              | æ”¹åŠ¨                                | è¯´æ˜Ž                           |
| --------------------------------------------------- | ------------------------------------- | -------------------------------- |
| `packages/flux-core/src/types/renderer-compiler.ts` | `ResolvedNodeMeta` åŠ  `cid?: number` | æŽ¥å£å˜æ›´                       |
| `packages/flux-runtime/src/node-runtime.ts`         | `resolveNodeMeta` åŠ  `cid` è§£æž     | ä»Ž schema å– `_cid` å†™å…¥ meta |

#### Phase 2ï¼šæ¸²æŸ“å±‚ï¼ˆflux-reactï¼‰

| æ–‡ä»¶                                      | æ”¹åŠ¨                                                  | è¯´æ˜Ž       |
| ------------------------------------------- | ------------------------------------------------------- | ------------ |
| `packages/flux-react/src/node-renderer.tsx` | åˆ é™¤ wrapper div åˆ†æ”¯ï¼Œ`cid` æ”¹èµ° `resolvedMeta` | æ ¸å¿ƒæ”¹åŠ¨ |

#### Phase 3ï¼šrenderer ç»„ä»¶ï¼ˆæ‰€æœ‰ renderer åŒ…ï¼‰

æ¯ä¸ªéž `wrap` çš„ renderer åœ¨æ ¹å…ƒç´ ä¸Šæ·»åŠ  `data-cid={props.meta.cid || undefined}`ã€‚

**flux-renderers-basic**ï¼ˆ8 ä¸ª rendererï¼Œå…¨éƒ¨ `wrap=false`ï¼‰ï¼š

| æ–‡ä»¶                 | Renderer          | æ ¹å…ƒç´                  |
| ---------------------- | ----------------- | ------------------------- |
| `page.tsx`             | PageRenderer      | `<section>`               |
| `container.tsx`        | ContainerRenderer | `<div>`                   |
| `flex.tsx`             | FlexRenderer      | `<div>`                   |
| `text.tsx`             | TextRenderer      | `<Tag>`                   |
| `button.tsx`           | ButtonRenderer    | `<Button>`                |
| `icon.tsx`             | IconRenderer      | `<span>`                  |
| `badge.tsx`            | BadgeRenderer     | `<Badge>`                 |
| `dynamic-renderer.tsx` | DynamicRenderer   | `<div>`ï¼ˆ3 å¤„ returnï¼‰ |

**flux-renderers-form**ï¼ˆ`wrap=true` çš„ renderer ä¸éœ€è¦æ”¹ï¼Œå®ƒä»¬çš„ `data-cid` ç”± FieldFrame è¾“å‡ºï¼‰ï¼š

| æ–‡ä»¶                                             | Renderer                                                                             | wrap  | éœ€æ”¹ï¼Ÿ                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ | ----- | ------------------------- |
| `renderers/form.tsx`                               | FormRenderer                                                                         | false | âœ… æ ¹å…ƒç´ åŠ  data-cid |
| `renderers/input.tsx`                              | input-text/email/password/select/textarea/checkbox/switch/radio-group/checkbox-group | true  | âŒ FieldFrame å·²å¤„ç†    |
| `renderers/array-editor.tsx`                       | ArrayEditorRenderer                                                                  | true  | âŒ FieldFrame å·²å¤„ç†    |
| `renderers/key-value.tsx`                          | KeyValueRenderer                                                                     | true  | âŒ FieldFrame å·²å¤„ç†    |
| `renderers/tag-list.tsx`                           | TagListRenderer                                                                      | true  | âŒ FieldFrame å·²å¤„ç†    |
| `renderers/condition-builder/ConditionBuilder.tsx` | ConditionBuilderRenderer                                                             | true  | âŒ FieldFrame å·²å¤„ç†    |

**flux-renderers-data**ï¼ˆ3 ä¸ª rendererï¼Œå…¨éƒ¨ `wrap=false`ï¼‰ï¼š

| æ–‡ä»¶                     | Renderer           | æ ¹å…ƒç´           |
| -------------------------- | ------------------ | ------------------ |
| `table-renderer.tsx`       | TableRenderer      | `<div>`            |
| `data-source-renderer.tsx` | DataSourceRenderer | éœ€ç¡®è®¤æ ¹å…ƒç´  |
| `chart-renderer.tsx`       | ChartRenderer      | éœ€ç¡®è®¤æ ¹å…ƒç´  |

**flux-code-editor**ï¼ˆ1 ä¸ª rendererï¼Œ`wrap=true`ï¼Œç”± FieldFrame å¤„ç†ï¼Œä¸éœ€è¦æ”¹ï¼‰ï¼š

| æ–‡ä»¶                     | Renderer           | wrap | éœ€æ”¹ï¼Ÿ              |
| -------------------------- | ------------------ | ---- | ---------------------- |
| `code-editor-renderer.tsx` | CodeEditorRenderer | true | âŒ FieldFrame å·²å¤„ç† |

#### Phase 4ï¼šè°ƒè¯•å™¨ï¼ˆnop-debuggerï¼‰

æ— éœ€æ”¹åŠ¨ã€‚è°ƒè¯•å™¨é€šè¿‡ `document.querySelector('[data-cid="..."]')` å’Œ `.closest('[data-cid]')` æŸ¥æ‰¾å…ƒç´ ï¼Œåªä¾èµ– `data-cid` å±žæ€§çš„å­˜åœ¨ï¼Œä¸ä¾èµ– wrapper div ç»“æž„ã€‚

### 2.2 ä¸éœ€è¦ä¿®æ”¹çš„éƒ¨åˆ†

- **CSS** â€” æ—  CSS é€‰æ‹©å™¨ä¾èµ– `[data-cid]` æˆ– wrapper div ç»“æž„
- **flow-designer-renderers** â€” è¿™äº› renderer ä¸æ˜¯é€šè¿‡ NodeRenderer æ¸²æŸ“çš„ï¼ˆèµ° xyflow è‡ªå®šä¹‰èŠ‚ç‚¹ï¼‰ï¼Œæ—  `_cid`
- **spreadsheet-renderers** â€” åŒä¸Šï¼Œä¸èµ°æ ‡å‡† NodeRenderer ç®¡çº¿
- **report-designer-renderers** â€” åŒä¸Š
- **playground** â€” çº¯æ¶ˆè´¹æ–¹ï¼Œä¸å®šä¹‰ renderer

---

## 3. æ‰§è¡Œè®¡åˆ’

### Step 1ï¼šResolvedNodeMeta åŠ  cid å­—æ®µ

**æ–‡ä»¶**: `packages/flux-core/src/types/renderer-compiler.ts`

```diff
 export interface ResolvedNodeMeta {
   id?: string;
   name?: string;
   label?: string;
   title?: string;
   className?: string;
   visible: boolean;
   hidden: boolean;
   disabled: boolean;
   testid?: string;
   changed: boolean;
+  cid?: number;
 }
```

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-core typecheck`

### Step 2ï¼šresolveNodeMeta è§£æž cid

**æ–‡ä»¶**: `packages/flux-runtime/src/node-runtime.ts`

åœ¨ `resolveNodeMeta` å‡½æ•°ä¸­ï¼Œä»Ž `node.schema` æå– `_cid` å†™å…¥ resolved metaï¼š

```diff
 function resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta {
+  const cidFromSchema = (node.schema as unknown as { _cid?: unknown })._cid;
   const env = input.getEnv();
   const resolved: ResolvedNodeMeta = {
     id: evaluateCompiledValue(input.expressionCompiler, node.meta.id, scope, env, state?.meta.id),
     name: evaluateCompiledValue(input.expressionCompiler, node.meta.name, scope, env, state?.meta.name),
     label: evaluateCompiledValue(input.expressionCompiler, node.meta.label, scope, env, state?.meta.label),
     title: evaluateCompiledValue(input.expressionCompiler, node.meta.title, scope, env, state?.meta.title),
     className: evaluateCompiledValue(input.expressionCompiler, node.meta.className, scope, env, state?.meta.className),
     visible: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.visible, scope, env, state?.meta.visible) ?? true),
     hidden: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.hidden, scope, env, state?.meta.hidden) ?? false),
     disabled: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.disabled, scope, env, state?.meta.disabled) ?? false),
     testid: evaluateCompiledValue(input.expressionCompiler, node.meta.testid, scope, env, state?.meta.testid),
-    changed: true
+    changed: true,
+    cid: typeof cidFromSchema === 'number' ? cidFromSchema : undefined,
   };
```

**æ³¨æ„**: `cid` ä¸æ˜¯è¡¨è¾¾å¼é©±åŠ¨çš„ï¼ˆæ˜¯ç¼–è¯‘æ—¶åˆ†é…çš„æ•°å­— IDï¼‰ï¼Œä¸éœ€è¦é€šè¿‡ `evaluateCompiledValue`ã€‚ç›´æŽ¥ä»Ž schema è¯»å–å³å¯ã€‚

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-runtime typecheck && pnpm --filter @nop-chaos/flux-runtime test`

### Step 3ï¼šNodeRenderer åˆ é™¤ wrapper divï¼Œcid èµ° meta

**æ–‡ä»¶**: `packages/flux-react/src/node-renderer.tsx`

1. åˆ é™¤ç¬¬ 199-201 è¡Œçš„ `cidFromSchema` / `resolvedCid` æå–ï¼ˆå·²ç§»å…¥ `resolveNodeMeta`ï¼‰
2. åˆ é™¤ç¬¬ 262-267 è¡Œçš„ `else if (resolvedCid != null)` wrapper div åˆ†æ”¯
3. FieldFrame çš„ `cid` prop æ”¹ä»Ž `resolvedMeta.cid` è¯»å–ï¼ˆè€Œéž `resolvedCid`ï¼‰

```diff
   const Comp = props.node.component.component;
-  const cidFromSchema = (props.node.schema as unknown as { _cid?: unknown })._cid;
-  const resolvedCid = typeof cidFromSchema === 'number' ? cidFromSchema : undefined;

   // ... effects ...

   const element = <Comp {...componentProps} />;

   let content = element;

   if (props.node.component.wrap) {
     // ...
     content = (
       <FieldFrame
         name={fieldName}
         label={labelValue}
         required={props.node.schema.required === true}
         className={resolvedMeta.className}
         testid={resolvedMeta.testid}
-        cid={resolvedCid}
+        cid={resolvedMeta.cid}
       >
         {element}
       </FieldFrame>
     );
-  } else if (resolvedCid != null) {
-    content = (
-      <div data-cid={resolvedCid}>
-        {element}
-      </div>
-    );
   }
```

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-react typecheck && pnpm --filter @nop-chaos/flux-react test`

### Step 4ï¼šRenderer ç»„ä»¶åŠ  data-cid

æ¯ä¸ª `wrap=false` çš„ renderer åœ¨æ ¹å…ƒç´ ä¸Šæ·»åŠ  `data-cid={props.meta.cid || undefined}`ã€‚

æ¨¡å¼ä¸ŽçŽ°æœ‰ `data-testid` ä¸€è‡´ï¼š

```tsx
// æ”¹åŠ¨å‰
<div className={...} data-testid={props.meta.testid || undefined}>

// æ”¹åŠ¨åŽ
<div className={...} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
```

**é€åŒ…æ”¹åŠ¨æ¸…å•**ï¼š

#### 4a. `flux-renderers-basic`ï¼ˆ8 ä¸ª rendererï¼‰

| æ–‡ä»¶                 | è¡Œå·ï¼ˆreturn è¯­å¥ï¼‰                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `page.tsx`             | 13 â€” `<section>`                                                      |
| `container.tsx`        | 25 â€” `<div>`                                                          |
| `flex.tsx`             | 29-51 â€” `<div>`                                                       |
| `text.tsx`             | 23 â€” `<Tag>`                                                          |
| `button.tsx`           | 14-24 â€” `<Button>`                                                    |
| `icon.tsx`             | return è¯­å¥                                                            |
| `badge.tsx`            | return è¯­å¥                                                            |
| `dynamic-renderer.tsx` | 61, 69, 76 â€” 3 å¤„ `<div>`ï¼ˆerror / schema / loading ä¸‰ä¸ªåˆ†æ”¯ï¼‰ |

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-renderers-basic typecheck`

#### 4b. `flux-renderers-form`ï¼ˆ1 ä¸ª rendererï¼šFormRendererï¼‰

| æ–‡ä»¶               | è¯´æ˜Ž                             |
| -------------------- | ---------------------------------- |
| `renderers/form.tsx` | FormRenderer æ ¹å…ƒç´ åŠ  data-cid |

æ³¨æ„ï¼šæ‰€æœ‰ `input-text` ç­‰ `wrap=true` çš„ renderer ä¸éœ€è¦æ”¹â€”â€”å®ƒä»¬çš„ `data-cid` ç”± FieldFrame æ ¹å…ƒç´ è¾“å‡ºã€‚

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-renderers-form typecheck && pnpm --filter @nop-chaos/flux-renderers-form test`

#### 4c. `flux-renderers-data`ï¼ˆ3 ä¸ª rendererï¼‰

| æ–‡ä»¶                     | è¯´æ˜Ž                        |
| -------------------------- | ----------------------------- |
| `table-renderer.tsx`       | æ ¹ `<div>` åŠ  data-cid      |
| `data-source-renderer.tsx` | ç¡®è®¤æ ¹å…ƒç´ åŽåŠ  data-cid |
| `chart-renderer.tsx`       | ç¡®è®¤æ ¹å…ƒç´ åŽåŠ  data-cid |

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-renderers-data typecheck`

### Step 5ï¼šè¡¥å……æµ‹è¯•

**æ–‡ä»¶**: `packages/flux-react/src/index.test.tsx`

æ–°å¢žæµ‹è¯•ç”¨ä¾‹ï¼š

```typescript
describe('data-cid on renderer root element', () => {
  it('emits data-cid on component root element (no wrapper div)', () => {
    // æ¸²æŸ“ä¸€ä¸ªæœ‰ _cid çš„ button èŠ‚ç‚¹
    // æ–­è¨€: Button æ ¹å…ƒç´ ä¸Šæœ‰ data-cid
    // æ–­è¨€: Button æ ¹å…ƒç´ å¤–æ²¡æœ‰é¢å¤–çš„ div[data-cid] åŒ…è£¹
  });

  it('does not emit data-cid when cid is undefined', () => {
    // æ¸²æŸ“ä¸€ä¸ªæ²¡æœ‰ _cid çš„èŠ‚ç‚¹
    // æ–­è¨€: æ ¹å…ƒç´ ä¸Šæ²¡æœ‰ data-cid å±žæ€§
  });

  it('FieldFrame still emits data-cid for wrap=true nodes', () => {
    // æ¸²æŸ“ä¸€ä¸ª wrap=true çš„ input-text
    // æ–­è¨€: FieldFrame æ ¹å…ƒç´ ä¸Šæœ‰ data-cid
    // æ–­è¨€: input æ ¹å…ƒç´ ä¸Šæ²¡æœ‰ data-cidï¼ˆåªæœ‰ FieldFrame æœ‰ï¼‰
  });

  it('debugger inspectByCid still works after refactoring', () => {
    // æ³¨å†Œ component handleï¼Œæ¸²æŸ“èŠ‚ç‚¹
    // è°ƒç”¨ inspectByCid(cid)
    // æ–­è¨€: èƒ½æ‰¾åˆ°å¯¹åº”çš„ DOM å…ƒç´
  });
});
```

**éªŒè¯**: `pnpm --filter @nop-chaos/flux-react test`

### Step 6ï¼šå…¨é‡éªŒè¯

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

---

## 4. é£Žé™©ä¸Žå›žé€€

### 4.1 é£Žé™©è¯„ä¼°

| é£Žé™©                      | ç­‰çº§ | ç¼“è§£                                                                              |
| --------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Renderer é—æ¼ data-cid      | ä½Ž    | grep æœç´¢æ‰€æœ‰ renderer çš„ return è¯­å¥ï¼Œç¡®è®¤å…¨è¦†ç›–                        |
| FieldFrame è·¯å¾„å›žé€€     | æ—     | FieldFrame å·²æ­£ç¡®è¾“å‡º data-cidï¼Œä¸å—å½±å“                                     |
| è°ƒè¯•å™¨å¤±æ•ˆ             | ä½Ž    | è°ƒè¯•å™¨åªä¾èµ– `[data-cid]` å±žæ€§å­˜åœ¨ï¼Œä¸ä¾èµ– DOM å±‚çº§                     |
| ç¬¬ä¸‰æ–¹ renderer æœªé€‚é… | ä¸­    | `cid` å­—æ®µæ˜¯ optionalï¼Œä¸è¾“å‡º data-cid åªæ˜¯è°ƒè¯•å™¨æ‰¾ä¸åˆ°ï¼Œä¸å½±å“åŠŸèƒ½ |

### 4.2 å›žé€€ç­–ç•¥

å¦‚æžœå‡ºçŽ°é—®é¢˜ï¼Œå›žé€€åªéœ€ï¼š

1. æ¢å¤ `node-renderer.tsx` çš„ wrapper div åˆ†æ”¯
2. å…¶ä½™æ”¹åŠ¨ï¼ˆmeta åŠ  cidã€renderer åŠ  data-cidï¼‰å¯ä»¥ä¿ç•™â€”â€”æœ‰ wrapper div æ—¶ `data-cid` å‡ºçŽ°ä¸¤æ¬¡ä¸å½±å“åŠŸèƒ½

---

## 5. éªŒæ”¶æ ‡å‡†

- [ ] `ResolvedNodeMeta` åŒ…å« `cid?: number` å­—æ®µ
- [ ] `resolveNodeMeta` æ­£ç¡®è§£æž `_cid` åˆ° meta
- [ ] NodeRenderer ä¸­ä¸å­˜åœ¨ wrapper div ä»£ç 
- [ ] æ‰€æœ‰ `wrap=false` çš„ renderer æ ¹å…ƒç´ ä¸Šæœ‰ `data-cid`
- [ ] FieldFrame ä»æ­£ç¡®è¾“å‡º `data-cid`ï¼ˆ`wrap=true` è·¯å¾„ä¸å—å½±å“ï¼‰
- [ ] `document.querySelector('[data-cid="N"]')` èƒ½æ‰¾åˆ°å¯¹åº” DOM å…ƒç´ 
- [ ] è°ƒè¯•å™¨ inspect æ¨¡å¼ hover/ç‚¹å‡»æ­£å¸¸å·¥ä½œ
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` å…¨éƒ¨é€šè¿‡
- [ ] æ— æ–°å¢ž DOM å±‚çº§â€”â€”renderer æ ¹å…ƒç´ å³ä¸º `data-cid` è½½ä½“

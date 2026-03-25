# æ¡†æž¶çº§è°ƒè¯•å™¨è®¾è®¡è‰æ¡ˆ

> è§’è‰²è¯´æ˜Ž: æœ¬æ–‡æ˜¯é¢å‘å®žçŽ°å‰è®¨è®ºçš„è®¾è®¡è‰æ¡ˆï¼Œè®°å½•å½“å‰ä»“åº“çº¦æŸã€ç›®æ ‡èŒƒå›´å’ŒæŽ¨èæ–¹æ¡ˆï¼Œä¸æ˜¯å·²ç»è½åœ°çš„æœ€ç»ˆæž¶æž„å¥‘çº¦ã€‚

> è®¾è®¡æ—¥æœŸ: 2026-03-20

## 1. èƒŒæ™¯

å½“å‰ä»“åº“å·²ç»å…·å¤‡ä¸€éƒ¨åˆ†å¯è§‚æµ‹èƒ½åŠ›ï¼Œä½†å®ƒä»¬è¿˜æ²¡æœ‰å½¢æˆä¸€ä¸ªç‹¬ç«‹ã€ç»Ÿä¸€ã€å¯å¤ç”¨çš„æ¡†æž¶çº§è°ƒè¯•å™¨ï¼š

- `apps/playground/src/App.tsx` ä¸­å·²ç»æœ‰ä¸€ä¸ªæœ¬åœ°çš„ `Live Monitor / Runtime Activity` é¢æ¿
- `packages/flux-react/src/index.tsx` å·²ç»ä¼šé€šè¿‡ `env.monitor` å‘å‡º render ç›¸å…³äº‹ä»¶
- `packages/flux-runtime/src/action-runtime.ts` å·²ç»ä¼šå‘å‡º action å’Œéƒ¨åˆ† api ç›¸å…³äº‹ä»¶
- `packages/flux-runtime/src/request-runtime.ts` å·²ç»å…·å¤‡è¯·æ±‚æ‰§è¡Œå±‚çš„åˆ‡å…¥ç‚¹
- `packages/flux-core/src/index.ts` å·²ç»å®šä¹‰äº† `RendererMonitor`ã€`RendererPlugin`ã€`ErrorMonitorPayload` ç­‰å¥‘çº¦

è¿™è¯´æ˜Žä»“åº“å¹¶ä¸ç¼ºå°‘â€œè°ƒè¯•æ•°æ®æ¥æºâ€ï¼Œç¼ºçš„æ˜¯ä¸€å¥—ï¼š

- ç‹¬ç«‹ package å½¢å¼çš„è°ƒè¯•å™¨èƒ½åŠ›
- ç»Ÿä¸€äº‹ä»¶æ¨¡åž‹
- å…¨å±€å¼€å…³å’Œå®¿ä¸»æŽ¥å…¥æ–¹å¼
- æ¼‚æµ®ã€å¯æ‹–æ‹½ã€å¯æŠ˜å ã€å¯éšè—çš„è°ƒè¯• UI
- æ¯” playground çŽ°æœ‰æ—¥å¿—é¡µæ›´å®Œæ•´çš„å…³é”®ä¿¡æ¯å±•ç¤º

## 2. è®¾è®¡ç›®æ ‡

æœ¬æ¬¡è°ƒè¯•å™¨è®¾è®¡çš„ç›®æ ‡æ˜¯ï¼š

1. æä¾›ä¸€ä¸ªç‹¬ç«‹ package çš„æ¡†æž¶çº§è°ƒè¯•å™¨ï¼Œé¿å…æŠŠè°ƒè¯•é€»è¾‘ç»§ç»­å †åœ¨ `apps/playground` ä¸­ã€‚
2. é€šè¿‡ `window` ä¸Šçš„å…¨å±€å¼€å…³æŽ§åˆ¶è°ƒè¯•å™¨æ˜¯å¦å¯ç”¨ã€‚
3. é»˜è®¤ä»¥æ¼‚æµ®é¢æ¿æ–¹å¼æ˜¾ç¤ºï¼Œå¯æ‹–æ‹½ä½ç½®ï¼Œå¯æŠ˜å ã€å¯éšè—ã€‚
4. éšè—åŽä¿ç•™ä¸€ä¸ªä¸å½±å“é¡µé¢æ“ä½œçš„å…¥å£ï¼Œä¾‹å¦‚å·¦ä¸‹è§’ launcherã€‚
5. è¦†ç›–æ¡†æž¶å…³é”®ç”Ÿå‘½å‘¨æœŸä¿¡æ¯ï¼Œè€Œä¸åªæ˜¯ç®€å•çš„æ—¥å¿—æ»šåŠ¨åˆ—è¡¨ã€‚
6. å°½é‡å¤ç”¨å½“å‰ä»“åº“å·²æœ‰çš„ `monitor`ã€`plugin`ã€`fetcher`ã€`notify` æ³¨å…¥èƒ½åŠ›ã€‚
7. å‚è€ƒ `C:/can/nop/templates/amis` çš„è°ƒè¯•å™¨æ€è·¯ï¼Œä½†ä¸ç›´æŽ¥å¤åˆ¶å®žçŽ°å’Œäº¤äº’æ¨¡åž‹ã€‚

## 3. å½“å‰ä»“åº“çº¦æŸå’Œæž¶æž„ä¾æ®

### 3.1 ä»“åº“ç»“æž„

å½“å‰ä»“åº“æ˜¯ä¸€ä¸ª `pnpm` monorepoï¼Œå…³é”®ç»“æž„å¦‚ä¸‹ï¼š

- `apps/playground/` æ˜¯å½“å‰ç¬¬ä¸€é›†æˆé¢
- `packages/flux-core/` å®šä¹‰å¥‘çº¦å±‚
- `packages/flux-runtime/` è´Ÿè´£ç¼–è¯‘ã€åŠ¨ä½œã€è¯·æ±‚ã€é¡µé¢ã€è¡¨å•è¿è¡Œæ—¶
- `packages/flux-react/` è´Ÿè´£ React é›†æˆå’Œæ¸²æŸ“è¾¹ç•Œ
- `packages/amis-renderers-*` æ˜¯å…·ä½“ renderer å®žçŽ°

ä»Žä¾èµ–è¾¹ç•Œçœ‹ï¼Œè°ƒè¯•å™¨æœ€é€‚åˆç«™åœ¨ `SchemaRenderer` æ ¹è¾¹ç•Œä¹‹å¤–æŽ¥å…¥ï¼Œè€Œä¸æ˜¯ä¾µå…¥æŸä¸ª renderer åŒ…å†…éƒ¨ã€‚

### 3.2 å½“å‰å·²æœ‰è°ƒè¯•ç›¸å…³èƒ½åŠ›

å·²æœ‰èƒ½åŠ›çš„ä¸»è¦é”šç‚¹å¦‚ä¸‹ï¼š

- `packages/flux-core/src/index.ts`
  - `RendererMonitor`
  - `RendererPlugin`
  - `ErrorMonitorPayload`
- `packages/flux-react/src/index.tsx`
  - `NodeRenderer` ä¸­å‘å‡º `onRenderStart` / `onRenderEnd`
- `packages/flux-runtime/src/action-runtime.ts`
  - å‘å‡º `onActionStart` / `onActionEnd`
  - åœ¨éƒ¨åˆ† action ä¸­å‘å‡º `onApiRequest`
- `packages/flux-runtime/src/request-runtime.ts`
  - è¯·æ±‚æ‰§è¡Œå±‚ä¹Ÿä¼šå‘å‡º `onApiRequest`
- `apps/playground/src/App.tsx`
  - å·²ç»å°† `render` / `action` / `api` / `notify` äº‹ä»¶ç»„ç»‡æˆå³ä¾§æ—¥å¿—é¢æ¿

### 3.3 å¯¹è°ƒè¯•å™¨è®¾è®¡æœ€é‡è¦çš„çŽ°å®žçº¦æŸ

1. å½“å‰ `onApiRequest` å­˜åœ¨åŒæ¥æºï¼šåŠ¨ä½œå±‚å’Œè¯·æ±‚æ‰§è¡Œå±‚éƒ½å¯èƒ½ä¸ŠæŠ¥ã€‚
2. å½“å‰æ²¡æœ‰ç»Ÿä¸€çš„ `api:end`ã€`api:error`ã€`api:abort` äº‹ä»¶ï¼Œéœ€è¦é åŒ…è£… `env.fetcher` è¡¥é½ã€‚
3. å½“å‰ `RendererMonitor.onError` è™½ç„¶æœ‰å¥‘çº¦ï¼Œä½†é”™è¯¯é“¾è·¯è¿˜æ²¡æœ‰å®Œå…¨ç»Ÿä¸€ï¼Œä¸èƒ½åªä¾èµ–å®ƒã€‚
4. å½“å‰æ²¡æœ‰å…¬å¼€çš„ form/page store è°ƒè¯•è®¢é˜…æŽ¥å£ï¼Œæ‰€ä»¥ç¬¬ä¸€ç‰ˆä¸åº”å¼ºè€¦åˆå†…éƒ¨ store ç§æœ‰å®žçŽ°ã€‚
5. å½“å‰æœ€ç¨³å®šçš„å®¿ä¸»æŽ¥å…¥è¾¹ç•Œæ˜¯ `SchemaRendererProps` æš´éœ²å‡ºçš„ï¼š
   - `env`
   - `plugins`
   - `onActionError`

## 4. å¯¹å‚è€ƒè°ƒè¯•å™¨çš„å–èˆ

å‚è€ƒè·¯å¾„ï¼š`C:/can/nop/templates/amis`

### 4.1 å€¼å¾—å€Ÿé‰´çš„éƒ¨åˆ†

- é€šè¿‡å…¨å±€å¼€å…³æŽ§åˆ¶æ˜¯å¦å¯ç”¨è°ƒè¯•å™¨
- è°ƒè¯• UI ç‹¬ç«‹æŒ‚è½½ï¼Œä¸åµŒå…¥ä¸šåŠ¡æ¸²æŸ“æ ‘å†…éƒ¨
- åŒæ—¶æä¾›æ—¥å¿—è§†è§’å’Œ inspect è§†è§’ï¼Œè€Œä¸æ˜¯åªæœ‰ä¸€å—çº¯æ—¥å¿—åˆ—è¡¨
- åªæŠ“å…³é”®é“¾è·¯ï¼Œè€Œä¸æ˜¯æ— ä¸Šé™æ‰“å°æ‰€æœ‰ç»†èŠ‚
- å¯¹ç»„ä»¶å®žä¾‹å’Œé¡µé¢å…ƒç´ å»ºç«‹æ˜ å°„å…³ç³»ï¼Œä¾¿äºŽå®šä½é—®é¢˜

### 4.2 ä¸å»ºè®®ç…§æ¬çš„éƒ¨åˆ†

- ä¸å»ºè®®ç›´æŽ¥ä½¿ç”¨ `findDOMNode`
- ä¸å»ºè®®åšæˆå•ä¸€å…¨å±€å•ä¾‹å’Œå…¨å±€å¯å˜æ³¨å†Œè¡¨
- ä¸å»ºè®®å¤§é‡ä¾èµ– document çº§äº‹ä»¶å’Œè„†å¼±çš„ DOM æŸ¥è¯¢é€»è¾‘
- ä¸å»ºè®®åªåšâ€œå³ä¾§å›ºå®šè¾¹æ  + å®½åº¦ resizeâ€è¿™ä¸€ç§å½¢æ€
- ä¸å»ºè®®æ²¿ç”¨è¿‡äºŽæ¾æ•£çš„æ—¥å¿—ç»“æž„ï¼Œåº”è¯¥ä»Žç¬¬ä¸€ç‰ˆå°±ç»Ÿä¸€äº‹ä»¶æ¨¡åž‹

## 5. æŽ¨èäº§ç‰©å½¢æ€

æŽ¨èæ–°å¢žç‹¬ç«‹ packageï¼š

- `@nop-chaos/amis-debugger`

æŽ¨èå®šä½ï¼š

- å®ƒæ˜¯ä¸€ä¸ªæ¡†æž¶çº§è°ƒè¯•å™¨ package
- è´Ÿè´£é‡‡é›†ã€å½’ä¸€åŒ–ã€å­˜å‚¨ã€å±•ç¤ºè°ƒè¯•ä¿¡æ¯
- ä¸è´Ÿè´£ä¸šåŠ¡é€»è¾‘
- ä¸ç›´æŽ¥ä¾èµ–å…·ä½“ renderer åŒ…å®žçŽ°

## 6. package è¾¹ç•Œè®¾è®¡

### 6.1 ä¾èµ–è¾¹ç•Œ

å»ºè®®ä¾èµ–ï¼š

- `@nop-chaos/flux-core`
- `react`
- `react-dom`ï¼ˆå¦‚æžœé¢æ¿é€šè¿‡ portal æŒ‚åˆ° bodyï¼‰

ç¬¬ä¸€ç‰ˆå°½é‡ä¸è¦ç›´æŽ¥ä¾èµ–ï¼š

- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-data`

åŽŸå› æ˜¯è°ƒè¯•å™¨åº”ä¾èµ–â€œå¥‘çº¦å±‚â€ï¼Œè€Œä¸æ˜¯ä¾èµ–â€œå®žçŽ°å±‚â€ã€‚

### 6.2 æŽ¨èç›®å½•ç»“æž„

å»ºè®® package ç»“æž„ç±»ä¼¼ï¼š

```text
packages/amis-debugger/
  package.json
  src/
    index.ts
    types.ts
    window-gate.ts
    controller/
      create-debugger-controller.ts
      debugger-store.ts
      timeline.ts
      dedupe.ts
    adapters/
      decorate-env.ts
      create-monitor.ts
      create-plugin.ts
      create-error-handler.ts
    react/
      DebuggerPanel.tsx
      DebuggerLauncher.tsx
      DebuggerProvider.tsx
      use-draggable.ts
      use-debugger-state.ts
    ui/
      debugger.css
```

## 7. å®¿ä¸»æŽ¥å…¥æ–¹å¼

### 7.1 æœ€åˆé€‚çš„æŒ‚è½½ç‚¹

æœ€æŽ¨èçš„æŒ‚è½½ç‚¹æ˜¯ `SchemaRenderer` çš„å®¿ä¸»è¾¹ç•Œï¼Œä¹Ÿå°±æ˜¯å½“å‰ç±»ä¼¼ `apps/playground/src/App.tsx` è¿™ç§ä½ç½®ã€‚

åŽŸå› ï¼š

- è¿™æ˜¯å½“å‰ä»“åº“æœ€ç¨³å®šã€æœ€æ˜Žç¡®çš„æ³¨å…¥ç‚¹
- å¯ä»¥åŒæ—¶æŽ¥å…¥ `env`ã€`plugins`ã€`onActionError`
- ä¸ä¼šæ±¡æŸ“å…·ä½“ renderer ç»„ä»¶å®žçŽ°
- è°ƒè¯• UI å¯ä»¥ä½œä¸º `SchemaRenderer` çš„ sibling å­˜åœ¨ï¼ŒçœŸæ­£ç‹¬ç«‹äºŽ schema æ¸²æŸ“æ ‘

### 7.2 æŽ¨èæŽ¥å…¥ API

å»ºè®®è°ƒè¯•å™¨ package æš´éœ²ä¸€ä¸ªé«˜å±‚ç»„è£…å™¨ï¼š

```ts
const debuggerController = createAmisDebugger({
  id: 'playground-main'
});

const env = debuggerController.decorateEnv(baseEnv);
const plugins = [...basePlugins, debuggerController.plugin];
const onActionError = debuggerController.onActionError;
```

ç„¶åŽåœ¨å®¿ä¸»æ ¹éƒ¨æ¸²æŸ“ï¼š

```tsx
<>
  <SchemaRenderer
    schema={schema}
    data={data}
    env={env}
    plugins={plugins}
    onActionError={onActionError}
  />
  <AmisDebuggerPanel controller={debuggerController} />
</>
```

è¿™æ ·åšçš„å¥½å¤„æ˜¯ï¼š

- å®¿ä¸»æ”¹é€ é¢å°
- è°ƒè¯•å™¨ UI ç”Ÿå‘½å‘¨æœŸä¸Ž schema èŠ‚ç‚¹ç”Ÿå‘½å‘¨æœŸè§£è€¦
- åŽç»­å¯ä»¥æ”¯æŒä¸€ä¸ªé¡µé¢å¤šä¸ª renderer root

## 8. `window` å…¨å±€å¼€å…³è®¾è®¡

ç”¨æˆ·è¦æ±‚é€šè¿‡ `window` ä¸Šçš„å…¨å±€å¼€å…³æŽ§åˆ¶è°ƒè¯•å™¨æ˜¯å¦æ˜¾ç¤ºï¼Œå»ºè®®åšæˆä¸¤çº§è¯­ä¹‰ï¼š

### 8.1 å…¨å±€å¯ç”¨å¼€å…³

å»ºè®®ä¸»å¼€å…³ï¼š

```ts
window.__NOP_AMIS_DEBUGGER__
```

å…è®¸ä¸¤ç§å½¢å¼ï¼š

```ts
window.__NOP_AMIS_DEBUGGER__ = true;
window.__NOP_AMIS_DEBUGGER__ = {
  enabled: true,
  defaultOpen: true,
  defaultTab: 'timeline',
  position: { x: 24, y: 24 },
  dock: 'floating'
};
```

å«ä¹‰å»ºè®®å¦‚ä¸‹ï¼š

- `false` æˆ–æœªè®¾ç½®: ä¸å¯ç”¨è°ƒè¯•å™¨ï¼Œä¸æ¸²æŸ“é¢æ¿ï¼Œä¹Ÿä¸æ¸²æŸ“ launcher
- `true`: å¯ç”¨è°ƒè¯•å™¨ï¼ŒæŒ‰é»˜è®¤é…ç½®è¿è¡Œ
- å¯¹è±¡: å¯ç”¨è°ƒè¯•å™¨ï¼Œå¹¶è¦†ç›–é»˜è®¤è¡Œä¸º

### 8.2 è¿è¡Œæ—¶æ˜¾éšå¼€å…³

å³ä½¿è°ƒè¯•å™¨å¯ç”¨ï¼Œä¹Ÿéœ€è¦æ”¯æŒç”¨æˆ·åœ¨è¿è¡Œæ—¶éšè—é¢æ¿ï¼Œä½†ä¿ç•™ä¸€ä¸ªæžå° launcherã€‚

å»ºè®®åŒºåˆ†ï¼š

- â€œå…¨å±€ç¦ç”¨â€: ç”± `window.__NOP_AMIS_DEBUGGER__` å†³å®š
- â€œé¢æ¿éšè—â€: è°ƒè¯•å™¨ä»å¯ç”¨ï¼Œä½† UI æŠ˜å ä¸ºå·¦ä¸‹è§’ launcher

è¿™æ ·å¯ä»¥æ»¡è¶³ï¼š

- å¼€å‘æˆ–è”è°ƒæ—¶æ‰“å¼€è°ƒè¯•å™¨
- é¡µé¢æ­£å¸¸ä½¿ç”¨æ—¶å°†å…¶éšè—ï¼Œä¸å½±å“æ“ä½œ
- éœ€è¦æ—¶éšæ—¶ä»Žå·¦ä¸‹è§’é‡æ–°æ‹‰èµ·

## 9. äº‹ä»¶é‡‡é›†è®¾è®¡

è°ƒè¯•å™¨ä¸åº”ç›´æŽ¥æš´éœ²åº•å±‚ monitor åŽŸå§‹äº‹ä»¶ï¼Œè€Œåº”å…ˆå½’ä¸€åŒ–æˆç»Ÿä¸€ timeline äº‹ä»¶ã€‚

### 9.1 äº‹ä»¶æ¥æº

å»ºè®®é‡‡é›†äº”ç±»æ¥æºï¼š

1. `env.monitor`
   - render start/end
   - action start/end
   - api request

2. `RendererPlugin`
   - `beforeCompile`
   - `afterCompile`
   - `beforeAction`
   - `onError`
   - å¯é€‰ `wrapComponent`

3. `env.fetcher` åŒ…è£…
   - request start
   - response end
   - abort
   - error
   - duration

4. `env.notify` åŒ…è£…
   - info / success / warning / error é€šçŸ¥

5. æ ¹çº§ `onActionError`
   - ä½œä¸ºåŠ¨ä½œé”™è¯¯å…œåº•

### 9.2 ç»Ÿä¸€äº‹ä»¶æ¨¡åž‹

å»ºè®®å†…éƒ¨ç»Ÿä¸€æˆå¦‚ä¸‹äº‹ä»¶ç§ç±»ï¼š

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

å»ºè®®æ¯æ¡äº‹ä»¶è‡³å°‘åŒ…å«ï¼š

- `id`
- `sessionId`
- `timestamp`
- `kind`
- `source`
- `nodeId?`
- `path?`
- `rendererType?`
- `actionType?`
- `requestKey?`
- `durationMs?`
- `summary`
- `detail`

å…¶ä¸­ï¼š

- `summary` ç”¨äºŽåˆ—è¡¨å¿«é€Ÿé˜…è¯»
- `detail` ç”¨äºŽè¯¦æƒ…åŒºæˆ– JSON æŸ¥çœ‹å™¨

### 9.3 åŒé‡ API ä¸ŠæŠ¥çš„å¤„ç†

ç”±äºŽå½“å‰ä»“åº“é‡Œ `onApiRequest` å¯èƒ½åŒæ—¶æ¥è‡ªåŠ¨ä½œå±‚å’Œè¯·æ±‚å±‚ï¼Œè°ƒè¯•å™¨å¿…é¡»åœ¨å†…éƒ¨åšä¸‹åˆ—ä¹‹ä¸€ï¼š

- åŽ»é‡
- æˆ–è€…æ˜Žç¡®æ ‡è®° `source: action-runtime | request-runtime | fetcher`

æŽ¨èæ–¹æ¡ˆæ˜¯ï¼š

- timeline ä¸­åªä¿ç•™ä¸€æ¡ä¸» `api:start`
- é¢å¤–æŠŠå…¶å®ƒæ¥æºä½œä¸ºäº‹ä»¶é™„å±žå…ƒæ•°æ®

é¿å…ä¸€å‘è¯·æ±‚åœ¨ UI ä¸­å‡ºçŽ°ä¸¤åˆ°ä¸‰æ¡å‡ ä¹Žé‡å¤çš„å¼€å§‹æ—¥å¿—ã€‚

## 10. UI å½¢æ€è®¾è®¡

### 10.1 åŸºæœ¬å½¢æ€

è°ƒè¯•å™¨ UI å»ºè®®ä¸æ˜¯å›ºå®šå³ä¾§è¾¹æ ï¼Œè€Œæ˜¯ä¸€ä¸ªå¯æ‹–æ‹½çš„æ¼‚æµ®é¢æ¿ï¼š

- é»˜è®¤æµ®åœ¨é¡µé¢ä¸Šå±‚
- å¯æ‹–æ‹½ç§»åŠ¨ä½ç½®
- æ”¯æŒæœ€å°åŒ–
- æ”¯æŒå…³é—­ä¸º launcher
- æ”¯æŒè®°å¿†ä¸Šæ¬¡ä½ç½®

åŽŸå› ï¼š

- æ¯”å³ä¾§å›ºå®šæ æ›´ä¸å é¡µé¢ç»“æž„ç©ºé—´
- æ›´é€‚åˆå¤æ‚é¡µé¢å’Œå¤šæ å¸ƒå±€
- æ›´ç¬¦åˆâ€œè°ƒè¯•æ—¶æ‰“å¼€ï¼Œä¸è°ƒè¯•æ—¶å°½é‡ä¸å¹²æ‰°â€çš„ç›®æ ‡

### 10.2 éšè—åŽçš„ launcher

å½“é¢æ¿éšè—åŽï¼Œå»ºè®®åœ¨å·¦ä¸‹è§’æ˜¾ç¤ºä¸€ä¸ªå°åž‹ launcherï¼š

- å°ºå¯¸å°
- é«˜ z-index
- ä¸è¦†ç›–ä¸»è¦äº¤äº’åŒº
- å¯ä»¥æ˜¾ç¤ºæœ€è¿‘é”™è¯¯æ•°é‡æˆ–æœªè¯»äº‹ä»¶æ•°

æŽ¨èé»˜è®¤ä½ç½®ï¼š

- å·¦ä¸‹è§’ï¼Œè·ç¦»è§†å£è¾¹ç¼˜ `16px ~ 24px`

### 10.3 æŽ¨èé¢æ¿å¸ƒå±€

ç¬¬ä¸€ç‰ˆå»ºè®®é¢æ¿åˆ†ä¸ºä¸‰å±‚ï¼š

1. é¡¶éƒ¨çŠ¶æ€æ 
   - å¯ç”¨çŠ¶æ€
   - å½“å‰ session
   - æš‚åœé‡‡é›†
   - æ¸…ç©ºäº‹ä»¶
   - æœ€å°åŒ–
   - å…³é—­ä¸º launcher

2. ä¸­éƒ¨ Tab åŒº
   - `Overview`
   - `Timeline`
   - `Node`
   - `Network`

3. åº•éƒ¨è¯¦æƒ…åŒº
   - å½“å‰é€‰ä¸­äº‹ä»¶è¯¦æƒ…
   - JSON å±•å¼€æŸ¥çœ‹
   - å…³é”®å­—æ®µæ‘˜è¦

### 10.4 æŽ¨è Tab è®¾è®¡

#### Overview

æ˜¾ç¤ºâ€œå½“å‰æ¡†æž¶æ˜¯å¦å¥åº·ã€æ´»è·ƒâ€çš„æ‘˜è¦ä¿¡æ¯ï¼š

- æœ€è¿‘ä¸€æ¬¡ compile æ—¶é—´
- æœ€è¿‘ä¸€æ¬¡ action
- æœ€è¿‘ä¸€æ¬¡è¯·æ±‚
- æœ€è¿‘é”™è¯¯æ•°
- å½“å‰äº‹ä»¶åžåé‡
- å½“å‰ schema root æ•°é‡

#### Timeline

æ›¿ä»£ playground å½“å‰çš„ç®€å•æ—¥å¿—é¢æ¿ï¼Œæˆä¸ºç¬¬ä¸€ä¸»è§†å›¾ï¼š

- æ—¶é—´å€’åºäº‹ä»¶æµ
- åˆ†ç±»ç­›é€‰
- å…³é”®å­—æœç´¢
- æš‚åœæµå¼å†™å…¥
- æ¸…ç©º
- åªçœ‹é”™è¯¯
- åªçœ‹å½“å‰èŠ‚ç‚¹

#### Node

ç”¨äºŽçœ‹â€œæŸä¸ªèŠ‚ç‚¹ä¸ºä»€ä¹ˆè¿™æ ·æ¸²æŸ“â€ï¼š

- å½“å‰é€‰ä¸­èŠ‚ç‚¹ `nodeId`
- `path`
- `rendererType`
- æœ€è¿‘ render æ¬¡æ•°å’Œè€—æ—¶
- æœ€è¿‘ action è§¦å‘è®°å½•
- å¯ç”¨æ—¶æ˜¾ç¤º meta / props æ‘˜è¦

ç¬¬ä¸€ç‰ˆä¸è¦æ±‚å®Œæ•´å¤åˆ» amis åŽŸè°ƒè¯•å™¨çš„ DOM inspectï¼Œä½†åº”é¢„ç•™åŽç»­æŽ¥å…¥ç©ºé—´ã€‚

#### Network

ç”¨äºŽçœ‹ API ç”Ÿå‘½å‘¨æœŸï¼š

- è¯·æ±‚æ–¹æ³•ã€URLã€çŠ¶æ€
- æŒç»­æ—¶é—´
- æ¥æºèŠ‚ç‚¹
- action è§¦å‘é“¾è·¯
- è¯·æ±‚å‚æ•°æ‘˜è¦
- å“åº”æ‘˜è¦
- å–æ¶ˆçŠ¶æ€

## 11. å¿…é¡»å±•ç¤ºçš„å…³é”®ä¿¡æ¯

æ ¹æ®å½“å‰ä»“åº“æž¶æž„ï¼Œä»¥ä¸‹ä¿¡æ¯å±žäºŽâ€œå…³é”®æ€§ä¿¡æ¯â€ï¼Œåº”ä¼˜å…ˆçº³å…¥ç¬¬ä¸€ç‰ˆæˆ–ç¬¬ä¸€é˜¶æ®µå¢žå¼ºç‰ˆã€‚

### 11.1 ç¬¬ä¸€ä¼˜å…ˆçº§

- render å®Œæˆäº‹ä»¶
- action å¼€å§‹/ç»“æŸ
- API å¼€å§‹/ç»“æŸ/å–æ¶ˆ/å¤±è´¥
- notify æ¶ˆæ¯
- compile å¼€å§‹/å®Œæˆ
- action çº§é”™è¯¯
- request çº§é”™è¯¯

### 11.2 ç¬¬äºŒä¼˜å…ˆçº§

- äº‹ä»¶å…³è”çš„ `nodeId`ã€`path`ã€`rendererType`
- action ç»“æžœçŠ¶æ€ï¼Œä¾‹å¦‚ success / failed / cancelled
- API duration
- å½“å‰ session å†…çš„é”™è¯¯ç»Ÿè®¡
- æœ€è¿‘ä¸€æ¬¡äº¤äº’é“¾è·¯æ‘˜è¦

### 11.3 ç¬¬ä¸‰ä¼˜å…ˆçº§

- å½“å‰èŠ‚ç‚¹ props æ‘˜è¦
- å½“å‰èŠ‚ç‚¹ meta æ‘˜è¦
- å½“å‰ä½œç”¨åŸŸæ•°æ®å¿«ç…§æ‘˜è¦
- ç¼–è¯‘åŽçš„èŠ‚ç‚¹ç»“æž„æ‘˜è¦
- è°ƒè¯•å™¨å†…éƒ¨æ€§èƒ½ç»Ÿè®¡

## 12. äº¤äº’åŠŸèƒ½æ¸…å•

å»ºè®®åŠŸèƒ½æŒ‰é˜¶æ®µæ‹†åˆ†ã€‚

### 12.1 MVP å¿…é¡»åŒ…å«

- `window` å…¨å±€å¯ç”¨å¼€å…³
- æ¼‚æµ®é¢æ¿
- æ‹–æ‹½ç§»åŠ¨
- æœ€å°åŒ– / éšè—
- å·¦ä¸‹è§’ launcher
- Timeline äº‹ä»¶æµ
- render/action/api/notify/error/compile åˆ†ç±»å±•ç¤º
- ç­›é€‰
- æš‚åœ
- æ¸…ç©º
- äº‹ä»¶è¯¦æƒ…æŸ¥çœ‹

### 12.2 ç¬¬ä¸€é˜¶æ®µå¢žå¼º

- Network ä¸“é¡¹è§†å›¾
- é”™è¯¯èšåˆè§†å›¾
- äº‹ä»¶æœç´¢
- é¢æ¿ä½ç½®æŒä¹…åŒ–
- æœ€è¿‘é”™è¯¯è§’æ ‡
- API åŽ»é‡ä¸Žé“¾è·¯å½’å¹¶

### 12.3 ç¬¬äºŒé˜¶æ®µå¢žå¼º

- èŠ‚ç‚¹ inspect
- èŠ‚ç‚¹çº§ render ç»Ÿè®¡
- é€‰ä¸­èŠ‚ç‚¹æœ€è¿‘äº‹ä»¶è¿‡æ»¤
- ä½œç”¨åŸŸå¿«ç…§æŸ¥çœ‹
- ç¼–è¯‘ç»“æžœæ‘˜è¦

### 12.4 æš‚ä¸å»ºè®®æ”¾å…¥ç¬¬ä¸€ç‰ˆ

- å®Œæ•´ DOM inspect é€‰å–å™¨
- é€šè¿‡è¡¨è¾¾å¼æ‰§è¡Œå™¨ç›´æŽ¥è¿è¡Œä»»æ„ JS
- æ·±åº¦è®¢é˜…å†…éƒ¨ form/page store ç§æœ‰çŠ¶æ€
- è¿œç¨‹ä¸Šä¼ æ—¥å¿—
- action replay

## 13. çŠ¶æ€ä¸Žæ€§èƒ½è®¾è®¡

è°ƒè¯•å™¨æ˜¯å¼€å‘å·¥å…·ï¼Œä½†ä»ç„¶ä¸èƒ½æ˜Žæ˜¾æ‹–æ…¢é¡µé¢ã€‚

### 13.1 å­˜å‚¨ç­–ç•¥

å»ºè®®å†…éƒ¨ç»´æŠ¤ä¸€ä¸ª session çº§ storeï¼š

- å†…å­˜æ€æ—¶é—´çº¿
- é»˜è®¤äº‹ä»¶ä¸Šé™ï¼Œä¾‹å¦‚ 300 ~ 500 æ¡
- è¶…å‡ºä¸Šé™æ—¶ä¸¢å¼ƒæœ€æ—§äº‹ä»¶

### 13.2 UI æ€§èƒ½ç­–ç•¥

- åˆ—è¡¨è™šæ‹ŸåŒ–ä¸æ˜¯ç¬¬ä¸€ç‰ˆå¿…é¡»é¡¹ï¼Œä½†è¦é¢„ç•™
- JSON è¯¦æƒ…æŒ‰éœ€å±•å¼€
- å¤§å¯¹è±¡åªå±•ç¤ºæ‘˜è¦ï¼ŒåŽŸå§‹å†…å®¹æƒ°æ€§æŸ¥çœ‹
- render é«˜é¢‘äº‹ä»¶å¯åšåˆå¹¶æˆ–èŠ‚æµ

### 13.3 å®‰å…¨ä¸ŽçŽ¯å¢ƒè¾¹ç•Œ

- é»˜è®¤åªåœ¨å¼€å‘çŽ¯å¢ƒå¯ç”¨
- ç”Ÿäº§çŽ¯å¢ƒé™¤éžæ˜¾å¼å¼€å¯ï¼Œå¦åˆ™ä¸åŠ è½½ UI
- å¯¹ request/response æ•°æ®æ”¯æŒè„±æ•ç­–ç•¥
- ä¸é»˜è®¤å±•ç¤ºæ•æ„Ÿ headerã€tokenã€cookie

## 14. æŽ¨è API è‰æ¡ˆ

å»ºè®®å¯¹å¤–æš´éœ²ä»¥ä¸‹èƒ½åŠ›ï¼š

```ts
export interface AmisDebuggerOptions {
  id?: string;
  enabled?: boolean;
  maxEvents?: number;
  launcherPosition?: 'left-bottom';
}

export interface AmisDebuggerController {
  enabled: boolean;
  plugin: RendererPlugin;
  decorateEnv(env: RendererEnv): RendererEnv;
  onActionError(error: unknown, context: ActionContext): void;
  show(): void;
  hide(): void;
  toggle(): void;
  clear(): void;
  pause(): void;
  resume(): void;
}

export function createAmisDebugger(options?: AmisDebuggerOptions): AmisDebuggerController;
export function AmisDebuggerPanel(props: { controller: AmisDebuggerController }): React.ReactElement | null;
```

## 15. é¢å‘ AI è‡ªåŠ¨è¯Šæ–­çš„å†…ç½®æ”¯æŒ

è°ƒè¯•å™¨ä¸ä»…è¦æ–¹ä¾¿äººç±»å¼€å‘è€…çœ‹é¢æ¿ï¼Œä¹Ÿå¿…é¡»æ–¹ä¾¿ AI ä»£ç†è‡ªåŠ¨è¯»å–çŠ¶æ€ã€æ£€ç´¢äº‹ä»¶ã€ç­‰å¾…å¼‚æ­¥ç»“æžœã€ç”Ÿæˆè¯Šæ–­æŠ¥å‘Šã€‚

è¿™æ„å‘³ç€è°ƒè¯•å™¨éœ€è¦åŒæ—¶æä¾›ä¸¤å±‚æŽ¥å£ï¼š

1. é¢å‘å®¿ä¸»æŽ¥å…¥çš„ UI/controller æŽ¥å£
2. é¢å‘è‡ªåŠ¨åŒ–è¯Šæ–­çš„ç¨³å®š automation API

### 15.1 è®¾è®¡åŽŸåˆ™

é¢å‘ AI çš„æŽ¥å£éœ€è¦æ»¡è¶³ï¼š

- ç»“æž„åŒ–ï¼Œé¿å…åªèƒ½è§£æžè‡ªç„¶è¯­è¨€æ—¥å¿—
- ç¨³å®šï¼Œé¿å…ä¾èµ– UI DOM ç»“æž„
- å¯æŸ¥è¯¢ï¼Œæ”¯æŒæŒ‰ `kind`ã€`group`ã€`nodeId`ã€`path`ã€`actionType`ã€`requestKey` ç­‰å­—æ®µè¿‡æ»¤
- å¯ç­‰å¾…ï¼Œæ”¯æŒâ€œç­‰å¾…æŸç±»äº‹ä»¶å‡ºçŽ°åŽå†ç»§ç»­â€
- å¯æ‘˜è¦ï¼Œæ”¯æŒå¿«é€Ÿäº§å‡ºè¯Šæ–­æŠ¥å‘Šï¼Œè€Œä¸æ˜¯è®© AI æ¯æ¬¡éƒ½è‡ªå·±é‡æ‰«å…¨éƒ¨äº‹ä»¶
- å¯å‘çŽ°ï¼Œå…è®¸é€šè¿‡ `window` ä¸Šçš„å…¨å±€å¯¹è±¡ç›´æŽ¥æ‹¿åˆ°å½“å‰è°ƒè¯•æŽ§åˆ¶å™¨æˆ–è°ƒè¯• hub

### 15.2 æŽ¨èè‡ªåŠ¨åŒ– API å½¢æ€

å»ºè®® `@nop-chaos/amis-debugger` æš´éœ²ä¸€å¥—æ˜Žç¡®çš„ automation APIï¼š

```ts
export interface AmisDebuggerAutomationApi {
  controllerId: string;
  sessionId: string;
  version: '1';
  getSnapshot(): AmisDebuggerSnapshot;
  getOverview(): AmisDebuggerOverview;
  queryEvents(query?: AmisDebugEventQuery): AmisDebugEvent[];
  getLatestEvent(query?: AmisDebugEventQuery): AmisDebugEvent | undefined;
  getLatestError(): AmisDebugEvent | undefined;
  createDiagnosticReport(options?: AmisDiagnosticReportOptions): AmisDiagnosticReport;
  waitForEvent(options?: AmisWaitForEventOptions): Promise<AmisDebugEvent>;
  clear(): void;
  pause(): void;
  resume(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  setActiveTab(tab: AmisDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
}
```

å…¶ä¸­æœ€å…³é”®çš„æ˜¯ï¼š

- `queryEvents()` è®© AI ç›´æŽ¥åšç»“æž„åŒ–æ£€ç´¢
- `getLatestEvent()` è®© AI å¿«é€ŸèŽ·å–æŸç±»æœ€æ–°çŠ¶æ€
- `getLatestError()` è®© AI ç›´æŽ¥å®šä½æœ€è¿‘é”™è¯¯
- `createDiagnosticReport()` è®© AI å¿«é€ŸèŽ·å–å¯ä»¥ç›´æŽ¥ç”¨äºŽæŽ¨ç†çš„æ‘˜è¦
- `waitForEvent()` è®© AI å¯ä»¥åœ¨è‡ªåŠ¨äº¤äº’æµç¨‹é‡Œç­‰å¾…è¯·æ±‚ç»“æŸã€é”™è¯¯å‡ºçŽ°ã€åŠ¨ä½œå®Œæˆ

### 15.3 æŽ¨èæŸ¥è¯¢æ¨¡åž‹

å»ºè®®äº‹ä»¶æŸ¥è¯¢å¯¹è±¡è‡³å°‘æ”¯æŒï¼š

- `kind`
- `group`
- `level`
- `source`
- `nodeId`
- `path`
- `rendererType`
- `actionType`
- `requestKey`
- `text`
- `sinceTimestamp`
- `untilTimestamp`
- `limit`

è¿™æ · AI å°±å¯ä»¥æ‰§è¡Œç±»ä¼¼è¯Šæ–­ï¼š

- æ‰¾æœ€è¿‘ 10 æ¡ error
- æ‰¾æŸä¸ª `nodeId` çš„ render/action äº‹ä»¶
- æ‰¾ `/api/users` ç›¸å…³è¯·æ±‚
- æ‰¾æœ€è¿‘ä¸€æ¬¡ `submitForm` çš„ç»“æŸç»“æžœ
- æ‰¾æŸä¸ªæ—¶é—´ç‚¹ä¹‹åŽæ–°å¢žçš„æ‰€æœ‰é”™è¯¯

### 15.4 æŽ¨èå…¨å±€æš´éœ²æ–¹å¼

ä¸ºäº†æ–¹ä¾¿ browser automationã€Playwrightã€DevTools Consoleã€AI agent ç›´æŽ¥è¯»å–ï¼Œå»ºè®®åœ¨ `window` ä¸Šæš´éœ²ï¼š

```ts
window.__NOP_AMIS_DEBUGGER_API__
window.__NOP_AMIS_DEBUGGER_HUB__
```

è¯­ä¹‰å»ºè®®ï¼š

- `__NOP_AMIS_DEBUGGER_API__` æŒ‡å‘å½“å‰æ´»åŠ¨ controller çš„ automation API
- `__NOP_AMIS_DEBUGGER_HUB__` ç”¨äºŽå¤šå®žä¾‹åœºæ™¯ï¼ŒæŒ‰ `controllerId` ç®¡ç†å¤šä¸ªè°ƒè¯•å™¨å®žä¾‹

ç¤ºä¾‹ï¼š

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;
const latestError = api?.getLatestError();
const report = api?.createDiagnosticReport({ eventLimit: 25 });
```

å¤šå®žä¾‹ç¤ºä¾‹ï¼š

```ts
const hub = window.__NOP_AMIS_DEBUGGER_HUB__;
const controller = hub?.getController('playground-main');
const renderEvents = controller?.queryEvents({ group: 'render', limit: 20 });
```

ç­‰å¾…äº‹ä»¶ç¤ºä¾‹ï¼š

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;

await api?.waitForEvent({
  kind: 'api:end',
  text: '/api/users',
  timeoutMs: 5000
});
```

è¯Šæ–­æŠ¥å‘Šç¤ºä¾‹ï¼š

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;

const report = api?.createDiagnosticReport({
  eventLimit: 25,
  query: {
    sinceTimestamp: Date.now() - 10_000
  }
});
```

### 15.5 æŽ¨èè¯Šæ–­æŠ¥å‘Šç»“æž„

å»ºè®®å†…ç½®ä¸€ç±»ç¨³å®šæ‘˜è¦å¯¹è±¡ï¼Œè€Œä¸æ˜¯è®© AI æ¯æ¬¡éƒ½æ‰‹å†™èšåˆé€»è¾‘ï¼š

```ts
export interface AmisDiagnosticReport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: {
    enabled: boolean;
    panelOpen: boolean;
    paused: boolean;
    activeTab: AmisDebuggerTab;
    filters: AmisDebuggerFilterKind[];
  };
  overview: AmisDebuggerOverview;
  latestError?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  recentEvents: AmisDebugEvent[];
}
```

è¿™ç±»ç»“æž„ç‰¹åˆ«é€‚åˆï¼š

- AI åœ¨è‡ªåŠ¨åŒ–å¤±è´¥åŽå¿«é€Ÿåšé¦–è½®å½’å› 
- issue bot è‡ªåŠ¨é™„åŠ è°ƒè¯•æ‘˜è¦
- å›žå½’æµ‹è¯•å¤±è´¥æ—¶ç”Ÿæˆç»“æž„åŒ–è¯Šæ–­ä¸Šä¸‹æ–‡

### 15.6 ç»“æž„åŒ– network æ‘˜è¦

ä¸ºäº†é¿å… AI åªèƒ½è§£æž `detail` å­—ç¬¦ä¸²ï¼Œå»ºè®®æ‰€æœ‰ API ç›¸å…³äº‹ä»¶éƒ½å°½é‡æºå¸¦ç‹¬ç«‹çš„ç»“æž„åŒ– `network` å­—æ®µï¼Œä¾‹å¦‚ï¼š

```ts
export interface AmisDebugEventNetworkSummary {
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  aborted?: boolean;
  requestDataKeys?: string[];
  responseDataKeys?: string[];
  responseType?: string;
}
```

æŽ¨èç”¨é€”ï¼š

- AI åˆ¤æ–­è¯·æ±‚æ˜¯å¦æˆåŠŸï¼Œä¸å¿…è§£æž `summary`
- AI çœ‹è¯·æ±‚/å“åº”å¤§è‡´ç»“æž„ï¼Œä¸å¿…å±•å¼€æ•´ä¸ª payload
- AI æŒ‰ `url`ã€`status`ã€`requestDataKeys` åšå¿«é€Ÿç­›é€‰å’Œå½’å› 

### 15.7 èŠ‚ç‚¹çº§è¯Šæ–­æŽ¥å£

å»ºè®®å†…ç½®ä¸€ä¸ªèŠ‚ç‚¹èšåˆè¯Šæ–­æŽ¥å£ï¼Œè€Œä¸æ˜¯æ¯æ¬¡éƒ½è®© AI å…ˆ `queryEvents()` å†è‡ªå·±èšåˆï¼š

```ts
export interface AmisNodeDiagnosticsOptions {
  nodeId?: string;
  path?: string;
  limit?: number;
}

export interface AmisNodeDiagnostics {
  nodeId?: string;
  path?: string;
  rendererTypes: string[];
  totalEvents: number;
  countsByGroup: Partial<Record<AmisDebuggerFilterKind, number>>;
  countsByKind: Partial<Record<AmisDebugEventKind, number>>;
  latestRender?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  recentEvents: AmisDebugEvent[];
}
```

è¿™æ · AI å¯ä»¥ç›´æŽ¥æ‰§è¡Œï¼š

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;
const nodeDiagnostics = api?.getNodeDiagnostics({ nodeId: 'user-form' });
```

è€Œä¸æ˜¯è‡ªå·±äºŒæ¬¡æ‰«ææ•´æ¡æ—¶é—´çº¿ã€‚

### 15.8 äº¤äº’é“¾è·¯ä¸Ž session å¯¼å‡ºæŽ¥å£

é™¤äº†å•äº‹ä»¶æŸ¥è¯¢å’Œå•èŠ‚ç‚¹è¯Šæ–­ï¼Œè¿˜å»ºè®®æä¾›ä¸¤ç±»æ›´é«˜å±‚æŽ¥å£ï¼š

1. `getInteractionTrace()`
2. `exportSession()`

æŽ¨èå½¢æ€ï¼š

```ts
export interface AmisInteractionTraceQuery {
  requestKey?: string;
  actionType?: string;
  nodeId?: string;
  path?: string;
  sinceTimestamp?: number;
  untilTimestamp?: number;
  limit?: number;
}

export interface AmisInteractionTrace {
  query: AmisInteractionTraceQuery;
  totalEvents: number;
  matchedEvents: AmisDebugEvent[];
  relatedErrors: AmisDebugEvent[];
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  requestKeys: string[];
  actionTypes: string[];
  nodeIds: string[];
  paths: string[];
}

export interface AmisDebuggerSessionExport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: AmisDebuggerSnapshot;
  overview: AmisDebuggerOverview;
  latestError?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  events: AmisDebugEvent[];
}
```

ç”¨é€”å»ºè®®ï¼š

- `getInteractionTrace()` é€‚åˆ AI åœ¨ä¸€æ¬¡ç‚¹å‡»ã€ä¸€æ¬¡æäº¤ã€ä¸€æ¬¡è¯·æ±‚å¤±è´¥ä¹‹åŽè¿½è¸ªç›¸å…³é“¾è·¯
- `exportSession()` é€‚åˆ AIã€æµ‹è¯•æ¡†æž¶ã€issue botã€CI äº§å‡ºç¨³å®š JSON å¿«ç…§

ç¤ºä¾‹ï¼š

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;

const trace = api?.getInteractionTrace({
  path: 'body.1'
});

const exported = api?.exportSession({
  eventLimit: 50
});
```

### 15.9 è„±æ•ä¸Žå®‰å…¨å¯¼å‡º

ç”±äºŽ AI è°ƒè¯•å™¨æœ€ç»ˆå¯èƒ½æŽ¥å…¥çœŸå®žæŽ¥å£ï¼Œè¯·æ±‚å’Œå“åº”ä¸­å¯èƒ½åŒ…å«æ•æ„Ÿå­—æ®µï¼Œå› æ­¤å»ºè®®å¯¼å‡ºèƒ½åŠ›é»˜è®¤æ”¯æŒè„±æ•ã€‚

æŽ¨èé…ç½®ï¼š

```ts
export interface AmisDebuggerRedactionOptions {
  enabled?: boolean;
  redactKeys?: string[];
  mask?: string;
  maxDepth?: number;
  redactValue?(context: AmisDebuggerRedactionMatchContext): unknown;
  allowValue?(context: AmisDebuggerRedactionMatchContext): boolean;
}
```

æŽ¨èé»˜è®¤è„±æ•å…³é”®å­—ï¼š

- `token`
- `authorization`
- `cookie`
- `password`
- `secret`
- `accessKey`
- `refreshToken`

è®¾è®¡å»ºè®®ï¼š

- UI å¯ç»§ç»­å±•ç¤ºé«˜å±‚æ‘˜è¦
- `exportSession()` è¾“å‡ºæ—¶å¯¹ç»“æž„åŒ– `exportedData` åšè„±æ•
- ç½‘ç»œäº‹ä»¶ä¸­ä¿ç•™ `requestDataKeys` / `responseDataKeys` è¿™æ ·çš„ shape ä¿¡æ¯ï¼Œé¿å… AI å› è„±æ•è€Œå®Œå…¨å¤±åŽ»ä¸Šä¸‹æ–‡
- å…è®¸å®¿ä¸»é€šè¿‡ `redaction` é…ç½®è¦†ç›–é»˜è®¤è§„åˆ™

è¿™æ ·å¯ä»¥å¹³è¡¡ä¸¤ä»¶äº‹ï¼š

- AI è¶³å¤Ÿæ‹¿åˆ°å¯åˆ†æžçš„ç»“æž„ä¿¡æ¯
- å¯¼å‡ºçš„ JSON ä¸è½»æ˜“æ³„éœ²æ•æ„Ÿå€¼

### 15.10 ä¸å»ºè®® AI ä¾èµ–çš„å¯¹è±¡

ä¸å»ºè®®æŠŠä»¥ä¸‹å†…å®¹å½“æˆ AI ä¸»æŽ¥å£ï¼š

- è°ƒè¯•é¢æ¿ DOM ç»“æž„
- æ–‡æœ¬æ¸²æŸ“åŽçš„è§†è§‰å¸ƒå±€
- CSS class æ˜¯å¦å­˜åœ¨
- æµè§ˆå™¨æŽ§åˆ¶å°é‡Œçš„äººç±»å¯è¯»å­—ç¬¦ä¸²æ—¥å¿—

åŽŸå› æ˜¯è¿™äº›æŽ¥å£ä¸ç¨³å®šã€æ˜“å˜ã€éš¾ä»¥ç»“æž„åŒ–æ¶ˆè´¹ã€‚

AI çš„ä¸»æŽ¥å£åº”è¯¥å§‹ç»ˆæ˜¯ï¼š

- controller æ–¹æ³•
- automation API
- å…¨å±€ hub
- ç»“æž„åŒ– diagnostic report

## 16. æŽ¨èå®žçŽ°é¡ºåº

### Phase 1: æ ¸å¿ƒé‡‡é›†å’Œ Timeline

- æ–°å»º `packages/amis-debugger`
- å®Œæˆ `window` å¼€å…³åˆ¤æ–­
- å®Œæˆ controller/store/timeline
- å®Œæˆ `env` è£…é¥°å’Œ `plugin` æ³¨å…¥
- å®ŒæˆåŸºç¡€æµ®åŠ¨é¢æ¿å’Œ launcher
- åœ¨ playground æŽ¥å…¥éªŒè¯

### Phase 2: Network å’Œé”™è¯¯è§†å›¾

- åŒ…è£… `fetcher`ï¼Œè¡¥é½ `api:end` / `api:error` / `api:abort`
- å»ºç«‹è¯·æ±‚åŽ»é‡å’Œé“¾è·¯å…³è”
- å¢žåŠ é”™è¯¯èšåˆä¸Žè¯¦æƒ…

### Phase 3: Node è§†å›¾å¢žå¼º

- è¡¥å……èŠ‚ç‚¹çº§ç»Ÿè®¡
- å¢žåŠ èŠ‚ç‚¹ä¸Šä¸‹æ–‡æ‘˜è¦
- è¯„ä¼°æ˜¯å¦éœ€è¦æ›´è½»é‡çš„ inspect èƒ½åŠ›

## 17. å¯¹ playground çŽ°æœ‰æ—¥å¿—é¡µçš„æ›¿ä»£å…³ç³»

å½“å‰ `apps/playground/src/App.tsx` ä¸­çš„å³ä¾§æ—¥å¿—é¢æ¿å¯ä»¥è§†ä¸ºåŽŸåž‹éªŒè¯ã€‚æ­£å¼è°ƒè¯•å™¨è½åœ°åŽï¼Œå»ºè®®å…³ç³»å¦‚ä¸‹ï¼š

- playground ä¸å†è‡ªå·±ç»´æŠ¤ä¸€å¥—ç‹¬ç«‹æ´»åŠ¨æ—¥å¿—æ¨¡åž‹
- playground æ”¹ä¸ºæŽ¥å…¥ `@nop-chaos/amis-debugger`
- playground å¯ä»¥ä¿ç•™å°‘é‡ demo é…ç½®ä»£ç ï¼Œä½†ä¸å†æŒæœ‰å®Œæ•´è°ƒè¯• UI é€»è¾‘

è¿™æ ·å¯ä»¥ä¿è¯ï¼š

- è°ƒè¯•èƒ½åŠ›ä»Ž demo ä»£ç ä¸Šå‡ä¸ºæ¡†æž¶èƒ½åŠ›
- æœªæ¥å…¶å®ƒ app ä¹Ÿå¯ä»¥æŽ¥å…¥åŒä¸€å¥—è°ƒè¯•å™¨
- playground æœ¬èº«å›žå½’â€œé›†æˆéªŒè¯é¢â€ï¼Œè€Œä¸æ˜¯â€œè°ƒè¯•å™¨å®žçŽ°å®¹å™¨â€

## 18. æœ€ç»ˆå»ºè®®

ç»¼åˆå½“å‰ä»“åº“æž¶æž„ã€çŽ°æœ‰ monitor èƒ½åŠ›å’Œå‚è€ƒå®žçŽ°ç»éªŒï¼ŒæŽ¨èç»“è®ºå¦‚ä¸‹ï¼š

1. æ–°å¢žç‹¬ç«‹ package `@nop-chaos/amis-debugger`ã€‚
2. ä»¥ `SchemaRenderer` å®¿ä¸»æ ¹è¾¹ç•Œä½œä¸ºå”¯ä¸€ä¸»æŽ¥å…¥ç‚¹ã€‚
3. é€šè¿‡ `window.__NOP_AMIS_DEBUGGER__` ä½œä¸ºå…¨å±€å¯ç”¨å¼€å…³ã€‚
4. è°ƒè¯•å™¨ UI é‡‡ç”¨æ¼‚æµ®ã€å¯æ‹–æ‹½ã€å¯éšè—çš„é¢æ¿ï¼Œè€Œä¸æ˜¯å›ºå®šå³ä¾§æ ã€‚
5. éšè—åŽä¿ç•™å·¦ä¸‹è§’ launcherï¼Œä¿è¯ä¸å½±å“é¡µé¢æ­£å¸¸ä½¿ç”¨ã€‚
6. ç¬¬ä¸€ç‰ˆèšç„¦ `compile + render + action + api + notify + error` å…­ç±»å…³é”®ä¿¡æ¯ã€‚
7. è°ƒè¯•å™¨å†…éƒ¨å¿…é¡»å…ˆå»ºç«‹ç»Ÿä¸€ timeline äº‹ä»¶æ¨¡åž‹ï¼Œå†å†³å®š UI å¦‚ä½•å±•ç¤ºã€‚
8. ä¸ç›´æŽ¥å¤åˆ¶å‚è€ƒ amis è°ƒè¯•å™¨çš„ DOM å’Œå…¨å±€å•ä¾‹å®žçŽ°ï¼Œä½†å€Ÿé‰´å…¶â€œå…¨å±€å¼€å…³ã€ç‹¬ç«‹æµ®å±‚ã€æ—¥å¿— + inspect åŒè§†è§’â€çš„æ€è·¯ã€‚
9. å¿…é¡»å†…ç½®é¢å‘ AI çš„ automation APIã€å…¨å±€ hub å’Œç»“æž„åŒ– diagnostic reportï¼Œé¿å… AI åªèƒ½é€šè¿‡è¯» UI æ–‡æœ¬æ¥è¯Šæ–­é—®é¢˜ã€‚

## 19. å…³é”®ä»£ç é”šç‚¹

å½“å‰ä»“åº“ï¼š

- `apps/playground/src/App.tsx`
- `packages/flux-core/src/index.ts`
- `packages/flux-react/src/index.tsx`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `docs/architecture/frontend-baseline.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/amis-runtime-module-boundaries.md`

å‚è€ƒå®žçŽ°ï¼š

- `C:/can/nop/templates/amis/packages/amis-core/src/utils/debug.tsx`
- `C:/can/nop/templates/amis/packages/amis-core/src/SchemaRenderer.tsx`
- `C:/can/nop/templates/amis/packages/amis-core/src/factory.tsx`
- `C:/can/nop/templates/amis/docs/zh-CN/extend/debug.md`


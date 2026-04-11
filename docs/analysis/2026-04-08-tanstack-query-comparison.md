# TanStack Query ä¸Ž NOP Chaos Flux å¯¹æ¯”åˆ†æž

> æ—¥æœŸ: 2026-04-08
> çŠ¶æ€: åˆ†æžæ–‡æ¡£
> æºç åŸºå‡†: TanStack Query v5 (~/sources/query), nop-chaos-flux master
> è¾¹ç•Œ: æœ¬æ–‡èšç„¦äºŽ data-sourceã€reactionã€operational control ä¸‰ä¸ªé¢†åŸŸçš„è®¾è®¡å¯¹æ¯”ï¼Œä¸æ¶‰åŠ TanStack Query çš„ persistenceã€hydrationã€devtools ç­‰å¤–å›´èƒ½åŠ›ã€‚

## ç›®çš„

åˆ†æž TanStack Query çš„æ ¸å¿ƒæž¶æž„è®¾è®¡ï¼Œå¯¹ç…§ Flux å½“å‰åœ¨ data-sourceã€reactionã€operational control æ–¹é¢çš„å®žçŽ°ï¼Œå›žç­”ä¸‰ä¸ªé—®é¢˜ï¼š

1. TanStack Query çš„æ ¸å¿ƒæŠ½è±¡ä¸Ž Flux çš„ data-source/reaction åœ¨å®šä½ä¸Šæœ‰ä½•æ ¹æœ¬å·®å¼‚ã€‚
2. TanStack Query çš„å“ªäº›æˆç†Ÿè®¾è®¡å¯¹ Flux æœ‰çœŸå®žå‚è€ƒä»·å€¼ã€‚
3. Flux åœ¨å“ªäº›æ–¹å‘å·²ç»æ¯” TanStack Query æ›´é€‚åˆè‡ªèº«ç›®æ ‡ï¼Œä¸åº”ç…§æ¬ã€‚

## ç»“è®ºæ‘˜è¦

| ç»´åº¦ | å‚è€ƒä»·å€¼ | å»ºè®® |
| --- | --- | --- |
| çŠ¶æ€æœº + reducer æ¨¡å¼ | **é«˜** | DataSourceController å¯å¼•å…¥æ˜¾å¼çŠ¶æ€æœºæ›¿ä»£ ad-hoc boolean flags |
| Observer å¼•ç”¨è®¡æ•° â†’ GC | **ä¸­** | å·²é€šè¿‡ scope-scoped registry + dispose è¦†ç›–ï¼Œä¸éœ€è¦é¢å¤– GC æœºåˆ¶ |
| é€šçŸ¥æ‰¹é‡è°ƒåº¦ (notifyManager) | **ä¸­** | å¤š source åŒæ—¶è§¦å‘åˆ·æ–°æ—¶å¯è€ƒè™‘æ‰¹é‡é€šçŸ¥ |
| ç»“æž„å…±äº« (structural sharing) | **é«˜** | å¯åœ¨ scope.update / selector å±‚å¼•å…¥å¼•ç”¨ç¨³å®šæ€§ä¼˜åŒ– |
| åŒè½¨çŠ¶æ€ (status + fetchStatus) | **é«˜** | å½“å‰ loading/stale/error æ‰å¹³çŠ¶æ€ç¼ºå°‘ data-ready ä¸Ž fetching çš„åˆ†ç¦» |
| Retryer æŠ½è±¡ | **ä¸­** | å½“å‰ retry é€»è¾‘æ•£åœ¨ action-runtimeï¼Œå¯æŠ½å–ç‹¬ç«‹ Retryer |
| Invalidation flag æ¨¡å¼ | **ä½Ž** | Flux çš„ä¾èµ–è¿½è¸ªå·²è¦†ç›–è‡ªåŠ¨å¤±æ•ˆï¼Œæ‰‹åŠ¨ invalidate åœºæ™¯æœ‰é™ |
| Mutation ç”Ÿå‘½å‘¨æœŸ (onMutate â†’ onError â†’ onSuccess) | **é«˜** | å¯¹ ajax action é“¾å¼å›žè°ƒè®¾è®¡æœ‰ç›´æŽ¥å‚è€ƒä»·å€¼ |
| Query dedup + å…±äº« | **ä¸­** | å½“å‰ dedup æŒ‰ action owner éš”ç¦»ï¼Œè·¨ owner å…±äº«å¯è¯„ä¼° |
| Tracked props / ç²¾ç»†è®¢é˜… | **é«˜** | useScopeSelector çš„ equalityFn å¯ä»¥å‚è€ƒ tracked-props è‡ªåŠ¨è¿½è¸ªæ¨¡å¼ |

---

## ä¸€ã€TanStack Query æ ¸å¿ƒæž¶æž„æ¦‚è§ˆ

### 1.1 ç±»å±‚æ¬¡å…³ç³»

```
QueryClient (å…¨å±€åè°ƒå™¨)
  â”œâ”€â”€ QueryCache extends Subscribable (æŸ¥è¯¢å­˜å‚¨ + GC)
  â”‚     â””â”€â”€ Query extends Removable (å•æŸ¥è¯¢å®žä¾‹ + çŠ¶æ€æœº + fetch)
  â”‚           â””â”€â”€ QueryObserver extends Subscribable (æ¡¥æŽ¥ React è®¢é˜…)
  â”‚
  â””â”€â”€ MutationCache extends Subscribable (å˜æ›´å­˜å‚¨ + é˜Ÿåˆ—)
        â””â”€â”€ Mutation extends Removable (å•å˜æ›´å®žä¾‹ + ç”Ÿå‘½å‘¨æœŸ)
              â””â”€â”€ MutationObserver extends Subscribable (æ¡¥æŽ¥ React è®¢é˜…)

åŸºç¡€è®¾æ–½:
  Subscribable    â†’ å‘å¸ƒè®¢é˜…åŸºç±» (Set<Listener>)
  Removable       â†’ GC åŸºç±» (gcTime + scheduleGc)
  Retryer         â†’ é‡è¯•æ‰§è¡Œå™¨ (æŒ‡æ•°é€€é¿ + pause/continue)
  NotifyManager   â†’ é€šçŸ¥æ‰¹è°ƒåº¦ (transaction + flush)
```

### 1.2 QueryState çŠ¶æ€æœº

TanStack Query çš„æ ¸å¿ƒçŠ¶æ€ç”±ä¸¤æ¡è½¨é“ç»„æˆï¼š

**æ•°æ®è½¨é“ (status)**: è¡¨ç¤ºæ•°æ®æœ¬èº«çš„ç”Ÿå‘½å‘¨æœŸ
```typescript
type QueryStatus = 'pending' | 'error' | 'success'
```

**ç½‘ç»œè½¨é“ (fetchStatus)**: è¡¨ç¤ºè¯·æ±‚æ´»åŠ¨çš„ç”Ÿå‘½å‘¨æœŸ
```typescript
type FetchStatus = 'fetching' | 'paused' | 'idle'
```

ç»„åˆè¯­ä¹‰:

| status | fetchStatus | å«ä¹‰ |
| --- | --- | --- |
| `pending` | `fetching` | é¦–æ¬¡åŠ è½½ï¼Œå°šæ— æ•°æ® |
| `pending` | `paused` | ç½‘ç»œç¦»çº¿ï¼Œé¦–æ¬¡åŠ è½½æš‚åœ |
| `success` | `fetching` | æœ‰æ•°æ®ï¼ŒåŽå°åˆ·æ–°ä¸­ |
| `success` | `idle` | æœ‰æ•°æ®ï¼Œæ— è¯·æ±‚æ´»åŠ¨ |
| `error` | `idle` | è¯·æ±‚å¤±è´¥ |
| `error` | `fetching` | æœ‰é”™è¯¯ï¼Œæ­£åœ¨é‡è¯• |

çŠ¶æ€æ›´æ–°é€šè¿‡ reducer æ¨¡å¼é›†ä¸­ç®¡ç†ï¼š

```typescript
// query.ts#dispatch â€” çŠ¶æ€è½¬æ¢æ ¸å¿ƒ
#dispatch(action: Action): void {
  const reducer = (state: QueryState): QueryState => {
    switch (action.type) {
      case 'fetch':    return { ...state, ...fetchState(), fetchMeta }
      case 'success':  return { ...state, ...successState(), dataUpdateCount++ }
      case 'error':    return { ...state, error, status: 'error', isInvalidated: true }
      case 'invalidate': return { ...state, isInvalidated: true }
      case 'pause':    return { ...state, fetchStatus: 'paused' }
      case 'continue': return { ...state, fetchStatus: 'fetching' }
      case 'failed':   return { ...state, fetchFailureCount, fetchFailureReason }
    }
  }
  this.state = reducer(this.state)
  notifyManager.batch(() => {
    this.observers.forEach(o => o.onQueryUpdate())
    this.#cache.notify({ query: this, type: 'updated', action })
  })
}
```

### 1.3 Observer å¼•ç”¨è®¡æ•°ä¸Ž GC

```typescript
// Subscribable åŸºç±»
class Subscribable<TListener> {
  protected listeners = new Set<TListener>()
  subscribe(listener): () => void {
    this.listeners.add(listener)
    this.onSubscribe()        // é’©å­ï¼šç¬¬ä¸€ä¸ªè®¢é˜…è€…åŠ å…¥
    return () => {
      this.listeners.delete(listener)
      this.onUnsubscribe()    // é’©å­ï¼šæœ€åŽä¸€ä¸ªè®¢é˜…è€…ç¦»å¼€
    }
  }
}

// QueryObserver â€” ç¬¬ä¸€ä¸ªè®¢é˜…è€…æ—¶ attach Query
protected onSubscribe() {
  if (this.listeners.size === 1) {
    this.#currentQuery.addObserver(this)  // å¼•ç”¨ +1
    if (shouldFetchOnMount(...)) this.#executeFetch()
  }
}

// Query â€” æœ€åŽä¸€ä¸ª observer ç¦»å¼€æ—¶è°ƒåº¦ GC
removeObserver(observer) {
  this.observers = this.observers.filter(x => x !== observer)
  if (!this.observers.length) {
    this.scheduleGc()  // é»˜è®¤ 5 åˆ†é’ŸåŽæ¸…é™¤
  }
}

// Removable åŸºç±»
protected scheduleGc() {
  this.#gcTimeout = setTimeout(() => {
    this.optionalRemove()  // Query: å¦‚æžœ observers ä»ä¸º 0 ä¸” idleï¼Œä»Ž cache ç§»é™¤
  }, this.gcTime)
}
```

### 1.4 é€šçŸ¥æ‰¹é‡è°ƒåº¦

```typescript
// notifyManager â€” äº‹åŠ¡å¼æ‰¹è°ƒåº¦
const notifyManager = createNotifyManager()
// å†…éƒ¨: queue[], transactions counter

batch<T>(callback: () => T): T {
  transactions++
  try { return callback() }
  finally {
    transactions--
    if (!transactions) flush()  // æœ€å¤–å±‚ batch ç»“æŸæ—¶ç»Ÿä¸€åˆ·æ–°
  }
}

// flush: æ”¶é›†æ‰€æœ‰æŽ’é˜Ÿçš„å›žè°ƒ â†’ é€šè¿‡ setTimeout(0) è°ƒåº¦ â†’ batchNotifyFn åŒ…è£¹æ‰§è¡Œ
```

React é›†æˆä¸­ `useSyncExternalStore` çš„ subscribe å›žè°ƒè¢« `notifyManager.batchCalls()` åŒ…è£¹ï¼Œç¡®ä¿åŒä¸€ tick å†…çš„å¤šæ¬¡çŠ¶æ€å˜æ›´åªè§¦å‘ä¸€æ¬¡é‡æ¸²æŸ“ã€‚

### 1.5 Retryer æŠ½è±¡

```typescript
// retryer.ts â€” ç‹¬ç«‹çš„é‡è¯•æ‰§è¡Œå™¨
function createRetryer(config) {
  let failureCount = 0
  const thenable = pendingThenable()  // æ‰‹åŠ¨ Promise

  const run = () => {
    Promise.resolve(config.fn())
      .then(resolve)
      .catch(error => {
        // æŒ‡æ•°é€€é¿: min(1000 * 2^n, 30000)
        const delay = config.retryDelay ?? defaultRetryDelay
        if (shouldRetry) {
          failureCount++
          sleep(delay)
            .then(() => canContinue() ? undefined : pause())
            .then(() => run())
        }
      })
  }

  return { promise: thenable, start, cancel, continue, cancelRetry, continueRetry }
}
```

å…³é”®èƒ½åŠ›ï¼šæŒ‡æ•°é€€é¿ã€ç½‘ç»œç¦»çº¿æš‚åœ/æ¢å¤ã€å–æ¶ˆï¼ˆå« revertï¼‰ã€é‡è¯•æ¬¡æ•°æŽ§åˆ¶ã€‚

### 1.6 Mutation ç”Ÿå‘½å‘¨æœŸ

```typescript
// mutation.ts â€” å˜æ›´æ‰§è¡Œæµç¨‹
async execute(variables) {
  // 1. onMutate (ä¹è§‚æ›´æ–°å‡†å¤‡)
  const context = await this.options.onMutate?.(variables, ctx)

  try {
    const data = await this.#retryer.start()

    // 2. onSuccess
    await this.options.onSuccess?.(data, variables, context, ctx)
    // 3. onSettled (æˆåŠŸè·¯å¾„)
    await this.options.onSettled?.(data, null, variables, context, ctx)

    this.#dispatch({ type: 'success', data })
    return data
  } catch (error) {
    // 4. onError (å›žæ»šä¹è§‚æ›´æ–°)
    await this.options.onError?.(error, variables, context, ctx)
    // 5. onSettled (å¤±è´¥è·¯å¾„)
    await this.options.onSettled?.(undefined, error, variables, context, ctx)

    this.#dispatch({ type: 'error', error })
    throw error
  } finally {
    // 6. è¿è¡Œé˜Ÿåˆ—ä¸­çš„ä¸‹ä¸€ä¸ª mutation
    this.#mutationCache.runNext(this)
  }
}
```

MutationCache è¿˜ç»´æŠ¤äº† scope-based é˜Ÿåˆ—ï¼šåŒä¸€ scope å†…çš„ mutation ä¸²è¡Œæ‰§è¡Œï¼Œä¸åŒ scope å¯å¹¶è¡Œã€‚

### 1.7 Tracked Props â€” è‡ªåŠ¨ç²¾ç»†è®¢é˜…

```typescript
// queryObserver.ts â€” Proxy è¿½è¸ªå±žæ€§è®¿é—®
trackResult(result) {
  return new Proxy(result, {
    get: (target, key) => {
      this.trackProp(key)           // è®°å½•è®¿é—®çš„å±žæ€§å
      return Reflect.get(target, key)
    },
  })
}

// é€šçŸ¥æ—¶åªæ£€æŸ¥ tracked props æ˜¯å¦å˜åŒ–
shouldNotifyListeners() {
  const includedProps = this.#trackedProps  // åªæ£€æŸ¥å®žé™…è®¿é—®è¿‡çš„å±žæ€§
  return Object.keys(this.#currentResult).some(key =>
    changed && includedProps.has(key)
  )
}
```

React é›†æˆä¸­ï¼šæœªè®¾ç½® `notifyOnChangeProps` æ—¶è‡ªåŠ¨ä½¿ç”¨ tracked-props æ¨¡å¼ï¼Œç»„ä»¶åªåœ¨å…¶å®žé™…ä½¿ç”¨çš„å±žæ€§å˜åŒ–æ—¶é‡æ¸²æŸ“ã€‚

---

## äºŒã€Flux å½“å‰å®žçŽ°æ¦‚è§ˆ

### 2.1 DataSourceController çŠ¶æ€

```typescript
// data-source-runtime.ts â€” å½“å‰çŠ¶æ€æ¨¡åž‹
let started = false
let stopped = false
let loading = false
let stale = false
let value: unknown = initialData
let error: unknown

// å¯¹å¤–æš´éœ²
getState() {
  return { started, loading, stale, value, error }
}
```

çŠ¶æ€é€šè¿‡ç›´æŽ¥èµ‹å€¼ç®¡ç†ï¼Œæ²¡æœ‰é›†ä¸­çš„çŠ¶æ€æœºæˆ– reducerã€‚

### 2.2 SourceRegistry â€” Scope åˆ†æ¡¶æ³¨å†Œè¡¨

```typescript
// source-registry.ts â€” scope-scoped æ³¨å†Œè¡¨
const scopeEntries = new Map<string, Map<string, RuntimeSourceEntry>>()

// å¤–å±‚ key: scopeId
// å†…å±‚ key: sourceId
// ç”Ÿå‘½å‘¨æœŸ: registerDataSource â†’ controller.start() â†’ dispose â†’ controller.stop()
```

ä¾èµ–è¿½è¸ªé€šè¿‡ store subscription + `scopeChangeHitsDependencies()` å®žçŽ°ï¼š

```typescript
const unsubscribe = scope.store?.subscribe((change) => {
  if (scopeChangeHitsDependencies(change, dependencies)) {
    void controller.refresh()
  }
})
```

### 2.3 ReactionRuntime â€” å£°æ˜Žå¼å‰¯ä½œç”¨

```typescript
// reaction-runtime.ts
// watch â†’ evaluate â†’ compare with Object.is â†’ check when guard â†’ dispatch actions
// è°ƒåº¦: Promise.resolve().then() å¼‚æ­¥æ‰§è¡Œ
// é˜²æŠ–: debounce + changedPaths coalescing
// å¾ªçŽ¯ä¿æŠ¤: MAX_REACTION_FIRE_COUNT = 10
```

### 2.4 ç¼“å­˜ â€” LRU + TTL

```typescript
// api-cache.ts â€” è¯·æ±‚çº§ LRU ç¼“å­˜
// æœ€å¤§ 200 æ¡ï¼Œkey = `${method}:${url}:${stableStringify(data)}`
// TTL è¿‡æœŸæ·˜æ±° + LRU æ·˜æ±°
// ä»… data-source çš„ GET ç±»è¯·æ±‚è‡ªåŠ¨å¯ç”¨ (éœ€ cacheTTL > 0)
```

### 2.5 è®¢é˜… â€” useScopeSelector

```typescript
// hooks.ts â€” useSyncExternalStoreWithSelector
function useScopeSelector<T>(selector, equalityFn = Object.is) {
  const scope = useRenderScope()
  return useSyncExternalStoreWithSelector(
    scope.store?.subscribe,
    () => scope.store?.getSnapshot(),
    selector,
    equalityFn
  )
}
```

---

## ä¸‰ã€é€åŸŸå¯¹æ¯”åˆ†æž

### 3.1 çŠ¶æ€ç®¡ç†

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| çŠ¶æ€æ¨¡åž‹ | æ˜¾å¼çŠ¶æ€æœº (status + fetchStatus) | ad-hoc boolean flags (loading/stale/error) |
| çŠ¶æ€æ›´æ–° | Reducer + dispatch(action) | ç›´æŽ¥èµ‹å€¼ |
| çŠ¶æ€é€šçŸ¥ | notifyManager.batch â†’ observers â†’ cache | scope.update â†’ store.subscribe â†’ useSyncExternalStore |
| ä¸å¯å˜æ€§ | æ¯æ¬¡äº§ç”Ÿæ–° state å¯¹è±¡ | ç›´æŽ¥ä¿®æ”¹ closure å˜é‡ |
| æ—¶é—´æˆ³ | dataUpdatedAt, errorUpdatedAt (ç²¾ç¡®åˆ° ms) | æ— æ—¶é—´æˆ³ |

**å·®è·åˆ†æž**:

Flux å½“å‰çš„ `loading / stale / error` æ‰å¹³çŠ¶æ€æ— æ³•è¡¨è¾¾ä»¥ä¸‹ç»„åˆï¼š

- æœ‰æ•°æ® + æ­£åœ¨åˆ·æ–°ï¼ˆåŽå° refetchï¼‰
- æœ‰æ•°æ® + è¯·æ±‚å¤±è´¥ï¼ˆä¸ä¸¢å¤±å·²æœ‰æ•°æ®ï¼‰
- æ— æ•°æ® + ç½‘ç»œæš‚åœ

å‚è€ƒ TanStack Query çš„åŒè½¨æ¨¡åž‹ï¼ŒFlux å¯å¼•å…¥ï¼š

```typescript
interface DataSourceState<T> {
  status: 'idle' | 'pending' | 'success' | 'error'
  fetchStatus: 'idle' | 'fetching' | 'paused'
  data: T | undefined
  error: unknown
  dataUpdatedAt: number
  errorUpdatedAt: number
}
```

**å‚è€ƒå»ºè®®**: å¼•å…¥æ˜¾å¼çŠ¶æ€æœº + reducerï¼Œå°† `DataSourceController` çš„çŠ¶æ€ç®¡ç†ä»Žæ•£è½çš„ boolean èµ‹å€¼å‡çº§ä¸ºé›†ä¸­çš„çŠ¶æ€è½¬æ¢ã€‚è¿™æ˜¯æœ¬æ¬¡åˆ†æžä¸­ **ä¼˜å…ˆçº§æœ€é«˜** çš„æ”¹è¿›ç‚¹ã€‚

### 3.2 ç”Ÿå‘½å‘¨æœŸä¸Žåžƒåœ¾å›žæ”¶

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| ç”Ÿå‘½å‘¨æœŸé©±åŠ¨ | Observer å¼•ç”¨è®¡æ•° | Scope åˆ†æ¡¶ + null-renderer dispose |
| GC æœºåˆ¶ | gcTime å®šæ—¶å™¨ (é»˜è®¤ 5min) | scope dispose æ—¶æ‰¹é‡æ¸…ç† |
| æ— ç”¨æ£€æµ‹ | observers.length === 0 && fetchStatus === 'idle' | scope unmount è§¦å‘ disposeScope |
| è·¨ scope å…±äº« | å…¨å±€ QueryCache + queryHash | scope-scoped éš”ç¦» |

**å·®è·åˆ†æž**:

Flux çš„ scope-scoped registry + dispose å·²ç»å¾ˆå¥½åœ°è§£å†³äº†ä½Žä»£ç åœºæ™¯ä¸‹çš„ç”Ÿå‘½å‘¨æœŸç®¡ç†ã€‚ä¸Ž TanStack Query çš„å…¨å±€ cache + gcTime æ¨¡åž‹ç›¸æ¯”ï¼š

- Flux ä¸éœ€è¦å…¨å±€ç¼“å­˜å…±äº«ï¼šä½Žä»£ç çš„ data-source é€šå¸¸ç»‘å®šåˆ°å…·ä½“ scopeï¼Œè·¨ scope å…±äº«éœ€æ±‚æœ‰é™
- Flux ä¸éœ€è¦ gcTimeï¼šscope dispose å·²ç»æ˜¯ç¡®å®šçš„æ¸…ç†æ—¶æœºï¼Œæ¯”å®šæ—¶å™¨ GC æ›´å¯é 
- Flux çš„ scope åˆ†æ¡¶å¤©ç„¶é¿å…äº†å…¨å±€ registry çš„å†…å­˜æ³„æ¼é£Žé™©

**å‚è€ƒå»ºè®®**: **ä¸éœ€è¦å¼•å…¥** TanStack Query çš„ gcTime / Removable æœºåˆ¶ã€‚å½“å‰ scope-scoped æ¨¡åž‹æ›´é€‚åˆä½Žä»£ç åœºæ™¯ã€‚

### 3.3 é€šçŸ¥ä¸Žè°ƒåº¦

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| é€šçŸ¥æ¨¡åž‹ | NotifyManager (transaction + batch + schedule) | Zustand store.subscribe â†’ useSyncExternalStore |
| æ‰¹é‡é€šçŸ¥ | batch() åŒ…è£¹ï¼ŒåŒä¸€ tick å†…åª flush ä¸€æ¬¡ | ä¾èµ– React çš„ batch æ›´æ–° (React 18+) |
| è°ƒåº¦ç­–ç•¥ | setTimeout(0) è°ƒåº¦ï¼Œé¿å…åŒæ­¥é€šçŸ¥ | Promise.resolve().then() (reaction), åŒæ­¥ (source) |
| å¤š observer é€šçŸ¥ | ä¸€æ¬¡ dispatch â†’ éåŽ†æ‰€æœ‰ observers | scope.update â†’ æ‰€æœ‰ store subscribers |

**å·®è·åˆ†æž**:

React 18+ çš„ automatic batching å·²ç»è¦†ç›–äº†å¤§éƒ¨åˆ†æ‰¹é‡é€šçŸ¥åœºæ™¯ã€‚ä½†åœ¨ä»¥ä¸‹æƒ…å†µä¸‹ä»å¯èƒ½æœ‰å¤šä½™é€šçŸ¥ï¼š

1. å¤šä¸ª data-source åœ¨åŒä¸€ scope åŒæ—¶åˆ·æ–°å®Œæˆ â†’ å¤šæ¬¡ scope.update â†’ å¤šæ¬¡é‡æ¸²æŸ“
2. reaction è°ƒåº¦ä½¿ç”¨ `Promise.resolve().then()` ä¸Ž store æ›´æ–°çš„æ—¶åºä¸ç»Ÿä¸€

**å‚è€ƒå»ºè®®**: å¯ä»¥åœ¨ `RendererRuntime` å±‚å¼•å…¥è½»é‡çº§æ‰¹è°ƒåº¦æœºåˆ¶ï¼Œå°†åŒä¸€å¾®ä»»åŠ¡å†…çš„å¤šä¸ª scope.update åˆå¹¶ä¸ºä¸€æ¬¡é€šçŸ¥ã€‚ä½†ä¼˜å…ˆçº§ä¸é«˜ï¼ŒReact 18 çš„ automatic batching å·²ç»è¦†ç›–äº†å¤§éƒ¨åˆ†åœºæ™¯ã€‚

### 3.4 ç»“æž„å…±äº«

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| æ•°æ®æ›¿æ¢ | replaceData() with structural sharing | scope.update(path, newValue) â€” å¼•ç”¨ä¸ä¿ |
| é…ç½® | `structuralSharing: boolean \| fn` | æ—  |
| ç›®çš„ | é¿å…ç›¸åŒæ•°æ®çš„å¼•ç”¨å˜åŒ– â†’ é¿å…é‡æ¸²æŸ“ | â€” |

**å·®è·åˆ†æž**:

TanStack Query çš„ `replaceData` åœ¨è®¾ç½®æ–°æ•°æ®æ—¶ï¼Œå¦‚æžœæ–°æ•°æ®ä¸Žæ—§æ•°æ®ç»“æž„ç›¸åŒï¼ˆdeep equalï¼‰ï¼Œåˆ™ä¿ç•™æ—§å¼•ç”¨ã€‚è¿™å¯¹ React æ¸²æŸ“æ€§èƒ½è‡³å…³é‡è¦â€”â€”å³ä½¿ query åˆ·æ–°è¿”å›žç›¸åŒæ•°æ®ï¼Œæ¶ˆè´¹ç»„ä»¶ä¹Ÿä¸ä¼šé‡æ¸²æŸ“ã€‚

Flux å½“å‰çš„ `scope.update(path, newValue)` ç›´æŽ¥è®¾ç½®æ–°å€¼ï¼Œå¦‚æžœ API è¿”å›žç›¸åŒç»“æž„çš„å¯¹è±¡ï¼Œscope snapshot ä¼šå˜åŒ–ï¼Œæ‰€æœ‰ selector éƒ½éœ€è¦é‡æ–°è®¡ç®—ã€‚

**å‚è€ƒå»ºè®®**: åœ¨ `scope.update` å±‚æˆ– `useScopeSelector` çš„ equalityFn é»˜è®¤å€¼ä¸­å¼•å…¥ shallow structural sharingã€‚å…·ä½“æ–¹æ¡ˆï¼š

```typescript
// æ–¹æ¡ˆ A: scope.update å†…éƒ¨ä¼˜åŒ–
function update(path, value) {
  const current = this.readAtPath(path)
  if (shallowEqual(current, value)) return  // ä¸è§¦å‘å˜æ›´
  // ... æ­£å¸¸æ›´æ–°
}

// æ–¹æ¡ˆ B: useScopeSelector é»˜è®¤ equalityFn ä½¿ç”¨ shallowEqual
function useScopeSelector<T>(selector, equalityFn = shallowEqual) { ... }
```

æ–¹æ¡ˆ A æ›´é«˜æ•ˆï¼ˆæºå¤´é¿å…ä¸å¿…è¦é€šçŸ¥ï¼‰ï¼Œæ–¹æ¡ˆ B æ›´å®‰å…¨ï¼ˆä¸å½±å“ scope æœ¬èº«è¯­ä¹‰ï¼‰ã€‚å»ºè®®è¯„ä¼°åŽé€‰æ‹©ã€‚

### 3.5 é‡è¯•ä¸Žé”™è¯¯æ¢å¤

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| é‡è¯•æŠ½è±¡ | ç‹¬ç«‹ Retryer å·¥åŽ‚å‡½æ•° | action-runtime å†…è” retry é€»è¾‘ |
| é€€é¿ç­–ç•¥ | æŒ‡æ•°é€€é¿ min(1000Ã—2^n, 30s) | å¯é…ç½® retryCount + retryDelay |
| ç½‘ç»œæ„ŸçŸ¥ | åœ¨çº¿/ç¦»çº¿ â†’ pause/continue | æ— ç½‘ç»œçŠ¶æ€æ„ŸçŸ¥ |
| å–æ¶ˆ | AbortController + CancelledError + revert | AbortController + isAbortError |
| å¤±è´¥è¿½è¸ª | failureCount, failureReason, errorUpdateCount | error: unknown |

**å·®è·åˆ†æž**:

Flux çš„ retry é€»è¾‘åµŒåœ¨ `action-runtime.ts` ä¸­ï¼Œä¸Ž action dispatch è€¦åˆã€‚TanStack Query çš„ Retryer æ˜¯ç‹¬ç«‹æŠ½è±¡ï¼Œå¯ä»¥è¢« Query å’Œ Mutation å…±äº«ã€‚

å…³é”®ç¼ºå¤±ï¼š

1. **ç½‘ç»œç¦»çº¿æš‚åœ**: TanStack Query çš„ Retryer åœ¨ç½‘ç»œç¦»çº¿æ—¶è‡ªåŠ¨æš‚åœé‡è¯•ï¼Œæ¢å¤åŽç»§ç»­ã€‚Flux æ²¡æœ‰è¿™ä¸ªèƒ½åŠ›ã€‚
2. **revert å–æ¶ˆ**: TanStack Query çš„ CancelledError æ”¯æŒ `revert` é€‰é¡¹ï¼Œå–æ¶ˆæ—¶å¯ä»¥å›žé€€åˆ°ä¹‹å‰çš„çŠ¶æ€ã€‚Flux çš„å–æ¶ˆåªæ˜¯ä¸­æ­¢è¯·æ±‚ã€‚
3. **å¤±è´¥è®¡æ•°å™¨**: TanStack Query æœ‰ `failureCount` å’Œ `failureReason`ï¼ŒFlux åªæœ‰ä¸€ä¸ª `error`ã€‚

**å‚è€ƒå»ºè®®**: å°† retry é€»è¾‘ä»Ž `action-runtime` æŠ½å–ä¸ºç‹¬ç«‹çš„ Retryer å·¥åŽ‚å‡½æ•°ã€‚ç½‘ç»œæ„ŸçŸ¥å¯æš‚ä¸å®žçŽ°ï¼ˆä½Žä»£ç åœºæ™¯é€šå¸¸æœ‰ç¨³å®šçš„å†…ç½‘çŽ¯å¢ƒï¼‰ï¼Œä½† revert å–æ¶ˆå’Œå¤±è´¥è®¡æ•°å™¨å¯¹ data-source çš„å¥å£®æ€§æœ‰ä»·å€¼ã€‚

### 3.6 Invalidation ä¸Žä¾èµ–è¿½è¸ª

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| å¤±æ•ˆè§¦å‘ | æ‰‹åŠ¨: `queryClient.invalidateQueries(filters)` | è‡ªåŠ¨: ä¾èµ–è¿½è¸ª + scope å˜æ›´ |
| å¤±æ•ˆæ ‡è®° | `isInvalidated` flag â†’ `isStale()` è¿”å›ž true | ç›´æŽ¥è°ƒç”¨ `controller.refresh()` |
| ç²¾ç¡®åº¦ | æŒ‰ queryKey / queryKey prefix åŒ¹é… | æŒ‰ scope å˜æ›´è·¯å¾„ + æ”¶é›†çš„ä¾èµ–åŒ¹é… |
| å…¨å±€åè°ƒ | QueryClient.invalidateQueries å¯è·¨ç»„ä»¶ | scope-scopedï¼Œä¸æ”¯æŒè·¨ scope å¤±æ•ˆ |

**å·®è·åˆ†æž**:

Flux çš„ä¾èµ–è¿½è¸ªæ¨¡åž‹æ¯” TanStack Query çš„æ‰‹åŠ¨ invalidation **æ›´é€‚åˆä½Žä»£ç åœºæ™¯**ï¼š

- ä½Žä»£ç  schema ä¸åº”è¯¥è¦æ±‚å¼€å‘è€…æ‰‹åŠ¨ç®¡ç† query invalidation
- Flux çš„ `scopeChangeHitsDependencies()` å·²ç»å®žçŽ°äº†åŸºäºŽå˜æ›´è·¯å¾„çš„ç²¾ç¡®è§¦å‘
- è‡ªç›®æ ‡å¾ªçŽ¯ä¿æŠ¤é˜²æ­¢äº† source å†™å…¥è‡ªèº«å‘å¸ƒè·¯å¾„æ—¶çš„æ— é™å¾ªçŽ¯

ä½† TanStack Query æœ‰ä¸€ä¸ª Flux ç¼ºå¤±çš„èƒ½åŠ›ï¼š**å…¨å±€æ‰¹é‡å¤±æ•ˆ**ã€‚ä¾‹å¦‚"æäº¤è¡¨å•åŽä½¿æ‰€æœ‰ç›¸å…³åˆ—è¡¨æŸ¥è¯¢å¤±æ•ˆ"ï¼Œåœ¨ TanStack Query ä¸­æ˜¯ `invalidateQueries({ queryKey: ['todos'] })`ï¼Œåœ¨ Flux ä¸­éœ€è¦é€ä¸ª `refreshSource`ã€‚

**å‚è€ƒå»ºè®®**: å¯ä»¥è€ƒè™‘åœ¨ `RendererRuntime` å±‚å¢žåŠ æŒ‰ tag/pattern çš„æ‰¹é‡ source åˆ·æ–°èƒ½åŠ›ï¼Œä½†ä¼˜å…ˆçº§ä¸é«˜ã€‚å½“å‰çš„ä¾èµ–è¿½è¸ªå·²ç»è¦†ç›–äº†ç»å¤§å¤šæ•°è‡ªåŠ¨å¤±æ•ˆåœºæ™¯ã€‚

### 3.7 Mutation vs Action

| ç»´åº¦ | TanStack Query Mutation | Flux Action |
| --- | --- | --- |
| å®šä½ | ä¸€æ¬¡æ€§å˜æ›´æ“ä½œ + è‡ªåŠ¨å¤±æ•ˆ | é€šç”¨åŠ¨ä½œåˆ†å‘ï¼ˆå« ajaxã€setValueã€dialog ç­‰ï¼‰ |
| ä¹è§‚æ›´æ–° | onMutate â†’ return context â†’ onError å›žæ»š | æ— å†…ç½®ä¹è§‚æ›´æ–°æ”¯æŒ |
| æˆåŠŸå›žè°ƒ | onSuccess(data, variables, context) | then / onSuccess é“¾ |
| å¤±è´¥å›žè°ƒ | onError(error, variables, context) | onError é“¾ |
| å®Œæˆå›žè°ƒ | onSettled(data, error, variables, context) | æ— ç»Ÿä¸€å®Œæˆå›žè°ƒ |
| ä¸²è¡Œé˜Ÿåˆ— | MutationCache scope-based é˜Ÿåˆ— | æ— å†…ç½®ä¸²è¡Œé˜Ÿåˆ— |
| ç»“æžœè¿½è¸ª | MutationState: status/data/error/context | ActionResult: ok/data/error |

**å·®è·åˆ†æž**:

TanStack Query çš„ Mutation ç”Ÿå‘½å‘¨æœŸæ¯” Flux çš„ ajax action æ›´ç»“æž„åŒ–ï¼š

1. **ä¹è§‚æ›´æ–°**: `onMutate` è¿”å›ž contextï¼Œ`onError` ç”¨ context å›žæ»šã€‚Flux çš„ action é“¾å¯ä»¥åšç±»ä¼¼çš„äº‹ï¼Œä½†æ²¡æœ‰æ ‡å‡†åŒ–çš„ context ä¼ é€’å’Œå›žæ»šåè®®ã€‚
2. **ç»Ÿä¸€å®Œæˆå›žè°ƒ**: `onSettled` æ— è®ºæˆåŠŸå¤±è´¥éƒ½æ‰§è¡Œã€‚Flux éœ€è¦åœ¨ `then` å’Œ `onError` ä¸­é‡å¤æ¸…ç†é€»è¾‘ã€‚
3. **ä¸²è¡Œé˜Ÿåˆ—**: åŒ scope çš„ mutation è‡ªåŠ¨ä¸²è¡Œã€‚Flux çš„ parallel æŽ§åˆ¶æ˜¯ per-action çš„ï¼Œæ²¡æœ‰å…¨å±€é˜Ÿåˆ—ã€‚

**å‚è€ƒå»ºè®®**: Flux çš„ action ç³»ç»Ÿå®šä½æ›´å¹¿ï¼ˆä¸ä»…ä»…æ˜¯"å˜æ›´"ï¼‰ï¼Œä¸éœ€è¦å®Œå…¨å¯¹é½ Mutationã€‚ä½†ä»¥ä¸‹ä¸¤ä¸ªæ¨¡å¼å€¼å¾—å‚è€ƒï¼š

1. **æ ‡å‡†åŒ–ä¹è§‚æ›´æ–°åè®®**: åœ¨ action æ‰§è¡Œå±‚é¢å¼•å…¥ `onMutate` â†’ `context` â†’ `onError(context)` çš„å›žæ»šæœºåˆ¶
2. **onSettled å›žè°ƒ**: åœ¨ action é“¾ä¸­å¢žåŠ  `onSettled` å›žè°ƒï¼Œç»Ÿä¸€æˆåŠŸå’Œå¤±è´¥çš„æ¸…ç†é€»è¾‘

### 3.8 ç²¾ç»†è®¢é˜…

| ç»´åº¦ | TanStack Query | Flux |
| --- | --- | --- |
| è®¢é˜…ç²’åº¦ | å±žæ€§çº§: tracked props via Proxy | è·¯å¾„çº§: useScopeSelector + selector |
| è‡ªåŠ¨è¿½è¸ª | Proxy get trap è®°å½•è®¿é—®å±žæ€§ | æ‰‹åŠ¨ç¼–å†™ selector + equalityFn |
| é€šçŸ¥è¿‡æ»¤ | trackedProps å˜åŒ–æ‰é€šçŸ¥ | selector è¿”å›žå€¼å˜åŒ–æ‰é€šçŸ¥ |
| é»˜è®¤è¡Œä¸º | æ—  notifyOnChangeProps æ—¶è‡ªåŠ¨è¿½è¸ª | Object.is æ¯”è¾ƒ |

**å·®è·åˆ†æž**:

TanStack Query çš„ tracked-props æ¨¡å¼è‡ªåŠ¨è§£å†³äº†"å¼€å‘è€…ä¸çŸ¥é“å“ªäº›å±žæ€§å˜åŒ–éœ€è¦è§¦å‘é‡æ¸²æŸ“"çš„é—®é¢˜ã€‚Flux çš„ `useScopeSelector` éœ€è¦å¼€å‘è€…æ‰‹åŠ¨ç¼–å†™ selector å’Œ equalityFnã€‚

åœ¨ä½Žä»£ç åœºæ™¯ä¸‹ï¼Œselector é€šå¸¸ç”±ç¼–è¯‘å™¨ç”Ÿæˆï¼Œå› æ­¤æ‰‹åŠ¨è¿½è¸ªçš„è´Ÿæ‹…ä¸å¤§ã€‚ä½†ç¼–è¯‘å™¨ç”Ÿæˆçš„ selector å¯èƒ½è¿‡äºŽä¿å®ˆï¼ˆè¿”å›žæ•´ä¸ª scope å¯¹è±¡ï¼‰ï¼Œå¯¼è‡´ä¸å¿…è¦çš„é‡æ¸²æŸ“ã€‚

**å‚è€ƒå»ºè®®**: ä¸éœ€è¦å¼•å…¥ Proxy tracked-props æ¨¡å¼ï¼ˆä½Žä»£ç ç¼–è¯‘å™¨å¯ä»¥ç²¾ç¡®æŽ§åˆ¶ selectorï¼‰ï¼Œä½†å¯ä»¥åœ¨ç¼–è¯‘å±‚ä¼˜åŒ– selector çš„ç²¾ç¡®åº¦ï¼Œç¡®ä¿åªé€‰æ‹© renderer å®žé™…éœ€è¦çš„å­—æ®µè·¯å¾„ã€‚

---

## å››ã€ç»¼åˆå»ºè®®ä¸Žä¼˜å…ˆçº§

### P0 â€” å»ºè®®å°½å¿«è½åœ°

1. **DataSourceController çŠ¶æ€æœºæ”¹é€ **
   - å°† `loading / stale / error` boolean flags æ›¿æ¢ä¸º `status + fetchStatus` åŒè½¨çŠ¶æ€æœº
   - å¼•å…¥ reducer æ¨¡å¼ç®¡ç†çŠ¶æ€è½¬æ¢
   - å¢žåŠ  `dataUpdatedAt` / `errorUpdatedAt` æ—¶é—´æˆ³
   - å½±å“: `data-source-runtime.ts`, `source-registry.ts`, `flux-core` ç±»åž‹

### P1 â€” è¿‘æœŸå¯è¯„ä¼°

2. **Structural Sharing**
   - åœ¨ `scope.update` æˆ– `useScopeSelector` å±‚å¼•å…¥ shallow equality æ£€æŸ¥
   - é¿å…ç›¸åŒæ•°æ®å¯¼è‡´çš„å¼•ç”¨å˜åŒ–å’Œä¸å¿…è¦é‡æ¸²æŸ“
   - å½±å“: `scope.ts` æˆ– `hooks.ts`

3. **Retryer æŠ½è±¡**
   - å°† retry é€»è¾‘ä»Ž `action-runtime` æŠ½å–ä¸ºç‹¬ç«‹ `createRetryer()` å·¥åŽ‚
   - å…±äº«ç»™ data-source controller å’Œ ajax action
   - å¢žåŠ  failureCount / failureReason è¿½è¸ª
   - å½±å“: æ–°æ–‡ä»¶ `retryer.ts`, ä¿®æ”¹ `action-runtime.ts`, `data-source-runtime.ts`

4. **Mutation ç”Ÿå‘½å‘¨æœŸå‚è€ƒ**
   - åœ¨ action é“¾ä¸­å¢žåŠ  `onSettled` å›žè°ƒ
   - è¯„ä¼° `onMutate` context + rollback åè®®çš„å¯è¡Œæ€§
   - å½±å“: `action-runtime.ts`, ç±»åž‹å®šä¹‰

### P2 â€” è¿œæœŸè§‚å¯Ÿ

5. **æ‰¹é‡é€šçŸ¥ä¼˜åŒ–**
   - è¯„ä¼°åœ¨ RendererRuntime å±‚å¼•å…¥ notifyManager é£Žæ ¼çš„æ‰¹è°ƒåº¦
   - å¤š source åŒæ—¶åˆ·æ–°æ—¶çš„åˆå¹¶é€šçŸ¥
   - å½±å“: `renderer-runtime` æ ¸å¿ƒè·¯å¾„

6. **Tag-based æ‰¹é‡å¤±æ•ˆ**
   - åœ¨ data-source schema ä¸­å¢žåŠ å¯é€‰ `tag` å­—æ®µ
   - `refreshSources({ tag: 'user-list' })` æ‰¹é‡åˆ·æ–°åŒ tag çš„æ‰€æœ‰ source
   - å½±å“: schema ç±»åž‹, source-registry

---

## äº”ã€ä¸åº”ç…§æ¬çš„è®¾è®¡

| TanStack Query è®¾è®¡ | ä¸ç…§æ¬çš„åŽŸå›  |
| --- | --- |
| å…¨å±€ QueryCache + queryHash key | ä½Žä»£ç çš„ data-source ç»‘å®š scopeï¼Œä¸éœ€è¦å…¨å±€å…±äº« |
| gcTime + Removable åžƒåœ¾å›žæ”¶ | scope dispose å·²ç»æ˜¯æ›´å¯é çš„æ¸…ç†æœºåˆ¶ |
| Proxy tracked-props | ç¼–è¯‘å™¨ç”Ÿæˆçš„ selector å¯ä»¥ç²¾ç¡®æŽ§åˆ¶ç²’åº¦ |
| enable/disable å‡½æ•°å¼é…ç½® | Flux çš„ data-source é€šè¿‡ schema condition æŽ§åˆ¶æ›´è‡ªç„¶ |
| networkMode (always/online/offlineFirst) | ä½Žä»£ç è¿è¡ŒçŽ¯å¢ƒé€šå¸¸æ˜¯å¯æŽ§å†…ç½‘ |
| infiniteQuery / pagination è¡Œä¸º | Flux çš„åˆ—è¡¨åˆ†é¡µç”± table renderer è‡ªè¡Œç®¡ç† |

---

## å…­ã€æž¶æž„å“²å­¦å·®å¼‚

### TanStack Query: å‘½ä»¤å¼ + æŸ¥è¯¢é”®é©±åŠ¨

```
å¼€å‘è€… â†’ useQuery({ queryKey, queryFn })
       â†’ QueryObserver è®¢é˜… QueryCache ä¸­çš„ Query
       â†’ Query é€šè¿‡ queryFn èŽ·å–æ•°æ®
       â†’ æ•°æ®ç¼“å­˜åœ¨å…¨å±€ QueryCache ä¸­
       â†’ queryClient.invalidateQueries() æ‰‹åŠ¨å¤±æ•ˆ
```

æ ¸å¿ƒå‡è®¾ï¼šå¼€å‘è€…ç²¾ç¡®æŽ§åˆ¶æŸ¥è¯¢é”®ã€ç¼“å­˜ç­–ç•¥ã€å¤±æ•ˆæ—¶æœºã€‚

### Flux: å£°æ˜Žå¼ + ä¾èµ–è¿½è¸ªé©±åŠ¨

```
Schema â†’ data-source { name, api, interval }
      â†’ DataSourceController è‡ªåŠ¨æ³¨å†Œåˆ° scope registry
      â†’ è¿è¡Œæ—¶è‡ªåŠ¨æ”¶é›† API é…ç½®ä¸­çš„ä¾èµ–è·¯å¾„
      â†’ scope å˜æ›´è§¦å‘ä¾èµ–åŒ¹é… â†’ è‡ªåŠ¨åˆ·æ–°
      â†’ ç»“æžœå†™å…¥ scope.dataPath â†’ useScopeSelector å“åº”å¼æ¶ˆè´¹
```

æ ¸å¿ƒå‡è®¾ï¼šschema å£°æ˜Žæ„å›¾ï¼Œè¿è¡Œæ—¶è‡ªåŠ¨ç®¡ç†ä¾èµ–ã€ç¼“å­˜å’Œå¤±æ•ˆã€‚

è¿™ä¸¤ç§å“²å­¦æ²¡æœ‰ä¼˜åŠ£ä¹‹åˆ†ï¼Œä½†å†³å®šäº†å“ªäº›è®¾è®¡å¯ä»¥äº’ç›¸å€Ÿé‰´ã€å“ªäº›ä¸é€‚åˆã€‚TanStack Query çš„"æ‰‹åŠ¨æŽ§åˆ¶"æ¨¡å¼é€‚åˆåº”ç”¨å¼€å‘è€…ï¼ŒFlux çš„"å£°æ˜Žå¼è‡ªåŠ¨"æ¨¡å¼é€‚åˆä½Žä»£ç  schema è¿è¡Œæ—¶ã€‚

---

## æºç ç´¢å¼•

### TanStack Query å…³é”®æ–‡ä»¶

| æ–‡ä»¶ | å…³æ³¨ç‚¹ |
| --- | --- |
| `query-core/src/query.ts` | çŠ¶æ€æœº reducer, fetch ç”Ÿå‘½å‘¨æœŸ, observer ç®¡ç† |
| `query-core/src/queryObserver.ts` | React æ¡¥æŽ¥, tracked props, optimistic result |
| `query-core/src/retryer.ts` | ç‹¬ç«‹é‡è¯•æ‰§è¡Œå™¨, æŒ‡æ•°é€€é¿, pause/continue |
| `query-core/src/notifyManager.ts` | äº‹åŠ¡å¼æ‰¹è°ƒåº¦ |
| `query-core/src/mutation.ts` | å˜æ›´ç”Ÿå‘½å‘¨æœŸ onMutate/onError/onSuccess/onSettled |
| `query-core/src/queryCache.ts` | å…¨å±€ç¼“å­˜, GC, find/findAll |
| `query-core/src/removable.ts` | GC åŸºç±» |
| `query-core/src/subscribable.ts` | å‘å¸ƒè®¢é˜…åŸºç±» |
| `react-query/src/useBaseQuery.ts` | React é›†æˆ useSyncExternalStore |

### Flux å…³é”®æ–‡ä»¶

| æ–‡ä»¶ | å…³æ³¨ç‚¹ |
| --- | --- |
| `flux-runtime/src/data-source-runtime.ts` | DataSourceController ç”Ÿå‘½å‘¨æœŸ |
| `flux-runtime/src/source-registry.ts` | scope-scoped æ³¨å†Œè¡¨, ä¾èµ–è¿½è¸ª |
| `flux-runtime/src/api-cache.ts` | LRU è¯·æ±‚ç¼“å­˜ |
| `flux-runtime/src/reaction-runtime.ts` | å£°æ˜Žå¼å‰¯ä½œç”¨, watch/when/debounce |
| `flux-runtime/src/scope-change.ts` | ä¾èµ–è·¯å¾„åŒ¹é… |
| `flux-runtime/src/action-runtime.ts` | action åˆ†å‘, retry é€»è¾‘ |
| `flux-react/src/hooks.ts` | useScopeSelector, è¡¨å• hooks |
| `docs/architecture/api-data-source.md` | data-source/reaction æž¶æž„è®¾è®¡ |

---

## ç›¸å…³æ–‡æ¡£

- `docs/architecture/api-data-source.md` â€” Flux data-source/reaction è®¾è®¡è§„èŒƒ
- `docs/architecture/flux-runtime-module-boundaries.md` â€” è¿è¡Œæ—¶æ¨¡å—è¾¹ç•Œ
- `docs/architecture/renderer-runtime.md` â€” æ¸²æŸ“å™¨è¿è¡Œæ—¶
- `docs/analysis/2026-04-04-formily-vs-flux-final-report.md` â€” Formily å¯¹æ¯”åˆ†æžï¼ˆå‚è€ƒåˆ†æžé£Žæ ¼ï¼‰


# NOP Chaos AMIS Renderer Development Plan

> Canonical planning and architecture references now live under `docs/`.
> Start with `docs/index.md`, then prefer `docs/plans/02-development-plan.md`, `docs/architecture/amis-core.md`, and `docs/architecture/renderer-runtime.md`.

## 1. Goal and Delivery Strategy

æœ¬è®¡åˆ’ç”¨äºŽæŠŠå½“å‰è®¾è®¡æ–‡æ¡£é€æ­¥è½åœ°ä¸ºä¸€ä¸ªå¯è¿è¡Œã€å¯æµ‹è¯•ã€å¯æ‰©å±•çš„ä½Žä»£ç æ¸²æŸ“æ¡†æž¶ï¼ŒæŠ€æœ¯åŸºçº¿å›ºå®šä¸ºï¼š

- `pnpm` workspace
- `React 19`
- `Vite 7`
- `TypeScript`

æ•´ä½“ç­–ç•¥ä¸æ˜¯ä¸€æ¬¡æ€§æŠŠæ‰€æœ‰èƒ½åŠ›å †ä¸ŠåŽ»ï¼Œè€Œæ˜¯æŒ‰â€œå…ˆæ¡†æž¶ã€å†æ ¸å¿ƒã€åŽé«˜çº§èƒ½åŠ›â€çš„é¡ºåºæŽ¨è¿›ï¼š

1. å…ˆæ­å·¥ä½œåŒºå’ŒåŒ…ç»“æž„
2. å…ˆè½è¡¨è¾¾å¼ç¼–è¯‘ã€schema ç¼–è¯‘ã€runtime ä¸‰å¤§æ ¸å¿ƒ
3. å…ˆåšæœ€å°å¯è¿è¡Œ renderer é›†
4. å†åšè¡¨å•ã€è¡¨æ ¼ã€åŠ¨ä½œã€å¯¹è¯æ¡†ç­‰å¤æ‚èƒ½åŠ›
5. æœ€åŽè¡¥é½æ’ä»¶ã€ç›‘æŽ§ã€è°ƒè¯•ã€æ€§èƒ½ä¼˜åŒ–å’Œå·¥ç¨‹åŒ–å‘å¸ƒ

è¿™æ ·åšçš„åŽŸå› æ˜¯ï¼šä½Žä»£ç å¼•æ“Žæœ€å¤§çš„é£Žé™©ä¸æ˜¯åŠŸèƒ½å°‘ï¼Œè€Œæ˜¯åº•å±‚æŠ½è±¡åœ¨å‰æœŸæ²¡æœ‰å®šä½ï¼ŒåŽç»­æ¯åŠ ä¸€ä¸ªæŽ§ä»¶éƒ½è¦è¿”å·¥ã€‚

## 2. Development Objectives

æœ¬é˜¶æ®µç›®æ ‡åˆ†ä¸ºå››ç±»ï¼š

### 2.1 Functional objectives

- æ”¯æŒ JSON schema é©±åŠ¨çš„é¡µé¢æ¸²æŸ“
- æ”¯æŒè¡¨è¾¾å¼æ±‚å€¼å’Œæ¨¡æ¿æ’å€¼
- æ”¯æŒè¯æ³•ä½œç”¨åŸŸæ•°æ®é“¾
- æ”¯æŒåŸºç¡€åŠ¨ä½œç³»ç»Ÿ
- æ”¯æŒè¡¨å•ã€å¯¹è¯æ¡†ã€è¡¨æ ¼ç­‰æ ¸å¿ƒåœºæ™¯
- æ”¯æŒè‡ªå®šä¹‰ç»„ä»¶æ–¹ä¾¿åœ°æ¸²æŸ“å±€éƒ¨ schema

### 2.2 Architecture objectives

- ç¼–è¯‘æœŸå’Œè¿è¡ŒæœŸèŒè´£åˆ†ç¦»
- è¡¨è¾¾å¼ç¼–è¯‘å™¨é€šè¿‡ `amis-formula` æ³¨å…¥
- æ— è¡¨è¾¾å¼æ—¶èµ° static fast path
- åŠ¨æ€ç»“æžœä¸å˜æ—¶ä¿æŒå¼•ç”¨ç¨³å®š
- renderer å†…éƒ¨é‡‡ç”¨ props + hooks çš„æ··åˆå¥‘çº¦

### 2.3 Engineering objectives

- åŸºäºŽ `pnpm workspace` ç»„ç»‡ packages å’Œ playground app
- å…¨é‡ TypeScript ç±»åž‹çº¦æŸ
- Vitest å•æµ‹è¦†ç›–æ ¸å¿ƒç¼–è¯‘å’Œ runtime è¡Œä¸º
- æä¾› playground ç”¨äºŽäº¤äº’è°ƒè¯•å’Œ schema éªŒè¯

### 2.4 Performance objectives

- ç¼–è¯‘ç»“æžœç¼“å­˜
- selector çº§è®¢é˜…
- è¡Œ/ç‰‡æ®µä½œç”¨åŸŸå»¶è¿Ÿåˆ›å»º
- é™æ€å¯¹è±¡é›¶æ‰§è¡Œæˆæœ¬
- åŠ¨æ€ props å’Œ region handle ç¨³å®šå¼•ç”¨

## 3. Reference Files and How They Are Used

ä»¥ä¸‹æ–‡ä»¶æ˜¯å¼€å‘è®¡åˆ’çš„ç›´æŽ¥å‚è€ƒä¾æ®ï¼ŒåŽç»­å®žçŽ°æ—¶å¿…é¡»æŒç»­å¯¹é½ã€‚

### 3.1 `docs/architecture/amis-core.md`

å‚è€ƒå†…å®¹ï¼š

- æ•´ä½“èƒ½åŠ›ç›®æ ‡
- PageStore / FormStore åˆ†å±‚æ€è·¯
- æ•°æ®åŸŸåŽŸåž‹é“¾ä½œç”¨åŸŸ
- `amis-formula` è¡¨è¾¾å¼æ–¹å‘
- åŠ¨ä½œç³»ç»Ÿã€API å¯¹è±¡ã€å¯¹è¯æ¡†ã€è¡¨æ ¼ã€è¡¨å•éªŒè¯ç­‰èƒ½åŠ›è¾¹ç•Œ
- ç”¨æˆ·ç®¡ç† CRUD ç¤ºä¾‹ schemaï¼Œç”¨ä½œåŽæœŸè”è°ƒæ ·æ¿

ä½¿ç”¨æ–¹å¼ï¼š

- ä½œä¸ºâ€œäº§å“çº§èƒ½åŠ›æ¸…å•â€å’Œâ€œé˜¶æ®µéªŒæ”¶æ ·ä¾‹â€çš„ä¸»å‚è€ƒ
- åŽç»­ playground ç¬¬ä¸€æ‰¹ demo ç›´æŽ¥ä¼˜å…ˆå®žçŽ°å…¶ä¸­çš„ CRUD ç¤ºä¾‹å­é›†

### 3.2 `docs/architecture/frontend-baseline.md`

å‚è€ƒå†…å®¹ï¼š

- `pnpm` monorepo ç»„ç»‡æ–¹å¼
- `React 19`ã€`Vite 7`ã€Zustandã€Vitest ç­‰å·¥ç¨‹åŸºçº¿
- åŒ…èŒè´£åˆ’åˆ†å’Œå‘½åè§„èŒƒ
- è·¯ç”±ã€æµ‹è¯•ã€storeã€åŒ…å‘½åçš„çº¦å®š

ä½¿ç”¨æ–¹å¼ï¼š

- ä½œä¸º workspace å’ŒåŒ…å‘½åã€å·¥ç¨‹è„šæœ¬ã€æµ‹è¯•å¸ƒå±€çš„è§„èŒƒå‚è€ƒ
- åŒ…ç»“æž„ä¼˜å…ˆéµå®ˆå…¶ä¸­çš„ package extraction å’Œå‘½åè§„åˆ™

### 3.3 `docs/architecture/renderer-runtime.md`

å‚è€ƒå†…å®¹ï¼š

- `SchemaRenderer` æ€»ä½“è®¾è®¡
- props vs `useXX` çš„è¾¹ç•Œåˆ’åˆ†
- region handle è®¾è®¡
- runtime / scope / render context çš„æ‹†åˆ†åŽŸåˆ™
- static fast path å’Œ identity reuse çš„æ€§èƒ½åŽŸåˆ™

ä½¿ç”¨æ–¹å¼ï¼š

- ä½œä¸ºå®žçŽ°æ—¶çš„â€œæ ¸å¿ƒè®¾è®¡è¯´æ˜Žä¹¦â€
- å¼€å‘è¿‡ç¨‹ä¸­å¦‚æžœæŸé¡¹å®žçŽ°å’Œæœ¬æ–‡æ¡£å†²çªï¼Œä¼˜å…ˆå›žåˆ°è¿™ä»½è®¾è®¡æ–‡æ¡£ç¡®è®¤æ˜¯å¦è¦æ”¹è®¾è®¡

### 3.4 `docs/references/renderer-interfaces.md`

å‚è€ƒå†…å®¹ï¼š

- å½“å‰ renderer æ ¸å¿ƒæŽ¥å£è‰æ¡ˆ
- expression compiler / schema compiler / runtime / action / region / scope ä¸»è¦ç±»åž‹è¾¹ç•Œ

ä½¿ç”¨æ–¹å¼ï¼š

- ä½œä¸ºç¬¬ä¸€é˜¶æ®µä»£ç è½åœ°çš„æŽ¥å£è“å›¾
- å®žçŽ°æ—¶å…è®¸è¿­ä»£ï¼Œä½†è¦ä¿æŒå˜æ›´å¯è¿½è¸ªï¼Œå¹¶åŒæ­¥æ›´æ–°è®¾è®¡æ–‡æ¡£

### 3.5 `docs/references/expression-processor-notes.md`

å‚è€ƒå†…å®¹ï¼š

- ç¼–è¯‘ä¸€æ¬¡ã€å¤šæ¬¡æ‰§è¡Œçš„æ ¸å¿ƒæ€è·¯
- ç»“æžœä¸å˜æ—¶å¤ç”¨å¯¹è±¡å¼•ç”¨çš„ç¼“å­˜è¯­ä¹‰
- é™æ€/åŠ¨æ€èŠ‚ç‚¹é€’å½’æ±‚å€¼çš„å¤§è‡´æ€è·¯

ä¸ç›´æŽ¥å‚è€ƒçš„å†…å®¹ï¼š

- `new Function(...)`
- è‡ªå®šä¹‰å­—ç¬¦ä¸²è¡¨è¾¾å¼æ‰§è¡Œæ–¹æ¡ˆ

ä½¿ç”¨æ–¹å¼ï¼š

- åªä½œä¸ºâ€œä¼˜åŒ–è¯­ä¹‰åŽŸåž‹â€å‚è€ƒ
- æ­£å¼å®žçŽ°å¿…é¡»æ¢æˆ `amis-formula` æ³¨å…¥å¼ç¼–è¯‘å™¨

## 4. Recommended Workspace Structure

å»ºè®®ä¸€å¼€å§‹å°±æŒ‰ workspace å½¢å¼æ­å¥½ï¼Œä¸è¦å…ˆæŠŠæ‰€æœ‰ä»£ç å †åˆ°ä¸€ä¸ª package é‡Œã€‚

```text
apps/
  playground/                äº¤äº’è°ƒè¯•å’Œ demo éªŒè¯

packages/
  schema/                    åŸºç¡€ schema ç±»åž‹å’Œå…¬å…±å¸¸é‡
  formula/                   amis-formula é€‚é…å±‚ä¸Žè¡¨è¾¾å¼ç¼–è¯‘
  runtime/                   schema compilerã€runtimeã€scopeã€action æ ¸å¿ƒ
  react/                     React ä¸Šä¸‹æ–‡ã€hooksã€SchemaRenderer æ ¹ç»„ä»¶
  renderers-basic/           page/button/container/text ç­‰åŸºç¡€ renderer
  renderers-form/            form å’Œè¾“å…¥ç±» renderer
  renderers-data/            table/service/crud ç›¸å…³ renderer
  ui-adapter/                å¯¹æŽ¥ shadcn/ui æˆ–æœªæ¥ UI ç³»ç»Ÿ
  testing/                   æµ‹è¯•è¾…åŠ©ã€mock envã€schema fixtures
```

å»ºè®® package å‘½åï¼š

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/amis-testing`

è¯´æ˜Žï¼š

- `runtime` ä¸ä¾èµ– Reactï¼Œä¿æŒå¯æµ‹è¯•æ€§å’Œçº¯é€»è¾‘è¾¹ç•Œ
- `react` åªè´Ÿè´£ React integrationï¼Œä¸æ‰¿è½½æ ¸å¿ƒç¼–è¯‘é€»è¾‘
- renderer åŒ…æŒ‰èƒ½åŠ›åˆ†å±‚ï¼Œé¿å…å•åŒ…è†¨èƒ€
- `playground` æ°¸è¿œå…ˆäºŽä¸šåŠ¡æŽ¥å…¥ï¼Œç”¨æ¥éªŒè¯æž¶æž„æ˜¯å¦æ­£ç¡®

## 5. Phase Overview

æ•´ä¸ªå¼€å‘æ‹†æˆ 8 ä¸ªé˜¶æ®µï¼ŒæŒ‰ä¾èµ–é¡ºåºæŽ¨è¿›ã€‚

| Phase | ç›®æ ‡ | æ ¸å¿ƒäº§ç‰© |
| --- | --- | --- |
| P0 | å·¥ç¨‹åˆå§‹åŒ– | workspaceã€è„šæœ¬ã€åŸºç¡€åŒ…ã€playground |
| P1 | è¡¨è¾¾å¼æ ¸å¿ƒ | `amis-formula` é€‚é…å±‚ã€ExpressionCompiler |
| P2 | Schema ç¼–è¯‘æ ¸å¿ƒ | SchemaCompilerã€node modelã€region æå– |
| P3 | Runtime ä¸Ž React é›†æˆ | runtimeã€scopeã€hooksã€SchemaRenderer |
| P4 | åŸºç¡€ renderer é›† | page/container/text/button ç­‰ |
| P5 | è¡¨å•ä¸ŽåŠ¨ä½œç³»ç»Ÿ | form runtimeã€inputã€submitã€ajaxã€dialog |
| P6 | æ•°æ®åž‹ renderer | serviceã€tableã€paginationã€row scope |
| P7 | å®Œå–„é˜¶æ®µ | æ’ä»¶ã€ç›‘æŽ§ã€è°ƒè¯•ã€æ€§èƒ½ã€æ–‡æ¡£ã€å‘å¸ƒ |

## 6. Detailed Phase Plan

## 6.1 P0 - Workspace and Framework Bootstrap

### Goal

å…ˆæŠŠå¼€å‘åŸºåº§æ­ç¨³ï¼Œç¡®ä¿åŽç»­ä»£ç æœ‰æ˜Žç¡®å½’å±žã€‚

### Tasks

1. åˆå§‹åŒ– `pnpm-workspace.yaml`
2. åˆ›å»º root `package.json`
3. é…ç½®ç»Ÿä¸€ TypeScript åŸºçº¿ï¼š
   - `tsconfig.base.json`
   - å„ package `tsconfig.json`
4. åˆ›å»º `apps/playground`ï¼Œä½¿ç”¨ `React 19 + Vite 7`
5. åˆ›å»ºä¸Šè¿° packages ç›®å½•å’Œæœ€å°å…¥å£æ–‡ä»¶
6. é…ç½®åŸºç¡€è„šæœ¬ï¼š
   - `pnpm dev`
   - `pnpm build`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm lint`
7. é…ç½® Vitest åŸºçº¿
8. é…ç½® ESLint å’Œå¿…è¦æ ¼å¼åŒ–è§„åˆ™

### Deliverables

- workspace å¯å®‰è£…ä¾èµ–
- playground å¯å¯åŠ¨
- æ‰€æœ‰ package å¯ typecheck
- æµ‹è¯•æ¡†æž¶å¯è¿è¡Œ

### Exit criteria

- `pnpm install` æˆåŠŸ
- `pnpm --filter playground dev` å¯æ‰“å¼€é¡µé¢
- `pnpm typecheck` é€šè¿‡
- è‡³å°‘ 1 ä¸ª smoke test é€šè¿‡

### References

- `docs/architecture/frontend-baseline.md`: monorepoã€å‘½åã€æµ‹è¯•è„šæœ¬ã€React 19ã€Vite 7 åŸºçº¿

## 6.2 P1 - Expression Compiler Foundation

### Goal

å…ˆæŠŠæœ€å…³é”®ä¹Ÿæœ€å®¹æ˜“åŽæœŸè¿”å·¥çš„è¡¨è¾¾å¼å±‚åšå¥½ã€‚

### Tasks

1. åœ¨ `packages/formula` ä¸­å®žçŽ° `FormulaCompiler`
2. ç”¨ `amis-formula` å°è£…ï¼š
   - `hasExpression`
   - `compileExpression`
   - `compileTemplate`
3. å®žçŽ° `ExpressionCompiler`ï¼š
   - `compileNode`
   - `compileValue`
   - `createState`
   - `evaluateValue`
   - `evaluateWithState`
4. å®žçŽ° static fast pathï¼š
   - æ— è¡¨è¾¾å¼è¿”å›žåŽŸå§‹å¼•ç”¨
5. å®žçŽ° dynamic identity reuseï¼š
   - ç»“æžœä¸å˜å¤ç”¨ä¸Šæ¬¡å¯¹è±¡/æ•°ç»„å¼•ç”¨
6. ä¸ºå¯¹è±¡ã€æ•°ç»„ã€æ¨¡æ¿å­—ç¬¦ä¸²ã€çº¯è¡¨è¾¾å¼åˆ†åˆ«è¡¥å•æµ‹
7. å¢žåŠ  benchmark é£Žæ ¼æµ‹è¯•æˆ–æœ€å°æ€§èƒ½éªŒè¯ç”¨ä¾‹

### Deliverables

- å¯ç‹¬ç«‹è¿è¡Œçš„è¡¨è¾¾å¼ç¼–è¯‘åŒ…
- æ˜Žç¡®çš„ stateful evaluation æœºåˆ¶
- å•æµ‹è¦†ç›–é™æ€å’ŒåŠ¨æ€è¯­ä¹‰

### Exit criteria

- static subtree å§‹ç»ˆè¿”å›žåŽŸå§‹å¼•ç”¨
- åŠ¨æ€ subtree åœ¨å€¼ä¸å˜æ—¶å¤ç”¨æ—§å¼•ç”¨
- ä¸ä½¿ç”¨ `new Function(...)`
- å¯¹ `docs/references/expression-processor-notes.md` ä¸­æ€»ç»“çš„è¯­ä¹‰æœ‰ç­‰ä»·æµ‹è¯•

### References

- `docs/architecture/renderer-runtime.md`: è¡¨è¾¾å¼æ³¨å…¥ã€static fast pathã€identity reuse
- `docs/references/renderer-interfaces.md`: ç±»åž‹å¥‘çº¦
- `docs/references/expression-processor-notes.md`: ä»…å‚è€ƒç¼“å­˜è¯­ä¹‰ï¼Œä¸å‚è€ƒæ‰§è¡Œæ–¹å¼

## 6.3 P2 - Schema Compiler Core

### Goal

æŠŠ raw schema ç¼–è¯‘æˆçœŸæ­£å¯æ‰§è¡Œçš„ compiled node treeã€‚

### Tasks

1. åœ¨ `packages/runtime` ä¸­å®žçŽ° `SchemaCompiler`
2. å®žçŽ°å­—æ®µåˆ†ç±»è§„åˆ™ï¼š
   - `meta`
   - `prop`
   - `region`
   - `ignored`
3. å®žçŽ°é»˜è®¤ field classification
4. æ”¯æŒ renderer è‡ªå®šä¹‰ field rules
5. ç”Ÿæˆç¨³å®šçš„ï¼š
   - `path`
   - `node.id`
   - `region.path`
6. ç¼–è¯‘ï¼š
   - `meta`
   - `staticProps`
   - `dynamicProps`
   - `regions`
7. å®žçŽ° `createRuntimeState()`
8. å¤„ç†æ•°ç»„ schemaã€å¯¹è±¡ schemaã€å•èŠ‚ç‚¹ schema
9. ä¸º path/id ç¨³å®šæ€§å’Œ region æå–è¡¥æµ‹è¯•

### Deliverables

- schema -> compiled node tree
- èŠ‚ç‚¹çº§ runtime state æž„é€ èƒ½åŠ›
- å¯è¢« runtime ç›´æŽ¥æ¶ˆè´¹çš„ region æ¨¡åž‹

### Exit criteria

- åŒä¸€ schema é‡å¤ç¼–è¯‘ç»“æžœç»“æž„ä¸€è‡´
- renderer èƒ½æ­£ç¡®å£°æ˜Ž `body` / `actions` / `columns` ç­‰ region
- `CompiledSchemaNode.flags.isStatic` è¡Œä¸ºæ­£ç¡®

### References

- `docs/architecture/renderer-runtime.md`: compiled nodeã€region handleã€scope policy
- `docs/references/renderer-interfaces.md`: `CompiledSchemaNode`ã€`SchemaFieldRule`ã€`SchemaCompileContext`
- `docs/architecture/amis-core.md`: é¡µé¢ã€è¡¨å•ã€å¯¹è¯æ¡†ã€è¡¨æ ¼ç­‰ schema ç‰¹å¾å­—æ®µ

## 6.4 P3 - Runtime and React Integration

### Goal

æŠŠçº¯é€»è¾‘æ ¸å¿ƒæŽ¥åˆ° React ä¸Šï¼Œä½†ä»ä¿æŒ runtime å’Œ React åˆ†å±‚ã€‚

### Tasks

1. åœ¨ `packages/runtime` ä¸­å®žçŽ°ï¼š
   - `RendererRegistry`
   - `RendererRuntime`
   - `ScopeRef`
   - `createChildScope`
   - `resolveNodeMeta`
   - `resolveNodeProps`
2. åœ¨ `packages/react` ä¸­å®žçŽ°ï¼š
   - `SchemaRenderer`
   - `RendererRuntimeContext`
   - `RenderScopeContext`
   - `RenderNodeContext`
   - `FormRuntimeContext`
3. å®žçŽ° hooksï¼š
   - `useRendererRuntime`
   - `useRenderScope`
   - `useScopeSelector`
   - `useRenderFragment`
   - `useCurrentNodeMeta`
4. å®žçŽ° `RenderRegionHandle`
5. å…ˆæ”¯æŒæœ€å°é€’å½’æ¸²æŸ“é—­çŽ¯
6. å¢žåŠ  React çº§åˆ«æµ‹è¯•

### Deliverables

- èƒ½åœ¨ React ä¸­æ¸²æŸ“ compiled schema tree
- è‡ªå®šä¹‰ç»„ä»¶å¯é€šè¿‡ `regions.render()` æ¸²æŸ“å­ç‰‡æ®µ
- scope selector å¯ç”¨

### Exit criteria

- playground ä¸­èƒ½æ¸²æŸ“æœ€å° page -> container -> text æ ‘
- è‡ªå®šä¹‰ç»„ä»¶å¯ä¼  `{ data, scopeKey }` æ¸²æŸ“å±€éƒ¨ schema
- å¤§ context ä¸å¼•å‘æ˜Žæ˜¾çš„æ— å…³ rerender

### References

- `docs/architecture/renderer-runtime.md`: props/hook è¾¹ç•Œã€context æ‹†åˆ†ã€local fragment render
- `docs/references/renderer-interfaces.md`: runtimeã€hooksã€regionã€scope æŽ¥å£

## 6.5 P4 - Basic Renderer Set

### Goal

å…ˆå®žçŽ°æœ€å°å¯è¿è¡Œé¡µé¢ï¼Œä¸æ€¥äºŽè¡¨å•å’Œæ•°æ®èƒ½åŠ›ã€‚

### First batch renderers

- `page`
- `container`
- `flex`
- `text`
- `tpl`
- `button`
- `divider`
- `html` æˆ– `rich-text` çš„æœ€å°å®‰å…¨ç‰ˆæœ¬

### Tasks

1. å»ºç«‹åŸºç¡€ renderer registry
2. å®žçŽ°åŸºç¡€å¸ƒå±€ renderer
3. å®žçŽ°ç®€å•æ–‡æœ¬/æ¨¡æ¿ renderer
4. å®žçŽ° `button` åŠ¨ä½œå…¥å£å ä½
5. åœ¨ playground ä¸­åšåŸºç¡€ schema demo
6. å»ºç«‹ renderer snapshot/behavior test

### Deliverables

- ä¸€ä¸ªå¯æ‰‹å†™ schema çš„åŸºç¡€é¡µé¢æ¸²æŸ“å™¨
- å¯è§†åŒ–éªŒè¯é¡µé¢

### Exit criteria

- playground ä¸­èƒ½æ¸²æŸ“ä¸€ä¸ªçº¯é™æ€é¡µé¢
- æ”¯æŒå°‘é‡åŠ¨æ€æ–‡æœ¬è¡¨è¾¾å¼
- region render å’Œ custom renderer æµç¨‹å¯å·¥ä½œ

### References

- `docs/architecture/amis-core.md`: page/body/button åŸºç¡€å­—æ®µ
- `docs/architecture/renderer-runtime.md`: è‡ªå®šä¹‰ç»„ä»¶å¦‚ä½•æ¶ˆè´¹ `regions`

## 6.6 P5 - Form and Action System

### Goal

è¿›å…¥ä½Žä»£ç ç³»ç»Ÿçš„ç¬¬ä¸€ä¸ªå¤æ‚é—­çŽ¯ï¼šè¡¨å• + åŠ¨ä½œ + APIã€‚

### Tasks

1. å®žçŽ° `PageStore` å’Œ `FormStore` æœ€å°ç‰ˆæœ¬
2. å®žçŽ° `FormRuntime`
3. é›†æˆ React Hook Form
4. è®¾è®¡å­—æ®µä¸Žè¡¨å• store çš„æ˜ å°„æ–¹å¼
5. å®žçŽ°åŠ¨ä½œè°ƒåº¦å™¨ï¼š
   - `setValue`
   - `ajax`
   - `submitForm`
   - `dialog`
   - `closeDialog`
6. å®žçŽ°åŸºç¡€ input rendererï¼š
   - `input-text`
   - `input-email`
   - `input-password`
   - `select` æœ€å°ç‰ˆ
7. å®žçŽ° API è¯·æ±‚å°è£…å’Œ adaptor å¤„ç†
8. æŽ¥å…¥é˜²æŠ–å’Œ `AbortController`
9. å¢žåŠ è¡¨å•åœºæ™¯ demo å’Œæµ‹è¯•

### Deliverables

- å¯æäº¤è¡¨å•
- å¯è°ƒç”¨ API action
- å¯å¼¹å‡ºå’Œå…³é—­ dialog

### Exit criteria

- playground ä¸­å¯å®Œæˆâ€œæ–°å¢žç”¨æˆ·â€æœ€å° demo
- è¡¨å•å†…å¤–æ›´æ–°æ¨¡åž‹å¯å·¥ä½œ
- action chain å¯ä¸²è”æ‰§è¡Œ

### References

- `docs/architecture/amis-core.md`: FormStoreã€åŠ¨ä½œç³»ç»Ÿã€API å¯¹è±¡ã€dialog æ¨¡åž‹ã€è¡¨å•éªŒè¯æ€è·¯
- `docs/architecture/renderer-runtime.md`: form runtimeã€dispatchã€scope ä¼ é€’ç­–ç•¥
- `docs/references/renderer-interfaces.md`: action/runtime/form æŽ¥å£

## 6.7 P6 - Data Renderers and CRUD Scenario

### Goal

å®žçŽ°æ•°æ®åž‹ rendererï¼Œæ‰“é€šç¬¬ä¸€ä¸ªçœŸå®ž CRUD é¡µé¢ã€‚

### Tasks

1. å®žçŽ° `service` æˆ– page `initApi` èƒ½åŠ›
2. å®žçŽ° `table` renderer
3. å®žçŽ° `pagination`
4. å®žçŽ° `operation` column
5. å®žçŽ° row scope å’Œ row-level region render
6. è§†æƒ…å†µæŽ¥å…¥è™šæ‹Ÿæ»šåŠ¨ï¼š
   - ç¬¬ä¸€ç‰ˆå¯å…ˆä¸åšå¤æ‚è™šæ‹ŸåŒ–
   - ç¬¬äºŒç‰ˆæŽ¥å…¥ `react-window` æˆ–ç­‰ä»·æ–¹æ¡ˆ
7. ç”¨ `docs/examples/user-management-schema.md` ä¸­ç”¨æˆ·ç®¡ç†ç¤ºä¾‹è£å‰ªå‡ºé¦–ä¸ª CRUD demo
8. è¡¥ table å’Œ row scope æ€§èƒ½æµ‹è¯•

### Deliverables

- å¯æœç´¢ã€åˆ†é¡µã€ç¼–è¾‘ã€åˆ é™¤çš„ CRUD demo
- row scope å’Œ operation action å¯è¿è¡Œ

### Exit criteria

- ç”¨æˆ·ç®¡ç† demo å¯åŸºæœ¬è·‘é€š
- `record` / `index` / `dialogId` ç­‰å±€éƒ¨ä¸Šä¸‹æ–‡ä¼ é€’æ­£ç¡®
- è¡¨æ ¼æ•°æ®æ›´æ–°ä¸ä¼šå¯¼è‡´æ•´é¡µæ˜Žæ˜¾æ— å·®åˆ«é‡æ¸²æŸ“

### References

- `docs/examples/user-management-schema.md`: å®Œæ•´ CRUD JSON ç¤ºä¾‹
- `docs/architecture/renderer-runtime.md`: row scopeã€local fragment renderã€æ€§èƒ½çº¦æŸ

## 6.8 P7 - Plugin, Debugging, Performance, and Release Hardening

### Goal

æŠŠç³»ç»Ÿä»Žâ€œèƒ½è·‘ demoâ€æå‡åˆ°â€œå¯æŽ¥å…¥ä¸šåŠ¡â€çš„å±‚çº§ã€‚

### Tasks

1. æ’ä»¶æœºåˆ¶ï¼š
   - `beforeCompile`
   - `afterCompile`
   - `wrapComponent`
   - `beforeAction`
2. é”™è¯¯å¤„ç†ï¼š
   - Error Boundary
   - expression/action/api é”™è¯¯æ ¼å¼åŒ–
3. ç›‘æŽ§ä¸Žè°ƒè¯•ï¼š
   - render timing
   - action timing
   - api hooks
   - debug path labels
4. æ€§èƒ½ä¸“é¡¹ï¼š
   - compiled schema ç¼“å­˜
   - resolve props ç¼“å­˜
   - region handle ç¨³å®šå¼•ç”¨
   - table è™šæ‹ŸåŒ–
5. æ–‡æ¡£å®Œå–„ï¼š
   - package README
   - renderer authoring guide
   - custom component guide
6. å‘å¸ƒå‡†å¤‡ï¼š
   - tsup / vite library mode / rollup é€‰åž‹
   - å¯¼å‡ºè¾¹ç•Œæ•´ç†
   - ç‰ˆæœ¬ç­–ç•¥

### Deliverables

- å¯æ‰©å±•ã€å¯è°ƒè¯•ã€å¯å‘å¸ƒçš„ renderer framework

### Exit criteria

- æ ¸å¿ƒ API æœ‰ README
- è‡³å°‘ 1 ä¸ªè‡ªå®šä¹‰ renderer ç¤ºä¾‹å®Œæ•´æ–‡æ¡£åŒ–
- buildã€typecheckã€test ç¨³å®šé€šè¿‡

### References

- `docs/architecture/amis-core.md`: é”™è¯¯å¤„ç†ã€ç›‘æŽ§ã€æ‰©å±•æ€§è®¾è®¡
- `docs/architecture/frontend-baseline.md`: åŒ…èŒè´£ã€æµ‹è¯•ã€å‘å¸ƒå’Œå‘½åçº¦æŸ
- `docs/architecture/renderer-runtime.md`: runtime ç¨³å®šå¼•ç”¨å’Œæ€§èƒ½è®¾è®¡

## 7. Suggested Milestone Outputs

å»ºè®®æŠŠé˜¶æ®µäº¤ä»˜ç‰©å®šä¹‰æˆå¯ä»¥æ¼”ç¤ºå’ŒéªŒæ”¶çš„é‡Œç¨‹ç¢‘ï¼Œè€Œä¸æ˜¯æŠ½è±¡çš„â€œå®Œæˆè‹¥å¹²ä»»åŠ¡â€ã€‚

### M1 - Framework Skeleton

- workspace æ­å¥½
- playground èƒ½å¯åŠ¨
- packages å¯äº’ç›¸å¼•ç”¨

### M2 - Expression Engine Ready

- `amis-formula` é€‚é…å±‚å®Œæˆ
- static/dynamic è¯­ä¹‰æµ‹è¯•é€šè¿‡

### M3 - Minimal Renderer Loop

- schema compile -> runtime -> React render è·‘é€š
- åŸºç¡€ renderer å¯å±•ç¤º

### M4 - Form and Dialog Demo

- å¯å¼¹çª—
- å¯è¾“å…¥
- å¯æäº¤ action

### M5 - CRUD Demo

- æœç´¢
- è¡¨æ ¼
- æ–°å¢ž/ç¼–è¾‘/åˆ é™¤
- åˆ†é¡µ

### M6 - Business-ready Alpha

- æ’ä»¶ã€ç›‘æŽ§ã€æ–‡æ¡£ã€æµ‹è¯•ã€æ€§èƒ½åŸºçº¿é½å¤‡

## 8. Testing Strategy by Stage

### 8.1 Unit tests

é‡ç‚¹è¦†ç›–ï¼š

- expression compile/evaluate
- schema compile
- runtime resolve props/meta
- action dispatcher
- scope creation and selector behavior

### 8.2 React integration tests

é‡ç‚¹è¦†ç›–ï¼š

- region render
- custom renderer nested rendering
- form control with scope/action integration
- dialog open/close lifecycle

### 8.3 Demo verification

playground ä¸­è‡³å°‘é•¿æœŸä¿ç•™ä»¥ä¸‹ demoï¼š

- static page demo
- dynamic text demo
- custom renderer local fragment demo
- form submit demo
- table row operation demo
- CRUD demo

### 8.4 Performance regression tests

é‡ç‚¹å…³æ³¨ï¼š

- static object fast path
- dynamic identity reuse
- row scope creation count
- large table rerender behavior

## 9. Development Rules During Implementation

åŽç»­å¼€å‘è¿‡ç¨‹ä¸­å»ºè®®éµå®ˆä»¥ä¸‹è§„åˆ™ï¼š

1. å…ˆå†™æŽ¥å£å’Œæµ‹è¯•ï¼Œå†å†™å®žçŽ°
2. `runtime` å±‚ç¦æ­¢ç›´æŽ¥ä¾èµ– React
3. è¡¨è¾¾å¼å±‚å¿…é¡»é€šè¿‡ `amis-formula` æ³¨å…¥ï¼Œä¸å…è®¸å›žé€€åˆ° `new Function`
4. static fast path å’Œ identity reuse å¿…é¡»æœ‰æµ‹è¯•ï¼Œä¸æŽ¥å—â€œé çº¦å®šâ€
5. æ¯å¢žåŠ ä¸€ä¸ªå¤æ‚ rendererï¼Œå¿…é¡»å…ˆå†™ playground demo
6. è‡ªå®šä¹‰ renderer ä½“éªŒè¦æŒç»­æ£€æŸ¥ï¼Œä¸èƒ½è®© authoring API è¶Šåšè¶Šé‡
7. å¦‚æžœå®žçŽ°ä¸Žæ–‡æ¡£å†²çªï¼Œå…ˆæ›´æ–°è®¾è®¡å†æ”¹ä»£ç ï¼Œä¸è¦å·å·åç¦»

## 10. Immediate Next Actions

å»ºè®®æŒ‰ä»¥ä¸‹é¡ºåºå¼€å§‹å®žé™…ç¼–ç ï¼š

1. åˆå§‹åŒ– workspace å’Œ `apps/playground`
2. åˆ›å»º `packages/formula`ï¼Œå…ˆå®žçŽ° `FormulaCompiler` ç©ºå£³å’Œæµ‹è¯•åŸºçº¿
3. åˆ›å»º `packages/runtime`ï¼ŒæŽ¥å…¥ `docs/references/renderer-interfaces.md` ä¸­æ•´ç†åŽçš„æŽ¥å£è¾¹ç•Œ
4. æŠŠçŽ°æœ‰æŽ¥å£è‰æ¡ˆæ‹†åˆ†è¿›å¯¹åº” package
5. ä¼˜å…ˆå®Œæˆ P1ï¼Œè€Œä¸æ˜¯å…ˆå†™ä¸€å † renderer

åŽŸå› å¾ˆç®€å•ï¼šè¡¨è¾¾å¼ç¼–è¯‘å’Œå¼•ç”¨ç¨³å®šç­–ç•¥ä¸€æ—¦å®šé”™ï¼ŒåŽé¢ schema compilerã€runtimeã€renderer å…¨éƒ½è¦è¿”å·¥ã€‚

## 11. Final Recommendation

è¿™ä¸ªé¡¹ç›®æœ€å®¹æ˜“å¤±è´¥çš„æ–¹å¼ï¼Œä¸æ˜¯å®žçŽ°éš¾åº¦å¤ªé«˜ï¼Œè€Œæ˜¯è¿‡æ—©è¿›å…¥æŽ§ä»¶å †å é˜¶æ®µã€‚å› æ­¤å»ºè®®å¼€å‘èŠ‚å¥å§‹ç»ˆä¿æŒï¼š

- å…ˆåŸºç¡€è®¾æ–½
- å†æ ¸å¿ƒç¼–è¯‘å™¨
- å† runtime
- å† renderer
- æœ€åŽé«˜çº§åœºæ™¯

åªè¦ä¸¥æ ¼æŒ‰é˜¶æ®µæŽ¨è¿›ï¼Œå¹¶å§‹ç»ˆä»¥ `docs/architecture/renderer-runtime.md` å’Œ `docs/references/renderer-interfaces.md` ä½œä¸ºæ ¸å¿ƒçº¦æŸï¼Œæ¡†æž¶ä¼šæ›´ç¨³ï¼Œä¹Ÿæ›´å®¹æ˜“åœ¨åŽæœŸæ‰©å±•åˆ° designerã€pluginã€schema market ç­‰èƒ½åŠ›ã€‚


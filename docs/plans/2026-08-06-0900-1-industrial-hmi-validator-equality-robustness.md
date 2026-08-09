# 01 Industrial HMI Validator & Equality Robustness（fail-closed 边界 + 判等正确性 + 子形状校验）

> Plan Status: completed
> Mission: industrial-hmi
> Work Item: 2026-08-05-2129 post-remediation audit P2（validator/equality 子集）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-multi-audit-industrial-hmi.md` `[P2-9]`（dim 15）+ `docs/audits/2026-08-05-2129-open-audit-industrial-hmi.md` `[P2-2]`（dim 19）/ `[P2-3]`（dim 19）/ `[P2-5]`（dim 16）/ `[P2-6]`（dim 19），登记于 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节
> Related: `docs/plans/2026-08-05-0653-4-hmi-config-build-equality-diagnostic-fidelity.md`（C2 引入共享 `serialization/equality.ts deepEqual`，本 plan 在其上加 array/object 守卫 + 深度上限，**不回退** C2 语义）、`docs/plans/2026-08-05-0653-3-hmi-binding-state-resolution-correctness.md`（B3/B4 已收紧 stateSource/scale.expression validator，本 plan 不动这两处）

## Purpose

把 2026-08-05-2129 审计登记的 **5 条 validator/equality 层 fail-closed / 判等正确性** P2 收口。五条共享同一结果面：**组态 JSON 进入运行时的最后一道防线（`serialization/validate.ts` + `serialization/equality.ts`）的健壮性与判等正确性**——malformed/恶意 host JSON、非有限数值、数组↔对象形态混同、嵌套 legacy 方言、深度爆炸均应在 validator/判等层被可靠识别（fail-closed 或判等稳定），而非静默放行后在消费者层产 NaN/undefined/空 diff。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经源码实测确认（行号对齐 HEAD）。

- **open P2-2 已确认 live（`equality.ts:17-32`）**：`deepEqual(a, b)` 无 `Array.isArray` 守卫——`:19` 仅判 `typeof a !== 'object' || typeof b !== 'object'`，数组与 array-shaped 对象（`{0:1,1:2}`）同为 `object`、`Object.keys` 均为 `['0','1']`、长度相等、递归 `deepEqual(1,1)`/`deepEqual(2,2)` → `deepEqual([1,2], {0:1,1:2}) === true`，违反自身注释「数组按 index 比较」（`:13`）。对 `custom`/`fillStyle`/`strokeDash` 等无类型内省字段，host 往返翻转 array↔object 形态时产 empty diff patch（`diff.valuesEqual` 复用此实现，plan 2026-08-05-0653-4 C2）或丢 serialize override（`compound.deepEquals` 已并)。
- **open P2-3 已确认 live（`validate.ts:18-27` `checkNumberField`）**：仅判 `typeof node[field] !== 'number'`——`typeof NaN === 'number'`、`typeof Infinity === 'number'`、`typeof -Infinity === 'number'` 全过。`x/y/width/height/strokeWidth/textSize/period/loop/deadband` 等数值字段经 `JSON.parse('1e400') → Infinity` 或 `undefined` 运算后无下游 clamp，消费者读字段 raw 产 NaN/Infinity（几何/动画周期/死区语义漂移）。
- **open P2-5 已确认 live（`validate.ts:390-432` `scanLegacyAtSyntax`）**：`:411` 仅 `symbols.forEach((node) => …)` 扫顶层 `node.bindings`，**不递归 `node.children`**（与 `validateSymbolNode:276-278` 的 children 递归不对称）→ 组态最典型形态（`scada-group` 嵌套子图元 bindings 内的 legacy `@{pointId}` 方言）静默不 warn，迁移期 author 不可见。
- **open P2-6 已确认 live（`validate.ts` 多处 surface-only 校验）**：validator 只校验声明对象 surface 类型，子形状 malformed 全过——
  - `:204` `shadow` 仅 `isPlainObject`，`x/y/blur/color` 子字段不校验；
  - `:81-85` animation `from/to` 容忍 `object` 但不校验子形状；
  - `:373` config `background` 仅 `isPlainObject`，`color` 子字段不校验；
  - `:310-321` declaration `scale` 仅校验 `isPlainObject` + 拒 `expression`，`k/b`（linear scale 系数）非数值不校验；
  - `validatePointDeclaration`（`:283-331`）无 `init` 字段校验（`init` 为点初始值，malformed 静默 corrupt 点表，后果最重）。
  - 建议一个 `assertShape(value, schema, scope)` helper 覆盖声明对象形状。
- **multi P2-9 已确认 live（两处无深度限制）**：
  - `validate.ts:264-280` `validateSymbolNode` 在 `:277` 递归 `children` 无 `depth` 参数 → ~10k 层嵌套（恶意/损坏 host JSON）stack overflow，fail-closed 边界缺口（validator 本应是最外层防线，却自身先崩）；
  - `equality.ts:17-32` `deepEqual` 在 `:29` 递归无 `depth` 参数 → 同样 ~10k 层深度 stack overflow（用于 diff 热路径，恶意 config 可经深嵌套 `custom` 打击）。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（2129-3 + 0746-1/2/3 收口后基线 ~696 tests / 54 files）。
- **共享实现已就位**：`equality.ts deepEqual` 已是 `diff.valuesEqual` + `compound.deepEquals` 的单一事实源（plan 2026-08-05-0653-4 C2）；本 plan 在其上加 array/object 守卫与深度上限不回退 C2 的 own-keys 递归 stable 语义。

## Goals

- **P2-2（判等 array/object 分歧）**：`deepEqual` 加 `Array.isArray(a) !== Array.isArray(b) → false` 守卫 + 数组按 index 比较分支，使 `deepEqual([1,2], {0:1,1:2}) === false`（断言判等结果，非仅不抛错）。
- **P2-3（数值有限性）**：`checkNumberField` 收紧为 `typeof n === 'number' && Number.isFinite(n)`，NaN/±Infinity 被 validator 拒绝（断言 `validateScadaConfig` 对 `Infinity`/`NaN` 返 `ok:false`）。
- **P2-5（legacy 扫描递归）**：`scanLegacyAtSyntax` 对 `scada-group` 递归 `children`（镜像 `validateSymbolNode:276-278`），嵌套子图元 bindings 的 `@{pointId}` 方言 warn（断言嵌套场景产 `legacy-at-syntax` warning）。
- **P2-6（子形状校验）**：引入 `assertShape(value, schema, scope, errors)` helper 覆盖 `shadow`/animation `from,to`/`background`/declaration `scale.k,b`/`init` 的子形状，malformed 子字段被 validator 拒绝（断言各 malformed 形态 `ok:false` + 错误消息含 scope）。
- **P2-9（深度上限 fail-closed）**：`validateSymbolNode` 与 `deepEqual` 加 `depth` 参数（cap ~100），溢出时 validator 返结构化错误、`deepEqual` 返 `false`（fail-closed），~10k 层嵌套不再 stack overflow（断言深嵌套 config 返 `ok:false` 含深度错误，非 crash）。
- **owner doc 同步**：`docs/components/industrial-hmi/design-renderer.md`（§4.3 validation contract 段——校验/序列化/反序列化/增量 diff）反映数值有限性 / 子形状校验 / 深度上限 / legacy 递归。

## Non-Goals

- 不改 `diff.valuesEqual` / `compound.deepEquals` 的调用点语义（仅升级共享 `deepEqual` 实现，调用点行为对「合法 config」不变；array↔object 混同原本就是 bug）。
- 不重构 validator 整体结构（仅加 helper + 收紧既有 `checkNumberField` / `scanLegacyAtSyntax` / 加 depth 参数）。
- 不处理同轮其余 P2（归 sibling plan `2026-08-06-0900-2` symbol 几何 / `2026-08-06-0900-3` engine-lifecycle 或后续 mission 节奏）。
- 不改 `config-types.ts` 类型定义（类型已可选/正确，问题是 validator 未充分校验已声明字段形状）。
- 不动 i18n / 错误码注册表的新增（复用既有 `validate-*` 错误消息风格，不新增 scada 错误码通道）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/equality.ts`（P2-2 array/object 守卫 + P2-9 深度上限）。
- `packages/flux-renderers-industrial/src/serialization/validate.ts`（P2-3 `checkNumberField` 收紧 + P2-5 `scanLegacyAtSyntax` 递归 + P2-6 `assertShape` helper + P2-9 `validateSymbolNode` depth）。
- 回归 proof：5 项各带 failing-first 单测（断言结果值/判等/拒绝/警告，非仅 not.toThrow）。
- owner doc：`docs/components/industrial-hmi/design-renderer.md`（§4.3 validation contract）。

### Out Of Scope

- `serialization/diff.ts` / `serialization/compound.ts`（仅消费 `deepEqual`，不修改）。
- `config-types.ts` 类型、`schemas.ts`。
- binding/engine/symbol 层（归 sibling plan）。

## Failure Paths

| 可测场景编号          | 触发                                          | 行为                                                 | 可重试 | 用户可见表现                                         |
| --------------------- | --------------------------------------------- | ---------------------------------------------------- | ------ | ---------------------------------------------------- |
| array-object-conflate | `deepEqual([1,2], {0:1,1:2})`                 | 返 `false`（array/object 形态分歧）                  | 否     | host 往返 array↔object 不再产 empty diff/丢 override |
| non-finite-number     | config `strokeWidth: Infinity`（`JSON.parse`) | `validateScadaConfig` 返 `ok:false`                  | 否     | author 见 `...strokeWidth must be a finite number`   |
| deep-nested-config    | ~10k 层 children 嵌套的恶意 config            | validator 返 `ok:false`（结构化深度错误），非 crash  | 否     | 不再 stack overflow；host 见深度超限错误             |
| legacy-in-group-child | `scada-group` 子图元 bindings 用 `@{pointId}` | `validateScadaConfig.warnings` 含 `legacy-at-syntax` | 否     | 迁移期 author 见嵌套 legacy 警告 + codemod 指引      |
| malformed-subshape    | declaration `scale: { k: 'x' }`（k 非数值）   | `validateScadaConfig` 返 `ok:false`                  | 否     | author 见 `...scale.k must be a number`              |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**——validator 是组态 JSON 进入运行时的公共防线，判等是 diff 热路径的事实源；5 项均为「合法 config 不回归 + malformed/恶意形态被可靠识别」的契约级正确性。failing-first Proof 先行（malformed/混同/深嵌套场景红 → 修复绿）。

## Execution Plan

### Phase 1 - equality 判等正确性（P2-2 + P2-9-deepEqual）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/equality.ts`

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first，先于 Fix）**：新建 `packages/flux-renderers-industrial/src/serialization/serialization-equality.test.ts`（全仓无既有 equality 直测文件，本 plan 新建）新增两组用例：(a) `deepEqual([1,2], {0:1,1:2}) === false` + `deepEqual([1,2],[1,2]) === true` + `deepEqual({0:1,1:2},{0:1,1:2}) === true`（数组与 array-shaped 对象不再混同；合法数组/对象判等不回归）；(b) 深度——(b1) 构造 ~50 层（cap ~100 以内）嵌套对象 `{a:{a:{...}}}`，断言 `deepEqual(within, within) === true`（cap 内结构相同判等）；(b2) 构造 ~10k 层（超 cap）嵌套对象，断言 `deepEqual(deep, deep)` **不抛 stack overflow 且返 `false`**（fail-closed：超 cap 深度判不等，由 caller 当 diff 处理；对结构不同的超深对象同样返 `false` 不 crash）。修复前红：混同场景 (a) 返 true；超深 (b2) 抛 stack overflow（无 depth 上限）。
- [x] **Fix-a（array/object 守卫）**：`deepEqual` 在 `typeof` 检查后加 `if (Array.isArray(a) !== Array.isArray(b)) return false;`，数组分支按 `length` + index 递归比较（保留 own-keys 递归用于 object 分支）。注释更新：array 与 array-shaped object 形态分歧判 false（对齐自身「数组按 index 比较」注释）。
- [x] **Fix-b（深度上限）**：`deepEqual` 增内部递归参数 `depth = 0`（默认值保持公开签名 `deepEqual(a,b)` 二参兼容），`depth > MAX_DEEP_EQUAL_DEPTH`（~100，模块级常量）时返 `false`（fail-closed：超深结构判不等，由 caller 当 diff 处理而非 crash）。落地后上述 failing-first Proof 转绿。

Exit Criteria:

> 本 Phase 交付 = `deepEqual` 判等正确（array/object 不混同）+ 深嵌套不 crash。只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查（Minimum Rule 18）。

- [x] `deepEqual([1,2], {0:1,1:2}) === false`，合法数组/对象判等不回归（proof 断言结果值）。
- [x] 深嵌套 fail-closed：cap 内（~50 层）结构相同返 `true`；超 cap（~10k 层）不抛 stack overflow 且返 `false`（proof 断言不抛 + 结果值）。
- [x] `diff.valuesEqual` / `compound` 调用点对合法 config 不回归（既有 diff/serialize 单测全绿 = 局部验证）。

### Phase 2 - validator 数值有限性 + 递归深度（P2-3 + P2-9-validateSymbolNode）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/validate.ts`（`checkNumberField` + `validateSymbolNode`）

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first，先于 Fix）**：既有 validator 单测文件新增两组：(a) `checkNumberField` 相关——构造 `strokeWidth: Infinity`（`JSON.parse('1e400')`）、`x: NaN`、`period: -Infinity` config，断言 `validateScadaConfig` 返 `ok:false` 且 errors 含对应 scope + "finite number" 文案；(b) `validateSymbolNode` 深度——构造 ~10k 层 `children` 嵌套 config，断言 `validateScadaConfig` 返 `ok:false`（结构化深度错误），非抛 stack overflow。修复前红（Infinity/NaN 放行 / 深嵌套 crash）。
- [x] **Fix-a（数值有限性）**：`checkNumberField` 改 `if (field in node && (typeof node[field] !== 'number' || !Number.isFinite(node[field] as number))) errors.push(\`${scope}.${field} must be a finite number\`)`。NaN/±Infinity 被拒。
- [x] **Fix-b（递归深度）**：`validateSymbolNode` 增 `depth` 参数（内部递归传递，默认 0），`depth > MAX_VALIDATE_DEPTH`（~100，模块级常量）时 `errors.push(\`${scope} exceeds maximum nesting depth\`)` 并 return（fail-closed，不再递归）。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [x] NaN/±Infinity 数值字段被 validator 拒绝（proof 断言 `ok:false` + 错误 scope）。
- [x] ~10k 层嵌套 config 返 `ok:false`（深度错误），非 crash。
- [x] 合法 config（含正常嵌套 group）不回归（既有 validator 单测全绿）。

### Phase 3 - validator 覆盖完整性（P2-5 legacy 递归 + P2-6 assertShape 子形状）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/validate.ts`（`scanLegacyAtSyntax` + 新 `assertShape` helper + 子形状校验接入点）

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first，先于 Fix）**：两组用例：(a) legacy 递归——构造 `scada-group` 嵌套子图元 bindings.expression 含 `@{pointId}` 的 config，断言 `validateScadaConfig().warnings` 含 `legacy-at-syntax` 且 scope 指向嵌套子图元；(b) 子形状——构造 `shadow: { blur: 'x' }`、animation `from: { bad: 1 }`、`background: { color: 123 }`、declaration `scale: { k: 'x' }`、`init: { bad: true }` 各 malformed config，断言 `validateScadaConfig` 返 `ok:false` 且 errors 含对应 scope + 子字段文案。修复前红（嵌套 legacy 不 warn / 子形状放行）。
- [x] **Fix-a（scanLegacyAtSyntax 递归）**：`scanLegacyAtSyntax` 顶层 symbols 循环内，对每个 `node` 经一个递归 helper（镜像 `validateSymbolNode:276-278` 的 children 遍历）扫 `node.children[].bindings`，scope 拼接 `.children[i]`。嵌套子图元 legacy 方言 warn。
- [x] **Fix-b（assertShape helper + 接入）**：新增 `assertShape(value, schema, scope, errors)` helper（`schema` 为 `{ [field]: 'number' | 'string' | 'boolean' | 'object' | 'array' }` 描述，逐字段校验类型，malformed 子字段 `errors.push(\`${scope}.${field} must be a ${expected}\`)`）。接入：`shadow`（x/y/blur:number、color:string）、animation `from/to`（object 形态时校验子形状）、`background`（color:string）、declaration `scale`（k:number、b:number）、`init`（须为 primitive，malformed 拒绝）。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [x] `scada-group` 嵌套子图元 bindings 的 `@{pointId}` 方言产 `legacy-at-syntax` warning（proof 断言 warning scope）。
- [x] `shadow`/`from,to`/`background`/`scale.k,b`/`init` malformed 子形状被 validator 拒绝（proof 断言各 `ok:false` + scope）。
- [x] 合法声明（含正常 shadow/animation/background/scale/init）不回归（既有 validator + symbols 单测全绿）。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02b6a0812ffeRwqBaXeG2XLRze`、R2 `ses_02b64a676ffeP6lD3A62YJ5ltQ`）
- Verdict: `pass`（R2 共识轮零 Blocker / 零 Major / 零 Minor）
- Rounds: 2（R1 `revise` → R2 `pass`）
- Findings addressed: R1 **Major**——Phase 1 Proof/Fix 深度上限内部矛盾（Proof (b) 期望 ~10k 层相同结构 `deepEqual===true`，而 Fix-b 超 cap 返 `false` → failing-first 永不转绿）；落地：Proof (b) 拆为 (b1) ~50 层（cap 内）相同→`true` + (b2) ~10k 层（超 cap）不抛 stack overflow 且返 `false`（fail-closed），与 Fix-b + Exit Criteria #2 一致。R1 minor——owner-doc 引用补全（`design-renderer.md §4.3` 经 live 核对为「校验/序列化/反序列化/增量 diff」段，:165）、equality 直测文件路径 firm（新建 `src/serialization/serialization-equality.test.ts`）。引用准确性：R1/R2 全部引用簇（equality.ts:17-32 typeof-only 无 Array.isArray 守卫 + 无 depth cap；validate.ts:18-27 checkNumberField 无 Number.isFinite；:390-432 scanLegacyAtSyntax 不递归 children；:204/:81-85/:373/:310-321/:283-331 子形状 surface-only；:264-280/277 validateSymbolNode 递归无 depth）均经 live 核对，零漂移；roadmap 5 项（multi P2-9 + open P2-2/3/5/6）均无 ✅ marker、无与已收口项重叠。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（Minimum Rule 18）。

- [x] P2-2：`deepEqual` array/object 不混同（`deepEqual([1,2],{0:1,1:2})===false`），合法判等不回归。
- [x] P2-3：NaN/±Infinity 数值字段被 validator 拒绝。
- [x] P2-5：嵌套 group children 的 legacy `@{pointId}` 方言 warn。
- [x] P2-6：`shadow`/`from,to`/`background`/`scale.k,b`/`init` malformed 子形状被拒。
- [x] P2-9：`validateSymbolNode` 与 `deepEqual` 深度上限 fail-closed（~10k 层不 crash）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项。
- [x] owner doc 同步：`docs/components/industrial-hmi/design-renderer.md` §4.3 validation contract 反映数值有限性 / 子形状 / 深度 / legacy 递归。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（workspace 32/32 全绿）
- [x] `pnpm build`（workspace 32/32 全绿）
- [x] `pnpm lint`（workspace 32/32 全绿）
- [x] `pnpm test`（workspace 59/59 全绿；industrial 包 718 tests / 55 files，较 696 baseline +22）

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（归 sibling plan `2026-08-06-0900-2` symbol 几何 / `2026-08-06-0900-3` engine-lifecycle 或后续 mission 节奏）。
- `assertShape` helper 当前覆盖 validator 已知子形状缺口；未来若新增声明字段带子结构，按同模式扩展（非 closure 必需）。

## Closure

Status Note: 完成（closure-audit `pass`，2026-08-06）。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session closure auditor（非执行 session；本会话仅审计 + 记录证据，未改任何实现代码）。
- Verdict: `pass`（零 Blocker / 零 Major / 零 Minor）。
- Evidence:
  - **P2-2（array/object 守卫）**：`equality.ts:36-45` `Array.isArray(a)!==Array.isArray(b)→false` + 数组 length/index 分支；公开签名 `deepEqual(a,b,depth=0)` 二参兼容。proof `serialization-equality.test.ts:8-21` 断言 `deepEqual([1,2],{0:1,1:2})===false` + 合法数组/对象判等不回归。
  - **P2-3（有限性）**：`validate.ts:27` `typeof!=='number' || !Number.isFinite`，文案 "must be a finite number"；`deadband` 经 `:396` `checkNumberField` 享 finite 守卫。proof 断言 Infinity/NaN/-Infinity 全 `ok:false` + 合法有限负数/小数不回归（line 482-490）。
  - **P2-9（三处深度 cap，critical）**：`equality.ts:34`（MAX_DEEP_EQUAL_DEPTH=100）+ `validate.ts:221-224`（validateSymbolNode MAX_VALIDATE_DEPTH=100）+ `validate.ts:471`（scanSymbolLegacy MAX_VALIDATE_DEPTH=100）**三处全 capped**——执行期一度遗漏的 `scanSymbolLegacy` 已补齐（Phase 2 deep-children 测试驱出）。proof 断言 ~10k 层 children 嵌套 `ok:false` 含 "maximum nesting depth" 非 crash + ~10k 层 deepEqual 不抛 stack overflow 返 `false`。
  - **P2-5（legacy 递归）**：`scanLegacyAtSyntax:499-523` → `scanSymbolLegacy:469-497` 递归 children，scope 拼接 `.children[${index}]`；顶层 scope `symbols[${sIndex}]`。proof 断言嵌套子图元 legacy warn 含 `children[0]` + 顶层 warn 不回归。
  - **P2-6（assertShape）**：helper `validate.ts:47-78`，接入 shadow(`:265`)/animation from-to(`:130`)/background(`:450`)/scale.k,b(`:387`)/init 经 `isPrimitive`(`:391-393`)。proof 各 malformed 子字段 → `ok:false` + scoped error（line 538-590）。
  - **全绿复跑**（live 复跑，非信任摘要）：`pnpm typecheck` 32/32 ✓、`pnpm build` 32/32 ✓、`pnpm lint` 32/32 ✓、`pnpm test` 59/59 ✓；`pnpm --filter @nop-chaos/flux-renderers-industrial test` 718 tests / 55 files 全绿（较 696 baseline +22，含 diff/compound 消费 deepEqual 不回归）。
  - **owner doc**：`design-renderer.md §4.3:169` 反映有限性 / 三处深度 cap / assertShape 子形状 / legacy 递归 / array-object deepEqual。
  - **roadmap**：`roadmap-industrial-hmi.md` 5 项（multi P2-9 + open P2-2/P2-3/P2-5/P2-6）均标 ✅。
  - **build artifacts**：`packages/*/src/` 无 `.js`/`.d.ts`/`.js.map` 散落（仅 `dist/`）。

Follow-up:

- 其余 2026-08-05-2129 P2 归 sibling plan `2026-08-06-0900-2`（symbol 几何）/`2026-08-06-0900-3`（engine-lifecycle）或后续 mission 节奏。
- `assertShape` helper 当前覆盖 validator 已知子形状缺口；未来新增声明子结构字段按同模式扩展。

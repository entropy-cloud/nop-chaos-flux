# Surface Args With Embedded Schema Body Get Eagerly Evaluated（CX-11 急切求值）

## Problem Context

`openDialog`/`openDrawer` 等 surface action 的 `body` 等参数为**内嵌 schema 值**，但 flux-compiler `action-compiler.ts` 的 `compilePayload` 用通用 `compileValue` 编译整个 args 树——`compileNode` 下钻任意 plain object，把 body 内嵌事件 args 中的 `${item.label}` 编译成模板；派发时 flux-action-core `evaluateSurfaceArgs` 先急切求值全 args（`built-in-actions.ts:50`）再以 isSchema 覆盖为 raw（:54-58）。成员访问模板在 dispatch scope（无 item）抛 TypeError → **openDialog 静默失败、弹层打不开**；裸键模板（`${index}`）不抛错，潜伏。

## Initial Judgment

"surface args 里的 schema body 是编译期静态数据"——视为与普通 args 相同的求值对象；或"body 反正会被 isSchema 保留，无需特殊处理"。

## Why It Looked Plausible

- 普通 args 模板（`${name}`）在 dispatch scope 解析正常，表面参数行为一致；
- isSchema 保留机制（dispatcher 侧 `isSchema` 覆盖为 raw）看起来已经兜底；
- 裸键模板不抛错，弹层打开正常，问题不可见。

## Why It Was Wrong

compilePayload 是**编译期**语义（把 args 树里的模板字符串编译成 compiled node），evaluateSurfaceArgs 是**派发期**语义（对编译产物求值）——两层都对"内嵌 schema body"做了处理但互不知晓：编译期把 body 内嵌 args 模板化了，派发期先急切求值模板（在无 item 的 scope 抛 TypeError）再尝试 isSchema raw 覆盖，异常已发生。

## Decisive Evidence

- `docs/bugs/89`：C8.3 公共层修复——`compilePayload` 对 isSchemaInput 顶层 arg 经 `__nopPreserveLiteral` envelope 编译为 static-node，与 dispatcher 侧 isSchema 保留契约对齐；
- test-first：`action-compiler.test.ts` 先红后绿 + `c8-3-host-surfaces.spec.ts` host-prompts-dlg 实证 `${item.label}` 与 `${index}` 裸键解析；
- roadmap CX-11 行（事后回写插入）。

## Correct Decision Rule

**isSchema 形态的 surface args（内嵌 schema body）必须经 `__nopPreserveLiteral` envelope 编译为 static-node**，使编译期模板化与派发期 isSchema 保留契约对齐。禁止把 schema body 当作普通 args 编译/求值。

## Preventive Checklist

- 新增 surface action（openDialog/openDrawer/confirm 等）的 schema body 参数：核验 compilePayload isSchemaInput 路径是否包 preserve envelope；
- 模板键两种形态都要测：成员访问（`${item.label}`——会抛 TypeError 静默失败）与裸键（`${index}`——不抛错潜伏）；
- 宿主 e2e 必须含"弹层内事件 args 模板解析"场景（真机打开 + args 解析），弹层"打不开"本身就是症状；
- 修改 action-compiler/求值顺序相关代码时，回归 `built-in-surface-args-preservation.test.ts` 选项 ① 与 action-compiler.test.ts。

## Related Files / Docs

- `docs/bugs/89-*.md`
- `packages/flux-compiler/src/action-compiler.ts`、`packages/flux-action-core/src/built-in-actions.ts`
- roadmap CX-11 行；`docs/audits/per-component/pc-index.md` CX-n 索引

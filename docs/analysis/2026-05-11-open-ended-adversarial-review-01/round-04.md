# 开放式对抗性审查 — 2026-05-11 — 第四轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前 3 轮已覆盖 built-in form targeting 和 form value read-surface 问题；本轮避开这些 form write/read contract，转查 surface family 在 declarative path 与 action-opened path 是否真的共用同一生命周期合同。
> 本轮切入点：`openDialog` / `openDrawer` 打开的 surface 是否兑现了 dialog/drawer DSL 中声明的 `onOpen` / `onClose` 事件。

---

## 发现 1：action-opened `openDialog` / `openDrawer` surface 会静默丢弃 `onOpen` / `onClose`

**在哪里**

- dialog / drawer 文档都把 `onOpen`、`onClose` 定义为正式 event 字段，并明确 declarative 与 action-opened 路径应收敛到同一 surface family lifecycle：`docs/components/dialog/design.md:12,32-40,62-72`、`docs/components/drawer/design.md:12,32-40,54-65`
- built-in action lowering 会保留 raw surface DSL payload，不会主动删除 schema fragments：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:18-39,98-129`
- 但 action adapter 在 `openDialog` / `openDrawer` 时只把 `actionScope`、`componentRegistry`、`validationPlan`、`ownerNodeInstance` 写进 `SurfaceEntry.options`，没有把 `onOpen` / `onClose` 接进去：`packages/flux-runtime/src/action-adapter.ts:210-233,259-286`
- `SurfaceRuntime.open()` 只认 `options.onOpen` / `options.onClose`，不会从 `surface` 自己读取 handler 字段：`packages/flux-runtime/src/surface-runtime.ts:120-150`
- close/dispose 路径也没有执行 `entry.onClose`：`packages/flux-runtime/src/surface-runtime.ts:102-116,180-188`
- React host 对 action-opened surface 关闭时，在没有 declarative `__handleOpenChange` 的情况下直接 `surfaceRuntime.close(surface.id)`，同样不会触发 close handler：`packages/flux-react/src/dialog-host.tsx:87-97,176-186`

**是什么**

当前 `openDialog({ ...surfaceDsl })` / `openDrawer({ ...surfaceDsl })` 表面上接受完整 surface DSL，但实际只拿它来提供 `title/body/actions/data/statusPath/...` 这些静态 surface payload；`onOpen` / `onClose` 这两个事件字段在 action-opened 路径上根本没有执行通道。

也就是说，作者写：

```json
{
  "action": "openDialog",
  "args": {
    "title": "Confirm",
    "body": { "type": "text", "text": "Hello" },
    "onOpen": { "action": "showToast", "args": { "message": "opened" } },
    "onClose": { "action": "showToast", "args": { "message": "closed" } }
  }
}
```

surface 会打开，但这两个 lifecycle event 不会被执行。更糟的是，close path 也没有任何兜底去调用 `entry.onClose`，所以不是“只漏了 open”，而是 open/close 两端都断了。

**为什么值得关心**

这条问题直接破坏了 dialog/drawer “declarative path 与 action-opened path 共用同一 surface family lifecycle” 的文档基线。当前 action-opened surface 看起来和 declarative surface 共享 `SurfaceRuntime`、host stack、scope、status publication，但在 lifecycle 上实际上还是两套系统：

1. surface payload 部分共享了。
2. lifecycle event 部分没有共享。
3. 文档却明确说两者应收敛成同一个 runtime family，而不是保留两套生命周期。

这会让作者得到一种非常误导的接口体验：同一个 dialog/drawer DSL 字段集，在 declarative 路径和 `openDialog` / `openDrawer` 路径上并不等价。`onOpen` / `onClose` 恰好又是最容易被用来做 telemetry、lazy load、cleanup、focus side effect、surface-level analytics 的字段，属于“不会报错、但业务 silently missing”的高隐蔽缺陷。

**信心水平**：确定

---

## 本轮小结

本轮发现的是 surface family 一个比“看起来共享 runtime”更深的裂口：action-opened dialog/drawer 只共享了容器与状态承载，没有共享 lifecycle 事件合同。它和前几轮的 targeting 问题属于同一类根因模式：中间层接线只保留了表层 payload，丢失了更高层语义。

## 本轮盲区自评

- 本轮主要验证了 open/close lifecycle handlers，没有继续追 action-opened surface 上其它 DSL 字段是否也存在 declarative/action-opened 不等价。
- 尚未补 focused test 去证明 `onOpen` / `onClose` 在 declarative 路径与 action-opened 路径上的实际分叉行为。
- 下一轮若继续，适合检查 monitor / debugger 观察面是否也存在“字段定义了但只有结束态才有”的链路断裂，或者继续横切 surface family 其它事件字段。

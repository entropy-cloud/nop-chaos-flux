# UI/UX 设计合规性审查 - Round 03

## 视角5：Loading 和空状态

### [视角5-05] detail-view / detail-field 的异步打开阶段没有任何可见 pending 反馈

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:314-342,505-517`; `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:173-205,318-331`
- **证据片段**:

  ```tsx
  async function handleOpen() {
    if (effectiveDisabled) return;

    const adaptedValue = await runTransformIn(...);
    ...
    openDraft(newDraftForm);
  }

  <Button ... onClick={() => {
    handleOpen().catch((error) => {
      reportOpenFailure(error);
    });
  }}>
    {triggerLabel}
  </Button>
  ```

- **严重程度**: MEDIUM
- **现状**: `detail-view` 和 `detail-field` 的“编辑”触发按钮都会先异步执行 `runTransformIn(...)`，等异步完成后才 `openDraft(...)` 打开 dialog/drawer；但按钮点击期间没有 spinner、没有 disabled/busy 态，也没有先打开带 loading 的表面层。
- **行业惯例**: shadcn/ui 生态下的异步按钮通常会在等待期间切到 disabled + `Spinner` 态；Ant Design 也用 `Button loading` 处理 modal/drawer 启动前的异步准备。对于“点击后先异步准备再打开”的交互，行业常见做法是让 trigger 明确进入 pending，或先开 surface 再显示 loading body。
- **用户影响**: 用户点击“编辑”后界面短时间完全无反馈，会误以为点击没生效并重复点击；如果 `transformInAction` 涉及网络或较重计算，这种“静默空档”会直接降低入口的可理解性。
- **建议**: 为 `detail-view` / `detail-field` 增加统一的 `openPending` 状态：点击 trigger 后立即 `setOpenPending(true)`，在 trigger 按钮上渲染 `Spinner + loading 文案` 并 `disabled`；或先打开 `DetailSurface`，在 `DialogBody` / `DrawerBody` 内显示标准 loading UI，待 `runTransformIn` 完成后再替换为真实内容。
- **复核状态**: 未复核

## 按严重程度排序的问题清单

1. [视角5-05] `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`; `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` - 异步打开阶段没有任何可见 pending 反馈

## 按组件分组的问题清单

- `detail-view`
  - [视角5-05] 异步打开阶段没有任何可见 pending 反馈
- `detail-field`
  - [视角5-05] 异步打开阶段没有任何可见 pending 反馈

## 总体评估

Round 03 发现的问题仍然属于高频交互路径，而且与已记录的“确认中仅文本反馈”不是同一根因。这里的问题发生在表面层尚未打开之前，用户甚至不知道流程已经开始，因此值得单列保留。

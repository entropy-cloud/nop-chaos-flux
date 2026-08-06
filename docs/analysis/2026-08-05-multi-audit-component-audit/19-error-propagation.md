# 维度 19: 错误传播保真度（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c80c4c3ffeRuv0PzQ6d0wp6F`）

## 第 1 轮（初审）

### [维度19-1] TreeDocumentSession 成功路径不推进队列：success 后无 ack 看门狗，写回永久卡死

- **文件**: `packages/flow-designer-renderers/src/tree-session.ts:257-263`（handleActionCompletion success 分支）；designer-tree-mode.tsx:104；tree-session.test.ts:109-130
- **严重程度**: P1（非抛出型失败无识别路径；后续编辑写回静默永久丢失）
- **证据片段**:
  ```ts
  if (resultClass === 'success') {
    this.state.inFlight = null;
    this.notify();
    return; // 不移除队首、不调用 dispatchNext —— 等 host ack
  }
  // dispatchNext 只由 mount / 失败分支（286）/ ack-accepted（397）调用
  ```
- **现状**: 协议文档（tree-mode.md:377）明确"success 保留队首等 ack"是刻意设计；但"dispatch 成功而 host 永不 ack"无超时/重试/放弃上报路径：队列头卡死 → 后续所有本地编辑永不被 dispatch；单测仅覆盖 neutral/cancelled/failed 移出队首与 ack 匹配，无 success-无-ack-后续入队用例。
- **风险**: 接入 host 若把 changeAction 当 fire-and-forget（或 action 成功但 host 未落库未回 ack），用户后续编辑写回静默永久丢失；pendingQueue 内部状态无 UI 指示。
- **建议**: 为 inFlight 增加 ack 超时（N 秒后 reportHostIssue + 移出队首继续派发下一项），或 success 分支直接移出队首；补 success-无-ack-后续入队回归测试。
- **误报排除**: 非"已 fail-safe 的内部处理"——该协议对违反方没有失败路径，属维度 19"非抛出型失败计数遗漏"（交付成功≠确认成功），测试缺口真实。

### [维度19-2] calendar exportToPNG 在 void 调用下 rethrow → unhandled rejection，且 handle 谎报 ok:true

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:204-206`；calendar/hooks/use-calendar-export.ts:66-74
- **严重程度**: P1（跨 component-handle 边界错误传播丢失 + unhandled rejection）
- **证据片段**:
  ```ts
  // use-calendar-export.ts
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return;
    const msg = err instanceof Error ? err.message : String(err) || 'PNG export failed';
    setExportError(msg);
    throw err;                       // 已设置用户可见错误，仍 rethrow
  }
  // calendar.tsx
  case 'exportToPNG':
    void exportRef.current.exportToPNG();   // rethrow 的 rejection 无人消费
    return { ok: true };                    // 失败时仍返回成功
  ```
- **现状**: C9 修复后 exportToPNG 内部有 abort/超时/错误状态，但 catch 内 setExportError 后仍 throw；唯一调用方 handle 用 void 丢弃且同步返回 ok:true。
- **风险**: 导出失败产生全局 unhandled promise rejection；经 component:exportToPNG 的 schema 作者收到 ok:true 无法感知失败。
- **建议**: 二选一：handle 内 .catch(() => {})（错误已由 setExportError 呈现），或 handle 改 async 返回 { ok:false, error }；避免"既 rethrow 又被 void"。
- **误报排除**: rethrow 是有意的（供 await 调用方），但唯一调用方 void 化后 rethrow 变成逃逸 rejection；C9 新代码的真实错误传播缺口。

### [维度19-3] designer JSON 导出面板 JSON.parse 失败静默返回 null（空面板无解释）

- **文件**: `packages/flow-designer-renderers/src/designer-page-body.tsx:193-200`
- **严重程度**: P2
- **证据片段**:
  ```ts
  const jsonDocument = useMemo(() => {
    if (!jsonOpen) return null;
    try {
      return JSON.parse(core.exportDocument());
    } catch {
      return null;
    }
  }, [core, jsonOpen]);
  // {jsonDocument && <DataViewer .../>} → 空面板
  ```
- **现状**: exportDocument/parse 失败 catch 返回 null，dialog 打开但内容为空。
- **风险**: 用户无法区分"文档为空"与"导出失败"；无 monitor 上报。
- **建议**: catch 中至少 reportHostIssue（env.monitor）一次并展示错误文案。
- **误报排除**: 显示型诊断面板非主路径，故 P2；但应保留结构化失败而非裸 catch→null。

## 维度 19 零发现结论（R1）

- Bare catch 复核：use-conversation 5 处 catch 全部经 reportStorageError；tool-execution 保留原始 Error 至 metadata.toolError；barcode camera catch 设用户可见错误态；diff/highlight catch 是显示型 fail-safe 降级。无违规。
- Try/finally：use-designer-auto-layout busy 复位在 finally；exportBoardToPng 守卫在 finally。
- 错误替换：tree-session dispatchNext catch（new Error(..., {cause})）、reaction toReactionFailureError({cause})、auto-layout normalize 均保留 cause。
- 诊断禁用：enabled:false 命中全部在测试或 owner 门控 debugger 配置，无关键路径硬编码禁用。
- 非抛出型失败计数：operation-control retry 把 {ok:false} 计入 attempts/failureCount（契约测试锁定）。

## 维度复核结论

已路由（2026-08-06，0529-1 Phase 3 登记区 + `docs/backlog/component-audit-roadmap.md`「扫描发现路由登记」）：19-1/19-2 R2 复核确认属实 → 已追加 CR plan Phase 3 checklist（0529-1 Phase 4 吸收机制）；19-3（P2 候选）维持待复核（roadmap Follow-up Backlog）。

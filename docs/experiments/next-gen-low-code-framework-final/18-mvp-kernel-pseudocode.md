# 18 MVP Kernel Pseudocode

## 1. 目标

本文给出 MVP 内核的伪代码级执行文档。

重点不是语言细节，而是把实验全集反复强调的硬约束变成明确步骤：

1. transaction queue
2. async authoritative gate
3. owner-local orchestration
4. resource/reaction/validation 的统一接入
5. admission / recovery 不能绕过内核

## 2. Session 启动

```text
createRuntimeSession(package)
  validateExecutionFormat(package)
  buildOwnerRegistry()
  buildScopeRegistry()
  buildDependencyIndexes()
  buildAsyncLaneRegistry()
  buildDebugEventSink()
  createRootOwnerFrom(entryTemplate)
  publishInitialSnapshot()
```

规则：

1. session 启动只吃 `ExecutionPackage`。
2. 不在 session 启动阶段重新 compile raw schema。

## 3. Admission 伪代码

```text
admitPackageOrFragment(request)
  validateFormatVersion(request.packageOrFragment)
  validateTrustPolicy(request.packageOrFragment, request.trustLevel)
  validateHostContracts(request.packageOrFragment)
  validateCapabilityPermissions(request.packageOrFragment)
  reserveNamespace(request.packageOrFragment)
  try
    attachPackageEntries(request.packageOrFragment)
    attachOwnersIfNeeded(request.packageOrFragment)
    emitAdmissionDebugEvent(ok)
    return success
  catch error
    rollbackNamespaceReservation()
    disposeAttachedEntriesFromThisAdmission()
    emitAdmissionDebugEvent(failed)
    return failure
```

硬规则：

1. admission attach 是原子操作。
2. attach 失败后不能留下 owner/resource/reaction/subscriber 残留。

## 4. Transaction Queue

```text
enqueueTxInput(input)
  push input into session.txInputQueue
  if not session.txDrainScheduled
    session.txDrainScheduled = true
    queueMicrotask(drainTxQueue)

drainTxQueue()
  session.txDrainScheduled = false
  while queue not empty
    inputs = takeCurrentBatch()
    tx = buildTransaction(inputs)
    runTransaction(tx)
```

```ts
interface EnqueuedTxInput {
  kind: 'write' | 'async-settle' | 'host-snapshot' | 'reconcile' | 'capability-dispatch';
  payload: unknown;
}
```

## 5. Build Transaction

```text
buildTransaction(inputs)
  tx.seq = nextTxSeq()
  tx.txId = createTxId(tx.seq)
  tx.inputs = inputs
  tx.commitDomain = 'session'
  tx.writes = collectWrites(inputs)
  tx.writes = collapseWritesByPriority(tx.writes)
  return tx
```

## 6. Run Transaction

```text
runTransaction(tx)
  phaseCollect(tx)
  phaseApply(tx)
  phaseInvalidate(tx)
  phaseRecompute(tx)
  phasePublish(tx)
  phaseSettle(tx)
```

## 7. Collect Phase

```text
phaseCollect(tx)
  normalizeInputs(tx.inputs)
  extractScopeWrites()
  extractAsyncSettles()
  extractHostSnapshotReplacements()
  extractCapabilityDispatches()
  extractReconcileOps()
  attachWriteProvenance(tx.txId)
```

规则：

1. admission 是 session-level atomic attach protocol，不作为普通 `EnqueuedTxInput` 进入 phase runner。
2. 此阶段只做输入归一，不做可见写入。
3. `reaction` 新动作、resource settle、validation settle、host command settle 都只是生成下一步候选 write。

## 8. Apply Phase

```text
phaseApply(tx)
  for each write in tx.writes
    if target owner already disposed
      recordFailure('stale-dropped')
      continue
    applyStructuralSharingWrite(write)
    recordScopeChange(write)
```

规则：

1. 所有 apply 都必须走 canonical path + structural sharing helper。
2. 这里不触发 reaction。

## 9. Invalidate Phase

```text
phaseInvalidate(tx)
  changed = collectChangedRootsPathsShapes(tx)
  invalidateValueSubscribers(changed)
  invalidateResourceSubscribers(changed)
  invalidateReactionSubscribers(changed)
  invalidateValidationMaterialization(changed)
  invalidateNodeResolutionCaches(changed)
```

collection-shape 命中规则：

1. reorder 命中 collection shape
2. remove/insert 命中 collection shape 和 affected root
3. leaf update 默认不命中无关 shape subscriber

## 10. Recompute Phase

```text
phaseRecompute(tx)
  recomputeAffectedValues()
  recomputeOwnerSummaries()
  recomputeResourceSummaries()
  recomputeValidationSummaries()
  recomputeSurfaceSummary()
```

规则：

1. `validation` 可以有 owner-local summary，但最终进入 session-level publish。
2. 此阶段不允许直接发 action。

## 11. Publish Phase

```text
phasePublish(tx)
  snapshot = buildPublishedSnapshot(
    tx.txId,
    nextPublishSeq(),
    scopeSummaries,
    ownerSummaries,
    resourceSummaries,
    surfaceSummary
  )
  session.currentSnapshot = snapshot
  notifyPublishedSnapshotSubscribers(snapshot)
```

规则：

1. host/React 只能在这里看到新状态。
2. publish 后 snapshot 才成为 authoritative visible state。

## 12. Settle Phase

```text
phaseSettle(tx)
  settleAsyncRuns(tx)
  scheduleReactionsFromChangedDependencies(tx)
  emitDebugEvents(tx)
```

硬规则：

1. reaction 不能在当前 tx `apply/recompute` 中重入。
2. reaction 触发的新 capability request 只能 `enqueueTxInput()`，进入下一 tx。

## 13. Resource Refresh 伪代码

```text
refreshResource(resourceId)
  policy = resolveLanePolicy(resourceId)
  run = beginAsyncRun(ownerId, lane='resource:'+resourceId, policy)
  executeRefreshCapability(run)
    .then(result => settleResourceRun(run, result))
    .catch(error => settleResourceRun(run, error))

settleResourceRun(run, settled)
  if !isAuthoritativeRun(run)
    recordFailure('stale-dropped')
    return
  writes = lowerResourcePublishToScopeWrites(settled)
  enqueueTxInput({ kind: 'async-settle', payload: { run, writes } })
```

## 14. Reaction 伪代码

```text
scheduleReactionsFromChangedDependencies(tx)
  hits = findReactionSubscribers(tx.changedDependencies)
  for each reaction in hits
    enqueueReactionEvaluation(reaction)

enqueueReactionEvaluation(reaction)
  queueMicrotask(() => evaluateReaction(reaction))

evaluateReaction(reaction)
  nextValue = evalWatch(reaction.watch)
  if !didChange(nextValue, reaction.prevValue)
    return
  if !evalWhen(reaction.when)
    return
  enqueueTxInput({ kind: 'capability-dispatch', payload: capabilityRequestsFromReaction })
```

## 15. Validation 伪代码

```text
validatePath(ownerId, path, reason)
  closure = expandValidationClosure(ownerId, path)
  materializeRules(ownerId, closure)
  syncResult = runSyncValidationRules(ownerId, closure)
  publishValidationSyncSummary(syncResult)
  launchAsyncValidationRulesIfNeeded(ownerId, closure, reason)
```

async validation settle：

```text
settleValidationRun(run, result)
  if !isAuthoritativeRun(run)
    recordFailure('stale-dropped')
    return
  enqueueTxInput({ kind: 'async-settle', payload: validationStatePatch })
```

## 16. Detail / Draft Confirm 伪代码

row draft commit target 的进一步细化，见 `19-composite-field-lowering-and-identity.md`。

```text
confirmDraftOwner(childOwnerId, parentOwnerId)
  result = validateAll(childOwnerId, reason='commit')
  if result.invalid
    return invalid
  transformed = runTransformOut(childOwnerId)
  if transformed.failed
    recordFailure(transformed.failureKind)
    return failed
  writes = lowerDraftCommitToParentWrites(transformed.value)
  enqueueTxInput({ kind: 'write', payload: writes })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'parent-revalidate', parentOwnerId, sourceChildOwnerId: childOwnerId } })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'dispose-child-after-commit', childOwnerId } })
```

## 17. Variant Switch 伪代码

`project` 策略必须导致 subtree revalidation；bridge 细化见 `19-composite-field-lowering-and-identity.md`。

```text
switchVariant(fieldPath, nextBranch)
  discriminatorPath = getVariantDiscriminatorPath(fieldPath)
  policy = getInactiveBranchPolicy(fieldPath)
  enqueueTxInput({ kind: 'write', payload: [{ path: discriminatorPath, op: 'set', value: nextBranch }] })
  if policy == 'drop'
    enqueueTxInput({ kind: 'reconcile', payload: { type: 'variant-drop-inactive', fieldPath } })
  if policy == 'preserve'
    enqueueTxInput({ kind: 'reconcile', payload: { type: 'variant-preserve-inactive', fieldPath } })
  if policy == 'project'
    projected = runVariantProjection(fieldPath, nextBranch)
    enqueueTxInput({ kind: 'write', payload: projected.writes })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'variant-switch', fieldPath, discriminatorPath } })
```

## 18. Array Reorder / Remove 伪代码

`itemKey` / `rowKey` / index mode 的 identity lowering 细化，见 `19-composite-field-lowering-and-identity.md`。

```text
reorderArrayItems(path, from, to)
  identityContext = getArrayIdentityContext(path)
  enqueueTxInput({ kind: 'write', payload: [{ path, op: 'array-move', value: { from, to } }] })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'array-reorder', path, identityContext } })

removeArrayItem(path, index)
  identityContext = getArrayIdentityContext(path)
  enqueueTxInput({ kind: 'write', payload: [{ path, op: 'array-remove', value: { index } }] })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'array-remove', path, index, identityContext } })
```

## 19. Host Snapshot Replacement 伪代码

```text
receiveHostSnapshot(hostType, snapshot)
  normalized = normalizeSchemaValue(snapshot.data)
  enqueueTxInput({
    kind: 'host-snapshot',
    payload: { hostType, version: snapshot.version, data: normalized }
  })
```

规则：

1. host snapshot replacement 不直接改 scope。
2. host projection 仍只读。

## 20. Host Command 伪代码

```text
dispatchHostCommand(envelope)
  validateEnvelope(envelope)
  validateExpectedProjectionVersion(envelope)
  run = beginAsyncRun(ownerId, lane='host:'+envelope.commandName)
  bridge.dispatch(envelope)
    .then(result => settleHostCommand(run, result))
    .catch(error => settleHostCommand(run, error))
```

## 21. Owner Dispose 伪代码

```text
disposeOwner(ownerId)
  cancelAsyncLanes(ownerId)
  unregisterDependencySubscribers(ownerId)
  unregisterComponentHandles(ownerId)
  clearOwnerCaches(ownerId)
  removeOwnerFromRegistry(ownerId)
```

## 22. Recovery 伪代码

```text
recoverSession(package, snapshot, checkpoint, journal)
  mode = selectRecoveryMode(package, snapshot, checkpoint, journal)
  if mode == 'strict-reject'
    return rejectRecovery
  admitPackage(package)
  importSnapshot(snapshot)
  if mode == 'snapshot-only'
    restoreJournalPointerAsSnapshotBoundary()
  if mode == 'snapshot+journal-replay'
    ensureReplayContinuity(checkpoint, journal)
    replayFrom(checkpoint.publishSeq + 1)
  if mode == 'degraded-host-rebind'
    restoreKernelSummariesOnly()
    markHostProjectionsPendingRebind()
  else
    rebindHostProjections()
  rearmAsyncLanesAsIdle()
  publishRecoveredSnapshot()
```

规则：

1. recovery 也必须经过 session/admission 入口。
2. 不允许直接“把旧 store 塞回来”。

## 23. Conformance Observability 伪代码

```text
emitDebugEvents(tx)
  sink.onTransaction({ txId, publishSeq, writesCollapsed, changedDependencies })
  sink.onFailure(allFailuresFromTx)
  sink.onAdmission(latestAdmissionEventsIfAny)
```

这是为了响应实验全集反复强调的 conformance-first：

1. stale-dropped 必须可解释
2. permission-denied / contract-mismatch 必须可解释
3. replay/recovery 必须可解释

## 24. MVP 明确不做

1. raw schema runtime compile
2. graph-kernel public runtime model
3. host private object 注入 scope
4. UI 层绕过 facade 直写 kernel
5. 第二条写通道绕过 transaction pipeline

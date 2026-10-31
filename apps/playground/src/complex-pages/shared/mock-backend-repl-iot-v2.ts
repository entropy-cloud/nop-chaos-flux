/**
 * Business-replication IoT V2 (OTA rollout) delegate (plan 817; D4 §4.3 V2
 * rows). Called from the `/r/ReplIot__` branch in mock-backend-repl-iot.ts —
 * the counter and opt-in hook objects belong to that branch; this module owns
 * the OTA session (firmware list, rollout matrix, batch gate) and stays
 * import-clean of the main module (crm-c2 delegate precedent).
 *
 * Endpoints (D4 §4.3 names verbatim; shapes per D4 §2.6「V2 实现勘误」):
 * - get `firmwarePage` — 4 packages {packageId,title,versionNo,checksum,
 *   fileUrl,deprecated}.
 * - post `assignBatched` — {packageId, deviceIds[], batchSize} → chunks the
 *   devices into batches, replaces the session rollout (batch 1 INITIATED,
 *   later batches QUEUED); empty deviceIds → REPL_IOT_BATCH_EMPTY.
 * - get `assignmentMatrix?deviceId=` — {rolloutId, currentBatch, rolledBack,
 *   items:[{deviceId,batchNo,status,statusTime,lastError,history}],
 *   selected:{deviceId,status,stepItems,timeline}} — stepItems project the
 *   eight-state axis (finish/process/wait; FAILED → status 'error').
 * - post `activateNextBatch` — gate over the current batch: completionRate =
 *   UPDATED share, failRate = FAILED share; passes when every device is
 *   UPDATED → next batch INITIATED; otherwise status:1
 *   REPL_IOT_GATE_NOT_PASSED with envelope data {gate} (error.responseData).
 * - post `rollbackPackage` — {rolloutId, reason}; blank reason →
 *   REPL_IOT_ROLLBACK_REASON_REQUIRED; success → every device ROLLED_BACK.
 * - hook `setAssignmentStatus(deviceId, status)` — pushes a device to a state
 *   (appends history; FAILED records lastError).
 */

export const OTA_STATES = [
  'QUEUED',
  'INITIATED',
  'DOWNLOADING',
  'DOWNLOADED',
  'VERIFIED',
  'UPDATING',
  'UPDATED',
  'FAILED',
] as const;

export const OTA_STATE_LABEL: Record<string, string> = {
  QUEUED: '排队',
  INITIATED: '已下发',
  DOWNLOADING: '下载中',
  DOWNLOADED: '已下载',
  VERIFIED: '已校验',
  UPDATING: '升级中',
  UPDATED: '已完成',
  FAILED: '失败',
  ROLLED_BACK: '已回滚',
};

export interface OtaAssignment {
  deviceId: string;
  batchNo: number;
  status: string;
  statusTime: string;
  lastError: string;
  history: Array<{ status: string; statusTime: string }>;
}

interface OtaSession {
  rolloutId: string;
  rolloutSeq: number;
  currentBatch: number;
  rolledBack: boolean;
  clock: number;
  items: OtaAssignment[];
}

export function buildFirmwarePackages() {
  return [
    { packageId: 'PKG-2026-08', title: '网关固件', versionNo: 'v1.2.0', checksum: 'sha256:9f2c…a1', fileUrl: '/repl-assets/fw-1.2.0.bin', deprecated: true },
    { packageId: 'PKG-2026-09', title: '网关固件', versionNo: 'v1.3.0', checksum: 'sha256:47bd…e9', fileUrl: '/repl-assets/fw-1.3.0.bin', deprecated: false },
    { packageId: 'PKG-2026-10', title: '网关固件', versionNo: 'v1.4.0', checksum: 'sha256:c03a…7f', fileUrl: '/repl-assets/fw-1.4.0.bin', deprecated: false },
    { packageId: 'PKG-2026-10B', title: '网关固件（灰度候选）', versionNo: 'v1.4.1-rc1', checksum: 'sha256:5e81…02', fileUrl: '/repl-assets/fw-1.4.1-rc1.bin', deprecated: false },
  ];
}

function stamp(session: OtaSession): string {
  session.clock += 1;
  return `2026-10-31 10:${String(session.clock).padStart(2, '0')}`;
}

function assignment(session: OtaSession, deviceId: string, batchNo: number, path: string[]): OtaAssignment {
  const history = path.map((status) => ({ status, statusTime: stamp(session) }));
  const last = history[history.length - 1];
  return { deviceId, batchNo, status: last.status, statusTime: last.statusTime, lastError: '', history };
}

/** Seed rollout: batch 1 = DEV-1001 UPDATED + DEV-1002 UPDATING (gate not yet
 * passed: completion 50%); batch 2 = DEV-1003/DEV-1004 QUEUED. */
export function createOtaSession(): OtaSession {
  const session: OtaSession = { rolloutId: 'RO-0001', rolloutSeq: 1, currentBatch: 1, rolledBack: false, clock: 0, items: [] };
  session.items = [
    assignment(session, 'DEV-1001', 1, ['QUEUED', 'INITIATED', 'DOWNLOADING', 'DOWNLOADED', 'VERIFIED', 'UPDATING', 'UPDATED']),
    assignment(session, 'DEV-1002', 1, ['QUEUED', 'INITIATED', 'DOWNLOADING', 'DOWNLOADED', 'VERIFIED', 'UPDATING']),
    assignment(session, 'DEV-1003', 2, ['QUEUED']),
    assignment(session, 'DEV-1004', 2, ['QUEUED']),
  ];
  return session;
}

export function projectStepItems(item: OtaAssignment | undefined) {
  const status = item?.status ?? 'QUEUED';
  const lastGood =
    status === 'FAILED'
      ? [...(item?.history ?? [])].reverse().find((entry) => entry.status !== 'FAILED')?.status ?? 'QUEUED'
      : status;
  const goodIndex = OTA_STATES.indexOf(lastGood as (typeof OTA_STATES)[number]);
  return OTA_STATES.map((state, index) => {
    let stepStatus: 'wait' | 'process' | 'finish' | 'error' = 'wait';
    if (state === 'FAILED') {
      stepStatus = status === 'FAILED' ? 'error' : 'wait';
    } else if (status === 'FAILED') {
      stepStatus = index <= goodIndex ? 'finish' : 'wait';
    } else if (index < goodIndex || (index === goodIndex && state === 'UPDATED')) {
      stepStatus = 'finish';
    } else if (index === goodIndex) {
      stepStatus = 'process';
    }
    return { value: state, title: OTA_STATE_LABEL[state], status: stepStatus };
  });
}

function projectTimeline(item: OtaAssignment | undefined) {
  return (item?.history ?? []).map((entry, index) => ({
    value: index,
    time: entry.statusTime,
    title: OTA_STATE_LABEL[entry.status] ?? entry.status,
    level: entry.status === 'FAILED' ? 'error' : entry.status === 'UPDATED' ? 'success' : entry.status === 'ROLLED_BACK' ? 'warning' : 'info',
  }));
}

function batchGate(session: OtaSession) {
  const batch = session.items.filter((item) => item.batchNo === session.currentBatch);
  const size = batch.length || 1;
  const completionRate = Math.round((batch.filter((item) => item.status === 'UPDATED').length / size) * 100) / 100;
  const failRate = Math.round((batch.filter((item) => item.status === 'FAILED').length / size) * 100) / 100;
  return { batchNo: session.currentBatch, completionRate, failRate, passed: completionRate >= 1 && failRate === 0 };
}

export interface ReplIotV2Hooks {
  setAssignmentStatus?: (deviceId: string, status: string) => void;
  lastAssignBatchedBody?: Record<string, unknown>;
  lastActivateBatchBody?: Record<string, unknown>;
  lastRollbackBody?: Record<string, unknown>;
}

export interface ReplIotV2Input {
  url: string;
  method: string;
  read: (key: string) => unknown;
  body: Record<string, unknown> | undefined;
  hooks: ReplIotV2Hooks | undefined;
}

export function createReplIotV2Surface() {
  const session = createOtaSession();

  function setAssignmentStatus(deviceId: string, status: string): void {
    const item = session.items.find((row) => row.deviceId === deviceId);
    if (!item) return;
    const statusTime = stamp(session);
    item.status = status;
    item.statusTime = statusTime;
    item.lastError = status === 'FAILED' ? 'E_VERIFY_SIGNATURE: 固件签名校验失败' : '';
    item.history.push({ status, statusTime });
  }

  return function handleReplIotV2<T>(input: ReplIotV2Input): { status: number; data: T } | null {
    const { url, method, read, body, hooks } = input;
    if (hooks && !hooks.setAssignmentStatus) hooks.setAssignmentStatus = setAssignmentStatus;

    if (url.includes('/r/ReplIot__firmwarePage') && method === 'get') {
      const items = buildFirmwarePackages();
      return { status: 0, data: { items, total: items.length } as unknown as T };
    }

    if (url.includes('/r/ReplIot__assignBatched') && method === 'post') {
      if (hooks) hooks.lastAssignBatchedBody = JSON.parse(JSON.stringify(body ?? {}));
      const deviceIds = Array.isArray(body?.deviceIds) ? (body.deviceIds as unknown[]).map(String) : [];
      if (deviceIds.length === 0) {
        return { status: 1, data: { msg: 'REPL_IOT_BATCH_EMPTY' } as unknown as T };
      }
      const batchSize = Math.max(1, Number(body?.batchSize) || 1);
      const batches: Array<{ batchNo: number; deviceIds: string[] }> = [];
      for (let i = 0; i < deviceIds.length; i += batchSize) {
        batches.push({ batchNo: batches.length + 1, deviceIds: deviceIds.slice(i, i + batchSize) });
      }
      session.rolloutSeq += 1;
      session.rolloutId = `RO-${String(session.rolloutSeq).padStart(4, '0')}`;
      session.currentBatch = 1;
      session.rolledBack = false;
      session.items = batches.flatMap((batch) =>
        batch.deviceIds.map((deviceId) => assignment(session, deviceId, batch.batchNo, batch.batchNo === 1 ? ['QUEUED', 'INITIATED'] : ['QUEUED'])),
      );
      return { status: 0, data: { rolloutId: session.rolloutId, batches } as unknown as T };
    }

    if (url.includes('/r/ReplIot__assignmentMatrix') && method === 'get') {
      const deviceId = typeof read('deviceId') === 'string' ? (read('deviceId') as string) : '';
      const selected = session.items.find((item) => item.deviceId === deviceId) ?? session.items[0];
      return {
        status: 0,
        data: JSON.parse(
          JSON.stringify({
            rolloutId: session.rolloutId,
            currentBatch: session.currentBatch,
            rolledBack: session.rolledBack,
            items: session.items,
            selected: {
              deviceId: selected?.deviceId ?? '',
              status: selected?.status ?? 'QUEUED',
              stepItems: projectStepItems(selected),
              timeline: projectTimeline(selected),
            },
          }),
        ) as T,
      };
    }

    if (url.includes('/r/ReplIot__activateNextBatch') && method === 'post') {
      if (hooks) hooks.lastActivateBatchBody = JSON.parse(JSON.stringify(body ?? {}));
      const gate = batchGate(session);
      if (!gate.passed) {
        return { status: 1, data: { msg: 'REPL_IOT_GATE_NOT_PASSED', gate } as unknown as T };
      }
      const nextBatch = session.currentBatch + 1;
      const next = session.items.filter((item) => item.batchNo === nextBatch);
      if (next.length > 0) {
        session.currentBatch = nextBatch;
        for (const item of next) setAssignmentStatus(item.deviceId, 'INITIATED');
      }
      return { status: 0, data: { batchNo: session.currentBatch, gate } as unknown as T };
    }

    if (url.includes('/r/ReplIot__rollbackPackage') && method === 'post') {
      if (hooks) hooks.lastRollbackBody = JSON.parse(JSON.stringify(body ?? {}));
      const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
      if (!reason) {
        return { status: 1, data: { msg: 'REPL_IOT_ROLLBACK_REASON_REQUIRED' } as unknown as T };
      }
      session.rolledBack = true;
      for (const item of session.items) setAssignmentStatus(item.deviceId, 'ROLLED_BACK');
      return { status: 0, data: { rolloutId: session.rolloutId, status: 'ROLLED_BACK' } as unknown as T };
    }

    return null;
  };
}

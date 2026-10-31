/**
 * Business-replication IoT mock backend (plan 816; D4 §4.3 iot endpoint
 * table, 逐名对齐). Owns the `/r/ReplIot__` prefix + the endpoint counter
 * (`__replIotCalls`), wired through createReplicaBranches in showcase-env
 * exactly like the WMS/CRM/AI/MES/mall/doc domains. V1 subset now; V2 (OTA)
 * and V3 (geofence/video) extend this branch through delegate modules.
 *
 * V1 endpoints (D4 §4.3 names verbatim):
 * - get `telemetryQuery?deviceKey=` — deterministic f(deviceKey, metric, i,
 *   phase): three devices × three metrics, a 24h×5min (288-point) series per
 *   metric + `timeAxis` + `latest` + `spark` (series tail for stat-tile
 *   sparklines) + per-device `quality` (GOOD / UNCERTAIN / BAD). The phase only
 *   moves when the `tickTelemetry()` hook is called — never per request (D1 §2
 *   no runtime drift), so polling re-reads the same frame until a tick.
 * - get `telemetryLatest?deviceKey=` — {latest:{metric:{value,ts}}}.
 * - get `alarmPage?deviceId=` — 12-row session alarm ladder
 *   {alarmId,deviceId,severity,status,triggerValue,thresholdValue,ackAt,
 *   escalationTier}, filtered by device.
 * - post `alarmAck` — CLOSED → REPL_IOT_ALARM_ALREADY_CLOSED; the consume-once
 *   `forceAlarmAckError` hook → REPL_IOT_ALARM_ACK_FAILED; success ACTIVE →
 *   ACKED with ackAt.
 * - post `alarmClose` — already CLOSED → REPL_IOT_ALARM_ALREADY_CLOSED;
 *   success → CLOSED.
 *
 * Opt-in e2e observation: specs pre-create `window.__replIotCalls` +
 * `window.__replIotTestHooks` via addInitScript; production never sets them.
 */

import {
  asNumber,
  createEndpointCounter,
  createUrlParamReader,
  paginateRows,
  readOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';
import { createReplIotV2Surface } from './mock-backend-repl-iot-v2';
import { createReplIotV3Surface, type IotFenceEvent } from './mock-backend-repl-iot-v3';

/* ── Opt-in hooks ───────────────────────────────────────────────────────── */

export interface ReplIotTestHooks {
  /** Branch-published: advance the telemetry phase by one frame. */
  tickTelemetry?: () => void;
  /** Consume-once: the NEXT `alarmAck` fails with REPL_IOT_ALARM_ACK_FAILED. */
  forceAlarmAckError?: boolean;
  /** Mirrors: last `alarmAck` / `alarmClose` request bodies. */
  lastAlarmAckBody?: Record<string, unknown>;
  lastAlarmCloseBody?: Record<string, unknown>;
  /** V2 (OTA): device-status push + request mirrors (delegate surface). */
  setAssignmentStatus?: (deviceId: string, status: string) => void;
  lastAssignBatchedBody?: Record<string, unknown>;
  lastActivateBatchBody?: Record<string, unknown>;
  lastRollbackBody?: Record<string, unknown>;
  /** V3 (geofence): event append + checkFence mirror (delegate surface). */
  appendFenceEvent?: (event?: Partial<IotFenceEvent>) => void;
  lastCheckFenceBody?: Record<string, unknown>;
}

function readReplIotTestHooks(): ReplIotTestHooks | undefined {
  return readOptInHooks<ReplIotTestHooks>('__replIotTestHooks');
}

/* ── V1 telemetry fixtures ──────────────────────────────────────────────── */

export const IOT_DEVICES = ['DEV-1001', 'DEV-1002', 'DEV-1003'] as const;
export const IOT_METRICS = ['temperature', 'humidity', 'voltage'] as const;
export type IotMetric = (typeof IOT_METRICS)[number];

const IOT_BASE: Record<string, Record<IotMetric, number>> = {
  'DEV-1001': { temperature: 24, humidity: 55, voltage: 220 },
  'DEV-1002': { temperature: 28, humidity: 62, voltage: 218 },
  'DEV-1003': { temperature: 33, humidity: 70, voltage: 212 },
};
const IOT_AMPLITUDE: Record<IotMetric, number> = { temperature: 3, humidity: 6, voltage: 4 };
const IOT_QUALITY: Record<string, 'GOOD' | 'UNCERTAIN' | 'BAD'> = {
  'DEV-1001': 'GOOD',
  'DEV-1002': 'UNCERTAIN',
  'DEV-1003': 'BAD',
};
const IOT_POINTS = 288;
const IOT_SPARK_POINTS = 24;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Deterministic sample: the phase shifts the window by 6 points per tick. */
export function telemetryValue(deviceKey: string, metric: IotMetric, index: number, phase: number): number {
  const base = (IOT_BASE[deviceKey] ?? IOT_BASE['DEV-1001'])[metric];
  return round1(base + IOT_AMPLITUDE[metric] * Math.sin((index + phase * 6) / 18));
}

function buildTimeAxis(): string[] {
  return Array.from({ length: IOT_POINTS }, (_, i) => {
    const minutes = i * 5;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  });
}

export function buildTelemetry(deviceKey: string, phase: number) {
  const device = IOT_BASE[deviceKey] ? deviceKey : 'DEV-1001';
  const series = {} as Record<IotMetric, number[]>;
  const latest = {} as Record<IotMetric, number>;
  const spark = {} as Record<IotMetric, number[]>;
  for (const metric of IOT_METRICS) {
    series[metric] = Array.from({ length: IOT_POINTS }, (_, i) => telemetryValue(device, metric, i, phase));
    latest[metric] = series[metric][IOT_POINTS - 1];
    spark[metric] = series[metric].slice(IOT_POINTS - IOT_SPARK_POINTS);
  }
  return { deviceKey: device, phase, timeAxis: buildTimeAxis(), series, latest, spark, quality: IOT_QUALITY[device] };
}

/* ── V1 alarm fixtures ──────────────────────────────────────────────────── */

export interface IotAlarm {
  alarmId: string;
  deviceId: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'ACTIVE' | 'ACKED' | 'CLOSED';
  triggerValue: number;
  thresholdValue: number;
  ackAt: string | null;
  escalationTier: number;
}

export function buildIotAlarms(): IotAlarm[] {
  return Array.from({ length: 12 }, (_, idx) => {
    const n = idx + 1;
    const status: IotAlarm['status'] = n % 4 === 0 ? 'CLOSED' : n % 3 === 0 ? 'ACKED' : 'ACTIVE';
    return {
      alarmId: `ALM-${String(n).padStart(3, '0')}`,
      deviceId: IOT_DEVICES[idx % IOT_DEVICES.length],
      severity: (['CRITICAL', 'MAJOR', 'MINOR'] as const)[idx % 3],
      status,
      triggerValue: 30 + n * 1.5,
      thresholdValue: 30,
      ackAt: status === 'ACKED' ? `2026-10-31 0${n % 9}:15` : null,
      escalationTier: idx % 3,
    };
  });
}

/* ── The /r/ReplIot__ fetcher branch ────────────────────────────────────── */

export function createReplIotFetcherBranch(): ReplicaFetcherBranch {
  let phase = 0;
  const alarms = buildIotAlarms();
  const handleReplIotV2 = createReplIotV2Surface();
  const handleReplIotV3 = createReplIotV3Surface();

  const countEndpointCall = createEndpointCounter({
    countersKey: '__replIotCalls',
    prefix: 'ReplIot__',
    hooksKey: '__replIotTestHooks',
  });

  return function handleReplIotBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplIot__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const hooks = readReplIotTestHooks();
    if (hooks && !hooks.tickTelemetry) {
      hooks.tickTelemetry = () => {
        phase += 1;
      };
    }
    const read = createUrlParamReader(input.url, input.params, input.body);
    const deviceKey = typeof read('deviceKey') === 'string' ? (read('deviceKey') as string) : 'DEV-1001';

    if (input.url.includes('/r/ReplIot__telemetryQuery') && method === 'get') {
      return { status: 0, data: buildTelemetry(deviceKey, phase) as unknown as T };
    }

    if (input.url.includes('/r/ReplIot__telemetryLatest') && method === 'get') {
      const telemetry = buildTelemetry(deviceKey, phase);
      const ts = `2026-10-31 ${telemetry.timeAxis[telemetry.timeAxis.length - 1]}`;
      const latest = Object.fromEntries(IOT_METRICS.map((metric) => [metric, { value: telemetry.latest[metric], ts }]));
      return { status: 0, data: { latest } as unknown as T };
    }

    if (input.url.includes('/r/ReplIot__alarmPage') && method === 'get') {
      const deviceId = typeof read('deviceId') === 'string' ? (read('deviceId') as string) : '';
      const rows = deviceId ? alarms.filter((alarm) => alarm.deviceId === deviceId) : alarms;
      const result = paginateRows(rows, asNumber(read('page')) ?? 1, asNumber(read('perPage')) ?? 10, {
        sizeKey: 'pageSize',
        clampPages: true,
      });
      return { status: 0, data: JSON.parse(JSON.stringify(result)) as unknown as T };
    }

    if (input.url.includes('/r/ReplIot__alarmAck') && method === 'post') {
      if (hooks) hooks.lastAlarmAckBody = JSON.parse(JSON.stringify(input.body ?? {}));
      const alarm = alarms.find((row) => row.alarmId === input.body?.alarmId);
      if (hooks?.forceAlarmAckError) {
        hooks.forceAlarmAckError = undefined;
        return { status: 1, data: { msg: 'REPL_IOT_ALARM_ACK_FAILED' } as unknown as T };
      }
      if (!alarm || alarm.status === 'CLOSED') {
        return { status: 1, data: { msg: 'REPL_IOT_ALARM_ALREADY_CLOSED' } as unknown as T };
      }
      alarm.status = 'ACKED';
      alarm.ackAt = '2026-10-31 12:00';
      return { status: 0, data: { alarmId: alarm.alarmId, status: alarm.status } as unknown as T };
    }

    // ── V2 OTA segment (plan 817; delegate module mock-backend-repl-iot-v2) ──
    const v2Result = handleReplIotV2<T>({ url: input.url, method, read, body: input.body, hooks });
    if (v2Result) return v2Result;
    // ── V3 geofence/video segment (plan 818; delegate mock-backend-repl-iot-v3) ──
    const v3Result = handleReplIotV3<T>({ url: input.url, method, read, body: input.body, hooks });
    if (v3Result) return v3Result;

    if (input.url.includes('/r/ReplIot__alarmClose') && method === 'post') {
      if (hooks) hooks.lastAlarmCloseBody = JSON.parse(JSON.stringify(input.body ?? {}));
      const alarm = alarms.find((row) => row.alarmId === input.body?.alarmId);
      if (!alarm || alarm.status === 'CLOSED') {
        return { status: 1, data: { msg: 'REPL_IOT_ALARM_ALREADY_CLOSED' } as unknown as T };
      }
      alarm.status = 'CLOSED';
      return { status: 0, data: { alarmId: alarm.alarmId, status: alarm.status } as unknown as T };
    }

    return null;
  };
}

export function createReplIotFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplIot__', createReplIotFetcherBranch()]];
}

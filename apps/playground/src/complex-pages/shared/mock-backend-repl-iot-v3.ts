/**
 * Business-replication IoT V3 (geofence + video wall) delegate (plan 818;
 * D4 §4.3 V3 rows). Called from the `/r/ReplIot__` branch in
 * mock-backend-repl-iot.ts — the counter and the opt-in hook object belong to
 * that branch (V2 delegate precedent).
 *
 * Endpoints (D4 §4.3 names verbatim; shapes per D4 §2.7「V3 实现勘误」):
 * - get `devicePins` — 6 devices {deviceId,name,latitude,longitude,fenceId}
 *   plus the map pin projection `pinData` [{name: deviceId, lat, lng, value}].
 * - get `fenceList` — {fences, regionData}; `?view=geojson` returns the
 *   FeatureCollection BODY itself (the map `geojsonSource` action result must
 *   be a FeatureCollection — sanitizeGeojsonActionResult).
 * - get `fenceEvents` — session event list (newest last); the
 *   `appendFenceEvent()` hook appends one deterministic event so the next poll
 *   grows by one row.
 * - post `checkFence` — {deviceId} → {deviceId, fenceId, inside,
 *   distanceMeters} (haversine to the device's fence centre); unknown device
 *   → REPL_IOT_DEVICE_NOT_FOUND.
 * - get `videoChannels` — 4 online channels streaming the local
 *   `/repl-assets/sample-clip-N.mp4` samples.
 */

export interface IotFence {
  fenceId: string;
  fenceName: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

export interface IotDevicePin {
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  fenceId: string;
}

export interface IotFenceEvent {
  eventId: string;
  deviceId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  ts: string;
  distanceMeters: number;
}

export const IOT_FENCES: IotFence[] = [
  { fenceId: 'FENCE-A', fenceName: '张江园区', centerLat: 31.205, centerLng: 121.6, radiusMeters: 800 },
  { fenceId: 'FENCE-B', fenceName: '外高桥仓', centerLat: 31.355, centerLng: 121.59, radiusMeters: 1200 },
  { fenceId: 'FENCE-C', fenceName: '临港基地', centerLat: 30.9, centerLng: 121.93, radiusMeters: 1500 },
];

export const IOT_DEVICE_PINS: IotDevicePin[] = [
  { deviceId: 'DEV-1001', name: '张江冷库温控', latitude: 31.206, longitude: 121.601, fenceId: 'FENCE-A' },
  { deviceId: 'DEV-1002', name: '张江配电柜', latitude: 31.24, longitude: 121.65, fenceId: 'FENCE-A' },
  { deviceId: 'DEV-1003', name: '外高桥空压机', latitude: 31.356, longitude: 121.592, fenceId: 'FENCE-B' },
  { deviceId: 'DEV-1004', name: '外高桥叉车', latitude: 31.37, longitude: 121.61, fenceId: 'FENCE-B' },
  { deviceId: 'DEV-1005', name: '临港 AGV-01', latitude: 30.901, longitude: 121.932, fenceId: 'FENCE-C' },
  { deviceId: 'DEV-1006', name: '临港 AGV-02', latitude: 30.905, longitude: 121.925, fenceId: 'FENCE-C' },
];

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)));
}

export function checkDeviceFence(deviceId: string) {
  const device = IOT_DEVICE_PINS.find((pin) => pin.deviceId === deviceId);
  if (!device) return null;
  const fence = IOT_FENCES.find((item) => item.fenceId === device.fenceId)!;
  const distanceMeters = haversineMeters(device.latitude, device.longitude, fence.centerLat, fence.centerLng);
  return { deviceId, fenceId: fence.fenceId, fenceName: fence.fenceName, inside: distanceMeters <= fence.radiusMeters, distanceMeters };
}

/** 32-gon circle approximation in lng/lat (toCircleGeojson). */
export function buildFenceGeojson() {
  return {
    type: 'FeatureCollection',
    features: IOT_FENCES.map((fence) => {
      const ring: number[][] = [];
      for (let i = 0; i <= 32; i += 1) {
        const angle = (i / 32) * 2 * Math.PI;
        const dLat = (fence.radiusMeters / 111320) * Math.sin(angle);
        const dLng = (fence.radiusMeters / (111320 * Math.cos((fence.centerLat * Math.PI) / 180))) * Math.cos(angle);
        ring.push([Math.round((fence.centerLng + dLng) * 1e6) / 1e6, Math.round((fence.centerLat + dLat) * 1e6) / 1e6]);
      }
      return {
        type: 'Feature',
        properties: { name: fence.fenceName, fenceId: fence.fenceId, radiusMeters: fence.radiusMeters },
        geometry: { type: 'Polygon', coordinates: [ring] },
      };
    }),
  };
}

function seedFenceEvents(): IotFenceEvent[] {
  return [
    { eventId: 'FE-001', deviceId: 'DEV-1001', eventType: 'enter', ts: '2026-10-31 08:02', distanceMeters: 640 },
    { eventId: 'FE-002', deviceId: 'DEV-1002', eventType: 'exit', ts: '2026-10-31 08:15', distanceMeters: 1720 },
    { eventId: 'FE-003', deviceId: 'DEV-1003', eventType: 'dwell', ts: '2026-10-31 08:40', distanceMeters: 210 },
    { eventId: 'FE-004', deviceId: 'DEV-1001', eventType: 'dwell', ts: '2026-10-31 09:05', distanceMeters: 150 },
    { eventId: 'FE-005', deviceId: 'DEV-1004', eventType: 'exit', ts: '2026-10-31 09:20', distanceMeters: 2410 },
  ];
}

export interface ReplIotV3Hooks {
  appendFenceEvent?: (event?: Partial<IotFenceEvent>) => void;
  lastCheckFenceBody?: Record<string, unknown>;
}

export interface ReplIotV3Input {
  url: string;
  method: string;
  read: (key: string) => unknown;
  body: Record<string, unknown> | undefined;
  hooks: ReplIotV3Hooks | undefined;
}

export function createReplIotV3Surface() {
  const events = seedFenceEvents();

  function appendFenceEvent(event?: Partial<IotFenceEvent>): void {
    const n = events.length + 1;
    events.push({
      eventId: event?.eventId ?? `FE-${String(n).padStart(3, '0')}`,
      deviceId: event?.deviceId ?? 'DEV-1001',
      eventType: event?.eventType ?? 'exit',
      ts: event?.ts ?? `2026-10-31 10:${String(n).padStart(2, '0')}`,
      distanceMeters: event?.distanceMeters ?? 905,
    });
  }

  return function handleReplIotV3<T>(input: ReplIotV3Input): { status: number; data: T } | null {
    const { url, method, read, body, hooks } = input;
    if (hooks && !hooks.appendFenceEvent) hooks.appendFenceEvent = appendFenceEvent;

    if (url.includes('/r/ReplIot__devicePins') && method === 'get') {
      const pinData = IOT_DEVICE_PINS.map((pin) => ({ name: pin.deviceId, lat: pin.latitude, lng: pin.longitude, value: 1 }));
      return { status: 0, data: { pins: IOT_DEVICE_PINS, pinData } as unknown as T };
    }

    if (url.includes('/r/ReplIot__fenceList') && method === 'get') {
      if (read('view') === 'geojson') {
        return { status: 0, data: buildFenceGeojson() as unknown as T };
      }
      const regionData = IOT_FENCES.map((fence) => ({
        name: fence.fenceName,
        value: IOT_DEVICE_PINS.filter((pin) => pin.fenceId === fence.fenceId).length,
      }));
      return { status: 0, data: { fences: IOT_FENCES, regionData, fenceGeojson: buildFenceGeojson() } as unknown as T };
    }

    if (url.includes('/r/ReplIot__fenceEvents') && method === 'get') {
      // timeline projection: the formula layer has no object literals, so the
      // TimelineItem shape is projected here (newest first via reverse).
      const timeline = events.map((event, index) => ({
        value: index,
        time: event.ts,
        title: `${event.deviceId} ${event.eventType === 'enter' ? '进入' : event.eventType === 'exit' ? '离开' : '驻留'}围栏`,
        detail: `距中心 ${event.distanceMeters} m`,
        level: event.eventType === 'exit' ? 'warning' : event.eventType === 'enter' ? 'success' : 'info',
      }));
      return {
        status: 0,
        data: { items: events.map((event) => ({ ...event })), total: events.length, timeline } as unknown as T,
      };
    }

    if (url.includes('/r/ReplIot__checkFence') && method === 'post') {
      if (hooks) hooks.lastCheckFenceBody = JSON.parse(JSON.stringify(body ?? {}));
      const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : '';
      const result = checkDeviceFence(deviceId);
      if (!result) {
        return { status: 1, data: { msg: 'REPL_IOT_DEVICE_NOT_FOUND', deviceId } as unknown as T };
      }
      return { status: 0, data: result as unknown as T };
    }

    if (url.includes('/r/ReplIot__videoChannels') && method === 'get') {
      const channels = [1, 2, 3, 4].map((n) => ({
        channelId: `CH-0${n}`,
        name: ['张江园区北门', '外高桥仓装卸区', '临港 AGV 通道', '配电房'][n - 1],
        status: 'online',
        streamUrl: `/repl-assets/sample-clip-${n}.mp4`,
        poster: `/repl-assets/sample-poster-${n}.png`,
      }));
      const tree = [
        { id: 'all', name: '全部通道（4 路在线）', children: channels.map((ch) => ({ id: ch.channelId, name: `${ch.name}（${ch.channelId}）` })) },
      ];
      return { status: 0, data: { channels, tree } as unknown as T };
    }

    return null;
  };
}

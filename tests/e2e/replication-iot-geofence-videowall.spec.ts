import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 818 — V3 IoT 围栏地图与视频墙页 focused e2e (D4 §5 V3 断言清单 ①-④ +
// focus ①-③). Pillar one (programmatic interactions, __replIotCalls evidence
// + write mirror) + pillar three (focus). Pillar two (axe) follows the D4 §3.4
// branch-C decision recorded in a11y-axe-baseline.spec.ts.
//
// Narrowing (D4 §6.2): fence drawing / track replay / streaming control are
// NOT interaction-accepted; the page proves fence echo, pin→checkFence
// linkage, polling increments and the video-wall existence face.
//
// Live-completed faces (D4 §2.7「V3 实现勘误」):
// - The map renderer only consumes geojson in region mode, so fence echo is a
//   second region-mode map fed by a geojsonSource ACTION (FeatureCollection
//   body); pins live on the pin-mode map (cluster off).
// - Pin clicks go through the exposed `__flux_map_<schema id>` instance:
//   feature coordinate → map pixel → real mouse click (map-demo precedent).

const COUNTERS_KEY = '__replIotCalls';
const HOOKS_KEY = '__replIotTestHooks';
const PIN_MAP = 'iot-geofence-videowall-map';
const FENCE_MAP = 'iot-geofence-videowall-fence-map';
const POLL_TIMEOUT = 9_000;
/** Seed fence events (mock seedFenceEvents): 5 rows, DEV-1001 owns 2. */
const SEED_EVENTS = 5;

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replIotTestHooks ?? {},
  );
}

/** Feature count of a map's vector data layer (map-demo.spec.ts probe shape). */
function vectorFeatureCount(page: Page, mapId: string): Promise<number> {
  return page.evaluate((key) => {
    const exposed = (window as unknown as Record<string, { map?: { getLayers: () => { getArray: () => unknown[] } } }>)[
      `__flux_map_${key}`
    ];
    const layer = exposed?.map
      ?.getLayers()
      .getArray()
      .find((item) => (item as { constructor: { name: string } }).constructor.name === 'VectorLayer') as
      | { getSource: () => { getFeatures: () => unknown[] } }
      | undefined;
    return layer ? layer.getSource().getFeatures().length : -1;
  }, mapId);
}

/** Real mouse click on the pin feature named `deviceId`. */
async function clickPin(page: Page, deviceId: string): Promise<void> {
  const point = await page.evaluate(
    ({ key, name }) => {
      type OlFeature = { get: (k: string) => unknown; getGeometry: () => { getCoordinates: () => number[] } };
      const exposed = (window as unknown as Record<string, { map?: {
        getLayers: () => { getArray: () => unknown[] };
        getPixelFromCoordinate: (c: number[]) => number[];
        getViewport: () => HTMLElement;
      } }>)[`__flux_map_${key}`];
      const map = exposed?.map;
      if (!map) throw new Error('pin map instance not exposed');
      const layer = map
        .getLayers()
        .getArray()
        .find((item) => (item as { constructor: { name: string } }).constructor.name === 'VectorLayer') as {
        getSource: () => { getFeatures: () => OlFeature[] };
      };
      const feature = layer.getSource().getFeatures().find((f) => f.get('name') === name);
      if (!feature) return null;
      const pixel = map.getPixelFromCoordinate(feature.getGeometry().getCoordinates());
      const box = map.getViewport().getBoundingClientRect();
      return { x: box.left + pixel[0], y: box.top + pixel[1] };
    },
    { key: PIN_MAP, name: deviceId },
  );
  expect(point, `pin feature for ${deviceId} must exist`).toBeTruthy();
  await page.mouse.click(point!.x, point!.y);
}

async function openV3(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'iot-geofence-videowall', { title: 'IoT 围栏地图与视频墙页' });
  await expect.poll(() => vectorFeatureCount(page, PIN_MAP), { timeout: 30_000 }).toBe(6);
}

test.describe('V3 IoT 围栏地图与视频墙页 (#/complex-pages/iot-geofence-videowall)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置 + 交互④：两张地图实例在位 + pin 要素 6 + 围栏回显要素 = fenceGeojson features 3 + 事件 5 行 + 端点计数', async ({
    page,
  }) => {
    await openV3(page);

    expect(await vectorFeatureCount(page, PIN_MAP)).toBe(6);
    await expect.poll(() => vectorFeatureCount(page, FENCE_MAP), { timeout: 15_000 }).toBe(3);
    await expect(page.getByTestId('iot-geofence-videowall-events').locator('tbody tr')).toHaveCount(SEED_EVENTS);
    await expect(page.getByTestId('iot-geofence-videowall-timeline')).toContainText('离开围栏');

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__devicePins', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__fenceList', { atLeast: 2 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__fenceEvents', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__videoChannels', { atLeast: 1 });
    expect((await readEndpointCalls(page, COUNTERS_KEY))['ReplIot__checkFence'] ?? 0).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互① pin 点击 → checkFence +1 + 载荷 deviceId + 判定文本 + 事件列表按设备过滤', async ({ page }) => {
    await openV3(page);

    await clickPin(page, 'DEV-1001');
    await expect(page.getByTestId('iot-geofence-videowall-fence-check')).toContainText('设备 DEV-1001', { timeout: 10_000 });
    await expect(page.getByTestId('iot-geofence-videowall-fence-check')).toContainText('张江园区 · 围栏内');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__checkFence', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({ lastCheckFenceBody: { deviceId: 'DEV-1001' } });

    const rows = page.getByTestId('iot-geofence-videowall-events').locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(page.getByTestId('iot-geofence-videowall-events')).not.toContainText('DEV-1002');
    await expect(page.getByTestId('iot-geofence-videowall-event-filter')).toContainText('已按 DEV-1001 过滤');

    // Out-of-fence device: DEV-1002 sits ~1.8 km from the 800 m fence centre.
    await clickPin(page, 'DEV-1002');
    await expect(page.getByTestId('iot-geofence-videowall-fence-check')).toContainText('DEV-1002 · 张江园区 · 围栏外', {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('交互② 视频墙：video 计数 = 4 + src 含 /repl-assets/sample-clip- + 页内无 iframe', async ({ page }) => {
    await openV3(page);

    const videos = page.getByTestId('iot-geofence-videowall-video-grid').locator('video');
    await expect(videos).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      await expect(videos.nth(i)).toHaveAttribute('src', new RegExp(`/repl-assets/sample-clip-${i + 1}\\.mp4$`));
    }
    await expect(page.locator('iframe')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互③ appendFenceEvent → 下一轮询 fenceEvents 计数增长 + 事件行 +1 + timeline 增长', async ({ page }) => {
    await openV3(page);
    const before = (await readEndpointCalls(page, COUNTERS_KEY))['ReplIot__fenceEvents'] ?? 0;
    const timelineItems = page.getByTestId('iot-geofence-videowall-timeline').locator('[data-slot="timeline-item"]');
    await expect(timelineItems).toHaveCount(SEED_EVENTS);

    await page.evaluate(() => {
      const hooks = (
        window as unknown as Record<string, { appendFenceEvent?: (event?: Record<string, unknown>) => void }>
      ).__replIotTestHooks;
      hooks?.appendFenceEvent?.({ deviceId: 'DEV-1005', eventType: 'exit', distanceMeters: 1620 });
    });

    await expect(page.getByTestId('iot-geofence-videowall-events').locator('tbody tr')).toHaveCount(SEED_EVENTS + 1, {
      timeout: POLL_TIMEOUT,
    });
    await expect(page.getByTestId('iot-geofence-videowall-events')).toContainText('DEV-1005');
    await expect(timelineItems).toHaveCount(SEED_EVENTS + 1);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplIot__fenceEvents', { atLeast: before + 1 });
    await assertTrackedPageErrors(page);
  });

  test('focus ① 地图画布容器 Tab 可达（抽样）', async ({ page }) => {
    await openV3(page);

    const landedInMap = () =>
      page.evaluate((id) => {
        const active = document.activeElement as HTMLElement | null;
        const map = document.querySelector(`[data-testid="${id}"]`);
        return !!active && !!map && map.contains(active);
      }, PIN_MAP);
    let landed = false;
    for (let i = 0; i < 80 && !landed; i += 1) {
      await page.keyboard.press('Tab');
      landed = await landedInMap();
    }
    expect(landed).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ② video controls 可聚焦（第 1 路）', async ({ page }) => {
    await openV3(page);

    const video = page
      .locator('[data-testid="iot-geofence-videowall-video-1"]')
      .locator('xpath=descendant-or-self::video')
      .first();
    expect(await video.evaluate((el) => (el as HTMLVideoElement).controls)).toBe(true);
    await video.focus();
    await expect(video).toBeFocused();
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 通道 drawer 焦点落入、tree 首项可达、Esc 关闭', async ({ page }) => {
    await openV3(page);

    await page.getByTestId('iot-geofence-videowall-channels-open').click();
    const drawer = page.locator('[role="dialog"]', { hasText: '视频通道' });
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    const tree = page.getByTestId('iot-geofence-videowall-channel-tree');
    await expect(tree).toContainText('全部通道（4 路在线）');
    await expect(tree).toContainText('张江园区北门（CH-01）');

    await expect
      .poll(() =>
        page.evaluate(() => {
          const surfaces = document.querySelectorAll('[role="dialog"]');
          const top = surfaces[surfaces.length - 1];
          const active = document.activeElement;
          return !!top && !!active && (active === top || top.contains(active));
        }),
      )
      .toBe(true);
    // Keyboard walk reaches the tree's first item inside the drawer.
    let onTree = false;
    for (let i = 0; i < 10 && !onTree; i += 1) {
      onTree = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        return !!active?.closest('[data-testid="iot-geofence-videowall-channel-tree"]');
      });
      if (!onTree) await page.keyboard.press('Tab');
    }
    expect(onTree).toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    expect(await page.evaluate(() => !!document.activeElement && document.activeElement !== document.body)).toBe(true);
    await assertTrackedPageErrors(page);
  });
});

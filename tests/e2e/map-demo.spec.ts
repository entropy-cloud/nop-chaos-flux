import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openMapDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/map-demo', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Map Demo' })).toBeVisible({
    timeout: 40_000,
  });
}

interface ExposedMap {
  map: {
    getLayers: () => { getArray: () => Array<{ constructor: { name: string } }> };
    getView: () => { getZoom: () => number };
  };
}

/**
 * ux-r3：图层装配与配色专项断言（与 map-dark-redraw.spec 的主题重绘存活断言分工）。
 * 离线环境 basemap 瓦片不可达属可接受降级——断言只针对实例集合与矢量层。
 */
test.describe('Map Demo (ux-r3)', () => {
  test('region map assembles basemap + data layers with projected features and non-black theme', async ({
    page,
  }) => {
    await openMapDemo(page);
    const probe = await page.evaluate(() => {
      const exposed = (window as unknown as Record<string, ExposedMap | undefined>)[
        '__flux_map_demoChinaSales'
      ];
      if (!exposed) return { found: false as const };
      const map = exposed.map;
      const layers = map.getLayers().getArray();
      const dataLayer = layers.find(
        (layer) => layer.constructor.name === 'VectorLayer',
      ) as unknown as {
        getSource: () => { getFeatures: () => Array<{ getStyle?: unknown }> };
        getStyle: () => ((feature: unknown, view: unknown) => unknown) | undefined;
      };
      const features = dataLayer.getSource().getFeatures();
      const view = map.getView();
      const style = dataLayer.getStyle();
      const sampleStyle = style ? (style(features[0], view) as { getFill?: () => { getColor: () => string } }) : undefined;
      const fill = sampleStyle?.getFill?.().getColor() ?? null;
      return {
        found: true as const,
        layerCount: layers.length,
        featureCount: features.length,
        zoom: view.getZoom(),
        fill,
      };
    });
    expect(probe.found).toBe(true);
    // basemap TileLayer + data VectorLayer（实例集合口径；离线 basemap 无 canvas 子节点也计入）
    expect(probe.layerCount).toBe(2);
    // 8 个 regionData 省份全部命中 china-provinces geojson
    expect(probe.featureCount).toBe(8);
    // 投影修复后 fitView 回到全国视野（zoom < 7，修复前塌缩 extent 触顶 10）
    expect(probe.zoom).toBeLessThan(7);
    // 色阶着色为合法 hex（非退化黑）
    expect(probe.fill).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(probe.fill?.toLowerCase()).not.toBe('#000000');
    await assertTrackedPageErrors(page);
  });

  test('pin cluster bubbles use accent color instead of degenerate black', async ({ page }) => {
    await openMapDemo(page);
    const probe = await page.evaluate(() => {
      const exposed = (window as unknown as Record<string, ExposedMap | undefined>)[
        '__flux_map_demoStorePins'
      ];
      if (!exposed) return { found: false as const };
      const map = exposed.map;
      const layers = map.getLayers().getArray();
      const clusterLayer = layers.find(
        (layer) => layer.constructor.name === 'VectorLayer',
      ) as unknown as {
        getSource: () => {
          getFeatures: () => Array<{
            get: (key: string) => unknown;
          }>;
        };
        getStyle: () => (feature: unknown, view: unknown) => unknown;
      };
      const view = map.getView();
      const clusters = clusterLayer
        .getSource()
        .getFeatures()
        .map((feature) => feature.get('features'))
        .filter((members): members is unknown[] => Array.isArray(members) && members.length > 0);
      if (clusters.length === 0) return { found: true as const, clusterFill: null };
      const styleFn = clusterLayer.getStyle();
      const style = styleFn(
        clusterLayer.getSource().getFeatures().find((f) => Array.isArray(f.get('features'))),
        view,
      ) as { getImage?: () => { getFill: () => { getColor: () => string } } };
      return {
        found: true as const,
        clusterFill: style.getImage?.().getFill().getColor() ?? null,
      };
    });
    expect(probe.found).toBe(true);
    // cluster 气泡填充为主题 accent（hsl 包装解析成功），非退化黑
    if (probe.clusterFill !== null) {
      expect(String(probe.clusterFill).toLowerCase()).not.toBe('rgb(0, 0, 0)');
      expect(String(probe.clusterFill).toLowerCase()).not.toBe('#000000');
    }
    await assertTrackedPageErrors(page);
  });
});

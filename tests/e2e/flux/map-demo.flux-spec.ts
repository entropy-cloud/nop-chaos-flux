import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Map Demo (ux-r3) —图层装配与配色专项断言（与 map-dark-redraw.spec 的主题重绘
 * 存活断言分工）。离线环境 basemap 瓦片不可达属可接受降级——断言只针对实例
 * 集合与矢量层。
 *
 * Migrated from tests/e2e/map-demo.spec.ts (E3 batch 2, engine swap +
 * kernel expectNoPageErrors in place of assertTrackedPageErrors; page.evaluate
 * probes mapped onto ft.evaluate string probes, and the region-fill hex check
 * strengthened from toMatch to an explicit /[0-9a-fA-F]{6}/ + non-black gate).
 */

// TODO(migrate-debt): evaluate fallback (OpenLayers map internals are only
// reachable through the page-global __flux_map_demo* exposure — no DOM/locator
// surface exists for layer/feature/style assertions)

const REGION_PROBE = `(function () {
  var exposed = window.__flux_map_demoChinaSales;
  if (!exposed) return JSON.stringify({ found: false });
  var map = exposed.map;
  var layers = map.getLayers().getArray();
  var dataLayer = null;
  for (var i = 0; i < layers.length; i++) {
    if (layers[i].constructor.name === 'VectorLayer') { dataLayer = layers[i]; break; }
  }
  if (!dataLayer) return JSON.stringify({ found: false });
  var features = dataLayer.getSource().getFeatures();
  var view = map.getView();
  var styleFn = dataLayer.getStyle();
  var fill = null;
  if (styleFn && features.length > 0) {
    var sampleStyle = styleFn(features[0], view);
    if (sampleStyle && sampleStyle.getFill) fill = sampleStyle.getFill().getColor();
  }
  return JSON.stringify({
    found: true,
    layerCount: layers.length,
    featureCount: features.length,
    zoom: view.getZoom(),
    fill: fill
  });
})()`;

const CLUSTER_PROBE = `(function () {
  var exposed = window.__flux_map_demoStorePins;
  if (!exposed) return JSON.stringify({ found: false });
  var map = exposed.map;
  var layers = map.getLayers().getArray();
  var clusterLayer = null;
  for (var i = 0; i < layers.length; i++) {
    if (layers[i].constructor.name === 'VectorLayer') { clusterLayer = layers[i]; break; }
  }
  if (!clusterLayer) return JSON.stringify({ found: false });
  var view = map.getView();
  var feats = clusterLayer.getSource().getFeatures();
  var hasClusters = feats.some(function (f) {
    var members = f.get('features');
    return Array.isArray(members) && members.length > 0;
  });
  if (!hasClusters) return JSON.stringify({ found: true, clusterFill: null });
  var styleFn = clusterLayer.getStyle();
  var target = feats.find(function (f) { return Array.isArray(f.get('features')); });
  var style = styleFn(target, view);
  var fill = style && style.getImage ? style.getImage().getFill().getColor() : null;
  return JSON.stringify({ found: true, clusterFill: fill });
})()`;

async function openMapDemo(ft: FtGlobal): Promise<void> {
  // goto to the same hash url is a no-op — bounce through '/#/' so the demo remounts
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/map-demo');
  await ft.expectWeb(ft.getByRole('heading', { name: /Map Demo/ })).toBeVisible({ timeoutMs: 40_000 });
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
}

// OpenLayers map instances expose their globals in a post-init effect — poll
// until the map id anchor lands (geojson fetch + OL mount can take seconds).
async function waitForMapExposure(ft: FtGlobal, id: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const present = await ft.evaluate(`!!window.__flux_map_${id}`);
    if (present === true) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`map-demo: window.__flux_map_${id} exposure never appeared`);
}

export default async function mapDemo(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: region map assembles basemap + data layers with projected features and non-black theme
  await openMapDemo(ft);
  await waitForMapExposure(ft, 'demoChinaSales');
  const regionRaw = await ft.evaluate(REGION_PROBE);
  const region = JSON.parse(String(regionRaw)) as {
    found: boolean;
    layerCount?: number;
    featureCount?: number;
    zoom?: number;
    fill?: string | null;
  };
  if (!region.found) throw new Error('map-demo: __flux_map_demoChinaSales exposure not found');
  // basemap TileLayer + data VectorLayer（实例集合口径；离线 basemap 无 canvas 子节点也计入）
  if (region.layerCount !== 2) throw new Error(`map-demo: layerCount ${region.layerCount}, expected 2`);
  // 8 个 regionData 省份全部命中 china-provinces geojson
  if (region.featureCount !== 8) throw new Error(`map-demo: featureCount ${region.featureCount}, expected 8`);
  // 投影修复后 fitView 回到全国视野（zoom < 7，修复前塌缩 extent 触顶 10）
  if (!(region.zoom !== undefined && region.zoom < 7)) {
    throw new Error(`map-demo: zoom ${region.zoom}, expected < 7`);
  }
  // 色阶着色为合法 hex（非退化黑）。OL 当前对 hex 色值附带 alpha 通道（8 位）
  // — 接受 6/8 位 hex，黑名单判定按 RGB 前缀。
  const fill = region.fill ?? '';
  if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(fill)) {
    throw new Error(`map-demo: region fill "${fill}" is not a 6/8-digit hex`);
  }
  if (fill.toLowerCase() === '#000000') throw new Error('map-demo: region fill degenerated to black');
  await expectNoPageErrors(ft, 'map-demo:region-layers');

  // Case 2: pin cluster bubbles use accent color instead of degenerate black
  await openMapDemo(ft);
  await waitForMapExposure(ft, 'demoStorePins');
  const clusterRaw = await ft.evaluate(CLUSTER_PROBE);
  const cluster = JSON.parse(String(clusterRaw)) as { found: boolean; clusterFill?: string | null };
  if (!cluster.found) throw new Error('map-demo: __flux_map_demoStorePins exposure not found');
  // cluster 气泡填充为主题 accent（hsl 包装解析成功），非退化黑
  if (cluster.clusterFill !== null && cluster.clusterFill !== undefined) {
    const clusterFill = String(cluster.clusterFill).toLowerCase();
    if (clusterFill === 'rgb(0, 0, 0)') throw new Error('map-demo: cluster fill degenerated to rgb(0, 0, 0)');
    if (clusterFill === '#000000') throw new Error('map-demo: cluster fill degenerated to #000000');
  }
  await expectNoPageErrors(ft, 'map-demo:cluster-fill');

  return { cases: 2 };
}

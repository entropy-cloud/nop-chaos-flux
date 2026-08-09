import type OlMap from 'ol/Map';
import type OlView from 'ol/View';
import type OlTileLayer from 'ol/layer/Tile';
import type OlVectorLayer from 'ol/layer/Vector';
import type OlVectorSource from 'ol/source/Vector';
import type OlXYZ from 'ol/source/XYZ';
import type OlTileWMS from 'ol/source/TileWMS';
import type OlCluster from 'ol/source/Cluster';
import type OlGeoJSON from 'ol/format/GeoJSON';
import type OlFeature from 'ol/Feature';
import type OlPoint from 'ol/geom/Point';
import type OlStyle from 'ol/style/Style';
import type OlFill from 'ol/style/Fill';
import type OlStroke from 'ol/style/Stroke';
import type OlCircle from 'ol/style/Circle';
import type OlText from 'ol/style/Text';

type FromLonLat = typeof import('ol/proj').fromLonLat;

/**
 * OL 模块 API 面：renderer 动态导入（`map-ol-loader` 是唯一 ol 静态类型接触点，
 * 渲染期按需加载，不进初始 bundle）。注入 layer manager 与测试替身。
 */
export interface OlApi {
  Map: typeof OlMap;
  View: typeof OlView;
  TileLayer: typeof OlTileLayer;
  VectorLayer: typeof OlVectorLayer;
  VectorSource: typeof OlVectorSource;
  XYZ: typeof OlXYZ;
  TileWMS: typeof OlTileWMS;
  Cluster: typeof OlCluster;
  GeoJSON: typeof OlGeoJSON;
  Feature: typeof OlFeature;
  Point: typeof OlPoint;
  Style: typeof OlStyle;
  Fill: typeof OlFill;
  Stroke: typeof OlStroke;
  Circle: typeof OlCircle;
  Text: typeof OlText;
  fromLonLat: FromLonLat;
}

/**
 * 懒加载 OL 模块（ES modules tree-shaking，随 map chunk 动态加载）。
 * 失败由调用方捕获（map-ol-import-fail → 错误占位，不白屏）。
 */
export async function loadOlApi(): Promise<OlApi> {
  const [Map, View, TileLayer, VectorLayer, VectorSource, XYZ, TileWMS, Cluster, GeoJSON, Feature, Point, Style, Fill, Stroke, Circle, Text, proj] =
    await Promise.all([
      import('ol/Map'),
      import('ol/View'),
      import('ol/layer/Tile'),
      import('ol/layer/Vector'),
      import('ol/source/Vector'),
      import('ol/source/XYZ'),
      import('ol/source/TileWMS'),
      import('ol/source/Cluster'),
      import('ol/format/GeoJSON'),
      import('ol/Feature'),
      import('ol/geom/Point'),
      import('ol/style/Style'),
      import('ol/style/Fill'),
      import('ol/style/Stroke'),
      import('ol/style/Circle'),
      import('ol/style/Text'),
      import('ol/proj'),
    ]);
  return {
    Map: Map.default,
    View: View.default,
    TileLayer: TileLayer.default,
    VectorLayer: VectorLayer.default,
    VectorSource: VectorSource.default,
    XYZ: XYZ.default,
    TileWMS: TileWMS.default,
    Cluster: Cluster.default,
    GeoJSON: GeoJSON.default,
    Feature: Feature.default,
    Point: Point.default,
    Style: Style.default,
    Fill: Fill.default,
    Stroke: Stroke.default,
    Circle: Circle.default,
    Text: Text.default,
    fromLonLat: proj.fromLonLat,
  };
}

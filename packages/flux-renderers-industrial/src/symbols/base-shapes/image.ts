import { Image } from 'leafer-ui';
import type { ScadaEngineImageBridge, ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaImageType = 'scada-image';

export const SCADA_IMAGE_PLACEHOLDER = '#d8dbe0';

function urlOf(custom: Record<string, unknown> | undefined): string | undefined {
  const url = custom?.url;
  return typeof url === 'string' && url.trim() !== '' ? url : undefined;
}

export const scadaImageDefinition: ScadaSymbolDefinition = {
  type: scadaImageType,
  name: 'Image',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    rotation: { type: 'number' },
    scale: { type: 'number' },
    visible: { type: 'boolean' },
    opacity: { type: 'number' },
    custom: { type: 'object' },
  },
  defaults: { x: 0, y: 0, width: 120, height: 80 },
  create: ({ props, engine }) => {
    const attrs = toShapeAttrs(props);
    if (attrs.width === undefined) attrs.width = 120;
    if (attrs.height === undefined) attrs.height = 80;
    // 占位样式：加载中/加载失败均保持灰块（leafer Image `background` 画在图片下层；加载失败图片不 ready → 占位保留）
    attrs.background = SCADA_IMAGE_PLACEHOLDER;
    const url = urlOf(props.custom);
    if (url) {
      // 外部 IO 归位：URL 经引擎图片缓存 + 桥接层 env.fetcher（INV-1，引擎不直调 fetch）
      const resolver = (engine as ScadaEngineImageBridge | undefined)?.resolveImageUrl;
      attrs.url = resolver ? resolver(url) : url;
    }
    const node = new Image(attrs);
    node.on('error', () => {
      // plan 2026-08-04-1558-2 Phase 4 Decision：加载失败占位样式保持（视觉契约），
      // `loadFailed` 写入但当前**无画布级消费者**（ Deferred But Adjudicated：与 P1-8 数据/资源
      // 错误不升级 status 契约冲突，画布级诊断通道需 I16 编辑器时代统一接线）。保留写入以便
      // 未来诊断面/调试器直接读取，author 不应假设已接入运行时报警通道（design-symbols.md 注记）。
      node.set({ background: SCADA_IMAGE_PLACEHOLDER, loadFailed: true });
    });
    return node;
  },
};

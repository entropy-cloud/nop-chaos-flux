import { useMemo } from 'react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { ShowcaseSchemaHost } from '../shared/render-host';
import mallSkuPickerSchema from '../page-schemas/mall-sku-picker.json';

/**
 * S1 商城商品 SKU 选择页 host override (D4 §2.1 / D6 MAJ-C 裁决 + W1/M3 同构):
 * mobile 形态页以 375×667 居中手机框（replication.css `.repl-mobile-canvas*`）
 * 承载；画布同时是 axe 分支 B 的扫描对象。
 *
 * Host seeds the page-scope variables the schema expressions read before the
 * first write (W1/M3 先例)。goodsFeed 翻页累加器四 face 显式种子是 M3 勘误 3
 * 首载链（观察哨初始回调）的前提。
 */
export function MallSkuPickerHost({ env }: { env: RendererEnv }) {
  const data = useMemo(
    () => ({
      goodsFeedItems: [],
      goodsFeedPage: 0,
      goodsFeedHasMore: true,
      goodsFeedLoading: false,
      selectedColor: '',
      selectedSize: '',
      quantity: 1,
      panelAnchor: 0,
      viewerOpen: false,
      viewerIndex: 0,
      activeSession: 'active',
    }),
    [],
  );

  return (
    <div className="repl-mobile-canvas" data-testid="mall-sku-picker-canvas">
      <div className="repl-mobile-canvas-screen" data-testid="mall-sku-picker-screen">
        <ShowcaseSchemaHost
          schemaUrl="showcase://mall-sku-picker/page"
          schema={mallSkuPickerSchema as unknown as SchemaInput}
          env={env}
          data={data}
        />
      </div>
    </div>
  );
}

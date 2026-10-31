import { useMemo } from 'react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { ShowcaseSchemaHost } from '../shared/render-host';
import mesAndonMaterialSchema from '../page-schemas/mes-andon-material.json';

/**
 * M3 MES 异常叫料移动页 host override (D3 §2.6 / D6 MAJ-C 裁决 + W1 同构):
 * mobile 形态页不走桌面壳全宽铺开，而是由 registry 特例 host 以 375×667 居中
 * 手机框（replication.css `.repl-mobile-canvas*`）承载。画布同时是 axe 分支 B
 * 的扫描对象与 F1「移动端页 viewport 适配验证」的验收对象。
 *
 * Host seeds the page-scope variables the schema expressions read before the
 * first write (W1 先例) — the infinite-scroll accumulator faces
 * (andonItems/andonPage/andonHasMore/andonLoading) start empty so the first
 * onLoadMore loads page 1; every expression has a defined initial value.
 */
export function MesAndonMaterialHost({ env }: { env: RendererEnv }) {
  const data = useMemo(
    () => ({
      andonItems: [],
      andonPage: 0,
      andonHasMore: true,
      andonLoading: false,
      docNo: '',
      panelAnchor: 0,
      viewerOpen: false,
      viewerIndex: 0,
      keyboardOpen: false,
      quickQty: '',
    }),
    [],
  );

  return (
    <div className="repl-mobile-canvas" data-testid="mes-andon-material-canvas">
      <div className="repl-mobile-canvas-screen" data-testid="mes-andon-material-screen">
        <ShowcaseSchemaHost
          schemaUrl="showcase://mes-andon-material/page"
          schema={mesAndonMaterialSchema as unknown as SchemaInput}
          env={env}
          data={data}
        />
      </div>
    </div>
  );
}

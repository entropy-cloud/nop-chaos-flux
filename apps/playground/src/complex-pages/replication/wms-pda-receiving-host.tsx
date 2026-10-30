import { useMemo } from 'react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { ShowcaseSchemaHost } from '../shared/render-host';
import wmsPdaReceivingSchema from '../page-schemas/wms-pda-receiving.json';

/**
 * W1 WMS PDA 收货/上架作业页 host override (D1 §0 决策① 例外注 + D2 §2.1 / D6
 * MAJ-C): mobile 形态页不走桌面壳全宽铺开，而是由 registry 特例 host 以
 * 375×667 居中手机框（replication.css `.repl-mobile-canvas*`）承载。桌面壳
 * 240px 固定侧栏 + 双层 padding 会把 375px 视口挤压到 ≈55px 内容带；画布同时
 * 是 axe 分支 B 的扫描对象（画布内 DOM）与 F1「移动端页 viewport 适配验证」
 * 的验收对象。
 *
 * Host seeds the page-scope variables the schema expressions read before the
 * first write (pih-workspace 数据种子先例) — 每个表达式都有定义初值。
 */
export function WmsPdaReceivingHost({ env }: { env: RendererEnv }) {
  const data = useMemo(
    () => ({
      offlineMode: false,
      qtyKeyboardOpen: false,
      scanCount: 0,
      // Default suggested slot for ASN-2026-0001 line 1 — the putaway happy
      // path works from the cascader default leaf. (asnNo/supplierName/
      // skuName stay unseeded so their `?? '-'` faces render on first load.)
      locationCode: 'A-01-01',
    }),
    [],
  );

  return (
    <div className="repl-mobile-canvas" data-testid="wms-pda-receiving-canvas">
      <div className="repl-mobile-canvas-screen" data-testid="wms-pda-receiving-screen">
        <ShowcaseSchemaHost
          schemaUrl="showcase://wms-pda-receiving/page"
          schema={wmsPdaReceivingSchema as unknown as SchemaInput}
          env={env}
          data={data}
        />
      </div>
    </div>
  );
}

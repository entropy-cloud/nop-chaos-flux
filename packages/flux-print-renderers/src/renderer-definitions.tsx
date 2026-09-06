import type { PrintElementSchema, PrintElementType } from '@nop-chaos/flux-print-core';
import React from 'react';

export interface PrintElementRendererProps<E extends PrintElementSchema = PrintElementSchema> {
  element: E;
}

export type PrintElementRendererComponent = React.ComponentType<PrintElementRendererProps<any>>;

export interface PrintElementRendererEntry {
  component: PrintElementRendererComponent;
}

const TextRenderer = ({ element }: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'text' }>>) => (
  <span className="fmt-design-text" data-print-role="text-content">
    {element.field ? `\${${element.field}}` : element.text}
  </span>
);

const ImageRenderer = ({ element }: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'image' }>>) =>
  element.src ? (
    <img className="fmt-design-image" src={element.src} alt="" draggable={false} />
  ) : (
    <span className="fmt-design-placeholder" data-print-role="image-placeholder">
      IMG
    </span>
  );

const TableRenderer = ({ element }: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'table' }>>) => {
  const columns = element.columns.length > 0 ? element.columns : [{ label: '列' }];
  return (
    <table className="fmt-design-table" data-print-role="table-skeleton">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.label}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {columns.map((column) => (
            <td key={column.label} />
          ))}
        </tr>
      </tbody>
    </table>
  );
};

const BarcodeRenderer = ({ element }: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'barcode' }>>) => (
  <span className="fmt-design-placeholder" data-print-role="barcode-placeholder">
    {element.barcodeType}
  </span>
);

const QrcodeRenderer = ({ element }: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'qrcode' }>>) => (
  <span className="fmt-design-placeholder" data-print-role="qrcode-placeholder">
    {`QR·${element.level}`}
  </span>
);

const LineRenderer = ({ element }: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'line' }>>) => (
  <span
    className="fmt-design-line"
    data-print-role="line"
    data-line-direction={element.direction}
  />
);

const RectRenderer = () => <span className="fmt-design-rect" data-print-role="rect" />;

const PageNumberRenderer = ({
  element,
}: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'pageNumber' }>>) => (
  <span className="fmt-design-pagenumber" data-print-role="page-number">
    {element.format ?? '${$page}/${$pages}'}
  </span>
);

const PrintDateRenderer = ({
  element,
}: PrintElementRendererProps<Extract<PrintElementSchema, { type: 'printDate' }>>) => (
  <span className="fmt-design-printdate" data-print-role="print-date">
    {element.format ?? 'YYYY-MM-DD HH:mm:ss'}
  </span>
);

const UnknownRenderer = ({ element }: PrintElementRendererProps) => (
  <span className="fmt-design-unknown" data-print-role="unknown-element">
    {String((element as { type?: string }).type ?? 'unknown')}
  </span>
);

export const PRINT_ELEMENT_RENDERERS: Record<PrintElementType, PrintElementRendererEntry> = {
  text: { component: TextRenderer },
  image: { component: ImageRenderer },
  table: { component: TableRenderer },
  barcode: { component: BarcodeRenderer },
  qrcode: { component: QrcodeRenderer },
  line: { component: LineRenderer },
  rect: { component: RectRenderer },
  pageNumber: { component: PageNumberRenderer },
  printDate: { component: PrintDateRenderer },
};

export function getPrintElementRenderer(type: string): PrintElementRendererComponent {
  const entry = (PRINT_ELEMENT_RENDERERS as Record<string, PrintElementRendererEntry | undefined>)[type];
  return entry ? entry.component : UnknownRenderer;
}

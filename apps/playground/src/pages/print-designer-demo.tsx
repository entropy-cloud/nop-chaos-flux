import { useState } from 'react';
import { Button } from '@nop-chaos/ui';
import {
  createEmptyPrintTemplate,
  exportPrintTemplateToPdf,
  printPrintTemplate,
  type PrintElementSchema,
  type PrintTemplateSchema,
} from '@nop-chaos/flux-print-core';
import { PrintDesigner } from '@nop-chaos/flux-print-renderers';

const ORDERS = Array.from({ length: 40 }, (_, index) => ({
  name: `货物-${index + 1}`,
  qty: String(index + 1),
  price: ((index + 1) * 12.5).toFixed(2),
}));

function a4OrderTemplate(): PrintTemplateSchema {
  const elements: PrintElementSchema[] = [
    { type: 'text', id: 'title', region: 'header', left: 0, top: 0, width: 120, height: 10, style: { fontSize: 18, fontWeight: 'bold' }, text: '出库单' },
    { type: 'text', id: 'order-no', region: 'header', left: 130, top: 2, width: 50, height: 8, style: {}, field: 'orderNo', text: '' },
    { type: 'table', id: 'items', region: 'body', left: 0, top: 5, width: 180, height: 60, style: {}, source: '${items}', rowHeight: 7,
      columns: [
        { label: '货名', field: 'name', width: 70 },
        { label: '数量', field: 'qty', width: 40, align: 'right' },
        { label: '金额', field: 'price', width: 50, align: 'right', format: { type: 'number', digits: 2, prefix: '¥' }, aggregate: 'sum' },
      ],
      footerAggregate: 'lastPage', repeatHeader: true } as PrintElementSchema,
    { type: 'qrcode', id: 'wx', region: 'footer', left: 150, top: 0, width: 16, height: 16, style: {}, level: 'M', value: 'https://example.com/order' },
    { type: 'pageNumber', id: 'pn', region: 'footer', left: 90, top: 2, width: 20, height: 6, style: {}, format: '${$page}/${$pages}' },
  ];
  return {
    ...createEmptyPrintTemplate('A4 出库单'),
    page: { paper: { width: 210, height: 297, direction: 'vertical', margins: [15, 15, 15, 15] }, paperName: 'a4', unit: 'mm', headerHeight: 18, footerHeight: 20 },
    elements,
    testData: { orderNo: 'CK-2026-0901', items: ORDERS },
  };
}

function receipt80Template(): PrintTemplateSchema {
  const elements: PrintElementSchema[] = [
    { type: 'text', id: 'shop', region: 'body', left: 12, top: 2, width: 56, height: 8, style: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' }, text: '收银小票' },
    { type: 'line', id: 'sep', region: 'body', left: 2, top: 12, width: 72, height: 1, style: {}, direction: 'horizontal' },
    { type: 'table', id: 'lines', region: 'body', left: 2, top: 15, width: 72, height: 40, style: {}, source: '${items}', rowHeight: 5,
      columns: [{ label: '项目', field: 'name' }, { label: '金额', field: 'price', align: 'right', format: { type: 'number', digits: 2 } }],
      footerAggregate: 'lastPage' } as PrintElementSchema,
    { type: 'barcode', id: 'code', region: 'body', left: 6, top: 62, width: 64, height: 12, style: {}, barcodeType: 'CODE128', textVisible: false, value: '202609060001' },
  ];
  return {
    ...createEmptyPrintTemplate('80mm 小票'),
    page: { paper: { width: 80, height: 120, direction: 'vertical', margins: [4, 4, 4, 4] }, paperName: 'custom', unit: 'mm' },
    elements,
    testData: { items: ORDERS.slice(0, 4).map((o) => ({ name: o.name, price: o.price })) },
  };
}

type OutputMessage = { level: 'error' | 'info'; text: string } | null;

export function PrintDesignerDemoPage() {
  const [template, setTemplate] = useState<PrintTemplateSchema>(a4OrderTemplate);
  const [templateKey, setTemplateKey] = useState(0);
  const [outputMessage, setOutputMessage] = useState<OutputMessage>(null);

  const switchTemplate = (kind: 'a4' | 'receipt') => {
    setTemplate(kind === 'a4' ? a4OrderTemplate() : receipt80Template());
    setTemplateKey((key) => key + 1);
    setOutputMessage(null);
  };

  const handlePrint = () => {
    try {
      printPrintTemplate(template, template.testData ?? {});
      setOutputMessage({ level: 'info', text: '已发送到打印机对话框' });
    } catch (error) {
      setOutputMessage({ level: 'error', text: `打印失败：${error instanceof Error ? error.message : String(error)}` });
    }
  };

  const handleExport = async () => {
    try {
      await exportPrintTemplateToPdf(template, template.testData ?? {}, { fileName: template.name });
      setOutputMessage({ level: 'info', text: 'PDF 已导出' });
    } catch (error) {
      setOutputMessage({ level: 'error', text: `导出失败：${error instanceof Error ? error.message : String(error)}` });
    }
  };

  return (
    <div className="p-4 space-y-3" data-testid="print-designer-demo">
      <div className="flex items-center gap-2" data-testid="print-demo-actions">
        <Button type="button" size="sm" variant={template.name.includes('A4') ? 'default' : 'outline'} onClick={() => switchTemplate('a4')}>A4 出库单</Button>
        <Button type="button" size="sm" variant={!template.name.includes('A4') ? 'default' : 'outline'} onClick={() => switchTemplate('receipt')}>80mm 小票</Button>
        <div className="flex-1" />
        <Button type="button" size="sm" onClick={handlePrint}>打印</Button>
        <Button type="button" size="sm" onClick={handleExport}>导出 PDF</Button>
      </div>
      {outputMessage ? (
        <div
          role="status"
          data-testid="print-demo-output"
          className={outputMessage.level === 'error' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
        >
          {outputMessage.text}
        </div>
      ) : null}
      <PrintDesigner
        key={templateKey}
        template={template}
        onTemplateChange={(next) => setTemplate(next)}
      />
    </div>
  );
}

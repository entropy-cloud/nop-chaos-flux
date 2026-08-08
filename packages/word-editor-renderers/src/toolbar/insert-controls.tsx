import { useState, useRef } from 'react';
import {
  Table,
  ImagePlus,
  Link2,
  SeparatorHorizontal,
  ArrowDownToLine,
  BarChart3,
  QrCode,
} from 'lucide-react';
import type { CanvasEditorBridge, DocChart, DocCode } from '@nop-chaos/word-editor-core';
import { t } from '@nop-chaos/flux-i18n';
import { useRendererEnv } from '@nop-chaos/flux-react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@nop-chaos/ui';
import { ToolbarButton, ToolbarGroup } from './shared.js';
import { ChartDialog } from '../dialogs/chart-dialog.js';
import { CodeDialog } from '../dialogs/code-dialog.js';

interface InsertControlsProps {
  bridge: CanvasEditorBridge | null;
  onChartSave?: (chart: DocChart) => void;
  onCodeSave?: (code: DocCode) => void;
}

export function InsertControls({ bridge, onChartSave, onCodeSave }: InsertControlsProps) {
  const env = useRendererEnv();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [hyperlinkUrl, setHyperlinkUrl] = useState('');
  const [hyperlinkDisplay, setHyperlinkDisplay] = useState('');

  const notifyInsertFailure = (error: unknown) => {
    env.notify?.(
      'warning',
      error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result as string;
        bridge?.command?.executeImage({
          value: dataUrl,
          width: 0,
          height: 0,
        });
      } catch (error) {
        notifyInsertFailure(error);
      }
    };
    reader.onerror = () => {
      notifyInsertFailure(reader.error ?? new Error('Image read failed'));
    };
    reader.onabort = () => {
      notifyInsertFailure(new Error('Image read aborted'));
    };
    reader.readAsDataURL(file);
  };

  const handleInsertHyperlink = () => {
    if (!hyperlinkUrl.trim()) return;
    bridge?.command?.executeHyperlink({
      valueList: [{ value: hyperlinkDisplay.trim() || hyperlinkUrl.trim() }],
      url: hyperlinkUrl.trim(),
    });
    setShowLinkDialog(false);
    setHyperlinkUrl('');
    setHyperlinkDisplay('');
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowLinkDialog(false);
      setHyperlinkUrl('');
      setHyperlinkDisplay('');
    }
  };

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon={Table}
        onClick={() => bridge?.command?.executeInsertTable(3, 3)}
        title="flux.wordEditor.insertTable"
        testId="insert-table"
      />
      <ToolbarButton
        icon={ImagePlus}
        onClick={() => imageInputRef.current?.click()}
        title="flux.wordEditor.insertImage"
        testId="insert-image"
      />
      <ToolbarButton
        icon={Link2}
        onClick={() => setShowLinkDialog(true)}
        title="flux.wordEditor.insertHyperlink"
        testId="insert-hyperlink"
      />
      <ToolbarButton
        icon={BarChart3}
        onClick={() => setShowChartDialog(true)}
        title="flux.wordEditor.insertChart"
        testId="insert-chart"
      />
      <ToolbarButton
        icon={QrCode}
        onClick={() => setShowCodeDialog(true)}
        title="flux.wordEditor.insertCode"
        testId="insert-code"
      />
      <ToolbarButton
        icon={SeparatorHorizontal}
        onClick={() => bridge?.command?.executeSeparator([])}
        title="flux.wordEditor.separator"
        testId="insert-separator"
      />
      <ToolbarButton
        icon={ArrowDownToLine}
        onClick={() => bridge?.command?.executePageBreak()}
        title="flux.wordEditor.pageBreak"
        testId="insert-page-break"
      />
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} hidden />
      <Dialog open={showLinkDialog} onOpenChange={handleDialogClose}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('flux.wordEditor.insertHyperlink')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Input
              aria-label={t('flux.wordEditor.displayText')}
              placeholder={t('flux.wordEditor.displayText')}
              value={hyperlinkDisplay}
              onChange={(e) => setHyperlinkDisplay(e.target.value)}
              size="sm"
            />
            <Input
              aria-label={t('flux.wordEditor.urlAriaLabel')}
              placeholder={t('flux.wordEditor.urlPlaceholder')}
              value={hyperlinkUrl}
              onChange={(e) => setHyperlinkUrl(e.target.value)}
              size="sm"
            />
          </DialogBody>
          <DialogFooter className="bg-transparent">
            <Button variant="ghost" size="sm" onClick={() => setShowLinkDialog(false)}>
              {t('flux.common.cancel')}
            </Button>
            <Button size="sm" onClick={handleInsertHyperlink} disabled={!hyperlinkUrl.trim()}>
              {t('flux.common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChartDialog
        open={showChartDialog}
        onClose={() => setShowChartDialog(false)}
        onSave={(chart) => {
          onChartSave?.(chart);
          setShowChartDialog(false);
        }}
      />

      <CodeDialog
        open={showCodeDialog}
        onClose={() => setShowCodeDialog(false)}
        onSave={(code) => {
          onCodeSave?.(code);
          setShowCodeDialog(false);
        }}
      />
    </ToolbarGroup>
  );
}

import { t } from '@nop-chaos/flux-i18n';
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core';
import type { EditorStoreApi } from '@nop-chaos/word-editor-core';
import type { EditorZone } from '@nop-chaos/word-editor-core';
import { Button, cn } from '@nop-chaos/ui';

interface ZoneControlsProps {
  bridge: CanvasEditorBridge | null;
  editorStore: EditorStoreApi;
  activeZone: EditorZone;
  isReady: boolean;
}

const ZONE_ITEMS: Array<{
  zone: EditorZone;
  labelKey: string;
  testId: string;
}> = [
  { zone: 'header', labelKey: 'flux.wordEditor.zoneHeader', testId: 'zone-toggle-header' },
  { zone: 'main', labelKey: 'flux.wordEditor.zoneMain', testId: 'zone-toggle-main' },
  { zone: 'footer', labelKey: 'flux.wordEditor.zoneFooter', testId: 'zone-toggle-footer' },
];

export function ZoneControls({ bridge, editorStore, activeZone, isReady }: ZoneControlsProps) {
  const executeSetZone = bridge?.command?.executeSetZone;
  const zoneApiAvailable = isReady && typeof executeSetZone === 'function';
  const unavailableTitle = t('flux.wordEditor.zoneUnavailable');

  return (
    <div className="flex items-center gap-0.5" data-slot="word-editor-zone-switcher">
      {ZONE_ITEMS.map(({ zone, labelKey, testId }) => {
        const label = t(labelKey);
        return (
          <Button
            key={zone}
            type="button"
            variant="ghost"
            size="xs"
            data-testid={testId}
            disabled={!zoneApiAvailable}
            aria-pressed={activeZone === zone}
            data-active={activeZone === zone ? 'true' : undefined}
            title={zoneApiAvailable ? label : unavailableTitle}
            onClick={() => {
              if (!zoneApiAvailable) {
                return;
              }
              editorStore.setActiveZone(zone);
              try {
                executeSetZone(zone);
              } catch {
                // canvas-editor may reject zone switches before a page surface exists
              }
            }}
            className={cn('flex-shrink-0', activeZone === zone && 'bg-accent text-accent-foreground')}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

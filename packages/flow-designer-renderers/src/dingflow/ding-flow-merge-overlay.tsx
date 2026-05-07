import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Plus } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import { BTN_DIAMETER } from './dingflow-constants.js';
import { DINGFLOW_PLUS_BUTTON_CLASSNAME } from './dingflow-theme.js';

interface DingFlowMergeOverlayProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowMergeOverlay({ onClick }: DingFlowMergeOverlayProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={DINGFLOW_PLUS_BUTTON_CLASSNAME}
      style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
      aria-label={t('flux.flowDesigner.addMergeNode')}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      <Plus size={16} />
    </Button>
  );
}

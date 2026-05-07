import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import { DINGFLOW_CONDITION_BADGE_CLASSNAME } from './dingflow-theme.js';

interface DingFlowAddConditionOverlayProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowAddBranchOverlay({ onClick }: DingFlowAddConditionOverlayProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={DINGFLOW_CONDITION_BADGE_CLASSNAME}
      aria-label={t('flux.flowDesigner.addBranch')}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      {t('flux.flowDesigner.addBranch')}
    </Button>
  );
}

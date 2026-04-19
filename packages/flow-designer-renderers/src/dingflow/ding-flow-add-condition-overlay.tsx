import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { DINGFLOW_CONDITION_BADGE_CLASSNAME } from './dingflow-theme';

interface DingFlowAddConditionOverlayProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowAddConditionOverlay({ onClick }: DingFlowAddConditionOverlayProps) {
  return (
    <div
      className={DINGFLOW_CONDITION_BADGE_CLASSNAME}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
    >
      {t('flux.flowDesigner.addCondition')}
    </div>
  );
}

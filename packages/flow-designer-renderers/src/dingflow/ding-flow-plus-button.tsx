import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Plus } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import { BTN_DIST, BTN_DIAMETER } from './dingflow-constants';
import { DINGFLOW_PLUS_BUTTON_CLASSNAME } from './dingflow-theme';

interface DingFlowPlusButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowPlusButton({ onClick }: DingFlowPlusButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={`absolute left-1/2 z-[2] -translate-x-1/2 cursor-pointer ${DINGFLOW_PLUS_BUTTON_CLASSNAME}`}
      style={{ width: BTN_DIAMETER, height: BTN_DIAMETER, bottom: -BTN_DIST }}
      aria-label={t('flux.flowDesigner.addNode')}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      <Plus size={16} />
    </Button>
  );
}

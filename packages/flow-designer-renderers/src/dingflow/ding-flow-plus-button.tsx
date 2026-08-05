import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Plus } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import { BTN_CENTER_DIST, BTN_DIAMETER } from './dingflow-constants.js';
import { DINGFLOW_PLUS_BUTTON_CLASSNAME } from './dingflow-theme.js';

interface DingFlowPlusButtonProps {
  onClick: (e: React.MouseEvent) => void;
  direction?: 'TB' | 'LR';
}

export function DingFlowPlusButton({ onClick, direction = 'TB' }: DingFlowPlusButtonProps) {
  const centerDistance = BTN_CENTER_DIST + BTN_DIAMETER / 2;
  const style =
    direction === 'LR'
      ? { width: BTN_DIAMETER, height: BTN_DIAMETER, right: -centerDistance }
      : { width: BTN_DIAMETER, height: BTN_DIAMETER, bottom: -centerDistance };
  return (
    <Button
      type="button"
      variant="ghost"
      className={`absolute z-[2] cursor-pointer ${DINGFLOW_PLUS_BUTTON_CLASSNAME}`}
      style={style}
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

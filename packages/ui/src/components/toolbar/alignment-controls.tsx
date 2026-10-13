import * as React from 'react';
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from 'lucide-react';
import { IconToggleControls } from './icon-toggle-controls.js';

type AlignKey = 'left' | 'center' | 'right';

interface AlignmentControlsProps {
  onAlign: (align: AlignKey) => void;
  getActive?: (align: AlignKey) => boolean;
  disabled?: boolean;
  className?: string;
}

const ALIGN_ITEMS = [
  { key: 'left' as const, Icon: AlignLeftIcon, label: 'Align Left' },
  { key: 'center' as const, Icon: AlignCenterIcon, label: 'Align Center' },
  { key: 'right' as const, Icon: AlignRightIcon, label: 'Align Right' },
];

function AlignmentControls({ onAlign, getActive, disabled, className }: AlignmentControlsProps) {
  return (
    <IconToggleControls
      items={ALIGN_ITEMS}
      onToggle={onAlign}
      getActive={getActive}
      disabled={disabled}
      className={className}
    />
  );
}

export { AlignmentControls, type AlignmentControlsProps };

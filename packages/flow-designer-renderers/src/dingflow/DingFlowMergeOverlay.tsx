import React from 'react';
import { Plus } from 'lucide-react';
import { BTN_DIAMETER } from './dingflow-constants';

interface DingFlowMergeOverlayProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowMergeOverlay({ onClick }: DingFlowMergeOverlayProps) {
  return (
    <div
      className="flex items-center justify-center cursor-pointer rounded-full bg-[#3296fa] text-white shadow-[0_2px_4px_rgba(50,150,250,0.4)]"
      style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
    >
      <Plus size={16} />
    </div>
  );
}

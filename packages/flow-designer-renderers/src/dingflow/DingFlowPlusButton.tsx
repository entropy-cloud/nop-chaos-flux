import React from 'react';
import { Plus } from 'lucide-react';
import { BTN_DIST, BTN_DIAMETER } from './dingflow-constants';

interface DingFlowPlusButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowPlusButton({ onClick }: DingFlowPlusButtonProps) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[2] flex items-center justify-center cursor-pointer rounded-full bg-[#3296fa] text-white shadow-[0_2px_4px_rgba(50,150,250,0.4)]"
      style={{ width: BTN_DIAMETER, height: BTN_DIAMETER, bottom: -BTN_DIST }}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
    >
      <Plus size={16} />
    </div>
  );
}

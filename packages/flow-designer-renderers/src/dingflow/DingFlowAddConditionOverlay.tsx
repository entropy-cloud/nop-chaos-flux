import React from 'react';

interface DingFlowAddConditionOverlayProps {
  onClick: (e: React.MouseEvent) => void;
}

export function DingFlowAddConditionOverlay({ onClick }: DingFlowAddConditionOverlayProps) {
  return (
    <div
      className="px-[14px] py-[4px] rounded-[20px] bg-white border border-[#b3e19d] text-[#67c23a] text-xs cursor-pointer whitespace-nowrap"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
    >
      Add Condition
    </div>
  );
}

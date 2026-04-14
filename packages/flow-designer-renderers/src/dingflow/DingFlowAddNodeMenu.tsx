import React from 'react';

export interface DingFlowMenuItem {
  type: string;
  color: string;
  icon: React.ReactNode;
  label: string;
}

interface DingFlowAddNodeMenuProps {
  screenX: number;
  screenY: number;
  items: DingFlowMenuItem[];
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function DingFlowAddNodeMenu({ screenX, screenY, items, onSelect, onClose }: DingFlowAddNodeMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className="fixed z-[101] flex gap-4 bg-white rounded-lg shadow-lg px-5 py-3"
        style={{ left: screenX - 100, top: screenY - 110 }}
      >
        {items.map((item) => (
          <button
            key={item.type}
            className="flex flex-col items-center gap-1 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelect(item.type); }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white"
              style={{ width: 50, height: 50, backgroundColor: item.color }}
            >
              {item.icon}
            </div>
            <span className="text-xs text-[#666]">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

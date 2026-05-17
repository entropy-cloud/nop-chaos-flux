import { Send, UserCheck } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import { type AddType, type PopoverState, COLORS } from './types.js';

interface AddNodeMenuProps {
  popover: PopoverState;
  onSelect: (type: AddType) => void;
  onClose: () => void;
}

export function AddNodeMenu({ popover, onSelect, onClose }: AddNodeMenuProps) {
  const items: { type: AddType; color: string; icon: React.ReactNode; label: string }[] = [
    { type: 'approver', color: COLORS.approval, icon: <UserCheck size={20} />, label: 'Approver' },
    { type: 'cc', color: COLORS.cc, icon: <Send size={20} />, label: 'CC' },
    {
      type: 'condition',
      color: COLORS.condition,
      icon: <span className="text-xs font-bold">Cond</span>,
      label: 'Condition',
    },
  ];

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="fixed inset-0 z-[100]"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <div
        className="fixed z-[101] flex gap-4 bg-white rounded-lg shadow-lg px-5 py-3"
        style={{ left: popover.screenX - 100, top: popover.screenY - 110 }}
      >
        {items.map((item) => (
          <Button
            key={item.type}
            type="button"
            variant="ghost"
            className="h-auto flex-col gap-1 px-0 py-0"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.type);
            }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white"
              style={{ width: 50, height: 50, backgroundColor: item.color }}
            >
              {item.icon}
            </div>
            <span className="text-xs text-[#666]">{item.label}</span>
          </Button>
        ))}
      </div>
    </>
  );
}

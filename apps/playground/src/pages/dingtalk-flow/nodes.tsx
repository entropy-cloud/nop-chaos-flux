import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus, Send, User, UserCheck } from 'lucide-react';
import { cn } from '@nop-chaos/ui';
import {
  type ApprovalData,
  type CondData,
  BTN_DIAMETER,
  BTN_DIST,
  CARD_H,
  COLORS,
  END_W,
  TITLE_H,
  W,
} from './types.js';

export let onPlusClick: ((sourceId: string, clientX: number, clientY: number) => void) | null =
  null;

export function setOnPlusClick(handler: typeof onPlusClick) {
  onPlusClick = handler;
}

const ICONS: Record<string, React.ReactNode> = {
  user: <User size={14} />,
  usercheck: <UserCheck size={14} />,
  send: <Send size={14} />,
};

export function AddBtn() {
  return (
    <div
      className={cn(
        'flex items-center justify-center cursor-pointer',
        'rounded-full bg-[#3296fa] text-white',
        'shadow-[0_2px_4px_rgba(50,150,250,0.4)]',
      )}
      style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
    >
      <Plus size={16} />
    </div>
  );
}

function ApprovalNodeInner({ id, data }: NodeProps) {
  const d = data as unknown as ApprovalData;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        className={cn(
          'overflow-hidden bg-white cursor-pointer',
          'rounded shadow-[0_2px_5px_0_rgba(0,0,0,0.1)]',
        )}
        style={{ width: W, minHeight: CARD_H }}
      >
        <div
          className="flex items-center text-white text-xs font-medium pl-4 pr-[30px] gap-[5px]"
          style={{ height: TITLE_H, backgroundColor: d.color }}
        >
          <span className="flex items-center">{ICONS[d.icon]}</span>
          <span>{d.label}</span>
        </div>
        <div className="p-[15px] text-[13px] text-[#666]">{d.desc}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      {d.showAddBtn && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[2]"
          style={{ bottom: -BTN_DIST }}
          onClick={(e) => {
            e.stopPropagation();
            onPlusClick?.(id, e.clientX, e.clientY);
          }}
        >
          <AddBtn />
        </div>
      )}
    </div>
  );
}

function CondNodeInner({ id, data }: NodeProps) {
  const d = data as unknown as CondData;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        className={cn('bg-white cursor-pointer', 'rounded shadow-[0_2px_5px_0_rgba(0,0,0,0.1)]')}
        style={{ width: W, minHeight: CARD_H, padding: 15 }}
      >
        <div className="flex items-center justify-between leading-[16px]">
          <span className="text-[13px] font-medium" style={{ color: COLORS.condition }}>
            {d.title}
          </span>
          <span className="text-[12px] text-[#999]">P{d.priority}</span>
        </div>
        <div className="pt-[10px] text-[13px] text-[#666]">{d.desc}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      {d.showAddBtn && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[2]"
          style={{ bottom: -BTN_DIST }}
          onClick={(e) => {
            e.stopPropagation();
            onPlusClick?.(id, e.clientX, e.clientY);
          }}
        >
          <AddBtn />
        </div>
      )}
    </div>
  );
}

function EndNodeInner() {
  return (
    <div className="relative" style={{ width: END_W }}>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="flex flex-col items-center">
        <div className="w-[10px] h-[10px] rounded-full bg-[#ccc]" />
        <span className="text-[12px] mt-[5px] text-[rgba(25,31,37,0.4)]">End</span>
      </div>
    </div>
  );
}

export const ApprovalNode = memo(ApprovalNodeInner);
export const CondNode = memo(CondNodeInner);
export const EndNode = memo(EndNodeInner);

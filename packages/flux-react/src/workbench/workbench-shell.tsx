import React, { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';

export interface WorkbenchShellProps {
  className?: string;
  style?: CSSProperties;
  density?: 'default' | 'flush';
  header?: ReactNode;
  leftPanel?: ReactNode;
  leftCollapsed?: boolean;
  onLeftToggle?: () => void;
  leftLabel?: string;
  canvas: ReactNode;
  rightPanel?: ReactNode;
  rightCollapsed?: boolean;
  onRightToggle?: () => void;
  rightLabel?: string;
  dialogs?: ReactNode;
  'data-testid'?: string;
  'data-cid'?: string;
}

const PANEL_CARD = 'min-h-0 overflow-hidden rounded-xl border border-border shadow-sm';
const COLLAPSED_RAIL =
  'h-full w-full rounded-xl border border-border shadow-sm px-1.5 text-muted-foreground hover:text-foreground';

export function WorkbenchShell({
  className,
  style,
  density = 'default',
  header,
  leftPanel,
  leftCollapsed = false,
  onLeftToggle,
  leftLabel = 'Expand left panel',
  canvas,
  rightPanel,
  rightCollapsed = false,
  onRightToggle,
  rightLabel = 'Expand right panel',
  dialogs,
  'data-testid': testId,
  'data-cid': cid,
}: WorkbenchShellProps) {
  const hasLeft = leftPanel !== undefined;
  const hasRight = rightPanel !== undefined;
  const hasBoth = hasLeft && hasRight;

  const gridColsClass = useMemo(() => {
    if (!hasLeft && !hasRight) return 'grid-cols-1';
    if (hasLeft && !hasRight) {
      return leftCollapsed ? 'grid-cols-[2rem_minmax(0,1fr)]' : 'grid-cols-[15rem_minmax(0,1fr)]';
    }
    if (!hasLeft && hasRight) {
      return rightCollapsed ? 'grid-cols-[minmax(0,1fr)_2rem]' : 'grid-cols-[minmax(0,1fr)_22rem]';
    }
    if (leftCollapsed && rightCollapsed) return 'grid-cols-[2rem_minmax(0,1fr)_2rem]';
    if (leftCollapsed) return 'grid-cols-[2rem_minmax(0,1fr)_22rem]';
    if (rightCollapsed) return 'grid-cols-[15rem_minmax(0,1fr)_2rem]';
    return 'grid-cols-[15rem_minmax(0,1fr)_22rem]';
  }, [hasLeft, hasRight, leftCollapsed, rightCollapsed]);

  return (
    <div
      className={cn(
        'nop-workbench grid grid-rows-[auto_minmax(0,1fr)] h-full min-h-0 gap-3',
        density === 'default' ? 'p-6' : 'p-0',
        className,
      )}
      style={style}
      data-testid={testId}
      data-cid={cid}
    >
      {header !== undefined && (
        <div data-slot="workbench-header" className="min-h-0">
          {header}
        </div>
      )}
      <div
        data-testid="workbench-body"
        className={cn(
          'grid grid-rows-1 gap-3 min-h-0 h-full',
          gridColsClass,
          hasBoth && 'max-[1023px]:grid-cols-[15rem_minmax(0,1fr)]',
          hasBoth && 'max-[1023px]:[&>*:nth-child(3)]:hidden',
          hasBoth && 'max-[767px]:grid-cols-1',
          hasBoth && 'max-[767px]:[&>*:first-child]:hidden',
        )}
        >
          {hasLeft &&
            (leftCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                className={cn(COLLAPSED_RAIL, 'justify-end')}
                onClick={onLeftToggle}
                aria-label={leftLabel}
                data-slot="workbench-left-panel"
                data-testid="left-panel-collapsed"
              >
                <span
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background"
                  data-testid="expand-left-panel"
                >
                  <ChevronRight className="size-4" />
                </span>
              </Button>
          ) : (
            <div
              className={cn(PANEL_CARD)}
              data-slot="workbench-left-panel"
              data-testid="left-panel-expanded"
            >
              {leftPanel}
            </div>
          ))}
        <div
          className={cn(PANEL_CARD, 'relative')}
          data-slot="workbench-canvas"
          data-testid="canvas"
        >
          {canvas}
        </div>
        {hasRight &&
          (rightCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                className={cn(COLLAPSED_RAIL, 'justify-start')}
                onClick={onRightToggle}
                aria-label={rightLabel}
                data-slot="workbench-right-panel"
                data-testid="right-panel-collapsed"
              >
                <span
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background"
                  data-testid="expand-right-panel"
                >
                  <ChevronLeft className="size-4" />
                </span>
              </Button>
          ) : (
            <div
              className={cn(PANEL_CARD)}
              data-slot="workbench-right-panel"
              data-testid="right-panel-expanded"
            >
              {rightPanel}
            </div>
          ))}
      </div>
      {dialogs !== undefined && (
        <div data-slot="workbench-dialogs" className="relative">
          {dialogs}
        </div>
      )}
    </div>
  );
}

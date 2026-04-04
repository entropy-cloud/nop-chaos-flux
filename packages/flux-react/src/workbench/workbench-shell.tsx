import React, { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';

export interface WorkbenchShellProps {
  className?: string;
  style?: CSSProperties;
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
}

const PANEL_CARD = 'min-h-0 overflow-hidden rounded-xl border border-border shadow-sm';

export function WorkbenchShell({
  className,
  style,
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
}: WorkbenchShellProps) {
  const hasLeft = leftPanel !== undefined;
  const hasRight = rightPanel !== undefined;
  const hasBoth = hasLeft && hasRight;

  const gridColsClass = useMemo(() => {
    if (!hasLeft && !hasRight) return 'grid-cols-1';
    if (hasLeft && !hasRight) {
      return leftCollapsed
        ? 'grid-cols-[2rem_minmax(0,1fr)]'
        : 'grid-cols-[15rem_minmax(0,1fr)]';
    }
    if (!hasLeft && hasRight) {
      return rightCollapsed
        ? 'grid-cols-[minmax(0,1fr)_2rem]'
        : 'grid-cols-[minmax(0,1fr)_22rem]';
    }
    if (leftCollapsed && rightCollapsed) return 'grid-cols-[2rem_minmax(0,1fr)_2rem]';
    if (leftCollapsed) return 'grid-cols-[2rem_minmax(0,1fr)_22rem]';
    if (rightCollapsed) return 'grid-cols-[15rem_minmax(0,1fr)_2rem]';
    return 'grid-cols-[15rem_minmax(0,1fr)_22rem]';
  }, [hasLeft, hasRight, leftCollapsed, rightCollapsed]);

  return (
    <div
      className={cn(
        'nop-workbench grid grid-rows-[auto_minmax(0,1fr)] h-full min-h-0 gap-3 p-6',
        className,
      )}
      style={style}
      data-testid={testId}
    >
      {header !== undefined && (
        <div className="nop-workbench__header min-h-0">
          {header}
        </div>
      )}
      <div
        className={cn(
          'grid grid-rows-1 gap-3 min-h-0 h-full',
          gridColsClass,
          hasBoth && 'max-[1023px]:grid-cols-[15rem_minmax(0,1fr)]',
          hasBoth && 'max-[1023px]:[&>*:nth-child(3)]:hidden',
          hasBoth && 'max-[767px]:grid-cols-1',
          hasBoth && 'max-[767px]:[&>*:first-child]:hidden',
        )}
      >
        {hasLeft && (
          leftCollapsed ? (
            <div
              className={cn(PANEL_CARD, 'nop-workbench__left-panel flex items-center justify-center')}
              data-testid="left-panel-collapsed"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onLeftToggle}
                aria-label={leftLabel}
                data-testid="expand-left-panel"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(PANEL_CARD, 'nop-workbench__left-panel')}
              data-testid="left-panel-expanded"
            >
              {leftPanel}
            </div>
          )
        )}
        <div
          className={cn(PANEL_CARD, 'nop-workbench__canvas relative')}
          data-testid="canvas"
        >
          {canvas}
        </div>
        {hasRight && (
          rightCollapsed ? (
            <div
              className={cn(PANEL_CARD, 'nop-workbench__right-panel flex items-center justify-center')}
              data-testid="right-panel-collapsed"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onRightToggle}
                aria-label={rightLabel}
                data-testid="expand-right-panel"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(PANEL_CARD, 'nop-workbench__right-panel')}
              data-testid="right-panel-expanded"
            >
              {rightPanel}
            </div>
          )
        )}
      </div>
      {dialogs !== undefined && (
        <div className="nop-workbench__dialogs relative">{dialogs}</div>
      )}
    </div>
  );
}

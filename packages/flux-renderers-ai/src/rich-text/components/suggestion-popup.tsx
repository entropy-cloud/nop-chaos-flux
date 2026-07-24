import { Button, cn } from '@nop-chaos/ui';

export interface PopupItem {
  key: string;
  label: string;
  onSelect: () => void;
}

/**
 * Suggestion popup (shared by @mention + slash). Renders a filtered list of
 * items anchored below the editor surface. Keyboard navigation is handled by
 * the editor's `handleKeyDown` (which calls the popup controls); clicking an
 * item selects it directly.
 */
export function SuggestionPopup({
  kind,
  items,
  activeIndex,
  onHover,
  onSelect,
  onClose,
}: {
  kind: 'mention' | 'slash';
  items: PopupItem[];
  activeIndex: number;
  /**
   * N-1: hover preview — moving the pointer over an item updates the
   * highlighted (active) item only. Distinct from `onSelect`, which commits.
   * Previously `onMouseEnter` and `onClick` both bound `onSelect`, so merely
   * hovering a candidate inserted it (Failure Path FP-1).
   */
  onHover?: (idx: number) => void;
  onSelect: (idx: number) => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'nop-ai-sender-tiptap-popup absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
      )}
      data-slot="ai-sender-tiptap-popup"
      data-popup-kind={kind}
      role="listbox"
      aria-label={kind === 'mention' ? 'Mentions' : 'Slash commands'}
    >
      {items.map((item, idx) => (
        <Button
          key={item.key}
          type="button"
          variant="ghost"
          size="sm"
          role="option"
          aria-selected={idx === activeIndex}
          data-active={idx === activeIndex ? '' : undefined}
          onMouseEnter={() => onHover?.(idx)}
          onClick={() => onSelect(idx)}
          className={cn('h-7 w-full justify-start text-xs', idx === activeIndex && 'bg-accent text-accent-foreground')}
        >
          {item.label}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Close suggestions"
        onClick={onClose}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

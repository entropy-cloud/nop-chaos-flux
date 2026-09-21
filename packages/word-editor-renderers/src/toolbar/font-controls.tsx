import { useMemo, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Undo2,
  Redo2,
  Paintbrush,
} from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core';
import type { EditorSelectionState } from '@nop-chaos/word-editor-core';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Input,
  cn,
} from '@nop-chaos/ui';
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from './shared.js';

interface FontControlsProps {
  bridge: CanvasEditorBridge | null;
  selection: EditorSelectionState;
}

const FONTS = ['Microsoft YaHei', 'SimSun', 'SimHei', 'Arial', 'Times New Roman', 'Courier New'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const MIN_FONT_SIZE = 5;
const MAX_FONT_SIZE = 72;
const DEFAULT_FONT = FONTS[0];

function runCommand(action: () => void) {
  try {
    action();
  } catch {
    // canvas-editor may reject style commands when no editable range is active yet
  }
}

function clampFontSize(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(parsed)));
}

function withCurrentValueAsFreeValue<T>(options: T[], current: T): T[] {
  return options.includes(current) ? options : [...options, current];
}

export function FontControls({ bridge, selection }: FontControlsProps) {
  const command = bridge?.command;
  const highlightedItemRef = useRef<string | number | null>(null);

  const currentFont = selection.font || DEFAULT_FONT;
  const fontItems = useMemo(() => withCurrentValueAsFreeValue(FONTS, currentFont), [currentFont]);

  const currentSize = selection.size;
  const sizeItems = useMemo(() => withCurrentValueAsFreeValue(FONT_SIZES, currentSize), [currentSize]);

  const commitFontInput = (raw: string) => {
    if (highlightedItemRef.current != null) {
      return;
    }
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === currentFont) {
      return;
    }
    runCommand(() => command?.executeFont(trimmed));
  };

  const commitSizeInput = (raw: string) => {
    if (highlightedItemRef.current != null) {
      return;
    }
    const clamped = clampFontSize(raw);
    if (clamped == null || clamped === currentSize) {
      return;
    }
    runCommand(() => command?.executeSize(clamped));
  };

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon={Undo2}
        onClick={() => runCommand(() => command?.executeUndo())}
        disabled={!selection.undo}
        title="flux.wordEditor.undo"
        testId="toolbar-undo"
      />
      <ToolbarButton
        icon={Redo2}
        onClick={() => runCommand(() => command?.executeRedo())}
        disabled={!selection.redo}
        title="flux.wordEditor.redo"
        testId="toolbar-redo"
      />
      <ToolbarSeparator />
      <ToolbarButton
        icon={Paintbrush}
        onClick={() => runCommand(() => command?.executePainter({ isDblclick: false }))}
        title="flux.wordEditor.formatPainter"
      />
      <ToolbarSeparator />
      <Combobox
        items={fontItems}
        value={currentFont}
        onValueChange={(item) => {
          highlightedItemRef.current = null;
          if (typeof item === 'string') {
            runCommand(() => command?.executeFont(item));
          }
        }}
        onItemHighlighted={(item) => {
          highlightedItemRef.current = typeof item === 'string' ? item : null;
        }}
      >
        <ComboboxInput
          data-testid="toolbar-font-input"
          aria-label={t('flux.wordEditor.font')}
          title={t('flux.wordEditor.font')}
          className="h-7 text-xs min-w-[110px] max-w-[150px] flex-shrink-0"
          showClear={false}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitFontInput((event.target as HTMLInputElement).value);
            }
          }}
          onBlur={(event) => commitFontInput((event.target as HTMLInputElement).value)}
        />
        <ComboboxContent className="w-auto min-w-[180px]">
          <ComboboxEmpty>{t('flux.wordEditor.noMatchFont')}</ComboboxEmpty>
          <ComboboxList>
            {(font: string) => (
              <ComboboxItem key={font} value={font}>
                <span style={{ fontFamily: font }}>{font}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Combobox
        items={sizeItems}
        value={currentSize}
        onValueChange={(item) => {
          highlightedItemRef.current = null;
          if (typeof item === 'number') {
            runCommand(() => command?.executeSize(item));
          }
        }}
        onItemHighlighted={(item) => {
          highlightedItemRef.current = typeof item === 'number' ? item : null;
        }}
      >
        <ComboboxInput
          data-testid="toolbar-size-input"
          aria-label={t('flux.wordEditor.fontSize')}
          title={t('flux.wordEditor.fontSize')}
          className="h-7 text-xs w-14 flex-shrink-0"
          showClear={false}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitSizeInput((event.target as HTMLInputElement).value);
            }
          }}
          onBlur={(event) => commitSizeInput((event.target as HTMLInputElement).value)}
        />
        <ComboboxContent className="w-auto min-w-[80px]">
          <ComboboxEmpty>{t('flux.wordEditor.noMatchFontSize')}</ComboboxEmpty>
          <ComboboxList>
            {(size: number) => (
              <ComboboxItem key={size} value={size}>
                <span className="tabular-nums">{size}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <ToolbarButton
        icon={Bold}
        onClick={() => runCommand(() => command?.executeBold())}
        active={selection.bold}
        title="flux.wordEditor.bold"
        testId="toolbar-bold"
      />
      <ToolbarButton
        icon={Italic}
        onClick={() => runCommand(() => command?.executeItalic())}
        active={selection.italic}
        title="flux.wordEditor.italic"
        testId="toolbar-italic"
      />
      <ToolbarButton
        icon={Underline}
        onClick={() => runCommand(() => command?.executeUnderline())}
        active={selection.underline}
        title="flux.wordEditor.underline"
        testId="toolbar-underline"
      />
      <ToolbarButton
        icon={Strikethrough}
        onClick={() => runCommand(() => command?.executeStrikeout())}
        active={selection.strikeout}
        title="flux.wordEditor.strikethrough"
      />
      <ToolbarButton
        icon={Superscript}
        onClick={() => runCommand(() => command?.executeSuperscript())}
        active={selection.superscript}
        title="flux.wordEditor.superscript"
      />
      <ToolbarButton
        icon={Subscript}
        onClick={() => runCommand(() => command?.executeSubscript())}
        active={selection.subscript}
        title="flux.wordEditor.subscript"
      />
      <ToolbarSeparator />
      <Input
        type="color"
        value={selection.color || '#000000'}
        onChange={(e) => runCommand(() => command?.executeColor(e.target.value))}
        className={cn('w-7 h-7 cursor-pointer flex-shrink-0 border rounded')}
        title={t('flux.wordEditor.textColor')}
        aria-label={t('flux.wordEditor.textColor')}
      />
      <Input
        type="color"
        value={selection.highlight || '#ffff00'}
        onChange={(e) => runCommand(() => command?.executeHighlight(e.target.value))}
        className={cn('w-7 h-7 cursor-pointer flex-shrink-0 border rounded')}
        title={t('flux.wordEditor.highlightColor')}
        aria-label={t('flux.wordEditor.highlightColor')}
      />
    </ToolbarGroup>
  );
}

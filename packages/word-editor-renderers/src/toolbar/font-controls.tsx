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
import { Input, NativeSelect, NativeSelectOption, cn } from '@nop-chaos/ui';
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from './shared.js';

interface FontControlsProps {
  bridge: CanvasEditorBridge | null;
  selection: EditorSelectionState;
}

const FONTS = ['Microsoft YaHei', 'SimSun', 'SimHei', 'Arial', 'Times New Roman', 'Courier New'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

function runCommand(action: () => void) {
  try {
    action();
  } catch {
    // canvas-editor may reject style commands when no editable range is active yet
  }
}

export function FontControls({ bridge, selection }: FontControlsProps) {
  const command = bridge?.command;

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon={Undo2}
        onClick={() => runCommand(() => command?.executeUndo())}
        disabled={!selection.undo}
        title="flux.wordEditor.undo"
      />
      <ToolbarButton
        icon={Redo2}
        onClick={() => runCommand(() => command?.executeRedo())}
        disabled={!selection.redo}
        title="flux.wordEditor.redo"
      />
      <ToolbarSeparator />
      <ToolbarButton
        icon={Paintbrush}
        onClick={() => runCommand(() => command?.executePainter({ isDblclick: false }))}
        title="flux.wordEditor.formatPainter"
      />
      <ToolbarSeparator />
      <NativeSelect
        value={selection.font || 'Microsoft YaHei'}
        onChange={(e) => runCommand(() => command?.executeFont(e.target.value))}
        title={t('flux.wordEditor.font')}
        size="xs"
        className="flex-shrink-0 max-w-[130px]"
      >
        {FONTS.map((font) => (
          <NativeSelectOption key={font} value={font}>
            {font}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        value={selection.size}
        onChange={(e) => runCommand(() => command?.executeSize(Number(e.target.value)))}
        title={t('flux.wordEditor.fontSize')}
        size="xs"
        className="flex-shrink-0 w-14"
      >
        {FONT_SIZES.map((size) => (
          <NativeSelectOption key={size} value={size}>
            {size}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ToolbarButton
        icon={Bold}
        onClick={() => runCommand(() => command?.executeBold())}
        active={selection.bold}
        title="flux.wordEditor.bold"
      />
      <ToolbarButton
        icon={Italic}
        onClick={() => runCommand(() => command?.executeItalic())}
        active={selection.italic}
        title="flux.wordEditor.italic"
      />
      <ToolbarButton
        icon={Underline}
        onClick={() => runCommand(() => command?.executeUnderline())}
        active={selection.underline}
        title="flux.wordEditor.underline"
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

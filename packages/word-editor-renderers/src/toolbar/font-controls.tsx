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
        title="Undo"
      />
      <ToolbarButton
        icon={Redo2}
        onClick={() => runCommand(() => command?.executeRedo())}
        disabled={!selection.redo}
        title="Redo"
      />
      <ToolbarSeparator />
      <ToolbarButton
        icon={Paintbrush}
        onClick={() => runCommand(() => command?.executePainter({ isDblclick: false }))}
        title="Format Painter"
      />
      <ToolbarSeparator />
      <NativeSelect
        value={selection.font || 'Microsoft YaHei'}
        onChange={(e) => runCommand(() => command?.executeFont(e.target.value))}
        title="Font"
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
        title="Font Size"
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
        title="Bold"
      />
      <ToolbarButton
        icon={Italic}
        onClick={() => runCommand(() => command?.executeItalic())}
        active={selection.italic}
        title="Italic"
      />
      <ToolbarButton
        icon={Underline}
        onClick={() => runCommand(() => command?.executeUnderline())}
        active={selection.underline}
        title="Underline"
      />
      <ToolbarButton
        icon={Strikethrough}
        onClick={() => runCommand(() => command?.executeStrikeout())}
        active={selection.strikeout}
        title="Strikethrough"
      />
      <ToolbarButton
        icon={Superscript}
        onClick={() => runCommand(() => command?.executeSuperscript())}
        active={selection.superscript}
        title="Superscript"
      />
      <ToolbarButton
        icon={Subscript}
        onClick={() => runCommand(() => command?.executeSubscript())}
        active={selection.subscript}
        title="Subscript"
      />
      <ToolbarSeparator />
      <Input
        type="color"
        value={selection.color || '#000000'}
        onChange={(e) => runCommand(() => command?.executeColor(e.target.value))}
        className={cn('w-7 h-7 cursor-pointer flex-shrink-0 border rounded')}
        title="Text Color"
        aria-label="Text Color"
      />
      <Input
        type="color"
        value={selection.highlight || '#ffff00'}
        onChange={(e) => runCommand(() => command?.executeHighlight(e.target.value))}
        className={cn('w-7 h-7 cursor-pointer flex-shrink-0 border rounded')}
        title="Highlight Color"
        aria-label="Highlight Color"
      />
    </ToolbarGroup>
  );
}

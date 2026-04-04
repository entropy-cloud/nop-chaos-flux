import { Bold, Italic, Underline, Strikethrough, Superscript, Subscript, Undo2, Redo2, Paintbrush } from 'lucide-react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import type { EditorSelectionState } from '@nop-chaos/word-editor-core'
import { NativeSelect, NativeSelectOption, cn } from '@nop-chaos/ui'
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from './shared.js'

interface FontControlsProps {
  bridge: CanvasEditorBridge | null
  selection: EditorSelectionState
}

const FONTS = ['Microsoft YaHei', 'SimSun', 'SimHei', 'Arial', 'Times New Roman', 'Courier New']
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]

export function FontControls({ bridge, selection }: FontControlsProps) {
  return (
    <ToolbarGroup>
      <ToolbarButton icon={Undo2} onClick={() => bridge?.command?.executeUndo()} disabled={!selection.undo} title="Undo" />
      <ToolbarButton icon={Redo2} onClick={() => bridge?.command?.executeRedo()} disabled={!selection.redo} title="Redo" />
      <ToolbarSeparator />
      <ToolbarButton icon={Paintbrush} onClick={() => bridge?.command?.executePainter({ isDblclick: false })} title="Format Painter" />
      <ToolbarSeparator />
      <NativeSelect
        value={selection.font || 'Microsoft YaHei'}
        onChange={(e) => bridge?.command?.executeFont(e.target.value)}
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
        onChange={(e) => bridge?.command?.executeSize(Number(e.target.value))}
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
        onClick={() => bridge?.command?.executeBold()}
        active={selection.bold}
        title="Bold"
      />
      <ToolbarButton
        icon={Italic}
        onClick={() => bridge?.command?.executeItalic()}
        active={selection.italic}
        title="Italic"
      />
      <ToolbarButton
        icon={Underline}
        onClick={() => bridge?.command?.executeUnderline()}
        active={selection.underline}
        title="Underline"
      />
      <ToolbarButton
        icon={Strikethrough}
        onClick={() => bridge?.command?.executeStrikeout()}
        active={selection.strikeout}
        title="Strikethrough"
      />
      <ToolbarButton
        icon={Superscript}
        onClick={() => bridge?.command?.executeSuperscript()}
        active={selection.superscript}
        title="Superscript"
      />
      <ToolbarButton
        icon={Subscript}
        onClick={() => bridge?.command?.executeSubscript()}
        active={selection.subscript}
        title="Subscript"
      />
      <ToolbarSeparator />
      <input
        type="color"
        value={selection.color || '#000000'}
        onChange={(e) => bridge?.command?.executeColor(e.target.value)}
        className={cn('w-7 h-7 cursor-pointer flex-shrink-0 border rounded')}
        title="Text Color"
      />
      <input
        type="color"
        value={selection.highlight || '#ffff00'}
        onChange={(e) => bridge?.command?.executeHighlight(e.target.value)}
        className={cn('w-7 h-7 cursor-pointer flex-shrink-0 border rounded')}
        title="Highlight Color"
      />
    </ToolbarGroup>
  )
}

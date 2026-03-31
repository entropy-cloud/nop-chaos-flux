import { AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered } from 'lucide-react'
import type { CanvasEditorBridge, EditorSelectionState } from '@nop-chaos/word-editor-core'
import { RowFlex, TitleLevel, ListType } from '@nop-chaos/word-editor-core'
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from './shared.js'

interface ParagraphControlsProps {
  bridge: CanvasEditorBridge | null
  selection: EditorSelectionState
}

const HEADING_LEVELS: { label: string; value: string }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'H1', value: 'first' },
  { label: 'H2', value: 'second' },
  { label: 'H3', value: 'third' },
  { label: 'H4', value: 'fourth' },
  { label: 'H5', value: 'fifth' },
  { label: 'H6', value: 'sixth' }
]

const LINE_SPACINGS = [1, 1.15, 1.5, 2, 2.5, 3]

export function ParagraphControls({ bridge, selection }: ParagraphControlsProps) {
  return (
    <ToolbarGroup>
      <ToolbarButton
        icon={AlignLeft}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.LEFT)}
        active={selection.rowFlex === RowFlex.LEFT}
        title="Align Left"
      />
      <ToolbarButton
        icon={AlignCenter}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.CENTER)}
        active={selection.rowFlex === RowFlex.CENTER}
        title="Center"
      />
      <ToolbarButton
        icon={AlignRight}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.RIGHT)}
        active={selection.rowFlex === RowFlex.RIGHT}
        title="Align Right"
      />
      <ToolbarButton
        icon={AlignJustify}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.JUSTIFY)}
        active={selection.rowFlex === RowFlex.JUSTIFY}
        title="Justify"
      />
      <ToolbarSeparator />
      <select
        value={selection.level ?? 'normal'}
        onChange={(e) => {
          const value = e.target.value
          bridge?.command?.executeTitle(value === 'normal' ? null : (value as TitleLevel))
        }}
        className="border rounded text-sm px-1.5 py-1 max-w-[90px]"
        title="Heading Level"
      >
        {HEADING_LEVELS.map((h) => (
          <option key={h.value} value={h.value}>
            {h.label}
          </option>
        ))}
      </select>
      <ToolbarSeparator />
      <ToolbarButton
        icon={List}
        onClick={() => bridge?.command?.executeList(ListType.UL)}
        active={selection.listType === ListType.UL}
        title="Bullet List"
      />
      <ToolbarButton
        icon={ListOrdered}
        onClick={() => bridge?.command?.executeList(ListType.OL)}
        active={selection.listType === ListType.OL}
        title="Numbered List"
      />
      <ToolbarSeparator />
      <select
        value={selection.rowMargin || 1}
        onChange={(e) => bridge?.command?.executeRowMargin(Number(e.target.value))}
        className="border rounded text-sm px-1.5 py-1 w-16"
        title="Line Spacing"
      >
        {LINE_SPACINGS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>
    </ToolbarGroup>
  )
}

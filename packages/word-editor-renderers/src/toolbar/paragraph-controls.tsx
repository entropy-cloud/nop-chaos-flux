import { AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered } from 'lucide-react';
import type { CanvasEditorBridge, EditorSelectionState } from '@nop-chaos/word-editor-core';
import { RowFlex, TitleLevel, ListType } from '@nop-chaos/word-editor-core';
import { t } from '@nop-chaos/flux-i18n';
import { NativeSelect, NativeSelectOption } from '@nop-chaos/ui';
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from './shared.js';

interface ParagraphControlsProps {
  bridge: CanvasEditorBridge | null;
  selection: EditorSelectionState;
}

const HEADING_LEVELS: { labelKey: string; value: string }[] = [
  { labelKey: 'flux.wordEditor.headingNormal', value: 'normal' },
  { labelKey: 'flux.wordEditor.headingH1', value: 'first' },
  { labelKey: 'flux.wordEditor.headingH2', value: 'second' },
  { labelKey: 'flux.wordEditor.headingH3', value: 'third' },
  { labelKey: 'flux.wordEditor.headingH4', value: 'fourth' },
  { labelKey: 'flux.wordEditor.headingH5', value: 'fifth' },
  { labelKey: 'flux.wordEditor.headingH6', value: 'sixth' },
];

const LINE_SPACINGS = [1, 1.15, 1.5, 2, 2.5, 3];

export function ParagraphControls({ bridge, selection }: ParagraphControlsProps) {
  return (
    <ToolbarGroup>
      <ToolbarButton
        icon={AlignLeft}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.LEFT)}
        active={selection.rowFlex === RowFlex.LEFT}
        title="flux.wordEditor.alignLeft"
        testId="paragraph-align-left"
      />
      <ToolbarButton
        icon={AlignCenter}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.CENTER)}
        active={selection.rowFlex === RowFlex.CENTER}
        title="flux.wordEditor.alignCenter"
        testId="paragraph-align-center"
      />
      <ToolbarButton
        icon={AlignRight}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.RIGHT)}
        active={selection.rowFlex === RowFlex.RIGHT}
        title="flux.wordEditor.alignRight"
        testId="paragraph-align-right"
      />
      <ToolbarButton
        icon={AlignJustify}
        onClick={() => bridge?.command?.executeRowFlex(RowFlex.JUSTIFY)}
        active={selection.rowFlex === RowFlex.JUSTIFY}
        title="flux.wordEditor.alignJustify"
        testId="paragraph-align-justify"
      />
      <ToolbarSeparator />
      <NativeSelect
        value={selection.level ?? 'normal'}
        onChange={(e) => {
          const value = e.target.value;
          bridge?.command?.executeTitle(value === 'normal' ? null : (value as TitleLevel));
        }}
        title={t('flux.wordEditor.headingLevel')}
        size="xs"
        className="max-w-[90px]"
      >
        {HEADING_LEVELS.map((h) => (
          <NativeSelectOption key={h.value} value={h.value}>
            {t(h.labelKey)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ToolbarSeparator />
      <ToolbarButton
        icon={List}
        onClick={() => bridge?.command?.executeList(ListType.UL)}
        active={selection.listType === ListType.UL}
        title="flux.wordEditor.bulletList"
        testId="paragraph-bullet-list"
      />
      <ToolbarButton
        icon={ListOrdered}
        onClick={() => bridge?.command?.executeList(ListType.OL)}
        active={selection.listType === ListType.OL}
        title="flux.wordEditor.numberedList"
        testId="paragraph-numbered-list"
      />
      <ToolbarSeparator />
      <NativeSelect
        value={selection.rowMargin || 1}
        onChange={(e) => bridge?.command?.executeRowMargin(Number(e.target.value))}
        title={t('flux.wordEditor.lineSpacing')}
        size="xs"
        className="w-16"
      >
        {LINE_SPACINGS.map((s) => (
          <NativeSelectOption key={s} value={s}>
            {s}x
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </ToolbarGroup>
  );
}

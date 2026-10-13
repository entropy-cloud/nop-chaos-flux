import * as React from 'react';
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon } from 'lucide-react';
import { IconToggleControls } from './icon-toggle-controls.js';

type StyleTool = 'bold' | 'italic' | 'underline' | 'strikethrough';

interface TextFormatControlsProps {
  onStyle: (tool: StyleTool) => void;
  getActive?: (tool: StyleTool) => boolean;
  disabled?: boolean;
  className?: string;
}

const STYLE_TOOLS = [
  { key: 'bold' as const, Icon: BoldIcon, label: 'Bold' },
  { key: 'italic' as const, Icon: ItalicIcon, label: 'Italic' },
  { key: 'underline' as const, Icon: UnderlineIcon, label: 'Underline' },
  { key: 'strikethrough' as const, Icon: StrikethroughIcon, label: 'Strikethrough' },
];

function TextFormatControls({ onStyle, getActive, disabled, className }: TextFormatControlsProps) {
  return (
    <IconToggleControls
      items={STYLE_TOOLS}
      onToggle={onStyle}
      getActive={getActive}
      disabled={disabled}
      className={className}
    />
  );
}

export { TextFormatControls, type TextFormatControlsProps };

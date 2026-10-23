export interface ResolvedNodeProps {
  value: Readonly<Record<string, unknown>>;
  changed: boolean;
  reusedReference: boolean;
}

export interface ResolvedNodeMeta {
  id?: string;
  className?: string;
  frameClassName?: string;
  when?: boolean;
  visible: boolean;
  hidden: boolean;
  disabled: boolean;
  testid?: string;
  frameWrap?: boolean | 'label' | 'group' | 'none';
  /** contextMenu meta capability config (shape owned by flux-react context-menu-surface). */
  contextMenu?: unknown;
  changed: boolean;
  cid?: number;
}

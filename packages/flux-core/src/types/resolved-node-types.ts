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
  changed: boolean;
  cid?: number;
}

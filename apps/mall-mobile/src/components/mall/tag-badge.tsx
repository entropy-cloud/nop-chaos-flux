import type { ReactNode } from 'react';

export type TagTone = 'promo' | 'gold' | 'soft';

export interface TagBadgeProps {
  tone?: TagTone;
  children: ReactNode;
}

export function TagBadge({ tone = 'promo', children }: TagBadgeProps) {
  return <span className={`mallv2-tag is-${tone}`}>{children}</span>;
}

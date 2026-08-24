import type { ComponentType } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Bot, Lightbulb, MessageCircle, Search, Sparkles, User } from 'lucide-react';
import { cn } from '@nop-chaos/ui';
import type { AiWelcomeSchema } from '../schemas.js';

/**
 * D3 (G8, product-spec.md §3.2): preset string → lucide component map. An
 * `icon` value that hits this table renders the lucide icon; any other
 * non-empty string falls back to the literal character rendering (backward
 * compatible — emoji / custom glyphs keep working).
 */
const WELCOME_ICON_PRESETS: Record<string, ComponentType> = {
  bot: Bot,
  user: User,
  sparkles: Sparkles,
  chat: MessageCircle,
  lightbulb: Lightbulb,
  search: Search,
};

/**
 * ai-welcome (Widget, P1): empty-state welcome panel (icon/title/description/
 * footer). Marker `nop-ai-welcome`. Reads all content from schema props — no
 * engine coupling, works standalone (design.md §5.1).
 */
export function AiWelcomeRenderer(props: RendererComponentProps<AiWelcomeSchema>): RendererRenderOutput {
  const resolved = props.props;
  const align = resolved.align ?? 'center';
  const alignClass = align === 'left' ? 'text-left items-start' : align === 'right' ? 'text-right items-end' : 'text-center items-center';
  const footerNode = props.regions.footer ? (props.regions.footer.render() as React.ReactNode) : null;

  // D3 icon dispatch: host-injected `iconLucide` component wins, then the
  // preset map, then the literal string fallback.
  const iconLucide = resolved.iconLucide as ComponentType | undefined | null;
  const iconString = typeof resolved.icon === 'string' ? resolved.icon : undefined;
  const presetIcon = iconString !== undefined ? WELCOME_ICON_PRESETS[iconString] : undefined;
  const CustomIcon = typeof iconLucide === 'function' ? iconLucide : undefined;
  const LucideIcon = CustomIcon ?? presetIcon;

  return (
    <div
      className={cn('nop-ai-welcome flex flex-col gap-3 p-6', alignClass, props.meta.className)}
      data-slot="ai-welcome"
      data-align={align}
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
    >
      {LucideIcon ? (
        <span data-slot="ai-welcome-icon" aria-hidden="true" className="text-2xl">
          <LucideIcon aria-hidden="true" />
        </span>
      ) : typeof iconString === 'string' && iconString.length > 0 ? (
        <span data-slot="ai-welcome-icon" aria-hidden="true" className="text-2xl">
          {iconString}
        </span>
      ) : null}
      {typeof resolved.title === 'string' && resolved.title.length > 0 ? (
        <h2 data-slot="ai-welcome-title" className="text-lg font-semibold">
          {resolved.title}
        </h2>
      ) : null}
      {typeof resolved.description === 'string' && resolved.description.length > 0 ? (
        <p data-slot="ai-welcome-description" className="text-sm text-muted-foreground">
          {resolved.description}
        </p>
      ) : null}
      {footerNode ? <div data-slot="ai-welcome-footer">{footerNode}</div> : null}
    </div>
  );
}

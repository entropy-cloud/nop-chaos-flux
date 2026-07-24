import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { AiWelcomeSchema } from '../schemas.js';

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

  return (
    <div
      className={cn('nop-ai-welcome flex flex-col gap-3 p-6', alignClass, props.meta.className)}
      data-slot="ai-welcome"
      data-align={align}
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
    >
      {typeof resolved.icon === 'string' && resolved.icon.length > 0 ? (
        <span data-slot="ai-welcome-icon" aria-hidden="true" className="text-2xl">
          {resolved.icon}
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

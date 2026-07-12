import * as React from 'react';
import { t } from '../../lib/i18n.js';

import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, MoreHorizontalIcon } from 'lucide-react';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn('nop-pagination ','mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('nop-pagination ','flex items-center gap-0.5', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? 'outline' : 'ghost'}
      size={size}
      className={cn('nop-pagination ',className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? 'page' : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  );
}

function PaginationPrevious({
  className,
  title,
  text = t('flux.pagination.previous'),
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label={text}
      title={title ?? text}
      size="default"
      className={cn('nop-pagination ','pl-1.5!', className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" />
    </PaginationLink>
  );
}

function PaginationFirst({
  className,
  title,
  text = t('flux.pagination.first'),
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label={text}
      title={title ?? text}
      size="default"
      className={cn('nop-pagination ','pl-1.5!', className)}
      {...props}
    >
      <ChevronsLeftIcon data-icon="inline-start" />
    </PaginationLink>
  );
}

function PaginationLast({
  className,
  title,
  text = t('flux.pagination.last'),
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label={text}
      title={title ?? text}
      size="default"
      className={cn('nop-pagination ','pr-1.5!', className)}
      {...props}
    >
      <ChevronsRightIcon data-icon="inline-end" />
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  title,
  text = t('flux.pagination.next'),
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label={text}
      title={title ?? text}
      size="default"
      className={cn('nop-pagination ','pr-1.5!', className)}
      {...props}
    >
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('nop-pagination ',
        "flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">{t('flux.pagination.morePages')}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

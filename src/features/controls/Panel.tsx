import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { getPanel } from '@/extensions/panels/registry';
import { useEmbed } from '@/integrations/embed/embed-context';
import { useUiStore, NO_INSETS } from '@/state/ui-store';
import { useIsMobile } from '@/lib/use-media-query';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';
import { setPanelWithPolicy } from './panel-policy';

export interface PanelContainerProps {
  panelId: string;
  children: React.ReactNode;
  /** Classes for the scrolling body. */
  className?: string;
  /** 'tall' uses the full height on desktop (long-form content such as stories). */
  variant?: 'default' | 'tall';
  /** Replaces the header title (e.g. the open story's name). */
  title?: string;
  /** Extra header controls, before the close button. */
  actions?: React.ReactNode;
  /** Rendered below the scroll container (sticky footers such as prev/next). */
  footer?: React.ReactNode;
}

/**
 * Tells the camera which part of the map this panel covers, so focus
 * flights centre targets on what's still visible.
 */
function useReportInsets(ref: React.RefObject<HTMLElement | null>, side: 'left' | 'bottom') {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      useUiStore.getState().setViewInsets(
        side === 'bottom'
          ? { ...NO_INSETS, bottom: Math.max(0, Math.round(window.innerHeight - r.top)) }
          : { ...NO_INSETS, left: Math.max(0, Math.round(r.right)) },
      );
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener('resize', report);
    // The entry animation offsets the panel; ResizeObserver doesn't see transforms.
    el.addEventListener('animationend', report);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', report);
      el.removeEventListener('animationend', report);
      useUiStore.getState().setViewInsets(NO_INSETS);
    };
  }, [ref, side]);
}

/** Escape closes the panel unless focus is in a field or a menu handled it. */
function useEscapeToClose(panelId: string) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      setPanelWithPolicy(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelId]);
}

/**
 * Shared chrome around a panel body: header, close, scroll container.
 * Desktop: a floating card above the toolbar. Phone (and narrow embeds): a
 * bottom sheet above the tab bar whose header collapses it. Wide embeds with
 * chrome=full: a sidebar.
 */
export default function Panel({
  panelId,
  children,
  className = '',
  variant = 'default',
  title,
  actions,
  footer,
}: PanelContainerProps) {
  const embed = useEmbed();
  const mobile = useIsMobile();
  const ref = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const definition = getPanel(panelId);
  const layout = mobile ? 'sheet' : embed.enabled ? 'sidebar' : 'card';
  useReportInsets(ref, layout === 'sheet' ? 'bottom' : 'left');
  useEscapeToClose(panelId);
  if (!definition) return null;

  const Icon = definition.icon;
  const heading = title ?? definition.title;
  const close = () => setPanelWithPolicy(null);

  const frame = {
    sheet: cn(
      'left-0 right-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom,0px))] rounded-t-3xl border-x-0 border-b-0',
      collapsed ? '' : variant === 'tall' ? 'max-h-[58dvh]' : 'max-h-[52dvh]',
    ),
    sidebar: 'left-0 top-0 bottom-[var(--embed-bar-h)] w-[272px] rounded-none rounded-br-2xl border-l-0 border-t-0',
    card: cn(
      'left-3 bottom-[4.25rem] w-[400px] rounded-2xl',
      variant === 'tall' ? 'top-[4.25rem]' : 'max-h-[min(72dvh,calc(100dvh-8.5rem))]',
    ),
  }[layout];

  return (
    <section
      ref={ref}
      aria-label={heading}
      className={cn('glass fixed z-20 flex flex-col animate-sheet-in', frame)}
      data-panel={panelId}
    >
      {layout === 'sheet' && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mx-auto mt-1.5 -mb-1 h-4 w-14 flex items-center justify-center"
          aria-label={collapsed ? `Expand ${heading}` : `Collapse ${heading}`}
          aria-expanded={!collapsed}
        >
          <span className="h-1 w-9 rounded-full bg-foreground/20" />
        </button>
      )}
      <header
        className={cn(
          'flex items-center gap-2 shrink-0 border-b border-glass-border',
          layout === 'sheet' ? 'px-4 py-2.5' : 'px-3.5 py-2.5',
          collapsed && 'border-b-0',
        )}
        onClick={layout === 'sheet' ? () => setCollapsed((c) => !c) : undefined}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <h2 className="font-heading min-w-0 flex-1 truncate text-sm font-extrabold tracking-tight">{heading}</h2>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {actions}
          {layout === 'sheet' && (
            <IconButton
              label={collapsed ? 'Expand' : 'Collapse'}
              onClick={() => setCollapsed((c) => !c)}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            >
              <ChevronDown />
            </IconButton>
          )}
          <IconButton label={`Close ${definition.title}`} onClick={close}>
            <X />
          </IconButton>
        </div>
      </header>
      {!collapsed && (
        <>
          <div data-scroll-container className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain text-left', className)}>
            {children}
          </div>
          {footer}
        </>
      )}
    </section>
  );
}

/** Placeholder while a lazily loaded panel's code arrives. */
export function PanelSkeleton({ panelId }: { panelId: string }) {
  return (
    <Panel panelId={panelId}>
      <div className="flex flex-col gap-2 p-4" aria-busy="true">
        <div className="h-3 w-2/3 animate-pulse rounded bg-tint" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-tint" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-tint" />
      </div>
    </Panel>
  );
}

/**
 * Shown when a panel crashed or its code failed to load (offline, or a new
 * deploy replaced the chunk). A chunk that failed stays failed until the page
 * reloads, so then only "Reload" is offered.
 */
export function PanelError({ panelId, retry }: { panelId: string; retry: (() => void) | null }) {
  return (
    <Panel panelId={panelId}>
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center" role="alert">
        <p className="font-heading text-sm font-extrabold">This panel didn't load</p>
        <p className="text-xs text-muted-foreground">
          {retry ? 'Something went wrong. Try again, or reload the page.' : 'Check your connection, then reload the page.'}
        </p>
        <div className="mt-1 flex gap-2">
          {retry && (
            <button type="button" onClick={retry} className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={retry ? 'rounded-xl bg-tint px-3.5 py-2 text-xs font-bold' : 'rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground'}
          >
            Reload
          </button>
        </div>
      </div>
    </Panel>
  );
}

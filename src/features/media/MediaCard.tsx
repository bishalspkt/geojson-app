import { ExternalLink, MapPin, X } from 'lucide-react';
import { findFeature, useLayersStore } from '@/state/layers-store';
import { useUiStore } from '@/state/ui-store';
import { NAME_KEYS } from '@/features/context-menu/feature-details';
import { IconButton } from '@/components/ui/icon-button';
import { useIsMobile } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import { featureMedia } from './media';

/**
 * Card for a selected feature that carries media (a photo, a clip, a street
 * view frame): the picture or video, when it was taken, credit and licence,
 * and a link to the source. Desktop: a card under the top-right buttons.
 * Phone: a compact row just above the bottom sheet (or the tab bar).
 */
export default function MediaCard() {
  const selection = useLayersStore((s) => s.selection);
  const layers = useLayersStore((s) => s.layers);
  const sheetBottom = useUiStore((s) => s.viewInsets.bottom);
  const mobile = useIsMobile();
  const hit = selection ? findFeature(layers, selection.featureId) : null;
  const props = (hit?.feature.properties ?? null) as Record<string, unknown> | null;
  const media = featureMedia(props);
  if (!hit || !media || !props) return null;
  const nameKey = NAME_KEYS.find((k) => typeof props[k] === 'string' && props[k]);
  const title = nameKey ? String(props[nameKey]) : hit.layer.name;
  const close = () => useLayersStore.getState().selectFeature(null);

  const visual = media.video ? (
    <video
      key={media.video}
      src={media.video}
      poster={media.image ?? undefined}
      controls
      playsInline
      className={cn('block bg-gray-950 object-contain', mobile ? 'h-full w-full' : 'max-h-[220px] w-full')}
    />
  ) : (
    <a href={media.url ?? media.image ?? undefined} target="_blank" rel="noopener noreferrer" className="block h-full">
      <img
        key={media.image}
        src={media.image!}
        alt={title}
        className={cn('block bg-gray-900 object-cover', mobile ? 'h-full w-full' : 'max-h-[240px] w-full')}
        referrerPolicy="no-referrer"
      />
    </a>
  );

  const details = (
    <div className={cn('min-w-0 space-y-1', mobile ? 'py-2 pr-9' : 'px-3 py-2.5')}>
      <p className={cn('font-extrabold leading-snug', mobile ? 'line-clamp-2 text-[12.5px]' : 'text-[13px]')}>{title}</p>
      <p className="truncate text-[11px] text-muted-foreground">{[media.captured, hit.layer.name].filter(Boolean).join(' · ')}</p>
      {media.approximate && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {mobile ? 'Approximate place' : 'Placed by the place named in its title, not a geotag'}
        </p>
      )}
      {!mobile && (media.credit || media.license) && (
        <p className="text-[10.5px] text-subtle-foreground">{[media.credit, media.license].filter(Boolean).join(' · ')}</p>
      )}
      {media.url && (
        <a href={media.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline">
          Open the source <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}
    </div>
  );

  if (mobile) {
    const bottom = sheetBottom > 0 ? `${sheetBottom + 8}px` : 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 8px)';
    return (
      <aside aria-label="Media" style={{ bottom }} className="glass-strong fixed inset-x-3 z-40 flex h-[104px] gap-3 overflow-hidden rounded-2xl animate-pop-in">
        <div className="w-[120px] shrink-0">{visual}</div>
        {details}
        <IconButton label="Close" size="sm" className="absolute right-1.5 top-1.5" onClick={close}>
          <X />
        </IconButton>
      </aside>
    );
  }

  return (
    <aside aria-label="Media" className="glass-strong fixed right-[4.25rem] top-[4.25rem] z-40 w-[340px] overflow-hidden rounded-2xl animate-pop-in">
      <div className="relative">
        {visual}
        <button
          type="button"
          onClick={close}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {details}
    </aside>
  );
}

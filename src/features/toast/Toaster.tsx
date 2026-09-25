import { AlertCircle, Info, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useNotifyStore } from '@/state/notify-store';

/** Transient messages, top centre (below the search bar). */
export default function Toaster() {
  const toasts = useNotifyStore((s) => s.notices);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 top-[4.25rem] z-[60] flex flex-col items-center gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="glass-strong pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl py-2 pl-3 pr-1.5 text-xs font-semibold animate-pop-in">
          {t.tone === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          )}
          <p className="min-w-0 flex-1 py-0.5 leading-snug">{t.message}</p>
          <IconButton label="Dismiss" size="xs" onClick={() => useNotifyStore.getState().dismiss(t.id)}>
            <X />
          </IconButton>
        </div>
      ))}
    </div>
  );
}

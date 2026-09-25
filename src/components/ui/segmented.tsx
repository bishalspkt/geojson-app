import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible name when the label is an icon. */
  ariaLabel?: string;
}

/** A compact single-choice control (radio group styled as pills). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  size = 'sm',
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: 'xs' | 'sm';
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex items-center gap-0.5 rounded-xl bg-tint p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[10px] font-bold transition-colors duration-150',
              size === 'xs' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1.5 text-xs',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

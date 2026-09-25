import * as React from 'react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';
type Tone = 'default' | 'danger' | 'active' | 'plain';

const SIZES: Record<Size, string> = {
  xs: 'h-6 w-6 rounded-md [&_svg]:size-3',
  sm: 'h-7 w-7 rounded-lg [&_svg]:size-3.5',
  md: 'h-9 w-9 rounded-xl [&_svg]:size-4',
  lg: 'h-11 w-11 rounded-2xl [&_svg]:size-[18px]',
};

const TONES: Record<Tone, string> = {
  default: 'text-muted-foreground hover:text-foreground hover:bg-hover',
  danger: 'text-subtle-foreground hover:text-destructive hover:bg-destructive/10',
  active: 'text-primary bg-primary/12 hover:bg-primary/18',
  /** No colours: the caller's className sets them. */
  plain: '',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name (required: icon-only buttons have no visible text). */
  label: string;
  /** Hide below this breakpoint (the button sets its own display). */
  hideOnMobile?: boolean;
  size?: Size;
  tone?: Tone;
}

/** Square icon-only button with an accessible label and a tooltip. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'sm', tone = 'default', hideOnMobile = false, className, title, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        hideOnMobile ? 'hidden sm:inline-flex' : 'inline-flex',
        'shrink-0 items-center justify-center transition-colors duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        SIZES[size],
        TONES[tone],
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';

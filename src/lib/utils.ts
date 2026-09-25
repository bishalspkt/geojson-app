import { type ClassValue, clsx } from 'clsx';

/**
 * Join class names (conditionals allowed). Components avoid conflicting
 * utilities instead of merging them at runtime (e.g. IconButton's `tone="plain"`
 * leaves colours to the caller).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

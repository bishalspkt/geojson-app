import type { MapTheme } from '@/types';

/** Basemap themes whose UI chrome and labels go dark. */
export const isDarkTheme = (theme: MapTheme) => theme === 'dark' || theme === 'black';

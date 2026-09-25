/**
 * A small, serializable legend attached to a data or imagery layer.
 * Rendered by the layers and story panels; never read by the map engine.
 */
export type LegendSwatchShape = 'circle' | 'line' | 'fill' | 'square';

export interface LegendSwatch {
  label: string;
  color: string;
  shape?: LegendSwatchShape;
}

export type LegendSpec =
  | { kind: 'swatches'; title?: string; items: LegendSwatch[] }
  | {
      kind: 'gradient';
      title?: string;
      /** Ordered stops; labels are shown for the first and last stop (and any with `label`). */
      stops: { color: string; label?: string }[];
    };

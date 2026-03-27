/**
 * simplestyle-spec property types
 * @see https://github.com/mapbox/simplestyle-spec/tree/master/1.1.0
 */

export interface SimplestylePoint {
  'marker-color'?: string;
  'marker-size'?: 'small' | 'medium' | 'large';
  'marker-symbol'?: string;
}

export interface SimplestyleLine {
  'stroke'?: string;
  'stroke-width'?: number;
  'stroke-opacity'?: number;
}

export interface SimplestylePolygon extends SimplestyleLine {
  'fill'?: string;
  'fill-opacity'?: number;
}

export type SimplestyleProperties = SimplestylePoint & SimplestyleLine & SimplestylePolygon;

/** All recognized simplestyle property names */
export const SIMPLESTYLE_KEYS = [
  'marker-color', 'marker-size', 'marker-symbol',
  'stroke', 'stroke-width', 'stroke-opacity',
  'fill', 'fill-opacity',
] as const;

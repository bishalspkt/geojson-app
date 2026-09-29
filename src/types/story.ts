import type { LayerDisplay } from './geojson';
import type { ImageryAdjustments, ImagerySource, ImageryTimeConfig } from './imagery';
import type { LegendSpec } from './legend';
import type { MapTheme } from './map';
import type { TemporalConfig } from './time';

/**
 * A story: a JSON document bundling layers with an ordered list of chapters.
 * Each chapter sets the camera, which layers show, terrain, the timeline,
 * and before/after comparisons. Loaded with `?story=<url>` or the SDK's
 * `loadStory`. Version 1 — additive changes only.
 */
export interface StoryDocument {
  version: 1;
  title: string;
  subtitle?: string;
  byline?: string;
  /** Basemap theme while the story is open. */
  theme?: MapTheme;
  /** IANA zone every time is shown in while the story is open (timeline, captions, tooltips), e.g. "Asia/Kathmandu". Default: the reader's. */
  timeZone?: string;
  credits?: StorySource[];
  layers: StoryLayer[];
  chapters: StoryChapter[];
}

export interface StorySource {
  label: string;
  url?: string;
}

export interface StoryGeoJsonLayer {
  id: string;
  type: 'geojson';
  name: string;
  /** Relative URLs resolve against the story document's URL. */
  url: string;
  paint?: Record<string, unknown>;
  display?: LayerDisplay;
  /** Explicit timeline config, or false to disable auto-detection. */
  temporal?: TemporalConfig | false;
  legend?: LegendSpec;
  attribution?: string;
}

export interface StoryImageryLayer {
  id: string;
  type: 'imagery';
  name: string;
  source: ImagerySource;
  opacity?: number;
  time?: ImageryTimeConfig;
  attribution?: string;
  description?: string;
  legend?: LegendSpec;
  placement?: 'below-labels' | 'top';
  adjust?: ImageryAdjustments;
}

export type StoryLayer = StoryGeoJsonLayer | StoryImageryLayer;

export interface StoryCamera {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** Flight duration in ms (default: scales with distance). */
  duration?: number;
}

export interface StoryTime {
  start: string;
  end: string;
  /** Initial playhead (default: start). */
  current?: string;
  /** Seconds for a full pass at 1× (default 20). */
  duration?: number;
  /** Sliding window in minutes; omit/null for cumulative. */
  windowMinutes?: number | null;
  /** Start playing once the camera arrives. */
  autoplay?: boolean;
  loop?: boolean;
  /** IANA zone for labels, e.g. "Asia/Kathmandu" (default: the story's `timeZone`). */
  timeZone?: string;
  /** Chase camera: follow the head of this layer's animated track while playing. */
  follow?: StoryFollow;
  /** Narration shown above the timeline as the playhead passes each moment. */
  captions?: { time: string; text: string }[];
}

export interface StoryFollow {
  /** Story layer id of a layer with an animated track (temporal.coordTimesField). */
  layer: string;
  zoom?: number;
  pitch?: number;
  /** Fixed bearing, or "track" to turn with the direction of travel. */
  bearing?: number | 'track';
  /** Slow motion: the front never crosses more than this fraction of the view per second (e.g. 0.2). */
  maxViewSpeed?: number;
}

export interface StoryCompare {
  /** Imagery layer id(s) shown left of the divider ("before"). */
  left: string | string[];
  /** Imagery layer id(s) shown right of the divider ("after"). */
  right?: string | string[];
  leftLabel?: string;
  rightLabel?: string;
  /** Initial divider position as a fraction of the map width, 0–1 (default: middle of the area the story panel leaves visible). */
  position?: number;
  /** Alternative scenes a viewer can pick for each side (labels become menus). */
  leftOptions?: StoryCompareOption[];
  rightOptions?: StoryCompareOption[];
}

export interface StoryCompareOption {
  /** Imagery layer id(s) this option shows. */
  layers: string | string[];
  label: string;
}

export interface StoryStat {
  label: string;
  value: string;
  note?: string;
}

export interface StoryBarChart {
  kind: 'bars';
  title: string;
  unit?: string;
  data: { label: string; value: number; color?: string }[];
  note?: string;
}

/** A line/area chart: time series or a longitudinal profile (x = distance). */
export interface StoryLineChart {
  kind: 'line';
  title: string;
  /** Axis captions, e.g. "km downstream" / "elevation (m)". */
  xLabel?: string;
  yLabel?: string;
  /** [x, y] pairs, x ascending (single series; use `series` for several). */
  points?: [number, number][];
  /** Several named lines on the same axes (e.g. one hydrograph per gauge). */
  series?: { label: string; color?: string; dashed?: boolean; points: [number, number][] }[];
  /** Horizontal reference lines (warning levels, thresholds…). */
  thresholds?: { y: number; label: string; color?: string }[];
  /** Labeled vertical markers (villages along a profile, event times…). */
  markers?: { x: number; label: string }[];
  /** Tick labels for x (defaults to numbers). */
  xTicks?: { x: number; label: string }[];
  area?: boolean;
  color?: string;
  note?: string;
}

export type StoryChart = StoryBarChart | StoryLineChart;

export interface StoryChapter {
  id: string;
  title: string;
  /** Small line above the title, e.g. "16 Aug 2024 · Solukhumbu". */
  kicker?: string;
  /** Paragraphs separated by blank lines; supports **bold**, [text](https://…) and "- " bullet lists (a block of lines that all start with "- "). */
  body: string;
  camera: StoryCamera;
  /** Story layer ids visible in this chapter; all other story layers hide. */
  layers: string[];
  terrain?: boolean;
  exaggeration?: number;
  /** Default: on whenever terrain is on. */
  hillshade?: boolean;
  compare?: StoryCompare | null;
  time?: StoryTime | null;
  stats?: StoryStat[];
  chart?: StoryChart;
  sources?: StorySource[];
}

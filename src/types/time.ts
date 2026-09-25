/**
 * How a data layer participates in the timeline. Plain data — it lives on
 * `DataLayer.temporal` and in story documents, so keep it serializable.
 *
 * Time values in feature properties may be ISO-8601 strings, `YYYY`,
 * `YYYY-MM`, `YYYY-MM-DD`, epoch milliseconds, or epoch seconds.
 */
export interface TemporalConfig {
  /** Property holding each feature's start instant. */
  startField?: string;
  /** Optional property holding the end instant; features without one are instants. */
  endField?: string;
  /**
   * Line features: property holding per-vertex timestamps (the `coordTimes`
   * convention from togeojson/GPX). Such lines animate as a moving track.
   */
  coordTimesField?: string;
  /** How long a feature stays emphasized ("pulses") after it appears, in ms. */
  pulseMs?: number;
  /** Colour of animated tracks (default orange). */
  trackColor?: string;
}

/** [start, end] in epoch milliseconds. */
export type TimeExtent = [number, number];

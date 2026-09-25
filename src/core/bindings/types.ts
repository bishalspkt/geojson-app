/**
 * One slice of the map engine: binds a set of stores to the live map.
 * `restyle` runs after a basemap style swap (custom sources/layers are gone
 * and must be re-added); `destroy` unbinds everything.
 */
export interface EngineBinding {
  restyle?(): void;
  destroy(): void;
}

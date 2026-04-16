import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Search, X } from 'lucide-react';
import { usePostHog } from '@posthog/react';
import { useSearch } from '@/hooks/use-search';
import { createGeoJsonActions, useGeoJson } from '@/services';
import { useMapInstance } from '@/services/map';
import type { PhotonFeature, PhotonProperties } from '@/types/search';
import type { Feature } from 'geojson';

function formatResult(props: PhotonProperties): { primary: string; secondary: string } {
  const primary = props.name;
  const parts: string[] = [];
  if (props.city && props.city !== props.name) parts.push(props.city);
  if (props.county && props.county !== props.city) parts.push(props.county);
  if (props.state) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return { primary, secondary: parts.join(', ') };
}

function getTypeLabel(props: PhotonProperties): string {
  const map: Record<string, string> = {
    city: 'City',
    town: 'Town',
    village: 'Village',
    hamlet: 'Hamlet',
    suburb: 'Suburb',
    district: 'District',
    locality: 'Locality',
    street: 'Street',
    house: 'Address',
  };
  return map[props.type] ?? props.type;
}

// OSM tags whose geometries are inherently linear (streets, rivers, railways).
// Photon doesn't return line geometry, so we approximate with a diagonal
// across the bbox when an extent is available.
const LINE_KEYS = new Set(['highway', 'railway', 'waterway']);

function isLineLike(props: PhotonProperties): boolean {
    if (LINE_KEYS.has(props.osm_key)) return true;
    return props.type === 'street' || props.type === 'road';
}

/**
 * Picks a faint, randomised colour palette for a search-result feature.
 * The stroke uses baked-in alpha so it stays soft even where the style
 * resolver doesn't honour stroke-opacity (polygon outlines).
 */
function pickSearchPalette(): { fill: string; stroke: string; marker: string } {
    const hue = Math.floor(Math.random() * 360);
    return {
        fill: `hsl(${hue}, 65%, 55%)`,
        stroke: `hsla(${hue}, 70%, 45%, 0.5)`,
        marker: `hsla(${hue}, 70%, 50%, 0.65)`,
    };
}

function photonToGeoJsonFeature(pf: PhotonFeature, id: string): Feature {
    const props = pf.properties;
    const [lon, lat] = pf.geometry.coordinates;
    const extent = props.extent;
    const palette = pickSearchPalette();

    const baseProperties: Record<string, unknown> = {
        _fid: id,
        _search_result: true,
        name: props.name,
        osm_id: props.osm_id,
        osm_type: props.osm_type,
        osm_key: props.osm_key,
        osm_value: props.osm_value,
        type: props.type,
    };
    if (props.country) baseProperties.country = props.country;
    if (props.state) baseProperties.state = props.state;
    if (props.county) baseProperties.county = props.county;
    if (props.city) baseProperties.city = props.city;
    if (props.postcode) baseProperties.postcode = props.postcode;
    if (props.street) baseProperties.street = props.street;
    if (props.housenumber) baseProperties.housenumber = props.housenumber;

    // Linear feature with bbox → approximate LineString across the extent
    if (extent && isLineLike(props)) {
        const [minLon, maxLat, maxLon, minLat] = extent;
        return {
            type: 'Feature',
            id,
            geometry: {
                type: 'LineString',
                coordinates: [[minLon, maxLat], [maxLon, minLat]],
            },
            properties: {
                ...baseProperties,
                stroke: palette.stroke,
                'stroke-width': 3,
                'stroke-opacity': 0.5,
            },
        };
    }

    // Areal feature with bbox → Polygon rectangle
    if (extent) {
        const [minLon, maxLat, maxLon, minLat] = extent;
        return {
            type: 'Feature',
            id,
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [minLon, minLat],
                    [maxLon, minLat],
                    [maxLon, maxLat],
                    [minLon, maxLat],
                    [minLon, minLat],
                ]],
            },
            properties: {
                ...baseProperties,
                fill: palette.fill,
                'fill-opacity': 0.08,
                stroke: palette.stroke,
                'stroke-width': 1.5,
            },
        };
    }

    // Fallback: single point
    return {
        type: 'Feature',
        id,
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
            ...baseProperties,
            'marker-color': palette.marker,
        },
    };
}

function ResultsList({
  results,
  isLoading,
  activeIndex,
  setActiveIndex,
  selectResult,
}: {
  results: PhotonFeature[];
  isLoading: boolean;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  selectResult: (f: PhotonFeature) => void;
}) {
  if (results.length > 0) {
    return (
      <ul role="listbox" className="py-1">
        {results.map((feature, i) => {
          const { primary, secondary } = formatResult(feature.properties);
          const isActive = i === activeIndex;
          return (
            <li
              key={`${feature.properties.osm_id}-${i}`}
              role="option"
              aria-selected={isActive}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectResult(feature)}
              className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors duration-100 ${
                isActive ? 'bg-primary/10' : 'hover:bg-white/40'
              }`}
            >
              <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{primary}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    {getTypeLabel(feature.properties)}
                  </span>
                </div>
                {secondary && (
                  <p className="text-xs text-gray-500 truncate">{secondary}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-gray-400">Searching...</p>
      </div>
    );
  }

  return null;
}

export default function SearchBar() {
  const { query, results, isLoading, search, clear } = useSearch();
  const { state, dispatch } = useGeoJson();
  const actions = useMemo(() => createGeoJsonActions(dispatch), [dispatch]);
  const mapRef = useMapInstance();
  const posthog = usePostHog();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  // Track the currently pinned search-result feature id so we can replace it
  // when a new result is picked, or clean it up on unmount.
  const activeSearchIdRef = useRef<string | null>(null);

  const showDropdown = isOpen && (results.length > 0 || isLoading);

  // Keep track of whether the pinned search feature still exists in the store —
  // the user can delete it via context menu and we must forget it.
  useEffect(() => {
    const id = activeSearchIdRef.current;
    if (id && !state.features.some((f) => f.id === id)) {
      activeSearchIdRef.current = null;
    }
  }, [state.features]);

  const removeActiveSearchFeature = useCallback(() => {
    const id = activeSearchIdRef.current;
    if (id) {
      actions.removeFeature(id);
      activeSearchIdRef.current = null;
    }
  }, [actions]);

  const selectResult = useCallback((feature: PhotonFeature) => {
    // Replace any prior search-result feature with the new one.
    removeActiveSearchFeature();

    const id = `search-${feature.properties.osm_id}-${Date.now()}`;
    const geoFeature = photonToGeoJsonFeature(feature, id);
    actions.addFeature(geoFeature);
    actions.selectFeature(id);
    actions.setMapFocus({ featureId: id });
    activeSearchIdRef.current = id;

    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const center = mapRef.current?.getCenter();
    posthog.capture('search_result_selected', {
      search_term: query,
      result_name: props.name,
      result_lat: lat,
      result_lng: lon,
      result_type: props.type,
      osm_key: props.osm_key,
      osm_value: props.osm_value,
      osm_type: props.osm_type,
      osm_id: props.osm_id,
      country: props.country ?? null,
      state: props.state ?? null,
      county: props.county ?? null,
      city: props.city ?? null,
      postcode: props.postcode ?? null,
      map_center_lat: center?.lat ?? null,
      map_center_lng: center?.lng ?? null,
    });

    setIsOpen(false);
    setIsExpanded(false);
    inputRef.current?.blur();
  }, [actions, removeActiveSearchFeature, mapRef, posthog, query]);

  const closeMobileSearch = useCallback(() => {
    setIsExpanded(false);
    setIsOpen(false);
    clear();
  }, [clear]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Escape') {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectResult(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setIsExpanded(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = desktopContainerRef.current?.contains(target);
      const inMobile = mobileOverlayRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-focus input when mobile search expands
  useEffect(() => {
    if (isExpanded) {
      // Small delay to allow animation to start
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isExpanded]);


  const searchInput = (
    <>
      <Search className="h-4 w-4 text-gray-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          search(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search places..."
        className="flex-1 bg-transparent text-base sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        autoComplete="off"
        spellCheck={false}
      />
      {isLoading && (
        <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin shrink-0" />
      )}
      {query && !isLoading && (
        <button
          onClick={() => {
            clear();
            inputRef.current?.focus();
          }}
          className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors duration-150"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5 text-gray-400" />
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Mobile: collapsed search button */}
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-3 right-3 z-30 sm:hidden h-11 w-11 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg shadow-black/5 active:scale-95 transition-transform duration-150"
        aria-label="Search places"
      >
        <Search className="h-4.5 w-4.5 text-gray-600" />
      </button>

      {/* Mobile: expanded fullscreen search overlay */}
      {isExpanded && (
        <div ref={mobileOverlayRef} className="fixed inset-0 z-50 sm:hidden bg-white/90 backdrop-blur-2xl flex flex-col">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
            <button
              onClick={closeMobileSearch}
              className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors duration-150 shrink-0"
              aria-label="Close search"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-gray-100/80">
              {searchInput}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {showDropdown ? (
              <ResultsList
                results={results}
                isLoading={isLoading}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                selectResult={selectResult}
              />
            ) : !query ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center px-6">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-bold text-gray-900">Search for a place</p>
                <p className="text-xs text-gray-400">Search cities, addresses, and landmarks worldwide</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Desktop: inline search bar */}
      <div
        ref={desktopContainerRef}
        className="hidden sm:block fixed top-3 left-[200px] right-16 md:left-1/2 md:-translate-x-1/2 md:right-auto z-30 md:w-[400px]"
      >
        <div className={`flex items-center gap-2 px-3 py-2.5 bg-white/70 backdrop-blur-2xl border border-white/30 shadow-lg shadow-black/5 transition-all duration-150 ${showDropdown ? 'rounded-t-2xl border-b-white/10' : 'rounded-2xl'}`}>
          {searchInput}
        </div>

        {showDropdown && (
          <div className="bg-white/70 backdrop-blur-2xl border border-t-0 border-white/30 rounded-b-2xl shadow-lg shadow-black/5 overflow-hidden">
            <ResultsList
              results={results}
              isLoading={isLoading}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              selectResult={selectResult}
            />
          </div>
        )}
      </div>
    </>
  );
}

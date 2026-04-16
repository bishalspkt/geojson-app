import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Search, X } from 'lucide-react';
import { useSearch } from '@/hooks/use-search';
import { useMapInstance } from '@/services/map';
import type { PhotonFeature, PhotonProperties } from '@/types/search';
import maplibregl from 'maplibre-gl';

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

const MARKER_COLOR = '#7c3aed';

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
  const mapRef = useMapInstance();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const showDropdown = isOpen && (results.length > 0 || isLoading);

  const removeMarker = useCallback(() => {
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  const flyTo = useCallback((feature: PhotonFeature) => {
    const map = mapRef.current;
    if (!map) return;

    const [lon, lat] = feature.geometry.coordinates;
    const extent = feature.properties.extent;

    removeMarker();

    if (extent) {
      map.fitBounds(
        [[extent[0], extent[3]], [extent[2], extent[1]]],
        { padding: 60, maxZoom: 16, duration: 1200 },
      );
    } else {
      map.flyTo({ center: [lon, lat], zoom: 15, duration: 1200 });
    }

    markerRef.current = new maplibregl.Marker({ color: MARKER_COLOR })
      .setLngLat([lon, lat])
      .addTo(map);
  }, [mapRef, removeMarker]);

  const selectResult = useCallback((feature: PhotonFeature) => {
    flyTo(feature);
    setIsOpen(false);
    setIsExpanded(false);
    inputRef.current?.blur();
  }, [flyTo]);

  const closeMobileSearch = useCallback(() => {
    setIsExpanded(false);
    setIsOpen(false);
    clear();
    removeMarker();
  }, [clear, removeMarker]);

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

  // Clean up marker on unmount
  useEffect(() => removeMarker, [removeMarker]);

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
            removeMarker();
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

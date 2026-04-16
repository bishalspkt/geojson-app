import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhotonFeature } from '@/types/search';
import { searchPlaces } from '@/services/search';
import { useMapInstance } from '@/services/map';

const DEBOUNCE_MS = 300;

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mapRef = useMapInstance();

  const search = useCallback((q: string) => {
    setQuery(q);

    // Cancel any in-flight request
    abortRef.current?.abort();
    clearTimeout(timerRef.current);

    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const center = mapRef.current?.getCenter();
        const response = await searchPlaces(
          q,
          {
            lat: center?.lat,
            lng: center?.lng,
            limit: 5,
          },
          controller.signal,
        );
        setResults(response.features);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, [mapRef]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsLoading(false);
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearTimeout(timerRef.current);
    };
  }, []);

  return { query, results, isLoading, search, clear };
}

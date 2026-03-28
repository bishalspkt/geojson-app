import { useEffect, useRef } from 'react';
import { FeatureCollection } from 'geojson';
import { useEmbed } from '@/services/embed-context';
import { useGeoJson, createGeoJsonActions } from '@/services';

export function EmbedGeoJsonLoader() {
  const embed = useEmbed();
  const { dispatch } = useGeoJson();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!embed.geojsonUrl || loadedRef.current) return;
    loadedRef.current = true;

    const controller = new AbortController();

    fetch(embed.geojsonUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        let fc: FeatureCollection | null = null;
        if (data.type === 'FeatureCollection') {
          fc = data as FeatureCollection;
        } else if (data.type === 'Feature') {
          fc = { type: 'FeatureCollection', features: [data] };
        }
        if (fc) {
          const actions = createGeoJsonActions(dispatch);
          actions.loadGeoJson(fc);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('[geojson.app embed] Failed to load GeoJSON:', err);
        }
      });

    return () => controller.abort();
  }, [embed.geojsonUrl, dispatch]);

  return null;
}

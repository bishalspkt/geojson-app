import type { PhotonResponse } from '@/types/search';

const PHOTON_API = 'https://photon.komoot.io';

interface SearchOptions {
  lat?: number;
  lng?: number;
  limit?: number;
  lang?: string;
}

export async function searchPlaces(
  query: string,
  options: SearchOptions = {},
  signal?: AbortSignal,
): Promise<PhotonResponse> {
  const { lat, lng, limit = 5, lang = 'en' } = options;

  const params = new URLSearchParams({ q: query, limit: String(limit), lang });
  if (lat !== undefined && lng !== undefined) {
    params.set('lat', String(lat));
    params.set('lon', String(lng));
  }

  const res = await fetch(`${PHOTON_API}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

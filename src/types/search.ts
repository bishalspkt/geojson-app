export interface PhotonProperties {
  osm_type: string;
  osm_id: number;
  osm_key: string;
  osm_value: string;
  type: string;
  name: string;
  country?: string;
  countrycode?: string;
  state?: string;
  county?: string;
  city?: string;
  postcode?: string;
  street?: string;
  housenumber?: string;
  extent?: [number, number, number, number]; // [minLon, maxLat, maxLon, minLat]
}

export interface PhotonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: PhotonProperties;
}

export interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

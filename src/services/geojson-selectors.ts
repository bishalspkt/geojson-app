import { IdentifiedFeature, FeatureId, GeometryCategory, categorizeGeometry } from '@/types';

export function selectFeaturesByCategory(
  features: IdentifiedFeature[],
  category: GeometryCategory,
): IdentifiedFeature[] {
  return features.filter((f) => categorizeGeometry(f.geometry.type) === category);
}

export function selectFeatureById(
  features: IdentifiedFeature[],
  id: FeatureId,
): IdentifiedFeature | undefined {
  return features.find((f) => f.id === id);
}

export function selectFeatureStats(features: IdentifiedFeature[]) {
  let points = 0,
    lines = 0,
    polygons = 0;
  for (const f of features) {
    const cat = categorizeGeometry(f.geometry.type);
    if (cat === 'point') points++;
    else if (cat === 'line') lines++;
    else polygons++;
  }
  return { total: features.length, points, lines, polygons };
}

export function selectVisibleFeatures(
  features: IdentifiedFeature[],
  hiddenIds: Set<FeatureId>,
): IdentifiedFeature[] {
  return features.filter((f) => !hiddenIds.has(f.id));
}

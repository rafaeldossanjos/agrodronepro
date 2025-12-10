import * as turf from '@turf/turf';

export interface ParsedKMLFeature {
  name: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  areaHectares: number;
}

export function parseKML(kmlString: string): ParsedKMLFeature[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, 'text/xml');
  
  const features: ParsedKMLFeature[] = [];
  
  // Find all Placemark elements
  const placemarks = doc.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    
    // Get name
    const nameElement = placemark.getElementsByTagName('name')[0];
    const name = nameElement?.textContent || `Talhão ${i + 1}`;
    
    // Try to find polygon coordinates
    const polygonElement = placemark.getElementsByTagName('Polygon')[0];
    if (!polygonElement) continue;
    
    const coordsElement = polygonElement.getElementsByTagName('coordinates')[0];
    if (!coordsElement) continue;
    
    const coordsText = coordsElement.textContent?.trim();
    if (!coordsText) continue;
    
    // Parse coordinates (KML format: lon,lat,alt lon,lat,alt ...)
    const coordPairs = coordsText.split(/\s+/).filter(c => c.length > 0);
    const coordinates: number[][] = [];
    
    for (const pair of coordPairs) {
      const parts = pair.split(',');
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lon) && !isNaN(lat)) {
          coordinates.push([lon, lat]);
        }
      }
    }
    
    // Ensure the polygon is closed
    if (coordinates.length >= 3) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push([...first]);
      }
      
      // Create GeoJSON polygon
      const geometry = {
        type: 'Polygon' as const,
        coordinates: [coordinates],
      };
      
      // Calculate area in hectares using Turf.js
      const polygon = turf.polygon([coordinates]);
      const areaSquareMeters = turf.area(polygon);
      const areaHectares = areaSquareMeters / 10000;
      
      features.push({
        name,
        geometry,
        areaHectares: Math.round(areaHectares * 100) / 100,
      });
    }
  }
  
  return features;
}

export function calculatePolygonArea(coordinates: number[][]): number {
  if (coordinates.length < 3) return 0;
  
  // Ensure polygon is closed
  const closed = [...coordinates];
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closed.push([...first]);
  }
  
  const polygon = turf.polygon([closed]);
  const areaSquareMeters = turf.area(polygon);
  return Math.round((areaSquareMeters / 10000) * 100) / 100;
}

export function getPolygonCenter(coordinates: number[][][]): [number, number] {
  const polygon = turf.polygon(coordinates);
  const center = turf.centroid(polygon);
  return center.geometry.coordinates as [number, number];
}

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plot, PlotGeometry } from '@/hooks/usePlots';
import { calculatePolygonArea } from '@/lib/kmlParser';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PlotWithStatus extends Plot {
  status?: 'completed' | 'in_progress' | 'pending' | 'none';
}

interface MapContainerProps {
  plots: PlotWithStatus[];
  onPlotClick?: (plot: Plot) => void;
  onDrawComplete?: (geometry: PlotGeometry, area: number) => void;
  isDrawing?: boolean;
  selectedPlotId?: string | null;
  center?: [number, number];
  zoom?: number;
}

const STATUS_COLORS = {
  completed: '#22C55E', // green
  in_progress: '#F59E0B', // amber
  pending: '#EF4444', // red
  none: '#3B82F6', // blue
};

export function MapContainer({
  plots,
  onPlotClick,
  onDrawComplete,
  isDrawing = false,
  selectedPlotId,
  center = [-15.7801, -47.9292], // Default: Brasília
  zoom = 5,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const drawingLayerRef = useRef<L.Polygon | null>(null);
  const drawingPointsRef = useRef<L.LatLng[]>([]);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add satellite layer option
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri',
        maxZoom: 19,
      }
    );

    // Layer control
    const baseMaps = {
      'Mapa': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }),
      'Satélite': satellite,
    };

    L.control.layers(baseMaps).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle drawing mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const clearDrawing = () => {
      if (drawingLayerRef.current) {
        map.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      }
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
      drawingPointsRef.current = [];
    };

    if (isDrawing) {
      map.getContainer().style.cursor = 'crosshair';

      const handleClick = (e: L.LeafletMouseEvent) => {
        const point = e.latlng;
        drawingPointsRef.current.push(point);

        // Add point marker
        const marker = L.circleMarker(point, {
          radius: 6,
          fillColor: '#3B82F6',
          color: '#1D4ED8',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map);
        markersRef.current.push(marker);

        // Update polygon preview
        if (drawingPointsRef.current.length >= 2) {
          if (drawingLayerRef.current) {
            map.removeLayer(drawingLayerRef.current);
          }
          drawingLayerRef.current = L.polygon(drawingPointsRef.current, {
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.3,
            weight: 2,
          }).addTo(map);
        }
      };

      const handleDoubleClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        
        if (drawingPointsRef.current.length >= 3 && onDrawComplete) {
          const coordinates = drawingPointsRef.current.map(p => [p.lng, p.lat]);
          // Close the polygon
          coordinates.push([...coordinates[0]]);
          
          const geometry: PlotGeometry = {
            type: 'Polygon',
            coordinates: [coordinates],
          };
          
          const area = calculatePolygonArea(coordinates);
          onDrawComplete(geometry, area);
        }
        
        clearDrawing();
      };

      map.on('click', handleClick);
      map.on('dblclick', handleDoubleClick);
      map.doubleClickZoom.disable();

      return () => {
        map.off('click', handleClick);
        map.off('dblclick', handleDoubleClick);
        map.doubleClickZoom.enable();
        map.getContainer().style.cursor = '';
        clearDrawing();
      };
    } else {
      map.getContainer().style.cursor = '';
      clearDrawing();
    }
  }, [isDrawing, onDrawComplete]);

  // Render plots
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polygons
    polygonsRef.current.forEach(polygon => map.removeLayer(polygon));
    polygonsRef.current.clear();

    // Add plot polygons
    plots.forEach(plot => {
      if (!plot.geometry?.coordinates) return;

      // Convert GeoJSON coordinates to Leaflet format
      const latLngs = plot.geometry.coordinates[0].map(coord => 
        L.latLng(coord[1], coord[0])
      );

      const color = STATUS_COLORS[plot.status || 'none'] || plot.color || '#3B82F6';
      const isSelected = plot.id === selectedPlotId;

      const polygon = L.polygon(latLngs, {
        color: isSelected ? '#1D4ED8' : color,
        fillColor: color,
        fillOpacity: isSelected ? 0.5 : 0.3,
        weight: isSelected ? 3 : 2,
      });

      // Add popup with plot info
      polygon.bindPopup(`
        <div class="p-2">
          <strong>${plot.name}</strong><br/>
          ${plot.area_hectares ? `Área: ${plot.area_hectares} ha` : ''}
        </div>
      `);

      polygon.on('click', () => {
        if (onPlotClick && !isDrawing) {
          onPlotClick(plot);
        }
      });

      polygon.addTo(map);
      polygonsRef.current.set(plot.id, polygon);
    });

    // Fit bounds if there are plots
    if (plots.length > 0) {
      const allCoords: L.LatLng[] = [];
      plots.forEach(plot => {
        if (plot.geometry?.coordinates) {
          plot.geometry.coordinates[0].forEach(coord => {
            allCoords.push(L.latLng(coord[1], coord[0]));
          });
        }
      });
      
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [plots, selectedPlotId, isDrawing, onPlotClick]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
    />
  );
}

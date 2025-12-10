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
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Satellite layer as default
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri',
        maxZoom: 19,
      }
    );

    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      layers: [satellite], // Start with satellite
    });

    // Layer control
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    const baseMaps = {
      'Satélite': satellite,
      'Mapa': streets,
    };

    L.control.layers(baseMaps).addTo(map);

    // Custom locate control
    const LocateControl = L.Control.extend({
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = 'Minha Localização';
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:6px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>`;
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.backgroundColor = 'white';
        button.style.cursor = 'pointer';
        
        L.DomEvent.on(button, 'click', function(e) {
          L.DomEvent.preventDefault(e);
          locateUser();
        });
        
        return container;
      },
    });

    new LocateControl({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    // Try to get user location on load
    locateUser();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const locateUser = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setIsLocating(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const latlng = L.latLng(latitude, longitude);

          // Remove existing user marker
          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          // Add user location marker
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `<div style="
              width: 20px;
              height: 20px;
              background: #3B82F6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          userMarkerRef.current = L.marker(latlng, { icon: userIcon })
            .addTo(map)
            .bindPopup('Sua localização');

          // Only fly to location if no plots are loaded
          if (polygonsRef.current.size === 0) {
            map.flyTo(latlng, 15, { duration: 1.5 });
          }

          setIsLocating(false);
        },
        (error) => {
          console.warn('Erro ao obter localização:', error.message);
          setIsLocating(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } else {
      setIsLocating(false);
    }
  };

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

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

interface PlotWithStatus extends Omit<Plot, 'status'> {
  status: string;
  displayStatus?: string;
}

interface ApplicationProduct {
  product_name: string;
  dose_per_ha: number;
  total_amount: number;
}

interface MapContainerProps {
  plots: PlotWithStatus[];
  onPlotClick?: (plot: Plot) => void;
  onDrawComplete?: (geometry: PlotGeometry, area: number) => void;
  isDrawing?: boolean;
  selectedPlotId?: string | null;
  center?: [number, number];
  zoom?: number;
  plotApplicationProducts?: Map<string, ApplicationProduct[]>;
  onPointsChange?: (count: number) => void;
  undoTrigger?: number;
}

const STATUS_COLORS: Record<string, string> = {
  'concluída': '#22C55E', // green
  'em_andamento': '#F59E0B', // amber
  'planejada': '#3B82F6', // blue
  'cancelada': '#6B7280', // gray
  // Legacy fallbacks
  'completed': '#22C55E',
  'in_progress': '#F59E0B',
  'pending': '#EF4444',
  'none': '#3B82F6',
};

export function MapContainer({
  plots,
  onPlotClick,
  onDrawComplete,
  isDrawing = false,
  selectedPlotId,
  center = [-15.7801, -47.9292], // Default: Brasília
  zoom = 5,
  plotApplicationProducts,
  onPointsChange,
  undoTrigger,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());
  const labelsRef = useRef<Map<string, L.Marker>>(new Map());
  const drawingLayerRef = useRef<L.Polygon | null>(null);
  const drawingPointsRef = useRef<L.LatLng[]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const activePopupRef = useRef<L.Popup | null>(null);
  const onPointsChangeRef = useRef(onPointsChange);
  const onDrawCompleteRef = useRef(onDrawComplete);
  const [isLocating, setIsLocating] = useState(false);

  // Keep refs updated
  useEffect(() => {
    onPointsChangeRef.current = onPointsChange;
    onDrawCompleteRef.current = onDrawComplete;
  }, [onPointsChange, onDrawComplete]);

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

  // Handle undo trigger
  useEffect(() => {
    if (!isDrawing || undoTrigger === undefined || undoTrigger === 0) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (drawingPointsRef.current.length > 0) {
      // Remove last point
      drawingPointsRef.current.pop();
      
      // Remove last marker
      const lastMarker = markersRef.current.pop();
      if (lastMarker) {
        map.removeLayer(lastMarker);
      }

      // Update polygon preview
      if (drawingLayerRef.current) {
        map.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      }
      
      if (drawingPointsRef.current.length >= 2) {
        drawingLayerRef.current = L.polygon(drawingPointsRef.current, {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(map);
      }

      onPointsChangeRef.current?.(drawingPointsRef.current.length);
    }
  }, [undoTrigger, isDrawing]);

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
      onPointsChangeRef.current?.(0);
    };

    const updatePolygon = () => {
      if (drawingLayerRef.current) {
        map.removeLayer(drawingLayerRef.current);
        drawingLayerRef.current = null;
      }
      
      if (drawingPointsRef.current.length >= 2) {
        drawingLayerRef.current = L.polygon(drawingPointsRef.current, {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(map);
      }
    };

    const createDraggableIcon = (isFirst: boolean = false) => {
      return L.divIcon({
        className: 'drawing-point-marker',
        html: `<div style="
          width: ${isFirst ? '16px' : '12px'};
          height: ${isFirst ? '16px' : '12px'};
          background: ${isFirst ? '#22C55E' : '#3B82F6'};
          border: 2px solid ${isFirst ? '#16A34A' : '#1D4ED8'};
          border-radius: 50%;
          cursor: move;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [isFirst ? 16 : 12, isFirst ? 16 : 12],
        iconAnchor: [isFirst ? 8 : 6, isFirst ? 8 : 6],
      });
    };

    if (isDrawing) {
      map.getContainer().style.cursor = 'crosshair';

      const handleClick = (e: L.LeafletMouseEvent) => {
        const point = e.latlng;
        const pointIndex = drawingPointsRef.current.length;
        drawingPointsRef.current.push(point);

        // Add draggable marker
        const marker = L.marker(point, {
          icon: createDraggableIcon(pointIndex === 0),
          draggable: true,
        }).addTo(map);

        // Handle marker drag
        marker.on('drag', () => {
          const newPos = marker.getLatLng();
          drawingPointsRef.current[pointIndex] = newPos;
          updatePolygon();
        });

        markersRef.current.push(marker);
        onPointsChangeRef.current?.(drawingPointsRef.current.length);

        // Update polygon preview
        updatePolygon();
      };

      const handleDoubleClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        
        if (drawingPointsRef.current.length >= 3 && onDrawCompleteRef.current) {
          const coordinates = drawingPointsRef.current.map(p => [p.lng, p.lat]);
          // Close the polygon
          coordinates.push([...coordinates[0]]);
          
          const geometry: PlotGeometry = {
            type: 'Polygon',
            coordinates: [coordinates],
          };
          
          const area = calculatePolygonArea(coordinates);
          onDrawCompleteRef.current(geometry, area);
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
  }, [isDrawing]);

  // Render plots
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polygons and labels
    polygonsRef.current.forEach(polygon => map.removeLayer(polygon));
    polygonsRef.current.clear();
    labelsRef.current.forEach(label => map.removeLayer(label));
    labelsRef.current.clear();

    // Add plot polygons
    plots.forEach(plot => {
      if (!plot.geometry?.coordinates) return;

      // Convert GeoJSON coordinates to Leaflet format
      const latLngs = plot.geometry.coordinates[0].map(coord => 
        L.latLng(coord[1], coord[0])
      );

      const statusKey = (plot.displayStatus || plot.status || 'pending') as keyof typeof STATUS_COLORS;
      const color = STATUS_COLORS[statusKey] || '#3B82F6';
      const isSelected = plot.id === selectedPlotId;
      
      // Darken the color for selected border
      const darkenColor = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const factor = 0.6; // darker
        return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
      };

      const polygon = L.polygon(latLngs, {
        color: isSelected ? darkenColor(color) : color,
        fillColor: color,
        fillOpacity: isSelected ? 0.55 : 0.4,
        weight: isSelected ? 3 : 2,
      });

      // Calculate center for label
      const bounds = polygon.getBounds();
      const center = bounds.getCenter();

      // Create label with name and area
      const labelContent = `<div style="
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        text-align: center;
        pointer-events: none;
      ">
        <div>${plot.name}</div>
        ${plot.area_hectares ? `<div style="font-size:10px;opacity:0.9">${plot.area_hectares} ha</div>` : ''}
      </div>`;

      const labelIcon = L.divIcon({
        className: 'plot-label',
        html: labelContent,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const labelMarker = L.marker(center, { 
        icon: labelIcon,
        interactive: false,
      }).addTo(map);
      labelsRef.current.set(plot.id, labelMarker);

      // Build popup content with products
      const products = plotApplicationProducts?.get(plot.id) || [];
      let popupContent = `
        <div style="min-width: 180px; padding: 8px;">
          <strong style="font-size: 14px;">${plot.name}</strong><br/>
          ${plot.area_hectares ? `<span style="color: #666;">Área: ${Number(plot.area_hectares).toFixed(2)} ha</span><br/>` : ''}
      `;
      
      if (products.length > 0) {
        popupContent += `
          <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ddd;"/>
          <div style="font-weight: 500; margin-bottom: 4px;">Produtos Aplicados:</div>
          <ul style="margin: 0; padding-left: 16px; font-size: 12px;">
        `;
        products.forEach(p => {
          popupContent += `<li>${p.product_name}: ${Number(p.dose_per_ha).toFixed(2)} /ha (${Number(p.total_amount).toFixed(2)} total)</li>`;
        });
        popupContent += `</ul>`;
      } else {
        popupContent += `<span style="font-size: 12px; color: #999;">Nenhum produto aplicado</span>`;
      }
      
      popupContent += `</div>`;

      polygon.on('click', (e) => {
        if (isDrawing) return;
        L.DomEvent.stopPropagation(e);
        
        // Close active popup if clicking same polygon
        if (activePopupRef.current && map.hasLayer(activePopupRef.current)) {
          map.closePopup(activePopupRef.current);
          activePopupRef.current = null;
          
          if (onPlotClick) {
            onPlotClick(plot as Plot);
          }
          return;
        }
        
        // Close any existing popup
        if (activePopupRef.current) {
          map.closePopup(activePopupRef.current);
        }
        
        // Open new popup
        const popup = L.popup({
          closeButton: true,
          autoClose: true,
          closeOnClick: false,
        })
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(map);
        
        activePopupRef.current = popup;
        
        if (onPlotClick) {
          onPlotClick(plot as Plot);
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

    // Close popup when clicking on map (not on polygon)
    const handleMapClick = () => {
      if (activePopupRef.current) {
        map.closePopup(activePopupRef.current);
        activePopupRef.current = null;
      }
    };
    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [plots, selectedPlotId, isDrawing, onPlotClick, plotApplicationProducts]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
    />
  );
}

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
  'concluída': '#22C55E',
  'em_andamento': '#F59E0B',
  'planejada': '#3B82F6',
  'cancelada': '#6B7280',
  'completed': '#22C55E',
  'in_progress': '#F59E0B',
  'pending': '#EF4444',
  'none': '#3B82F6',
};

// Calculate font size based on zoom level
const getFontSizeForZoom = (zoom: number): number => {
  if (zoom >= 18) return 18;
  if (zoom >= 16) return 16;
  if (zoom >= 14) return 14;
  if (zoom >= 12) return 12;
  if (zoom >= 10) return 11;
  return 10;
};

export function MapContainer({
  plots,
  onPlotClick,
  onDrawComplete,
  isDrawing = false,
  selectedPlotId,
  center = [-15.7801, -47.9292],
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
  const areaLabelRef = useRef<L.Marker | null>(null);
  const onPointsChangeRef = useRef(onPointsChange);
  const onDrawCompleteRef = useRef(onDrawComplete);
  const [isLocating, setIsLocating] = useState(false);
  const currentZoomRef = useRef(zoom);

  useEffect(() => {
    onPointsChangeRef.current = onPointsChange;
    onDrawCompleteRef.current = onDrawComplete;
  }, [onPointsChange, onDrawComplete]);

  // Update labels when zoom changes
  const updateLabelsForZoom = (zoomLevel: number) => {
    const fontSize = getFontSizeForZoom(zoomLevel);
    currentZoomRef.current = zoomLevel;
    
    labelsRef.current.forEach((marker, plotId) => {
      const plot = plots.find(p => p.id === plotId);
      if (!plot) return;
      
      const labelContent = createLabelContent(plot.name, plot.area_hectares, fontSize);

      marker.setIcon(L.divIcon({
        className: 'plot-label',
        html: labelContent,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }));
    });

    // Update area label during drawing
    if (areaLabelRef.current && drawingPointsRef.current.length >= 3) {
      const coordinates = drawingPointsRef.current.map(p => [p.lng, p.lat]);
      coordinates.push([...coordinates[0]]);
      const area = calculatePolygonArea(coordinates);
      
      areaLabelRef.current.setIcon(L.divIcon({
        className: 'area-label-marker',
        html: createAreaLabelContent(area, fontSize + 2),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }));
    }
  };

  // Create label content - just text with shadow for visibility
  const createLabelContent = (name: string, areaHectares: number | null, fontSize: number) => {
    return `<div style="
      color: white;
      font-size: ${fontSize}px;
      font-weight: 700;
      white-space: nowrap;
      text-align: center;
      pointer-events: none;
      text-shadow: 
        -2px -2px 3px rgba(0,0,0,0.9),
        2px -2px 3px rgba(0,0,0,0.9),
        -2px 2px 3px rgba(0,0,0,0.9),
        2px 2px 3px rgba(0,0,0,0.9),
        0px 0px 6px rgba(0,0,0,0.8);
      transform: translate(-50%, -50%);
    ">
      <div>${name}</div>
      ${areaHectares ? `<div style="font-size:${Math.max(fontSize - 2, 10)}px;opacity:0.95">${Number(areaHectares).toFixed(2)} ha</div>` : ''}
    </div>`;
  };

  // Create area label content during drawing
  const createAreaLabelContent = (area: number, fontSize: number) => {
    return `<div style="
      color: white;
      font-weight: 700;
      font-size: ${fontSize}px;
      white-space: nowrap;
      text-shadow: 
        -2px -2px 3px rgba(0,0,0,0.9),
        2px -2px 3px rgba(0,0,0,0.9),
        -2px 2px 3px rgba(0,0,0,0.9),
        2px 2px 3px rgba(0,0,0,0.9),
        0px 0px 6px rgba(0,0,0,0.8);
      transform: translate(-50%, -50%);
    ">${area.toFixed(2)} ha</div>`;
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

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
      layers: [satellite],
    });

    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    const baseMaps = {
      'Satélite': satellite,
      'Mapa': streets,
    };

    L.control.layers(baseMaps).addTo(map);

    // Zoom change handler for responsive labels
    map.on('zoomend', () => {
      const newZoom = map.getZoom();
      updateLabelsForZoom(newZoom);
    });

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

          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

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
      drawingPointsRef.current.pop();
      
      const lastMarker = markersRef.current.pop();
      if (lastMarker) {
        map.removeLayer(lastMarker);
      }

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
      if (areaLabelRef.current) {
        map.removeLayer(areaLabelRef.current);
        areaLabelRef.current = null;
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
      if (areaLabelRef.current) {
        map.removeLayer(areaLabelRef.current);
        areaLabelRef.current = null;
      }
      
      if (drawingPointsRef.current.length >= 2) {
        drawingLayerRef.current = L.polygon(drawingPointsRef.current, {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(map);

        if (drawingPointsRef.current.length >= 3) {
          const coordinates = drawingPointsRef.current.map(p => [p.lng, p.lat]);
          coordinates.push([...coordinates[0]]);
          const area = calculatePolygonArea(coordinates);
          
          const bounds = drawingLayerRef.current.getBounds();
          const center = bounds.getCenter();
          const fontSize = getFontSizeForZoom(map.getZoom());
          
          areaLabelRef.current = L.marker(center, {
            icon: L.divIcon({
              className: 'area-label-marker',
              html: createAreaLabelContent(area, fontSize + 2),
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            }),
            interactive: false,
          }).addTo(map);
        }
      }
    };

    const createDraggableIcon = (isFirst: boolean = false) => {
      const pointColor = isFirst ? '#22C55E' : '#3B82F6';
      const borderColor = isFirst ? '#16A34A' : '#1D4ED8';
      const pointSize = isFirst ? 14 : 10;
      const handleSize = 36;
      const stemHeight = 50;
      
      return L.divIcon({
        className: 'drawing-point-marker',
        html: `
          <div style="
            position: relative;
            width: ${handleSize}px;
            height: ${stemHeight + pointSize}px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: ${pointSize}px;
              height: ${pointSize}px;
              background: ${pointColor};
              border: 2px solid ${borderColor};
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            "></div>
            <div style="
              position: absolute;
              top: ${pointSize}px;
              left: 50%;
              transform: translateX(-50%);
              width: 2px;
              height: ${stemHeight - handleSize}px;
              background: ${pointColor};
            "></div>
            <div style="
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: ${handleSize}px;
              height: ${handleSize}px;
              background: white;
              border: 3px solid ${pointColor};
              border-radius: 8px;
              cursor: move;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${pointColor}" stroke-width="2.5">
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [handleSize, stemHeight + pointSize],
        iconAnchor: [handleSize / 2, 0],
      });
    };

    if (isDrawing) {
      map.getContainer().style.cursor = 'crosshair';

      const handleClick = (e: L.LeafletMouseEvent) => {
        if ((e.originalEvent.target as HTMLElement)?.closest('.drawing-point-marker')) {
          return;
        }
        
        const point = e.latlng;
        const pointIndex = drawingPointsRef.current.length;
        drawingPointsRef.current.push(point);

        const marker = L.marker(point, {
          icon: createDraggableIcon(pointIndex === 0),
          draggable: true,
          autoPan: true,
        }).addTo(map);

        marker.on('mousedown', (e) => {
          L.DomEvent.stopPropagation(e as any);
        });

        marker.on('drag', () => {
          const newPos = marker.getLatLng();
          drawingPointsRef.current[pointIndex] = newPos;
          updatePolygon();
        });

        marker.on('dragend', () => {
          updatePolygon();
        });

        markersRef.current.push(marker);
        onPointsChangeRef.current?.(drawingPointsRef.current.length);

        updatePolygon();
      };

      const handleDoubleClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        
        if (drawingPointsRef.current.length >= 3 && onDrawCompleteRef.current) {
          const coordinates = drawingPointsRef.current.map(p => [p.lng, p.lat]);
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

    polygonsRef.current.forEach(polygon => map.removeLayer(polygon));
    polygonsRef.current.clear();
    labelsRef.current.forEach(label => map.removeLayer(label));
    labelsRef.current.clear();

    const currentZoom = map.getZoom();
    const fontSize = getFontSizeForZoom(currentZoom);

    plots.forEach(plot => {
      if (!plot.geometry?.coordinates) return;

      const latLngs = plot.geometry.coordinates[0].map(coord => 
        L.latLng(coord[1], coord[0])
      );

      const statusKey = (plot.displayStatus || plot.status || 'pending') as keyof typeof STATUS_COLORS;
      const color = STATUS_COLORS[statusKey] || '#3B82F6';
      const isSelected = plot.id === selectedPlotId;
      
      const darkenColor = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const factor = 0.6;
        return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
      };

      const polygon = L.polygon(latLngs, {
        color: isSelected ? darkenColor(color) : color,
        fillColor: color,
        fillOpacity: isSelected ? 0.55 : 0.4,
        weight: isSelected ? 3 : 2,
      });

      // Calculate centroid for better label placement
      const bounds = polygon.getBounds();
      const center = bounds.getCenter();

      const labelContent = createLabelContent(plot.name, plot.area_hectares, fontSize);

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
        
        if (activePopupRef.current && map.hasLayer(activePopupRef.current)) {
          map.closePopup(activePopupRef.current);
          activePopupRef.current = null;
          
          if (onPlotClick) {
            onPlotClick(plot as Plot);
          }
          return;
        }
        
        if (activePopupRef.current) {
          map.closePopup(activePopupRef.current);
        }
        
        const popup = L.popup({
          closeButton: true,
          autoClose: true,
          closeOnClick: false,
          autoPan: false, // Don't change zoom/pan when popup opens
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

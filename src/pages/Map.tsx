import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Upload, 
  Pencil, 
  Trash2, 
  Map as MapIcon, 
  MousePointer,
  Download,
  Undo2,
  X,
  Maximize2,
  Layers,
  Link,
  CheckSquare,
  Move
} from 'lucide-react';
import { MapContainer } from '@/components/map/MapContainer';
import { PlotDialog } from '@/components/map/PlotDialog';
import { KMLImportDialog } from '@/components/map/KMLImportDialog';
import { MapLegend } from '@/components/map/MapLegend';
import { Badge } from '@/components/ui/badge';
import { usePlots, Plot, PlotGeometry } from '@/hooks/usePlots';
import { useProperties } from '@/hooks/useProperties';
import { useApplications } from '@/hooks/useApplications';
import { toast } from 'sonner';

type PlotStatus = 'planejada' | 'em_andamento' | 'concluída' | 'cancelada' | 'sem_vinculo';

interface PlotWithStatus extends Plot {
  displayStatus: PlotStatus;
}

const STATUS_COLORS: Record<string, string> = {
  'concluída': '#22C55E',
  'em_andamento': '#F59E0B',
  'planejada': '#6B7280',
  'cancelada': '#EF4444',
  'sem_vinculo': '#9CA3AF',
};

export default function Map() {
  const { plots, isLoading, createPlot, updatePlot, deletePlot, refetch } = usePlots();
  const { properties } = useProperties();
  const { applications } = useApplications();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<Plot | null>(null);
  const [newGeometry, setNewGeometry] = useState<PlotGeometry | null>(null);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [drawingPointCount, setDrawingPointCount] = useState(0);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Multi-select state
  const [selectedPlotIds, setSelectedPlotIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkLinkDialogOpen, setBulkLinkDialogOpen] = useState(false);
  const [bulkPropertyId, setBulkPropertyId] = useState<string>('');

  // State for editing polygon shape
  const [isEditingShape, setIsEditingShape] = useState(false);
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);

  // Calculate plot display status based on linked applications
  const plotsWithStatus = useMemo<PlotWithStatus[]>(() => {
    return plots.map(plot => {
      const plotApps = applications.filter(app => app.plot_id === plot.id);
      
      let displayStatus: PlotStatus = 'sem_vinculo';
      
      if (plotApps.length > 0) {
        const hasEmAndamento = plotApps.some(app => app.status === 'em_andamento');
        const hasConcluida = plotApps.some(app => app.status === 'concluída');
        const hasPlanejada = plotApps.some(app => app.status === 'planejada');
        const allCancelada = plotApps.every(app => app.status === 'cancelada');
        
        if (hasEmAndamento) {
          displayStatus = 'em_andamento';
        } else if (hasConcluida) {
          displayStatus = 'concluída';
        } else if (hasPlanejada) {
          displayStatus = 'planejada';
        } else if (allCancelada) {
          displayStatus = 'cancelada';
        }
      }
      
      const color = STATUS_COLORS[displayStatus] || '#9CA3AF';
      
      return { ...plot, displayStatus, color };
    });
  }, [plots, applications]);

  // Build map of plot -> application info (products + total area applied)
  const plotApplicationInfo = useMemo(() => {
    type ProductInfo = {
      product_name: string;
      dose_per_ha: number;
      total_amount: number;
    };
    type PlotInfo = {
      products: ProductInfo[];
      totalAreaApplied: number;
    };
    const infoMap = new globalThis.Map<string, PlotInfo>();

    applications.forEach(app => {
      if (app.plot_id) {
        const existing = infoMap.get(app.plot_id) || { products: [], totalAreaApplied: 0 };
        
        // Add area applied from this application (only completed applications)
        if (app.status === 'concluída') {
          existing.totalAreaApplied += app.area_applied || 0;
        }
        
        // Add products
        if (app.application_products) {
          const products: ProductInfo[] = app.application_products.map(ap => ({
            product_name: ap.products?.name || 'Produto desconhecido',
            dose_per_ha: ap.dose_per_ha,
            total_amount: ap.total_amount,
          }));
          existing.products = [...existing.products, ...products];
        }
        
        infoMap.set(app.plot_id, existing);
      }
    });

    return infoMap;
  }, [applications]);

  // Filter plots by property
  const filteredPlots = useMemo(() => {
    if (propertyFilter === 'all') return plotsWithStatus;
    if (propertyFilter === 'none') return plotsWithStatus.filter(p => !p.property_id);
    return plotsWithStatus.filter(p => p.property_id === propertyFilter);
  }, [plotsWithStatus, propertyFilter]);

  const handleDrawComplete = (geometry: PlotGeometry, area: number) => {
    setNewGeometry(geometry);
    setCalculatedArea(area);
    setSelectedPlot(null);
    setPlotDialogOpen(true);
    setIsDrawing(false);
    setDrawingPointCount(0);
  };

  const handleUndoPoint = () => {
    setUndoTrigger(prev => prev + 1);
  };

  const handlePlotClick = (plot: Plot) => {
    setSelectedPlot(plot);
  };

  const handleEditPlot = () => {
    if (selectedPlot) {
      setNewGeometry(null);
      setPlotDialogOpen(true);
    }
  };

  const handleDeleteClick = () => {
    if (selectedPlot) {
      setPlotToDelete(selectedPlot);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (plotToDelete) {
      await deletePlot(plotToDelete.id);
      setSelectedPlot(null);
      setPlotToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleSavePlot = async (data: {
    name: string;
    property_id: string | null;
    area_hectares: number | null;
    geometry: PlotGeometry;
    status: string;
    notes: string | null;
  }) => {
    const saveData = {
      ...data,
      color: STATUS_COLORS[data.status as PlotStatus] || '#3B82F6',
    };
    if (selectedPlot) {
      await updatePlot({ id: selectedPlot.id, ...saveData });
    } else {
      await createPlot(saveData);
    }
    setSelectedPlot(null);
    setNewGeometry(null);
  };

  const handleImport = async (features: Array<{
    name: string;
    property_id: string | null;
    area_hectares: number | null;
    geometry: { type: 'Polygon'; coordinates: number[][][] };
    color: string;
    status: string;
    notes: string | null;
  }>) => {
    for (const feature of features) {
      await createPlot(feature);
    }
    toast.success(`${features.length} talhão(ões) importado(s) com sucesso!`);
  };

  const exportToKML = () => {
    if (filteredPlots.length === 0) {
      toast.error('Não há talhões para exportar');
      return;
    }

    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Talhões AgroDrone PRO</name>
    <description>Exportado em ${new Date().toLocaleDateString('pt-BR')}</description>`;

    filteredPlots.forEach(plot => {
      if (plot.geometry?.coordinates) {
        const coords = plot.geometry.coordinates[0]
          .map(c => `${c[0]},${c[1]},0`)
          .join(' ');

        kmlContent += `
    <Placemark>
      <name>${plot.name}</name>
      <description>${plot.area_hectares ? `Área: ${plot.area_hectares} ha` : ''}</description>
      <Style>
        <PolyStyle>
          <color>7f${plot.color.slice(5, 7)}${plot.color.slice(3, 5)}${plot.color.slice(1, 3)}</color>
        </PolyStyle>
        <LineStyle>
          <color>ff${plot.color.slice(5, 7)}${plot.color.slice(3, 5)}${plot.color.slice(1, 3)}</color>
          <width>2</width>
        </LineStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
      }
    });

    kmlContent += `
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talhoes-agrodrone-${new Date().toISOString().split('T')[0]}.kml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo KML exportado com sucesso!');
  };

  // Multi-select handlers
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedPlotIds(new Set());
  };

  const togglePlotSelection = (plotId: string) => {
    const newSelected = new Set(selectedPlotIds);
    if (newSelected.has(plotId)) {
      newSelected.delete(plotId);
    } else {
      newSelected.add(plotId);
    }
    setSelectedPlotIds(newSelected);
  };

  const selectAllPlots = () => {
    if (selectedPlotIds.size === filteredPlots.length) {
      setSelectedPlotIds(new Set());
    } else {
      setSelectedPlotIds(new Set(filteredPlots.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const plotId of selectedPlotIds) {
      await deletePlot(plotId);
    }
    toast.success(`${selectedPlotIds.size} talhão(ões) excluído(s)`);
    setSelectedPlotIds(new Set());
    setBulkDeleteDialogOpen(false);
    setIsSelectMode(false);
  };

  const handleBulkLink = async () => {
    for (const plotId of selectedPlotIds) {
      const plot = plots.find(p => p.id === plotId);
      if (plot) {
        await updatePlot({
          id: plotId,
          name: plot.name,
          property_id: bulkPropertyId || null,
          area_hectares: plot.area_hectares,
          geometry: plot.geometry,
          status: plot.status || 'planejada',
          notes: plot.notes,
        });
      }
    }
    toast.success(`${selectedPlotIds.size} talhão(ões) vinculado(s)`);
    setSelectedPlotIds(new Set());
    setBulkLinkDialogOpen(false);
    setBulkPropertyId('');
    setIsSelectMode(false);
  };

  // Stats
  const totalArea = filteredPlots.reduce((sum, p) => sum + (p.area_hectares || 0), 0);
  const completedArea = filteredPlots
    .filter(p => p.displayStatus === 'concluída')
    .reduce((sum, p) => sum + (p.area_hectares || 0), 0);
  const inProgressArea = filteredPlots
    .filter(p => p.displayStatus === 'em_andamento')
    .reduce((sum, p) => sum + (p.area_hectares || 0), 0);
  const plannedArea = filteredPlots
    .filter(p => p.displayStatus === 'planejada')
    .reduce((sum, p) => sum + (p.area_hectares || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    'planejada': 'Planejada',
    'em_andamento': 'Em Andamento',
    'concluída': 'Concluída',
    'cancelada': 'Cancelada',
    'sem_vinculo': 'Sem Vínculo',
  };
  const statusColors: Record<string, string> = {
    'planejada': 'bg-blue-500/20 text-blue-700',
    'em_andamento': 'bg-amber-500/20 text-amber-700',
    'concluída': 'bg-green-500/20 text-green-700',
    'cancelada': 'bg-gray-500/20 text-gray-700',
    'sem_vinculo': 'bg-gray-400/20 text-gray-500',
  };

  const handleStartEditShape = (plot: Plot) => {
    setEditingPlotId(plot.id);
    setIsEditingShape(true);
    setIsFullscreen(true);
  };

  const handleEditShapeComplete = async (geometry: PlotGeometry, area: number) => {
    if (editingPlotId) {
      const plot = plots.find(p => p.id === editingPlotId);
      if (plot) {
        await updatePlot({
          id: editingPlotId,
          name: plot.name,
          property_id: plot.property_id,
          area_hectares: area,
          geometry: geometry,
          status: plot.status || 'planejada',
          notes: plot.notes,
        });
        toast.success('Forma do talhão atualizada!');
      }
    }
    setIsEditingShape(false);
    setEditingPlotId(null);
  };

  // Fullscreen Map View
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col" style={{ touchAction: 'manipulation' }}>
        {/* Header bar with controls */}
        <div className="flex-shrink-0 h-14 bg-background/95 backdrop-blur border-b flex items-center justify-between px-3 gap-2 z-10">
          {/* Left side - Stats */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{totalArea.toFixed(1)} ha</span>
            {isEditingShape && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                Editando Forma
              </Badge>
            )}
          </div>

          {/* Center - Property filter */}
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <Layers className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="none">Sem Propriedade</SelectItem>
              {properties.map(prop => (
                <SelectItem key={prop.id} value={prop.id}>
                  {prop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Right side - Close button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setIsFullscreen(false);
              setIsEditingShape(false);
              setEditingPlotId(null);
              setIsDrawing(false);
              setDrawingPointCount(0);
            }}
            className="gap-1 h-9"
          >
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>

        {/* Map area - fills remaining space */}
        <div className="flex-1 relative">
          <MapContainer
            plots={filteredPlots}
            onPlotClick={handlePlotClick}
            onDrawComplete={isEditingShape ? handleEditShapeComplete : handleDrawComplete}
            isDrawing={isDrawing || isEditingShape}
            selectedPlotId={isEditingShape ? editingPlotId : selectedPlot?.id}
            plotApplicationInfo={plotApplicationInfo}
            onPointsChange={setDrawingPointCount}
            undoTrigger={undoTrigger}
            editingPlotGeometry={isEditingShape ? plots.find(p => p.id === editingPlotId)?.geometry : undefined}
          />

          {/* Floating action buttons - Bottom center */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] max-w-[95vw]">
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur rounded-xl p-2 shadow-xl border">
              {!isDrawing && !isEditingShape ? (
                <>
                  <Button
                    size="default"
                    onClick={() => setIsDrawing(true)}
                    className="gap-1 h-10 px-3"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Desenhar</span>
                  </Button>
                  <Button
                    size="default"
                    variant="outline"
                    onClick={() => setImportDialogOpen(true)}
                    className="gap-1 h-10 px-3"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Importar</span>
                  </Button>
                  <Button
                    size="default"
                    variant="outline"
                    onClick={exportToKML}
                    disabled={filteredPlots.length === 0}
                    className="gap-1 h-10 px-3"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 px-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-medium">{drawingPointCount}pts</span>
                  </div>
                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleUndoPoint}
                    disabled={drawingPointCount === 0}
                    className="gap-1 h-10 px-3"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="default"
                    variant="destructive"
                    onClick={() => {
                      setIsDrawing(false);
                      setIsEditingShape(false);
                      setEditingPlotId(null);
                      setDrawingPointCount(0);
                    }}
                    className="gap-1 h-10 px-3"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Drawing instructions */}
          {(isDrawing || isEditingShape) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500]">
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 shadow-lg text-sm font-medium">
                <p className="flex items-center gap-1">
                  <MousePointer className="h-3 w-3" />
                  {isEditingShape ? 'Redesenhe o talhão • Duplo toque para salvar' : 'Toque para pontos • Duplo toque para finalizar'}
                </p>
              </div>
            </div>
          )}

          {/* Legend - Bottom left */}
          <div className="absolute bottom-20 left-4 z-[500]">
            <MapLegend />
          </div>
        </div>

        {/* Dialogs */}
        <PlotDialog
          open={plotDialogOpen}
          onOpenChange={setPlotDialogOpen}
          plot={selectedPlot || undefined}
          geometry={newGeometry || undefined}
          calculatedArea={calculatedArea}
          onSave={handleSavePlot}
        />

        <KMLImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImport}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="z-[10000]">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Talhão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o talhão "{plotToDelete?.name}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Normal view with sidebar
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MapIcon className="h-6 w-6" />
            Mapa de Talhões
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredPlots.length} talhão(ões) • {totalArea.toFixed(1)} ha
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setIsFullscreen(true)}
          className="gap-2"
        >
          <Maximize2 className="h-5 w-5" />
          Abrir Mapa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{totalArea.toFixed(1)} ha</p>
        </Card>
        <Card className="p-3 bg-green-500/10">
          <p className="text-xs text-green-600">Concluído</p>
          <p className="text-lg font-bold text-green-700">{completedArea.toFixed(1)} ha</p>
        </Card>
        <Card className="p-3 bg-amber-500/10">
          <p className="text-xs text-amber-600">Em Andamento</p>
          <p className="text-lg font-bold text-amber-700">{inProgressArea.toFixed(1)} ha</p>
        </Card>
        <Card className="p-3 bg-blue-500/10">
          <p className="text-xs text-blue-600">Planejada</p>
          <p className="text-lg font-bold text-blue-700">{plannedArea.toFixed(1)} ha</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setIsFullscreen(true); setIsDrawing(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Desenhar Talhão
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Importar KML
        </Button>
        <Button variant="outline" onClick={exportToKML} disabled={filteredPlots.length === 0} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
        <Button 
          variant={isSelectMode ? "default" : "outline"} 
          onClick={toggleSelectMode} 
          className="gap-2"
        >
          <CheckSquare className="h-4 w-4" />
          Selecionar
        </Button>
      </div>

      {/* Bulk actions when in select mode */}
      {isSelectMode && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Button variant="outline" size="sm" onClick={selectAllPlots}>
            {selectedPlotIds.size === filteredPlots.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedPlotIds.size} selecionado(s)
          </span>
          {selectedPlotIds.size > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBulkLinkDialogOpen(true)}
                className="gap-1"
              >
                <Link className="h-4 w-4" />
                Vincular
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </>
          )}
        </div>
      )}

      {/* Property Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Filtrar por Propriedade</label>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as propriedades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Propriedades</SelectItem>
            <SelectItem value="none">Sem Propriedade</SelectItem>
            {properties.map(prop => (
              <SelectItem key={prop.id} value={prop.id}>
                {prop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plot List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Talhões ({filteredPlots.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredPlots.map(plot => {
              const propertyName = properties.find(p => p.id === plot.property_id)?.name;
              return (
                <div
                  key={plot.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isSelectMode && (
                      <Checkbox
                        checked={selectedPlotIds.has(plot.id)}
                        onCheckedChange={() => togglePlotSelection(plot.id)}
                        className="h-5 w-5"
                      />
                    )}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: plot.color }}
                    />
                    <div className="flex-1 min-w-0">
                      {/* Property name above plot name */}
                      {propertyName && (
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          {propertyName}
                        </p>
                      )}
                      <p className="font-semibold text-lg truncate">{plot.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {plot.area_hectares && (
                          <span className="text-base font-bold text-primary">
                            {Number(plot.area_hectares).toFixed(2)} ha
                          </span>
                        )}
                        <Badge variant="secondary" className={`text-xs ${statusColors[plot.displayStatus] || ''}`}>
                          {statusLabels[plot.displayStatus] || plot.displayStatus}
                        </Badge>
                      </div>
                    </div>
                    {!isSelectMode && (
                      <div className="flex gap-1.5 flex-wrap">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-11 w-11"
                          title="Editar dados"
                          onClick={() => {
                            setSelectedPlot(plot);
                            setNewGeometry(null);
                            setPlotDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-11 w-11"
                          title="Editar forma"
                          onClick={() => handleStartEditShape(plot)}
                        >
                          <Move className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir"
                          onClick={() => {
                            setPlotToDelete(plot);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredPlots.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <MapIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum talhão encontrado</p>
                <p className="text-sm">Clique em "Abrir Mapa" para desenhar talhões</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PlotDialog
        open={plotDialogOpen}
        onOpenChange={setPlotDialogOpen}
        plot={selectedPlot || undefined}
        geometry={newGeometry || undefined}
        calculatedArea={calculatedArea}
        onSave={handleSavePlot}
      />

      <KMLImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Talhão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o talhão "{plotToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Talhões</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedPlotIds.size} talhão(ões)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Link Dialog */}
      <AlertDialog open={bulkLinkDialogOpen} onOpenChange={setBulkLinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vincular Talhões</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a propriedade para vincular {selectedPlotIds.size} talhão(ões).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={bulkPropertyId} onValueChange={setBulkPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma (remover vínculo)</SelectItem>
                {properties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkLink}>
              Vincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

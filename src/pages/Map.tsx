import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Upload, 
  Pencil, 
  Trash2, 
  Map as MapIcon, 
  Layers,
  MousePointer,
  Download
} from 'lucide-react';
import { MapContainer } from '@/components/map/MapContainer';
import { PlotDialog } from '@/components/map/PlotDialog';
import { KMLImportDialog } from '@/components/map/KMLImportDialog';
import { MapLegend } from '@/components/map/MapLegend';
import { usePlots, Plot, PlotGeometry } from '@/hooks/usePlots';
import { useProperties } from '@/hooks/useProperties';
import { useApplications } from '@/hooks/useApplications';
import { toast } from 'sonner';

type PlotStatus = 'completed' | 'in_progress' | 'pending' | 'none';

interface PlotWithStatus extends Plot {
  status?: PlotStatus;
}

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

  // Calculate plot status based on applications
  const plotsWithStatus = useMemo<PlotWithStatus[]>(() => {
    return plots.map(plot => {
      // Find applications for this plot
      const plotApplications = applications.filter(app => app.plot_id === plot.id);
      
      let status: PlotStatus = 'none';
      
      if (plotApplications.length > 0) {
        const hasCompleted = plotApplications.some(app => app.status === 'concluída');
        const hasInProgress = plotApplications.some(app => app.status === 'em_andamento');
        const hasPending = plotApplications.some(app => app.status === 'planejada');
        
        if (hasCompleted) {
          status = 'completed';
        } else if (hasInProgress) {
          status = 'in_progress';
        } else if (hasPending) {
          status = 'pending';
        }
      }
      
      return { ...plot, status };
    });
  }, [plots, applications]);

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
    color: string;
    notes: string | null;
  }) => {
    if (selectedPlot) {
      await updatePlot({ id: selectedPlot.id, ...data });
    } else {
      await createPlot(data);
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

  // Stats
  const totalArea = filteredPlots.reduce((sum, p) => sum + (p.area_hectares || 0), 0);
  const completedArea = filteredPlots
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.area_hectares || 0), 0);
  const inProgressArea = filteredPlots
    .filter(p => p.status === 'in_progress')
    .reduce((sum, p) => sum + (p.area_hectares || 0), 0);
  const pendingArea = filteredPlots
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.area_hectares || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4">
      {/* Sidebar */}
      <Card className="w-full lg:w-80 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="h-5 w-5" />
            Mapa de Talhões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isDrawing ? 'default' : 'outline'}
              onClick={() => setIsDrawing(!isDrawing)}
            >
              {isDrawing ? (
                <>
                  <MousePointer className="h-4 w-4 mr-1" />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Desenhar
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Importar KML
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportToKML}
              disabled={filteredPlots.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>

          {isDrawing && (
            <div className="p-3 bg-primary/10 rounded-lg text-sm">
              <p className="font-medium text-primary">Modo de Desenho Ativo</p>
              <p className="text-muted-foreground mt-1">
                Clique no mapa para adicionar pontos. Clique duplo para finalizar o polígono.
              </p>
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

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">{totalArea.toFixed(1)} ha</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <p className="text-green-600">Concluído</p>
              <p className="font-semibold">{completedArea.toFixed(1)} ha</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <p className="text-amber-600">Em Andamento</p>
              <p className="font-semibold">{inProgressArea.toFixed(1)} ha</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <p className="text-red-600">Pendente</p>
              <p className="font-semibold">{pendingArea.toFixed(1)} ha</p>
            </div>
          </div>

          {/* Selected Plot Actions */}
          {selectedPlot && (
            <Card className="bg-accent/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="font-medium truncate">{selectedPlot.name}</span>
                </div>
                {selectedPlot.area_hectares && (
                  <p className="text-sm text-muted-foreground">
                    Área: {selectedPlot.area_hectares} ha
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleEditPlot}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDeleteClick}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plot List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Talhões ({filteredPlots.length})
            </label>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredPlots.map(plot => (
                  <button
                    key={plot.id}
                    onClick={() => setSelectedPlot(plot)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      selectedPlot?.id === plot.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: plot.color }}
                      />
                      <span className="truncate flex-1">{plot.name}</span>
                      {plot.area_hectares && (
                        <span className="text-muted-foreground">
                          {plot.area_hectares} ha
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {filteredPlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum talhão cadastrado
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Legend */}
          <MapLegend />
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="flex-1 min-h-[400px]">
        <CardContent className="p-0 h-full">
          <MapContainer
            plots={filteredPlots}
            onPlotClick={handlePlotClick}
            onDrawComplete={handleDrawComplete}
            isDrawing={isDrawing}
            selectedPlotId={selectedPlot?.id}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PlotDialog
        open={plotDialogOpen}
        onOpenChange={setPlotDialogOpen}
        plot={selectedPlot}
        geometry={newGeometry}
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
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o talhão "{plotToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

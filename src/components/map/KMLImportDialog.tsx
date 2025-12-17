import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, MapPin } from 'lucide-react';
import { parseKML, ParsedKMLFeature } from '@/lib/kmlParser';
import { useProperties } from '@/hooks/useProperties';
import { toast } from 'sonner';

interface KMLImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (features: Array<{
    name: string;
    property_id: string | null;
    area_hectares: number | null;
    geometry: { type: 'Polygon'; coordinates: number[][][] };
    color: string;
    status: string;
    notes: string | null;
  }>) => Promise<void>;
}

export function KMLImportDialog({ open, onOpenChange, onImport }: KMLImportDialogProps) {
  const { properties } = useProperties();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedFeatures, setParsedFeatures] = useState<ParsedKMLFeature[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());
  const [propertyId, setPropertyId] = useState<string>('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const content = await file.text();
      const features = parseKML(content);
      
      if (features.length === 0) {
        toast.error('Nenhum polígono encontrado no arquivo KML');
        return;
      }

      setParsedFeatures(features);
      setSelectedFeatures(new Set(features.map((_, i) => i)));
      toast.success(`${features.length} talhão(ões) encontrado(s)`);
    } catch (error) {
      console.error('Erro ao processar KML:', error);
      toast.error('Erro ao processar arquivo KML');
    }
  };

  const toggleFeature = (index: number) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFeatures.size === parsedFeatures.length) {
      setSelectedFeatures(new Set());
    } else {
      setSelectedFeatures(new Set(parsedFeatures.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (selectedFeatures.size === 0) {
      toast.error('Selecione pelo menos um talhão para importar');
      return;
    }

    setIsLoading(true);
    try {
      const featuresToImport = parsedFeatures
        .filter((_, i) => selectedFeatures.has(i))
        .map(f => ({
          name: f.name,
          property_id: propertyId || null,
          area_hectares: f.areaHectares,
          geometry: f.geometry,
          color: '#3B82F6', // Blue for planejada status
          status: 'planejada',
          notes: null,
        }));

      await onImport(featuresToImport);
      onOpenChange(false);
      resetState();
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setParsedFeatures([]);
    setSelectedFeatures(new Set());
    setPropertyId('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg z-[10000] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5" />
            Importar Arquivo KML
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label>Arquivo KML</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".kml,.kmz"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-2" />
                {fileName || 'Selecionar arquivo KML'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Arquivos KML podem ser exportados do Google Earth, Fields Area Measure, etc.
            </p>
          </div>

          {/* Property Selection */}
          <div className="space-y-2">
            <Label>Vincular à Propriedade (opcional)</Label>
            <Select value={propertyId || "none"} onValueChange={(value) => setPropertyId(value === "none" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma propriedade" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="none">Nenhuma</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parsed Features List */}
          {parsedFeatures.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Talhões Encontrados ({parsedFeatures.length})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedFeatures.size === parsedFeatures.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </Button>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2">
                  {parsedFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={selectedFeatures.has(index)}
                        onCheckedChange={() => toggleFeature(index)}
                      />
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{feature.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {feature.areaHectares} ha
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || selectedFeatures.size === 0}
          >
            {isLoading ? 'Importando...' : `Importar ${selectedFeatures.size} talhão(ões)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

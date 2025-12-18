import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LEGEND_ITEMS = [
  { color: '#22C55E', label: 'Concluída' },
  { color: '#F59E0B', label: 'Em Andamento' },
  { color: '#6B7280', label: 'Planejada' },
  { color: '#EF4444', label: 'Cancelada' },
  { color: '#9CA3AF', label: 'Sem Vínculo' },
];

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className }: MapLegendProps) {
  return (
    <Card className={`bg-background/95 backdrop-blur shadow-xl border-2 ${className || ''}`}>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-bold">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <div className="space-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border-2 border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

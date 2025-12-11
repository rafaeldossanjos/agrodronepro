import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LEGEND_ITEMS = [
  { color: '#22C55E', label: 'Concluída' },
  { color: '#F59E0B', label: 'Em Andamento' },
  { color: '#3B82F6', label: 'Planejada' },
  { color: '#6B7280', label: 'Cancelada' },
];

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className }: MapLegendProps) {
  return (
    <Card className={className}>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <div className="space-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm border"
                style={{ backgroundColor: item.color, opacity: 0.7 }}
              />
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

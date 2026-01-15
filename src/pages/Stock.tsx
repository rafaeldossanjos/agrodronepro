import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Package, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  Search,
  AlertTriangle,
  Download,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStockMovements, StockMovement, StockBalance } from "@/hooks/useStockMovements";
import { useProperties } from "@/hooks/useProperties";
import { useProducts } from "@/hooks/useProducts";
import { StockMovementDialog } from "@/components/StockMovementDialog";

export default function Stock() {
  const { movements, balances, isLoading } = useStockMovements();
  const { properties } = useProperties();
  const { products } = useProducts();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter balances
  const filteredBalances = balances.filter((balance) => {
    const matchesSearch = 
      balance.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProperty = selectedProperty === "all" || balance.property_id === selectedProperty;
    return matchesSearch && matchesProperty;
  });

  // Filter movements
  const filteredMovements = movements.filter((movement) => {
    const matchesSearch = 
      movement.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProperty = selectedProperty === "all" || movement.property_id === selectedProperty;
    const matchesType = movementTypeFilter === "all" || movement.movement_type === movementTypeFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = new Date(movement.movement_date) >= new Date(dateFrom);
    }
    if (dateTo && matchesDate) {
      matchesDate = new Date(movement.movement_date) <= new Date(dateTo + 'T23:59:59');
    }
    
    return matchesSearch && matchesProperty && matchesType && matchesDate;
  });

  // Calculate totals for period report
  const periodTotals = filteredMovements.reduce((acc, mov) => {
    const key = `${mov.product_id}-${mov.product?.name}`;
    const product = products.find(p => p.id === mov.product_id);
    if (!acc[key]) {
      acc[key] = { 
        name: mov.product?.name || 'Produto', 
        unit: mov.unit,
        packageSize: product?.package_size || null,
        entradas: 0, 
        saidas: 0,
        ajustes: 0,
      };
    }
    if (mov.movement_type === 'entrada') {
      acc[key].entradas += Number(mov.quantity);
    } else if (mov.movement_type === 'saida') {
      acc[key].saidas += Number(mov.quantity);
    } else {
      acc[key].ajustes += Number(mov.quantity);
    }
    return acc;
  }, {} as Record<string, { name: string; unit: string; packageSize: number | null; entradas: number; saidas: number; ajustes: number }>);

  // Low stock alerts
  const lowStockItems = balances.filter(b => 
    b.min_quantity > 0 && b.current_quantity <= b.min_quantity
  );

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case 'saida': return <ArrowUpCircle className="h-5 w-5 text-red-500" />;
      case 'ajuste': return <RefreshCw className="h-5 w-5 text-blue-500" />;
    }
  };

  const getReasonLabel = (reason: string | null | undefined) => {
    const labels: Record<string, string> = {
      'compra': 'Compra',
      'devolucao': 'Devolução',
      'aplicacao': 'Aplicação',
      'perda': 'Perda/Vencimento',
      'transferencia': 'Transferência',
      'ajuste_inventario': 'Ajuste de Inventário',
      'correcao': 'Correção',
      'outro': 'Outro',
    };
    return labels[reason || ''] || reason || '-';
  };

  // Função para calcular quantidade em unidades/baldes
  const formatPackageQuantity = (quantity: number, packageSize: number | null, unit: string) => {
    if (!packageSize || packageSize <= 0) return null;
    const packages = quantity / packageSize;
    const unitLabel = unit.toLowerCase().includes('kg') || unit.toLowerCase().includes('l') ? 'balde(s)' : 'unidade(s)';
    return `${packages.toFixed(2)} ${unitLabel}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Saída de Estoque</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            Registre retiradas de produtos por propriedade
          </p>
        </div>
        <StockMovementDialog />
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="py-2">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-7 w-7" />
              <span className="font-medium text-lg sm:text-xl">
                {lowStockItems.length} produto(s) com estoque baixo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg sm:text-xl"
              />
            </div>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-40 sm:w-52 h-14 text-base sm:text-lg">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-base sm:text-lg">Todas</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id} className="text-base sm:text-lg">{prop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movements" className="space-y-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movements" className="text-lg sm:text-xl py-3">Movimentações</TabsTrigger>
          <TabsTrigger value="report" className="text-lg sm:text-xl py-3">Relatório</TabsTrigger>
        </TabsList>

        {/* Movimentações Tab */}
        <TabsContent value="movements" className="space-y-3">
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-full sm:w-44 h-12 text-base sm:text-lg">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all" className="text-base sm:text-lg">Todos tipos</SelectItem>
                    <SelectItem value="saida" className="text-base sm:text-lg">Saídas</SelectItem>
                    <SelectItem value="ajuste" className="text-base sm:text-lg">Ajustes</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full sm:w-44 h-12 text-base sm:text-lg"
                  placeholder="Data inicial"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full sm:w-44 h-12 text-base sm:text-lg"
                  placeholder="Data final"
                />
              </div>
            </CardContent>
          </Card>

          {filteredMovements.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <RefreshCw className="h-14 w-14 mx-auto text-muted-foreground mb-2" />
                <p className="text-lg sm:text-xl text-muted-foreground">Nenhuma movimentação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base sm:text-lg md:text-xl font-semibold">Data</TableHead>
                      <TableHead className="text-base sm:text-lg md:text-xl font-semibold">Produto</TableHead>
                      <TableHead className="text-base sm:text-lg md:text-xl font-semibold">Propriedade</TableHead>
                      <TableHead className="text-base sm:text-lg md:text-xl font-semibold">Quantidade</TableHead>
                      <TableHead className="text-base sm:text-lg md:text-xl font-semibold">Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => {
                      const product = products.find(p => p.id === movement.product_id);
                      const packageQty = formatPackageQuantity(Number(movement.quantity), product?.package_size || null, movement.unit);
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="text-base sm:text-lg md:text-xl">
                            {format(new Date(movement.movement_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium text-base sm:text-lg md:text-xl">{movement.product?.name}</TableCell>
                          <TableCell className="text-base sm:text-lg md:text-xl">{movement.property?.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-base sm:text-lg md:text-xl">
                                {Number(movement.quantity).toFixed(2)} {movement.unit}
                              </span>
                              {packageQty && (
                                <span className="text-sm sm:text-base text-muted-foreground">
                                  ({packageQty})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-base sm:text-lg md:text-xl">{getReasonLabel(movement.reason)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Relatório Tab */}
        <TabsContent value="report" className="space-y-2">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xl sm:text-2xl">Resumo por Período</CardTitle>
              <p className="text-base sm:text-lg text-muted-foreground">
                {dateFrom && dateTo 
                  ? `${format(new Date(dateFrom), "dd/MM/yyyy")} a ${format(new Date(dateTo), "dd/MM/yyyy")}`
                  : "Selecione um período nos filtros"
                }
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {Object.keys(periodTotals).length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-lg sm:text-xl">
                  Nenhum dado para o período selecionado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base sm:text-lg md:text-xl font-semibold">Produto</TableHead>
                        <TableHead className="text-right text-base sm:text-lg md:text-xl font-semibold">Quantidade</TableHead>
                        <TableHead className="text-right text-base sm:text-lg md:text-xl font-semibold">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(periodTotals).map(([key, data]) => {
                        const packageQty = formatPackageQuantity(data.saidas, data.packageSize, data.unit);
                        return (
                          <TableRow key={key}>
                            <TableCell className="font-medium text-base sm:text-lg md:text-xl">{data.name}</TableCell>
                            <TableCell className="text-right font-bold text-base sm:text-lg md:text-xl">
                              {packageQty || '-'}
                            </TableCell>
                            <TableCell className="text-right text-base sm:text-lg md:text-xl">
                              {data.saidas.toFixed(2)} {data.unit}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
  FileText,
  Filter,
  Pencil,
  Trash2,
  ArrowUpDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStockMovements, StockMovement, StockBalance } from "@/hooks/useStockMovements";
import { useProperties } from "@/hooks/useProperties";
import { useProducts } from "@/hooks/useProducts";
import { StockMovementDialog } from "@/components/StockMovementDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Stock() {
  const { movements, balances, isLoading, deleteMovement } = useStockMovements();
  const { properties } = useProperties();
  const { products } = useProducts();

  // Parse para data LOCAL (evita erro de timezone que mostra dia anterior)
  const parseMovementDate = (value: string) => {
    const v = String(value || "");
    // Se for ISO timestamp, extrai apenas a parte da data (YYYY-MM-DD) e interpreta como local
    const dateOnly = v.includes("T") ? v.split("T")[0] : v;
    const d = new Date(`${dateOnly}T12:00:00`); // meio-dia evita problemas de timezone
    return Number.isNaN(d.getTime()) ? null : d;
  };
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [sortField, setSortField] = useState<"date" | "name" | "quantity">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Filter balances
  const filteredBalances = balances.filter((balance) => {
    const productName = (
      balance.product?.name ??
      products.find(p => p.id === balance.product_id)?.name ??
      ''
    ).toLowerCase();
    const matchesSearch = productName.includes(searchTerm.toLowerCase());
    const matchesProperty = selectedProperty === "all" || balance.property_id === selectedProperty;
    return matchesSearch && matchesProperty;
  });

  // Filter movements
  const filteredMovements = movements.filter((movement) => {
    const productName = (
      movement.product?.name ??
      products.find(p => p.id === movement.product_id)?.name ??
      ''
    ).toLowerCase();
    const matchesSearch = productName.includes(searchTerm.toLowerCase());
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

  // Low stock alerts
  const lowStockItems = balances.filter(b => {
    const min = Number((b as any).min_quantity ?? 0);
    const cur = Number((b as any).current_quantity ?? 0);
    return min > 0 && cur <= min;
  });

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

  // Função para calcular quantidade em unidades
  const formatPackageQuantity = (quantity: number, packageSize: number | null) => {
    if (!packageSize || packageSize <= 0) return null;
    const packages = quantity / packageSize;
    return packages.toFixed(2);
  };

  const handleEditMovement = (movement: StockMovement) => {
    setEditingMovement(movement);
    setIsEditDialogOpen(true);
  };

  const handleEditComplete = () => {
    setEditingMovement(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteMovement = async () => {
    if (!deletingMovement) return;
    try {
      await deleteMovement(deletingMovement.id);
      setDeletingMovement(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const toggleSort = (field: "date" | "name" | "quantity") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  // Ordenar movimentações filtradas
  const sortedMovements = [...filteredMovements].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    
    switch (sortField) {
      case "date":
        const dateA = parseMovementDate(a.movement_date)?.getTime() || 0;
        const dateB = parseMovementDate(b.movement_date)?.getTime() || 0;
        return (dateA - dateB) * dir;
      case "name":
        const nameA = (a.product?.name || products.find(p => p.id === a.product_id)?.name || "").toLowerCase();
        const nameB = (b.product?.name || products.find(p => p.id === b.product_id)?.name || "").toLowerCase();
        return nameA.localeCompare(nameB, 'pt-BR') * dir;
      case "quantity":
        return (Number(a.quantity) - Number(b.quantity)) * dir;
      default:
        return 0;
    }
  });

  // Função para gerar PDF do relatório
  const generatePDF = () => {
    if (filteredMovements.length === 0) {
      toast.error("Nenhum dado para gerar o relatório");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Saída de Estoque", pageWidth / 2, 20, { align: "center" });
    
    // Período
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const periodoText = dateFrom && dateTo 
      ? `Período: ${format(new Date(dateFrom), "dd/MM/yyyy")} a ${format(new Date(dateTo), "dd/MM/yyyy")}`
      : `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
    doc.text(periodoText, pageWidth / 2, 30, { align: "center" });

    // Propriedade filtrada
    if (selectedProperty !== "all") {
      const propName = properties.find(p => p.id === selectedProperty)?.name || "";
      doc.text(`Propriedade: ${propName}`, pageWidth / 2, 38, { align: "center" });
    }

    // Agrupar movimentações por produto + data + motivo
    const groupedMovements: Record<string, {
      date: string;
      productName: string;
      propertyName: string;
      packageQty: number;
      totalQty: number;
      unit: string;
      reason: string;
      packageSize: number;
    }> = {};

    filteredMovements.forEach((mov) => {
      const product = products.find(p => p.id === mov.product_id);
       const parsedKeyDate = parseMovementDate(mov.movement_date);
       const dateKey = format(parsedKeyDate ?? new Date(), "yyyy-MM-dd");
      const key = `${mov.product_id}_${dateKey}_${mov.reason || 'outro'}`;
      const productName = mov.product?.name || product?.name || '';
      const propertyName = mov.property?.name || properties.find(p => p.id === mov.property_id)?.name || '';
      
      if (!groupedMovements[key]) {
        groupedMovements[key] = {
          date: mov.movement_date,
          productName,
          propertyName,
          packageQty: 0,
          totalQty: 0,
          unit: mov.unit,
          reason: mov.reason || '',
          packageSize: product?.package_size || 1,
        };
      }
      groupedMovements[key].totalQty += Number(mov.quantity);
    });

    // Calcular embalagens e ordenar
    const sortedMovements = Object.values(groupedMovements)
      .map(mov => ({
        ...mov,
        packageQty: mov.packageSize > 0 ? mov.totalQty / mov.packageSize : 0,
      }))
      .sort((a, b) => a.productName.toLowerCase().localeCompare(b.productName.toLowerCase(), 'pt-BR'));

    // Tabela de movimentações
     const tableData = sortedMovements.map((mov) => {
       const parsed = parseMovementDate(mov.date);
       return [
       parsed ? format(parsed, "dd/MM/yyyy", { locale: ptBR }) : "-",
      mov.productName,
      mov.propertyName,
      mov.packageQty > 0 ? mov.packageQty.toFixed(2) : "-",
      `${mov.totalQty.toFixed(2)} ${mov.unit}`,
      getReasonLabel(mov.reason)
     ];
     });

    autoTable(doc, {
      startY: selectedProperty !== "all" ? 45 : 38,
      head: [["Data", "Produto", "Propriedade", "Unidades", "Volume Total", "Motivo"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Somatório por produto
    let yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Somatório por Produto", 14, yPos);
    yPos += 4;

    // Agrupar totais por produto
    const productTotals: Record<string, { name: string; totalQty: number; totalUnits: number; unit: string }> = {};
    sortedMovements.forEach(mov => {
      if (!productTotals[mov.productName]) {
        productTotals[mov.productName] = { name: mov.productName, totalQty: 0, totalUnits: 0, unit: mov.unit };
      }
      productTotals[mov.productName].totalQty += mov.totalQty;
      productTotals[mov.productName].totalUnits += mov.packageQty;
    });

    const summaryData = Object.values(productTotals)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map(p => [p.name, p.totalUnits.toFixed(2), `${p.totalQty.toFixed(2)} ${p.unit}`]);

    autoTable(doc, {
      startY: yPos,
      head: [["Produto", "Total Unidades", "Volume Total"]],
      body: summaryData,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Salvar PDF
    const fileName = `relatorio_estoque_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
    doc.save(fileName);
    toast.success("PDF gerado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground">Saída de Estoque</h1>
          <p className="text-2xl text-muted-foreground">
            Registre retiradas de produtos por propriedade
          </p>
        </div>
        <StockMovementDialog />
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/10 rounded-xl">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-7 w-7" />
              <span className="font-semibold text-2xl">
                {lowStockItems.length} produto(s) com estoque baixo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="rounded-xl">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-14 text-base rounded-xl"
              />
            </div>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px] h-14 text-base rounded-xl">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-base py-3">Todas as propriedades</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id} className="text-base py-3">{prop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger value="movements" className="text-xl sm:text-2xl py-3 rounded-xl">Movimentações</TabsTrigger>
          <TabsTrigger value="report" className="text-xl sm:text-2xl py-3 rounded-xl">Relatório</TabsTrigger>
        </TabsList>

        {/* Movimentações Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px] h-14 text-base rounded-xl">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all" className="text-base py-3">Todos os tipos</SelectItem>
                    <SelectItem value="saida" className="text-base py-3">Saídas</SelectItem>
                    <SelectItem value="ajuste" className="text-base py-3">Ajustes</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-col w-full sm:w-auto sm:min-w-[160px]">
                  <label className="text-sm text-muted-foreground mb-2 font-medium">
                    Data inicial
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-14 text-base rounded-xl"
                  />
                </div>
                <div className="flex flex-col w-full sm:w-auto sm:min-w-[160px]">
                  <label className="text-sm text-muted-foreground mb-2 font-medium">
                    Data final
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-14 text-base rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredMovements.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-8 text-center">
                <RefreshCw className="h-14 w-14 mx-auto text-muted-foreground mb-3" />
                <p className="text-2xl text-muted-foreground">Nenhuma movimentação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="text-xl font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          <ArrowUpDown className={`h-4 w-4 ${sortField === "date" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-xl font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("name")}
                      >
                        <div className="flex items-center gap-1">
                          Produto
                          <ArrowUpDown className={`h-4 w-4 ${sortField === "name" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                      </TableHead>
                      <TableHead className="text-xl font-semibold">Propriedade</TableHead>
                      <TableHead 
                        className="text-xl font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort("quantity")}
                      >
                        <div className="flex items-center gap-1">
                          Quantidade
                          <ArrowUpDown className={`h-4 w-4 ${sortField === "quantity" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                      </TableHead>
                      <TableHead className="text-xl font-semibold">Motivo</TableHead>
                      <TableHead className="text-xl font-semibold w-28">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMovements.map((movement) => {
                      const product = products.find(p => p.id === movement.product_id);
                      const packageQty = formatPackageQuantity(Number(movement.quantity), product?.package_size || null);
                      const productName = movement.product?.name || product?.name || '-';
                      const propertyName = movement.property?.name || properties.find(p => p.id === movement.property_id)?.name || '-';
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="text-xl">
                             {(() => {
                               const d = parseMovementDate(movement.movement_date);
                               return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "-";
                             })()}
                          </TableCell>
                          <TableCell className="font-semibold text-xl">{productName}</TableCell>
                          <TableCell className="text-xl">{propertyName}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xl">
                                {Number(movement.quantity).toFixed(2)} {movement.unit}
                              </span>
                              {packageQty && (
                                <span className="text-lg text-muted-foreground">
                                  ({packageQty} unid.)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xl">{getReasonLabel(movement.reason)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMovement(movement)}
                                className="h-12 w-12 p-0 rounded-xl"
                              >
                                <Pencil className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingMovement(movement)}
                                className="h-12 w-12 p-0 rounded-xl text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
          
          {/* Dialog de edição */}
          <StockMovementDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            editingMovement={editingMovement}
            onEditComplete={handleEditComplete}
          />
        </TabsContent>

        {/* Relatório Tab */}
        <TabsContent value="report" className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl">Relatório de Saídas</CardTitle>
                  <p className="text-xl text-muted-foreground">
                    {dateFrom && dateTo 
                      ? `${format(new Date(dateFrom), "dd/MM/yyyy")} a ${format(new Date(dateTo), "dd/MM/yyyy")}`
                      : "Selecione um período nos filtros"
                    }
                  </p>
                </div>
                <Button 
                  onClick={generatePDF} 
                  className="h-14 px-6 text-base gap-2 rounded-xl"
                  disabled={filteredMovements.length === 0}
                >
                  <FileText className="h-5 w-5" />
                  Gerar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredMovements.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-2xl">
                  Nenhum dado para o período selecionado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xl font-semibold">Data</TableHead>
                        <TableHead className="text-xl font-semibold">Produto</TableHead>
                        <TableHead className="text-xl font-semibold">Propriedade</TableHead>
                        <TableHead className="text-right text-xl font-semibold">Quantidade</TableHead>
                        <TableHead className="text-right text-xl font-semibold">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...filteredMovements].sort((a, b) => {
                        const nameA = a.product?.name?.toLowerCase() || "";
                        const nameB = b.product?.name?.toLowerCase() || "";
                        return nameA.localeCompare(nameB, 'pt-BR');
                      }).map((mov) => {
                        const product = products.find(p => p.id === mov.product_id);
                        const packageQty = formatPackageQuantity(Number(mov.quantity), product?.package_size || null);
                        const productName = mov.product?.name || product?.name || '-';
                        const propertyName = mov.property?.name || properties.find(p => p.id === mov.property_id)?.name || '-';
                        return (
                          <TableRow key={mov.id}>
                            <TableCell className="text-lg">
                               {(() => {
                                 const d = parseMovementDate(mov.movement_date);
                                 return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "-";
                               })()}
                            </TableCell>
                            <TableCell className="font-semibold text-lg">{productName}</TableCell>
                            <TableCell className="text-lg">{propertyName}</TableCell>
                            <TableCell className="text-right font-bold text-lg">
                              {packageQty || "-"}
                            </TableCell>
                            <TableCell className="text-right text-lg">
                              {Number(mov.quantity).toFixed(2)} {mov.unit}
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingMovement} onOpenChange={(open) => !open && setDeletingMovement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMovement}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

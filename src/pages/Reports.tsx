import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, DollarSign, Target, Download, Filter, FileText } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const { applications } = useApplications();
  const { properties } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (selectedProperty !== "all") {
      filtered = filtered.filter((app: any) => app.property_id === selectedProperty);
    }

    const now = new Date();
    const daysAgo = new Date(now.getTime() - Number(selectedPeriod) * 24 * 60 * 60 * 1000);

    filtered = filtered.filter((app: any) => {
      const appDate = new Date(app.application_date + 'T00:00:00');
      return appDate >= daysAgo && appDate <= now;
    });

    return filtered;
  }, [applications, selectedProperty, selectedPeriod]);

  const stats = useMemo(() => {
    const totalArea = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.area_applied), 0);
    const totalCost = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.total_cost), 0);
    const avgCostPerHa = totalArea > 0 ? totalCost / totalArea : 0;
    const completedApps = filteredApplications.filter((app: any) => app.status === "concluída").length;
    const efficiency = filteredApplications.length > 0 ? (completedApps / filteredApplications.length) * 100 : 0;

    return { totalArea, totalCost, avgCostPerHa, efficiency };
  }, [filteredApplications]);

  const propertyStats = useMemo(() => {
    const grouped = filteredApplications.reduce((acc: any, app: any) => {
      const propId = app.property_id;
      if (!acc[propId]) {
        acc[propId] = {
          name: app.properties?.name || "Sem propriedade",
          area: 0,
          apps: 0,
          cost: 0,
        };
      }
      acc[propId].area += Number(app.area_applied);
      acc[propId].apps += 1;
      acc[propId].cost += Number(app.total_cost);
      return acc;
    }, {});

    return Object.values(grouped);
  }, [filteredApplications]);

  const productStats = useMemo(() => {
    const productMap: Record<string, { name: string; unit: string; totalAmount: number; totalCost: number; count: number }> = {};
    
    filteredApplications.forEach((app: any) => {
      if (app.application_products && app.application_products.length > 0) {
        app.application_products.forEach((ap: any) => {
          const productName = ap.products?.name || 'Produto desconhecido';
          const productUnit = ap.products?.unit || 'un';
          
          if (!productMap[productName]) {
            productMap[productName] = {
              name: productName,
              unit: productUnit,
              totalAmount: 0,
              totalCost: 0,
              count: 0,
            };
          }
          productMap[productName].totalAmount += Number(ap.total_amount || 0);
          productMap[productName].totalCost += Number(ap.total_cost || 0);
          productMap[productName].count += 1;
        });
      }
    });
    
    return Object.values(productMap).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredApplications]);

  const exportToCSV = () => {
    const headers = ["Propriedade", "Talhão", "Data", "Tipo", "Status", "Área (ha)", "Produtos", "Custo (R$)"];
    const rows = filteredApplications.map((app: any) => {
      const productsText = app.application_products && app.application_products.length > 0
        ? app.application_products.map((p: any) => 
            `${p.products?.name || 'N/A'}: ${Number(p.total_amount).toFixed(2)} ${p.products?.unit || ''}`
          ).join('; ')
        : 'Sem produtos';
      
      return [
        app.properties?.name || "N/A",
        app.plot_name || "N/A",
        format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }),
        app.application_type,
        app.status,
        app.area_applied,
        `"${productsText}"`,
        Number(app.total_cost).toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_aplicacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroDrone PRO', 14, 18);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Aplicações', 14, 28);
    
    // Período e filtros
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    const periodText = `Período: ${selectedPeriod} dias`;
    const propertyText = selectedProperty === "all" 
      ? "Todas as Propriedades" 
      : properties.find(p => p.id === selectedProperty)?.name || "N/A";
    doc.text(`${periodText} | ${propertyText}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth - 14, 28, { align: 'right' });

    let yPosition = 45;

    // Resumo Estatístico
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Estatístico', 14, yPosition);
    
    yPosition += 8;
    
    // Stats cards
    const statsData = [
      ['Área Total', `${stats.totalArea.toFixed(1)} ha`],
      ['Custo Total', `R$ ${stats.totalCost.toFixed(2)}`],
      ['Custo/ha', `R$ ${stats.avgCostPerHa.toFixed(2)}`],
      ['Eficiência', `${stats.efficiency.toFixed(0)}%`],
      ['Total Aplicações', `${filteredApplications.length}`],
    ];

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const cardWidth = (pageWidth - 28) / 3;
    statsData.forEach((stat, i) => {
      const x = 14 + (i % 3) * cardWidth;
      const y = yPosition + Math.floor(i / 3) * 16;
      
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, y, cardWidth - 4, 14, 2, 2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(stat[0], x + 4, y + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(stat[1], x + 4, y + 11);
    });

    yPosition += 40;

    // Produtos Aplicados
    if (productStats.length > 0) {
      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Produtos Aplicados', 14, yPosition);
      yPosition += 4;

      autoTable(doc, {
        startY: yPosition,
        head: [['Produto', 'Quantidade Total', 'Aplicações', 'Custo Total']],
        body: productStats.map(p => [
          p.name,
          `${p.totalAmount.toFixed(2)} ${p.unit}`,
          p.count.toString(),
          `R$ ${p.totalCost.toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    // Resumo por Propriedade
    if (propertyStats.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo por Propriedade', 14, yPosition);
      yPosition += 4;

      autoTable(doc, {
        startY: yPosition,
        head: [['Propriedade', 'Área (ha)', 'Aplicações', 'Custo Total', 'Custo/ha']],
        body: propertyStats.map((p: any) => [
          p.name,
          p.area.toFixed(1),
          p.apps.toString(),
          `R$ ${p.cost.toFixed(2)}`,
          `R$ ${(p.cost / p.area).toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    // Detalhes das Aplicações
    if (filteredApplications.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhes das Aplicações', 14, yPosition);
      yPosition += 4;

      const appRows = filteredApplications.map((app: any) => {
        const products = app.application_products && app.application_products.length > 0
          ? app.application_products.map((p: any) => 
              `${p.products?.name || 'N/A'}: ${Number(p.total_amount).toFixed(2)} ${p.products?.unit || ''}`
            ).join('\n')
          : '-';
        
        return [
          format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }),
          `${app.properties?.name || 'N/A'}${app.plot_name ? `\n${app.plot_name}` : ''}`,
          app.application_type,
          app.status,
          `${app.area_applied} ha`,
          products,
          `R$ ${Number(app.total_cost).toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Propriedade', 'Tipo', 'Status', 'Área', 'Produtos', 'Custo']],
        body: appRows,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 22 },
          4: { cellWidth: 18 },
          5: { cellWidth: 50 },
          6: { cellWidth: 22 },
        },
      });
    }

    // Footer em todas as páginas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} - AgroDrone PRO`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio_aplicacoes_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Relatórios e Análises
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visão analítica das suas operações e custos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={exportToCSV} variant="outline" className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button onClick={exportToPDF} className="gap-2 w-full sm:w-auto">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h2 className="font-semibold">Filtros</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Propriedade</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas as Propriedades</SelectItem>
                {properties.map((prop: any) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">Área Total</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            {stats.totalArea.toFixed(1)} ha
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {filteredApplications.length} aplicações
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            <p className="text-xs sm:text-sm text-muted-foreground">Custo Total</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            R$ {stats.totalCost.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            <p className="text-xs sm:text-sm text-muted-foreground">Custo/ha</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            R$ {stats.avgCostPerHa.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
            <p className="text-xs sm:text-sm text-muted-foreground">Eficiência</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            {stats.efficiency.toFixed(0)}%
          </p>
        </Card>
      </div>

      {/* Produtos Aplicados */}
      {productStats.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
            Produtos Aplicados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                    Produto
                  </th>
                  <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                    Quantidade Total
                  </th>
                  <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                    Aplicações
                  </th>
                  <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                    Custo Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productStats.map((row: any) => (
                  <tr key={row.name}>
                    <td className="py-3 text-xs sm:text-sm font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      {row.totalAmount.toFixed(2)} {row.unit}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      {row.count}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm font-medium text-foreground">
                      R$ {row.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detailed Table */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
          Resumo por Propriedade
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="pb-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                  Propriedade
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Área (ha)
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Aplicações
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Custo Total
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Custo/ha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {propertyStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </td>
                </tr>
              ) : (
                propertyStats.map((row: any) => (
                  <tr key={row.name}>
                    <td className="py-3 text-xs sm:text-sm font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      {row.area.toFixed(1)}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      {row.apps}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      R$ {row.cost.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm font-medium text-foreground">
                      R$ {(row.cost / row.area).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lista de Aplicações Detalhada */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
          Detalhes das Aplicações
        </h2>
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma aplicação no período selecionado
            </p>
          ) : (
            filteredApplications.map((app: any) => (
              <div key={app.id} className="border border-border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {app.properties?.name || 'Propriedade'}
                      {app.plot_name && ` - ${app.plot_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} • {app.application_type} • {app.area_applied} ha
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">
                    R$ {Number(app.total_cost).toFixed(2)}
                  </p>
                </div>
                
                {app.application_products && app.application_products.length > 0 && (
                  <div className="bg-muted/30 rounded p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Produtos:</p>
                    <div className="space-y-1">
                      {app.application_products.map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-foreground">{p.products?.name || 'Produto'}</span>
                          <span className="text-muted-foreground">
                            {Number(p.total_amount).toFixed(2)} {p.products?.unit || ''} - R$ {Number(p.total_cost).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

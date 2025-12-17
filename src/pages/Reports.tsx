import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, DollarSign, Target, Download, Filter, FileText, X, MapPin, FlaskConical, Users } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { useProducts } from "@/hooks/useProducts";
import { usePlots } from "@/hooks/usePlots";
import { useRecipes } from "@/hooks/useRecipes";
import { useProfile } from "@/hooks/useProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function Reports() {
  const { applications, isLoading: appsLoading } = useApplications();
  const { properties, isLoading: propsLoading } = useProperties();
  const { products, isLoading: productsLoading } = useProducts();
  const { plots, isLoading: plotsLoading } = usePlots();
  const { recipes, isLoading: recipesLoading } = useRecipes();
  const { profile } = useProfile();
  
  // Filtros existentes
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // Novos filtros
  const [selectedPlot, setSelectedPlot] = useState<string>("all");
  const [selectedRecipe, setSelectedRecipe] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);
  
  // Opções de PDF
  const [pdfIncludeNotes, setPdfIncludeNotes] = useState(true);
  const [pdfIncludePlotHistory, setPdfIncludePlotHistory] = useState(true);
  const [pdfIncludeExecutiveSummary, setPdfIncludeExecutiveSummary] = useState(true);
  const [pdfCustomFooter, setPdfCustomFooter] = useState("");
  
  // Comparativo de períodos
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<string>("previous");

  // Gerar lista de meses disponíveis
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (applications || []).forEach((app: any) => {
      const date = new Date(app.application_date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [applications]);

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMMM yyyy", { locale: ptBR });
  };

  const formatStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'planejada': 'Planejada',
      'em_andamento': 'Em Andamento',
      'concluída': 'Concluída',
      'cancelada': 'Cancelada'
    };
    return labels[status] || status;
  };

  // Filtrar talhões pela propriedade selecionada
  const filteredPlots = useMemo(() => {
    if (selectedProperty === "all") return plots;
    return plots.filter(p => p.property_id === selectedProperty);
  }, [plots, selectedProperty]);

  const isLoading = appsLoading || propsLoading || productsLoading || plotsLoading || recipesLoading;

  const clearFilters = () => {
    setSelectedProperty("all");
    setSelectedPeriod("30");
    setSelectedMonth("all");
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedPlot("all");
    setSelectedRecipe("all");
    setSelectedProducts([]);
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = selectedProperty !== "all" || selectedPeriod !== "30" || 
    selectedMonth !== "all" || selectedStatus !== "all" || selectedType !== "all" || 
    selectedPlot !== "all" || selectedRecipe !== "all" || selectedProducts.length > 0 ||
    dateFrom !== "" || dateTo !== "";

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month !== "all") {
      setSelectedPeriod("30");
      setDateFrom("");
      setDateTo("");
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setSelectedMonth("all");
  };

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    if (from || to) {
      setSelectedMonth("all");
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Função para obter período de datas atual
  const getCurrentPeriodDates = () => {
    const now = new Date();
    let startDate: Date, endDate: Date = now;
    
    if (selectedMonth !== "all") {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = startOfMonth(new Date(year, month - 1));
      endDate = endOfMonth(new Date(year, month - 1));
    } else if (dateFrom || dateTo) {
      startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : subDays(now, 365);
      endDate = dateTo ? new Date(dateTo + 'T23:59:59') : now;
    } else {
      startDate = subDays(now, Number(selectedPeriod));
      endDate = now;
    }
    
    return { startDate, endDate };
  };

  // Função para obter período anterior para comparação
  const getPreviousPeriodDates = () => {
    const { startDate, endDate } = getCurrentPeriodDates();
    const periodLength = endDate.getTime() - startDate.getTime();
    
    return {
      startDate: new Date(startDate.getTime() - periodLength),
      endDate: new Date(endDate.getTime() - periodLength)
    };
  };

  const filteredApplications = useMemo(() => {
    let filtered = applications || [];

    // Filtro por propriedade
    if (selectedProperty !== "all") {
      filtered = filtered.filter((app: any) => app.property_id === selectedProperty);
    }

    // Filtro por talhão
    if (selectedPlot !== "all") {
      filtered = filtered.filter((app: any) => app.plot_id === selectedPlot);
    }

    // Filtro por status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((app: any) => app.status === selectedStatus);
    }

    // Filtro por tipo
    if (selectedType !== "all") {
      filtered = filtered.filter((app: any) => app.application_type === selectedType);
    }

    // Filtro por múltiplos produtos
    if (selectedProducts.length > 0) {
      filtered = filtered.filter((app: any) => 
        app.application_products?.some((p: any) => selectedProducts.includes(p.product_id))
      );
    }

    // Filtro por receituário (verificar se todos os produtos do receituário estão na aplicação)
    if (selectedRecipe !== "all") {
      const recipe = recipes.find(r => r.id === selectedRecipe);
      if (recipe && recipe.recipe_products) {
        const recipeProductIds = recipe.recipe_products.map(rp => rp.product_id);
        filtered = filtered.filter((app: any) => {
          const appProductIds = app.application_products?.map((p: any) => p.product_id) || [];
          return recipeProductIds.every(rpId => appProductIds.includes(rpId));
        });
      }
    }

    // Filtro por período
    if (selectedMonth !== "all") {
      const [year, month] = selectedMonth.split('-').map(Number);
      filtered = filtered.filter((app: any) => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate.getFullYear() === year && appDate.getMonth() + 1 === month;
      });
    } else if (dateFrom || dateTo) {
      filtered = filtered.filter((app: any) => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        if (dateFrom && dateTo) {
          return appDate >= new Date(dateFrom + 'T00:00:00') && appDate <= new Date(dateTo + 'T23:59:59');
        } else if (dateFrom) {
          return appDate >= new Date(dateFrom + 'T00:00:00');
        } else if (dateTo) {
          return appDate <= new Date(dateTo + 'T23:59:59');
        }
        return true;
      });
    } else {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - Number(selectedPeriod) * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((app: any) => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate >= daysAgo && appDate <= now;
      });
    }

    return filtered;
  }, [applications, selectedProperty, selectedPlot, selectedPeriod, selectedMonth, selectedStatus, selectedType, selectedProducts, selectedRecipe, recipes, dateFrom, dateTo]);

  // Aplicações do período anterior para comparação
  const previousPeriodApplications = useMemo(() => {
    if (!showComparison) return [];
    
    const { startDate, endDate } = getPreviousPeriodDates();
    let filtered = applications || [];

    if (selectedProperty !== "all") {
      filtered = filtered.filter((app: any) => app.property_id === selectedProperty);
    }

    filtered = filtered.filter((app: any) => {
      const appDate = new Date(app.application_date + 'T00:00:00');
      return appDate >= startDate && appDate <= endDate;
    });

    return filtered;
  }, [applications, selectedProperty, showComparison, selectedPeriod, selectedMonth, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalArea = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.area_applied), 0);
    const totalCost = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.total_cost), 0);
    const avgCostPerHa = totalArea > 0 ? totalCost / totalArea : 0;
    const completedApps = filteredApplications.filter((app: any) => app.status === "concluída").length;
    const efficiency = filteredApplications.length > 0 ? (completedApps / filteredApplications.length) * 100 : 0;
    const totalFlightTime = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.flight_time_minutes || 0), 0);

    return { totalArea, totalCost, avgCostPerHa, efficiency, totalFlightTime, completedApps };
  }, [filteredApplications]);

  // Stats do período anterior
  const previousStats = useMemo(() => {
    if (!showComparison) return null;
    
    const totalArea = previousPeriodApplications.reduce((sum: number, app: any) => sum + Number(app.area_applied), 0);
    const totalCost = previousPeriodApplications.reduce((sum: number, app: any) => sum + Number(app.total_cost), 0);
    const avgCostPerHa = totalArea > 0 ? totalCost / totalArea : 0;
    const completedApps = previousPeriodApplications.filter((app: any) => app.status === "concluída").length;

    return { totalArea, totalCost, avgCostPerHa, completedApps, appCount: previousPeriodApplications.length };
  }, [previousPeriodApplications, showComparison]);

  const propertyStats = useMemo(() => {
    const grouped = filteredApplications.reduce((acc: any, app: any) => {
      const propId = app.property_id;
      if (!acc[propId]) {
        acc[propId] = {
          id: propId,
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

  // Estatísticas por talhão
  const plotStats = useMemo(() => {
    const grouped = filteredApplications.reduce((acc: any, app: any) => {
      const plotKey = app.plot_id || app.plot_name || 'sem_talhao';
      const plotName = app.plot_name || 'Sem talhão';
      
      if (!acc[plotKey]) {
        acc[plotKey] = {
          id: plotKey,
          name: plotName,
          propertyName: app.properties?.name || 'N/A',
          area: 0,
          apps: 0,
          cost: 0,
          products: new Map(),
        };
      }
      acc[plotKey].area += Number(app.area_applied);
      acc[plotKey].apps += 1;
      acc[plotKey].cost += Number(app.total_cost);
      
      // Agregar produtos por talhão
      if (app.application_products) {
        app.application_products.forEach((ap: any) => {
          const productName = ap.products?.name || 'Produto';
          const existing = acc[plotKey].products.get(productName) || { amount: 0, unit: ap.products?.unit || '' };
          existing.amount += Number(ap.total_amount || 0);
          acc[plotKey].products.set(productName, existing);
        });
      }
      
      return acc;
    }, {});

    return Object.values(grouped).map((p: any) => ({
      ...p,
      products: Array.from(p.products.entries()).map(([name, data]: [string, any]) => ({
        name,
        amount: data.amount,
        unit: data.unit
      }))
    }));
  }, [filteredApplications]);

  const productStats = useMemo(() => {
    const productMap: Record<string, { name: string; unit: string; totalAmount: number; totalCost: number; count: number; avgDose: number; totalArea: number }> = {};
    
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
              avgDose: 0,
              totalArea: 0,
            };
          }
          productMap[productName].totalAmount += Number(ap.total_amount || 0);
          productMap[productName].totalCost += Number(ap.total_cost || 0);
          productMap[productName].count += 1;
          productMap[productName].totalArea += Number(app.area_applied || 0);
        });
      }
    });
    
    // Calcular dose média
    Object.values(productMap).forEach(p => {
      p.avgDose = p.totalArea > 0 ? p.totalAmount / p.totalArea : 0;
    });
    
    return Object.values(productMap).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredApplications]);

  const statusStats = useMemo(() => {
    const stats = {
      planejada: 0,
      em_andamento: 0,
      concluída: 0,
      cancelada: 0,
    };
    
    filteredApplications.forEach((app: any) => {
      if (stats[app.status as keyof typeof stats] !== undefined) {
        stats[app.status as keyof typeof stats]++;
      }
    });
    
    return stats;
  }, [filteredApplications]);

  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    filteredApplications.forEach((app: any) => {
      if (!stats[app.application_type]) {
        stats[app.application_type] = 0;
      }
      stats[app.application_type]++;
    });
    
    return stats;
  }, [filteredApplications]);

  // Dados para gráfico de barras por propriedade
  const propertyChartData = useMemo(() => {
    return propertyStats.map((p: any) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      fullName: p.name,
      area: Number(p.area.toFixed(1)),
      apps: p.apps,
    }));
  }, [propertyStats]);

  const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const exportToCSV = () => {
    const headers = ["Propriedade", "Talhão", "Data", "Tipo", "Status", "Área (ha)", "Produtos", "Observações", "Custo (R$)"];
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
        `"${app.notes || ''}"`,
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
    const pageHeight = doc.internal.pageSize.getHeight();
    
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
    
    let filterText = "";
    if (dateFrom || dateTo) {
      filterText = `Período: ${dateFrom ? format(new Date(dateFrom + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Início'} - ${dateTo ? format(new Date(dateTo + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Hoje'}`;
    } else if (selectedMonth !== "all") {
      filterText = `Período: ${getMonthLabel(selectedMonth)}`;
    } else {
      filterText = `Período: ${selectedPeriod} dias`;
    }
    
    const propertyText = selectedProperty === "all" 
      ? "Todas as Propriedades" 
      : properties.find(p => p.id === selectedProperty)?.name || "N/A";
    doc.text(`${filterText} | ${propertyText}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth - 14, 28, { align: 'right' });

    let yPosition = 45;

    // RESUMO EXECUTIVO
    if (pdfIncludeExecutiveSummary) {
      doc.setFillColor(245, 250, 245);
      doc.roundedRect(10, yPosition - 5, pageWidth - 20, 50, 3, 3, 'F');
      
      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Executivo', 14, yPosition + 3);
      
      yPosition += 12;
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryText = [
        `No período analisado, foram realizadas ${filteredApplications.length} aplicações`,
        `cobrindo um total de ${stats.totalArea.toFixed(1)} hectares.`,
        `Taxa de conclusão: ${stats.efficiency.toFixed(0)}% (${stats.completedApps} concluídas).`,
        productStats.length > 0 ? `Produto mais utilizado: ${productStats[0].name} (${productStats[0].totalAmount.toFixed(1)} ${productStats[0].unit})` : '',
      ].filter(Boolean);
      
      summaryText.forEach((line, i) => {
        doc.text(line, 14, yPosition + 6 + (i * 6));
      });
      
      // Comparativo
      if (showComparison && previousStats) {
        const areaChange = stats.totalArea - previousStats.totalArea;
        const areaPercent = previousStats.totalArea > 0 ? ((areaChange / previousStats.totalArea) * 100).toFixed(1) : 'N/A';
        doc.setFont('helvetica', 'bold');
        doc.text(`Comparativo: ${areaChange >= 0 ? '+' : ''}${areaChange.toFixed(1)} ha (${areaPercent}%) vs período anterior`, 14, yPosition + 30);
      }
      
      yPosition += 55;
    }

    // Resumo Estatístico
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Estatístico', 14, yPosition);
    
    yPosition += 8;
    
    const statsData = [
      ['Área Total', `${stats.totalArea.toFixed(1)} ha`],
      ['Total Aplicações', `${filteredApplications.length}`],
      ['Eficiência', `${stats.efficiency.toFixed(0)}%`],
      ['Tempo de Voo', `${stats.totalFlightTime} min`],
    ];

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const cardWidth = (pageWidth - 28) / 2;
    statsData.forEach((stat, i) => {
      const x = 14 + (i % 2) * cardWidth;
      const y = yPosition + Math.floor(i / 2) * 16;
      
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

    // Consumo Total por Produto
    if (productStats.length > 0) {
      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Consumo Total por Produto', 14, yPosition);
      yPosition += 4;

      autoTable(doc, {
        startY: yPosition,
        head: [['Produto', 'Consumo Total', 'Dose Média/ha', 'Aplicações']],
        body: productStats.map(p => [
          p.name,
          `${p.totalAmount.toFixed(2)} ${p.unit}`,
          `${p.avgDose.toFixed(3)} ${p.unit}/ha`,
          p.count.toString(),
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
        head: [['Propriedade', 'Área (ha)', 'Aplicações']],
        body: propertyStats.map((p: any) => [
          p.name,
          p.area.toFixed(1),
          p.apps.toString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    // HISTÓRICO POR TALHÃO
    if (pdfIncludePlotHistory && plotStats.length > 0) {
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(34, 139, 34);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico por Talhão', 14, yPosition);
      yPosition += 4;

      const plotRows = plotStats.map((p: any) => {
        const productsText = p.products.map((pr: any) => `${pr.name}: ${pr.amount.toFixed(2)} ${pr.unit}`).join(', ');
        return [
          p.name,
          p.propertyName,
          `${p.area.toFixed(1)} ha`,
          p.apps.toString(),
          productsText || '-'
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Talhão', 'Propriedade', 'Área Total', 'Aplicações', 'Produtos Aplicados']],
        body: plotRows,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        columnStyles: {
          4: { cellWidth: 60 },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    // Detalhes das Aplicações (com observações)
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
        const appProducts = app.application_products && app.application_products.length > 0
          ? app.application_products.map((p: any) => 
              `${p.products?.name || 'N/A'}: ${Number(p.total_amount).toFixed(2)} ${p.products?.unit || ''}`
            ).join('\n')
          : '-';
        
        const row = [
          format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }),
          `${app.properties?.name || 'N/A'}${app.plot_name ? `\n${app.plot_name}` : ''}`,
          app.application_type,
          formatStatusLabel(app.status),
          `${app.area_applied} ha`,
          appProducts,
        ];
        
        if (pdfIncludeNotes) {
          row.push(app.notes || '-');
        }
        
        return row;
      });

      const headers = ['Data', 'Propriedade', 'Tipo', 'Status', 'Área', 'Produtos'];
      if (pdfIncludeNotes) headers.push('Observações');

      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: appRows,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        columnStyles: pdfIncludeNotes ? {
          0: { cellWidth: 16 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 20 },
          4: { cellWidth: 16 },
          5: { cellWidth: 40 },
          6: { cellWidth: 35 },
        } : {
          0: { cellWidth: 18 },
          1: { cellWidth: 38 },
          2: { cellWidth: 28 },
          3: { cellWidth: 24 },
          4: { cellWidth: 20 },
          5: { cellWidth: 55 },
        },
      });
    }

    // Footer personalizado em todas as páginas
    const totalPages = doc.getNumberOfPages();
    const footerText = pdfCustomFooter || (profile?.company ? `${profile.company} - ${profile.full_name}` : 'AgroDrone PRO');
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} - ${footerText}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio_aplicacoes_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportCostPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFillColor(139, 69, 19);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroDrone PRO', 14, 18);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Custos', 14, 28);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    
    let filterText = "";
    if (dateFrom || dateTo) {
      filterText = `Período: ${dateFrom ? format(new Date(dateFrom + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Início'} - ${dateTo ? format(new Date(dateTo + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Hoje'}`;
    } else {
      filterText = `Período: ${selectedPeriod} dias`;
    }
    
    const propertyText = selectedProperty === "all" 
      ? "Todas as Propriedades" 
      : properties.find(p => p.id === selectedProperty)?.name || "N/A";
    doc.text(`${filterText} | ${propertyText}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth - 14, 28, { align: 'right' });

    let yPosition = 45;

    // Resumo de Custos
    doc.setTextColor(139, 69, 19);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo de Custos', 14, yPosition);
    
    yPosition += 8;
    
    const statsData = [
      ['Custo Total', `R$ ${stats.totalCost.toFixed(2)}`],
      ['Custo por Hectare', `R$ ${stats.avgCostPerHa.toFixed(2)}`],
      ['Área Total', `${stats.totalArea.toFixed(1)} ha`],
      ['Total Aplicações', `${filteredApplications.length}`],
    ];

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const cardWidth = (pageWidth - 28) / 2;
    statsData.forEach((stat, i) => {
      const x = 14 + (i % 2) * cardWidth;
      const y = yPosition + Math.floor(i / 2) * 16;
      
      doc.setFillColor(255, 248, 240);
      doc.roundedRect(x, y, cardWidth - 4, 14, 2, 2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(stat[0], x + 4, y + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(stat[1], x + 4, y + 11);
    });

    yPosition += 40;

    // Custos por Produto
    if (productStats.length > 0) {
      doc.setTextColor(139, 69, 19);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Custos por Produto', 14, yPosition);
      yPosition += 4;

      autoTable(doc, {
        startY: yPosition,
        head: [['Produto', 'Quantidade', 'Custo Total', 'Custo Médio/Aplicação']],
        body: productStats.map(p => [
          p.name,
          `${p.totalAmount.toFixed(2)} ${p.unit}`,
          `R$ ${p.totalCost.toFixed(2)}`,
          `R$ ${(p.totalCost / p.count).toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [255, 248, 240] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    // Custos por Propriedade
    if (propertyStats.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(139, 69, 19);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Custos por Propriedade', 14, yPosition);
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
        headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [255, 248, 240] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    // Detalhes de Custos por Aplicação
    if (filteredApplications.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(139, 69, 19);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhes de Custos por Aplicação', 14, yPosition);
      yPosition += 4;

      const appRows = filteredApplications.map((app: any) => {
        return [
          format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }),
          `${app.properties?.name || 'N/A'}${app.plot_name ? `\n${app.plot_name}` : ''}`,
          `${app.area_applied} ha`,
          `R$ ${Number(app.total_cost).toFixed(2)}`,
          `R$ ${(Number(app.total_cost) / Number(app.area_applied)).toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Data', 'Propriedade', 'Área', 'Custo Total', 'Custo/ha']],
        body: appRows,
        theme: 'striped',
        headStyles: { fillColor: [139, 69, 19], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [255, 248, 240] },
      });
    }

    // Footer personalizado
    const totalPages = doc.getNumberOfPages();
    const footerText = pdfCustomFooter || (profile?.company ? `${profile.company} - ${profile.full_name}` : 'AgroDrone PRO');
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages} - ${footerText}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio_custos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

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
          <Button onClick={exportToCSV} variant="outline" className="gap-2 w-full sm:w-auto" disabled={filteredApplications.length === 0}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button onClick={exportToPDF} className="gap-2 w-full sm:w-auto" disabled={filteredApplications.length === 0}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={exportCostPDF} variant="secondary" className="gap-2 w-full sm:w-auto" disabled={filteredApplications.length === 0}>
            <DollarSign className="h-4 w-4" />
            PDF Custos
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h2 className="font-semibold">Filtros</h2>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Linha 1: Propriedade, Talhão, Receituário */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v); setSelectedPlot("all"); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas Propriedades</SelectItem>
                {properties.map((prop: any) => (
                  <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedPlot} onValueChange={setSelectedPlot}>
              <SelectTrigger className="h-9 text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Talhão" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos Talhões</SelectItem>
                {filteredPlots.map((plot) => (
                  <SelectItem key={plot.id} value={plot.id}>{plot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
              <SelectTrigger className="h-9 text-xs">
                <FlaskConical className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Receituário" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos Receituários</SelectItem>
                {recipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>{recipe.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linha 2: Status, Tipo, Produtos múltiplos */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluída">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="pulverização">Pulverização</SelectItem>
                <SelectItem value="adubação">Adubação</SelectItem>
                <SelectItem value="semeadura">Semeadura</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>

            {/* Seleção múltipla de produtos */}
            <div className="relative">
              <Button 
                variant="outline" 
                className="h-9 w-full justify-start text-xs font-normal"
                onClick={() => setShowProductsDropdown(!showProductsDropdown)}
              >
                {selectedProducts.length > 0 
                  ? `${selectedProducts.length} produto(s)` 
                  : 'Selecionar produtos'}
              </Button>
              {showProductsDropdown && (
                <div className="absolute top-10 left-0 right-0 z-50 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto p-2">
                  {products.map((product: any) => (
                    <div key={product.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleProductToggle(product.id)}
                      />
                      <Label htmlFor={`product-${product.id}`} className="text-xs cursor-pointer">
                        {product.name}
                      </Label>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 text-xs"
                    onClick={() => setShowProductsDropdown(false)}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Linha 3: Período */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Período:</span>
            
            <div className="flex gap-1">
              {[
                { value: "7", label: "7d" },
                { value: "15", label: "15d" },
                { value: "30", label: "30d" },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={selectedPeriod === value && selectedMonth === "all" && !dateFrom && !dateTo ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePeriodChange(value)}
                  className="h-7 px-2 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground mx-1">ou</span>

            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="Por mês" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[200px]">
                <SelectItem value="all">Todos os meses</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month} className="capitalize">
                    {getMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground mx-1">ou</span>

            <div className="flex gap-1 items-center">
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => handleDateChange(e.target.value, dateTo)}
                className="h-7 w-[120px] text-xs"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => handleDateChange(dateFrom, e.target.value)}
                className="h-7 w-[120px] text-xs"
              />
            </div>
          </div>

          {/* Linha 4: Comparativo e opções de PDF */}
          <div className="flex flex-wrap gap-4 items-center pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="comparison"
                checked={showComparison}
                onCheckedChange={(checked) => setShowComparison(!!checked)}
              />
              <Label htmlFor="comparison" className="text-xs cursor-pointer">
                Comparar com período anterior
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdfNotes"
                checked={pdfIncludeNotes}
                onCheckedChange={(checked) => setPdfIncludeNotes(!!checked)}
              />
              <Label htmlFor="pdfNotes" className="text-xs cursor-pointer">
                Incluir observações no PDF
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdfPlotHistory"
                checked={pdfIncludePlotHistory}
                onCheckedChange={(checked) => setPdfIncludePlotHistory(!!checked)}
              />
              <Label htmlFor="pdfPlotHistory" className="text-xs cursor-pointer">
                Histórico por talhão no PDF
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdfExecutive"
                checked={pdfIncludeExecutiveSummary}
                onCheckedChange={(checked) => setPdfIncludeExecutiveSummary(!!checked)}
              />
              <Label htmlFor="pdfExecutive" className="text-xs cursor-pointer">
                Resumo executivo no PDF
              </Label>
            </div>
          </div>

          {/* Rodapé personalizado */}
          <div className="flex items-center gap-2 pt-2">
            <Label htmlFor="customFooter" className="text-xs whitespace-nowrap">
              Rodapé PDF:
            </Label>
            <Input
              id="customFooter"
              value={pdfCustomFooter}
              onChange={(e) => setPdfCustomFooter(e.target.value)}
              placeholder={profile?.company || "Nome da empresa, contato..."}
              className="h-8 text-xs flex-1"
            />
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <div className="mb-1 sm:mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Área Total</p>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">
            {stats.totalArea.toFixed(1)} ha
          </p>
          <p className="text-xs text-muted-foreground">
            {filteredApplications.length} aplicações
          </p>
          {showComparison && previousStats && (
            <p className={`text-xs mt-1 ${stats.totalArea >= previousStats.totalArea ? 'text-green-600' : 'text-red-500'}`}>
              {stats.totalArea >= previousStats.totalArea ? '↑' : '↓'} {Math.abs(stats.totalArea - previousStats.totalArea).toFixed(1)} ha vs anterior
            </p>
          )}
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="mb-1 sm:mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Custo Total</p>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">
            R$ {stats.totalCost.toFixed(2)}
          </p>
          {showComparison && previousStats && (
            <p className={`text-xs mt-1 ${stats.totalCost <= previousStats.totalCost ? 'text-green-600' : 'text-red-500'}`}>
              {stats.totalCost <= previousStats.totalCost ? '↓' : '↑'} R$ {Math.abs(stats.totalCost - previousStats.totalCost).toFixed(2)} vs anterior
            </p>
          )}
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="mb-1 sm:mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">Custo/ha</p>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">
            R$ {stats.avgCostPerHa.toFixed(2)}
          </p>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="mb-1 sm:mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Eficiência</p>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-foreground">
            {stats.efficiency.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {statusStats.concluída} concluídas
          </p>
        </Card>
      </div>

      {/* Gráfico de barras por propriedade */}
      {propertyChartData.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Área por Propriedade
          </h2>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  label={{ value: 'Hectares', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'area' ? `${value} ha` : value,
                    name === 'area' ? 'Área' : 'Aplicações'
                  ]}
                  labelFormatter={(label) => propertyChartData.find(d => d.name === label)?.fullName || label}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="area" name="area" radius={[4, 4, 0, 0]}>
                  {propertyChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Status e Tipo breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Por Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Planejadas</span>
              <span className="font-medium">{statusStats.planejada}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Em Andamento</span>
              <span className="font-medium">{statusStats.em_andamento}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Concluídas</span>
              <span className="font-medium text-green-600">{statusStats.concluída}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Canceladas</span>
              <span className="font-medium text-red-500">{statusStats.cancelada}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Por Tipo</h3>
          <div className="space-y-2">
            {Object.entries(typeStats).length > 0 ? (
              Object.entries(typeStats).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dado</p>
            )}
          </div>
        </Card>
      </div>

      {/* Consumo Total por Produto */}
      {productStats.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
            Consumo Total por Produto
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                    Produto
                  </th>
                  <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                    Consumo Total
                  </th>
                  <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                    Dose Média/ha
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
                      {row.avgDose.toFixed(3)} {row.unit}/ha
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

      {/* Resumo por Propriedade */}
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
                    Nenhum dado disponível para os filtros selecionados
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
              Nenhuma aplicação encontrada para os filtros selecionados
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
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      app.status === 'concluída' ? 'bg-green-100 text-green-800' :
                      app.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                      app.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {formatStatusLabel(app.status)}
                    </span>
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

                {app.notes && (
                  <div className="mt-2 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
                    <span className="font-medium">Obs:</span> {app.notes}
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

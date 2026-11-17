import { useState, useMemo } from "react";
import { AnexoIxDialog } from "@/components/AnexoIxDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Target, Download, Filter, FileText, X, MapPin, FlaskConical } from "lucide-react";
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
import { toast } from "sonner";
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
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showPropertiesDropdown, setShowPropertiesDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
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
  const [pdfIncludeNotes, setPdfIncludeNotes] = useState(false);
  const [pdfIncludePlotHistory, setPdfIncludePlotHistory] = useState(false);
  const [pdfIncludeExecutiveSummary, setPdfIncludeExecutiveSummary] = useState(false);
  const [pdfIncludeProductCosts, setPdfIncludeProductCosts] = useState(false);
  const [pdfCustomFooter, setPdfCustomFooter] = useState("");
  
  // Ordenação do PDF
  const [pdfSortBy, setPdfSortBy] = useState<'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'area_asc' | 'area_desc' | 'plot_asc'>('date_desc');
  
  // Comparativo de períodos
  const [showComparison, setShowComparison] = useState(false);
  const [anexoOpen, setAnexoOpen] = useState(false);

  // Configurações de PDF do localStorage
  const pdfSettingsFromStorage = useMemo(() => {
    try {
      const saved = localStorage.getItem('pdfSettings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de PDF:', e);
    }
    return { headerText: '', footerText: '', logoUrl: '' };
  }, []);

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

  const filteredPlots = useMemo(() => {
    if (selectedProperties.length === 0) return plots;
    return plots.filter(p => selectedProperties.includes(p.property_id));
  }, [plots, selectedProperties]);

  const isLoading = appsLoading || propsLoading || productsLoading || plotsLoading || recipesLoading;

  const clearFilters = () => {
    setSelectedProperties([]);
    setSelectedPeriod("all");
    setSelectedMonth("all");
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedPlot("all");
    setSelectedRecipe("all");
    setSelectedProducts([]);
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = selectedProperties.length > 0 || selectedPeriod !== "all" || 
    selectedMonth !== "all" || selectedStatus !== "all" || selectedType !== "all" || 
    selectedPlot !== "all" || selectedRecipe !== "all" || selectedProducts.length > 0 ||
    dateFrom !== "" || dateTo !== "";

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month !== "all") {
      setSelectedPeriod("all");
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
      startDate = subDays(now, Number(selectedPeriod) || 365);
      endDate = now;
    }
    
    return { startDate, endDate };
  };

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

    if (selectedProperties.length > 0) {
      filtered = filtered.filter((app: any) => selectedProperties.includes(app.property_id));
    }

    if (selectedPlot !== "all") {
      filtered = filtered.filter((app: any) => app.plot_id === selectedPlot);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((app: any) => app.status === selectedStatus);
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((app: any) => app.application_type === selectedType);
    }

    if (selectedProducts.length > 0) {
      filtered = filtered.filter((app: any) => 
        app.application_products?.some((p: any) => selectedProducts.includes(p.product_id))
      );
    }

    if (selectedRecipe !== "all") {
      const recipe = recipes.find(r => r.id === selectedRecipe);
      if (recipe && recipe.recipe_products) {
        const recipeProductIds = recipe.recipe_products.map((rp: any) => rp.product_id);
        filtered = filtered.filter((app: any) => {
          const appProductIds = app.application_products?.map((p: any) => p.product_id) || [];
          return recipeProductIds.every((rpId: string) => appProductIds.includes(rpId));
        });
      }
    }

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
    } else if (selectedPeriod !== "all") {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - Number(selectedPeriod) * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((app: any) => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate >= daysAgo && appDate <= now;
      });
    }

    return filtered;
  }, [applications, selectedProperties, selectedPlot, selectedPeriod, selectedMonth, selectedStatus, selectedType, selectedProducts, selectedRecipe, recipes, dateFrom, dateTo]);

  const previousPeriodApplications = useMemo(() => {
    if (!showComparison) return [];
    
    const { startDate, endDate } = getPreviousPeriodDates();
    let filtered = applications || [];

    if (selectedProperties.length > 0) {
      filtered = filtered.filter((app: any) => selectedProperties.includes(app.property_id));
    }

    filtered = filtered.filter((app: any) => {
      const appDate = new Date(app.application_date + 'T00:00:00');
      return appDate >= startDate && appDate <= endDate;
    });

    return filtered;
  }, [applications, selectedProperties, showComparison, selectedPeriod, selectedMonth, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalArea = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.area_applied || 0), 0);
    const totalCost = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.total_cost || 0), 0);
    const avgCostPerHa = totalArea > 0 ? totalCost / totalArea : 0;
    const completedApps = filteredApplications.filter((app: any) => app.status === "concluída").length;
    const efficiency = filteredApplications.length > 0 ? (completedApps / filteredApplications.length) * 100 : 0;
    const totalFlightTime = filteredApplications.reduce((sum: number, app: any) => sum + Number(app.flight_time_minutes || 0), 0);

    return { totalArea, totalCost, avgCostPerHa, efficiency, totalFlightTime, completedApps };
  }, [filteredApplications]);

  const previousStats = useMemo(() => {
    if (!showComparison) return null;
    
    const totalArea = previousPeriodApplications.reduce((sum: number, app: any) => sum + Number(app.area_applied || 0), 0);
    const totalCost = previousPeriodApplications.reduce((sum: number, app: any) => sum + Number(app.total_cost || 0), 0);
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
      acc[propId].area += Number(app.area_applied || 0);
      acc[propId].apps += 1;
      acc[propId].cost += Number(app.total_cost || 0);
      return acc;
    }, {});

    return Object.values(grouped);
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
    
    Object.values(productMap).forEach(p => {
      p.avgDose = p.totalArea > 0 ? p.totalAmount / p.totalArea : 0;
    });
    
    return Object.values(productMap).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredApplications]);

  // Detalhamento de consumo por data (para relatório ao cliente)
  const consumptionDetails = useMemo(() => {
    const details: Array<{
      date: string;
      propertyName: string;
      plotName: string;
      applicationName: string;
      productName: string;
      quantity: number;
      unit: string;
      area: number;
    }> = [];

    filteredApplications.forEach((app: any) => {
      if (app.application_products && app.application_products.length > 0) {
        app.application_products.forEach((ap: any) => {
          details.push({
            date: app.application_date,
            propertyName: app.properties?.name || 'N/A',
            plotName: app.plot_name || 'Sem talhão',
            applicationName: app.name || 'Aplicação',
            productName: ap.products?.name || 'Produto',
            quantity: Number(ap.total_amount || 0),
            unit: ap.products?.unit || 'un',
            area: Number(app.area_applied || 0),
          });
        });
      }
    });

    return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const propertyChartData = useMemo(() => {
    return propertyStats.map((p: any) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      fullName: p.name,
      area: Number(p.area.toFixed(1)),
      apps: p.apps,
    }));
  }, [propertyStats]);

  const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getSortedApplications = (apps: any[]) => {
    const sorted = [...apps];
    switch (pdfSortBy) {
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.application_date).getTime() - new Date(b.application_date).getTime());
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime());
      case 'name_asc':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
      case 'name_desc':
        return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
      case 'area_asc':
        return sorted.sort((a, b) => Number(a.area_applied) - Number(b.area_applied));
      case 'area_desc':
        return sorted.sort((a, b) => Number(b.area_applied) - Number(a.area_applied));
      case 'plot_asc':
        return sorted.sort((a, b) => (a.plot_name || '').localeCompare(b.plot_name || '', 'pt-BR'));
      default:
        return sorted;
    }
  };

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

  const exportConsumptionPDF = () => {
    if (consumptionDetails.length === 0) {
      toast.error("Nenhum consumo encontrado no período selecionado");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroDrone PRO', 14, 14);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Consumo de Produtos', 14, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    let periodText = "Todos os períodos";
    if (dateFrom || dateTo) {
      periodText = `${dateFrom ? format(new Date(dateFrom + 'T00:00:00'), "dd/MM/yyyy") : '...'} a ${dateTo ? format(new Date(dateTo + 'T00:00:00'), "dd/MM/yyyy") : '...'}`;
    } else if (selectedMonth !== "all") {
      periodText = getMonthLabel(selectedMonth);
    } else if (selectedPeriod !== "all") {
      periodText = `Últimos ${selectedPeriod} dias`;
    }

    const propertyText = selectedProperties.length === 0
      ? "Todas as propriedades"
      : selectedProperties.length === 1
        ? properties.find((p: any) => p.id === selectedProperties[0])?.name || "N/A"
        : `${selectedProperties.length} propriedades`;

    doc.text(`Período: ${periodText}`, pageWidth - 14, 14, { align: 'right' });
    doc.text(`Propriedade: ${propertyText}`, pageWidth - 14, 22, { align: 'right' });

    let y = 42;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Serviço', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Área total aplicada: ${stats.totalArea.toFixed(2)} ha`, 14, y);
    y += 6;
    doc.text(`Total de aplicações: ${filteredApplications.length}`, 14, y);
    y += 6;
    doc.text(`Produtos utilizados: ${productStats.length}`, 14, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total por Produto', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Quantidade Total', 'Unidade', 'Área Relacionada (ha)']],
      body: productStats.map(p => [
        p.name,
        p.totalAmount.toFixed(2),
        p.unit,
        p.totalArea.toFixed(2)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [46, 125, 50] },
      styles: { fontSize: 9 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Detalhamento por Data', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Propriedade', 'Talhão', 'Produto', 'Quantidade', 'Unidade']],
      body: consumptionDetails.map(item => [
        format(new Date(item.date + 'T00:00:00'), "dd/MM/yyyy"),
        item.propertyName,
        item.plotName,
        item.productName,
        item.quantity.toFixed(2),
        item.unit
      ]),
      theme: 'striped',
      headStyles: { fillColor: [46, 125, 50] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`consumo_produtos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF de consumo gerado com sucesso!");
  };

  const exportToPDF = () => {
    const sortedApplications = getSortedApplications(filteredApplications);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AgroDrone PRO', 14, 18);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Aplicações', 14, 28);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    
    let filterText = "";
    if (dateFrom || dateTo) {
      filterText = `Período: ${dateFrom ? format(new Date(dateFrom + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Início'} - ${dateTo ? format(new Date(dateTo + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Hoje'}`;
    } else if (selectedMonth !== "all") {
      filterText = `Período: ${getMonthLabel(selectedMonth)}`;
    } else if (selectedPeriod !== "all") {
      filterText = `Período: ${selectedPeriod} dias`;
    } else {
      filterText = "Todos os períodos";
    }
    
    const propertyText = selectedProperties.length === 0
      ? "Todas as Propriedades" 
      : selectedProperties.length === 1
        ? properties.find((p: any) => p.id === selectedProperties[0])?.name || "N/A"
        : `${selectedProperties.length} propriedades`;
    doc.text(`${filterText} | ${propertyText}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth - 14, 28, { align: 'right' });

    let yPosition = 45;

    if (pdfIncludeExecutiveSummary) {
      doc.setFillColor(245, 250, 245);
      doc.roundedRect(10, yPosition - 5, pageWidth - 20, 50, 3, 3, 'F');
      
      doc.setTextColor(46, 125, 50);
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
      
      if (showComparison && previousStats) {
        const areaChange = stats.totalArea - previousStats.totalArea;
        const areaPercent = previousStats.totalArea > 0 ? ((areaChange / previousStats.totalArea) * 100).toFixed(1) : 'N/A';
        doc.setFont('helvetica', 'bold');
        doc.text(`Comparativo: ${areaChange >= 0 ? '+' : ''}${areaChange.toFixed(1)} ha (${areaPercent}%) vs período anterior`, 14, yPosition + 30);
      }
      
      yPosition += 55;
    }

    doc.setTextColor(46, 125, 50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Estatístico', 14, yPosition);
    
    yPosition += 8;
    
    const statsData = [
      ['Área Total', `${stats.totalArea.toFixed(1)} ha`],
      ['Total Aplicações', `${filteredApplications.length}`],
      ['Concluídas', `${stats.completedApps}`],
      ['Propriedades', `${propertyStats.length}`],
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

    if (pdfIncludeProductCosts && productStats.length > 0) {
      doc.setTextColor(46, 125, 50);
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
        theme: 'grid',
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [248, 253, 248] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    if (propertyStats.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(46, 125, 50);
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
        theme: 'grid',
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [248, 253, 248] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    const distinctPropertyIds = new Set(sortedApplications.map((a: any) => a.property_id));
    const showPropertyColumn = distinctPropertyIds.size > 1;

    if (pdfIncludePlotHistory && sortedApplications.length > 0) {
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(46, 125, 50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico por Talhão', 14, yPosition);
      yPosition += 4;

      const appsByPlot: Record<string, { plotName: string; propertyName: string; plotAreaHectares: number | null; plotExists: boolean; apps: any[] }> = {};
      
      sortedApplications.forEach((app: any) => {
        const plotData = app.plot_id ? plots.find((p: any) => p.id === app.plot_id) : null;
        const plotExists = !app.plot_id || plotData !== undefined;
        
        const plotKey = plotExists ? (app.plot_id || app.plot_name || 'sem_talhao') : 'talhao_removido';
        const plotName = plotExists 
          ? (app.plot_name || 'Sem Talhão')
          : (app.plot_name ? `${app.plot_name} (removido)` : 'Talhão removido');
        
        if (!appsByPlot[plotKey]) {
          appsByPlot[plotKey] = {
            plotName,
            propertyName: app.properties?.name || 'N/A',
            plotAreaHectares: plotData?.area_hectares || null,
            plotExists,
            apps: [],
          };
        }
        appsByPlot[plotKey].apps.push(app);
      });

      const plotRows: any[] = [];
      let lastPlotKey = '';
      
      Object.entries(appsByPlot)
        .sort(([, a], [, b]) => {
          if (showPropertyColumn) {
            const propCmp = a.propertyName.localeCompare(b.propertyName, 'pt-BR');
            if (propCmp !== 0) return propCmp;
          }
          return a.plotName.localeCompare(b.plotName, 'pt-BR');
        })
        .forEach(([plotKey, plotGroup]) => {
          const sortedApps = [...plotGroup.apps].sort(
            (a: any, b: any) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
          );
          sortedApps.forEach((app: any) => {
            const appName = app.name || 'Aplicação sem nome';
            const appArea = Number(app.area_applied).toFixed(2);
            const productsText = app.application_products && app.application_products.length > 0
              ? app.application_products.map((p: any) => 
                  `${p.products?.name || 'Produto'}: ${Number(p.total_amount).toFixed(2)} ${p.products?.unit || ''}`
                ).join('\n')
              : '-';
            
            const plotInfo = plotGroup.plotName + (plotGroup.plotAreaHectares ? ` (${Number(plotGroup.plotAreaHectares).toFixed(2)} ha)` : '');
            
            const rowData = showPropertyColumn
              ? [plotGroup.propertyName, appName, `${appArea} ha`, productsText, plotInfo]
              : [appName, `${appArea} ha`, productsText, plotInfo];
            
            plotRows.push({
              data: rowData,
              isFirstOfGroup: lastPlotKey !== plotKey,
              plotKey: plotKey,
            });
            lastPlotKey = plotKey;
          });
        });

      const plotHistoryHeaders = showPropertyColumn
        ? ['Propriedade', 'Aplicação', 'Área', 'Produtos', 'Talhão (Área)']
        : ['Aplicação', 'Área', 'Produtos', 'Talhão (Área)'];

      const plotHistoryColumnStyles: any = showPropertyColumn ? {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 18 },
        3: { cellWidth: 50 },
        4: { cellWidth: 42, fontStyle: 'bold' },
      } : {
        0: { cellWidth: 45 },
        1: { cellWidth: 20 },
        2: { cellWidth: 60 },
        3: { cellWidth: 55, fontStyle: 'bold' },
      };

      autoTable(doc, {
        startY: yPosition,
        head: [plotHistoryHeaders],
        body: plotRows.map(r => r.data),
        theme: 'grid',
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', lineColor: [200, 200, 200] },
        columnStyles: plotHistoryColumnStyles,
        didParseCell: function(data) {
          if (data.section === 'body') {
            const rowInfo = plotRows[data.row.index];
            if (rowInfo && rowInfo.isFirstOfGroup) {
              data.cell.styles.fillColor = [232, 245, 233];
            } else {
              data.cell.styles.fillColor = [250, 250, 250];
            }
          }
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }

    if (sortedApplications.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setTextColor(46, 125, 50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhes das Aplicações', 14, yPosition);
      yPosition += 4;

      const appsByPlot: Record<string, {
        plotName: string;
        propertyName: string;
        plotId: string | null;
        plotAreaHectares: number | null;
        plotExists: boolean;
        apps: any[];
      }> = {};

      sortedApplications.forEach((app: any) => {
        const plotData = app.plot_id ? plots.find((p: any) => p.id === app.plot_id) : null;
        const plotExists = !app.plot_id || plotData !== undefined;
        
        const plotKey = plotExists ? (app.plot_id || app.plot_name || 'sem_talhao') : 'talhao_removido';
        const plotName = plotExists 
          ? (app.plot_name || 'Sem talhão')
          : (app.plot_name ? `${app.plot_name} (removido)` : 'Talhão removido');
        
        if (!appsByPlot[plotKey]) {
          appsByPlot[plotKey] = {
            plotName,
            propertyName: app.properties?.name || 'N/A',
            plotId: app.plot_id,
            plotAreaHectares: plotData?.area_hectares || null,
            plotExists,
            apps: [],
          };
        }
        
        appsByPlot[plotKey].apps.push(app);
      });

      interface TableRowData {
        data: string[];
        isFirstOfGroup: boolean;
        plotKey: string;
      }
      const tableRows: TableRowData[] = [];
      let lastPlotKey = '';
      
      Object.entries(appsByPlot)
        .sort(([, a], [, b]) => {
          if (showPropertyColumn) {
            const propCmp = a.propertyName.localeCompare(b.propertyName, 'pt-BR');
            if (propCmp !== 0) return propCmp;
          }
          return a.plotName.localeCompare(b.plotName);
        })
        .forEach(([plotKey, plotGroup]) => {
          const sortedApps = [...plotGroup.apps].sort(
            (a: any, b: any) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
          );
          sortedApps.forEach((app: any) => {
            const appName = app.name || `Aplicação ${format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}`;
            const appArea = Number(app.area_applied).toFixed(2);
            
            const productsText = app.application_products && app.application_products.length > 0
              ? app.application_products
                  .map((p: any) => `${p.products?.name || 'Produto'}: ${Number(p.total_amount).toFixed(2)} ${p.products?.unit || ''}`)
                  .join('\n')
              : '-';
            
            const plotInfo = plotGroup.plotName + (plotGroup.plotAreaHectares ? ` (${Number(plotGroup.plotAreaHectares).toFixed(2)} ha)` : '');
            
            const row: string[] = [];
            if (showPropertyColumn) row.push(plotGroup.propertyName);
            row.push(appName, `${appArea} ha`, productsText, plotInfo);
            
            if (pdfIncludeNotes) {
              row.push(app.notes || '-');
            }
            
            tableRows.push({
              data: row,
              isFirstOfGroup: lastPlotKey !== plotKey,
              plotKey: plotKey,
            });
            lastPlotKey = plotKey;
          });
        });

      const headers: string[] = [];
      if (showPropertyColumn) headers.push('Propriedade');
      headers.push('Aplicação', 'Área', 'Produtos', 'Talhão (Área)');
      if (pdfIncludeNotes) headers.push('Observações');

      let columnStyles: any;
      if (showPropertyColumn && pdfIncludeNotes) {
        columnStyles = {
          0: { cellWidth: 28, fontStyle: 'bold' },
          1: { cellWidth: 32 },
          2: { cellWidth: 18 },
          3: { cellWidth: 40 },
          4: { cellWidth: 30, fontStyle: 'bold' },
          5: { cellWidth: 32 },
        };
      } else if (showPropertyColumn) {
        columnStyles = {
          0: { cellWidth: 32, fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 50 },
          4: { cellWidth: 40, fontStyle: 'bold' },
        };
      } else if (pdfIncludeNotes) {
        columnStyles = {
          0: { cellWidth: 40 },
          1: { cellWidth: 20 },
          2: { cellWidth: 50 },
          3: { cellWidth: 35, fontStyle: 'bold' },
          4: { cellWidth: 35 },
        };
      } else {
        columnStyles = {
          0: { cellWidth: 50 },
          1: { cellWidth: 22 },
          2: { cellWidth: 60 },
          3: { cellWidth: 50, fontStyle: 'bold' },
        };
      }

      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: tableRows.map(r => r.data),
        theme: 'grid',
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', lineColor: [200, 200, 200] },
        columnStyles,
        didParseCell: function(data) {
          if (data.section === 'body') {
            const rowInfo = tableRows[data.row.index];
            if (rowInfo && rowInfo.isFirstOfGroup) {
              data.cell.styles.fillColor = [232, 245, 233];
            } else {
              data.cell.styles.fillColor = [250, 250, 250];
            }
          }
        },
      });
    }

    const totalPages = doc.getNumberOfPages();
    const footerText = pdfCustomFooter || pdfSettingsFromStorage.footerText || (profile?.company ? `${profile.company} - ${profile.full_name}` : 'AgroDrone PRO');
    
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Relatórios e Análises
          </h1>
          <p className="text-base text-muted-foreground">
            Visão analítica das suas operações e custos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button onClick={exportToCSV} variant="outline" className="gap-2 w-full sm:w-auto h-14 text-base rounded-xl" disabled={filteredApplications.length === 0}>
            <Download className="h-5 w-5" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDF} className="gap-2 w-full sm:w-auto h-14 text-base rounded-xl" disabled={filteredApplications.length === 0}>
            <FileText className="h-5 w-5" />
            Gerar PDF
          </Button>
          <Button onClick={exportConsumptionPDF} variant="secondary" className="gap-2 w-full sm:w-auto h-14 text-base rounded-xl" disabled={filteredApplications.length === 0}>
            <FileText className="h-5 w-5" />
            PDF Consumo de Produtos
          </Button>
          <Button
            onClick={() => setAnexoOpen(true)}
            variant="secondary"
            className="gap-2 w-full sm:w-auto h-14 text-base rounded-xl"
          >
            <FileText className="h-5 w-5" />
            Relatório Operacional (ANEXO IX)
          </Button>
        </div>
      </div>

      <AnexoIxDialog
        open={anexoOpen}
        onOpenChange={setAnexoOpen}
        applications={filteredApplications.length > 0 ? filteredApplications : applications}
        properties={properties}
      />

      {/* Filters */}
      <Card className="p-4 sm:p-5 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Filter className="h-6 w-6" />
            <h2 className="font-bold text-lg">Filtros</h2>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 text-muted-foreground hover:text-foreground text-base h-12 px-4 rounded-xl">
              <X className="h-5 w-5" />
              Limpar
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="relative">
              <Button
                variant="outline"
                className="h-14 w-full justify-start text-base font-normal rounded-xl"
                onClick={() => setShowPropertiesDropdown(!showPropertiesDropdown)}
              >
                {selectedProperties.length === 0
                  ? 'Todas Propriedades'
                  : selectedProperties.length === 1
                    ? properties.find((p: any) => p.id === selectedProperties[0])?.name || '1 propriedade'
                    : `${selectedProperties.length} propriedades selecionadas`}
              </Button>
              {showPropertiesDropdown && (
                <div className="absolute top-16 left-0 right-0 z-50 bg-popover border rounded-xl shadow-lg max-h-64 overflow-y-auto p-4">
                  <div className="flex items-center space-x-3 py-3 border-b mb-2">
                    <Checkbox
                      id="property-all"
                      checked={selectedProperties.length === 0}
                      onCheckedChange={() => { setSelectedProperties([]); setSelectedPlot("all"); }}
                      className="h-6 w-6"
                    />
                    <Label htmlFor="property-all" className="text-base cursor-pointer font-medium">
                      Todas Propriedades
                    </Label>
                  </div>
                  {properties.map((prop: any) => (
                    <div key={prop.id} className="flex items-center space-x-3 py-3">
                      <Checkbox
                        id={`property-${prop.id}`}
                        checked={selectedProperties.includes(prop.id)}
                        onCheckedChange={() => {
                          setSelectedProperties(prev =>
                            prev.includes(prop.id)
                              ? prev.filter(id => id !== prop.id)
                              : [...prev, prop.id]
                          );
                          setSelectedPlot("all");
                        }}
                        className="h-6 w-6"
                      />
                      <Label htmlFor={`property-${prop.id}`} className="text-base cursor-pointer">
                        {prop.name}
                      </Label>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-base h-12 rounded-xl"
                    onClick={() => setShowPropertiesDropdown(false)}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
            
            <Select value={selectedPlot} onValueChange={setSelectedPlot}>
              <SelectTrigger className="h-14 text-base rounded-xl">
                <MapPin className="h-5 w-5 mr-2" />
                <SelectValue placeholder="Talhão" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-base py-3">Todos Talhões</SelectItem>
                {filteredPlots.map((plot: any) => (
                  <SelectItem key={plot.id} value={plot.id} className="text-base py-3">{plot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
              <SelectTrigger className="h-14 text-base rounded-xl">
                <FlaskConical className="h-5 w-5 mr-2" />
                <SelectValue placeholder="Receituário" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-base py-3">Todos Receituários</SelectItem>
                {recipes.map((recipe: any) => (
                  <SelectItem key={recipe.id} value={recipe.id} className="text-base py-3">{recipe.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-14 text-base rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-base py-3">Todos Status</SelectItem>
                <SelectItem value="planejada" className="text-base py-3">Planejada</SelectItem>
                <SelectItem value="em_andamento" className="text-base py-3">Em Andamento</SelectItem>
                <SelectItem value="concluída" className="text-base py-3">Concluída</SelectItem>
                <SelectItem value="cancelada" className="text-base py-3">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-14 text-base rounded-xl">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all" className="text-base py-3">Todos Tipos</SelectItem>
                <SelectItem value="pulverização" className="text-base py-3">Pulverização</SelectItem>
                <SelectItem value="adubação" className="text-base py-3">Adubação</SelectItem>
                <SelectItem value="semeadura" className="text-base py-3">Semeadura</SelectItem>
                <SelectItem value="outro" className="text-base py-3">Outro</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Button 
                variant="outline" 
                className="h-14 w-full justify-start text-base font-normal rounded-xl"
                onClick={() => setShowProductsDropdown(!showProductsDropdown)}
              >
                {selectedProducts.length > 0 
                  ? `${selectedProducts.length} produto(s) selecionado(s)` 
                  : 'Selecionar produtos'}
              </Button>
              {showProductsDropdown && (
                <div className="absolute top-16 left-0 right-0 z-50 bg-popover border rounded-xl shadow-lg max-h-64 overflow-y-auto p-4">
                  {products.map((product: any) => (
                    <div key={product.id} className="flex items-center space-x-3 py-3">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleProductToggle(product.id)}
                        className="h-6 w-6"
                      />
                      <Label htmlFor={`product-${product.id}`} className="text-base cursor-pointer">
                        {product.name}
                      </Label>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-3 text-base h-12 rounded-xl"
                    onClick={() => setShowProductsDropdown(false)}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-base text-muted-foreground font-medium">Período:</span>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                key="all"
                variant={selectedPeriod === "all" && selectedMonth === "all" && !dateFrom && !dateTo ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodChange("all")}
                className="h-12 px-5 text-base rounded-xl"
              >
                Todos
              </Button>
              {[
                { value: "7", label: "7 dias" },
                { value: "15", label: "15 dias" },
                { value: "30", label: "30 dias" },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={selectedPeriod === value && selectedMonth === "all" && !dateFrom && !dateTo ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePeriodChange(value)}
                  className="h-12 px-5 text-base rounded-xl"
                >
                  {label}
                </Button>
              ))}
            </div>

            <span className="text-base text-muted-foreground mx-2">ou</span>

            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-12 w-auto min-w-[180px] text-base rounded-xl">
                <SelectValue placeholder="Por mês" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[200px]">
                <SelectItem value="all" className="text-base py-3">Todos os meses</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month} className="capitalize text-base py-3">
                    {getMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-base text-muted-foreground mx-2">ou</span>

            <div className="flex gap-3 items-center flex-wrap">
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => handleDateChange(e.target.value, dateTo)}
                className="h-12 w-auto min-w-[150px] text-base rounded-xl"
              />
              <span className="text-base text-muted-foreground">até</span>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => handleDateChange(dateFrom, e.target.value)}
                className="h-12 w-auto min-w-[150px] text-base rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center pt-4 border-t">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="comparison"
                checked={showComparison}
                onCheckedChange={(checked) => setShowComparison(!!checked)}
                className="h-6 w-6"
              />
              <Label htmlFor="comparison" className="text-base cursor-pointer">
                Comparar com período anterior
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="pdfNotes"
                checked={pdfIncludeNotes}
                onCheckedChange={(checked) => setPdfIncludeNotes(!!checked)}
                className="h-6 w-6"
              />
              <Label htmlFor="pdfNotes" className="text-base cursor-pointer">
                Incluir observações no PDF
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="pdfPlotHistory"
                checked={pdfIncludePlotHistory}
                onCheckedChange={(checked) => setPdfIncludePlotHistory(!!checked)}
                className="h-6 w-6"
              />
              <Label htmlFor="pdfPlotHistory" className="text-base cursor-pointer">
                Histórico por talhão
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="pdfExecutive"
                checked={pdfIncludeExecutiveSummary}
                onCheckedChange={(checked) => setPdfIncludeExecutiveSummary(!!checked)}
                className="h-6 w-6"
              />
              <Label htmlFor="pdfExecutive" className="text-base cursor-pointer">
                Resumo executivo
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="pdfProductCosts"
                checked={pdfIncludeProductCosts}
                onCheckedChange={(checked) => setPdfIncludeProductCosts(!!checked)}
                className="h-6 w-6"
              />
              <Label htmlFor="pdfProductCosts" className="text-base cursor-pointer">
                Custos por produto
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Label className="text-base font-medium whitespace-nowrap">Ordenar por:</Label>
              <Select value={pdfSortBy} onValueChange={(v: any) => setPdfSortBy(v)}>
                <SelectTrigger className="h-12 w-auto min-w-[180px] text-base rounded-xl">
                  <SelectValue placeholder="Ordenação" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="date_desc" className="text-base py-3">Data (mais recente)</SelectItem>
                  <SelectItem value="date_asc" className="text-base py-3">Data (mais antiga)</SelectItem>
                  <SelectItem value="name_asc" className="text-base py-3">Nome (A-Z)</SelectItem>
                  <SelectItem value="name_desc" className="text-base py-3">Nome (Z-A)</SelectItem>
                  <SelectItem value="area_desc" className="text-base py-3">Área (maior)</SelectItem>
                  <SelectItem value="area_asc" className="text-base py-3">Área (menor)</SelectItem>
                  <SelectItem value="plot_asc" className="text-base py-3">Talhão (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4">
            <Label htmlFor="customFooter" className="text-base font-medium whitespace-nowrap">
              Rodapé do PDF:
            </Label>
            <Input
              id="customFooter"
              value={pdfCustomFooter}
              onChange={(e) => setPdfCustomFooter(e.target.value)}
              placeholder={profile?.company || "Nome da empresa, contato..."}
              className="h-14 text-base flex-1 rounded-xl"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 rounded-xl">
          <div className="mb-3 flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <p className="text-base text-muted-foreground">Área Total</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {stats.totalArea.toFixed(1)} ha
          </p>
          <p className="text-base text-muted-foreground mt-1">
            {filteredApplications.length} aplicações
          </p>
          {showComparison && previousStats && (
            <p className={`text-base mt-2 font-medium ${stats.totalArea >= previousStats.totalArea ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {stats.totalArea >= previousStats.totalArea ? '↑' : '↓'} {Math.abs(stats.totalArea - previousStats.totalArea).toFixed(1)} ha vs anterior
            </p>
          )}
        </Card>

        <Card className="p-5 rounded-xl">
          <div className="mb-3 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            <p className="text-base text-muted-foreground">Concluídas</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {stats.completedApps}
          </p>
          <p className="text-base text-muted-foreground mt-1">
            de {filteredApplications.length} aplicações
          </p>
        </Card>
      </div>

      {propertyChartData.length > 0 && (
        <Card className="p-5 rounded-xl">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            Área por Propriedade
          </h2>
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={propertyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 14 }} 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 14 }}
                  className="fill-muted-foreground"
                  label={{ value: 'Hectares', angle: -90, position: 'insideLeft', fontSize: 14 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'area' ? `${value} ha` : value,
                    name === 'area' ? 'Área' : 'Aplicações'
                  ]}
                  labelFormatter={(label) => propertyChartData.find(d => d.name === label)?.fullName || label}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: '16px' }}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 rounded-xl">
          <h3 className="font-semibold mb-4 text-lg sm:text-xl">Por Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-base sm:text-lg">
              <span className="text-muted-foreground">Planejadas</span>
              <span className="font-medium">{statusStats.planejada}</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg">
              <span className="text-muted-foreground">Em Andamento</span>
              <span className="font-medium">{statusStats.em_andamento}</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg">
              <span className="text-muted-foreground">Concluídas</span>
              <span className="font-medium text-green-600">{statusStats.concluída}</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg">
              <span className="text-muted-foreground">Canceladas</span>
              <span className="font-medium text-red-500">{statusStats.cancelada}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold mb-4 text-lg sm:text-xl">Por Tipo</h3>
          <div className="space-y-3">
            {Object.entries(typeStats).length > 0 ? (
              Object.entries(typeStats).map(([type, count]) => (
                <div key={type} className="flex justify-between text-base sm:text-lg">
                  <span className="text-muted-foreground capitalize">{type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-base sm:text-lg text-muted-foreground">Nenhum dado</p>
            )}
          </div>
        </Card>
      </div>

      {productStats.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold text-foreground">
            Consumo Total por Produto
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-3 text-left text-sm sm:text-base font-medium text-muted-foreground">
                    Produto
                  </th>
                  <th className="pb-3 text-right text-sm sm:text-base font-medium text-muted-foreground">
                    Consumo Total
                  </th>
                  <th className="pb-3 text-right text-sm sm:text-base font-medium text-muted-foreground">
                    Dose Média/ha
                  </th>
                  <th className="pb-3 text-right text-sm sm:text-base font-medium text-muted-foreground">
                    Aplicações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productStats.map((row: any) => (
                  <tr key={row.name}>
                    <td className="py-3 text-sm sm:text-base font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="py-3 text-right text-sm sm:text-base text-foreground">
                      {row.totalAmount.toFixed(2)} {row.unit}
                    </td>
                    <td className="py-3 text-right text-sm sm:text-base text-foreground">
                      {row.avgDose.toFixed(3)} {row.unit}/ha
                    </td>
                    <td className="py-3 text-right text-sm sm:text-base text-foreground">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg sm:text-xl font-semibold text-foreground">
          Resumo por Propriedade
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="pb-3 text-left text-sm sm:text-base font-medium text-muted-foreground">
                  Propriedade
                </th>
                <th className="pb-3 text-right text-sm sm:text-base font-medium text-muted-foreground">
                  Área (ha)
                </th>
                <th className="pb-3 text-right text-sm sm:text-base font-medium text-muted-foreground">
                  Aplicações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {propertyStats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-base sm:text-lg text-muted-foreground">
                    Nenhum dado disponível para os filtros selecionados
                  </td>
                </tr>
              ) : (
                propertyStats.map((row: any) => (
                  <tr key={row.name}>
                    <td className="py-3 text-sm sm:text-base font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="py-3 text-right text-sm sm:text-base text-foreground">
                      {row.area.toFixed(1)}
                    </td>
                    <td className="py-3 text-right text-sm sm:text-base text-foreground">
                      {row.apps}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredApplications.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Resumo por Talhão
          </h2>
          <div className="space-y-6">
            {(() => {
              const appsByPlot: Record<string, { 
                plotName: string; 
                plotId: string | null;
                plotAreaHectares: number | null;
                plotExists: boolean;
                apps: any[] 
              }> = {};
              
              filteredApplications.forEach((app: any) => {
                const plotData = app.plot_id ? plots.find((p: any) => p.id === app.plot_id) : null;
                const plotExists = !app.plot_id || plotData !== undefined;
                
                if (!plotExists) return;
                
                const plotKey = app.plot_id || app.plot_name || 'sem_talhao';
                const plotName = app.plot_name || 'Sem Talhão';
                
                if (!appsByPlot[plotKey]) {
                  appsByPlot[plotKey] = {
                    plotName,
                    plotId: app.plot_id,
                    plotAreaHectares: plotData?.area_hectares || null,
                    plotExists,
                    apps: [],
                  };
                }
                appsByPlot[plotKey].apps.push(app);
              });

              return Object.entries(appsByPlot)
                .sort(([, a], [, b]) => a.plotName.localeCompare(b.plotName, 'pt-BR'))
                .map(([plotKey, plotGroup]) => (
                  <div key={plotKey} className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-primary/10 p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-bold text-xl sm:text-2xl text-foreground">
                            {plotGroup.plotName}
                          </p>
                          <p className="text-base sm:text-lg text-muted-foreground">
                            {plotGroup.plotAreaHectares 
                              ? `Área do talhão: ${Number(plotGroup.plotAreaHectares).toFixed(2)} ha`
                              : 'Área não cadastrada'} 
                            {' • '}{plotGroup.apps.length} aplicação(ões)
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-4 py-3 text-left text-base font-medium text-muted-foreground">Aplicação</th>
                            <th className="px-4 py-3 text-left text-base font-medium text-muted-foreground">Área (ha)</th>
                            <th className="px-4 py-3 text-left text-base font-medium text-muted-foreground">Produtos e Quantidades</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {plotGroup.apps.map((app: any) => (
                            <tr key={app.id} className="hover:bg-muted/20">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-lg text-foreground">
                                  {app.name || 'Aplicação sem nome'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-lg text-foreground">
                                {Number(app.area_applied).toFixed(2)} ha
                              </td>
                              <td className="px-4 py-4">
                                {app.application_products && app.application_products.length > 0 ? (
                                  <div className="space-y-1">
                                    {app.application_products.map((p: any, idx: number) => (
                                      <p key={idx} className="text-base text-foreground">
                                        <span className="font-medium">{p.products?.name || 'Produto'}</span>
                                        <span className="text-muted-foreground ml-2">
                                          {Number(p.total_amount).toFixed(2)} {p.products?.unit || ''}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CompanySettings } from '@/hooks/useCompanySettings';

interface MonthlyReportParams {
  applications: any[];
  properties: any[];
  company: CompanySettings | null;
  monthLabel: string; // ex "janeiro 2026"
}

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '' : String(v));

export function generateMonthlyReportPdf({ applications, properties, company, monthLabel }: MonthlyReportParams) {
  const c = company || ({} as CompanySettings);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;

  // Header
  autoTable(doc, {
    startY: margin,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    body: [
      [
        { content: `Razão Social: ${fmt(c.razao_social)}`, styles: { fontStyle: 'bold' }, colSpan: 2 },
        { content: `E-mail: ${fmt(c.email)}`, colSpan: 2 },
        { content: monthLabel.toUpperCase(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] }, colSpan: 2 },
      ],
      [
        { content: `Registro MAPA: ${fmt(c.registro_mapa)}`, colSpan: 2 },
        { content: `Telefone: ${fmt(c.telefone)}`, colSpan: 2 },
        { content: `Município/UF: ${fmt(c.municipio)} / ${fmt(c.uf)}`, colSpan: 2 },
      ],
    ],
  });
  let y = (doc as any).lastAutoTable.finalY + 2;

  // Linhas de dados (uma linha por produto de cada aplicação)
  const rows: any[] = [];
  let totalArea = 0;
  let totalMinutes = 0;

  applications.forEach((app: any) => {
    const prop = properties.find((p: any) => p.id === app.property_id) || app.properties || {};
    const prods = app.application_products || [];
    const horas = app.flight_time_minutes
      ? `${String(Math.floor(app.flight_time_minutes / 60)).padStart(2, '0')}:${String(app.flight_time_minutes % 60).padStart(2, '0')}`
      : '';
    totalArea += Number(app.area_applied) || 0;
    totalMinutes += Number(app.flight_time_minutes) || 0;

    if (prods.length === 0) {
      rows.push([
        fmt(prop.uf),
        fmt(prop.municipality || prop.location),
        fmt(app.equipamento || 'Drone'),
        fmt(app.prefixo_aeronave || c.prefixo_aeronave),
        horas,
        fmt(app.cultura),
        fmt(app.application_type),
        '',
        '',
        Number(app.area_applied || 0).toFixed(2),
        '',
        '',
        '',
        fmt(app.volume_calda_lha),
      ]);
    } else {
      prods.forEach((p: any, idx: number) => {
        rows.push([
          idx === 0 ? fmt(prop.uf) : '',
          idx === 0 ? fmt(prop.municipality || prop.location) : '',
          idx === 0 ? fmt(app.equipamento || 'Drone') : '',
          idx === 0 ? fmt(app.prefixo_aeronave || c.prefixo_aeronave) : '',
          idx === 0 ? horas : '',
          idx === 0 ? fmt(app.cultura) : '',
          idx === 0 ? fmt(app.application_type) : '',
          fmt(p.classe_toxicologica),
          '',
          idx === 0 ? Number(app.area_applied || 0).toFixed(2) : '',
          fmt(p.products?.name),
          `${Number(p.dose_per_ha || 0).toFixed(3)} ${fmt(p.products?.unit)}/ha`,
          '',
          idx === 0 ? fmt(app.volume_calda_lha) : '',
        ]);
      });
    }
  });

  const totalHoras = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

  // Totais
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, halign: 'center', fillColor: [240, 240, 240], lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    body: [[
      { content: `Total horas trabalhadas: ${totalHoras}`, styles: { fontStyle: 'bold' } },
      { content: `Total área aplicada: ${totalArea.toFixed(2)} ha`, styles: { fontStyle: 'bold' } },
      { content: `Total aplicações: ${applications.length}`, styles: { fontStyle: 'bold' } },
    ]],
  });
  y = (doc as any).lastAutoTable.finalY + 1;

  // Tabela principal
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    styles: { fontSize: 7, cellPadding: 1.2, lineColor: [180, 180, 180], lineWidth: 0.1, overflow: 'linebreak', textColor: [0, 0, 0] },
    head: [[
      'UF', 'Município', 'Aeronave', 'Prefixo', 'Horas',
      'Cultura', 'Tipo de Serviço', 'Classe', 'Bioinsumo',
      'Área (ha)', 'Nome Comercial', 'Dosagem', 'Outros', 'Vol (L/ha)',
    ]],
    body: rows.length ? rows : [['', '', '', '', '', '', '', '', '', '', 'Sem aplicações no período', '', '', '']],
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Página ${i} de ${totalPages} - ${fmt(c.razao_social) || 'AgroDrone PRO'} - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      pageWidth / 2,
      pageHeight - 4,
      { align: 'center' }
    );
  }

  doc.save(`Relatorio_Mensal_${monthLabel.replace(/\s+/g, '_')}.pdf`);
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CompanySettings } from '@/hooks/useCompanySettings';

interface GenerateAnexoIxParams {
  application: any;
  property: any;
  company: CompanySettings | null;
  output?: 'save' | 'blob';
  fileName?: string;
}

const fmt = (v: any, suffix = '') => {
  if (v === null || v === undefined || v === '') return '';
  return `${v}${suffix}`;
};

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  try {
    return format(new Date(d + (d.length <= 10 ? 'T00:00:00' : '')), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return d;
  }
};

export function generateAnexoIxPdf({ application, property, company, output = 'save', fileName }: GenerateAnexoIxParams) {
  const app = application;
  const prop = property || app.properties || {};
  const c = company || ({} as CompanySettings);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Cabeçalho
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXO IX', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(13);
  doc.text('RELATÓRIO OPERACIONAL', pageWidth / 2, 18, { align: 'center' });

  let y = 24;

  // Tabela 1: Empresa x Contratante
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    body: [
      [
        { content: `Empresa: ${fmt(c.razao_social)}`, styles: { fontStyle: 'bold' } },
        { content: `Contratante: ${fmt(prop.client_name)}`, styles: { fontStyle: 'bold' } },
      ],
      [
        `Registro MAPA: ${fmt(c.registro_mapa)}`,
        `Propriedade: ${fmt(prop.name)}`,
      ],
      [
        `Endereço: ${fmt(c.endereco)}`,
        `Localização: ${fmt(prop.coordinates || prop.location)}`,
      ],
      [
        `Município/UF: ${fmt(c.municipio)} / ${fmt(c.uf)}`,
        `Município/UF: ${fmt(prop.municipality)} / ${fmt(prop.uf)}`,
      ],
      [
        `CNPJ: ${fmt(c.cnpj)}`,
        `CNPJ/CPF: ${fmt(prop.client_document)}`,
      ],
    ],
    columnStyles: { 0: { cellWidth: (pageWidth - margin * 2) / 2 }, 1: { cellWidth: (pageWidth - margin * 2) / 2 } },
  });
  y = (doc as any).lastAutoTable.finalY;

  // Tabela 2: Tipo de serviço + produtos
  const products = app.application_products || [];
  const productRows = products.length
    ? products.map((p: any) => [
        fmt(p.products?.name),
        fmt(p.formulacao),
        `${fmt(p.dose_per_ha)} ${fmt(p.products?.unit)}/ha`,
        fmt(p.classe_toxicologica),
        p.adjuvante ? 'Sim' : 'Não',
      ])
    : [['', '', '', '', '']];

  // Header row + data row
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: `Tipo de serviço: ${fmt(app.tipo_servico || app.application_type)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      'Produto', 'Formulação', 'Dosagem', 'Classe Tox.', 'Adjuvante'
    ]],
    body: [
      [
        { content: `Cultura: ${fmt(app.cultura)}`, styles: { fontStyle: 'bold' } },
        ...(productRows[0] || ['', '', '', '', '']),
      ],
      ...productRows.slice(1).map((r: any) => ['', ...r]),
      [
        { content: `Área (ha): ${fmt(app.area_applied)}`, styles: { fontStyle: 'bold' } },
        '', '', '', '', '',
      ],
      [
        { content: `Volume (L ou kg/ha): ${fmt(app.volume_calda_lha)}`, styles: { fontStyle: 'bold' } },
        '', '', '', '', '',
      ],
      [
        { content: `Outros: ${fmt(app.notes)}`, styles: { fontStyle: 'bold' } },
        { content: `Receituário Agronômico nº: ${fmt(app.receituario_numero)}`, colSpan: 3 },
        { content: `Emitido em: ${fmtDate(app.receituario_data)}`, colSpan: 2 },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 55 },
    },
  });
  y = (doc as any).lastAutoTable.finalY;

  // Parâmetros básicos
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[{ content: 'Parâmetros Básicos de Aplicação', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }]],
    body: [
      [`Temperatura Máx. = ${fmt(app.temp_max, ' °C')}`, `Equipamento = ${fmt(app.equipamento || c.equipamento_padrao)}`],
      [`Umidade Relativa Mín. = ${fmt(app.umidade_min, '%')}`, `Modelo = ${fmt(app.modelo_equipamento || c.modelo_padrao)}`],
      [`Velocidade do Vento Máx. = ${fmt(app.vento_max, ' km/h')}`, `Tipo (bico) = ${fmt(app.tipo_bico)}`],
      [`Altura de voo = ${fmt(app.altura_voo, ' m')}`, `Ângulo = ${fmt(app.angulo)}`],
      [`Largura da faixa = ${fmt(app.largura_faixa, ' m')}`, `Coordenadas: ${fmt(app.coordenadas || prop.coordinates)}`],
    ],
    columnStyles: { 0: { cellWidth: (pageWidth - margin * 2) / 2 }, 1: { cellWidth: (pageWidth - margin * 2) / 2 } },
  });
  y = (doc as any).lastAutoTable.finalY;

  // Condições meteorológicas
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center', textColor: [0, 0, 0] },
    head: [
      [
        { content: 'Condições Meteorológicas na Aplicação', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      ],
      [
        `Data: ${fmtDate(app.application_date)}`,
        { content: 'Matutino', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: 'Vespertino', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: `Início: ${fmt(app.hora_inicio)} h  Término: ${fmt(app.hora_fim)} h`, styles: { fontStyle: 'bold' } },
      ],
      ['', 'Inicial', 'Final', 'Inicial', 'Final', ''],
    ],
    body: [
      ['Temperatura °C',
        fmt(app.temp_mat_inicial), fmt(app.temp_mat_final),
        fmt(app.temp_vesp_inicial), fmt(app.temp_vesp_final),
        `Prefixo Aeronave: ${fmt(app.prefixo_aeronave || c.prefixo_aeronave)}`,
      ],
      ['Umidade Relativa %',
        fmt(app.ur_mat_inicial), fmt(app.ur_mat_final),
        fmt(app.ur_vesp_inicial), fmt(app.ur_vesp_final),
        `Uso DGPS: ${app.uso_dgps ? 'Sim' : 'Não'}`,
      ],
    ],
    columnStyles: {
      0: { cellWidth: 32, halign: 'left' },
      5: { cellWidth: 60, halign: 'left' },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // Observações
  if (app.observacoes_meteo || app.notes) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
      body: [[`Observações: ${fmt(app.observacoes_meteo || app.notes)}`]],
    });
    y = (doc as any).lastAutoTable.finalY + 2;
  }

  // Croqui (se houver)
  if (app.croqui_url) {
    try {
      const w = pageWidth - margin * 2;
      const h = 60;
      if (y + h > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Croqui da área (→ direção dos tiros / sentido do vento)', margin, y + 4);
      doc.addImage(app.croqui_url, 'JPEG', margin, y + 6, w, h);
      y += h + 10;
    } catch (e) {
      console.warn('Falha ao incluir croqui:', e);
    }
  }

  // Assinaturas
  if (y > pageHeight - 45) {
    doc.addPage();
    y = margin;
  }
  y = Math.max(y + 8, pageHeight - 40);
  doc.setLineWidth(0.2);
  const colW = (pageWidth - margin * 2) / 3;
  for (let i = 0; i < 3; i++) {
    const x = margin + i * colW;
    doc.line(x + 4, y, x + colW - 4, y);
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${fmt(c.eng_agronomo_nome)}\nEng. Agrônomo - CREA: ${fmt(c.eng_agronomo_crea)}`, margin + colW / 2, y + 4, { align: 'center' });
  doc.text(`${fmt(c.piloto_nome)}\nPiloto Agrícola - Reg.: ${fmt(c.piloto_registro)}`, margin + colW + colW / 2, y + 4, { align: 'center' });
  doc.text(`${fmt(prop.client_name)}\nProprietário/Preposto`, margin + 2 * colW + colW / 2, y + 4, { align: 'center' });

  const safeName = fileName || `Relatorio_Operacional_${(app.name || 'aplicacao').replace(/[^a-z0-9]/gi, '_')}_${fmtDate(app.application_date)}.pdf`;
  if (output === 'blob') {
    return doc.output('bloburl') as unknown as string;
  }
  doc.save(safeName);
  return null;
}

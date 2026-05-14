import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Eye, Download, Plus, Trash2, FileText } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateAnexoIxPdf } from "@/lib/anexoIxPdf";
import { toast } from "sonner";

interface ProductRow {
  name: string;
  formulacao: string;
  dose_per_ha: string;
  unit: string;
  classe_toxicologica: string;
  adjuvante: boolean;
}

interface AnexoIxDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applications: any[];
  properties: any[];
}

const blank = (): any => ({
  // empresa
  razao_social: "", registro_mapa: "", cnpj: "", endereco: "",
  empresa_municipio: "", empresa_uf: "",
  // contratante / propriedade
  client_name: "", client_document: "", property_name: "",
  property_location: "", property_municipio: "", property_uf: "",
  // serviço
  tipo_servico: "", cultura: "", area_applied: "", volume_calda_lha: "",
  notes: "",
  receituario_numero: "", receituario_data: "",
  // parâmetros
  temp_max: "", umidade_min: "", vento_max: "",
  equipamento: "", modelo_equipamento: "", tipo_bico: "",
  altura_voo: "", angulo: "", largura_faixa: "", coordenadas: "",
  // meteo
  application_date: new Date().toISOString().slice(0, 10),
  hora_inicio: "", hora_fim: "",
  temp_mat_inicial: "", temp_mat_final: "", temp_vesp_inicial: "", temp_vesp_final: "",
  ur_mat_inicial: "", ur_mat_final: "", ur_vesp_inicial: "", ur_vesp_final: "",
  prefixo_aeronave: "", uso_dgps: false,
  observacoes_meteo: "",
  croqui_url: "",
  // assinaturas
  eng_agronomo_nome: "", eng_agronomo_crea: "",
  piloto_nome: "", piloto_registro: "",
});

export function AnexoIxDialog({ open, onOpenChange, applications, properties }: AnexoIxDialogProps) {
  const { settings: company } = useCompanySettings();
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [form, setForm] = useState<any>(blank());
  const [products, setProducts] = useState<ProductRow[]>([
    { name: "", formulacao: "", dose_per_ha: "", unit: "L", classe_toxicologica: "", adjuvante: false },
  ]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Pré-preencher com dados da empresa quando carregar
  useEffect(() => {
    if (!company) return;
    setForm((f: any) => ({
      ...f,
      razao_social: f.razao_social || company.razao_social || "",
      registro_mapa: f.registro_mapa || company.registro_mapa || "",
      cnpj: f.cnpj || company.cnpj || "",
      endereco: f.endereco || company.endereco || "",
      empresa_municipio: f.empresa_municipio || company.municipio || "",
      empresa_uf: f.empresa_uf || company.uf || "",
      eng_agronomo_nome: f.eng_agronomo_nome || company.eng_agronomo_nome || "",
      eng_agronomo_crea: f.eng_agronomo_crea || company.eng_agronomo_crea || "",
      piloto_nome: f.piloto_nome || company.piloto_nome || "",
      piloto_registro: f.piloto_registro || company.piloto_registro || "",
      prefixo_aeronave: f.prefixo_aeronave || company.prefixo_aeronave || "",
      equipamento: f.equipamento || company.equipamento_padrao || "",
      modelo_equipamento: f.modelo_equipamento || company.modelo_padrao || "",
    }));
  }, [company]);

  const loadFromApplication = (id: string) => {
    setSelectedAppId(id);
    if (!id) return;
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    const prop = properties.find((p) => p.id === app.property_id) || app.properties || {};
    setForm((f: any) => ({
      ...f,
      client_name: prop.client_name || "",
      client_document: prop.client_document || "",
      property_name: prop.name || "",
      property_location: prop.coordinates || prop.location || "",
      property_municipio: prop.municipality || "",
      property_uf: prop.uf || "",
      tipo_servico: app.tipo_servico || app.application_type || "",
      cultura: app.cultura || "",
      area_applied: app.area_applied ?? "",
      volume_calda_lha: app.volume_calda_lha ?? "",
      notes: app.notes || "",
      receituario_numero: app.receituario_numero || "",
      receituario_data: app.receituario_data || "",
      temp_max: app.temp_max ?? "",
      umidade_min: app.umidade_min ?? "",
      vento_max: app.vento_max ?? "",
      equipamento: app.equipamento || f.equipamento,
      modelo_equipamento: app.modelo_equipamento || f.modelo_equipamento,
      tipo_bico: app.tipo_bico || "",
      altura_voo: app.altura_voo ?? "",
      angulo: app.angulo || "",
      largura_faixa: app.largura_faixa ?? "",
      coordenadas: app.coordenadas || prop.coordinates || "",
      application_date: app.application_date || f.application_date,
      hora_inicio: app.hora_inicio || "",
      hora_fim: app.hora_fim || "",
      temp_mat_inicial: app.temp_mat_inicial ?? "",
      temp_mat_final: app.temp_mat_final ?? "",
      temp_vesp_inicial: app.temp_vesp_inicial ?? "",
      temp_vesp_final: app.temp_vesp_final ?? "",
      ur_mat_inicial: app.ur_mat_inicial ?? "",
      ur_mat_final: app.ur_mat_final ?? "",
      ur_vesp_inicial: app.ur_vesp_inicial ?? "",
      ur_vesp_final: app.ur_vesp_final ?? "",
      prefixo_aeronave: app.prefixo_aeronave || f.prefixo_aeronave,
      uso_dgps: !!app.uso_dgps,
      observacoes_meteo: app.observacoes_meteo || "",
      croqui_url: app.croqui_url || "",
    }));
    if (app.application_products && app.application_products.length > 0) {
      setProducts(app.application_products.map((p: any) => ({
        name: p.products?.name || "",
        formulacao: p.formulacao || "",
        dose_per_ha: p.dose_per_ha?.toString() || "",
        unit: p.products?.unit || "L",
        classe_toxicologica: p.classe_toxicologica || "",
        adjuvante: !!p.adjuvante,
      })));
    }
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const buildPdfArgs = () => {
    const application = {
      ...form,
      application_products: products.map((p) => ({
        products: { name: p.name, unit: p.unit },
        dose_per_ha: p.dose_per_ha,
        formulacao: p.formulacao,
        classe_toxicologica: p.classe_toxicologica,
        adjuvante: p.adjuvante,
      })),
    };
    const property = {
      name: form.property_name,
      client_name: form.client_name,
      client_document: form.client_document,
      coordinates: form.property_location,
      location: form.property_location,
      municipality: form.property_municipio,
      uf: form.property_uf,
    };
    const companyOverride = {
      razao_social: form.razao_social,
      registro_mapa: form.registro_mapa,
      cnpj: form.cnpj,
      endereco: form.endereco,
      municipio: form.empresa_municipio,
      uf: form.empresa_uf,
      eng_agronomo_nome: form.eng_agronomo_nome,
      eng_agronomo_crea: form.eng_agronomo_crea,
      piloto_nome: form.piloto_nome,
      piloto_registro: form.piloto_registro,
      prefixo_aeronave: form.prefixo_aeronave,
      equipamento_padrao: form.equipamento,
      modelo_padrao: form.modelo_equipamento,
    } as any;
    return { application, property, company: companyOverride };
  };

  const handlePreview = () => {
    try {
      const url = generateAnexoIxPdf({ ...buildPdfArgs(), output: 'blob' }) as unknown as string;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e: any) {
      toast.error('Erro ao gerar prévia: ' + (e.message || e));
    }
  };

  const handleDownload = () => {
    try {
      generateAnexoIxPdf({ ...buildPdfArgs(), output: 'save' });
      toast.success('PDF gerado com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e.message || e));
    }
  };

  useEffect(() => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [open]);

  const updateProduct = (idx: number, patch: Partial<ProductRow>) => {
    setProducts((prev) => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-5 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Relatório Operacional (ANEXO IX)
          </DialogTitle>
          <DialogDescription className="text-sm">
            Selecione uma aplicação para preencher automaticamente, edite o que precisar e visualize antes de baixar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          {/* FORM */}
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4 border-r">
            <div>
              <Label>Carregar dados de uma aplicação (opcional)</Label>
              <Select value={selectedAppId} onValueChange={loadFromApplication}>
                <SelectTrigger><SelectValue placeholder="Selecionar aplicação..." /></SelectTrigger>
                <SelectContent>
                  {applications.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name || a.application_type} — {a.properties?.name || ''} — {a.application_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="empresa" className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto">
                <TabsTrigger value="empresa">Empresa</TabsTrigger>
                <TabsTrigger value="contratante">Contratante</TabsTrigger>
                <TabsTrigger value="servico">Serviço</TabsTrigger>
                <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
                <TabsTrigger value="meteo">Meteorologia</TabsTrigger>
                <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
              </TabsList>

              <TabsContent value="empresa" className="space-y-3 mt-4">
                <Field label="Razão Social" v={form.razao_social} on={(v) => set('razao_social', v)} />
                <Field label="Registro MAPA" v={form.registro_mapa} on={(v) => set('registro_mapa', v)} />
                <Field label="CNPJ" v={form.cnpj} on={(v) => set('cnpj', v)} />
                <Field label="Endereço" v={form.endereco} on={(v) => set('endereco', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Município" v={form.empresa_municipio} on={(v) => set('empresa_municipio', v)} />
                  <Field label="UF" v={form.empresa_uf} on={(v) => set('empresa_uf', v)} />
                </div>
              </TabsContent>

              <TabsContent value="contratante" className="space-y-3 mt-4">
                <Field label="Contratante (Nome)" v={form.client_name} on={(v) => set('client_name', v)} />
                <Field label="CPF/CNPJ" v={form.client_document} on={(v) => set('client_document', v)} />
                <Field label="Propriedade" v={form.property_name} on={(v) => set('property_name', v)} />
                <Field label="Localização / Coordenadas" v={form.property_location} on={(v) => set('property_location', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Município" v={form.property_municipio} on={(v) => set('property_municipio', v)} />
                  <Field label="UF" v={form.property_uf} on={(v) => set('property_uf', v)} />
                </div>
              </TabsContent>

              <TabsContent value="servico" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo de serviço" v={form.tipo_servico} on={(v) => set('tipo_servico', v)} />
                  <Field label="Cultura" v={form.cultura} on={(v) => set('cultura', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Área (ha)" v={form.area_applied} on={(v) => set('area_applied', v)} />
                  <Field label="Volume calda (L ou kg/ha)" v={form.volume_calda_lha} on={(v) => set('volume_calda_lha', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Receituário Agronômico nº" v={form.receituario_numero} on={(v) => set('receituario_numero', v)} />
                  <Field label="Emitido em" type="date" v={form.receituario_data} on={(v) => set('receituario_data', v)} />
                </div>
                <div>
                  <Label>Outros / observações</Label>
                  <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>Produtos</Label>
                    <Button size="sm" variant="outline" onClick={() => setProducts((p) => [...p, { name: '', formulacao: '', dose_per_ha: '', unit: 'L', classe_toxicologica: '', adjuvante: false }])}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {products.map((p, idx) => (
                    <Card key={idx} className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Produto" v={p.name} on={(v) => updateProduct(idx, { name: v })} />
                        <Field label="Formulação" v={p.formulacao} on={(v) => updateProduct(idx, { formulacao: v })} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Dose/ha" v={p.dose_per_ha} on={(v) => updateProduct(idx, { dose_per_ha: v })} />
                        <Field label="Unidade" v={p.unit} on={(v) => updateProduct(idx, { unit: v })} />
                        <Field label="Classe Tox." v={p.classe_toxicologica} on={(v) => updateProduct(idx, { classe_toxicologica: v })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={p.adjuvante} onCheckedChange={(c) => updateProduct(idx, { adjuvante: !!c })} />
                          Adjuvante
                        </label>
                        {products.length > 1 && (
                          <Button size="sm" variant="ghost" onClick={() => setProducts((prev) => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="parametros" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Equipamento" v={form.equipamento} on={(v) => set('equipamento', v)} />
                  <Field label="Modelo" v={form.modelo_equipamento} on={(v) => set('modelo_equipamento', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo (bico)" v={form.tipo_bico} on={(v) => set('tipo_bico', v)} />
                  <Field label="Ângulo" v={form.angulo} on={(v) => set('angulo', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Altura de voo (m)" v={form.altura_voo} on={(v) => set('altura_voo', v)} />
                  <Field label="Largura da faixa (m)" v={form.largura_faixa} on={(v) => set('largura_faixa', v)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Temp. Máx (°C)" v={form.temp_max} on={(v) => set('temp_max', v)} />
                  <Field label="UR Mín (%)" v={form.umidade_min} on={(v) => set('umidade_min', v)} />
                  <Field label="Vento Máx (km/h)" v={form.vento_max} on={(v) => set('vento_max', v)} />
                </div>
                <Field label="Coordenadas (aplicação)" v={form.coordenadas} on={(v) => set('coordenadas', v)} />
              </TabsContent>

              <TabsContent value="meteo" className="space-y-3 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Data" type="date" v={form.application_date} on={(v) => set('application_date', v)} />
                  <Field label="Início" type="time" v={form.hora_inicio} on={(v) => set('hora_inicio', v)} />
                  <Field label="Término" type="time" v={form.hora_fim} on={(v) => set('hora_fim', v)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Matutino</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Temp. Inicial (°C)" v={form.temp_mat_inicial} on={(v) => set('temp_mat_inicial', v)} />
                    <Field label="Temp. Final (°C)" v={form.temp_mat_final} on={(v) => set('temp_mat_final', v)} />
                    <Field label="UR Inicial (%)" v={form.ur_mat_inicial} on={(v) => set('ur_mat_inicial', v)} />
                    <Field label="UR Final (%)" v={form.ur_mat_final} on={(v) => set('ur_mat_final', v)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Vespertino</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Temp. Inicial (°C)" v={form.temp_vesp_inicial} on={(v) => set('temp_vesp_inicial', v)} />
                    <Field label="Temp. Final (°C)" v={form.temp_vesp_final} on={(v) => set('temp_vesp_final', v)} />
                    <Field label="UR Inicial (%)" v={form.ur_vesp_inicial} on={(v) => set('ur_vesp_inicial', v)} />
                    <Field label="UR Final (%)" v={form.ur_vesp_final} on={(v) => set('ur_vesp_final', v)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <Field label="Prefixo Aeronave" v={form.prefixo_aeronave} on={(v) => set('prefixo_aeronave', v)} />
                  <label className="flex items-center gap-2 text-base h-14">
                    <Checkbox checked={form.uso_dgps} onCheckedChange={(c) => set('uso_dgps', !!c)} />
                    Uso DGPS
                  </label>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes_meteo} onChange={(e) => set('observacoes_meteo', e.target.value)} rows={2} />
                </div>
              </TabsContent>

              <TabsContent value="assinaturas" className="space-y-3 mt-4">
                <Field label="Eng. Agrônomo" v={form.eng_agronomo_nome} on={(v) => set('eng_agronomo_nome', v)} />
                <Field label="CREA" v={form.eng_agronomo_crea} on={(v) => set('eng_agronomo_crea', v)} />
                <Field label="Piloto Agrícola" v={form.piloto_nome} on={(v) => set('piloto_nome', v)} />
                <Field label="Registro Piloto" v={form.piloto_registro} on={(v) => set('piloto_registro', v)} />
              </TabsContent>
            </Tabs>
          </div>

          {/* PREVIEW */}
          <div className="overflow-hidden flex flex-col bg-muted/30">
            <div className="p-3 border-b flex gap-2 shrink-0">
              <Button onClick={handlePreview} variant="outline" className="flex-1">
                <Eye className="h-4 w-4 mr-2" /> Atualizar prévia
              </Button>
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Baixar PDF
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-full" title="Prévia PDF" />
              ) : (
                <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground text-sm">
                  Clique em <strong className="mx-1">Atualizar prévia</strong> para visualizar o PDF antes de baixar.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, v, on, type = 'text' }: { label: string; v: any; on: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} className="h-11 text-base" />
    </div>
  );
}

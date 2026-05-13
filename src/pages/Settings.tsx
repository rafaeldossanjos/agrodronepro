import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Building2, Phone, Mail, Save, FileText, Image, Plane } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
});

export default function Settings() {
  const { profile, isLoading, updateProfile } = useProfile();
  const { settings: companySettings, save: saveCompany } = useCompanySettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<any>({
    razao_social: '', registro_mapa: '', cnpj: '', endereco: '', municipio: '', uf: '',
    email: '', telefone: '', eng_agronomo_nome: '', eng_agronomo_crea: '',
    piloto_nome: '', piloto_registro: '', prefixo_aeronave: '', equipamento_padrao: '', modelo_padrao: '',
  });

  useEffect(() => {
    if (companySettings) setCompanyForm({ ...companyForm, ...companySettings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companySettings]);

  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try { await saveCompany(companyForm); } finally { setIsSavingCompany(false); }
  };

  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company: '',
  });

  // Configurações de PDF (salvas em localStorage)
  const [pdfSettings, setPdfSettings] = useState({
    headerText: '',
    footerText: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        company: profile.company || '',
      });
    }
  }, [profile]);

  // Carregar configurações de PDF do localStorage
  useEffect(() => {
    const savedPdfSettings = localStorage.getItem('pdfSettings');
    if (savedPdfSettings) {
      try {
        setPdfSettings(JSON.parse(savedPdfSettings));
      } catch (e) {
        console.error('Erro ao carregar configurações de PDF:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const validated = profileSchema.parse(formData);
      await updateProfile.mutateAsync({
        full_name: validated.full_name,
        phone: validated.phone || undefined,
        company: validated.company || undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePdfSettings = () => {
    setIsSavingPdf(true);
    try {
      localStorage.setItem('pdfSettings', JSON.stringify(pdfSettings));
      toast.success('Configurações de PDF salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações de PDF');
    } finally {
      setIsSavingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground">Configurações</h1>
        <p className="text-xl sm:text-2xl text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Perfil
          </CardTitle>
          <CardDescription className="text-base">Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                Nome Completo *
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="h-14 text-base rounded-xl"
                placeholder="Digite seu nome completo"
              />
              <p className="text-sm text-muted-foreground">Seu nome será exibido nos relatórios</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="h-14 text-base rounded-xl bg-muted"
              />
              <p className="text-sm text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-14 text-base rounded-xl"
                placeholder="(00) 00000-0000"
              />
              <p className="text-sm text-muted-foreground">Número para contato</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Empresa
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="h-14 text-base rounded-xl"
                placeholder="Nome da sua empresa"
              />
              <p className="text-sm text-muted-foreground">O nome aparecerá no cabeçalho dos relatórios</p>
            </div>

            <Button type="submit" className="w-full gap-2 h-14 text-base rounded-xl" disabled={isSaving}>
              <Save className="h-5 w-5" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dados da Empresa / Operacional (ANEXO IX) */}
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Dados da Empresa / Operador (Relatório Operacional)
          </CardTitle>
          <CardDescription className="text-base">
            Preenchidos automaticamente no Relatório Operacional (ANEXO IX) e no Relatório Mensal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            ['razao_social', 'Razão Social'],
            ['registro_mapa', 'Registro MAPA'],
            ['cnpj', 'CNPJ'],
            ['endereco', 'Endereço'],
            ['municipio', 'Município'],
            ['uf', 'UF'],
            ['email', 'E-mail'],
            ['telefone', 'Telefone'],
            ['eng_agronomo_nome', 'Eng. Agrônomo (Nome)'],
            ['eng_agronomo_crea', 'CREA do Eng. Agrônomo'],
            ['piloto_nome', 'Piloto Agrícola (Nome)'],
            ['piloto_registro', 'Registro do Piloto'],
            ['prefixo_aeronave', 'Prefixo da Aeronave'],
            ['equipamento_padrao', 'Equipamento padrão (ex: Drone)'],
            ['modelo_padrao', 'Modelo padrão (ex: DJI T30)'],
          ] as [string, string][]).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label className="text-base">{label}</Label>
              <Input
                value={companyForm[key] || ''}
                onChange={(e) => setCompanyForm({ ...companyForm, [key]: e.target.value })}
                className="h-14 text-base rounded-xl"
              />
            </div>
          ))}
          <Button onClick={handleSaveCompany} className="w-full gap-2 h-14 text-base rounded-xl" disabled={isSavingCompany}>
            <Save className="h-5 w-5" />
            {isSavingCompany ? 'Salvando...' : 'Salvar Dados da Empresa'}
          </Button>
        </CardContent>
      </Card>


      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurações de PDF
          </CardTitle>
          <CardDescription className="text-base">
            Personalize o cabeçalho e rodapé dos relatórios em PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="text-base flex items-center gap-2">
              <Image className="h-5 w-5" />
              URL da Logo
            </Label>
            <Input
              id="logoUrl"
              type="url"
              value={pdfSettings.logoUrl}
              onChange={(e) => setPdfSettings({ ...pdfSettings, logoUrl: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
              className="h-14 text-base rounded-xl"
            />
            <p className="text-sm text-muted-foreground">
              Insira a URL de uma imagem para usar como logo no cabeçalho do PDF
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headerText" className="text-base">Texto do Cabeçalho</Label>
            <Textarea
              id="headerText"
              value={pdfSettings.headerText}
              onChange={(e) => setPdfSettings({ ...pdfSettings, headerText: e.target.value })}
              placeholder="Nome da empresa, slogan..."
              rows={3}
              className="text-base rounded-xl min-h-[80px]"
            />
            <p className="text-sm text-muted-foreground">
              Este texto aparecerá no cabeçalho dos relatórios em PDF
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText" className="text-base">Texto do Rodapé</Label>
            <Textarea
              id="footerText"
              value={pdfSettings.footerText}
              onChange={(e) => setPdfSettings({ ...pdfSettings, footerText: e.target.value })}
              placeholder="Contato, endereço, CNPJ..."
              rows={3}
              className="text-base rounded-xl min-h-[80px]"
            />
            <p className="text-sm text-muted-foreground">
              Este texto aparecerá no rodapé dos relatórios em PDF
            </p>
          </div>

          <Button onClick={handleSavePdfSettings} className="w-full gap-2 h-14 text-base rounded-xl" disabled={isSavingPdf}>
            <Save className="h-5 w-5" />
            {isSavingPdf ? 'Salvando...' : 'Salvar Configurações de PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

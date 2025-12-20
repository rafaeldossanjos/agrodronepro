import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Building2, Phone, Mail, Save, FileText, Image } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
});

export default function Settings() {
  const { profile, isLoading, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Completo *
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configurações de PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurações de PDF
          </CardTitle>
          <CardDescription>
            Personalize o cabeçalho e rodapé dos relatórios em PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              URL da Logo
            </Label>
            <Input
              id="logoUrl"
              type="url"
              value={pdfSettings.logoUrl}
              onChange={(e) => setPdfSettings({ ...pdfSettings, logoUrl: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Insira a URL de uma imagem para usar como logo no cabeçalho do PDF
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headerText">Texto do Cabeçalho</Label>
            <Textarea
              id="headerText"
              value={pdfSettings.headerText}
              onChange={(e) => setPdfSettings({ ...pdfSettings, headerText: e.target.value })}
              placeholder="Nome da empresa, slogan..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Este texto aparecerá no cabeçalho dos relatórios em PDF
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText">Texto do Rodapé</Label>
            <Textarea
              id="footerText"
              value={pdfSettings.footerText}
              onChange={(e) => setPdfSettings({ ...pdfSettings, footerText: e.target.value })}
              placeholder="Contato, endereço, CNPJ..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Este texto aparecerá no rodapé dos relatórios em PDF
            </p>
          </div>

          <Button onClick={handleSavePdfSettings} className="w-full gap-2" disabled={isSavingPdf}>
            <Save className="h-4 w-4" />
            {isSavingPdf ? 'Salvando...' : 'Salvar Configurações de PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

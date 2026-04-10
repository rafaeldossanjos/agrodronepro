import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Cylinder, FileText, Droplet, ChevronRight, Rocket } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useProducts } from "@/hooks/useProducts";
import { useRecipes } from "@/hooks/useRecipes";
import { useApplications } from "@/hooks/useApplications";

const ONBOARDING_KEY = "agrodrone_onboarding_completed";

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const { properties, isLoading: loadingProps } = useProperties();
  const { products, isLoading: loadingProducts } = useProducts();
  const { recipes, isLoading: loadingRecipes } = useRecipes();
  const { applications, isLoading: loadingApps } = useApplications();

  const isLoading = loadingProps || loadingProducts || loadingRecipes || loadingApps;

  useEffect(() => {
    if (isLoading) return;
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed) return;

    const hasData = properties.length > 0 || products.length > 0 || recipes.length > 0 || applications.length > 0;
    if (!hasData) {
      setOpen(true);
    }
  }, [isLoading, properties, products, recipes, applications]);

  const steps = [
    {
      icon: Rocket,
      title: "Bem-vindo ao AgroDrone PRO!",
      description: "Vamos configurar seu sistema em poucos passos para você começar a registrar suas operações.",
      action: null,
    },
    {
      icon: MapPin,
      title: "1. Cadastre sua Propriedade",
      description: "Registre suas fazendas com nome, localização e área total. Depois você poderá criar talhões no mapa.",
      action: { label: "Ir para Propriedades", href: "/properties" },
    },
    {
      icon: Cylinder,
      title: "2. Adicione seus Produtos",
      description: "Cadastre defensivos, fertilizantes e adjuvantes com doses recomendadas e preços para cálculos automáticos.",
      action: { label: "Ir para Produtos", href: "/products" },
    },
    {
      icon: FileText,
      title: "3. Crie Receituários",
      description: "Monte templates com combinações de produtos e doses para agilizar o preenchimento das aplicações.",
      action: { label: "Ir para Receituários", href: "/recipes" },
    },
    {
      icon: Droplet,
      title: "4. Registre Aplicações",
      description: "Agora você pode registrar suas operações de campo, acompanhar o progresso e gerar relatórios completos!",
      action: { label: "Ir para Aplicações", href: "/applications" },
    },
  ];

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  };

  const handleAction = (href: string) => {
    handleClose();
    navigate(href);
  };

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{currentStep.title}</h2>
          <p className="text-lg text-muted-foreground">{currentStep.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step === 0 ? (
            <Button className="flex-1 h-14 text-lg gap-2" onClick={() => setStep(1)}>
              Começar <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <>
              {currentStep.action && (
                <Button
                  className="flex-1 h-14 text-lg gap-2"
                  onClick={() => handleAction(currentStep.action!.href)}
                >
                  {currentStep.action.label}
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button variant="outline" className="h-14 text-lg" onClick={() => setStep(step + 1)}>
                  Pular
                </Button>
              ) : (
                <Button variant="outline" className="h-14 text-lg" onClick={handleClose}>
                  Fechar
                </Button>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-sm"
        >
          Pular tudo
        </button>
      </DialogContent>
    </Dialog>
  );
}

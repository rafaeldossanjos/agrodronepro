import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Edit, Trash2 } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { PropertyDialog } from "@/components/PropertyDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Properties() {
  const { properties, isLoading, deleteProperty } = useProperties();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando propriedades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Propriedades</h1>
          <p className="text-muted-foreground">
            Gerencie suas fazendas e talhões
          </p>
        </div>
        <PropertyDialog />
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma propriedade cadastrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece criando sua primeira propriedade
            </p>
            <PropertyDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id} className="p-6 transition-all hover:shadow-lg">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div className="flex gap-1">
                  <PropertyDialog 
                    property={property}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a propriedade "{property.name}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteProperty.mutate(property.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <h3 className="mb-1 text-xl font-semibold text-foreground">
                {property.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {property.location}
              </p>

              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Área Total</span>
                  <span className="font-semibold text-foreground">
                    {property.total_area} ha
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Talhões</span>
                  <span className="font-semibold text-foreground">
                    {property.plot_count}
                  </span>
                </div>
              </div>

              {property.notes && (
                <div className="mt-4 text-sm text-muted-foreground border-t border-border pt-3">
                  {property.notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

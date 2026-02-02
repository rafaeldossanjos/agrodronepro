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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground">Propriedades</h1>
          <p className="text-2xl sm:text-3xl text-muted-foreground">
            Gerencie suas fazendas e talhões
          </p>
        </div>
        <PropertyDialog />
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card className="p-10">
          <div className="text-center">
            <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold text-foreground mb-3">
              Nenhuma propriedade cadastrada
            </h3>
            <p className="text-xl text-muted-foreground mb-4">
              Comece criando sua primeira propriedade
            </p>
            <PropertyDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id} className="p-5 transition-all hover:shadow-lg">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <div className="flex gap-2">
                  <PropertyDialog 
                    property={property}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-12 w-12 p-0">
                        <Edit className="h-6 w-6" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-12 w-12 p-0">
                        <Trash2 className="h-6 w-6" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a propriedade "{property.name}"?
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

              <h3 className="mb-2 text-2xl sm:text-3xl font-semibold text-foreground line-clamp-1">
                {property.name}
              </h3>
              <p className="mb-3 text-lg text-muted-foreground line-clamp-1">
                {property.location}
              </p>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Área Total</span>
                  <span className="font-semibold text-2xl text-foreground">
                    {property.total_area} ha
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Talhões</span>
                  <span className="font-semibold text-2xl text-foreground">
                    {property.plot_count}
                  </span>
                </div>
              </div>

              {property.notes && (
                <div className="mt-3 text-lg text-muted-foreground border-t border-border pt-3 line-clamp-2">
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

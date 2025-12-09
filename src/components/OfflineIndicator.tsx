import { WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOfflineData } from '@/hooks/useOfflineData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const { isOnline, pendingCount, isSyncing, forceSync } = useOfflineData();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto">
      <div className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg",
        !isOnline 
          ? "border-destructive/50 bg-destructive/10 text-destructive" 
          : pendingCount > 0 
            ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
            : "border-primary/50 bg-primary/10 text-primary"
      )}>
        <div className="flex items-center gap-3">
          {!isOnline ? (
            <>
              <WifiOff className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Modo Offline</span>
                <span className="text-xs opacity-80">
                  {pendingCount > 0 
                    ? `${pendingCount} alterações pendentes`
                    : 'Suas alterações serão salvas localmente'
                  }
                </span>
              </div>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Sincronizando...</span>
                <span className="text-xs opacity-80">Enviando alterações</span>
              </div>
            </>
          ) : pendingCount > 0 ? (
            <>
              <AlertCircle className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{pendingCount} pendente(s)</span>
                <span className="text-xs opacity-80">Aguardando sincronização</span>
              </div>
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Sincronizado</span>
            </>
          )}
        </div>

        {isOnline && pendingCount > 0 && !isSyncing && (
          <Button
            size="sm"
            variant="outline"
            onClick={forceSync}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Sincronizar
          </Button>
        )}
      </div>
    </div>
  );
};

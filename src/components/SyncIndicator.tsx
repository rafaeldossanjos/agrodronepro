import { RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useOfflineData } from '@/hooks/useOfflineData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const SyncIndicator = () => {
  const { isOnline, pendingCount, isSyncing, forceSync } = useOfflineData();

  const handleClick = () => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      forceSync();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn(
            "relative h-12 w-12 lg:h-14 lg:w-14 rounded-xl",
            !isOnline && "text-destructive",
            isSyncing && "text-primary",
            pendingCount > 0 && isOnline && !isSyncing && "text-yellow-600 dark:text-yellow-400"
          )}
        >
          {!isOnline ? (
            <CloudOff className="h-6 w-6 lg:h-7 lg:w-7" />
          ) : isSyncing ? (
            <RefreshCw className="h-6 w-6 lg:h-7 lg:w-7 animate-spin" />
          ) : (
            <Cloud className="h-6 w-6 lg:h-7 lg:w-7" />
          )}
          {pendingCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
              !isOnline ? "bg-destructive" : "bg-yellow-500"
            )}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!isOnline
          ? `Offline${pendingCount > 0 ? ` • ${pendingCount} pendente(s)` : ''}`
          : isSyncing
            ? 'Sincronizando...'
            : pendingCount > 0
              ? `${pendingCount} pendente(s) • Toque para sincronizar`
              : 'Sincronizado'}
      </TooltipContent>
    </Tooltip>
  );
};

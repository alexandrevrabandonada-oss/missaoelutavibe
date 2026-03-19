import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useContentSignalCounts,
  useToggleContentSignal,
  CONTENT_SIGNAL_CONFIG,
  type ContentSignal,
} from "@/hooks/useContentSignals";
import { cn } from "@/lib/utils";

interface ContentSignalsBarProps {
  contentId: string;
  size?: "sm" | "default";
  showLabels?: boolean;
}

export function ContentSignalsBar({
  contentId,
  size = "default",
  showLabels = false,
}: ContentSignalsBarProps) {
  const { data: signalCounts = [], isLoading } = useContentSignalCounts(contentId);
  const toggleSignal = useToggleContentSignal();

  const handleToggle = (signal: ContentSignal) => {
    toggleSignal.mutate({ contentId, signal });
  };

  if (isLoading) {
    return <div className="h-8 flex items-center gap-1 animate-pulse bg-muted rounded w-40" />;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {(Object.entries(CONTENT_SIGNAL_CONFIG) as [ContentSignal, { emoji: string; label: string }][]).map(
        ([signal, { emoji, label }]) => {
          const signalData = signalCounts.find((s) => s.signal === signal);
          const count = signalData?.count ?? 0;
          const isActive = signalData?.user_reacted ?? false;

          return (
            <Tooltip key={signal}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "secondary" : "outline"}
                  size={size === "sm" ? "sm" : "default"}
                  className={cn(
                    "gap-1.5 transition-all",
                    size === "sm" ? "h-7 px-2" : "h-8 px-2.5",
                    isActive && "bg-primary/15 border-primary/40 text-primary"
                  )}
                  onClick={() => handleToggle(signal)}
                  disabled={toggleSignal.isPending}
                >
                  <span className={size === "sm" ? "text-sm" : "text-base"}>
                    {emoji}
                  </span>
                  {(count > 0 || showLabels) && (
                    <span
                      className={cn(
                        "font-medium",
                        size === "sm" ? "text-xs" : "text-sm"
                      )}
                    >
                      {showLabels ? label : count}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
      )}
    </div>
  );
}

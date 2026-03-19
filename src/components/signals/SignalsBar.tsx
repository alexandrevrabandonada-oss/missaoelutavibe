import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useSignals,
  SIGNAL_ICONS,
  type SignalType,
  type TargetType,
} from "@/hooks/useUtilitySignals";
import { cn } from "@/lib/utils";

interface SignalsBarProps {
  targetType: TargetType;
  targetId: string;
  size?: "sm" | "default";
  showLabels?: boolean;
}

export function SignalsBar({
  targetType,
  targetId,
  size = "default",
  showLabels = false,
}: SignalsBarProps) {
  const { counts, userSignals, toggle, isToggling } = useSignals(targetType, targetId);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {(Object.entries(SIGNAL_ICONS) as [SignalType, { emoji: string; label: string }][]).map(
        ([tipo, { emoji, label }]) => {
          const count = counts[tipo] ?? 0;
          const isActive = userSignals.includes(tipo);

          return (
            <Tooltip key={tipo}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "secondary" : "outline"}
                  size={size === "sm" ? "sm" : "default"}
                  className={cn(
                    "gap-1.5 transition-all",
                    size === "sm" ? "h-7 px-2" : "h-8 px-2.5",
                    isActive && "bg-primary/15 border-primary/40 text-primary"
                  )}
                  onClick={() => toggle(tipo)}
                  disabled={isToggling}
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

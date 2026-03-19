import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MuralReacaoTipo, MURAL_REACAO_ICONS } from "@/hooks/useMural";
import { cn } from "@/lib/utils";

interface MuralReactionsBarProps {
  reacoesCounts: Record<MuralReacaoTipo, number>;
  userReactions: MuralReacaoTipo[];
  onToggle: (tipo: MuralReacaoTipo) => void;
  size?: "sm" | "default";
}

export function MuralReactionsBar({
  reacoesCounts,
  userReactions,
  onToggle,
  size = "default",
}: MuralReactionsBarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Object.entries(MURAL_REACAO_ICONS).map(([tipo, { emoji, label }]) => {
        const count = reacoesCounts[tipo as MuralReacaoTipo] ?? 0;
        const isActive = userReactions.includes(tipo as MuralReacaoTipo);

        return (
          <Tooltip key={tipo}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? "secondary" : "outline"}
                size={size === "sm" ? "sm" : "default"}
                className={cn(
                  "gap-1.5",
                  size === "sm" ? "h-8 px-2" : "h-9 px-3",
                  isActive && "bg-primary/10 border-primary/30"
                )}
                onClick={() => onToggle(tipo as MuralReacaoTipo)}
              >
                <span className={size === "sm" ? "text-base" : "text-lg"}>{emoji}</span>
                {count > 0 && (
                  <span className={cn(
                    "font-medium",
                    size === "sm" ? "text-xs" : "text-sm"
                  )}>
                    {count}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

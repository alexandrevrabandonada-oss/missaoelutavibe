import { AlertCircle, Megaphone } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PreCampaignBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

export function PreCampaignBadge({ variant = "compact", className = "" }: PreCampaignBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (variant === "full") {
    return (
      <div className={`bg-primary/10 border border-primary/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Megaphone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm text-primary mb-1">
              Pré-campanha
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estamos em pré-campanha: divulgar o Alexandre é parte do trabalho — sem personalismo, 
              por necessidade do sistema eleitoral. A força é coletiva.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <button 
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors ${className}`}
            onClick={() => setShowTooltip(!showTooltip)}
          >
            <Megaphone className="h-3 w-3" />
            <span>Pré-campanha</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] p-3">
          <p className="text-xs leading-relaxed">
            Divulgar o Alexandre é parte do trabalho — sem personalismo, 
            por necessidade do sistema eleitoral. A força é coletiva.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * RegistroSignalBadge — F21
 * Compact signal strength indicator for pre-submit feedback.
 * Shows how well the current registro meets essential criteria.
 */

import { cn } from "@/lib/utils";
import { type SignalStrength } from "@/lib/missionCriteria";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface Props {
  strength: SignalStrength;
  met: number;
  total: number;
  className?: string;
}

const CONFIG: Record<SignalStrength, {
  icon: typeof ShieldCheck;
  label: string;
  colorClass: string;
}> = {
  strong: {
    icon: ShieldCheck,
    label: "Registro completo",
    colorClass: "text-emerald-500",
  },
  acceptable: {
    icon: ShieldAlert,
    label: "Pode melhorar",
    colorClass: "text-amber-500",
  },
  weak: {
    icon: Shield,
    label: "Incompleto",
    colorClass: "text-destructive",
  },
};

export function RegistroSignalBadge({ strength, met, total, className }: Props) {
  const cfg = CONFIG[strength];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4", cfg.colorClass)} />
      <span className={cn("text-xs font-medium", cfg.colorClass)}>
        {cfg.label}
      </span>
      <span className="text-[10px] text-muted-foreground">
        ({met}/{total} critérios essenciais)
      </span>
    </div>
  );
}

/**
 * CoordCriteriaRef — F21
 * Compact criteria reference for coordinators in the validation sheet.
 * Shows what's expected for this mission type + a coord-specific tip.
 */

import { CheckCircle2, Info } from "lucide-react";
import { getMissionCriteria } from "@/lib/missionCriteria";
import { getMissionTypeLabel } from "@/lib/missionLabels";
import { cn } from "@/lib/utils";

interface Props {
  missionType: string | null | undefined;
  className?: string;
}

export function CoordCriteriaRef({ missionType, className }: Props) {
  if (!missionType) return null;

  const { criteria, coordTip } = getMissionCriteria(missionType);
  const essentials = criteria.filter(c => c.weight === "essential");

  return (
    <div className={cn("rounded-md border border-border bg-muted/30 p-3 space-y-2", className)}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <CheckCircle2 className="h-3 w-3" />
        Critérios · {getMissionTypeLabel(missionType)}
      </p>

      <ul className="space-y-0.5">
        {essentials.map((c, i) => (
          <li key={i} className="text-xs text-foreground flex items-baseline gap-1.5">
            <span className="text-primary">•</span>
            {c.text}
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-1.5 pt-1 border-t border-border">
        <Info className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground italic">{coordTip}</p>
      </div>
    </div>
  );
}

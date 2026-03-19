/**
 * MissionProofGuide — F21 refactor
 * Now powered by missionCriteria.ts (single source of truth).
 */

import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMissionCriteria } from "@/lib/missionCriteria";

interface MissionProofGuideProps {
  missionType: string;
  className?: string;
}

export function MissionProofGuide({ missionType, className }: MissionProofGuideProps) {
  const { criteria } = getMissionCriteria(missionType);

  const essential = criteria.filter(c => c.weight === "essential");
  const recommended = criteria.filter(c => c.weight === "recommended");
  const forbidden = criteria.filter(c => c.weight === "forbidden");

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Como registrar
      </p>

      <div className="space-y-3">
        {essential.length > 0 && (
          <div className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Obrigatório</p>
              <ul className="space-y-0.5">
                {essential.map((item, i) => (
                  <li key={i} className="text-sm text-foreground">{item.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {recommended.length > 0 && (
          <div className="flex gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Opcional</p>
              <ul className="space-y-0.5">
                {recommended.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{item.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {forbidden.length > 0 && (
          <div className="flex gap-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-destructive mb-1">Não envie</p>
              <ul className="space-y-0.5">
                {forbidden.map((item, i) => (
                  <li key={i} className="text-sm text-destructive/80">{item.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

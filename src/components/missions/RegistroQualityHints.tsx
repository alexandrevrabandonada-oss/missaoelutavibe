/**
 * RegistroQualityHints — F18
 * 
 * Lightweight pre-submit hints. Not errors — guidance.
 * Shows only when user has started filling fields.
 */

import { type QualityHint } from "@/lib/registroQualityCheck";
import { Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  hints: QualityHint[];
  className?: string;
}

export function RegistroQualityHints({ hints, className }: Props) {
  if (hints.length === 0) return null;

  const warnings = hints.filter(h => h.level === "warning");
  const tips = hints.filter(h => h.level === "tip");

  return (
    <div className={cn("space-y-2", className)}>
      {warnings.map((h, i) => (
        <div
          key={`w-${i}`}
          className="flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/20 px-3 py-2"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-400">{h.message}</p>
        </div>
      ))}

      {tips.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-muted/50 border border-border px-3 py-2">
          <Lightbulb className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            {tips.map((h, i) => (
              <p key={`t-${i}`} className="text-xs text-muted-foreground">{h.message}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

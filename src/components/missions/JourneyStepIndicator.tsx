/**
 * JourneyStepIndicator — F20: Compact 4-step progress indicator.
 * Shows: Agir → Enviado → Análise → Recibo
 *
 * Used in VoluntarioMissao and RegistroCard to orient the volunteer.
 */

import { JOURNEY_STEPS, getJourneyStepIndex, type JourneyStep } from "@/lib/journeyStatus";
import { cn } from "@/lib/utils";

interface Props {
  currentStep: JourneyStep;
  className?: string;
}

export function JourneyStepIndicator({ currentStep, className }: Props) {
  const currentIdx = getJourneyStepIndex(currentStep);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {JOURNEY_STEPS.map((step, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-3 sm:w-4",
                  isCompleted ? "bg-emerald-500/60" : "bg-border"
                )}
              />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  isCompleted && "bg-emerald-500",
                  isCurrent && "bg-primary ring-2 ring-primary/30",
                  !isCompleted && !isCurrent && "bg-muted-foreground/20"
                )}
              />
              <span
                className={cn(
                  "text-[9px] leading-none",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isCompleted
                    ? "text-emerald-500/70"
                    : "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

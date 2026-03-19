/**
 * CelulaComecePorAqui - Onboarding block for new cell members (F12.1b)
 * 
 * Visibility rule: shown until the member has at least 1 VALIDATED evidence.
 * This proves they completed the full cycle (submit → coordination validates).
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Rocket, Send, CheckCircle2 } from "lucide-react";

interface Step {
  icon: React.ElementType;
  label: string;
  done: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface Props {
  hasEvidences: boolean;
  hasValidated: boolean;
  onGoToMural: () => void;
  onGoToMissoes: () => void;
}

export function CelulaComecePorAqui({ hasEvidences, hasValidated, onGoToMural, onGoToMissoes }: Props) {
  // F12.1b: Only hide when the member has at least 1 validated record
  // This means they completed the full loop: submit → validate
  if (hasValidated) return null;

  const steps: Step[] = [
    {
      icon: Megaphone,
      label: "Veja o mural da célula",
      done: false,
      action: onGoToMural,
      actionLabel: "Ver mural",
    },
    {
      icon: Rocket,
      label: "Escolha uma missão para agir",
      done: false, // No tracking of "chose a mission" — stays as navigable guidance
      action: onGoToMissoes,
      actionLabel: "Ver missões",
    },
    {
      icon: Send,
      label: "Envie seu primeiro registro",
      done: hasEvidences,
    },
  ];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Rocket className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="heading-luta text-sm">Comece por aqui</h3>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                step.done 
                  ? "bg-primary/20" 
                  : "bg-muted"
              }`}>
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <step.icon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm flex-1 ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {step.label}
              </span>
              {!step.done && step.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary shrink-0"
                  onClick={step.action}
                >
                  {step.actionLabel}
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/60 mt-3">
          Este guia desaparece quando seu primeiro registro for validado
        </p>
      </CardContent>
    </Card>
  );
}

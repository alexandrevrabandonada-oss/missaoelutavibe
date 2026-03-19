import { Link } from "react-router-dom";
import { useOnboardingSteps } from "@/hooks/useOnboardingSteps";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function OnboardingBanner() {
  const { status, isLoading } = useOnboardingSteps();

  // Don't show if loading, complete, or no status
  if (isLoading || !status || status.is_complete) {
    return null;
  }

  const stepsCompleted = status.steps_completed || 0;
  const progressPercent = (stepsCompleted / 4) * 100;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">Complete seus primeiros passos</h3>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {stepsCompleted}/4
            </span>
          </div>
        </div>
        <Button asChild size="sm" className="flex-shrink-0">
          <Link to="/voluntario/primeiros-passos">
            Continuar
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

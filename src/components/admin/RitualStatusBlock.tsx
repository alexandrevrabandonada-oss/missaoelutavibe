import { useNavigate } from "react-router-dom";
import { usePlaybook, getStatusDisplay } from "@/hooks/usePlaybook";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight } from "lucide-react";

interface RitualStatusBlockProps {
  scopeTipo?: "global" | "cidade" | "celula";
  scopeId?: string | null;
}

export function RitualStatusBlock({ scopeTipo, scopeId }: RitualStatusBlockProps) {
  const navigate = useNavigate();
  const { ritual, isLoading } = usePlaybook(scopeTipo, scopeId);

  if (isLoading || !ritual) {
    return null;
  }

  const statusDisplay = getStatusDisplay(ritual.status_geral);

  return (
    <div className={`card-luta border ${statusDisplay.bgClass}`}>
      <div className="flex items-center gap-2 text-primary mb-3">
        <BookOpen className="h-5 w-5" />
        <span className="text-sm uppercase tracking-wider font-bold">Rito da Semana</span>
      </div>

      {/* Status Display */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{statusDisplay.icon}</span>
        <p className={`text-lg font-bold ${statusDisplay.color}`}>
          {statusDisplay.label}
        </p>
      </div>

      {/* Top Alerts */}
      {ritual.alerts && ritual.alerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {ritual.alerts.slice(0, 3).map((alert, idx) => (
            <div 
              key={idx}
              className={`p-2 rounded-lg border text-sm flex items-center justify-between gap-2 cursor-pointer hover:bg-secondary/50 transition-colors ${
                alert.level === "vermelho" 
                  ? "border-destructive/30 bg-destructive/5" 
                  : alert.level === "amarelo"
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-green-500/30 bg-green-500/5"
              }`}
              onClick={() => navigate(alert.action_url)}
            >
              <span>{alert.title}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => navigate("/admin/playbook")}
      >
        <BookOpen className="h-4 w-4 mr-2" />
        Abrir Playbook
      </Button>
    </div>
  );
}

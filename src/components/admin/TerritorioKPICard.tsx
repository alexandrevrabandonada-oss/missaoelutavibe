import { useNavigate } from "react-router-dom";
import { useTerritorio } from "@/hooks/useTerritorio";
import { MapPin, AlertTriangle, Users, Building2 } from "lucide-react";

export function TerritorioKPICard() {
  const navigate = useNavigate();
  const { kpis, isLoadingKpis } = useTerritorio();

  if (isLoadingKpis || !kpis) {
    return null;
  }

  const hasIssues = kpis.cidades_sem_coord > 0 || kpis.celulas_sem_moderador > 0 || kpis.cidades_crescendo_sem_estrutura > 0;

  return (
    <div
      className={`card-luta cursor-pointer transition-colors hover:border-primary/50 ${hasIssues ? "border-amber-500/30" : ""}`}
      onClick={() => navigate("/admin/territorio")}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${hasIssues ? "bg-amber-500/10" : "bg-primary/10"}`}>
          <MapPin className={`h-5 w-5 ${hasIssues ? "text-amber-500" : "text-primary"}`} />
        </div>
        <div>
          <p className="font-bold">Território</p>
          <p className="text-sm text-muted-foreground">Cobertura e expansão</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className={kpis.cidades_sem_coord > 0 ? "text-destructive" : ""}>
          <div className="flex items-center justify-center gap-1">
            {kpis.cidades_sem_coord > 0 && <AlertTriangle className="h-3 w-3" />}
            <span className="text-lg font-bold">{kpis.cidades_sem_coord}</span>
          </div>
          <p className="text-xs text-muted-foreground">Cidades s/ coord</p>
        </div>
        <div className={kpis.celulas_sem_moderador > 0 ? "text-amber-500" : ""}>
          <div className="flex items-center justify-center gap-1">
            <Users className="h-3 w-3" />
            <span className="text-lg font-bold">{kpis.celulas_sem_moderador}</span>
          </div>
          <p className="text-xs text-muted-foreground">Células s/ mod</p>
        </div>
        <div className={kpis.cidades_crescendo_sem_estrutura > 0 ? "text-destructive" : ""}>
          <div className="flex items-center justify-center gap-1">
            {kpis.cidades_crescendo_sem_estrutura > 0 && <AlertTriangle className="h-3 w-3" />}
            <span className="text-lg font-bold">{kpis.cidades_crescendo_sem_estrutura}</span>
          </div>
          <p className="text-xs text-muted-foreground">Crescendo s/ estrutura</p>
        </div>
      </div>

      {kpis.interesses_pendentes > 0 && (
        <div className="mt-3 pt-3 border-t border-border text-center">
          <span className="text-sm text-primary font-medium">
            {kpis.interesses_pendentes} interesse{kpis.interesses_pendentes > 1 ? "s" : ""} pendente{kpis.interesses_pendentes > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

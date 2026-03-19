import { useNavigate } from "react-router-dom";
import { useCiclos, type Ciclo } from "@/hooks/useCiclos";
import { useUserRoles } from "@/hooks/useUserRoles";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  Settings,
  FileText,
  Rocket,
} from "lucide-react";

export default function AdminSemana() {
  const navigate = useNavigate();
  const { ciclos, activeCycle, isLoading } = useCiclos();
  const { isLoading: isRolesLoading, isCoordinator, getScope } = useUserRoles();

  if (isLoading || isRolesLoading) {
    return <FullPageLoader />;
  }

  if (!isCoordinator) {
    navigate("/admin");
    return null;
  }

  const scope = getScope();

  // Filter cycles by scope
  const filteredCycles = ciclos.filter((c) => {
    // Admin/none sees all
    if (scope.type === "none" || scope.type === "regiao") return true;
    // City coordinator sees city cycles + global
    if (scope.type === "cidade") {
      return c.cidade === scope.cidade || (!c.cidade && !c.celula_id);
    }
    // Cell coordinator sees cell cycles + city + global
    if (scope.type === "celula") {
      return (
        c.celula_id === scope.cellId ||
        (!c.cidade && !c.celula_id)
      );
    }
    return true;
  });

  // Group by status
  const activeCycles = filteredCycles.filter((c) => c.status === "ativo");
  const draftCycles = filteredCycles.filter((c) => c.status === "rascunho");
  const closedCycles = filteredCycles.filter((c) => c.status === "encerrado");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "rascunho":
        return <Badge variant="secondary">Rascunho</Badge>;
      case "encerrado":
        return <Badge variant="outline">Encerrado</Badge>;
      default:
        return null;
    }
  };

  const CycleRow = ({ cycle }: { cycle: Ciclo }) => (
    <button
      onClick={() => navigate(`/admin/semana/${cycle.id}`)}
      className="w-full card-luta text-left hover:bg-secondary/80 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold">{cycle.titulo}</h3>
            {getStatusBadge(cycle.status)}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(cycle.inicio), "dd/MM", { locale: ptBR })} —{" "}
            {format(new Date(cycle.fim), "dd/MM", { locale: ptBR })}
          </p>
          {cycle.cidade && (
            <p className="text-xs text-muted-foreground mt-1">
              Escopo: {cycle.cidade}
            </p>
          )}
        </div>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <RoleScopeBanner />

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Pilot Panel Link */}
        <button
          onClick={() => navigate("/admin/piloto")}
          className="w-full card-luta text-left hover:bg-secondary/80 transition-colors flex items-center gap-3"
        >
          <Rocket className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">Painel do Piloto</h3>
            <p className="text-xs text-muted-foreground">Editar missões e materiais canônicos</p>
          </div>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Calendar className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">
              Gerenciar Semanas
            </span>
          </div>
          <h1 className="text-2xl font-bold">Ciclos Semanais</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie ciclos, metas e fechamentos
          </p>
        </div>

        {/* Active Cycle Highlight */}
        {activeCycles.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Play className="h-4 w-4 text-green-600" />
              Ciclo Ativo
            </h2>
            <div className="space-y-2">
              {activeCycles.map((cycle) => (
                <CycleRow key={cycle.id} cycle={cycle} />
              ))}
            </div>
          </section>
        )}

        {/* Draft Cycles */}
        {draftCycles.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Rascunhos
            </h2>
            <div className="space-y-2">
              {draftCycles.map((cycle) => (
                <CycleRow key={cycle.id} cycle={cycle} />
              ))}
            </div>
          </section>
        )}

        {/* Closed Cycles */}
        {closedCycles.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Encerrados
            </h2>
            <div className="space-y-2">
              {closedCycles.slice(0, 5).map((cycle) => (
                <CycleRow key={cycle.id} cycle={cycle} />
              ))}
            </div>
          </section>
        )}

        {filteredCycles.length === 0 && (
          <div className="card-luta text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum ciclo encontrado no seu escopo.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Crie um novo ciclo no painel principal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

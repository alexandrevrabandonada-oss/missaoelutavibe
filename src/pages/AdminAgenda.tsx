import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCiclos } from "@/hooks/useCiclos";
import { useAtividades, ATIVIDADE_TIPO_LABELS, ATIVIDADE_STATUS_LABELS, Atividade, AtividadeStatus } from "@/hooks/useAtividades";
import { AppShell } from "@/components/layout/AppShell";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Calendar,
  MapPin,
  Clock,
  Users,
  Pencil,
  ChevronRight,
} from "lucide-react";

export default function AdminAgenda() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoordinator, isLoading: rolesLoading, getScope } = useUserRoles();
  const { activeCycle, ciclos, isLoadingActive } = useCiclos();
  const scope = getScope();

  const [statusFilter, setStatusFilter] = useState<AtividadeStatus | "all">("all");
  const [cicloFilter, setCicloFilter] = useState<string>("all");

  // Get activities based on filters
  const { atividades, isLoading: atividadesLoading } = useAtividades({
    status: statusFilter,
    cicloId: cicloFilter === "all" ? undefined : cicloFilter === "none" ? null : cicloFilter,
  });

  if (rolesLoading || isLoadingActive) {
    return <AppShell><div className="p-6">Carregando...</div></AppShell>;
  }

  if (!isCoordinator) {
    navigate("/admin");
    return null;
  }

  const getStatusColor = (status: AtividadeStatus) => {
    switch (status) {
      case "rascunho": return "bg-muted text-muted-foreground";
      case "publicada": return "bg-green-100 text-green-700";
      case "cancelada": return "bg-red-100 text-red-700";
      case "concluida": return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <RoleScopeBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie atividades e eventos
            </p>
          </div>
          <Button onClick={() => navigate("/admin/agenda/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AtividadeStatus | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="publicada">Publicada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cicloFilter} onValueChange={setCicloFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ciclos</SelectItem>
              <SelectItem value="none">Sem ciclo</SelectItem>
              {ciclos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.titulo} {c.status === "ativo" && "(ativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activities List */}
        {atividadesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : atividades.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma atividade encontrada</p>
            <Button variant="outline" onClick={() => navigate("/admin/agenda/nova")}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira atividade
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {atividades.map((atividade) => (
              <ActivityRow
                key={atividade.id}
                atividade={atividade}
                onEdit={() => navigate(`/admin/agenda/${atividade.id}/editar`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ActivityRow({ atividade, onEdit }: { atividade: Atividade; onEdit: () => void }) {
  const startDate = new Date(atividade.inicio_em);

  const getStatusColor = (status: AtividadeStatus) => {
    switch (status) {
      case "rascunho": return "bg-muted text-muted-foreground";
      case "publicada": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelada": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "concluida": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <div
      className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={getStatusColor(atividade.status)}>
              {ATIVIDADE_STATUS_LABELS[atividade.status]}
            </Badge>
            <Badge variant="outline">
              {ATIVIDADE_TIPO_LABELS[atividade.tipo]}
            </Badge>
            {atividade.ciclo && (
              <Badge variant="outline" className="text-primary border-primary/50">
                {atividade.ciclo.titulo}
              </Badge>
            )}
          </div>
          <h3 className="font-bold mb-1">{atividade.titulo}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(startDate, "HH:mm")}
            </span>
            {atividade.local_texto && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="h-3 w-3" />
                {atividade.local_texto}
              </span>
            )}
            {atividade.celula && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {atividade.celula.name}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}

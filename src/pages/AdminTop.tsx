import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useTopOfWeek, useRecomputeRollups, useCoordPicks, type TopItem } from "@/hooks/useUtilitySignals";
import { useSquadsAdmin } from "@/hooks/useSquads";
import { useCreateReplicableMission, useCreateTaskFromTop, useCheckReplicacao } from "@/hooks/useReplicacao";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trophy,
  Repeat2,
  Share2,
  Users,
  Star,
  Target,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Copy,
  ListTodo,
  Check,
} from "lucide-react";

export default function AdminTop() {
  const navigate = useNavigate();
  const { isLoading: rolesLoading, isCoordinator, getScope } = useUserRoles();
  const scope = getScope();

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return subWeeks(base, weekOffset);
  }, [weekOffset]);

  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  // Determine scope
  const scopeTipo = scope.type === "celula" ? "celula" : "cidade";
  const scopeId = scope.type === "celula" ? scope.cellId! : scope.cidade || "global";

  const { data: topData, isLoading, refetch } = useTopOfWeek(weekStartStr, scopeTipo, scopeId);
  const recomputeRollups = useRecomputeRollups();
  const { createPick } = useCoordPicks();
  
  // Squads for task creation
  const { squads } = useSquadsAdmin({ escopo_tipo: scopeTipo, escopo_id: scopeId });
  
  // Replication mutations
  const createMission = useCreateReplicableMission();
  const createTask = useCreateTaskFromTop();

  // Coord Pick Dialog
  const [pickDialog, setPickDialog] = useState<{
    open: boolean;
    targetType: string;
    targetId: string;
    title: string;
  }>({ open: false, targetType: "", targetId: "", title: "" });
  const [pickNote, setPickNote] = useState("");

  // Replication Dialog
  const [replicateDialog, setReplicateDialog] = useState<{
    open: boolean;
    mode: "mission" | "task";
    targetType: string;
    targetId: string;
    title: string;
  }>({ open: false, mode: "mission", targetType: "", targetId: "", title: "" });
  const [replicateTitle, setReplicateTitle] = useState("");
  const [replicateDesc, setReplicateDesc] = useState("");
  const [replicatePublish, setReplicatePublish] = useState(false);
  const [replicateSquadId, setReplicateSquadId] = useState("");

  if (rolesLoading) return <FullPageLoader />;

  if (!isCoordinator) {
    navigate("/admin");
    return null;
  }

  const handleRecompute = () => {
    recomputeRollups.mutate(
      { weekStart: weekStartStr, scopeTipo, scopeId },
      { onSuccess: () => refetch() }
    );
  };

  const handleAddPick = () => {
    createPick.mutate({
      weekStart: weekStartStr,
      scopeTipo,
      scopeId,
      targetType: pickDialog.targetType,
      targetId: pickDialog.targetId,
      note: pickNote || undefined,
    });
    setPickDialog({ open: false, targetType: "", targetId: "", title: "" });
    setPickNote("");
  };

  const openReplicateDialog = (mode: "mission" | "task", item: TopItem) => {
    setReplicateDialog({
      open: true,
      mode,
      targetType: item.target_type,
      targetId: item.target_id,
      title: item.title || "Sem título",
    });
    setReplicateTitle(item.title || "Missão Replicável");
    setReplicateDesc("");
    setReplicatePublish(false);
    setReplicateSquadId("");
  };

  const handleReplicate = async () => {
    if (replicateDialog.mode === "mission") {
      await createMission.mutateAsync({
        weekStart: weekStartStr,
        scopeTipo,
        scopeId,
        sourceType: replicateDialog.targetType,
        sourceId: replicateDialog.targetId,
        options: {
          titulo: replicateTitle,
          descricao: replicateDesc,
          publicar_no_mural: replicatePublish,
        },
      });
    } else {
      if (!replicateSquadId) {
        toast.error("Selecione um squad");
        return;
      }
      await createTask.mutateAsync({
        weekStart: weekStartStr,
        scopeTipo,
        scopeId,
        sourceType: replicateDialog.targetType,
        sourceId: replicateDialog.targetId,
        squadId: replicateSquadId,
        options: {
          titulo: replicateTitle,
          descricao: replicateDesc,
        },
      });
    }
    setReplicateDialog({ open: false, mode: "mission", targetType: "", targetId: "", title: "" });
    refetch();
  };

  const TopList = ({
    title,
    icon: Icon,
    items,
    color,
  }: {
    title: string;
    icon: any;
    items: TopItem[];
    color: string;
  }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum item ainda esta semana
          </p>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.target_type}-${item.target_id}`}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <span className="text-lg font-bold text-muted-foreground w-6 pt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.title || "Sem título"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  {item.target_type === "mission" ? (
                    <Target className="h-3 w-3" />
                  ) : (
                    <MessageSquare className="h-3 w-3" />
                  )}
                  <span>{item.unique_users} pessoas • Score: {Math.round(item.score_sum)}</span>
                </div>
                
                {/* Replication CTAs */}
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openReplicateDialog("mission", item)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Criar Missão
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openReplicateDialog("task", item)}
                  >
                    <ListTodo className="h-3 w-3 mr-1" />
                    Criar Tarefa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() =>
                      setPickDialog({
                        open: true,
                        targetType: item.target_type,
                        targetId: item.target_id,
                        title: item.title || "Sem título",
                      })
                    }
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <Button
          variant="outline"
          size="icon"
          onClick={handleRecompute}
          disabled={recomputeRollups.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${recomputeRollups.isPending ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <RoleScopeBanner />

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Trophy className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">
              Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold">Top da Semana</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie escolhas editoriais e veja ranking
          </p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium">
              Semana de {format(currentWeekStart, "dd MMM", { locale: ptBR })}
            </p>
            {weekOffset === 0 && (
              <Badge variant="secondary" className="text-xs mt-1">
                Esta semana
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
            disabled={weekOffset === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <FullPageLoader />
          </div>
        ) : (
          <div className="space-y-4">
            <TopList
              title="Mais Usados (♻️)"
              icon={Repeat2}
              items={topData?.usei || []}
              color="text-green-500"
            />

            <TopList
              title="Mais Compartilhados (📣)"
              icon={Share2}
              items={topData?.compartilhei || []}
              color="text-blue-500"
            />

            <TopList
              title="Mais Puxados (🤝)"
              icon={Users}
              items={topData?.puxo || []}
              color="text-purple-500"
            />

            {/* Coord Picks */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Escolha da Coordenação
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topData?.coordPicks && topData.coordPicks.length > 0 ? (
                  topData.coordPicks.map((pick) => (
                    <div
                      key={`${pick.target_type}-${pick.target_id}`}
                      className="flex items-start gap-3 p-2 rounded-lg bg-background"
                    >
                      <Star className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {pick.title || "Sem título"}
                        </p>
                        {pick.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            "{pick.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    Nenhuma escolha editorial ainda. Clique em ⭐ para destacar.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Pick Dialog */}
      <Dialog open={pickDialog.open} onOpenChange={(o) => setPickDialog({ ...pickDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha da Coordenação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Destacar: <strong>{pickDialog.title}</strong>
            </p>
            <Textarea
              placeholder="Nota opcional (ex: 'Excelente exemplo de...')"
              value={pickNote}
              onChange={(e) => setPickNote(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickDialog({ ...pickDialog, open: false })}>
              Cancelar
            </Button>
            <Button onClick={handleAddPick} disabled={createPick.isPending}>
              <Star className="h-4 w-4 mr-2" />
              Destacar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replicate Dialog */}
      <Dialog open={replicateDialog.open} onOpenChange={(o) => setReplicateDialog({ ...replicateDialog, open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {replicateDialog.mode === "mission" ? "Criar Missão Replicável" : "Criar Tarefa no Squad"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Origem: <strong>{replicateDialog.title}</strong>
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="rep-titulo">Título</Label>
              <Input
                id="rep-titulo"
                value={replicateTitle}
                onChange={(e) => setReplicateTitle(e.target.value)}
                placeholder="Título da missão/tarefa"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rep-desc">Descrição</Label>
              <Textarea
                id="rep-desc"
                value={replicateDesc}
                onChange={(e) => setReplicateDesc(e.target.value)}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>
            
            {replicateDialog.mode === "mission" && (
              <div className="flex items-center gap-2">
                <Switch
                  id="rep-publish"
                  checked={replicatePublish}
                  onCheckedChange={setReplicatePublish}
                />
                <Label htmlFor="rep-publish">Publicar no Mural</Label>
              </div>
            )}
            
            {replicateDialog.mode === "task" && (
              <div className="space-y-2">
                <Label htmlFor="rep-squad">Squad</Label>
                <Select value={replicateSquadId} onValueChange={setReplicateSquadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o squad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {squads.map((squad) => (
                      <SelectItem key={squad.id} value={squad.id}>
                        {squad.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplicateDialog({ ...replicateDialog, open: false })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReplicate}
              disabled={createMission.isPending || createTask.isPending || !replicateTitle}
            >
              {replicateDialog.mode === "mission" ? (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Criar Missão
                </>
              ) : (
                <>
                  <ListTodo className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

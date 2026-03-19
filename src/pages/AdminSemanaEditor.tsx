import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCycleById } from "@/hooks/useSemana";
import { useMissions } from "@/hooks/useMissions";
import { useAtividades } from "@/hooks/useAtividades";
import { usePinnedAnuncio } from "@/hooks/usePinnedAnuncio";
import { useAnuncioMutations } from "@/hooks/useAnuncios";
import { CycleMissionPicker } from "@/components/admin/CycleMissionPicker";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCells } from "@/hooks/useCells";
import { useMuralRecibos } from "@/hooks/useMuralRecibos";
import { useObservability } from "@/hooks/useObservability";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { CycleBacklogTab } from "@/components/admin/CycleBacklogTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Target,
  CalendarDays,
  Megaphone,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Users,
  Rocket,
  FileText,
  Lock,
  MessageSquare,
  ListTodo,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// UUID v4 regex for basic validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Safe date format — returns fallback on invalid input */
function safeFormat(dateStr: string | null | undefined, fmt: string, fallback = "—"): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt, { locale: ptBR });
  } catch {
    return fallback;
  }
}

/** Recovery shell shown for invalid ID, fetch errors, etc. */
function RecoveryShell({ title, message }: { title: string; message: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
          <Button onClick={() => navigate("/admin/semana")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSemanaEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { report } = useObservability();

  // ── Gate 1: invalid or missing ID ──
  const isValidId = !!id && UUID_RE.test(id);

  useEffect(() => {
    if (id && !isValidId) {
      report({ code: "SEMANA_INVALID_ID", source: "client", severity: "warn", meta: { stage: "param_validation" } });
    }
  }, [id, isValidId]);

  if (!isValidId) {
    return (
      <RecoveryShell
        title="ID inválido"
        message="O endereço não contém um ciclo válido. Volte e tente novamente."
      />
    );
  }

  // Now id is guaranteed to be a valid UUID string
  return <AdminSemanaEditorInner id={id} />;
}

/** Inner component — only mounts when id is a valid UUID */
function AdminSemanaEditorInner({ id }: { id: string }) {
  const navigate = useNavigate();
  const { report } = useObservability();

  // ── Data hooks — each wrapped to not crash ──
  const { cycle, isLoading, metas, updateMetas, isUpdatingMetas, closeCycle, isClosingCycle, refetch } = useCycleById(id);

  // Dependent hooks — only query when id is present (they already guard internally)
  let missions: any[] = [];
  let atividades: any[] = [];
  let pinnedAnuncio: any = null;

  try {
    const missionsHook = useMissions(id);
    missions = missionsHook.missions ?? [];
  } catch { /* swallow */ }

  try {
    const atividadesHook = useAtividades({ cicloId: id });
    atividades = atividadesHook.atividades ?? [];
  } catch { /* swallow */ }

  try {
    const pinnedHook = usePinnedAnuncio(id);
    pinnedAnuncio = pinnedHook.pinnedAnuncio ?? null;
  } catch { /* swallow */ }

  const { create: createAnuncio } = useAnuncioMutations();
  const { isCoordinator, isAdmin, getScope } = useUserRoles();
  const { cells } = useCells();
  const { upsertReciboSemana, isUpsertingSemana } = useMuralRecibos();

  const scope = getScope();

  // Local state for metas editing
  const [localMetas, setLocalMetas] = useState<string[]>([]);
  const [newMeta, setNewMeta] = useState("");
  const [hasMetasChanges, setHasMetasChanges] = useState(false);

  // Close cycle dialog state
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [fechamento, setFechamento] = useState({
    feitos: "",
    travas: "",
    proximos_passos: "",
  });
  const [publicarNoMural, setPublicarNoMural] = useState(false);
  const [muralCelulaId, setMuralCelulaId] = useState("");

  // Weekly plan dialog state
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planText, setPlanText] = useState("");
  const [isPublishingPlan, setIsPublishingPlan] = useState(false);

  // ── Fetch error detection ──
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    // If loading is done and cycle is null (not just slow), mark as not-found
    if (!isLoading && !cycle && !fetchError) {
      // Give a tick for React Query to settle
      const t = setTimeout(() => {
        if (!cycle) {
          report({ code: "SEMANA_CYCLE_NOT_FOUND", source: "client", severity: "warn", meta: { stage: "fetch" } });
        }
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isLoading, cycle]);

  // Sync metas from server
  useEffect(() => {
    if (metas) {
      setLocalMetas(metas);
    }
  }, [metas]);

  // Set defaults when cycle loads
  useEffect(() => {
    if (cycle) {
      const isCellScoped = !!cycle.celula_id;
      setPublicarNoMural(isCellScoped);
      setMuralCelulaId(cycle.celula_id || "");
    }
  }, [cycle?.id]);

  // ── Gate 2: loading ──
  if (isLoading) {
    return <FullPageLoader />;
  }

  // ── Gate 3: cycle not found ──
  if (!cycle) {
    return (
      <RecoveryShell
        title="Ciclo não encontrado"
        message="Sem dados ainda — piloto em preparação. O ciclo pode ter sido encerrado ou não existe."
      />
    );
  }

  const isEncerrado = cycle.status === "encerrado";
  const fechamentoJson = cycle.fechamento_json as { feitos?: string; travas?: string; proximos_passos?: string } | null;

  // Handle adding a meta
  const handleAddMeta = () => {
    if (!newMeta.trim()) return;
    const updated = [...localMetas, newMeta.trim()];
    setLocalMetas(updated);
    setNewMeta("");
    setHasMetasChanges(true);
  };

  // Handle removing a meta
  const handleRemoveMeta = (index: number) => {
    const updated = localMetas.filter((_, i) => i !== index);
    setLocalMetas(updated);
    setHasMetasChanges(true);
  };

  // Save metas
  const handleSaveMetas = async () => {
    try {
      await updateMetas(localMetas);
      toast.success("Metas salvas com sucesso!");
      setHasMetasChanges(false);
    } catch (error: any) {
      report({ code: "SEMANA_SAVE_METAS_FAIL", source: "rpc", severity: "error", meta: { stage: "save_metas" } });
      toast.error("Erro ao salvar metas. Tente novamente.");
    }
  };

  // Generate weekly plan text
  const generatePlanText = () => {
    try {
      const missionList = missions.length > 0
        ? missions.map((m) => `• ${m.title}`).join("\n")
        : "• Nenhuma missão definida ainda";

      const metasList = localMetas.length > 0
        ? localMetas.map((m) => `✓ ${m}`).join("\n")
        : "• Metas ainda não definidas";

      const plan = `📅 PLANO DA SEMANA: ${cycle.titulo}
${safeFormat(cycle.inicio, "dd/MM")} a ${safeFormat(cycle.fim, "dd/MM")}

🎯 METAS DA SEMANA:
${metasList}

🚀 MISSÕES DA SEMANA:
${missionList}

💪 NOSSA FORÇA É COLETIVA
Estamos em pré-campanha — cada missão cumprida nos fortalece para a disputa.

#ÉLuta — Escutar • Cuidar • Organizar`;

      setPlanText(plan);
      setShowPlanDialog(true);
    } catch {
      report({ code: "SEMANA_PLAN_GEN_FAIL", source: "client", severity: "warn", meta: { stage: "gen_plan" } });
      toast.error("Erro ao gerar plano. Tente novamente.");
    }
  };

  // Publish weekly plan
  const handlePublishPlan = async () => {
    if (!planText.trim()) return;
    setIsPublishingPlan(true);
    try {
      await createAnuncio.mutateAsync({
        titulo: `Plano da Semana: ${cycle.titulo}`,
        texto: planText,
        escopo: cycle.cidade ? "CIDADE" : "GLOBAL",
        cidade: cycle.cidade || undefined,
        celula_id: cycle.celula_id || undefined,
        status: "PUBLICADO",
        tags: ["plano-semanal", "missões"],
        ciclo_id: cycle.id,
        fixado: true,
      } as any);
      toast.success("Plano da Semana publicado!");
      setShowPlanDialog(false);
      setPlanText("");
    } catch {
      report({ code: "SEMANA_PUBLISH_PLAN_FAIL", source: "rpc", severity: "error", meta: { stage: "publish_plan" } });
      toast.error("Erro ao publicar anúncio. Tente novamente.");
    } finally {
      setIsPublishingPlan(false);
    }
  };

  // Managed cells
  const managedCells = (() => {
    if (isAdmin) return cells;
    if (scope.type === "celula" && scope.cellId) return cells.filter((c) => c.id === scope.cellId);
    if (scope.type === "cidade" && scope.cidade) return cells.filter((c) => c.city === scope.cidade);
    return [];
  })();

  // Close cycle
  const handleCloseCycle = async () => {
    if (!fechamento.feitos.trim()) {
      toast.error("Preencha pelo menos os feitos da semana");
      return;
    }
    if (publicarNoMural && !muralCelulaId) {
      toast.error("Selecione uma célula para publicar no mural");
      return;
    }
    try {
      await closeCycle(fechamento);

      const reciboText = `📋 RECIBO DA SEMANA: ${cycle.titulo}
${safeFormat(cycle.inicio, "dd/MM")} a ${safeFormat(cycle.fim, "dd/MM")}

✅ O QUE FIZEMOS:
${fechamento.feitos}

🚧 TRAVAS E DESAFIOS:
${fechamento.travas || "Sem travas registradas"}

➡️ PRÓXIMOS PASSOS:
${fechamento.proximos_passos || "A definir no próximo ciclo"}

💪 Obrigado a todos que participaram!

#ÉLuta — Escutar • Cuidar • Organizar`;

      await createAnuncio.mutateAsync({
        titulo: `Recibo da Semana: ${cycle.titulo}`,
        texto: reciboText,
        escopo: cycle.cidade ? "CIDADE" : "GLOBAL",
        cidade: cycle.cidade || undefined,
        celula_id: cycle.celula_id || undefined,
        status: "PUBLICADO",
        tags: ["recibo-semanal", "fechamento"],
        ciclo_id: cycle.id,
      } as any);

      if (publicarNoMural && muralCelulaId) {
        await upsertReciboSemana({
          cellId: muralCelulaId,
          cicloId: cycle.id,
          titulo: cycle.titulo,
          feitos: fechamento.feitos,
          travas: fechamento.travas,
          proximos_passos: fechamento.proximos_passos,
        });
      }

      toast.success("Ciclo encerrado e recibo publicado!");
      setShowCloseDialog(false);
      navigate("/admin/semana");
    } catch {
      report({ code: "SEMANA_CLOSE_FAIL", source: "rpc", severity: "error", meta: { stage: "close_cycle" } });
      toast.error("Erro ao fechar ciclo. Tente novamente.");
    }
  };

  const completedMissions = missions.filter(
    (m) => m.status === "validada" || m.status === "concluida"
  );

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/semana")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <RoleScopeBanner />

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Cycle Header */}
        <div className="card-luta border-primary/50 bg-primary/5">
          <div className="flex items-start gap-3">
            <Calendar className="h-6 w-6 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold">{cycle.titulo}</h1>
                <Badge
                  variant={cycle.status === "ativo" ? "default" : "secondary"}
                  className="text-xs uppercase"
                >
                  {cycle.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {safeFormat(cycle.inicio, "dd/MM")} —{" "}
                {safeFormat(cycle.fim, "dd/MM")}
              </p>
              {cycle.cidade && (
                <p className="text-xs text-muted-foreground mt-1">
                  Escopo: {cycle.cidade}
                </p>
              )}
            </div>
          </div>
        </div>

        {isEncerrado && fechamentoJson && (
          <div className="card-luta border-green-500/50 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-green-600" />
              <span className="font-bold text-sm">Ciclo Encerrado</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Feitos:</strong> {fechamentoJson.feitos || "—"}
              </p>
              {fechamentoJson.travas && (
                <p>
                  <strong>Travas:</strong> {fechamentoJson.travas}
                </p>
              )}
              {fechamentoJson.proximos_passos && (
                <p>
                  <strong>Próximos passos:</strong>{" "}
                  {fechamentoJson.proximos_passos}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="metas" className="w-full">
          <TabsList className="w-full grid grid-cols-6 mb-4">
            <TabsTrigger value="metas" className="text-xs">
              <Target className="h-4 w-4 mr-1" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="missoes" className="text-xs">
              <Rocket className="h-4 w-4 mr-1" />
              Missões
            </TabsTrigger>
            <TabsTrigger value="backlog" className="text-xs">
              <ListTodo className="h-4 w-4 mr-1" />
              Backlog
            </TabsTrigger>
            <TabsTrigger value="plano" className="text-xs">
              <Megaphone className="h-4 w-4 mr-1" />
              Plano
            </TabsTrigger>
            <TabsTrigger value="conteudo" className="text-xs">
              <CalendarDays className="h-4 w-4 mr-1" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="fechar" className="text-xs">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Fechar
            </TabsTrigger>
          </TabsList>

          {/* Metas Tab */}
          <TabsContent value="metas" className="space-y-4">
            <div className="card-luta">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Metas da Semana
              </h3>

              {!isEncerrado && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Nova meta..."
                    value={newMeta}
                    onChange={(e) => setNewMeta(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddMeta()}
                  />
                  <Button onClick={handleAddMeta} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {localMetas.length > 0 ? (
                  localMetas.map((meta, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-secondary/30 rounded-lg p-3"
                    >
                      <span className="text-sm">{meta}</span>
                      {!isEncerrado && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMeta(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sem dados ainda — piloto em preparação
                  </p>
                )}
              </div>

              {hasMetasChanges && !isEncerrado && (
                <Button
                  className="w-full mt-4 btn-luta"
                  onClick={handleSaveMetas}
                  disabled={isUpdatingMetas}
                >
                  {isUpdatingMetas ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Metas
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Missões Tab */}
          <TabsContent value="missoes" className="space-y-4">
            <div className="card-luta">
              <CycleMissionPicker cicloId={cycle.id} isEncerrado={isEncerrado} />
            </div>
          </TabsContent>

          {/* Backlog Tab */}
          <TabsContent value="backlog" className="space-y-4">
            <CycleBacklogTab
              cicloId={cycle.id}
              metas={localMetas}
              cidade={cycle.cidade}
              celulaId={cycle.celula_id}
              isEncerrado={isEncerrado}
            />
          </TabsContent>

          {/* Plano Tab */}
          <TabsContent value="plano" className="space-y-4">
            <div className="card-luta">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Plano da Semana
              </h3>

              {pinnedAnuncio ? (
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2">{pinnedAnuncio.titulo}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {pinnedAnuncio.texto}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto mt-2"
                    onClick={() =>
                      navigate(`/admin/anuncios/${pinnedAnuncio.id}`)
                    }
                  >
                    Editar anúncio →
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm mb-4">
                    Sem dados ainda — piloto em preparação
                  </p>
                </div>
              )}

              {!isEncerrado && (
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={generatePlanText}
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  {pinnedAnuncio ? "Gerar Novo Plano" : "Gerar Plano da Semana"}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Conteúdo Tab */}
          <TabsContent value="conteudo" className="space-y-4">
            <div className="card-luta">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Missões ({missions.length})
                </h3>
                <Badge variant="outline">
                  {completedMissions.length} concluídas
                </Badge>
              </div>

              {missions.length > 0 ? (
                <div className="space-y-2">
                  {missions.slice(0, 5).map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center justify-between bg-secondary/30 rounded-lg p-3"
                    >
                      <span className="text-sm">{mission.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {mission.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem dados ainda — piloto em preparação
                </p>
              )}
            </div>

            <div className="card-luta">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Atividades ({atividades.length})
                </h3>
                {!isEncerrado && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/admin/agenda/nova?ciclo_id=${cycle.id}`)
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nova
                  </Button>
                )}
              </div>

              {atividades.length > 0 ? (
                <div className="space-y-2">
                  {atividades.slice(0, 5).map((ativ) => (
                    <div
                      key={ativ.id}
                      className="flex items-center justify-between bg-secondary/30 rounded-lg p-3"
                    >
                      <div>
                        <span className="text-sm font-medium">{ativ.titulo}</span>
                        <p className="text-xs text-muted-foreground">
                          {safeFormat(ativ.inicio_em, "dd/MM HH:mm")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ativ.tipo}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem dados ainda — piloto em preparação
                </p>
              )}
            </div>
          </TabsContent>

          {/* Fechar Tab */}
          <TabsContent value="fechar" className="space-y-4">
            <div className="card-luta">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Fechar Semana
              </h3>

              {isEncerrado ? (
                <div className="text-center py-6">
                  <Lock className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Este ciclo já foi encerrado
                  </p>
                  {cycle.fechado_em && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Encerrado em{" "}
                      {safeFormat(cycle.fechado_em, "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ao fechar a semana, você registra os resultados e gera um
                    "Recibo da Semana" para os voluntários.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {missions.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Missões</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {completedMissions.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                  </div>

                  <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full btn-luta">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Fechar Semana
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Fechar Semana: {cycle.titulo}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="feitos">O que fizemos? *</Label>
                          <Textarea
                            id="feitos"
                            placeholder="Liste as principais conquistas..."
                            value={fechamento.feitos}
                            onChange={(e) =>
                              setFechamento({ ...fechamento, feitos: e.target.value })
                            }
                            className="min-h-[80px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="travas">Travas e desafios</Label>
                          <Textarea
                            id="travas"
                            placeholder="O que dificultou ou impediu..."
                            value={fechamento.travas}
                            onChange={(e) =>
                              setFechamento({ ...fechamento, travas: e.target.value })
                            }
                            className="min-h-[60px]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="proximos">Próximos passos</Label>
                          <Textarea
                            id="proximos"
                            placeholder="O que levar para a próxima semana..."
                            value={fechamento.proximos_passos}
                            onChange={(e) =>
                              setFechamento({
                                ...fechamento,
                                proximos_passos: e.target.value,
                              })
                            }
                            className="min-h-[60px]"
                          />
                        </div>

                        <div className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">Publicar no Mural da Célula</span>
                            </div>
                            <Switch
                              checked={publicarNoMural}
                              onCheckedChange={setPublicarNoMural}
                              disabled={managedCells.length === 0}
                            />
                          </div>
                          
                          {publicarNoMural && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Célula destino</Label>
                              <Select
                                value={muralCelulaId}
                                onValueChange={setMuralCelulaId}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Selecione a célula" />
                                </SelectTrigger>
                                <SelectContent>
                                  {managedCells.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name} ({c.city})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {managedCells.length === 0 && (
                            <p className="text-xs text-destructive">
                              Não há células no seu escopo para publicar.
                            </p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowCloseDialog(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCloseCycle}
                          disabled={isClosingCycle || isUpsertingSemana || (publicarNoMural && !muralCelulaId)}
                          className="btn-luta"
                        >
                          {isClosingCycle || isUpsertingSemana ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Confirmar Fechamento
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Weekly Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Gerar Plano da Semana
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Edite o texto abaixo antes de publicar. O anúncio será fixado.
            </p>
            <Textarea
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePublishPlan}
              disabled={isPublishingPlan || !planText.trim()}
              className="btn-luta"
            >
              {isPublishingPlan ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Publicar Anúncio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCiclos } from "@/hooks/useCiclos";
import { useCells } from "@/hooks/useCells";
import { useProfile } from "@/hooks/useProfile";
import {
  useAtividades,
  useAtividadeRsvp,
  ATIVIDADE_TIPO_LABELS,
  ATIVIDADE_STATUS_LABELS,
  RSVP_STATUS_LABELS,
  Atividade,
  AtividadeTipo,
  AtividadeStatus,
  ReciboAtividade,
} from "@/hooks/useAtividades";
import { useMuralRecibos } from "@/hooks/useMuralRecibos";
import { AppShell } from "@/components/layout/AppShell";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Save, Send, XCircle, CheckCircle, Trash2, Users, FileText, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  titulo: string;
  tipo: AtividadeTipo;
  inicio_em: string;
  fim_em: string;
  local_texto: string;
  descricao: string;
  cidade: string;
  celula_id: string;
  ciclo_id: string;
  responsavel_user_id: string;
  vincular_ciclo: boolean;
}

interface ReciboFormData {
  resumo: string;
  feitos: string;
  proximos_passos: string;
  publicarNoMural: boolean;
  muralCelulaId: string;
}

export default function AdminAgendaEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { isCoordinator, isAdmin, getScope } = useUserRoles();
  const { activeCycle, ciclos } = useCiclos();
  const { cells } = useCells();
  const { getAtividade, create, update, changeStatus, delete: deleteAtividade, isCreating, isUpdating } = useAtividades();
  const { upsertReciboAtividade, isUpsertingAtividade } = useMuralRecibos();

  const isEditing = !!id;
  const scope = getScope();

  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [form, setForm] = useState<FormData>({
    titulo: "",
    tipo: "reuniao",
    inicio_em: "",
    fim_em: "",
    local_texto: "",
    descricao: "",
    cidade: profile?.city || "",
    celula_id: "",
    ciclo_id: activeCycle?.id || "",
    responsavel_user_id: user?.id || "",
    vincular_ciclo: !!activeCycle,
  });
  const [reciboForm, setReciboForm] = useState<ReciboFormData>({
    resumo: "",
    feitos: "",
    proximos_passos: "",
    publicarNoMural: false,
    muralCelulaId: "",
  });
  const [isSavingRecibo, setIsSavingRecibo] = useState(false);

  // Load existing activity
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getAtividade(id);
        if (data) {
          setAtividade(data);
          setForm({
            titulo: data.titulo,
            tipo: data.tipo,
            inicio_em: data.inicio_em ? format(new Date(data.inicio_em), "yyyy-MM-dd'T'HH:mm") : "",
            fim_em: data.fim_em ? format(new Date(data.fim_em), "yyyy-MM-dd'T'HH:mm") : "",
            local_texto: data.local_texto || "",
            descricao: data.descricao || "",
            cidade: data.cidade || "",
            celula_id: data.celula_id || "",
            ciclo_id: data.ciclo_id || "",
            responsavel_user_id: data.responsavel_user_id || "",
            vincular_ciclo: !!data.ciclo_id,
          });
          // Load existing receipt if any
          if (data.recibo_json) {
            setReciboForm({
              resumo: data.recibo_json.resumo || "",
              feitos: data.recibo_json.feitos || "",
              proximos_passos: data.recibo_json.proximos_passos || "",
              publicarNoMural: false,
              muralCelulaId: data.celula_id || "",
            });
          } else {
            // Set default mural cell from activity
            setReciboForm((f) => ({ ...f, muralCelulaId: data.celula_id || "" }));
          }
        }
      } catch (error) {
        console.error("Error loading atividade:", error);
        toast({ title: "Erro ao carregar atividade", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // Set default city from profile
  useEffect(() => {
    if (!isEditing && profile?.city && !form.cidade) {
      setForm((f) => ({ ...f, cidade: profile.city || "" }));
    }
  }, [profile, isEditing]);

  // Validate scope before saving
  const validateScope = (): boolean => {
    if (isAdmin) return true;

    if (scope.type === "cidade" && form.cidade !== scope.cidade) {
      toast({
        title: "Fora do escopo",
        description: "Você não pode criar atividades para outra cidade.",
        variant: "destructive",
      });
      return false;
    }

    if (scope.type === "celula" && form.celula_id !== scope.cellId) {
      toast({
        title: "Fora do escopo",
        description: "Você não pode criar atividades para outra célula.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    if (!form.inicio_em) {
      toast({ title: "Data/hora de início obrigatória", variant: "destructive" });
      return;
    }
    if (!validateScope()) return;

    try {
      const data = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        inicio_em: new Date(form.inicio_em).toISOString(),
        fim_em: form.fim_em ? new Date(form.fim_em).toISOString() : null,
        local_texto: form.local_texto.trim() || null,
        descricao: form.descricao.trim() || null,
        cidade: form.cidade || null,
        celula_id: form.celula_id || null,
        ciclo_id: form.vincular_ciclo && form.ciclo_id ? form.ciclo_id : null,
        responsavel_user_id: form.responsavel_user_id || null,
      };

      if (isEditing && id) {
        await update({ id, ...data });
      } else {
        await create(data);
      }
      navigate("/admin/agenda");
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    await changeStatus({ id, status: "publicada" });
    setAtividade((a) => a ? { ...a, status: "publicada" } : null);
  };

  const handleCancel = async () => {
    if (!id) return;
    await changeStatus({ id, status: "cancelada" });
    setAtividade((a) => a ? { ...a, status: "cancelada" } : null);
  };

  const handleComplete = async () => {
    if (!id) return;
    await changeStatus({ id, status: "concluida" });
    // Also save the receipt and set concluida_em/concluida_por
    await update({
      id,
      concluida_em: new Date().toISOString(),
      concluida_por: user?.id,
    } as any);
    setAtividade((a) => a ? { ...a, status: "concluida", concluida_em: new Date().toISOString(), concluida_por: user?.id || null } : null);
  };

  const handleSaveRecibo = async () => {
    if (!id || !user || !atividade) return;
    setIsSavingRecibo(true);
    try {
      const reciboData: ReciboAtividade = {
        resumo: reciboForm.resumo.trim(),
        feitos: reciboForm.feitos.trim(),
        proximos_passos: reciboForm.proximos_passos.trim(),
        publico: true,
      };
      await update({
        id,
        recibo_json: reciboData,
        concluida_em: atividade?.concluida_em || new Date().toISOString(),
        concluida_por: atividade?.concluida_por || user.id,
      } as any);
      setAtividade((a) => a ? { ...a, recibo_json: reciboData } : null);
      
      // Publish to mural if toggled on
      if (reciboForm.publicarNoMural && reciboForm.muralCelulaId) {
        await upsertReciboAtividade({
          cellId: reciboForm.muralCelulaId,
          atividadeId: id,
          cicloId: atividade.ciclo_id,
          titulo: atividade.titulo,
          resumo: reciboForm.resumo.trim(),
          feitos: reciboForm.feitos.trim(),
          proximos_passos: reciboForm.proximos_passos.trim(),
        });
      } else {
        toast({ title: "Recibo salvo com sucesso!" });
      }
    } catch (error) {
      console.error("Error saving recibo:", error);
      toast({ title: "Erro ao salvar recibo", variant: "destructive" });
    } finally {
      setIsSavingRecibo(false);
    }
  };

  // Get cells the user can manage for mural publication
  const getManagedCells = () => {
    if (isAdmin) return cells;
    if (scope.type === "celula" && scope.cellId) {
      return cells.filter((c) => c.id === scope.cellId);
    }
    if (scope.type === "cidade" && scope.cidade) {
      return cells.filter((c) => c.city === scope.cidade);
    }
    return [];
  };
  const managedCells = getManagedCells();

  const handleDelete = async () => {
    if (!id) return;
    await deleteAtividade(id);
    navigate("/admin/agenda");
  };

  if (isLoading) {
    return <AppShell><div className="p-6">Carregando...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-2xl">
        <RoleScopeBanner />

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agenda")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {isEditing ? "Editar Atividade" : "Nova Atividade"}
            </h1>
            {atividade && (
              <Badge className="mt-1">{ATIVIDADE_STATUS_LABELS[atividade.status]}</Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            {isEditing && <TabsTrigger value="presencas">Presenças</TabsTrigger>}
            {isEditing && atividade?.status === "concluida" && (
              <TabsTrigger value="recibo">Recibo</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dados" className="space-y-6 mt-4">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Reunião da Célula Centro"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as AtividadeTipo }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ATIVIDADE_TIPO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                    placeholder="Ex: São Paulo"
                    disabled={scope.type === "cidade"}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="celula">Célula (opcional)</Label>
                <Select value={form.celula_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, celula_id: v === "none" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (toda a cidade)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (toda a cidade)</SelectItem>
                    {cells.filter(c => !form.cidade || c.city === form.cidade).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inicio_em">Início *</Label>
                  <Input
                    id="inicio_em"
                    type="datetime-local"
                    value={form.inicio_em}
                    onChange={(e) => setForm((f) => ({ ...f, inicio_em: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fim_em">Fim (opcional)</Label>
                  <Input
                    id="fim_em"
                    type="datetime-local"
                    value={form.fim_em}
                    onChange={(e) => setForm((f) => ({ ...f, fim_em: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="local_texto">Local</Label>
                <Input
                  id="local_texto"
                  value={form.local_texto}
                  onChange={(e) => setForm((f) => ({ ...f, local_texto: e.target.value }))}
                  placeholder="Ex: Praça da Sé, Centro"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Detalhes da atividade..."
                  rows={4}
                />
              </div>

              {/* Cycle link */}
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <p className="font-medium">Vincular ao ciclo semanal</p>
                  <p className="text-sm text-muted-foreground">
                    {activeCycle ? `Ciclo ativo: ${activeCycle.titulo}` : "Sem ciclo ativo"}
                  </p>
                </div>
                <Switch
                  checked={form.vincular_ciclo}
                  onCheckedChange={(checked) => {
                    setForm((f) => ({
                      ...f,
                      vincular_ciclo: checked,
                      ciclo_id: checked && activeCycle ? activeCycle.id : "",
                    }));
                  }}
                  disabled={!activeCycle && !form.ciclo_id}
                />
              </div>

              {form.vincular_ciclo && (
                <div>
                  <Label>Ciclo</Label>
                  <Select value={form.ciclo_id} onValueChange={(v) => setForm((f) => ({ ...f, ciclo_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ciclo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ciclos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.titulo} {c.status === "ativo" && "(ativo)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap pt-4 border-t">
              <Button onClick={handleSave} disabled={isCreating || isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>

              {isEditing && atividade?.status === "rascunho" && (
                <Button variant="secondary" onClick={handlePublish}>
                  <Send className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              )}

              {isEditing && atividade?.status === "publicada" && (
                <>
                  <Button variant="outline" onClick={handleComplete}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar atividade?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Os voluntários que confirmaram presença serão notificados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel}>Cancelar Atividade</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              {isEditing && isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive ml-auto">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </TabsContent>

          {isEditing && (
            <TabsContent value="presencas" className="mt-4">
              <RsvpList atividadeId={id!} />
            </TabsContent>
          )}

          {isEditing && atividade?.status === "concluida" && (
            <TabsContent value="recibo" className="mt-4 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Recibo da Atividade</h2>
                {atividade.recibo_json && (
                  <Badge variant="secondary" className="ml-auto">Salvo</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="recibo_resumo">Resumo</Label>
                  <Textarea
                    id="recibo_resumo"
                    value={reciboForm.resumo}
                    onChange={(e) => setReciboForm((f) => ({ ...f, resumo: e.target.value }))}
                    placeholder="Breve resumo da atividade (1-3 linhas)"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="recibo_feitos">O que foi feito</Label>
                  <Textarea
                    id="recibo_feitos"
                    value={reciboForm.feitos}
                    onChange={(e) => setReciboForm((f) => ({ ...f, feitos: e.target.value }))}
                    placeholder="• Item 1&#10;• Item 2&#10;• Item 3"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="recibo_proximos">Próximos passos</Label>
                  <Textarea
                    id="recibo_proximos"
                    value={reciboForm.proximos_passos}
                    onChange={(e) => setReciboForm((f) => ({ ...f, proximos_passos: e.target.value }))}
                    placeholder="• Encaminhamento 1&#10;• Encaminhamento 2"
                    rows={3}
                  />
                </div>

                {/* Publicar no Mural toggle */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Publicar no Mural da Célula</span>
                    </div>
                    <Switch
                      checked={reciboForm.publicarNoMural}
                      onCheckedChange={(checked) =>
                        setReciboForm((f) => ({ ...f, publicarNoMural: checked }))
                      }
                      disabled={managedCells.length === 0}
                    />
                  </div>
                  
                  {reciboForm.publicarNoMural && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Célula destino</Label>
                      <Select
                        value={reciboForm.muralCelulaId || ""}
                        onValueChange={(v) => setReciboForm((f) => ({ ...f, muralCelulaId: v }))}
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
                      <p className="text-xs text-muted-foreground mt-1">
                        O recibo será visível no mural para membros desta célula.
                      </p>
                    </div>
                  )}

                  {managedCells.length === 0 && (
                    <p className="text-xs text-destructive">
                      Não há células no seu escopo para publicar.
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleSaveRecibo} 
                  disabled={isSavingRecibo || isUpsertingAtividade || (reciboForm.publicarNoMural && !reciboForm.muralCelulaId)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingRecibo || isUpsertingAtividade ? "Salvando..." : "Salvar Recibo"}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}

function RsvpList({ atividadeId }: { atividadeId: string }) {
  const { allRsvps, isLoadingAllRsvps } = useAtividadeRsvp(atividadeId);

  if (isLoadingAllRsvps) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (allRsvps.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhuma confirmação de presença ainda.</p>
      </div>
    );
  }

  const grouped = {
    vou: allRsvps.filter((r) => r.status === "vou"),
    talvez: allRsvps.filter((r) => r.status === "talvez"),
    nao_vou: allRsvps.filter((r) => r.status === "nao_vou"),
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm">
        <span className="text-green-600 font-medium">✓ Vou: {grouped.vou.length}</span>
        <span className="text-yellow-600 font-medium">? Talvez: {grouped.talvez.length}</span>
        <span className="text-muted-foreground">✗ Não vou: {grouped.nao_vou.length}</span>
      </div>

      {grouped.vou.length > 0 && (
        <div>
          <h3 className="font-bold text-sm text-green-600 mb-2">Confirmados ({grouped.vou.length})</h3>
          <div className="space-y-1">
            {grouped.vou.map((r) => (
              <div key={r.id} className="text-sm py-1 border-b">
                {r.user?.nickname || r.user?.full_name || "Voluntário"}
              </div>
            ))}
          </div>
        </div>
      )}

      {grouped.talvez.length > 0 && (
        <div>
          <h3 className="font-bold text-sm text-yellow-600 mb-2">Talvez ({grouped.talvez.length})</h3>
          <div className="space-y-1">
            {grouped.talvez.map((r) => (
              <div key={r.id} className="text-sm py-1 border-b">
                {r.user?.nickname || r.user?.full_name || "Voluntário"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

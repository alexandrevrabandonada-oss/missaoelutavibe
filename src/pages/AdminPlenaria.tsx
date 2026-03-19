import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAdminPlenarias } from "@/hooks/usePlenarias";
import { useCiclos } from "@/hooks/useCiclos";
import { useCells } from "@/hooks/useCells";
import { useMySquads } from "@/hooks/useSquads";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Plus,
  Vote,
  Clock,
  CheckCircle2,
  Users,
  MessageCircle,
  X,
  ListChecks,
  Target,
  Briefcase,
} from "lucide-react";
import { format, isPast, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function AdminPlenaria() {
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  
  const { plenarias, isLoading, createPlenaria, isCreating, closePlenaria, isClosing, createAsTask, createAsMission } = useAdminPlenarias();
  const { ciclos } = useCiclos();
  const { cells } = useCells();
  const { squads } = useMySquads();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState<any>(null);
  const [showEncDialog, setShowEncDialog] = useState<any>(null);

  // Create form state
  const [form, setForm] = useState({
    scope_tipo: "celula" as "celula" | "cidade",
    scope_id: "",
    ciclo_id: "",
    titulo: "",
    resumo: "",
    encerra_em: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
    opcoes: ["", ""],
  });

  // Close form state
  const [closeForm, setCloseForm] = useState({
    publishToMural: true,
    encaminhamentos: [] as { titulo: string; descricao: string; kind: string }[],
    newEnc: { titulo: "", descricao: "", kind: "tarefa_squad" },
  });

  if (rolesLoading || isLoading) {
    return <FullPageLoader text="Carregando plenárias..." />;
  }

  if (!isCoordinator()) {
    navigate("/voluntario/hoje");
    return null;
  }

  const abertas = plenarias.filter((p: any) => p.status === "aberta");
  const encerradas = plenarias.filter((p: any) => p.status === "encerrada");

  const handleCreate = () => {
    const validOpcoes = form.opcoes.filter((o) => o.trim());
    if (!form.titulo || !form.scope_id || validOpcoes.length < 2) return;

    createPlenaria({
      scope_tipo: form.scope_tipo,
      scope_id: form.scope_id,
      ciclo_id: form.ciclo_id || undefined,
      titulo: form.titulo,
      resumo: form.resumo || undefined,
      encerra_em: form.encerra_em,
      opcoes: validOpcoes,
    });

    setShowCreateDialog(false);
    setForm({
      scope_tipo: "celula",
      scope_id: "",
      ciclo_id: "",
      titulo: "",
      resumo: "",
      encerra_em: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
      opcoes: ["", ""],
    });
  };

  const handleClose = () => {
    if (!showCloseDialog) return;
    closePlenaria({
      plenariaId: showCloseDialog.id,
      publishToMural: closeForm.publishToMural,
      encaminhamentos: closeForm.encaminhamentos,
    });
    setShowCloseDialog(null);
    setCloseForm({
      publishToMural: true,
      encaminhamentos: [],
      newEnc: { titulo: "", descricao: "", kind: "tarefa_squad" },
    });
  };

  const addEncaminhamento = () => {
    if (!closeForm.newEnc.titulo.trim()) return;
    setCloseForm((prev) => ({
      ...prev,
      encaminhamentos: [...prev.encaminhamentos, { ...prev.newEnc }],
      newEnc: { titulo: "", descricao: "", kind: "tarefa_squad" },
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          {/* Title */}
          <div className="flex items-center gap-2 text-primary">
            <Vote className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Plenárias</span>
          </div>

          <Tabs defaultValue="abertas">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="abertas">
                Abertas ({abertas.length})
              </TabsTrigger>
              <TabsTrigger value="encerradas">
                Encerradas ({encerradas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="abertas" className="space-y-3 mt-4">
              {abertas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma plenária aberta
                </p>
              ) : (
                abertas.map((p: any) => (
                  <PlenariaAdminCard
                    key={p.id}
                    plenaria={p}
                    onClose={() => setShowCloseDialog(p)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="encerradas" className="space-y-3 mt-4">
              {encerradas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma plenária encerrada
                </p>
              ) : (
                encerradas.map((p: any) => (
                  <PlenariaAdminCard
                    key={p.id}
                    plenaria={p}
                    onViewEnc={(enc: any) => setShowEncDialog({ plenaria: p, enc })}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Plenária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Escopo</Label>
              <Select value={form.scope_tipo} onValueChange={(v: any) => setForm((f) => ({ ...f, scope_tipo: v, scope_id: "" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celula">Célula</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{form.scope_tipo === "celula" ? "Célula" : "Cidade"}</Label>
              {form.scope_tipo === "celula" ? (
                <Select value={form.scope_id} onValueChange={(v) => setForm((f) => ({ ...f, scope_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cells.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nome da cidade"
                  value={form.scope_id}
                  onChange={(e) => setForm((f) => ({ ...f, scope_id: e.target.value }))}
                />
              )}
            </div>

            <div>
              <Label>Ciclo (opcional)</Label>
              <Select value={form.ciclo_id} onValueChange={(v) => setForm((f) => ({ ...f, ciclo_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {ciclos.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Qual o tema da plenária?"
              />
            </div>

            <div>
              <Label>Resumo (opcional)</Label>
              <Textarea
                value={form.resumo}
                onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
                placeholder="Contexto e detalhes..."
                rows={3}
              />
            </div>

            <div>
              <Label>Encerra em</Label>
              <Input
                type="datetime-local"
                value={form.encerra_em}
                onChange={(e) => setForm((f) => ({ ...f, encerra_em: e.target.value }))}
              />
            </div>

            <div>
              <Label>Opções de voto (mín. 2)</Label>
              <div className="space-y-2">
                {form.opcoes.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...form.opcoes];
                        newOpts[idx] = e.target.value;
                        setForm((f) => ({ ...f, opcoes: newOpts }));
                      }}
                      placeholder={`Opção ${idx + 1}`}
                    />
                    {form.opcoes.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setForm((f) => ({ ...f, opcoes: f.opcoes.filter((_, i) => i !== idx) }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, opcoes: [...f.opcoes, ""] }))}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar opção
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Criando..." : "Criar Plenária"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={!!showCloseDialog} onOpenChange={() => setShowCloseDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Encerrar Plenária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao encerrar, o resultado será computado e os encaminhamentos poderão ser criados.
            </p>

            <div className="flex items-center justify-between">
              <Label>Publicar recibo no Mural</Label>
              <Switch
                checked={closeForm.publishToMural}
                onCheckedChange={(v) => setCloseForm((f) => ({ ...f, publishToMural: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Encaminhamentos</Label>
              {closeForm.encaminhamentos.map((enc, idx) => (
                <div key={idx} className="p-2 border rounded-md flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{enc.titulo}</p>
                    <Badge variant="outline" className="text-xs">{enc.kind}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCloseForm((f) => ({
                      ...f,
                      encaminhamentos: f.encaminhamentos.filter((_, i) => i !== idx),
                    }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="space-y-2 p-3 border rounded-md">
                <Input
                  placeholder="Título do encaminhamento"
                  value={closeForm.newEnc.titulo}
                  onChange={(e) => setCloseForm((f) => ({
                    ...f,
                    newEnc: { ...f.newEnc, titulo: e.target.value },
                  }))}
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={closeForm.newEnc.descricao}
                  onChange={(e) => setCloseForm((f) => ({
                    ...f,
                    newEnc: { ...f.newEnc, descricao: e.target.value },
                  }))}
                  rows={2}
                />
                <Select
                  value={closeForm.newEnc.kind}
                  onValueChange={(v) => setCloseForm((f) => ({
                    ...f,
                    newEnc: { ...f.newEnc, kind: v },
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarefa_squad">Tarefa de Squad</SelectItem>
                    <SelectItem value="missao_replicavel">Missão Replicável</SelectItem>
                    <SelectItem value="plano_semana">Plano da Semana</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={addEncaminhamento}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleClose} disabled={isClosing}>
              {isClosing ? "Encerrando..." : "Encerrar Plenária"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encaminhamento Action Dialog */}
      <Dialog open={!!showEncDialog} onOpenChange={() => setShowEncDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar a partir do Encaminhamento</DialogTitle>
          </DialogHeader>
          {showEncDialog && (
            <div className="space-y-4">
              <div className="p-3 border rounded-md">
                <p className="font-medium">{showEncDialog.enc.titulo}</p>
                {showEncDialog.enc.descricao && (
                  <p className="text-sm text-muted-foreground mt-1">{showEncDialog.enc.descricao}</p>
                )}
              </div>

              {showEncDialog.enc.status === "criado" ? (
                <p className="text-center text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Já criado
                </p>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      // For simplicity, create task in first squad
                      if (squads.length > 0) {
                        createAsTask({
                          encaminhamentoId: showEncDialog.enc.id,
                          squadId: squads[0].id,
                        });
                        setShowEncDialog(null);
                      }
                    }}
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Criar como Tarefa de Squad
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      createAsMission({ encaminhamentoId: showEncDialog.enc.id });
                      setShowEncDialog(null);
                    }}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Criar como Missão Replicável
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlenariaAdminCard({ plenaria, onClose, onViewEnc }: { plenaria: any; onClose?: () => void; onViewEnc?: (enc: any) => void }) {
  const isOpen = plenaria.status === "aberta";
  const totalVotos = plenaria.plenaria_votos?.length || 0;
  const totalComentarios = plenaria.plenaria_comentarios?.length || 0;
  const encaminhamentos = plenaria.plenaria_encaminhamentos || [];

  return (
    <div className="card-luta">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isOpen ? "default" : "secondary"} className="text-xs">
              {isOpen ? "Aberta" : "Encerrada"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {plenaria.scope_tipo === "celula" ? "Célula" : "Cidade"}
            </Badge>
          </div>
          <h3 className="font-bold">{plenaria.titulo}</h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalVotos} votos
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {totalComentarios} comentários
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(plenaria.encerra_em), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
        {isOpen && onClose && (
          <Button size="sm" variant="destructive" onClick={onClose}>
            Encerrar
          </Button>
        )}
      </div>

      {/* Encaminhamentos for closed */}
      {!isOpen && encaminhamentos.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            Encaminhamentos
          </p>
          {encaminhamentos.map((enc: any) => (
            <button
              key={enc.id}
              className="w-full text-left p-2 rounded-md border hover:border-primary/50 flex items-center justify-between"
              onClick={() => onViewEnc?.(enc)}
            >
              <div>
                <p className="text-sm font-medium">{enc.titulo}</p>
                <Badge variant={enc.status === "criado" ? "default" : "outline"} className="text-xs mt-1">
                  {enc.kind === "tarefa_squad" ? "Tarefa" : enc.kind === "missao_replicavel" ? "Missão" : "Plano"}
                  {enc.status === "criado" && " ✓"}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

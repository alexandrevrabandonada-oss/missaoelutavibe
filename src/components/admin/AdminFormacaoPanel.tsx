import { useState } from "react";
import { useFormacao, Curso, CursoNivel, ConteudoStatus, getNivelLabel, useCursoDetalhe, useAulasAdmin, useQuizAdmin, useAulaDetalhe } from "@/hooks/useFormacao";
import { useMateriais } from "@/hooks/useMateriais";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  GraduationCap,
  FileText,
  HelpCircle,
  ArrowLeft,
  Link2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminFormacaoPanel() {
  const [activeView, setActiveView] = useState<"list" | "curso" | "aula">("list");
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);
  const [selectedAulaId, setSelectedAulaId] = useState<string | null>(null);

  const handleOpenCurso = (cursoId: string) => {
    setSelectedCursoId(cursoId);
    setActiveView("curso");
  };

  const handleOpenAula = (aulaId: string) => {
    setSelectedAulaId(aulaId);
    setActiveView("aula");
  };

  const handleBack = () => {
    if (activeView === "aula") {
      setActiveView("curso");
      setSelectedAulaId(null);
    } else {
      setActiveView("list");
      setSelectedCursoId(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {activeView === "list" && (
        <CursosListView onOpenCurso={handleOpenCurso} />
      )}
      {activeView === "curso" && selectedCursoId && (
        <CursoDetailView 
          cursoId={selectedCursoId} 
          onBack={handleBack}
          onOpenAula={handleOpenAula}
        />
      )}
      {activeView === "aula" && selectedAulaId && (
        <AulaDetailView
          aulaId={selectedAulaId}
          cursoId={selectedCursoId!}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

// Cursos List View
function CursosListView({ onOpenCurso }: { onOpenCurso: (id: string) => void }) {
  const { cursos, cursosLoading, createCurso, updateCurso, deleteCurso } = useFormacao();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);

  const handleSave = async (data: Partial<Curso>) => {
    if (editingCurso) {
      await updateCurso.mutateAsync({ id: editingCurso.id, ...data });
    } else {
      await createCurso.mutateAsync(data as Omit<Curso, "id" | "created_at" | "updated_at">);
    }
    setIsDialogOpen(false);
    setEditingCurso(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este curso? Todas as aulas e quizzes serão removidos.")) {
      await deleteCurso.mutateAsync(id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Formação</span>
          </div>
          <h2 className="text-2xl font-black">Gerenciar Cursos</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCurso(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCurso ? "Editar Curso" : "Novo Curso"}</DialogTitle>
            </DialogHeader>
            <CursoForm
              curso={editingCurso}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
              isPending={createCurso.isPending || updateCurso.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {cursosLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : cursos.length === 0 ? (
        <div className="card-luta text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum curso criado ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cursos.map((curso) => (
            <div key={curso.id} className="card-luta">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={curso.status === "PUBLICADO" ? "default" : "secondary"}>
                      {curso.status}
                    </Badge>
                    <Badge variant="outline">{getNivelLabel(curso.nivel)}</Badge>
                  </div>
                  <h3 className="font-bold text-lg">{curso.titulo}</h3>
                  {curso.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{curso.descricao}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onOpenCurso(curso.id)}>
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingCurso(curso);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(curso.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Curso Form
function CursoForm({
  curso,
  onSave,
  onCancel,
  isPending,
}: {
  curso: Curso | null;
  onSave: (data: Partial<Curso>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [titulo, setTitulo] = useState(curso?.titulo || "");
  const [descricao, setDescricao] = useState(curso?.descricao || "");
  const [tagsStr, setTagsStr] = useState(curso?.tags?.join(", ") || "");
  const [nivel, setNivel] = useState<CursoNivel>(curso?.nivel || "INTRO");
  const [status, setStatus] = useState<ConteudoStatus>(curso?.status || "RASCUNHO");

  const handleSubmit = () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ titulo, descricao, tags, nivel, status });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Título *</Label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
      </div>
      <div>
        <Label>Tags (separadas por vírgula)</Label>
        <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="comunicação, rua, dados" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nível</Label>
          <Select value={nivel} onValueChange={(v) => setNivel(v as CursoNivel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTRO">Introdutório</SelectItem>
              <SelectItem value="BASICO">Básico</SelectItem>
              <SelectItem value="INTERMEDIARIO">Intermediário</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ConteudoStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RASCUNHO">Rascunho</SelectItem>
              <SelectItem value="PUBLICADO">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Curso Detail View (Aulas Management)
function CursoDetailView({
  cursoId,
  onBack,
  onOpenAula,
}: {
  cursoId: string;
  onBack: () => void;
  onOpenAula: (id: string) => void;
}) {
  const { curso, aulas, isLoading } = useCursoDetalhe(cursoId);
  const { createAula, updateAula, deleteAula } = useAulasAdmin(cursoId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<any>(null);

  const handleSaveAula = async (data: any) => {
    if (editingAula) {
      await updateAula.mutateAsync({ id: editingAula.id, ...data });
    } else {
      await createAula.mutateAsync({ ...data, curso_id: cursoId });
    }
    setIsDialogOpen(false);
    setEditingAula(null);
  };

  const handleDeleteAula = async (id: string) => {
    if (confirm("Excluir esta aula?")) {
      await deleteAula.mutateAsync(id);
    }
  };

  if (isLoading) return <p>Carregando...</p>;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Curso</p>
          <h2 className="text-xl font-bold">{curso?.titulo}</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAula(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Aula
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAula ? "Editar Aula" : "Nova Aula"}</DialogTitle>
            </DialogHeader>
            <AulaForm
              aula={editingAula}
              nextOrdem={aulas.length}
              onSave={handleSaveAula}
              onCancel={() => setIsDialogOpen(false)}
              isPending={createAula.isPending || updateAula.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {aulas.length === 0 ? (
        <div className="card-luta text-center py-8">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma aula criada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aulas.map((aula, idx) => (
            <div key={aula.id} className="card-luta">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-muted-foreground w-8">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={aula.status === "PUBLICADO" ? "default" : "secondary"}>
                      {aula.status}
                    </Badge>
                  </div>
                  <h3 className="font-bold">{aula.titulo}</h3>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onOpenAula(aula.id)}>
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingAula(aula);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteAula(aula.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Aula Form
function AulaForm({
  aula,
  nextOrdem,
  onSave,
  onCancel,
  isPending,
}: {
  aula: any;
  nextOrdem: number;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [titulo, setTitulo] = useState(aula?.titulo || "");
  const [conteudo, setConteudo] = useState(aula?.conteudo_texto || "");
  const [ordem, setOrdem] = useState(aula?.ordem ?? nextOrdem);
  const [status, setStatus] = useState<ConteudoStatus>(aula?.status || "RASCUNHO");

  const handleSubmit = () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    onSave({ titulo, conteudo_texto: conteudo, ordem, status });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Título *</Label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div>
        <Label>Conteúdo</Label>
        <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={8} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ordem</Label>
          <Input type="number" value={ordem} onChange={(e) => setOrdem(parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ConteudoStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RASCUNHO">Rascunho</SelectItem>
              <SelectItem value="PUBLICADO">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Aula Detail View (Quiz + Materials)
function AulaDetailView({
  aulaId,
  cursoId,
  onBack,
}: {
  aulaId: string;
  cursoId: string;
  onBack: () => void;
}) {
  const { aula, materiais, perguntas, isLoading } = useAulaDetalhe(aulaId);
  const { linkMaterial, unlinkMaterial } = useAulasAdmin(cursoId);
  const { createPergunta, deletePergunta } = useQuizAdmin(aulaId);
  const { materiais: allMateriais } = useMateriais();
  
  const [activeTab, setActiveTab] = useState("materiais");
  const [isPerguntaDialogOpen, setIsPerguntaDialogOpen] = useState(false);

  const linkedMaterialIds = materiais.map((m) => m.material_id);
  const availableMateriais = allMateriais.filter(
    (m) => m.status === "aprovado" && !linkedMaterialIds.includes(m.id)
  );

  const handleLinkMaterial = async (materialId: string) => {
    await linkMaterial.mutateAsync({ aulaId, materialId });
  };

  const handleUnlinkMaterial = async (id: string) => {
    await unlinkMaterial.mutateAsync(id);
  };

  const handleCreatePergunta = async (data: any) => {
    await createPergunta.mutateAsync(data);
    setIsPerguntaDialogOpen(false);
  };

  const handleDeletePergunta = async (id: string) => {
    if (confirm("Excluir esta pergunta?")) {
      await deletePergunta.mutateAsync(id);
    }
  };

  if (isLoading) return <p>Carregando...</p>;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Aula</p>
          <h2 className="text-xl font-bold">{aula?.titulo}</h2>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="materiais" className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Materiais ({materiais.length})
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex-1">
            <HelpCircle className="h-4 w-4 mr-2" />
            Quiz ({perguntas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materiais" className="mt-4 space-y-4">
          {/* Linked Materials */}
          <div>
            <h3 className="font-bold mb-2">Materiais Vinculados</h3>
            {materiais.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material vinculado</p>
            ) : (
              <div className="space-y-2">
                {materiais.map((am) => (
                  <div key={am.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">{am.material?.titulo}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleUnlinkMaterial(am.id)}>
                      <Unlink className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Materials */}
          <div>
            <h3 className="font-bold mb-2">Vincular Material</h3>
            {availableMateriais.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material disponível</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableMateriais.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1 text-sm">{m.titulo}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleLinkMaterial(m.id)}>
                      <Link2 className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Perguntas do Quiz</h3>
            <Dialog open={isPerguntaDialogOpen} onOpenChange={setIsPerguntaDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Pergunta</DialogTitle>
                </DialogHeader>
                <PerguntaForm
                  onSave={handleCreatePergunta}
                  onCancel={() => setIsPerguntaDialogOpen(false)}
                  isPending={createPergunta.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {perguntas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pergunta criada</p>
          ) : (
            <div className="space-y-3">
              {perguntas.map((p, idx) => (
                <div key={p.id} className="card-luta">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-muted-foreground">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium">{p.enunciado}</p>
                      <div className="mt-2 space-y-1">
                        {p.opcoes?.map((o) => (
                          <div key={o.id} className="flex items-center gap-2 text-sm">
                            <span className={o.correta ? "text-green-600 font-bold" : "text-muted-foreground"}>
                              {o.correta ? "✓" : "○"}
                            </span>
                            <span>{o.texto}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePergunta(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

// Pergunta Form
function PerguntaForm({
  onSave,
  onCancel,
  isPending,
}: {
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [enunciado, setEnunciado] = useState("");
  const [explicacao, setExplicacao] = useState("");
  const [opcoes, setOpcoes] = useState([
    { texto: "", correta: true },
    { texto: "", correta: false },
    { texto: "", correta: false },
    { texto: "", correta: false },
  ]);

  const handleOpcaoChange = (idx: number, texto: string) => {
    const newOpcoes = [...opcoes];
    newOpcoes[idx].texto = texto;
    setOpcoes(newOpcoes);
  };

  const handleCorretaChange = (idx: number) => {
    const newOpcoes = opcoes.map((o, i) => ({ ...o, correta: i === idx }));
    setOpcoes(newOpcoes);
  };

  const handleSubmit = () => {
    if (!enunciado.trim()) {
      toast.error("Enunciado é obrigatório");
      return;
    }
    const validOpcoes = opcoes.filter((o) => o.texto.trim());
    if (validOpcoes.length < 2) {
      toast.error("Mínimo de 2 opções");
      return;
    }
    if (!validOpcoes.some((o) => o.correta)) {
      toast.error("Marque a opção correta");
      return;
    }
    onSave({ enunciado, explicacao, opcoes: validOpcoes });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Enunciado *</Label>
        <Textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={2} />
      </div>
      <div>
        <Label>Explicação (opcional)</Label>
        <Input value={explicacao} onChange={(e) => setExplicacao(e.target.value)} placeholder="Mostrada após responder" />
      </div>
      <div>
        <Label>Opções (marque a correta)</Label>
        <div className="space-y-2 mt-2">
          {opcoes.map((o, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correta"
                checked={o.correta}
                onChange={() => handleCorretaChange(idx)}
                className="h-4 w-4"
              />
              <Input
                value={o.texto}
                onChange={(e) => handleOpcaoChange(idx, e.target.value)}
                placeholder={`Opção ${idx + 1}`}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

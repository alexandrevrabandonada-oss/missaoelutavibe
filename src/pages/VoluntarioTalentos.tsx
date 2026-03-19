import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import {
  useChamadosAbertos,
  useMyCandidaturas,
  AVAILABLE_SKILLS,
  CHAMADO_URGENCIA_LABELS,
  CHAMADO_STATUS_LABELS,
} from "@/hooks/useTalentos";
import { useCells } from "@/hooks/useCells";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  HandHeart,
  CheckCircle,
  Clock,
  Briefcase,
  MapPin,
} from "lucide-react";

export default function VoluntarioTalentos() {
  const navigate = useNavigate();
  const { hasAccess, isLoading: isAuthLoading } = useRequireApproval();
  const [skillFilter, setSkillFilter] = useState<string>("");
  const { chamados, isLoading: isChamadosLoading } = useChamadosAbertos({
    skill: skillFilter || undefined,
  });
  const {
    candidaturas,
    isLoading: isCandidaturasLoading,
    candidatar,
    isCandidatando,
    cancelar,
    hasCandidatura,
  } = useMyCandidaturas();
  const { cells } = useCells();

  const [showCandidaturaDialog, setShowCandidaturaDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  if (isAuthLoading || isChamadosLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return null;
  }

  const handleCandidatar = async () => {
    if (!selectedChamado) return;
    try {
      await candidatar({ chamadoId: selectedChamado, mensagem: mensagem || undefined });
      toast.success("Candidatura enviada!");
      setShowCandidaturaDialog(false);
      setSelectedChamado(null);
      setMensagem("");
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Você já se candidatou a este chamado");
      } else {
        toast.error("Erro ao candidatar");
      }
    }
  };

  const handleCancelar = async (candidaturaId: string) => {
    try {
      await cancelar(candidaturaId);
      toast.success("Candidatura cancelada");
    } catch (error) {
      toast.error("Erro ao cancelar");
    }
  };

  const openCandidatura = (chamadoId: string) => {
    setSelectedChamado(chamadoId);
    setMensagem("");
    setShowCandidaturaDialog(true);
  };

  const getSkillLabel = (value: string) => {
    return AVAILABLE_SKILLS.find((s) => s.value === value)?.label ?? value;
  };

  const getCellName = (cellId: string) => {
    return cells?.find((c) => c.id === cellId)?.name ?? "Célula";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <h1 className="text-lg font-semibold flex-1">Banco de Talentos</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <Tabs defaultValue="chamados">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="chamados" className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Chamados
            </TabsTrigger>
            <TabsTrigger value="minhas" className="flex-1">
              <HandHeart className="h-4 w-4 mr-2" />
              Minhas Candidaturas
            </TabsTrigger>
          </TabsList>

          {/* Chamados Tab */}
          <TabsContent value="chamados" className="space-y-4">
            {/* Filter */}
            <Select value={skillFilter || "all"} onValueChange={(v) => setSkillFilter(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por habilidade..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as habilidades</SelectItem>
                {AVAILABLE_SKILLS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Chamados List */}
            {chamados.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum chamado aberto no momento.</p>
                  <p className="text-sm">
                    Volte depois ou cadastre suas habilidades para ser encontrado!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {chamados.map((chamado) => {
                  const jaCandidatou = hasCandidatura(chamado.id);
                  const urgenciaInfo = CHAMADO_URGENCIA_LABELS[chamado.urgencia];

                  return (
                    <Card key={chamado.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {chamado.titulo}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {chamado.escopo_tipo === "celula"
                                ? getCellName(chamado.escopo_id)
                                : chamado.escopo_cidade}
                            </CardDescription>
                          </div>
                          <Badge className={urgenciaInfo.color}>
                            {urgenciaInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {chamado.descricao}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {chamado.skills_requeridas.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {getSkillLabel(skill)}
                            </Badge>
                          ))}
                        </div>
                        {jaCandidatou ? (
                          <Button variant="outline" className="w-full" disabled>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Já se candidatou
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => openCandidatura(chamado.id)}
                          >
                            <HandHeart className="h-4 w-4 mr-2" />
                            Quero Ajudar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Link to Skills */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate("/voluntario/skills")}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Minhas Habilidades</p>
                  <p className="text-sm text-muted-foreground">
                    Cadastre suas habilidades para ser encontrado
                  </p>
                </div>
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Minhas Candidaturas Tab */}
          <TabsContent value="minhas" className="space-y-4">
            {isCandidaturasLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : candidaturas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Você ainda não se candidatou a nenhum chamado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {candidaturas.map((c: any) => {
                  const statusInfo =
                    c.status === "pendente"
                      ? { label: "Pendente", color: "bg-yellow-100 text-yellow-800" }
                      : c.status === "aceito"
                      ? { label: "Aceito", color: "bg-green-100 text-green-800" }
                      : c.status === "recusado"
                      ? { label: "Recusado", color: "bg-red-100 text-red-800" }
                      : { label: "Cancelado", color: "bg-muted text-muted-foreground" };

                  return (
                    <Card key={c.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {c.chamado?.titulo ?? "Chamado"}
                          </CardTitle>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {c.mensagem && (
                          <p className="text-sm text-muted-foreground mb-2">
                            "{c.mensagem}"
                          </p>
                        )}
                        {c.status === "pendente" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelar(c.id)}
                          >
                            Cancelar candidatura
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Candidatura Dialog */}
      <Dialog open={showCandidaturaDialog} onOpenChange={setShowCandidaturaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar-se ao Chamado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Mensagem opcional para a coordenação..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCandidaturaDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCandidatar} disabled={isCandidatando}>
              {isCandidatando ? <LoadingSpinner size="sm" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlenarias, usePlenariaDetail } from "@/hooks/usePlenarias";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TTSButton } from "@/components/a11y/TTSButton";
import { 
  ArrowLeft, 
  Vote, 
  MessageCircle, 
  Clock, 
  CheckCircle2,
  Users,
  Send,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";

export default function VoluntarioPlenariaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { plenaria, comentarios, encaminhamentos, isLoading, addComment, isAddingComment } = usePlenariaDetail(id);
  const { castVote, isVoting } = usePlenarias();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (isLoading) {
    return <FullPageLoader text="Carregando plenária..." />;
  }

  if (!plenaria) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <p className="text-muted-foreground">Plenária não encontrada</p>
          <Button variant="link" onClick={() => navigate("/voluntario/plenaria")}>
            Voltar às plenárias
          </Button>
        </div>
      </AppShell>
    );
  }

  const isOpen = plenaria.status === "aberta";
  const encerraEm = new Date(plenaria.encerra_em);
  const isExpired = isPast(encerraEm);
  const canVote = isOpen && !plenaria.user_voted && !isExpired;
  const canComment = isOpen && !isExpired;
  const totalVotos = plenaria.total_votos || 0;

  const handleVote = () => {
    if (!selectedOption || !id) return;
    castVote({ plenariaId: id, opcaoId: selectedOption });
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    addComment(newComment.trim());
    setNewComment("");
  };

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col bg-background texture-concrete">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/plenaria")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold line-clamp-1">{plenaria.titulo}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={isOpen ? "default" : "secondary"} className="text-xs">
                    {isOpen ? "Aberta" : "Encerrada"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {plenaria.scope_tipo === "celula" ? "Célula" : "Cidade"}
                  </Badge>
                </div>
              </div>
            </div>
            <TTSButton 
              text={`${plenaria.titulo}. ${plenaria.resumo || ""}. Opções: ${plenaria.opcoes?.map((o: any) => o.texto).join(". ") || ""}`}
              variant="iconOnly"
            />
          </div>
        </header>

        <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
          <div className="space-y-6 animate-slide-up">
            {/* Info Section */}
            <div className="card-luta">
              {plenaria.resumo && (
                <p className="text-sm mb-4">{plenaria.resumo}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {totalVotos} votos
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {plenaria.total_comentarios} comentários
                </span>
                {isOpen && (
                  <span className="flex items-center gap-1 text-primary">
                    <Clock className="h-3 w-3" />
                    {isExpired ? "Prazo expirado" : `Encerra ${formatDistanceToNow(encerraEm, { locale: ptBR, addSuffix: true })}`}
                  </span>
                )}
              </div>
              {plenaria.user_voted && (
                <div className="mt-3 p-2 bg-green-500/10 rounded-md flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Você já votou nesta plenária
                </div>
              )}
            </div>

            {/* Voting Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Vote className="h-4 w-4" />
                {canVote ? "Vote na sua opção" : "Resultado"}
              </h2>

              {canVote ? (
                <div className="card-luta space-y-4">
                  <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
                    {plenaria.opcoes?.map((opcao: any) => (
                      <div key={opcao.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
                        <RadioGroupItem value={opcao.id} id={opcao.id} />
                        <Label htmlFor={opcao.id} className="flex-1 cursor-pointer">
                          {opcao.texto}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button
                    className="w-full"
                    disabled={!selectedOption || isVoting}
                    onClick={handleVote}
                  >
                    {isVoting ? "Votando..." : "Confirmar Voto"}
                  </Button>
                </div>
              ) : (
                <div className="card-luta space-y-3">
                  {plenaria.opcoes?.sort((a: any, b: any) => b.votos - a.votos).map((opcao: any) => {
                    const percent = totalVotos > 0 ? Math.round((opcao.votos / totalVotos) * 100) : 0;
                    return (
                      <div key={opcao.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{opcao.texto}</span>
                          <span className="font-bold">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                        <p className="text-xs text-muted-foreground">{opcao.votos} votos</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Encaminhamentos (if closed) */}
            {!isOpen && encaminhamentos.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Encaminhamentos
                </h2>
                <div className="space-y-2">
                  {encaminhamentos.map((enc, idx) => (
                    <div key={enc.id} className="card-luta flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{enc.titulo}</p>
                        {enc.descricao && (
                          <p className="text-xs text-muted-foreground mt-1">{enc.descricao}</p>
                        )}
                        <Badge variant="outline" className="text-xs mt-2">
                          {enc.kind === "tarefa_squad" ? "Tarefa" : enc.kind === "missao_replicavel" ? "Missão" : "Plano"}
                          {enc.status === "criado" && " ✓"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comentários ({comentarios.length})
              </h2>

              {canComment && (
                <div className="card-luta space-y-3">
                  <Textarea
                    placeholder="Compartilhe sua opinião..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    disabled={!newComment.trim() || isAddingComment}
                    onClick={handleComment}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {isAddingComment ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              )}

              {comentarios.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum comentário ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {comentarios.map((comentario) => (
                    <div key={comentario.id} className="card-luta">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comentario.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comentario.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{comentario.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}

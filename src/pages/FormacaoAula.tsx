import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useAulaDetalhe, QuizPergunta } from "@/hooks/useFormacao";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  FileText,
  Copy,
  ExternalLink,
  HelpCircle,
  Trophy,
  RefreshCw,
} from "lucide-react";

export default function FormacaoAula() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const {
    aula,
    materiais,
    perguntas,
    tentativaAprovada,
    isCompleted,
    submitQuiz,
    isLoading,
  } = useAulaDetalhe(id);

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ nota: number; aprovado: boolean } | null>(null);

  if (authLoading || isLoading) {
    return <FullPageLoader text="Carregando aula..." />;
  }

  if (!hasAccess) {
    return null;
  }

  if (!aula) {
    return (
      <div className="min-h-screen bg-background texture-concrete p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Aula não encontrada</h2>
          <Button onClick={() => navigate("/formacao")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const handleCopyLegenda = (legenda: string) => {
    navigator.clipboard.writeText(legenda);
    toast.success("Legenda copiada!");
  };

  const handleSubmitQuiz = async () => {
    // Check if all questions are answered
    if (Object.keys(respostas).length < perguntas.length) {
      toast.error("Responda todas as perguntas antes de enviar");
      return;
    }

    try {
      const result = await submitQuiz.mutateAsync(respostas);
      setLastResult({ nota: result.nota, aprovado: result.aprovado });
      setShowResult(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRetry = () => {
    setRespostas({});
    setShowResult(false);
    setLastResult(null);
  };

  return (
    <div className="min-h-screen bg-background texture-concrete p-4 pb-24 safe-top safe-bottom">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Aula</span>
          </div>
        </div>
        {isCompleted && (
          <Badge className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluída
          </Badge>
        )}
      </header>

      {/* Lesson Title */}
      <h1 className="text-2xl font-black mb-6">{aula.titulo}</h1>

      {/* Lesson Content */}
      {aula.conteudo_texto && (
        <div className="card-luta mb-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{aula.conteudo_texto}</div>
          </div>
        </div>
      )}

      {/* Materials Section */}
      {materiais.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Materiais de Apoio
          </h2>
          <div className="space-y-3">
            {materiais.map((am) => {
              const material = am.material;
              if (!material) return null;
              return (
                <div key={am.id} className="card-luta">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold line-clamp-1">{material.titulo}</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {material.categoria} • {material.formato}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {material.legenda_pronta && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLegenda(material.legenda_pronta!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {material.arquivo_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(material.arquivo_url!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz Section */}
      {perguntas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quiz - Teste seu conhecimento
          </h2>

          {isCompleted && tentativaAprovada && !showResult ? (
            <div className="card-luta bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-bold text-green-700 dark:text-green-400">
                    Você já concluiu esta aula!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nota: {tentativaAprovada.nota}%
                  </p>
                </div>
              </div>
            </div>
          ) : showResult && lastResult ? (
            <div
              className={`card-luta ${
                lastResult.aprovado
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="text-center py-4">
                {lastResult.aprovado ? (
                  <>
                    <Trophy className="h-12 w-12 mx-auto text-green-600 mb-3" />
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                      Parabéns! Você passou!
                    </h3>
                    <p className="text-muted-foreground">Nota: {lastResult.nota}%</p>
                    <Button className="mt-4" onClick={() => navigate(-1)}>
                      Voltar ao curso
                    </Button>
                  </>
                ) : (
                  <>
                    <XCircle className="h-12 w-12 mx-auto text-red-600 mb-3" />
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400">
                      Não foi dessa vez
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Nota: {lastResult.nota}% (mínimo: 70%)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revise o conteúdo e tente novamente
                    </p>
                    <Button className="mt-4" onClick={handleRetry}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar novamente
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {perguntas.map((pergunta, idx) => (
                <QuizQuestion
                  key={pergunta.id}
                  pergunta={pergunta}
                  questionNumber={idx + 1}
                  selectedOption={respostas[pergunta.id]}
                  onSelect={(opcaoId) =>
                    setRespostas({ ...respostas, [pergunta.id]: opcaoId })
                  }
                />
              ))}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmitQuiz}
                disabled={submitQuiz.isPending}
              >
                {submitQuiz.isPending ? "Enviando..." : "Enviar Respostas"}
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="signature-luta text-center mt-8">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}

function QuizQuestion({
  pergunta,
  questionNumber,
  selectedOption,
  onSelect,
}: {
  pergunta: QuizPergunta;
  questionNumber: number;
  selectedOption?: string;
  onSelect: (opcaoId: string) => void;
}) {
  return (
    <div className="card-luta">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
          {questionNumber}
        </span>
        <p className="font-medium pt-1">{pergunta.enunciado}</p>
      </div>

      <RadioGroup value={selectedOption} onValueChange={onSelect} className="space-y-3">
        {pergunta.opcoes?.map((opcao) => (
          <div key={opcao.id} className="flex items-center space-x-3">
            <RadioGroupItem value={opcao.id} id={opcao.id} />
            <Label htmlFor={opcao.id} className="flex-1 cursor-pointer">
              {opcao.texto}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

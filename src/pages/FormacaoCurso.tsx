import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useCursoDetalhe, getNivelLabel } from "@/hooks/useFormacao";
import { useProfile } from "@/hooks/useProfile";
import { useCertificates, FormacaoCertificate } from "@/hooks/useCertificates";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CourseCompletionModal } from "@/components/formacao/CourseCompletionModal";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  PlayCircle,
  GraduationCap,
  Award,
  Share2,
  Target,
} from "lucide-react";

export default function FormacaoCurso() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { profile } = useProfile();
  const { curso, aulas, completedAulaIds, isLoading } = useCursoDetalhe(id);
  const { getCertificateForCourse, issueCertificate, isLoading: certLoading } = useCertificates();
  
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [certificate, setCertificate] = useState<FormacaoCertificate | null>(null);

  // Calculate progress
  const publishedAulas = aulas.filter((a) => a.status === "PUBLICADO");
  const completedCount = publishedAulas.filter((a) => completedAulaIds.includes(a.id)).length;
  const progress = publishedAulas.length > 0 ? Math.round((completedCount / publishedAulas.length) * 100) : 0;
  const isCourseComplete = progress === 100 && publishedAulas.length > 0;

  // Issue certificate when course is completed
  useEffect(() => {
    if (isCourseComplete && id && !certLoading) {
      const existingCert = getCertificateForCourse(id);
      if (existingCert) {
        setCertificate(existingCert);
      } else {
        // Issue new certificate
        issueCertificate.mutateAsync(id).then((cert) => {
          if (cert) setCertificate(cert);
        });
      }
    }
  }, [isCourseComplete, id, certLoading]);

  if (authLoading || isLoading) {
    return <FullPageLoader text="Carregando curso..." />;
  }

  if (!hasAccess) {
    return null;
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-background texture-concrete p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Curso não encontrado</h2>
          <Button onClick={() => navigate("/formacao")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const nivelColors: Record<string, string> = {
    INTRO: "bg-green-500/20 text-green-700 dark:text-green-400",
    BASICO: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    INTERMEDIARIO: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  };

  return (
    <div className="min-h-screen bg-background texture-concrete p-4 pb-24 safe-top safe-bottom">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/formacao")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Curso</span>
          </div>
        </div>
      </header>

      {/* Course Info */}
      <div className="card-luta mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={nivelColors[curso.nivel]}>
            {getNivelLabel(curso.nivel)}
          </Badge>
          {isCourseComplete && (
            <Badge variant="default" className="bg-green-600">
              Concluído
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-black mb-2">{curso.titulo}</h1>
        {curso.descricao && (
          <p className="text-muted-foreground mb-4">{curso.descricao}</p>
        )}
        {curso.tags && curso.tags.length > 0 && (
          <div className="flex gap-1 mb-4 flex-wrap">
            {curso.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              {completedCount} de {publishedAulas.length} aulas concluídas
            </span>
            <span className="font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Course Completion Block */}
      {isCourseComplete && certificate && (
        <div className="card-luta mb-6 bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-600 rounded-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-green-700 dark:text-green-400">
                Parabéns! Curso Concluído!
              </h3>
              <p className="text-sm text-muted-foreground">
                Seu certificado está disponível
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-green-500/30 hover:bg-green-500/10"
              onClick={() => setShowCompletionModal(true)}
            >
              <Award className="h-5 w-5 mb-1 text-green-600" />
              <span className="text-xs">Ver Certificado</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-green-500/30 hover:bg-green-500/10"
              onClick={() => {
                setShowCompletionModal(true);
              }}
            >
              <Share2 className="h-5 w-5 mb-1 text-green-600" />
              <span className="text-xs">Compartilhar</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-primary/30 hover:bg-primary/10"
              onClick={() => {
                setShowCompletionModal(true);
              }}
            >
              <Target className="h-5 w-5 mb-1 text-primary" />
              <span className="text-xs">Aplicar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Lessons List */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Aulas
      </h2>

      {publishedAulas.length === 0 ? (
        <div className="card-luta text-center py-8">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma aula disponível ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {publishedAulas.map((aula, idx) => {
            const isCompleted = completedAulaIds.includes(aula.id);
            return (
              <div
                key={aula.id}
                className="card-luta cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/formacao/aula/${aula.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Aula {idx + 1}
                      </span>
                      {isCompleted && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                          Concluída
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold line-clamp-1">{aula.titulo}</h3>
                  </div>
                  <PlayCircle className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="signature-luta text-center mt-8">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>

      {/* Course Completion Modal */}
      {curso && certificate && (
        <CourseCompletionModal
          open={showCompletionModal}
          onOpenChange={setShowCompletionModal}
          courseId={curso.id}
          courseTitle={curso.titulo}
          courseLevel={getNivelLabel(curso.nivel)}
          volunteerName={profile?.full_name || "Voluntário"}
          volunteerCidade={profile?.city}
          certificate={certificate}
        />
      )}
    </div>
  );
}

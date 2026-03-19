import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useFormacao, Curso, getNivelLabel } from "@/hooks/useFormacao";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Search,
  Star,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Formacao() {
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { cursos, cursosLoading, getCursoProgress } = useFormacao();
  const [searchTerm, setSearchTerm] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // Load progress for all courses
  useEffect(() => {
    async function loadProgress() {
      const newProgressMap: Record<string, number> = {};
      for (const curso of cursos) {
        newProgressMap[curso.id] = await getCursoProgress(curso.id);
      }
      setProgressMap(newProgressMap);
    }
    if (cursos.length > 0) {
      loadProgress();
    }
  }, [cursos, getCursoProgress]);

  if (authLoading || cursosLoading) {
    return <FullPageLoader text="Carregando formação..." />;
  }

  if (!hasAccess) {
    return null;
  }

  // Filter published courses and by search term
  const filteredCursos = cursos
    .filter((c) => c.status === "PUBLICADO")
    .filter(
      (c) =>
        c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // Separate recommended courses
  const recommendedCursos = filteredCursos.filter((c) => c.recomendado);
  const otherCursos = filteredCursos.filter((c) => !c.recomendado);

  return (
    <div className="min-h-screen bg-background texture-concrete p-4 pb-24 safe-top safe-bottom">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Formação</span>
          </div>
          <h1 className="text-2xl font-black">Respira • Estuda • Age</h1>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Recommended Courses Section */}
      {recommendedCursos.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <h2 className="text-lg font-bold">Recomendados</h2>
          </div>
          <div className="space-y-4">
            {recommendedCursos.map((curso) => (
              <CursoCard
                key={curso.id}
                curso={curso}
                progress={progressMap[curso.id] || 0}
                onClick={() => navigate(`/formacao/curso/${curso.id}`)}
                isRecommended
              />
            ))}
          </div>
        </section>
      )}

      {/* Other Courses */}
      {otherCursos.length > 0 && (
        <section>
          {recommendedCursos.length > 0 && (
            <h2 className="text-lg font-bold mb-4">Todos os cursos</h2>
          )}
          <div className="space-y-4">
            {otherCursos.map((curso) => (
              <CursoCard
                key={curso.id}
                curso={curso}
                progress={progressMap[curso.id] || 0}
                onClick={() => navigate(`/formacao/curso/${curso.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {filteredCursos.length === 0 && (
        <div className="card-luta text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-bold text-lg mb-2">Nenhum curso disponível</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Nenhum resultado para sua busca"
              : "Em breve novos conteúdos estarão disponíveis"}
          </p>
        </div>
      )}

      <p className="signature-luta text-center mt-8">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}

function CursoCard({
  curso,
  progress,
  onClick,
  isRecommended = false,
}: {
  curso: Curso;
  progress: number;
  onClick: () => void;
  isRecommended?: boolean;
}) {
  const nivelColors: Record<string, string> = {
    INTRO: "bg-green-500/20 text-green-700 dark:text-green-400",
    BASICO: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    INTERMEDIARIO: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  };

  return (
    <div
      className={`card-luta cursor-pointer hover:border-primary/50 transition-colors ${
        isRecommended ? "border-yellow-500/50 bg-yellow-500/5" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${isRecommended ? "bg-yellow-500/20" : "bg-primary/10"}`}>
          <BookOpen className={`h-6 w-6 ${isRecommended ? "text-yellow-600" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isRecommended && (
              <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Recomendado
              </Badge>
            )}
            <Badge className={nivelColors[curso.nivel]}>
              {getNivelLabel(curso.nivel)}
            </Badge>
            {curso.estimativa_min && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {curso.estimativa_min} min
              </Badge>
            )}
            {progress === 100 && (
              <Badge variant="default" className="bg-green-600">
                Concluído
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-lg line-clamp-2">{curso.titulo}</h3>
          {curso.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {curso.descricao}
            </p>
          )}
          {curso.tags && curso.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {curso.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useSeedContent } from "@/hooks/useSeedContent";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "react-router-dom";
import { 
  Beaker, 
  CheckCircle2, 
  MessageSquare,
  Target,
  FolderOpen,
  GraduationCap,
  Sparkles,
  ExternalLink
} from "lucide-react";
import AdminImportPanel from "./AdminImportPanel";

export default function AdminBetaModePanel() {
  const { 
    counts, 
    isLoading, 
    seedingModule,
    seedDebates,
    seedMissions,
    seedMateriais,
    seedFormacao,
  } = useSeedContent();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const modules = [
    { 
      id: "debates" as const,
      icon: MessageSquare, 
      label: "Debates", 
      count: counts?.topicos ?? 0,
      seedDesc: "1 tópico global + 1 post de boas-vindas",
      existsDesc: "Tópicos de debate disponíveis",
      seedFn: seedDebates,
      buttonLabel: "Semear Debates",
      listUrl: "/debates",
    },
    { 
      id: "missions" as const,
      icon: Target, 
      label: "Missões", 
      count: counts?.missions ?? 0,
      seedDesc: "1 missão de escuta pública",
      existsDesc: "Missões cadastradas no sistema",
      seedFn: seedMissions,
      buttonLabel: "Semear Missões",
      listUrl: "/voluntario/missoes",
    },
    { 
      id: "materiais" as const,
      icon: FolderOpen, 
      label: "Materiais", 
      count: counts?.materiais ?? 0,
      seedDesc: "1 material aprovado com legenda pronta",
      existsDesc: "Materiais na biblioteca",
      seedFn: seedMateriais,
      buttonLabel: "Semear Materiais",
      listUrl: "/materiais",
    },
    { 
      id: "formacao" as const,
      icon: GraduationCap, 
      label: "Cursos", 
      count: counts?.cursos ?? 0,
      seedDesc: "1 curso + 2 aulas + 6 quizzes",
      existsDesc: "Cursos de formação disponíveis",
      seedFn: seedFormacao,
      buttonLabel: "Semear Formação",
      listUrl: "/formacao",
    },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Seed Modular Section */}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Beaker className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Modo Beta</span>
          </div>
          <h2 className="text-2xl font-bold">Seed Modular</h2>
          <p className="text-muted-foreground mt-1">
            Popule cada módulo independentemente com conteúdo de exemplo.
          </p>
        </div>

        {/* Status + Seed per Module */}
        <div className="grid gap-4">
          {modules.map((mod) => {
            const hasContent = mod.count > 0;
            const isSeeding = seedingModule === mod.id;

            return (
              <div 
                key={mod.id}
                className={`card-luta flex flex-col sm:flex-row sm:items-center gap-4 ${
                  hasContent ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                {/* Status */}
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${hasContent ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                    <mod.icon className={`h-5 w-5 ${hasContent ? "text-green-500" : "text-amber-500"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{mod.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        hasContent 
                          ? "bg-green-500/20 text-green-600" 
                          : "bg-amber-500/20 text-amber-600"
                      }`}>
                        {mod.count} existente{mod.count !== 1 ? "s" : ""}
                      </span>
                      {hasContent && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hasContent ? (
                        <span className="flex items-center gap-2">
                          {mod.existsDesc}
                          <Link 
                            to={mod.listUrl} 
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Ver lista <ExternalLink className="h-3 w-3" />
                          </Link>
                        </span>
                      ) : (
                        <span>Será criado: {mod.seedDesc}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Seed Button */}
                <Button 
                  onClick={mod.seedFn} 
                  disabled={hasContent || seedingModule !== null}
                  variant={hasContent ? "outline" : "default"}
                  className={!hasContent ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                  size="sm"
                >
                  {isSeeding ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Criando...</span>
                    </>
                  ) : hasContent ? (
                    "Já existe"
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      {mod.buttonLabel}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Test Checklist */}
        <div className="card-luta">
          <h3 className="font-bold mb-3">✅ Checklist de Teste</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-bold text-primary">1.</span>
              <span>Se Materiais = 0 → "Semear Materiais" → /materiais mostra 1 item</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">2.</span>
              <span>Se Cursos = 0 → "Semear Formação" → /formacao mostra 1 curso</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>Abra o curso → veja 2 aulas → faça o quiz (3 perguntas cada)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">4.</span>
              <span>Após seed, o botão respectivo fica desabilitado ("Já existe")</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Import Panel */}
      <AdminImportPanel />
    </div>
  );
}

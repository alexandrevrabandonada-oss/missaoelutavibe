import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingPrefs } from "@/hooks/useOnboardingPrefs";
import { useStreetMission } from "@/hooks/useStreetMission";
import { useConversationMission } from "@/hooks/useConversationMission";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";
import {
  MessageCircle,
  MapPin,
  Package,
  GraduationCap,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface SeuCaminhoScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

const KIND_ICONS: Record<string, React.ElementType> = {
  conversa: MessageCircle,
  rua: MapPin,
  fabrica: Package,
  formacao: GraduationCap,
};

const KIND_COLORS: Record<string, string> = {
  conversa: "text-orange-500 bg-orange-500/10",
  rua: "text-green-500 bg-green-500/10",
  fabrica: "text-blue-500 bg-blue-500/10",
  formacao: "text-purple-500 bg-purple-500/10",
};

export function SeuCaminhoScreen({ onComplete, onSkip }: SeuCaminhoScreenProps) {
  const navigate = useNavigate();
  const { recommendedPath, prefs } = useOnboardingPrefs();
  const { generateMission: generateStreetMission, isGenerating: isGeneratingStreet } = useStreetMission();
  const { generateMission: generateConversaMission, isGenerating: isGeneratingConversa } = useConversationMission();
  const logEvent = useLogGrowthEvent();
  const [isStarting, setIsStarting] = useState(false);

  if (!recommendedPath || !prefs) {
    return null;
  }

  const { primary_action, secondary_actions } = recommendedPath;
  const PrimaryIcon = KIND_ICONS[primary_action.kind] || Sparkles;
  const colorClass = KIND_COLORS[primary_action.kind] || "text-primary bg-primary/10";
  const isLoading = isGeneratingStreet || isGeneratingConversa || isStarting;

  const handleStart = async () => {
    setIsStarting(true);

    // Log event
    logEvent.mutate({
      eventType: "recommended_path_started",
      meta: {
        kind: primary_action.kind,
        tempo: primary_action.tempo,
      },
    });

    try {
      if (primary_action.kind === "conversa") {
        const result = await generateConversaMission({ objective: "convidar" });
        if (result && 'mission_id' in result && result.mission_id) {
          navigate(`/voluntario/missao-conversa/${result.mission_id}`);
        } else if (!(result as any)?.rate_limited) {
          toast.info("Nenhum contato disponível. Adicione contatos primeiro.");
          navigate("/voluntario/crm");
        }
      } else if (primary_action.kind === "rua") {
        const result = await generateStreetMission({ acao: "panfletar" });
        if (result && 'mission_id' in result && result.mission_id) {
          navigate(`/voluntario/missao-rua/${result.mission_id}`);
        } else if (!(result as any)?.rate_limited) {
          toast.error("Erro ao gerar missão");
        }
      } else if (primary_action.kind === "fabrica") {
        navigate("/voluntario/materiais");
      } else if (primary_action.kind === "formacao") {
        navigate("/formacao");
      }

      onComplete?.();
    } catch (error) {
      console.error("Error starting path:", error);
      toast.error("Erro ao iniciar ação");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
          <Logo size="sm" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <div className="text-center space-y-6 w-full">
          {/* Success indicator */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Seu Caminho</h1>
            <p className="text-muted-foreground">
              Com base nas suas preferências, recomendamos:
            </p>
          </div>

          {/* Primary action card */}
          <Card className="border-primary/30">
            <CardContent className="pt-6 space-y-4">
              <div className={`w-16 h-16 rounded-full ${colorClass} mx-auto flex items-center justify-center`}>
                <PrimaryIcon className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">{primary_action.label}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {primary_action.description}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>~{primary_action.tempo} minutos</span>
              </div>

              <Button
                onClick={handleStart}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                Fazer agora
              </Button>
            </CardContent>
          </Card>

          {/* Secondary actions */}
          {secondary_actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Também recomendado para você
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {secondary_actions.map((action) => {
                  const Icon = KIND_ICONS[action.kind] || Sparkles;
                  return (
                    <Badge
                      key={action.kind}
                      variant="outline"
                      className="cursor-pointer py-2 px-3"
                      onClick={() => navigate(action.route)}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skip option */}
          <Button
            variant="ghost"
            onClick={() => {
              onSkip?.();
              navigate("/voluntario/hoje");
            }}
            className="text-muted-foreground"
          >
            Depois eu decido
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingPrefs, RecommendedPath } from "@/hooks/useOnboardingPrefs";
import { useStreetMission } from "@/hooks/useStreetMission";
import { useConversationMission } from "@/hooks/useConversationMission";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  MapPin,
  Package,
  GraduationCap,
  Loader2,
  ArrowRight,
  Settings2,
  Sparkles,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface RecommendedPathCardProps {
  compact?: boolean;
  onEditPrefs?: () => void;
}

const KIND_ICONS: Record<string, React.ElementType> = {
  conversa: MessageCircle,
  rua: MapPin,
  fabrica: Package,
  formacao: GraduationCap,
  followups: MessageCircle,
  plenaria: MessageCircle,
};

export function RecommendedPathCard({ compact = false, onEditPrefs }: RecommendedPathCardProps) {
  const navigate = useNavigate();
  const { recommendedPath, prefs, hasPrefs } = useOnboardingPrefs();
  const { generateMission: generateStreetMission, isGenerating: isGeneratingStreet } = useStreetMission();
  const { generateMission: generateConversaMission, isGenerating: isGeneratingConversa } = useConversationMission();
  const logEvent = useLogGrowthEvent();
  const [isStarting, setIsStarting] = useState(false);

  if (!hasPrefs || !recommendedPath) {
    return null;
  }

  const { primary_action, secondary_actions } = recommendedPath;
  const PrimaryIcon = KIND_ICONS[primary_action.kind] || Sparkles;
  const isLoading = isGeneratingStreet || isGeneratingConversa || isStarting;

  const handleStartPrimary = async () => {
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
        // Generate conversation mission with default objective
        const result = await generateConversaMission({ objective: "convidar" });
        if (result && 'mission_id' in result && result.mission_id) {
          navigate(`/voluntario/missao-conversa/${result.mission_id}`);
        } else if (!(result as any)?.rate_limited) {
          toast.info("Nenhum contato disponível para conversa. Tente adicionar contatos no CRM.");
          navigate("/voluntario/crm");
        }
      } else if (primary_action.kind === "rua") {
        // Generate street mission with defaults
        const result = await generateStreetMission({ acao: "panfletar" });
        if (result && 'mission_id' in result && result.mission_id) {
          navigate(`/voluntario/missao-rua/${result.mission_id}`);
        } else if (!(result as any)?.rate_limited) {
          toast.error("Erro ao gerar missão de rua");
        }
      } else if (primary_action.kind === "fabrica") {
        navigate("/voluntario/materiais");
      } else if (primary_action.kind === "formacao") {
        navigate("/formacao");
      }
    } catch (error) {
      console.error("Error starting path:", error);
      toast.error("Erro ao iniciar ação");
    } finally {
      setIsStarting(false);
    }
  };

  if (compact) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <PrimaryIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{primary_action.label}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{primary_action.tempo} min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEditPrefs && (
                <Button variant="ghost" size="icon" onClick={onEditPrefs}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={handleStartPrimary} disabled={isLoading} size="sm">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Fazer agora
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Seu Caminho
          </CardTitle>
          {onEditPrefs && (
            <Button variant="ghost" size="sm" onClick={onEditPrefs}>
              <Settings2 className="h-4 w-4 mr-1" />
              Ajustar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary action */}
        <div className="p-4 bg-background rounded-lg border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <PrimaryIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{primary_action.label}</p>
              <p className="text-sm text-muted-foreground">{primary_action.description}</p>
            </div>
          </div>
          <Button onClick={handleStartPrimary} disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Fazer agora ({primary_action.tempo} min)
          </Button>
        </div>

        {/* Secondary actions */}
        {secondary_actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Também recomendado
            </p>
            <div className="flex flex-wrap gap-2">
              {secondary_actions.map((action) => {
                const Icon = KIND_ICONS[action.kind] || Sparkles;
                return (
                  <Badge
                    key={action.kind}
                    variant="outline"
                    className="cursor-pointer py-1.5 px-3 hover:bg-muted"
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
      </CardContent>
    </Card>
  );
}

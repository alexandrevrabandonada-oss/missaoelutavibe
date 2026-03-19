/**
 * TodayMissionCard - "Sua missão de hoje" + 2 recomendadas
 *
 * Shows 1 deterministic mission with COMEÇAR AGORA + 2 extras.
 * Falls back to 3 simple options if no recommendation.
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlayCircle,
  MapPin,
  MessageCircle,
  UserPlus,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
} from "lucide-react";
import { focusRingClass } from "@/utils/a11y";
import { useTodayMission, type FallbackOption } from "@/hooks/useTodayMission";
import { useDailyAction } from "@/hooks/useDailyAction";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

const missionTypeLabels: Record<string, string> = {
  escuta: "Escuta",
  rua: "Rua",
  mobilizacao: "Mobilização",
  conteudo: "Conteúdo",
  dados: "Dados",
  formacao: "Formação",
  conversa: "Conversa",
  crm: "CRM",
  geral: "Geral",
};

const FALLBACK_ICONS: Record<string, React.ReactNode> = {
  "message-circle": <MessageCircle className="h-5 w-5" />,
  "map-pin": <MapPin className="h-5 w-5" />,
  "user-plus": <UserPlus className="h-5 w-5" />,
};

export function TodayMissionCard() {
  const navigate = useNavigate();
  const {
    recommendedMission,
    extraRecommended,
    isLoading,
    hasCheckedIn,
    isFirstAction,
    fallbackOptions,
  } = useTodayMission();

  const {
    generateStreetMission,
    generateConversaMission,
    isGeneratingStreet,
    isGeneratingConversa,
  } = useDailyAction();

  if (!hasCheckedIn) return null;

  if (isLoading) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent shadow-lg">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // === Fallback: 3 simple options ===
  if (!recommendedMission) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base">Escolha sua ação de hoje</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {isFirstAction
              ? "Comece com algo rápido e fácil — leva menos de 10 minutos!"
              : "Sem missão recomendada agora. Escolha uma:"}
          </p>
          <div className="space-y-2">
            {fallbackOptions.map((opt: FallbackOption) => (
              <button
                key={opt.id}
                onClick={() => {
                  if (opt.action === "conversa") generateConversaMission();
                  else if (opt.action === "rua") generateStreetMission();
                  else navigate("/voluntario/crm/novo");
                }}
                disabled={
                  (opt.action === "conversa" && isGeneratingConversa) ||
                  (opt.action === "rua" && isGeneratingStreet)
                }
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {FALLBACK_ICONS[opt.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // === Primary: 1 recommended mission + 2 extras ===
  const meta = recommendedMission.meta_json as {
    estimated_min?: number;
    tags?: string[];
  } | null;

  return (
    <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent shadow-lg">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Sua missão de hoje</h3>
          {isFirstAction && (
            <Badge variant="secondary" className="text-xs">Fácil</Badge>
          )}
        </div>

        {/* Main mission */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary mt-0.5">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold line-clamp-2">{recommendedMission.title}</h4>
            {recommendedMission.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {recommendedMission.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {missionTypeLabels[recommendedMission.type] || recommendedMission.type}
              </Badge>
              {meta?.estimated_min && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />~{meta.estimated_min}min
                </span>
              )}
              {recommendedMission.points && (
                <span className="text-xs text-primary font-bold">
                  +{recommendedMission.points} pts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <Button
          size="lg"
          className={`w-full text-lg font-bold ${focusRingClass()}`}
          onClick={() => navigate(`/voluntario/runner/${recommendedMission.id}`)}
        >
          <PlayCircle className="h-6 w-6 mr-2" />
          COMEÇAR AGORA
        </Button>

        {/* 2 Extra Recommendations */}
        {extraRecommended.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Também recomendadas
            </p>
            {extraRecommended.map((m) => {
              const mMeta = m.meta_json as { estimated_min?: number } | null;
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/voluntario/runner/${m.id}`)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <Badge variant="outline" className="text-xs shrink-0">
                    {missionTypeLabels[m.type] || m.type}
                  </Badge>
                  <span className="text-sm truncate flex-1">{m.title}</span>
                  {mMeta?.estimated_min && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      ~{mMeta.estimated_min}min
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Secondary CTA */}
        <Button
          variant="ghost"
          size="sm"
          className={`w-full ${focusRingClass()}`}
          onClick={() => navigate("/voluntario/missoes")}
        >
          VER MAIS MISSÕES
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

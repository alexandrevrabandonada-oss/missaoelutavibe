/**
 * DailyActionCTA - Primary "COMEÇAR AGORA" CTA after check-in
 * 
 * Shows a single focused action based on availability + focus.
 * Replaces the complex PostCheckinCTAs with a cleaner flow.
 */

import { useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlayCircle,
  ListTodo,
  Phone,
  MapPin,
  MessageCircle,
  ScrollText,
  ArrowRight,
  Sparkles,
  UserPlus,
  CalendarClock,
} from "lucide-react";
import { focusRingClass } from "@/utils/a11y";
import { useDailyAction } from "@/hooks/useDailyAction";
import { supabase } from "@/integrations/supabase/client";
import type { ActionKind } from "@/hooks/useActionQueue";

// Track growth events (no PII)
async function logGrowthEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[DailyActionCTA] Tracking error:", error);
  }
}

const KIND_ICONS: Record<ActionKind, React.ReactNode> = {
  followup: <Phone className="h-5 w-5" />,
  event_followup: <CalendarClock className="h-5 w-5" />,
  mission_rua: <MapPin className="h-5 w-5" />,
  mission_conversa: <MessageCircle className="h-5 w-5" />,
  talento_task: <ListTodo className="h-5 w-5" />,
  roteiro_sugerido: <ScrollText className="h-5 w-5" />,
};

const KIND_LABELS: Record<ActionKind, string> = {
  followup: "Follow-up",
  event_followup: "Pós-Evento",
  mission_rua: "Missão de Rua",
  mission_conversa: "Conversa",
  talento_task: "Tarefa",
  roteiro_sugerido: "Roteiro",
};

interface DailyActionCTAProps {
  onStartExecution: () => void;
}

export function DailyActionCTA({ onStartExecution }: DailyActionCTAProps) {
  const navigate = useNavigate();
  const {
    suggestedAction,
    isLoading,
    hasActions,
    generateStreetMission,
    generateConversaMission,
    isGeneratingStreet,
    isGeneratingConversa,
  } = useDailyAction();

  // Track fallback shown once
  const fallbackTrackedRef = useRef(false);
  const isFallbackState = !isLoading && (!suggestedAction || !hasActions);

  useEffect(() => {
    if (isFallbackState && !fallbackTrackedRef.current) {
      fallbackTrackedRef.current = true;
      const reason = hasActions ? "no_suggestion" : "empty_queue";
      logGrowthEvent("daily_fallback_shown", { reason });
      logGrowthEvent("contact_cta_shown", { source: "daily_fallback" });
    }
  }, [isFallbackState, hasActions]);

  const handleContactCTAClick = () => {
    logGrowthEvent("contact_cta_clicked", { source: "daily_fallback" });
    navigate("/voluntario/crm/novo");
  };

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No suggested action - offer to generate one or save a contact
  if (!suggestedAction || !hasActions) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Sem ações pendentes. Escolha o que fazer:
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              onClick={() => generateStreetMission()}
              disabled={isGeneratingStreet}
              className={focusRingClass()}
            >
              <MapPin className="h-5 w-5 mr-2" />
              {isGeneratingStreet ? "Gerando..." : "MISSÃO DE RUA"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateConversaMission()}
              disabled={isGeneratingConversa}
              className={focusRingClass()}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {isGeneratingConversa ? "Gerando..." : "CONVERSA"}
            </Button>
            <Button
              variant="outline"
              onClick={handleContactCTAClick}
              className={focusRingClass()}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              SALVAR 1 CONTATO
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has action - show primary CTA
  const isGenerateAction = suggestedAction.ctas[0]?.action === "generate";

  return (
    <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent shadow-lg">
      <CardContent className="p-6 space-y-4">
        {/* Action preview */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            {KIND_ICONS[suggestedAction.kind]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{suggestedAction.title}</p>
            {suggestedAction.subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {suggestedAction.subtitle}
              </p>
            )}
          </div>
          <Badge variant="secondary">
            {KIND_LABELS[suggestedAction.kind]}
          </Badge>
        </div>

        {/* Primary CTA */}
        {isGenerateAction ? (
          <Button
            size="lg"
            className={`w-full text-lg font-bold ${focusRingClass()}`}
            onClick={() => {
              if (suggestedAction.kind === "mission_rua") {
                generateStreetMission();
              } else if (suggestedAction.kind === "mission_conversa") {
                generateConversaMission();
              }
            }}
            disabled={isGeneratingStreet || isGeneratingConversa}
          >
            <PlayCircle className="h-6 w-6 mr-2" />
            {isGeneratingStreet || isGeneratingConversa ? "GERANDO..." : "GERAR MISSÃO"}
          </Button>
        ) : suggestedAction.href ? (
          <Button
            size="lg"
            className={`w-full text-lg font-bold ${focusRingClass()}`}
            onClick={onStartExecution}
          >
            <PlayCircle className="h-6 w-6 mr-2" />
            COMEÇAR AGORA
          </Button>
        ) : (
          <Button
            size="lg"
            className={`w-full text-lg font-bold ${focusRingClass()}`}
            onClick={onStartExecution}
          >
            <PlayCircle className="h-6 w-6 mr-2" />
            COMEÇAR AGORA
          </Button>
        )}

        {/* Secondary CTA */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`w-full ${focusRingClass()}`}
        >
          <Link to="/voluntario/agir">
            ESCOLHER OUTRA AÇÃO
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

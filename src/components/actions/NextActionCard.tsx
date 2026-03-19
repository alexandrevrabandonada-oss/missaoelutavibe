/**
 * NextActionCard - Shows the single most important action
 * "Seu Próximo Passo" - always visible, with fallback
 */

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  MapPin,
  MessageCircle,
  ListTodo,
  ScrollText,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { focusRingClass } from "@/utils/a11y";
import { useActionQueue, type ActionKind } from "@/hooks/useActionQueue";
import { useEffect, useRef } from "react";

const KIND_ICONS: Record<ActionKind, React.ReactNode> = {
  followup: <Phone className="h-5 w-5" />,
  event_followup: <CalendarClock className="h-5 w-5" />,
  mission_rua: <MapPin className="h-5 w-5" />,
  mission_conversa: <MessageCircle className="h-5 w-5" />,
  talento_task: <ListTodo className="h-5 w-5" />,
  roteiro_sugerido: <ScrollText className="h-5 w-5" />,
};

const KIND_COLORS: Record<ActionKind, string> = {
  followup: "text-green-600 dark:text-green-400",
  event_followup: "text-cyan-600 dark:text-cyan-400",
  mission_rua: "text-orange-600 dark:text-orange-400",
  mission_conversa: "text-blue-600 dark:text-blue-400",
  talento_task: "text-purple-600 dark:text-purple-400",
  roteiro_sugerido: "text-amber-600 dark:text-amber-400",
};

interface NextActionCardProps {
  compact?: boolean;
}

export function NextActionCard({ compact = false }: NextActionCardProps) {
  const {
    nextAction,
    hasActions,
    isLoading,
    trackQueueViewed,
    trackActionOpened,
    markFollowupDone,
    snoozeFollowup,
    generateStreetMission,
    generateConversaMission,
    isMarkingDone,
    isSnoozing,
    isGeneratingStreet,
    isGeneratingConversa,
  } = useActionQueue();

  const hasTrackedRef = useRef(false);

  // Track view once (only when we first have actions)
  useEffect(() => {
    if (hasActions && !hasTrackedRef.current) {
      trackQueueViewed();
      hasTrackedRef.current = true;
    }
  }, [hasActions, trackQueueViewed]);

  // Use nextAction directly

  if (isLoading) {
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Fallback when no actions
  if (!nextAction) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Sem pendências críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Você está em dia! Escolha uma ação para continuar contribuindo.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateStreetMission()}
              disabled={isGeneratingStreet}
              className={focusRingClass()}
              aria-label="Gerar missão de rua"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Missão de Rua
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateConversaMission()}
              disabled={isGeneratingConversa}
              className={focusRingClass()}
              aria-label="Gerar missão de conversa"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Missão de Conversa
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handlePrimaryCTA = async () => {
    const primaryCTA = nextAction.ctas[0];
    if (!primaryCTA) return;

    trackActionOpened(nextAction);

    switch (primaryCTA.action) {
      case "open":
        // Navigation handled by Link
        break;
      case "generate":
        if (nextAction.kind === "mission_rua") {
          await generateStreetMission();
        } else if (nextAction.kind === "mission_conversa") {
          await generateConversaMission();
        }
        break;
      case "done":
        if (nextAction.kind === "followup" && nextAction.meta?.contact_id) {
          await markFollowupDone(nextAction.meta.contact_id as string);
        }
        break;
      case "whatsapp":
        // Open WhatsApp - handled by parent or link
        break;
      case "snooze":
        if (nextAction.kind === "followup" && nextAction.meta?.contact_id) {
          await snoozeFollowup(nextAction.meta.contact_id as string);
        }
        break;
    }
  };

  const isPending = isMarkingDone || isSnoozing || isGeneratingStreet || isGeneratingConversa;
  const primaryCTA = nextAction.ctas[0];
  const isGenerateAction = primaryCTA?.action === "generate";

  const cardContent = (
    <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className={compact ? "pb-2 pt-4" : "pb-3"}>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Seu Próximo Passo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background ${KIND_COLORS[nextAction.kind]}`}>
            {KIND_ICONS[nextAction.kind]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{nextAction.title}</p>
            {nextAction.subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {nextAction.subtitle}
              </p>
            )}
          </div>
          {nextAction.dueLabel && (
            <Badge
              variant={nextAction.dueLabel === "atrasado" ? "destructive" : "secondary"}
              className="shrink-0"
            >
              {nextAction.dueLabel}
            </Badge>
          )}
        </div>

        {/* Primary CTA */}
        {nextAction.href && !isGenerateAction ? (
          <Button 
            asChild 
            className={`w-full ${focusRingClass()}`}
            aria-label={`${primaryCTA?.label || "Fazer agora"} - ${nextAction.title}`}
          >
            <Link to={nextAction.href} onClick={() => trackActionOpened(nextAction)}>
              {primaryCTA?.label || "Fazer agora"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <Button
            onClick={handlePrimaryCTA}
            disabled={isPending}
            className={`w-full ${focusRingClass()}`}
            aria-label={`${primaryCTA?.label || "Fazer agora"} - ${nextAction.title}`}
          >
            {isPending ? "Aguarde..." : primaryCTA?.label || "Fazer agora"}
            {!isPending && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        )}

        {/* Secondary CTAs for followups */}
        {nextAction.kind === "followup" && nextAction.ctas.length > 1 && (
          <div className="flex gap-2">
            {nextAction.ctas.slice(1).map((cta) => (
              <Button
                key={cta.action}
                variant="outline"
                size="sm"
                className={`flex-1 ${focusRingClass()}`}
                onClick={async () => {
                  if (cta.action === "done" && nextAction.meta?.contact_id) {
                    await markFollowupDone(nextAction.meta.contact_id as string);
                  } else if (cta.action === "snooze" && nextAction.meta?.contact_id) {
                    await snoozeFollowup(nextAction.meta.contact_id as string);
                  }
                }}
                disabled={isPending}
                aria-label={cta.label}
              >
                {cta.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return cardContent;
}

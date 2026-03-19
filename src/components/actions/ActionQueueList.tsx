/**
 * ActionQueueList - Full list of all actions with filters
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  MapPin,
  MessageCircle,
  ListTodo,
  ScrollText,
  ArrowRight,
  Filter,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { focusRingClass, srOnlyClass } from "@/utils/a11y";
import {
  useActionQueue,
  type ActionItem,
  type ActionKind,
  ACTION_KIND_LABELS,
} from "@/hooks/useActionQueue";

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

const KIND_BG: Record<ActionKind, string> = {
  followup: "bg-green-100 dark:bg-green-900/30",
  event_followup: "bg-cyan-100 dark:bg-cyan-900/30",
  mission_rua: "bg-orange-100 dark:bg-orange-900/30",
  mission_conversa: "bg-blue-100 dark:bg-blue-900/30",
  talento_task: "bg-purple-100 dark:bg-purple-900/30",
  roteiro_sugerido: "bg-amber-100 dark:bg-amber-900/30",
};

type FilterKind = "all" | ActionKind;

export function ActionQueueList() {
  const {
    actions,
    isLoading,
    refetch,
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

  const [filter, setFilter] = useState<FilterKind>("all");

  const filteredActions = filter === "all" 
    ? actions 
    : actions.filter((a) => a.kind === filter);

  // Get unique kinds for filter tabs
  const availableKinds = [...new Set(actions.map((a) => a.kind))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">Nenhuma ação pendente</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Você está em dia! Gere uma nova missão para continuar.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateStreetMission()}
              disabled={isGeneratingStreet}
              className={focusRingClass()}
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
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Missão de Conversa
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKind)}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className={focusRingClass({ offset: false })}>
              Todas ({actions.length})
            </TabsTrigger>
            {availableKinds.map((kind) => (
              <TabsTrigger 
                key={kind} 
                value={kind}
                className={`${focusRingClass({ offset: false })} hidden sm:flex`}
              >
                {ACTION_KIND_LABELS[kind]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          className={focusRingClass()}
          aria-label="Atualizar lista"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Action List */}
      <div className="space-y-3" role="list" aria-label="Lista de ações pendentes">
        {filteredActions.map((action, index) => (
          <ActionListItem
            key={action.id}
            action={action}
            index={index}
            onOpen={() => trackActionOpened(action)}
            onDone={async () => {
              if (action.kind === "followup" && action.meta?.contact_id) {
                await markFollowupDone(action.meta.contact_id as string);
              }
            }}
            onSnooze={async () => {
              if (action.kind === "followup" && action.meta?.contact_id) {
                await snoozeFollowup(action.meta.contact_id as string);
              }
            }}
            onGenerate={async () => {
              if (action.kind === "mission_rua") {
                await generateStreetMission();
              } else if (action.kind === "mission_conversa") {
                await generateConversaMission();
              }
            }}
            isPending={isMarkingDone || isSnoozing || isGeneratingStreet || isGeneratingConversa}
          />
        ))}
      </div>

      {/* Screen reader summary */}
      <p className={srOnlyClass}>
        {filteredActions.length} ações {filter !== "all" ? `do tipo ${ACTION_KIND_LABELS[filter]}` : ""}
      </p>
    </div>
  );
}

interface ActionListItemProps {
  action: ActionItem;
  index: number;
  onOpen: () => void;
  onDone: () => Promise<void>;
  onSnooze: () => Promise<void>;
  onGenerate: () => Promise<void>;
  isPending: boolean;
}

function ActionListItem({
  action,
  index,
  onOpen,
  onDone,
  onSnooze,
  onGenerate,
  isPending,
}: ActionListItemProps) {
  const isGenerateAction = action.ctas[0]?.action === "generate";
  const primaryCTA = action.ctas[0];

  return (
    <Card 
      className={`transition-all ${index === 0 ? "border-primary/30" : ""}`}
      role="listitem"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${KIND_BG[action.kind]} ${KIND_COLORS[action.kind]} shrink-0`}>
            {KIND_ICONS[action.kind]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-medium">{action.title}</p>
                {action.subtitle && (
                  <p className="text-sm text-muted-foreground">{action.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {action.dueLabel && (
                  <Badge
                    variant={action.dueLabel === "atrasado" ? "destructive" : "secondary"}
                  >
                    {action.dueLabel}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  P{action.priority}
                </Badge>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-2 mt-3">
              {action.href && !isGenerateAction ? (
                <Button
                  asChild
                  size="sm"
                  className={focusRingClass()}
                >
                  <Link to={action.href} onClick={onOpen}>
                    {primaryCTA?.label || "Abrir"}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              ) : isGenerateAction ? (
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={isPending}
                  className={focusRingClass()}
                >
                  {isPending ? "Gerando..." : primaryCTA?.label || "Gerar"}
                </Button>
              ) : null}

              {/* Secondary CTAs */}
              {action.kind === "followup" && action.ctas.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDone}
                    disabled={isPending}
                    className={focusRingClass()}
                  >
                    Feito
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSnooze}
                    disabled={isPending}
                    className={focusRingClass()}
                  >
                    Adiar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

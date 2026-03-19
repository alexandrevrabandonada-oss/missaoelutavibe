/**
 * ActionQueueCard - Shows Top 3 actions with link to full list
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
  ChevronRight,
  Zap,
  CalendarClock,
} from "lucide-react";
import { focusRingClass } from "@/utils/a11y";
import { useActionQueue, type ActionItem, type ActionKind } from "@/hooks/useActionQueue";

const KIND_ICONS: Record<ActionKind, React.ReactNode> = {
  followup: <Phone className="h-4 w-4" />,
  event_followup: <CalendarClock className="h-4 w-4" />,
  mission_rua: <MapPin className="h-4 w-4" />,
  mission_conversa: <MessageCircle className="h-4 w-4" />,
  talento_task: <ListTodo className="h-4 w-4" />,
  roteiro_sugerido: <ScrollText className="h-4 w-4" />,
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

interface ActionQueueCardProps {
  compact?: boolean;
  excludeFirst?: boolean; // If NextActionCard is showing first item
}

export function ActionQueueCard({ compact = false, excludeFirst = true }: ActionQueueCardProps) {
  const { actions, hasActions, isLoading, trackActionOpened } = useActionQueue();

  // Skip first item if NextActionCard is showing it
  const displayActions = excludeFirst ? actions.slice(1, 4) : actions.slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasActions || displayActions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className={compact ? "pb-2 pt-4" : "pb-3"}>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Próximas ações
          <Badge variant="outline" className="ml-auto">
            {actions.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayActions.map((action) => (
          <ActionItemRow 
            key={action.id} 
            action={action} 
            onOpen={() => trackActionOpened(action)}
          />
        ))}

        {actions.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={`w-full mt-2 ${focusRingClass()}`}
          >
            <Link to="/voluntario/acoes">
              Ver fila completa ({actions.length} ações)
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ActionItemRow({ action, onOpen }: { action: ActionItem; onOpen: () => void }) {
  const isGenerateAction = action.ctas[0]?.action === "generate";

  const content = (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
      <div className={`p-1.5 rounded ${KIND_BG[action.kind]} ${KIND_COLORS[action.kind]}`}>
        {KIND_ICONS[action.kind]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{action.title}</p>
        {action.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{action.subtitle}</p>
        )}
      </div>
      {action.dueLabel && (
        <Badge
          variant={action.dueLabel === "atrasado" ? "destructive" : "secondary"}
          className="text-xs shrink-0"
        >
          {action.dueLabel}
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );

  if (action.href && !isGenerateAction) {
    return (
      <Link
        to={action.href}
        onClick={onOpen}
        className={`block ${focusRingClass({ offset: false })} rounded-lg`}
        aria-label={`${action.title}${action.subtitle ? ` - ${action.subtitle}` : ""}`}
      >
        {content}
      </Link>
    );
  }

  // For generate actions, show as non-clickable (handled by NextActionCard)
  return (
    <div className="opacity-75" aria-label={action.title}>
      {content}
    </div>
  );
}

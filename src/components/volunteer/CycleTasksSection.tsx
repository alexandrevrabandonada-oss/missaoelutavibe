import { Link } from "react-router-dom";
import { useMyCycleTasks, type CycleTask } from "@/hooks/useCycleBacklog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/hooks/useSquads";
import { ListTodo, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { format, isAfter, addDays } from "date-fns";

interface CycleTasksSectionProps {
  cicloId: string;
  compact?: boolean;
}

export function CycleTasksSection({ cicloId, compact = false }: CycleTasksSectionProps) {
  const { tasks, isLoading } = useMyCycleTasks(cicloId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return null; // Don't show section if no tasks
  }

  const displayTasks = compact ? tasks.slice(0, 3) : tasks;
  const now = new Date();
  const twoDaysFromNow = addDays(now, 2);

  const getUrgencyBadge = (task: CycleTask) => {
    if (task.status === "bloqueado") {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Bloqueado
        </Badge>
      );
    }
    if (task.prazo_em && isAfter(now, new Date(task.prazo_em))) {
      return (
        <Badge variant="destructive" className="text-xs">
          Vencido
        </Badge>
      );
    }
    if (task.prazo_em && isAfter(twoDaysFromNow, new Date(task.prazo_em))) {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
          Vencendo
        </Badge>
      );
    }
    if (task.prioridade === "alta") {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
          Alta
        </Badge>
      );
    }
    return null;
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary">
          <ListTodo className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">
            Tarefas da Semana
          </span>
        </div>
        {compact && tasks.length > 3 && (
          <Link
            to="/voluntario/squads"
            className="text-xs text-primary hover:underline"
          >
            Ver todas →
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {displayTasks.map((task) => (
          <Link
            key={task.id}
            to="/voluntario/squads"
            className="card-luta block hover:bg-secondary/80 transition-colors py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{task.titulo}</h4>
                  {getUrgencyBadge(task)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{task.squad_nome}</span>
                  {task.prazo_em && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(task.prazo_em), "dd/MM")}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={TASK_STATUS_LABELS[task.status]?.color}
              >
                {TASK_STATUS_LABELS[task.status]?.label}
              </Badge>
            </div>
          </Link>
        ))}
      </div>

      {!compact && tasks.length > 0 && (
        <Link
          to="/voluntario/squads"
          className="flex items-center justify-center gap-2 mt-3 p-2 text-sm text-primary hover:underline"
        >
          Ver no painel de squads <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

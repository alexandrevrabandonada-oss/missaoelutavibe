import { Link } from "react-router-dom";
import { useAgendaSemana, ATIVIDADE_TIPO_LABELS, Atividade } from "@/hooks/useAtividades";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, ChevronRight } from "lucide-react";

interface AgendaSemanaBlockProps {
  cicloId?: string | null;
  userCellIds?: string[];
  userCity?: string | null;
}

export function AgendaSemanaBlock({ cicloId, userCellIds, userCity }: AgendaSemanaBlockProps) {
  const { data: atividades, isLoading } = useAgendaSemana(cicloId, userCellIds, userCity);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDays className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">Agenda da Semana</span>
        </div>
        <div className="card-luta text-center py-4">
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </section>
    );
  }

  if (!atividades || atividades.length === 0) {
    return null; // Don't show section if no activities
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDays className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">Agenda da Semana</span>
        </div>
        <Link to="/voluntario/agenda" className="text-xs text-primary hover:underline">
          Ver todas →
        </Link>
      </div>

      <div className="space-y-2">
        {atividades.slice(0, 3).map((atividade) => (
          <ActivityMiniCard key={atividade.id} atividade={atividade} />
        ))}
      </div>
    </section>
  );
}

function ActivityMiniCard({ atividade }: { atividade: Atividade }) {
  const startDate = new Date(atividade.inicio_em);
  const dayLabel = format(startDate, "EEE", { locale: ptBR });
  const dayNum = format(startDate, "dd");
  const time = format(startDate, "HH:mm");

  return (
    <Link
      to={`/voluntario/agenda/${atividade.id}`}
      className="card-luta py-3 hover:bg-secondary/80 transition-colors flex items-center gap-3"
    >
      {/* Date chip */}
      <div className="bg-primary/10 text-primary text-center px-2 py-1 rounded-lg shrink-0">
        <p className="text-xs uppercase font-bold">{dayLabel}</p>
        <p className="text-lg font-bold leading-none">{dayNum}</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="outline" className="text-xs py-0 h-5">
            {ATIVIDADE_TIPO_LABELS[atividade.tipo]}
          </Badge>
        </div>
        <p className="font-bold text-sm truncate">{atividade.titulo}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {time}
          </span>
          {atividade.local_texto && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />
              {atividade.local_texto}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

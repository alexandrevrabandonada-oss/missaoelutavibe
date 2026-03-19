import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useUserCells } from "@/hooks/useUserCells";
import { useTopOfWeek, type TopItem } from "@/hooks/useUtilitySignals";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { RadioPlayer } from "@/components/a11y/RadioPlayer";
import { useRadioQueue, buildQueueFromTop } from "@/hooks/useRadioQueue";
import {
  ArrowLeft,
  Trophy,
  Repeat2,
  Share2,
  Users,
  Star,
  Target,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Radio,
} from "lucide-react";

export default function VoluntarioTop() {
  useRequireApproval();
  const navigate = useNavigate();
  const { userCells, isLoading: cellsLoading } = useUserCells();
  const primaryCell = userCells[0] || null;

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const [showRadio, setShowRadio] = useState(false);
  const radio = useRadioQueue();

  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return subWeeks(base, weekOffset);
  }, [weekOffset]);

  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  // Determine scope
  const scopeTipo = primaryCell ? "celula" : "cidade";
  const scopeId = primaryCell?.id || "global";

  const { data: topData, isLoading } = useTopOfWeek(weekStartStr, scopeTipo, scopeId);

  // Build radio queue from top data
  useEffect(() => {
    if (topData && !radio.hasQueue) {
      const queue = buildQueueFromTop({
        usei: topData.usei,
        compartilhei: topData.compartilhei,
        puxo: topData.puxo,
        coordPicks: topData.coordPicks,
      }, scopeId);
      
      if (queue.length > 0) {
        radio.setQueue(queue);
      }
    }
  }, [topData, scopeId]);

  const handleStartRadio = () => {
    setShowRadio(true);
    radio.play();
  };

  if (cellsLoading) return <FullPageLoader />;

  const TopList = ({
    title,
    icon: Icon,
    items,
    color,
  }: {
    title: string;
    icon: any;
    items: TopItem[];
    color: string;
  }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum item ainda esta semana
          </p>
        ) : (
          items.map((item, idx) => (
            <Link
              key={`${item.target_type}-${item.target_id}`}
              to={
                item.target_type === "mission"
                  ? `/voluntario/missao/${item.target_id}`
                  : `/voluntario/celula/${scopeId}/mural/${item.target_id}`
              }
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <span className="text-lg font-bold text-muted-foreground w-6">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.title || "Sem título"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.target_type === "mission" ? (
                    <Target className="h-3 w-3" />
                  ) : (
                    <MessageSquare className="h-3 w-3" />
                  )}
                  <span>{item.unique_users} pessoas</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.under_attack && (
                  <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-500">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    sob ataque
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {Math.round(item.score_sum)}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Trophy className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">
              Sinais de Utilidade
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Top da Semana</h1>
              <p className="text-muted-foreground text-sm">
                {primaryCell ? primaryCell.name : "Global"} • O que a galera está usando e
                compartilhando
              </p>
            </div>
            
            {/* Radio Button */}
            {radio.hasQueue && radio.ttsSupported && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 text-primary"
                onClick={handleStartRadio}
              >
                <Radio className="h-4 w-4 mr-1" />
                Ouvir
              </Button>
            )}
          </div>
        </div>

        {/* Radio Player */}
        {showRadio && radio.hasQueue && (
          <RadioPlayer
            currentItem={radio.currentItem}
            currentIndex={radio.currentIndex}
            totalItems={radio.queue.length}
            isPlaying={radio.isPlaying}
            isPaused={radio.isPaused}
            ttsSupported={radio.ttsSupported}
            onPlay={radio.play}
            onPause={radio.pause}
            onResume={radio.resume}
            onStop={() => {
              radio.stop();
              setShowRadio(false);
            }}
            onNext={radio.next}
            onPrev={radio.prev}
          />
        )}

        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium">
              Semana de {format(currentWeekStart, "dd MMM", { locale: ptBR })}
            </p>
            {weekOffset === 0 && (
              <Badge variant="secondary" className="text-xs mt-1">
                Esta semana
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
            disabled={weekOffset === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <FullPageLoader />
          </div>
        ) : (
          <div className="space-y-4">
            <TopList
              title="Mais Usados"
              icon={Repeat2}
              items={topData?.usei || []}
              color="text-green-500"
            />

            <TopList
              title="Mais Compartilhados"
              icon={Share2}
              items={topData?.compartilhei || []}
              color="text-blue-500"
            />

            <TopList
              title="Mais Puxados"
              icon={Users}
              items={topData?.puxo || []}
              color="text-purple-500"
            />

            {/* Coord Picks */}
            {topData?.coordPicks && topData.coordPicks.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4 text-primary" />
                    Escolha da Coordenação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topData.coordPicks.map((pick) => (
                    <Link
                      key={`${pick.target_type}-${pick.target_id}`}
                      to={
                        pick.target_type === "mission"
                          ? `/voluntario/missao/${pick.target_id}`
                          : `/voluntario/celula/${scopeId}/mural/${pick.target_id}`
                      }
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <Star className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {pick.title || "Sem título"}
                        </p>
                        {pick.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            "{pick.note}"
                          </p>
                        )}
                        {pick.picked_by && (
                          <p className="text-xs text-muted-foreground">
                            — {pick.picked_by}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

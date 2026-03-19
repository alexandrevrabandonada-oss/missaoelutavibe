import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useMissions } from "@/hooks/useMissions";
import { useCiclos } from "@/hooks/useCiclos";
import { useCycleMissions } from "@/hooks/useCycleMissions";
import { usePinnedAnuncio } from "@/hooks/usePinnedAnuncio";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { MissionCard } from "@/components/ui/MissionCard";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Home,
  Rocket,
  Target,
  Calendar,
  FileText,
  AlertCircle,
  Megaphone,
  ChevronDown,
  Search,
  Library,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUserCells } from "@/hooks/useUserCells";
import { getRecommendedMissions, getDailyRecommendations, CANONICAL_SLUGS } from "@/lib/missionRecommendation";
import { filterPilotMissions, isArchivedMission } from "@/lib/pilotMissionFilter";
import { usePilotMode } from "@/hooks/usePilotMode";
import { PilotBanner } from "@/components/pilot/PilotBanner";

export default function VoluntarioMissoes() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isLoading, hasAccess, isApproved } = useRequireApproval();
  const { activeCycle, isLoadingActive } = useCiclos();
  const { pinnedAnuncio } = usePinnedAnuncio(activeCycle?.id);
  const { userCells } = useUserCells();
  const { isPilotMode } = usePilotMode();
  const {
    activeMissions: cycleMissions,
    isLoading: cycleMissionsLoading,
  } = useCycleMissions(activeCycle?.id);

  // Get all missions by cycle (or fallback if no cycle)
  const {
    missions,
    fallbackMissions,
    currentMission,
    isLoading: missionsLoading,
    isLoadingCurrent,
    isLoadingFallback,
  } = useMissions(activeCycle?.id);

  const navigate = useNavigate();

  // Library state
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string | null>(null);

  // Debug mode for showing scores (only in dev)
  const [showDebugScores, setShowDebugScores] = useState(false);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (isApproved && profile && profile.onboarding_status !== "concluido") {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, isApproved, navigate]);

  const hasCycle = !!activeCycle;
  const hasCuratedMissions = cycleMissions.length > 0;
  const displayMissions = hasCycle ? missions : fallbackMissions;
  
  // Pilot mode: show canonical missions even without cycle
  const [showAllMissions, setShowAllMissions] = useState(false);

  // Get canonical fallback missions when no cycle/curated missions
  const canonicalFallbacks = useMemo(() => {
    if (hasCuratedMissions) return [];
    return (fallbackMissions || [])
      .filter(m => {
        const meta = m.meta_json as { canonical?: boolean; archived?: boolean } | null;
        return meta?.canonical === true && meta?.archived !== true && m.status === "publicada";
      });
  }, [fallbackMissions, hasCuratedMissions]);

  const hasPilotMissions = canonicalFallbacks.length > 0;
  const isPilotFallback = !hasCycle && hasPilotMissions;

  // Get completed mission IDs (for recommendation scoring)
  const completedMissionIds = useMemo(() => {
    const completed = new Set<string>();
    [...missions, ...fallbackMissions].forEach((m) => {
      if (m.status === "validada" || m.status === "concluida") {
        completed.add(m.id);
      }
    });
    return completed;
  }, [missions, fallbackMissions]);

  // Deterministic daily recommendations (stable across reloads)
  // Note: uses allAvailable and canonicalFallbacks which are defined below,
  // but useMemo defers execution so this is fine as long as deps are correct.
  const dailyRecs = useMemo(() => {
    if (!user?.id || !profile) return null;
    const pool = [
      ...(cycleMissions.length > 0 ? cycleMissions : []),
      ...displayMissions.filter(
        (m) => m.status === "publicada" && (!m.assigned_to || m.assigned_to === user?.id) && !isArchivedMission(m)
      ),
    ];
    // Dedupe
    const seen = new Set<string>();
    const deduped = pool.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    if (deduped.length === 0) return null;
    return getDailyRecommendations(deduped, profile, user.id, new Set(), completedMissionIds);
  }, [user?.id, profile, cycleMissions, displayMissions, completedMissionIds]);

  // All available (non-CRM, published) missions for the library
  // Pilot mode: filter to canonical + cycle only
  const cycleMissionIdSet = useMemo(() => new Set(cycleMissions.map(m => m.id)), [cycleMissions]);
  const allAvailable = useMemo(() => {
    let list = displayMissions.filter(
      (m) =>
        m.status === "publicada" &&
        (!m.assigned_to || m.assigned_to === user?.id) &&
        m.type !== "conversa" &&
        !isArchivedMission(m)
    );
    if (isPilotMode) {
      list = filterPilotMissions(list, cycleMissionIdSet, user?.id);
    }
    return list;
  }, [displayMissions, user?.id, isPilotMode, cycleMissionIdSet]);

  // Curated cycle missions (only published ones the user can see)
  const curatedAvailable = useMemo(() => {
    return cycleMissions.filter(
      (m) =>
        m.status === "publicada" &&
        (!m.assigned_to || m.assigned_to === user?.id) &&
        m.type !== "conversa" &&
        !isArchivedMission(m)
    );
  }, [cycleMissions, user?.id]);

  // Library = all available minus curated
  const curatedIds = new Set(curatedAvailable.map((m) => m.id));
  const libraryMissions = useMemo(() => {
    let list = allAvailable.filter((m) => !curatedIds.has(m.id));
    if (librarySearch) {
      const q = librarySearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q)
      );
    }
    if (libraryTypeFilter) {
      list = list.filter((m) => m.type === libraryTypeFilter);
    }
    return list;
  }, [allAvailable, curatedIds, librarySearch, libraryTypeFilter]);

  // Get unique types for filter
  const missionTypes = useMemo(() => {
    const types = new Set(allAvailable.map((m) => m.type));
    return Array.from(types);
  }, [allAvailable]);

  if (isLoading || profileLoading || missionsLoading || isLoadingCurrent || isLoadingActive || cycleMissionsLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {/* Pre-campaign Badge */}
      <PreCampaignBadge className="mb-4" />

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Pilot Banner */}
        <PilotBanner />
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Target className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Missões da Semana</span>
          </div>
          <h1 className="text-2xl font-bold">Suas Missões</h1>
          <p className="text-muted-foreground text-sm">
            Aceite missões e envie evidências
          </p>
          {import.meta.env.DEV && (
            <button
              onClick={() => setShowDebugScores((prev) => !prev)}
              className="text-xs text-muted-foreground mt-2 underline"
            >
              {showDebugScores ? "Ocultar scores" : "Mostrar scores"}
            </button>
          )}
        </div>

        {/* Active Cycle / Pilot Info */}
        {hasCycle ? (
          <div className="card-luta border-primary/50 bg-primary/5">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">Ciclo ativo: {activeCycle.titulo}</h3>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} –{" "}
                    {format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}
                  </Badge>
                </div>
                {pinnedAnuncio && (
                  <Link
                    to="/voluntario/semana"
                    className="flex items-center gap-2 mt-2 text-primary hover:underline text-sm"
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>Ver Semana Completa →</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : isPilotMode ? (
          <div className="card-luta border-primary/50 bg-primary/5">
            <div className="flex items-start gap-3">
              <Rocket className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-primary">Piloto ativo: missões recomendadas desta semana</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {canonicalFallbacks.length} missões essenciais para começar
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-luta border-muted bg-muted/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Sem ciclo ativo no seu território. Mostrando missões recentes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Mission */}
        {currentMission && (
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">
              Missão Atual
            </h2>
            <div onClick={() => navigate(`/voluntario/missao/${currentMission.id}`)} className="cursor-pointer">
              <MissionCard
                mission={currentMission}
                onAction={() => navigate(`/voluntario/missao/${currentMission.id}`)}
                actionLabel="Ver Detalhes"
              />
              {currentMission.demanda_origem_id && (
                <div className="mt-2 card-luta border-green-500/30 bg-green-500/5 py-2">
                  <Link
                    to={`/voluntario/demandas/${currentMission.demanda_origem_id}`}
                    className="flex items-center gap-2 text-green-600 hover:underline text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Origem: Demanda da Base →</span>
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* === Deterministic Daily Picks: 1 today + 2 recommended === */}
        {dailyRecs?.todayMission && !currentMission && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider font-bold text-primary mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Pra Você Hoje
            </h2>
            {/* Today's Mission */}
            <button
              onClick={() => navigate(`/voluntario/runner/${dailyRecs.todayMission!.id}`)}
              className="card-luta w-full text-left hover:bg-primary/5 border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary mt-0.5">
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary/20 text-primary text-xs">Missão do dia</Badge>
                  </div>
                  <h3 className="font-bold">{dailyRecs.todayMission.title}</h3>
                  {dailyRecs.todayMission.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {dailyRecs.todayMission.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                      {dailyRecs.todayMission.type}
                    </span>
                    {dailyRecs.todayMission.points && (
                      <span className="text-primary font-bold">+{dailyRecs.todayMission.points} pts</span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* 2 Recommended */}
            {dailyRecs.recommended.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/voluntario/missao/${m.id}`)}
                className="card-luta w-full text-left hover:bg-secondary/80 transition-colors py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-secondary rounded-full text-xs">{m.type}</span>
                  <span className="font-medium text-sm truncate flex-1">{m.title}</span>
                  {m.points && (
                    <span className="text-xs text-primary font-bold">+{m.points} pts</span>
                  )}
                </div>
              </button>
            ))}
          </section>
        )}

        {hasCuratedMissions ? (
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              No Ciclo — Semana Atual
              <Badge variant="outline" className="text-xs ml-auto">
                {curatedAvailable.length} missões
              </Badge>
            </h2>

            {curatedAvailable.length > 0 ? (
              <div className="space-y-3">
                {curatedAvailable.slice(0, showAllMissions ? undefined : 3).map((mission) => (
                  <button
                    key={mission.id}
                    onClick={() => navigate(`/voluntario/missao/${mission.id}`)}
                    className="card-luta w-full text-left hover:bg-primary/5 border-primary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">{mission.title}</h3>
                        {mission.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {mission.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                            {mission.type}
                          </span>
                          {mission.points && (
                            <span className="text-primary font-bold">+{mission.points} pts</span>
                          )}
                          {mission.demanda_origem_id && (
                            <Badge variant="outline" className="text-green-600 border-green-500/50">
                              <FileText className="h-3 w-3 mr-1" />
                              Da Base
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {curatedAvailable.length > 3 && !showAllMissions && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllMissions(true)}
                  >
                    Ver mais ({curatedAvailable.length - 3} restantes)
                  </Button>
                )}
                {showAllMissions && (
                  <p className="text-xs text-muted-foreground text-center py-2 px-4 bg-muted/50 rounded-lg">
                    🚀 Piloto: foque nas recomendadas desta semana para manter o ritmo.
                  </p>
                )}
              </div>
            ) : (
              <div className="card-luta text-center py-6">
                <p className="text-muted-foreground text-sm">
                  Nenhuma missão disponível no momento
                </p>
              </div>
            )}
          </section>
        ) : isPilotMode ? (
          /* Pilot mode: show canonical missions with 3-item limit */
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Missões Recomendadas
              <Badge variant="outline" className="text-xs ml-auto">
                {canonicalFallbacks.length} missões
              </Badge>
            </h2>
            <div className="space-y-3">
              {canonicalFallbacks.slice(0, showAllMissions ? undefined : 3).map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => navigate(`/voluntario/missao/${mission.id}`)}
                  className="card-luta w-full text-left hover:bg-primary/5 border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">{mission.title}</h3>
                      {mission.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {mission.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                          {mission.type}
                        </span>
                        {mission.points && (
                          <span className="text-primary font-bold">+{mission.points} pts</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {canonicalFallbacks.length > 3 && !showAllMissions && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAllMissions(true)}
                >
                  Ver mais ({canonicalFallbacks.length - 3} restantes)
                </Button>
              )}
              {showAllMissions && (
                <p className="text-xs text-muted-foreground text-center py-2 px-4 bg-muted/50 rounded-lg">
                  🚀 Piloto: foque nas recomendadas desta semana para manter o ritmo.
                </p>
              )}
            </div>
          </section>
        ) : (
          /* No cycle, no canonical — show all available */
          <section>
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">
              Missões Disponíveis
            </h2>
            {isLoadingFallback ? (
              <div className="card-luta text-center py-6">
                <p className="text-muted-foreground text-sm">Carregando...</p>
              </div>
            ) : allAvailable.length > 0 ? (
              <div className="space-y-3">
                {allAvailable.slice(0, showAllMissions ? undefined : 3).map((mission) => (
                  <button
                    key={mission.id}
                    onClick={() => navigate(`/voluntario/missao/${mission.id}`)}
                    className="card-luta w-full text-left hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">{mission.title}</h3>
                        {mission.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {mission.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="px-2 py-1 bg-secondary rounded-full">{mission.type}</span>
                          {mission.points && (
                            <span className="text-primary font-bold">+{mission.points} pts</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {allAvailable.length > 3 && !showAllMissions && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllMissions(true)}
                  >
                    Ver mais ({allAvailable.length - 3} restantes)
                  </Button>
                )}
              </div>
            ) : (
              <div className="card-luta text-center py-6">
                <p className="text-muted-foreground text-sm">Nenhuma missão disponível no momento</p>
              </div>
            )}
          </section>
        )}

        {/* === SECTION 2: "Biblioteca" — always hidden during pilot mode === */}
        {hasCuratedMissions && !isPilotMode && (
          <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full py-3 text-sm uppercase tracking-wider font-bold text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  Biblioteca
                  <Badge variant="secondary" className="text-xs">
                    {libraryMissions.length}
                  </Badge>
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${libraryOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3">
              {/* Search + filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar missão..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Type filter chips */}
              {missionTypes.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setLibraryTypeFilter(null)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      !libraryTypeFilter
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    Todos
                  </button>
                  {missionTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setLibraryTypeFilter(type === libraryTypeFilter ? null : type)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        libraryTypeFilter === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              {/* Mission list */}
              {libraryMissions.length > 0 ? (
                <div className="space-y-2">
                  {libraryMissions.map((mission) => (
                    <button
                      key={mission.id}
                      onClick={() => navigate(`/voluntario/missao/${mission.id}`)}
                      className="card-luta w-full text-left hover:bg-secondary/80 transition-colors py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{mission.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-secondary rounded-full">{mission.type}</span>
                            {mission.points && (
                              <span className="text-primary font-bold">+{mission.points} pts</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {librarySearch || libraryTypeFilter
                    ? "Nenhuma missão encontrada com esses filtros"
                    : "Nenhuma missão adicional disponível"}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Signature */}
      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}

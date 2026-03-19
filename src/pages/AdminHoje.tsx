import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  Target,
  Users,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Phone,
  Sparkles,
} from "lucide-react";
import {
  useCheckinMetrics,
  useTodayCheckins,
  useTodayTravas,
  DISPONIBILIDADE_OPTIONS,
  FOCO_TIPO_LABELS,
} from "@/hooks/useCadencia";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function AdminHoje() {
  const { getScope, isCoordinator } = useUserRoles();
  const userScope = getScope();
  
  // Map regiao to cidade for scope type
  const effectiveScopeType = userScope.type === "none" || userScope.type === "regiao" ? "all" : userScope.type;
  
  const [scopeType] = useState<"all" | "cidade" | "celula">(effectiveScopeType);
  const [scopeCidade] = useState(userScope.cidade);
  const [scopeCelulaId] = useState(userScope.cellId);

  const { metrics, isLoading: loadingMetrics } = useCheckinMetrics(
    scopeType,
    scopeCidade,
    scopeCelulaId
  );
  const { checkins, isLoading: loadingCheckins } = useTodayCheckins(
    scopeType,
    scopeCidade,
    scopeCelulaId
  );
  const { travas, isLoading: loadingTravas } = useTodayTravas(
    scopeType,
    scopeCidade,
    scopeCelulaId
  );

  const today = new Date();

  if (!isCoordinator()) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto p-4">
          <p className="text-muted-foreground">Acesso restrito a coordenadores.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/ops">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ops
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Atividade Hoje
            </h1>
            <p className="text-muted-foreground">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Metrics Cards */}
        {loadingMetrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.checkins_hoje || 0}</p>
                    <p className="text-sm text-muted-foreground">Check-ins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CRM and Task metrics hidden in V1 Canonical */}
            {/*
            <Card>
              <CardContent className="pt-6">
                ...
              </CardContent>
            </Card>
            */}

            <Card className={metrics?.travas_hoje ? "border-destructive" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.travas_hoje || 0}</p>
                    <p className="text-sm text-muted-foreground">Bloqueios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Focus Distribution */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Foco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">Missões: {metrics.com_foco_mission}</span>
                </div>
                {/* Other focuses hidden in V1 Canonical */}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: All Check-ins vs Blockers */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              Todos os Check-ins ({checkins?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="travas" className="relative">
              Bloqueios ({travas?.length || 0})
              {travas && travas.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {loadingCheckins ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : checkins && checkins.length > 0 ? (
              <div className="space-y-3">
                {checkins.map((checkin) => (
                  <Card key={checkin.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={checkin.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {checkin.profiles?.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {checkin.profiles?.full_name || "Voluntário"}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {DISPONIBILIDADE_OPTIONS.find((o) => o.value === checkin.disponibilidade)?.label}
                            </span>
                            {checkin.profiles?.city && (
                              <span>{checkin.profiles.city}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {checkin.foco_tipo !== "none" && (
                            <Badge variant="secondary">
                              {FOCO_TIPO_LABELS[checkin.foco_tipo]}
                            </Badge>
                          )}
                          {checkin.trava_texto && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Bloqueio
                            </Badge>
                          )}
                        </div>
                      </div>
                      {checkin.trava_texto && (
                        <div className="mt-3 p-3 bg-destructive/10 rounded-lg text-sm">
                          <p className="text-muted-foreground">{checkin.trava_texto}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhum check-in registrado hoje.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="travas" className="mt-4">
            {loadingTravas ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : travas && travas.length > 0 ? (
              <div className="space-y-3">
                {travas.map((checkin) => (
                  <Card key={checkin.id} className="border-destructive">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={checkin.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {checkin.profiles?.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">
                              {checkin.profiles?.full_name || "Voluntário"}
                            </p>
                            {checkin.profiles?.city && (
                              <Badge variant="outline" className="text-xs">
                                {checkin.profiles.city}
                              </Badge>
                            )}
                          </div>
                          <div className="p-3 bg-destructive/10 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                              <p className="text-sm">{checkin.trava_texto}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Reportado às {format(new Date(checkin.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                  <p>Nenhum bloqueio reportado hoje! 🎉</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

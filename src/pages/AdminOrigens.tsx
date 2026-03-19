import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useConviteStats, 
  useAdminConvites, 
  useOriginFunnel,
  useInviteChain,
  CANAIS 
} from "@/hooks/useConvites";
import { useUserRoles } from "@/hooks/useUserRoles";
import { 
  ArrowLeft, 
  Users, 
  Link2, 
  TrendingUp, 
  Search, 
  CheckCircle, 
  XCircle, 
  Sparkles,
  GitBranch,
  Trophy,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminOrigens() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("convites");
  const [search, setSearch] = useState("");
  const [filterCanal, setFilterCanal] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [chainSearch, setChainSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const { data: stats, isLoading: statsLoading } = useConviteStats();
  const { convitesComUsos, isLoading: convitesLoading } = useAdminConvites();
  const { data: funnel, isLoading: funnelLoading } = useOriginFunnel();
  const { data: chainData, isLoading: chainLoading } = useInviteChain(selectedUserId || undefined);
  const { isAdmin } = useUserRoles();

  // Filter convites
  const filteredConvites = convitesComUsos.filter((convite) => {
    const matchesSearch = convite.code.toLowerCase().includes(search.toLowerCase());
    const matchesCanal = filterCanal === "all" || convite.canal_declarado === filterCanal;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "ativo" && convite.ativo) || 
      (filterStatus === "inativo" && !convite.ativo);
    return matchesSearch && matchesCanal && matchesStatus;
  });

  // Group by city for top cities
  const topCities = convitesComUsos.reduce((acc, convite) => {
    const city = convite.escopo_cidade || "Sem cidade";
    if (!acc[city]) acc[city] = { total: 0, usos: 0 };
    acc[city].total++;
    acc[city].usos += convite.total_usos;
    return acc;
  }, {} as Record<string, { total: number; usos: number }>);

  const topCitiesList = Object.entries(topCities)
    .sort((a, b) => b[1].usos - a[1].usos)
    .slice(0, 5);

  const getCanalLabel = (value: string) => {
    return CANAIS.find(c => c.value === value)?.label || value;
  };

  // Calculate funnel percentages
  const getFunnelPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <AppShell>
      <div className="p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Origens & Convites</h1>
              <p className="text-muted-foreground text-sm">
                Rastreamento de origem e cadeias de convite
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/coordenador/hoje")}>
            Ir para Coordenação
          </Button>
        </div>

        {/* Pre-campaign Banner */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">Modo Pré-Campanha Ativo</span>
            </div>
            <Badge variant="outline" className="bg-background">
              Rastreamento A→B→C ativado
            </Badge>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="convites" className="text-xs sm:text-sm">
              <Link2 className="h-4 w-4 mr-1" />
              Convites
            </TabsTrigger>
            <TabsTrigger value="funil" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              Funil
            </TabsTrigger>
            <TabsTrigger value="cadeias" className="text-xs sm:text-sm">
              <GitBranch className="h-4 w-4 mr-1" />
              Cadeias
            </TabsTrigger>
          </TabsList>

          {/* Convites Tab */}
          <TabsContent value="convites" className="space-y-4 mt-4">
            {/* Stats Cards */}
            {!statsLoading && stats && (
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Convites</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total_convites}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Usos</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total_usos}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Via Convite</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-green-600">{stats.cadastros_com_convite}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Orgânico</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.cadastros_sem_convite}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Cities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Cidades</CardTitle>
                <CardDescription>Por convites utilizados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {topCitiesList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados ainda</p>
                ) : (
                  topCitiesList.map(([city, data], index) => (
                    <div key={city} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                        <span className="text-sm">{city}</span>
                      </div>
                      <Badge variant="secondary">{data.usos} usos</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCanal} onValueChange={setFilterCanal}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos canais</SelectItem>
                  {CANAIS.map((canal) => (
                    <SelectItem key={canal.value} value={canal.value}>
                      {canal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Convites Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Convites</CardTitle>
                <CardDescription>{filteredConvites.length} convites encontrados</CardDescription>
              </CardHeader>
              <CardContent>
                {convitesLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                ) : filteredConvites.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum convite encontrado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Usos</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Criado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConvites.slice(0, 50).map((convite) => (
                          <TableRow key={convite.id}>
                            <TableCell>
                              <code className="bg-secondary px-2 py-0.5 rounded text-xs">
                                {convite.code}
                              </code>
                            </TableCell>
                            <TableCell className="text-sm">
                              {convite.canal_declarado ? getCanalLabel(convite.canal_declarado) : "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {convite.escopo_cidade || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {convite.total_usos}
                                {convite.limite_uso ? ` / ${convite.limite_uso}` : ""}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {convite.ativo ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(convite.criado_em), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funil Tab */}
          <TabsContent value="funil" className="space-y-4 mt-4">
            {funnelLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando métricas...</div>
            ) : funnel ? (
              <>
                {/* 7-Day Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Últimos 7 dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-secondary/50 rounded-lg">
                        <p className="text-2xl font-bold">{funnel.convites_7d}</p>
                        <p className="text-xs text-muted-foreground">Convites criados</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-lg">
                        <p className="text-2xl font-bold">{funnel.cadastros_7d}</p>
                        <p className="text-xs text-muted-foreground">Cadastros</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{funnel.cadastros_com_convite_7d}</p>
                        <p className="text-xs text-muted-foreground">Via convite</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{funnel.aprovados_7d}</p>
                        <p className="text-xs text-muted-foreground">Aprovados</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/50 rounded-lg">
                        <p className="text-2xl font-bold">{funnel.ativos_7d}</p>
                        <p className="text-xs text-muted-foreground">Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Funil de Conversão (Total)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Convites criados</span>
                        <span className="font-medium">{funnel.funil.total_convites}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary/30 w-full" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mx-2">
                        {getFunnelPercentage(funnel.funil.convites_usados, funnel.funil.total_convites)}% usados
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cadastros com origem</span>
                        <span className="font-medium">{funnel.funil.com_origem}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary/50" 
                          style={{ width: `${getFunnelPercentage(funnel.funil.com_origem, funnel.funil.total_cadastros)}%` }} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mx-2">
                        {getFunnelPercentage(funnel.funil.aprovados, funnel.funil.com_origem)}% aprovados
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Voluntários aprovados</span>
                        <span className="font-medium text-green-600">{funnel.funil.aprovados}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${getFunnelPercentage(funnel.funil.aprovados, funnel.funil.total_cadastros)}%` }} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Channels breakdown */}
                {funnel.por_canal_30d && Object.keys(funnel.por_canal_30d).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Cadastros por Canal (30d)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(funnel.por_canal_30d)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([canal, count]) => (
                          <div key={canal} className="flex items-center justify-between">
                            <span className="text-sm">{getCanalLabel(canal)}</span>
                            <Badge variant="secondary">{count as number}</Badge>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}

                {/* Top Referrers */}
                {funnel.top_referrers_30d && funnel.top_referrers_30d.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Top Indicadores (30d)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Indicações</TableHead>
                            <TableHead>Aprovados</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {funnel.top_referrers_30d.map((referrer, index) => (
                            <TableRow key={referrer.user_id}>
                              <TableCell className="font-medium">
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                              </TableCell>
                              <TableCell>{referrer.user_name || "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {referrer.user_city || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge>{referrer.total_referrals}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-green-600">
                                  {referrer.aprovados}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Sem dados de funil disponíveis
              </div>
            )}
          </TabsContent>

          {/* Cadeias Tab */}
          <TabsContent value="cadeias" className="space-y-4 mt-4">
            {/* Search for chain */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Buscar Cadeia de Convite
                </CardTitle>
                <CardDescription>
                  Digite o ID do usuário para ver sua cadeia A→B→C
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="ID do usuário (UUID)"
                    value={chainSearch}
                    onChange={(e) => setChainSearch(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button 
                    onClick={() => setSelectedUserId(chainSearch)}
                    disabled={!chainSearch || chainSearch.length < 36}
                  >
                    Buscar
                  </Button>
                </div>

                {chainLoading && (
                  <div className="py-4 text-center text-muted-foreground">
                    Carregando cadeia...
                  </div>
                )}

                {selectedUserId && chainData && chainData.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Cadeia de convite:</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {chainData.map((member, index) => (
                        <div key={member.user_id} className="flex items-center gap-2">
                          <div className={`px-3 py-2 rounded-lg ${index === 0 ? 'bg-primary/20 border border-primary/30' : 'bg-secondary'}`}>
                            <p className="text-sm font-medium">{member.user_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.user_city || "—"}
                              {member.invite_channel && ` • ${getCanalLabel(member.invite_channel)}`}
                            </p>
                          </div>
                          {index < chainData.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Profundidade da cadeia: {chainData.length - 1} nível(is)
                    </p>
                  </div>
                )}

                {selectedUserId && chainData && chainData.length === 0 && (
                  <div className="py-4 text-center text-muted-foreground">
                    Usuário não encontrado ou sem cadeia de convite
                  </div>
                )}

                {selectedUserId && !chainData && !chainLoading && (
                  <div className="py-4 text-center text-muted-foreground">
                    Nenhum dado encontrado para este usuário
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <GitBranch className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Como funciona a cadeia A→B→C</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quando A convida B, e B convida C, a cadeia registra essa relação.
                      Isso permite rastrear a origem de cada voluntário até 10 níveis de profundidade.
                      Útil para identificar os melhores "multiplicadores" da rede.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Admin-only note */}
        {isAdmin() && (
          <p className="text-xs text-center text-muted-foreground">
            Como Admin, você visualiza a cadeia completa de convites A→B→C
          </p>
        )}
      </div>
    </AppShell>
  );
}

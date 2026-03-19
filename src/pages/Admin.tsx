/**
 * Admin - Main admin panel
 * 
 * Reorganized navigation: 5 main sections instead of 12 tabs.
 * Dashboard | Validar | Base | Comunicação | Sistema
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useDemandas } from "@/hooks/useDemandas";
import { useTickets } from "@/hooks/useTickets";
import { useNavTracking } from "@/hooks/useNavTracking";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  ClipboardCheck, 
  MapPin, 
  LogOut,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Home,
  Plus,
  MessageSquare,
  Inbox,
  Eye,
  Settings,
  FolderOpen,
  GraduationCap,
  Beaker,
  Megaphone,
  Database,
  Radio,
  Shield,
  FileText,
} from "lucide-react";

// Sub-panels (will be rendered inline)
import AdminValidarPanelWithFilters from "@/components/admin/AdminValidarPanelWithFilters";
import AdminMissoesPanel from "@/components/admin/AdminMissoesPanel";
import AdminVoluntariosPanel from "@/components/admin/AdminVoluntariosPanel";
import AdminCelulasPanel from "@/components/admin/AdminCelulasPanel";
import AdminDemandasPanel from "@/components/admin/AdminDemandasPanel";
import AdminMateriaisPanel from "@/components/admin/AdminMateriaisPanel";
import AdminFormacaoPanel from "@/components/admin/AdminFormacaoPanel";
import AdminBetaModePanel from "@/components/admin/AdminBetaModePanel";
import AdminSetupPanel from "@/components/admin/AdminSetupPanel";
import { CycleCard } from "@/components/admin/CycleCard";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { useAdminBootstrap } from "@/hooks/useAdminBootstrap";
import { QuickFunnelCard } from "@/components/admin/QuickFunnelCard";
import { FullFunnelCard } from "@/components/admin/FullFunnelCard";
import { TopReferrersCard } from "@/components/admin/TopReferrersCard";

// Section types for reorganized navigation
type AdminSection = "dashboard" | "validar" | "base" | "comunicacao" | "sistema";
type SubSection = string;

export default function Admin() {
  const { signOut } = useAuth();
  const { isCoordinator, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { stats, isLoading: statsLoading, refetch } = useAdminStats();
  const { demandasCount } = useDemandas();
  const { openCount: openTickets } = useTickets();
  const { trackNavClick } = useNavTracking();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [activeSubSection, setActiveSubSection] = useState<SubSection>("overview");
  const { needsBootstrap, isLoading: bootstrapLoading } = useAdminBootstrap();

  if (rolesLoading || statsLoading || bootstrapLoading) {
    return <FullPageLoader text="Carregando painel..." />;
  }

  // If no admin configured, show setup panel regardless of coordinator status
  if (needsBootstrap) {
    return (
      <div className="min-h-screen flex flex-col bg-background texture-concrete">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
              <Home className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 max-w-md mx-auto w-full">
          <div className="space-y-6 animate-slide-up">
            <div>
              <h1 className="text-2xl font-bold">Configuração do Sistema</h1>
              <p className="text-muted-foreground">
                Configure o primeiro administrador para começar.
              </p>
            </div>
            <AdminSetupPanel />
          </div>
        </main>
      </div>
    );
  }

  if (!isCoordinator()) {
    // RBAC: block non-coordinators and redirect with notice
    navigate("/voluntario/hoje", { replace: true });
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSectionChange = (section: AdminSection) => {
    trackNavClick({ role: "admin", item: section });
    setActiveSection(section);
    // Reset sub-section when changing main section
    if (section === "base") setActiveSubSection("voluntarios");
    else if (section === "comunicacao") setActiveSubSection("anuncios");
    else if (section === "sistema") setActiveSubSection("coord");
    else setActiveSubSection("overview");
  };

  // Grouped menu items (5 sections instead of 12)
  const mainSections = [
    { 
      id: "dashboard" as AdminSection, 
      icon: LayoutDashboard, 
      label: "Dashboard",
    },
    { 
      id: "validar" as AdminSection, 
      icon: ClipboardCheck, 
      label: "Validar", 
      count: (stats?.pendingEvidences || 0) + (stats?.pendingVolunteers || 0),
      highlight: true,
    },
    { 
      id: "base" as AdminSection, 
      icon: Database, 
      label: "Base",
    },
    { 
      id: "comunicacao" as AdminSection, 
      icon: Radio, 
      label: "Comunicação",
    },
    ...(isAdmin() ? [{ 
      id: "sistema" as AdminSection, 
      icon: Settings, 
      label: "Sistema",
    }] : []),
  ];

  // Sub-sections for each main section
  const subSections: Record<AdminSection, { id: string; label: string; icon: React.ElementType }[]> = {
    dashboard: [],
    validar: [
      { id: "evidencias", label: "Evidências", icon: ClipboardCheck },
      { id: "cadastros", label: "Cadastros", icon: Users },
    ],
    base: [
      { id: "voluntarios", label: "Voluntários", icon: Users },
      { id: "celulas", label: "Células", icon: MapPin },
      { id: "missoes", label: "Missões", icon: Target },
      { id: "demandas", label: "Demandas", icon: MessageSquare },
      { id: "inbox", label: "Inbox", icon: Inbox },
    ],
    comunicacao: [
      { id: "anuncios", label: "Anúncios", icon: Megaphone },
      { id: "materiais", label: "Materiais", icon: FolderOpen },
      { id: "formacao", label: "Formação", icon: GraduationCap },
      { id: "roteiros", label: "Roteiros", icon: FileText },
    ],
    sistema: [
      { id: "coord", label: "Coordenação", icon: Target },
      { id: "roles", label: "Papéis/RBAC", icon: Shield },
      { id: "lgpd", label: "LGPD", icon: Shield },
      { id: "setup", label: "Setup", icon: Settings },
      { id: "beta", label: "Beta", icon: Beaker },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            {isAdmin() && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                Admin
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {/* Coordination shortcut - visible for coordinators */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/coordenador/hoje")}
              className="hidden sm:flex"
            >
              <Target className="h-4 w-4 mr-2" />
              Coordenação
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/coordenador/hoje")}
              className="sm:hidden"
              title="Coordenação"
            >
              <Target className="h-5 w-5" />
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Navigation - 5 sections */}
      <div className="sticky top-[73px] z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex gap-1 p-2 overflow-x-auto">
          {mainSections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "ghost"}
              size="sm"
              onClick={() => handleSectionChange(section.id)}
              className="flex items-center gap-2 shrink-0"
            >
              <section.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{section.label}</span>
              {section.count !== undefined && section.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  section.highlight ? "bg-destructive text-destructive-foreground" : "bg-muted"
                }`}>
                  {section.count}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Sub-navigation for sections with sub-items */}
      {subSections[activeSection].length > 0 && (
        <div className="bg-muted/50 border-b border-border px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {subSections[activeSection].map((sub) => (
              <Button
                key={sub.id}
                variant={activeSubSection === sub.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  trackNavClick({ role: "admin", item: sub.id, section: activeSection });
                  setActiveSubSection(sub.id);
                }}
                className="text-xs shrink-0"
              >
                <sub.icon className="h-3 w-3 mr-1" />
                {sub.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4">
        {/* Dashboard */}
        {activeSection === "dashboard" && (
          <DashboardPanel 
            stats={stats} 
            refetch={refetch} 
            onNavigate={(section, sub) => {
              handleSectionChange(section as AdminSection);
              if (sub) setActiveSubSection(sub);
            }} 
            demandasCount={demandasCount} 
          />
        )}

        {/* Validar Section */}
        {activeSection === "validar" && (
          <>
            {activeSubSection === "evidencias" && <AdminValidarPanelWithFilters />}
            {activeSubSection === "cadastros" && <AdminVoluntariosPanel />}
          </>
        )}

        {/* Base Section */}
        {activeSection === "base" && (
          <>
            {activeSubSection === "voluntarios" && <AdminVoluntariosPanel />}
            {activeSubSection === "celulas" && <AdminCelulasPanel />}
            {activeSubSection === "missoes" && <AdminMissoesPanel />}
            {activeSubSection === "demandas" && <AdminDemandasPanel />}
            {activeSubSection === "inbox" && (
              <div className="text-center py-8">
                <Button onClick={() => navigate("/admin/inbox")} className="btn-luta">
                  <Inbox className="h-4 w-4 mr-2" />
                  Abrir Inbox Completo
                </Button>
              </div>
            )}
          </>
        )}

        {/* Comunicação Section */}
        {activeSection === "comunicacao" && (
          <>
            {activeSubSection === "anuncios" && (
              <div className="text-center py-8">
                <Button onClick={() => navigate("/admin/anuncios")} className="btn-luta">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Abrir Anúncios
                </Button>
              </div>
            )}
            {activeSubSection === "materiais" && <AdminMateriaisPanel />}
            {activeSubSection === "formacao" && <AdminFormacaoPanel />}
            {activeSubSection === "roteiros" && (
              <div className="text-center py-8">
                <Button onClick={() => navigate("/admin/roteiros")} className="btn-luta">
                  <FileText className="h-4 w-4 mr-2" />
                  Abrir Roteiros
                </Button>
              </div>
            )}
          </>
        )}

        {/* Sistema Section (Admin only) */}
        {activeSection === "sistema" && isAdmin() && (
          <>
            {activeSubSection === "coord" && (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  O painel de coordenação agora está unificado em uma única tela.
                </p>
                <Button onClick={() => navigate("/coordenador/hoje")} className="btn-luta">
                  <Target className="h-4 w-4 mr-2" />
                  Abrir Coordenação
                </Button>
              </div>
            )}
            {activeSubSection === "roles" && (
              <div className="text-center py-8">
                <Button onClick={() => navigate("/admin/roles")} className="btn-luta">
                  <Shield className="h-4 w-4 mr-2" />
                  Gerenciar Papéis
                </Button>
              </div>
            )}
            {activeSubSection === "lgpd" && (
              <div className="text-center py-8">
                <Button onClick={() => navigate("/admin/lgpd")} className="btn-luta">
                  <Shield className="h-4 w-4 mr-2" />
                  Abrir LGPD
                </Button>
              </div>
            )}
            {activeSubSection === "setup" && <AdminSetupPanel />}
            {activeSubSection === "beta" && <AdminBetaModePanel />}
          </>
        )}
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}

function DashboardPanel({ 
  stats, 
  refetch,
  onNavigate,
  demandasCount,
}: { 
  stats: any; 
  refetch: () => void;
  onNavigate: (section: string, sub?: string) => void;
  demandasCount: { novas: number; triagem: number; emAndamento: number; pendentes: number };
}) {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Title */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Painel de Coordenação</span>
          </div>
          <h1 className="text-3xl font-bold">Visão Geral</h1>
        </div>
        <PreCampaignBadge />
      </div>

      {/* Cycle Card */}
      <CycleCard />

      {/* Quick Funnel Card */}
      <QuickFunnelCard />

      {/* Full Funnel Card */}
      <FullFunnelCard />

      {/* Top Referrers Ranking */}
      <TopReferrersCard />

      {/* Pending Volunteers Alert */}
      {stats?.pendingVolunteers && stats.pendingVolunteers > 0 && (
        <div className="card-luta border-primary/50 bg-primary/10">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">
                {stats.pendingVolunteers} cadastro{stats.pendingVolunteers > 1 ? "s" : ""} aguardando aprovação
              </p>
              <p className="text-sm text-muted-foreground">
                Aprove para liberar o acesso dos voluntários
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate("validar", "cadastros")}>
              <Eye className="h-4 w-4 mr-1" />
              Revisar
            </Button>
          </div>
        </div>
      )}

      {/* Pending Evidences Alert */}
      {stats?.pendingEvidences && stats.pendingEvidences > 0 && (
        <div className="card-luta border-primary/50 bg-primary/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">
                {stats.pendingEvidences} evidência{stats.pendingEvidences > 1 ? "s" : ""} aguardando validação
              </p>
              <p className="text-sm text-muted-foreground">
                Revise para liberar o próximo passo dos voluntários
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate("validar", "evidencias")}>
              <Eye className="h-4 w-4 mr-1" />
              Validar
            </Button>
          </div>
        </div>
      )}

      {/* Demandas Alert */}
      {demandasCount.pendentes > 0 && (
        <div className="card-luta border-primary/50 bg-primary/10">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">
                {demandasCount.pendentes} demanda{demandasCount.pendentes > 1 ? "s" : ""} aguardando triagem
              </p>
              <p className="text-sm text-muted-foreground">
                {demandasCount.novas} novas, {demandasCount.triagem} em triagem
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate("base", "demandas")}>
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={Users}
          label="Voluntários Ativos"
          value={stats?.activeUsers ?? 0}
          subtext={`${stats?.newUsersThisWeek ?? 0} novos esta semana`}
          onClick={() => onNavigate("base", "voluntarios")}
        />
        <StatCard
          icon={Target}
          label="Missões"
          value={stats?.totalMissions ?? 0}
          subtext={`${stats?.missionsThisWeek ?? 0} esta semana`}
          onClick={() => onNavigate("base", "missoes")}
        />
        <StatCard
          icon={MessageSquare}
          label="Demandas Novas"
          value={demandasCount.novas}
          subtext={`${demandasCount.emAndamento} em andamento`}
          onClick={() => onNavigate("base", "demandas")}
        />
        <StatCard
          icon={CheckCircle2}
          label="Taxa de Conclusão"
          value={`${stats?.completionRate ?? 0}%`}
          subtext="Missões concluídas"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => onNavigate("base", "missoes")}
          >
            <Plus className="h-5 w-5 text-primary" />
            <span>Nova Missão</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => onNavigate("base", "celulas")}
          >
            <MapPin className="h-5 w-5 text-primary" />
            <span>Nova Célula</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2 col-span-2"
            onClick={() => onNavigate("validar", "evidencias")}
          >
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span>Validar Evidências ({stats?.pendingEvidences ?? 0} pendentes)</span>
          </Button>
        </div>
      </div>

      {/* Cells Overview */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Células Ativas
        </h2>
        <div className="card-luta">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black">{stats?.totalCells ?? 0}</p>
              <p className="text-sm text-muted-foreground">células em operação</p>
            </div>
            <Button variant="ghost" onClick={() => onNavigate("base", "celulas")}>
              Ver todas →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  onClick
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className={`card-luta ${onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

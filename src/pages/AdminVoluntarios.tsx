import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads, LeadProfile, IntegrationStatus, INTEGRATION_LABELS } from "@/hooks/useLeads";
import { useCells } from "@/hooks/useCells";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle2,
  MapPin,
  Calendar,
  ArrowLeft,
  RefreshCw,
  Home,
  LogOut,
  Eye,
  Filter,
  UserPlus,
  Phone,
  UserCheck,
} from "lucide-react";

// Using existing onboarding_status enum: pendente = Novo, em_andamento = Contatado, concluido = Integrado
const INTEGRATION_STATUS_OPTIONS: { value: IntegrationStatus; label: string; color: string }[] = [
  { value: "pendente", label: "Novo", color: "bg-blue-500/20 text-blue-600 border-blue-500/50" },
  { value: "em_andamento", label: "Contatado", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/50" },
  { value: "concluido", label: "Integrado", color: "bg-green-500/20 text-green-600 border-green-500/50" },
];

export default function AdminVoluntarios() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isCoordinator, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { approvedLeads, isApprovedLoading, counts, updateIntegration, isUpdatingIntegration, refetchApproved, refetchCounts } = useLeads();
  const { cells } = useCells();

  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [integrationFilter, setIntegrationFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Get unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities = approvedLeads
      .map(lead => lead.city)
      .filter((city): city is string => !!city);
    return [...new Set(cities)].sort();
  }, [approvedLeads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let result = approvedLeads;
    
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(lead => 
        lead.full_name?.toLowerCase().includes(term) ||
        lead.city?.toLowerCase().includes(term) ||
        lead.neighborhood?.toLowerCase().includes(term)
      );
    }
    
    // City filter
    if (cityFilter && cityFilter !== "all") {
      result = result.filter(lead => lead.city === cityFilter);
    }
    
    // Integration status filter
    if (integrationFilter && integrationFilter !== "all") {
      result = result.filter(lead => lead.onboarding_status === integrationFilter);
    }
    
    return result;
  }, [approvedLeads, searchTerm, cityFilter, integrationFilter]);

  if (rolesLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!isCoordinator()) {
    navigate("/voluntario");
    return null;
  }

  const handleViewDetails = (lead: LeadProfile) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleUpdateIntegration = async (leadId: string, status: IntegrationStatus) => {
    try {
      await updateIntegration({ userId: leadId, status });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => {
    refetchApproved();
    refetchCounts();
    toast.success("Dados atualizados!");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatInterests = (interests: string[] | null) => {
    if (!interests || interests.length === 0) return [];
    return interests;
  };

  const formatAvailability = (availability: string[] | null) => {
    if (!availability || availability.length === 0) return [];
    const labels: Record<string, string> = {
      manha: "Manhã",
      tarde: "Tarde",
      noite: "Noite",
      fim_de_semana: "Fim de semana",
      flexivel: "Flexível",
    };
    return availability.map(a => labels[a] || a);
  };

  const getIntegrationBadge = (status: string | null) => {
    const option = INTEGRATION_STATUS_OPTIONS.find(opt => opt.value === status);
    if (option) {
      return (
        <Badge variant="outline" className={option.color}>
          {option.label}
        </Badge>
      );
    }
    // For unknown/legacy values, show as-is
    return (
      <Badge variant="outline" className="bg-muted">
        {status || "—"}
      </Badge>
    );
  };

  // Count by integration status
  const integrationCounts = useMemo(() => {
    return {
      novo: approvedLeads.filter(l => l.onboarding_status === "pendente").length,
      contatado: approvedLeads.filter(l => l.onboarding_status === "em_andamento").length,
      integrado: approvedLeads.filter(l => l.onboarding_status === "concluido").length,
    };
  }, [approvedLeads]);

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
            {isAdmin() && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                Admin
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {/* Role Scope Banner */}
        <RoleScopeBanner />

        {/* Title & Counters */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Users className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Gestão de Voluntários</span>
          </div>
          <h1 className="text-2xl font-bold">Voluntários Aprovados</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {counts.approved} Total
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/50">
              <UserPlus className="h-3 w-3 mr-1" />
              {integrationCounts.novo} Novos
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/50">
              <Phone className="h-3 w-3 mr-1" />
              {integrationCounts.contatado} Contatados
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/50">
              <UserCheck className="h-3 w-3 mr-1" />
              {integrationCounts.integrado} Integrados
            </Badge>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={integrationFilter || "all"} onValueChange={(v) => setIntegrationFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {INTEGRATION_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {isApprovedLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="card-luta text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-bold text-lg">Nenhum voluntário encontrado</p>
            <p className="text-muted-foreground">Tente ajustar os filtros.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Cidade/Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Bairro</TableHead>
                  <TableHead>Integração</TableHead>
                  <TableHead className="hidden lg:table-cell">Interesses</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(lead)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {lead.full_name?.[0] || "?"}
                        </div>
                        <p className="font-medium">{lead.full_name || "Sem nome"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {lead.city || "N/A"}, {lead.state || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {lead.neighborhood || "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select 
                        value={lead.onboarding_status || "novo"} 
                        onValueChange={(v) => handleUpdateIntegration(lead.id, v as IntegrationStatus)}
                        disabled={isUpdatingIntegration}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTEGRATION_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {formatInterests(lead.interests).slice(0, 2).map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {(lead.interests?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(lead.interests?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(lead);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Voluntário</SheetTitle>
            <SheetDescription>
              Informações completas e gestão de integração
            </SheetDescription>
          </SheetHeader>
          
          {selectedLead && (
            <div className="space-y-6 mt-6">
              {/* Name & Status */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedLead.full_name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedLead.full_name || "Sem nome"}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprovado
                    </Badge>
                    {getIntegrationBadge(selectedLead.onboarding_status)}
                  </div>
                </div>
              </div>

              {/* Integration Status Management */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status de Integração</h4>
                <div className="flex gap-2 flex-wrap">
                  {INTEGRATION_STATUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={selectedLead.onboarding_status === opt.value ? "default" : "outline"}
                      className={selectedLead.onboarding_status === opt.value ? "btn-luta" : ""}
                      onClick={() => handleUpdateIntegration(selectedLead.id, opt.value)}
                      disabled={isUpdatingIntegration}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Localização</h4>
                <div className="card-luta">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{selectedLead.city || "N/A"}, {selectedLead.state || "N/A"}</span>
                  </div>
                  {selectedLead.neighborhood && (
                    <p className="text-sm text-muted-foreground mt-1">Bairro: {selectedLead.neighborhood}</p>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Interesses</h4>
                <div className="flex gap-2 flex-wrap">
                  {formatInterests(selectedLead.interests).length > 0 ? (
                    formatInterests(selectedLead.interests).map((interest) => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Nenhum informado</span>
                  )}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Disponibilidade</h4>
                <div className="flex gap-2 flex-wrap">
                  {formatAvailability(selectedLead.availability).length > 0 ? (
                    formatAvailability(selectedLead.availability).map((avail) => (
                      <Badge key={avail} variant="outline">{avail}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Nenhuma informada</span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Datas</h4>
                <div className="card-luta space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Cadastro: {formatDate(selectedLead.created_at)}</span>
                  </div>
                  {selectedLead.approved_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Aprovado em: {formatDate(selectedLead.approved_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAdminTickets, useTickets, STATUS_LABELS, CATEGORIA_LABELS, TicketStatus, TicketCategoria, Ticket } from "@/hooks/useTickets";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { 
  MessageSquare, 
  Search, 
  ArrowLeft, 
  RefreshCw,
  Home,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Filter,
  X
} from "lucide-react";

export default function AdminInbox() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();
  const { openCount } = useTickets();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [categoriaFilter, setCategoriaFilter] = useState<TicketCategoria | "ALL">("ALL");

  const { data: tickets, isLoading: ticketsLoading, refetch } = useAdminTickets({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    categoria: categoriaFilter === "ALL" ? undefined : categoriaFilter,
    search: searchTerm || undefined,
  });

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = { ABERTO: 0, EM_ANDAMENTO: 0, RESOLVIDO: 0, ARQUIVADO: 0 };
    (tickets || []).forEach((t: Ticket) => {
      counts[t.status]++;
    });
    return counts;
  }, [tickets]);

  if (rolesLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!isCoordinator()) {
    navigate("/admin");
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ABERTO":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "EM_ANDAMENTO":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "RESOLVIDO":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "ARQUIVADO":
        return <Archive className="h-4 w-4 text-muted-foreground" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ABERTO":
        return "bg-amber-500/20 text-amber-600 border-amber-500/50";
      case "EM_ANDAMENTO":
        return "bg-blue-500/20 text-blue-600 border-blue-500/50";
      case "RESOLVIDO":
        return "bg-green-500/20 text-green-600 border-green-500/50";
      case "ARQUIVADO":
        return "bg-muted text-muted-foreground";
      default:
        return "";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCategoriaFilter("ALL");
  };

  const hasFilters = searchTerm || statusFilter !== "ALL" || categoriaFilter !== "ALL";

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
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
              Admin
            </span>
          </div>
          <div className="flex gap-2">
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

      <main className="flex-1 p-4 space-y-6">
        {/* Title & Stats */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Inbox</span>
          </div>
          <h1 className="text-2xl font-bold">Tickets de Suporte</h1>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">{statusCounts.ABERTO} abertos</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{statusCounts.EM_ANDAMENTO} em andamento</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "ALL")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoriaFilter} onValueChange={(v) => setCategoriaFilter(v as TicketCategoria | "ALL")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas Categorias</SelectItem>
                {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="card-luta text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-bold text-lg">Nenhum ticket encontrado</p>
            <p className="text-muted-foreground">Tente ajustar os filtros.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead className="hidden sm:table-cell">Criador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket: Ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/inbox/${ticket.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <span className="font-medium truncate max-w-[200px]">{ticket.titulo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div>
                        <p className="text-sm">{ticket.criador_nome || "Desconhecido"}</p>
                        <p className="text-xs text-muted-foreground">{ticket.cidade || "N/A"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(ticket.status)}>
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIA_LABELS[ticket.categoria]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(ticket.atualizado_em)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

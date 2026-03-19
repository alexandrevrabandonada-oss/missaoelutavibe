import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTickets, STATUS_LABELS, CATEGORIA_LABELS, Ticket } from "@/hooks/useTickets";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Plus, 
  ArrowLeft, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Archive
} from "lucide-react";

export default function VoluntarioInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myTickets, isMyTicketsLoading, openCount } = useTickets();

  if (isMyTicketsLoading) {
    return <FullPageLoader text="Carregando tickets..." />;
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

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Inbox</h1>
              <p className="text-xs text-muted-foreground">Seus tickets de suporte</p>
            </div>
          </div>
          <Button className="btn-luta" onClick={() => navigate("/voluntario/inbox/novo")}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {/* Stats */}
        <div className="card-luta bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="font-medium">Tickets abertos</span>
            </div>
            <Badge variant="default" className="bg-primary">
              {openCount}
            </Badge>
          </div>
        </div>

        {/* Ticket List */}
        {myTickets.length === 0 ? (
          <div className="card-luta text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-bold text-lg">Nenhum ticket</p>
            <p className="text-muted-foreground text-sm mb-4">
              Tem alguma dúvida ou precisa de ajuda?
            </p>
            <Button className="btn-luta" onClick={() => navigate("/voluntario/inbox/novo")}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {myTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="card-luta cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/voluntario/inbox/${ticket.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(ticket.status)}
                      <h3 className="font-medium truncate">{ticket.titulo}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={getStatusBadgeClass(ticket.status)}>
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIA_LABELS[ticket.categoria]}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{formatDate(ticket.atualizado_em)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

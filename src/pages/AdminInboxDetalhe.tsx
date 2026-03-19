import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useTickets, STATUS_LABELS, CATEGORIA_LABELS, Ticket, TicketMensagem, TicketStatus } from "@/hooks/useTickets";
import { useNotifications } from "@/hooks/useNotifications";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Archive,
  User,
  UserPlus,
  Eye,
  EyeOff,
  MapPin
} from "lucide-react";

export default function AdminInboxDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();
  const { getTicketWithMessages, addMessage, updateStatus, assignTicket, isSending, isUpdating } = useTickets();
  const { markTicketNotificationsRead } = useNotifications();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMensagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rolesLoading && !isCoordinator()) {
      navigate("/admin");
      return;
    }
    loadTicket();
  }, [id, rolesLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTicket = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const data = await getTicketWithMessages(id);
      setTicket(data.ticket);
      setMessages(data.messages);
      // Mark notifications for this ticket as read
      await markTicketNotificationsRead(id);
    } catch (error) {
      console.error("Error loading ticket:", error);
      navigate("/admin/inbox");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    
    try {
      await addMessage({
        ticketId: id,
        texto: newMessage.trim(),
        visivelParaVoluntario: !isInternalNote,
      });
      setNewMessage("");
      await loadTicket();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!id) return;
    await updateStatus({ ticketId: id, status });
    await loadTicket();
  };

  const handleAssignToMe = async () => {
    if (!id || !user?.id) return;
    await assignTicket({ ticketId: id, userId: user.id });
    await loadTicket();
  };

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
        return null;
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

  if (rolesLoading || isLoading) {
    return <FullPageLoader text="Carregando ticket..." />;
  }

  if (!ticket) {
    return null;
  }

  const isAssignedToMe = ticket.atribuido_para === user?.id;

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/inbox")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{ticket.titulo}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {getStatusIcon(ticket.status)}
              <Badge variant="outline" className={getStatusBadgeClass(ticket.status)}>
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CATEGORIA_LABELS[ticket.categoria]}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Ticket Info */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{ticket.criador_nome}</span>
          </div>
          {ticket.cidade && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{ticket.cidade}</span>
            </div>
          )}
          {ticket.atribuido_nome && (
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span>Atribuído: {ticket.atribuido_nome}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {!isAssignedToMe && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleAssignToMe}
              disabled={isUpdating}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Atribuir a mim
            </Button>
          )}
          
          <Select 
            value={ticket.status} 
            onValueChange={(v) => handleStatusChange(v as TicketStatus)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => {
          const isOwn = msg.autor_id === user?.id;
          const isInternal = !msg.visivel_para_voluntario;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  isInternal
                    ? "bg-amber-500/10 border border-amber-500/30"
                    : isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {!isOwn && (
                    <div className="flex items-center gap-1 text-xs opacity-80">
                      <User className="h-3 w-3" />
                      <span className="font-medium">{msg.autor_nome}</span>
                    </div>
                  )}
                  {isInternal && (
                    <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-700 border-amber-500/50">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Nota interna
                    </Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
                <p className={`text-xs mt-1 ${isOwn && !isInternal ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatDate(msg.criado_em)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Reply Input */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="internal-note"
            checked={isInternalNote}
            onCheckedChange={setIsInternalNote}
          />
          <Label htmlFor="internal-note" className="flex items-center gap-1 text-sm">
            {isInternalNote ? (
              <>
                <EyeOff className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700">Nota interna (invisível para voluntário)</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Mensagem pública</span>
              </>
            )}
          </Label>
        </div>
        
        <div className="flex gap-2">
          <Textarea
            placeholder={isInternalNote ? "Escreva uma nota interna..." : "Digite sua resposta..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={2}
            className={`resize-none ${isInternalNote ? "border-amber-500/50" : ""}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            className={isInternalNote ? "bg-amber-600 hover:bg-amber-700 shrink-0" : "btn-luta shrink-0"}
            onClick={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

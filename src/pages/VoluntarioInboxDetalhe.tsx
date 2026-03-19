import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTickets, STATUS_LABELS, CATEGORIA_LABELS, Ticket, TicketMensagem } from "@/hooks/useTickets";
import { useNotifications } from "@/hooks/useNotifications";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Archive,
  User
} from "lucide-react";

export default function VoluntarioInboxDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getTicketWithMessages, addMessage, isSending } = useTickets();
  const { markTicketNotificationsRead } = useNotifications();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMensagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTicket();
  }, [id]);

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
      navigate("/voluntario/inbox");
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
        visivelParaVoluntario: true,
      });
      setNewMessage("");
      await loadTicket();
    } catch (error) {
      // Error handled by mutation
    }
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

  const canReply = ticket && !["RESOLVIDO", "ARQUIVADO"].includes(ticket.status);

  if (isLoading) {
    return <FullPageLoader text="Carregando ticket..." />;
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/inbox")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{ticket.titulo}</h1>
            <div className="flex items-center gap-2 mt-1">
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

      {/* Messages */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => {
          const isOwn = msg.autor_id === user?.id;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {!isOwn && (
                  <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{msg.autor_nome}</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
                <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatDate(msg.criado_em)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Reply Input */}
      {canReply ? (
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              className="btn-luta shrink-0"
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
            >
              {isSending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-muted/50 border-t border-border p-4 text-center text-sm text-muted-foreground">
          Este ticket está {ticket.status === "RESOLVIDO" ? "resolvido" : "arquivado"}.
        </div>
      )}
    </div>
  );
}

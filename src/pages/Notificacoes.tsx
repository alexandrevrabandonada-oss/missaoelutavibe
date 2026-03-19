import { useNavigate } from "react-router-dom";
import { useNotifications, Notificacao } from "@/hooks/useNotifications";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  ArrowLeft, 
  CheckCheck, 
  MessageSquare, 
  RefreshCw,
  Clock,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Notificacoes() {
  const navigate = useNavigate();
  const { 
    notifications, 
    isLoading, 
    refetch,
    unreadCount,
    markAsRead, 
    markAllAsRead,
    isMarkingRead 
  } = useNotifications();

  const handleNotificationClick = async (notification: Notificacao) => {
    // Mark as read if not already
    if (!notification.lida) {
      await markAsRead(notification.id);
    }
    // Navigate to the href
    navigate(notification.href);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case "ticket_reply":
        return <MessageSquare className="h-5 w-5 text-primary" />;
      case "ticket_status":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "evidence_approved":
        return <CheckCheck className="h-5 w-5 text-green-500" />;
      case "evidence_rejected":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-2 text-primary mb-4">
          <Bell className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">Notificações</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} não lidas
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card-luta text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-bold text-lg">Nenhuma notificação</p>
            <p className="text-muted-foreground">
              Você receberá notificações quando houver respostas aos seus tickets.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  card-luta p-4 cursor-pointer transition-colors
                  ${notification.lida 
                    ? "bg-background opacity-70" 
                    : "bg-primary/5 border-l-4 border-l-primary"
                  }
                  hover:bg-muted/50
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{notification.titulo}</p>
                      {!notification.lida && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.corpo}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(notification.criado_em)}
                    </div>
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

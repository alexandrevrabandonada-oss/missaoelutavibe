import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  href: string;
  lida: boolean;
  criado_em: string;
  meta: {
    ticket_id?: string;
    autor_id?: string;
    mensagem_id?: string;
    old_status?: string;
    new_status?: string;
  } | null;
}

// Helper to access table not yet in generated types
const notificacoesTable = () => (supabase.from as any)("notificacoes");

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get user's notifications (unread first, then by date)
  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await notificacoesTable()
        .select("*")
        .eq("user_id", user.id)
        .order("lida", { ascending: true })
        .order("criado_em", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as Notificacao[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get unread count for badge
  const unreadCountQuery = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await (supabase.rpc as any)("get_unread_notifications_count", {
        _user_id: user.id,
      });
      
      if (error) throw error;
      return (data ?? 0) as number;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await notificacoesTable()
        .update({ lida: true })
        .eq("id", notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await notificacoesTable()
        .update({ lida: true })
        .eq("user_id", user.id)
        .eq("lida", false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  // Mark notifications for a specific ticket as read
  const markTicketNotificationsReadMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user?.id) return;
      
      const { error } = await (supabase.rpc as any)("mark_ticket_notifications_read", {
        _user_id: user.id,
        _ticket_id: ticketId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    refetch: notificationsQuery.refetch,

    unreadCount: unreadCountQuery.data ?? 0,
    
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    markTicketNotificationsRead: markTicketNotificationsReadMutation.mutateAsync,
    
    isMarkingRead: markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
}

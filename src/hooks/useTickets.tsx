import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Types based on database schema
export type TicketCategoria = 
  | "DUVIDA_APP"
  | "PAUTA"
  | "MISSAO"
  | "MATERIAL"
  | "COORDENACAO"
  | "OUTROS";

export type TicketStatus = 
  | "ABERTO"
  | "EM_ANDAMENTO"
  | "RESOLVIDO"
  | "ARQUIVADO";

export type TicketPrioridade = "BAIXA" | "NORMAL" | "ALTA";

export interface Ticket {
  id: string;
  criado_por: string;
  titulo: string;
  categoria: TicketCategoria;
  cidade: string | null;
  celula_id: string | null;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  atribuido_para: string | null;
  criado_em: string;
  atualizado_em: string;
  // Joined data
  criador_nome?: string;
  criador_cidade?: string;
  atribuido_nome?: string;
}

export interface TicketMensagem {
  id: string;
  ticket_id: string;
  autor_id: string;
  texto: string;
  criado_em: string;
  visivel_para_voluntario: boolean;
  // Joined data
  autor_nome?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

export const CATEGORIA_LABELS: Record<TicketCategoria, string> = {
  DUVIDA_APP: "Dúvida sobre o App",
  PAUTA: "Pauta / Sugestão",
  MISSAO: "Missões",
  MATERIAL: "Materiais",
  COORDENACAO: "Coordenação",
  OUTROS: "Outros",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em Andamento",
  RESOLVIDO: "Resolvido",
  ARQUIVADO: "Arquivado",
};

export const PRIORIDADE_LABELS: Record<TicketPrioridade, string> = {
  BAIXA: "Baixa",
  NORMAL: "Normal",
  ALTA: "Alta",
};

// Helper to access tables not yet in generated types
const ticketsTable = () => (supabase.from as any)("tickets");
const ticketMensagensTable = () => (supabase.from as any)("ticket_mensagens");

export function useTickets() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get user's own tickets
  const myTicketsQuery = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await ticketsTable()
        .select("*")
        .eq("criado_por", user.id)
        .order("atualizado_em", { ascending: false });
      
      if (error) throw error;
      return (data || []) as Ticket[];
    },
    enabled: !!user?.id,
  });

  // Get open tickets count for badge
  const openCountQuery = useQuery({
    queryKey: ["open-tickets-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await (supabase.rpc as any)("get_scoped_open_tickets_count", {
        _user_id: user.id,
      });
      
      if (error) throw error;
      return (data ?? 0) as number;
    },
    enabled: !!user?.id,
  });

  // Get single ticket with messages
  const getTicketWithMessages = async (ticketId: string) => {
    const { data: ticket, error: ticketError } = await ticketsTable()
      .select("*")
      .eq("id", ticketId)
      .single();
    
    if (ticketError) throw ticketError;

    const { data: messages, error: messagesError } = await ticketMensagensTable()
      .select("*")
      .eq("ticket_id", ticketId)
      .order("criado_em", { ascending: true });
    
    if (messagesError) throw messagesError;

    // Get profile names
    const userIds = new Set([
      ticket.criado_por,
      ticket.atribuido_para,
      ...(messages || []).map((m: any) => m.autor_id),
    ].filter(Boolean));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(userIds));

    const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    return {
      ticket: {
        ...ticket,
        criador_nome: nameMap.get(ticket.criado_por) || "Desconhecido",
        atribuido_nome: ticket.atribuido_para ? nameMap.get(ticket.atribuido_para) : null,
      } as Ticket,
      messages: (messages || []).map((m: any) => ({
        ...m,
        autor_nome: nameMap.get(m.autor_id) || "Desconhecido",
      })) as TicketMensagem[],
    };
  };

  // Check rate limit for creating tickets
  const checkTicketRateLimit = async (): Promise<RateLimitResult> => {
    if (!user?.id) return { allowed: false, reason: "Usuário não autenticado" };
    
    const { data, error } = await (supabase.rpc as any)("check_ticket_rate_limit", {
      _user_id: user.id,
    });
    
    if (error) {
      console.error("Error checking ticket rate limit:", error);
      return { allowed: false, reason: "Erro ao verificar limite" };
    }
    
    return data as RateLimitResult;
  };

  // Check rate limit for messages
  const checkMessageRateLimit = async (): Promise<RateLimitResult> => {
    if (!user?.id) return { allowed: false, reason: "Usuário não autenticado" };
    
    const { data, error } = await (supabase.rpc as any)("check_message_rate_limit", {
      _user_id: user.id,
    });
    
    if (error) {
      console.error("Error checking message rate limit:", error);
      return { allowed: false, reason: "Erro ao verificar limite" };
    }
    
    return data as RateLimitResult;
  };

  // Log rate limit exceeded
  const logRateLimitExceeded = async (action: "ticket" | "message") => {
    if (!user?.id) return;
    
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "ticket.rate_limited",
      entity_type: "tickets",
      new_data: { action, timestamp: new Date().toISOString() },
    });
  };

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async ({
      titulo,
      categoria,
      mensagemInicial,
      cidade,
      celulaId,
    }: {
      titulo: string;
      categoria: TicketCategoria;
      mensagemInicial: string;
      cidade?: string;
      celulaId?: string;
    }) => {
      // Check rate limit
      const rateLimit = await checkTicketRateLimit();
      if (!rateLimit.allowed) {
        await logRateLimitExceeded("ticket");
        throw new Error(rateLimit.reason || "Limite de tickets excedido");
      }

      // Create ticket
      const { data: ticket, error: ticketError } = await ticketsTable()
        .insert({
          criado_por: user!.id,
          titulo,
          categoria,
          cidade: cidade || null,
          celula_id: celulaId || null,
        })
        .select()
        .single();
      
      if (ticketError) throw ticketError;

      // Create initial message
      const { error: messageError } = await ticketMensagensTable()
        .insert({
          ticket_id: ticket.id,
          autor_id: user!.id,
          texto: mensagemInicial,
          visivel_para_voluntario: true,
        });
      
      if (messageError) throw messageError;

      return ticket as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["open-tickets-count"] });
      toast.success("Ticket criado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Create ticket error:", error);
      toast.error(error.message || "Erro ao criar ticket");
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({
      ticketId,
      texto,
      visivelParaVoluntario = true,
    }: {
      ticketId: string;
      texto: string;
      visivelParaVoluntario?: boolean;
    }) => {
      // Check rate limit
      const rateLimit = await checkMessageRateLimit();
      if (!rateLimit.allowed) {
        await logRateLimitExceeded("message");
        throw new Error(rateLimit.reason || "Limite de mensagens excedido");
      }

      const { error } = await ticketMensagensTable()
        .insert({
          ticket_id: ticketId,
          autor_id: user!.id,
          texto,
          visivel_para_voluntario: visivelParaVoluntario,
        });
      
      if (error) throw error;

      // Update ticket timestamp
      await ticketsTable()
        .update({ atualizado_em: new Date().toISOString() })
        .eq("id", ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      toast.success("Mensagem enviada!");
    },
    onError: (error: Error) => {
      console.error("Add message error:", error);
      toast.error(error.message || "Erro ao enviar mensagem");
    },
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: TicketStatus;
    }) => {
      const { error } = await ticketsTable()
        .update({ status })
        .eq("id", ticketId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["open-tickets-count"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      console.error("Update status error:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: async ({
      ticketId,
      userId,
    }: {
      ticketId: string;
      userId: string | null;
    }) => {
      const { error } = await ticketsTable()
        .update({ 
          atribuido_para: userId,
          status: userId ? "EM_ANDAMENTO" : "ABERTO",
        })
        .eq("id", ticketId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      toast.success("Ticket atribuído!");
    },
    onError: (error: Error) => {
      console.error("Assign ticket error:", error);
      toast.error("Erro ao atribuir ticket");
    },
  });

  return {
    // User's tickets
    myTickets: myTicketsQuery.data ?? [],
    isMyTicketsLoading: myTicketsQuery.isLoading,
    refetchMyTickets: myTicketsQuery.refetch,

    // Counts
    openCount: openCountQuery.data ?? 0,
    
    // Actions
    getTicketWithMessages,
    createTicket: createTicketMutation.mutateAsync,
    addMessage: addMessageMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    assignTicket: assignTicketMutation.mutateAsync,
    
    // Loading states
    isCreating: createTicketMutation.isPending,
    isSending: addMessageMutation.isPending,
    isUpdating: updateStatusMutation.isPending || assignTicketMutation.isPending,
  };
}

// Hook for admin ticket list with filters
export function useAdminTickets(filters?: {
  status?: TicketStatus;
  categoria?: TicketCategoria;
  cidade?: string;
  search?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-tickets", user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = ticketsTable()
        .select("*")
        .order("atualizado_em", { ascending: false });
      
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      
      if (filters?.categoria) {
        query = query.eq("categoria", filters.categoria);
      }
      
      if (filters?.cidade) {
        query = query.eq("cidade", filters.cidade);
      }
      
      if (filters?.search) {
        // Escape SQL LIKE metacharacters to prevent injection
        const escapedSearch = filters.search.replace(/[%_\\]/g, '\\$&');
        query = query.ilike("titulo", `%${escapedSearch}%`);
      }
      
      const { data: tickets, error } = await query;
      
      if (error) throw error;

      if (!tickets || tickets.length === 0) return [] as Ticket[];

      // Get creator names
      const userIds: string[] = tickets.map((t: any) => t.criado_por).filter(Boolean);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, city")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, { name: p.full_name, city: p.city }]) || []);

        return tickets.map((t: any) => ({
          ...t,
          criador_nome: profileMap.get(t.criado_por)?.name || "Desconhecido",
          criador_cidade: profileMap.get(t.criado_por)?.city,
        })) as Ticket[];
      }

      return tickets as Ticket[];
    },
    enabled: !!user?.id,
  });
}

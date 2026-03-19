import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

// Types
type CRMContatoStatus = Database["public"]["Enums"]["crm_contato_status"];
type CRMOrigemCanal = Database["public"]["Enums"]["crm_origem_canal"];
type CRMInteracaoTipo = Database["public"]["Enums"]["crm_interacao_tipo"];

export interface CRMContato {
  id: string;
  escopo_tipo: "celula" | "cidade";
  escopo_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string;
  bairro: string | null;
  status: CRMContatoStatus;
  tags: string[];
  origem_canal: CRMOrigemCanal;
  origem_ref: string | null;
  consentimento_lgpd: boolean;
  observacao: string | null;
  proxima_acao_em: string | null;
  criado_por: string;
  atribuido_a: string | null;
  whatsapp: string | null;
  whatsapp_norm: string | null;
  whatsapp_last4: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMInteracao {
  id: string;
  contato_id: string;
  autor_user_id: string;
  tipo: CRMInteracaoTipo;
  nota: string;
  created_at: string;
}

export interface CRMContatoInput {
  escopo_tipo: "celula" | "cidade";
  escopo_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cidade: string;
  bairro?: string;
  status?: CRMContatoStatus;
  tags?: string[];
  origem_canal: CRMOrigemCanal;
  origem_ref?: string;
  consentimento_lgpd: boolean;
  observacao?: string;
  proxima_acao_em?: string;
  atribuido_a?: string;
}

// Constants
export const CRM_STATUS_OPTIONS: { value: CRMContatoStatus; label: string; color: string }[] = [
  { value: "novo", label: "Novo", color: "bg-blue-500" },
  { value: "contatar", label: "Contatar", color: "bg-yellow-500" },
  { value: "em_conversa", label: "Em Conversa", color: "bg-purple-500" },
  { value: "confirmado", label: "Confirmado", color: "bg-green-500" },
  { value: "inativo", label: "Inativo", color: "bg-gray-500" },
];

export const CRM_ORIGEM_OPTIONS: { value: CRMOrigemCanal; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "rua", label: "Rua/Panfletagem" },
  { value: "evento", label: "Evento" },
  { value: "indicacao", label: "Indicação" },
  { value: "outro", label: "Outro" },
];

export const CRM_INTERACAO_OPTIONS: { value: CRMInteracaoTipo; label: string }[] = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "encontro", label: "Encontro Presencial" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
];

export const CRM_TAG_SUGGESTIONS = [
  "vizinho",
  "trabalhador",
  "comerciante",
  "jovem",
  "idoso",
  "mãe",
  "líder comunitário",
  "saúde",
  "educação",
  "transporte",
  "moradia",
  "prioritário",
];

// Hook for my contacts (volunteer view)
export function useMyContacts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["crm-my-contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contatos")
        .select("*")
        .eq("criado_por", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as CRMContato[];
    },
    enabled: !!user?.id,
  });
}

// Hook for all contacts in scope (admin view)
export function useCRMContacts(filters?: {
  status?: CRMContatoStatus;
  escopo_tipo?: "celula" | "cidade";
  escopo_id?: string;
  followupToday?: boolean;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["crm-contacts", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_contatos")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.escopo_tipo) {
        query = query.eq("escopo_tipo", filters.escopo_tipo);
      }

      if (filters?.escopo_id) {
        query = query.eq("escopo_id", filters.escopo_id);
      }

      if (filters?.followupToday) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        query = query.lte("proxima_acao_em", today.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CRMContato[];
    },
    enabled: !!user?.id,
  });
}

// Hook for single contact with interactions
export function useCRMContato(contatoId: string | undefined) {
  const { user } = useAuth();

  const contatoQuery = useQuery({
    queryKey: ["crm-contato", contatoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contatos")
        .select("*")
        .eq("id", contatoId!)
        .single();

      if (error) throw error;
      return data as CRMContato;
    },
    enabled: !!user?.id && !!contatoId,
  });

  const interacoesQuery = useQuery({
    queryKey: ["crm-interacoes", contatoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_interacoes")
        .select("*")
        .eq("contato_id", contatoId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CRMInteracao[];
    },
    enabled: !!user?.id && !!contatoId,
  });

  return {
    contato: contatoQuery.data,
    interacoes: interacoesQuery.data ?? [],
    isLoading: contatoQuery.isLoading || interacoesQuery.isLoading,
    error: contatoQuery.error || interacoesQuery.error,
    refetch: () => {
      contatoQuery.refetch();
      interacoesQuery.refetch();
    },
  };
}

// Hook for CRM mutations
export function useCRMMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createContato = useMutation({
    mutationFn: async (input: CRMContatoInput) => {
      if (!input.consentimento_lgpd) {
        throw new Error("Consentimento LGPD é obrigatório");
      }

      const { data, error } = await supabase
        .from("crm_contatos")
        .insert({
          ...input,
          criado_por: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
      toast.success("Contato registrado com sucesso!");
      
      // Log tracking event for contact creation (no contact_id - privacy)
      (supabase.rpc as any)("log_growth_event", {
        _event_type: "contact_created",
        _template_id: null,
        _invite_code: null,
        _meta: { contact_ref: "present" }, // No PII - just indicates contact was created
        _session_id: null,
      }).then(() => {}).catch(() => {});
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar contato: " + error.message);
    },
  });

  const updateContato = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMContato> & { id: string }) => {
      // Ensure LGPD consent isn't being removed
      if (updates.consentimento_lgpd === false) {
        throw new Error("Não é possível remover consentimento LGPD");
      }

      const { data, error } = await supabase
        .from("crm_contatos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-contato", data.id] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
      toast.success("Contato atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CRMContatoStatus }) => {
      const { data, error } = await supabase
        .from("crm_contatos")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-contato", data.id] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const addInteracao = useMutation({
    mutationFn: async (input: { contato_id: string; tipo: CRMInteracaoTipo; nota: string }) => {
      const { data, error } = await supabase
        .from("crm_interacoes")
        .insert({
          ...input,
          autor_user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-interacoes", data.contato_id] });
      toast.success("Interação registrada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar interação: " + error.message);
    },
  });

  const deleteContato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_contatos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
      toast.success("Contato removido");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover contato: " + error.message);
    },
  });

  return {
    createContato,
    updateContato,
    updateStatus,
    addInteracao,
    deleteContato,
  };
}

// Hook for CRM metrics (for Ops dashboard)
export function useCRMMetrics() {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["crm-metrics", user?.id],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get follow-ups due today or overdue
      const { count: followupsHoje } = await supabase
        .from("crm_contatos")
        .select("*", { count: "exact", head: true })
        .lte("proxima_acao_em", today.toISOString())
        .not("proxima_acao_em", "is", null);

      // Get new contacts in last 7 days
      const { count: novosContatos7d } = await supabase
        .from("crm_contatos")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Get total active contacts
      const { count: contatosAtivos } = await supabase
        .from("crm_contatos")
        .select("*", { count: "exact", head: true })
        .neq("status", "inativo");

      // Get confirmed contacts
      const { count: confirmados } = await supabase
        .from("crm_contatos")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmado");

      return {
        followupsHoje: followupsHoje ?? 0,
        novosContatos7d: novosContatos7d ?? 0,
        contatosAtivos: contatosAtivos ?? 0,
        confirmados: confirmados ?? 0,
      };
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });
}

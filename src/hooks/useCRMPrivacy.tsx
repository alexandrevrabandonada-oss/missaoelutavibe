import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RevealResponse {
  ok: boolean;
  error?: string;
  whatsapp?: string;
  whatsapp_norm?: string;
}

interface DeleteResponse {
  ok: boolean;
  error?: string;
}

interface PurgeResponse {
  ok: boolean;
  error?: string;
  purged_count?: number;
}

/**
 * Mask a WhatsApp number, showing only last 4 digits
 * Example: "11999887766" -> "•••• 7766"
 */
export function maskWhatsApp(last4: string | null): string {
  if (!last4) return "•••• ••••";
  return `•••• ${last4}`;
}

/**
 * Hook for CRM privacy operations: reveal, delete, purge
 */
export function useCRMPrivacy() {
  const queryClient = useQueryClient();

  // Reveal full WhatsApp number
  const revealWhatsApp = useMutation({
    mutationFn: async (contactId: string): Promise<RevealResponse> => {
      const { data, error } = await supabase.rpc("get_contact_whatsapp", {
        p_contact_id: contactId,
      });

      if (error) throw error;
      return data as unknown as RevealResponse;
    },
    onError: (error: Error) => {
      toast.error("Erro ao revelar número: " + error.message);
    },
  });

  // Soft delete a contact
  const deleteContact = useMutation({
    mutationFn: async (contactId: string): Promise<DeleteResponse> => {
      const { data, error } = await supabase.rpc("delete_my_contact", {
        p_contact_id: contactId,
      });

      if (error) throw error;
      return data as unknown as DeleteResponse;
    },
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
        queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
        toast.success("Contato excluído");
      } else {
        toast.error("Erro: " + (data.error || "desconhecido"));
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir contato: " + error.message);
    },
  });

  // Purge all my contacts
  const purgeContacts = useMutation({
    mutationFn: async (): Promise<PurgeResponse> => {
      const { data, error } = await supabase.rpc("purge_my_contacts");

      if (error) throw error;
      return data as unknown as PurgeResponse;
    },
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
        queryClient.invalidateQueries({ queryKey: ["crm-my-contacts"] });
        toast.success(`${data.purged_count} contatos excluídos`);
      } else {
        toast.error("Erro: " + (data.error || "desconhecido"));
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir contatos: " + error.message);
    },
  });

  return {
    revealWhatsApp,
    deleteContact,
    purgeContacts,
    maskWhatsApp,
  };
}

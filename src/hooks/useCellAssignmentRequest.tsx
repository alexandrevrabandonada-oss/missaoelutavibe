 /**
  * useCellAssignmentRequest - Hook for volunteer cell assignment request management
  * Manages the volunteer's assignment request status and CRUD operations
  */
 
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/hooks/useAuth";
 import { toast } from "sonner";
 
 export interface MyAssignmentRequest {
   id: string;
   city_id: string;
   city_name: string | null;
   bairro: string | null;
   disponibilidade: string | null;
   interesses: string[];
   status: string;
   assigned_cell_id: string | null;
   assigned_cell_name: string | null;
   created_at: string;
   resolved_at: string | null;
   notes: string | null;
 }
 
export interface MyAllocationState {
  state: "unallocated" | "pending" | "allocated";
  request: MyAssignmentRequest | null;
  currentCell: {
    id: string;
    name: string;
    neighborhood: string | null;
    meta_json?: { playbook?: any } | null;
  } | null;
  cityId: string | null;
  cityName: string | null;
}
 
 export function useCellAssignmentRequest() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   // Get current allocation state
   const stateQuery = useQuery({
     queryKey: ["my-allocation-state", user?.id],
     queryFn: async (): Promise<MyAllocationState> => {
       if (!user?.id) {
         return { state: "unallocated", request: null, currentCell: null, cityId: null, cityName: null };
       }
 
       // Get profile with cell info
       const { data: profile, error: profileError } = await supabase
         .from("profiles")
         .select("cell_id, city_id, city")
         .eq("id", user.id)
         .single();
 
       if (profileError) throw profileError;
 
       // Check if already allocated to a cell
       let currentCell = null;
       if (profile?.cell_id) {
        const { data: cell } = await supabase
            .from("cells")
            .select("id, name, neighborhood, meta_json")
            .eq("id", profile.cell_id)
            .single();
         
         if (cell) {
           currentCell = cell;
           return {
             state: "allocated",
             request: null,
             currentCell,
             cityId: profile.city_id,
             cityName: profile.city,
           };
         }
       }
 
       // Check for pending request
       const { data: request, error: reqError } = await supabase
         .from("cell_assignment_requests")
         .select(`
           id,
           city_id,
           bairro,
           disponibilidade,
           interesses,
           status,
           assigned_cell_id,
           created_at,
           resolved_at,
           notes
         `)
         .eq("profile_id", user.id)
         .eq("status", "pending")
         .maybeSingle();
 
       if (reqError) throw reqError;
 
       if (request) {
         // Get city name
         const { data: city } = await supabase
           .from("cidades")
           .select("nome")
           .eq("id", request.city_id)
           .single();
 
         return {
           state: "pending",
           request: {
             ...request,
             city_name: city?.nome || null,
             assigned_cell_name: null,
             interesses: request.interesses || [],
           },
           currentCell: null,
           cityId: request.city_id,
           cityName: city?.nome || null,
         };
       }
 
       // Unallocated - get city info from profile
       let cityName = profile?.city || null;
       let cityId = profile?.city_id || null;
 
       return {
         state: "unallocated",
         request: null,
         currentCell: null,
         cityId,
         cityName,
       };
     },
     enabled: !!user?.id,
   });
 
  // Request allocation to a specific cell via secure RPC
  const requestCellMutation = useMutation({
    mutationFn: async (cellId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("request_cell_allocation", {
        p_cell_id: cellId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string; cell_name?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao solicitar alocação");
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["my-allocation-state"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(result.message || "Solicitação enviada!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao solicitar alocação");
    },
  });

  // Legacy create request (for modal form with bairro/disponibilidade)
  const createMutation = useMutation({
    mutationFn: async ({
      cityId,
      bairro,
      disponibilidade,
      interesses,
    }: {
      cityId: string;
      bairro?: string;
      disponibilidade?: string;
      interesses?: string[];
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Use RPC for creating request
      const { data, error } = await supabase.rpc("volunteer_request_cell_allocation", {
        p_city_id: cityId,
        p_preferred_cell_id: null,
        p_bairro: bairro || null,
        p_disponibilidade: disponibilidade || null,
        p_interesses: interesses || [],
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao criar solicitação");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-allocation-state"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Pedido enviado! A coordenação vai alocar você em breve.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao enviar pedido");
    },
  });
 
   // Update existing request
   const updateMutation = useMutation({
     mutationFn: async ({
       requestId,
       bairro,
       disponibilidade,
       interesses,
     }: {
       requestId: string;
       bairro?: string;
       disponibilidade?: string;
       interesses?: string[];
     }) => {
       const { error } = await supabase
         .from("cell_assignment_requests")
         .update({
           bairro: bairro || null,
           disponibilidade: disponibilidade || null,
           interesses: interesses || [],
           updated_at: new Date().toISOString(),
         })
         .eq("id", requestId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["my-allocation-state"] });
       toast.success("Preferências atualizadas!");
     },
     onError: (error: Error) => {
       toast.error(error.message || "Erro ao atualizar");
     },
   });
 
  // Cancel request via secure RPC
  const cancelMutation = useMutation({
    mutationFn: async (_requestId?: string) => {
      // Use RPC to cancel - it finds and cancels user's pending request
      const { data, error } = await supabase.rpc("cancel_cell_allocation_request");

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao cancelar");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-allocation-state"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Pedido cancelado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao cancelar");
    },
  });
 
  return {
    allocation: stateQuery.data || null,
    isLoading: stateQuery.isLoading,
    error: stateQuery.error,
    refetch: stateQuery.refetch,
    // Mutations
    requestCell: requestCellMutation.mutate,
    requestCellAsync: requestCellMutation.mutateAsync,
    isRequestingCell: requestCellMutation.isPending,
    createRequest: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateRequest: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    cancelRequest: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  };
 }
 
 // Hook for pending requests count (for coordinator cockpit)
 export function usePendingRequestsCount(cityId?: string | null) {
   return useQuery({
     queryKey: ["pending-requests-count", cityId],
     queryFn: async () => {
       let query = supabase
         .from("cell_assignment_requests")
         .select("id", { count: "exact", head: true })
         .eq("status", "pending");
 
       if (cityId) {
         query = query.eq("city_id", cityId);
       }
 
       const { count, error } = await query;
       if (error) throw error;
       return count || 0;
     },
   });
 }
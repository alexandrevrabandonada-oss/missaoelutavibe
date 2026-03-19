import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Pencil, X, Loader2, HandHelping } from "lucide-react";
import { CellAssignmentRequestModal } from "./CellAssignmentRequestModal";

interface CellAssignmentRequest {
  id: string;
  city_id: string;
  bairro: string | null;
  disponibilidade: string | null;
  interesses: string[];
  status: string;
  created_at: string;
}

export function NeedsCellBanner() {
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // Fetch existing pending request for user's city
  const { data: pendingRequest, isLoading: isLoadingRequest } = useQuery({
    queryKey: ["cell-assignment-request", user?.id, profile?.city_id],
    queryFn: async () => {
      if (!user?.id || !profile?.city_id) return null;

      const { data, error } = await supabase
        .from("cell_assignment_requests")
        .select("*")
        .eq("profile_id", user.id)
        .eq("city_id", profile.city_id)
        .eq("status", "pending")
        .maybeSingle();

      if (error) throw error;
      return data as CellAssignmentRequest | null;
    },
    enabled: !!user?.id && !!profile?.city_id,
  });

  // Cancel request mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!pendingRequest?.id) throw new Error("No request to cancel");

      const { error } = await supabase
        .from("cell_assignment_requests")
        .update({ status: "cancelled" })
        .eq("id", pendingRequest.id);

      if (error) throw error;

      // Update profile to reflect needs_cell_assignment again
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ needs_cell_assignment: true })
        .eq("id", user?.id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cell-assignment-request"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Pedido cancelado");
    },
    onError: (error) => {
      console.error("Error canceling request:", error);
      toast.error("Erro ao cancelar pedido");
    },
  });

  const handleModalSuccess = () => {
    setShowModal(false);
    queryClient.invalidateQueries({ queryKey: ["cell-assignment-request"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  // Don't show if loading
  if (isLoadingProfile || isLoadingRequest) {
    return null;
  }

  // Don't show if user has a cell
  if (profile?.cell_id) {
    return null;
  }

  // Don't show if user doesn't need assignment AND has no pending request
  if (!profile?.needs_cell_assignment && !pendingRequest) {
    return null;
  }

  // Case 1: Has pending request - show "aguardando" state
  if (pendingRequest) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-foreground">
                Pedido de alocação enviado
              </p>
              <Badge variant="secondary" className="text-xs">
                Aguardando
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              A coordenação vai alocar você em breve.
              {pendingRequest.bairro && (
                <span className="block mt-0.5">
                  Região: {pendingRequest.bairro}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowModal(true)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {profile?.city_id && (
          <CellAssignmentRequestModal
            open={showModal}
            onOpenChange={setShowModal}
            cityId={profile.city_id}
            cityName={profile.city || "sua cidade"}
            onSuccess={handleModalSuccess}
            existingRequest={pendingRequest}
          />
        )}
      </div>
    );
  }

  // Case 2: Needs assignment - show clickable banner
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full text-left bg-muted/50 border border-border rounded-lg p-3 mb-4 hover:bg-muted/70 hover:border-primary/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <HandHelping className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              Você ainda não está em uma célula
            </p>
            <p className="text-xs text-primary font-medium">
              Clique para pedir alocação →
            </p>
          </div>
        </div>
      </button>

      {/* Request Modal */}
      {profile?.city_id && (
        <CellAssignmentRequestModal
          open={showModal}
          onOpenChange={setShowModal}
          cityId={profile.city_id}
          cityName={profile.city || "sua cidade"}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}

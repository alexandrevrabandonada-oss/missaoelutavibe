import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Clock, Heart } from "lucide-react";

export interface ExistingRequest {
  id: string;
  bairro: string | null;
  disponibilidade: string | null;
  interesses: string[];
}

interface CellAssignmentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityId: string;
  cityName: string;
  onSuccess: () => void;
  existingRequest?: ExistingRequest | null;
}

const INTEREST_OPTIONS = [
  { value: "rua", label: "Ação de rua" },
  { value: "digital", label: "Digital/Redes" },
  { value: "formacao", label: "Formação" },
  { value: "eventos", label: "Eventos" },
  { value: "logistica", label: "Logística" },
  { value: "comunicacao", label: "Comunicação" },
];

const AVAILABILITY_OPTIONS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "fds", label: "Fins de semana" },
  { value: "flexivel", label: "Flexível" },
];

export function CellAssignmentRequestModal({
  open,
  onOpenChange,
  cityId,
  cityName,
  onSuccess,
  existingRequest,
}: CellAssignmentRequestModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bairro, setBairro] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const isEditing = !!existingRequest;

  // Initialize form with existing data when editing
  useEffect(() => {
    if (existingRequest && open) {
      setBairro(existingRequest.bairro || "");
      setSelectedAvailability(
        existingRequest.disponibilidade?.split(", ").filter(Boolean) || []
      );
      setSelectedInterests(existingRequest.interesses || []);
    } else if (!open) {
      // Reset form when closing
      setBairro("");
      setSelectedAvailability([]);
      setSelectedInterests([]);
    }
  }, [existingRequest, open]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      if (isEditing && existingRequest) {
        // Update existing request
        const { error: updateError } = await supabase
          .from("cell_assignment_requests")
          .update({
            bairro: bairro || null,
            disponibilidade: selectedAvailability.join(", ") || null,
            interesses: selectedInterests,
          })
          .eq("id", existingRequest.id);

        if (updateError) throw updateError;
      } else {
        // Insert new request
        const { error: requestError } = await supabase
          .from("cell_assignment_requests")
          .insert({
            profile_id: user.id,
            city_id: cityId,
            bairro: bairro || null,
            disponibilidade: selectedAvailability.join(", ") || null,
            interesses: selectedInterests,
            status: "pending",
          });

        if (requestError) throw requestError;

        // Update profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            city_id: cityId,
            needs_cell_assignment: false,
            onboarding_complete: true,
            onboarding_status: "concluido",
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["cell-assignment-request"] });
      toast.success(
        isEditing
          ? "Pedido atualizado!"
          : "Pedido enviado! A coordenação vai alocar você em breve."
      );
      onSuccess();
    },
    onError: (error) => {
      console.error("Error submitting request:", error);
      toast.error(
        isEditing ? "Erro ao atualizar pedido." : "Erro ao enviar pedido. Tente novamente."
      );
    },
  });

  const toggleAvailability = (value: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const toggleInterest = (value: string) => {
    setSelectedInterests((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {isEditing ? "Editar pedido de alocação" : "Pedir alocação em célula"}
          </DialogTitle>
          <DialogDescription>
            A coordenação de {cityName} vai analisar seu pedido e alocar você na célula mais próxima.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Bairro/Área */}
          <div className="space-y-2">
            <Label htmlFor="bairro" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Bairro ou região (opcional)
            </Label>
            <Input
              id="bairro"
              placeholder="Ex: Centro, Zona Norte, Copacabana..."
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ajuda a coordenação a encontrar uma célula perto de você
            </p>
          </div>

          {/* Disponibilidade */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Disponibilidade (opcional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedAvailability.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleAvailability(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Interesses */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              Áreas de interesse (opcional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedInterests.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleInterest(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Atualizando..." : "Enviando..."}
              </>
            ) : isEditing ? (
              "Salvar alterações"
            ) : (
              "Enviar pedido"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitMutation.isPending}
            className="w-full text-muted-foreground"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

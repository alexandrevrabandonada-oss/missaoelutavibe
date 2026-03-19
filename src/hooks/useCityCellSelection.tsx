import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface City {
  id: string;
  nome: string;
  uf: string;
  slug: string;
  status: string;
}

export interface Cell {
  id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  cidade_id: string | null;
  is_active: boolean;
}

export function useCityCellSelection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch active cities
  const citiesQuery = useQuery({
    queryKey: ["cities-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cidades")
        .select("id, nome, uf, slug, status")
        .eq("status", "ativa")
        .order("nome");

      if (error) throw error;
      return data as City[];
    },
  });

  // Fetch cells for a specific city
  const fetchCellsByCity = async (cityId: string): Promise<Cell[]> => {
    const { data, error } = await supabase
      .from("cells")
      .select("id, name, city, neighborhood, cidade_id, is_active")
      .eq("cidade_id", cityId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data as Cell[];
  };

  // Hook for cells (needs cityId parameter)
  const useCellsForCity = (cityId: string | null) => {
    return useQuery({
      queryKey: ["cells-by-city", cityId],
      queryFn: () => fetchCellsByCity(cityId!),
      enabled: !!cityId,
    });
  };

  // Save city and cell selection via secure RPC (no direct cell_membership creation)
  const saveSelectionMutation = useMutation({
    mutationFn: async ({
      cityId,
    }: {
      cityId: string;
      cellId?: string | null;
      skipCell?: boolean;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Use RPC to save selection - does NOT create cell_membership
      // Cell membership is only created when coordinator approves the volunteer
      const { data, error } = await supabase.rpc("volunteer_save_city_selection", {
        p_city_id: cityId,
        p_preferred_cell_id: null,
        p_skip_cell: true,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao salvar seleção");
      }

      return { cityId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Seleção salva! Aguarde aprovação da coordenação.");
    },
    onError: (error) => {
      console.error("Error saving selection:", error);
      toast.error("Erro ao salvar seleção. Tente novamente.");
    },
  });

  return {
    cities: citiesQuery.data ?? [],
    isLoadingCities: citiesQuery.isLoading,
    citiesError: citiesQuery.error,
    useCellsForCity,
    saveSelection: saveSelectionMutation.mutate,
    isSaving: saveSelectionMutation.isPending,
  };
}

/**
 * TerritorioBadge - Shows city and cell info in a compact dropdown
 * Simplified: no more "pedir alocação" - cells are auto-assigned
 */

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, ChevronDown, Pencil, Eye } from "lucide-react";

export function TerritorioBadge() {
  const navigate = useNavigate();
  const { profile, isLoading: isLoadingProfile } = useProfile();

  // Fetch city name
  const { data: city, isLoading: isLoadingCity } = useQuery({
    queryKey: ["city", profile?.city_id],
    queryFn: async () => {
      if (!profile?.city_id) return null;
      const { data, error } = await supabase
        .from("cidades")
        .select("id, nome, uf")
        .eq("id", profile.city_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.city_id,
  });

  // Fetch cell name
  const { data: cell, isLoading: isLoadingCell } = useQuery({
    queryKey: ["cell", profile?.cell_id],
    queryFn: async () => {
      if (!profile?.cell_id) return null;
      const { data, error } = await supabase
        .from("cells")
        .select("id, name, neighborhood")
        .eq("id", profile.cell_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.cell_id,
  });

  const isLoading = isLoadingProfile || isLoadingCity || isLoadingCell;

  if (!isLoading && !profile?.city_id) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mb-4">
        <Skeleton className="h-9 w-48" />
      </div>
    );
  }

  const cityName = city?.nome || profile?.city || "Cidade não definida";
  const cellName = cell?.name || null;
  const hasCell = !!profile?.cell_id;

  return (
    <div className="mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-left font-normal"
          >
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate max-w-[200px]">
              {cityName}
              {hasCell && cellName && (
                <span className="text-muted-foreground"> · {cellName}</span>
              )}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => navigate("/voluntario/primeiros-passos")}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar cidade
          </DropdownMenuItem>

          {hasCell && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/voluntario/celula/${cell?.id || profile?.cell_id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver minha célula
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

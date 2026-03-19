import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Loader2, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface CityGeralStatus {
  city_id: string;
  city_name: string;
  uf: string;
  has_geral: boolean;
  geral_cell_id: string | null;
}

interface DuplicateMembership {
  user_id: string;
  cell_id: string;
  count: number;
}

export function CellGeralHealthCard() {
  const queryClient = useQueryClient();

  // Check which cities are missing "Geral"
  const { data: cityStatuses, isLoading } = useQuery({
    queryKey: ["cell-geral-health"],
    queryFn: async () => {
      const { data: cities, error: citiesErr } = await supabase
        .from("cidades")
        .select("id, nome, uf")
        .eq("status", "ativa")
        .order("nome");

      if (citiesErr) throw citiesErr;

      const { data: geralCells, error: cellsErr } = await supabase
        .from("cells")
        .select("id, cidade_id")
        .ilike("name", "geral")
        .eq("is_active", true);

      if (cellsErr) throw cellsErr;

      const geralMap = new Map(geralCells?.map(c => [c.cidade_id, c.id]) || []);

      return (cities || []).map(city => ({
        city_id: city.id,
        city_name: city.nome,
        uf: city.uf,
        has_geral: geralMap.has(city.id),
        geral_cell_id: geralMap.get(city.id) || null,
      })) as CityGeralStatus[];
    },
  });

  // Check duplicate memberships
  const { data: duplicateCount } = useQuery({
    queryKey: ["duplicate-memberships-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cell_memberships")
        .select("user_id, cell_id");

      if (error) throw error;

      // Count duplicates client-side (group by user_id+cell_id)
      const seen = new Map<string, number>();
      let dupes = 0;
      for (const row of data || []) {
        const key = `${row.user_id}:${row.cell_id}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count === 2) dupes++; // Count unique dupes
      }
      return dupes;
    },
  });

  // Create missing Geral cells
  const createMissingMutation = useMutation({
    mutationFn: async (missingCities: CityGeralStatus[]) => {
      let created = 0;
      for (const city of missingCities) {
        const { error } = await supabase.from("cells").insert({
          name: "Geral",
          city: city.city_name,
          state: city.uf,
          cidade_id: city.city_id,
          is_active: true,
          tipo: "operacional" as any,
        });
        if (!error) created++;
      }
      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["cell-geral-health"] });
      toast.success(`${count} célula(s) "Geral" criada(s)`);
    },
    onError: () => toast.error("Erro ao criar células"),
  });

  const missing = cityStatuses?.filter(c => !c.has_geral) || [];
  const total = cityStatuses?.length || 0;
  const allGood = missing.length === 0 && (duplicateCount || 0) === 0;

  return (
    <Card className={allGood ? "border-green-500/50" : "border-yellow-500/50"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Saúde: Célula Geral
        </CardTitle>
        <CardDescription>
          Verifica se toda cidade ativa tem célula "Geral" e se há memberships duplicadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando...
          </div>
        ) : (
          <>
            {/* Geral cells status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {missing.length === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm">
                  Célula "Geral": {total - missing.length}/{total} cidades
                </span>
              </div>
              {missing.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createMissingMutation.mutate(missing)}
                  disabled={createMissingMutation.isPending}
                >
                  {createMissingMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Criar {missing.length} faltante(s)
                </Button>
              )}
            </div>

            {/* Missing list */}
            {missing.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {missing.map(city => (
                  <Badge key={city.city_id} variant="outline" className="text-xs">
                    {city.city_name}/{city.uf}
                  </Badge>
                ))}
              </div>
            )}

            {/* Duplicate memberships */}
            <div className="flex items-center gap-2">
              {(duplicateCount || 0) === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm">
                Memberships duplicadas: {duplicateCount || 0}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

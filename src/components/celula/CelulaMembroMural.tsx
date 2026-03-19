/**
 * CelulaMembroMural - Tab "Mural" for cell member (read-only)
 * 
 * Shows official communications, no "new post" CTA.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMuralPosts, MURAL_TIPO_LABELS, type MuralPostTipo } from "@/hooks/useMural";
import { MuralPostCard } from "@/components/mural/MuralPostCard";
import { Filter, Megaphone } from "lucide-react";

type FilterValue = "todos" | MuralPostTipo;

interface Props {
  cellId: string;
}

export function CelulaMembroMural({ cellId }: Props) {
  const [tipoFilter, setTipoFilter] = useState<FilterValue>("todos");

  const {
    posts,
    isLoading,
  } = useMuralPosts(cellId, tipoFilter === "todos" ? null : tipoFilter);

  // Only show published posts
  const visiblePosts = posts.filter((p) => p.status === "publicado");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <p className="text-xs text-muted-foreground">
        Avisos e comunicados da coordenação da célula
      </p>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={tipoFilter}
          onValueChange={(v) => setTipoFilter(v as FilterValue)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(MURAL_TIPO_LABELS).map(([tipo, label]) => (
              <SelectItem key={tipo} value={tipo}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Posts */}
      {visiblePosts.length === 0 ? (
        <div className="py-12 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum comunicado publicado</p>
          <p className="text-xs text-muted-foreground mt-1">
            A coordenação publicará avisos e comunicados aqui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((post) => (
            <MuralPostCard
              key={post.id}
              post={post}
              cellId={cellId}
              canModerate={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

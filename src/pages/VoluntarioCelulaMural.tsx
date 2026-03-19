import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useUserCells } from "@/hooks/useUserCells";
import { useCells } from "@/hooks/useCells";
import { useMuralPosts, MuralPostTipo, MURAL_TIPO_LABELS, MuralReacaoTipo } from "@/hooks/useMural";
import { MuralPostCard } from "@/components/mural/MuralPostCard";
import { useUserRoles } from "@/hooks/useUserRoles";

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner />
  </div>
);

type FilterValue = "todos" | MuralPostTipo;

export default function VoluntarioCelulaMural() {
  const navigate = useNavigate();
  const { cellId } = useParams<{ cellId: string }>();
  const { isLoading: authLoading, hasAccess, isAdmin } = useRequireApproval();
  const { userCells, isLoading: cellsLoading, userCellIds } = useUserCells();
  const { cells } = useCells();
  
  const [tipoFilter, setTipoFilter] = useState<FilterValue>("todos");

  // Get cell info
  const currentCell = cells.find(c => c.id === cellId) || userCells.find(c => c.id === cellId);
  const isMember = cellId ? userCellIds.includes(cellId) : false;
  const canModerate = isAdmin;
  
  // If no cellId provided, use first user cell
  const activeCellId = cellId || userCellIds[0];

  const { 
    posts, 
    isLoading: postsLoading,
    hidePost,
    restorePost,
  } = useMuralPosts(
    activeCellId, 
    tipoFilter === "todos" ? null : tipoFilter
  );

  if (authLoading || cellsLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  if (!activeCellId) {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="w-10" />
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Você não está em nenhuma célula</h2>
            <p className="text-muted-foreground">
              Converse com a coordenação para se juntar a uma célula.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter posts - show hidden only to moderators
  const visiblePosts = canModerate
    ? posts
    : posts.filter(p => p.status === "publicado");

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mural da Célula</h1>
            {currentCell && (
              <p className="text-muted-foreground text-sm">
                {currentCell.name} • {currentCell.city}
              </p>
            )}
          </div>
          
          {isMember && (
            <Button 
              size="sm" 
              className="gap-2"
              onClick={() => navigate(`/voluntario/celula/${activeCellId}/mural/novo`)}
            >
              <Plus className="h-4 w-4" />
              Criar Post
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={tipoFilter} 
            onValueChange={(v) => setTipoFilter(v as FilterValue)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os posts</SelectItem>
              {Object.entries(MURAL_TIPO_LABELS).map(([tipo, label]) => (
                <SelectItem key={tipo} value={tipo}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Posts Feed */}
        {postsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum post ainda.</p>
            {isMember && (
              <p className="text-sm mt-2">Seja o primeiro a contribuir!</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visiblePosts.map((post) => (
              <MuralPostCard
                key={post.id}
                post={post}
                cellId={activeCellId}
                canModerate={canModerate}
                onHide={() => hidePost(post.id)}
                onRestore={() => restorePost(post.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

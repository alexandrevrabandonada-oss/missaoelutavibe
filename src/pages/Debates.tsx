import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTopicos, ESCOPO_LABELS } from "@/hooks/useDebates";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useUserCells } from "@/hooks/useUserCells";
import { useCells } from "@/hooks/useCells";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  MessageCircle, 
  Eye, 
  EyeOff,
  Globe,
  Users,
  Hash,
  Clock,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function TopicoCard({ 
  topico, 
  isAdmin, 
  onToggleOculto,
  onClick 
}: { 
  topico: {
    id: string;
    tema: string;
    descricao: string | null;
    escopo: "global" | "celula";
    celula_id: string | null;
    tags: string[] | null;
    oculto: boolean;
    created_at: string;
    updated_at: string;
  };
  isAdmin: boolean;
  onToggleOculto: (id: string, oculto: boolean) => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`card-luta transition-all hover:border-primary/50 ${
        topico.oculto ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={onClick}
          className="flex-1 text-left hover:opacity-90 transition-opacity"
        >
          {/* Escopo badge */}
          <div className="flex items-center gap-2 mb-2">
            {topico.escopo === "global" ? (
              <Globe className="h-4 w-4 text-primary" />
            ) : (
              <Users className="h-4 w-4 text-primary" />
            )}
            <Badge variant="outline" className="text-xs">
              {ESCOPO_LABELS[topico.escopo]}
            </Badge>
            {topico.oculto && (
              <Badge variant="destructive" className="text-xs">
                Oculto
              </Badge>
            )}
          </div>

          {/* Tema */}
          <h3 className="font-bold text-lg mb-1 line-clamp-2">{topico.tema}</h3>

          {/* Descrição curta */}
          {topico.descricao && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {topico.descricao}
            </p>
          )}

          {/* Tags */}
          {topico.tags && topico.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {topico.tags.slice(0, 4).map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-secondary rounded-full flex items-center gap-1"
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </span>
              ))}
              {topico.tags.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{topico.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Última atividade */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(topico.updated_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </button>

        {/* Admin controls */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleOculto(topico.id, topico.oculto);
            }}
            title={topico.oculto ? "Restaurar" : "Ocultar"}
          >
            {topico.oculto ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

type EscopoFilter = "todos" | "global" | "celula" | string; // string for specific cell IDs

export default function Debates() {
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess, isApproved, isAdmin } = useRequireApproval();
  const { topicos, isLoading, toggleOculto } = useTopicos();
  const { userCellIds, isLoading: cellsLoading, hasCell } = useUserCells();
  const { cells: allCells } = useCells();

  const [escopoFilter, setEscopoFilter] = useState<EscopoFilter>("todos");

  const canPost = isApproved;

  // Filter topics based on scope selection
  const filteredTopicos = useMemo(() => {
    // First filter hidden for non-admins
    let filtered = isAdmin ? topicos : topicos.filter((t) => !t.oculto);

    // Then apply scope filter
    if (escopoFilter === "global") {
      filtered = filtered.filter((t) => t.escopo === "global");
    } else if (escopoFilter === "celula") {
      // Show only topics from user's cells
      filtered = filtered.filter(
        (t) => t.escopo === "celula" && t.celula_id && userCellIds.includes(t.celula_id)
      );
    } else if (escopoFilter !== "todos" && escopoFilter.startsWith("cell:")) {
      // Admin filtering by specific cell
      const cellId = escopoFilter.replace("cell:", "");
      filtered = filtered.filter(
        (t) => t.escopo === "celula" && t.celula_id === cellId
      );
    }
    // "todos" shows all (global + user's cells - already handled by RLS)

    return filtered;
  }, [topicos, isAdmin, escopoFilter, userCellIds]);

  if (authLoading || isLoading || cellsLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  const handleToggleOculto = async (id: string, currentOculto: boolean) => {
    try {
      await toggleOculto({ id, oculto: !currentOculto });
      toast.success(currentOculto ? "Tópico restaurado" : "Tópico ocultado");
    } catch (error) {
      toast.error("Erro ao atualizar tópico");
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/aprender")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title + New Topic Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Debates</h1>
            <p className="text-muted-foreground text-sm">
              Discussões e trocas de ideias
            </p>
          </div>

          {canPost && (
            <Button 
              size="sm" 
              className="gap-2"
              onClick={() => navigate("/debates/novo")}
            >
              <Plus className="h-4 w-4" />
              Novo Tópico
            </Button>
          )}
        </div>

        {/* Scope Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={escopoFilter} onValueChange={(v) => setEscopoFilter(v as EscopoFilter)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">
                <span className="flex items-center gap-2">
                  Todos os Tópicos
                </span>
              </SelectItem>
              <SelectItem value="global">
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Global
                </span>
              </SelectItem>
              {hasCell && (
                <SelectItem value="celula">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Minha Célula
                  </span>
                </SelectItem>
              )}
              {/* Admin: show all cells as filter options */}
              {isAdmin && allCells.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    Células específicas
                  </div>
                  {allCells.map((cell) => (
                    <SelectItem key={cell.id} value={`cell:${cell.id}`}>
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {cell.name}
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Topics List */}
        <div className="space-y-3">
          {filteredTopicos.length === 0 ? (
            <div className="card-luta text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-bold mb-2">
                {escopoFilter === "todos"
                  ? "Nenhum debate ainda"
                  : escopoFilter === "global"
                  ? "Nenhum debate global"
                  : escopoFilter === "celula"
                  ? "Nenhum debate na sua célula"
                  : "Nenhum debate nesta célula"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {canPost
                  ? "Seja o primeiro a iniciar uma discussão!"
                  : "Aguarde aprovação para participar."}
              </p>
              {canPost && (
                <Button onClick={() => navigate("/debates/novo")}>
                  Criar Primeiro Tópico
                </Button>
              )}
            </div>
          ) : (
            filteredTopicos.map((topico) => (
              <TopicoCard
                key={topico.id}
                topico={topico}
                isAdmin={isAdmin}
                onToggleOculto={handleToggleOculto}
                onClick={() => navigate(`/debates/topico/${topico.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* Signature */}
      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Target, Calendar, EyeOff, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/Logo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TTSButton } from "@/components/a11y/TTSButton";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useUserCells } from "@/hooks/useUserCells";
import { 
  useMuralPost, 
  useMuralPosts,
  MURAL_TIPO_LABELS, 
  MURAL_TIPO_COLORS,
  MuralPostTipo,
} from "@/hooks/useMural";
import { MuralReactionsBar } from "@/components/mural/MuralReactionsBar";
import { MuralComentarioItem } from "@/components/mural/MuralComentarioItem";
import { cn } from "@/lib/utils";

export default function VoluntarioCelulaMuralPost() {
  const navigate = useNavigate();
  const { cellId, postId } = useParams<{ cellId: string; postId: string }>();
  const { isLoading: authLoading, hasAccess, isAdmin } = useRequireApproval();
  const { userCellIds, isLoading: cellsLoading } = useUserCells();
  
  const isMember = cellId ? userCellIds.includes(cellId) : false;
  const canModerate = isAdmin;

  const {
    post,
    comentarios,
    reacoesCounts,
    userReactions,
    isLoading,
    addComentario,
    isAddingComentario,
    toggleReacao,
    hideComentario,
  } = useMuralPost(postId);

  const { hidePost, restorePost } = useMuralPosts(cellId);

  const [novoComentario, setNovoComentario] = useState("");

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;
    
    try {
      await addComentario(novoComentario.trim());
      setNovoComentario("");
    } catch (error) {
      // Error handled in hook
    }
  };

  if (authLoading || cellsLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasAccess || !post) {
    navigate(-1);
    return null;
  }

  const isHidden = post.status === "oculto";
  const autorNome = post.autor?.nickname || post.autor?.full_name || "Voluntário";
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  // Filter comments - show hidden only to moderators
  const visibleComentarios = canModerate
    ? comentarios
    : comentarios.filter(c => c.status === "publicado");

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

      <div className="flex-1 space-y-6 animate-slide-up max-w-2xl mx-auto w-full">
        {/* Post Card */}
        <Card className={cn(isHidden && "opacity-60 border-destructive/30")}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", MURAL_TIPO_COLORS[post.tipo as MuralPostTipo])}
                >
                  {MURAL_TIPO_LABELS[post.tipo as MuralPostTipo]}
                </Badge>
                
                {isHidden && (
                  <Badge variant="destructive" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Oculto
                  </Badge>
                )}
              </div>
              
              {canModerate && (
                <div className="flex gap-1">
                  {isHidden ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restorePost(post.id)}
                      className="h-7 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => hidePost(post.id)}
                      className="h-7 text-xs text-destructive"
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      Ocultar
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{autorNome}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              {post.titulo && (
                <h2 className="text-xl font-semibold">{post.titulo}</h2>
              )}
              <TTSButton 
                text={`${post.titulo || "Post do mural"}. ${post.corpo_markdown}`}
                variant="iconOnly"
              />
            </div>
            
            <p className="whitespace-pre-wrap">{post.corpo_markdown}</p>
            
            {/* Linked items */}
            {(post.mission || post.atividade) && (
              <div className="flex flex-wrap gap-3 pt-2">
                {post.mission && (
                  <Link 
                    to={`/voluntario/missao/${post.mission.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm">{post.mission.title}</span>
                  </Link>
                )}
                {post.atividade && (
                  <Link 
                    to={`/voluntario/agenda/${post.atividade.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm">{post.atividade.titulo}</span>
                  </Link>
                )}
              </div>
            )}
            
            <Separator />
            
            {/* Reactions */}
            <MuralReactionsBar
              reacoesCounts={reacoesCounts}
              userReactions={userReactions}
              onToggle={toggleReacao}
            />
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="font-semibold">
            Comentários ({visibleComentarios.length})
          </h3>
          
          {/* Comment Form */}
          {isMember && !isHidden && (
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicione um comentário..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={2}
                className="flex-1"
                maxLength={1000}
              />
              <Button 
                onClick={handleAddComentario}
                disabled={!novoComentario.trim() || isAddingComentario}
                size="icon"
                className="h-auto"
              >
                {isAddingComentario ? (
                  <LoadingSpinner />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          
          {/* Comments List */}
          {visibleComentarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum comentário ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleComentarios.map((comentario) => (
                <MuralComentarioItem
                  key={comentario.id}
                  comentario={comentario}
                  canModerate={canModerate}
                  onHide={() => hideComentario(comentario.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

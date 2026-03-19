import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTopico, usePosts, useComentarios, useTopicos, ESCOPO_LABELS } from "@/hooks/useDebates";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { TransformToActionDialog } from "@/components/debates/TransformToActionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Send, 
  Eye, 
  EyeOff,
  Globe,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Hash,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Zap,
  Target,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SortOrder = "newest" | "oldest";

function AutorNome({ autorId }: { autorId: string }) {
  const { data: profile } = useQuery({
    queryKey: ["profile", autorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("nickname, full_name")
        .eq("id", autorId)
        .single();
      if (error) return null;
      return data;
    },
  });

  return (
    <span className="font-medium">
      {profile?.nickname || profile?.full_name || "Voluntário"}
    </span>
  );
}

function PostCard({
  post,
  isAdmin,
  canPost,
  onToggleOculto,
  onTransformToMission,
  onTransformToDemanda,
}: {
  post: { id: string; autor_id: string; texto: string; oculto: boolean; created_at: string };
  isAdmin: boolean;
  canPost: boolean;
  onToggleOculto: (id: string, oculto: boolean) => void;
  onTransformToMission: (postId: string, texto: string) => void;
  onTransformToDemanda: (postId: string, texto: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { comentarios, isLoading, createComentario, toggleOculto: toggleComentarioOculto } = useComentarios(post.id);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createComentario(newComment.trim());
      setNewComment("");
      toast.success("Comentário adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar comentário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComentarioOculto = async (id: string, currentOculto: boolean) => {
    try {
      await toggleComentarioOculto({ id, oculto: !currentOculto });
      toast.success(currentOculto ? "Comentário restaurado" : "Comentário ocultado");
    } catch (error) {
      toast.error("Erro ao atualizar comentário");
    }
  };

  // Count hidden comments for admin view
  const hiddenCount = comentarios.filter(c => c.oculto).length;
  
  // For non-admins, show placeholder for hidden content
  const displayComentarios = useMemo(() => {
    if (isAdmin) return comentarios;
    return comentarios.map(c => ({
      ...c,
      isHidden: c.oculto,
    }));
  }, [comentarios, isAdmin]);

  return (
    <div className={`card-luta ${post.oculto && !isAdmin ? "hidden" : ""} ${post.oculto ? "border-destructive/50" : ""}`}>
      {/* Hidden post placeholder for non-admins */}
      {post.oculto && !isAdmin ? (
        <div className="flex items-center gap-3 py-2 text-muted-foreground">
          <ShieldAlert className="h-5 w-5" />
          <p className="text-sm italic">Conteúdo ocultado pela moderação.</p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AutorNome autorId={post.autor_id} />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(post.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
                {post.oculto && isAdmin && (
                  <Badge variant="destructive" className="text-xs">Oculto</Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.texto}</p>
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex items-center gap-1">
                {/* Transform to action dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Transformar em ação">
                      <Zap className="h-4 w-4 text-primary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onTransformToMission(post.id, post.texto)}>
                      <Target className="h-4 w-4 mr-2" />
                      Transformar em Missão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTransformToDemanda(post.id, post.texto)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Transformar em Demanda
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Hide/Show button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleOculto(post.id, post.oculto)}
                  title={post.oculto ? "Restaurar" : "Ocultar"}
                >
                  {post.oculto ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="mt-4 pt-3 border-t border-border">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>
                {comentarios.filter(c => !c.oculto).length} comentário{comentarios.filter(c => !c.oculto).length !== 1 ? "s" : ""}
                {isAdmin && hiddenCount > 0 && (
                  <span className="text-destructive ml-1">({hiddenCount} oculto{hiddenCount !== 1 ? "s" : ""})</span>
                )}
              </span>
              {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showComments && (
              <div className="mt-3 space-y-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (
                  <>
                    {displayComentarios.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
                    )}
                    
                    {displayComentarios.map((comentario) => (
                      <div
                        key={comentario.id}
                        className={`pl-4 border-l-2 ${
                          comentario.oculto ? "border-destructive/30" : "border-primary/30"
                        }`}
                      >
                        {/* Hidden comment placeholder for non-admins */}
                        {comentario.oculto && !isAdmin ? (
                          <div className="flex items-center gap-2 py-1 text-muted-foreground">
                            <ShieldAlert className="h-4 w-4" />
                            <p className="text-xs italic">Comentário ocultado pela moderação.</p>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AutorNome autorId={comentario.autor_id} />
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comentario.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                                {comentario.oculto && isAdmin && (
                                  <Badge variant="destructive" className="text-xs">Oculto</Badge>
                                )}
                              </div>
                              <p className="text-sm">{comentario.texto}</p>
                            </div>

                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleComentarioOculto(comentario.id, comentario.oculto)}
                                title={comentario.oculto ? "Restaurar" : "Ocultar"}
                              >
                                {comentario.oculto ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Comment input for approved users */}
                    {canPost ? (
                      <div className="flex gap-2 mt-3">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Adicionar comentário..."
                          rows={2}
                          className="flex-1 text-sm"
                        />
                        <Button
                          size="icon"
                          onClick={handleSubmitComment}
                          disabled={isSubmitting || !newComment.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-muted/50 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <p className="text-xs">Aguardando aprovação para comentar.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DebateTopico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();
  const { isApproved } = useVolunteerStatus();
  const { toggleOculto: toggleTopicoOculto } = useTopicos();
  
  const { data: topico, isLoading: topicoLoading } = useTopico(id);
  const { posts, isLoading: postsLoading, createPost, toggleOculto } = usePosts(id);
  
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  
  // Transform to action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"mission" | "demanda">("mission");
  const [actionTitle, setActionTitle] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionPostId, setActionPostId] = useState<string | undefined>();

  const canPost = isApproved;
  const isAdmin = isCoordinator();

  // IMPORTANT: All hooks must be called before any conditional returns
  // Filter and sort posts
  const displayPosts = useMemo(() => {
    if (!posts) return [];
    
    // Sort by date
    const sorted = [...posts].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  }, [posts, sortOrder]);

  const visiblePostsCount = posts?.filter(p => !p.oculto).length ?? 0;
  const hiddenPostsCount = posts?.filter(p => p.oculto).length ?? 0;

  // Conditional returns AFTER all hooks
  if (topicoLoading || postsLoading) {
    return <FullPageLoader />;
  }

  if (!topico) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Tópico não encontrado</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Este tópico pode ter sido removido ou você não tem acesso.
        </p>
        <Button onClick={() => navigate("/debates")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar aos Debates
        </Button>
      </div>
    );
  }

  const handleSubmitPost = async () => {
    if (!newPost.trim()) return;

    setIsSubmitting(true);
    try {
      await createPost(newPost.trim());
      setNewPost("");
      toast.success("Post adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePostOculto = async (postId: string, currentOculto: boolean) => {
    try {
      await toggleOculto({ id: postId, oculto: !currentOculto });
      toast.success(currentOculto ? "Post restaurado" : "Post ocultado");
    } catch (error) {
      toast.error("Erro ao atualizar post");
    }
  };

  const handleToggleTopicoOculto = async () => {
    try {
      await toggleTopicoOculto({ id: topico.id, oculto: !topico.oculto });
      toast.success(topico.oculto ? "Tópico restaurado" : "Tópico ocultado");
    } catch (error) {
      toast.error("Erro ao atualizar tópico");
    }
  };

  // Transform to action handlers
  const handleTransformToMissionFromTopic = () => {
    setActionMode("mission");
    setActionTitle(topico.tema);
    setActionDescription(topico.descricao || "");
    setActionPostId(undefined);
    setActionDialogOpen(true);
  };

  const handleTransformToDemandaFromTopic = () => {
    setActionMode("demanda");
    setActionTitle(topico.tema);
    setActionDescription(topico.descricao || "");
    setActionPostId(undefined);
    setActionDialogOpen(true);
  };

  const handleTransformToMissionFromPost = (postId: string, texto: string) => {
    setActionMode("mission");
    setActionTitle(`${topico.tema.substring(0, 50)}${topico.tema.length > 50 ? "..." : ""}`);
    setActionDescription(`${topico.descricao ? topico.descricao + "\n\n---\n\n" : ""}${texto}`);
    setActionPostId(postId);
    setActionDialogOpen(true);
  };

  const handleTransformToDemandaFromPost = (postId: string, texto: string) => {
    setActionMode("demanda");
    setActionTitle(`${topico.tema.substring(0, 50)}${topico.tema.length > 50 ? "..." : ""}`);
    setActionDescription(`${topico.descricao ? topico.descricao + "\n\n---\n\n" : ""}${texto}`);
    setActionPostId(postId);
    setActionDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Transform to Action Dialog */}
      <TransformToActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        mode={actionMode}
        defaultTitle={actionTitle}
        defaultDescription={actionDescription}
        topicoId={topico.id}
        postId={actionPostId}
        cellId={topico.celula_id}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/debates", { replace: true })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <div className="w-10" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Topic Header */}
        <div className={`card-luta ${topico.oculto ? "opacity-50 border-destructive" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {/* Escopo + badges */}
              <div className="flex items-center gap-2 mb-3">
                {topico.escopo === "global" ? (
                  <Globe className="h-4 w-4 text-primary" />
                ) : (
                  <Users className="h-4 w-4 text-primary" />
                )}
                <Badge variant="outline" className="text-xs">
                  {ESCOPO_LABELS[topico.escopo]}
                </Badge>
                {topico.oculto && (
                  <Badge variant="destructive" className="text-xs">Oculto</Badge>
                )}
              </div>

              {/* Tema */}
              <h1 className="text-2xl font-bold mb-2">{topico.tema}</h1>

              {/* Descrição */}
              {topico.descricao && (
                <p className="text-muted-foreground mb-3">{topico.descricao}</p>
              )}

              {/* Tags */}
              {topico.tags && topico.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {topico.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-secondary rounded-full flex items-center gap-1"
                    >
                      <Hash className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Data */}
              <p className="text-xs text-muted-foreground">
                Criado em {format(new Date(topico.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Admin: action buttons */}
            {isAdmin && (
              <div className="flex items-center gap-1">
                {/* Transform to action dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Transformar em ação">
                      <Zap className="h-4 w-4 text-primary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTransformToMissionFromTopic}>
                      <Target className="h-4 w-4 mr-2" />
                      Transformar em Missão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTransformToDemandaFromTopic}>
                      <FileText className="h-4 w-4 mr-2" />
                      Transformar em Demanda
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Hide/Show button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleTopicoOculto}
                  title={topico.oculto ? "Restaurar tópico" : "Ocultar tópico"}
                >
                  {topico.oculto ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* New Post Form */}
        {canPost ? (
          <div className="card-luta">
            <h3 className="font-bold mb-3">Contribuir ao debate</h3>
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Compartilhe sua opinião, experiência ou proposta..."
              rows={3}
            />
            <Button
              onClick={handleSubmitPost}
              disabled={isSubmitting || !newPost.trim()}
              className="mt-3 gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Enviando..." : "Publicar"}
            </Button>
          </div>
        ) : (
          <div className="card-luta text-center py-4 border-dashed">
            <p className="text-muted-foreground text-sm">
              Aguarde aprovação para participar dos debates.
            </p>
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {visiblePostsCount} contribuição{visiblePostsCount !== 1 ? "ões" : ""}
              {isAdmin && hiddenPostsCount > 0 && (
                <span className="text-destructive text-sm font-normal ml-2">
                  ({hiddenPostsCount} oculta{hiddenPostsCount !== 1 ? "s" : ""})
                </span>
              )}
            </h3>
            
            {/* Sort toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="text-xs gap-1"
            >
              <Clock className="h-3 w-3" />
              {sortOrder === "newest" ? "Mais recentes" : "Mais antigos"}
            </Button>
          </div>

          {displayPosts.length === 0 ? (
            <div className="card-luta text-center py-6">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {canPost 
                  ? "Nenhuma contribuição ainda. Seja o primeiro!" 
                  : "Nenhuma contribuição ainda."}
              </p>
            </div>
          ) : (
            displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin={isAdmin}
                canPost={canPost}
                onToggleOculto={handleTogglePostOculto}
                onTransformToMission={handleTransformToMissionFromPost}
                onTransformToDemanda={handleTransformToDemandaFromPost}
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

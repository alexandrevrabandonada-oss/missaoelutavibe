import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useMuralPosts, MuralPostTipo, MURAL_TIPO_LABELS } from "@/hooks/useMural";

const ALLOWED_TIPOS: MuralPostTipo[] = ['debate', 'chamado', 'relato', 'evidencia', 'material'];

export default function VoluntarioCelulaMuralNovo() {
  const navigate = useNavigate();
  const { cellId } = useParams<{ cellId: string }>();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { userCellIds, isLoading: cellsLoading } = useUserCells();
  
  const activeCellId = cellId || userCellIds[0];
  const isMember = activeCellId ? userCellIds.includes(activeCellId) : false;

  const { createPost, isCreating } = useMuralPosts(activeCellId);

  const [form, setForm] = useState({
    tipo: "relato" as MuralPostTipo,
    titulo: "",
    corpo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.corpo.trim()) return;

    try {
      await createPost({
        escopo_id: activeCellId!,
        tipo: form.tipo,
        titulo: form.titulo.trim() || undefined,
        corpo_markdown: form.corpo.trim(),
      });
      navigate(`/voluntario/celula/${activeCellId}/mural`);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (authLoading || cellsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasAccess || !isMember) {
    navigate(-1);
    return null;
  }

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

      <div className="flex-1 space-y-6 animate-slide-up max-w-xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold">Novo Post</h1>
          <p className="text-muted-foreground text-sm">
            Compartilhe com sua célula
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo do Post</Label>
            <Select 
              value={form.tipo} 
              onValueChange={(v) => setForm({ ...form, tipo: v as MuralPostTipo })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_TIPOS.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {MURAL_TIPO_LABELS[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título (opcional) */}
          <div className="space-y-2">
            <Label>Título (opcional)</Label>
            <Input
              placeholder="Título do post..."
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              maxLength={100}
            />
          </div>

          {/* Conteúdo */}
          <div className="space-y-2">
            <Label>Conteúdo *</Label>
            <Textarea
              placeholder="Escreva seu post aqui..."
              value={form.corpo}
              onChange={(e) => setForm({ ...form, corpo: e.target.value })}
              rows={8}
              required
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.corpo.length}/2000
            </p>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full gap-2"
            disabled={!form.corpo.trim() || isCreating}
          >
            {isCreating ? (
              <LoadingSpinner />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Publicar
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

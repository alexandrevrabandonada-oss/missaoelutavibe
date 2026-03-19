import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserCells } from "@/hooks/useUserCells";
import { useTickets, CATEGORIA_LABELS, TicketCategoria } from "@/hooks/useTickets";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function VoluntarioInboxNovo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { userCells } = useUserCells();
  const { createTicket, isCreating } = useTickets();

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<TicketCategoria | "">("");
  const [mensagem, setMensagem] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || !categoria || !mensagem.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const ticket = await createTicket({
        titulo: titulo.trim(),
        categoria,
        mensagemInicial: mensagem.trim(),
        cidade: profile?.city || undefined,
        celulaId: userCells[0]?.id || undefined,
      });
      
      navigate(`/voluntario/inbox/${ticket.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const categorias = Object.entries(CATEGORIA_LABELS) as [TicketCategoria, string][];

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/inbox")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Novo Ticket</h1>
            <p className="text-xs text-muted-foreground">Envie sua dúvida ou solicitação</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Título *</label>
            <Input
              placeholder="Resumo da sua dúvida ou solicitação"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria *</label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as TicketCategoria)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem *</label>
            <Textarea
              placeholder="Descreva sua dúvida ou solicitação em detalhes..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
            />
          </div>

          {/* Info */}
          <div className="bg-muted/50 border rounded-md p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-muted-foreground">
                <p>Seu ticket será enviado para a coordenação da sua região.</p>
                <p className="mt-1">Limite: 3 tickets por dia.</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="btn-luta w-full"
            disabled={isCreating || !titulo.trim() || !categoria || !mensagem.trim()}
          >
            {isCreating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Ticket
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}

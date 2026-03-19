import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useDemandas, DEMANDA_TIPO_LABELS, DEMANDA_PRIORIDADE_LABELS, DemandaTipo, DemandaPrioridade } from "@/hooks/useDemandas";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  MessageSquare,
  Send,
  Loader2
} from "lucide-react";
import { useEffect } from "react";

export default function VoluntarioDemandaNova() {
  const { user } = useAuth();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const { createDemanda, isCreating } = useDemandas();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<DemandaTipo | "">("");
  const [descricao, setDescricao] = useState("");
  const [territorio, setTerritorio] = useState("");
  const [contato, setContato] = useState("");
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("media");

  // Redirect unapproved users
  useEffect(() => {
    if (!isStatusLoading && (isPending || isRejected)) {
      navigate("/aguardando-aprovacao", { replace: true });
    }
  }, [isPending, isRejected, isStatusLoading, navigate]);

  if (isStatusLoading) {
    return <FullPageLoader />;
  }

  if (!isApproved) {
    return <FullPageLoader />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !tipo || !descricao.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título, tipo e descrição",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDemanda({
        titulo: titulo.trim(),
        tipo: tipo as DemandaTipo,
        descricao: descricao.trim(),
        territorio: territorio.trim() || null,
        contato: contato.trim() || null,
        prioridade,
      });

      toast({
        title: "Demanda criada!",
        description: "Sua demanda foi registrada com sucesso",
      });

      navigate("/voluntario/demandas");
    } catch (error) {
      toast({
        title: "Erro ao criar demanda",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/demandas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Nova Demanda</span>
          </div>
          <h1 className="text-2xl font-bold">Registrar Demanda</h1>
          <p className="text-muted-foreground mt-1">
            Comunique necessidades do território para a coordenação
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo da demanda"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as DemandaTipo)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEMANDA_TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a demanda em detalhes..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="territorio">Território / Local</Label>
            <Input
              id="territorio"
              value={territorio}
              onChange={(e) => setTerritorio(e.target.value)}
              placeholder="Bairro, rua, região..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contato">Contato (opcional)</Label>
            <Input
              id="contato"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Telefone ou referência de contato"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prioridade">Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as DemandaPrioridade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEMANDA_PRIORIDADE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full btn-luta"
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Demanda
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}

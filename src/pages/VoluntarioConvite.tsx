import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useConvites, CANAIS } from "@/hooks/useConvites";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Copy, Link2, Users, CheckCircle, XCircle, Share2, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoluntarioConvite() {
  const navigate = useNavigate();
  const [selectedCanal, setSelectedCanal] = useState<string>("");
  const { profile } = useProfile();
  const { 
    convitesComUsos, 
    isLoading, 
    createConvite, 
    isCreating,
    updateConvite
  } = useConvites();

  const handleCreateConvite = () => {
    if (!selectedCanal) {
      toast.error("Selecione um canal de divulgação");
      return;
    }

    createConvite(
      { 
        canal_declarado: selectedCanal,
        escopo_cidade: profile?.city || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Convite criado com sucesso!");
          setSelectedCanal("");
        },
        onError: (error) => {
          toast.error("Erro ao criar convite: " + error.message);
        },
      }
    );
  };

  const buildInviteLink = (code: string) =>
    `${window.location.origin}/aceitar-convite?ref=${code}&mode=signup`;

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(buildInviteLink(code));
    toast.success("Link copiado!");
  };

  const shareLink = async (code: string) => {
    const link = buildInviteLink(code);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Missão ÉLuta - Convite",
          text: "Junte-se à Missão ÉLuta! Sua primeira missão em 10 minutos.",
          url: link,
        });
      } catch (error) {
        copyLink(code);
      }
    } else {
      copyLink(code);
    }
  };

  const toggleConviteAtivo = (id: string, currentAtivo: boolean) => {
    updateConvite(
      { id, ativo: !currentAtivo },
      {
        onSuccess: () => {
          toast.success(currentAtivo ? "Convite desativado" : "Convite reativado");
        },
      }
    );
  };

  const totalConvidados = convitesComUsos.reduce((sum, c) => sum + c.total_usos, 0);

  return (
    <AppShell>
      <div className="p-4 pb-20 space-y-6">
        {/* Header with back button */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/voluntario/hoje")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Meu Convite</h1>
              <p className="text-muted-foreground">
                Compartilhe seu link e ajude a expandir o movimento
              </p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalConvidados}</p>
                  <p className="text-sm text-muted-foreground">
                    {totalConvidados === 1 ? "pessoa convidada" : "pessoas convidadas"}
                  </p>
                </div>
              </div>
              <Sparkles className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        {/* Create New Invite */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar Novo Convite</CardTitle>
            <CardDescription>
              Selecione o canal onde vai compartilhar para melhor rastreamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCanal} onValueChange={setSelectedCanal}>
              <SelectTrigger>
                <SelectValue placeholder="Onde vai compartilhar?" />
              </SelectTrigger>
              <SelectContent>
                {CANAIS.map((canal) => (
                  <SelectItem key={canal.value} value={canal.value}>
                    {canal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleCreateConvite} 
              className="w-full" 
              disabled={isCreating || !selectedCanal}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {isCreating ? "Criando..." : "Gerar Link de Convite"}
            </Button>
          </CardContent>
        </Card>

        {/* My Invites List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Meus Convites</h2>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : convitesComUsos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Você ainda não criou nenhum convite.</p>
                <p className="text-sm">Crie um acima para começar a convidar!</p>
              </CardContent>
            </Card>
          ) : (
            convitesComUsos.map((convite) => (
              <Card key={convite.id} className={!convite.ativo ? "opacity-60" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-secondary px-2 py-1 rounded text-sm font-mono">
                        {convite.code}
                      </code>
                      {convite.ativo ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {convite.total_usos} {convite.limite_uso ? `/ ${convite.limite_uso}` : ""}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
                    {convite.canal_declarado && (
                      <span className="bg-secondary px-2 py-0.5 rounded">
                        {CANAIS.find(c => c.value === convite.canal_declarado)?.label || convite.canal_declarado}
                      </span>
                    )}
                    {convite.campanha_tag && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                        #{convite.campanha_tag}
                      </span>
                    )}
                    <span>
                      Criado em {format(new Date(convite.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => copyLink(convite.code)}
                      disabled={!convite.ativo}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => shareLink(convite.code)}
                      disabled={!convite.ativo}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Compartilhar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleConviteAtivo(convite.id, convite.ativo)}
                    >
                      {convite.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pre-campaign Badge */}
        <div className="text-center pt-4">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Modo Pré-Campanha Ativo
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            Cada convite rastreia a origem para análise do crescimento da base
          </p>
        </div>
      </div>
    </AppShell>
  );
}

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserCells } from "@/hooks/useUserCells";
import { usePlenarias } from "@/hooks/usePlenarias";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Vote, 
  MessageCircle, 
  Clock, 
  CheckCircle2,
  Users,
  Filter,
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function VoluntarioPlenaria() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { userCells } = useUserCells();
  const navigate = useNavigate();
  const [filterScope, setFilterScope] = useState<string | null>(null);

  const primaryCellId = userCells?.[0]?.id;

  const { plenarias, isLoading } = usePlenarias(
    filterScope || undefined,
    filterScope === "celula" ? primaryCellId : filterScope === "cidade" ? profile?.city || undefined : undefined
  );

  if (profileLoading) {
    return <FullPageLoader text="Carregando..." />;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const abertas = plenarias.filter((p) => p.status === "aberta");
  const encerradas = plenarias.filter((p) => p.status === "encerrada");

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col bg-background texture-concrete">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">Plenárias</h1>
                <p className="text-xs text-muted-foreground">Decisões coletivas</p>
              </div>
            </div>
            <Vote className="h-6 w-6 text-primary" />
          </div>
        </header>

        <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
          <div className="space-y-6 animate-slide-up">
            {/* Scope Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={filterScope === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterScope(null)}
              >
                Todas
              </Button>
              {primaryCellId && (
                <Button
                  variant={filterScope === "celula" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterScope("celula")}
                >
                  Minha Célula
                </Button>
              )}
              {profile?.city && (
                <Button
                  variant={filterScope === "cidade" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterScope("cidade")}
                >
                  Minha Cidade
                </Button>
              )}
            </div>

            {isLoading ? (
              <FullPageLoader text="Carregando plenárias..." />
            ) : plenarias.length === 0 ? (
              <div className="text-center py-12">
                <Vote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma plenária disponível</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Novas plenárias aparecerão aqui
                </p>
              </div>
            ) : (
              <>
                {/* Open Plenarias */}
                {abertas.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Abertas para votação ({abertas.length})
                    </h2>
                    {abertas.map((plenaria) => (
                      <PlenariaCard
                        key={plenaria.id}
                        plenaria={plenaria}
                        onClick={() => navigate(`/voluntario/plenaria/${plenaria.id}`)}
                      />
                    ))}
                  </div>
                )}

                {/* Closed Plenarias */}
                {encerradas.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Encerradas ({encerradas.length})
                    </h2>
                    {encerradas.map((plenaria) => (
                      <PlenariaCard
                        key={plenaria.id}
                        plenaria={plenaria}
                        onClick={() => navigate(`/voluntario/plenaria/${plenaria.id}`)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}

function PlenariaCard({ plenaria, onClick }: { plenaria: any; onClick: () => void }) {
  const isOpen = plenaria.status === "aberta";
  const encerraEm = new Date(plenaria.encerra_em);
  const isExpired = isPast(encerraEm);

  // Calculate leading option
  const leadingOption = plenaria.opcoes?.reduce((max: any, opt: any) => 
    opt.votos > (max?.votos || 0) ? opt : max, null
  );
  const totalVotos = plenaria.total_votos || 0;
  const leadingPercent = leadingOption && totalVotos > 0 
    ? Math.round((leadingOption.votos / totalVotos) * 100) 
    : 0;

  return (
    <button
      className="card-luta w-full text-left hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isOpen ? "default" : "secondary"} className="text-xs">
              {isOpen ? "Aberta" : "Encerrada"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {plenaria.scope_tipo === "celula" ? "Célula" : "Cidade"}
            </Badge>
            {plenaria.user_voted && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                ✓ Votei
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-sm line-clamp-2">{plenaria.titulo}</h3>
          {plenaria.resumo && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{plenaria.resumo}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {plenaria.total_votos} votos
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {plenaria.total_comentarios} comentários
        </span>
        {isOpen && (
          <span className="flex items-center gap-1 text-primary">
            <Clock className="h-3 w-3" />
            {isExpired ? "Expirou" : `Encerra ${formatDistanceToNow(encerraEm, { locale: ptBR, addSuffix: true })}`}
          </span>
        )}
      </div>

      {/* Leading option preview */}
      {leadingOption && totalVotos > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="truncate max-w-[70%]">{leadingOption.texto}</span>
            <span className="font-bold">{leadingPercent}%</span>
          </div>
          <Progress value={leadingPercent} className="h-1.5" />
        </div>
      )}
    </button>
  );
}

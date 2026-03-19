import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePendingStatus } from "@/hooks/useRequireApproval";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { PendingUserBanner } from "@/components/layout/PendingUserBanner";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { VoluntarioNavBar } from "@/components/navigation/VoluntarioNavBar";
import { 
  ArrowLeft,
  Heart,
  BookOpen,
  Zap,
  Target,
  Camera,
  FileText,
  MessagesSquare,
  HelpCircle,
  Home,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function VoluntarioAjuda() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isPending, isRejected, isApproved, isLoading } = usePendingStatus();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleRefreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: ["volunteer-status"] });
  };

  if (isLoading) {
    return <FullPageLoader text="Verificando status..." />;
  }

  // Determine navigation based on user status
  const canNavigateHome = isApproved;

  return (
    <>
    <div className="min-h-screen flex flex-col p-6 pb-24 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {canNavigateHome ? (
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <Logo size="sm" />
        <div className="flex items-center gap-2 ml-auto">
          {canNavigateHome ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/voluntario")}
            >
              <Home className="h-5 w-5" />
            </Button>
          ) : (
            <>
              {(isPending || isRejected) && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleRefreshStatus}
                  title="Verificar status"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-8 animate-slide-up">
        {/* Pending/Rejected Banner */}
        <PendingUserBanner />

        {/* Title */}
        <div className="text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-pink-500/20 flex items-center justify-center mb-4">
            <HelpCircle className="h-8 w-8 text-pink-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Como funciona</h1>
          <p className="text-muted-foreground">Orientações rápidas para voluntários</p>
        </div>

        {/* Respira • Estuda • Age */}
        <section className="card-luta">
          <h2 className="text-lg font-bold mb-4 text-center">Respira • Estuda • Age</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Nossa metodologia de ação é baseada em três pilares:
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="font-bold text-pink-500">RESPIRA</p>
                <p className="text-sm text-muted-foreground">
                  Cuide de si primeiro. Leia as orientações, entenda o contexto, 
                  prepare-se emocionalmente antes de agir.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-bold text-blue-500">ESTUDA</p>
                <p className="text-sm text-muted-foreground">
                  Participe dos debates, troque ideias com outros voluntários, 
                  faça as formações disponíveis.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-orange-500">AGE</p>
                <p className="text-sm text-muted-foreground">
                  Execute suas missões, registre evidências, 
                  reporte demandas do território.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Missões */}
        <section className="card-luta">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-bold">Missões</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Missões são tarefas que você pode aceitar e executar. 
            Cada missão tem instruções claras e pode requerer envio de evidência.
          </p>
          <ul className="mt-3 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Veja as missões disponíveis</li>
            <li>Aceite uma missão para começar</li>
            <li>Siga as instruções e execute</li>
            <li>Envie a evidência quando concluir</li>
          </ul>
        </section>

        {/* Evidências */}
        <section className="card-luta">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Camera className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="font-bold">Evidências</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Evidências são provas de que você executou a missão. 
            Podem ser fotos, vídeos, textos ou áudios.
          </p>
          <ul className="mt-3 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Tire foto ou grave vídeo/áudio</li>
            <li>Descreva o que fez</li>
            <li>Envie para validação</li>
            <li>Aguarde o feedback</li>
          </ul>
        </section>

        {/* Demandas */}
        <section className="card-luta">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-bold">Demandas da Base</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Demandas são necessidades que você identifica no território. 
            Registre para que a coordenação possa avaliar e tomar providências.
          </p>
          <ul className="mt-3 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Identifique uma necessidade</li>
            <li>Descreva com detalhes</li>
            <li>Informe localização se possível</li>
            <li>Acompanhe o andamento</li>
          </ul>
        </section>

        {/* Debates */}
        <section className="card-luta">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <MessagesSquare className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="font-bold">Debates</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Debates são espaços de discussão e troca de ideias. 
            Participe, contribua e aprenda com outros voluntários.
          </p>
          <ul className="mt-3 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Explore os tópicos existentes</li>
            <li>Comente e contribua</li>
            <li>Crie novos tópicos</li>
            <li>Respeite as opiniões diferentes</li>
          </ul>
        </section>

        {/* Back button - only for approved users */}
        {canNavigateHome && (
          <Button 
            onClick={() => navigate("/voluntario")} 
            className="w-full"
            variant="outline"
          >
            Voltar ao Início
          </Button>
        )}
      </div>

      {/* Signature */}
      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
    {canNavigateHome && <VoluntarioNavBar />}
    </>
  );
}

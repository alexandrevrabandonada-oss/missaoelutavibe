import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { AppErrorBoundary } from "@/components/ops/AppErrorBoundary";
import { getLegacyRedirects } from "@/components/routing/LegacyRouteRedirects";
import VolunteerGuardLayout from "@/components/routing/VolunteerGuardLayout";
import CoordGuardLayout from "@/components/routing/CoordGuardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Missao from "./pages/Missao";
import Evidencia from "./pages/Evidencia";
import Admin from "./pages/Admin";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import Voluntario from "./pages/Voluntario";
import VoluntarioMissoes from "./pages/VoluntarioMissoes";
import VoluntarioMissao from "./pages/VoluntarioMissao";
import MissionRunnerPage from "./pages/MissionRunnerPage";
import VoluntarioEvidencia from "./pages/VoluntarioEvidencia";
import VoluntarioDemandas from "./pages/VoluntarioDemandas";
import VoluntarioDemandaNova from "./pages/VoluntarioDemandaNova";
import VoluntarioDemandaDetalhe from "./pages/VoluntarioDemandaDetalhe";
import VoluntarioAjuda from "./pages/VoluntarioAjuda";
import VoluntarioInbox from "./pages/VoluntarioInbox";
import VoluntarioInboxNovo from "./pages/VoluntarioInboxNovo";
import VoluntarioInboxDetalhe from "./pages/VoluntarioInboxDetalhe";
import VoluntarioAnuncios from "./pages/VoluntarioAnuncios";
import VoluntarioAnuncioDetalhe from "./pages/VoluntarioAnuncioDetalhe";
import AdminDemandaDetalhe from "./pages/AdminDemandaDetalhe";
import AdminValidar from "./pages/AdminValidar";
import AdminVoluntarios from "./pages/AdminVoluntarios";
import AdminSetup from "./pages/AdminSetup";
import AdminPapeis from "./pages/AdminPapeis";
import AdminRoles from "./pages/AdminRoles";
import AdminInbox from "./pages/AdminInbox";
import AdminInboxDetalhe from "./pages/AdminInboxDetalhe";
import AdminAnuncios from "./pages/AdminAnuncios";
import AdminAnuncioEditor from "./pages/AdminAnuncioEditor";
import Debates from "./pages/Debates";
import DebateNovo from "./pages/DebateNovo";
import DebateTopico from "./pages/DebateTopico";
import Materiais from "./pages/Materiais";
import MaterialDetalhe from "./pages/MaterialDetalhe";
import Formacao from "./pages/Formacao";
import FormacaoCurso from "./pages/FormacaoCurso";
import FormacaoAula from "./pages/FormacaoAula";
import Notificacoes from "./pages/Notificacoes";
import VoluntarioConvite from "./pages/VoluntarioConvite";
import AdminOrigens from "./pages/AdminOrigens";
import VoluntarioAgenda from "./pages/VoluntarioAgenda";
import VoluntarioAgendaDetalhe from "./pages/VoluntarioAgendaDetalhe";
import AdminAgenda from "./pages/AdminAgenda";
import AdminAgendaEditor from "./pages/AdminAgendaEditor";
import VoluntarioSemana from "./pages/VoluntarioSemana";
import AdminSemana from "./pages/AdminSemana";
import AdminSemanaEditor from "./pages/AdminSemanaEditor";
import AdminPilotPanel from "./pages/AdminPilotPanel";
import AdminOps from "./pages/AdminOps";
import AdminTalentos from "./pages/AdminTalentos";
import VoluntarioCelulaMural from "./pages/VoluntarioCelulaMural";
import VoluntarioCelulaMuralNovo from "./pages/VoluntarioCelulaMuralNovo";
import VoluntarioCelulaMuralPost from "./pages/VoluntarioCelulaMuralPost";
import VoluntarioSkills from "./pages/VoluntarioSkills";
import VoluntarioTalentos from "./pages/VoluntarioTalentos";
import VoluntarioCRM from "./pages/VoluntarioCRM";
import VoluntarioCRMNovo from "./pages/VoluntarioCRMNovo";
import AdminCRM from "./pages/AdminCRM";
import AdminLGPD from "./pages/AdminLGPD";
import AdminSquads from "./pages/AdminSquads";
import AdminHoje from "./pages/AdminHoje";
import VoluntarioSquads from "./pages/VoluntarioSquads";
import VoluntarioHoje from "./pages/VoluntarioHoje";
import VoluntarioTop from "./pages/VoluntarioTop";
import AdminTop from "./pages/AdminTop";
import AdminModeracao from "./pages/AdminModeracao";
import VoluntarioPrimeirosPassos from "./pages/VoluntarioPrimeirosPassos";
import VoluntarioPlenaria from "./pages/VoluntarioPlenaria";
import VoluntarioPlenariaDetalhe from "./pages/VoluntarioPlenariaDetalhe";
import AdminPlenaria from "./pages/AdminPlenaria";
import VoluntarioConvitesPapeis from "./pages/VoluntarioConvitesPapeis";
import AceitarConvite from "./pages/AceitarConvite";
import AceitarConviteRef from "./pages/AceitarConviteRef";
import VoluntarioBase from "./pages/VoluntarioBase";
import AdminFabrica from "./pages/AdminFabrica";
import AdminPlaybook from "./pages/AdminPlaybook";
import AdminTerritorio from "./pages/AdminTerritorio";
import VoluntarioTerritorio from "./pages/VoluntarioTerritorio";
import Redirect from "./pages/Redirect";
import ConviteMini from "./pages/ConviteMini";
import NotFound from "./pages/NotFound";
import CoordCelulaHub from "./pages/CoordCelulaHub";
import CelulaMembroContainer from "./pages/CelulaMembroContainer";
import AdminRoteiros from "./pages/AdminRoteiros";
import VoluntarioMissaoRua from "./pages/VoluntarioMissaoRua";
import VoluntarioMissaoConversa from "./pages/VoluntarioMissaoConversa";
import CoordenadorHoje from "./pages/CoordenadorHoje";
import CoordenadorTerritorio from "./pages/CoordenadorTerritorio";
import PublicCertificate from "./pages/PublicCertificate";
import VoluntarioAcoes from "./pages/VoluntarioAcoes";
import VoluntarioMeusRegistros from "./pages/VoluntarioMeusEnvios";
import FabricaArquivos from "./pages/FabricaArquivos";
import VoluntarioAprender from "./pages/VoluntarioAprender";
import VoluntarioAgir from "./pages/VoluntarioAgir";
import VoluntarioEu from "./pages/VoluntarioEu";
import VoluntarioImpacto from "./pages/VoluntarioImpacto";
import AdminDiagnostico from "./pages/AdminDiagnostico";
import AdminAjuda from "./pages/AdminAjuda";
import RedefinirSenha from "./pages/RedefinirSenha";
import RegistroRapido from "./pages/RegistroRapido";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function App() {
  return (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/aceitar-convite" element={<AceitarConviteRef />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/missao" element={<Missao />} />
            <Route path="/evidencia/:missionId" element={<Evidencia />} />
            {/* Admin/Coord routes guarded by role */}
            <Route element={<CoordGuardLayout />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            {/* All /voluntario/* routes guarded by approval status */}
            <Route element={<VolunteerGuardLayout />}>
              <Route path="/voluntario" element={<Voluntario />} />
              <Route path="/voluntario/aprender" element={<VoluntarioAprender />} />
              <Route path="/voluntario/agir" element={<VoluntarioAgir />} />
              <Route path="/voluntario/eu" element={<VoluntarioEu />} />
              <Route path="/voluntario/impacto" element={<VoluntarioImpacto />} />
              <Route path="/voluntario/missoes" element={<VoluntarioMissoes />} />
              <Route path="/voluntario/missao/:id" element={<VoluntarioMissao />} />
              <Route path="/voluntario/runner/:id" element={<MissionRunnerPage />} />
              <Route path="/voluntario/evidencia/:missionId" element={<VoluntarioEvidencia />} />
              <Route path="/voluntario/registro/:missionId" element={<RegistroRapido />} />
              <Route path="/voluntario/demandas" element={<VoluntarioDemandas />} />
              <Route path="/voluntario/demandas/nova" element={<VoluntarioDemandaNova />} />
              <Route path="/voluntario/demandas/:id" element={<VoluntarioDemandaDetalhe />} />
              <Route path="/voluntario/ajuda" element={<VoluntarioAjuda />} />
              <Route path="/voluntario/inbox" element={<VoluntarioInbox />} />
              <Route path="/voluntario/inbox/novo" element={<VoluntarioInboxNovo />} />
              <Route path="/voluntario/inbox/:id" element={<VoluntarioInboxDetalhe />} />
              <Route path="/voluntario/anuncios" element={<VoluntarioAnuncios />} />
              <Route path="/voluntario/anuncios/:id" element={<VoluntarioAnuncioDetalhe />} />
              <Route path="/voluntario/convite" element={<VoluntarioConvite />} />
              <Route path="/voluntario/agenda" element={<VoluntarioAgenda />} />
              <Route path="/voluntario/agenda/:id" element={<VoluntarioAgendaDetalhe />} />
              <Route path="/voluntario/semana" element={<VoluntarioSemana />} />
              <Route path="/voluntario/celula/:cellId/mural" element={<VoluntarioCelulaMural />} />
              <Route path="/voluntario/celula/:cellId/mural/novo" element={<VoluntarioCelulaMuralNovo />} />
              <Route path="/voluntario/celula/:cellId/mural/:postId" element={<VoluntarioCelulaMuralPost />} />
              <Route path="/voluntario/skills" element={<VoluntarioSkills />} />
              <Route path="/voluntario/talentos" element={<VoluntarioTalentos />} />
              <Route path="/voluntario/crm" element={<VoluntarioCRM />} />
              <Route path="/voluntario/crm/novo" element={<VoluntarioCRMNovo />} />
              <Route path="/voluntario/squads" element={<VoluntarioSquads />} />
              <Route path="/voluntario/hoje" element={<VoluntarioHoje />} />
              <Route path="/voluntario/acoes" element={<VoluntarioAcoes />} />
              <Route path="/voluntario/top" element={<VoluntarioTop />} />
              <Route path="/voluntario/primeiros-passos" element={<VoluntarioPrimeirosPassos />} />
              <Route path="/voluntario/plenaria" element={<VoluntarioPlenaria />} />
              <Route path="/voluntario/plenaria/:id" element={<VoluntarioPlenariaDetalhe />} />
              <Route path="/voluntario/convites-papeis" element={<VoluntarioConvitesPapeis />} />
              <Route path="/voluntario/base" element={<VoluntarioBase />} />
              <Route path="/voluntario/meus-registros" element={<VoluntarioMeusRegistros />} />
              <Route path="/voluntario/territorio" element={<VoluntarioTerritorio />} />
              <Route path="/voluntario/celula/:cellId" element={<CelulaMembroContainer />} />
              <Route path="/voluntario/missao-rua/:id" element={<VoluntarioMissaoRua />} />
              <Route path="/voluntario/missao-conversa/:id" element={<VoluntarioMissaoConversa />} />
            </Route>
            <Route path="/r/:code" element={<Redirect />} />
            <Route path="/convite-mini" element={<ConviteMini />} />
            <Route path="/voluntario/missao-rua/:id" element={<VoluntarioMissaoRua />} />
            <Route path="/voluntario/missao-conversa/:id" element={<VoluntarioMissaoConversa />} />
            <Route path="/s/cert/:code" element={<PublicCertificate />} />
            {/* Admin/Coord routes — role-guarded */}
            <Route element={<CoordGuardLayout />}>
              <Route path="/admin/roteiros" element={<AdminRoteiros />} />
              <Route path="/coordenador/hoje" element={<CoordenadorHoje />} />
              <Route path="/coordenador/territorio" element={<CoordenadorTerritorio />} />
              <Route path="/fabrica/arquivos" element={<FabricaArquivos />} />
              <Route path="/admin/diagnostico" element={<AdminDiagnostico />} />
              <Route path="/admin/ajuda" element={<AdminAjuda />} />
              <Route path="/admin/semana" element={<AdminSemana />} />
              <Route path="/admin/semana/:id" element={<AdminSemanaEditor />} />
              <Route path="/admin/piloto" element={<AdminPilotPanel />} />
              <Route path="/coordenador/celula/:celulaId" element={<CoordCelulaHub />} />
            </Route>
            
            {/* Legacy route redirects (hyphenated to canonical slash routes) */}
            {getLegacyRedirects().map(({ from, to }) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </HelmetProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
  );
}

export default App;

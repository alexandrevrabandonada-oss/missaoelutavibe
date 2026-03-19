/**
 * Route Manifest - Canonical route definitions extracted from the actual router
 * This is the single source of truth for all application routes
 */

import { LEGACY_ROUTE_MAP, getLegacyRedirects } from "@/components/routing/LegacyRouteRedirects";

export type RouteKind = 'page' | 'redirect' | 'alias' | 'legacy';

export interface RouteEntry {
  path: string;
  component: string;
  kind: RouteKind;
  target?: string; // For redirects/aliases
  area: string;
  description?: string;
}

export interface RouteConflict {
  path: string;
  entries: RouteEntry[];
  reason: string;
}

export interface LegacyRouteInfo {
  from: string;
  to: string;
  isActive: boolean;
}

export interface RouteManifest {
  routes: RouteEntry[];
  redirects: RouteEntry[];
  legacyRoutes: LegacyRouteInfo[];
  conflicts: RouteConflict[];
  counts: {
    pages: number;
    redirects: number;
    legacyRedirects: number;
    conflicts: number;
    total: number;
    // SSOT Registry counters (populated by SSOTRegistryCard)
    ssotDomains?: number;
    ssotChecks?: number;
    driftWarnings?: number;
  };
  generatedAt: string;
}

// Area detection based on path prefix
function getArea(path: string): string {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/coordenador')) return 'coord';
  if (path.startsWith('/voluntario')) return 'voluntario';
  if (path.startsWith('/fabrica')) return 'fabrica';
  if (path.startsWith('/formacao')) return 'formacao';
  if (path.startsWith('/debates')) return 'debates';
  if (path.startsWith('/materiais')) return 'materiais';
  if (path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/s/')) return 'share';
  if (path.startsWith('/r/')) return 'redirect';
  if (path.startsWith('/aceitar')) return 'convites';
  if (path.startsWith('/convite')) return 'convites';
  return 'publico';
}

/**
 * CANONICAL ROUTE DEFINITIONS
 * This array defines all routes in the application.
 * When adding new routes, add them here first, then in App.tsx
 */
export const CANONICAL_ROUTES: RouteEntry[] = [
  // Public pages
  { path: '/', component: 'Index', kind: 'page', area: 'publico', description: 'Landing page' },
  { path: '/auth', component: 'Auth', kind: 'page', area: 'auth', description: 'Login/Signup' },
  { path: '/onboarding', component: 'Onboarding', kind: 'page', area: 'auth', description: 'Onboarding flow' },
  { path: '/aguardando-aprovacao', component: 'AguardandoAprovacao', kind: 'page', area: 'auth', description: 'Approval waiting' },
  
  // Invite flow (canonical)
  { path: '/aceitar-convite', component: 'AceitarConviteRef', kind: 'page', area: 'convites', description: 'Signup invite validation (ref=XXXX)' },
  { path: '/aceitar/:token', component: 'AceitarConvite', kind: 'page', area: 'convites', description: 'Role invite acceptance (token)' },
  { path: '/convite-mini', component: 'ConviteMini', kind: 'page', area: 'convites', description: 'Quick invite landing' },
  { path: '/r/:code', component: 'Redirect', kind: 'page', area: 'redirect', description: 'Short link redirect' },
  
  // Legacy redirects (should point to canonical)
  { path: '/missao', component: 'Missao', kind: 'redirect', target: '/voluntario/missoes', area: 'publico', description: 'Legacy mission page' },
  { path: '/evidencia/:missionId', component: 'Evidencia', kind: 'redirect', target: '/voluntario/evidencia/:missionId', area: 'publico', description: 'Legacy evidence page' },
  
  // Shared pages
  { path: '/debates', component: 'Debates', kind: 'page', area: 'debates' },
  { path: '/debates/novo', component: 'DebateNovo', kind: 'page', area: 'debates' },
  { path: '/debates/topico/:id', component: 'DebateTopico', kind: 'page', area: 'debates' },
  { path: '/materiais', component: 'Materiais', kind: 'page', area: 'materiais' },
  { path: '/materiais/:id', component: 'MaterialDetalhe', kind: 'page', area: 'materiais' },
  { path: '/formacao', component: 'Formacao', kind: 'page', area: 'formacao' },
  { path: '/formacao/curso/:id', component: 'FormacaoCurso', kind: 'page', area: 'formacao' },
  { path: '/formacao/aula/:id', component: 'FormacaoAula', kind: 'page', area: 'formacao' },
  { path: '/notificacoes', component: 'Notificacoes', kind: 'page', area: 'publico' },
  { path: '/s/cert/:code', component: 'PublicCertificate', kind: 'page', area: 'share', description: 'Public certificate view' },
  { path: '/fabrica/arquivos', component: 'FabricaArquivos', kind: 'page', area: 'fabrica' },
  
  // Volunteer hub
  { path: '/voluntario', component: 'Voluntario', kind: 'page', area: 'voluntario', description: 'Volunteer hub' },
  { path: '/voluntario/hoje', component: 'VoluntarioHoje', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/aprender', component: 'VoluntarioAprender', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/agir', component: 'VoluntarioAgir', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/eu', component: 'VoluntarioEu', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/impacto', component: 'VoluntarioImpacto', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/missoes', component: 'VoluntarioMissoes', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/missao/:id', component: 'VoluntarioMissao', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/missao-rua/:id', component: 'VoluntarioMissaoRua', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/missao-conversa/:id', component: 'VoluntarioMissaoConversa', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/evidencia/:missionId', component: 'VoluntarioEvidencia', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/demandas', component: 'VoluntarioDemandas', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/demandas/nova', component: 'VoluntarioDemandaNova', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/demandas/:id', component: 'VoluntarioDemandaDetalhe', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/ajuda', component: 'VoluntarioAjuda', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/inbox', component: 'VoluntarioInbox', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/inbox/novo', component: 'VoluntarioInboxNovo', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/inbox/:id', component: 'VoluntarioInboxDetalhe', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/anuncios', component: 'VoluntarioAnuncios', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/anuncios/:id', component: 'VoluntarioAnuncioDetalhe', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/convite', component: 'VoluntarioConvite', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/convites-papeis', component: 'VoluntarioConvitesPapeis', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/agenda', component: 'VoluntarioAgenda', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/agenda/:id', component: 'VoluntarioAgendaDetalhe', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/semana', component: 'VoluntarioSemana', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/celula/:cellId/mural', component: 'VoluntarioCelulaMural', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/celula/:cellId/mural/novo', component: 'VoluntarioCelulaMuralNovo', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/celula/:cellId/mural/:postId', component: 'VoluntarioCelulaMuralPost', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/skills', component: 'VoluntarioSkills', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/talentos', component: 'VoluntarioTalentos', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/crm', component: 'VoluntarioCRM', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/crm/novo', component: 'VoluntarioCRMNovo', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/squads', component: 'VoluntarioSquads', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/acoes', component: 'VoluntarioAcoes', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/top', component: 'VoluntarioTop', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/primeiros-passos', component: 'VoluntarioPrimeirosPassos', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/plenaria', component: 'VoluntarioPlenaria', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/plenaria/:id', component: 'VoluntarioPlenariaDetalhe', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/base', component: 'VoluntarioBase', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/meus-registros', component: 'VoluntarioMeusRegistros', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/territorio', component: 'VoluntarioTerritorio', kind: 'page', area: 'voluntario' },
  { path: '/voluntario/celula/:cellId', component: 'CelulaMembroContainer', kind: 'page', area: 'voluntario', description: 'Cell member container - Visão, Missões, Mural (read-only), Memória' },
  
  // Coordinator hub (canonical entry point for coordination)
  { path: '/coordenador/hoje', component: 'CoordenadorHoje', kind: 'page', area: 'coord', description: 'Canonical coordination entry point - inbox, alerts, metrics' },
  { path: '/coordenador/territorio', component: 'CoordenadorTerritorio', kind: 'page', area: 'coord', description: 'Cell operations v0.1 - assignment requests, cell CRUD, coordinator promotion, team management (coord_roles v1)' },
  { path: '/coordenador/celula/:celulaId', component: 'CoordCelulaHub', kind: 'page', area: 'coord', description: 'Cell coordination hub - stats, validation queue, quick actions' },
  
  // Admin hub
  { path: '/admin', component: 'Admin', kind: 'page', area: 'admin', description: 'Admin dashboard' },
  { path: '/admin/hoje', component: 'AdminHoje', kind: 'page', area: 'admin' },
  { path: '/admin/validar', component: 'AdminValidar', kind: 'page', area: 'admin' },
  { path: '/admin/voluntarios', component: 'AdminVoluntarios', kind: 'page', area: 'admin' },
  { path: '/admin/demandas/:id', component: 'AdminDemandaDetalhe', kind: 'page', area: 'admin' },
  { path: '/admin/setup', component: 'AdminSetup', kind: 'page', area: 'admin' },
  { path: '/admin/papeis', component: 'AdminPapeis', kind: 'page', area: 'admin' },
  { path: '/admin/roles', component: 'AdminRoles', kind: 'page', area: 'admin' },
  { path: '/admin/inbox', component: 'AdminInbox', kind: 'page', area: 'admin' },
  { path: '/admin/inbox/:id', component: 'AdminInboxDetalhe', kind: 'page', area: 'admin' },
  { path: '/admin/anuncios', component: 'AdminAnuncios', kind: 'page', area: 'admin' },
  { path: '/admin/anuncios/novo', component: 'AdminAnuncioEditor', kind: 'page', area: 'admin' },
  { path: '/admin/anuncios/:id', component: 'AdminAnuncioEditor', kind: 'page', area: 'admin' },
  { path: '/admin/origens', component: 'AdminOrigens', kind: 'page', area: 'admin' },
  { path: '/admin/agenda', component: 'AdminAgenda', kind: 'page', area: 'admin' },
  { path: '/admin/agenda/nova', component: 'AdminAgendaEditor', kind: 'page', area: 'admin' },
  { path: '/admin/agenda/:id/editar', component: 'AdminAgendaEditor', kind: 'page', area: 'admin' },
  { path: '/admin/semana', component: 'AdminSemana', kind: 'page', area: 'admin' },
  { path: '/admin/semana/:id', component: 'AdminSemanaEditor', kind: 'page', area: 'admin' },
  { path: '/admin/ops', component: 'AdminOps', kind: 'redirect', target: '/coordenador/hoje', area: 'admin', description: 'Redirects to canonical coordination entry' },
  { path: '/admin/talentos', component: 'AdminTalentos', kind: 'page', area: 'admin' },
  { path: '/admin/crm', component: 'AdminCRM', kind: 'page', area: 'admin' },
  { path: '/admin/lgpd', component: 'AdminLGPD', kind: 'page', area: 'admin' },
  { path: '/admin/squads', component: 'AdminSquads', kind: 'page', area: 'admin' },
  { path: '/admin/top', component: 'AdminTop', kind: 'page', area: 'admin' },
  { path: '/admin/moderacao', component: 'AdminModeracao', kind: 'page', area: 'admin' },
  { path: '/admin/plenaria', component: 'AdminPlenaria', kind: 'page', area: 'admin' },
  { path: '/admin/fabrica', component: 'AdminFabrica', kind: 'page', area: 'admin' },
  { path: '/admin/playbook', component: 'AdminPlaybook', kind: 'page', area: 'admin' },
  { path: '/admin/territorio', component: 'AdminTerritorio', kind: 'page', area: 'admin' },
  { path: '/admin/roteiros', component: 'AdminRoteiros', kind: 'page', area: 'admin' },
  { path: '/admin/diagnostico', component: 'AdminDiagnostico', kind: 'page', area: 'admin', description: 'Codebase diagnostic' },
  
  // Catch-all
  { path: '*', component: 'NotFound', kind: 'page', area: 'publico', description: '404 page' },
];

/**
 * Generate the route manifest with conflict detection
 */
export function generateRouteManifest(): RouteManifest {
  const routes = CANONICAL_ROUTES.filter(r => r.kind === 'page');
  const redirects = CANONICAL_ROUTES.filter(r => r.kind === 'redirect' || r.kind === 'alias');
  
  // Get legacy routes from centralized definition
  const legacyRedirects = getLegacyRedirects();
  const legacyRoutes: LegacyRouteInfo[] = legacyRedirects.map(({ from, to }) => ({
    from,
    to,
    isActive: true,
  }));
  
  // Detect conflicts (same path, different components)
  const pathMap = new Map<string, RouteEntry[]>();
  for (const route of CANONICAL_ROUTES) {
    if (route.path === '*') continue; // Ignore catch-all
    const existing = pathMap.get(route.path) || [];
    existing.push(route);
    pathMap.set(route.path, existing);
  }
  
  const conflicts: RouteConflict[] = [];
  
  // Check for duplicate paths
  for (const [path, entries] of pathMap) {
    if (entries.length > 1) {
      conflicts.push({
        path,
        entries,
        reason: `Path "${path}" is defined ${entries.length} times with components: ${entries.map(e => e.component).join(', ')}`,
      });
    }
  }
  
  // Check for similar paths that might conflict
  const pathPatterns = CANONICAL_ROUTES
    .filter(r => r.path !== '*')
    .map(r => ({ path: r.path, pattern: r.path.replace(/:[^/]+/g, ':param'), entry: r }));
  
  const patternMap = new Map<string, typeof pathPatterns>();
  for (const p of pathPatterns) {
    const existing = patternMap.get(p.pattern) || [];
    existing.push(p);
    patternMap.set(p.pattern, existing);
  }
  
  // Find pattern conflicts (different named params)
  for (const [pattern, entries] of patternMap) {
    if (entries.length > 1) {
      const uniquePaths = new Set(entries.map(e => e.path));
      if (uniquePaths.size > 1) {
        conflicts.push({
          path: pattern,
          entries: entries.map(e => e.entry),
          reason: `Similar paths may conflict: ${Array.from(uniquePaths).join(', ')}`,
        });
      }
    }
  }
  
  return {
    routes,
    redirects,
    legacyRoutes,
    conflicts,
    counts: {
      pages: routes.length,
      redirects: redirects.length,
      legacyRedirects: legacyRoutes.length,
      conflicts: conflicts.length,
      total: CANONICAL_ROUTES.length + legacyRoutes.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Export manifest as JSON
 */
export function manifestToJSON(manifest: RouteManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Get route by path
 */
export function getRouteByPath(path: string): RouteEntry | undefined {
  return CANONICAL_ROUTES.find(r => r.path === path);
}

/**
 * Get all routes for an area
 */
export function getRoutesByArea(area: string): RouteEntry[] {
  return CANONICAL_ROUTES.filter(r => r.area === area);
}

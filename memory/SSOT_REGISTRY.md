# SSOT Registry — Mapa de Domínios

**Versão**: v1.1  
**Data**: 2026-02-05  
**Status**: ✅ COMPLEMENTO OFICIAL do LOVABLE_CONTRATO

---

Este documento define, para cada domínio funcional do app, a **Fonte Única de Verdade** (SSOT), tabelas/padrões legados, rotas canônicas, hooks/componentes canônicos, e anti-padrões a evitar.

---

## 1. Coordenação

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `coord_roles` (tabela) com tipos: `COORD_GLOBAL`, `COORD_CITY`, `CELL_COORD` |
| **Audit Log** | `coord_audit_log` — registra GRANT_ROLE, REVOKE_ROLE, e outras operações (sem PII) |
| **RPCs canônicas** | `can_operate_coord`, `list_coord_roles`, `grant_coord_role`, `revoke_coord_role`, `list_coord_audit_log`, `get_caller_coord_level` |
| **Legados (não usar)** | `cell_coordinators` (se existir), `user_roles.role = 'coordenador_celula'` |
| **Rotas canônicas** | `/coordenador/hoje`, `/coordenador/territorio` |
| **Hooks canônicos** | `useCoordRoles`, `useCellOps`, `useCoordinatorAlerts`, `useCoordAudit` |
| **Componentes canônicos** | `CoordTeamTab`, `SSOTDriftCard`, `CoordinationHealthCard`, `CoordAuditSection`, `SSOTEnforcementCard` |
| **Não faça** | ❌ SELECT direto em `coord_roles` para autorização (usar `can_operate_coord`) |
| **Não faça** | ❌ Verificar `user_roles.coordenador_celula` para permissões de coordenação |
| **Não faça** | ❌ Criar rotas `/coordenador-*` (hífen proibido, usar `/coordenador/*`) |
| **Não faça** | ❌ Operações em coord_roles/cells sem log_coord_audit |
| **Não faça** | ❌ COORD_GLOBAL concedendo COORD_GLOBAL (apenas Admin Master) |

---

## 2. Células

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `cells` (tabela), `cell_memberships` (associação usuário↔célula) |
| **Audit Log** | `coord_audit_log` — registra UPSERT_CELL, APPROVE_ASSIGNMENT, CANCEL_ASSIGNMENT (sem PII) |
| **RPCs canônicas** | `list_city_cells`, `upsert_cell`, `get_cell_ops_kpis`, `approve_and_assign_request`, `cancel_assignment_request` |
| **Status válidos** | `cell_memberships.status`: `pendente`, `aprovado`, `recusado`, `removido` (constraint: `cell_memberships_status_check`) |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/coordenador/territorio` (aba Células), `/voluntario/celula/:cellId/mural`, `/voluntario/territorio` |
| **Hooks canônicos** | `useCells`, `useCellOps`, `useUserCells`, `useCellAssignmentRequest` |
| **Componentes canônicos** | `CellOpsKPICard`, `NeedsCellBanner`, `CityBootstrapSection`, `MyAllocationCard`, `CellPlaybookCompact` |
| **Não faça** | ❌ SELECT direto em `cells` para listar células (usar RPC) |
| **Não faça** | ❌ Expor `cell_memberships.user_id` em listas públicas |
| **Não faça** | ❌ Criar/editar célula sem log_coord_audit |
| **Não faça** | ❌ Usar `status = 'approved'` ou `'ACTIVE'` em cell_memberships (usar valores PT: `aprovado`, etc.) |
| **City Bootstrap** | Kit v0 com 5 células + playbooks pré-populados via `meta_json.playbook`

---

## 3. Convites / Auth

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `convites` (tabela de convites), `convites_usos` (tracking de uso) |
| **Fluxo canônico** | `/aceitar-convite?ref=XXXX` → `/auth?ref=...&next=/voluntario` → hub |
| **Fila de aprovação** | `/coordenador/hoje` → Card "Voluntários pendentes" |
| **RPCs de aprovação** | `list_pending_volunteers`, `approve_volunteer`, `reject_volunteer` |
| **Audit Actions** | `APPROVE_VOLUNTEER`, `REJECT_VOLUNTEER` em `coord_audit_log` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/auth`, `/aceitar-convite`, `/aceitar/:token`, `/r/:code`, `/redefinir-senha` |
| **Hooks canônicos** | `useAuth`, `useConvites`, `usePendingVolunteers` |
| **Componentes canônicos** | `InviteRequiredCard`, `PendingVolunteersCard` |
| **Não faça** | ❌ Criar fluxo de signup sem passar por `/aceitar-convite` em modo pré-campanha |
| **Não faça** | ❌ Armazenar convite em sessionStorage (usar localStorage com TTL) |
| **Não faça** | ❌ Redirecionar para `/auth` sem propagar `?ref=` se existir |
| **Não faça** | ❌ Aprovar/recusar voluntário sem usar RPCs auditadas |

---

## 4. Onboarding

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `profiles.city_id`, `profiles.cell_id`, `profiles.onboarding_complete` |
| **Guard obrigatório** | Se `city_id` é NULL, redirecionar para `/voluntario/primeiros-passos` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/voluntario/primeiros-passos`, `/onboarding` |
| **Hooks canônicos** | `useCityCellSelection`, `useOnboardingSteps`, `useOnboardingPrefs` |
| **Componentes canônicos** | `CityCellWizard`, `WelcomeBlock`, `CellAssignmentRequestModal` |
| **Não faça** | ❌ Permitir acesso ao hub sem `city_id` definido |
| **Não faça** | ❌ Criar wizard de onboarding alternativo (consolidar em `CityCellWizard`) |

---

## 5. Alocação de Célula

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `cell_assignment_requests` (tabela de pedidos de alocação) |
| **RPCs canônicas** | `list_city_assignment_requests`, `approve_and_assign_request` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/coordenador/territorio` (aba Pedidos) |
| **Hooks canônicos** | `useCellPending` |
| **Componentes canônicos** | `CellPendingTab`, `NeedsCellBanner` |
| **Não faça** | ❌ Aprovar/rejeitar pedidos via UPDATE direto (usar RPC) |
| **Não faça** | ❌ Expor dados de profile completos em lista de pedidos |

---

## 6. Fábrica / Materiais

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `content_items` (peças de conteúdo), `assets` (arquivos), `content_assets` (link) |
| **RPCs canônicas** | — (usa RLS diretamente, mas com escopo) |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/admin/fabrica`, `/fabrica/arquivos`, `/materiais`, `/materiais/:id` |
| **Hooks canônicos** | `useContentItems`, `useAssets`, `useMateriais`, `useContentUpload` |
| **Componentes canônicos** | `ContentUploadWizard`, `ContentItemGrid`, `AssetGrid`, `MaterialCard` |
| **Não faça** | ❌ Upload de assets sem associar a `content_items` ou categoria |
| **Não faça** | ❌ Expor URLs de storage diretamente (usar signed URLs via `useSignedUrl`) |

---

## 7. Formação

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `cursos_formacao`, `aulas_formacao`, `certificates` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/formacao`, `/formacao/curso/:id`, `/formacao/aula/:id`, `/s/cert/:code` |
| **Hooks canônicos** | `useFormacao`, `useCertificates`, `useRecommendedCourse` |
| **Componentes canônicos** | `CertificateRenderer`, `CourseCompletionModal` |
| **Não faça** | ❌ Criar certificado sem passar por `CourseCompletionModal` |
| **Não faça** | ❌ Expor `certificate_code` sem validação de ownership |

---

## 8. Debates

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `posts` (tópicos), `comentarios` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/debates`, `/debates/novo`, `/debates/topico/:id` |
| **Hooks canônicos** | `useDebates`, `useDebateToAction` |
| **Componentes canônicos** | `TransformToActionDialog` |
| **Não faça** | ❌ Criar tópico sem autor autenticado |
| **Não faça** | ❌ Permitir comentário em tópico oculto |

---

## 9. Squads / Skills

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `squad_tasks`, `chamados_talentos`, `candidaturas_chamados` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/voluntario/squads`, `/voluntario/skills`, `/voluntario/talentos`, `/admin/squads`, `/admin/talentos` |
| **Hooks canônicos** | `useSquads`, `useTalentos` |
| **Componentes canônicos** | — |
| **Não faça** | ❌ Criar chamado sem `escopo_id` definido |
| **Não faça** | ❌ Expor candidaturas de outros usuários |

---

## 10. CRM / Contatos

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `crm_contatos`, `crm_event_invites` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/voluntario/crm`, `/voluntario/crm/novo`, `/admin/crm` |
| **Hooks canônicos** | `useCRM`, `useEventInvites`, `useQuickAddContact`, `useCRMPrivacy` |
| **Componentes canônicos** | `QuickAddContactModal`, `ContactDetailDrawer`, `MaskedWhatsAppField` |
| **Não faça** | ❌ Expor `whatsapp` completo em listas (usar `whatsapp_last4` ou masked) |
| **Não faça** | ❌ Criar contato sem `consentimento_lgpd = true` |

---

## 11. Missões

| Aspecto | Definição |
|---------|-----------|
| **SSOT** | `missions`, `mission_progress`, `evidences` |
| **Catálogo canônico** | `missions.meta_json.canonical = true` — 7 slugs Beta MVP priorizados em recomendações |
| **RPCs canônicas** | `mark_canonical_missions`, `get_mission_catalog_stats` |
| **Legados (não usar)** | — |
| **Rotas canônicas** | `/voluntario/missoes`, `/voluntario/missao/:id`, `/voluntario/missao-rua/:id`, `/voluntario/missao-conversa/:id`, `/voluntario/evidencia/:missionId` |
| **Hooks canônicos** | `useMissions`, `useEvidences`, `useStreetMission`, `useConversationMission` |
| **Componentes canônicos** | `MissionCard`, `StreetMissionCard`, `ConversationMissionCard`, `MissionCatalogHygieneCard` |
| **Não faça** | ❌ Criar missão sem `demanda_id` ou `ciclo_id` válido |
| **Não faça** | ❌ Exibir progresso de missão de outro usuário |
| **Não faça** | ❌ SELECT direto em missions para stats de catálogo (usar RPCs) |
| **Regra Beta** | Em beta, recomendações priorizam `canonical=true` (+5 score). Ver `memory/features/mission-catalog-hygiene-v0.md` |

---

## Verificação de Drift

Para cada domínio, o diagnóstico (`/admin/diagnostico`) verifica:

| Check | Descrição |
|-------|-----------|
| **SSOT em uso** | Tabela/RPC principal existe e retorna dados |
| **Legados inativos** | Tabelas legadas estão vazias ou não existem |
| **Rotas canônicas** | Rotas definidas existem no manifest |
| **Redirects legados** | Rotas com hífen têm redirect configurado |
| **Guard ativo** | Guards de onboarding/auth estão funcionando |

### Procedimento DIAG → PATCH → VERIFY → REPORT

1. **DIAG**: Executar diagnóstico em `/admin/diagnostico`
2. **PATCH**: Corrigir issues identificados
3. **VERIFY**: Re-executar diagnóstico para confirmar correção
4. **REPORT**: Atualizar documentação relevante

---

## Arquivos Relacionados

| Arquivo | Propósito |
|---------|-----------|
| `memory/LOVABLE_CONTRATO.md` | Regras congeladas do sistema |
| `memory/features/ssot-method-v1.md` | Metodologia anti-deriva |
| `memory/features/ssot-registry-v1.md` | Documentação deste registry |
| `memory/features/group-taxonomy-v1.md` | Taxonomia de grupos (congelada) |
| `src/lib/routeManifest.ts` | Manifest de rotas canônicas |
| `src/components/admin/SSOTRegistryCard.tsx` | Card de verificação de drift por domínio |
| `src/components/admin/TaxonomyDriftCard.tsx` | Card de verificação de drift de taxonomia |
| `/admin/diagnostico` | Página de diagnóstico |

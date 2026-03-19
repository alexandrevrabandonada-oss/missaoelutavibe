# LOVABLE_CONTRATO — Fonte Única de Verdade

**Versão**: v1.7  
**Versão**: v1.8  
**Data**: 2026-02-05  
**Status**: ✅ CONGELADO — qualquer alteração requer revisão explícita

---

## Documentos Complementares

| Documento | Propósito |
|-----------|-----------|
| **`memory/SSOT_REGISTRY.md`** | Mapa de domínios — SSOT, legados, rotas e anti-padrões por área funcional |
| **`memory/features/ssot-method-v1.md`** | Metodologia anti-deriva (DIAG→PATCH→VERIFY→REPORT) |
| **`memory/features/ssot-enforcement-v1.md`** | Enforcement acionável com severidades BLOCKING vs WARNING |
| **`memory/features/ssot-registry-v1.md`** | Documentação do sistema de registry |
| **`memory/features/group-taxonomy-v1.md`** | Taxonomia de grupos (CÉLULA/SQUAD/SKILLS/DEBATE) |
| **`memory/features/mission-catalog-hygiene-v0.md`** | Higiene do catálogo de missões — conjunto canônico Beta |

> ⚠️ **SSOT_REGISTRY é complemento oficial** — consultar antes de criar/modificar domínios
> 
> ⚠️ **Audit log obrigatório** — toda operação em coord_roles/cells deve chamar `log_coord_audit`
>
> ⚠️ **Taxonomia congelada** — CÉLULA é único grupo operacional SSOT; SQUAD é derivado congelado
>
> ⚠️ **Catálogo Beta** — Em beta, recomendações priorizam missões com `canonical=true` (ver mission-catalog-hygiene-v0.md)

---

## Escopo e Não-Objetivos

### Este Contrato É:
- Regras de desenvolvimento e navegação do app
- Padrões de arquitetura e segurança
- Fonte única de verdade para decisões técnicas

### Este Contrato NÃO É:
- Especificação de UI/UX (cores, espaçamentos, animações)
- Documentação de features específicas (ver `memory/features/*.md`)
- Roadmap ou backlog de produto

---

## Regras Congeladas

### A) Rotas canônicas e redirects legados

**Regras Imutáveis**:
- ❌ **NUNCA** criar novas rotas com hífen no prefixo (ex: `/voluntario-hoje`)
- ✅ **SEMPRE** usar formato canônico com barra (ex: `/voluntario/hoje`)
- ✅ Rotas legadas existentes devem ter redirect automático para canônicas
- ✅ Redirects usam `replace: true` para não poluir histórico

**Implementação**:
- Definição: `src/components/routing/LegacyRouteRedirects.tsx`
- Manifest: `src/lib/routeManifest.ts`
- Diagnóstico: `/admin/diagnostico` exibe contagem e lista

**Manutenção**:
- Para adicionar rota legada: editar `LEGACY_ROUTE_MAP`
- Nunca criar links internos para rotas legadas
- Toda nova página deve ser registrada no manifest

---

### B) Convite é "só acesso"

**Fluxo Canônico**:
```
/aceitar-convite?ref=XXXX → /auth?ref=...&next=/voluntario → hub
```

**Regras**:
- Convite é **apenas acesso**, não substitui autenticação
- `/aceitar-convite` valida ref antes de redirecionar
- Em modo `pre-campanha`: signup sem convite válido é bloqueado
- Persistência: `localStorage.invite_ref` com TTL de 30 minutos

**Shortlinks**:
- `/r/:code` redireciona para `/aceitar-convite?ref=CODE`
- Usado para QR codes e links de compartilhamento

**Arquivos Relacionados**:
- `src/pages/AceitarConviteRef.tsx`
- `src/lib/inviteConfig.ts`
- `src/components/auth/InviteRequiredCard.tsx`

---

### C) Onboarding obrigatório

**Guard de Cidade**:
```typescript
if (!profile.city_id) {
  navigate("/voluntario/primeiros-passos", { replace: true });
}
```

**Regras**:
- Usuário aprovado SEM `city_id` → redirecionado para wizard
- Wizard de 2 passos: Cidade → Célula (ou "sem célula")
- Após conclusão: `onboarding_complete = true`

**Arquivos Relacionados**:
- `src/components/onboarding/CityCellWizard.tsx`
- `src/hooks/useCityCellSelection.tsx`
- `src/pages/VoluntarioPrimeirosPassos.tsx`

---

### D) Cidade/Célula

**Estrutura**:
- `profiles.city_id` — obrigatório após onboarding
- `profiles.cell_id` — pode ser NULL ("sem célula")
- `profiles.needs_cell_assignment` — flag para fila de alocação

**Fluxo de Alocação**:
1. Usuário sem célula pode solicitar alocação
2. Pedido vai para `cell_assignment_requests`
3. Coordenador resolve em `/coordenador/territorio` → aba "Pedidos de alocação"
4. Status: `pending` → `assigned` | `approved_no_cell` | `cancelled`

**Operação de Células v0.1** (desde 2026-02-04):
- Painel em `/coordenador/territorio` com 3 abas: Pedidos + Células + Equipe
- RPCs seguros: `list_city_assignment_requests`, `approve_and_assign_request`, `upsert_cell`
- Sem SELECT direto; só primeiro nome visível (sem PII completo)
- Detalhes: `memory/features/cell-ops-v0.md`

**Coord Roles v1 — SSOT de Coordenação** (desde 2026-02-04):
- ⚠️ **FONTE ÚNICA DE VERDADE** para papéis de coordenação
- Tabela `coord_roles` com tipos: COORD_GLOBAL, COORD_CITY, CELL_COORD
- Separado de `user_roles`: coordenação ≠ admin
- COORD_GLOBAL tem acesso a toda coordenação sem virar admin
- COORD_CITY opera apenas uma cidade específica
- CELL_COORD opera apenas uma célula específica
- RPCs: `can_operate_coord`, `list_coord_roles`, `grant_coord_role`, `revoke_coord_role`
- Aba "Equipe" em `/coordenador/territorio` para gestão de coordenadores
- "Meu código" em `/voluntario/eu` para compartilhar UUID
- Detalhes: `memory/features/coord-roles-v1.md`

**Auditoria de Coordenação** (desde 2026-02-04):
- Tabela `coord_audit_log` registra todas operações de coordenação (sem PII)
- Actions: GRANT_ROLE, REVOKE_ROLE, UPSERT_CELL, APPROVE_ASSIGNMENT, CANCEL_ASSIGNMENT
- Todas RPCs de coordenação chamam `log_coord_audit()` automaticamente
- RPC `list_coord_audit_log(p_days, p_city_id)` para consulta (escopo por role)
- UI: seção "Auditoria recente" em `/coordenador/hoje`
- Detalhes: `memory/features/ssot-enforcement-v1.md`

**Delegação Segura (P2)** (desde 2026-02-05):
- Hierarquia de concessão/revogação:
  - **Admin Master**: pode conceder/revogar qualquer papel
  - **COORD_GLOBAL**: pode conceder/revogar COORD_CITY e CELL_COORD (NÃO COORD_GLOBAL)
  - **COORD_CITY**: pode conceder/revogar apenas CELL_COORD na sua cidade
  - **CELL_COORD**: não pode conceder/revogar papéis
- RPC `get_caller_coord_level()` retorna nível do caller
- UI: opções de papel filtradas por permissão em CoordTeamTab
- Hint visual: "Coordenação Global ≠ Admin Master"

**City Bootstrap (P1)** (desde 2026-02-05):
- Aba "Setup" em `/coordenador/territorio` com Kit v0
- Células padrão: Geral, Rua & Escuta, Comunicação, Formação, CRM & Base
- Só COORD_GLOBAL ou COORD_CITY pode ativar
- Se cidade já tem células, mostra "Ver kit"
- Cada célula criada via `upsert_cell` com auditoria

**Taxonomia de Grupos (P0)** (desde 2026-02-05):
- **CÉLULA**: único grupo operacional SSOT
- **SQUAD**: derivado opcional, congelado (não expandir)
- **SKILLS/TALENTOS**: atributo, não grupo
- **DEBATE/PLENÁRIA**: conteúdo, não grupo
- Card "Taxonomia & Drift" em `/admin/diagnostico`
- Documentação: `memory/features/group-taxonomy-v1.md`

**Metodologia Anti-Deriva (SSOT)**:
- Qualquer verificação de permissão de coordenação DEVE usar `can_operate_coord` ou `coord_roles`
- ❌ **NUNCA** fazer SELECT direto em tabelas de roles para verificar coordenação
- ✅ Usar RPCs seguras com SECURITY DEFINER
- Diagnóstico: `/admin/diagnostico` → seções "SSOT Enforcement" e "Deriva de SSOT"
- Detalhes: `memory/features/ssot-method-v1.md`

**LEGADOS DEPRECADOS**:
- `cell_coordinators`: Se existir, é legado histórico. NÃO usar para autorização.
- `user_roles.role = 'coordenador_celula'`: Mantido apenas para backward compat, preferir `coord_roles`

**Arquivos Relacionados**:
- `src/pages/CoordenadorTerritorio.tsx`
- `src/hooks/useCellOps.tsx`
- `src/hooks/useCoordRoles.tsx`
- `src/components/coordinator/CoordTeamTab.tsx`
- `src/components/onboarding/CellAssignmentRequestModal.tsx`
- `src/components/onboarding/NeedsCellBanner.tsx`
- `src/hooks/useCellPending.tsx`

---

### E) Supabase/RLS

**Regras Críticas**:
- ❌ Telas admin/coordenador **NÃO** fazem SELECT direto em tabelas sensíveis
- ✅ Usar RPCs com `SECURITY DEFINER` para aggregates e listas
- ✅ PII (email, telefone, nome completo) **nunca** aparece em listas de coorte
- ✅ Funções SECURITY DEFINER usam `SET search_path = public`

**Padrões de Acesso**:
| Contexto | Método |
|----------|--------|
| Admin dashboard | RPC agregado (counts, sums) |
| Coordenador lista | RPC com escopo territorial |
| Voluntário próprio | RLS `auth.uid() = user_id` |
| CRM contatos | RLS owner + assignee + coord scope |

**Exemplos de RPCs Protegidas**:
- `get_db_contract_health` — diagnóstico interno
- `admin_list_cell_pending` — fila de alocação
- `get_north_star_metrics` — métricas agregadas

---

### F) Preferência por reuso

**Hooks Existentes (Não Duplicar)**:
| Hook | Propósito |
|------|-----------|
| `useCityCellSelection` | Seleção cidade/célula no onboarding |
| `useNorthStarDrilldown` | Drill-down de métricas agregadas |
| `useProfile` | Dados do perfil do usuário logado |
| `useUserRoles` | Verificação de roles (admin, coord) |
| `useCellPending` | Fila de pedidos de célula |
| `useCellOps` | Operações de células (coord) |
| `useObservability` | Log de erros/eventos |

**Componentes Reutilizáveis**:
| Componente | Propósito |
|------------|-----------|
| `TerritorioBadge` | Exibe cidade/célula no hub |
| `NeedsCellBanner` | Banner para solicitar alocação |
| `WelcomeBlock` | Boas-vindas pós-onboarding |
| `CellAssignmentRequestModal` | Modal de pedido de célula |

---

### G) Toda mudança deve atualizar

**Após Qualquer Mudança**:
1. ✅ Atualizar `memory/features/*.md` relevante
2. ✅ Atualizar `src/lib/routeManifest.ts` se nova rota
3. ✅ Adicionar redirect em `LegacyRouteRedirects.tsx` se rota renomeada
4. ✅ Rodar `/admin/diagnostico` para verificar conflitos

**Arquivos de Memória Principais**:
- `memory/auth/` — fluxos de autenticação e convites
- `memory/features/` — documentação de funcionalidades
- `memory/tech/` — padrões técnicos e arquitetura
- `memory/constraints/` — regras de segurança e UX

---

## Glossário Mínimo

| Termo | Definição |
|-------|-----------|
| **Cidade** | Município onde o voluntário atua. Obrigatório após onboarding. Armazenado em `profiles.city_id` referenciando `cidades.id`. |
| **Célula** | Grupo local de voluntários em uma cidade. Opcional (pode ser "sem célula"). Armazenado em `profiles.cell_id` referenciando `cells.id`. |
| **Território** | Combinação de cidade + célula. Determina escopo de visibilidade para coordenadores. |
| **Coordenação** | Role que gerencia um território (cidade ou célula). Pode ver dados agregados do escopo via RPCs. |
| **Coorte** | Grupo de usuários para análise (ex: "todos voluntários de SP"). Listas de coorte **nunca** exibem PII individual. |
| **PII** | Personally Identifiable Information. Inclui: nome completo, email, telefone, WhatsApp. Protegida por RLS. |

---

## Checklist Antes de Implementar

Use esta lista antes de qualquer mudança significativa:

- [ ] **Reuso de hook**: Existe hook que já faz isso? (ver tabela em F)
- [ ] **Reuso de componente**: Existe componente reutilizável? (ver tabela em F)
- [ ] **Rota duplicada**: A nova rota está no manifest? Não conflita com existente?
- [ ] **Formato de rota**: Usa barra, não hífen? (ex: `/voluntario/nova-feature`)
- [ ] **Atualizar memory**: Criei/atualizei `memory/features/*.md`?
- [ ] **Atualizar manifest**: Adicionei em `CANONICAL_ROUTES`?
- [ ] **RLS adequada**: Dados sensíveis protegidos? Usou RPC para admin?
- [ ] **PII protegida**: Listas não expõem dados pessoais?
- [ ] **Redirect legado**: Se renomeei rota, adicionei redirect?

---

## Gargalos Atuais (para reduzir retrabalho)

### 1. CellOps — Triagem de Alocações
**Problema**: Fila de `cell_assignment_requests` pode acumular sem SLA definido.
**Impacto**: Voluntários ficam "sem célula" por tempo indeterminado.
**Mitigação**: 
- Alerta em `/coordenador/hoje` se fila > 48h
- Fallback: voluntário pode atuar como "avulso" com missões genéricas

### 2. Risco de Bypass de RLS
**Problema**: Coordenadores podem exportar planilhas com PII se tiverem acesso direto.
**Impacto**: Vazamento de dados, não-conformidade LGPD.
**Mitigação**: 
- Nunca usar SELECT direto em telas de coord/admin
- RPCs retornam apenas dados agregados ou mascarados
- Exports passam por edge function que valida escopo

### 3. Rotas Legadas Acumuladas
**Problema**: `LEGACY_ROUTE_MAP` cresce indefinidamente.
**Impacto**: Bundle maior, manutenção complexa.
**Mitigação**: 
- Revisar semestralmente e remover redirects > 1 ano
- Log de uso para identificar rotas ainda acessadas

---

## Links Internos

| Recurso | Localização |
|---------|-------------|
| Diagnóstico de rotas e contrato | `/admin/diagnostico` → seção "Contrato do App" |
| Route manifest | `src/lib/routeManifest.ts` |
| Legacy redirects | `src/components/routing/LegacyRouteRedirects.tsx` |
| Documentação de features | `memory/features/*.md` |
| Padrões técnicos | `memory/tech/*.md` |

---

## ANEXO 1 — Entry Points de Coordenação (Canônicos)

| Rota | Propósito | Acesso |
|------|-----------|--------|
| `/coordenador/hoje` | Hub canônico de coordenação — inbox, alertas, métricas | coordinator, admin |
| `/coordenador/territorio` | Operação de Células — triagem de alocações, CRUD de células | coordinator, admin |
| `/admin/diagnostico` | Diagnóstico técnico — healthcheck, rotas, contrato | admin |

**Redirects legados**:
- `/admin/ops` → `/coordenador/hoje` (replace: true)
- `/coordenador-hoje` → `/coordenador/hoje` (se existir)

**Navegação**:
- Header/menu exibe "Coordenação" para roles autorizadas
- `/coordenador/hoje` tem CTA proeminente para "Operação de Células"
- Páginas admin (/admin/diagnostico, /admin/origens) têm link "Ir para Coordenação"

---

## ANEXO 2 — Healthcheck: Bloqueante vs Não-Bloqueante

### Classificação de Severidade

| Severidade | Descrição | UI |
|------------|-----------|-----|
| **blocking** | Impede Operação de Células | Vermelho, erro fatal |
| **warning** | Métrica/feature não alinhada ao schema | Âmbar, "temporariamente indisponível" |

### RPCs Classificadas (fase atual)

| RPC | Severidade | Justificativa |
|-----|------------|---------------|
| `get_cell_ops_kpis` | blocking | Core do painel de células |
| `list_city_assignment_requests` | blocking | Triagem de alocações |
| `list_city_cells` | blocking | CRUD de células |
| `can_operate_coord` | blocking | Helper de permissão coord_roles |
| `list_coord_roles` | blocking | Lista de coordenadores |
| `grant_coord_role` | blocking | Concessão de papéis |
| `revoke_coord_role` | blocking | Revogação de papéis |
| `get_coordinator_inbox_metrics` | warning | Métricas inbox (schema pode divergir) |
| `get_coordinator_overdue_followups` | warning | Follow-ups (schema pode divergir) |
| `get_coordinator_at_risk_volunteers` | warning | Risco (schema pode divergir) |
| `get_coordinator_stalled_missions` | warning | Missões paradas (schema pode divergir) |

### UX de Degradação Graciosa

**Em `/coordenador/hoje`**:
- Erros `warning` mostram "Métricas temporariamente indisponíveis"
- CTA primário: "Operação de Células" (sempre funciona)
- Detalhes técnicos acessíveis via toggle
- Não exibe "Erro ao carregar" como falha fatal

**Em `/admin/diagnostico`**:
- Seção "Saúde da Coordenação" separa Bloqueantes vs Avisos
- Contagem: X bloqueantes / Y avisos / Z OK
- Hints contextuais por tipo de erro

---

## Histórico de Versões

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-02-03 | 1.0 | Versão inicial congelada |
| 2026-02-04 | 1.1 | Adicionado: Glossário, Checklist, Gargalos, Links Internos, escopo/não-objetivos |
| 2026-02-04 | 1.2 | Atualizado: Cell Ops v0 com painel em /coordenador/territorio e RPCs seguros |
| 2026-02-04 | 1.3 | Adicionado: ANEXO 1 (Entry Points), ANEXO 2 (Healthcheck blocking vs warning) |
| 2026-02-04 | 1.4 | Adicionado: Coord Roles v1 (COORD_GLOBAL/CITY/CELL_COORD), aba Equipe, Meu código |
| 2026-02-04 | 1.5 | **SSOT congelado**: coord_roles é fonte única de verdade para coordenação; cell_coordinators deprecado; metodologia anti-deriva (ssot-method-v1); seção "Deriva SSOT" no diagnóstico |
| 2026-02-04 | 1.6 | **SSOT Registry**: criado mapa de domínios (SSOT_REGISTRY.md); link para documentos complementares; seção "SSOT Registry & Drift" no diagnóstico com checks por domínio |
| 2026-02-04 | 1.7 | **SSOT Enforcement + Auditoria**: coord_audit_log para governança interna; SSOTEnforcementCard com checks BLOCKING vs WARNING; seção "Auditoria recente" em /coordenador/hoje; ssot-enforcement-v1.md documenta procedimento |
| 2026-02-05 | 1.8 | **P0-P2**: Taxonomia congelada (group-taxonomy-v1.md); City Bootstrap (Kit v0); Delegação segura (hierarquia Admin→COORD_GLOBAL→COORD_CITY→CELL_COORD) |

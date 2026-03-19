# DIAG_MISSOES.md — Diagnóstico Completo do Sistema de Missões

**Data:** 2026-01-29  
**Autor:** Lovable AI  
**Escopo:** Mapeamento exaustivo de rotas, modelos, APIs, componentes e fluxos relacionados a Missões

---

## RESUMO EXECUTIVO

| Métrica | Total |
|---------|-------|
| **Rotas de missões encontradas** | 8 |
| **Endpoints/RPCs encontrados** | 20 |
| **Tabelas relacionadas** | 4 |
| **Hooks encontrados** | 10 |
| **Componentes UI encontrados** | 7 |
| **Itens órfãos/fantasmas** | 3 |

---

## 1. ROTAS EXISTENTES (App Router)

### 1.1 Rotas Ativas

| Rota | Arquivo | Tipo | Status | Dependências |
|------|---------|------|--------|--------------|
| `/missao` | `src/pages/Missao.tsx` | page | **DEPRECATED** - redireciona para `/voluntario` | `useMissions`, `useFirstMission` |
| `/evidencia/:missionId` | `src/pages/Evidencia.tsx` | page | Ativa, não linkada diretamente | `useMissions`, `useStorage` |
| `/voluntario/missoes` | `src/pages/VoluntarioMissoes.tsx` | page | Ativa, linkada no app | `useMissions`, `useCiclos`, `usePinnedAnuncio` |
| `/voluntario/missao/:id` | `src/pages/VoluntarioMissao.tsx` | page | Ativa, linkada | `useMissions`, `useVolunteerStatus` |
| `/voluntario/evidencia/:missionId` | `src/pages/VoluntarioEvidencia.tsx` | page | Ativa, linkada | `useMissions`, `useStorage` |
| `/voluntario/missao-rua/:id` | `src/pages/VoluntarioMissaoRua.tsx` | page | Ativa, linkada | `useStreetMission`, `useInviteLoop`, `useStorage` |
| `/voluntario/missao-conversa/:id` | `src/pages/VoluntarioMissaoConversa.tsx` | page | Ativa, linkada | `useConversationMission`, `useRoteiros`, `usePlaybook` |

### 1.2 Rotas Admin Relacionadas

| Rota | Arquivo | Tipo | Status | Dependências |
|------|---------|------|--------|--------------|
| `/admin` (subseção `missoes`) | `src/pages/Admin.tsx` → `AdminMissoesPanel` | inline panel | Ativa | `useMissions`, `useCiclos` |
| `/admin/validar` | `src/pages/AdminValidar.tsx` | page | Ativa | `useEvidences` (evidências de missões) |

### 1.3 Rotas Não Encontradas (Esperadas mas Inexistentes)

- `/missions` — **Não encontrado**
- `/mission/:id` — **Não encontrado** (usa `/voluntario/missao/:id`)
- `/ranking` com missões — **Não encontrado**

---

## 2. NAVEGAÇÃO E LINKS

### 2.1 Onde Missões são Acessadas (NavBar/Menu)

| Local | Link Para | Status |
|-------|-----------|--------|
| `VoluntarioNavBar` | Nenhum link direto para missões | ✅ Intencional (acesso via "Agir") |
| `PostCheckinCTAs` | `/voluntario/missoes` | ✅ Funcional |
| `ReturnCompleteBanner` | `/voluntario/missoes` | ✅ Funcional |
| `VoluntarioAgendaDetalhe` | `/voluntario/missoes` | ✅ Funcional |
| `VoluntarioSemana` | `/voluntario/missoes` | ✅ Funcional |
| `MuralPostCard` | `/voluntario/missao/${id}` | ✅ Funcional |
| `ValidationFeedbackCard` | `/voluntario/evidencia/${mission_id}` | ✅ Funcional |
| `AdminMissoesPanel` | Navegação inline (sem link externo) | ✅ Funcional |

### 2.2 Navegações Programáticas (navigate)

| Componente/Hook | Destino | Contexto |
|-----------------|---------|----------|
| `StreetMissionCard` | `/voluntario/missao-rua/${id}` | Após gerar missão de rua |
| `ConversationMissionCard` | `/voluntario/missao-conversa/${id}` | Após gerar missão de conversa |
| `FirstActivationModal` | `/voluntario/missao/${id}` | Primeira missão do usuário |
| `SeuCaminhoScreen` | `/voluntario/missao-rua/${id}` ou `/voluntario/missao-conversa/${id}` | Onboarding |
| `RecommendedPathCard` | `/voluntario/missao-rua/${id}` ou `/voluntario/missao-conversa/${id}` | Sugestão de caminho |
| `Missao.tsx` | `/voluntario` | Redirect deprecated |
| `Evidencia.tsx` | `/missao` | ⚠️ Link para rota deprecated |
| `AdminOps.tsx` | `/missao` | ⚠️ Fallback para não-coordenador |
| `AdminTalentos.tsx` | `/missao` | ⚠️ Fallback para não-coordenador |
| `AdminModeracao.tsx` | `/missao` | ⚠️ Fallback para não-coordenador |

### 2.3 Links Quebrados ou Problemáticos

| Local | Link | Problema |
|-------|------|----------|
| `Evidencia.tsx` linha 119 | `navigate("/missao")` | Redireciona para rota deprecated |
| `AdminOps.tsx` linha 131 | `navigate("/missao")` | Redireciona para rota deprecated |
| `AdminTalentos.tsx` linha 153 | `navigate("/missao")` | Redireciona para rota deprecated |
| `AdminModeracao.tsx` linha 147 | `navigate("/missao")` | Redireciona para rota deprecated |

---

## 3. MODELOS / BANCO DE DADOS

### 3.1 Tabela Principal: `missions`

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | uuid | NO | PK |
| `title` | text | NO | Título da missão |
| `description` | text | YES | Descrição |
| `instructions` | text | YES | Instruções |
| `type` | enum `mission_type` | NO | escuta, rua, mobilizacao, conteudo, dados, formacao, conversa |
| `status` | enum `mission_status` | YES | rascunho, publicada, em_andamento, enviada, validada, reprovada, concluida |
| `cell_id` | uuid | YES | FK para cells |
| `created_by` | uuid | YES | Criador |
| `assigned_to` | uuid | YES | Voluntário atribuído |
| `requires_validation` | boolean | YES | Exige validação de evidência |
| `deadline` | timestamptz | YES | Prazo |
| `points` | integer | YES | Pontos XP |
| `is_first_mission` | boolean | YES | Flag primeira missão |
| `demanda_id` | uuid | YES | FK para demandas |
| `debate_topico_id` | uuid | YES | FK para debates |
| `debate_post_id` | uuid | YES | FK para posts |
| `ciclo_id` | uuid | YES | FK para ciclos_semanais |
| `demanda_origem_id` | uuid | YES | Demanda de origem |
| `privado` | boolean | YES | Missão privada (CRM) |
| `meta_json` | jsonb | YES | Metadados (kind, checkboxes, etc) |

**Dados atuais em dev:**
- 4 missões tipo `rua` (publicada)
- 1 missão tipo `dados` (publicada)
- 2 missões tipo `dados` (enviada)
- 1 missão tipo `formacao` (publicada)
- 1 missão tipo `conversa` (publicada)

### 3.2 Tabela: `conversa_mission_contacts`

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | uuid | NO | PK |
| `mission_id` | uuid | NO | FK para missions |
| `contact_id` | uuid | NO | FK para crm_contatos |
| `outcome` | text | YES | Resultado da conversa |
| `notes` | text | YES | Observações (max 240 chars, sanitizado) |
| `created_at` | timestamptz | NO | Data criação |

### 3.3 Tabela: `crm_mission_links`

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | uuid | NO | PK |
| `mission_id` | uuid | NO | FK para missions (unique) |
| `contato_id` | uuid | NO | FK para crm_contatos |
| `created_at` | timestamptz | NO | Data criação |

### 3.4 Tabela: `first_mission_templates`

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | uuid | NO | PK |
| `interest_type` | enum | NO | Tipo de interesse do usuário |
| `title` | text | NO | Título template |
| `description` | text | NO | Descrição template |
| `instructions` | text | NO | Instruções template |
| `mission_type` | enum | NO | Tipo de missão |
| `is_active` | boolean | YES | Ativo? |
| `created_at` | timestamptz | NO | Data criação |

### 3.5 Migrations Existentes

- Migrations para criação de tabelas: ✅ Existem
- Seeds de dados: Não encontrado (dados inseridos manualmente ou via app)

---

## 4. APIs / RPCs / SERVER ACTIONS

### 4.1 RPCs Relacionados a Missões

| Nome RPC | Input | Output | Chamado por | Status |
|----------|-------|--------|-------------|--------|
| `generate_street_mission` | `_acao`, `_tempo_estimado`, `_bairro` | `{ok, mission_id, already_exists}` | `useStreetMission` | ✅ Em uso |
| `complete_street_mission` | `_mission_id`, `_checkboxes`, `_photo_url` | `{success, mission_id}` | `useStreetMission` | ✅ Em uso |
| `get_street_mission_metrics` | `_period_days`, `_scope_cidade` | Métricas agregadas | `useStreetMissionMetrics` | ✅ Em uso |
| `generate_conversation_mission` | `_objective`, `_channel`, `_target_count` | `{ok, mission_id, contact_count}` | `useConversationMission` | ✅ Em uso |
| `complete_conversation_mission` | `_mission_id`, `_results` | `{success, done_count}` | `useCompleteConversationMission` | ✅ Em uso |
| `get_conversation_mission_metrics` | `_days`, `_scope_cidade` | Métricas agregadas | `useConversationMissionMetrics` | ✅ Em uso |
| `generate_crm_missions_for_user` | `_user_id` | `count` | `useMyCRMMissions` | ✅ Em uso |
| `complete_crm_mission` | `_mission_id`, `_outcome`, `_note`, `_next_action_date` | `{success}` | `useMyCRMMissions` | ✅ Em uso |
| `get_crm_mission_metrics` | `_scope_type`, `_scope_cidade`, `_scope_celula_id` | Métricas | `useCRMMissionMetrics` | ✅ Em uso |
| `get_my_crm_missions` | — | `CRMMission[]` | `useMyCRMMissions` | ✅ Em uso |
| `assign_first_mission_on_approval` | — | trigger | Sistema | ✅ Em uso |
| `create_encaminhamento_as_mission` | — | — | Sistema | ✅ Em uso |
| `create_replicable_mission_from_top` | — | — | Top content | ✅ Em uso |
| `get_completed_missions_count` | — | `number` | Métricas | ✅ Em uso |
| `get_coordinator_stalled_missions` | — | `Mission[]` | Coordenador inbox | ✅ Em uso |
| `notify_demand_to_mission` | — | — | Sistema | ✅ Em uso |
| `notify_mission_assigned` | — | — | Sistema | ✅ Em uso |
| `audit_crm_mission_link` | — | — | Trigger | ✅ Em uso |

### 4.2 Endpoints REST (não existem)

- O projeto usa exclusivamente Supabase SDK (RPCs + queries diretas)
- **Não há `/api/*` endpoints para missões**

---

## 5. COMPONENTES UI RELACIONADOS

### 5.1 Componentes Principais

| Componente | Caminho | Usado em | Status |
|------------|---------|----------|--------|
| `MissionCard` | `src/components/ui/MissionCard.tsx` | `VoluntarioMissoes`, `VoluntarioMissao`, `VoluntarioSemana` | ✅ Em uso |
| `StreetMissionCard` | `src/components/street/StreetMissionCard.tsx` | `VoluntarioHoje` (collapsible) | ✅ Em uso |
| `ConversationMissionCard` | `src/components/conversation/ConversationMissionCard.tsx` | `VoluntarioHoje` (collapsible) | ✅ Em uso |
| `CRMMissionsSection` | `src/components/crm/CRMMissionsSection.tsx` | `VoluntarioHoje` (collapsible) | ✅ Em uso |
| `AdminMissoesPanel` | `src/components/admin/AdminMissoesPanel.tsx` | `Admin` (inline) | ✅ Em uso |
| `FirstActivationModal` | `src/components/activation/FirstActivationModal.tsx` | Onboarding | ✅ Em uso |
| `ValidationFeedbackCard` | `src/components/feedback/ValidationFeedbackCard.tsx` | `VoluntarioHoje` | ✅ Em uso |

### 5.2 Componentes Não Encontrados (Esperados)

- `MissionList` — **Não existe** (lista inline nas páginas)
- `MissionWizard` — **Não existe** (criação via diálogos simples)
- `MissionDetail` — **Não existe** (detalhe inline em `VoluntarioMissao`)

---

## 6. FLUXO REAL (O QUE JÁ FUNCIONA HOJE)

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Lista de missões publicada? | ✅ SIM | `/voluntario/missoes` mostra missões do ciclo ativo |
| Detalhe de missão? | ✅ SIM | `/voluntario/missao/:id` |
| "Começar missão"? | ✅ SIM | Aceitar missão via botão no detalhe |
| "Concluir/entregar evidência"? | ✅ SIM | Via `/voluntario/evidencia/:id` ou formulários inline (rua/conversa) |
| Validação/aprovação? | ✅ SIM | Admin valida em `/admin/validar` |
| XP/pontos/badges ligados a missão? | ⚠️ PARCIAL | Campo `points` existe, mas gamificação não está implementada |

### 6.1 Tipos de Missão e Fluxos Específicos

| Tipo | Fluxo | Componentes |
|------|-------|-------------|
| **Rua (street_micro)** | Gerar → Executar → Checkboxes + Foto → Concluir | `StreetMissionCard` → `VoluntarioMissaoRua` |
| **Conversa (conversa_v0)** | Gerar → Ver roteiro → Registrar outcomes → Concluir | `ConversationMissionCard` → `VoluntarioMissaoConversa` |
| **CRM (privado)** | Geração automática → Contato → Outcome | `CRMMissionsSection` |
| **Escuta/Mobilização/Dados/Formação** | Admin cria → Voluntário aceita → Evidência → Validação | `VoluntarioMissoes` → `VoluntarioMissao` → `VoluntarioEvidencia` |

---

## 7. ROTAS FANTASMAS / ÓRFÃS / DÍVIDAS

### 7.1 Rotas Órfãs (existem mas com problemas)

| Rota/Item | Problema | Recomendação |
|-----------|----------|--------------|
| `/missao` | DEPRECATED, apenas redireciona | Manter redirect, atualizar links que apontam para ela |
| `/evidencia/:missionId` | Rota root (não voluntário) | Considerar deprecar em favor de `/voluntario/evidencia/:id` |

### 7.2 Links Apontando para Rotas Deprecated

| Arquivo | Linha | Link | Deve mudar para |
|---------|-------|------|-----------------|
| `src/pages/Evidencia.tsx` | 119 | `/missao` | `/voluntario/hoje` |
| `src/pages/AdminOps.tsx` | 131 | `/missao` | `/voluntario/hoje` |
| `src/pages/AdminTalentos.tsx` | 153 | `/missao` | `/voluntario/hoje` |
| `src/pages/AdminModeracao.tsx` | 147 | `/missao` | `/voluntario/hoje` |

### 7.3 Componentes Não Utilizados

- Nenhum encontrado. Todos os componentes de missão estão em uso.

### 7.4 RPCs Potencialmente Órfãos

- `trigger_assign_first_mission_on_approval` — Trigger interno
- `trigger_growth_first_action_mission` — Trigger interno

---

## 8. RECOMENDAÇÃO DE "CANON" (PADRONIZAÇÃO)

### 8.1 Caminhos Canônicos Recomendados

| Função | Caminho Canônico | Status Atual |
|--------|------------------|--------------|
| Lista de missões | `/voluntario/missoes` | ✅ Já é o canônico |
| Detalhe missão genérica | `/voluntario/missao/:id` | ✅ Já é o canônico |
| Missão de rua | `/voluntario/missao-rua/:id` | ✅ Já é o canônico |
| Missão de conversa | `/voluntario/missao-conversa/:id` | ✅ Já é o canônico |
| Enviar evidência | `/voluntario/evidencia/:missionId` | ✅ Já é o canônico |

### 8.2 Aliases/Redirects Necessários

| Alias | Redireciona para | Ação |
|-------|------------------|------|
| `/missao` | `/voluntario` | ✅ Já implementado |
| `/evidencia/:id` | Deprecar ou manter para compatibilidade | ⚠️ Avaliar remoção |
| `/missions`, `/mission/:id` | Não existem | ❌ Não criar |

### 8.3 Nomenclatura Padrão

| Contexto | Padrão | Observação |
|----------|--------|------------|
| **Rotas** | `missao` (singular), `missoes` (plural) | Português, sem acento em URLs |
| **Código (tipos)** | `mission` | Inglês para código interno |
| **Banco** | `missions` | Inglês (padrão Supabase) |
| **UI/Labels** | "Missão" / "Missões" | Português com acento |
| **Meta JSON kind** | `street_micro`, `conversa_v0`, `crm_mission` | Snake_case inglês |

### 8.4 i18n/Slug

- O projeto é **monolíngue (PT-BR)**
- URLs usam português sem acento: `missao`, `missoes`
- Não há suporte a i18n implementado
- Slugs de missão: não existe (usa UUID)

---

## 9. FÁBRICA DE MISSÕES (v0.1 - 2026-01-29)

### Funcionalidades Implementadas

| Funcionalidade | Status |
|----------------|--------|
| Aba "Fábrica" no AdminMissoesPanel | ✅ Implementada |
| Formulário "Criar 1 missão" | ✅ Implementado |
| Import JSON pack | ✅ Implementado |
| RPC `import_mission_pack` | ✅ Criada |
| Redirect `/evidencia/:id` → `/voluntario/evidencia/:id` | ✅ Implementado |
| Documentação do schema JSON | ✅ `docs/missions/MISSION_FACTORY_SCHEMA.md` |

### Arquivos Criados/Modificados

- `src/components/admin/MissionFactoryTab.tsx` — Novo componente
- `src/components/admin/AdminMissoesPanel.tsx` — Integração com Tabs
- `src/pages/Evidencia.tsx` — Transformado em redirect
- `docs/missions/MISSION_FACTORY_SCHEMA.md` — Documentação do schema
- RPC `import_mission_pack(jsonb, uuid, text)` — Banco de dados

---

## CONCLUSÃO

O sistema de missões está **bem estruturado** com separação clara entre:
1. **Missões genéricas** (ciclo semanal) via `/voluntario/missoes`
2. **Missões de rua** (micro-actions) via `/voluntario/missao-rua/:id`
3. **Missões de conversa** (CRM + roteiros) via `/voluntario/missao-conversa/:id`
4. **Missões CRM** (privadas, follow-up) via cards inline
5. **Fábrica de Missões** (admin) via AdminMissoesPanel > aba Fábrica

**Débitos técnicos corrigidos:**
1. ✅ Rota `/evidencia/:missionId` agora redireciona para rota canônica
2. ⚠️ 4 arquivos ainda apontam para `/missao` (deprecated) - manter redirect

**Não há necessidade de:**
- Criar novas rotas
- Renomear estruturas existentes
- Adicionar aliases complexos

O sistema segue o padrão estabelecido e está funcionando conforme esperado.

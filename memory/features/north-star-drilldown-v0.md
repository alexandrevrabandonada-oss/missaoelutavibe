# North Star Drilldown + Cohorts Acionáveis v0

## Objetivo
Quando um alerta disparar (activation_low/share_low/crm_low/etc.), o coordenador pode:
1. Entender "onde quebrou" (qual etapa caiu no funil)
2. Ver uma lista de pessoas impactadas no ESCOPO do coordenador
3. Ter 1–2 ações em 1 toque (copiar msg / abrir link)

Sem PII em logs. UI simples.

## RPCs

### `get_north_star_drilldown(_window_days, _scope_kind, _scope_value)`
Retorna JSON com contagens e taxas por etapa:
- signup, approved, checkin_submitted
- next_action_started, next_action_completed
- invite_shared, contact_created, support_qualified
- event_invites_created, event_attended_marked

Inclui:
- `current`: métricas do período atual
- `previous`: métricas do período anterior (para delta)
- `breakdown`: top 5 cidades/células com total e ativos

### `get_cohort_for_alert(_alert_key, _window_days)`
Retorna lista de usuários do escopo com campos mínimos:
- user_id, display_name (primeiro nome ou apelido)
- city, cell, last_action_at
- status_resumo: categorização do problema

Status resumo por tipo de alerta:
- `aprovado_sem_acao`: aprovado mas nunca completou ação
- `aprovado_sem_checkin`: aprovado mas sem check-in
- `acao_sem_share`: completou ação mas não compartilhou
- `sem_crm_7d`: ativo mas sem contato CRM nos últimos 7d
- `contato_nao_qualificado`: tem contato com support_level desconhecido
- `retorno_48h`: inativo há 48h-14d
- `rsvp_sem_presenca`: confirmou evento mas não marcou presença

**NÃO retorna telefone ou PII extra.**

### `get_cohort_message_templates(_alert_key)`
Retorna 3 templates mode-aware (pré-campanha vs campanha):
- short: mensagem curta para WhatsApp
- mid: mensagem com mais contexto
- leader: mensagem para líderes/coordenadores

## Frontend

### Hooks
- `useNorthStarDrilldown(windowDays, scopeKind, scopeValue)`: funil detalhado
- `useCohortForAlert(alertKey, windowDays)`: lista de voluntários
- `useCohortMessageTemplates(alertKey)`: templates de mensagem

### Components
- `DrilldownSheet`: sheet com abas Funil + Lista
  - Tab Funil: visualização de cada etapa com taxas e deltas
  - Tab Lista: voluntários acionáveis com botões copiar/WhatsApp
  - Toggle 7d/30d

### Integração
No `CoordinatorAlertsSection`, ao abrir playbook de alerta:
- Botão "Ver detalhes e lista de voluntários" → abre DrilldownSheet
- DrilldownSheet mostra funil + cohort no escopo do coordenador

### Tracking (growth_events sem PII)
- `north_star_drilldown_opened`: { alert_key, window_days, scope_kind }
- `north_star_cohort_viewed`: { alert_key, count }
- `north_star_cohort_message_copied`: { alert_key, variant }
- `north_star_cohort_whatsapp_opened`: { alert_key }

## Segurança
- Auth: coordenador/admin apenas
- Zero PII nos payloads e logs
- Escopo respeitado automaticamente via RPC
- display_name usa apelido ou primeiro nome apenas

## Fluxo de Uso
1. Coordenador vê alerta em `/coordenador/hoje`
2. Clica no alerta → abre Playbook Sheet
3. Clica "Ver detalhes" → abre Drilldown Sheet
4. Vê funil para entender onde quebrou
5. Vai para aba Lista → vê voluntários afetados
6. Seleciona tipo de mensagem (curta/média/líder)
7. Copia mensagem e entra em contato

## Critérios de Aceite
- [x] Clicar em "Ver detalhes" num alerta mostra drilldown + lista
- [x] Lista não expõe dados sensíveis (só nome e última ação)
- [x] Coordenador consegue copiar mensagem em 1 toque
- [x] Fallback silencioso se RPC falhar
- [x] Build OK

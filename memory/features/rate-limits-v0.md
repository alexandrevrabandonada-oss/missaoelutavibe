# Memory: features/rate-limits-v0
Updated: now

## Overview
Anti-caos + Rate Limits v0 é uma camada de proteção contra abuso que limita ações sensíveis por usuário/hora, registra eventos de bloqueio para analytics, e exibe feedback amigável no frontend.

## Database Changes

### New Table: `rate_limits`
- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL`
- `action_key TEXT NOT NULL` - identificador da ação
- `window_start TIMESTAMPTZ NOT NULL` - início da janela de tempo
- `count INTEGER NOT NULL DEFAULT 1` - contagem na janela
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### Indexes
- `idx_rate_limits_user_action` - busca rápida por user/action/window
- `idx_rate_limits_cleanup` - limpeza de registros antigos

### RLS
- SELECT: usuário pode ver apenas seus próprios limites
- INSERT/UPDATE/DELETE: bloqueado (apenas via RPC)

## RPCs

### `guard_rate_limit(_action_key, _limit, _window_seconds)`
Verifica e incrementa contador de rate limit.

**Retorna:**
- Sucesso: `{ ok: true, current_count, limit }`
- Bloqueado: `{ ok: false, error: 'rate_limited', retry_after, current_count, limit }`

### `get_rate_limit_metrics(_period_days)`
Admin only. Retorna métricas agregadas sem PII:
- `by_action`: contagem de bloqueios por ação
- `by_city`: contagem de bloqueios por cidade
- `total_7d`, `total_30d`: totais

## Rate Limits por Ação

| Action Key | Limite | Janela | Descrição |
|------------|--------|--------|-----------|
| `generate_street_mission` | 5 | 1h | Gerar missão de rua |
| `generate_conversation_mission` | 5 | 1h | Gerar missão de conversa |
| `crm_quick_add` | 30 | 1h | Cadastrar contato CRM |
| `followup_done` | 60 | 1h | Concluir follow-up |
| `followup_snooze` | 30 | 1h | Adiar follow-up |
| `publish_mural` | 10 | 1h | Publicar no mural |
| `share_download` | 20 | 1h | Baixar compartilhamento |
| `print_download` | 10 | 1h | Baixar kit impressão |

## Frontend Integration

### Hook: `useRateLimits`
- `isRateLimited(response)` - type guard
- `handleRateLimitError(response, actionName)` - toast amigável
- `formatRetryAfter(seconds)` - formata tempo restante
- `useRateLimitMetrics(days)` - métricas admin

### Response Handling
Todos os RPCs protegidos retornam `{ ok: false, error: 'rate_limited', retry_after }` quando bloqueados.

Os hooks (`useStreetMission`, `useConversationMission`, `useQuickAddContact`, `useFollowups`) detectam e tratam automaticamente.

### UI Fallback
Toast com mensagem amigável: "Limite atingido para [ação]. Tente novamente em X minutos."

## Admin Dashboard

### `RateLimitMetricsCard`
Card em `/admin/ops` mostrando:
- Bloqueios 7d / 30d
- Por ação (top 5)
- Por cidade (top 5)

## Growth Events

Bloqueios são registrados em `growth_events` com:
- `event_type`: 'rate_limited'
- `meta`: `{ action_key, retry_after, cidade? }`

## Files Created/Modified
- `src/hooks/useRateLimits.tsx` (new)
- `src/components/admin/RateLimitMetricsCard.tsx` (new)
- `src/pages/AdminOps.tsx` (added card)
- `src/hooks/useStreetMission.tsx` (rate limit handling)
- `src/hooks/useConversationMission.tsx` (rate limit handling)
- `src/hooks/useQuickAddContact.tsx` (rate limit handling)
- `src/hooks/useFollowups.tsx` (rate limit handling)

## Security Notes
- Rate limits são por usuário autenticado
- Janelas são calculadas em segundos desde epoch
- Registros antigos (>24h) são limpos automaticamente
- Nenhum PII é exposto nas métricas admin

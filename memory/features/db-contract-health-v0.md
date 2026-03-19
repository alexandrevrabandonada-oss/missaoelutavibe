# DB Contract Healthcheck v0

## Objetivo
Detectar incompatibilidades de schema (drift) cedo, com evidência, sem quebrar a UI. Expõe status em `/admin/ops` apenas para admin/coordenadores.

## Componentes

### RPC: `get_db_contract_health()`
- **SECURITY DEFINER** com `SET search_path = public`
- Retorna JSON: `{ ok, checks[], failed_keys[], ts }`
- Auth: admin ou coordenador apenas (retorna `forbidden` caso contrário)

### Checks implementados (P0):

| Key | Tipo | O que valida |
|-----|------|--------------|
| `growth_events_ts` | Coluna | Timestamp válido em growth_events (occurred_at/inserted_at/created_at/ts) |
| `rpc_get_my_daily_plan` | RPC | Existência da função |
| `rpc_get_my_streak_metrics` | RPC | Existência da função |
| `rpc_get_my_reactivation_status` | RPC | Existência da função |
| `rpc_get_my_due_followups` | RPC | Existência da função |
| `rpc_generate_street_mission` | RPC | Existência da função |
| `rpc_generate_conversation_mission` | RPC | Existência da função |
| `table_profiles` | Tabela | Existência da tabela |
| `table_crm_contatos` | Tabela | Existência da tabela |
| `table_crm_followup_logs` | Tabela | Existência da tabela |
| `table_daily_plan_steps` | Tabela | Existência da tabela |
| `table_app_errors` | Tabela | Existência da tabela |

## Frontend

### Hook: `useDbContractHealth()`
- Cache de 5 minutos
- Fallback silencioso se RPC falhar
- Tracking: `db_contract_health_viewed`, `db_contract_health_failed`
- Observabilidade: `DB_CONTRACT_HEALTH_FAIL` em app_errors

### Card: `DbContractHealthCard`
- Exibido em `/admin/ops`
- Status OK/Atenção com contagem de falhas
- Lista de checks com ícones (✅/⚠️)
- Botão "Copiar relatório" (texto simples, sem PII)

## Segurança
- Nenhum PII exposto
- Apenas admin/coordenador pode acessar
- Queries usam information_schema e pg_proc

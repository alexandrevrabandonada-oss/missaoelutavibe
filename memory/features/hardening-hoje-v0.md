# Memory: features/hardening-hoje-v0
Updated: now

## Hardening Hoje v0

Resiliência para garantir que /voluntario/hoje NUNCA dê tela de erro.

### A) Fallback do Check-in

- `useCadencia.tsx` envolve `get_daily_suggestions` em try/catch
- Se falhar: retorna `null` em vez de throw (previne crash)
- Expõe `suggestionsError`, `retrySuggestions`, `isRetryingSuggestions`
- `VoluntarioHoje.tsx` mostra UI de fallback com:
  - Mensagem de erro clara
  - Plano mínimo: Missão de Rua + Roteiro do Dia + Share rápido
  - Botão "Tentar novamente" (retry)
- Cards `StreetMissionCard` e `RoteiroDoDiaSection` renderizam SEMPRE, independente de sugestões

### B) Log de Erros

- `checkin_error` logado em `growth_events` via `log_growth_event` RPC
- Meta: `{ rpc: "get_daily_suggestions", message: "..." }`
- Sanitização: remove UUIDs, emails, limita 200 chars (sem PII)
- Função helper `logCheckinError()` em `useCadencia.tsx`

### C) Timezone do Dedupe 1/dia (Missão de Rua)

- RPC `generate_street_mission` agora usa `America/Sao_Paulo`:
  ```sql
  v_today_sp := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  (m.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_today_sp
  ```
- Garante dedupe correto na virada de dia no fuso brasileiro

### D) Novos Event Types em growth_events

Adicionados na constraint e whitelist do RPC:
- `checkin_error` - Erro ao buscar sugestões
- `street_mission_generated` - Missão de rua gerada
- `street_mission_opened` - Página da missão aberta
- `street_mission_completed` - Missão concluída
- `roteiro_opened` - Roteiro visualizado

### Arquivos Alterados

- `src/hooks/useCadencia.tsx` - Error handling + log
- `src/pages/VoluntarioHoje.tsx` - Fallback UI
- Migration: RPCs timezone + constraint + whitelist

### 10 Checks

1. ✅ /voluntario/hoje renderiza mesmo com RPC quebrado
2. ✅ Retry funciona (retrySuggestions)
3. ✅ Cards Rua/Roteiro aparecem no fallback
4. ✅ Log checkin_error gravado (sem PII)
5. ✅ Dedupe rua correto em virada de dia SP
6. ✅ Sem regressões no build
7. ✅ Sem warnings novos críticos
8. ✅ Mobile-first (fallback responsivo)
9. ✅ Rádio continua funcionando no Hoje
10. ✅ Docs em memory/features/hardening-hoje-v0.md

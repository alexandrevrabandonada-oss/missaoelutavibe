# Memory: features/deterministic-daily-recommendations
Updated: 2026-02-23

## Sistema de Recomendações Determinísticas Diárias

### Conceito
Missão do dia é **estável por refresh** — mesmo user + mesmo dia = mesma escolha.
Usa PRNG semeado (Mulberry32) com seed = `hash(userId + "YYYY-MM-DD")`.

### Lógica Principal (`src/lib/missionRecommendation.ts`)

1. **Seeded PRNG**: `todaySeed(userId)` → hash djb2 → Mulberry32 → shuffle determinístico
2. **Funnel boost**: convite=+8, contato=+6, escuta=+4, rua=+2 (prioriza conversão)
3. **Score + shuffle**: missions são scored normalmente, depois shuffled dentro de tiers (±2 pts)
4. **Cooldown**: `yesterdaySeed()` calcula o #1 de ontem e o exclui do #1 de hoje
5. **Completed-today exclusion**: missões concluídas hoje são removidas do top 3

### API: `getDailyRecommendations()`
```typescript
getDailyRecommendations(
  missions, profile, userId,
  completedTodayIds, allCompletedIds
) → { todayMission, recommended[2], allSorted[] }
```

### UI: `TodayMissionCard` e `VoluntarioMissoes`
- **TodayMissionCard**: 1 missão principal + 2 "Também recomendadas" + "VER MAIS"
- **VoluntarioMissoes**: Seção "Pra Você Hoje" com 1 destaque + 2 compactas, antes do ciclo/biblioteca

### Funnel Priority (regras frias)
- Se título/tags contêm "convite/mobilizacao" → +8
- Se "crm/contato/base/salvar" → +6
- Se "escuta/conversa" → +4
- Se "rua/campo/territorio" → +2
- Canonical missions (meta_json.canonical=true) → +5

### Arquivos
- `src/lib/missionRecommendation.ts` — Engine com seeded PRNG + funnel boost
- `src/hooks/useTodayMission.tsx` — Hook que usa getDailyRecommendations
- `src/components/actions/TodayMissionCard.tsx` — Card com 1+2 layout
- `src/pages/VoluntarioMissoes.tsx` — Seção "Pra Você Hoje"

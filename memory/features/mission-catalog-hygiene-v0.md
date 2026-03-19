# Memory: features/mission-catalog-hygiene-v0
Updated: 2026-02-20

## Higiene do Catálogo de Missões (Beta)

### Objetivo
Reduzir confusão no catálogo de missões definindo um **conjunto canônico MVP** que o app prioriza nas recomendações e playbooks, sem apagar missões existentes.

### Conjunto Canônico (7 slugs)

| # | Slug | Descrição |
|---|------|-----------|
| 1 | `celula-checkin-semanal-2min` | Check-in semanal da célula |
| 2 | `convite-1-pessoa-para-sua-celula` | Convite de 1 pessoa |
| 3 | `playbook-1-acao-rodar-agora` | Rodar 1 ação do playbook |
| 4 | `mural-1-relato-1-pergunta` | Relato + pergunta no mural |
| 5 | `trio-15min-acao-da-semana` | Ação da semana em trio |
| 6 | `debate-1-comentario-modelo-3-linhas` | Comentário modelo em debate |
| 7 | `beta-1-bug-1-atricao-1-ideia` | Feedback beta |

### Como funciona

1. **Marcação**: `missions.meta_json` armazena `canonical: true` e `canonical_rank: N`
2. **RPC `mark_canonical_missions(p_slugs)`**: Aplica/reaplica marcação. Ignora slugs inexistentes e retorna `missing_slugs`.
3. **RPC `get_mission_catalog_stats()`**: Retorna stats sem PII (total, canônicas, duplicatas, newest_10).
4. **Recomendação**: `scoreMission()` adiciona +5 de bônus para missões canônicas.
5. **Diagnóstico**: Card "Catálogo de Missões (Higiene)" em `/admin/diagnostico`.

### Como atualizar a lista no futuro

1. Adicionar/remover slugs no array `CANONICAL_SLUGS` em `MissionCatalogHygieneCard.tsx`
2. Atualizar o array `v_expected_slugs` na RPC `get_mission_catalog_stats`
3. Ir em `/admin/diagnostico` → clicar "Reaplicar conjunto canônico"
4. A lista em `missionRecommendation.ts` (`CANONICAL_SLUGS`) também deve ser atualizada
5. Atualizar esta documentação

### Segurança
- RPCs são SECURITY DEFINER com auth check (admin ou coordenador)
- Nenhum PII exposto
- Slugs gerados automaticamente via translate + regex

### Arquivos relacionados
- `src/components/admin/MissionCatalogHygieneCard.tsx` — Card de diagnóstico
- `src/lib/missionRecommendation.ts` — Engine de recomendação (boost canônico)
- `memory/SSOT_REGISTRY.md` — Domínio Missões atualizado

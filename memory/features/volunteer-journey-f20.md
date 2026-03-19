# F20 — Jornada Completa e Previsível do Voluntário

## Problema
Copy e status labels estavam definidos localmente em 5+ superfícies diferentes, com inconsistências ("Precisa ajuste" vs "Corrigir registro" vs "Ajuste Necessário", "Rejeitado" vs "Não validado", etc.). O voluntário não tinha indicador visual de "em que etapa estou".

## Solução

### Helper central: `src/lib/journeyStatus.ts`
- Mapa único `evidence_status → { label, icon, colorClass, badgeClass, borderClass, journeyStep, ctaLabel, hint }`
- 6 estados: `nao_iniciou`, `rascunho`, `enviado`, `precisa_ajuste`, `validado`, `rejeitado`
- 4 journey steps lineares: Agir → Enviado → Análise → Recibo
- Função `getJourneyStatus(status, hasEvidence)` usada por todas as superfícies

### Labels unificados (F20)
| Status | Label unificado | Antes |
|---|---|---|
| nao_iniciou | "Não iniciou" | ✅ já era |
| enviado | "Em análise" | ✅ já era |
| precisa_ajuste | "Ajuste necessário" | "Precisa ajuste" / "Corrigir registro" / "Ajuste Necessário" |
| validado | "Recibo emitido" | "Recibo emitido" / "Recibo validado" |
| rejeitado | "Não validado" | "Rejeitado" |
| rascunho | "Rascunho" | ✅ já era |

### Componente: `JourneyStepIndicator`
- 4 dots compactos com labels: Agir → Enviado → Análise → Recibo
- Dot atual = `bg-primary ring`, completados = `bg-emerald-500`, futuros = cinza
- Usado em: CelulaMembroMissoes (por missão), VoluntarioMeusEnvios (por registro), VoluntarioMissao (detail)

### Superfícies atualizadas
- **CelulaMembroMissoes** — usa `getJourneyStatus` + `JourneyStepIndicator` por linha
- **VoluntarioMeusEnvios** — usa `getJourneyStatus` (eliminou config local de 50 linhas) + `JourneyStepIndicator` por card
- **VoluntarioMissao** — status badge unificado com hint textual + `JourneyStepIndicator`

### Papel de cada superfície (reforçado pela copy)
- **Missões** = onde agir (CTA: "Agir agora")
- **Meus Registros** = onde acompanhar envios e ajustes
- **Memória** = onde guardar conquistas validadas (recibos)
- **Hoje** = onde ver a prioridade atual (usa `getMemberPriority`)

## Regras
- Sem nova rota
- Sem tabela nova
- `getMemberPriority` continua como helper de priorização (usado por Hoje e CelulaProximaAcao)
- `getJourneyStatus` é o helper de display/copy (usado por todas as superfícies de status)

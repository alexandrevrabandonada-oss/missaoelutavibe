# F21 — Critérios Visíveis de Validação por Tipo de Missão

## Objetivo
Reduzir ambiguidade sobre o que sustenta uma boa validação, tornando critérios visíveis para voluntário e coordenação.

## Implementação

### 1. Helper Central (`src/lib/missionCriteria.ts`)
- Critérios estruturados por tipo: `essential`, `recommended`, `forbidden`
- Cada critério mapeia opcionalmente a um campo (`resumo`, `relato`, `photo`, `link`, `local`)
- `getMissionCriteria(type)` → critérios + dica para coordenador
- `getRegistroSignal(input)` → `strong | acceptable | weak` com contagem de essenciais atendidos
- Sem score, sem IA — lógica determinística

### 2. MissionProofGuide Refatorado
- Agora alimentado por `missionCriteria.ts` (fonte única)
- Elimina duplicação do antigo `PROOF_GUIDES` hardcoded
- Mesma interface visual (obrigatório / opcional / não envie)

### 3. CoordCriteriaRef (novo)
- Painel compacto no `RegistroDetailSheet` (apenas para registros acionáveis)
- Mostra critérios essenciais + dica contextual para o coordenador
- Ajuda a validar com mais consistência

### 4. RegistroSignalBadge (novo)
- Indicador visual pré-envio: "Registro completo" / "Pode melhorar" / "Incompleto"
- Baseado em critérios essenciais atendidos
- Aparece apenas quando o voluntário começou a preencher

### 5. Dados
- `mission_type` adicionado à query de `useCoordCelulaRegistros` e `CelulaRegistro`
- Nenhuma tabela nova

## Superfícies Afetadas
- `MissionProofGuide` — refatorado para usar helper central
- `RegistroRapido` — signal badge adicionado
- `RegistroDetailSheet` — criteria ref para coordenador
- `useCoordCelulaRegistros` — mission_type no select

## Princípio
Mesma base de critérios serve os dois lados:
- Voluntário vê antes de enviar
- Coordenador vê ao validar

# F18 — Previsibilidade e Qualidade do Registro do Voluntário

## Objetivo
Reduzir registros que voltam como `precisa_ajuste` dando orientação contextual e leve antes do envio.

## Implementação

### 1. Helper de Qualidade (`src/lib/registroQualityCheck.ts`)
- Regras determinísticas por tipo de missão
- Dois níveis: `tip` (sugestão) e `warning` (atenção)
- Campos avaliados: resumo, local, evidência, relato, link
- Sem scores, sem IA, sem mágica

### 2. Componente de Hints (`src/components/missions/RegistroQualityHints.tsx`)
- Renderiza warnings em destaque (laranja) e tips agrupados (muted)
- Só aparece quando o voluntário começou a preencher

### 3. Integração no RegistroRapido
- MissionProofGuide agora aparece acima do botão de envio (antes só estava em VoluntarioMissao)
- QualityHints aparecem entre o guia e o botão
- Nenhuma trava adicional — apenas orientação

## Regras por Tipo
| Tipo | Foto recomendada | Link recomendado | Relato essencial |
|------|-----------------|-----------------|-----------------|
| conversa | - | - | ✓ |
| rua | ✓ | - | - |
| escuta | - | - | ✓ |
| mobilizacao | ✓ | - | - |
| conteudo | ✓ | ✓ | - |
| dados | - | ✓ | - |
| formacao | - | - | ✓ |

## Superfícies Afetadas
- `RegistroRapido` (principal)
- `VoluntarioMissao` (já tinha MissionProofGuide)
- `MissionProofGuide` (sem mudanças)

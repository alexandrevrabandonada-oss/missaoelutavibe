# Memory: features/pilot-mode-v0
Updated: 2026-02-23

Modo Piloto (7 dias): Estratégia de engajamento simplificada para a fase beta, ativada via botão único em /coordenador/hoje. O sistema cria ou reutiliza um ciclo semanal e vincula automaticamente 7 missões canônicas prioritárias. Para reduzir a paralisia de escolha, a vitrine de missões do voluntário é limitada a no máximo 3 cards em destaque (1 'de hoje' e 2 recomendadas), ocultando o restante sob um botão 'Ver mais'. O fluxo garante que novos voluntários sempre tenham missões recomendadas visíveis, mesmo sem histórico de ciclos.

## Trilha do Piloto (UI) — 4 passos
Card fixo no topo de `/voluntario/hoje` com funil em 4 passos:
1. **Fazer check-in** — detectado via `useDailyCheckin().hasCheckedInToday`
2. **Missão do dia** — detectado via query de missões concluídas hoje
3. **Compartilhar 1 material** — detectado via localStorage `shared_material_today:{userId}` (marcado pelo ShareMaterialModal ao clicar WhatsApp ou Copiar)
4. **Convite +1** — detectado via `useInviteLoop().hasShared` ou flag localStorage `pilot_mode_v1:{userId}.inviteSent`

**Comportamento:**
- Sempre mostra UM CTA dominante (o primeiro passo incompleto)
- Barra de progresso 0→100% (4 etapas)
- Persiste via localStorage, resetado diariamente
- Some automaticamente quando os 4 passos estão completos
- Passo 3 navega para `/voluntario/base?pilot_share=1`, que auto-abre o ShareMaterialModal do primeiro material canônico

**Tracking leve (sem tabela nova):**
- `pilot_mode_v1:{userId}` — date, dismissed, inviteSent, materialShared
- `shared_material_today:{userId}` — date (set by ShareMaterialModal)
- `markMaterialSharedToday()` e `hasSharedMaterialToday()` exportados de `usePilotMode.ts`

**Arquivos:** `usePilotMode.ts`, `PilotTrackCard.tsx`, `ShareMaterialModal.tsx`, `VoluntarioBase.tsx`

**VoluntarioMissoes:** "Ver mais" inclui aviso "Piloto: foque nas recomendadas desta semana" quando expandido.

**PostMissionImpact:** Já prioriza "Convide +1" como primeiro CTA quando a missão concluída não é de convite (implementado na v1 do Runner).

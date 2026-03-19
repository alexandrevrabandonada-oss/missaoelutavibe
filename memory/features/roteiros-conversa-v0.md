# Memory: features/roteiros-conversa-v0
Updated: now

## Roteiros de Conversa v0

Sistema de roteiros/scripts de conversa para voluntários, integrado ao CRM e fluxos de conversa.

### Banco de Dados
- **roteiros_conversa**: tabela principal
  - titulo, objetivo (convidar/explicar/objecao/fechamento)
  - texto_base, versoes_json (curta/media/longa)
  - tags[], status (rascunho/revisao/aprovado/arquivado)
  - escopo_tipo (global/estado/cidade/celula) + escopo_* campos
  - created_by, timestamps

- **roteiros_actions**: tracking de uso
  - roteiro_id, user_id, action_type (copiou/abriu_whatsapp/usei)
  - action_date + UNIQUE constraint para dedupe diário

### RLS
- Voluntários: SELECT em aprovados no seu território (global, estado, cidade ou célula)
- Coordenadores: CRUD completo no escopo
- Actions: usuários registram próprias ações, coords veem todas

### RPCs (SECURITY DEFINER, SET search_path = public)
- `track_roteiro_action(p_roteiro_id, p_action_type)` - Registra ação com dedupe
- `get_roteiros_metrics(p_days)` - Métricas para dashboard admin
- `publish_roteiro_to_mural(p_roteiro_id, p_cell_id, p_titulo_override)` - Publica como post tipo material

### UI Voluntário
- `RoteiroDoDiaSection` em /voluntario/hoje
  - Filtro por objetivo
  - Botões: [Copiar] [WhatsApp] [Marcar ✅ Eu usei]
  - Collapsible com outros roteiros

### UI Admin
- `/admin/roteiros` - Gestão completa
  - Tabs: Revisão / Aprovados / Rascunhos / Arquivados
  - Editor com preview
  - Publicar no Mural (cria mural_post tipo material)
  - Métricas: total aprovados, em revisão, ações 7d, top roteiros

### Hooks
- `useRoteirosAprovados(objetivo?)` - Roteiros aprovados para voluntários
- `useRoteirosAdmin(status?)` - Todos para admin
- `useRoteiro(id)` - Single roteiro
- `useRoteirosMutations()` - CRUD + publishToMural
- `useRoteiroActions()` - Track actions
- `useRoteirosMetrics(days)` - Métricas dashboard

### Componentes
- `RoteiroDoDiaSection` - Seção no /voluntario/hoje
- `RoteirosMetricsCard` - Card métricas no /admin/ops

### Integrações
- Card no AdminOps com métricas
- Publicação no Mural como material
- Tracking para métricas de engajamento

### Checks Implementados
1. ✅ RLS: voluntários leem aprovados no território
2. ✅ RLS: coords CRUD no escopo
3. ✅ Escopo: global/estado/cidade/celula
4. ✅ Copiar: clipboard API + track action
5. ✅ WhatsApp: wa.me deep link + track action
6. ✅ Mural: RPC publish_roteiro_to_mural
7. ✅ Métricas: get_roteiros_metrics RPC
8. ✅ Dedupe: UNIQUE constraint por dia/user/roteiro/action
9. ✅ UI Admin: tabs + editor + preview
10. ✅ UI Voluntário: seção collapsible + filtro

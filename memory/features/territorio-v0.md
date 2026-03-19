# Memory: features/territorio-v0
Updated: now

## TERRITÓRIO v0 - Diretório Territorial

Sistema de organização territorial para operação estadual (cidades → células), cobertura e fila de coordenação.

### Banco de Dados
- **cidades**: tabela mestre de cidades (nome, uf, slug, status)
- **cells**: estendida com cidade_id, tags, created_by
- **cell_memberships**: estendida com status (pendente/aprovado/recusado/removido), requested_at, decided_at, decided_by
- **territorio_coord_interest**: fila de interesse em coordenação

### RPCs (SECURITY DEFINER, SET search_path = public)
- `get_territorio_overview(period_days)` - Overview de cidades com métricas
- `get_cidade_celulas(p_cidade_id)` - Células de uma cidade com métricas
- `request_join_celula(p_celula_id)` - Voluntário pede entrada em célula
- `decide_membership(p_membership_id, p_decision)` - Coord aprova/recusa
- `upsert_coord_interest(...)` - Voluntário se oferece para organizar
- `get_territorio_kpis()` - KPIs para card do Ops
- `convert_coord_interest_to_cell(p_interest_id, p_cell_name, p_cell_neighborhood, p_create_initial_cycle)` - Fluxo completo: cria célula, membership, role_invite, ciclo inicial

### UI
- `/admin/territorio` - Gestão territorial (cidades, células, fila coord)
- `/voluntario/territorio` - Meu território (cidade, célula, interesse)
- `TerritorioKPICard` - Card no AdminOps com KPIs
- `ConvertInterestModal` - Modal para converter interesse em célula real

### Hooks
- `useTerritorio()` - Overview e KPIs
- `useCidadeCelulas(cidadeId)` - Células de uma cidade
- `useCidades()` - CRUD de cidades
- `useCoordInterest()` - Fila de interesse
- `usePendingMemberships(cidadeNome)` - Pedidos pendentes
- `useVoluntarioTerritorio()` - Dados do voluntário + ações
- `useConvertInterest()` - Converter interesse em célula

### Fluxo de Conversão (v0.1)
1. Coord clica "Criar Célula" em item pendente da fila
2. Preenche nome + bairro + toggle "Criar Semana Inicial"
3. RPC executa atomicamente:
   - Cria registro em cells
   - Adiciona solicitante como membro aprovado
   - Envia role_invite para moderador_celula (7 dias)
   - Atualiza interesse para "aprovado"
   - (opcional) Cria ciclo_semanal rascunho com metas seed
   - (opcional) Cria squad de coordenação + tarefas via create_tasks_from_cycle_metas
   - Cria notificação para solicitante
4. Solicitante recebe notificação → aceita papel → acessa /voluntario/territorio

### Integrações
- Card "Território" no AdminOps
- Link "Meu Território" no hub voluntário
- Delegation & role_invites v1
- ciclos_semanais + create_tasks_from_cycle_metas

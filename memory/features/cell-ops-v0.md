# Memory: features/cell-ops-v0
Updated: 2026-02-05

## Operação de Células v0.2

Painel operacional para coordenadores gerenciarem alocação de voluntários em células.
**IMPORTANTE**: RPC `approve_and_assign_request` usa `status = 'aprovado'` em `cell_memberships` (não 'approved' ou 'ACTIVE') para respeitar o constraint `cell_memberships_status_check`.

### Rotas
- `/coordenador/territorio` — Painel principal com três abas: Pedidos, Células, Equipe
- Legacy redirect: `/coordenador-territorio` → `/coordenador/territorio`

### Backend (RPCs seguros)
Todas as operações passam por RPCs com SECURITY DEFINER, sem SELECT direto:

1. `list_city_assignment_requests(p_city_id, p_status)` — Lista pedidos SEM PII (só primeiro nome e bairro)
2. `list_city_cells(p_city_id)` — Lista células com contagens de membros e **coordinator_count** (via coord_roles)
3. `upsert_cell(p_city_id, p_name, p_notes, p_is_active, p_neighborhood, p_tags, p_cell_id)` — Criar/editar célula
4. `approve_and_assign_request(p_request_id, p_cell_id, p_coordinator_note, p_make_cell_coordinator)` — Aprovar, alocar e **promover a coordenador**
5. `cancel_assignment_request(p_request_id, p_reason)` — Cancelar pedido
6. `get_cell_ops_kpis()` — KPIs para diagnóstico
7. `can_operate_coord(city_id, cell_id)` — Helper de permissão (Coord Roles v1)
8. `list_coord_roles(scope_city_id)` — Lista coordenadores sem PII
9. `grant_coord_role(user_id, role, city_id, cell_id)` — Concede papel de coordenação
10. `revoke_coord_role(user_id, role, city_id, cell_id)` — Revoga papel de coordenação

### Fluxo de Alocação
1. Voluntário pede alocação via `cell_assignment_requests` (fluxo existente do onboarding)
2. Coordenador vê pedidos no painel `/coordenador/territorio`
3. Coordenador pode:
   - Criar nova célula se necessário
   - Aprovar + alocar em célula existente
   - Aprovar sem célula (voluntário fica "sem célula")
   - Cancelar pedido com motivo
   - **v0.1**: Promover a coordenador da célula no ato de alocar
4. Ao alocar: `profiles.cell_id` é atualizado e membership criada
5. Se promovido: registro em `coord_roles` (CELL_COORD) + role `coordenador_celula`
6. Voluntário vê célula no TerritorioBadge e banner de "sem célula" desaparece

### Promoção a Coordenador (v0.1)

No modal de aprovação:
- Checkbox "Tornar coordenador desta célula" (visível quando célula selecionada)
- Ao marcar: RPC insere em `coord_roles` (role CELL_COORD) e concede role
- Ver: `memory/features/coord-roles-v1.md`

### Aba Equipe (Coord Roles v1)

Permite gerenciar papéis de coordenação:
- COORD_GLOBAL: acesso a toda coordenação (só admin pode conceder)
- COORD_CITY: acesso à cidade selecionada
- CELL_COORD: acesso à célula específica

Formulário:
- Input para UUID do voluntário
- Dropdown de papel
- Seletor de célula (para CELL_COORD)

Lista exibe V#XXXXXX (sem PII) com badge de papel.

### Estado Vazio

Na aba "Células", se cidade não tem nenhuma célula:
- CTA "Criar célula inicial (Geral)"
- Cria célula com nome "Geral" e tags ["inicial"]

### Diagnóstico
Card "Células v0" em `/admin/diagnostico` mostra:
- Total de cidades ativas
- Total de células ativas
- Pedidos pendentes (total e por cidade)
- Cidades com/sem células
- **v0.1**: Verifica `coordinator_count` em list_city_cells
- **v1**: Verifica RPCs de coord_roles

### Hooks
- `useCellOps.tsx` — Hook principal com queries e mutations
- `useCoordRoles.tsx` — Hook para gestão de coord_roles
- Reutiliza `useCityCellSelection` para lista de cidades
- Reutiliza `useScopedRoles` para escopo do coordenador

### Segurança
- Nenhum SELECT direto em telas de coordenador
- RPCs retornam apenas primeiro nome ou user_code (sem PII completo)
- Escopo do coordenador respeita cidade/célula atribuída
- Promoção usa SECURITY DEFINER com validação via `can_operate_coord`

### Arquivos
- `src/hooks/useCellOps.tsx`
- `src/hooks/useCoordRoles.tsx`
- `src/hooks/useCellAssignmentRequest.tsx` — Hook do voluntário para CRUD de pedido
- `src/pages/CoordenadorTerritorio.tsx`
- `src/pages/VoluntarioTerritorio.tsx` — "Minha Alocação" com 3 estados
- `src/components/coordinator/CoordTeamTab.tsx`
- `src/components/coordinator/PendingRequestsCard.tsx` — Card de pendências no cockpit
- `src/components/territory/MyAllocationCard.tsx` — Card de alocação do voluntário
- `src/components/admin/CellOpsKPICard.tsx`
- `memory/features/coord-roles-v1.md` — Detalhes do sistema de papéis

## Loop Operacional Fechado (v1 - P3)

### Voluntário (/voluntario/territorio)
- Bloco "Minha Alocação" com 3 estados:
  - **Sem alocação**: CTA "Pedir Alocação" → modal com bairro, disponibilidade, interesses
  - **Aguardando**: Status pendente + "Editar Preferências" ou cancelar pedido
  - **Alocado**: Mostra célula atual + botões "Ver Mural" e "Pedir Troca"
- Expectativa de tempo exibida (até 48h)
- Quem aprova: coordenação da cidade do voluntário

### Coordenação (/coordenador/territorio)
- Triagem 1-clique: botão "✓ Geral" aprova direto na célula Geral (se existir)
- Botão "Escolher" abre modal completo para selecionar célula específica
- Após qualquer ação: mutation success mostra toast e invalida queries
- Usa RPCs canônicas que logam em coord_audit_log

### Coordenação (/coordenador/hoje - Cockpit)
- Card "Pendências" (PendingRequestsCard) com contagem de pedidos por cidade
- Botão "Ir para Triagem" leva direto à aba Pedidos em /coordenador/territorio
- Hint de auditoria quando audit log vazio

### Regras de Segurança
- COORD_CITY só vê/atua na própria cidade (RLS + escopo em RPCs)
- Taxonomia congelada: apenas células do Kit v0 (CÉLULA = SSOT)

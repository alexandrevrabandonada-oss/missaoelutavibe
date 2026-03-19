# Memory: features/onboarding-mandatory-city-cell
Updated: 2026-02-25

## Onboarding Simplificado: Cidade → Auto-Geral (v4 — Hardened)

### Fluxo Simplificado (1 caminho)
1. User signs up via invite → created as **PENDENTE**
2. Wizard `CityCellWizard` mostra **apenas seleção de cidade** (sem step de célula)
3. Calls `volunteer_save_city_selection` RPC → salva cidade, marca onboarding concluído
4. User vai para `/aguardando-aprovacao`
5. Coordenador aprova via `approve_volunteer` RPC:
   - Sets `volunteer_status = 'ativo'`
   - **Auto-cria célula "Geral"** se não existir (idempotente)
   - Verifica membership existente na cidade antes de criar nova
   - **Upsert** em `cell_memberships` (unique user_id+cell_id)
   - Fecha `cell_assignment_requests` pendentes
   - Logs to `coord_audit_log`
6. User acessa `/voluntario/hoje` com célula já atribuída

### O que foi eliminado (v3→v4)
- `preferred_cell_id` — removido de queries e interfaces no frontend
- `needs_cell_assignment` — removido de toda lógica de UI/guards/routing
- `NeedsCellBanner` — arquivo mantido mas não importado em nenhum lugar
- Referências a "alocação/pedido" nos textos do WelcomeBlock
- Queries com status `'active'`/`'approved'` corrigidas para `'aprovado'`

### RPCs Ativas
- `volunteer_save_city_selection` — salva apenas cidade (ignora preferred_cell_id)
- `approve_volunteer` — auto-cria Geral + upsert membership + idempotente
- `approve_and_assign_request` — para trocas de célula
- `cancel_assignment_request` — para cancelar pedido de troca

### Diagnóstico (admin)
- `CellGeralHealthCard` em `/admin/diagnostico`:
  - Check: "Geral existe para todas as cidades ativas?"
  - Botão: "Criar X faltante(s)"
  - Check: memberships duplicadas (contagem)

### Componentes Atualizados
- `CityCellWizard.tsx` — Apenas seleção de cidade (1 step)
- `TerritorioBadge.tsx` — Sem "pedir alocação", apenas mostra cidade/célula
- `MyAllocationCard.tsx` — 2 estados: alocado (célula + playbook) ou aguardando
- `WelcomeBlock.tsx` — Sem CTA de alocação, sem refs a needs_assignment
- `VoluntarioHoje.tsx` — Sem NeedsCellBanner
- `useAdminVolunteers.tsx` — Sem preferred_cell_id/needs_cell_assignment, status fix
- `useUserCells.tsx` — Status query corrigido para incluir 'aprovado'
- `AceitarConviteRef.tsx` — Guard simplificado sem needs_cell_assignment

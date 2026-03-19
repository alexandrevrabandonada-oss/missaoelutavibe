# Memory: features/pending-volunteers-queue-v0
Updated: 2026-02-05

## Fila de Voluntários Pendentes

Painel para coordenadores aprovarem ou recusarem voluntários recém-cadastrados.

### Localização
- `/coordenador/hoje` → Card "Voluntários pendentes"

### Fluxo
1. Voluntário usa convite e completa signup → status `pendente`
2. Coordenador vê na fila (scoped por cidade se COORD_CITY)
3. Ações:
   - **Aprovar**: Muda status para `ativo`, seta `needs_cell_assignment = true`
   - **Aprovar + Alocar**: Muda status para `ativo`, aloca diretamente na célula
   - **Recusar**: Muda status para `recusado` com motivo
4. Após aprovar: Modal com CTA "Copiar mensagem WhatsApp" (boas-vindas)
5. Todas ações logadas no `coord_audit_log`

### RPCs
- `list_pending_volunteers(p_city_id)` — Lista sem PII (só primeiro nome)
- `approve_volunteer(_user_id, _cell_id)` — Aprova e opcionalmente aloca
- `reject_volunteer(_user_id, _reason)` — Recusa com motivo

### Audit Actions
- `APPROVE_VOLUNTEER` — Novo tipo no `coord_audit_action` enum
- `REJECT_VOLUNTEER` — Novo tipo no `coord_audit_action` enum

### Segurança
- Todas RPCs usam `can_operate_coord` para verificar permissão
- Lista retorna apenas primeiro nome (sem email/telefone)
- SECURITY DEFINER com search_path fixo

### Arquivos
- `src/hooks/usePendingVolunteers.tsx`
- `src/components/coordinator/PendingVolunteersCard.tsx`
- `src/pages/CoordenadorHoje.tsx` — Integração

### UX
- Voluntário com 2+ dias pendentes: borda âmbar (urgente)
- Botões inline: ✓ Aprovar, + Aprovar e Alocar, ✗ Recusar
- Limite default: 5 (com indicador de +N mais)
- Após aprovação: dialog de sucesso com mensagem copiável

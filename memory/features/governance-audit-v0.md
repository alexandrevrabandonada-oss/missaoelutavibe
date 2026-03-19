# Memory: features/governance-audit-v0
Updated: now

## Governance Audit Log v0

Sistema de rastreabilidade para ações de governança em conteúdo (Fábrica, Roteiros, Talentos).

### Banco de Dados

**governance_audit_log**: tabela principal
- id, entity_type, entity_id, action
- old_status, new_status (para transições)
- actor_id, actor_nickname (sem PII - só apelido)
- meta (jsonb para contexto adicional)
- created_at

**Índices**:
- idx_governance_audit_entity (entity_type, entity_id)
- idx_governance_audit_created (created_at DESC)
- idx_governance_audit_actor (actor_id)

**Entity Types**:
- fabrica_template
- roteiro_conversa
- chamado_talentos
- candidatura_chamado

**Actions**:
- status_change (automático via trigger)
- created, updated, deleted
- published_to_mural (manual via RPC)
- approved, archived, requested_review
- accepted, rejected

### RLS
- SELECT: coordenadores e admins podem ver logs
- INSERT: via RPC SECURITY DEFINER (actor_id = auth.uid())

### RPCs
- `log_governance_action(p_entity_type, p_entity_id, p_action, p_old_status, p_new_status, p_meta)` - Log manual
- `get_entity_audit(p_entity_type, p_entity_id, p_limit)` - Fetch histórico

### Triggers (automáticos)
- trg_fabrica_status_audit → log_fabrica_status_change()
- trg_roteiro_status_audit → log_roteiro_status_change()
- trg_chamado_status_audit → log_chamado_status_change()
- trg_candidatura_status_audit → log_candidatura_status_change()

### UI
- `GovernanceHistorySheet` - Sheet lateral com timeline de ações
- Botão "Histórico" em cada card de template/roteiro/chamado

### Hooks
- `useEntityAudit(entityType, entityId)` - Fetch histórico
- `useLogGovernanceAction()` - Log manual (para publish_to_mural)

### Integração
- /admin/fabrica: botão Histórico + log publish_to_mural
- /admin/roteiros: botão Histórico + log publish_to_mural
- /admin/talentos: botão Histórico em chamados

### A11y
- aria-label em botões
- role="list" na timeline
- role="listitem" em cada entrada
- Foco visível com focusRingClass
- Screen reader: "Carregando histórico..."

### Checks
1. ✅ Triggers disparam em status_change
2. ✅ RPC log_governance_action sem PII
3. ✅ RPC get_entity_audit com permissão
4. ✅ UI Sheet mobile-first
5. ✅ A11y completo
6. ✅ Build OK

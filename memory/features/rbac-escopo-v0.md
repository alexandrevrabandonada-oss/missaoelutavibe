# Memory: features/rbac-escopo-v0
Updated: now

## RBAC Escopo v0

Sistema de controle de acesso baseado em papéis (RBAC) com escopo geográfico.

### Banco de Dados

**user_roles expandido:**
- scope_type: 'global' | 'estado' | 'cidade' | 'celula' | 'regional'
- scope_state, scope_city, scope_cell_id
- granted_by, expires_at
- Mantém compatibilidade com cidade/regiao/cell_id antigos

**Helpers SQL (SECURITY DEFINER):**
- `has_role_in_scope(_user_id, _roles[], _target_state, _target_city, _target_cell_id)` - Check unificado
- `is_admin_global(_user_id)` - Admin ou coordenador_estadual global
- `is_coord_in_scope(_user_id, _target_state, _target_city, _target_cell_id)` - Coordenador com escopo

**RPCs:**
- `get_user_scope(_user_id)` - Retorna papel e escopo do usuário (jsonb)
- `grant_scoped_role(...)` - Atribui papel com escopo + audit log
- `revoke_scoped_role(_role_id, _reason)` - Revoga papel + audit log
- `get_role_audit_history(_target_user_id, _limit)` - Histórico de alterações

### Hierarquia de Escopos

1. **global** - Acesso total (admin, coordenador_estadual)
2. **estado** - Escopo estadual
3. **regional** - Escopo regional (múltiplas cidades)
4. **cidade** - Escopo municipal
5. **celula** - Escopo de célula específica

### Verificação de Escopo

A função `has_role_in_scope` verifica se o usuário tem um papel que cobre o target:
- Global cobre tudo
- Estado/Regional cobre se o state match
- Cidade cobre se city match
- Célula cobre se cell_id match

### Frontend

**Hooks:**
- `useScopedRoles()` - Hook principal com scope, isAdmin, isCoordinator, grant/revoke

**Componentes:**
- `UserScopeBadge` - Mostra papel e escopo atual
- `RoleHistorySheet` - Timeline de alterações de papéis

**Páginas:**
- `/admin/roles` - Gestão de papéis com escopo (admin-only)
- `/coordenador/hoje` - Mostra escopo do coordenador

### Audit Log

Todas as operações grant/revoke são logadas em audit_logs:
- user_id (operador)
- entity_type: 'user_roles'
- action: 'grant' | 'revoke' | 'grant_denied' | 'revoke_denied'
- new_data: detalhes sem PII

### Segurança

- Operadores só podem atribuir papéis dentro de seu próprio escopo
- Último admin não pode ser revogado
- Tentativas negadas são logadas
- RLS em user_roles mantido

### Checks
1. ✅ Scope types funcionando
2. ✅ Grant/revoke com audit
3. ✅ UI admin-only
4. ✅ Escopo exibido em /coordenador/hoje
5. ✅ Histórico com GovernanceHistorySheet
6. ✅ Sem PII nos logs
7. ✅ Build OK
